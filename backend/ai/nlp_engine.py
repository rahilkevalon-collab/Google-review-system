import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from utils.text_utils import normalize_text, compute_content_hash
from config import Config

logger = logging.getLogger(__name__)

class NLPEngine:
    """
    NLP & Scikit-Learn Engine for review deduplication, vectorization,
    cosine similarity measurement, and candidate filtering.
    """
    def __init__(self, default_threshold: float = Config.SIMILARITY_THRESHOLD):
        self.default_threshold = default_threshold

    def compute_similarity_matrix(self, texts: list[str]) -> np.ndarray:
        """
        Compute pairwise cosine similarity matrix using TF-IDF for a list of texts.
        """
        if not texts or len(texts) < 2:
            return np.ones((len(texts), len(texts))) if texts else np.zeros((0, 0))
        
        normalized = [normalize_text(t) for t in texts]
        # In case all texts are empty strings after normalization
        if all(len(t) == 0 for t in normalized):
            return np.ones((len(texts), len(texts)))

        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words='english',
            token_pattern=r'(?u)\b\w+\b',
            sublinear_tf=True
        )
        try:
            tfidf_matrix = vectorizer.fit_transform(normalized)
            sim_matrix = cosine_similarity(tfidf_matrix)
            return sim_matrix
        except Exception as e:
            logger.warning("Error computing TF-IDF similarity matrix: %s", str(e))
            return np.zeros((len(texts), len(texts)))

    def check_candidate(
        self,
        candidate_text: str,
        existing_texts: list[str],
        threshold: float = None
    ) -> dict:
        """
        Check if a single candidate text is an exact duplicate or near-duplicate
        against a list of existing texts.
        
        Returns dict:
        {
            "is_duplicate": bool,
            "similarity_score": float,
            "reason": str,
            "matched_text": str or None,
            "candidate_hash": str
        }
        """
        if threshold is None:
            threshold = self.default_threshold

        candidate_norm = normalize_text(candidate_text)
        cand_hash = compute_content_hash(candidate_text)

        if not candidate_norm:
            return {
                "is_duplicate": True,
                "similarity_score": 1.0,
                "reason": "Empty candidate text",
                "matched_text": None,
                "candidate_hash": cand_hash
            }

        if not existing_texts:
            return {
                "is_duplicate": False,
                "similarity_score": 0.0,
                "reason": "No previous history to compare against",
                "matched_text": None,
                "candidate_hash": cand_hash
            }

        existing_norms = [normalize_text(t) for t in existing_texts]

        # 1. Exact Duplicate Check via Normalized Text
        for orig, norm in zip(existing_texts, existing_norms):
            if candidate_norm == norm:
                return {
                    "is_duplicate": True,
                    "similarity_score": 1.0,
                    "reason": "Exact duplicate of previous review",
                    "matched_text": orig,
                    "candidate_hash": cand_hash
                }

        # 2. Near-Duplicate Check via TF-IDF + Cosine Similarity
        corpus = existing_norms + [candidate_norm]
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words='english',
            token_pattern=r'(?u)\b\w+\b',
            sublinear_tf=True
        )

        try:
            tfidf_matrix = vectorizer.fit_transform(corpus)
            existing_matrix = tfidf_matrix[:-1]
            candidate_vector = tfidf_matrix[-1:]
            similarities = cosine_similarity(candidate_vector, existing_matrix).flatten()

            max_idx = int(np.argmax(similarities))
            max_sim = float(similarities[max_idx])
            most_similar_orig = existing_texts[max_idx]

            if max_sim >= threshold:
                return {
                    "is_duplicate": True,
                    "similarity_score": round(max_sim, 4),
                    "reason": f"Near-duplicate: Cosine similarity {max_sim:.3f} >= threshold {threshold:.2f}",
                    "matched_text": most_similar_orig,
                    "candidate_hash": cand_hash
                }

            return {
                "is_duplicate": False,
                "similarity_score": round(max_sim, 4),
                "reason": f"Candidate accepted: Max similarity {max_sim:.3f} < threshold {threshold:.2f}",
                "matched_text": most_similar_orig,
                "candidate_hash": cand_hash
            }

        except Exception as e:
            logger.error("Error during TF-IDF vectorization: %s", str(e))
            # Fallback to safe accept if vectorizer fails due to rare unicode edge cases
            return {
                "is_duplicate": False,
                "similarity_score": 0.0,
                "reason": "Passed with fallback",
                "matched_text": None,
                "candidate_hash": cand_hash
            }

    def filter_batch(
        self,
        candidate_texts: list[str],
        historical_texts: list[str],
        threshold: float = None
    ) -> tuple[list[dict], list[dict]]:
        """
        Filter a batch of candidate suggestions against historical reviews
        as well as previously accepted candidates within the current batch.
        
        Returns:
            accepted: list of dicts with {"text", "hash", "max_similarity"}
            rejected: list of dicts with {"text", "reason", "similarity_score", "matched_text"}
        """
        if threshold is None:
            threshold = self.default_threshold

        accepted = []
        rejected = []
        current_pool = list(historical_texts)

        for text in candidate_texts:
            check_result = self.check_candidate(text, current_pool, threshold=threshold)
            if check_result["is_duplicate"]:
                rejected.append({
                    "text": text,
                    "reason": check_result["reason"],
                    "similarity_score": check_result["similarity_score"],
                    "matched_text": check_result["matched_text"]
                })
            else:
                accepted.append({
                    "text": text,
                    "hash": check_result["candidate_hash"],
                    "max_similarity": check_result["similarity_score"]
                })
                current_pool.append(text)

        return accepted, rejected

nlp_engine = NLPEngine()
