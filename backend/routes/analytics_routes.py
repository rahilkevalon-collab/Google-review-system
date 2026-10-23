from flask import Blueprint, jsonify
from services.analytics_service import analytics_service

analytics_bp = Blueprint("analytics_bp", __name__)

@analytics_bp.route("/analytics/overview", methods=["GET"])
def get_analytics_overview():
    data = analytics_service.get_overview()
    return jsonify({"success": True, "analytics": data}), 200
