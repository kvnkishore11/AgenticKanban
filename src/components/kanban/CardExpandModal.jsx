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
  Activity,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import StageLogsViewer from './StageLogsViewer';
import PlanViewer from './PlanViewer';
import LiveLogsPanel from './LiveLogsPanel';
import StageProgressionIndicator from './StageProgressionIndicator';
import adwDiscoveryService from '../../services/api/adwDiscoveryService';
import fileOperationsService from '../../services/api/fileOperationsService';
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
  const [ideOpenLoading, setIdeOpenLoading] = useState(false);
  const [ideOpenSuccess, setIdeOpenSuccess] = useState(false);
  const [activeLogsTab, setActiveLogsTab] = useState('live'); // 'live' or 'historical'

  // Get real-time workflow data
  const workflowLogs = getWorkflowLogsForTask(task.id);
  const workflowProgress = getWorkflowProgressForTask(task.id);
  const workflowMetadata = getWorkflowMetadataForTask(task.id);
  const pipeline = getPipelineById(task.pipelineId);
  const websocketStatus = getWebSocketStatus();

  console.log('[CardExpandModal] Rendering with:', {
    taskId: task.id,
    taskTitle: task.title,
    adw_id: task.metadata?.adw_id,
    workflowLogsLength: workflowLogs.length,
    websocketConnected: websocketStatus.connected,
    hasMetadata: !!workflowMetadata,
    logs: workflowLogs
  });

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

  const handleOpenPlanFileInIde = async () => {
    const planFile = task.metadata?.plan_file || workflowMetadata?.plan_file;
    if (!planFile) {
      console.error('No plan file path found');
      return;
    }

    setIdeOpenLoading(true);
    setIdeOpenSuccess(false);

    try {
      // The plan file path is relative to the project root
      // The backend server runs from the server/ directory, so we need to prepend ../
      const serverRelativePath = `../${planFile}`;

      // Validate the file path and get the absolute path
      const validation = await fileOperationsService.validateFilePath(serverRelativePath);

      if (!validation.exists) {
        console.error('Plan file does not exist:', planFile);
        alert(`File not found: ${planFile}`);
        return;
      }

      const absolutePath = validation.absolute_path;

      // Open the file in IDE
      const result = await fileOperationsService.openFileInIde(absolutePath, 1);

      if (result.success) {
        setIdeOpenSuccess(true);
        // Reset success indicator after 2 seconds
        setTimeout(() => setIdeOpenSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Failed to open file in IDE:', error);
      alert(`Failed to open file in IDE: ${error.message}`);
    } finally {
      setIdeOpenLoading(false);
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
          <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Activity className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-800 truncate">
                  {task.title}
                </h2>
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <span>{task.id}</span>
                  {task.metadata?.adw_id && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{task.metadata.adw_id}</span>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Card Information Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                Card Information
              </h3>

              {/* Metadata Grid - All in one row */}
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Stage</label>
                  <div className="font-medium text-gray-800 capitalize text-xs">{task.stage}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Pipeline</label>
                  <div className="font-medium text-gray-800 text-xs truncate" title={formatPipelineName(task.pipelineId)}>{formatPipelineName(task.pipelineId)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Created</label>
                  <div className="font-medium text-gray-800 text-xs">{new Date(task.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Updated</label>
                  <div className="font-medium text-gray-800 text-xs">{formatTimeAgo(task.updatedAt)}</div>
                </div>
              </div>

              {/* Enhanced Description with Markdown Rendering */}
              {task.description && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">Description</label>
                  <div className="text-sm text-gray-800 bg-white p-4 rounded border border-gray-300 prose prose-sm max-w-none">
                    <ReactMarkdown>{task.description}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow Status Section */}
            {(workflowProgress || workflowMetadata) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-blue-800 flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Workflow Status
                  </h3>
                  <div className="flex items-center gap-2">
                    {workflowProgress?.status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        workflowProgress.status === 'completed' ? 'bg-green-100 text-green-700' :
                        workflowProgress.status === 'failed' ? 'bg-red-100 text-red-700' :
                        workflowProgress.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {workflowProgress.status}
                      </span>
                    )}
                    {/* Workflow completion badges inline */}
                    {task.metadata?.workflow_complete && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </span>
                    )}
                    {task.stage === 'pr' && task.metadata?.workflow_complete && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        <GitPullRequest className="h-3 w-3 mr-1" />
                        Ready
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage Progression Indicator */}
                <StageProgressionIndicator
                  currentStage={task.stage}
                  queuedStages={task.queuedStages || []}
                  workflowProgress={workflowProgress}
                  workflowComplete={task.metadata?.workflow_complete}
                  showProgressBar={true}
                  showPercentage={true}
                  compact={false}
                />

                {/* Inline Current Step and Message */}
                {(workflowProgress?.currentStep || workflowProgress?.message) && (
                  <div className="text-xs text-blue-800 bg-white px-2 py-1.5 rounded border border-blue-200">
                    {workflowProgress?.currentStep && (
                      <span className="font-medium">{workflowProgress.currentStep}</span>
                    )}
                    {workflowProgress?.currentStep && workflowProgress?.message && (
                      <span className="mx-1">•</span>
                    )}
                    {workflowProgress?.message && (
                      <span>{workflowProgress.message}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ADW Metadata Section */}
            {(task.metadata?.adw_id || workflowMetadata?.adw_id) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gray-600" />
                  ADW Metadata
                </h3>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  {/* ADW ID */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">ADW ID</label>
                    <div className="flex items-center space-x-1">
                      <code className="flex-1 bg-white px-2 py-1 rounded border border-gray-200 text-xs font-mono truncate">
                        {task.metadata?.adw_id || workflowMetadata?.adw_id}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyToClipboard(task.metadata?.adw_id || workflowMetadata?.adw_id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
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
                      <div className="bg-white px-2 py-1 rounded border border-gray-200 text-xs truncate" title={task.metadata?.workflow_name || workflowMetadata?.workflow_name}>
                        {task.metadata?.workflow_name || workflowMetadata?.workflow_name}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  {(task.metadata?.workflow_status || workflowMetadata?.status) && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                      <div className="bg-white px-2 py-1 rounded border border-gray-200 text-xs truncate">
                        {task.metadata?.workflow_status || workflowMetadata?.status}
                      </div>
                    </div>
                  )}

                  {/* Logs Path */}
                  {(task.metadata?.logs_path || workflowMetadata?.logs_path) && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Logs Path</label>
                      <div className="bg-white px-2 py-1 rounded border border-gray-200 text-xs font-mono truncate"
                           title={task.metadata?.logs_path || workflowMetadata?.logs_path}>
                        {task.metadata?.logs_path || workflowMetadata?.logs_path}
                      </div>
                    </div>
                  )}

                  {/* Plan File Path with Open in IDE button */}
                  {(task.metadata?.plan_file || workflowMetadata?.plan_file) && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Plan File</label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-white px-2 py-1 rounded border border-gray-200 text-xs font-mono truncate"
                             title={task.metadata?.plan_file || workflowMetadata?.plan_file}>
                          {task.metadata?.plan_file || workflowMetadata?.plan_file}
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenPlanFileInIde}
                          disabled={ideOpenLoading}
                          className={`flex items-center justify-center space-x-1 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                            ideOpenSuccess
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white'
                          }`}
                          title="Open file in VS Code or Cursor"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>{ideOpenLoading ? 'Opening...' : ideOpenSuccess ? 'Opened!' : 'Open in IDE'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* View Plan Button integrated in grid */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleViewPlan}
                      disabled={planLoading}
                      className="flex items-center justify-center space-x-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded text-xs transition-colors w-full"
                    >
                      <Eye className="h-3 w-3" />
                      <span>{planLoading ? 'Loading...' : 'View Plan'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Logs Section */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Logs Header with Tabs */}
              <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-green-600" />
                    Workflow Logs
                  </h3>
                  <span className="text-xs font-normal text-gray-500">
                    ({workflowLogs.length})
                  </span>

                  {/* Tab Buttons */}
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      type="button"
                      onClick={() => setActiveLogsTab('live')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        activeLogsTab === 'live'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Live Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLogsTab('historical')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        activeLogsTab === 'historical'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      All Logs
                    </button>
                  </div>
                </div>

                {/* WebSocket Status */}
                <div className={`text-xs px-2 py-0.5 rounded ${
                  websocketStatus.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {websocketStatus.connected ? 'Connected' : 'Disconnected'}
                </div>
              </div>

              {/* Logs Content */}
              <div className="p-3">
                {activeLogsTab === 'live' ? (
                  task.metadata?.adw_id ? (
                    <LiveLogsPanel
                      taskId={task.id}
                      maxHeight="500px"
                      autoScrollDefault={true}
                    />
                  ) : (
                    <div className="text-sm text-gray-600 text-center py-8 space-y-2">
                      <div className="font-medium">No workflow started yet</div>
                      <div className="text-xs text-gray-500">
                        Trigger a workflow to see live logs
                      </div>
                    </div>
                  )
                ) : (
                  task.metadata?.adw_id ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <StageLogsViewer
                        taskId={task.id}
                        adwId={task.metadata?.adw_id}
                        title="All Logs"
                        maxHeight="500px"
                        onClear={() => clearWorkflowLogsForTask(task.id)}
                        showTimestamps={true}
                        autoScroll={true}
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 text-center py-8 space-y-2">
                      <div className="font-medium">No logs available yet</div>
                      <div className="text-xs text-gray-500">
                        No workflow associated with this task
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Actions Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Actions</h3>

              {/* Workflow Controls */}
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={handleTriggerWorkflow}
                  disabled={!websocketStatus.connected}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded text-xs transition-colors ${
                    websocketStatus.connected
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={websocketStatus.connected ? 'Trigger Workflow' : 'WebSocket Disconnected'}
                >
                  <Play className="h-3 w-3" />
                  <span>Trigger Workflow</span>
                </button>

                {/* Merge Button for ready-to-merge */}
                {isReadyToMerge && !task.metadata?.merge_completed && (
                  <button
                    type="button"
                    onClick={handleMerge}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 transition-colors"
                  >
                    <GitMerge className="h-3 w-3" />
                    <span>Merge to Main</span>
                  </button>
                )}

                {/* Merged Status */}
                {isReadyToMerge && task.metadata?.merge_completed && (
                  <div className="flex items-center space-x-1 px-3 py-1.5 bg-green-50 text-green-600 rounded text-xs border border-green-200">
                    <CheckCircle className="h-3 w-3" />
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

          {/* Footer */}
          <div className="flex items-center justify-end p-2 border-t border-gray-200 bg-gray-50 rounded-b-lg space-x-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(task);
                  onClose();
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
              >
                Edit Task
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors text-sm"
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
