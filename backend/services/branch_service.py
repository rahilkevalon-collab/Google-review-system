import logging
import re
import uuid
from datetime import datetime, timezone
from bson import ObjectId
from utils.db import Database, serialize_doc
from services.company_service import extract_place_id_from_url

logger = logging.getLogger(__name__)

def slugify(text: str) -> str:
    """Converts string into URL-safe lowercase slug."""
    text = str(text or "").lower().strip()
    # Replace non-alphanumeric chars with hyphens
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

def normalize_branch_name(name: str) -> str:
    """Normalizes branch name for duplicate prevention."""
    clean = re.sub(r'[^\w\s]', '', str(name or "").lower())
    return re.sub(r'\s+', ' ', clean).strip()

class BranchService:
    @property
    def db(self):
        return Database.get_db()

    def generate_unique_slug(self, company_name: str, branch_name: str, city: str = "", branch_id: str = None) -> str:
        """
        Generates a clean, unique review page slug such as 'kevlon-ahmedabad'.
        If a collision occurs, appends numeric suffix like 'kevlon-ahmedabad-2'.
        """
        comp_slug = slugify(company_name)
        # Strip trailing 'branch' for concise readable URLs if desired, or keep as is
        clean_b = re.sub(r'-branch$', '', slugify(branch_name))
        b_part = clean_b if clean_b else (slugify(city) if city else slugify(branch_name))

        base_slug = f"{comp_slug}-{b_part}".strip('-')
        if not base_slug or base_slug == comp_slug:
            base_slug = f"{comp_slug}-branch-{uuid.uuid4().hex[:4]}"

        candidate = base_slug
        counter = 2
        while True:
            query = {"reviewPageSlug": candidate}
            if branch_id and ObjectId.is_valid(branch_id):
                query["_id"] = {"$ne": ObjectId(branch_id)}
            existing = self.db.branches.find_one(query)
            if not existing:
                return candidate
            candidate = f"{base_slug}-{counter}"
            counter += 1

    def create_branch(self, company_id: str, data: dict) -> dict:
        """
        Creates a new branch under a parent company.
        Prevents duplicate branch names under the same company (companyId + normalizedBranchName).
        Requires direct Google Review URL.
        """
        if not ObjectId.is_valid(company_id):
            raise ValueError("Invalid Company ID provided.")

        company = self.db.companies.find_one({"_id": ObjectId(company_id)})
        if not company:
            raise ValueError("Parent company does not exist in database.")

        branch_name = (data.get("branchName") or data.get("name") or "").strip()
        if not branch_name:
            raise ValueError("Branch Name is required.")

        normalized_branch_name = normalize_branch_name(branch_name)
        if not normalized_branch_name:
            raise ValueError("Invalid Branch Name.")

        # Duplicate check: prevent duplicate branch under the SAME company
        existing_branch = self.db.branches.find_one({
            "companyId": str(company_id),
            "normalizedBranchName": normalized_branch_name
        })
        if existing_branch:
            raise ValueError(f"A branch named '{branch_name}' already exists under this company.")

        # Validate Google Review URL (Required)
        raw_url = (data.get("googleReviewUrl") or data.get("externalReviewLink") or "").strip()
        if not raw_url:
            raise ValueError("Google Review Dialog Box URL is required for this branch.")
        if not (raw_url.startswith("http://") or raw_url.startswith("https://")):
            raise ValueError("Google Review URL must start with https:// or http://")

        # Canonicalize with Place ID if extractable
        pid = extract_place_id_from_url(raw_url)
        if pid and "search.google.com/local/writereview" not in raw_url:
            final_review_url = f"https://search.google.com/local/writereview?placeid={pid}"
        else:
            final_review_url = raw_url

        city = (data.get("city") or "").strip()
        state = (data.get("state") or "").strip()
        country = (data.get("country") or "India").strip()
        address = (data.get("address") or "").strip()

        # Custom slug or auto-generated
        custom_slug = slugify(data.get("reviewPageSlug", ""))
        if custom_slug:
            # Check custom slug uniqueness
            slug_exists = self.db.branches.find_one({"reviewPageSlug": custom_slug})
            if slug_exists:
                raise ValueError(f"Review slug '{custom_slug}' is already taken. Please choose another slug.")
            final_slug = custom_slug
        else:
            company_display_name = company.get("companyName") or company.get("name") or "company"
            final_slug = self.generate_unique_slug(company_display_name, branch_name, city)

        # Inherit or assign SEO keywords
        seo_kws = data.get("seoKeywords") or []
        if isinstance(seo_kws, str):
            seo_kws = [k.strip() for k in seo_kws.split(",") if k.strip()]
        if not seo_kws:
            seo_kws = company.get("seoKeywords") or company.get("keywords") or ["Quality Service", "Customer Support"]

        is_active = bool(data.get("isActive", True)) if "isActive" in data else (data.get("status", "active") == "active")
        status_val = "active" if is_active else "inactive"

        now = datetime.now(timezone.utc)
        doc = {
            "companyId": str(company_id),
            "branchName": branch_name,
            "name": branch_name,  # alias
            "normalizedBranchName": normalized_branch_name,
            "address": address,
            "city": city,
            "state": state,
            "country": country,
            "googleReviewUrl": final_review_url,
            "externalReviewLink": final_review_url,  # alias
            "googlePlaceId": pid or "",
            "reviewPageSlug": final_slug,
            "status": status_val,
            "isActive": is_active,
            "seoKeywords": list(dict.fromkeys(seo_kws)),
            "createdAt": now,
            "updatedAt": now
        }

        res = self.db.branches.insert_one(doc)
        doc["_id"] = res.inserted_id
        logger.info("Created new branch '%s' (%s) under company '%s'", branch_name, final_slug, company_id)
        return serialize_doc(doc)

    def get_branch_by_id(self, branch_id: str) -> dict | None:
        """Fetch branch by its ObjectId."""
        if not ObjectId.is_valid(branch_id):
            return None
        doc = self.db.branches.find_one({"_id": ObjectId(branch_id)})
        return serialize_doc(doc) if doc else None

    def get_branch_by_slug(self, slug_or_id: str) -> dict | None:
        """
        Resolves a branch by reviewPageSlug or ObjectId.
        Also attaches the parent company details.
        """
        if not slug_or_id:
            return None

        clean_slug = str(slug_or_id).strip()
        doc = self.db.branches.find_one({"reviewPageSlug": clean_slug})

        if not doc and ObjectId.is_valid(clean_slug):
            doc = self.db.branches.find_one({"_id": ObjectId(clean_slug)})

        # Backwards compatibility fallback: if slug matches a company, find its primary branch
        if not doc and ObjectId.is_valid(clean_slug):
            comp = self.db.companies.find_one({"_id": ObjectId(clean_slug)})
            if comp:
                # Find first branch for company
                branch = self.db.branches.find_one({"companyId": str(comp["_id"])})
                if branch:
                    doc = branch
                else:
                    # Return company itself wrapped as a virtual branch
                    return {
                        "id": str(comp["_id"]),
                        "companyId": str(comp["_id"]),
                        "branchName": comp.get("companyName") or comp.get("name"),
                        "googleReviewUrl": comp.get("googleReviewUrl") or "",
                        "reviewPageSlug": clean_slug,
                        "status": comp.get("status", "active"),
                        "isActive": comp.get("isActive", True),
                        "seoKeywords": comp.get("seoKeywords") or comp.get("keywords") or [],
                        "company": serialize_doc(comp)
                    }

        if not doc:
            return None

        serialized_branch = serialize_doc(doc)
        # Fetch and attach parent company
        parent_id = serialized_branch.get("companyId")
        if parent_id and ObjectId.is_valid(parent_id):
            parent = self.db.companies.find_one({"_id": ObjectId(parent_id)})
            serialized_branch["company"] = serialize_doc(parent) if parent else None
        return serialized_branch

    def list_branches_by_company(self, company_id: str) -> list[dict]:
        """Lists all branches belonging to a specific company."""
        if not ObjectId.is_valid(company_id):
            return []
        cursor = self.db.branches.find({"companyId": str(company_id)}).sort("createdAt", -1)
        return [serialize_doc(doc) for doc in cursor]

    def update_branch(self, branch_id: str, data: dict) -> dict | None:
        """Update branch details, including Google Review URL, location, and slug."""
        if not ObjectId.is_valid(branch_id):
            return None

        existing = self.db.branches.find_one({"_id": ObjectId(branch_id)})
        if not existing:
            return None

        updates = {"updatedAt": datetime.now(timezone.utc)}

        if "branchName" in data or "name" in data:
            name_val = (data.get("branchName") or data.get("name") or "").strip()
            if not name_val:
                raise ValueError("Branch Name cannot be empty.")
            norm = normalize_branch_name(name_val)
            # Duplicate check under same company
            dup = self.db.branches.find_one({
                "companyId": existing["companyId"],
                "normalizedBranchName": norm,
                "_id": {"$ne": ObjectId(branch_id)}
            })
            if dup:
                raise ValueError(f"Another branch named '{name_val}' already exists under this company.")
            updates["branchName"] = name_val
            updates["name"] = name_val
            updates["normalizedBranchName"] = norm

        if "address" in data:
            updates["address"] = str(data["address"]).strip()

        if "city" in data:
            updates["city"] = str(data["city"]).strip()

        if "state" in data:
            updates["state"] = str(data["state"]).strip()

        if "country" in data:
            updates["country"] = str(data["country"]).strip()

        if "googleReviewUrl" in data or "externalReviewLink" in data:
            raw_url = (data.get("googleReviewUrl") or data.get("externalReviewLink") or "").strip()
            if raw_url:
                if not (raw_url.startswith("http://") or raw_url.startswith("https://")):
                    raise ValueError("Google Review URL must start with https:// or http://")
                pid = extract_place_id_from_url(raw_url)
                if pid and "search.google.com/local/writereview" not in raw_url:
                    final_url = f"https://search.google.com/local/writereview?placeid={pid}"
                else:
                    final_url = raw_url
                updates["googleReviewUrl"] = final_url
                updates["externalReviewLink"] = final_url
                if pid:
                    updates["googlePlaceId"] = pid

        if "reviewPageSlug" in data:
            custom_slug = slugify(data["reviewPageSlug"])
            if custom_slug and custom_slug != existing.get("reviewPageSlug"):
                dup_slug = self.db.branches.find_one({
                    "reviewPageSlug": custom_slug,
                    "_id": {"$ne": ObjectId(branch_id)}
                })
                if dup_slug:
                    raise ValueError(f"Review slug '{custom_slug}' is already taken. Please choose another slug.")
                updates["reviewPageSlug"] = custom_slug

        if "seoKeywords" in data:
            raw_kws = data["seoKeywords"]
            if isinstance(raw_kws, str):
                parsed = [k.strip() for k in raw_kws.split(",") if k.strip()]
            elif isinstance(raw_kws, list):
                parsed = [str(k).strip() for k in raw_kws if str(k).strip()]
            else:
                parsed = []
            updates["seoKeywords"] = list(dict.fromkeys(parsed))

        if "isActive" in data:
            is_act = bool(data["isActive"])
            updates["isActive"] = is_act
            updates["status"] = "active" if is_act else "inactive"
        elif "status" in data:
            status_val = str(data["status"]).strip().lower()
            updates["status"] = status_val
            updates["isActive"] = (status_val == "active")

        res = self.db.branches.find_one_and_update(
            {"_id": ObjectId(branch_id)},
            {"$set": updates},
            return_document=True
        )
        return serialize_doc(res) if res else None

    def toggle_branch_status(self, branch_id: str, is_active: bool = None) -> dict | None:
        """Activate or deactivate a branch review page."""
        if not ObjectId.is_valid(branch_id):
            return None
        existing = self.db.branches.find_one({"_id": ObjectId(branch_id)})
        if not existing:
            return None

        if is_active is None:
            new_is_active = not existing.get("isActive", True)
        else:
            new_is_active = bool(is_active)

        new_status = "active" if new_is_active else "inactive"
        now = datetime.now(timezone.utc)

        res = self.db.branches.find_one_and_update(
            {"_id": ObjectId(branch_id)},
            {"$set": {"isActive": new_is_active, "status": new_status, "updatedAt": now}},
            return_document=True
        )
        return serialize_doc(res) if res else None

    def delete_branch(self, branch_id: str) -> bool:
        """Delete branch and clean up associated branch records."""
        if not ObjectId.is_valid(branch_id):
            return False
        # Remove generated reviews that had this branch
        self.db.generated_reviews.delete_many({"branchId": str(branch_id)})
        res = self.db.branches.delete_one({"_id": ObjectId(branch_id)})
        return res.deleted_count > 0

branch_service = BranchService()

