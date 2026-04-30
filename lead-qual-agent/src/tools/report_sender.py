"""
Report Sender Tool - Multichannel Delivery for Monthly Reports

Handles:
- Email delivery via SendGrid or Firebase Function
- WhatsApp delivery via Twilio
- Delivery confirmation and logging
"""

import os
import structlog
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from src.tools.whatsapp import WhatsAppNotifier

logger = structlog.get_logger()


class ReportSender:
    """Sends monthly reports via email and WhatsApp."""

    def __init__(self):
        self.firebase_function_url = os.getenv(
            "FIREBASE_EMAIL_FUNCTION_URL",
            "https://us-central1-freeflow-media.cloudfunctions.net/sendLeadConfirmationEmail",
        )
        self.whatsapp_notifier = WhatsAppNotifier() if os.getenv("TWILIO_ACCOUNT_SID") else None

    def send_multichannel(
        self,
        client_email: str,
        client_phone: Optional[str],
        pdf_link: str,
        client_name: str,
        date_range: dict,
    ) -> dict:
        """
        Send report via multiple channels.

        Args:
            client_email: Client email address
            client_phone: Client phone number (optional)
            pdf_link: URL or path to the PDF report
            client_name: Client business name
            date_range: Report date range

        Returns:
            Dict with delivery status per channel
        """
        results = {
            "email": {"sent": False, "error": None},
            "whatsapp": {"sent": False, "error": None},
        }

        # Send via email
        try:
            self._send_email(
                client_email, pdf_link, client_name, date_range
            )
            results["email"]["sent"] = True
            logger.info(
                "report_email_sent",
                client_email=client_email,
                client_name=client_name,
            )
        except Exception as e:
            results["email"]["error"] = str(e)
            logger.error("report_email_failed", error=str(e))

        # Send via WhatsApp (if phone provided and Twilio configured)
        if client_phone and self.whatsapp_notifier:
            try:
                self._send_whatsapp(
                    client_phone, pdf_link, client_name, date_range
                )
                results["whatsapp"]["sent"] = True
                logger.info(
                    "report_whatsapp_sent",
                    client_phone=client_phone,
                    client_name=client_name,
                )
            except Exception as e:
                results["whatsapp"]["error"] = str(e)
                logger.error("report_whatsapp_failed", error=str(e))

        return results

    def _send_email(
        self,
        client_email: str,
        pdf_link: str,
        client_name: str,
        date_range: dict,
    ):
        """Send report via email using Firebase Function."""
        import httpx

        subject = f"📊 Your Monthly Report is Ready — {client_name}"

        body = f"""
Hi {client_name},

Your monthly performance report is ready!

📅 Period: {date_range.get('start', 'N/A')} — {date_range.get('end', 'N/A')}

📎 Download your report: {pdf_link}

Key highlights are included in the report. If you have any questions, just reply to this email.

Let's keep dominating the digital space! ⚡

— The Drift Studio Team
        """.strip()

        # Use Firebase Function for email sending
        response = httpx.post(
            self.firebase_function_url,
            json={
                "to": client_email,
                "subject": subject,
                "body": body,
                "attachments": [pdf_link] if not pdf_link.startswith("http") else [],
            },
            timeout=30.0,
        )
        response.raise_for_status()

    def _send_whatsapp(
        self,
        client_phone: str,
        pdf_link: str,
        client_name: str,
        date_range: dict,
    ):
        """Send report notification via WhatsApp."""
        message = (
            f"📊 *Your Monthly Report is Ready!*\n\n"
            f"*{client_name}*\n"
            f"📅 {date_range.get('start', 'N/A')} — {date_range.get('end', 'N/A')}\n\n"
            f"Your performance report has been generated. Check your email for the full PDF, or view it here:\n\n"
            f"{pdf_link}\n\n"
            f"Any questions? Just reply here! ⚡\n\n"
            f"— Drift Studio Team"
        )

        self.whatsapp_notifier.client.messages.create(
            body=message,
            from_=self.whatsapp_notifier.from_number,
            to=f"whatsapp:{client_phone}" if not client_phone.startswith("whatsapp:") else client_phone,
        )
