# Drift Studio - AI Agent Suite

**Lead Qualification Agent** + **Monthly Report Generator**

AI-powered automation system using **LangGraph**, **Gemini 2.5 Pro**, **Firebase Firestore**, and **WhatsApp** notifications.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd lead-qual-agent
pip install -r requirements.txt
```

### 2. Set Environment Variables

```bash
cp .env.example .env
# Edit .env and fill in:
# - GEMINI_API_KEY (required)
# - FIREBASE_SERVICE_ACCOUNT_PATH (optional for local dev)
# - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (for WhatsApp alerts)
```

### 3. Run the Server

```bash
python -m src.main
# or
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Test the Endpoint

```bash
curl -X POST http://localhost:8000/freeflow-lead \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Joes Coffee Shop",
    "email": "joe@coffee.co.za",
    "phone": "+27123456789",
    "service_interest": "social_media_management,website_redesign",
    "notes": "Need help with Instagram growth and new website"
  }'
```

**Expected Response:**
```json
{
  "business_name": "Joes Coffee Shop",
  "email": "joe@coffee.co.za",
  "intent": "full_stack",
  "value_estimate": ">R10k",
  "value_estimate_zar": 15000.0,
  "confidence": 0.85,
  "outreach_email": "Subject: Let's Transform Joes Coffee Shop's Digital Presence\n\n...",
  "requires_approval": true,
  "email_sent": false,
  "firestore_doc_id": "joe@coffee.co.za",
  "whatsapp_message_sid": "SM123...",
  "processing_time_ms": 3500,
  "langsmith_trace_id": "trace_abc123"
}
```

---

## 📊 How It Works

### Workflow

```
POST /freeflow-lead
    ↓
1. qualify_lead (Gemini 2.5 Pro)
   - Score intent: marketing_only, webdev_only, full_stack, ecommerce
   - Estimate value: <R5k, R5k-10k, >R10k
   - Generate personalized outreach email
    ↓
2. route_lead (based on value)
   - If <R5k → auto-send email
   - If >R10k → flag for human approval
    ↓
3. save_to_firestore (log everything)
    ↓
4a. send_email (if <R5k) OR
4b. notify_human_approval (if >R10k via WhatsApp)
    ↓
Return qualification result
```

### Routing Logic

| Value Estimate | Action | Email Sent | Requires Approval | WhatsApp Alert |
|----------------|--------|------------|-------------------|----------------|
| <R5k | Auto-send email + log | ✅ Yes | ❌ No | ❌ No |
| R5k-10k | Log + notify team | ❌ No | ❌ No | ✅ Yes |
| >R10k | Flag for approval + WhatsApp | ❌ No | ✅ Yes | ✅ Yes |

---

## 🏗️ Project Structure

```
lead-qual-agent/
├── src/
│   ├── main.py                          # FastAPI app with all endpoints
│   ├── __init__.py
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── gemini.py                    # Gemini AI qualification with retry/cost tracking
│   │   ├── firebase.py                  # Firestore operations
│   │   ├── whatsapp.py                  # WhatsApp notifications via Twilio
│   │   ├── analytics.py                 # Multi-platform analytics pulling (GA4, Meta, Ads, TikTok)
│   │   ├── report_intelligence.py       # Anomaly detection + AI insights generation
│   │   ├── report_pdf.py                # Branded PDF report generation
│   │   └── report_sender.py             # Multichannel report delivery (email + WhatsApp)
│   └── graphs/
│       ├── __init__.py
│       ├── lead_qual_graph.py           # Lead qualification LangGraph workflow
│       └── monthly_report_graph.py      # Monthly report LangGraph workflow
├── tests/
│   ├── test_lead_qual.py                # Lead qualification test suite
│   └── test_monthly_report.py           # Monthly report test suite
├── dashboard.html                       # Beautiful FreeFlow-branded web UI
├── requirements.txt                     # Python dependencies
├── .env.example                         # Environment variables template
└── README.md                            # This file
```

---

## 🔧 Key Features

### 1. **Gemini AI Qualification**
- **Intent Scoring**: marketing_only, webdev_only, full_stack, ecommerce
- **Value Estimation**: <R5k, R5k-10k, >R10k (with numeric ZAR estimate)
- **Email Generation**: Bold, personalized outreach matching FreeFlow's brand voice
- **Exponential Backoff**: 3 retries with delays (2s, 4s, 8s)
- **Cost Tracking**: Aborts if Gemini spend >$0.15/lead

### 2. **Smart Routing**
- Low-value leads (<R5k): Auto-send email, no human intervention
- High-value leads (>R10k): Flag for approval, send WhatsApp alert
- Mid-value (R5k-10k): Log and notify team

### 3. **Firebase Integration**
- Saves all qualified leads to Firestore
- Flags high-value leads for human review
- Tracks approval workflow (flagged → approved/rejected)
- Query pending approvals and statistics

### 4. **WhatsApp Alerts**
- Sends detailed alerts for high-value leads
- Includes business name, email, intent, value estimate, confidence
- Notifies sales team immediately

### 5. **Observability**
- Structured logging with `structlog`
- LangSmith trace IDs for debugging
- Processing time tracking
- Error tracking and reporting

---

## 📊 Monthly Report Generator

### Workflow

```
POST /generate-monthly-report
    ↓
1. fetch_data (GA4, Meta, Google Ads, TikTok)
   - Pull current period metrics
   - Pull baseline (previous 7 days)
    ↓
2. analyze (Anomaly Detection)
   - Compare current vs baseline
   - Flag anomalies (>20% change)
   - Human gate: Pause if any KPI >50% change
    ↓
3. generate (AI Insights via Gemini)
   - Executive summary
   - Key highlights
   - Opportunities & next steps
   - ROI statement
    ↓
4. validate (Quality Check)
   - Verify insights generated
   - Check cost within $0.50 limit
    ↓
5. create_pdf (Branded Report)
   - Drift Studio branded PDF
   - Metrics cards, insights, footer
    ↓
6. send (Multichannel Delivery)
   - Email to client
   - WhatsApp notification (optional)
    ↓
7. log (Firestore)
   - Save report record
   - Track cost, delivery status
```

### Features

- **Multi-Platform Analytics**: GA4, Meta, Google Ads, TikTok
- **Anomaly Detection**: Statistical comparison against baseline
- **AI Insights**: Gemini-powered narrative with FreeFlow brand voice
- **Branded PDF**: Professional layout with FreeFlow colors/fonts
- **Human Gate**: Pauses for review if KPI changes >50%
- **Cost Cap**: Aborts if Gemini spend >$0.50/report
- **Multichannel Delivery**: Email + WhatsApp

---

## 📝 API Documentation

### POST `/freeflow-lead`

Qualify a new lead.

**Request Body:**
```json
{
  "business_name": "string (required)",
  "email": "string (required, email format)",
  "phone": "string (required)",
  "service_interest": "string (required)",
  "notes": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "business_name": "string",
  "email": "string",
  "intent": "marketing_only|webdev_only|full_stack|ecommerce",
  "value_estimate": "<R5k|R5k-10k|>R10k",
  "value_estimate_zar": 15000.0,
  "confidence": 0.85,
  "outreach_email": "string",
  "requires_approval": true,
  "email_sent": false,
  "firestore_doc_id": "string|null",
  "whatsapp_message_sid": "string|null",
  "processing_time_ms": 3500,
  "langsmith_trace_id": "string|null"
}
```

**Error Responses:**
- `400`: Invalid request body
- `422`: Validation error (missing fields, invalid email)
- `500`: Internal error (Gemini API failure, Firebase error, etc.)

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy|degraded",
  "timestamp": "2026-04-13T10:30:00",
  "version": "1.0.0",
  "dependencies": {
    "gemini_api": "configured|missing",
    "firebase": "configured|using_default",
    "twilio": "configured|missing",
    "langsmith": "configured|missing"
  }
}
```

### POST `/generate-monthly-report`

Generate a comprehensive monthly performance report.

**Request Body:**
```json
{
  "client_id": "client_123",
  "client_name": "Joes Coffee Shop",
  "client_email": "joe@coffee.co.za",
  "client_phone": "+27123456789",
  "client_industry": "Food & Beverage",
  "date_range": {
    "start": "2026-03-01",
    "end": "2026-03-31"
  },
  "platforms": ["ga4", "meta", "google_ads", "tiktok"]
}
```

**Response (200 OK):**
```json
{
  "client_id": "client_123",
  "client_name": "Joes Coffee Shop",
  "status": "sent",
  "pdf_link": "./reports/Joes_Coffee_Shop_2026-03-01.pdf",
  "requires_approval": false,
  "approval_reason": null,
  "anomalies_count": 2,
  "cost_usd": 0.015,
  "delivery_status": {
    "email": {"sent": true, "error": null},
    "whatsapp": {"sent": true, "error": null}
  },
  "firestore_doc_id": "report_client_123_2026-03-01",
  "processing_time_ms": 8500,
  "error": null
}
```

**Error Responses:**
- `422`: Validation error (missing client_id, invalid email)
- `500`: Report generation failed (Gemini cost exceeded, analytics API failure, etc.)

### GET `/`

API information and available endpoints.

---

## 🧪 Running Tests

```bash
# Run all tests
pytest tests/ -v

# Lead qualification tests
pytest tests/test_lead_qual.py -v

# Monthly report tests
pytest tests/test_monthly_report.py -v

# Run integration tests (requires API keys)
pytest tests/ -v --mark=integration

# Run with coverage
pytest tests/ --cov=src --cov-report=html
```

---

## 🚀 Deployment

### Option 1: Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY .env .env

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t lead-qual-agent .
docker run -p 8000:8000 --env-file .env lead-qual-agent
```

### Option 2: Google Cloud Run

```bash
# Build and deploy
gcloud run deploy lead-qual-agent \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars GEMINI_API_KEY=your_key,FIREBASE_SERVICE_ACCOUNT_PATH=/app/service-account.json \
  --set-secrets TWILIO_ACCOUNT_SID=twilio_sid:latest,TWILIO_AUTH_TOKEN=twilio_token:latest
```

### Option 3: Firebase Functions (Python)

```bash
# Initialize Firebase Functions (Python)
firebase init functions

# Edit functions/main.py to import and expose the FastAPI app
# Deploy
firebase deploy --only functions
```

---

## 🔐 Security

- **Environment Variables**: All secrets in `.env` (never commit to git)
- **Input Validation**: Pydantic models validate all inputs
- **CORS**: Configurable origins (default: localhost + your domain)
- **Rate Limiting**: Add middleware if needed (not included by default)
- **Firestore Rules**: Ensure proper security rules in Firestore

---

## 📊 Cost Breakdown

### Lead Qualification (per lead)

| Service | Cost per Lead | Notes |
|---------|---------------|-------|
| Gemini 2.5 Pro | ~$0.005-0.015 | Depends on prompt/response length |
| Firebase Firestore | ~$0.0001 | Negligible (within free tier) |
| WhatsApp (Twilio) | ~$0.005 | Only for high-value leads |
| **Total (avg)** | **~$0.01-0.02** | Well under $0.15 limit |

### Monthly Report (per report)

| Service | Cost per Report | Notes |
|---------|-----------------|-------|
| Gemini 2.5 Pro | ~$0.01-0.05 | Insights generation |
| Firebase Firestore | ~$0.0001 | Logging |
| WhatsApp (Twilio) | ~$0.005 | Optional delivery |
| PDF Generation | $0 | Weasyprint (free) |
| **Total (avg)** | **~$0.02-0.06** | Well under $0.50 limit |

---

## 🔍 Monitoring

### LangSmith Traces

Set `LANGCHAIN_API_KEY` and `LANGCHAIN_TRACING_V2=true` to enable tracing.

View traces at: https://smith.langchain.com/

### Structured Logs

Logs are JSON-formatted for easy parsing:

```json
{"event": "lead_qualification_complete", "business_name": "Joes Coffee", "intent": "full_stack", "value_estimate": ">R10k", "processing_time_ms": 3500, "timestamp": "2026-04-13T10:30:00"}
```

### Firestore Dashboard

View qualified leads and pending approvals:
```
Firebase Console → Firestore → qualified_leads collection
```

---

## 🛠️ Troubleshooting

### Gemini API Errors

**Issue**: `Failed to parse Gemini response as JSON`
- **Solution**: Check Gemini API key is valid, model name is correct

**Issue**: `Cost limit exceeded`
- **Solution**: Increase `MAX_COST_PER_LEAD` in `src/tools/gemini.py` (default: $0.15)

### Firebase Errors

**Issue**: `Firestore save failed`
- **Solution**: Check service account credentials, verify Firestore is enabled

### WhatsApp Errors

**Issue**: `Twilio credentials not set`
- **Solution**: Set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env`

**Issue**: `WhatsApp notification failed`
- **Solution**: Verify phone number format (must be `whatsapp:+27...`), check Twilio balance

---

## 📚 Next Steps

- [ ] Add admin dashboard for reviewing pending approvals
- [ ] Implement actual GA4, Meta, Google Ads, TikTok API integrations (currently mocked)
- [ ] Add rate limiting middleware
- [ ] Set up automated tests with CI/CD
- [ ] Implement A/B testing for email templates
- [ ] Add webhook to notify existing systems when reports are ready
- [ ] Create client-facing report viewer portal

---

## 🤝 Support

For issues or questions:
- Check the troubleshooting section above
- Review logs: `docker logs lead-qual-agent` or console output
- Check LangSmith traces for detailed execution flow
- Open an issue in your repository

---

**Built with ❤️ for Drift Studio**
**Version:** 2.0.0 | **Date:** 2026-04-14
**Features:** Lead Qualification + Monthly Report Generator
