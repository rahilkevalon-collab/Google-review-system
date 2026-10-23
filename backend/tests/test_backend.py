import pytest
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from utils.text_utils import normalize_text, compute_content_hash
from ai.nlp_engine import NLPEngine
from ai.sentiment import analyze_review_sentiment

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

# 1. Text Normalization & Hashing Tests
def test_text_normalization():
    text1 = "  Great Web   Development Service!!!  "
    text2 = "great web development service"
    assert normalize_text(text1) == normalize_text(text2)
    assert compute_content_hash(text1) == compute_content_hash(text2)

# 2. NLP Deduplication Tests
def test_nlp_exact_duplicate_rejection():
    nlp = NLPEngine(default_threshold=0.72)
    history = ["We engaged Kevalon Technology for Web Development, and their technical expertise delivered measurable business value."]
    candidate = "We engaged Kevalon Technology for Web Development, and their technical expertise delivered measurable business value!"
    
    result = nlp.check_candidate(candidate, history)
    assert result["is_duplicate"] is True
    assert "Exact duplicate" in result["reason"]

def test_nlp_near_duplicate_rejection():
    nlp = NLPEngine(default_threshold=0.72)
    history = ["We engaged Kevalon Technology for Web Development, and their technical expertise delivered measurable business value."]
    # Paraphrased with mostly overlapping vocabulary
    candidate = "We partnered with Kevalon Technology for Web Development, and their technical expertise delivered measurable business value."
    
    result = nlp.check_candidate(candidate, history)
    assert result["is_duplicate"] is True
    assert result["similarity_score"] >= 0.72

def test_nlp_distinct_candidate_acceptance():
    nlp = NLPEngine(default_threshold=0.72)
    history = ["We engaged Kevalon Technology for Web Development, and their technical expertise delivered measurable business value."]
    candidate = "The authentic wood-fired pizza and relaxing ambiance made our evening unforgettable."
    
    result = nlp.check_candidate(candidate, history)
    assert result["is_duplicate"] is False
    assert result["similarity_score"] < 0.20

# 3. Sentiment Analysis Test
def test_sentiment_analysis():
    text = "Outstanding service, highly recommended, fantastic quality!"
    res = analyze_review_sentiment(text)
    assert res["score"] >= 0.75
    assert "disclaimer" in res
    assert "Synthetic" in res["disclaimer"]

# 4. API Endpoints Integration Tests
def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "aiProvider" in data

def test_api_categories(client):
    res = client.get("/api/categories")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["categories"]) >= 10

def test_api_category_keywords(client):
    res = client.get("/api/categories/E-commerce/keywords")
    assert res.status_code == 200
    data = res.get_json()
    assert "keywords" in data
    assert "Product Quality" in data["keywords"]

def test_api_companies_flow(client):
    # List companies
    res = client.get("/api/companies")
    assert res.status_code == 200
    companies = res.get_json()["companies"]
    assert len(companies) > 0
    company_id = companies[0]["id"]

    # Get single company
    res_single = client.get(f"/api/companies/{company_id}")
    assert res_single.status_code == 200
    assert res_single.get_json()["company"]["id"] == company_id

    # Create temporary test company and verify
    new_payload = {
        "name": "Pytest Ephemeral Dental Clinic",
        "category": "Healthcare",
        "description": "Family dental care and cosmetic dentistry",
        "services": "Teeth Whitening, Dental Implants",
        "location": "Boston, MA",
        "preferredLanguage": "en",
        "keywords": ["Minimal Wait Time", "Compassionate Care"]
    }
    res_create = client.post("/api/companies", json=new_payload)
    assert res_create.status_code == 201
    created_id = res_create.get_json()["company"]["id"]
    assert created_id is not None

    # Clean up test company so live DB stays pristine
    from utils.db import Database
    from bson import ObjectId
    Database.get_db().companies.delete_one({"_id": ObjectId(created_id)})

def test_api_review_generation_and_copy(client):
    # Fetch a company
    companies = client.get("/api/companies").get_json()["companies"]
    company = companies[0]

    gen_payload = {
        "companyId": company["id"],
        "companyName": company["name"],
        "category": company["category"],
        "keyword": "Web Development",
        "language": "en",
        "tone": "natural",
        "length": "short",
        "count": 2
    }
    gen_res = client.post("/api/generate-reviews", json=gen_payload)
    assert gen_res.status_code in (200, 429)
    if gen_res.status_code == 200:
        data = gen_res.get_json()
        assert data["success"] is True
        assert len(data["reviews"]) > 0
        review_id = data["reviews"][0]["id"]

        # Fetch single review detail
        detail_res = client.get(f"/api/reviews/{review_id}")
        assert detail_res.status_code == 200
        assert detail_res.get_json()["review"]["id"] == review_id

        # Track copy event
        copy_res = client.post(f"/api/reviews/{review_id}/copy-event")
        assert copy_res.status_code == 200
        assert copy_res.get_json()["success"] is True

def test_api_analytics_overview(client):
    res = client.get("/api/analytics/overview")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "analytics" in data
    assert "totalCompanies" in data["analytics"]
    assert "totalReviews" in data["analytics"]

def test_api_company_search(client):
    res = client.get("/api/companies/search?query=Kevalon")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "results" in data

def test_api_google_review_link(client):
    companies = client.get("/api/companies").get_json()["companies"]
    assert len(companies) > 0
    cid = companies[0]["id"]
    res = client.get(f"/api/companies/{cid}/google-review-link")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "googleReviewUrl" in data

def test_api_review_patch(client):
    companies = client.get("/api/companies").get_json()["companies"]
    cid = companies[0]["id"]
    gen_res = client.post("/api/generate-reviews", json={"companyId": cid, "keyword": "Support", "count": 1})
    if gen_res.status_code == 200:
        rev = gen_res.get_json()["reviews"][0]
        rid = rev["id"]
        new_txt = f"Patched review text {time.time()}."
        patch_res = client.patch(f"/api/reviews/{rid}", json={"reviewText": new_txt})
        assert patch_res.status_code == 200
        assert patch_res.get_json()["review"]["reviewText"] == new_txt

# 15. Rating Allocation and Validation Tests
def test_rating_allocation_and_validation():
    from ai.rating_allocator import allocate_demo_ratings, validate_rating_distribution
    
    # Validation tests
    ok, msg, norm = validate_rating_distribution({"five_star": 60, "four_star": 40})
    assert ok is True
    assert norm["five_star"] == 60.0 and norm["four_star"] == 40.0
    
    # Invalid sum != 100
    bad_sum, bad_msg, _ = validate_rating_distribution({"five_star": 70, "four_star": 40})
    assert bad_sum is False
    assert "sum to 100%" in bad_msg
    
    # Negative value
    neg_ok, neg_msg, _ = validate_rating_distribution({"five_star": -10, "four_star": 110})
    assert neg_ok is False
    assert "negative" in neg_msg.lower()
    
    # Small batch allocations (60/40)
    assert allocate_demo_ratings(1) == [5]
    assert allocate_demo_ratings(2) == [5, 4]
    assert allocate_demo_ratings(3) == [5, 4, 5]
    assert allocate_demo_ratings(5) == [5, 4, 5, 4, 5]
    
    # 70/30 allocation
    dist_70_30 = {"five_star": 70, "four_star": 30}
    assert allocate_demo_ratings(3, dist_70_30) == [5, 4, 5]
    assert allocate_demo_ratings(5, dist_70_30) == [5, 4, 5, 5, 5]
    
    # 50/50 allocation
    dist_50_50 = {"five_star": 50, "four_star": 50}
    assert allocate_demo_ratings(2, dist_50_50) == [5, 4]
    assert allocate_demo_ratings(4, dist_50_50) == [5, 4, 5, 4]

# 16. API Rating Distribution & Generation Tests
def test_api_rating_distribution_generation(client):
    unique_company = f"Rating Test Co {time.time()}"
    res = client.post("/api/generate-reviews", json={
        "companyName": unique_company,
        "category": "IT Services and Software Development",
        "keyword": "Web Engineering",
        "count": 3,
        "ratingDistribution": {"five_star": 60, "four_star": 40}
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["reviews"]) == 3
    
    ratings = [r["rating"] for r in data["reviews"]]
    assert ratings == [5, 4, 5]
    assert data["ratingBreakdown"] == {"5_star": 2, "4_star": 1}
    
    # Verify 4-star review contains constructive observation
    four_star_reviews = [r for r in data["reviews"] if r["rating"] == 4]
    assert len(four_star_reviews) == 1
    four_star_text = four_star_reviews[0]["reviewText"]
    assert any(term in four_star_text.lower() for term in [
        "documentation", "response", "reporting", "reports", "kickoff", "sprint", "turnaround", "communication", "handover", "polish"
    ])

# 17. API Rating Distribution Error Handling
def test_api_rating_distribution_invalid(client):
    res = client.post("/api/generate-reviews", json={
        "companyName": "Error Test Co",
        "keyword": "Testing",
        "ratingDistribution": {"five_star": 80, "four_star": 30}
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False
    assert "100%" in data["error"]

# 18. Real Customer Review Mode Test
def test_api_real_customer_review_mode(client):
    res = client.post("/api/generate-reviews", json={
        "companyName": f"Real Co {time.time()}",
        "keyword": "Customer Support",
        "mode": "real",
        "customerRating": 4,
        "count": 1
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["isDemo"] is False
    rev = data["reviews"][0]
    assert rev["rating"] == 4
    assert rev["ratingType"] == "real"
    assert rev["source"] == "customer-submitted"

# 19. Category-Specific Review Generation
def test_category_specific_reviews(client):
    res = client.post("/api/generate-reviews", json={
        "companyName": f"Bistro {time.time()}",
        "category": "Restaurants and Food",
        "keyword": "Wood Fired Pizza",
        "count": 2
    })
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["reviews"]) == 2
    for r in data["reviews"]:
        assert "Wood Fired Pizza" in r["reviewText"]

# 20. Backend-Managed Rating Ratio (No Frontend Configuration)
def test_api_backend_default_rating_ratio_without_frontend_payload(client):
    """
    Verify that when frontend sends NO rating distribution in the request payload,
    the backend automatically enforces its configured default 60% 5-star / 40% 4-star ratio.
    """
    unique_company = f"Backend Ratio Co {time.time()}"
    res = client.post("/api/generate-reviews", json={
        "companyName": unique_company,
        "category": "IT Services and Software Development",
        "keyword": "Cloud Architecture",
        "count": 3
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["reviews"]) == 3
    ratings = [r["rating"] for r in data["reviews"]]
    assert ratings == [5, 4, 5]
    assert data["ratingBreakdown"] == {"5_star": 2, "4_star": 1}


