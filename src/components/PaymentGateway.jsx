import { useState } from 'react';
import { Landmark, ArrowLeft, Upload } from 'lucide-react';
import { submitPaymentRequest } from '../services/paymentService';
import toast from 'react-hot-toast';

const PaymentGateway = ({ onSuccess, onBack, formData }) => {
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProofFiles, setPaymentProofFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!paymentReference.trim()) {
      toast.error('Please enter your payment reference.');
      return;
    }
    if (!paymentProofFiles.length) {
      toast.error('Please upload your proof of payment.');
      return;
    }
    setSubmitting(true);
    try {
      await submitPaymentRequest({
        paymentReference,
        clientEmail: formData?.email || '',
        clientName: formData?.name || '',
        businessType: formData?.businessType || '',
      });
      onSuccess({ pending: true });
    } catch {
      toast.error('Submission failed — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mg-card payment-card">
      <h2>Unlock Your Strategy</h2>
      <p className="mg-subtitle">Pay a once-off fee of R199.00 via EFT to generate your comprehensive marketing strategy.</p>
      
      <div className="payment-options">
        <div className="pay-option active">
          <Landmark size={24} />
          <span>Manual EFT</span>
        </div>
      </div>

      <div className="payment-details">
        <div className="eft-container">
          <p><strong>EFT Instructions</strong></p>
          <div className="bank-details">
            <p>Bank: FNB</p>
            <p>Account Name: Drift Studio</p>
            <p>Account Number: 62000000000</p>
            <p>Branch Code: 250655</p>
            <p>Reference: STRATEGY-[YOUR_NAME]</p>
          </div>

          <label className="mg-label" htmlFor="payment-reference">Payment Reference</label>
          <input
            id="payment-reference"
            className="mg-input"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="e.g. STRATEGY-AHMED"
          />

          <label className="mg-label" htmlFor="payment-proof">Proof of Payment</label>
          <label className="mg-file-upload" htmlFor="payment-proof">
            <Upload size={18} />
            <span>{paymentProofFiles.length ? `${paymentProofFiles.length} file selected` : 'Upload proof of payment'}</span>
          </label>
          <input
            id="payment-proof"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setPaymentProofFiles(Array.from(e.target.files || []))}
            style={{ display: 'none' }}
          />
          
          <button
            className="mg-btn mg-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'I have paid via EFT — Submit for Verification'}
          </button>
          <p className="eft-disclaimer">*Your payment will be verified by our team. You will receive an access code once confirmed.</p>
        </div>
      </div>

      <button className="mg-btn-text" onClick={onBack}>
        <ArrowLeft size={16} /> Edit Form Info
      </button>
    </div>
  );
};

export default PaymentGateway;
