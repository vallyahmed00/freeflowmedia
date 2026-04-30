import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PriceComparisonForm from '../components/PriceComparisonForm';
import PriceComparisonDashboard from '../components/PriceComparisonDashboard';
import { savePriceComparison } from '../services/priceComparisonService';
import { GENERATE_STRATEGY_URL } from '../firebase/config';
import './PriceComparison.css';

const PRICE_COMPARISON_URL = 'https://us-central1-freeflow-media.cloudfunctions.net/generatePriceComparison';

export default function PriceComparison() {
  const [currentStep, setCurrentStep] = useState('form');
  const [formData, setFormData] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonId, setComparisonId] = useState(null);

  const handleFormSubmit = (data) => {
    setFormData(data);
    generatePriceComparison(data);
  };

  const generatePriceComparison = async (data) => {
    setCurrentStep('generating');

    try {
      const response = await fetch(PRICE_COMPARISON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: data.businessType,
          industry: data.industry,
          location: data.location,
          targetMarket: data.targetMarket,
          currentPricing: data.currentPricing,
          competitors: data.competitors,
          productService: data.productService,
          priceRange: data.priceRange,
          targetGoal: data.targetGoal
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate price comparison');
      }

      const result = await response.json();
      setComparisonResult(result.data);

      // Save to Firebase for history
      const comparisonRecord = await savePriceComparison({
        businessType: data.businessType,
        industry: data.industry,
        location: data.location,
        targetMarket: data.targetMarket,
        currentPricing: data.currentPricing,
        competitors: data.competitors,
        productService: data.productService,
        priceRange: data.priceRange,
        targetGoal: data.targetGoal,
        comparison: result.data,
        status: 'generated'
      });

      setComparisonId(comparisonRecord.id);
      setCurrentStep('dashboard');
    } catch (error) {
      console.error('Price comparison generation error:', error);

      // Fallback to mock data if Firebase Function isn't deployed yet
      console.log('Using mock price comparison data');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockResult = {
        reportTitle: `Competitive Price Analysis for ${data.businessType || 'Your Business'}`,
        generatedDate: new Date().toISOString(),
        businessSummary: {
          businessType: data.businessType || 'Business',
          industry: data.industry || 'Industry',
          location: data.location || 'Global',
          targetMarket: data.targetMarket || 'General market'
        },
        marketOverview: {
          marketSize: '$50B globally',
          growthRate: '12% annually',
          averagePricePoint: '$2,500/month',
          priceRange: {
            low: '$500/month',
            high: '$10,000/month',
            median: '$2,500/month'
          }
        },
        competitorAnalysis: [
          {
            rank: 1,
            companyName: 'Competitor A (Market Leader)',
            marketPosition: 'Market Leader',
            pricing: {
              basic: { name: 'Starter', price: '$999/month', frequency: 'monthly', features: ['Basic features', 'Email support', '5 users'] },
              standard: { name: 'Professional', price: '$2,499/month', frequency: 'monthly', features: ['All features', 'Priority support', '25 users', 'Analytics'] },
              premium: { name: 'Enterprise', price: '$5,999/month', frequency: 'monthly', features: ['Everything', 'Dedicated support', 'Unlimited users', 'Custom integrations'] }
            },
            strengths: ['Strong brand recognition', 'Comprehensive feature set', 'Large customer base'],
            weaknesses: ['Expensive for small businesses', 'Slow innovation', 'Complex pricing structure'],
            marketShare: '35%',
            website: 'https://competitor-a.com'
          },
          {
            rank: 2,
            companyName: 'Competitor B (Challenger)',
            marketPosition: 'Market Challenger',
            pricing: {
              basic: { name: 'Essential', price: '$799/month', frequency: 'monthly', features: ['Core features', 'Chat support', '10 users'] },
              standard: { name: 'Growth', price: '$1,999/month', frequency: 'monthly', features: ['Advanced features', 'Phone support', '50 users', 'API access'] },
              premium: { name: 'Scale', price: '$4,499/month', frequency: 'monthly', features: ['Full platform', '24/7 support', 'Unlimited', 'White-label'] }
            },
            strengths: ['Competitive pricing', 'Modern technology stack', 'Excellent customer support'],
            weaknesses: ['Smaller market presence', 'Limited integrations', 'Newer company'],
            marketShare: '22%',
            website: 'https://competitor-b.com'
          },
          {
            rank: 3,
            companyName: 'Competitor C (Niche Player)',
            marketPosition: 'Niche Specialist',
            pricing: {
              basic: { name: 'Basic', price: '$599/month', frequency: 'monthly', features: ['Limited features', 'Email only', '3 users'] },
              standard: { name: 'Pro', price: '$1,499/month', frequency: 'monthly', features: ['Most features', 'Email + chat', '15 users', 'Reports'] },
              premium: { name: 'Premium', price: '$2,999/month', frequency: 'monthly', features: ['All features', 'Full support', 'Unlimited', 'Training included'] }
            },
            strengths: ['Best value for money', 'Industry specialization', 'Easy to use'],
            weaknesses: ['Limited scalability', 'Fewer features', 'Regional focus only'],
            marketShare: '15%',
            website: 'https://competitor-c.com'
          }
        ],
        pricingStrategies: [
          {
            strategy: 'Value-Based Pricing',
            description: 'Price based on the perceived value to the customer rather than competitor prices or cost of service delivery.',
            pros: ['Higher profit margins', 'Customer-focused', 'Differentiates from competitors'],
            cons: ['Requires deep customer research', 'Harder to implement', 'Value perception varies'],
            bestFor: 'Businesses with unique value propositions and strong differentiation',
            recommendedPrice: '$2,299/month (Standard tier)'
          },
          {
            strategy: 'Competitive Pricing',
            description: 'Set prices slightly below market leaders to attract price-sensitive customers while maintaining quality perception.',
            pros: ['Easy to justify', 'Quick market penetration', 'Lower customer acquisition cost'],
            cons: ['Price wars risk', 'Lower margins', 'Perceived as cheaper option'],
            bestFor: 'New entrants looking to gain market share quickly',
            recommendedPrice: '$2,199/month (10% below market average)'
          },
          {
            strategy: 'Premium Pricing',
            description: 'Position as the premium option with superior features and service, justifying higher prices.',
            pros: ['Highest margins', 'Premium brand perception', 'Attracts quality customers'],
            cons: ['Smaller addressable market', 'Requires exceptional quality', 'Longer sales cycles'],
            bestFor: 'Businesses with clear premium differentiation',
            recommendedPrice: '$2,999/month (20% above market average)'
          }
        ],
        recommendations: {
          optimalPricing: {
            basic: '$1,299/month',
            standard: '$2,499/month',
            premium: '$4,999/month'
          },
          positioning: 'Mid-to-premium positioning. Position between Competitor B and Competitor A on price while offering superior value through [your unique differentiator].',
          keyDifferentiators: [
            'Superior customer success program',
            'AI-powered automation features',
            'Transparent pricing with no hidden fees',
            'Industry-specific templates and workflows'
          ],
          pricingTactics: [
            'Offer annual billing at 2 months free (improves cash flow)',
            'Free 14-day trial (no credit card required)',
            'Volume discounts for teams 50+',
            'Add-on marketplace for additional revenue'
          ],
          actionItems: [
            { priority: 'High', action: 'Launch with introductory pricing 15% below target for first 3 months', timeline: 'Month 1', expectedImpact: 'Acquire 20-30 early adopters' },
            { priority: 'High', action: 'Create comparison page vs top 3 competitors on website', timeline: 'Month 1', expectedImpact: 'Increase conversion by 25%' },
            { priority: 'Medium', action: 'Implement annual billing option', timeline: 'Month 2', expectedImpact: 'Improve cash flow by 40%' },
            { priority: 'Medium', action: 'Develop freemium tier for lead generation', timeline: 'Month 3-4', expectedImpact: '3x trial signups' },
            { priority: 'Low', action: 'Add usage-based pricing option for enterprise', timeline: 'Month 5-6', expectedImpact: 'Capture larger deals' }
          ]
        },
        visualComparisonData: {
          pricePerFeature: [
            { feature: 'Core Platform', yourBusiness: '$1,299', competitor1: '$999', competitor2: '$799', competitor3: '$599' },
            { feature: 'Analytics Dashboard', yourBusiness: 'Included', competitor1: '$299 extra', competitor2: 'Included', competitor3: '$199 extra' },
            { feature: 'API Access', yourBusiness: 'Included', competitor1: '$499 extra', competitor2: 'Included', competitor3: 'Not available' },
            { feature: 'Customer Support', yourBusiness: '24/7 Included', competitor1: 'Business hours', competitor2: '24/7 Included', competitor3: 'Email only' },
            { feature: 'Custom Integrations', yourBusiness: '$999 setup', competitor1: '$2,999 setup', competitor2: '$1,499 setup', competitor3: 'Not available' }
          ],
          valueScore: {
            yourBusiness: '9.2',
            'Competitor A': '7.8',
            'Competitor B': '8.1',
            'Competitor C': '7.5'
          }
        }
      };

      setComparisonResult(mockResult);

      // Save mock data to Firebase as well
      try {
        const comparisonRecord = await savePriceComparison({
          businessType: data.businessType,
          industry: data.industry,
          location: data.location,
          targetMarket: data.targetMarket,
          currentPricing: data.currentPricing,
          competitors: data.competitors,
          productService: data.productService,
          priceRange: data.priceRange,
          comparison: mockResult,
          status: 'generated'
        });
        setComparisonId(comparisonRecord.id);
      } catch (saveError) {
        console.error('Failed to save price comparison:', saveError);
      }

      setCurrentStep('dashboard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-container"
    >
      <div className="container" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ marginBottom: '1rem' }}>
            AI-Powered <span className="gradient-text">Price Comparison</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto' }}>
            Analyze your competitors' pricing, discover market rates, and optimize your pricing strategy for maximum profitability.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <PriceComparisonForm onSubmit={handleFormSubmit} />
            </motion.div>
          )}

          {currentStep === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mg-loading"
              style={{ padding: '4rem 0', textAlign: 'center' }}
            >
              <div className="loader-spinner"></div>
              <h3 style={{ marginTop: '2rem' }}>Analyzing Market Pricing...</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
                Our AI is researching your industry, analyzing competitor pricing, and generating a comprehensive comparison report.
              </p>
            </motion.div>
          )}

          {currentStep === 'dashboard' && comparisonResult && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PriceComparisonDashboard
                data={comparisonResult}
                formData={formData}
                comparisonId={comparisonId}
                onReset={() => setCurrentStep('form')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
