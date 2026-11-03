import logging
import re
import time
from datetime import datetime, timezone
from bson import ObjectId
from utils.db import Database, serialize_doc
from models.schemas import INITIAL_CATEGORIES

logger = logging.getLogger(__name__)

def normalize_category_name(name: str) -> str:
    """Normalize category name for robust case-insensitive, whitespace, and punctuation comparison."""
    if not name:
        return ""
    clean = re.sub(r'[^\w\s]', '', str(name).lower())
    return re.sub(r'\s+', ' ', clean).strip()

class CategoryService:
    def __init__(self):
        self._seeded = False
        self._cached_categories = None
        self._cached_categories_time = 0
        self._cached_keywords = {}
        self._cache_ttl = 60  # seconds

    @property
    def db(self):
        return Database.get_db()

    def invalidate_cache(self):
        """Invalidate in-memory cache on write operations."""
        self._cached_categories = None
        self._cached_categories_time = 0
        self._cached_keywords.clear()

    def seed_categories_if_empty(self, force: bool = False):
        """Seed default predefined categories and backfill missing normalized fields on existing categories."""
        if self._seeded and not force:
            return
        try:
            now = datetime.now(timezone.utc)
            # Ensure predefined categories exist and have standard required fields
            for cat in INITIAL_CATEGORIES:
                norm = normalize_category_name(cat["name"])
                self.db.categories.update_one(
                    {"name": cat["name"]},
                    {
                        "$setOnInsert": {
                            "createdAt": now,
                            "keywords": cat.get("keywords", []),
                            "description": cat.get("description", ""),
                            "icon": cat.get("icon", "Layers")
                        },
                        "$set": {
                            "name": cat["name"],
                            "normalizedName": norm,
                            "type": "predefined",
                            "status": "active",
                            "isActive": True,
                            "updatedAt": now
                        }
                    },
                    upsert=True
                )

            # Backfill any existing categories that lack normalizedName or type
            missing_fields = self.db.categories.find({
                "$or": [
                    {"normalizedName": {"$exists": False}},
                    {"type": {"$exists": False}},
                    {"status": {"$exists": False}}
                ]
            })
            for c in missing_fields:
                n = normalize_category_name(c.get("name", ""))
                is_predefined = any(normalize_category_name(p["name"]) == n for p in INITIAL_CATEGORIES)
                c_type = "predefined" if is_predefined else "custom"
                self.db.categories.update_one(
                    {"_id": c["_id"]},
                    {
                        "$set": {
                            "normalizedName": n,
                            "type": c.get("type") or c_type,
                            "status": c.get("status") or "active",
                            "isActive": True,
                            "updatedAt": now
                        }
                    }
                )
            self._seeded = True
            self.invalidate_cache()
        except Exception as e:
            logger.warning("Notice during categories seeding/updating: %s", str(e))

    def create_or_get_category(self, name: str, category_type: str = "custom") -> dict:
        """
        Dynamically find or create a business category.
        Ensures:
          - Unique ID (_id)
          - Category Name (properly trimmed)
          - Normalized Category Name (normalizedName)
          - Category Type ('predefined' or 'custom')
          - Active Status ('active', isActive: True)
          - Created At & Updated At timestamps
        Guarantees case-insensitive and whitespace-normalized deduplication.
        """
        self.seed_categories_if_empty()
        name_clean = " ".join(str(name or "").strip().split())
        if not name_clean:
            raise ValueError("Category name cannot be empty.")

        norm = normalize_category_name(name_clean)
        if not norm:
            raise ValueError("Please enter a valid category name.")

        if norm == "other":
            raise ValueError("Please enter a specific category name instead of 'Other'.")

        # 1. Match by normalizedName
        existing = self.db.categories.find_one({"normalizedName": norm})
        if existing:
            return serialize_doc(existing)

        # 2. Match by case-insensitive regex
        existing = self.db.categories.find_one({
            "name": {"$regex": f"^{re.escape(name_clean)}$", "$options": "i"}
        })
        if existing:
            return serialize_doc(existing)

        # 3. Insert new custom category
        now = datetime.now(timezone.utc)
        doc = {
            "name": name_clean,
            "normalizedName": norm,
            "type": category_type,
            "status": "active",
            "isActive": True,
            "icon": "Layers",
            "description": f"{name_clean} products, services, and solutions.",
            "keywords": [
                f"{name_clean} Services",
                "Quality Customer Care",
                "Professional Service",
                "Top Rated Provider",
                "Reliable Team",
                "Client Satisfaction",
                "Prompt Response",
                "Expert Consultation"
            ],
            "createdAt": now,
            "updatedAt": now
        }
        res = self.db.categories.insert_one(doc)
        doc["_id"] = res.inserted_id
        self.invalidate_cache()
        logger.info("Created new %s business category: '%s' (ID: %s)", category_type, name_clean, str(res.inserted_id))
        return serialize_doc(doc)

    def get_all_categories(self) -> list[dict]:
        """Return all active categories sorted alphabetically with 'Other' strictly at the end."""
        now = time.time()
        if self._cached_categories is not None and (now - self._cached_categories_time < self._cache_ttl):
            return list(self._cached_categories)

        self.seed_categories_if_empty()
        categories = list(self.db.categories.find(
            {"status": {"$ne": "inactive"}},
            {"_id": 1, "name": 1, "normalizedName": 1, "type": 1, "status": 1, "isActive": 1, "icon": 1}
        ).sort("name", 1))

        serialized = [serialize_doc(c) for c in categories]
        non_other = [c for c in serialized if c.get("name", "").strip().lower() != "other"]
        other = [c for c in serialized if c.get("name", "").strip().lower() == "other"]
        result = non_other + other

        self._cached_categories = result
        self._cached_categories_time = now
        return result

    def get_keywords_by_category(self, category_identifier: str) -> list[str]:
        """Lookup keywords by category ID, name, or normalizedName with in-memory caching."""
        if not category_identifier:
            return []

        ident_key = str(category_identifier).strip().lower()
        if ident_key in self._cached_keywords:
            return list(self._cached_keywords[ident_key])

        self.seed_categories_if_empty()
        query = {}
        if ObjectId.is_valid(category_identifier):
            query = {"$or": [{"_id": ObjectId(category_identifier)}, {"name": category_identifier}]}
        else:
            norm = normalize_category_name(category_identifier)
            query = {"$or": [{"name": category_identifier}, {"normalizedName": norm}]}

        cat = self.db.categories.find_one(query, {"keywords": 1})
        if cat and "keywords" in cat and cat["keywords"]:
            kws = list(cat["keywords"])
            self._cached_keywords[ident_key] = kws
            return kws

        for item in INITIAL_CATEGORIES:
            if item["name"].lower() == category_identifier.lower():
                kws = list(item["keywords"])
                self._cached_keywords[ident_key] = kws
                return kws

        fallback_kws = [
            f"{category_identifier} Services",
            "Quality Customer Care",
            "Professional Service",
            "Client Satisfaction",
            "Reliability",
            "Top Rated Provider"
        ]
        self._cached_keywords[ident_key] = fallback_kws
        return fallback_kws

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
            norm = normalize_category_name(category_identifier)
            query = {"$or": [{"name": category_identifier}, {"normalizedName": norm}]}
        res = self.db.categories.update_one(query, {"$addToSet": {"keywords": kw}})
        self.invalidate_cache()
        return res.matched_count > 0

category_service = CategoryService()
