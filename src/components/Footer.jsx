import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h3 className="gradient-text" style={{ cursor: 'pointer' }}>FreeFlow Media</h3>
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
          <p>&copy; {new Date().getFullYear()} FreeFlow Media. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
