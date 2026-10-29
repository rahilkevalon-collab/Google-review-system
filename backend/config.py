import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1")
    MONGODB_URI = (
        os.getenv("MONGODB_URI") or 
        os.getenv("MONGO_URI") or 
        os.getenv("DATABASE_URL") or 
        "mongodb://127.0.0.1:27017/seo_review_generator"
    )
    DB_NAME = os.getenv("DB_NAME", "seo_review_generator")
    
    # Primary AI Provider: Groq API
    # Options: "groq" (default), "demo" (offline template fallback)
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
    
    # NLP & Deduplication Settings
    SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.72"))
    MAX_GENERATION_RETRIES = int(os.getenv("MAX_GENERATION_RETRIES", "4"))
    MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "5"))
    
    # Rate Limiting & Cooldown (Seconds)
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    COOLDOWN_SECONDS = int(os.getenv("COOLDOWN_SECONDS", "0"))
    
    # Rating Distribution (Demo Mode: 100% 5-star default)
    DEFAULT_FIVE_STAR_PCT = float(os.getenv("DEFAULT_FIVE_STAR_PCT", "100.0"))
    DEFAULT_FOUR_STAR_PCT = float(os.getenv("DEFAULT_FOUR_STAR_PCT", "0.0"))
    
    # Google Places API for company location auto-detection
    GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
