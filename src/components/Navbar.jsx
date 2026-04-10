import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import logo from '../assets/logo.png'; // This imports your actual logo file

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* LOGO SECTION - Now using your PNG image */}
        <Link to="/" className="nav-logo-link">
          <img src={logo} alt="FreeFlow Media Logo" className="nav-logo-img" />
        </Link>

        <div className="menu-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>

        <ul className={`nav-links ${isOpen ? 'active' : ''}`}>
          <li><Link to="/" onClick={() => setIsOpen(false)}>Home</Link></li>
          <li><Link to="/about" onClick={() => setIsOpen(false)}>About</Link></li>
          <li><Link to="/work" onClick={() => setIsOpen(false)}>Work</Link></li>
          <li><Link to="/automation" onClick={() => setIsOpen(false)}>Automation</Link></li>
          <li><Link to="/pricing" onClick={() => setIsOpen(false)}>Pricing</Link></li>
          <li><Link to="/leads" onClick={() => setIsOpen(false)}>Leads</Link></li>
          <li><Link to="/client-portal" onClick={() => setIsOpen(false)}>Client Portal</Link></li>
            <li>
            <Link to="/marketing-generator" className="nav-cta" onClick={() => setIsOpen(false)}>
              Content Ideator
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;