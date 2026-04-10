import React, { useState } from 'react';
import MarketingForm from '../components/MarketingForm';
import PaymentGateway from '../components/PaymentGateway';
import StrategyDashboard from '../components/StrategyDashboard';
import { GENERATE_STRATEGY_URL } from '../firebase/config';
import './MarketingGenerator.css';

const MarketingGenerator = () => {
  // Current step: 'form', 'payment', 'generating', 'dashboard'
  const [currentStep, setCurrentStep] = useState('form');
  const [formData, setFormData] = useState(null);
  const [strategyResult, setStrategyResult] = useState(null);

  const handleFormSubmit = (data) => {
    setFormData(data);
    
    // Check for admin/promo bypass
    if (data.promoCode && data.promoCode.toLowerCase() === 'family') {
      // Bypass payment
      generateStrategy(data);
    } else {
      setCurrentStep('payment');
    }
  };

  const handlePaymentSuccess = () => {
    generateStrategy(formData);
  };

  const generateStrategy = async (data) => {
    setCurrentStep('generating');

    try {
      // Call Firebase Cloud Function
      const response = await fetch(GENERATE_STRATEGY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: data.businessType,
          targetAudience: data.targetAudience,
          businessCountry: data.businessCountry,
          currentMarketing: data.currentMarketing,
          contentCategories: data.contentCategories,
          inStoreSpecials: data.inStoreSpecials
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate strategy');
      }

      const result = await response.json();
      setStrategyResult(result.data);
      setCurrentStep('dashboard');
    } catch (error) {
      console.error('Generation error:', error);
      
      // Fallback to mock if Firebase Function isn't set up yet
      console.log('Using mock data (Firebase Function not available)');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockResult = {
        businessName: data.businessType || "Your Business",
        marketAnalysis: `Deep dive market analysis for ${data.businessType || 'your business'} targeting ${data.targetAudience || 'your audience'}. Identified core pain points and 3 emerging market shifts.`,
        viralTrends: [
          `Behind-the-scenes authentic storytelling showing a day in the life of ${data.businessType || 'your business'}.`,
          `Value-driven micro-learning posts specifically for ${data.targetAudience || 'your audience'}.`,
          "Interactive polls based on user pain points."
        ],
        marketingConcepts: [
          { concept: "Educational Blog Post", format: "Blog", hook: `Why most ${data.businessType || 'businesses'} fail at reaching ${data.targetAudience || 'their audience'}...` },
          { concept: "Product Demo Reel", format: "Video", hook: "See how we solved this major problem..." }
        ],
        instagramPosts: [
          { visual: "High contrast, professional image demonstrating the service.", caption: `Tired of manual processes? Here is how a ${data.businessType || 'business like yours'} scales 10x. #growth` },
          { visual: "Sleek dark mode infographic with 3 key stats.", caption: `Did you know that 80% of ${data.targetAudience || 'your audience'} struggles with this? #facts #insight` }
        ],
      };

      setStrategyResult(mockResult);
      setCurrentStep('dashboard');
    }
  };

  return (
    <div className="marketing-generator-page">
      <div className="mg-header">
        <h1>Content Ideator</h1>
        <p>AI-powered marketing content ideas tailored to your business.</p>
      </div>

      <div className="mg-container">
        {currentStep === 'form' && (
          <MarketingForm onSubmit={handleFormSubmit} />
        )}
        
        {currentStep === 'payment' && (
          <PaymentGateway onSuccess={handlePaymentSuccess} onBack={() => setCurrentStep('form')} />
        )}
        
        {currentStep === 'generating' && (
          <div className="mg-loading">
            <div className="loader-spinner"></div>
            <h3>Generating your content ideas...</h3>
            <p>Our AI is analyzing the market and crafting tailored marketing concepts for your business.</p>
          </div>
        )}
        
        {currentStep === 'dashboard' && strategyResult && (
          <StrategyDashboard 
            data={strategyResult} 
            formData={formData} 
            onReset={() => setCurrentStep('form')} 
          />
        )}
      </div>
    </div>
  );
};

export default MarketingGenerator;
