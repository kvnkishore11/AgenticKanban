/**
 * @fileoverview Task card component with workflow status tracking
 *
 * Renders an individual task card displaying title, description, timestamps,
 * ADW workflow status, and action buttons. Supports inline editing, task
 * progression, workflow triggers, and log viewing. Integrates with ADW
 * discovery service to show real-time workflow stages and status.
 *
 * @module components/kanban/KanbanCard
 */

import { useState } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import {
  Clock,
  MoreHorizontal,
  Play,
  CheckCircle,
  ArrowRight,
  Edit,
  Activity,
  FileText,
  Workflow,
  GitMerge,
  Eye,
  GitPullRequest,
  Maximize2,
  Pause,
  AlertCircle
} from 'lucide-react';
import StageLogsViewer from './StageLogsViewer';
import PlanViewer from './PlanViewer';
import CardExpandModal from './CardExpandModal';
import adwDiscoveryService from '../../services/api/adwDiscoveryService';

const KanbanCard = ({ task, onEdit }) => {
  const {
    deleteTask,
    moveTaskToStage,
    getPipelineById,
    stages,
    getTaskProgressionStatus,
    getWebSocketStatus,
    triggerWorkflowForTask,
    getWorkflowLogsForTask,
    getWorkflowMetadataForTask
  } = useKanbanStore();

  const [showMenu, setShowMenu] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planContent, setPlanContent] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [showExpandModal, setShowExpandModal] = useState(false);

  // Get real-time workflow data
  const workflowLogs = getWorkflowLogsForTask(task.id);
  const workflowMetadata = getWorkflowMetadataForTask(task.id);

  const pipeline = getPipelineById(task.pipelineId);
  const progressionStatus = getTaskProgressionStatus(task.id);
  const websocketStatus = getWebSocketStatus();

  // Format dynamic pipeline names for display
  const formatPipelineName = (pipelineId) => {
    if (!pipelineId) return 'Unknown Pipeline';

    // Handle dynamic pipeline names (e.g., "adw_plan_implement_test")
    if (pipelineId.startsWith('adw_')) {
      const stages = pipelineId.replace('adw_', '').split('_');
      const capitalizedStages = stages.map(stage =>
        stage.charAt(0).toUpperCase() + stage.slice(1)
      );
      return `ADW: ${capitalizedStages.join(' → ')}`;
    }

    // Fallback to existing pipeline lookup or display the ID itself
    return pipeline?.name || pipelineId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusIcon = () => {
    // Show progression status if auto-progression is active
    if (progressionStatus.active) {
      if (progressionStatus.paused) {
        return <Pause className="h-4 w-4 text-yellow-500" />;
      }
      return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
    }

    // Default status based on task state
    switch (task.stage) {
      case 'errored':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'document':
        return task.progress === 100 ?
          <CheckCircle className="h-4 w-4 text-green-500" /> :
          <Play className="h-4 w-4 text-blue-500" />;
      default:
        return task.progress > 0 ?
          <Play className="h-4 w-4 text-blue-500" /> :
          <Pause className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getNextStage = () => {
    const currentStageIndex = stages.findIndex(stage => stage.id === task.stage);
    if (currentStageIndex < stages.length - 1) {
      return stages[currentStageIndex + 1];
    }
    return null;
  };

  const handleMoveToNextStage = () => {
    const nextStage = getNextStage();
    if (nextStage) {
      moveTaskToStage(task.id, nextStage.id);
    }
  };

  const handleCardClick = () => {
    // Open modal instead of toggling selected state
    setShowExpandModal(true);
  };

  const handleTriggerWorkflow = async () => {
    try {
      // issue_number is required for ADW proper workflow identification
      await triggerWorkflowForTask(task.id, { issue_number: String(task.id) });
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
    }
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(task);
    }
    setShowMenu(false);
  };

  // Check if this is a completed task
  const isCompleted = task.stage === 'completed';

  return (
    <div
      className={`kanban-card ${progressionStatus.active ? 'auto-progress' : ''} ${isCompleted ? 'completed-card' : ''}`}
      onClick={handleCardClick}
    >
      <div className="p-4">
        {/* Minimal view for completed tasks */}
        {isCompleted ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-sm font-medium text-gray-700">
                  ADW {task.metadata?.adw_id || `#${task.id}`}
                </div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {formatTimeAgo(task.updatedAt)}
            </div>
          </div>
        ) : (
          <>
        {/* ADW Header - Display ADW ID and Trigger Button at the top */}
        {task.metadata?.adw_id && (
          <div className="adw-header mb-3 pb-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-xs font-semibold text-gray-700">ADW ID:</span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-800 truncate">
                  {task.metadata?.adw_id}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(task.metadata?.adw_id);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                  title="Copy ADW ID"
                >
                  Copy
                </button>
              </div>

              {/* Trigger Workflow Button in Header */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTriggerWorkflow();
                }}
                disabled={!websocketStatus.connected}
                className={`flex items-center space-x-1 text-xs rounded px-2 py-1 ml-2 ${
                  websocketStatus.connected
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={websocketStatus.connected ? 'Trigger Workflow' : 'WebSocket Disconnected'}
              >
                <Play className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Card Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {task.title}
            </h4>
            <div className="mt-1 flex items-center text-xs text-gray-500">
              <span className="truncate">#{task.id}</span>
              <span className="mx-1">•</span>
              <span>{formatPipelineName(task.pipelineId)}</span>
              {/* Workflow completion badge */}
              {task.metadata?.workflow_name && task.metadata?.workflow_complete && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </span>
              )}
              {/* Ready to merge badge for PR stage */}
              {task.stage === 'pr' && task.metadata?.workflow_complete && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  <GitPullRequest className="h-3 w-3 mr-1" />
                  Ready to Merge
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 ml-2">
            {/* Expand Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowExpandModal(true);
              }}
              className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
              title="Expand card"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {/* Menu Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-32">
                <div className="py-1">
                  {getNextStage() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveToNextStage();
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Move to {getNextStage().name}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick();
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description - Full input prompt visible */}
        {task.description && (
          <div className="text-xs text-gray-600 mb-3 max-h-48 overflow-y-auto">
            <p className="whitespace-pre-wrap break-words">
              {task.description}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`status-icon ${progressionStatus.active ? 'auto-progress' : ''}`}>
              {getStatusIcon()}
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatTimeAgo(task.updatedAt)}</span>
            </div>
          </div>

          {task.logs && task.logs.length > 0 && (
            <div className="text-xs text-gray-400">
              {task.logs.length} log{task.logs.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Expanded Details - Disabled in favor of modal view */}
        {/* {isSelected && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            ... expanded content removed ...
          </div>
        )} */}
        </>
        )}
      </div>

      {/* Click outside handler */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Card Expand Modal */}
      {showExpandModal && (
        <CardExpandModal
          task={task}
          isOpen={showExpandModal}
          onClose={() => setShowExpandModal(false)}
          onEdit={onEdit}
        />
      )}
    </div>
  );
};

export default KanbanCard;