import re

POSITIVE_LEXICON = {
    # English
    "excellent", "outstanding", "exceptional", "great", "amazing", "superb", "fantastic",
    "prompt", "reliable", "efficient", "professional", "seamless", "delighted", "impressed",
    "recommend", "satisfaction", "helpful", "friendly", "flawless", "innovative", "top-notch",
    "quality", "fast", "affordable", "supportive", "trustworthy", "best", "wonderful", "love",
    # Transliterated / Hindi / Gujarati keywords
    "shandar", "badhiya", "saras", "uttam", "khub", "shreshth", "bahut", "badiya", "kamaal"
}

ENTHUSIASM_PUNCTUATION = {"!", "!!"}

def analyze_review_sentiment(text: str) -> dict:
    """
    Lightweight rule-based sentiment and synthetic score estimation.
    Labels ratings explicitly as synthetic indicators.
    """
    if not text:
        return {
            "score": 0.5,
            "label": "Neutral",
            "syntheticRating": 4.0,
            "toneAssessment": "Neutral",
            "disclaimer": "Synthetic demo metric - not a verified customer rating"
        }

    words = re.findall(r'\b\w+\b', text.lower())
    total_words = max(len(words), 1)
    
    pos_matches = sum(1 for w in words if w in POSITIVE_LEXICON)
    has_exclamation = "!" in text

    # Base positive ratio
    pos_ratio = pos_matches / total_words
    
    # Calculate score between 0.6 and 1.0 (review suggestions are inherently positive/promotional)
    raw_score = min(0.65 + (pos_ratio * 2.5) + (0.05 if has_exclamation else 0.0), 1.0)
    score = round(raw_score, 2)

    if score >= 0.88:
        label = "Highly Enthusiastic"
        synthetic_rating = 5.0
        tone = "Strong Endorsement"
    elif score >= 0.75:
        label = "Positive & Recommending"
        synthetic_rating = 5.0
        tone = "Professional & Satisfied"
    else:
        label = "Balanced & Informative"
        synthetic_rating = 4.5
        tone = "Constructive & Pleased"

    return {
        "score": score,
        "label": label,
        "syntheticRating": synthetic_rating,
        "toneAssessment": tone,
        "disclaimer": "Synthetic demo metric - not a verified customer rating"
    }
