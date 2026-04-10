import React, { useState } from 'react';
import { CreditCard, Landmark, CheckCircle, ArrowLeft } from 'lucide-react';

const PaymentGateway = ({ onSuccess, onBack }) => {
  const [method, setMethod] = useState('yoco'); // 'yoco' or 'eft'
  
  return (
    <div className="mg-card payment-card">
      <h2>Unlock Your Strategy</h2>
      <p className="mg-subtitle">Pay a once-off fee of R199.00 to generate your comprehensive marketing strategy.</p>
      
      <div className="payment-options">
        <div 
          className={`pay-option ${method === 'yoco' ? 'active' : ''}`}
          onClick={() => setMethod('yoco')}
        >
          <CreditCard size={24} />
          <span>Pay via Yoco (Card)</span>
        </div>
        
        <div 
          className={`pay-option ${method === 'eft' ? 'active' : ''}`}
          onClick={() => setMethod('eft')}
        >
          <Landmark size={24} />
          <span>Manual EFT</span>
        </div>
      </div>

      <div className="payment-details">
        {method === 'yoco' ? (
          <div className="yoco-container">
            <p><strong>Yoco Sandbox / SDK Integration</strong></p>
            <p>Since this is a Vite app, you'll render the Yoco Web SDK inline here.</p>
            {/* Real implementation will mount Yoco dropin here */}
            <button className="mg-btn yoco-btn" onClick={onSuccess}>
              Simulate Yoco Payment Success
            </button>
          </div>
        ) : (
          <div className="eft-container">
            <p><strong>EFT Instructions</strong></p>
            <div className="bank-details">
              <p>Bank: FNB</p>
              <p>Account Name: FreeFlow Media</p>
              <p>Account Number: 62000000000</p>
              <p>Branch Code: 250655</p>
              <p>Reference: STRATEGY-[YOUR_NAME]</p>
            </div>
            
            <button className="mg-btn mg-btn-primary" onClick={onSuccess}>
              I have paid via EFT
            </button>
            <p className="eft-disclaimer">*Your strategy will unlock immediately. Admin verification required.</p>
          </div>
        )}
      </div>

      <button className="mg-btn-text" onClick={onBack}>
        <ArrowLeft size={16} /> Edit Form Info
      </button>
    </div>
  );
};

export default PaymentGateway;
