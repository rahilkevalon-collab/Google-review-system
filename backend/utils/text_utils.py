import re
import hashlib
import unicodedata

def normalize_text(text: str) -> str:
    """
    Standardize text for duplicate detection and hashing:
    - Unicode NFKD normalization
    - Convert to lowercase
    - Remove extra spaces, newlines, and tabs
    - Strip punctuation
    """
    if not text:
        return ""
    # Normalize unicode characters
    normalized = unicodedata.normalize("NFKD", text)
    # Lowercase
    lowered = normalized.lower()
    # Strip URLs if any
    no_urls = re.sub(r'https?://\S+|www\.\S+', '', lowered)
    # Remove punctuation
    no_punct = re.sub(r'[^\w\s]', ' ', no_urls)
    # Collapse multiple whitespaces into a single space
    cleaned = re.sub(r'\s+', ' ', no_punct).strip()
    return cleaned

def compute_content_hash(text: str) -> str:
    """Compute deterministic SHA256 hash of normalized text."""
    norm = normalize_text(text)
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()

def extract_word_count(text: str) -> int:
    """Count words in text."""
    if not text:
        return 0
    return len(text.split())

def validate_and_trim_review_length(text: str, target_min: int = 25, target_max: int = 48) -> str:
    """
    Validates and formats review text so it targets 25-45 words and approximately 2-3 sentences.
    If text is excessively long (over target_max words), cleanly preserves full sentences within the word budget.
    """
    if not text:
        return ""
    words = text.strip().split()
    if len(words) <= target_max:
        return text.strip()

    # Split into sentences preserving punctuation
    sentences = re.split(r'(?<=[.!?।])\s+', text.strip())
    if len(sentences) <= 1:
        return " ".join(words[:target_max]).rstrip(",;") + "."

    trimmed = []
    current_count = 0
    for s in sentences:
        s_words = len(s.split())
        if current_count + s_words <= target_max:
            trimmed.append(s)
            current_count += s_words
        elif current_count >= target_min:
            break
        else:
            trimmed.append(s)
            break

    result = " ".join(trimmed).strip()
    return result if result else text.strip()
