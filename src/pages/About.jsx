import { motion } from 'framer-motion';

export default function About() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-container"
    >
      <div className="container" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
        <h1 style={{ marginBottom: '2rem' }}>About <span className="gradient-text">Us</span></h1>
        <div className="glass-panel" style={{ padding: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.8rem' }}>Bridging the Gap</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Drift Studio bridges the gap between raw data and creative excellence. We are a collective of digital strategists, creators, and performance marketers dedicated to scaling businesses through transparent, result-oriented marketing.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
            Our mission is simple: To elevate brands beyond their perceived limits using cutting-edge digital frameworks.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
