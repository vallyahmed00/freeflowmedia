import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/config';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * Only allows access if user is logged in via Firebase Auth
 * 
 * Usage:
 * <Route path="/admin" element={
 *   <ProtectedRoute>
 *     <Admin />
 *   </ProtectedRoute>
 * } />
 */
export default function ProtectedRoute({ children, allowedEmails }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)'
      }}>
        <div className="loader-spinner"></div>
      </div>
    );
  }

  // Not authenticated - redirect to home with return URL
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check allowed emails if specified (for extra security)
  if (allowedEmails && allowedEmails.length > 0) {
    if (!allowedEmails.includes(user.email)) {
      // Authorized Firebase user but not in allowed list
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-color)',
          padding: '2rem'
        }}>
          <div className="glass-panel" style={{ padding: '3rem', maxWidth: '500px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>Access Denied</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Your account ({user.email}) is not authorized to access this area.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Contact your administrator for access.
            </p>
          </div>
        </div>
      );
    }
  }

  // Authenticated and authorized - render the protected content
  return children;
}
