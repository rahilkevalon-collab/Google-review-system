from flask import Blueprint, jsonify
from services.category_service import category_service

category_bp = Blueprint("category_bp", __name__)

@category_bp.route("/categories", methods=["GET"])
def get_categories():
    categories = category_service.get_all_categories()
    return jsonify({"success": True, "categories": categories}), 200

@category_bp.route("/categories/<identifier>/keywords", methods=["GET"])
def get_category_keywords(identifier):
    keywords = category_service.get_keywords_by_category(identifier)
    return jsonify({"success": True, "category": identifier, "keywords": keywords}), 200
