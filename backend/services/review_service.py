import logging
import urllib.parse
from bson import ObjectId
from datetime import datetime, timezone
from utils.db import Database, serialize_doc
from utils.text_utils import extract_word_count, compute_content_hash
from ai.sentiment import analyze_review_sentiment

logger = logging.getLogger(__name__)

class ReviewService:
    def __init__(self):
        self.db = Database.get_db()

    def get_review_by_id(self, review_id: str) -> dict | None:
        if not ObjectId.is_valid(review_id):
            return None
        doc = self.db.generated_reviews.find_one({"_id": ObjectId(review_id)})
        return serialize_doc(doc) if doc else None

    def list_reviews(
        self,
        company_id: str = None,
        keyword: str = None,
        category: str = None,
        tone: str = None,
        language: str = None,
        search: str = None,
        page: int = 1,
        limit: int = 12
    ) -> dict:
        query = {}
        if company_id:
            query["companyId"] = str(company_id)
        if keyword:
            query["keyword"] = keyword
        if category:
            query["category"] = category
        if tone:
            query["tone"] = tone
        if language:
            query["language"] = language
        if search:
            query["$or"] = [
                {"reviewText": {"$regex": search, "$options": "i"}},
                {"keyword": {"$regex": search, "$options": "i"}}
            ]

        total = self.db.generated_reviews.count_documents(query)
        skip = max(0, (page - 1) * limit)
        cursor = self.db.generated_reviews.find(query).sort("createdAt", -1).skip(skip).limit(limit)

        raw_reviews = [serialize_doc(doc) for doc in cursor]
        
        # Batch lookup company info to enrich externalReviewLink
        company_ids = list({r.get("companyId") for r in raw_reviews if r.get("companyId") and ObjectId.is_valid(r.get("companyId"))})
        comp_map = {}
        if company_ids:
            comps = self.db.companies.find({"_id": {"$in": [ObjectId(cid) for cid in company_ids]}})
            for c in comps:
                comp_map[str(c["_id"])] = c

        enriched_reviews = []
        for r in raw_reviews:
            cid = r.get("companyId")
            c = comp_map.get(cid)
            comp_name = r.get("companyName") or (c.get("name") if c else "Business")
            comp_loc = r.get("companyLocation") or (c.get("location") if c else "")
            
            ext_link = (c.get("externalReviewLink") if c else "") or r.get("externalReviewLink") or ""
            if not ext_link or ext_link == "https://search.google.com/local/writereview" or not ext_link.startswith("http"):
                query_str = f"{comp_name} {comp_loc} reviews".strip()
                ext_link = f"https://www.google.com/search?q={urllib.parse.quote_plus(query_str)}"
            
            r["externalReviewLink"] = ext_link
            r["companyLocation"] = comp_loc
            r["companyName"] = comp_name
            enriched_reviews.append(r)

        return {
            "reviews": enriched_reviews,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if total > 0 else 1
        }

    def record_copy_event(self, review_id: str) -> bool:
        if not ObjectId.is_valid(review_id):
            return False
        res = self.db.generated_reviews.update_one(
            {"_id": ObjectId(review_id)},
            {"$inc": {"copyCount": 1}, "$set": {"lastCopiedAt": datetime.now(timezone.utc)}}
        )
        return res.modified_count > 0

    def update_review_text(self, review_id: str, new_text: str) -> dict | None:
        if not ObjectId.is_valid(review_id) or not new_text.strip():
            return None
        
        cleaned = new_text.strip()
        sentiment_data = analyze_review_sentiment(cleaned)
        word_count = extract_word_count(cleaned)
        new_hash = compute_content_hash(cleaned)

        self.db.generated_reviews.update_one(
            {"_id": ObjectId(review_id)},
            {
                "$set": {
                    "reviewText": cleaned,
                    "contentHash": new_hash,
                    "wordCount": word_count,
                    "sentiment": sentiment_data,
                    "isUserEdited": True,
                    "updatedAt": datetime.now(timezone.utc)
                }
            }
        )
        return self.get_review_by_id(review_id)

review_service = ReviewService()
