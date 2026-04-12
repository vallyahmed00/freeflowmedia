import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, Target, BarChart3, Star, ArrowUpRight, Globe, ShoppingCart, Package, Zap } from 'lucide-react';
import ContactModal from '../components/ContactModal';
import TrustBadges from '../components/TrustBadges';
import { getAllTestimonials, getStats } from '../services/contentService';

const defaultStats = [
  { icon: TrendingUp, value: '0', label: 'Campaigns Launched', color: '#9333EA' },
  { icon: Users, value: '0%', label: 'Client Retention Rate', color: '#A855F7' },
  { icon: Target, value: '0x', label: 'Average ROI', color: '#C084FC' },
  { icon: BarChart3, value: '0', label: 'Leads Generated', color: '#9333EA' }
];

const iconMap = {
  'TrendingUp': TrendingUp,
  'Users': Users,
  'Target': Target,
  'BarChart3': BarChart3
};

const ecommerceServices = [
  {
    icon: Globe,
    title: 'Custom Website Development',
    description: 'High-performance, conversion-optimized websites built with modern frameworks. From landing pages to complex web applications.',
    features: ['Responsive Design', 'SEO-Optimized', 'Performance Tuned', 'CMS Integration']
  },
  {
    icon: ShoppingCart,
    title: 'Shopify Development',
    description: 'Complete Shopify stores with custom themes, app integrations, and conversion-focused checkout experiences that drive sales.',
    features: ['Custom Themes', 'App Integration', 'Payment Setup', 'Inventory Management']
  },
  {
    icon: Package,
    title: 'WooCommerce Solutions',
    description: 'WordPress-powered e-commerce stores with custom functionality, payment gateways, and scalable architecture.',
    features: ['Custom Plugins', 'Multi-Currency', 'Shipping Integration', 'Analytics Dashboard']
  },
  {
    icon: Zap,
    title: 'E-commerce Automation',
    description: 'Streamline your operations with automated workflows for inventory, email marketing, abandoned carts, and customer journeys.',
    features: ['Abandoned Cart Recovery', 'Email Automation', 'Inventory Sync', 'Order Fulfillment']
  }
];

export default function Home() {
  const navigate = useNavigate();
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [testimonials, setTestimonials] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [testimonialsData, statsDataResult] = await Promise.all([
          getAllTestimonials(true),
          getStats()
        ]);
        setTestimonials(testimonialsData);
        setStatsData(statsDataResult);
      } catch (error) {
        console.error('Error loading homepage data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Build stats array from Firestore data
  const stats = statsData ? [
    { icon: TrendingUp, value: statsData.stat1?.value || '0', label: statsData.stat1?.label || '', color: '#9333EA' },
    { icon: Users, value: statsData.stat2?.value || '0', label: statsData.stat2?.label || '', color: '#A855F7' },
    { icon: Target, value: statsData.stat3?.value || '0', label: statsData.stat3?.label || '', color: '#C084FC' },
    { icon: BarChart3, value: statsData.stat4?.value || '0', label: statsData.stat4?.label || '', color: '#9333EA' }
  ] : defaultStats;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="page-container"
    >
      {/* Hero Section */}
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
            <button
              className="btn btn-primary"
              style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
              onClick={() => setIsContactOpen(true)}
            >
              Get Started
            </button>
            <button
              className="btn btn-outline"
              style={{ padding: '1rem 2rem', fontSize: '1.1rem', marginLeft: '1rem' }}
              onClick={() => navigate('/work')}
            >
              View Our Work
            </button>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '6rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Results That <span className="gradient-text">Speak</span></h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
              Real numbers from real campaigns. We let the data do the talking.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="glass-panel"
                style={{ padding: '2.5rem', textAlign: 'center' }}
              >
                <stat.icon size={40} color={stat.color} style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '3rem', marginBottom: '0.5rem', background: `linear-gradient(135deg, ${stat.color}, var(--accent-color))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {stat.value}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <TrustBadges />

      {/* Testimonials Section */}
      <section style={{ padding: '6rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Trusted by <span className="gradient-text">Industry Leaders</span></h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
              Don't just take our word for it. Here's what our clients say.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {testimonials.length > 0 ? (
              testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: index * 0.15, duration: 0.5 }}
                  className="glass-panel"
                  style={{ padding: '2.5rem', position: 'relative' }}
                >
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem' }}>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} size={20} fill="#9333EA" color="#9333EA" />
                    ))}
                  </div>
                  <p style={{ color: 'var(--text-main)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem', fontStyle: 'italic' }}>
                    "{testimonial.quote}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {testimonial.imageUrl ? (
                      <img 
                        src={testimonial.imageUrl} 
                        alt={testimonial.name}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {testimonial.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{testimonial.name}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {testimonial.role && testimonial.company 
                          ? `${testimonial.role} at ${testimonial.company}`
                          : testimonial.company || testimonial.role
                        }
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                  Testimonials coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* E-commerce & Web Development Section */}
      <section style={{ padding: '6rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Web Development & <span className="gradient-text">E-commerce</span></h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto' }}>
              Beyond marketing, we build the platforms that power your business. From stunning websites to fully-featured online stores on Shopify or WooCommerce.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {ecommerceServices.map((service, index) => (
              <motion.div
                key={index}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="glass-panel"
                style={{ padding: '2.5rem' }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: `linear-gradient(135deg, ${service.color || 'var(--primary-color)'}, var(--accent-color))`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <service.icon size={28} color="white" />
                </div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>{service.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  {service.description}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {service.features.map((feature, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      <Star size={14} fill="var(--accent-color)" color="var(--accent-color)" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '6rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="glass-panel"
            style={{ padding: '4rem', maxWidth: '800px', margin: '0 auto', background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(24, 24, 27, 0.6))', border: '1px solid rgba(147, 51, 234, 0.3)' }}
          >
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Ready to <span className="gradient-text">Dominate</span>?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '2.5rem' }}>
              Join hundreds of brands that have already transformed their digital presence with FreeFlow Media.
            </p>
            <button
              className="btn btn-primary"
              style={{ padding: '1rem 3rem', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => setIsContactOpen(true)}
            >
              Start Your Growth Journey <ArrowUpRight size={20} />
            </button>
          </motion.div>
        </div>
      </section>

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </motion.div>
  );
}
