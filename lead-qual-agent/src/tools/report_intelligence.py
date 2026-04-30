"""
Report Intelligence Tool - Anomaly Detection and AI Insights

Handles:
- Statistical anomaly detection against baselines
- AI-powered insight generation via Gemini
- Branded report narrative creation
"""

import os
import structlog
import json
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from src.tools.analytics import CombinedMetrics, PlatformMetrics

logger = structlog.get_logger()

# Cost tracking for reports
MAX_COST_PER_REPORT = 0.50  # USD
gemini_cost_per_1k_input = 0.00125
gemini_cost_per_1k_output = 0.01


class ReportIntelligence:
    """Detects anomalies and generates AI-powered insights for monthly reports."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.5-pro"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model
        self.client = genai.Client(api_key=self.api_key)
        self._session_cost = 0.0

    def detect_anomalies(
        self,
        current_metrics: CombinedMetrics,
        baseline_metrics: Optional[CombinedMetrics] = None,
        threshold_pct: float = 20.0,
    ) -> list:
        """
        Detect anomalies by comparing current metrics to baseline.

        Args:
            current_metrics: Current period metrics
            baseline_metrics: Previous period metrics for comparison
            threshold_pct: Percentage change threshold to flag as anomaly

        Returns:
            List of anomaly dicts with metric, change_pct, severity, description
        """
        anomalies = []

        if baseline_metrics is None:
            logger.info("no_baseline_provided", note="Using default thresholds")
            return anomalies

        comparisons = [
            ("total_sessions", current_metrics.total_sessions, baseline_metrics.total_sessions, "Sessions"),
            ("total_users", current_metrics.total_users, baseline_metrics.total_users, "Users"),
            ("total_conversions", current_metrics.total_conversions, baseline_metrics.total_conversions, "Conversions"),
            ("total_spend", current_metrics.total_spend, baseline_metrics.total_spend, "Ad Spend"),
            ("total_revenue", current_metrics.total_revenue, baseline_metrics.total_revenue, "Revenue"),
            ("roas", current_metrics.roas, baseline_metrics.roas, "ROAS"),
            ("avg_bounce_rate", current_metrics.avg_bounce_rate, baseline_metrics.avg_bounce_rate, "Bounce Rate"),
            ("avg_ctr", current_metrics.avg_ctr, baseline_metrics.avg_ctr, "CTR"),
        ]

        for key, current, baseline, label in comparisons:
            if baseline == 0:
                continue

            change_pct = ((current - baseline) / baseline) * 100

            if abs(change_pct) >= threshold_pct:
                severity = "critical" if abs(change_pct) >= 50 else "warning"

                if change_pct > 0:
                    direction = "increased"
                    sentiment = "positive" if key in ["total_revenue", "total_conversions", "roas"] else "negative"
                else:
                    direction = "decreased"
                    sentiment = "negative" if key in ["total_revenue", "total_conversions", "roas"] else "positive"

                anomalies.append({
                    "metric": key,
                    "label": label,
                    "current_value": current,
                    "baseline_value": baseline,
                    "change_pct": round(change_pct, 2),
                    "direction": direction,
                    "severity": severity,
                    "sentiment": sentiment,
                    "description": f"{label} {direction} by {abs(change_pct):.1f}% ({baseline} → {current})",
                })

        # Check platform-level anomalies
        for platform, data in current_metrics.by_platform.items():
            baseline_platform = baseline_metrics.by_platform.get(platform, {})
            if not baseline_platform:
                continue

            # Platform-specific comparisons would go here
            # For now, we focus on aggregate

        logger.info(
            "anomaly_detection_complete",
            anomalies_found=len(anomalies),
            critical=sum(1 for a in anomalies if a["severity"] == "critical"),
            warnings=sum(1 for a in anomalies if a["severity"] == "warning"),
        )

        return anomalies

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((Exception,)),
        reraise=True,
    )
    def generate_insights(
        self,
        metrics: CombinedMetrics,
        anomalies: list,
        client_industry: str = "General",
        brand_voice: str = "Command the Digital Space",
    ) -> str:
        """
        Generate AI-powered insights and narrative for the monthly report.

        Args:
            metrics: Combined metrics data
            anomalies: List of detected anomalies
            client_industry: Client's industry for context
            brand_voice: Brand voice style (default: FreeFlow's bold voice)

        Returns:
            HTML-formatted insights section for the report
        """
        # Calculate cost before generation
        estimated_tokens = 2000  # Rough estimate
        estimated_cost = (estimated_tokens / 1000) * gemini_cost_per_1k_output
        if self._session_cost + estimated_cost > MAX_COST_PER_REPORT:
            raise ValueError(
                f"Gemini cost would exceed ${MAX_COST_PER_REPORT}/report limit"
            )

        # Build context for Gemini
        anomalies_text = "\n".join(
            [f"- {a['description']} (Severity: {a['severity']})" for a in anomalies]
        ) if anomalies else "No significant anomalies detected."

        prompt = f"""You are a senior digital marketing analyst at Drift Studio, creating a monthly performance report for a client.

Brand Voice: "{brand_voice}" - Bold, confident, results-driven, no fluff. We don't just report numbers; we tell the story of growth and domination.

Client Industry: {client_industry}

MONTHLY METRICS:
- Total Sessions: {metrics.total_sessions:,}
- Total Users: {metrics.total_users:,}
- Total Pageviews: {metrics.total_pageviews:,}
- Total Conversions: {metrics.total_conversions:,}
- Total Ad Spend: R{metrics.total_spend:,.2f}
- Total Revenue: R{metrics.total_revenue:,.2f}
- ROAS: {metrics.roas:.2f}x
- Avg Bounce Rate: {metrics.avg_bounce_rate:.1%}
- Avg CTR: {metrics.avg_ctr:.1%}

ANOMALIES DETECTED:
{anomalies_text}

PLATFORM BREAKDOWN:
{json.dumps(metrics.by_platform, indent=2)}

Generate a compelling monthly report section with:

1. **Executive Summary** (2-3 paragraphs)
   - Bold opening statement about overall performance
   - Key wins and achievements
   - Direct, confident tone

2. **Key Highlights** (bullet points)
   - Top 3-5 performance highlights
   - Use specific numbers and percentages
   - Frame everything positively where possible

3. **Areas of Opportunity** (bullet points)
   - 2-3 areas for improvement
   - Frame as opportunities, not failures
   - Include actionable next steps

4. **Next Month's Focus** (bullet points)
   - 3 strategic priorities
   - Bold, actionable language

5. **ROI Statement** (1 paragraph)
   - Clear statement on return on investment
   - Confident closing that reinforces FreeFlow's value

Format as HTML with proper headings, paragraphs, and lists.
Keep total length under 800 words.
Sign off with: "— The Drift Studio Team"
"""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=2000,
                ),
            )

            insights_html = response.text.strip()

            # Calculate actual cost
            token_usage = {
                "input": getattr(response.usage_metadata, "prompt_token_count", 0),
                "output": getattr(response.usage_metadata, "candidates_token_count", 0),
            }
            cost = (
                (token_usage["input"] / 1000) * gemini_cost_per_1k_input
                + (token_usage["output"] / 1000) * gemini_cost_per_1k_output
            )
            self._session_cost += cost

            logger.info(
                "insights_generated",
                cost_usd=cost,
                total_session_cost=self._session_cost,
                token_usage=token_usage,
            )

            return insights_html

        except Exception as e:
            logger.error("insights_generation_failed", error=str(e))
            raise

    def get_session_cost(self) -> float:
        """Get total Gemini cost for this session."""
        return self._session_cost

    def reset_cost(self):
        """Reset cost tracker."""
        self._session_cost = 0.0
