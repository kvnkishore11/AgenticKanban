/**
 * @fileoverview Clarification Panel Component
 *
 * Displays the AI's understanding of a task description and allows users to
 * approve, request refinement, or edit the task. Integrated into the expanded
 * card modal when a task is in the "backlog" stage and clarification is not yet approved.
 *
 * @module components/kanban/ClarificationPanel
 */

import { useState, useEffect } from 'react';
import { Check, MessageCircle, Edit, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useKanbanStore } from '../../stores/kanbanStore';

/**
 * ClarificationPanel component
 * @param {Object} props
 * @param {Object} props.task - The task being clarified
 * @param {Function} props.onApprove - Callback when user approves clarification
 * @param {Function} props.onEdit - Callback when user wants to edit task
 * @param {Function} props.onClose - Callback to close the modal
 */
const ClarificationPanel = ({ task: taskProp, onApprove, onEdit, onClose }) => {
  const { updateTask, triggerClarification, tasks } = useKanbanStore();

  // Subscribe to the store for fresh task data (props might be stale)
  const task = tasks.find(t => t.id === taskProp.id) || taskProp;

  // Debug logging
  console.log('[ClarificationPanel] Render:', {
    taskPropId: taskProp.id,
    tasksPropHasResult: !!taskProp.metadata?.clarificationResult,
    tasksFromStore: tasks.length,
    storeTaskHasResult: tasks.find(t => t.id === taskProp.id)?.metadata?.clarificationResult ? 'yes' : 'no',
    finalTaskHasResult: !!task.metadata?.clarificationResult
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showRefinementInput, setShowRefinementInput] = useState(false);
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [error, setError] = useState(null);

  // Get clarification result from task metadata (check both naming conventions)
  const clarificationResult = task.metadata?.clarificationResult || task.metadata?.clarification_result;
  const clarificationStatus = task.metadata?.clarificationStatus || task.metadata?.clarification_status || 'pending';

  // Auto-trigger clarification when component mounts if no result exists
  useEffect(() => {
    if (!clarificationResult && clarificationStatus === 'pending' && !isLoading) {
      handleTriggerClarification();
    }
  }, []);

  const handleTriggerClarification = async (feedback = null) => {
    setIsLoading(true);
    setError(null);

    try {
      // Trigger clarification via store action
      if (triggerClarification) {
        await triggerClarification(task.id, task.description, feedback);
      } else {
        // Fallback: directly call the backend
        const wsPort = import.meta.env.VITE_ADW_PORT || 8500;
        const response = await fetch(`http://localhost:${wsPort}/api/clarify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: task.id,
            description: task.description,
            adw_id: task.metadata?.adw_id,
            feedback: feedback
          })
        });

        if (!response.ok) {
          throw new Error('Failed to trigger clarification');
        }

        const result = await response.json();

        // Update task with clarification result
        await updateTask(task.id, {
          metadata: {
            ...task.metadata,
            clarification_result: result,
            clarification_status: 'awaiting_approval'
          }
        });
      }
    } catch (err) {
      console.error('Clarification failed:', err);
      setError(err.message || 'Failed to analyze task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      // Update task status and move to plan stage
      await updateTask(task.id, {
        stage: 'plan',
        metadata: {
          ...task.metadata,
          clarification_status: 'approved',
          clarification_approved_at: new Date().toISOString()
        }
      });

      if (onApprove) {
        onApprove();
      }
    } catch (err) {
      console.error('Failed to approve clarification:', err);
      setError('Failed to approve. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestRefinement = async () => {
    if (showRefinementInput && refinementFeedback.trim()) {
      // Submit refinement request
      setShowRefinementInput(false);
      await handleTriggerClarification(refinementFeedback);
      setRefinementFeedback('');
    } else {
      // Show the refinement input
      setShowRefinementInput(true);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(task);
    }
  };

  return (
    <div className="clarification-panel">
      {/* Header */}
      <div className="clarification-header">
        <div className="clarification-header-icon">🧠</div>
        <div className="clarification-header-content">
          <h3 className="clarification-title">Understanding Verification</h3>
          <p className="clarification-subtitle">
            {isLoading
              ? 'Analyzing your request...'
              : clarificationResult
                ? "Is this what you're expecting from me?"
                : 'Let me understand your request better'}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="clarification-loading">
          <Loader2 className="clarification-spinner" size={32} />
          <p className="clarification-loading-text">
            Analyzing task description...
          </p>
          <p className="clarification-loading-subtext">
            This may take a few seconds
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="clarification-error">
          <AlertCircle size={24} />
          <p className="clarification-error-text">{error}</p>
          <button
            onClick={() => handleTriggerClarification()}
            className="clarification-retry-btn"
          >
            <RefreshCw size={16} />
            <span>Retry Analysis</span>
          </button>
        </div>
      )}

      {/* Clarification Result */}
      {!isLoading && clarificationResult && (
        <div className="clarification-content">
          {/* Understanding with confidence badge */}
          <div className="clarification-section understanding">
            <h4 className="clarification-section-title">
              <span className="section-icon">💡</span>
              Is This What You Want?
              {clarificationResult.confidence && (
                <span className={`confidence-badge confidence-${clarificationResult.confidence}`}>
                  {clarificationResult.confidence === 'high' ? '✓ Clear' :
                   clarificationResult.confidence === 'medium' ? '~ Mostly Clear' :
                   '? Need More Info'}
                </span>
              )}
            </h4>
            <p className="clarification-section-content understanding-text">
              {clarificationResult.understanding}
            </p>
          </div>

          {/* Questions */}
          {clarificationResult.questions?.length > 0 && (
            <div className="clarification-section questions">
              <h4 className="clarification-section-title">
                <span className="section-icon">❓</span>
                Before I Start, I Need to Know...
              </h4>
              <ul className="clarification-list">
                {clarificationResult.questions.map((question, idx) => (
                  <li key={idx}>{question}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* No Result - Prompt to trigger */}
      {!isLoading && !clarificationResult && !error && (
        <div className="clarification-empty">
          <div className="clarification-empty-icon">🤔</div>
          <h4>Ready to Clarify</h4>
          <p>Click below to analyze your task and ensure we're aligned on the requirements.</p>
          <button
            onClick={() => handleTriggerClarification()}
            className="clarification-trigger-btn"
          >
            <RefreshCw size={16} />
            <span>Analyze Task</span>
          </button>
        </div>
      )}

      {/* Refinement Input */}
      {showRefinementInput && (
        <div className="clarification-refinement">
          <h4 className="clarification-section-title">
            <span className="section-icon">📝</span>
            Provide Additional Context
          </h4>
          <textarea
            value={refinementFeedback}
            onChange={(e) => setRefinementFeedback(e.target.value)}
            placeholder="Help me understand better... Answer any questions above, correct assumptions, or add more details."
            className="clarification-refinement-input"
            rows={4}
            autoFocus
          />
        </div>
      )}

      {/* Action Buttons */}
      {!isLoading && (clarificationResult || showRefinementInput) && (
        <div className="clarification-actions">
          <button
            onClick={handleEdit}
            className="clarification-btn edit"
          >
            <Edit size={18} />
            <span>Edit Task</span>
          </button>

          <button
            onClick={handleRequestRefinement}
            className="clarification-btn refine"
          >
            <MessageCircle size={18} />
            <span>{showRefinementInput && refinementFeedback.trim() ? 'Submit' : 'Provide Feedback'}</span>
          </button>

          {clarificationResult && !showRefinementInput && (
            <button
              onClick={handleApprove}
              className="clarification-btn approve"
            >
              <Check size={18} />
              <span>Yes, This is Correct!</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ClarificationPanel;
