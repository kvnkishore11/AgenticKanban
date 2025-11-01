import { useState, useEffect } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import { X, Play, AlertCircle, Info, Hash } from 'lucide-react';
import AdwIdInput from '../ui/AdwIdInput';
import { isAdwIdRequired, getWorkflowDescription } from '../../utils/adwValidation';

const WorkflowTriggerModal = ({ task, onClose }) => {
  const {
    triggerWorkflowForTask,
    getWebSocketStatus
  } = useKanbanStore();

  const [workflowType, setWorkflowType] = useState('');
  const [adwId, setAdwId] = useState('');
  const [modelSet, setModelSet] = useState('base');
  const [issueNumber, setIssueNumber] = useState(String(task.id));
  const [isTriggering, setIsTriggering] = useState(false);
  const [errors, setErrors] = useState([]);

  const websocketStatus = getWebSocketStatus();

  // Available workflow types
  const workflowTypes = [
    // Entry point workflows
    {
      id: 'adw_plan_iso',
      name: 'Plan (Isolated)',
      description: 'Create implementation plan in isolated worktree',
      category: 'entry_point'
    },
    {
      id: 'adw_patch_iso',
      name: 'Patch (Isolated)',
      description: 'Apply patch using existing plan or comments',
      category: 'entry_point'
    },

    // Dependent workflows
    {
      id: 'adw_build_iso',
      name: 'Build (Isolated)',
      description: 'Implement solution based on existing plan',
      category: 'dependent'
    },
    {
      id: 'adw_test_iso',
      name: 'Test (Isolated)',
      description: 'Run tests in isolated environment',
      category: 'dependent'
    },
    {
      id: 'adw_review_iso',
      name: 'Review (Isolated)',
      description: 'Review implementation and provide feedback',
      category: 'dependent'
    },
    {
      id: 'adw_document_iso',
      name: 'Document (Isolated)',
      description: 'Generate documentation for implementation',
      category: 'dependent'
    },
    {
      id: 'adw_ship_iso',
      name: 'Ship (Isolated)',
      description: 'Finalize and ship the implementation',
      category: 'dependent'
    },

    // Orchestrator workflows
    {
      id: 'adw_plan_build_iso',
      name: 'Plan + Build',
      description: 'Run plan followed by build workflow',
      category: 'orchestrator'
    },
    {
      id: 'adw_plan_build_test_iso',
      name: 'Plan + Build + Test',
      description: 'Run plan, build, and test workflows',
      category: 'orchestrator'
    },
    {
      id: 'adw_sdlc_iso',
      name: 'Full SDLC',
      description: 'Complete software development lifecycle',
      category: 'orchestrator'
    },
    {
      id: 'adw_sdlc_zte_iso',
      name: 'Zero Touch Execution',
      description: 'Complete SDLC with automatic shipping',
      category: 'orchestrator'
    }
  ];

  // Model set options
  const modelSetOptions = [
    { value: 'base', label: 'Base Models', description: 'Standard model configuration' },
    { value: 'premium', label: 'Premium Models', description: 'Higher-performance models' },
    { value: 'experimental', label: 'Experimental', description: 'Latest experimental models' }
  ];

  // Auto-select workflow based on task's current stage
  useEffect(() => {
    if (task.stage && !workflowType) {
      const stageToWorkflow = {
        'backlog': 'adw_plan_iso',
        'plan': 'adw_build_iso',
        'build': 'adw_test_iso',
        'test': 'adw_review_iso',
        'review': 'adw_document_iso',
        'document': 'adw_ship_iso'
      };

      const suggestedWorkflow = stageToWorkflow[task.stage];
      if (suggestedWorkflow) {
        setWorkflowType(suggestedWorkflow);
      }
    }
  }, [task.stage, workflowType]);

  // Use existing ADW ID from task metadata if available
  useEffect(() => {
    if (task.metadata?.adw_id && !adwId) {
      setAdwId(task.metadata.adw_id);
    }
  }, [task.metadata, adwId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    // Validation
    const validationErrors = [];

    if (!workflowType) {
      validationErrors.push('Please select a workflow type');
    }

    if (isAdwIdRequired(workflowType) && !adwId) {
      validationErrors.push('ADW ID is required for this workflow type');
    }

    if (!websocketStatus.connected) {
      validationErrors.push('WebSocket connection required. Please check connection.');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsTriggering(true);

    try {
      const options = {
        workflowType,
        modelSet,
        issue_number: issueNumber || String(task.id),
      };

      // Only include ADW ID if provided
      if (adwId && adwId.trim()) {
        options.adw_id = adwId.trim();
      }

      await triggerWorkflowForTask(task.id, options);
      onClose();
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      setErrors([error.message || 'Failed to trigger workflow']);
    } finally {
      setIsTriggering(false);
    }
  };

  const getWorkflowTypeColor = (category) => {
    switch (category) {
      case 'entry_point': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'dependent': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'orchestrator': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'entry_point': return <Play className="h-4 w-4" />;
      case 'dependent': return <Hash className="h-4 w-4" />;
      case 'orchestrator': return <Info className="h-4 w-4" />;
      default: return null;
    }
  };

  const selectedWorkflow = workflowTypes.find(w => w.id === workflowType);

  return (
    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Trigger Workflow</h2>
            <p className="text-sm text-gray-500 mt-1">
              Task #{task.id}: {task.title || 'Untitled'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* WebSocket Status */}
          {!websocketStatus.connected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-800">
                  WebSocket Disconnected
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Workflow triggering requires an active WebSocket connection. Please check the connection status.
              </p>
            </div>
          )}

          {/* Workflow Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Workflow Type *
            </label>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {workflowTypes.map((workflow) => (
                <label
                  key={workflow.id}
                  className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all
                    ${workflowType === workflow.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <input
                    type="radio"
                    name="workflowType"
                    value={workflow.id}
                    checked={workflowType === workflow.id}
                    onChange={(e) => setWorkflowType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-md ${getWorkflowTypeColor(workflow.category)}`}>
                      {getCategoryIcon(workflow.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{workflow.name}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getWorkflowTypeColor(workflow.category)}`}>
                          {workflow.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getWorkflowDescription(workflow.id)}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ADW ID Input - Show only if workflow type is selected */}
          {workflowType && (
            <AdwIdInput
              value={adwId}
              onChange={setAdwId}
              workflowType={workflowType}
              placeholder={isAdwIdRequired(workflowType)
                ? "Enter existing ADW ID (required)"
                : "Enter ADW ID (optional)"
              }
            />
          )}

          {/* Model Set Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Set
            </label>
            <select
              value={modelSet}
              onChange={(e) => setModelSet(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {modelSetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>

          {/* Issue Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Number
            </label>
            <input
              type="text"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              placeholder="GitHub issue number or task ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Used for GitHub integration. Defaults to task ID if not specified.
            </p>
          </div>

          {/* Workflow Summary */}
          {selectedWorkflow && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Workflow Summary</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Type:</span> {selectedWorkflow.name}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {selectedWorkflow.category.replace('_', ' ')}
                </div>
                {adwId && (
                  <div>
                    <span className="font-medium">ADW ID:</span> {adwId}
                  </div>
                )}
                <div>
                  <span className="font-medium">Model Set:</span> {modelSetOptions.find(m => m.value === modelSet)?.label}
                </div>
                <div>
                  <span className="font-medium">Issue:</span> #{issueNumber || task.id}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isTriggering}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center space-x-2"
              disabled={!workflowType || !websocketStatus.connected || isTriggering}
            >
              <Play className="h-4 w-4" />
              <span>{isTriggering ? 'Triggering...' : 'Trigger Workflow'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowTriggerModal;