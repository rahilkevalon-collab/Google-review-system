import os
import uuid
import logging
from functools import wraps
from flask import Blueprint, request, jsonify, current_app

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth_bp", __name__)

DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@reviewcraft.com").lower().strip()
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123").strip()

def admin_required(f):
    """Decorator to enforce admin authentication on administrative endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip()

        if token.startswith("rc_admin_"):
            return f(*args, **kwargs)

        # Allow headless test runs if TESTING flag is explicitly enabled and no header provided
        if current_app and current_app.config.get("TESTING") and not auth_header:
            return f(*args, **kwargs)

        return jsonify({
            "success": False,
            "error": "Access denied. Administrator authentication is required."
        }), 401
    return decorated_function

@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("email") or data.get("username") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not identifier or not password:
        return jsonify({
            "success": False,
            "error": "Email/Username and Password are required."
        }), 400

    # Match against admin credentials
    is_valid_user = (identifier == DEFAULT_ADMIN_EMAIL or identifier == DEFAULT_ADMIN_USERNAME)
    is_valid_pass = (password == DEFAULT_ADMIN_PASSWORD)

    if not (is_valid_user and is_valid_pass):
        return jsonify({
            "success": False,
            "error": "Invalid email or password. Please check your credentials."
        }), 401

    token = f"rc_admin_{uuid.uuid4().hex}"
    user = {
        "name": "Super Admin",
        "email": DEFAULT_ADMIN_EMAIL,
        "username": DEFAULT_ADMIN_USERNAME,
        "role": "admin"
    }

    logger.info("Admin logged in successfully: %s", identifier)
    return jsonify({
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": user
    }), 200

@auth_bp.route("/auth/verify", methods=["GET"])
def verify_token():
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip()

    if not token or not token.startswith("rc_admin_"):
        return jsonify({"success": False, "authenticated": False}), 401

    return jsonify({
        "success": True,
        "authenticated": True,
        "user": {
            "name": "Super Admin",
            "email": DEFAULT_ADMIN_EMAIL,
            "username": DEFAULT_ADMIN_USERNAME,
            "role": "admin"
        }
    }), 200
