import { motion } from 'framer-motion';

export default function Work() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-container"
    >
      <div className="container" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
        <h1 style={{ marginBottom: '2rem' }}>Our <span className="gradient-text">Work</span> & Process</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>1. Discovery & Audit</h3>
            <p style={{ color: 'var(--text-muted)' }}>We analyze your current presence, tear down your competitors, and identify immediate growth levers.</p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>2. Strategic Blueprint</h3>
            <p style={{ color: 'var(--text-muted)' }}>We construct a tailored strategy across SEO, Paid Social, and PPC. No templates, just tailored aggression.</p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>3. Execution & Scaling</h3>
            <p style={{ color: 'var(--text-muted)' }}>We launch, monitor daily, and optimize relentlessly. When we find the winning combination, we pour fuel on the fire.</p>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
