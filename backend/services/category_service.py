import logging
from bson import ObjectId
from utils.db import Database, serialize_doc
from models.schemas import INITIAL_CATEGORIES

logger = logging.getLogger(__name__)

class CategoryService:
    def __init__(self):
        self.db = Database.get_db()

    def seed_categories_if_empty(self):
        """Seed default categories if the collection is empty."""
        try:
            count = self.db.categories.count_documents({})
            if count == 0:
                for cat in INITIAL_CATEGORIES:
                    self.db.categories.update_one(
                        {"name": cat["name"]},
                        {"$set": cat},
                        upsert=True
                    )
                logger.info("Default business categories seeded (%d categories).", len(INITIAL_CATEGORIES))
        except Exception as e:
            logger.warning("Error seeding categories: %s", str(e))

    def get_all_categories(self) -> list[dict]:
        self.seed_categories_if_empty()
        categories = list(self.db.categories.find().sort("name", 1))
        serialized = [serialize_doc(c) for c in categories]
        non_other = [c for c in serialized if c.get("name", "").strip().lower() != "other"]
        other = [c for c in serialized if c.get("name", "").strip().lower() == "other"]
        return non_other + other

    def get_keywords_by_category(self, category_identifier: str) -> list[str]:
        """Lookup keywords by category ID or name."""
        self.seed_categories_if_empty()
        query = {}
        if ObjectId.is_valid(category_identifier):
            query = {"$or": [{"_id": ObjectId(category_identifier)}, {"name": category_identifier}]}
        else:
            query = {"name": category_identifier}

        cat = self.db.categories.find_one(query)
        if cat and "keywords" in cat:
            return cat["keywords"]

        # If not found in DB, search initial static list
        for item in INITIAL_CATEGORIES:
            if item["name"].lower() == category_identifier.lower():
                return item["keywords"]

        return ["Quality Service", "Customer Satisfaction", "Reliability", "Professionalism"]

    def add_keyword(self, category_identifier: str, keyword: str) -> bool:
        """Add a custom keyword to a category."""
        if not category_identifier or not keyword:
            return False
        kw = keyword.strip()
        if not kw:
            return False
        query = {}
        if ObjectId.is_valid(category_identifier):
            query = {"$or": [{"_id": ObjectId(category_identifier)}, {"name": category_identifier}]}
        else:
            query = {"name": category_identifier}
        res = self.db.categories.update_one(query, {"$addToSet": {"keywords": kw}})
        return res.matched_count > 0

category_service = CategoryService()
