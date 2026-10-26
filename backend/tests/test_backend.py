import pytest
import sys
import os
import time
import urllib.parse
from datetime import datetime, timezone

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
    
    # Batch allocations with Hamilton method (testing exact counts)
    assert allocate_demo_ratings(1, shuffle=False) == [5]
    assert allocate_demo_ratings(2, shuffle=False) == [5, 4]
    assert sorted(allocate_demo_ratings(3, shuffle=False)) == [4, 5, 5]
    assert sorted(allocate_demo_ratings(5, shuffle=False)) == [4, 4, 5, 5, 5]
    
    # 70/30 allocation
    dist_70_30 = {"five_star": 70, "four_star": 30}
    assert sorted(allocate_demo_ratings(3, dist_70_30, shuffle=False)) == [4, 5, 5]
    assert sorted(allocate_demo_ratings(5, dist_70_30, shuffle=False)) == [4, 5, 5, 5, 5]
    
    # 50/50 allocation
    dist_50_50 = {"five_star": 50, "four_star": 50}
    assert sorted(allocate_demo_ratings(2, dist_50_50, shuffle=False)) == [4, 5]
    assert sorted(allocate_demo_ratings(4, dist_50_50, shuffle=False)) == [4, 4, 5, 5]

# 16. Fixed Middle 4-Star Bug Fix Verification
def test_four_star_not_fixed_middle_position():
    """
    Verify that the 4-star review is NOT fixed to the middle position.
    Across multiple batches, the 4-star rating appears in different positions (index 0, 1, 2).
    """
    from services.rating_service import allocate_demo_ratings
    positions_of_four_star = set()
    for seed in range(50):
        batch = allocate_demo_ratings(3, seed=seed, shuffle=True)
        assert sorted(batch) == [4, 5, 5]
        four_index = batch.index(4)
        positions_of_four_star.add(four_index)

    # Must appear at index 0, 1, and 2 across randomized batches
    assert positions_of_four_star == {0, 1, 2}

# 17. API Rating Distribution & Generation Tests
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
    assert sorted(ratings) == [4, 5, 5]
    assert data["ratingBreakdown"] == {"5_star": 2, "4_star": 1}
    
    # Verify 4-star review contains constructive observation
    four_star_reviews = [r for r in data["reviews"] if r["rating"] == 4]
    assert len(four_star_reviews) == 1
    four_star_text = four_star_reviews[0]["reviewText"]
    assert any(term in four_star_text.lower() for term in [
        "documentation", "response", "reporting", "reports", "kickoff", "sprint", "turnaround", "communication", "handover", "polish"
    ])

# 18. API Rating Distribution Error Handling
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

# 19. Real Customer Review Mode Test
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

# 20. Category-Specific Review Generation
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

# 21. Backend-Managed Rating Ratio (No Frontend Configuration)
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
    assert sorted(ratings) == [4, 5, 5]
    assert data["ratingBreakdown"] == {"5_star": 2, "4_star": 1}

# 22. Multiple Selected Keywords: All keywords must appear in every review
def test_multiple_selected_keywords_natural_distribution(client):
    """
    Verify that when multiple keywords are selected (e.g. 3 keywords),
    ALL selected keywords are included in EVERY review card.
    """
    unique_company = f"Multi Keyword Co {time.time()}"
    kws = ["Web Engineering", "Cloud Architecture", "DevOps Pipelines"]
    res = client.post("/api/generate-reviews", json={
        "companyName": unique_company,
        "category": "IT Services and Software Development",
        "selectedKeywords": kws,
        "count": 3
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    reviews = data["reviews"]
    assert len(reviews) == 3

    for rev in reviews:
        card_kws = rev.get("selectedKeywords")
        assert isinstance(card_kws, list)
        assert len(card_kws) == 3
        # Ensure ALL selected keywords are present in each review card
        for k in kws:
            assert k in card_kws
            assert k in rev["reviewText"]

# 23. Rating Persistence and Stability on Repeated Fetch
def test_rating_persistence_and_stability_on_repeated_fetch(client):
    """
    Verify that ratings persisted in MongoDB never recalculate or change
    when fetched repeatedly across GET requests.
    """
    unique_company = f"Stability Test Co {time.time()}"
    res = client.post("/api/generate-reviews", json={
        "companyName": unique_company,
        "category": "IT Services and Software Development",
        "keyword": "Reliability Engineering",
        "count": 3
    })
    assert res.status_code == 200
    original_reviews = res.get_json()["reviews"]
    original_ratings = {r["id"]: r["rating"] for r in original_reviews}

    # Fetch repeatedly via GET /api/reviews
    for _ in range(3):
        fetch_res = client.get(f"/api/reviews?search={urllib.parse.quote_plus(unique_company)}")
        assert fetch_res.status_code == 200
        fetched_reviews = fetch_res.get_json()["reviews"]
        for fr in fetched_reviews:
            if fr["id"] in original_ratings:
                assert fr["rating"] == original_ratings[fr["id"]]

# 24. Legacy Record Compatibility (Handling records with missing rating safely)
def test_legacy_record_compatibility(client):
    from utils.db import Database
    from bson import ObjectId
    db = Database.get_db()
    
    legacy_doc = {
        "companyName": "Legacy Co",
        "reviewText": "This is a dependable legacy review without a rating field.",
        "category": "IT Services and Software Development",
        "keyword": "Legacy Support",
        "createdAt": datetime.now(timezone.utc)
    }
    inserted = db.generated_reviews.insert_one(legacy_doc)
    doc_id = str(inserted.inserted_id)

    # Fetch via single review endpoint
    res = client.get(f"/api/reviews/{doc_id}")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["review"]["rating"] == 5
    assert data["review"]["isDemo"] is True
    assert isinstance(data["review"]["selectedKeywords"], list)

    # Cleanup
    db.generated_reviews.delete_one({"_id": ObjectId(doc_id)})

# 25. Review Length Validation (Target 12-35 Words for authentic small human reviews)
def test_review_length_validation(client):
    unique_company = f"Length Test Co {time.time()}"
    res = client.post("/api/generate-reviews", json={
        "companyName": unique_company,
        "category": "IT Services and Software Development",
        "keyword": "Full Stack Development",
        "count": 3
    })
    assert res.status_code == 200
    reviews = res.get_json()["reviews"]
    for r in reviews:
        word_count = len(r["reviewText"].split())
        assert 12 <= word_count <= 35, f"Word count {word_count} is out of target range: '{r['reviewText']}'"

# 26. Randomized Keyword Distribution Across Cards
def test_keyword_random_distribution_across_cards():
    from ai.generator import distribute_keywords_to_batch
    kws = ["Make-up", "Hairstyle", "Professional Artist"]
    
    # Each card must have exactly 1 clean keyword
    dist = distribute_keywords_to_batch(kws, count=3)
    assert len(dist) == 3
    for card_kws in dist:
        assert len(card_kws) == 1
        assert card_kws[0] in kws
    
    # Over 50 batches, card 0 must NOT always be kws[0] ('Make-up')
    card_0_kws = set()
    for _ in range(50):
        d = distribute_keywords_to_batch(kws, count=3)
        card_0_kws.add(d[0][0])
    
    # All 3 keywords must appear at card 0 across randomized batches
    assert card_0_kws == {"Make-up", "Hairstyle", "Professional Artist"}





# 27. Auto SEO Keywords Generation (Min 3, Max 7)
def test_auto_seo_keywords_generation_min_3_max_7(client):
    from services.company_service import company_service

    # 1. Direct service method check
    kws = company_service.generate_seo_keywords(
        name="Kevalon Technology",
        category="IT Services and Software Development",
        services="Web Development, AI Solutions, Mobile App Development",
        location="Ahmedabad, Gujarat"
    )
    assert 3 <= len(kws) <= 7, f"SEO keywords count {len(kws)} must be between 3 and 7"
    assert "Web Development" in kws

    # 2. Minimal input check
    kws_min = company_service.generate_seo_keywords(
        name="Minimal Co",
        category="Healthcare",
        services="",
        location=""
    )
    assert 3 <= len(kws_min) <= 7, f"SEO keywords count {len(kws_min)} must be between 3 and 7"

    # 3. HTTP endpoint check
    res = client.post("/api/companies/generate-seo-keywords", json={
        "name": "Omni Brand",
        "category": "E-commerce",
        "services": "Organic Skincare, Clean Beauty, Vegan Soap",
        "location": "Mumbai, India"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert 3 <= data["count"] <= 7
    assert 3 <= len(data["seoKeywords"]) <= 7
