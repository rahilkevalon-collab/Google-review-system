import logging
import urllib.parse
from bson import ObjectId
from datetime import datetime, timezone
from utils.db import Database, serialize_doc
from utils.text_utils import extract_word_count, compute_content_hash
from ai.sentiment import analyze_review_sentiment

logger = logging.getLogger(__name__)

class ReviewService:
    @property
    def db(self):
        return Database.get_db()

    def get_review_by_id(self, review_id: str) -> dict | None:
        if not ObjectId.is_valid(review_id):
            return None
        doc = self.db.generated_reviews.find_one({"_id": ObjectId(review_id)})
        if not doc:
            return None
        r = serialize_doc(doc)
        
        # Enrich with company details
        cid = r.get("companyId")
        if cid and ObjectId.is_valid(cid):
            c = self.db.companies.find_one({"_id": ObjectId(cid)})
            if c:
                r["companyName"] = r.get("companyName") or c.get("name", "Business")
                r["companyLocation"] = r.get("companyLocation") or c.get("location", "")
                r["formattedAddress"] = c.get("formattedAddress", "")
                r["googlePlaceId"] = c.get("googlePlaceId", "")
                r["category"] = r.get("category") or c.get("category", "")
                
                if c.get("googlePlaceId"):
                    ext_link = f"https://search.google.com/local/writereview?placeid={c.get('googlePlaceId')}"
                else:
                    ext_link = c.get("googleReviewUrl") or c.get("externalReviewLink") or ""
                    if not ext_link or ext_link == "https://search.google.com/local/writereview" or not ext_link.startswith("http"):
                        query_str = f"{r['companyName']} {r['companyLocation']}".strip()
                        ext_link = f"https://www.google.com/search?q={urllib.parse.quote_plus(query_str)}"
                
                r["googleReviewUrl"] = ext_link
        # Normalize legacy record fields safely without recalculating or randomizing
        if "rating" not in r or r["rating"] is None:
            r["rating"] = 5
        else:
            try:
                r["rating"] = int(r["rating"])
            except (ValueError, TypeError):
                r["rating"] = 5

        if "isDemo" not in r:
            r["isDemo"] = (r.get("ratingType") != "real") and (r.get("source") != "customer-submitted")

        if "selectedKeywords" not in r or not isinstance(r.get("selectedKeywords"), list):
            kw_str = r.get("keyword", "")
            r["selectedKeywords"] = [k.strip() for k in kw_str.split(",") if k.strip()] if kw_str else []

        return r

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
                query_str = f"{comp_name} {comp_loc}".strip()
                ext_link = f"https://www.google.com/search?q={urllib.parse.quote_plus(query_str)}"
            
            r["externalReviewLink"] = ext_link
            r["companyLocation"] = comp_loc
            r["companyName"] = comp_name

            # Normalize legacy record fields safely without recalculating or randomizing
            if "rating" not in r or r["rating"] is None:
                r["rating"] = 5
            else:
                try:
                    r["rating"] = int(r["rating"])
                except (ValueError, TypeError):
                    r["rating"] = 5

            if "isDemo" not in r:
                r["isDemo"] = (r.get("ratingType") != "real") and (r.get("source") != "customer-submitted")

            if "selectedKeywords" not in r or not isinstance(r.get("selectedKeywords"), list):
                kw_str = r.get("keyword", "")
                r["selectedKeywords"] = [k.strip() for k in kw_str.split(",") if k.strip()] if kw_str else []

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

        current = self.db.generated_reviews.find_one({"_id": ObjectId(review_id)})
        if not current:
            return None

        # If another review document in this company has this hash, salt it with review_id
        dup = self.db.generated_reviews.find_one({
            "companyId": current.get("companyId"),
            "contentHash": new_hash,
            "_id": {"$ne": ObjectId(review_id)}
        })
        if dup:
            new_hash = compute_content_hash(f"{cleaned}-{review_id}")

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
