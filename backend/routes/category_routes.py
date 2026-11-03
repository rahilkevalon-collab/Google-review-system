from flask import Blueprint, request, jsonify
from services.category_service import category_service

category_bp = Blueprint("category_bp", __name__)

@category_bp.route("/categories", methods=["GET"])
def get_categories():
    categories = category_service.get_all_categories()
    return jsonify({"success": True, "categories": categories}), 200

@category_bp.route("/categories", methods=["POST"])
def create_category():
    """Create or resolve a custom business category."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or data.get("categoryName") or "").strip()
    if not name:
        return jsonify({"success": False, "error": "Category name is required."}), 400
    try:
        cat = category_service.create_or_get_category(name, category_type="custom")
        return jsonify({"success": True, "category": cat}), 201
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@category_bp.route("/categories/<identifier>/keywords", methods=["GET"])
def get_category_keywords(identifier):
    keywords = category_service.get_keywords_by_category(identifier)
    return jsonify({"success": True, "category": identifier, "keywords": keywords}), 200

@category_bp.route("/categories/<identifier>/keywords", methods=["POST"])
def add_category_keyword(identifier):
    data = request.get_json(silent=True) or {}
    keyword = data.get("keyword", "").strip()
    if not keyword:
        return jsonify({"success": False, "error": "Keyword is required."}), 400
    success = category_service.add_keyword(identifier, keyword)
    if not success:
        return jsonify({"success": False, "error": "Could not add keyword to category."}), 400
    return jsonify({"success": True, "message": "Keyword added to category.", "keyword": keyword}), 200
