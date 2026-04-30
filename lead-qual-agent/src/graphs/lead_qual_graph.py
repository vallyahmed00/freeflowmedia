"""
Lead Qualification Graph - LangGraph Workflow

Defines the complete lead qualification workflow:
1. Receive lead data
2. Qualify with Gemini AI (intent scoring, value estimation, email generation)
3. Route based on value:
   - <R5k: Auto-send email + log to Firestore
   - R5k-R10k: Log to Firestore + notify team
   - >R10k: Flag for human approval + WhatsApp alert
4. Return qualification result
"""

import os
import structlog
from typing import TypedDict, Annotated, Optional
from datetime import datetime

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from src.tools.gemini import GeminiLeadQualifier, GeminiQualificationResult
from src.tools.firebase import FirebaseLeadManager
from src.tools.whatsapp import WhatsAppNotifier

logger = structlog.get_logger()

# ==================== State Definition ====================


class LeadQualificationState(TypedDict):
    """State passed through all nodes in the graph."""

    # Input
    business_name: str
    email: str
    phone: str
    service_interest: str
    notes: str

    # Processing results
    qualification_result: Optional[GeminiQualificationResult]
    firestore_doc_id: Optional[str]
    whatsapp_message_sid: Optional[str]
    email_sent: bool
    requires_approval: bool

    # Metadata
    error: Optional[str]
    processing_time_ms: Optional[float]
    langsmith_trace_id: Optional[str]


# ==================== Node Functions ====================


def node_qualify_lead(state: LeadQualificationState) -> dict:
    """
    Node: Qualify lead using Gemini AI.

    Returns intent score, value estimate, and personalized outreach email.
    """
    import time

    start_time = time.time()

    logger.info(
        "node_qualify_lead_started",
        business_name=state["business_name"],
        email=state["email"],
    )

    try:
        qualifier = GeminiLeadQualifier()

        lead_data = {
            "business_name": state["business_name"],
            "email": state["email"],
            "phone": state["phone"],
            "service_interest": state["service_interest"],
            "notes": state["notes"],
        }

        result = qualifier.qualify_lead(lead_data)

        processing_time_ms = (time.time() - start_time) * 1000

        logger.info(
            "node_qualify_lead_completed",
            intent=result.intent_score,
            value_estimate=result.value_estimate,
            cost_usd=result.cost_usd,
            processing_time_ms=processing_time_ms,
        )

        return {
            "qualification_result": result,
            "langsmith_trace_id": result.langsmith_trace_id,
        }

    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "node_qualify_lead_failed",
            error=str(e),
            processing_time_ms=processing_time_ms,
        )
        return {"error": str(e)}


def node_route_lead(state: LeadQualificationState) -> dict:
    """
    Node: Determine routing based on value estimate.

    Routes:
    - <R5k: Auto-send email
    - R5k-10k: Log and notify team
    - >R10k: Flag for approval + WhatsApp alert
    """
    if state.get("error"):
        return {"requires_approval": False, "email_sent": False}

    qual_result = state["qualification_result"]
    if not qual_result:
        return {"error": "No qualification result available"}

    value_zar = qual_result.value_estimate_zar

    # Determine routing
    requires_approval = value_zar > 10000
    email_sent = value_zar <= 5000  # Auto-send for low-value leads

    logger.info(
        "node_route_lead",
        value_zar=value_zar,
        value_estimate=qual_result.value_estimate,
        requires_approval=requires_approval,
        email_sent=email_sent,
    )

    return {
        "requires_approval": requires_approval,
        "email_sent": email_sent,
    }


def node_save_to_firestore(state: LeadQualificationState) -> dict:
    """
    Node: Save qualified lead to Firestore.
    """
    if state.get("error"):
        logger.warning("node_save_to_firestore_skipped", reason="previous_error")
        return {}

    try:
        firebase_mgr = FirebaseLeadManager()

        lead_data = {
            "business_name": state["business_name"],
            "email": state["email"],
            "phone": state["phone"],
            "service_interest": state["service_interest"],
            "notes": state["notes"],
        }

        doc_id = firebase_mgr.save_qualified_lead(
            lead_data, state["qualification_result"]
        )

        # Flag for approval if high-value
        if state.get("requires_approval"):
            firebase_mgr.flag_for_human_approval(doc_id, reason="high_value")

        logger.info(
            "node_save_to_firestore_completed",
            doc_id=doc_id,
            requires_approval=state.get("requires_approval", False),
        )

        return {"firestore_doc_id": doc_id}

    except Exception as e:
        logger.error("node_save_to_firestore_failed", error=str(e))
        return {"error": f"Firestore save failed: {str(e)}"}


def node_send_email(state: LeadQualificationState) -> dict:
    """
    Node: Send outreach email for low-value leads (auto-send).

    For high-value leads, email is held for human review.
    """
    if state.get("error"):
        logger.warning("node_send_email_skipped", reason="previous_error")
        return {}

    # Only auto-send for low-value leads
    if not state.get("email_sent"):
        logger.info("node_send_email_skipped", reason="high_value_requires_approval")
        return {"email_sent": False}

    try:
        # Call existing Firebase Cloud Function for email sending
        # This reuses your existing infrastructure
        import httpx

        firebase_function_url = (
            "https://us-central1-freeflow-media.cloudfunctions.net/"
            "sendLeadConfirmationEmail"
        )

        lead_data = {
            "business_name": state["business_name"],
            "email": state["email"],
            "phone": state["phone"],
            "service_interest": state["service_interest"],
            "notes": state["notes"],
        }

        response = httpx.post(
            firebase_function_url,
            json={"lead": lead_data},
            timeout=30.0,
        )
        response.raise_for_status()

        logger.info(
            "node_send_email_completed",
            email=state["email"],
            status_code=response.status_code,
        )

        return {"email_sent": True}

    except Exception as e:
        logger.error("node_send_email_failed", error=str(e))
        return {"email_sent": False, "error": f"Email send failed: {str(e)}"}


def node_notify_human_approval(state: LeadQualificationState) -> dict:
    """
    Node: Send WhatsApp alert for high-value leads requiring approval.
    """
    if state.get("error"):
        logger.warning(
            "node_notify_human_approval_skipped", reason="previous_error"
        )
        return {}

    # Only notify for high-value leads
    if not state.get("requires_approval"):
        logger.info(
            "node_notify_human_approval_skipped",
            reason="low_value_no_approval_needed",
        )
        return {"whatsapp_message_sid": None}

    try:
        notifier = WhatsAppNotifier()

        # Get notification target from env (sales team number)
        to_number = os.getenv(
            "SALES_TEAM_WHATSAPP", "whatsapp:+27123456789"
        )  # Replace with actual number

        lead_data = {
            "business_name": state["business_name"],
            "email": state["email"],
            "service_interest": state["service_interest"],
        }

        message_sid = notifier.notify_high_value_lead(
            to_number=to_number,
            lead_data=lead_data,
            qualification_result=state["qualification_result"],
        )

        logger.info(
            "node_notify_human_approval_completed",
            message_sid=message_sid,
            business_name=state["business_name"],
        )

        return {"whatsapp_message_sid": message_sid}

    except Exception as e:
        logger.error("node_notify_human_approval_failed", error=str(e))
        return {
            "whatsapp_message_sid": None,
            "error": f"WhatsApp notification failed: {str(e)}",
        }


# ==================== Graph Builder ====================


def build_lead_qual_graph() -> StateGraph:
    """
    Build the lead qualification LangGraph workflow.

    Workflow:
    1. qualify_lead -> 2. route_lead -> 3. save_to_firestore
                                              ├-> 4a. send_email (if <R5k)
                                              └-> 4b. notify_human_approval (if >R10k)
                                                   -> END
    """
    graph_builder = StateGraph(LeadQualificationState)

    # Add nodes
    graph_builder.add_node("qualify_lead", node_qualify_lead)
    graph_builder.add_node("route_lead", node_route_lead)
    graph_builder.add_node("save_to_firestore", node_save_to_firestore)
    graph_builder.add_node("send_email", node_send_email)
    graph_builder.add_node("notify_human_approval", node_notify_human_approval)

    # Define edges
    graph_builder.set_entry_point("qualify_lead")
    graph_builder.add_edge("qualify_lead", "route_lead")
    graph_builder.add_edge("route_lead", "save_to_firestore")

    # Conditional routing after save
    def route_after_save(state: LeadQualificationState) -> str:
        """Determine next step based on value estimate."""
        if state.get("error"):
            return END

        if state.get("requires_approval"):
            return "notify_human_approval"
        elif state.get("email_sent"):
            return "send_email"
        else:
            return END

    graph_builder.add_conditional_edges(
        "save_to_firestore",
        route_after_save,
        {
            "send_email": "send_email",
            "notify_human_approval": "notify_human_approval",
            END: END,
        },
    )

    graph_builder.add_edge("send_email", END)
    graph_builder.add_edge("notify_human_approval", END)

    return graph_builder


# ==================== Compiled Graph ====================

# Create memory for checkpointing (persists state across steps)
memory = MemorySaver()

# Build and compile the graph
lead_qual_graph = build_lead_qual_graph().compile(checkpointer=memory)

# Set graph name for LangSmith tracing
lead_qual_graph.name = "FreeFlow-Lead-Qualification"


# ==================== Invocation Helper ====================


async def invoke_lead_qualification(lead_data: dict) -> dict:
    """
    Invoke the lead qualification graph.

    Args:
        lead_data: Dict with business_name, email, phone, service_interest, notes

    Returns:
        Final state dict with qualification results
    """
    import time
    import uuid

    start_time = time.time()

    # Prepare initial state
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "business_name": lead_data.get("business_name", "Unknown"),
        "email": lead_data.get("email", "Unknown"),
        "phone": lead_data.get("phone", "Unknown"),
        "service_interest": lead_data.get("service_interest", "Unknown"),
        "notes": lead_data.get("notes", ""),
        "qualification_result": None,
        "firestore_doc_id": None,
        "whatsapp_message_sid": None,
        "email_sent": False,
        "requires_approval": False,
        "error": None,
        "processing_time_ms": None,
        "langsmith_trace_id": None,
    }

    # Invoke graph
    final_state = await lead_qual_graph.ainvoke(initial_state, config=config)

    # Calculate total processing time
    final_state["processing_time_ms"] = (time.time() - start_time) * 1000

    logger.info(
        "lead_qualification_complete",
        thread_id=thread_id,
        business_name=final_state.get("business_name"),
        intent=final_state.get("qualification_result").intent_score
        if final_state.get("qualification_result")
        else None,
        value_estimate=final_state.get("qualification_result").value_estimate
        if final_state.get("qualification_result")
        else None,
        requires_approval=final_state.get("requires_approval", False),
        error=final_state.get("error"),
        processing_time_ms=final_state["processing_time_ms"],
    )

    return final_state


def invoke_lead_qualification_sync(lead_data: dict) -> dict:
    """
    Synchronous version for non-async contexts.
    """
    import asyncio

    return asyncio.run(invoke_lead_qualification(lead_data))
