import os
import json
import logging
from abc import ABC, abstractmethod
from config import Config
from ai.templates import generate_template_candidates

logger = logging.getLogger(__name__)

class BaseLLMProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_ai(self) -> bool:
        """True if real AI model, False if demo template fallback."""
        pass

    @abstractmethod
    def generate_review_candidates(
        self,
        company_name: str,
        category: str,
        keyword: str,
        description: str = "",
        services: str = "",
        location: str = "",
        language: str = "en",
        tone: str = "natural",
        length: str = "medium",
        count: int = 5,
        target_rating: int = 5
    ) -> tuple[list[str], str]:
        """
        Returns (list_of_candidate_texts, provider_source_string)
        """
        pass

class DemoTemplateProvider(BaseLLMProvider):
    @property
    def name(self) -> str:
        return "template-demo"

    @property
    def is_ai(self) -> bool:
        return False

    def generate_review_candidates(
        self,
        company_name: str,
        category: str,
        keyword: str,
        description: str = "",
        services: str = "",
        location: str = "",
        language: str = "en",
        tone: str = "natural",
        length: str = "medium",
        count: int = 5,
        target_rating: int = 5
    ) -> tuple[list[str], str]:
        candidates = generate_template_candidates(
            company_name=company_name,
            category=category,
            keyword=keyword,
            language=language,
            tone=tone,
            length=length,
            count=count,
            location=location,
            services=services,
            target_rating=target_rating
        )
        return candidates, "template-demo"

class GeminiLLMProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None
        self._init_client()

    def _init_client(self):
        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
            logger.info("Initialized Google GenAI Client successfully.")
        except Exception as e:
            logger.warning("Could not initialize google-genai client: %s", str(e))
            self._client = None

    @property
    def name(self) -> str:
        return "google-gemini"

    @property
    def is_ai(self) -> bool:
        return True

    def generate_review_candidates(
        self,
        company_name: str,
        category: str,
        keyword: str,
        description: str = "",
        services: str = "",
        location: str = "",
        language: str = "en",
        tone: str = "natural",
        length: str = "medium",
        count: int = 5,
        target_rating: int = 5
    ) -> tuple[list[str], str]:
        if not self._client:
            logger.warning("Gemini client not initialized, falling back to template engine.")
            return DemoTemplateProvider().generate_review_candidates(
                company_name, category, keyword, description, services, location, language, tone, length, count, target_rating
            )

        lang_name = {"en": "English", "hi": "Hindi (Devanagari script)", "gu": "Gujarati (Gujarati script)"}.get(language, "English")
        length_guideline = {
            "short": "1 single short, punchy sentence (approx 8-15 words)",
            "medium": "1 to 2 short, crisp sentences (approx 14-25 words)",
            "long": "2 to 3 concise sentences (approx 25-38 words)"
        }.get(length, "1 to 2 short sentences (approx 14-25 words)")

        if int(target_rating) == 4:
            rating_instructions = f"""
- Target Rating: 4 Stars (Out of 5)
- Tone & Substance: Genuine, positive human customer feedback praising {company_name} on "{keyword}", with ONE mild realistic human comment (such as "took a little longer than expected" or "response was slightly delayed"). Keep it casual, friendly, and authentic.
"""
        else:
            rating_instructions = f"""
- Target Rating: 5 Stars (Out of 5)
- Tone & Substance: Enthusiastic, genuine customer feedback. Sound like a real person who visited or hired {company_name} and is genuinely happy with their "{keyword}". Mention friendly staff, quick service, or great quality.
"""

        prompt = f"""
You are a customer writing a genuine, natural Google Review for a business.
Write like a REAL human customer on Google Maps — NOT an AI model, NOT a corporate marketer, and NOT a B2B business proposal.

Business Details:
- Business Name: {company_name}
- Industry: {category}
- Keyword to naturally mention: "{keyword}"
- Products/Services: {services or 'N/A'}
- Location: {location or 'N/A'}

Crucial Rules for Real Human-Sounding Reviews:
1. Short & Punchy: {length_guideline}. Real people write brief reviews on Google Maps. Do NOT write long paragraphs.
2. Real Human Phrasing: Use everyday casual, authentic customer expressions like "Really great experience", "Super fast service", "Friendly and helpful staff", "Loved their work", "Fair prices", "Highly recommend!", "5 stars!".
3. STRICTLY FORBIDDEN (AI / Corporate Buzzwords): NEVER use words like "We partnered with...", "met key milestones", "dependable execution", "disciplined approach", "delivered as scoped", "sound operational decision", "domain expertise", or formal corporate jargon.
4. Natural Keyword Flow: Fit "{keyword}" naturally into the sentence without making it look forced or highlighted.
5. Star Rating: {rating_instructions}
6. Language: {lang_name}

Output Format:
Return ONLY a valid JSON array of strings containing {count + 2} diverse, distinct review suggestions. No markdown formatting, no code blocks:
["Review suggestion 1...", "Review suggestion 2...", ...]
"""

        try:
            response = self._client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            raw_text = response.text.strip()
            # Clean possible markdown block wrappers
            if raw_text.startswith("```"):
                lines = raw_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw_text = "\n".join(lines).strip()

            parsed = json.loads(raw_text)
            if isinstance(parsed, list) and len(parsed) > 0:
                return [str(item).strip() for item in parsed if str(item).strip()], "google-gemini"
        except Exception as e:
            logger.error("Gemini API error during review generation: %s", str(e))

        # Fallback if API fails
        logger.info("Falling back to DemoTemplateProvider due to API error.")
        return DemoTemplateProvider().generate_review_candidates(
            company_name, category, keyword, description, services, location, language, tone, length, count, target_rating
        )

def get_llm_provider() -> BaseLLMProvider:
    """Factory to instantiate the appropriate LLM provider based on config and available keys."""
    provider_name = Config.LLM_PROVIDER.lower()
    
    if provider_name == "gemini" and Config.GEMINI_API_KEY:
        try:
            return GeminiLLMProvider(Config.GEMINI_API_KEY)
        except Exception as e:
            logger.warning("Error instantiating GeminiLLMProvider: %s. Using DemoTemplateProvider.", str(e))
            return DemoTemplateProvider()
    
    # Default to explicitly-labelled Demo Template Engine
    return DemoTemplateProvider()
