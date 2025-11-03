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

import { useState } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import {
  X,
  Clock,
  Play,
  Pause,
  CheckCircle,
  Activity,
  FileText,
  Eye,
  GitMerge,
  Edit,
  ArrowRight
} from 'lucide-react';
import StageLogsViewer from './StageLogsViewer';
import PlanViewer from './PlanViewer';
import adwDiscoveryService from '../../services/api/adwDiscoveryService';

const TaskDetailsModal = ({ task, onClose, onEdit }) => {
  const {
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

  const [showLogs, setShowLogs] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planContent, setPlanContent] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);

  // Get real-time workflow data
  const workflowLogs = getWorkflowLogsForTask(task.id);
  const workflowProgress = getWorkflowProgressForTask(task.id);
  const workflowMetadata = getWorkflowMetadataForTask(task.id);

  const pipeline = getPipelineById(task.pipelineId);
  const progressionStatus = getTaskProgressionStatus(task.id);
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
    onClose();
  };

  return (
    <>
      <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {task.title}
              </h2>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <span className="truncate">#{task.id}</span>
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
          <div className="p-6 space-y-6">
            {/* ADW Header */}
            {task.metadata?.adw_id && (
              <div className="adw-header p-4 bg-gray-50 rounded-lg border border-gray-200">
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
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="whitespace-pre-wrap break-words">
                    {task.description}
                  </p>
                </div>
              </div>
            )}

            {/* Task Metadata */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Task Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500">Created:</span>
                  <div className="font-medium text-gray-900 mt-1">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500">Last Updated:</span>
                  <div className="font-medium text-gray-900 mt-1">
                    {formatTimeAgo(task.updatedAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Logs */}
            {task.logs && task.logs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
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
              </div>
            )}

            {/* Progression Controls */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Automatic Progression</h3>
              <div className="flex items-center space-x-2 mb-2">
                {progressionStatus.active ? (
                  <>
                    {progressionStatus.paused ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resumeTaskProgression(task.id);
                        }}
                        className="flex items-center space-x-1 text-sm bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4" />
                        <span>Resume</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          pauseTaskProgression(task.id);
                        }}
                        className="flex items-center space-x-1 text-sm bg-yellow-600 text-white rounded px-3 py-1.5 hover:bg-yellow-700"
                      >
                        <Pause className="h-4 w-4" />
                        <span>Pause</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        stopTaskProgression(task.id);
                      }}
                      className="flex items-center space-x-1 text-sm bg-red-600 text-white rounded px-3 py-1.5 hover:bg-red-700"
                    >
                      <Pause className="h-4 w-4" />
                      <span>Stop</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startTaskProgression(task.id);
                    }}
                    className="flex items-center space-x-1 text-sm bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"
                    disabled={task.stage === 'document' && task.progress === 100}
                  >
                    <Play className="h-4 w-4" />
                    <span>Start Auto</span>
                  </button>
                )}
              </div>

              {progressionStatus.active && (
                <div className="text-sm text-gray-500">
                  Auto-progression started {formatTimeAgo(progressionStatus.startedAt)}
                </div>
              )}

              {task.stage === 'errored' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    recoverTaskFromError(task.id);
                  }}
                  className="flex items-center space-x-1 text-sm bg-purple-600 text-white rounded px-3 py-1.5 hover:bg-purple-700 mt-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Recover from Error</span>
                </button>
              )}
            </div>

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
              <h3 className="text-sm font-medium text-gray-700 mb-2">Workflow Controls</h3>
              <div className="flex items-center space-x-2 mb-2">
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
                    className="flex items-center justify-center space-x-1 flex-1 text-sm bg-teal-600 text-white rounded px-3 py-1.5 hover:bg-teal-700"
                  >
                    <GitMerge className="h-4 w-4" />
                    <span>Merge to Main</span>
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
                {getNextStage() && !isReadyToMerge && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToNextStage();
                    }}
                    className="flex items-center space-x-1 flex-1 text-sm bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>Move to {getNextStage().name}</span>
                  </button>
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
    </>
  );
};

export default TaskDetailsModal;
