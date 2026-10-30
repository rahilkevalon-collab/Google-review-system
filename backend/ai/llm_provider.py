import os
import json
import logging
import re
import time
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
    def __init__(self, is_fallback: bool = False):
        self._is_fallback = is_fallback

    @property
    def name(self) -> str:
        return "template-demo-fallback" if self._is_fallback else "template-demo"

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
        return candidates, self.name

class GroqLLMProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = None):
        self.api_key = api_key.strip().strip('"').strip("'")
        self.model = (model or Config.GROQ_MODEL or "openai/gpt-oss-20b").strip()
        self._client = None
        self._init_client()

    def _init_client(self):
        try:
            from groq import Groq
            self._client = Groq(api_key=self.api_key, timeout=25.0)
            logger.info("Initialized Groq Client successfully with model: %s", self.model)
        except Exception as e:
            logger.warning("Could not initialize Groq client: %s", str(e))
            self._client = None

    @property
    def name(self) -> str:
        return "groq"

    @property
    def is_ai(self) -> bool:
        return True

    def _clean_unicode_artifacts(self, text: str) -> str:
        """Normalizes unicode hyphens, quotes, and non-breaking spaces commonly emitted by LLMs."""
        if not text:
            return ""
        return (
            text.replace("\u2011", "-")
            .replace("\u2012", "-")
            .replace("\u2013", "-")
            .replace("\u2014", "-")
            .replace("\u00a0", " ")
            .replace("\u2018", "'")
            .replace("\u2019", "'")
            .replace("\u201c", '"')
            .replace("\u201d", '"')
            .strip()
        )

    def _parse_json_candidates(self, raw_text: str) -> list[str]:
        """Robustly extracts JSON array of review strings from Groq response."""
        cleaned = raw_text.strip()

        # 1. Strip markdown fences if present
        if "```" in cleaned:
            parts = cleaned.split("```")
            for part in parts:
                p = part.strip()
                if p.startswith("json"):
                    p = p[4:].strip()
                try:
                    parsed = json.loads(p)
                    if isinstance(parsed, list):
                        res = [self._clean_unicode_artifacts(str(x)) for x in parsed if str(x).strip()]
                        if res:
                            return res
                    elif isinstance(parsed, dict):
                        for val in parsed.values():
                            if isinstance(val, list):
                                res = [self._clean_unicode_artifacts(str(x)) for x in val if str(x).strip()]
                                if res:
                                    return res
                except Exception:
                    continue

        # 2. Direct JSON parsing
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                res = [self._clean_unicode_artifacts(str(x)) for x in parsed if str(x).strip()]
                if res:
                    return res
            elif isinstance(parsed, dict):
                for val in parsed.values():
                    if isinstance(val, list):
                        res = [self._clean_unicode_artifacts(str(x)) for x in val if str(x).strip()]
                        if res:
                            return res
        except Exception:
            pass

        # 3. Locate array brackets [ ... ]
        start_idx = cleaned.find('[')
        end_idx = cleaned.rfind(']')
        if start_idx != -1 and end_idx > start_idx:
            try:
                parsed = json.loads(cleaned[start_idx:end_idx+1])
                if isinstance(parsed, list):
                    res = [self._clean_unicode_artifacts(str(x)) for x in parsed if str(x).strip()]
                    if res:
                        return res
            except Exception:
                pass

        # 4. Extract all valid JSON string literals inside quotes
        matches = re.findall(r'"((?:[^"\\]|\\.)*)"', cleaned)
        if matches:
            candidates = []
            for m in matches:
                val = m.replace('\\"', '"').replace('\\\\', '\\')
                cleaned_val = self._clean_unicode_artifacts(val)
                if len(cleaned_val) > 15 and not cleaned_val.lower().startswith(('review draft', 'http', '{', '[')):
                    candidates.append(cleaned_val)
            if candidates:
                return candidates

        # 5. Fallback: line-by-line bullet extraction
        lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
        extracted = []
        for line in lines:
            m = re.sub(r'^(?:\d+[\.\)]|\-|\*|•)?\s*["\']?', '', line)
            m = re.sub(r'["\']?\s*$', '', m).strip()
            if len(m) > 15 and not m.startswith("[") and not m.startswith("{"):
                extracted.append(self._clean_unicode_artifacts(m))

        return extracted

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
        if not self._client or not self.api_key:
            logger.warning("Groq client not initialized or GROQ_API_KEY missing; falling back to template engine.")
            return DemoTemplateProvider(is_fallback=True).generate_review_candidates(
                company_name, category, keyword, description, services, location, language, tone, length, count, target_rating
            )

        lang_name = {"en": "English", "hi": "Hindi (Devanagari script)", "gu": "Gujarati (Gujarati script)"}.get(language, "English")
        length_guideline = {
            "short": "1 short, punchy sentence (approx 8-16 words)",
            "medium": "1 to 2 crisp, authentic sentences (approx 14-26 words)",
            "long": "2 to 3 concise sentences (approx 24-38 words)"
        }.get(length, "1 to 2 short sentences (approx 14-26 words)")

        if int(target_rating) == 4:
            rating_instructions = f"""
- Target Rating: 4 Stars
- Tone & Perspective: Positive, constructive review draft praising {company_name} on "{keyword}", with ONE mild constructive observation about turnaround, communication, or response (e.g. "turnaround took a bit longer than expected, but quality was top-notch" or "response during initial kickoff had a slight delay, but overall very happy"). Keep it authentic and constructive.
"""
        else:
            rating_instructions = f"""
- Target Rating: 5 Stars
- Tone & Perspective: Enthusiastic, genuine customer review draft. Sound like a real person who visited or hired {company_name} and is genuinely happy with their "{keyword}". Mention friendly staff, quick responsiveness, or high-quality work.
"""

        system_message = (
            "You are an AI assistant helping a business generate helpful, natural, editable review starter drafts. "
            "These drafts will be presented to real customers as starting suggestions that they can freely edit and customize "
            "based on their own genuine, personal experiences. "
            "Do NOT fabricate specific factual claims, fake customer names, or unverifiable personal anecdotes. "
            "Write authentic, human-sounding drafts appropriate for Google Maps reviews, avoiding corporate jargon or repetitive phrasing. "
            "Generate distinct, creative phrasing for each draft to ensure variety across batches and refreshes. "
            "Output MUST be a valid JSON array of strings ONLY."
        )

        user_prompt = f"""
Create {count + 2} varied, distinct review draft suggestions for customers of the following business:

Business Details:
- Company Name: {company_name}
- Industry / Category: {category or 'General Business'}
- Focus Service / SEO Keyword: "{keyword}"
- Products/Services: {services or 'N/A'}
- Business Location: {location or 'N/A'}
- Desired Tone: {tone}
- Language: {lang_name}

Rules for Authentic Review Drafts:
1. Length: {length_guideline}. Keep drafts brief, crisp, and realistic for Google Maps reviews.
2. Naturally integrate the exact focus keyword '{keyword}' into each draft with exact spelling and capitalization.
3. Keep the wording authentic, warm, and natural. Do NOT use corporate marketing clichés (avoid words like 'partnered with', 'domain expertise', 'strategic alignment', 'milestones', 'dependable execution').
4. Make every draft start with a different opening and highlight a different aspect of customer satisfaction.
5. {rating_instructions.strip()}
6. Output format: Return ONLY a valid JSON array of strings with {count + 2} review drafts, like:
["Review draft 1...", "Review draft 2...", ...]
Do not include any conversational preamble, markdown code blocks, or extra text.
"""

        last_error = None
        for attempt in range(2):
            try:
                response = self._client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.85,
                    max_tokens=1500
                )

                raw_text = response.choices[0].message.content or ""
                candidates = self._parse_json_candidates(raw_text)

                if candidates and len(candidates) > 0:
                    return candidates, "groq"
                else:
                    logger.warning("Groq response attempt %d could not be parsed. Retrying...", attempt + 1)
            except Exception as e:
                last_error = e
                logger.error("Groq API error on attempt %d: %s", attempt + 1, str(e))
                time.sleep(0.5)

        logger.warning("Groq AI generation unavailable (%s); falling back to template engine.", str(last_error or "Could not parse response"))
        return DemoTemplateProvider(is_fallback=True).generate_review_candidates(
            company_name, category, keyword, description, services, location, language, tone, length, count, target_rating
        )

def get_llm_provider() -> BaseLLMProvider:
    """Factory to instantiate the appropriate LLM provider based on config and available keys."""
    try:
        from pathlib import Path
        from dotenv import load_dotenv
        _backend_dir = Path(__file__).resolve().parent.parent
        load_dotenv(_backend_dir / ".env", override=True)
    except Exception:
        pass

    import os
    groq_api_key = os.getenv("GROQ_API_KEY", Config.GROQ_API_KEY).strip().strip('"').strip("'")
    groq_model = os.getenv("GROQ_MODEL", Config.GROQ_MODEL or "openai/gpt-oss-120b").strip()
    provider_name = os.getenv("LLM_PROVIDER", Config.LLM_PROVIDER).lower()

    if provider_name == "groq":
        if groq_api_key:
            try:
                return GroqLLMProvider(api_key=groq_api_key, model=groq_model)
            except Exception as e:
                logger.warning("Error instantiating GroqLLMProvider: %s. Using DemoTemplateProvider fallback.", str(e))
                return DemoTemplateProvider(is_fallback=True)
        else:
            logger.warning("LLM_PROVIDER is set to 'groq' but GROQ_API_KEY is missing. Using DemoTemplateProvider fallback.")
            return DemoTemplateProvider(is_fallback=True)

    return DemoTemplateProvider(is_fallback=False)
