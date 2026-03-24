import { motion } from 'framer-motion';
import { Settings, Zap, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';

export default function Automation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-container"
    >
      <div className="container" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <h1 style={{ marginBottom: '1rem' }}>Business <span className="gradient-text">Automations</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '800px', margin: '0 auto' }}>
            Stop trading time for money. We build intelligent, invisible systems that nurture leads, follow up with clients, and scale your operations 24/7.
          </p>
        </div>

        {/* Why Automation Section */}
        <div style={{ marginBottom: '5rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Why AI & Automation Save You Money</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ background: 'rgba(147, 51, 234, 0.1)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Clock color="var(--primary-color)" size={24} />
              </div>
              <h3 style={{ marginBottom: '1rem' }}>Zero Staffing Bottlenecks</h3>
              <p style={{ color: 'var(--text-muted)' }}>Automations don't sleep, don't take holidays, and never miss a follow-up. A perfectly executed sequence can do the work of 3 full-time data entry employees.</p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ background: 'rgba(147, 51, 234, 0.1)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Zap color="var(--primary-color)" size={24} />
              </div>
              <h3 style={{ marginBottom: '1rem' }}>Speed to Lead</h3>
              <p style={{ color: 'var(--text-muted)' }}>The average lead goes cold in 5 minutes. Our systems trigger instantaneous SMS or email replies the second a prospect submits a form, capturing the highest possible intent.</p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ background: 'rgba(147, 51, 234, 0.1)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <DollarSign color="var(--primary-color)" size={24} />
              </div>
              <h3 style={{ marginBottom: '1rem' }}>Long-Term ROI</h3>
              <p style={{ color: 'var(--text-muted)' }}>You pay for the setup once, but the system generates revenue endlessly. By rescuing lost leads and automating onboarding, the ROI compounds month over month.</p>
            </div>

          </div>
        </div>

        {/* Use Cases Section */}
        <div className="glass-panel" style={{ padding: '4rem 2rem', border: '1px solid var(--primary-color)', background: 'linear-gradient(135deg, rgba(24,24,27,0.8), rgba(147,51,234,0.05))' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>How We Transform Your Business</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '3rem' }}>Real-world applications of our automation engineering.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ marginTop: '0.25rem' }}><Users color="var(--accent-color)" size={24} /></div>
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>Intelligent Lead Nurturing</h3>
                <p style={{ color: 'var(--text-muted)' }}>When a user downloads your lead magnet or fills a localized Facebook form, they instantly enter a 7-day automated SMS and Email sequence pushing them to book a call.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ marginTop: '0.25rem' }}><Settings color="var(--accent-color)" size={24} /></div>
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>Seamless Onboarding</h3>
                <p style={{ color: 'var(--text-muted)' }}>When a client pays their invoice, the system automatically creates their project in your CRM, loops them into a Slack channel, and sends them a welcome packet. Zero manual clicks required.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ marginTop: '0.25rem' }}><TrendingUp color="var(--accent-color)" size={24} /></div>
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>Review Generation Engine</h3>
                <p style={{ color: 'var(--text-muted)' }}>Automatically text clients 24 hours after a successful service asking for a Google Review, rapidly boosting your local SEO dominance without lifting a finger.</p>
              </div>
            </div>

          </div>
        </div>

        {/* CTA Section */}
        <div style={{ textAlign: 'center', marginTop: '5rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Ready to stop doing manual data entry?</h2>
          <button className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>Audit My Systems For Free</button>
        </div>

      </div>
    </motion.div>
  );
}
