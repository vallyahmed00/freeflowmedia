"""
Gemini AI Tool - Lead Qualification with Exponential Backoff and Cost Tracking

Handles:
- Lead intent scoring via Gemini 2.5 Pro
- Deal value estimation
- Personalized outreach email generation
- Exponential backoff retry (3 attempts)
- Cost tracking with abort threshold ($0.15/lead)
- LangSmith trace ID integration
"""

import os
import time
import json
import structlog
from typing import Optional
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()  # Ensure .env is loaded

from google import genai
from google.genai import types
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

logger = structlog.get_logger()

# Cost tracking
gemini_cost_per_1k_input_tokens = 0.00125  # Gemini 2.5 Pro pricing
gemini_cost_per_1k_output_tokens = 0.01
MAX_COST_PER_LEAD = 0.15  # USD


@dataclass
class GeminiQualificationResult:
    intent_score: str  # marketing_only, webdev_only, full_stack, ecommerce
    value_estimate: str  # <R5k, R5k-10k, >R10k
    value_estimate_zar: float  # Numeric estimate in ZAR
    outreach_email: str
    confidence: float  # 0.0-1.0
    token_usage: dict
    cost_usd: float
    langsmith_trace_id: Optional[str] = None


class GeminiLeadQualifier:
    """Handles lead qualification via Gemini AI with retry and cost tracking."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.5-pro"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model
        self.client = genai.Client(api_key=self.api_key)
        self._total_cost = 0.0

        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY not set. "
                "Set it in .env or pass api_key to GeminiLeadQualifier()"
            )

    def _calculate_cost(self, token_usage: dict) -> float:
        """Calculate API cost from token usage."""
        input_tokens = token_usage.get("prompt_token_count", 0)
        output_tokens = token_usage.get("candidates_token_count", 0)

        cost = (
            (input_tokens / 1000) * gemini_cost_per_1k_input_tokens
            + (output_tokens / 1000) * gemini_cost_per_1k_output_tokens
        )
        return cost

    def _check_cost_limit(self, cost: float) -> bool:
        """Check if adding this cost would exceed the per-lead limit."""
        return (self._total_cost + cost) <= MAX_COST_PER_LEAD

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((Exception,)),
        before_sleep=before_sleep_log(logger, "warning"),
        reraise=True,
    )
    def _call_gemini_with_retry(self, prompt: str) -> types.GenerateContentResponse:
        """Call Gemini with exponential backoff retry."""
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=1500,
            ),
        )
        return response

    def qualify_lead(self, lead_data: dict) -> GeminiQualificationResult:
        """
        Qualify a lead using Gemini AI.

        Args:
            lead_data: Dict with business_name, email, phone, service_interest, notes

        Returns:
            GeminiQualificationResult with intent, value, email, and cost info
        """
        business_name = lead_data.get("business_name", "Unknown")
        email = lead_data.get("email", "Unknown")
        phone = lead_data.get("phone", "Unknown")
        service_interest = lead_data.get("service_interest", "Unknown")
        notes = lead_data.get("notes", "No additional information")

        prompt = f"""You are a lead qualification expert for Drift Studio, a bold, results-driven digital marketing and web development agency in South Africa.

Analyze this lead and provide:
1. Intent category (choose ONE):
   - marketing_only: Only wants social media management, content creation, or ads
   - webdev_only: Only wants website design/development
   - full_stack: Wants both marketing AND web development (complete digital presence)
   - ecommerce: Wants online store, payment integration, product catalog

2. Estimated deal value in South African Rand (ZAR):
   - marketing_only: Typically R2,000-R8,000/month
   - webdev_only: Typically R5,000-R25,000 (one-time)
   - full_stack: Typically R15,000-R50,000+ (package deal)
   - ecommerce: Typically R10,000-R40,000+ (complex builds)

3. Generate a bold, personalized outreach email (under 200 words) that:
   - Opens with a punchy, attention-grabbing line
   - References their specific business and industry
   - Shows we understand their pain points
   - Explains how Drift Studio will deliver measurable results
   - Includes a strong CTA to book a discovery call
   - Tone: Confident, direct, professional, no fluff
   - Sign off: "Let's build something epic. — The Drift Studio Team"

Lead Data:
- Business Name: {business_name}
- Email: {email}
- Phone: {phone}
- Service Interest: {service_interest}
- Additional Notes: {notes}

Respond in this EXACT JSON format (no other text):
{{
  "intent": "marketing_only|webdev_only|full_stack|ecommerce",
  "value_estimate": "<R5k|R5k-10k|>R10k",
  "value_estimate_zar": 5000,
  "confidence": 0.85,
  "outreach_email": "Subject: [subject line]\\n\\n[email body]"
}}"""

        try:
            response = self._call_gemini_with_retry(prompt)

            # Extract JSON from response
            response_text = response.text.strip()

            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text.rsplit("\n", 1)[0]
            response_text = response_text.strip()

            # Remove potential ```json prefix
            if response_text.startswith("```json"):
                response_text = response_text[7:].strip()

            result = json.loads(response_text)

            # Calculate cost
            token_usage = {
                "prompt_token_count": getattr(
                    response.usage_metadata, "prompt_token_count", 0
                ),
                "candidates_token_count": getattr(
                    response.usage_metadata, "candidates_token_count", 0
                ),
            }
            cost = self._calculate_cost(token_usage)

            # Check cost limit
            if not self._check_cost_limit(cost):
                logger.warning(
                    "cost_limit_exceeded",
                    cost=cost,
                    total_cost=self._total_cost,
                    limit=MAX_COST_PER_LEAD,
                )
                raise ValueError(
                    f"Gemini cost would exceed ${MAX_COST_PER_LEAD}/lead limit. "
                    f"This call would cost ${cost:.4f}, total so far: ${self._total_cost:.4f}"
                )

            self._total_cost += cost

            # Get LangSmith trace ID if available
            langsmith_trace_id = None
            try:
                from langsmith import traceable

                # Try to get current run ID from LangSmith
                langsmith_trace_id = os.getenv("LANGCHAIN_TRACE_ID")
            except Exception:
                pass

            logger.info(
                "gemini_qualification_success",
                intent=result.get("intent"),
                value_estimate=result.get("value_estimate"),
                cost_usd=cost,
                langsmith_trace_id=langsmith_trace_id,
            )

            return GeminiQualificationResult(
                intent_score=result.get("intent", "marketing_only"),
                value_estimate=result.get("value_estimate", "<R5k"),
                value_estimate_zar=result.get("value_estimate_zar", 3000),
                outreach_email=result.get("outreach_email", ""),
                confidence=result.get("confidence", 0.7),
                token_usage=token_usage,
                cost_usd=cost,
                langsmith_trace_id=langsmith_trace_id,
            )

        except json.JSONDecodeError as e:
            logger.error("gemini_json_parse_error", error=str(e), response=response_text)
            raise ValueError(f"Failed to parse Gemini response as JSON: {e}") from e
        except Exception as e:
            logger.error("gemini_qualification_error", error=str(e))
            raise

    def get_total_cost(self) -> float:
        """Get total Gemini API cost for this session."""
        return self._total_cost

    def reset_cost(self):
        """Reset cost tracker (use carefully, typically for testing)."""
        self._total_cost = 0.0
