import { useEffect, useRef } from 'react';
import { X, FileText, Loader2, AlertCircle } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';

const PlanViewerModal = ({ isOpen, onClose, planContent, loading, error, taskId, adwId }) => {
  const modalRef = useRef(null);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        tabIndex="-1"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Implementation Plan</h2>
            {taskId && adwId && (
              <span className="text-sm text-gray-500">
                (Issue #{taskId} - {adwId})
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close plan viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
              <p className="text-gray-600">Loading plan...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-red-800">Error Loading Plan</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && !planContent && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <FileText className="h-16 w-16 text-gray-300" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">No Plan Available</h3>
                <p className="text-sm text-gray-500 mt-2">
                  No implementation plan found for this task.
                </p>
                {taskId && adwId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Expected: issue-{taskId}-adw-{adwId}-sdlc_planner-*.md
                  </p>
                )}
              </div>
            </div>
          )}

          {!loading && !error && planContent && (
            <div data-color-mode="light">
              <MDEditor.Markdown
                source={planContent}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  color: '#1f2937'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanViewerModal;
