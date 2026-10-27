import logging
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from utils.db import Database
from services.category_service import category_service
from services.company_service import company_service
from routes.health_routes import health_bp
from routes.category_routes import category_bp
from routes.company_routes import company_bp
from routes.review_routes import review_bp
from routes.analytics_routes import analytics_bp
from routes.auth_routes import auth_bp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database connection & indexes
    Database.initialize()

    # Pre-seed default categories and sample companies
    category_service.seed_categories_if_empty()
    company_service.seed_companies_if_empty()

    # Register blueprints under /api
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(category_bp, url_prefix="/api")
    app.register_blueprint(company_bp, url_prefix="/api")
    app.register_blueprint(review_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")

    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def handle_internal_error(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app

app = create_app()

if __name__ == "__main__":
    logger.info("Starting SEO Review Generator Flask Server on port %d...", Config.PORT)
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
