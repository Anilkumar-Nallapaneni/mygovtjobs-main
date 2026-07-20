import { Component, ErrorInfo, ReactNode } from 'react'
import i18n from '@/i18n'

type Props = {
  children: ReactNode
  /** Shown in dev error detail — e.g. "Home page" */
  label?: string
  /** When set, shows a retry button and calls this after clearing error state */
  onRetry?: () => void
  /**
   * `app` — full-page shell (root).
   * `route` — section fallback with retry (home / job detail).
   */
  level?: 'app' | 'route'
}

type State = {
  hasError: boolean
  errorMessage?: string
  errorStack?: string
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const tag = this.props.label
      ? `[ErrorBoundary: ${this.props.label}]`
      : '[ErrorBoundary]'
    console.error(tag, error, errorInfo)
    this.setState({
      errorMessage: error?.message || 'Unknown runtime error',
      errorStack: errorInfo?.componentStack || error?.stack || '',
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: undefined, errorStack: undefined })
    this.props.onRetry?.()
  }

  public render() {
    if (!this.state.hasError) return this.props.children

    const showDetails = import.meta.env.DEV
    const level = this.props.level ?? (this.props.onRetry || this.props.label ? 'route' : 'app')

    if (level === 'route') {
      return (
        <div className="route-error-fallback" role="alert">
          <h2>{i18n.t('errorBoundary.title')}</h2>
          <p>{i18n.t('errorBoundary.message')}</p>
          {this.props.label && showDetails && (
            <p className="route-error-fallback__label">{this.props.label}</p>
          )}
          {showDetails && this.state.errorMessage && (
            <pre className="error-container__detail">{this.state.errorMessage}</pre>
          )}
          <button type="button" className="route-error-fallback__retry" onClick={this.handleRetry}>
            {i18n.t('jobsStatus.retry', { defaultValue: 'Try again' })}
          </button>
        </div>
      )
    }

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
    )
  }
}

export default ErrorBoundary
