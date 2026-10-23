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
        count: int = 5
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
        count: int = 5
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
            services=services
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
        count: int = 5
    ) -> tuple[list[str], str]:
        if not self._client:
            logger.warning("Gemini client not initialized, falling back to template engine.")
            return DemoTemplateProvider().generate_review_candidates(
                company_name, category, keyword, description, services, location, language, tone, length, count
            )

        lang_name = {"en": "English", "hi": "Hindi (Devanagari script)", "gu": "Gujarati (Gujarati script)"}.get(language, "English")
        length_guideline = {
            "short": "1 concise sentence (approx 15-25 words)",
            "medium": "2 to 3 well-crafted sentences (approx 35-65 words)",
            "long": "4 to 5 detailed, story-like sentences (approx 75-120 words)"
        }.get(length, "2-3 sentences")

        prompt = f"""
You are an expert review generation assistant. Generate {count + 2} diverse, authentic-sounding customer review suggestions for a business.

Business Details:
- Company Name: {company_name}
- Industry Category: {category}
- Specific Target SEO Keyword: "{keyword}"
- Description: {description or 'N/A'}
- Products/Services: {services or 'N/A'}
- Location: {location or 'N/A'}

Review Specifications:
- Language: {lang_name}
- Tone: {tone.capitalize()} (Must reflect this style naturally)
- Length: {length_guideline}
- Focus: Each review suggestion MUST naturally weave in the SEO keyword "{keyword}" without sounding forced or repetitive.
- Variety: Make sure each suggestion uses distinct phrasing, different angles of customer satisfaction, and varied sentence structures.

Output Format:
Return ONLY a valid JSON array of strings containing the review suggestions. No markdown formatting, no code blocks, just raw JSON array:
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
            company_name, category, keyword, description, services, location, language, tone, length, count
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
