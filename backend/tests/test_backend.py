import pytest
import sys
import os

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

    # Create new company
    new_payload = {
        "name": "Test Dental Clinic",
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
