import { Component, ErrorInfo, ReactNode } from 'react'
import i18n from '@/i18n'

type Props = {
  children: ReactNode
  /** Shown in dev error detail — e.g. "Home page" */
  label?: string
  onRetry?: () => void
}

type State = {
  hasError: boolean
  errorMessage?: string
}

export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[RouteErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, errorInfo)
    this.setState({ errorMessage: error?.message || 'Unknown error' })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: undefined })
    this.props.onRetry?.()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const showDetails = import.meta.env.DEV
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
}
