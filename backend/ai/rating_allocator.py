"""
Rating Allocation and Distribution Module for ReviewCraft AI.

Provides configurable, mathematically sound rating distribution for synthetic/demo
review generation (e.g., 60% 5-star, 40% 4-star) and handles real customer review mode
where submitted ratings are strictly preserved.
"""

from typing import Tuple, List, Dict, Any

try:
    from config import Config
    DEFAULT_FIVE_STAR_PCT = float(getattr(Config, "DEFAULT_FIVE_STAR_PCT", 60.0))
    DEFAULT_FOUR_STAR_PCT = float(getattr(Config, "DEFAULT_FOUR_STAR_PCT", 40.0))
except Exception:
    DEFAULT_FIVE_STAR_PCT = 60.0
    DEFAULT_FOUR_STAR_PCT = 40.0

SUPPORTED_PRESETS = [
    {"id": "60-40", "label": "60% 5-Star / 40% 4-Star (Balanced Demo)", "five_star": 60, "four_star": 40},
    {"id": "70-30", "label": "70% 5-Star / 30% 4-Star (High Praise)", "five_star": 70, "four_star": 30},
    {"id": "50-50", "label": "50% 5-Star / 50% 4-Star (Even Mix)", "five_star": 50, "four_star": 50},
    {"id": "100-0", "label": "100% 5-Star (All 5-Star)", "five_star": 100, "four_star": 0},
]

def validate_rating_distribution(distribution: Any) -> Tuple[bool, str, Dict[str, float]]:
    """
    Validates that a rating distribution configuration specifies non-negative percentages
    that sum exactly to 100%.

    Accepts dict keys such as:
      - {"five_star": 60, "four_star": 40}
      - {"fiveStar": 60, "fourStar": 40}
      - {"5_star": 60, "4_star": 40}
      - {"5": 60, "4": 40}

    Returns:
        (is_valid: bool, error_message: str, normalized_distribution: dict)
    """
    if distribution is None:
        return True, "", {"five_star": DEFAULT_FIVE_STAR_PCT, "four_star": DEFAULT_FOUR_STAR_PCT}

    if not isinstance(distribution, dict):
        return False, "Rating distribution must be a JSON object / dictionary.", {}

    # Extract 5-star percentage
    raw_five = None
    for k in ("five_star", "fiveStar", "5_star", "5", "five", "fiveStars"):
        if k in distribution:
            raw_five = distribution[k]
            break

    # Extract 4-star percentage
    raw_four = None
    for k in ("four_star", "fourStar", "4_star", "4", "four", "fourStars"):
        if k in distribution:
            raw_four = distribution[k]
            break

    if raw_five is None or raw_four is None:
        return False, "Rating distribution must specify both 5-star and 4-star percentages.", {}

    try:
        five_val = float(raw_five)
        four_val = float(raw_four)
    except (ValueError, TypeError):
        return False, "Rating distribution values must be numeric numbers.", {}

    if five_val < 0.0 or four_val < 0.0:
        return False, "Rating percentages cannot be negative.", {}

    total = round(five_val + four_val, 2)
    if abs(total - 100.0) > 0.01:
        return False, f"Rating percentages must sum to 100%. Current total: {total}%.", {}

    return True, "", {"five_star": five_val, "four_star": four_val}

def allocate_demo_ratings(
    batch_size: int,
    distribution: Dict[str, Any] = None
) -> List[int]:
    """
    Allocates 5-star and 4-star ratings across a batch according to the configured distribution
    using the Largest Remainder (Hamilton) method.

    Maintains the requested ratio as closely as possible for small batches.

    Args:
        batch_size: Number of reviews to generate (must be >= 1).
        distribution: Optional distribution dict. Defaults to 60% 5-star, 40% 4-star.

    Returns:
        List of integer ratings (e.g., [5, 4, 5] for batch_size=3 with 60/40).
    """
    if batch_size < 1:
        raise ValueError("Batch size must be at least 1.")

    is_valid, err_msg, norm_dist = validate_rating_distribution(distribution)
    if not is_valid:
        raise ValueError(err_msg)

    five_pct = norm_dist["five_star"]
    four_pct = norm_dist["four_star"]

    # Quotas
    five_quota = (batch_size * five_pct) / 100.0
    four_quota = (batch_size * four_pct) / 100.0

    five_count = int(five_quota)
    four_count = int(four_quota)

    rem_slots = batch_size - (five_count + four_count)
    if rem_slots > 0:
        five_rem = five_quota - five_count
        four_rem = four_quota - four_count

        # Assign remaining slot to whichever has largest fractional remainder
        if five_rem >= four_rem:
            five_count += 1
            rem_slots -= 1
        if rem_slots > 0:
            four_count += 1
            rem_slots -= 1

    # Build sequence with balanced interleaving (e.g. 5, 4, 5 instead of 5, 5, 4)
    allocated: List[int] = []
    fives_left = five_count
    fours_left = four_count

    while fives_left > 0 or fours_left > 0:
        # If we have 5-star quota, lead with 5-star
        if fives_left > 0:
            allocated.append(5)
            fives_left -= 1
        if fours_left > 0:
            allocated.append(4)
            fours_left -= 1

    # Return exactly batch_size items
    return allocated[:batch_size]
