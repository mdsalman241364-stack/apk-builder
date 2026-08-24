import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-red-500/30 text-slate-100 max-w-md mx-auto my-8 shadow-2xl backdrop-blur-md text-center">
          <div className="flex items-center justify-center gap-2 text-red-400 font-bold mb-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 className="text-sm">{this.props.fallbackTitle || 'View Recovered'}</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            DIGUU AI caught a temporary display error safely. Tap below to restore this screen.
          </p>
          <button
            onClick={this.handleReset}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Screen</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
