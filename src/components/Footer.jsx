import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h3 className="gradient-text" style={{ cursor: 'pointer' }}>Drift Studio</h3>
            </Link>
            <p className="footer-text">Command the Digital Space. We engineer growth for brands ready to dominate their market.</p>
          </div>
          <div>
            <h4>Services</h4>
            <ul>
              <li><Link to="/pricing">SEO Optimization</Link></li>
              <li><Link to="/pricing">Social Media Management</Link></li>
              <li><Link to="/pricing">PPC Campaigns</Link></li>
              <li><Link to="/automation">Automation Systems</Link></li>
              <li><Link to="/pricing">Web Development</Link></li>
              <li><Link to="/pricing">Shopify Stores</Link></li>
              <li><Link to="/pricing">WooCommerce</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/work">Our Work</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
              <li><Link to="/client-portal">Client Portal</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Drift Studio. All rights reserved.</p>
          <Link to="/admin" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem',
            color: 'var(--text-muted)', 
            fontSize: '0.85rem', 
            textDecoration: 'none', 
            opacity: 0.6, 
            transition: 'opacity 0.3s, color 0.3s',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)'
          }} 
                onMouseEnter={(e) => { e.target.style.opacity = 1; e.target.style.color = 'var(--primary-color)'; }}
                onMouseLeave={(e) => { e.target.style.opacity = 0.6; e.target.style.color = 'var(--text-muted)'; }}>
            <Settings size={14} />
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
