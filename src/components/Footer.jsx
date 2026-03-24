export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div>
            <h3 className="gradient-text">FreeFlow Media</h3>
            <p className="footer-text">Command the Digital Space. We engineer growth for brands ready to dominate their market.</p>
          </div>
          <div>
            <h4>Services</h4>
            <ul>
              <li>SEO Optimization</li>
              <li>Social Media Management</li>
              <li>PPC Campaigns</li>
              <li>Automation Systems</li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li>About Us</li>
              <li>Our Work</li>
              <li>Pricing</li>
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
