import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Copy, FileText } from 'lucide-react';

/**
 * PlanViewer Component
 * Displays plan markdown content in a modal dialog
 * with copy to clipboard functionality
 */
const PlanViewer = ({
  planContent,
  adwId,
  onClose,
  isOpen,
  isLoading = false,
  error = null
}) => {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (planContent) {
      try {
        await navigator.clipboard.writeText(planContent);
        // Could add a toast notification here
      } catch (err) {
        console.error('Failed to copy plan content:', err);
      }
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      {/* Modal Container */}
      <div
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 51 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Plan: {adwId || 'Unknown'}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {/* Copy Button */}
            {planContent && !isLoading && !error && (
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4 text-gray-600" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Close"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading plan...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-red-600">
                <p className="font-semibold">Error loading plan</p>
                <p className="text-sm mt-2 text-gray-600">{error}</p>
              </div>
            </div>
          ) : !planContent ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No plan content available</p>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{planContent}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanViewer;
