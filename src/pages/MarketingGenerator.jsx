import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import MarketingForm from '../components/MarketingForm';
import PaymentGateway from '../components/PaymentGateway';
import StrategyDashboard from '../components/StrategyDashboard';
import { saveStrategy, uploadPaymentProofFiles, uploadStrategyFiles } from '../services/strategyService';
import { GENERATE_STRATEGY_URL } from '../firebase/config';
import { getEftPaymentMetadata, getGenerationFailureMessage } from '../services/generationPolicy';
import ContentStudio from './ContentStudio';
import './MarketingGenerator.css';

const GENERATION_TIMEOUT_MS = 110_000;

const MarketingGenerator = () => {
  const [mode, setMode] = useState('studio');
  const [currentStep, setCurrentStep] = useState('form');
  const [formData, setFormData] = useState(null);
  const [strategyResult, setStrategyResult] = useState(null);
  const [strategyId, setStrategyId] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
  const [lastError, setLastError] = useState(null);

  const handleFormSubmit = (data) => {
    setLastError(null);
    setFormData(data);

    if (data.promoCode?.trim()) {
      // Send promo code to server — it will validate and reject if invalid
      generateStrategy(data, { bypassPayment: true });
    } else {
      setCurrentStep('payment');
    }
  };

  const handlePaymentSuccess = (paymentDetails = {}) => {
    if (!formData) return;
    if (paymentDetails.pending) {
      setCurrentStep('pending');
      return;
    }
    generateStrategy(formData, { bypassPayment: false, paymentDetails });
  };

  const generateStrategy = async (data, { bypassPayment, paymentDetails = {} }) => {
    if (isGenerating) return;

    setIsGenerating(true);
    setCurrentStep('generating');
    setLastError(null);

    // Upload files first so URLs can be included in the record.
    // Reuse uploaded URLs from a previous attempt where possible.
    let urlsToSend = uploadedFileUrls;
    if ((!urlsToSend || urlsToSend.length === 0) && data.marketingMaterialsFiles?.length) {
      try {
        urlsToSend = await uploadStrategyFiles(data.marketingMaterialsFiles);
        setUploadedFileUrls(urlsToSend);
      } catch {
        toast.error('File upload failed — continuing without uploaded assets.');
        urlsToSend = [];
        setUploadedFileUrls([]);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    try {
      const response = await fetch(GENERATE_STRATEGY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          businessType: data.businessType,
          targetAudience: data.targetAudience,
          businessCountry: data.businessCountry,
          currentMarketing: data.currentMarketing,
          contentCategories: data.contentCategories,
          inStoreSpecials: data.inStoreSpecials,
          userEmail: data.email,
          userName: data.name,
          marketingMaterialsLink: data.marketingMaterialsLink || null,
          uploadedFileUrls: urlsToSend.length ? urlsToSend : null,
          promoCode: data.promoCode || null,
        }),
      });

      if (response.status === 400) {
        const err = await response.json();
        toast.error(err.error || 'Invalid promo code. Please pay to continue.');
        setCurrentStep('payment');
        return;
      }

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const result = await response.json();
      const strategy = result.data;

      const isPromo = bypassPayment && !!data.promoCode;
      const paymentMetadata = isPromo
        ? { paymentStatus: 'promo', paymentAmount: 0, paymentMethod: 'promo' }
        : getEftPaymentMetadata();
      const paymentProofUrls = !isPromo && paymentDetails.paymentProofFiles?.length
        ? await uploadPaymentProofFiles(paymentDetails.paymentProofFiles)
        : [];
      const record = await saveStrategy({
        businessName: data.businessType,
        targetAudience: data.targetAudience,
        businessCountry: data.businessCountry,
        currentMarketing: data.currentMarketing,
        userEmail: data.email,
        userName: data.name,
        strategy,
        marketingMaterialsLink: data.marketingMaterialsLink,
        uploadedFileUrls: urlsToSend,
        status: 'generated',
        ...paymentMetadata,
        paymentReference: isPromo ? '' : paymentDetails.paymentReference,
        paymentProofUrls,
        strategySource: 'ai',
      });

      setStrategyId(record.id);
      setStrategyResult(strategy);
      setCurrentStep('dashboard');
    } catch (error) {
      if (error?.name === 'AbortError') {
        const msg = 'Generation timed out. You can retry without re-entering your brief.';
        setLastError(msg);
        toast.error(msg);
        setCurrentStep(bypassPayment ? 'form' : 'payment');
        return;
      }

      const msg = getGenerationFailureMessage('content');
      setLastError(msg);
      toast.error(msg, { duration: 8000 });
      setCurrentStep('payment');
    } finally {
      clearTimeout(timeout);
      setIsGenerating(false);
    }
  };

  const STEPS = [
    { key: 'form',       label: 'Brief' },
    { key: 'payment',    label: 'Payment' },
    { key: 'pending',    label: 'Verification' },
    { key: 'generating', label: 'Generating' },
    { key: 'dashboard',  label: 'Results' },
  ];

  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <>
      <div className="mg-mode-toggle">
        <button className={`mg-mode-btn${mode === 'studio' ? ' active' : ''}`} onClick={() => setMode('studio')}>
          Content Studio
        </button>
        <button className={`mg-mode-btn${mode === 'strategy' ? ' active' : ''}`} onClick={() => setMode('strategy')}>
          Strategy Wizard
        </button>
      </div>

      {mode === 'studio' ? (
        <ContentStudio />
      ) : (
        <div className="marketing-generator-page">
          <div className="mg-header">
            <h1>Content Ideator</h1>
            <p>AI-powered marketing content ideas tailored to your business.</p>
          </div>

          {/* Step indicator */}
          <div className="mg-steps">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.key}>
                <div className={`mg-step ${i < currentIndex ? 'mg-step--done' : ''} ${i === currentIndex ? 'mg-step--active' : ''}`}>
                  <div className="mg-step-dot">{i < currentIndex ? '✓' : i + 1}</div>
                  <span className="mg-step-label">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`mg-step-line ${i < currentIndex ? 'mg-step-line--done' : ''}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="mg-container">
            {currentStep === 'form' && (
              <MarketingForm onSubmit={handleFormSubmit} isGenerating={isGenerating} />
            )}

            {currentStep === 'payment' && (
              <PaymentGateway
                onSuccess={handlePaymentSuccess}
                onBack={() => setCurrentStep('form')}
                formData={formData}
              />
            )}

            {currentStep === 'pending' && (
              <div className="mg-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                <h2>Payment Submitted</h2>
                <p style={{ marginBottom: '1.5rem' }}>
                  Your proof of payment has been received. Our team will verify it and send you an access code — usually within a few hours.
                </p>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted, #888)' }}>
                  Once you receive your code, enter it in the <strong>Promo Code</strong> field on the brief form to unlock your strategy.
                </p>
                <button className="mg-btn-text" onClick={() => setCurrentStep('form')}>
                  <ArrowLeft size={16} /> Back to Form
                </button>
              </div>
            )}

            {currentStep === 'generating' && (
              <div className="mg-loading">
                <div className="loader-spinner"></div>
                <h3>Generating your content ideas...</h3>
                <p>Our AI is analysing the market and crafting tailored concepts for your business.</p>
              </div>
            )}

            {currentStep === 'dashboard' && strategyResult && (
              <StrategyDashboard
                data={strategyResult}
                formData={formData}
                strategyId={strategyId}
                onReset={() => setCurrentStep('form')}
              />
            )}

            {lastError && currentStep !== 'dashboard' && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <p style={{ color: '#f59e0b', marginBottom: '0.75rem' }}>{lastError}</p>
                <button
                  className="mg-btn mg-btn-primary"
                  onClick={() => {
                    if (!formData) return;
                    generateStrategy(formData, { bypassPayment: !!formData.promoCode?.trim() });
                  }}
                  disabled={isGenerating}
                >
                  Retry generation
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MarketingGenerator;
