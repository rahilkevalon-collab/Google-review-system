import uuid
import logging
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
        
        cursor = self.db.generated_reviews.find(query, {"reviewText": 1})
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
        
        llm_provider = get_llm_provider()
        provider_name = llm_provider.name
        is_ai_powered = llm_provider.is_ai

        accepted_reviews = []
        total_rejected_count = 0
        rejection_details = []
        attempts = 0
        max_attempts = Config.MAX_GENERATION_RETRIES

        # Working comparison pool starts with historical reviews
        working_pool = list(history_texts)

        # Effective threshold can dynamically adapt if history is dense
        current_threshold = threshold

        while len(accepted_reviews) < target_count and attempts < max_attempts:
            attempts += 1
            needed = target_count - len(accepted_reviews)
            
            # Request large candidate pool to compensate for deduplication
            candidates, src = llm_provider.generate_review_candidates(
                company_name=company_name,
                category=category,
                keyword=keyword,
                description=description,
                services=services,
                location=location,
                language=language,
                tone=tone,
                length=length,
                count=max(6, needed * 5)
            )

            # Filter candidates against working history + current accepted items
            accepted, rejected = nlp_engine.filter_batch(
                candidate_texts=candidates,
                historical_texts=working_pool,
                threshold=current_threshold
            )

            total_rejected_count += len(rejected)
            rejection_details.extend(rejected)

            for item in accepted:
                if len(accepted_reviews) < target_count:
                    accepted_reviews.append(item)
                    working_pool.append(item["text"])

            # If still needed on subsequent attempts, slightly relax threshold to accept diverse sentences
            if len(accepted_reviews) < target_count and attempts >= 2:
                current_threshold = min(current_threshold + 0.05, 0.82)

        # Prepare records for database insertion
        now = datetime.now(timezone.utc)
        saved_records = []

        for item in accepted_reviews:
            review_text = item["text"]
            content_hash = item["hash"]
            sim_score = item.get("max_similarity", 0.0)
            sentiment_data = analyze_review_sentiment(review_text)

            doc = {
                "companyId": str(company_id),
                "companyName": company_name,
                "category": category,
                "keyword": keyword,
                "reviewText": review_text,
                "language": language,
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
                # Caught an exact contentHash conflict across concurrent sessions
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
