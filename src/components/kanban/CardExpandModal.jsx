/**
 * @fileoverview Card Expand Modal Component
 *
 * Displays a large modal (70% width x 90% height) with comprehensive
 * card information including workflow status, logs, metadata, and actions.
 *
 * @module components/kanban/CardExpandModal
 */

import { useEffect } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import {
  X,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Edit,
  FileText,
  GitMerge,
  Eye,
  Copy,
  GitPullRequest,
  Activity
} from 'lucide-react';
import StageLogsViewer from './StageLogsViewer';
import PlanViewer from './PlanViewer';
import adwDiscoveryService from '../../services/api/adwDiscoveryService';
import { useState } from 'react';

const CardExpandModal = ({ task, isOpen, onClose, onEdit }) => {
  const {
    getPipelineById,
    getWebSocketStatus,
    triggerWorkflowForTask,
    getWorkflowLogsForTask,
    getWorkflowProgressForTask,
    getWorkflowMetadataForTask,
    clearWorkflowLogsForTask,
    triggerMergeWorkflow
  } = useKanbanStore();

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planContent, setPlanContent] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);

  // Get real-time workflow data
  const workflowLogs = getWorkflowLogsForTask(task.id);
  const workflowProgress = getWorkflowProgressForTask(task.id);
  const workflowMetadata = getWorkflowMetadataForTask(task.id);
  const pipeline = getPipelineById(task.pipelineId);
  const websocketStatus = getWebSocketStatus();

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

  // Format dynamic pipeline names for display
  const formatPipelineName = (pipelineId) => {
    if (!pipelineId) return 'Unknown Pipeline';

    if (pipelineId.startsWith('adw_')) {
      const stageNames = pipelineId.replace('adw_', '').split('_');
      const capitalizedStages = stageNames.map(stage =>
        stage.charAt(0).toUpperCase() + stage.slice(1)
      );
      return `ADW: ${capitalizedStages.join(' → ')}`;
    }

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

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const isReadyToMerge = task.stage === 'ready-to-merge';

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        {/* Modal Container */}
        <div
          className="card-expand-modal bg-white rounded-lg shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '70vw',
            height: '90vh',
            maxWidth: '1400px',
            zIndex: 51
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Activity className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-800 truncate">
                  {task.title}
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>#{task.id}</span>
                  {task.metadata?.adw_id && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-xs">{task.metadata.adw_id}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Edit Button */}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit(task);
                    onClose();
                  }}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Edit Task"
                >
                  <Edit className="h-4 w-4 text-gray-600" />
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Close"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Card Information Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                Card Information
              </h3>

              {/* Full Description */}
              {task.description && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                    {task.description}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Stage</label>
                  <div className="font-medium text-gray-800 capitalize">{task.stage}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Pipeline</label>
                  <div className="font-medium text-gray-800">{formatPipelineName(task.pipelineId)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Created</label>
                  <div className="font-medium text-gray-800">{new Date(task.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Updated</label>
                  <div className="font-medium text-gray-800">{formatTimeAgo(task.updatedAt)}</div>
                </div>
              </div>
            </div>

            {/* Workflow Status Section */}
            {(workflowProgress || workflowMetadata) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-blue-800 flex items-center justify-between">
                  <span className="flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Workflow Status
                  </span>
                  {workflowProgress?.status && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      workflowProgress.status === 'completed' ? 'bg-green-100 text-green-700' :
                      workflowProgress.status === 'failed' ? 'bg-red-100 text-red-700' :
                      workflowProgress.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {workflowProgress.status}
                    </span>
                  )}
                </h3>

                {/* Progress Bar */}
                {(workflowProgress?.progress !== undefined) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-blue-700 font-medium">Progress</span>
                      <span className="text-xs text-blue-700 font-semibold">
                        {Math.round(workflowProgress.progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${workflowProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Current Step */}
                {workflowProgress?.currentStep && (
                  <div>
                    <label className="text-xs font-medium text-blue-700 block mb-1">Current Step</label>
                    <div className="text-sm text-blue-800 bg-white p-2 rounded border border-blue-200">
                      {workflowProgress.currentStep}
                    </div>
                  </div>
                )}

                {/* Message */}
                {workflowProgress?.message && (
                  <div>
                    <label className="text-xs font-medium text-blue-700 block mb-1">Status Message</label>
                    <div className="text-sm text-blue-800 bg-white p-2 rounded border border-blue-200">
                      {workflowProgress.message}
                    </div>
                  </div>
                )}

                {/* Workflow completion badges */}
                <div className="flex flex-wrap gap-2">
                  {task.metadata?.workflow_complete && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Workflow Complete
                    </span>
                  )}
                  {task.stage === 'pr' && task.metadata?.workflow_complete && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                      <GitPullRequest className="h-3 w-3 mr-1" />
                      Ready to Merge
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ADW Metadata Section */}
            {(task.metadata?.adw_id || workflowMetadata?.adw_id) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gray-600" />
                  ADW Metadata
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {/* ADW ID */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">ADW ID</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-200 text-xs font-mono">
                        {task.metadata?.adw_id || workflowMetadata?.adw_id}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyToClipboard(task.metadata?.adw_id || workflowMetadata?.adw_id)}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                        title="Copy ADW ID"
                      >
                        <Copy className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Workflow Name */}
                  {(task.metadata?.workflow_name || workflowMetadata?.workflow_name) && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Workflow Name</label>
                      <div className="bg-white px-3 py-2 rounded border border-gray-200">
                        {task.metadata?.workflow_name || workflowMetadata?.workflow_name}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  {(task.metadata?.workflow_status || workflowMetadata?.status) && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                      <div className="bg-white px-3 py-2 rounded border border-gray-200">
                        {task.metadata?.workflow_status || workflowMetadata?.status}
                      </div>
                    </div>
                  )}

                  {/* Logs Path */}
                  {(task.metadata?.logs_path || workflowMetadata?.logs_path) && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Logs Path</label>
                      <div className="bg-white px-3 py-2 rounded border border-gray-200 text-xs font-mono truncate"
                           title={task.metadata?.logs_path || workflowMetadata?.logs_path}>
                        {task.metadata?.logs_path || workflowMetadata?.logs_path}
                      </div>
                    </div>
                  )}

                  {/* Plan File Path */}
                  {(task.metadata?.plan_file || workflowMetadata?.plan_file) && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Plan File</label>
                      <div className="bg-white px-3 py-2 rounded border border-gray-200 text-xs font-mono truncate"
                           title={task.metadata?.plan_file || workflowMetadata?.plan_file}>
                        {task.metadata?.plan_file || workflowMetadata?.plan_file}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Plan Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleViewPlan}
                    disabled={planLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>{planLoading ? 'Loading...' : 'View Plan'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Workflow Logs Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-green-600" />
                  Workflow Logs
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({workflowLogs.length} entries)
                  </span>
                </h3>

                {/* WebSocket Status */}
                <div className={`text-xs px-2 py-1 rounded ${
                  websocketStatus.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {websocketStatus.connected ? 'Connected' : 'Disconnected'}
                </div>
              </div>

              {/* Enhanced Logs Viewer with tabs */}
              {workflowLogs.length > 0 || task.metadata?.adw_id ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <StageLogsViewer
                    taskId={task.id}
                    adwId={task.metadata?.adw_id}
                    title="Workflow Logs"
                    maxHeight="500px"
                    onClear={() => clearWorkflowLogsForTask(task.id)}
                    showTimestamps={true}
                    autoScroll={true}
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  No logs available yet
                </div>
              )}
            </div>

            {/* Actions Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Actions</h3>

              {/* Workflow Controls */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Workflow Controls</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerWorkflow}
                    disabled={!websocketStatus.connected}
                    className={`flex items-center space-x-2 px-4 py-2 rounded text-sm transition-colors ${
                      websocketStatus.connected
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={websocketStatus.connected ? 'Trigger Workflow' : 'WebSocket Disconnected'}
                  >
                    <Play className="h-4 w-4" />
                    <span>Trigger Workflow</span>
                  </button>

                  {/* Merge Button for ready-to-merge */}
                  {isReadyToMerge && !task.metadata?.merge_completed && (
                    <button
                      type="button"
                      onClick={handleMerge}
                      className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 transition-colors"
                    >
                      <GitMerge className="h-4 w-4" />
                      <span>Merge to Main</span>
                    </button>
                  )}

                  {/* Merged Status */}
                  {isReadyToMerge && task.metadata?.merge_completed && (
                    <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-600 rounded text-sm border border-green-200">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Merged</span>
                      {task.metadata?.merge_completed_at && (
                        <span className="text-xs">
                          {formatTimeAgo(task.metadata.merge_completed_at)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg space-x-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(task);
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Edit Task
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
            >
              Close
            </button>
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

export default CardExpandModal;
