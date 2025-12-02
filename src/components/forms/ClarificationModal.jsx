/**
 * @fileoverview Clarification Modal component for displaying AI understanding
 *
 * Shows the AI's interpretation of a task description and allows users to
 * approve, request refinement, or edit the task. Brutalist UI design matching
 * the application's aesthetic.
 *
 * @module components/forms/ClarificationModal
 */

import { useState, useEffect, useRef } from 'react';
import { X, Check, Edit, MessageCircle } from 'lucide-react';
import { ClarificationStatus } from '../../types/clarification';

/**
 * ClarificationModal component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Object} props.task - The task being clarified
 * @param {Object} props.clarificationResult - The clarification analysis result
 * @param {boolean} props.isLoading - Whether clarification is in progress
 * @param {Function} props.onApprove - Callback when user approves clarification
 * @param {Function} props.onRequestRefinement - Callback when user requests refinement
 * @param {Function} props.onEdit - Callback when user wants to edit task
 */
const ClarificationModal = ({
  isOpen,
  onClose,
  task,
  clarificationResult,
  isLoading,
  onApprove,
  onRequestRefinement,
  onEdit
}) => {
  const [showRefinementInput, setShowRefinementInput] = useState(false);
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const modalRef = useRef(null);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !showRefinementInput) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, showRefinementInput]);

  // Handle Enter key to approve
  useEffect(() => {
    const handleEnter = (e) => {
      if (e.key === 'Enter' && !showRefinementInput && !isLoading) {
        onApprove();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEnter);
      return () => document.removeEventListener('keydown', handleEnter);
    }
  }, [isOpen, onApprove, showRefinementInput, isLoading]);

  const handleRequestRefinement = () => {
    if (showRefinementInput && refinementFeedback.trim()) {
      onRequestRefinement(refinementFeedback);
      setRefinementFeedback('');
      setShowRefinementInput(false);
    } else {
      setShowRefinementInput(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white border-4 border-black w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Header */}
        <div className="border-b-4 border-black p-4 flex justify-between items-center bg-orange-100">
          <h2 className="text-2xl font-bold uppercase">Task Clarification</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black hover:text-white transition-colors border-2 border-black"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="border-4 border-black p-6 bg-yellow-50">
              <div className="flex items-center space-x-3">
                <div className="animate-spin h-6 w-6 border-4 border-black border-t-transparent"></div>
                <p className="text-lg font-bold">Analyzing task description...</p>
              </div>
            </div>
          )}

          {/* Original Description */}
          {!isLoading && task && (
            <div className="border-4 border-black p-4 bg-gray-50">
              <h3 className="text-lg font-bold mb-2 uppercase">Original Description</h3>
              <p className="whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* AI Understanding */}
          {!isLoading && clarificationResult && (
            <>
              {/* Objective */}
              <div className="border-4 border-black p-4 bg-blue-50">
                <h3 className="text-lg font-bold mb-2 uppercase">Objective</h3>
                <p className="text-base">{clarificationResult.objective}</p>
              </div>

              {/* Requirements */}
              {clarificationResult.requirements && clarificationResult.requirements.length > 0 && (
                <div className="border-4 border-black p-4 bg-green-50">
                  <h3 className="text-lg font-bold mb-2 uppercase">Requirements</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {clarificationResult.requirements.map((req, idx) => (
                      <li key={idx} className="text-base">{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Assumptions */}
              {clarificationResult.assumptions && clarificationResult.assumptions.length > 0 && (
                <div className="border-4 border-black p-4 bg-purple-50">
                  <h3 className="text-lg font-bold mb-2 uppercase">Assumptions</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {clarificationResult.assumptions.map((assumption, idx) => (
                      <li key={idx} className="text-base">{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions */}
              {clarificationResult.questions && clarificationResult.questions.length > 0 && (
                <div className="border-4 border-black p-4 bg-yellow-50">
                  <h3 className="text-lg font-bold mb-2 uppercase">Questions for Clarification</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {clarificationResult.questions.map((question, idx) => (
                      <li key={idx} className="text-base">{question}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Refinement Input */}
          {showRefinementInput && (
            <div className="border-4 border-black p-4 bg-orange-50">
              <h3 className="text-lg font-bold mb-2 uppercase">Additional Context</h3>
              <p className="text-sm mb-3">
                Please provide additional information to help refine the understanding:
              </p>
              <textarea
                value={refinementFeedback}
                onChange={(e) => setRefinementFeedback(e.target.value)}
                className="w-full border-4 border-black p-3 font-mono text-base focus:outline-none focus:ring-4 focus:ring-orange-300"
                rows={6}
                placeholder="Add clarifications, answer questions, or provide more details..."
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t-4 border-black p-4 flex justify-end space-x-3 bg-gray-100">
          {!isLoading && (
            <>
              <button
                onClick={onEdit}
                className="px-6 py-3 border-4 border-black bg-white hover:bg-gray-200 transition-colors font-bold uppercase flex items-center space-x-2"
              >
                <Edit size={20} />
                <span>Edit Task</span>
              </button>

              <button
                onClick={handleRequestRefinement}
                className="px-6 py-3 border-4 border-black bg-orange-200 hover:bg-orange-300 transition-colors font-bold uppercase flex items-center space-x-2"
              >
                <MessageCircle size={20} />
                <span>{showRefinementInput ? 'Submit Refinement' : 'Request Refinement'}</span>
              </button>

              <button
                onClick={onApprove}
                className="px-6 py-3 border-4 border-black bg-green-300 hover:bg-green-400 transition-colors font-bold uppercase flex items-center space-x-2"
              >
                <Check size={20} />
                <span>Approve</span>
              </button>
            </>
          )}
        </div>

        {/* Keyboard Hints */}
        {!isLoading && !showRefinementInput && (
          <div className="border-t-4 border-black p-3 bg-gray-50 text-sm text-gray-600">
            <p>
              <kbd className="px-2 py-1 border-2 border-gray-400 bg-white rounded">Enter</kbd> to approve
              {' • '}
              <kbd className="px-2 py-1 border-2 border-gray-400 bg-white rounded">Esc</kbd> to close
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClarificationModal;
