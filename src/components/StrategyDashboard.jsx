import React, { useState } from 'react';
import { ArrowLeft, Download, CheckCircle, TrendingUp, Smartphone, Lightbulb, FileText, Mail } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const StrategyDashboard = ({ data, formData, strategyId, onReset }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null); // null, 'success', 'error'
  const [isEmailing, setIsEmailing] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);
    setExportStatus(null);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFillColor(147, 51, 234);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Marketing Strategy', margin, 25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(data.businessName || 'Your Business', margin, 33);

      y = 55;
      doc.setTextColor(51, 51, 51);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${new Date().toLocaleDateString()} | Drift Studio`, margin, y);
      y += 10;

      // Market Analysis
      doc.setTextColor(147, 51, 234);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Market Analysis & Trends', margin, y);
      y += 3;
      doc.setDrawColor(147, 51, 234);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      doc.setTextColor(51, 51, 51);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const marketAnalysisLines = doc.splitTextToSize(data.marketAnalysis || '', pageWidth - 2 * margin);
      doc.text(marketAnalysisLines, margin, y);
      y += marketAnalysisLines.length * 5 + 5;

      // Viral Trends
      doc.setTextColor(147, 51, 234);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Viral Trends:', margin, y);
      y += 7;

      doc.setTextColor(51, 51, 51);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      (data.viralTrends || []).forEach((trend, i) => {
        const trendLines = doc.splitTextToSize(`${i + 1}. ${trend}`, pageWidth - 2 * margin);
        if (y + trendLines.length * 5 > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(trendLines, margin, y);
        y += trendLines.length * 5 + 3;
      });

      // Marketing Concepts
      y += 5;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(147, 51, 234);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Marketing Concepts', margin, y);
      y += 3;
      doc.setDrawColor(147, 51, 234);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      (data.marketingConcepts || []).forEach((concept, i) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        // Concept box background
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(margin, y - 5, pageWidth - 2 * margin, 30, 3, 3, 'F');
        
        doc.setTextColor(147, 51, 234);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${concept.concept || ''}`, margin + 5, y + 3);
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Format: ${concept.format || ''}  |  Hook: ${concept.hook || ''}`, margin + 5, y + 12);
        
        y += 35;
      });

      // Social Media Posts
      y += 5;
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(147, 51, 234);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Social Media Posts', margin, y);
      y += 3;
      doc.setDrawColor(147, 51, 234);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      (data.instagramPosts || []).forEach((post, i) => {
        if (y > 230) {
          doc.addPage();
          y = 20;
        }
        
        // Post box
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(margin, y - 5, pageWidth - 2 * margin, 40, 3, 3, 'FD');
        
        doc.setTextColor(107, 33, 168);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Post ${i + 1}`, margin + 5, y + 3);
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const visualLines = doc.splitTextToSize(`Visual: ${post.visual || ''}`, pageWidth - 2 * margin - 10);
        doc.text(visualLines, margin + 5, y + 10);
        y += visualLines.length * 4 + 5;
        
        const captionLines = doc.splitTextToSize(`Caption: ${(post.caption || '').substring(0, 100)}...`, pageWidth - 2 * margin - 10);
        doc.text(captionLines, margin + 5, y);
        y += captionLines.length * 4 + 10;
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated by Drift Studio - Content Ideator | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          285,
          { align: 'center' }
        );
        doc.text('https://freeflowmedia.com', pageWidth / 2, 290, { align: 'center' });
      }

      // Save PDF
      const fileName = `${(data.businessName || 'Strategy').replace(/\s+/g, '-')}-Marketing-Strategy.pdf`;
      doc.save(fileName);

      setExportStatus('success');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error('PDF export failed:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const emailStrategy = async () => {
    if (!formData?.email) {
      alert('Please provide your email in the form to receive the strategy via email.');
      return;
    }

    setIsEmailing(true);

    try {
      const response = await fetch('https://us-central1-freeflow-media.cloudfunctions.net/deliverStrategyWithPDF', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: data,
          userEmail: formData.email,
          userName: formData.name,
          businessName: data.businessName,
          strategyId: strategyId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      const result = await response.json();
      if (result.success) {
        alert(`✅ Strategy emailed to ${formData.email}!`);
      }
    } catch (error) {
      console.error('Email delivery failed:', error);
      alert('Failed to send email. Please try again or download the PDF manually.');
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <div className="mg-dashboard">
      <div className="dash-header">
        <h2>{data.businessName} Strategy Roadmap</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="mg-btn mg-btn-outline" 
            onClick={emailStrategy}
            title="Email this strategy"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Mail size={16} /> Email
          </button>
          <button className="mg-btn mg-btn-outline" onClick={onReset}>
            <ArrowLeft size={16} /> New Strategy
          </button>
        </div>
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
        <button 
          className="mg-btn mg-btn-primary" 
          onClick={exportToPDF}
          disabled={isExporting}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FileText size={18} /> 
          {isExporting ? 'Generating PDF...' : 'Download PDF'}
        </button>
        <button 
          className="mg-btn mg-btn-outline" 
          onClick={emailStrategy}
          disabled={isEmailing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Mail size={16} />
          {isEmailing ? 'Sending Email...' : 'Email Strategy'}
        </button>
        {exportStatus === 'success' && (
          <span style={{ color: '#22c55e', marginLeft: '1rem' }}>✓ PDF downloaded!</span>
        )}
        {exportStatus === 'error' && (
          <span style={{ color: '#ef4444', marginLeft: '1rem' }}>Export failed. Please try again.</span>
        )}
      </div>
    </div>
  );
};

export default StrategyDashboard;
