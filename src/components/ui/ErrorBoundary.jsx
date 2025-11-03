import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service (if available)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
      });
    }
  }

  handleReload = () => {
    console.log('[RELOAD TRACKER] ErrorBoundary.handleReload called - stack trace:', new Error().stack);
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleClearData = () => {
    try {
      console.log('[RELOAD TRACKER] ErrorBoundary.handleClearData called - stack trace:', new Error().stack);

      // Preserve workflow state before clearing
      const workflowKeys = [];
      const workflowData = {};

      // Identify and save workflow-related data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('agentic-kanban-')) {
          // Check if this is workflow-related data
          if (key.includes('workflow') || key.includes('Workflow')) {
            const value = localStorage.getItem(key);
            workflowKeys.push(key);
            workflowData[key] = value;
          } else {
            // Clear non-workflow data
            localStorage.removeItem(key);
          }
        }
      });

      console.log(`[RELOAD TRACKER] Preserved ${workflowKeys.length} workflow keys during clear`);

      // Reload the page - workflow state will be preserved
      window.location.reload();
    } catch (err) {
      console.error('Failed to clear data:', err);
      this.handleReload();
    }
  };

  copyErrorDetails = () => {
    const errorDetails = {
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const text = JSON.stringify(errorDetails, null, 2);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Error details copied to clipboard');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error details copied to clipboard');
    }
  };

  render() {
    if (this.state.hasError) {
      const isDevMode = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg border border-red-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-red-50 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-red-900">
                    Something went wrong
                  </h1>
                  <p className="text-sm text-red-700">
                    AgenticKanban encountered an unexpected error
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  What happened?
                </h2>
                <p className="text-gray-600 mb-4">
                  The application encountered an error and needs to be restarted.
                  This could be due to a temporary issue or corrupted data.
                </p>

                {isDevMode && this.state.error && (
                  <div className="bg-gray-100 rounded-md p-4 mb-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Error Details (Development Mode)
                    </h3>
                    <pre className="text-xs text-red-700 overflow-auto max-h-32">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                )}
              </div>

              {/* Recovery Options */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Recovery Options
                </h2>

                <div className="grid gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex items-center space-x-3 p-3 border border-gray-300 rounded-md hover:bg-gray-50 text-left transition-colors"
                  >
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Try Again</div>
                      <div className="text-sm text-gray-500">
                        Attempt to recover without losing data
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={this.handleReload}
                    className="flex items-center space-x-3 p-3 border border-gray-300 rounded-md hover:bg-gray-50 text-left transition-colors"
                  >
                    <Home className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">Reload Page</div>
                      <div className="text-sm text-gray-500">
                        Refresh the application completely
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={this.handleClearData}
                    className="flex items-center space-x-3 p-3 border border-red-300 rounded-md hover:bg-red-50 text-left transition-colors"
                  >
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-medium text-red-900">Reset All Data</div>
                      <div className="text-sm text-red-600">
                        Clear all stored data and start fresh (last resort)
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Additional Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <button
                    onClick={this.copyErrorDetails}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Copy Error Details</span>
                  </button>

                  <div className="text-xs text-gray-500">
                    Error ID: {Date.now().toString(36)}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  If this problem persists, please report it as an issue.
                </span>
                <a
                  href="https://github.com/anthropics/claude-code/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Report Issue
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;