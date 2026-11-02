import logging
from flask import Blueprint, request, jsonify
from services.branch_service import branch_service
from services.company_service import company_service
from routes.auth_routes import admin_required

logger = logging.getLogger(__name__)

branch_bp = Blueprint("branch_bp", __name__)

@branch_bp.route("/companies/<company_id>/branches", methods=["GET"])
def get_company_branches(company_id):
    """List all branches belonging to a specific company."""
    try:
        branches = branch_service.list_branches_by_company(company_id)
        return jsonify({"success": True, "branches": branches, "count": len(branches)}), 200
    except Exception as e:
        logger.error("Error fetching branches for company %s: %s", company_id, str(e))
        return jsonify({"success": False, "error": str(e)}), 500

@branch_bp.route("/companies/<company_id>/branches", methods=["POST"])
@admin_required
def create_branch_endpoint(company_id):
    """Create a new branch under a specific company (Admin only)."""
    data = request.get_json(silent=True) or {}
    try:
        new_branch = branch_service.create_branch(company_id, data)
        return jsonify({"success": True, "branch": new_branch}), 201
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        logger.error("Error creating branch: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

@branch_bp.route("/branches/<branch_id>", methods=["GET"])
def get_branch_endpoint(branch_id):
    """Retrieve single branch details by ID."""
    try:
        branch = branch_service.get_branch_by_id(branch_id)
        if not branch:
            return jsonify({"success": False, "error": "Branch not found"}), 404
        return jsonify({"success": True, "branch": branch}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@branch_bp.route("/branches/<branch_id>", methods=["PUT", "PATCH"])
@admin_required
def update_branch_endpoint(branch_id):
    """Update branch information (Admin only)."""
    data = request.get_json(silent=True) or {}
    try:
        updated = branch_service.update_branch(branch_id, data)
        if not updated:
            return jsonify({"success": False, "error": "Branch not found"}), 404
        return jsonify({"success": True, "branch": updated}), 200
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        logger.error("Error updating branch %s: %s", branch_id, str(e))
        return jsonify({"success": False, "error": str(e)}), 500

@branch_bp.route("/branches/<branch_id>", methods=["DELETE"])
@admin_required
def delete_branch_endpoint(branch_id):
    """Delete a branch (Admin only)."""
    try:
        success = branch_service.delete_branch(branch_id)
        if not success:
            return jsonify({"success": False, "error": "Branch not found or could not be deleted"}), 404
        return jsonify({"success": True, "message": "Branch deleted successfully"}), 200
    except Exception as e:
        logger.error("Error deleting branch %s: %s", branch_id, str(e))
        return jsonify({"success": False, "error": str(e)}), 500

@branch_bp.route("/branches/<branch_id>/status", methods=["PATCH", "POST"])
@admin_required
def toggle_branch_status_endpoint(branch_id):
    """Activate or deactivate a branch review page (Admin only)."""
    data = request.get_json(silent=True) or {}
    is_active = data.get("isActive")
    try:
        updated = branch_service.toggle_branch_status(branch_id, is_active)
        if not updated:
            return jsonify({"success": False, "error": "Branch not found"}), 404
        return jsonify({"success": True, "branch": updated}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@branch_bp.route("/reviews/page/<slug_or_id>", methods=["GET"])
def get_review_page_endpoint(slug_or_id):
    """
    Public endpoint to load everything needed for the review studio by slug or branch ID.
    E.g.: /api/reviews/page/kevlon-ahmedabad
    Returns branch details, parent company info, and SEO keywords.
    """
    try:
        branch = branch_service.get_branch_by_slug(slug_or_id)
        if not branch:
            return jsonify({"success": False, "error": "Review page not found"}), 404
        return jsonify({"success": True, "branch": branch, "company": branch.get("company")}), 200
    except Exception as e:
        logger.error("Error loading review page for '%s': %s", slug_or_id, str(e))
        return jsonify({"success": False, "error": str(e)}), 500

