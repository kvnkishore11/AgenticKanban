/**
 * @fileoverview Task details modal component for viewing task information
 *
 * Modal interface for displaying complete task information including metadata,
 * recent activity logs, progression controls, workflow status, and quick actions.
 * Provides a comprehensive view of all task details that were previously shown
 * in the inline expanded card view.
 *
 * @module components/kanban/TaskDetailsModal
 */

import { useState, useEffect } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import {
  X,
  Clock,
  CheckCircle,
  Activity,
  FileText,
  Eye,
  GitMerge,
  Edit,
  Play,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2
} from 'lucide-react';
import Toast from '../ui/Toast';
import StageLogsViewer from './StageLogsViewer';
import PlanViewer from './PlanViewer';
import adwDiscoveryService from '../../services/api/adwDiscoveryService';

const TaskDetailsModal = ({ task, onClose, onEdit }) => {
  const {
    getPipelineById,
    getWorkflowStatusForTask,
    getWebSocketStatus,
    triggerWorkflowForTask,
    getWorkflowLogsForTask,
    getWorkflowProgressForTask,
    getWorkflowMetadataForTask,
    clearWorkflowLogsForTask,
    triggerMergeWorkflow,
    deleteWorktree,
    getDeletionState,
    getMergeState,
    clearMergeState
  } = useKanbanStore();

  const [showLogs, setShowLogs] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planContent, setPlanContent] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  // Get deletion state from store
  const adwId = task?.metadata?.adw_id;
  const deletionState = getDeletionState(adwId);
  const isDeleting = deletionState?.loading || false;
  const deletionError = deletionState?.error || null;

  // Get merge state from store
  const mergeState = getMergeState(task.id);

  // Collapsible section states (with localStorage persistence)
  const [taskInfoExpanded, setTaskInfoExpanded] = useState(() => {
    const saved = localStorage.getItem('taskDetailsTaskInfoExpanded');
    return saved !== null ? saved === 'true' : true; // default: expanded
  });
  const [recentActivityExpanded, setRecentActivityExpanded] = useState(() => {
    const saved = localStorage.getItem('taskDetailsRecentActivityExpanded');
    return saved !== null ? saved === 'true' : false; // default: collapsed if logs present
  });
  const [workflowControlsExpanded, setWorkflowControlsExpanded] = useState(() => {
    const saved = localStorage.getItem('taskDetailsWorkflowControlsExpanded');
    return saved !== null ? saved === 'true' : true; // default: expanded
  });

  // Save collapse states to localStorage
  useEffect(() => {
    localStorage.setItem('taskDetailsTaskInfoExpanded', String(taskInfoExpanded));
  }, [taskInfoExpanded]);

  useEffect(() => {
    localStorage.setItem('taskDetailsRecentActivityExpanded', String(recentActivityExpanded));
  }, [recentActivityExpanded]);

  useEffect(() => {
    localStorage.setItem('taskDetailsWorkflowControlsExpanded', String(workflowControlsExpanded));
  }, [workflowControlsExpanded]);

  // Show toast when merge state changes
  useEffect(() => {
    if (mergeState) {
      if (mergeState.status === 'success') {
        setToast({
          type: 'success',
          title: 'Merge Successful',
          message: mergeState.message || 'Branch has been merged to main!',
          duration: 5000
        });
        setTimeout(() => clearMergeState(task.id), 100);
      } else if (mergeState.status === 'error') {
        setToast({
          type: 'error',
          title: 'Merge Failed',
          message: mergeState.message || 'Failed to merge branch.',
          duration: 8000
        });
        setTimeout(() => clearMergeState(task.id), 100);
      }
    }
  }, [mergeState, task.id, clearMergeState]);

  // Get real-time workflow data
  const workflowLogs = getWorkflowLogsForTask(task.id);
  const workflowProgress = getWorkflowProgressForTask(task.id);
  const workflowMetadata = getWorkflowMetadataForTask(task.id);

  const pipeline = getPipelineById(task.pipelineId);
  const workflowStatus = getWorkflowStatusForTask(task.id);
  const websocketStatus = getWebSocketStatus();

  const isReadyToMerge = task.stage === 'ready-to-merge';

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
      setToast({
        type: 'info',
        title: 'Merge Started',
        message: 'Triggering merge workflow...',
        duration: 3000
      });

      const result = await triggerMergeWorkflow(task.id);

      if (result?.success) {
        setToast({
          type: 'info',
          title: 'Merge In Progress',
          message: 'Merge workflow is running. You will be notified when complete.',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Failed to trigger merge:', error);
      setToast({
        type: 'error',
        title: 'Merge Failed',
        message: error.message || 'Failed to trigger merge workflow.',
        duration: 8000
      });
    }
  };

  const handleViewPlan = async () => {
    const adwId = task.metadata?.adw_id || workflowMetadata?.adw_id;
    if (!adwId) {
      console.error('No ADW ID found for this task');
      setPlanError('No ADW ID found for this task. Cannot view plan.');
      setShowPlanModal(true);
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
      // Provide more detailed error message with ADW ID for better debugging
      let errorMessage = 'Failed to load plan file';
      if (error.message) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          errorMessage = `Plan file not found for ADW ID: ${adwId}. The plan may not have been generated yet or the file may have been moved.`;
        } else if (error.message.includes('500') || error.message.includes('Internal server error')) {
          errorMessage = `Server error while loading plan for ADW ID: ${adwId}. Please try again or contact support.`;
        } else {
          errorMessage = `${error.message} (ADW ID: ${adwId})`;
        }
      }
      setPlanError(errorMessage);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleClosePlanModal = () => {
    setShowPlanModal(false);
    // Clear error state when closing to ensure clean state on reopen
    setPlanError(null);
    setPlanContent(null);
  };

  const handleRetryPlanLoad = () => {
    // Retry loading the plan
    handleViewPlan();
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(task);
    }
    onClose();
  };

  const handleDeleteWorktree = async () => {
    const adwId = task.metadata?.adw_id;
    if (!adwId) {
      console.error('No ADW ID found for this task');
      return;
    }

    try {
      const success = await deleteWorktree(adwId);
      if (success) {
        console.log('Deletion request sent, waiting for WebSocket confirmation...');
        // Keep the modal open until WebSocket confirms deletion
        // The modal will close automatically when the task is deleted from the store
      } else {
        // If deletion failed immediately, close the confirmation dialog
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Failed to delete worktree:', error);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {task.title}
              </h2>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <span className="truncate">{task.id}</span>
                <span className="mx-1">•</span>
                <span>{formatPipelineName(task.pipelineId)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={handleEditClick}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Edit Task"
              >
                <Edit className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* ADW Header */}
            {task.metadata?.adw_id && (
              <div className="adw-header p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-700">ADW ID:</span>
                    <span className="text-sm font-mono bg-white px-3 py-1 rounded text-gray-800 truncate border border-gray-200">
                      {task.metadata?.adw_id}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(task.metadata?.adw_id);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      title="Copy ADW ID"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Trigger Workflow Button */}
                  <button
                    onClick={handleTriggerWorkflow}
                    disabled={!websocketStatus.connected}
                    className={`flex items-center space-x-1 text-sm rounded px-3 py-1.5 ml-2 ${
                      websocketStatus.connected
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={websocketStatus.connected ? 'Trigger Workflow' : 'WebSocket Disconnected'}
                  >
                    <Play className="h-4 w-4" />
                    <span>Trigger</span>
                  </button>

                  {/* Delete Worktree Button */}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className={`flex items-center space-x-1 text-sm rounded px-3 py-1.5 ml-2 ${
                      isDeleting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    title="Delete worktree and task"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="whitespace-pre-wrap break-words">
                    {task.description}
                  </p>
                </div>
              </div>
            )}

            {/* Task Metadata */}
            <div>
              <button
                onClick={() => setTaskInfoExpanded(!taskInfoExpanded)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2 hover:text-gray-900"
              >
                <h3 className="text-sm font-medium text-gray-700">Task Information</h3>
                {taskInfoExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {taskInfoExpanded && (
                <div className="grid grid-cols-2 gap-4 text-sm transition-all duration-200">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-500">Created:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-500">Last Updated:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {formatTimeAgo(task.updatedAt)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Logs */}
            {task.logs && task.logs.length > 0 && (
              <div>
                <button
                  onClick={() => setRecentActivityExpanded(!recentActivityExpanded)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2 hover:text-gray-900"
                >
                  <h3 className="text-sm font-medium text-gray-700">Recent Activity</h3>
                  {recentActivityExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {recentActivityExpanded && (
                  <div className="space-y-2 max-h-32 overflow-y-auto transition-all duration-200">
                    {task.logs.slice(-3).map((log, index) => (
                      <div key={index} className="text-sm bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-700">{log.message}</div>
                          {log.timestamp && (
                            <div className="text-gray-500 text-xs">
                              {formatTimeAgo(log.timestamp)}
                            </div>
                          )}
                        </div>
                        {log.substageId && (
                          <div className="text-gray-500 mt-1 text-xs">
                            Stage: {log.stage} → {log.substageName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Plan Viewer */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Implementation Plan</h3>
              <button
                onClick={handleViewPlan}
                disabled={planLoading}
                className="flex items-center space-x-1 text-sm bg-purple-600 text-white rounded px-3 py-1.5 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FileText className="h-4 w-4" />
                <span>{planLoading ? 'Loading...' : 'View Plan'}</span>
              </button>
              {planError && (
                <div className="text-sm text-red-600 mt-1">{planError}</div>
              )}
            </div>

            {/* WebSocket Workflow Controls */}
            <div>
              <button
                onClick={() => setWorkflowControlsExpanded(!workflowControlsExpanded)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2 hover:text-gray-900"
              >
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-gray-700">Workflow Controls</h3>
                  {/* Status summary when collapsed */}
                  {!workflowControlsExpanded && workflowProgress?.status && (
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
                {workflowControlsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {workflowControlsExpanded && (
                <>
              <div className="flex items-center space-x-2 mb-2 transition-all duration-200">
                {/* Toggle Logs */}
                {workflowLogs.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLogs(!showLogs);
                    }}
                    className="flex items-center space-x-1 text-sm bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700"
                  >
                    <Activity className="h-4 w-4" />
                    <span>{showLogs ? 'Hide' : 'Show'} Logs ({workflowLogs.length})</span>
                  </button>
                )}
              </div>

              {/* WebSocket Connection Status */}
              <div className={`text-sm ${websocketStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                WebSocket: {websocketStatus.connected ? 'Connected' : 'Disconnected'}
                {websocketStatus.connecting && ' (Connecting...)'}
              </div>

              {/* Enhanced Workflow Status */}
              {(workflowStatus || workflowProgress) && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm border border-blue-200">
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
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex-1 bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm border border-gray-200">
                  <div className="font-medium text-gray-700 flex items-center justify-between">
                    <span>ADW ID: {task.metadata?.adw_id || workflowMetadata?.adw_id}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(task.metadata?.adw_id || workflowMetadata?.adw_id);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
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
                      className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{planLoading ? 'Loading...' : 'View Plan'}</span>
                    </button>
                  </div>
                </div>
              )}
                </>
              )}
            </div>

            {/* Real-Time Workflow Logs */}
            {showLogs && (
              <div onClick={(e) => e.stopPropagation()}>
                <StageLogsViewer
                  taskId={task.id}
                  adwId={task.metadata?.adw_id}
                  title="Workflow Logs"
                  maxHeight="400px"
                  onClear={() => clearWorkflowLogsForTask(task.id)}
                  showTimestamps={true}
                  autoScroll={true}
                />
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h3>
              <div className="flex space-x-2">
                {/* Show Merge button for ready-to-merge stage */}
                {isReadyToMerge && !task.metadata?.merge_completed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMerge();
                    }}
                    disabled={mergeState?.status === 'in_progress'}
                    className={`flex items-center justify-center space-x-1 flex-1 text-sm rounded px-3 py-1.5 ${
                      mergeState?.status === 'in_progress'
                        ? 'bg-amber-500 text-white cursor-wait'
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    {mergeState?.status === 'in_progress' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Merging...</span>
                      </>
                    ) : (
                      <>
                        <GitMerge className="h-4 w-4" />
                        <span>Merge to Main</span>
                      </>
                    )}
                  </button>
                )}
                {/* Show Merged status indicator for completed merges */}
                {isReadyToMerge && task.metadata?.merge_completed && (
                  <div className="flex items-center justify-center space-x-2 flex-1 text-sm bg-green-50 text-green-600 rounded px-3 py-2 border border-green-200">
                    <CheckCircle className="h-5 w-5" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Merged</span>
                      {task.metadata?.merge_completed_at && (
                        <span className="text-xs text-green-500">
                          {formatTimeAgo(task.metadata.merge_completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Viewer Modal */}
      {showPlanModal && (
        <PlanViewer
          planContent={planContent}
          adwId={task.metadata?.adw_id || workflowMetadata?.adw_id}
          onClose={handleClosePlanModal}
          onRetry={handleRetryPlanLoad}
          isOpen={showPlanModal}
          isLoading={planLoading}
          error={planError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="modal-content bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Worktree
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete this worktree? This will:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc list-inside">
                  <li>Remove the git worktree from trees/{task.metadata?.adw_id}</li>
                  <li>Delete the agents/{task.metadata?.adw_id} directory</li>
                  <li>Kill any processes running on allocated ports</li>
                  <li>Remove this task from the kanban board</li>
                </ul>
                <p className="text-sm font-semibold text-red-600">
                  This action cannot be undone.
                </p>
                {deletionError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">
                      <strong>Error:</strong> {deletionError}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWorktree}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Worktree</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={() => setToast(null)}
          show={!!toast}
        />
      )}
    </>
  );
};

export default TaskDetailsModal;
