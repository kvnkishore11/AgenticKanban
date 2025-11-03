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

import { useState, useEffect } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import {
  Clock,
  User,
  MoreHorizontal,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Circle,
  CheckCircle2,
  Edit,
  Activity,
  FileText,
  Workflow,
  GitMerge,
  Eye,
  GitPullRequest
} from 'lucide-react';
import StageLogsViewer from './StageLogsViewer';
import PlanViewer from './PlanViewer';
import adwDiscoveryService from '../../services/api/adwDiscoveryService';
import { isWorkflowComplete } from '../../utils/workflowValidation';

const KanbanCard = ({ task, onEdit }) => {
  const {
    selectTask,
    selectedTaskId,
    deleteTask,
    moveTaskToStage,
    getPipelineById,
    stages,
    startTaskProgression,
    stopTaskProgression,
    pauseTaskProgression,
    resumeTaskProgression,
    getTaskProgressionStatus,
    recoverTaskFromError,
    getWorkflowStatusForTask,
    getWebSocketStatus,
    triggerWorkflowForTask,
    getWorkflowLogsForTask,
    getWorkflowProgressForTask,
    getWorkflowMetadataForTask,
    clearWorkflowLogsForTask,
    triggerMergeWorkflow
  } = useKanbanStore();

  const [showMenu, setShowMenu] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planContent, setPlanContent] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);

  // Get real-time workflow data
  const workflowLogs = getWorkflowLogsForTask(task.id);
  const workflowProgress = getWorkflowProgressForTask(task.id);
  const workflowMetadata = getWorkflowMetadataForTask(task.id);

  // Auto-expand logs when workflow starts or new logs arrive, or when there's an ADW ID
  useEffect(() => {
    if ((workflowLogs.length > 0 || task.metadata?.adw_id) && !showLogs) {
      setShowLogs(true);
    }
  }, [workflowLogs.length, task.metadata?.adw_id]);

  const pipeline = getPipelineById(task.pipelineId);
  const isSelected = selectedTaskId === task.id;
  const progressionStatus = getTaskProgressionStatus(task.id);
  const workflowStatus = getWorkflowStatusForTask(task.id);
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
    selectTask(isSelected ? null : task.id);
  };

  const handleTriggerWorkflow = async () => {
    try {
      // issue_number is required for ADW proper workflow identification
      await triggerWorkflowForTask(task.id, { issue_number: String(task.id) });
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
    }
  };

  const handleMerge = async () => {
    try {
      await triggerMergeWorkflow(task.id);
    } catch (error) {
      console.error('Failed to trigger merge:', error);
    }
  };

  const handleViewPlan = async () => {
    const adwId = task.metadata?.adw_id || workflowMetadata?.adw_id;
    if (!adwId) {
      console.error('No ADW ID found for this task');
      return;
    }

    setPlanLoading(true);
    setPlanError(null);
    setShowPlanModal(true);

    try {
      const data = await adwDiscoveryService.fetchPlanFile(adwId);
      setPlanContent(data.plan_content);
    } catch (error) {
      console.error('Failed to fetch plan file:', error);
      setPlanError(error.message || 'Failed to load plan file');
    } finally {
      setPlanLoading(false);
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
  const isReadyToMerge = task.stage === 'ready-to-merge';

  return (
    <div
      className={`kanban-card ${
        isSelected ? 'selected' : ''
      } ${progressionStatus.active ? 'auto-progress' : ''} ${isCompleted ? 'completed-card' : ''}`}
      onClick={handleCardClick}
    >
      <div className="p-4">
        {/* Minimal view for completed tasks */}
        {isCompleted && !isSelected ? (
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

          <div className="relative ml-2">
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

        {/* Expanded Details */}
        {isSelected && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-4">
              {/* Task Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <div className="font-medium">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Pipeline:</span>
                  <div className="font-medium">{formatPipelineName(task.pipelineId)}</div>
                </div>
              </div>

              {/* Recent Logs */}
              {task.logs && task.logs.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">Recent Activity</div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {task.logs.slice(-3).map((log, index) => (
                      <div key={index} className="text-xs bg-gray-50 rounded p-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-700">{log.message}</div>
                          {log.timestamp && (
                            <div className="text-gray-500">
                              {formatTimeAgo(log.timestamp)}
                            </div>
                          )}
                        </div>
                        {log.substageId && (
                          <div className="text-gray-500 mt-1">
                            Stage: {log.stage} → {log.substageName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progression Controls */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">Automatic Progression</div>
                <div className="flex items-center space-x-2 mb-2">
                  {progressionStatus.active ? (
                    <>
                      {progressionStatus.paused ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resumeTaskProgression(task.id);
                          }}
                          className="flex items-center space-x-1 text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700"
                        >
                          <Play className="h-3 w-3" />
                          <span>Resume</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            pauseTaskProgression(task.id);
                          }}
                          className="flex items-center space-x-1 text-xs bg-yellow-600 text-white rounded px-2 py-1 hover:bg-yellow-700"
                        >
                          <Pause className="h-3 w-3" />
                          <span>Pause</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          stopTaskProgression(task.id);
                        }}
                        className="flex items-center space-x-1 text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700"
                      >
                        <Pause className="h-3 w-3" />
                        <span>Stop</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startTaskProgression(task.id);
                      }}
                      className="flex items-center space-x-1 text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700"
                      disabled={task.stage === 'document' && task.progress === 100}
                    >
                      <Play className="h-3 w-3" />
                      <span>Start Auto</span>
                    </button>
                  )}
                </div>

                {progressionStatus.active && (
                  <div className="text-xs text-gray-500">
                    Auto-progression started {formatTimeAgo(progressionStatus.startedAt)}
                  </div>
                )}

                {task.stage === 'errored' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      recoverTaskFromError(task.id);
                    }}
                    className="flex items-center space-x-1 text-xs bg-purple-600 text-white rounded px-2 py-1 hover:bg-purple-700 mt-2"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span>Recover from Error</span>
                  </button>
                )}
              </div>

              {/* Plan Viewer */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">Implementation Plan</div>
                <button
                  onClick={handleViewPlan}
                  disabled={planLoading}
                  className="flex items-center space-x-1 text-xs bg-purple-600 text-white rounded px-2 py-1 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <FileText className="h-3 w-3" />
                  <span>{planLoading ? 'Loading...' : 'View Plan'}</span>
                </button>
                {planError && (
                  <div className="text-xs text-red-600 mt-1">{planError}</div>
                )}
              </div>

              {/* WebSocket Workflow Controls */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">Workflow Controls</div>
                <div className="flex items-center space-x-2 mb-2">
                  {/* Toggle Logs */}
                  {workflowLogs.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLogs(!showLogs);
                      }}
                      className="flex items-center space-x-1 text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700"
                    >
                      <Activity className="h-3 w-3" />
                      <span>{showLogs ? 'Hide' : 'Show'} Logs ({workflowLogs.length})</span>
                    </button>
                  )}
                </div>

                {/* WebSocket Connection Status */}
                <div className={`text-xs ${websocketStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                  WebSocket: {websocketStatus.connected ? 'Connected' : 'Disconnected'}
                  {websocketStatus.connecting && ' (Connecting...)'}
                </div>

                {/* Enhanced Workflow Status */}
                {(workflowStatus || workflowProgress) && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs border border-blue-200">
                    <div className="font-medium text-blue-800 flex items-center justify-between">
                      <span>Workflow: {workflowStatus?.workflowName || workflowMetadata?.workflow_name || 'Unknown'}</span>
                      {workflowProgress?.status && (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          workflowProgress.status === 'completed' ? 'bg-green-100 text-green-700' :
                          workflowProgress.status === 'failed' ? 'bg-red-100 text-red-700' :
                          workflowProgress.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {workflowProgress.status}
                        </span>
                      )}
                    </div>
                    {(workflowProgress?.progress !== undefined || workflowStatus?.progress !== undefined) && (
                      <div className="mt-1 flex items-center space-x-2">
                        <div className="flex-1 bg-blue-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${workflowProgress?.progress || workflowStatus?.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-blue-700 font-semibold">
                          {Math.round(workflowProgress?.progress || workflowStatus?.progress || 0)}%
                        </span>
                      </div>
                    )}
                    {(workflowProgress?.currentStep || workflowStatus?.currentStep) && (
                      <div className="mt-1 text-blue-600">
                        Step: {workflowProgress?.currentStep || workflowStatus?.currentStep}
                      </div>
                    )}
                    {(workflowProgress?.message || workflowStatus?.lastUpdate) && (
                      <div className="mt-1 text-blue-500">
                        {workflowProgress?.message || workflowStatus?.lastUpdate}
                      </div>
                    )}
                  </div>
                )}

                {/* ADW Metadata Display */}
                {(task.metadata?.adw_id || workflowMetadata?.adw_id) && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs border border-gray-200">
                    <div className="font-medium text-gray-700 flex items-center justify-between">
                      <span>ADW ID: {task.metadata?.adw_id || workflowMetadata?.adw_id}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(task.metadata?.adw_id || workflowMetadata?.adw_id);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Copy
                      </button>
                    </div>
                    {(task.metadata?.workflow_status || workflowMetadata?.status) && (
                      <div className="text-gray-600 mt-1">
                        Status: {task.metadata?.workflow_status || workflowMetadata?.status}
                      </div>
                    )}
                    {(task.metadata?.logs_path || workflowMetadata?.logs_path) && (
                      <div className="text-gray-500 mt-1 truncate" title={task.metadata?.logs_path || workflowMetadata?.logs_path}>
                        Logs: {task.metadata?.logs_path || workflowMetadata?.logs_path}
                      </div>
                    )}
                    <div className="mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPlan();
                        }}
                        disabled={planLoading}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        <span>{planLoading ? 'Loading...' : 'View Plan'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Real-Time Workflow Logs */}
              {showLogs && (
                <div onClick={(e) => e.stopPropagation()}>
                  <StageLogsViewer
                    taskId={task.id}
                    adwId={task.metadata?.adw_id}
                    title="Workflow Logs"
                    maxHeight="250px"
                    onClear={() => clearWorkflowLogsForTask(task.id)}
                    showTimestamps={true}
                    autoScroll={true}
                  />
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex space-x-2">
                {/* Show Merge button for ready-to-merge stage */}
                {isReadyToMerge && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMerge();
                    }}
                    className="flex items-center justify-center space-x-1 flex-1 text-xs bg-teal-600 text-white rounded px-2 py-1 hover:bg-teal-700"
                  >
                    <GitMerge className="h-3 w-3" />
                    <span>Merge to Main</span>
                  </button>
                )}
                {getNextStage() && !isReadyToMerge && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToNextStage();
                    }}
                    className="flex-1 text-xs bg-primary-600 text-white rounded px-2 py-1 hover:bg-primary-700"
                  >
                    Move to {getNextStage().name}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
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

      {/* Plan Viewer Modal */}
      {showPlanModal && (
        <PlanViewer
          planContent={planContent}
          adwId={task.metadata?.adw_id || workflowMetadata?.adw_id}
          onClose={() => {
            setShowPlanModal(false);
            setPlanContent(null);
            setPlanError(null);
          }}
          isOpen={showPlanModal}
          isLoading={planLoading}
          error={planError}
        />
      )}
    </div>
  );
};

export default KanbanCard;