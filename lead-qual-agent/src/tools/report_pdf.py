"""
PDF Generation Tool - Create Branded Monthly Report PDFs

Handles:
- HTML to PDF conversion
- Drift Studio branding (logo, colors, fonts)
- Professional layout with charts and metrics
- Upload to Firebase Storage or return file URL
"""

import os
import structlog
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = structlog.get_logger()


class PDFGenerator:
    """Creates branded PDF reports for Drift Studio clients."""

    BRAND_COLORS = {
        "primary": "#7c3aed",  # Purple
        "secondary": "#2563eb",  # Blue
        "accent": "#06b6d4",  # Cyan
        "dark": "#0f172a",
        "light": "#f8fafc",
    }

    def __init__(self):
        self.firebase_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
        self.output_dir = os.getenv("REPORT_OUTPUT_DIR", "./reports")

        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)

    def create_branded_pdf(
        self,
        insights_html: str,
        client_name: str,
        date_range: dict,
        metrics: Optional[dict] = None,
    ) -> str:
        """
        Create a branded PDF report.

        Args:
            insights_html: AI-generated insights content
            client_name: Client business name
            date_range: {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
            metrics: Optional metrics dict for summary cards

        Returns:
            File URL or local path to the generated PDF
        """
        logger.info(
            "creating_branded_pdf",
            client_name=client_name,
            date_range=date_range,
        )

        # Generate HTML report
        html_content = self._generate_report_html(
            insights_html, client_name, date_range, metrics
        )

        # Convert to PDF
        pdf_path = self._html_to_pdf(html_content, client_name, date_range)

        logger.info(
            "pdf_created",
            pdf_path=pdf_path,
            client_name=client_name,
        )

        return pdf_path

    def _generate_report_html(
        self,
        insights_html: str,
        client_name: str,
        date_range: dict,
        metrics: Optional[dict] = None,
    ) -> str:
        """Generate complete HTML report with FreeFlow branding."""

        start_date = date_range.get("start", "N/A")
        end_date = date_range.get("end", "N/A")

        # Summary cards HTML
        summary_cards = ""
        if metrics:
            cards = [
                ("Sessions", metrics.get("total_sessions", "N/A")),
                ("Conversions", metrics.get("total_conversions", "N/A")),
                ("Revenue", f"R{metrics.get('total_revenue', 0):,.0f}"),
                ("ROAS", f"{metrics.get('roas', 0):.1f}x"),
            ]
            summary_cards = '<div style="display: flex; gap: 16px; margin: 24px 0; flex-wrap: wrap;">'
            for label, value in cards:
                summary_cards += f'''
                <div style="flex: 1; min-width: 150px; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid {self.BRAND_COLORS['primary']};">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">{label}</div>
                    <div style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px;">{value}</div>
                </div>
                '''
            summary_cards += '</div>'

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Monthly Report - {client_name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        
        body {{
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
        }}
        
        .header {{
            background: linear-gradient(135deg, {self.BRAND_COLORS['primary']} 0%, {self.BRAND_COLORS['secondary']} 100%);
            color: white;
            padding: 40px;
            margin: -40px -40px 40px -40px;
            border-radius: 0 0 16px 16px;
        }}
        
        .logo {{
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 8px;
        }}
        
        .title {{
            font-size: 32px;
            font-weight: 800;
            margin: 16px 0 8px 0;
        }}
        
        .subtitle {{
            font-size: 16px;
            opacity: 0.9;
        }}
        
        .date-range {{
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 8px;
            margin-top: 16px;
            font-weight: 600;
        }}
        
        .section {{
            margin: 32px 0;
        }}
        
        .section-title {{
            font-size: 20px;
            font-weight: 800;
            color: {self.BRAND_COLORS['primary']};
            border-bottom: 2px solid {self.BRAND_COLORS['primary']};
            padding-bottom: 8px;
            margin-bottom: 16px;
        }}
        
        .insights {{
            background: #f8fafc;
            padding: 24px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }}
        
        .footer {{
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
        }}
        
        .footer-brand {{
            font-weight: 800;
            color: {self.BRAND_COLORS['primary']};
        }}
        
        ul {{
            padding-left: 20px;
        }}
        
        li {{
            margin: 8px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">⚡ Drift Studio</div>
        <div class="title">Monthly Performance Report</div>
        <div class="subtitle">{client_name}</div>
        <div class="date-range">📅 {start_date} — {end_date}</div>
    </div>
    
    {summary_cards}
    
    <div class="section">
        <div class="section-title">📊 Performance Insights</div>
        <div class="insights">
            {insights_html}
        </div>
    </div>
    
    <div class="footer">
        <p>Generated by <span class="footer-brand">Drift Studio AI</span></p>
        <p>Command the Digital Space ⚡</p>
        <p style="margin-top: 16px; font-size: 10px;">This report was generated automatically. For questions, contact your account manager.</p>
    </div>
</body>
</html>"""

        return html

    def _html_to_pdf(
        self, html_content: str, client_name: str, date_range: dict
    ) -> str:
        """Convert HTML to PDF file."""
        # Try using weasyprint if available
        try:
            from weasyprint import HTML

            filename = f"{client_name.replace(' ', '_')}_{date_range.get('start', 'report')}.pdf"
            filepath = os.path.join(self.output_dir, filename)

            HTML(string=html_content).write_pdf(filepath)

            logger.info("pdf_generated_weasyprint", filepath=filepath)
            return filepath

        except ImportError:
            # Fallback: Save as HTML file
            logger.warning("weasyprint_not_installed", note="Saving as HTML instead")

            filename = f"{client_name.replace(' ', '_')}_{date_range.get('start', 'report')}.html"
            filepath = os.path.join(self.output_dir, filename)

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(html_content)

            return filepath
