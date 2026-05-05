import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CurrencyProvider } from './context/CurrencyContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ThreeBackground from './components/ThreeBackground';
import ErrorBoundary from './components/ErrorBoundary';
import BackToTop from './components/BackToTop';
import SocialProofNotifications from './components/SocialProofNotifications';
import DemoModeBanner from './components/DemoModeBanner';
import AdminRoute from './components/AdminRoute';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Work = lazy(() => import('./pages/Work'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Automation = lazy(() => import('./pages/Automation'));
const Generator = lazy(() => import('./pages/Generator'));
const MarketingGenerator = lazy(() => import('./pages/MarketingGenerator'));
const PriceComparison = lazy(() => import('./pages/PriceComparison'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const ClientOnboarding = lazy(() => import('./pages/ClientOnboarding'));
const ContentBriefSubmission = lazy(() => import('./pages/ContentBriefSubmission'));
const Admin = lazy(() => import('./pages/Admin'));
const PipelineAdmin = lazy(() => import('./pages/PipelineAdmin'));
const XeroSettings = lazy(() => import('./pages/XeroSettings'));
const TestingGuide = lazy(() => import('./pages/TestingGuide'));
const Guides = lazy(() => import('./pages/Guides'));

// Loading component
const PageLoader = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-color)',
    gap: '1.5rem'
  }}>
    <div className="loader-spinner" style={{
      width: '50px',
      height: '50px',
      border: '3px solid rgba(147, 51, 234, 0.2)',
      borderTop: '3px solid var(--primary-color)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Loading...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const AppContent = () => {
  const location = useLocation();
  const isAppView = location.pathname === '/marketing-generator';

  // Scroll to top on route change
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="app-container">
      {/* Demo Mode Banner */}
      <DemoModeBanner />

      {/* The 3D background stays behind everything */}
      <ThreeBackground />

      {/* Navigation bar hidden on App Views */}
      {!isAppView && <Navbar />}

      <main style={isAppView ? { paddingTop: 0 } : {}}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/work" element={<Work />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/leads" element={<Generator />} />
            <Route path="/generate" element={<Generator />} />
            <Route path="/marketing-generator" element={<MarketingGenerator />} />
            <Route path="/price-comparison" element={<PriceComparison />} />
            <Route path="/onboarding" element={<ClientOnboarding />} />
            <Route path="/submit-brief" element={<ContentBriefSubmission />} />
            <Route path="/client-portal" element={<ClientPortal />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/pipeline" element={<PipelineAdmin />} />
            <Route path="/admin/xero" element={<XeroSettings />} />
            <Route path="/testing-guide" element={<TestingGuide />} />
            <Route path="/guides" element={<Suspense fallback={<PageLoader />}><Guides /></Suspense>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer hidden on App Views */}
      {!isAppView && <Footer />}

      {/* Back to Top Button */}
      <BackToTop />

      {/* Social Proof Notifications */}
      <SocialProofNotifications />
    </div>
  );
};

function App() {
  return (
    <Router>
      <CurrencyProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </CurrencyProvider>
    </Router>
  );
}

export default App;