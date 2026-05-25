import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getNavbarPrimaryActions } from './navbarActions';
import './Navbar.css';
import logo from '../assets/logo.svg';

const TOOLS = [
  { label: 'Price Comparison', to: '/price-comparison' },
  { label: 'Leads', to: '/leads' },
  { label: 'Automation', to: '/automation' },
  { label: 'Automations', to: '/automations' },
  { label: 'Content Ideator', to: '/marketing-generator' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const toolsRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const closeMobile = () => {
    setIsOpen(false);
    setToolsOpen(false);
  };

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    closeMobile();
  };

  const primaryActions = getNavbarPrimaryActions(user);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo-link">
          <img src={logo} alt="Drift Studio Logo" className="nav-logo-img" />
        </Link>

        <div className="menu-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>

        <ul className={`nav-links ${isOpen ? 'active' : ''}`}>
          <li><Link to="/" onClick={closeMobile}>Home</Link></li>
          <li><Link to="/about" onClick={closeMobile}>About</Link></li>
          <li><Link to="/work" onClick={closeMobile}>Work</Link></li>
          <li><Link to="/guides" onClick={closeMobile}>Guides</Link></li>
          <li><Link to="/pricing" onClick={closeMobile}>Pricing</Link></li>

          {/* Tools dropdown */}
          <li className="nav-dropdown" ref={toolsRef}>
            <button
              className="nav-dropdown-toggle"
              onClick={() => setToolsOpen(!toolsOpen)}
              aria-expanded={toolsOpen}
            >
              Tools <span className="nav-dropdown-arrow">{toolsOpen ? '▲' : '▼'}</span>
            </button>
            {toolsOpen && (
              <ul className="nav-dropdown-menu">
                {TOOLS.map(({ label, to }) => (
                  <li key={to}>
                    <Link to={to} onClick={closeMobile}>{label}</Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {primaryActions.map((item) => (
            <li key={item.label}>
              {item.action === 'signOut' ? (
                <button type="button" className={item.className} onClick={handleSignOut}>
                  {item.label}
                </button>
              ) : (
                <Link to={item.to} className={item.className} onClick={closeMobile}>
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
