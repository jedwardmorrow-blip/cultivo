import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class OrdersErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[OrdersErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-cult-text-primary">Orders & Fulfillment</h1>
            <p className="text-cult-text-muted mt-2">Manage orders, allocate inventory, and track fulfillment</p>
          </div>
          <div className="bg-cult-danger-muted border-2 border-cult-danger p-8 text-center">
            <h2 className="text-2xl font-bold text-cult-danger mb-4">Something went wrong</h2>
            <p className="text-cult-danger/80 mb-6">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-2 bg-cult-accent text-cult-opaque-black hover:bg-cult-accent-hover hover:text-cult-text-primary transition-all font-medium uppercase tracking-wider text-sm"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
