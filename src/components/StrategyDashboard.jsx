import React from 'react';
import { ArrowLeft, Download, CheckCircle, TrendingUp, Smartphone, Lightbulb } from 'lucide-react';

const StrategyDashboard = ({ data, onReset }) => {
  return (
    <div className="mg-dashboard">
      <div className="dash-header">
        <h2>{data.businessName} Strategy Roadmap</h2>
        <button className="mg-btn mg-btn-outline" onClick={onReset}>
          <ArrowLeft size={16} /> New Strategy
        </button>
      </div>

      <div className="mg-grid">
        <div className="dash-card">
          <div className="card-header">
            <TrendingUp className="icon-accent" />
            <h3>Market Analysis & Trends</h3>
          </div>
          <p className="mb-4 text-gray">{data.marketAnalysis}</p>
          <ul className="trend-list">
            {data.viralTrends.map((trend, i) => (
              <li key={i}>
                <CheckCircle size={14} className="text-success" />
                <span>{trend}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <Lightbulb className="icon-accent" />
            <h3>Marketing Concepts</h3>
          </div>
          <div className="concept-list">
            {data.marketingConcepts.map((concept, i) => (
              <div key={i} className="concept-item">
                <span className="badge">{concept.format}</span>
                <h4>{concept.concept}</h4>
                <p><strong>Hook:</strong> {concept.hook}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-card full-width mt-2">
        <div className="card-header">
          <Smartphone className="icon-accent" />
          <h3>Generated Social Media Posts</h3>
        </div>
        <div className="instagram-grid">
          {data.instagramPosts.map((post, i) => (
            <div key={i} className="insta-card">
              <div className="insta-visual">
                <span>{post.visual}</span>
              </div>
              <div className="insta-caption">
                <p>{post.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-actions">
        <button className="mg-btn mg-btn-primary">
          <Download size={18} /> Export as Google Doc
        </button>
      </div>
    </div>
  );
};

export default StrategyDashboard;
