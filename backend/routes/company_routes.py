from flask import Blueprint, request, jsonify
from services.company_service import company_service

company_bp = Blueprint("company_bp", __name__)

@company_bp.route("/companies", methods=["GET"])
def list_companies():
    companies = company_service.get_all_companies()
    return jsonify({"success": True, "companies": companies}), 200

@company_bp.route("/companies/search", methods=["GET"])
def search_companies():
    """
    Search businesses via Google Places API autocomplete/textsearch
    or fallback to existing company records.
    """
    query = request.args.get("query") or request.args.get("q") or ""
    res = company_service.search_places(query)
    return jsonify(res), 200

@company_bp.route("/companies/generate-seo-keywords", methods=["POST", "GET"])
def generate_seo_keywords_endpoint():
    """
    Automatically synthesizes 3 to 7 high-intent SEO keywords based on
    company name, business category, services, and location.
    """
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
    else:
        data = request.args

    name = data.get("name", "").strip()
    category = data.get("category", "Other").strip()
    services = data.get("services", "").strip()
    location = data.get("location", "").strip()

    keywords = company_service.generate_seo_keywords(name, category, services, location)
    return jsonify({
        "success": True,
        "seoKeywords": keywords,
        "count": len(keywords)
    }), 200

@company_bp.route("/companies/<company_id>", methods=["GET"])
def get_company(company_id):
    company = company_service.get_company_by_id(company_id)
    if not company:
        return jsonify({"success": False, "error": "Company not found"}), 404
    return jsonify({"success": True, "company": company}), 200

@company_bp.route("/companies", methods=["POST"])
def create_company():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"success": False, "error": "Company / Business Name is required."}), 400

    try:
        new_comp = company_service.create_company(data)
        return jsonify({"success": True, "company": new_comp}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@company_bp.route("/companies/<company_id>/google-review-link", methods=["GET"])
def get_company_google_review_link(company_id):
    result = company_service.get_google_review_link(company_id)
    if isinstance(result, tuple):
        return jsonify(result[0]), result[1]
    return jsonify(result), 200

@company_bp.route("/companies/<company_id>/keywords", methods=["POST"])
def add_company_keyword(company_id):
    data = request.get_json(silent=True) or {}
    keyword = data.get("keyword", "").strip()
    if not keyword:
        return jsonify({"success": False, "error": "Keyword is required."}), 400
    success = company_service.add_keyword(company_id, keyword)
    if not success:
        return jsonify({"success": False, "error": "Could not add keyword to company."}), 400
    return jsonify({"success": True, "message": "Keyword added to company.", "keyword": keyword}), 200

@company_bp.route("/companies/<company_id>/keywords/<path:keyword>", methods=["DELETE"])
def remove_company_keyword(company_id, keyword):
    success = company_service.remove_keyword(company_id, keyword)
    if not success:
        return jsonify({"success": False, "error": "Could not remove keyword from company."}), 400
    return jsonify({"success": True, "message": "Keyword removed from company.", "keyword": keyword}), 200
