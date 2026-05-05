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
        <div className="min-h-screen bg-cult-surface-inset flex items-center justify-center p-6">
          <div className="bg-cult-surface border border-cult-border p-8 max-w-3xl w-full">
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-cult-border-faint">
              <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full" style={{ background: 'var(--status-bad)' }} />
              <div className="flex-1">
                <div className="font-mono uppercase tracking-[0.18em] text-[10px] text-cult-text-muted mb-1">
                  {errorType}
                </div>
                <p className="text-cult-text-secondary text-sm">
                  {suggestion}
                </p>
              </div>
            </div>

            {showDetails && this.state.error && (
              <details className="mb-6 border border-cult-border-faint">
                <summary className="cursor-pointer px-4 py-3 font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted hover:text-cult-text-secondary">
                  Technical Details
                </summary>
                <div className="px-4 pb-4 space-y-3 border-t border-cult-border-faint pt-4">
                  <div>
                    <div className="font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted mb-1">Error Message</div>
                    <pre className="p-3 bg-cult-surface-inset text-cult-text-secondary text-xs overflow-auto font-mono">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <div className="font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted mb-1">Stack Trace</div>
                      <pre className="p-3 bg-cult-surface-inset text-cult-text-muted text-xs overflow-auto font-mono max-h-48">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <div className="font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted mb-1">Component Stack</div>
                      <pre className="p-3 bg-cult-surface-inset text-cult-text-muted text-xs overflow-auto font-mono max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {this.state.errorCount >= 3 && (
              <div className="mb-6 px-4 py-3 border border-cult-border-faint">
                <p className="text-cult-text-secondary text-xs font-mono">
                  Multiple errors detected ({this.state.errorCount}). May indicate a persistent issue. Contact support if this continues.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-5 py-2 border border-cult-border text-cult-text-primary hover:border-cult-border-strong hover:bg-cult-surface-raised transition font-mono uppercase tracking-[0.16em] text-[11px]"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2 border border-cult-accent text-cult-accent hover:bg-cult-accent hover:text-cult-opaque-black transition font-mono uppercase tracking-[0.16em] text-[11px]"
              >
                Refresh Page
              </button>
            </div>

            {import.meta.env.DEV && (
              <div className="mt-6 pt-4 border-t border-cult-border-faint">
                <p className="text-cult-text-muted text-[11px] font-mono">
                  DEV: type <code className="px-1 py-0.5 bg-cult-surface-inset">__errorService.getRecentErrors()</code> in console.
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
