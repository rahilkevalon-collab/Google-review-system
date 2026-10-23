import logging
from datetime import datetime, timezone
from bson import ObjectId
from utils.db import Database, serialize_doc

logger = logging.getLogger(__name__)

DEFAULT_SAMPLE_COMPANIES = [
    {
        "name": "Kevalon Technology",
        "category": "IT Services and Software Development",
        "description": "Next-generation software engineering firm specializing in modern web, mobile apps, and enterprise AI automation.",
        "services": "Custom Software Development, Web & Mobile Apps, AI Solutions, Cloud Infrastructure",
        "location": "Ahmedabad, India",
        "preferredLanguage": "en",
        "externalReviewLink": "https://g.page/r/CS3urYTQ9A78EBI/review",
        "keywords": [
            "Web Development India",
            "Mobile App Development India",
            "Custom Software Development India",
            "CRM & ERP Development India",
            "AI Solutions India",
            "SEO Services India",
            "Digital Marketing India"
        ]
    },
    {
        "name": "Aura Organic Living",
        "category": "E-commerce",
        "description": "Artisanal organic skincare, clean beauty, and zero-waste sustainable lifestyle essentials.",
        "services": "Natural Skincare, Eco-friendly Home Decor, Organic Teas, Sustainable Packaging",
        "location": "Mumbai, India",
        "preferredLanguage": "en",
        "externalReviewLink": "https://search.google.com/local/writereview",
        "keywords": [
            "Product Quality",
            "Fast Delivery",
            "Eco Friendly Packaging",
            "Customer Support",
            "Affordable Prices",
            "Organic Ingredients"
        ]
    },
    {
        "name": "Spice Pavilion Fine Dine",
        "category": "Restaurants and Food",
        "description": "Award-winning heritage Indian fine dining restaurant serving royal thalis, slow-cooked curries, and artisanal mocktails.",
        "services": "Fine Dining, Private Banquet, Catering, Royal Thali Experience",
        "location": "Delhi, India",
        "preferredLanguage": "hi",
        "externalReviewLink": "https://search.google.com/local/writereview",
        "keywords": [
            "Culinary Taste",
            "Ambiance & Atmosphere",
            "Attentive Service",
            "Fresh Ingredients",
            "Signature Dishes",
            "Family Dining"
        ]
    }
]

class CompanyService:
    def __init__(self):
        self.db = Database.get_db()

    def seed_companies_if_empty(self):
        """Seed sample companies if collection is empty."""
        try:
            count = self.db.companies.count_documents({})
            if count == 0:
                now = datetime.now(timezone.utc)
                for comp in DEFAULT_SAMPLE_COMPANIES:
                    doc = dict(comp)
                    doc["createdAt"] = now
                    self.db.companies.insert_one(doc)
                logger.info("Sample companies seeded (%d companies).", len(DEFAULT_SAMPLE_COMPANIES))
        except Exception as e:
            logger.warning("Error seeding companies: %s", str(e))

    def get_all_companies(self) -> list[dict]:
        self.seed_companies_if_empty()
        companies = list(self.db.companies.find().sort("createdAt", -1))
        return [serialize_doc(c) for c in companies]

    def get_company_by_id(self, company_id: str) -> dict | None:
        if not ObjectId.is_valid(company_id):
            return None
        doc = self.db.companies.find_one({"_id": ObjectId(company_id)})
        return serialize_doc(doc) if doc else None

    def create_company(self, data: dict) -> dict:
        now = datetime.now(timezone.utc)
        name = data.get("name", "").strip()
        if not name:
            raise ValueError("Company name is required.")

        doc = {
            "name": name,
            "category": data.get("category", "Other"),
            "description": data.get("description", "").strip(),
            "services": data.get("services", "").strip(),
            "location": data.get("location", "").strip(),
            "preferredLanguage": data.get("preferredLanguage", "en"),
            "externalReviewLink": data.get("externalReviewLink", "").strip(),
            "keywords": data.get("keywords", []) if isinstance(data.get("keywords"), list) else [],
            "createdAt": now
        }
        res = self.db.companies.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_doc(doc)

company_service = CompanyService()
