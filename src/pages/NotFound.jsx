import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="page-container"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
    >
      <div className="container" style={{ textAlign: 'center' }}>
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h1 style={{ fontSize: '8rem', marginBottom: '1rem', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            404
          </h1>
        </motion.div>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{ fontSize: '2.5rem', marginBottom: '1rem' }}
        >
          Page Not Found
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem' }}
        >
          Oops! The page you're looking for has drifted into the digital void. Let's get you back on track.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}
        >
          <button
            className="btn btn-outline"
            style={{ padding: '1rem 2rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '1rem 2rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => navigate('/')}
          >
            <Home size={18} />
            Back to Home
          </button>
        </motion.div>

        {/* Floating particles decoration */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--primary-color), transparent)',
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }}
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            bottom: '20%',
            right: '10%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--accent-color), transparent)',
            filter: 'blur(50px)',
            pointerEvents: 'none'
          }}
        />
      </div>
    </motion.div>
  );
}
