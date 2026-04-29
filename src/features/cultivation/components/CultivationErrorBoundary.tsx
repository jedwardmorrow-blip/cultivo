import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  );
}

export class CultivationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CultivationErrorBoundary]', error, info.componentStack);

    // Auto-reload disabled — was causing browser crash loops
    // when chunk loads fail repeatedly during development.
  }

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.error ? isChunkLoadError(this.state.error) : false;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <div className="flex items-center gap-3 rounded-lg border border-cult-danger bg-cult-danger-muted px-6 py-4 max-w-md">
            <AlertTriangle className="h-6 w-6 text-cult-danger flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-cult-text-primary">
                {isChunk ? 'App update available' : 'Something went wrong in Cultivation'}
              </h3>
              <p className="text-xs text-cult-border mt-1">
                {isChunk
                  ? 'A new version has been deployed. Please reload to get the latest.'
                  : (this.state.error?.message || 'An unexpected error occurred.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isChunk) {
                window.location.reload();
              } else {
                this.setState({ hasError: false, error: null });
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-cult-accent text-cult-opaque-black text-sm font-medium hover:bg-cult-text-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {isChunk ? 'Reload Page' : 'Try Again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
