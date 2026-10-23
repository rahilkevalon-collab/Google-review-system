import time
from collections import defaultdict
from config import Config

class RateLimiter:
    """
    Sliding window in-memory rate limiter per IP or company.
    Enforces requests-per-minute limit and minimum cooldown between generations.
    """
    def __init__(self, requests_per_minute=Config.RATE_LIMIT_PER_MINUTE, cooldown_seconds=Config.COOLDOWN_SECONDS):
        self.requests_per_minute = requests_per_minute
        self.cooldown_seconds = cooldown_seconds
        self.request_timestamps = defaultdict(list)
        self.last_generation_time = defaultdict(float)

    def is_allowed(self, identifier: str) -> tuple[bool, str]:
        now = time.time()
        
        # Check cooldown
        last_time = self.last_generation_time[identifier]
        if now - last_time < self.cooldown_seconds:
            remaining = round(self.cooldown_seconds - (now - last_time), 1)
            return False, f"Cooldown active. Please wait {remaining} seconds before generating again."
        
        # Clean timestamps older than 60 seconds
        window_start = now - 60.0
        self.request_timestamps[identifier] = [
            ts for ts in self.request_timestamps[identifier] if ts > window_start
        ]
        
        # Check requests per minute
        if len(self.request_timestamps[identifier]) >= self.requests_per_minute:
            return False, f"Rate limit reached ({self.requests_per_minute} requests/min). Please try again shortly."
        
        # Record this request
        self.request_timestamps[identifier].append(now)
        self.last_generation_time[identifier] = now
        return True, ""

generation_rate_limiter = RateLimiter()
