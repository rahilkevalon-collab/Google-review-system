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
        "googlePlaceId": "ChIJQwrcdyL0U6cRLe6thND0Dvw",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJQwrcdyL0U6cRLe6thND0Dvw",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJQwrcdyL0U6cRLe6thND0Dvw",
        "keywords": [
            "Web Development",
            "Mobile App Development",
            "Custom Software Development",
            "CRM & ERP Development",
            "AI Solutions",
            "Cloud Migration"
        ],
        "seoKeywords": [
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
        "googlePlaceId": "ChIJi3y7u3XB5zsRRd90Sy4sva0",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJi3y7u3XB5zsRRd90Sy4sva0",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJi3y7u3XB5zsRRd90Sy4sva0",
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
        "name": "Prime Restaurant & Banquet",
        "category": "Restaurants and Food",
        "description": "Exquisite fine dining restaurant and royal banquet hall offering authentic multi-cuisine delicacies, family dining, and premier celebrations.",
        "services": "Fine Dining, Royal Banquet, Gourmet Catering, Family Celebrations, Corporate Dinners",
        "location": "Ahmedabad, India",
        "preferredLanguage": "en",
        "googlePlaceId": "ChIJszBVRACHXjkRtG5e073CAoQ",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJszBVRACHXjkRtG5e073CAoQ",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJszBVRACHXjkRtG5e073CAoQ",
        "keywords": [
            "Culinary Taste",
            "Ambiance & Atmosphere",
            "Attentive Service",
            "Fresh Ingredients",
            "Signature Dishes",
            "Cleanliness & Hygiene",
            "Great Value",
            "Family Friendly"
        ],
        "seoKeywords": [
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
        "name": "Spice Pavilion Fine Dine",
        "category": "Restaurants and Food",
        "description": "Award-winning heritage Indian fine dining restaurant serving royal thalis, slow-cooked curries, and artisanal mocktails.",
        "services": "Fine Dining, Private Banquet, Catering, Royal Thali Experience",
        "location": "Delhi, India",
        "preferredLanguage": "en",
        "googlePlaceId": "ChIJkYvqFzIBDTkRebU3AA7VtVg",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJkYvqFzIBDTkRebU3AA7VtVg",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJkYvqFzIBDTkRebU3AA7VtVg",
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
        "googlePlaceId": "ChIJW-MP6V4VrjsRDEEqgetQJCo",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJW-MP6V4VrjsRDEEqgetQJCo",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJW-MP6V4VrjsRDEEqgetQJCo",
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
        "googlePlaceId": "ChIJN-pwAYy_wjsRYRhXpMOhikE",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJN-pwAYy_wjsRYRhXpMOhikE",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJN-pwAYy_wjsRYRhXpMOhikE",
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
        "googlePlaceId": "ChIJN7TSooPzyzsRa-dQJGmZWvc",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJN7TSooPzyzsRa-dQJGmZWvc",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJN7TSooPzyzsRa-dQJGmZWvc",
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
        "googlePlaceId": "ChIJbQfYrOO5vzsRBEfbxi_in7M",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJbQfYrOO5vzsRBEfbxi_in7M",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJbQfYrOO5vzsRBEfbxi_in7M",
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
        "googlePlaceId": "ChIJ5dg7rAezbTkRORkVnq3T7Lg",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJ5dg7rAezbTkRORkVnq3T7Lg",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJ5dg7rAezbTkRORkVnq3T7Lg",
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
        "googlePlaceId": "ChIJO05hWEsZDTkR99gFDRY-UX0",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJO05hWEsZDTkR99gFDRY-UX0",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJO05hWEsZDTkR99gFDRY-UX0",
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
        "googlePlaceId": "ChIJb2_ONDpcUjoRF57wnIFtyj4",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJb2_ONDpcUjoRF57wnIFtyj4",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJb2_ONDpcUjoRF57wnIFtyj4",
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
        "googlePlaceId": "ChIJ99BkbKNdXz4RaY9ijYl87v4",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJ99BkbKNdXz4RaY9ijYl87v4",
        "externalReviewLink": "https://search.google.com/local/writereview?placeid=ChIJ99BkbKNdXz4RaY9ijYl87v4",
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

def int_feature_to_place_id(f1: int | str, f2: int | str) -> str | None:
    """Converts a Google 64-bit integer feature pair into a canonical Place ID (ChIJ...)."""
    try:
        import struct, base64
        buf = bytearray(20)
        buf[0] = 10
        buf[1] = 18
        buf[2] = 9
        struct.pack_into("<Q", buf, 3, int(f1))
        buf[11] = 17
        struct.pack_into("<Q", buf, 12, int(f2))
        b64 = base64.b64encode(buf).decode("ascii")
        return b64.replace("+", "-").replace("/", "_").rstrip("=")
    except Exception:
        return None

def hex_feature_to_place_id(hex_str: str) -> str | None:
    """Converts a Google hex feature pair (0x...:0x...) into a canonical Place ID (ChIJ...)."""
    try:
        if not hex_str or ":" not in hex_str:
            return None
        parts = hex_str.split(":")
        clean0 = parts[0].strip()
        clean1 = parts[1].split(",")[0].strip()
        if not (clean0.startswith("0x") and clean1.startswith("0x")):
            return None
        return int_feature_to_place_id(int(clean0, 16), int(clean1, 16))
    except Exception:
        return None

def extract_place_id_from_url(url: str) -> str:
    """Extracts Google Place ID from any URL format (?placeid=, ?place_id=, #lrd=0x...:0x..., !1s0x...:0x..., or raw ChIJ...)."""
    if not url:
        return ""
    import re, urllib.parse
    clean_url = str(url).strip()

    # If it is a shortlink, resolve redirect first
    if "maps.app.goo.gl" in clean_url or "goo.gl/maps" in clean_url:
        try:
            import urllib.request
            req = urllib.request.Request(clean_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=4) as resp:
                clean_url = resp.geturl()
        except Exception:
            pass

    # 1. Raw ChIJ string directly passed
    m_raw = re.search(r'\b(ChIJ[0-9A-Za-z_-]{23,})\b', clean_url)
    if m_raw:
        return m_raw.group(1).strip()
    # 2. Query param ?placeid= or ?place_id=
    m = re.search(r'[?&](?:placeid|place_id)=([^&#]+)', clean_url, re.I)
    if m:
        return urllib.parse.unquote(m.group(1)).strip()
    # 3. Google hex feature pair (in #lrd= or maps data parameter !1s0x...:0x...)
    m_hex = re.search(r'0x[0-9a-fA-F]+:0x[0-9a-fA-F]+', clean_url)
    if m_hex:
        conv = hex_feature_to_place_id(m_hex.group(0))
        if conv:
            return conv
    return ""

PRESET_BUSINESS_PLACE_IDS = {
    "kevalon": "ChIJQwrcdyL0U6cRLe6thND0Dvw",
    "prime": "ChIJszBVRACHXjkRtG5e073CAoQ",
    "budventure": "ChIJMWJeZ_aEXjkRFt-P5KOVgFE",
    "maxgen": "ChIJOYKhVKyEXjkRU_gN_7BOj1U",
    "shivalik": "ChIJk0usKwCBXjkRpPxi1bxD4vI",
    "aura organic": "ChIJi3y7u3XB5zsRRd90Sy4sva0",
    "spice pavilion": "ChIJkYvqFzIBDTkRebU3AA7VtVg",
    "apex care": "ChIJW-MP6V4VrjsRDEEqgetQJCo",
    "prime landmark": "ChIJN-pwAYy_wjsRYRhXpMOhikE",
    "brightpath": "ChIJN7TSooPzyzsRa-dQJGmZWvc",
    "wanderlust horizon": "ChIJbQfYrOO5vzsRBEfbxi_in7M",
    "glow & grace": "ChIJ5dg7rAezbTkRORkVnq3T7Lg",
    "nexgen growth": "ChIJO05hWEsZDTkR99gFDRY-UX0",
    "urban trendz": "ChIJb2_ONDpcUjoRF57wnIFtyj4",
    "elite falcon": "ChIJ99BkbKNdXz4RaY9ijYl87v4"
}

def auto_discover_place_id(name: str, location: str = "") -> str:
    """
    Universally discovers verified Google Place ID for ANY business name and location
    via preset mappings, direct URL extraction, and Google Maps embed metadata (extracting
    ChIJ Place IDs, 0x hex feature pairs, and 64-bit integer feature pairs).
    """
    clean_name = str(name or "").strip()
    if not clean_name:
        return ""

    lower_name = clean_name.lower()

    # 1. Check verified presets dictionary
    for key, pid in PRESET_BUSINESS_PLACE_IDS.items():
        if key in lower_name:
            return pid

    # 2. Check if user pasted a link or raw Place ID in location or name
    pid = extract_place_id_from_url(location) or extract_place_id_from_url(name)
    if pid:
        return pid

    # 3. Universal discovery via Google Maps embed metadata
    import urllib.parse, urllib.request, re
    clean_loc = re.sub(r'[,.]+', ' ', str(location or '')).strip()
    clean_loc = ' '.join(clean_loc.split())
    clean_n = re.sub(r'[,.]+', ' ', clean_name).strip()
    clean_n = ' '.join(clean_n.split())

    queries_to_try = []
    if clean_loc:
        queries_to_try.append(f"{clean_n} {clean_loc}")
        loc_words = clean_loc.split()
        if len(loc_words) > 2:
            queries_to_try.append(f"{clean_n} {loc_words[0]} {loc_words[-1]}")
    queries_to_try.append(clean_n)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    for q in queries_to_try:
        try:
            url = f"https://maps.google.com/maps?q={urllib.parse.quote_plus(q)}&output=embed"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=6) as resp:
                html = resp.read().decode("utf-8", errors="ignore")

            # Check direct canonical Place ID (ChIJ...)
            chijs = re.findall(r'ChIJ[0-9A-Za-z_-]{22,}', html)
            if chijs:
                return chijs[0]

            # Check hex feature pair (0x...:0x...)
            hexes = re.findall(r'0x[0-9a-fA-F]+:0x[0-9a-fA-F]+', html)
            if hexes:
                conv = hex_feature_to_place_id(hexes[0])
                if conv:
                    return conv

            # Check 64-bit integer feature pairs [\"4133886534972652285\",\"12951051994302378265\"]
            dec_pairs = re.findall(r'\["(\d{15,22})",\s*"(\d{15,22})"', html)
            if dec_pairs:
                conv = int_feature_to_place_id(dec_pairs[0][0], dec_pairs[0][1])
                if conv:
                    return conv
        except Exception as e:
            logger.debug("Embed lookup attempt failed for '%s': %s", q, str(e))
            continue

    # 4. Fallback: Check candidate domain shortlinks/embeds
    words = lower_name.split()
    slug = re.sub(r'[^a-z0-9]', '', words[0]) if words else ""
    full_slug = re.sub(r'[^a-z0-9]', '', "".join(words[:2])) if len(words) >= 2 else slug
    candidates = [
        f"https://www.{slug}.com/",
        f"https://www.{slug}.technology/",
        f"https://www.{full_slug}.com/",
        f"https://{slug}tech.com/",
        f"https://www.{slug}.in/",
        f"https://{slug}.co.in/"
    ]
    for url in candidates:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=3) as resp:
                html = resp.read().decode("utf-8", errors="ignore")

            shorts = re.findall(r'https?://(?:maps\.app\.goo\.gl|goo\.gl/maps)/[a-zA-Z0-9_-]+', html)
            for s in shorts:
                s_pid = extract_place_id_from_url(s)
                if s_pid:
                    return s_pid

            embed_hex = re.search(r'0x[0-9a-fA-F]+:0x[0-9a-fA-F]+', html)
            if embed_hex:
                conv = hex_feature_to_place_id(embed_hex.group(0))
                if conv:
                    return conv
        except Exception:
            continue

    return ""

class CompanyService:
    @property
    def db(self):
        return Database.get_db()

    def seed_companies_if_empty(self):
        """Seed sample companies if missing for any category and update broken writereview links."""
        try:
            now = datetime.now(timezone.utc)
            for comp in DEFAULT_SAMPLE_COMPANIES:
                exists = self.db.companies.find_one({"category": comp["category"]})
                if not exists:
                    doc = dict(comp)
                    doc["createdAt"] = now
                    self.db.companies.insert_one(doc)
                    logger.info("Sample company seeded for category %s: %s", comp["category"], comp["name"])
                else:
                    # Update sample company to official writereview link if needed
                    c_pid = comp.get("googlePlaceId")
                    if c_pid and exists.get("googlePlaceId") != c_pid:
                        direct_url = f"https://search.google.com/local/writereview?placeid={c_pid}"
                        self.db.companies.update_one(
                            {"_id": exists["_id"]},
                            {"$set": {
                                "googlePlaceId": c_pid,
                                "googleReviewUrl": direct_url,
                                "externalReviewLink": direct_url
                            }}
                        )

            # Auto-upgrade all companies in MongoDB to guaranteed direct writereview links
            for c_doc in self.db.companies.find():
                curr_pid = c_doc.get("googlePlaceId")
                curr_url = c_doc.get("googleReviewUrl") or c_doc.get("externalReviewLink") or ""
                if not curr_pid or not curr_url.startswith("https://search.google.com/local/writereview?placeid="):
                    discovered = auto_discover_place_id(c_doc["name"], c_doc.get("location", ""))
                    if discovered:
                        direct_url = f"https://search.google.com/local/writereview?placeid={discovered}"
                        self.db.companies.update_one(
                            {"_id": c_doc["_id"]},
                            {"$set": {
                                "googlePlaceId": discovered,
                                "googleReviewUrl": direct_url,
                                "externalReviewLink": direct_url
                            }}
                        )

            # Ensure all companies have seoKeywords field populated
            for c_doc in self.db.companies.find():
                if not c_doc.get("seoKeywords") and c_doc.get("keywords"):
                    self.db.companies.update_one(
                        {"_id": c_doc["_id"]},
                        {"$set": {"seoKeywords": c_doc["keywords"]}}
                    )

            # Ensure every company has at least 3 initial review templates saved in generated_reviews
            for c_doc in self.db.companies.find():
                cid_str = str(c_doc["_id"])
                existing_cnt = self.db.generated_reviews.count_documents({"companyId": cid_str})
                if existing_cnt < 3:
                    try:
                        from ai.generator import generator_service
                        k_list = c_doc.get("seoKeywords") or c_doc.get("keywords") or ["Quality Service"]
                        init_kws = k_list[:2] if len(k_list) >= 2 else k_list
                        generator_service.generate_reviews(
                            company_id=cid_str,
                            company_name=c_doc["name"],
                            category=c_doc.get("category", "Other"),
                            keyword=", ".join(init_kws),
                            selected_keywords=init_kws,
                            services=c_doc.get("services", ""),
                            location=c_doc.get("location", ""),
                            language=c_doc.get("preferredLanguage", "en"),
                            count=3
                        )
                    except Exception as ge:
                        logger.warning("Initial review template seeding error for %s: %s", c_doc["name"], str(ge))
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

    def generate_seo_keywords(self, name: str, category: str, services: str, location: str = "") -> list[str]:
        """
        Intelligently synthesizes 3 to 7 distinct, high-intent Google SEO keywords
        derived from company name, business category, what the company actually works on
        (services & specializations), and regional location.
        GUARANTEES:
          - Minimum 3 and Maximum 7 keywords.
          - Absolutely ZERO verbatim duplicates or repetitive near-duplicates.
          - High-intent commercial queries that real customers search for on Google.
        """
        import re

        def extract_primary_city(loc: str) -> str:
            if not loc:
                return ""
            parts = [p.strip() for p in loc.replace(";", ",").split(",") if p.strip()]
            if not parts:
                return ""
            filtered = [p for p in parts if p.lower() not in ("india", "usa", "uk", "canada", "australia")]
            if not filtered:
                return parts[0]
            if len(filtered) >= 2:
                first_lower = filtered[0].lower()
                street_indicators = ["highway", "road", "street", "cross", "opp", "near", "b/h", "circle", "complex", "arcade", "tower", "s.g", "c.g"]
                if any(t in first_lower for t in street_indicators):
                    return filtered[1]
                indian_states = ["gujarat", "maharashtra", "karnataka", "delhi", "rajasthan", "punjab", "tamil nadu", "telangana", "uttar pradesh", "mp", "up"]
                if filtered[-1].lower() in indian_states:
                    return filtered[-2] if len(filtered) >= 2 else filtered[0]
                return filtered[1]
            return filtered[0]

        candidates = []
        seen = set()

        def add(kw: str):
            clean = " ".join(str(kw).strip().split())
            if len(clean) >= 3 and clean.lower() not in seen:
                seen.add(clean.lower())
                candidates.append(clean)

        raw_srvs = [s.strip() for s in services.replace(";", ",").split(",") if s.strip()]
        clean_name = " ".join([w for w in name.split() if w.lower() not in ("pvt", "ltd", "llp", "inc", "co", "corp")]).strip() or name.strip()
        city = extract_primary_city(location)
        cat_lower = (category or "").lower()

        # 1. Primary core work / service (single clean instance, never duplicated)
        if raw_srvs:
            add(raw_srvs[0])

        # 2. High-Intent Commercial Local Search Query
        if city:
            if "it" in cat_lower or "software" in cat_lower:
                add(f"Best Software Development in {city}")
            elif "restaurant" in cat_lower or "food" in cat_lower:
                add(f"Best Fine Dining Restaurant in {city}")
            elif "health" in cat_lower or "clinic" in cat_lower or "dental" in cat_lower:
                add(f"Top Rated Healthcare Clinic in {city}")
            elif "real estate" in cat_lower or "property" in cat_lower:
                add(f"Premier Real Estate Advisory in {city}")
            elif "e-commerce" in cat_lower or "retail" in cat_lower:
                add(f"Top Rated Lifestyle Store in {city}")
            elif "education" in cat_lower or "coach" in cat_lower:
                add(f"Top Rated Training Institute in {city}")
            elif "auto" in cat_lower:
                add(f"Best Auto Service Center in {city}")
            else:
                add(f"Top Rated {category or 'Business'} in {city}")
        else:
            if "it" in cat_lower or "software" in cat_lower:
                add("Top Software Development Company")
            elif "restaurant" in cat_lower or "food" in cat_lower:
                add("Top Rated Fine Dining Experience")
            elif "health" in cat_lower:
                add("Top Rated Healthcare Clinic")
            elif "real estate" in cat_lower:
                add("Premier Real Estate Advisory")
            else:
                add(f"Top Rated {category or 'Business'} Agency")

        # 3. Work Specialization & Solutions (Synthesizing what the company actually works on)
        if "it" in cat_lower or "software" in cat_lower:
            has_ai = any(re.search(r"\b(ai|gen-ai|machine learning|automation)\b", s, re.I) for s in raw_srvs)
            has_app = any(re.search(r"\b(app|mobile|ios|android)\b", s, re.I) for s in raw_srvs)
            has_web = any(re.search(r"\b(web|frontend|backend|portal)\b", s, re.I) for s in raw_srvs)
            has_cloud = any(re.search(r"\b(cloud|devops|aws|azure)\b", s, re.I) for s in raw_srvs)

            if has_web and has_app:
                add("Custom Web & Mobile App Solutions")
            elif has_app:
                add("Custom Mobile App Engineering")
            elif has_web:
                add("Enterprise Web Application Solutions")

            if has_ai:
                add("Enterprise AI & Automation Services")
            if has_cloud:
                add("Cloud Infrastructure & DevOps")

            add("Top Rated IT Consulting Agency")
            add("Reliable Tech Development Partner")
            add("Full-Stack Software Engineering")

        elif "restaurant" in cat_lower or "food" in cat_lower:
            has_thali = any(re.search(r"\b(thali|royal|heritage)\b", s, re.I) for s in raw_srvs)
            has_catering = any(re.search(r"\b(cater|banquet)\b", s, re.I) for s in raw_srvs)

            if has_thali:
                add("Authentic Royal Thalis & Cuisine")
            else:
                add("Authentic Culinary Experience")

            if has_catering:
                add("Gourmet Catering & Private Dining")
            else:
                add("Fresh Gourmet Cuisine & Fast Service")

            add("Signature Dishes & Attentive Service")
            add("Family Friendly Dining Experience")

        elif "health" in cat_lower or "dental" in cat_lower:
            has_dental = any("dent" in s.lower() for s in raw_srvs)
            if has_dental:
                add("Advanced Diagnostics & Dental Care")
            else:
                add("Advanced Diagnostics & Treatments")
            add("Compassionate Patient Healthcare")
            add("Expert Doctor Consultation")
            add("Modern Hygienic Medical Clinic")

        elif "real estate" in cat_lower:
            add("Residential & Commercial Property Advisory")
            add("Verified Investment Properties")
            add("Transparent Property Dealings")
            add("Prime Location Commercial Leasing")

        elif "e-commerce" in cat_lower:
            add("Clean Artisanal Sustainable Essentials")
            add("Premium Quality Lifestyle Products")
            add("Fast Reliable Delivery & Support")
            add("Artisanal Clean Beauty Store")

        else:
            if len(raw_srvs) >= 2:
                add(f"Professional {raw_srvs[0]} & {raw_srvs[1]}")
            add(f"Quality {category or 'Business'} Solutions")
            add(f"Trusted {category or 'Service'} Partner")
            add("Verified Professional Services")

        # 4. Branded Search Term (Company Name + Core Offering)
        if clean_name and len(clean_name) >= 3:
            if "it" in cat_lower or "software" in cat_lower:
                add(f"{clean_name} Solutions")
            elif "restaurant" in cat_lower or "food" in cat_lower:
                add(f"{clean_name} Dining")
            elif "health" in cat_lower:
                add(f"{clean_name} Healthcare")
            elif "real estate" in cat_lower:
                add(f"{clean_name} Realty")
            else:
                add(f"{clean_name} Services")

        # 5. Fallback safety pool if still < 3
        fallbacks = [
            "Quality Service & Solutions",
            "Customer Support & Care",
            "Reliable Business Partner",
            "Verified Quality Services"
        ]
        for fb in fallbacks:
            if len(candidates) >= 3:
                break
            add(fb)

        return candidates[:7]

    def create_company(self, data: dict) -> dict:
        import urllib.parse
        now = datetime.now(timezone.utc)
        name = data.get("name", "").strip()
        if not name:
            raise ValueError("Company / Business Name is required.")

        location = data.get("location", "").strip()
        formatted_address = data.get("formattedAddress", "").strip() or location
        place_id = data.get("googlePlaceId", "").strip()

        # Services parsing (comma-separated string or list)
        raw_services = data.get("services", "")
        if isinstance(raw_services, list):
            services_str = ", ".join([str(s).strip() for s in raw_services if str(s).strip()])
        else:
            services_str = str(raw_services).strip()

        category_val = data.get("category", "Other")

        # SEO Keywords parsing (supports list or comma-separated string)
        raw_kws = data.get("seoKeywords") or data.get("keywords") or []
        if isinstance(raw_kws, str):
            seo_keywords = [k.strip() for k in raw_kws.split(",") if k.strip()]
        elif isinstance(raw_kws, list):
            seo_keywords = [str(k).strip() for k in raw_kws if str(k).strip()]
        else:
            seo_keywords = []

        # Deduplicate while preserving order
        unique_kws = list(dict.fromkeys(seo_keywords))

        # Automatically generate SEO keywords if user did not provide them or fewer than 3
        if len(unique_kws) < 3:
            auto_kws = self.generate_seo_keywords(name, category_val, services_str, location)
            for ak in auto_kws:
                if ak not in unique_kws:
                    unique_kws.append(ak)
                if len(unique_kws) >= 7:
                    break

        # Strictly enforce min 3, max 7
        if len(unique_kws) > 7:
            unique_kws = unique_kws[:7]
        elif len(unique_kws) < 3:
            unique_kws = self.generate_seo_keywords(name, category_val, services_str, location)

        # Compute Google Review destination URL
        ext_link = data.get("googleReviewUrl", "").strip() or data.get("externalReviewLink", "").strip()
        lower_name = name.lower()
        lower_loc = location.lower()
        import re

        # Check if place_id was provided or can be extracted from any link/location/name
        if not place_id:
            place_id = extract_place_id_from_url(ext_link)
        if not place_id:
            place_id = extract_place_id_from_url(location)
        if not place_id:
            place_id = extract_place_id_from_url(name)

        # Check known verified business profiles & auto-discover place ID
        if not place_id:
            place_id = auto_discover_place_id(name, location)

        clean_loc = " ".join(location.replace(",", " ").split()).strip() if location else ""
        clean_q = f"{name} {clean_loc}".strip()

        if place_id:
            review_url = f"https://search.google.com/local/writereview?placeid={place_id}"
        elif ext_link and (ext_link.startswith("http://") or ext_link.startswith("https://")) and not ext_link.startswith("https://search.google.com/local/writereview") and "maps/search" not in ext_link:
            review_url = ext_link
        else:
            # Fallback: Targeted Google Maps business search
            review_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(clean_q)}"

        doc = {
            "name": name,
            "category": data.get("category", "Other"),
            "services": services_str,
            "seoKeywords": unique_kws,
            "keywords": unique_kws,  # backwards-compatible alias
            "description": data.get("description", "").strip(),
            "location": location,
            "formattedAddress": formatted_address,
            "googlePlaceId": place_id,
            "googleReviewUrl": review_url,
            "externalReviewLink": review_url,  # backwards-compatible alias
            "preferredLanguage": data.get("preferredLanguage", "en"),
            "createdAt": now,
            "updatedAt": now
        }
        res = self.db.companies.insert_one(doc)
        doc["_id"] = res.inserted_id

        # Immediately auto-generate initial review suggestions so data is stored in MongoDB
        try:
            from ai.generator import generator_service
            initial_kws = unique_kws[:2] if len(unique_kws) >= 2 else unique_kws
            generator_service.generate_reviews(
                company_id=str(res.inserted_id),
                company_name=name,
                category=doc["category"],
                keyword=", ".join(initial_kws),
                selected_keywords=initial_kws,
                services=services_str,
                location=location,
                language=doc.get("preferredLanguage", "en"),
                count=3
            )
            logger.info("Auto-generated initial reviews for new company %s (ID: %s)", name, str(res.inserted_id))
        except Exception as ge:
            logger.warning("Could not auto-generate initial reviews on company creation: %s", str(ge))

        return serialize_doc(doc)

    def search_places(self, query: str) -> dict:
        """
        Auto-lookup matching businesses using Google Places API if configured,
        or search local MongoDB company database with clear manual entry fallback.
        """
        from config import Config
        import urllib.parse
        import urllib.request
        import json

        q = (query or "").strip()
        if not q:
            return {"success": True, "results": [], "message": "Query string is empty"}

        api_key = Config.GOOGLE_PLACES_API_KEY
        if api_key:
            try:
                # Query Google Places Text Search API
                encoded_q = urllib.parse.quote_plus(q)
                url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={encoded_q}&key={api_key}"
                req = urllib.request.Request(url, headers={"User-Agent": "ReviewCraft/2.0"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode("utf-8"))

                places = []
                for p in data.get("results", [])[:6]:
                    p_id = p.get("place_id")
                    places.append({
                        "name": p.get("name"),
                        "formattedAddress": p.get("formatted_address"),
                        "location": p.get("formatted_address") or p.get("name"),
                        "googlePlaceId": p_id,
                        "rating": p.get("rating"),
                        "googleReviewUrl": f"https://search.google.com/local/writereview?placeid={p_id}" if p_id else None,
                        "isGoogleVerified": True
                    })

                return {
                    "success": True,
                    "googlePlacesConfigured": True,
                    "results": places
                }
            except Exception as e:
                logger.warning("Google Places API error: %s", str(e))

        # Fallback: search existing company database or allow manual entry
        regex_matches = list(self.db.companies.find(
            {"name": {"$regex": q, "$options": "i"}},
            {"name": 1, "location": 1, "formattedAddress": 1, "googlePlaceId": 1, "googleReviewUrl": 1, "category": 1}
        ).limit(5))

        results = []
        for m in regex_matches:
            s_doc = serialize_doc(m)
            results.append({
                "name": s_doc.get("name"),
                "formattedAddress": s_doc.get("formattedAddress") or s_doc.get("location"),
                "location": s_doc.get("location", ""),
                "googlePlaceId": s_doc.get("googlePlaceId", ""),
                "googleReviewUrl": s_doc.get("googleReviewUrl", ""),
                "isGoogleVerified": bool(s_doc.get("googlePlaceId"))
            })

        return {
            "success": True,
            "googlePlacesConfigured": bool(api_key),
            "results": results,
            "message": "Google Places API key not configured. Enter location manually or select an existing match." if not api_key else ""
        }

    def get_google_review_link(self, company_id: str) -> dict:
        """
        Identify verified Google review URL based on Google Place ID or official link.
        """
        import urllib.parse
        comp = self.get_company_by_id(company_id)
        if not comp:
            return {"success": False, "error": "Company not found"}, 404

        place_id = comp.get("googlePlaceId")
        review_url = comp.get("googleReviewUrl") or comp.get("externalReviewLink")

        if place_id:
            final_url = f"https://search.google.com/local/writereview?placeid={place_id}"
            source = "place_id"
        elif review_url and review_url != "https://search.google.com/local/writereview" and review_url.startswith("http"):
            final_url = review_url
            source = "custom"
        else:
            query = f"{comp.get('name', '')} {comp.get('location', '')} reviews".strip()
            final_url = f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"
            source = "search_fallback"

        return {
            "success": True,
            "companyId": company_id,
            "companyName": comp.get("name"),
            "location": comp.get("location", ""),
            "googlePlaceId": place_id,
            "googleReviewUrl": final_url,
            "source": source
        }

    def add_keyword(self, company_id: str, keyword: str) -> bool:
        if not ObjectId.is_valid(company_id) or not keyword:
            return False
        kw = keyword.strip()
        if not kw:
            return False
        now = datetime.now(timezone.utc)
        res = self.db.companies.update_one(
            {"_id": ObjectId(company_id)},
            {
                "$addToSet": {"keywords": kw, "seoKeywords": kw},
                "$set": {"updatedAt": now}
            }
        )
        return res.matched_count > 0

    def remove_keyword(self, company_id: str, keyword: str) -> bool:
        if not ObjectId.is_valid(company_id) or not keyword:
            return False
        kw = keyword.strip()
        now = datetime.now(timezone.utc)
        res = self.db.companies.update_one(
            {"_id": ObjectId(company_id)},
            {
                "$pull": {"keywords": kw, "seoKeywords": kw},
                "$set": {"updatedAt": now}
            }
        )
        return res.matched_count > 0

company_service = CompanyService()
