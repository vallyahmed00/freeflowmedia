import { useState } from 'react';
import { ArrowLeft, FileText, Download, TrendingUp, DollarSign, BarChart3, Target, CheckCircle, AlertCircle, Lightbulb, Users } from 'lucide-react';
import { exportPriceComparisonAsPDF } from '../services/priceComparisonService';

export default function PriceComparisonDashboard({ data, formData, comparisonId, onReset }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportPriceComparisonAsPDF(data);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'competitors', label: 'Competitors', icon: Users },
    { id: 'strategies', label: 'Strategies', icon: Target },
    { id: 'recommendations', label: 'Actions', icon: Lightbulb }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>{data.reportTitle}</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Generated on {new Date(data.generatedDate).toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FileText size={16} />
            {isExporting ? 'Exporting...' : 'Export Report'}
          </button>
          <button onClick={onReset} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> New Analysis
          </button>
        </div>
      </div>

      {/* Market Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(147, 51, 234, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
              <DollarSign size={24} color="var(--accent-color)" />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Avg. Market Price</span>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {data.marketOverview?.averagePricePoint || 'N/A'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Per month average</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
              <TrendingUp size={24} color="#22c55e" />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Market Growth</span>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {data.marketOverview?.growthRate || 'N/A'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Annual growth rate</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
              <BarChart3 size={24} color="#3b82f6" />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Market Size</span>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {data.marketOverview?.marketSize || 'N/A'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total addressable market</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
              <Users size={24} color="#f59e0b" />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Competitors</span>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {data.competitorAnalysis?.length || 0}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Analyzed in report</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: activeTab === tab.id ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeTab === tab.id ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'competitors' && <CompetitorsTab competitors={data.competitorAnalysis || []} />}
        {activeTab === 'strategies' && <StrategiesTab strategies={data.pricingStrategies || []} />}
        {activeTab === 'recommendations' && <RecommendationsTab recommendations={data.recommendations || {}} />}
      </div>
    </div>
  );
}

function OverviewTab({ data }) {
  return (
    <div>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Market Overview</h3>
      
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ color: 'var(--accent-color)', marginBottom: '0.75rem' }}>Price Range Analysis</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Low End</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
              {data.marketOverview?.priceRange?.low || 'N/A'}
            </p>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Median</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {data.marketOverview?.priceRange?.median || 'N/A'}
            </p>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>High End</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {data.marketOverview?.priceRange?.high || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {data.visualComparisonData?.pricePerFeature && (
        <div>
          <h4 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>Feature-by-Feature Comparison</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(147, 51, 234, 0.1)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid rgba(147, 51, 234, 0.3)' }}>Feature</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid rgba(147, 51, 234, 0.3)', color: 'var(--accent-color)' }}>Your Business</th>
                  {Object.keys(data.visualComparisonData.pricePerFeature[0] || {})
                    .filter(key => !['feature', 'yourBusiness'].includes(key))
                    .map(key => (
                      <th key={key} style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid rgba(147, 51, 234, 0.3)' }}>
                        {key.replace(/(\d)/g, ' $1').trim()}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {data.visualComparisonData.pricePerFeature.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{row.feature}</td>
                    <td style={{ padding: '1rem', color: 'var(--accent-color)', fontWeight: 600 }}>{row.yourBusiness}</td>
                    {Object.entries(row)
                      .filter(([key]) => !['feature', 'yourBusiness'].includes(key))
                      .map(([, value], i) => (
                        <td key={i} style={{ padding: '1rem', color: 'var(--text-muted)' }}>{value}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.visualComparisonData?.valueScore && (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>Value Score Comparison</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(data.visualComparisonData.valueScore).map(([business, score]) => (
              <div key={business} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{business}</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: parseFloat(score) >= 8 ? '#22c55e' : parseFloat(score) >= 7 ? '#f59e0b' : '#ef4444' }}>
                  {score}/10
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompetitorsTab({ competitors }) {
  return (
    <div>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Competitor Analysis</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {competitors.map((competitor, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ background: 'var(--primary-color)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    #{competitor.rank}
                  </span>
                  <h4 style={{ fontSize: '1.25rem', margin: 0 }}>{competitor.companyName}</h4>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Market Position: <span style={{ color: 'white', fontWeight: 600 }}>{competitor.marketPosition}</span>
                  {competitor.marketShare && ` • Market Share: ${competitor.marketShare}`}
                </p>
              </div>
            </div>

            {/* Pricing Tiers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {Object.entries(competitor.pricing || {}).map(([tier, details]) => (
                details && (
                  <div key={tier} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                      {tier}
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>
                      {details.price}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                      {details.frequency}
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {details.features.map((feature, j) => (
                        <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                          <CheckCircle size={12} color="#22c55e" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}
            </div>

            {/* Strengths & Weaknesses */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h5 style={{ color: '#22c55e', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} /> Strengths
                </h5>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {competitor.strengths?.map((s, j) => (
                    <li key={j} style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 style={{ color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} /> Weaknesses
                </h5>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {competitor.weaknesses?.map((w, j) => (
                    <li key={j} style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>• {w}</li>
                  ))}
                </ul>
              </div>
            </div>

            {competitor.website && (
              <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                <strong>Website:</strong>{' '}
                <a href={competitor.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)' }}>
                  {competitor.website}
                </a>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategiesTab({ strategies }) {
  return (
    <div>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Pricing Strategies</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {strategies.map((strategy, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{i + 1}. {strategy.strategy}</h4>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{strategy.description}</p>
            
            {strategy.recommendedPrice && (
              <div style={{ background: 'rgba(147, 51, 234, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Recommended Price</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                  {strategy.recommendedPrice}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h5 style={{ color: '#22c55e', marginBottom: '0.5rem' }}>Pros</h5>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {strategy.pros?.map((pro, j) => (
                    <li key={j} style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <CheckCircle size={12} color="#22c55e" style={{ display: 'inline', marginRight: '0.5rem' }} />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Cons</h5>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {strategy.cons?.map((con, j) => (
                    <li key={j} style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <AlertCircle size={12} color="#ef4444" style={{ display: 'inline', marginRight: '0.5rem' }} />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <strong>Best For:</strong> {strategy.bestFor}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationsTab({ recommendations }) {
  return (
    <div>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Recommendations & Action Plan</h3>
      
      {/* Optimal Pricing */}
      {recommendations.optimalPricing && (
        <div style={{ background: 'rgba(147, 51, 234, 0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="var(--accent-color)" />
            Recommended Pricing Structure
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Basic</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                {recommendations.optimalPricing.basic}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Standard</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {recommendations.optimalPricing.standard}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Premium</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {recommendations.optimalPricing.premium}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Positioning */}
      {recommendations.positioning && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>Market Positioning</h4>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{recommendations.positioning}</p>
        </div>
      )}

      {/* Key Differentiators */}
      {recommendations.keyDifferentiators && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>Key Differentiators</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {recommendations.keyDifferentiators.map((diff, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <CheckCircle size={18} color="#22c55e" style={{ marginTop: '2px' }} />
                <span>{diff}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pricing Tactics */}
      {recommendations.pricingTactics && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>Pricing Tactics</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {recommendations.pricingTactics.map((tactic, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Lightbulb size={18} color="#f59e0b" style={{ marginTop: '2px' }} />
                <span>{tactic}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {recommendations.actionItems && (
        <div>
          <h4 style={{ marginBottom: '1rem' }}>Action Items</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recommendations.actionItems.map((action, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${action.priority === 'High' ? '#ef4444' : action.priority === 'Medium' ? '#f59e0b' : '#22c55e'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <p style={{ fontWeight: 600, flex: 1 }}>{action.action}</p>
                  <span style={{
                    background: action.priority === 'High' ? 'rgba(239, 68, 68, 0.2)' : action.priority === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: action.priority === 'High' ? '#ef4444' : action.priority === 'Medium' ? '#f59e0b' : '#22c55e',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '99px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    marginLeft: '1rem'
                  }}>
                    {action.priority}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <strong>Timeline:</strong> {action.timeline}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <strong>Expected Impact:</strong> {action.expectedImpact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
