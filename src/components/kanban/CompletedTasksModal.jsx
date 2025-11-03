/**
 * @fileoverview CompletedTasksModal Component
 * Displays all completed tasks in a modal overlay
 */

import { X, CheckCircle } from 'lucide-react';
import { useKanbanStore } from '../../stores/kanbanStore';
import KanbanCard from './KanbanCard';

/**
 * Modal component for displaying completed tasks
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @returns {JSX.Element|null} The completed tasks modal or null if not open
 */
const CompletedTasksModal = ({ isOpen, onClose }) => {
  const { getCompletedTasks } = useKanbanStore();

  if (!isOpen) return null;

  const completedTasks = getCompletedTasks();

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key press
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="completed-tasks-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 id="completed-tasks-title" className="text-2xl font-bold text-gray-900">
              Completed Tasks
            </h2>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {completedTasks.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {completedTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTasks.map((task) => (
                <div key={task.id} className="completed-task-wrapper">
                  <KanbanCard task={task} onEdit={() => {}} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Completed Tasks Yet
              </h3>
              <p className="text-gray-500 max-w-md">
                Tasks that reach 100% progress or complete the PR stage will appear here.
                Keep working on your tasks to see them in this list!
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletedTasksModal;
