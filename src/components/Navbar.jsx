import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, MessageCircle, Phone, Mail } from 'lucide-react';
import { useState } from 'react';
import logo from '../assets/logo.png';
import ContactModal from './ContactModal';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const location = useLocation();

  const links = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Our Work', path: '/work' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Automation', path: '/automation' },
  ];

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center' }}>
          <motion.img 
            src={logo} 
            alt="FreeFlow Media Logo" 
            animate={{ 
              y: [0, -4, 0],
              scale: [1, 1.02, 1],
              filter: [
                'contrast(1.2) drop-shadow(0 0 0px rgba(147,51,234,0))', 
                'contrast(1.2) drop-shadow(0 0 15px rgba(147,51,234,0.6))', 
                'contrast(1.2) drop-shadow(0 0 0px rgba(147,51,234,0))'
              ]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ 
              height: '110px', 
              mixBlendMode: 'screen', 
              objectFit: 'contain' 
            }} 
          />
        </Link>
        <div className="desktop-nav">
          {links.map((link) => (
            <Link key={link.path} to={link.path} className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}>
              {link.name}
            </Link>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
            <a href="https://wa.me/2782000000" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a href="tel:+2782000000" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
              <Phone size={16} /> Call
            </a>
            <a href="mailto:test@freeflowmedia.com" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
              <Mail size={16} /> Email
            </a>
            <button onClick={() => setIsContactOpen(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              Enquire
            </button>
          </div>
        </div>
        <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X color="white" /> : <Menu color="white" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-nav"
        >
          {links.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className="nav-link"
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <a href="https://wa.me/2782000000" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
              <MessageCircle size={18} /> WhatsApp
            </a>
            <a href="tel:+2782000000" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
              <Phone size={18} /> Call
            </a>
            <a href="mailto:test@freeflowmedia.com" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
              <Mail size={18} /> Email
            </a>
            <button onClick={() => setIsContactOpen(true)} className="btn btn-primary" style={{ padding: '1rem' }}>Enquire</button>
          </div>
        </motion.div>
      )}

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </nav>
  );
}
