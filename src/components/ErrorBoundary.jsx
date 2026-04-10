import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(_error, _errorInfo) {
    console.error('ErrorBoundary caught an error:', _error, _errorInfo);
    this.setState({ error: _error, errorInfo: _errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-color)',
            padding: '2rem'
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
              We apologize for the inconvenience. An unexpected error has occurred.
            </p>
            <button
              className="btn btn-primary"
              style={{ padding: '1rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
            >
              <RefreshCw size={18} />
              Reload Page
            </button>
            {(() => {
              try {
                const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isDev && this.state.error) {
                  return (
                    <details
                      style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        textAlign: 'left'
                      }}
                    >
                      <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '1rem' }}>
                        Error Details (Development Only)
                      </summary>
                      <pre style={{ fontSize: '0.85rem', overflow: 'auto', color: '#fca5a5' }}>
                        {this.state.error.toString()}
                      </pre>
                    </details>
                  );
                }
              } catch {
                // Ignore
              }
              return null;
            })()}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
