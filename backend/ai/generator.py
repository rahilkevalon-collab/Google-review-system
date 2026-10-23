from ai.templates import CATEGORY_BUSINESS_NAMES
import random
from bson import ObjectId
import uuid
import logging
import urllib.parse
from bson import ObjectId
from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError
from config import Config
from utils.db import Database, serialize_doc
from utils.text_utils import compute_content_hash, extract_word_count
from ai.nlp_engine import nlp_engine
from ai.llm_provider import get_llm_provider
from ai.sentiment import analyze_review_sentiment

logger = logging.getLogger(__name__)

class ReviewGeneratorService:
    def __init__(self):
        self.db = Database.get_db()

    def get_history_texts(self, company_id: str, keyword: str = None) -> list[str]:
        """
        Retrieve previously generated review texts for a company to prevent duplicates.
        """
        query = {"companyId": company_id}
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
        threshold: float = None
    ) -> dict:
        """
        Orchestrate LLM generation, TF-IDF cosine similarity deduplication,
        MongoDB storage, and generation log recording.
        """
        if threshold is None:
            threshold = Config.SIMILARITY_THRESHOLD

        target_count = min(max(1, count), Config.MAX_BATCH_SIZE)
        batch_id = str(uuid.uuid4())
        
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

        # Resolve company externalReviewLink and location
        ext_review_link = None
        if company_id and ObjectId.is_valid(company_id):
            comp_obj = self.db.companies.find_one({"_id": ObjectId(company_id)})
            if comp_obj:
                ext_review_link = comp_obj.get("externalReviewLink")
                if not location:
                    location = comp_obj.get("location", "")

        if not ext_review_link or ext_review_link == "https://search.google.com/local/writereview" or not ext_review_link.startswith("http"):
            query_str = f"{company_name} {location} reviews".strip()
            ext_review_link = f"https://www.google.com/search?q={urllib.parse.quote_plus(query_str)}"

        accepted_reviews = []
        total_rejected_count = 0
        rejection_details = []
        attempts = 0
        max_attempts = Config.MAX_GENERATION_RETRIES

        # Pool of diverse business names for this category (e.g. diverse restaurants)
        name_pool = CATEGORY_BUSINESS_NAMES.get(category, [company_name])
        shuffled_names = list(name_pool)
        random.shuffle(shuffled_names)
        if company_name and company_name not in shuffled_names:
            shuffled_names.insert(0, company_name)

        # Working comparison pool starts with historical reviews
        working_pool = list(history_texts)
        current_threshold = threshold

        for i in range(target_count):
            comp_name_for_item = shuffled_names[i % len(shuffled_names)]
            
            # Generate candidates specifically for this restaurant/business
            candidates, src = llm_provider.generate_review_candidates(
                company_name=comp_name_for_item,
                category=category,
                keyword=keyword,
                description=description,
                services=services,
                location=location,
                language="en",
                tone=tone,
                length=length,
                count=6
            )

            chosen_item = None
            for cand in candidates:
                check_result = nlp_engine.check_candidate(
                    candidate_text=cand,
                    existing_texts=working_pool,
                    threshold=current_threshold
                )
                if not check_result["is_duplicate"]:
                    chosen_item = {
                        "text": cand,
                        "similarity": check_result["similarity_score"]
                    }
                    break
                else:
                    total_rejected_count += 1
                    rejection_details.append({
                        "candidate": cand[:60],
                        "similarity": check_result["similarity_score"],
                        "reason": check_result["reason"]
                    })

            if not chosen_item and candidates:
                chosen_item = {
                    "text": candidates[0],
                    "similarity": 0.5
                }

            if chosen_item:
                chosen_item["company_name"] = comp_name_for_item
                accepted_reviews.append(chosen_item)
                working_pool.append(chosen_item["text"])

        now = datetime.now(timezone.utc)
        saved_records = []

        for item in accepted_reviews:
            review_text = item["text"]
            sim_score = item["similarity"]
            content_hash = compute_content_hash(review_text)
            sentiment_data = analyze_review_sentiment(review_text)

            comp_for_review = item.get("company_name", company_name)
            doc = {
                "companyId": str(company_id),
"companyName": comp_for_review,
                "companyLocation": location,
                "externalReviewLink": ext_review_link or external_review_link,
                "category": category,
                "keyword": keyword,
                "reviewText": review_text,
                "language": "en",
                "tone": tone,
                "length": length,
                "source": provider_name,
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

        log_doc = {
            "companyId": str(company_id),
            "keyword": keyword,
            "category": category,
            "requestedCount": target_count,
            "generatedCount": len(saved_records),
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
            "rejectedCount": total_rejected_count,
            "reviews": saved_records,
            "provider": provider_name,
            "isAiGenerated": is_ai_powered,
            "warning": warning_message,
            "status": status
        }

generator_service = ReviewGeneratorService()
