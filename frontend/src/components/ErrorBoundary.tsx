import { Component, ErrorInfo, ReactNode } from 'react';
import i18n from '@/i18n';
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      errorMessage: error?.message || 'Unknown runtime error',
      errorStack: errorInfo?.componentStack || error?.stack || ''
    });
  }

  public render() {
    if (this.state.hasError) {
      const showDetails = import.meta.env.DEV;
      return (
        <div className="error-container">
          <h1>{i18n.t('errorBoundary.title')}</h1>
          <p>{i18n.t('errorBoundary.message')}</p>
          {showDetails && this.state.errorMessage && (
            <pre className="error-container__detail">{this.state.errorMessage}</pre>
          )}
          {showDetails && this.state.errorStack && (
            <pre className="error-container__detail error-container__stack">{this.state.errorStack}</pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;