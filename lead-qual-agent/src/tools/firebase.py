"""
Firebase Tool - Firestore Operations for Lead Qualification

Handles:
- Saving qualified leads to Firestore
- Setting human approval flags for high-value leads
- Updating lead status and metadata
- Querying lead history
"""

import os
import structlog
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()  # Ensure .env is loaded

import firebase_admin
from firebase_admin import credentials, firestore

logger = structlog.get_logger()


class FirebaseLeadManager:
    """Manages Firestore operations for lead qualification."""

    def __init__(self, credentials_path: Optional[str] = None):
        """
        Initialize Firebase Admin SDK.

        Args:
            credentials_path: Path to Firebase service account JSON.
                             If None, uses default credentials from environment.
        """
        self.credentials_path = credentials_path or os.getenv(
            "FIREBASE_SERVICE_ACCOUNT_PATH"
        )

        # Initialize Firebase Admin if not already initialized
        if not firebase_admin._apps:
            if self.credentials_path and os.path.exists(self.credentials_path):
                cred = credentials.Certificate(self.credentials_path)
                firebase_admin.initialize_app(cred)
                logger.info("firebase_initialized", mode="service_account")
            else:
                # Use application default credentials (for Cloud Functions)
                firebase_admin.initialize_app()
                logger.info("firebase_initialized", mode="default_credentials")

        self.db = firestore.client()
        self.leads_collection = self.db.collection("qualified_leads")

    def save_qualified_lead(self, lead_data: dict, qualification_result) -> str:
        """
        Save a qualified lead to Firestore.

        Args:
            lead_data: Original lead data from webhook
            qualification_result: GeminiQualificationResult

        Returns:
            Document ID of saved lead
        """
        doc_data = {
            **lead_data,
            "intent": qualification_result.intent_score,
            "value_estimate": qualification_result.value_estimate,
            "value_estimate_zar": qualification_result.value_estimate_zar,
            "confidence": qualification_result.confidence,
            "outreach_email": qualification_result.outreach_email,
            "token_usage": qualification_result.token_usage,
            "cost_usd": qualification_result.cost_usd,
            "langsmith_trace_id": qualification_result.langsmith_trace_id,
            "status": "qualified",
            "requires_approval": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        # Use email as document ID if available (prevents duplicates)
        doc_id = lead_data.get("email", f"lead_{datetime.utcnow().isoformat()}")
        # Sanitize document ID (Firestore doesn't allow / in IDs)
        doc_id = doc_id.replace("/", "_")

        self.leads_collection.document(doc_id).set(doc_data)

        logger.info(
            "lead_saved_to_firestore",
            doc_id=doc_id,
            intent=qualification_result.intent_score,
            value_estimate=qualification_result.value_estimate,
        )

        return doc_id

    def flag_for_human_approval(self, lead_id: str, reason: str = "high_value") -> bool:
        """
        Flag a lead for human approval (high-value leads).

        Args:
            lead_id: Firestore document ID
            reason: Reason for flag (high_value, uncertain, custom)

        Returns:
            True if successful
        """
        update_data = {
            "status": "pending_approval",
            "requires_approval": True,
            "approval_reason": reason,
            "flagged_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        self.leads_collection.document(lead_id).update(update_data)

        logger.info(
            "lead_flagged_for_approval",
            lead_id=lead_id,
            reason=reason,
        )

        return True

    def approve_lead(self, lead_id: str, approved_by: str) -> bool:
        """
        Approve a flagged lead.

        Args:
            lead_id: Firestore document ID
            approved_by: Email/name of person approving

        Returns:
            True if successful
        """
        update_data = {
            "status": "approved",
            "requires_approval": False,
            "approved_by": approved_by,
            "approved_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        self.leads_collection.document(lead_id).update(update_data)

        logger.info("lead_approved", lead_id=lead_id, approved_by=approved_by)

        return True

    def reject_lead(self, lead_id: str, rejected_by: str, reason: str) -> bool:
        """
        Reject a flagged lead.

        Args:
            lead_id: Firestore document ID
            rejected_by: Email/name of person rejecting
            reason: Reason for rejection

        Returns:
            True if successful
        """
        update_data = {
            "status": "rejected",
            "requires_approval": False,
            "rejected_by": rejected_by,
            "rejected_at": datetime.utcnow(),
            "rejection_reason": reason,
            "updated_at": datetime.utcnow(),
        }

        self.leads_collection.document(lead_id).update(update_data)

        logger.info(
            "lead_rejected",
            lead_id=lead_id,
            rejected_by=rejected_by,
            reason=reason,
        )

        return True

    def get_lead(self, lead_id: str) -> Optional[dict]:
        """
        Get a lead by document ID.

        Args:
            lead_id: Firestore document ID

        Returns:
            Lead data dict or None
        """
        doc = self.leads_collection.document(lead_id).get()
        if doc.exists:
            return doc.to_dict()
        return None

    def get_pending_approvals(self) -> list:
        """
        Get all leads pending approval.

        Returns:
            List of lead data dicts
        """
        docs = (
            self.leads_collection.where("requires_approval", "==", True)
            .where("status", "==", "pending_approval")
            .order_by("flagged_at", direction=firestore.Query.DESCENDING)
            .stream()
        )

        leads = []
        for doc in docs:
            lead_data = doc.to_dict()
            lead_data["_id"] = doc.id
            leads.append(lead_data)

        return leads

    def get_lead_stats(self) -> dict:
        """
        Get lead qualification statistics.

        Returns:
            Stats dict with counts by intent and value
        """
        all_leads = self.leads_collection.stream()

        stats = {
            "total_leads": 0,
            "by_intent": {},
            "by_value": {},
            "pending_approval": 0,
            "total_cost_usd": 0.0,
        }

        for doc in all_leads:
            data = doc.to_dict()
            stats["total_leads"] += 1

            intent = data.get("intent", "unknown")
            stats["by_intent"][intent] = stats["by_intent"].get(intent, 0) + 1

            value = data.get("value_estimate", "unknown")
            stats["by_value"][value] = stats["by_value"].get(value, 0) + 1

            if data.get("requires_approval"):
                stats["pending_approval"] += 1

            stats["total_cost_usd"] += data.get("cost_usd", 0)

        return stats
