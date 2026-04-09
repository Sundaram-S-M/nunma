
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'rgba(4, 4, 87, 0.02)',
          borderRadius: '3rem',
          border: '2px dashed rgba(4, 4, 87, 0.1)',
          textAlign: 'center',
          margin: '2rem'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1.5rem',
            filter: 'drop-shadow(0 0 20px rgba(194, 245, 117, 0.4))'
          }}>
            🛰️
          </div>
          <h2 style={{
            color: '#040457',
            fontFamily: 'unset',
            fontSize: '2rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem'
          }}>
            Module Signal Lost
          </h2>
          <p style={{
            color: 'rgba(4, 4, 87, 0.5)',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '2rem',
            maxWidth: '400px',
            lineHeight: 1.6
          }}>
            Something went wrong while loading this infrastructure module. Our systems have logged the incident.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '1rem 2rem',
              background: '#040457',
              color: '#c2f575',
              border: 'none',
              borderRadius: '1.5rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: '0 15px 30px rgba(4, 4, 87, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(4, 4, 87, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 15px 30px rgba(4, 4, 87, 0.2)';
            }}
          >
            Re-initiate System
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <div style={{
              marginTop: '4rem',
              textAlign: 'left',
              width: '100%',
              maxWidth: '800px',
              background: '#03031f',
              padding: '1.5rem',
              borderRadius: '1.5rem',
              overflow: 'auto',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <p style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Debug Trace</p>
              <pre style={{ color: '#888', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                {this.state.error?.toString()}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
