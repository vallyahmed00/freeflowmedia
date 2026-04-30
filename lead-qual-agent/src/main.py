"""
Drift Studio - Lead Qualification Agent API

FastAPI application exposing the /freeflow-lead webhook endpoint.
Integrates with LangGraph workflow, Gemini AI, Firebase, and WhatsApp.
"""

import os
import structlog
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr

from src.graphs.lead_qual_graph import invoke_lead_qualification

# Configure structured logging
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(os.getenv("LOG_LEVEL", "INFO")),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=False,
)

logger = structlog.get_logger()


# ==================== Pydantic Models ====================


class LeadRequest(BaseModel):
    """Lead qualification request schema."""

    business_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        examples=["Joe's Coffee Shop"],
        description="Name of the business",
    )
    email: EmailStr = Field(
        ...,
        examples=["joe@coffeeshop.co.za"],
        description="Contact email address",
    )
    phone: str = Field(
        ...,
        min_length=7,
        max_length=20,
        examples=["+27123456789"],
        description="Contact phone number",
    )
    service_interest: str = Field(
        ...,
        min_length=1,
        max_length=500,
        examples=["social_media_management,website_redesign"],
        description="Services interested in (comma-separated)",
    )
    notes: Optional[str] = Field(
        default="",
        max_length=2000,
        examples=["Need help with Instagram growth and new website"],
        description="Additional notes or requirements",
    )

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "business_name": "Joe's Coffee Shop",
                    "email": "joe@coffeeshop.co.za",
                    "phone": "+27123456789",
                    "service_interest": "social_media_management,website_redesign",
                    "notes": "Need help with Instagram growth and new website",
                }
            ]
        }


class QualificationResult(BaseModel):
    """Lead qualification result schema."""

    business_name: str
    email: str
    intent: str = Field(
        examples=["full_stack"],
        description="Lead intent category",
    )
    value_estimate: str = Field(
        examples=[">R10k"],
        description="Estimated deal value in ZAR",
    )
    value_estimate_zar: float = Field(
        examples=[15000.0],
        description="Numeric value estimate in ZAR",
    )
    confidence: float = Field(
        examples=[0.85],
        description="Confidence score (0.0-1.0)",
    )
    outreach_email: str = Field(
        description="Generated personalized outreach email",
    )
    requires_approval: bool = Field(
        description="Whether lead requires human approval",
    )
    email_sent: bool = Field(
        description="Whether auto-email was sent",
    )
    firestore_doc_id: Optional[str] = Field(
        default=None,
        description="Firestore document ID",
    )
    whatsapp_message_sid: Optional[str] = Field(
        default=None,
        description="WhatsApp message SID (if sent)",
    )
    processing_time_ms: float = Field(
        description="Total processing time in milliseconds",
    )
    langsmith_trace_id: Optional[str] = Field(
        default=None,
        description="LangSmith trace ID for observability",
    )


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ==================== Lifespan Events ====================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(
        "lead_qual_agent_starting",
        version="1.0.0",
        environment=os.getenv("ENVIRONMENT", "development"),
    )

    # Validate required environment variables
    required_vars = ["GEMINI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        logger.warning(
            "missing_env_vars",
            missing_vars=missing_vars,
            note="Some features may not work correctly",
        )

    yield

    # Shutdown
    logger.info("lead_qual_agent_shutting_down")


# ==================== FastAPI Application ====================

app = FastAPI(
    title="Drift Studio - Lead Qualification Agent",
    description=(
        "AI-powered lead qualification system using LangGraph, Gemini AI, "
        "Firebase Firestore, and WhatsApp notifications."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Endpoints ====================


@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Serve the beautiful Lead Qualification Dashboard."""
    html_file = Path(__file__).parent.parent / "dashboard.html"
    return HTMLResponse(content=html_file.read_text())


@app.post(
    "/freeflow-lead",
    response_model=QualificationResult,
    responses={
        400: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Qualify a new lead",
    description=(
        "Accepts lead data, qualifies it using Gemini AI, "
        "routes based on value estimate, and returns qualification results."
    ),
)
async def qualify_lead(lead: LeadRequest):
    """
    Qualify a new lead.

    Workflow:
    1. Accept lead data via POST
    2. Qualify with Gemini AI (intent, value, email)
    3. Route based on value:
       - <R5k: Auto-send email + log to Firestore
       - >R10k: Flag for human approval + WhatsApp alert
    4. Return qualification result
    """
    logger.info(
        "lead_qualification_request_received",
        business_name=lead.business_name,
        email=lead.email,
        service_interest=lead.service_interest,
    )

    try:
        # Prepare lead data
        lead_data = {
            "business_name": lead.business_name,
            "email": lead.email,
            "phone": lead.phone,
            "service_interest": lead.service_interest,
            "notes": lead.notes or "",
        }

        # Invoke qualification graph
        result = await invoke_lead_qualification(lead_data)

        # Check for errors
        if result.get("error"):
            logger.error("lead_qualification_failed", error=result["error"])
            raise HTTPException(
                status_code=500,
                detail=f"Lead qualification failed: {result['error']}",
            )

        # Extract qualification result
        qual_result = result.get("qualification_result")
        if not qual_result:
            raise HTTPException(
                status_code=500,
                detail="No qualification result returned from graph",
            )

        # Build response
        response = QualificationResult(
            business_name=lead.business_name,
            email=lead.email,
            intent=qual_result.intent_score,
            value_estimate=qual_result.value_estimate,
            value_estimate_zar=qual_result.value_estimate_zar,
            confidence=qual_result.confidence,
            outreach_email=qual_result.outreach_email,
            requires_approval=result.get("requires_approval", False),
            email_sent=result.get("email_sent", False),
            firestore_doc_id=result.get("firestore_doc_id"),
            whatsapp_message_sid=result.get("whatsapp_message_sid"),
            processing_time_ms=result.get("processing_time_ms", 0),
            langsmith_trace_id=qual_result.langsmith_trace_id,
        )

        logger.info(
            "lead_qualification_response_sent",
            business_name=lead.business_name,
            intent=qual_result.intent_score,
            value_estimate=qual_result.value_estimate,
            requires_approval=result.get("requires_approval", False),
            processing_time_ms=result.get("processing_time_ms", 0),
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error("lead_qualification_unexpected_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}",
        )


# ==================== Monthly Report Endpoints ====================


class MonthlyReportRequest(BaseModel):
    """Monthly report generation request schema."""

    client_id: str = Field(..., min_length=1, examples=["client_123"])
    client_name: str = Field(..., min_length=1, examples=["Joes Coffee Shop"])
    client_email: EmailStr = Field(..., examples=["joe@coffee.co.za"])
    client_phone: Optional[str] = Field(default=None, examples=["+27123456789"])
    client_industry: str = Field(default="General", examples=["Food & Beverage"])
    date_range: Optional[dict] = Field(
        default=None,
        examples=[{"start": "2026-03-01", "end": "2026-03-31"}],
    )
    platforms: Optional[list] = Field(
        default=None,
        examples=[["ga4", "meta", "google_ads", "tiktok"]],
    )


class MonthlyReportResult(BaseModel):
    """Monthly report generation result schema."""

    client_id: str
    client_name: str
    status: str
    pdf_link: Optional[str] = None
    requires_approval: bool = False
    approval_reason: Optional[str] = None
    anomalies_count: int = 0
    cost_usd: float = 0.0
    delivery_status: dict = {}
    firestore_doc_id: Optional[str] = None
    processing_time_ms: float = 0.0
    error: Optional[str] = None

@app.post(
    "/generate-monthly-report",
    response_model=MonthlyReportResult,
    responses={
        400: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Generate a monthly performance report",
    description=(
        "Generates a comprehensive monthly report with AI insights, "
        "anomaly detection, branded PDF, and multichannel delivery."
    ),
)
async def generate_monthly_report(report_req: MonthlyReportRequest):
    """
    Generate a monthly performance report.

    Workflow:
    1. Fetch analytics from GA4, Meta, Google Ads, TikTok
    2. Detect anomalies against baseline
    3. Generate AI-powered insights (Gemini)
    4. Validate output quality
    5. Create branded PDF
    6. Send via email/WhatsApp
    7. Log to Firestore

    Human Gate: Pauses if any KPI changed >50% OR cost >$0.50/report
    """
    logger.info(
        "monthly_report_request_received",
        client_id=report_req.client_id,
        client_name=report_req.client_name,
    )

    try:
        from src.graphs.monthly_report_graph import invoke_monthly_report

        result = await invoke_monthly_report(
            client_id=report_req.client_id,
            client_name=report_req.client_name,
            client_email=report_req.client_email,
            client_phone=report_req.client_phone,
            client_industry=report_req.client_industry,
            date_range=report_req.date_range,
            platforms=report_req.platforms,
        )

        if result.error:
            logger.error("monthly_report_failed", error=result.error)
            raise HTTPException(
                status_code=500,
                detail=f"Report generation failed: {result.error}",
            )

        response = MonthlyReportResult(
            client_id=result.client_id,
            client_name=result.client_name,
            status=result.status,
            pdf_link=result.pdf_link,
            requires_approval=result.requires_approval,
            approval_reason=result.approval_reason,
            anomalies_count=len(result.anomalies),
            cost_usd=result.cost_tracker,
            delivery_status=result.delivery_status,
            firestore_doc_id=result.firestore_doc_id,
            processing_time_ms=result.processing_time_ms,
            error=result.error,
        )

        logger.info(
            "monthly_report_response_sent",
            client_id=report_req.client_id,
            status=result.status,
            cost_usd=result.cost_tracker,
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error("monthly_report_unexpected_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}",
        )


@app.get(
    "/health",
    summary="Health check",
    description="Check if the service is running and dependencies are accessible.",
)
async def health_check():
    """Health check endpoint."""
    health = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "dependencies": {
            "gemini_api": "configured" if os.getenv("GEMINI_API_KEY") else "missing",
            "firebase": "configured" if os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH") else "using_default",
            "twilio": "configured" if os.getenv("TWILIO_ACCOUNT_SID") else "missing",
            "langsmith": "configured" if os.getenv("LANGCHAIN_API_KEY") else "missing",
        },
    }

    # Check if any critical dependency is missing
    if health["dependencies"]["gemini_api"] == "missing":
        health["status"] = "degraded"

    return health


@app.get(
    "/",
    summary="API information",
    description="Get information about the Lead Qualification Agent API.",
)
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Drift Studio - Lead Qualification Agent",
        "version": "1.0.0",
        "description": "AI-powered lead qualification with Gemini AI, Firebase, and WhatsApp",
        "docs": "/docs",
        "endpoints": {
            "POST /freeflow-lead": "Qualify a new lead",
            "GET /health": "Health check",
            "GET /": "API information",
        },
    }


# ==================== Main (Development Server) ====================


def main():
    """Run the FastAPI development server."""
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("RELOAD", "true").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )


if __name__ == "__main__":
    main()
