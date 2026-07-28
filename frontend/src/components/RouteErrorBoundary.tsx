import { ReactNode, Component, ErrorInfo } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Card variant="elevated">
            <div style={{ padding: '2rem' }}>
              <h2>Something went wrong</h2>
              <p>We encountered an error while loading this page. Please try again.</p>

              {this.state.error && (
                <details style={{ marginTop: '1rem', textAlign: 'left' }}>
                  <summary>Error details</summary>
                  <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                  }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack &&
                      `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                  </pre>
                </details>
              )}

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Button variant="primary" onClick={this.handleRetry}>
                  Try Again
                </Button>
                <Button variant="secondary" onClick={() => window.history.back()}>
                  Go Back
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
