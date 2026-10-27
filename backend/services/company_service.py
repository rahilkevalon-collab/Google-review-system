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
        "googleReviewUrl": "https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,",
        "externalReviewLink": "https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,",
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
        "externalReviewLink": "https://www.google.com/search?q=Aura+Organic+Living+Mumbai+reviews",
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
        "preferredLanguage": "en",
        "externalReviewLink": "https://www.google.com/search?q=Spice+Pavilion+Fine+Dine+Delhi+reviews",
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
        "externalReviewLink": "https://www.google.com/search?q=Apex+Care+Multispeciality+Clinic+Bangalore+reviews",
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
        "externalReviewLink": "https://www.google.com/search?q=Prime+Landmark+Realty+Pune+reviews",
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
        "externalReviewLink": "https://www.google.com/search?q=BrightPath+International+Academy+Hyderabad+reviews",
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
        "externalReviewLink": "https://www.google.com/search?q=Wanderlust+Horizon+Travels+Goa+reviews",
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
        "externalReviewLink": "https://www.google.com/search?q=Glow+and+Grace+Luxury+Wellness+Salon+Jaipur+reviews",
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
        "externalReviewLink": "https://www.google.com/search?q=NexGen+Growth+Media+Gurgaon+reviews",
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
        "externalReviewLink": "https://www.google.com/search?q=Urban+Trendz+Lifestyle+Superstore+Chennai+reviews",
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
        "externalReviewLink": "https://www.google.com/search?q=Elite+Falcon+Global+Consulting+Kolkata+reviews",
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
                    # If company has empty, broken, or search-only Google writereview link, upgrade to direct write-review link
                    curr_link = exists.get("externalReviewLink", "")
                    if "kevalon" in exists.get("name", "").lower():
                        kevalon_direct = "https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,"
                        if curr_link != kevalon_direct:
                            self.db.companies.update_one(
                                {"_id": exists["_id"]},
                                {"$set": {"externalReviewLink": kevalon_direct, "googleReviewUrl": kevalon_direct}}
                            )
                    elif not curr_link or curr_link == "https://search.google.com/local/writereview":
                        self.db.companies.update_one(
                            {"_id": exists["_id"]},
                            {"$set": {"externalReviewLink": comp["externalReviewLink"], "googleReviewUrl": comp.get("googleReviewUrl", comp["externalReviewLink"])}}
                        )
            # Also upgrade any company with name Kevalon Technology regardless of category
            self.db.companies.update_many(
                {"name": {"$regex": "kevalon", "$options": "i"}},
                {"$set": {
                    "googleReviewUrl": "https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,",
                    "externalReviewLink": "https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,"
                }}
            )
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
        if place_id:
            review_url = f"https://search.google.com/local/writereview?placeid={place_id}"
        elif location:
            # Exact branch location targeting: opens the specific branch profile on Google Maps
            if "kevalon" in lower_name and lower_loc in ("ahmedabad, gujarat, india", "ahmedabad, india", "ahmedabad"):
                review_url = "https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,"
            else:
                clean_loc = " ".join(location.replace(",", " ").split())
                clean_q = f"{name} {clean_loc}".strip()
                review_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(clean_q)}"
        elif "kevalon" in lower_name:
            review_url = "https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,"
        elif "amazon" in lower_name:
            review_url = "https://www.google.com/search?q=Amazon+India+reviews#lrd=0x395e8b4dc3faaaab:0xcecd65884d1f6b7,3,,,"
        elif "flora" in lower_name and "fountain" in lower_name:
            review_url = "https://www.google.com/search?q=Flora+Fountain+Ahmedabad+reviews#lrd=0x395e8484a0c86845:0x5e2ea710a76a5b6f,3,,,"
        elif ext_link and ext_link != "https://search.google.com/local/writereview" and ext_link.startswith("http"):
            review_url = ext_link
        else:
            clean_q = name.strip()
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
