import { useState } from 'react';
import { Sparkles, ArrowRight, Plus, X, TrendingUp } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

export default function PriceComparisonForm({ onSubmit }) {
  const { currency, setCurrency } = useCurrency();
  const [formData, setFormData] = useState({
    businessType: '',
    industry: '',
    location: '',
    targetMarket: '',
    productService: '',
    priceRange: '',
    currentPricing: '',
    targetGoal: '',
    currency: currency, // Use global currency
    competitors: ['']
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addCompetitor = () => {
    setFormData(prev => ({
      ...prev,
      competitors: [...prev.competitors, '']
    }));
  };

  const removeCompetitor = (index) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index)
    }));
  };

  const updateCompetitor = (index, value) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.map((comp, i) => i === index ? value : comp)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.businessType || !formData.industry) {
      alert("Please fill in your Business Type and Industry.");
      return;
    }
    // Filter out empty competitors
    const cleanedData = {
      ...formData,
      competitors: formData.competitors.filter(c => c.trim())
    };
    onSubmit(cleanedData);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <TrendingUp size={48} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Business & Market Information</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Tell us about your business and competitors. Our AI will generate a comprehensive price comparison report.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Business Type *
            </label>
            <input
              required
              name="businessType"
              placeholder="e.g. SaaS Platform, Marketing Agency"
              value={formData.businessType}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Industry *
            </label>
            <input
              required
              name="industry"
              placeholder="e.g. Technology, Healthcare, Retail"
              value={formData.industry}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              💱 Currency
            </label>
            <select
              name="currency"
              value={formData.currency}
              onChange={(e) => {
                handleChange(e);
                // Update global currency when changed in form
                setCurrency(e.target.value);
              }}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ZAR" style={{ background: '#1a1a1a' }}>🇿 ZAR - South African Rand (R)</option>
              <option value="USD" style={{ background: '#1a1a1a' }}>🇺🇸 USD - US Dollar ($)</option>
            </select>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              All prices will be displayed in your selected currency
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Location
            </label>
            <input
              name="location"
              placeholder="e.g. South Africa, United States"
              value={formData.location}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Product/Service Description
          </label>
          <textarea
            name="productService"
            placeholder="Describe your main product or service..."
            rows="3"
            value={formData.productService}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Current Pricing (if any)
            </label>
            <input
              name="currentPricing"
              placeholder="e.g. $99/month, R5,000/project"
              value={formData.currentPricing}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Target Price Range
            </label>
            <input
              name="priceRange"
              placeholder="e.g. $500-$5,000/month"
              value={formData.priceRange}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            🎯 Target Goal (optional)
          </label>
          <input
            name="targetGoal"
            placeholder="e.g. 20 customers a day, R50,000/month revenue, 100 leads per week"
            value={formData.targetGoal}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.75rem', background: 'rgba(147, 51, 234, 0.05)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '8px', color: 'white', outline: 'none' }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Define your business goal. AI will factor this into pricing recommendations and action items.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Known Competitors (optional)
          </label>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Add your known competitors. If left blank, our AI will identify them automatically.
          </p>

          {formData.competitors.map((competitor, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                placeholder={`Competitor ${index + 1} name`}
                value={competitor}
                onChange={(e) => updateCompetitor(index, e.target.value)}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
              />
              {formData.competitors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCompetitor(index)}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={18} color="#ef4444" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addCompetitor}
            style={{ background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '8px', padding: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'white', marginTop: '0.5rem' }}
          >
            <Plus size={16} /> Add Competitor
          </button>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} /> Generate Price Comparison
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
