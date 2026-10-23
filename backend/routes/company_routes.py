from flask import Blueprint, request, jsonify
from services.company_service import company_service

company_bp = Blueprint("company_bp", __name__)

@company_bp.route("/companies", methods=["GET"])
def list_companies():
    companies = company_service.get_all_companies()
    return jsonify({"success": True, "companies": companies}), 200

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
        return jsonify({"success": False, "error": "Company name is required."}), 400

    try:
        new_comp = company_service.create_company(data)
        return jsonify({"success": True, "company": new_comp}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

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
