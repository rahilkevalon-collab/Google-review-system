from flask import Blueprint, jsonify
from utils.db import Database
from ai.llm_provider import get_llm_provider
from config import Config

health_bp = Blueprint("health_bp", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    db = Database.get_db()
    is_mock = Database.is_mock()
    provider = get_llm_provider()

    return jsonify({
        "status": "healthy",
        "database": {
            "connected": db is not None,
            "isMock": is_mock,
            "name": Config.DB_NAME
        },
        "aiProvider": {
            "name": provider.name,
            "isAi": provider.is_ai,
            "model": "gemini-2.5-flash" if provider.name == "google-gemini" else "template-fallback"
        },
        "settings": {
            "similarityThreshold": Config.SIMILARITY_THRESHOLD,
            "maxBatchSize": Config.MAX_BATCH_SIZE,
            "rateLimitPerMin": Config.RATE_LIMIT_PER_MINUTE
        }
    }), 200
