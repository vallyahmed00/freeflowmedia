import { motion } from 'framer-motion';

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="page-container"
    >
      <section className="hero-section">
        <div className="container hero-content">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Command the <span className="gradient-text">Digital Space</span>.
          </motion.h1>
          <motion.p 
            className="hero-subtitle"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            At FreeFlow Media, we don't just follow trends—we set them. Through data-driven SEO, scroll-stopping social media, and high-converting PPC campaigns, we engineer growth for brands ready to dominate.
          </motion.p>
          <motion.div 
            className="hero-actions"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>Get Started</button>
            <button className="btn btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.1rem', marginLeft: '1rem' }}>View Our Work</button>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
