"""
Rating Allocation and Distribution Module for ReviewCraft AI.
Re-exports functionality from services/rating_service.py for architectural backward-compatibility.
"""

from services.rating_service import (
    RatingService,
    DEFAULT_FIVE_STAR_PCT,
    DEFAULT_FOUR_STAR_PCT,
    SUPPORTED_PRESETS,
    validate_rating_distribution,
    allocate_demo_ratings,
    assign_batch_ratings,
    rating_service
)

__all__ = [
    "RatingService",
    "DEFAULT_FIVE_STAR_PCT",
    "DEFAULT_FOUR_STAR_PCT",
    "SUPPORTED_PRESETS",
    "validate_rating_distribution",
    "allocate_demo_ratings",
    "assign_batch_ratings",
    "rating_service"
]
