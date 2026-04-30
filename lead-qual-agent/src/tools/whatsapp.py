"""
WhatsApp Tool - High-Value Lead Notifications

Handles:
- Sending WhatsApp alerts for high-value leads
- Notification to sales team for human approval
- Message templates for different scenarios
"""

import os
import structlog
from typing import Optional
from dotenv import load_dotenv

load_dotenv()  # Ensure .env is loaded

from twilio.rest import Client

logger = structlog.get_logger()


class WhatsAppNotifier:
    """Sends WhatsApp notifications for high-value lead alerts."""

    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_number: Optional[str] = None,
    ):
        """
        Initialize Twilio WhatsApp client.

        Args:
            account_sid: Twilio Account SID
            auth_token: Twilio Auth Token
            from_number: Twilio WhatsApp number (whatsapp:+14155238886)
        """
        self.account_sid = account_sid or os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = auth_token or os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = from_number or os.getenv(
            "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"
        )

        if not self.account_sid or not self.auth_token:
            raise ValueError(
                "Twilio credentials not set. "
                "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env"
            )

        self.client = Client(self.account_sid, self.auth_token)

    def notify_high_value_lead(
        self,
        to_number: str,
        lead_data: dict,
        qualification_result,
    ) -> str:
        """
        Send WhatsApp notification for high-value lead requiring approval.

        Args:
            to_number: Recipient phone number (whatsapp:+27...)
            lead_data: Original lead data
            qualification_result: GeminiQualificationResult

        Returns:
            Message SID
        """
        business_name = lead_data.get("business_name", "Unknown")
        email = lead_data.get("email", "Unknown")
        service_interest = lead_data.get("service_interest", "Unknown")
        value_estimate = qualification_result.value_estimate
        intent = qualification_result.intent_score

        message_body = (
            f"🔥 *HIGH-VALUE LEAD ALERT* 🔥\n\n"
            f"*Business:* {business_name}\n"
            f"*Email:* {email}\n"
            f"*Interest:* {service_interest}\n"
            f"*Estimated Value:* {value_estimate}\n"
            f"*Intent:* {intent}\n"
            f"*Confidence:* {qualification_result.confidence:.0%}\n\n"
            f"⚠️ *Action Required:* This lead needs human review.\n"
            f"Check the dashboard or Firestore to approve/reject.\n\n"
            f"— Drift Studio Lead Qualification Agent"
        )

        # Ensure phone number has whatsapp: prefix
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"

        try:
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=to_number,
            )

            logger.info(
                "whatsapp_notification_sent",
                message_sid=message.sid,
                to_number=to_number,
                business_name=business_name,
                value_estimate=value_estimate,
            )

            return message.sid

        except Exception as e:
            logger.error(
                "whatsapp_notification_failed",
                error=str(e),
                to_number=to_number,
            )
            raise

    def notify_team_approval_needed(
        self,
        to_number: str,
        lead_id: str,
        business_name: str,
        value_estimate: str,
    ) -> str:
        """
        Send simplified approval request to team member.

        Args:
            to_number: Team member phone number
            lead_id: Firestore document ID
            business_name: Lead business name
            value_estimate: Estimated deal value

        Returns:
            Message SID
        """
        message_body = (
            f"✅ *LEAD APPROVAL NEEDED*\n\n"
            f"*{business_name}*\n"
            f"Estimated: {value_estimate}\n\n"
            f"Review and approve/reject in dashboard.\n"
            f"Lead ID: {lead_id}\n\n"
            f"— Drift Studio"
        )

        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"

        message = self.client.messages.create(
            body=message_body,
            from_=self.from_number,
            to=to_number,
        )

        logger.info(
            "team_approval_notification_sent",
            message_sid=message.sid,
            lead_id=lead_id,
            business_name=business_name,
        )

        return message.sid

    def send_confirmation_to_lead(
        self,
        to_number: str,
        business_name: str,
    ) -> str:
        """
        Send confirmation message to the lead (optional follow-up).

        Args:
            to_number: Lead phone number
            business_name: Business name

        Returns:
            Message SID
        """
        message_body = (
            f"Hi {business_name}! 👋\n\n"
            f"Thanks for your interest in Drift Studio. "
            f"We've received your inquiry and our team will be in touch within 24 hours.\n\n"
            f"Talk soon!\n"
            f"— Drift Studio Team"
        )

        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"

        message = self.client.messages.create(
            body=message_body,
            from_=self.from_number,
            to=to_number,
        )

        logger.info(
            "lead_confirmation_sent",
            message_sid=message.sid,
            to_number=to_number,
            business_name=business_name,
        )

        return message.sid
