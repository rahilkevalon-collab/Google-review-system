import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from bson import ObjectId
from datetime import datetime
from config import Config

logger = logging.getLogger(__name__)

class Database:
    _client = None
    _db = None
    _is_mock = False

    @classmethod
    def get_db(cls):
        if cls._db is None:
            cls.initialize()
        return cls._db

    @classmethod
    def is_mock(cls):
        return cls._is_mock

    @classmethod
    def initialize(cls, force: bool = False):
        if cls._db is not None and not force:
            return cls._db
        try:
            # 10s timeout to allow MongoDB Atlas DNS resolution and SSL handshake on cloud platforms
            client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=10000)
            # Trigger server selection to verify connectivity
            client.admin.command('ping')
            cls._client = client
            try:
                cls._db = client.get_default_database()
            except Exception:
                cls._db = None
            if cls._db is None:
                cls._db = client[Config.DB_NAME]
            cls._is_mock = False
            logger.info("Connected successfully to real MongoDB database: %s", cls._db.name)
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
            logger.warning("Could not connect to configured MongoDB (%s). Trying local MongoDB on 127.0.0.1:27017...", str(e))
            try:
                client = MongoClient("mongodb://127.0.0.1:27017/seo_review_generator", serverSelectionTimeoutMS=2000)
                client.admin.command('ping')
                cls._client = client
                cls._db = client[Config.DB_NAME]
                cls._is_mock = False
                logger.info("Connected successfully to local MongoDB: %s", cls._db.name)
            except Exception as local_err:
                logger.warning("Local MongoDB not available (%s). Falling back to in-memory mongomock database.", str(local_err))
                try:
                    import mongomock
                    cls._client = mongomock.MongoClient()
                    cls._db = cls._client[Config.DB_NAME]
                    cls._is_mock = True
                    logger.info("In-memory mongomock database initialized.")
                except Exception as mock_err:
                    logger.error("Failed to initialize mongomock: %s", str(mock_err))
                    raise

        cls._setup_indexes()

    @classmethod
    def _setup_indexes(cls):
        try:
            db = cls._db
            # Categories index
            db.categories.create_index([("name", ASCENDING)], unique=True)

            # Companies indexes
            db.companies.create_index([("createdAt", DESCENDING)])
            db.companies.create_index([("name", ASCENDING)])

            # Generated Reviews indexes
            # Ensure unique contentHash per company to prevent exact duplicates at the DB level
            db.generated_reviews.create_index(
                [("companyId", ASCENDING), ("contentHash", ASCENDING)],
                unique=True,
                name="unique_company_review_hash"
            )
            db.generated_reviews.create_index([("companyId", ASCENDING), ("createdAt", DESCENDING)])
            db.generated_reviews.create_index([("keyword", ASCENDING)])
            db.generated_reviews.create_index([("category", ASCENDING)])

            # Generation Logs indexes
            db.generation_logs.create_index([("companyId", ASCENDING), ("createdAt", DESCENDING)])
            db.generation_logs.create_index([("createdAt", DESCENDING)])

            logger.info("Database indexes configured successfully.")
        except Exception as e:
            logger.warning("Index setup notice: %s", str(e))

def serialize_doc(doc):
    """Recursively convert MongoDB document BSON types (ObjectId, datetime) to JSON serializable structures."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if k == "_id":
                result["id"] = str(v)
            elif isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                result[k] = serialize_doc(v)
            else:
                result[k] = v
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc
