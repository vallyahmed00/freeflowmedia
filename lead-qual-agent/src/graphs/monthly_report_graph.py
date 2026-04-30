"""
Monthly Report Graph - LangGraph Workflow for Drift Studio

Generates comprehensive monthly performance reports:
1. Fetch analytics from GA4, Meta, Google Ads, TikTok
2. Detect anomalies against baseline
3. Generate AI-powered insights (Gemini)
4. Validate output quality
5. Create branded PDF
6. Send via email/WhatsApp (with human gate for high-impact changes)
7. Log to Firestore

Human Gate: Pauses if any KPI changed >50% OR cost >$0.50/report
Cost Cap: Aborts if Gemini spend exceeds $0.50/report
"""

import os
import structlog
import time
from typing import TypedDict, Optional, Annotated
from datetime import datetime
from dataclasses import dataclass, field

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from src.tools.analytics import AnalyticsPuller, CombinedMetrics
from src.tools.report_intelligence import ReportIntelligence
from src.tools.report_pdf import PDFGenerator
from src.tools.report_sender import ReportSender
from src.tools.firebase import FirebaseLeadManager

logger = structlog.get_logger()

# Cost cap per report
MAX_COST_PER_REPORT = 0.50  # USD

# Human gate thresholds
HUMAN_GATE_KPI_CHANGE_PCT = 50.0  # Pause if any KPI changed by more than 50%


# ==================== State Definition ====================


@dataclass
class ReportStateData:
    """Mutable state for the monthly report workflow."""

    # Input
    client_id: str = ""
    client_name: str = ""
    client_email: str = ""
    client_phone: Optional[str] = None
    client_industry: str = "General"
    brand_voice: str = "Command the Digital Space"
    date_range: dict = field(default_factory=lambda: {"start": "", "end": ""})
    platforms: list = field(default_factory=lambda: ["ga4", "meta", "google_ads", "tiktok"])

    # Processing results
    current_metrics: Optional[CombinedMetrics] = None
    baseline_metrics: Optional[CombinedMetrics] = None
    anomalies: list = field(default_factory=list)
    insights_html: str = ""
    pdf_link: str = ""
    delivery_status: dict = field(default_factory=dict)

    # Status and tracking
    status: str = "pending"  # pending, processing, awaiting_approval, approved, sent, failed
    cost_tracker: float = 0.0
    requires_approval: bool = False
    approval_reason: str = ""
    error: Optional[str] = None
    processing_time_ms: float = 0.0
    firestore_doc_id: Optional[str] = None


class ReportState(TypedDict):
    """LangGraph-compatible state wrapper."""

    data: ReportStateData


# ==================== Node Functions ====================


def node_fetch_data(state: ReportState) -> dict:
    """Node 1: Pull analytics data from all platforms."""
    start_time = time.time()
    data = state["data"]

    logger.info(
        "node_fetch_data_started",
        client_id=data.client_id,
        platforms=data.platforms,
        date_range=data.date_range,
    )

    try:
        puller = AnalyticsPuller()

        # Pull current period metrics
        current_metrics = puller.pull_analytics(
            client_id=data.client_id,
            platforms=data.platforms,
            date_range=data.date_range,
        )

        # Pull baseline (previous period) for comparison
        baseline_metrics = puller.get_baseline(
            client_id=data.client_id,
            platforms=data.platforms,
            baseline_days=7,
        )

        data.current_metrics = current_metrics
        data.baseline_metrics = baseline_metrics
        data.status = "processing"

        processing_time_ms = (time.time() - start_time) * 1000

        logger.info(
            "node_fetch_data_completed",
            total_sessions=current_metrics.total_sessions,
            total_conversions=current_metrics.total_conversions,
            processing_time_ms=processing_time_ms,
        )

        return {"data": data}

    except Exception as e:
        logger.error("node_fetch_data_failed", error=str(e))
        data.error = f"Failed to fetch analytics: {str(e)}"
        data.status = "failed"
        return {"data": data}


def node_analyze(state: ReportState) -> dict:
    """Node 2: Detect anomalies in metrics."""
    data = state["data"]

    if data.error:
        return {"data": data}

    logger.info("node_analyze_started", client_id=data.client_id)

    try:
        intelligence = ReportIntelligence()

        anomalies = intelligence.detect_anomalies(
            current_metrics=data.current_metrics,
            baseline_metrics=data.baseline_metrics,
            threshold_pct=20.0,
        )

        data.anomalies = anomalies

        # Check if any anomaly exceeds human gate threshold
        critical_changes = [
            a for a in anomalies
            if abs(a["change_pct"]) >= HUMAN_GATE_KPI_CHANGE_PCT
        ]

        if critical_changes:
            data.requires_approval = True
            data.approval_reason = (
                f"{len(critical_changes)} KPI(s) changed by more than "
                f"{HUMAN_GATE_KPI_CHANGE_PCT}%: "
                + ", ".join(a["description"] for a in critical_changes)
            )
            data.status = "awaiting_approval"

            logger.warning(
                "human_gate_triggered",
                reason=data.approval_reason,
                client_id=data.client_id,
            )

        logger.info(
            "node_analyze_completed",
            anomalies_found=len(anomalies),
            requires_approval=data.requires_approval,
        )

        return {"data": data}

    except Exception as e:
        logger.error("node_analyze_failed", error=str(e))
        data.error = f"Anomaly detection failed: {str(e)}"
        data.status = "failed"
        return {"data": data}


def node_generate(state: ReportState) -> dict:
    """Node 3: Generate AI-powered insights."""
    data = state["data"]

    if data.error or data.requires_approval:
        return {"data": data}

    logger.info("node_generate_started", client_id=data.client_id)

    try:
        intelligence = ReportIntelligence()

        insights_html = intelligence.generate_insights(
            metrics=data.current_metrics,
            anomalies=data.anomalies,
            client_industry=data.client_industry,
            brand_voice=data.brand_voice,
        )

        data.insights_html = insights_html
        data.cost_tracker += intelligence.get_session_cost()

        # Check cost cap
        if data.cost_tracker > MAX_COST_PER_REPORT:
            data.error = f"Gemini cost exceeded ${MAX_COST_PER_REPORT}/report limit (current: ${data.cost_tracker:.4f})"
            data.status = "failed"
            logger.error("cost_cap_exceeded", cost=data.cost_tracker)
            return {"data": data}

        logger.info(
            "node_generate_completed",
            cost_usd=intelligence.get_session_cost(),
            total_cost=data.cost_tracker,
        )

        return {"data": data}

    except Exception as e:
        logger.error("node_generate_failed", error=str(e))
        data.error = f"Insights generation failed: {str(e)}"
        data.status = "failed"
        return {"data": data}


def node_validate(state: ReportState) -> dict:
    """Node 4: Validate output quality before proceeding."""
    data = state["data"]

    if data.error:
        return {"data": data}

    logger.info("node_validate_started", client_id=data.client_id)

    # Validation checks
    validations = {
        "has_insights": bool(data.insights_html),
        "has_metrics": data.current_metrics is not None,
        "insights_length": len(data.insights_html) > 100,
        "cost_within_limit": data.cost_tracker <= MAX_COST_PER_REPORT,
    }

    all_passed = all(validations.values())

    if not all_passed:
        failed = [k for k, v in validations.items() if not v]
        data.error = f"Validation failed: {', '.join(failed)}"
        data.status = "failed"
        logger.error("validation_failed", failed_checks=failed)
        return {"data": data}

    data.status = "validated"

    logger.info(
        "node_validate_completed",
        validations=validations,
    )

    return {"data": data}


def node_create_pdf(state: ReportState) -> dict:
    """Node 5: Create branded PDF report."""
    data = state["data"]

    if data.error:
        return {"data": data}

    logger.info("node_create_pdf_started", client_id=data.client_id)

    try:
        generator = PDFGenerator()

        metrics_dict = {
            "total_sessions": data.current_metrics.total_sessions,
            "total_conversions": data.current_metrics.total_conversions,
            "total_revenue": data.current_metrics.total_revenue,
            "roas": data.current_metrics.roas,
        } if data.current_metrics else None

        pdf_path = generator.create_branded_pdf(
            insights_html=data.insights_html,
            client_name=data.client_name,
            date_range=data.date_range,
            metrics=metrics_dict,
        )

        data.pdf_link = pdf_path

        logger.info(
            "node_create_pdf_completed",
            pdf_path=pdf_path,
        )

        return {"data": data}

    except Exception as e:
        logger.error("node_create_pdf_failed", error=str(e))
        data.error = f"PDF generation failed: {str(e)}"
        data.status = "failed"
        return {"data": data}


def node_send(state: ReportState) -> dict:
    """Node 6: Send report via email/WhatsApp."""
    data = state["data"]

    if data.error:
        return {"data": data}

    logger.info("node_send_started", client_id=data.client_id)

    try:
        sender = ReportSender()

        delivery_status = sender.send_multichannel(
            client_email=data.client_email,
            client_phone=data.client_phone,
            pdf_link=data.pdf_link,
            client_name=data.client_name,
            date_range=data.date_range,
        )

        data.delivery_status = delivery_status

        # Check if at least one channel succeeded
        any_sent = any(
            ch.get("sent") for ch in delivery_status.values()
        )

        if any_sent:
            data.status = "sent"
        else:
            data.error = "All delivery channels failed"
            data.status = "failed"

        logger.info(
            "node_send_completed",
            delivery_status=delivery_status,
            final_status=data.status,
        )

        return {"data": data}

    except Exception as e:
        logger.error("node_send_failed", error=str(e))
        data.error = f"Report delivery failed: {str(e)}"
        data.status = "failed"
        return {"data": data}


def node_log(state: ReportState) -> dict:
    """Node 7: Log report generation to Firestore."""
    data = state["data"]

    logger.info("node_log_started", client_id=data.client_id, status=data.status)

    try:
        firebase_mgr = FirebaseLeadManager()

        # Save report record
        doc_data = {
            "client_id": data.client_id,
            "client_name": data.client_name,
            "client_email": data.client_email,
            "client_phone": data.client_phone,
            "date_range": data.date_range,
            "status": data.status,
            "cost_usd": data.cost_tracker,
            "anomalies_count": len(data.anomalies),
            "requires_approval": data.requires_approval,
            "approval_reason": data.approval_reason,
            "pdf_link": data.pdf_link,
            "delivery_status": data.delivery_status,
            "error": data.error,
            "processing_time_ms": data.processing_time_ms,
            "created_at": datetime.utcnow(),
        }

        doc_id = f"report_{data.client_id}_{data.date_range.get('start', 'unknown')}"
        doc_id = doc_id.replace("/", "_")

        firebase_mgr.leads_collection.document(doc_id).set(doc_data)
        data.firestore_doc_id = doc_id

        logger.info(
            "node_log_completed",
            firestore_doc_id=doc_id,
        )

        return {"data": data}

    except Exception as e:
        logger.error("node_log_failed", error=str(e))
        # Don't fail the whole workflow if logging fails
        return {"data": data}


# ==================== Graph Builder ====================


def build_monthly_report_graph() -> StateGraph:
    """
    Build the monthly report generation LangGraph workflow.

    Workflow:
    fetch_data → analyze → generate → validate → create_pdf → send → log → END
    """
    graph_builder = StateGraph(ReportState)

    # Add nodes
    graph_builder.add_node("fetch_data", node_fetch_data)
    graph_builder.add_node("analyze", node_analyze)
    graph_builder.add_node("generate", node_generate)
    graph_builder.add_node("validate", node_validate)
    graph_builder.add_node("create_pdf", node_create_pdf)
    graph_builder.add_node("send", node_send)
    graph_builder.add_node("log", node_log)

    # Define linear flow
    graph_builder.set_entry_point("fetch_data")
    graph_builder.add_edge("fetch_data", "analyze")
    graph_builder.add_edge("analyze", "generate")
    graph_builder.add_edge("generate", "validate")
    graph_builder.add_edge("validate", "create_pdf")
    graph_builder.add_edge("create_pdf", "send")
    graph_builder.add_edge("send", "log")
    graph_builder.add_edge("log", END)

    return graph_builder


# ==================== Compiled Graph ====================

memory = MemorySaver()
monthly_report_graph = build_monthly_report_graph().compile(checkpointer=memory)
monthly_report_graph.name = "FreeFlow-Monthly-Report-Generator"


# ==================== Invocation Helper ====================


async def invoke_monthly_report(
    client_id: str,
    client_name: str,
    client_email: str,
    client_phone: Optional[str] = None,
    client_industry: str = "General",
    date_range: Optional[dict] = None,
    platforms: Optional[list] = None,
) -> dict:
    """
    Invoke the monthly report generation workflow.

    Args:
        client_id: Unique client identifier
        client_name: Client business name
        client_email: Client email for delivery
        client_phone: Client phone for WhatsApp (optional)
        client_industry: Client's industry
        date_range: {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
        platforms: List of platforms to pull from

    Returns:
        Final state dict with report results
    """
    import uuid

    start_time = time.time()

    if date_range is None:
        end_date = datetime.now()
        from datetime import timedelta
        start_date = end_date - timedelta(days=30)
        date_range = {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d"),
        }

    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_data = ReportStateData(
        client_id=client_id,
        client_name=client_name,
        client_email=client_email,
        client_phone=client_phone,
        client_industry=client_industry,
        date_range=date_range,
        platforms=platforms or ["ga4", "meta", "google_ads", "tiktok"],
    )

    initial_state = {"data": initial_data}

    final_state = await monthly_report_graph.ainvoke(initial_state, config=config)

    final_state["data"].processing_time_ms = (time.time() - start_time) * 1000

    logger.info(
        "monthly_report_complete",
        client_id=client_id,
        status=final_state["data"].status,
        cost_usd=final_state["data"].cost_tracker,
        processing_time_ms=final_state["data"].processing_time_ms,
        requires_approval=final_state["data"].requires_approval,
    )

    return final_state["data"]


def invoke_monthly_report_sync(
    client_id: str,
    client_name: str,
    client_email: str,
    **kwargs
) -> ReportStateData:
    """Synchronous version for non-async contexts."""
    import asyncio
    return asyncio.run(invoke_monthly_report(client_id, client_name, client_email, **kwargs))
