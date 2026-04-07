import { Component, ErrorInfo, ReactNode } from 'react';
import { errorService } from '../../services/error.service';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0,
  };

  private resetTimer: NodeJS.Timeout | null = null;

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState(prev => ({ errorCount: prev.errorCount + 1, errorInfo }));

    errorService.handle(error, {
      operation: 'ErrorBoundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorCount: this.state.errorCount + 1,
      },
      showNotification: false,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (this.state.errorCount < 3) {
      this.resetTimer = setTimeout(() => {
        this.handleReset();
      }, 10000);
    }
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      );
      if (hasChanged && this.state.hasError) {
        this.handleReset();
      }
    }
  }

  public componentWillUnmount() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  }

  private handleReset = () => {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getErrorType(): string {
    const message = this.state.error?.message || '';
    if (message.includes('chunk')) return 'Code Update';
    if (message.includes('network')) return 'Network Error';
    if (message.includes('permission')) return 'Permission Error';
    return 'Application Error';
  }

  private getErrorSuggestion(): string {
    const message = this.state.error?.message || '';
    if (message.includes('chunk')) {
      return 'A new version of the application is available. Please refresh the page.';
    }
    if (message.includes('network')) {
      return 'Please check your internet connection and try again.';
    }
    if (message.includes('permission')) {
      return 'You may not have permission to access this resource. Please contact your administrator.';
    }
    return 'An unexpected error occurred. Please try refreshing the page.';
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.getErrorType();
      const suggestion = this.getErrorSuggestion();
      const showDetails = import.meta.env.DEV || this.state.errorCount < 2;

      return (
        <div className="min-h-screen bg-cult-opaque-black flex items-center justify-center p-4">
          <div className="bg-cult-opaque-near-black border-2 border-cult-danger p-8 max-w-3xl w-full">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-cult-danger rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-cult-danger mb-2 uppercase tracking-wide">
                  {errorType}
                </h1>
                <p className="text-cult-light-gray mb-4">
                  {suggestion}
                </p>
              </div>
            </div>

            {showDetails && this.state.error && (
              <details className="mb-6 bg-cult-opaque-black p-4 border border-cult-medium-gray">
                <summary className="cursor-pointer text-cult-white hover:text-cult-light-gray font-medium mb-2">
                  Technical Details
                </summary>
                <div className="mt-4 space-y-2">
                  <div>
                    <p className="text-cult-lighter-gray text-sm font-medium mb-1">Error Message:</p>
                    <pre className="p-3 bg-cult-opaque-near-black text-cult-danger text-xs overflow-auto rounded">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <p className="text-cult-lighter-gray text-sm font-medium mb-1">Stack Trace:</p>
                      <pre className="p-3 bg-cult-opaque-near-black text-cult-lighter-gray text-xs overflow-auto rounded max-h-48">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <p className="text-cult-lighter-gray text-sm font-medium mb-1">Component Stack:</p>
                      <pre className="p-3 bg-cult-opaque-near-black text-cult-lighter-gray text-xs overflow-auto rounded max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {this.state.errorCount >= 3 && (
              <div className="mb-6 p-4 bg-cult-danger-muted border border-cult-danger rounded">
                <p className="text-cult-danger text-sm">
                  Multiple errors detected ({this.state.errorCount}). This may indicate a persistent issue. Please contact support if this continues.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-cult-medium-gray text-cult-white hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm"
              >
                Refresh Page
              </button>
            </div>

            {import.meta.env.DEV && (
              <div className="mt-6 pt-6 border-t border-cult-medium-gray">
                <p className="text-cult-lighter-gray text-xs">
                  Development Mode: Error logs are available in the console. Type <code className="px-1 py-0.5 bg-cult-opaque-black rounded">__errorService.getRecentErrors()</code> to view recent errors.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
