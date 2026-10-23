import logging
from config import Config
from utils.db import Database, serialize_doc
from ai.llm_provider import get_llm_provider

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self):
        self.db = Database.get_db()

    def get_overview(self) -> dict:
        total_companies = self.db.companies.count_documents({})
        total_reviews = self.db.generated_reviews.count_documents({})
        
        # Calculate total copy events
        copy_pipeline = [
            {"$group": {"_id": None, "totalCopies": {"$sum": "$copyCount"}}}
        ]
        copy_res = list(self.db.generated_reviews.aggregate(copy_pipeline))
        total_copies = copy_res[0]["totalCopies"] if copy_res else 0

        # Calculate generation rejection statistics
        logs_pipeline = [
            {
                "$group": {
                    "_id": None,
                    "totalRequested": {"$sum": "$requestedCount"},
                    "totalGenerated": {"$sum": "$generatedCount"},
                    "totalRejected": {"$sum": "$rejectedDuplicateCount"}
                }
            }
        ]
        logs_res = list(self.db.generation_logs.aggregate(logs_pipeline))
        total_requested = logs_res[0]["totalRequested"] if logs_res else 0
        total_rejected = logs_res[0]["totalRejected"] if logs_res else 0
        
        rejection_rate = round((total_rejected / total_requested * 100), 1) if total_requested > 0 else 0.0

        # Top keywords
        kw_pipeline = [
            {"$group": {"_id": "$keyword", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 6}
        ]
        top_keywords = [{"keyword": item["_id"], "count": item["count"]} for item in self.db.generated_reviews.aggregate(kw_pipeline) if item["_id"]]

        # Recent generation logs
        recent_logs = list(self.db.generation_logs.find().sort("createdAt", -1).limit(5))

        active_provider = get_llm_provider()

        return {
            "totalCompanies": total_companies,
            "totalReviews": total_reviews,
            "totalCopies": total_copies,
            "totalRejections": total_rejected,
            "rejectionRate": rejection_rate,
            "activeProvider": active_provider.name,
            "isAiPowered": active_provider.is_ai,
            "similarityThreshold": Config.SIMILARITY_THRESHOLD,
            "topKeywords": top_keywords,
            "recentLogs": [serialize_doc(log) for log in recent_logs]
        }

analytics_service = AnalyticsService()
