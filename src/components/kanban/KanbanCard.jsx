import { useState } from 'react';
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
  Edit
} from 'lucide-react';
import {
  getSubstages,
  getSubstage
} from '../../utils/substages';
import WorkflowTriggerModal from '../forms/WorkflowTriggerModal';

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
    getWebSocketStatus
  } = useKanbanStore();

  const [showMenu, setShowMenu] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

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

  const getProgressColor = () => {
    if (task.stage === 'errored') return 'bg-red-500';
    if (task.progress === 100) return 'bg-green-500';
    if (task.progress > 0) return 'bg-blue-500';
    return 'bg-gray-300';
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
      case 'pr':
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

  const handleTriggerWorkflow = () => {
    setShowWorkflowModal(true);
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(task);
    }
    setShowMenu(false);
  };

  const handleWorkflowModalClose = () => {
    setShowWorkflowModal(false);
  };

  return (
    <div
      className={`kanban-card ${
        isSelected ? 'selected' : ''
      } ${progressionStatus.active ? 'auto-progress' : ''}`}
      onClick={handleCardClick}
    >
      <div className="p-4">
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

        {/* Description */}
        {task.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Substage Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="capitalize font-medium">{task.substage || 'waiting'}</span>
            <span>{Math.round(task.progress || 0)}%</span>
          </div>

          {/* Substage Steps */}
          <div className="flex items-center space-x-1 mb-2">
            {getSubstages(task.stage).map((substage) => {
              const isCompleted = task.substage === substage.id && task.progress === 100;
              const isCurrent = task.substage === substage.id;

              return (
                <div
                  key={substage.id}
                  className="flex-1 relative"
                  title={substage.name}
                >
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCompleted ? 'bg-green-500' :
                    isCurrent ? getProgressColor() :
                    'bg-gray-200'
                  }`}>
                    {isCurrent && (
                      <div
                        className="progress-bar progress-bar-glow h-full bg-current rounded-full"
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    )}
                  </div>

                  {/* Substage Indicator */}
                  <div className={`substage-indicator absolute -top-2 left-0 border-2 ${
                    isCompleted ? 'completed bg-green-500 border-green-500' :
                    isCurrent ? 'active bg-blue-500 border-blue-500' :
                    'bg-gray-200 border-gray-300'
                  }`} />
                </div>
              );
            })}
          </div>

          {/* Current Substage Name */}
          <div className="text-xs text-gray-600">
            {getSubstage(task.stage, task.substage)?.name || task.substage || 'Waiting'}
          </div>
        </div>

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

              {/* Detailed Substage Progress */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">Stage Progress</div>
                <div className="space-y-2">
                  {getSubstages(task.stage).map((substage) => {
                    const isCompleted = task.substage === substage.id && task.progress === 100;
                    const isCurrent = task.substage === substage.id;
                    const substageProgress = isCurrent ? task.progress : (isCompleted ? 100 : 0);

                    return (
                      <div key={substage.id} className="flex items-center space-x-3">
                        {/* Status Icon */}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isCompleted ? 'bg-green-500 border-green-500' :
                          isCurrent ? 'bg-blue-500 border-blue-500' :
                          'border-gray-300'
                        }`}>
                          {isCompleted && <CheckCircle2 className="w-2 h-2 text-white" />}
                          {isCurrent && !isCompleted && <Circle className="w-2 h-2 text-white fill-current" />}
                        </div>

                        {/* Substage Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${
                              isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                            }`}>
                              {substage.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {Math.round(substageProgress)}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                            <div
                              className={`h-1 rounded-full transition-all duration-300 ${
                                isCompleted ? 'bg-green-500' :
                                isCurrent ? 'bg-blue-500' :
                                'bg-gray-300'
                              }`}
                              style={{ width: `${substageProgress}%` }}
                            />
                          </div>

                          {/* Description */}
                          <div className="text-xs text-gray-400 mt-1 truncate">
                            {substage.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                      disabled={task.stage === 'pr' && task.progress === 100}
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

              {/* WebSocket Workflow Controls */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">WebSocket Workflow</div>
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTriggerWorkflow();
                    }}
                    disabled={!websocketStatus.connected}
                    className={`flex items-center space-x-1 text-xs rounded px-2 py-1 ${
                      websocketStatus.connected
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="h-3 w-3" />
                    <span>Configure Workflow</span>
                  </button>
                </div>

                {/* WebSocket Connection Status */}
                <div className={`text-xs ${websocketStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                  WebSocket: {websocketStatus.connected ? 'Connected' : 'Disconnected'}
                  {websocketStatus.connecting && ' (Connecting...)'}
                </div>

                {/* Workflow Status */}
                {workflowStatus && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <div className="font-medium text-blue-800">
                      Workflow: {workflowStatus.workflowName}
                    </div>
                    <div className="text-blue-600">
                      Status: {workflowStatus.status}
                      {workflowStatus.progress !== undefined && ` (${workflowStatus.progress}%)`}
                    </div>
                    {workflowStatus.lastUpdate && (
                      <div className="text-blue-500 mt-1">
                        {workflowStatus.lastUpdate}
                      </div>
                    )}
                  </div>
                )}

                {/* ADW Metadata Display */}
                {task.metadata?.adw_id && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <div className="font-medium text-gray-700">
                      ADW ID: {task.metadata.adw_id}
                    </div>
                    {task.metadata.workflow_status && (
                      <div className="text-gray-600">
                        Status: {task.metadata.workflow_status}
                      </div>
                    )}
                    {task.metadata.logs_path && (
                      <div className="text-gray-500">
                        Logs: {task.metadata.logs_path}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-2">
                {getNextStage() && (
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
      </div>

      {/* Click outside handler */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Workflow Trigger Modal */}
      {showWorkflowModal && (
        <WorkflowTriggerModal
          task={task}
          onClose={handleWorkflowModalClose}
        />
      )}
    </div>
  );
};

export default KanbanCard;