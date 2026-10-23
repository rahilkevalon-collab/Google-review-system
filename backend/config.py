import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1")
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/seo_review_generator")
    DB_NAME = os.getenv("DB_NAME", "seo_review_generator")
    
    # Pluggable LLM configuration
    # Options: "gemini", "openai", "groq", "demo"
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini" if os.getenv("GEMINI_API_KEY") else "demo")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    
    # NLP & Deduplication Settings
    SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.72"))
    MAX_GENERATION_RETRIES = int(os.getenv("MAX_GENERATION_RETRIES", "4"))
    MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "5"))
    
    # Rate Limiting & Cooldown (Seconds)
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    COOLDOWN_SECONDS = int(os.getenv("COOLDOWN_SECONDS", "0"))
