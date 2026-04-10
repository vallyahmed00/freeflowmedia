import React, { useState } from 'react';
import { Sparkles, ArrowRight, Upload, Link2, FileText, Image, Video, FolderOpen } from 'lucide-react';

const MarketingForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    businessType: '',
    targetAudience: '',
    currentMarketing: '',
    businessCountry: '',
    contentCategories: '',
    inStoreSpecials: '',
    promoCode: '', // Optional bypass
    marketingMaterialsLink: '', // Google Drive or other link
    marketingMaterialsFiles: [] // Uploaded files
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.businessType || !formData.targetAudience) {
      alert("Please fill in your Business Type and Target Audience.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="mg-card form-card">
      <h2>Tell us about your business</h2>
      <form onSubmit={handleSubmit} className="mg-form">
        <div className="mg-form-group">
          <label>Business Type</label>
          <input 
            name="businessType" 
            placeholder="e.g. Luxury Real Estate Agency" 
            value={formData.businessType} 
            onChange={handleChange} 
            required 
          />
        </div>
        
        <div className="mg-form-group">
          <label>Target Audience</label>
          <input 
            name="targetAudience" 
            placeholder="e.g. High net worth individuals looking for summer homes" 
            value={formData.targetAudience} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="mg-form-group">
          <label>Current Marketing Efforts</label>
          <textarea 
            name="currentMarketing" 
            placeholder="What are you currently doing? (e.g. Instagram reels, cold email)" 
            value={formData.currentMarketing} 
            onChange={handleChange} 
          />
        </div>

        <div className="mg-row">
          <div className="mg-form-group">
            <label>Country</label>
            <input
              name="businessCountry"
              placeholder="e.g. South Africa"
              value={formData.businessCountry}
              onChange={handleChange}
            />
          </div>

          <div className="mg-form-group">
            <label>Promo Code</label>
            <input
              name="promoCode"
              placeholder="Got a code?"
              value={formData.promoCode}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Marketing Materials Section */}
        <div className="mg-form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FolderOpen size={18} color="var(--accent-color)" />
            Marketing Materials <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.85rem' }}>(Optional)</span>
          </label>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Upload your existing marketing assets, brand guidelines, logos, or provide a Google Drive link so we can better understand your brand.
          </p>

          {/* Google Drive / Link Input */}
          <div className="mg-form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link2 size={14} />
              Google Drive or Cloud Storage Link
            </label>
            <input
              name="marketingMaterialsLink"
              placeholder="https://drive.google.com/..."
              value={formData.marketingMaterialsLink}
              onChange={handleChange}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)' }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Supported: Google Drive, Dropbox, OneDrive, or any shareable link
            </p>
          </div>

          {/* File Upload */}
          <div className="mg-form-group">
            <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={14} />
              Or Upload Files Directly
            </label>
            <div
              className="file-upload-area"
              style={{
                border: '2px dashed rgba(255,255,255,0.15)',
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'rgba(255,255,255,0.02)'
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--primary-color)';
                e.currentTarget.style.background = 'rgba(147, 51, 234, 0.1)';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                const files = Array.from(e.dataTransfer.files);
                setFormData(prev => ({ ...prev, marketingMaterialsFiles: [...prev.marketingMaterialsFiles, ...files] }));
              }}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Drag & drop files here, or <span style={{ color: 'var(--accent-color)' }}>browse</span>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                PNG, JPG, PDF, DOC up to 10MB each
              </p>
              <input
                id="fileInput"
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setFormData(prev => ({ ...prev, marketingMaterialsFiles: [...prev.marketingMaterialsFiles, ...files] }));
                }}
              />
            </div>

            {/* Show uploaded files */}
            {formData.marketingMaterialsFiles.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {formData.marketingMaterialsFiles.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {file.type?.includes('image') ? <Image size={16} color="var(--accent-color)" /> :
                       file.type?.includes('video') ? <Video size={16} color="var(--accent-color)" /> :
                       <FileText size={16} color="var(--accent-color)" />}
                      <span style={{ fontSize: '0.85rem' }}>{file.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          marketingMaterialsFiles: prev.marketingMaterialsFiles.filter((_, i) => i !== index)
                        }));
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="mg-btn mg-btn-primary">
          <Sparkles size={18} /> Next Step
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
};

export default MarketingForm;
