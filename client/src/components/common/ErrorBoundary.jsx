import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LifeLane ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 bg-[#FEF3F2] border border-[#FECDCA] text-[#C62828] rounded-[10px] flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider block mb-1">
            LifeLane System Notice
          </span>
          <h1 className="text-xl font-bold text-[#182230] mb-2">Something went wrong</h1>
          <p className="text-xs text-[#667085] max-w-sm mb-6 leading-relaxed">
            LifeLane could not load this operational view. Your session data is intact.
          </p>

          <button
            type="button"
            onClick={this.handleReset}
            className="py-2.5 px-4 bg-[#172033] hover:bg-[#0F172A] text-white text-xs font-medium rounded-[8px] transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
