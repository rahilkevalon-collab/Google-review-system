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
            "Web Development",
            "Mobile App Development",
            "Custom Software Development",
            "CRM & ERP Development",
            "AI Solutions",
            "Cloud Migration"
        ]
    },
    {
        "name": "Aura Organic Living",
        "category": "E-commerce",
        "description": "Artisanal organic skincare, clean beauty, and zero-waste sustainable lifestyle essentials.",
        "services": "Natural Skincare, Eco-friendly Home Decor, Organic Teas, Sustainable Packaging",
        "location": "Mumbai, India",
        "preferredLanguage": "en",
        "externalReviewLink": "",
        "keywords": [
            "Product Quality",
            "Fast Delivery",
            "Affordable Prices",
            "Customer Support",
            "Easy Returns",
            "Shopping Experience",
            "Packaging Integrity",
            "Value for Money",
            "Eco Friendly Packaging",
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
        "externalReviewLink": "",
        "keywords": [
            "Culinary Taste",
            "Ambiance & Atmosphere",
            "Attentive Service",
            "Fresh Ingredients",
            "Signature Dishes",
            "Cleanliness & Hygiene",
            "Great Value",
            "Family Friendly"
        ]
    },
    {
        "name": "Apex Care Multispeciality Clinic",
        "category": "Healthcare",
        "description": "Modern patient-first healthcare clinic providing comprehensive diagnostics, compassionate dental care, and specialized medical treatments.",
        "services": "Preventive Care, Cosmetic Dentistry, Diagnostics, Routine Checkups",
        "location": "Bangalore, India",
        "preferredLanguage": "en",
        "externalReviewLink": "",
        "keywords": [
            "Doctor Expertise",
            "Compassionate Care",
            "Modern Diagnostic Equipment",
            "Minimal Wait Time",
            "Accurate Treatment",
            "Hygienic Facility"
        ]
    },
    {
        "name": "Prime Landmark Realty",
        "category": "Real Estate",
        "description": "Premier real estate advisory specializing in premium residential apartments, commercial leasing, and verified property investments.",
        "services": "Residential Sales, Commercial Leasing, Property Advisory, Legal Due Diligence",
        "location": "Pune, India",
        "preferredLanguage": "en",
        "externalReviewLink": "",
        "keywords": [
            "Prime Location",
            "Transparent Dealings",
            "High Quality Construction",
            "On-Time Possession",
            "Legal Clarity",
            "Modern Amenities",
            "Investment Potential"
        ]
    },
    {
        "name": "BrightPath International Academy",
        "category": "Education",
        "description": "Excellence-driven learning institute empowering students with modern STEM education, competitive coaching, and career guidance.",
        "services": "STEM Education, Competitive Exam Preparation, Student Mentoring, Career Counseling",
        "location": "Hyderabad, India",
        "preferredLanguage": "en",
        "externalReviewLink": "",
        "keywords": [
            "Experienced Faculty",
            "Interactive Curriculum",
            "Practical Learning",
            "Student Mentorship",
            "Career Placement Support",
            "Modern Campus Infrastructure"
        ]
    },
    {
        "name": "Wanderlust Horizon Travels",
        "category": "Travel and Hospitality",
        "description": "Curated holiday itineraries, boutique resort bookings, customized international tours, and corporate retreats.",
        "services": "Curated Tour Packages, Luxury Hotel Bookings, Visa Assistance, Custom Itineraries",
        "location": "Goa, India",
        "preferredLanguage": "en",
        "externalReviewLink": "",
        "keywords": [
            "Comfortable Stay",
            "Scenic Location",
            "Courteous Staff",
            "Seamless Itinerary",
            "Prompt Room Service",
            "Custom Tour Packages"
        ]
    },
    {
        "name": "Glow & Grace Luxury Wellness Salon",
        "category": "Beauty and Salon",
        "description": "High-end aesthetic hair studio and organic day spa providing rejuvenating therapies, bridal makeovers, and personalized styling.",
        "services": "Hair Styling, Botanical Facials, Spa Therapies, Bridal Makeovers",
        "location": "Jaipur, India",
        "preferredLanguage": "en",
        "externalReviewLink": "",
        "keywords": [
            "Expert Stylists",
            "Premium Products",
            "Relaxing Ambience",
            "Personalized Consultation",
            "Clean & Sanitized Equipment",
            "Trending Styles"
        ]
    },
    {
        "name": "NexGen Growth Media",
        "category": "Digital Marketing",
        "description": "Results-oriented digital agency scaling brands with data-driven SEO, creative performance ads, and high-engagement social branding.",
        "services": "Search Engine Optimization, Performance Ads, Content Strategy, Brand Consulting",
        "location": "Gurgaon, India",
        "preferredLanguage": "en",
        "externalReviewLink": "",
        "keywords": [
            "SEO Ranking Growth",
            "Targeted Lead Generation",
            "High ROI Campaigns",
            "Creative Content",
            "Transparent Reporting",
            "Brand Visibility"
        ]
    },
    {
        "name": "Urban Trendz Lifestyle Superstore",
        "category": "Retail",
        "description": "Contemporary lifestyle department store offering premium fashion collections, curated home essentials, and tech accessories.",
        "services": "Fashion Apparel, Footwear, Home Accents, Personal Shopping",
        "location": "Chennai, India",
        "preferredLanguage": "en",
        "externalReviewLink": "",
        "keywords": [
            "Wide Selection",
            "Helpful Staff",
            "Competitive Pricing",
            "Store Ambience",
            "Exclusive Collections",
            "Quick Billing"
        ]
    },
    {
        "name": "Elite Falcon Global Consulting",
        "category": "Other",
        "description": "Strategic advisory and multi-disciplinary corporate consulting firm providing business management, financial advisory, and operational excellence.",
        "services": "Business Advisory, Financial Consulting, Supply Chain Optimization, Risk Management",
        "location": "Kolkata, India",
        "preferredLanguage": "en",
        "externalReviewLink": "",
        "keywords": [
            "Professionalism",
            "Timely Delivery",
            "Clear Communication",
            "Cost Effectiveness",
            "Quality Assurance",
            "Client Satisfaction"
        ]
    }
]

class CompanyService:
    def __init__(self):
        self.db = Database.get_db()

    def seed_companies_if_empty(self):
        """Seed sample companies if missing for any category."""
        try:
            now = datetime.now(timezone.utc)
            for comp in DEFAULT_SAMPLE_COMPANIES:
                exists = self.db.companies.find_one({"category": comp["category"]})
                if not exists:
                    doc = dict(comp)
                    doc["createdAt"] = now
                    self.db.companies.insert_one(doc)
                    logger.info("Sample company seeded for category %s: %s", comp["category"], comp["name"])
        except Exception as e:
            logger.warning("Error seeding companies: %s", str(e))

    def get_all_companies(self) -> list[dict]:
        self.seed_companies_if_empty()
        companies = list(self.db.companies.find().sort("createdAt", 1))
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


    def add_keyword(self, company_id: str, keyword: str) -> bool:
        if not ObjectId.is_valid(company_id) or not keyword:
            return False
        kw = keyword.strip()
        if not kw:
            return False
        res = self.db.companies.update_one(
            {"_id": ObjectId(company_id)},
            {"$addToSet": {"keywords": kw}}
        )
        return res.matched_count > 0

company_service = CompanyService()
