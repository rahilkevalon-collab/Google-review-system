import random
import uuid
import logging
import urllib.parse
from bson import ObjectId
from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError
from config import Config
from utils.db import Database, serialize_doc
from utils.text_utils import compute_content_hash, extract_word_count, validate_and_trim_review_length
from ai.nlp_engine import nlp_engine
from ai.llm_provider import get_llm_provider
from ai.sentiment import analyze_review_sentiment
from ai.templates import CATEGORY_BUSINESS_NAMES
from services.rating_service import assign_batch_ratings, validate_rating_distribution, allocate_demo_ratings

logger = logging.getLogger(__name__)

def distribute_keywords_to_batch(selected_keywords: list[str], count: int) -> list[list[str]]:
    """
    Distributes selected SEO keywords randomly across batch review cards.
    Guarantees:
    - Never uses a fixed 1-to-1 index order (Card 0 != Keyword 0, Card 1 != Keyword 1, etc.).
    - Every generation / regeneration randomly shuffles and assigns keywords to cards.
    - Each card focuses cleanly on ONE single keyword (avoiding awkward multi-keyword strings).
    - If multiple keywords are selected, ensures variety so different cards highlight different keywords.
    """
    clean_kws = [str(k).strip() for k in selected_keywords if str(k).strip()]
    if not clean_kws:
        return [["Quality Service"]] * count

    # If only 1 keyword selected, every review uses it
    if len(clean_kws) == 1:
        return [[clean_kws[0]]] * count

    # Always shuffle the clean keywords freshly on each batch generation
    shuffled_kws = list(clean_kws)
    random.shuffle(shuffled_kws)

    # If count is less than or equal to available keywords, randomly sample distinct keywords
    if count <= len(shuffled_kws):
        chosen = random.sample(shuffled_kws, count)
        random.shuffle(chosen)
        return [[kw] for kw in chosen]

    # If count is greater than available keywords (e.g. 2 keywords selected for 5 cards):
    # Ensure all selected keywords are represented, then fill remainder randomly
    pool = list(shuffled_kws)
    while len(pool) < count:
        extra = list(clean_kws)
        random.shuffle(extra)
        pool.extend(extra)
    pool = pool[:count]
    random.shuffle(pool)

    return [[kw] for kw in pool]

class ReviewGeneratorService:
    def __init__(self):
        self.db = Database.get_db()

    def get_history_texts(self, company_id: str, keyword: str = None) -> list[str]:
        """
        Retrieve previously generated review texts for a company to prevent duplicates.
        """
        query = {"companyId": str(company_id)}
        if keyword:
            query["keyword"] = keyword
        
        cursor = self.db.generated_reviews.find(
            query,
            {"reviewText": 1, "_id": 0}
        ).sort("createdAt", -1).limit(100)
        
        return [doc["reviewText"] for doc in cursor if "reviewText" in doc]

    def generate_reviews(
        self,
        company_id: str,
        company_name: str,
        category: str,
        keyword: str,
        description: str = "",
        services: str = "",
        location: str = "",
        language: str = "en",
        tone: str = "natural",
        length: str = "medium",
        count: int = 3,
        threshold: float = None,
        rating_distribution: dict = None,
        mode: str = "demo",
        customer_rating: int = None,
        selected_keywords: list = None,
        seed: int = None
    ) -> dict:
        """
        Orchestrate LLM generation, rating allocation (60% 5-star, 40% 4-star default),
        TF-IDF cosine similarity deduplication, MongoDB persistence, and audit logging.
        """
        if threshold is None:
            threshold = Config.SIMILARITY_THRESHOLD

        target_count = min(max(1, count), Config.MAX_BATCH_SIZE)
        batch_id = str(uuid.uuid4())
        
        # Determine real vs demo review mode
        is_real_mode = (mode == "real") or (customer_rating is not None)
        
        if is_real_mode:
            # For real customer reviews, never assign an artificial rating.
            # Use the customer's actual submitted rating and experience.
            ratings_for_batch, rating_type, is_demo = assign_batch_ratings(
                count=target_count,
                mode="real",
                customer_rating=customer_rating
            )
            norm_distribution = {"customer_rating": ratings_for_batch[0]}
        else:
            # Synthetic Demo Mode: validate rating distribution and allocate ratings via Largest Remainder method
            is_valid, err_msg, norm_distribution = validate_rating_distribution(rating_distribution)
            if not is_valid:
                raise ValueError(err_msg)

            # Rating Service shuffles ratings independently of array index / card position
            ratings_for_batch, rating_type, is_demo = assign_batch_ratings(
                count=target_count,
                distribution=norm_distribution,
                mode="demo",
                seed=seed
            )

        # Distribute selected keywords naturally across review cards (avoiding keyword stuffing)
        if selected_keywords and isinstance(selected_keywords, list):
            clean_selected_kws = [str(k).strip() for k in selected_keywords if str(k).strip()]
        else:
            clean_selected_kws = [k.strip() for k in keyword.split(",") if k.strip()]

        if not clean_selected_kws:
            clean_selected_kws = ["Quality Service"]

        batch_keyword_distribution = distribute_keywords_to_batch(clean_selected_kws, target_count)

        # Load historical review pool for this company
        history_texts = self.get_history_texts(company_id)
        
        # Resolve company externalReviewLink and location if available
        external_review_link = ""
        if company_id and ObjectId.is_valid(company_id):
            comp = self.db.companies.find_one({"_id": ObjectId(company_id)})
            if comp:
                external_review_link = comp.get("externalReviewLink", "")
                if not location:
                    location = comp.get("location", "")
        
        llm_provider = get_llm_provider()
        provider_name = llm_provider.name
        is_ai_powered = llm_provider.is_ai

        # Construct Google review link
        ext_review_link = external_review_link
        if not ext_review_link or ext_review_link == "https://search.google.com/local/writereview" or not ext_review_link.startswith("http"):
            query_str = f"{company_name} {location} reviews".strip()
            ext_review_link = f"https://www.google.com/search?q={urllib.parse.quote_plus(query_str)}"

        accepted_reviews = []
        total_rejected_count = 0
        attempts = 0
        max_attempts = Config.MAX_GENERATION_RETRIES

        # Working comparison pool starts with historical reviews
        working_pool = list(history_texts)
        current_threshold = threshold
        target_company_name = company_name.strip() if company_name and company_name.strip() else "Business"

        # Determine dynamic word bounds for authentic, human-sized reviews
        if length == "short":
            target_min, target_max = 8, 16
        elif length == "long":
            target_min, target_max = 22, 38
        else:  # medium / natural default
            target_min, target_max = 12, 26

        for i in range(target_count):
            item_rating = ratings_for_batch[i]
            item_keywords = batch_keyword_distribution[i]
            item_keyword_str = ", ".join(item_keywords)
            
            # Generate candidate pool specifically tailored for this rating and natural keywords
            candidates, src = llm_provider.generate_review_candidates(
                company_name=target_company_name,
                category=category,
                keyword=item_keyword_str,
                description=description,
                services=services,
                location=location,
                language=language or "en",
                tone=tone,
                length=length,
                count=6,
                target_rating=item_rating
            )

            chosen_item = None
            for cand in candidates:
                # Validate length and cleanly trim to authentic human review size
                cand_trimmed = validate_and_trim_review_length(cand, target_min=target_min, target_max=target_max)
                check_result = nlp_engine.check_candidate(
                    candidate_text=cand_trimmed,
                    existing_texts=working_pool,
                    threshold=current_threshold
                )
                if not check_result["is_duplicate"]:
                    chosen_item = {
                        "text": cand_trimmed,
                        "similarity": check_result["similarity_score"],
                        "rating": item_rating,
                        "selectedKeywords": item_keywords,
                        "keyword": item_keyword_str
                    }
                    break
                else:
                    total_rejected_count += 1

            if not chosen_item and candidates:
                cand_trimmed = validate_and_trim_review_length(candidates[0], target_min=target_min, target_max=target_max)
                chosen_item = {
                    "text": cand_trimmed,
                    "similarity": 0.5,
                    "rating": item_rating,
                    "selectedKeywords": item_keywords,
                    "keyword": item_keyword_str
                }

            if chosen_item:
                chosen_item["company_name"] = target_company_name
                accepted_reviews.append(chosen_item)
                working_pool.append(chosen_item["text"])

        now = datetime.now(timezone.utc)
        saved_records = []
        source_val = "customer-submitted" if is_real_mode else "demo_generated"

        for item in accepted_reviews:
            review_text = item["text"]
            item_rating = item.get("rating", 5)
            item_kws = item.get("selectedKeywords", clean_selected_kws)
            item_kw_str = item.get("keyword", ", ".join(item_kws))
            sim_score = item["similarity"]
            content_hash = compute_content_hash(review_text)
            
            sentiment_data = analyze_review_sentiment(review_text)
            sentiment_data["rating"] = item_rating
            sentiment_data["syntheticRating"] = float(item_rating)
            if item_rating == 4:
                sentiment_data["label"] = "Balanced & Constructive"
                sentiment_data["toneAssessment"] = "Positive with Constructive Area"

            doc = {
                "companyId": str(company_id),
                "companyName": target_company_name,
                "companyLocation": location,
                "externalReviewLink": ext_review_link,
                "category": category,
                "keyword": item_kw_str,
                "selectedKeywords": item_kws,
                "reviewText": review_text,
                "rating": int(item_rating),
                "ratingType": rating_type,
                "isDemo": is_demo,
                "language": language or "en",
                "tone": tone,
                "length": length,
                "source": source_val,
                "isAiGenerated": is_ai_powered,
                "contentHash": content_hash,
                "generationBatchId": batch_id,
                "wordCount": extract_word_count(review_text),
                "maxSimilarityToHistory": sim_score,
                "sentiment": sentiment_data,
                "copyCount": 0,
                "createdAt": now
            }

            try:
                res = self.db.generated_reviews.insert_one(doc)
                doc["_id"] = res.inserted_id
                saved_records.append(serialize_doc(doc))
            except DuplicateKeyError:
                logger.warning("DuplicateKeyError caught for hash %s. Skipping.", content_hash)
                total_rejected_count += 1
            except Exception as e:
                logger.error("Error saving review doc: %s", str(e))

        # Record generation log
        status = "COMPLETED"
        warning_message = None

        if len(saved_records) < target_count:
            status = "PARTIAL"
            warning_message = (
                f"Generated {len(saved_records)} distinct review(s). {total_rejected_count} candidate(s) "
                f"were rejected to maintain variety and avoid repetition (similarity threshold: {threshold:.2f})."
            )

        five_count = sum(1 for r in saved_records if r.get("rating") == 5)
        four_count = sum(1 for r in saved_records if r.get("rating") == 4)

        log_doc = {
            "companyId": str(company_id),
            "keyword": keyword,
            "category": category,
            "requestedCount": target_count,
            "generatedCount": len(saved_records),
            "ratingBreakdown": {
                "5_star": five_count,
                "4_star": four_count
            },
            "ratingDistribution": norm_distribution,
            "isDemo": is_demo,
            "rejectedDuplicateCount": total_rejected_count,
            "attempts": attempts,
            "similarityThreshold": threshold,
            "provider": provider_name,
            "batchId": batch_id,
            "status": status,
            "createdAt": now
        }
        self.db.generation_logs.insert_one(log_doc)

        return {
            "success": True,
            "batchId": batch_id,
            "requested": target_count,
            "generated": len(saved_records),
            "ratingDistribution": norm_distribution,
            "ratingBreakdown": {
                "5_star": five_count,
                "4_star": four_count
            },
            "isDemo": is_demo,
            "rejectedCount": total_rejected_count,
            "reviews": saved_records,
            "provider": provider_name,
            "isAiGenerated": is_ai_powered,
            "warning": warning_message,
            "status": status
        }

generator_service = ReviewGeneratorService()
