/**
 * @fileoverview Card Expand Modal Component - Brutalist Design
 *
 * Displays a large brutalist-styled modal (1200px max-width x 90vh) with:
 * - Left sidebar: Compact info, description, ADW metadata
 * - Right panel: Pipeline stages, stage info banner, logs panel
 *
 * @module components/kanban/CardExpandModal
 */

import { useEffect, useState, useCallback } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import {
  X,
  Edit,
  Copy,
  ArrowLeft,
  RefreshCw,
  Eye,
  ExternalLink,
  Play,
  GitMerge,
  CheckCircle,
  Pencil,
  XCircle,
  Loader2,
  AlertCircle,
  Wrench
} from 'lucide-react';
import Toast from '../ui/Toast';
import MDEditor from '@uiw/react-md-editor';
import ReactMarkdown from 'react-markdown';
import StageLogsViewer from './StageLogsViewer';
import LiveLogsPanel from './LiveLogsPanel';
import AgentLogsPanel from './AgentLogsPanel';
import StageTabsPanel from './StageTabsPanel';
import PatchTabsPanel from './PatchTabsPanel';
import ContentTypeTabs from './ContentTypeTabs';
import ExecutionLogsViewer from './ExecutionLogsViewer';
import ResultViewer from './ResultViewer';
import ClarificationPanel from './ClarificationPanel';
import adwDiscoveryService from '../../services/api/adwDiscoveryService';
import fileOperationsService from '../../services/api/fileOperationsService';
import PatchRequestModal from './PatchRequestModal';

// Stage configuration mapping
const STAGE_CONFIG = {
  plan: { id: 'plan', name: 'PLAN', icon: '📋', abbrev: 'P' },
  build: { id: 'implement', name: 'IMPL', icon: '🔨', abbrev: 'B' },
  implement: { id: 'implement', name: 'IMPL', icon: '🔨', abbrev: 'B' },
  test: { id: 'test', name: 'TEST', icon: '✏️', abbrev: 'T' },
  review: { id: 'review', name: 'REV', icon: '👀', abbrev: 'R' },
  document: { id: 'document', name: 'DOC', icon: '📄', abbrev: 'D' },
  pr: { id: 'pr', name: 'PR', icon: '🔀', abbrev: 'PR' },
  merger: { id: 'merger', name: 'MERGE', icon: '🔀', abbrev: 'M' },
  patch: { id: 'patch', name: 'PATCH', icon: '🔧', abbrev: 'PA' }
};

// Issue type badge configuration
const ISSUE_TYPE_CONFIG = {
  feature: { label: 'FEATURE', icon: '✨', className: 'type-feature' },
  bug: { label: 'BUG', icon: '🐛', className: 'type-bug' },
  chore: { label: 'CHORE', icon: '🔧', className: 'type-chore' },
  patch: { label: 'PATCH', icon: '🩹', className: 'type-patch' },
  task: { label: 'TASK', icon: '📋', className: 'type-task' }
};

const CardExpandModal = ({ task, isOpen, onClose, onEdit }) => {
  const {
    getPipelineById,
    getWebSocketStatus,
    triggerWorkflowForTask,
    getWorkflowLogsForTask,
    getWorkflowProgressForTask,
    getWorkflowMetadataForTask,
    clearWorkflowLogsForTask,
    triggerMergeWorkflow,
    getMergeState,
    clearMergeState,
    applyPatch,
    markTaskAsComplete
  } = useKanbanStore();

  const [viewMode, setViewMode] = useState('details'); // 'details' or 'plan'
  const [planContent, setPlanContent] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [ideOpenLoading, setIdeOpenLoading] = useState(false);
  const [ideOpenSuccess, setIdeOpenSuccess] = useState(false);

  // New two-level tab state
  const [selectedLogStage, setSelectedLogStage] = useState(null); // Primary: stage selection
  const [autoFollowStage, setAutoFollowStage] = useState(true); // Auto-follow running stage
  const [activeContentType, setActiveContentType] = useState('thinking'); // Secondary: execution|thinking|result
  const [executionLogCount, setExecutionLogCount] = useState(0);
  const [thinkingLogCount, setThinkingLogCount] = useState(0);
  const [stageResult, setStageResult] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Patch modal state
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [isPatchSubmitting, setIsPatchSubmitting] = useState(false);

  // Patch selection state
  const [selectedPatch, setSelectedPatch] = useState(null);
  const [viewingPatch, setViewingPatch] = useState(false); // Toggle between stage and patch view

  // Mark as complete state
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  // Get real-time workflow data
  const workflowLogs = getWorkflowLogsForTask(task.id);
  const workflowProgress = getWorkflowProgressForTask(task.id);
  const workflowMetadata = getWorkflowMetadataForTask(task.id);
  const websocketStatus = getWebSocketStatus();

  // Get merge state from store
  const mergeState = getMergeState(task.id);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

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
        // Clear the merge state after showing toast
        setTimeout(() => clearMergeState(task.id), 100);
      } else if (mergeState.status === 'error') {
        setToast({
          type: 'error',
          title: 'Merge Failed',
          message: mergeState.message || 'Failed to merge branch.',
          duration: 8000
        });
        // Clear the merge state after showing toast
        setTimeout(() => clearMergeState(task.id), 100);
      }
    }
  }, [mergeState, task.id, clearMergeState]);

  // Dynamically get pipeline stages from task's queuedStages or pipelineId
  const getPipelineStages = () => {
    // Priority 1: Use queuedStages if available (most accurate)
    if (task.queuedStages && task.queuedStages.length > 0) {
      return task.queuedStages.map(s => {
        const config = STAGE_CONFIG[s.toLowerCase()];
        return config ? {
          id: config.id,
          name: config.name,
          icon: config.icon,
          stage: s.toLowerCase() === 'implement' ? 'build' : s.toLowerCase(),
          abbrev: config.abbrev
        } : {
          id: s,
          name: s.toUpperCase().slice(0, 4),
          icon: '📌',
          stage: s.toLowerCase(),
          abbrev: s.charAt(0).toUpperCase()
        };
      });
    }

    // Priority 2: Parse from pipelineId if it starts with 'adw_'
    if (task.pipelineId && task.pipelineId.startsWith('adw_')) {
      // Handle 'adw_unknown' special case - just show current stage
      if (task.pipelineId === 'adw_unknown') {
        const currentStage = task.stage?.toLowerCase() || 'backlog';
        const config = STAGE_CONFIG[currentStage];
        if (config) {
          return [{
            id: config.id,
            name: config.name,
            icon: config.icon,
            stage: currentStage,
            abbrev: config.abbrev
          }];
        }
        // Fallback for unknown current stage
        return [{
          id: currentStage,
          name: currentStage.toUpperCase().slice(0, 6),
          icon: '📥',
          stage: currentStage,
          abbrev: currentStage.slice(0, 2).toUpperCase()
        }];
      }
      const stages = task.pipelineId.replace('adw_', '').split('_');
      return stages.map(s => {
        const config = STAGE_CONFIG[s.toLowerCase()];
        return config ? {
          id: config.id,
          name: config.name,
          icon: config.icon,
          stage: s.toLowerCase() === 'implement' ? 'build' : s.toLowerCase(),
          abbrev: config.abbrev
        } : {
          id: s,
          name: s.toUpperCase().slice(0, 4),
          icon: '📌',
          stage: s.toLowerCase(),
          abbrev: s.charAt(0).toUpperCase()
        };
      });
    }

    // Fallback: Show just the current stage
    const currentStage = task.stage?.toLowerCase() || 'backlog';
    const config = STAGE_CONFIG[currentStage];
    if (config) {
      return [{
        id: config.id,
        name: config.name,
        icon: config.icon,
        stage: currentStage,
        abbrev: config.abbrev
      }];
    }
    // Ultimate fallback for unknown stage
    return [{
      id: currentStage,
      name: currentStage.toUpperCase().slice(0, 6),
      icon: '📥',
      stage: currentStage,
      abbrev: currentStage.slice(0, 2).toUpperCase()
    }];
  };

  const pipelineStages = getPipelineStages();

  // Get issue type configuration
  const getIssueType = () => {
    // Check multiple possible metadata fields for issue type
    // Priority: state_config.task.work_item_type > issue_type > work_item_type > type
    const type = (
      task.metadata?.state_config?.task?.work_item_type ||
      task.metadata?.issue_type ||
      task.metadata?.work_item_type ||
      task.metadata?.type ||
      task.type ||
      'task'
    ).toLowerCase();
    return ISSUE_TYPE_CONFIG[type] || ISSUE_TYPE_CONFIG.task;
  };

  const issueType = getIssueType();

  // Get current active stage info for the stage info banner
  const getCurrentStageInfo = () => {
    const currentStageLower = task.stage?.toLowerCase();
    // Find the stage in pipeline stages that matches current task stage
    const matchingStage = pipelineStages.find(s =>
      s.stage === currentStageLower ||
      s.id === currentStageLower ||
      (currentStageLower === 'build' && s.stage === 'implement') ||
      (currentStageLower === 'implement' && s.stage === 'build')
    );
    return matchingStage || pipelineStages[0];
  };

  const currentStageInfo = getCurrentStageInfo();

  // Derive the currently running stage from task.stage
  const currentRunningStage = (() => {
    const stageLower = task.stage?.toLowerCase();
    // Map 'build' to 'build' and 'implement' to 'build'
    if (stageLower === 'implement') return 'build';
    if (stageLower === 'ready-to-merge') return null;
    if (stageLower === 'backlog') return null;
    return stageLower;
  })();

  // Auto-follow: update selectedLogStage when running stage changes
  useEffect(() => {
    if (autoFollowStage && currentRunningStage) {
      setSelectedLogStage(currentRunningStage);
    }
  }, [autoFollowStage, currentRunningStage]);

  // Initialize selectedLogStage when pipelineStages become available
  useEffect(() => {
    if (!selectedLogStage && pipelineStages.length > 0) {
      const initialStage = currentRunningStage || pipelineStages[0].stage;
      setSelectedLogStage(initialStage);
    }
  }, [selectedLogStage, pipelineStages, currentRunningStage]);

  // Derive effective stage - use selectedLogStage if set, otherwise fall back to first stage
  const effectiveStage = selectedLogStage || (pipelineStages.length > 0 ? pipelineStages[0].stage : null);

  // Proactively check for result availability (for enabling/disabling Result tab)
  // Poll periodically when no result is available yet
  useEffect(() => {
    const adwId = task.metadata?.adw_id || workflowMetadata?.adw_id;
    if (!adwId || !effectiveStage) return;

    const checkResultAvailability = async () => {
      try {
        const wsPort = import.meta.env.VITE_ADW_PORT || 8500;
        const response = await fetch(`http://localhost:${wsPort}/api/stage-logs/${adwId}/${effectiveStage}`);
        if (response.ok) {
          const data = await response.json();
          if (data?.has_result && data?.result) {
            setStageResult(data.result);
          } else {
            // Keep existing result if we had one (don't clear it)
            if (!stageResult) {
              setStageResult(null);
            }
          }
        }
      } catch (err) {
        console.error('Error checking result availability:', err);
      }
    };

    // Initial check
    checkResultAvailability();

    // Poll every 3 seconds if no result yet
    let pollInterval;
    if (!stageResult) {
      pollInterval = setInterval(checkResultAvailability, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [effectiveStage, task.metadata?.adw_id, workflowMetadata?.adw_id, stageResult]);

  // Fetch full result when switching to result tab
  useEffect(() => {
    const adwId = task.metadata?.adw_id || workflowMetadata?.adw_id;
    if (activeContentType === 'result' && adwId && effectiveStage) {
      setResultLoading(true);
      const wsPort = import.meta.env.VITE_ADW_PORT || 8500;
      fetch(`http://localhost:${wsPort}/api/stage-logs/${adwId}/${effectiveStage}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.result) {
            setStageResult(data.result);
          } else {
            setStageResult(null);
          }
        })
        .catch(() => setStageResult(null))
        .finally(() => setResultLoading(false));
    }
  }, [activeContentType, effectiveStage, task.metadata?.adw_id, workflowMetadata?.adw_id]);

  // Get stages as array of stage names for StageTabsPanel
  // Include 'merger' stage when task is past build stage or has merge activity
  const baseStageName = pipelineStages.map(s => s.stage);
  const stagesAllowingMerge = ['build', 'implement', 'test', 'review', 'document', 'pr', 'ready-to-merge', 'completed'];
  const shouldShowMergeStage = stagesAllowingMerge.includes(task.stage?.toLowerCase()) ||
                                task.metadata?.merge_completed ||
                                task.metadata?.merge_in_progress ||
                                mergeState;
  const stageNames = shouldShowMergeStage
    ? [...baseStageName, 'merger']
    : baseStageName;

  // Handle stage selection (disables auto-follow)
  const handleStageSelect = (stage) => {
    setSelectedLogStage(stage);
    if (autoFollowStage) {
      setAutoFollowStage(false);
    }
  };

  // Handle auto-follow toggle
  const handleAutoFollowToggle = () => {
    const newAutoFollow = !autoFollowStage;
    setAutoFollowStage(newAutoFollow);
    if (newAutoFollow && currentRunningStage) {
      setSelectedLogStage(currentRunningStage);
    }
  };

  // Handle patch selection
  const handlePatchSelect = (patch) => {
    setSelectedPatch(patch);
    setViewingPatch(true);
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
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

  const getStageStatus = (stageId) => {
    // Build stage order from pipeline stages
    const stageOrder = pipelineStages.map(s => s.stage);
    stageOrder.push('ready-to-merge'); // Always add at end

    const currentStage = task.stage;
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stageId === 'implement' ? 'build' : stageId);

    if (currentIndex > stageIndex) return 'completed';
    if (currentIndex === stageIndex) return 'active';
    return 'pending';
  };

  // Build stageStatuses object for StageTabsPanel (after getStageStatus is defined)
  const stageStatuses = pipelineStages.reduce((acc, s) => {
    acc[s.stage] = getStageStatus(s.id);
    return acc;
  }, {});

  // Add merger stage status if shown
  if (shouldShowMergeStage) {
    if (mergeState?.status === 'success' || task.metadata?.merge_completed) {
      stageStatuses['merger'] = 'completed';
    } else if (mergeState?.status === 'in_progress' || mergeState?.status === 'running') {
      stageStatuses['merger'] = 'active';
    } else if (mergeState?.status === 'error') {
      stageStatuses['merger'] = 'error';
    } else {
      stageStatuses['merger'] = task.stage === 'ready-to-merge' ? 'active' : 'pending';
    }
  }

  const calculateProgress = () => {
    // Build stage order from pipeline stages
    const stageOrder = ['backlog', ...pipelineStages.map(s => s.stage), 'ready-to-merge'];
    const currentIndex = stageOrder.indexOf(task.stage);
    const progress = ((currentIndex + 1) / stageOrder.length) * 100;
    return Math.min(Math.max(progress, 0), 100);
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
      // Show immediate feedback that merge is being triggered
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
      // Toast will be shown by the useEffect watching mergeState
      // But show an immediate error toast as well for better UX
      setToast({
        type: 'error',
        title: 'Merge Failed',
        message: error.message || 'Failed to trigger merge workflow.',
        duration: 8000
      });
    }
  };

  const handleMarkComplete = async () => {
    setIsMarkingComplete(true);

    try {
      setToast({
        type: 'info',
        title: 'Marking as Complete',
        message: 'Updating task status...',
        duration: 2000
      });

      const result = await markTaskAsComplete(task.id);

      if (result) {
        setToast({
          type: 'success',
          title: 'Task Completed',
          message: 'Task has been marked as complete.',
          duration: 5000
        });
      } else {
        throw new Error('Failed to mark task as complete');
      }
    } catch (error) {
      console.error('Failed to mark task as complete:', error);
      setToast({
        type: 'error',
        title: 'Mark Complete Failed',
        message: error.message || 'Failed to mark task as complete.',
        duration: 8000
      });
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleApplyPatch = async (patchRequest) => {
    setIsPatchSubmitting(true);
    try {
      setToast({
        type: 'info',
        title: 'Patch Started',
        message: 'Applying patch to the codebase...',
        duration: 3000
      });

      await applyPatch(task.id, patchRequest);

      setToast({
        type: 'success',
        title: 'Patch In Progress',
        message: 'Patch workflow is running. Task moved to Implement stage.',
        duration: 5000
      });

      setShowPatchModal(false);
    } catch (error) {
      console.error('Failed to apply patch:', error);
      setToast({
        type: 'error',
        title: 'Patch Failed',
        message: error.message || 'Failed to apply patch.',
        duration: 8000
      });
    } finally {
      setIsPatchSubmitting(false);
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
    setViewMode('plan');

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

  const handleBackToDetails = () => {
    setViewMode('details');
    setPlanError(null);
  };

  const handleCopyPlan = async () => {
    if (planContent) {
      try {
        await navigator.clipboard.writeText(planContent);
      } catch (err) {
        console.error('Failed to copy plan content:', err);
      }
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
      const serverRelativePath = `../${planFile}`;
      const validation = await fileOperationsService.validateFilePath(serverRelativePath);

      if (!validation.exists) {
        console.error('Plan file does not exist:', planFile);
        alert(`File not found: ${planFile}`);
        return;
      }

      const absolutePath = validation.absolute_path;
      const result = await fileOperationsService.openFileInIde(absolutePath, 1);

      if (result.success) {
        setIdeOpenSuccess(true);
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

  // Check if task can be marked as complete (plan stage onwards, not already completed or errored)
  const stagesAllowingMarkComplete = ['plan', 'build', 'implement', 'test', 'review', 'document', 'pr', 'ready-to-merge'];
  const canMarkComplete = stagesAllowingMarkComplete.includes(task.stage?.toLowerCase());
  const isCompleted = task.stage === 'completed';

  if (!isOpen) return null;

  return (
    <div
      className="brutalist-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="brutalist-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="brutalist-modal-header">
          <div className="brutalist-modal-header-left">
            {viewMode === 'plan' ? (
              <>
                <button
                  type="button"
                  onClick={handleBackToDetails}
                  className="brutalist-header-btn"
                  title="Back to Details"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="brutalist-modal-icon icon-gradient-purple">
                  📄
                </div>
                <div className="brutalist-modal-title-group">
                  <div className="brutalist-modal-title">IMPLEMENTATION PLAN</div>
                  <div className="brutalist-modal-subtitle">
                    <span>{task.metadata?.adw_id || workflowMetadata?.adw_id}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="brutalist-modal-icon icon-gradient-orange">
                  ⚡
                </div>
                <div className="brutalist-modal-title-group">
                  <div className="brutalist-modal-title">{task.title}</div>
                  <div className="brutalist-modal-subtitle">
                    <span>#{task.id}</span>
                    {task.metadata?.adw_id && (
                      <>
                        <span>•</span>
                        <span>{task.metadata.adw_id}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`brutalist-issue-type-badge ${issueType.className}`}>
                  <span className="issue-type-icon">{issueType.icon}</span>
                  <span className="issue-type-label">{issueType.label}</span>
                </div>
              </>
            )}
          </div>

          <div className="brutalist-modal-header-actions">
            {viewMode === 'plan' && planContent && !planLoading && (
              <button
                type="button"
                onClick={handleCopyPlan}
                className="brutalist-header-btn"
                title="Copy Plan"
              >
                <Copy size={18} />
              </button>
            )}

            {viewMode === 'details' && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(task);
                  onClose();
                }}
                className="brutalist-header-btn"
                title="Edit Task"
              >
                <Edit size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="brutalist-header-btn"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BODY */}
        {viewMode === 'plan' ? (
          <div className="plan-view-container">
            <div className="plan-view-content">
              {planLoading ? (
                <div className="plan-view-loading">
                  <div className="plan-view-spinner"></div>
                  <div className="plan-view-loading-text">Loading Plan...</div>
                </div>
              ) : planError ? (
                <div className="plan-view-error">
                  <div className="plan-view-error-icon">⚠️</div>
                  <div className="plan-view-error-title">Error Loading Plan</div>
                  <div className="plan-view-error-text">{planError}</div>
                  <button onClick={handleViewPlan} className="plan-view-retry-btn">
                    <RefreshCw size={14} />
                    <span>RETRY</span>
                  </button>
                </div>
              ) : !planContent ? (
                <div className="empty-logs">
                  <div className="empty-logs-icon">📄</div>
                  <div className="empty-logs-text">No Plan Available</div>
                </div>
              ) : (
                <div data-color-mode="light">
                  <MDEditor.Markdown
                    source={planContent}
                    style={{
                      backgroundColor: 'white',
                      color: '#1f2937',
                      fontSize: '14px',
                      lineHeight: '1.7'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="brutalist-modal-body">
            {/* LEFT SIDEBAR */}
            <div className="brutalist-modal-sidebar">
              {/* COMPACT INFO SECTION */}
              <div className="brutalist-section compact-info-section">
                <div className="compact-info-grid">
                  <div className="compact-info-item">
                    <div className="compact-info-label">STAGE</div>
                    <div className="compact-info-value">{task.stage}</div>
                  </div>
                  <div className="compact-info-item">
                    <div className="compact-info-label">TYPE</div>
                    <div className="compact-info-value">
                      {task.metadata?.issue_type || 'TASK'}
                    </div>
                  </div>
                  <div className="compact-info-item">
                    <div className="compact-info-label">CREATED</div>
                    <div className="compact-info-value">
                      {formatTimeAgo(task.createdAt)}
                    </div>
                  </div>
                  <div className="compact-info-item">
                    <div className="compact-info-label">UPDATED</div>
                    <div className="compact-info-value">
                      {formatTimeAgo(task.updatedAt)}
                    </div>
                  </div>
                </div>

                {/* Mini Pipeline Indicator */}
                <div className="mini-pipeline-indicator">
                  {pipelineStages.map((stage) => (
                    <div
                      key={stage.id}
                      className={`mini-stage-box ${getStageStatus(stage.id)}`}
                      title={stage.name}
                    >
                      {stage.name.charAt(0)}
                    </div>
                  ))}
                </div>
              </div>

              {/* DESCRIPTION SECTION */}
              {task.description && (
                <div className="brutalist-section description-section">
                  <div className="brutalist-section-header">
                    <div className="brutalist-section-icon icon-gradient-orange">
                      📝
                    </div>
                    <div className="brutalist-section-title">DESCRIPTION</div>
                  </div>
                  <div className="description-content">
                    <ReactMarkdown>{task.description}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* ADW METADATA SECTION */}
              {(task.metadata?.adw_id || workflowMetadata?.adw_id) && (
                <div className="brutalist-section metadata-section">
                  <div className="brutalist-section-header">
                    <div className="brutalist-section-icon icon-gradient-purple">
                      📁
                    </div>
                    <div className="brutalist-section-title">ADW METADATA</div>
                  </div>

                  <div className="metadata-grid">
                    <div className="metadata-item">
                      <div className="metadata-label">ADW ID</div>
                      <div className="metadata-value">
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.metadata?.adw_id || workflowMetadata?.adw_id}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyToClipboard(
                              task.metadata?.adw_id || workflowMetadata?.adw_id
                            )
                          }
                          className="metadata-copy-btn"
                          title="Copy ADW ID"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>

                    {(task.metadata?.workflow_status || workflowMetadata?.status) && (
                      <div className="metadata-item">
                        <div className="metadata-label">STATUS</div>
                        <div className="metadata-value">
                          {task.metadata?.workflow_status || workflowMetadata?.status}
                        </div>
                      </div>
                    )}

                    {(task.metadata?.plan_file || workflowMetadata?.plan_file) && (
                      <div className="metadata-item" style={{ gridColumn: '1 / -1' }}>
                        <div className="metadata-label">PLAN FILE</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div className="metadata-value" style={{ flex: 1 }}>
                            {task.metadata?.plan_file || workflowMetadata?.plan_file}
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenPlanFileInIde}
                            disabled={ideOpenLoading}
                            className="brutalist-header-btn"
                            style={{
                              width: 'auto',
                              padding: '6px 12px',
                              fontSize: '9px',
                              background: ideOpenSuccess ? '#10b981' : '#3b82f6'
                            }}
                            title="Open in IDE"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleViewPlan}
                    disabled={planLoading}
                    className="view-plan-btn"
                  >
                    <Eye size={14} />
                    <span>{planLoading ? 'LOADING...' : 'VIEW PLAN'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT PANEL - Clarification or Stage Logs */}
            <div className="brutalist-modal-right-panel">
              {task.stage === 'backlog' && (task.metadata?.clarificationStatus || task.metadata?.clarification_status) !== 'approved' ? (
                /* CLARIFICATION PANEL - Shown when task is in backlog and not yet clarified */
                <ClarificationPanel
                  task={task}
                  onApprove={onClose}
                  onEdit={() => {
                    if (onEdit) {
                      onEdit(task);
                      onClose();
                    }
                  }}
                  onClose={onClose}
                />
              ) : (
                /* NORMAL STAGE LOGS VIEW */
                <>
                  {/* PRIMARY TABS: Stage Selection */}
                  <StageTabsPanel
                    stages={stageNames}
                    activeStage={viewingPatch ? null : effectiveStage}
                    currentRunningStage={currentRunningStage}
                    onStageSelect={(stage) => {
                      handleStageSelect(stage);
                      setViewingPatch(false);
                      setSelectedPatch(null);
                    }}
                    autoFollow={autoFollowStage}
                    onAutoFollowToggle={handleAutoFollowToggle}
                    stageStatuses={stageStatuses}
                  />

                  {/* PATCH TABS: Patch Selection - shown below stage tabs */}
                  {task.metadata?.patch_history?.length > 0 && (
                    <PatchTabsPanel
                      patches={task.metadata.patch_history}
                      activePatch={viewingPatch ? selectedPatch : null}
                      onPatchSelect={handlePatchSelect}
                    />
                  )}

                  {/* SECONDARY TABS: Content Type Selection */}
                  <ContentTypeTabs
                    activeContentType={activeContentType}
                    onContentTypeChange={setActiveContentType}
                    executionLogCount={executionLogCount}
                    thinkingLogCount={thinkingLogCount}
                    hasResult={!!stageResult}
                  />

                  {/* CONTENT PANEL */}
                  <div className="logs-panel stage-content-panel">
                    <div className="logs-container">
                      {viewingPatch && selectedPatch ? (
                        // PATCH VIEW: Show logs for the selected patch
                        // Use patch's adw_id or fallback to task's adw_id
                        activeContentType === 'execution' ? (
                          (selectedPatch.adw_id || task.metadata?.adw_id || workflowMetadata?.adw_id) ? (
                            <ExecutionLogsViewer
                              adwId={selectedPatch.adw_id || task.metadata?.adw_id || workflowMetadata?.adw_id}
                              stage="patch"
                              autoScroll={true}
                              maxHeight="100%"
                              onLogCountChange={setExecutionLogCount}
                            />
                          ) : (
                            <div className="empty-logs">
                              <div className="empty-logs-icon">📊</div>
                              <div className="empty-logs-text">No Execution Logs</div>
                              <div className="empty-logs-subtext">
                                Patch #{selectedPatch.patch_number} has no execution logs available
                              </div>
                            </div>
                          )
                        ) : activeContentType === 'thinking' ? (
                          (selectedPatch.adw_id || task.metadata?.adw_id || workflowMetadata?.adw_id) ? (
                            <AgentLogsPanel
                              taskId={task.id}
                              adwId={selectedPatch.adw_id || task.metadata?.adw_id || workflowMetadata?.adw_id}
                              stage="patch"
                              maxHeight="100%"
                              autoScrollDefault={true}
                              onLogCountChange={setThinkingLogCount}
                            />
                          ) : (
                            <div className="empty-logs">
                              <div className="empty-logs-icon">🧠</div>
                              <div className="empty-logs-text">No Agent Logs</div>
                              <div className="empty-logs-subtext">
                                Patch #{selectedPatch.patch_number} has no agent logs available
                              </div>
                            </div>
                          )
                        ) : activeContentType === 'result' ? (
                          <ResultViewer
                            result={stageResult}
                            loading={resultLoading}
                            error={null}
                            maxHeight="100%"
                          />
                        ) : null
                      ) : (
                        // STAGE VIEW: Show logs for the selected stage
                        activeContentType === 'execution' ? (
                          (task.metadata?.adw_id || workflowMetadata?.adw_id) && effectiveStage ? (
                            <ExecutionLogsViewer
                              adwId={task.metadata?.adw_id || workflowMetadata?.adw_id}
                              stage={effectiveStage}
                              autoScroll={true}
                              maxHeight="100%"
                              onLogCountChange={setExecutionLogCount}
                            />
                          ) : (
                            <div className="empty-logs">
                              <div className="empty-logs-icon">📊</div>
                              <div className="empty-logs-text">No Execution Logs</div>
                              <div className="empty-logs-subtext">
                                Trigger a workflow to see stage execution logs
                              </div>
                            </div>
                          )
                        ) : activeContentType === 'thinking' ? (
                          (task.metadata?.adw_id || workflowMetadata?.adw_id) && effectiveStage ? (
                            <AgentLogsPanel
                              taskId={task.id}
                              adwId={task.metadata?.adw_id || workflowMetadata?.adw_id}
                              stage={effectiveStage}
                              maxHeight="100%"
                              autoScrollDefault={true}
                              onLogCountChange={setThinkingLogCount}
                            />
                          ) : (
                            <div className="empty-logs">
                              <div className="empty-logs-icon">🧠</div>
                              <div className="empty-logs-text">No Agent Logs</div>
                              <div className="empty-logs-subtext">
                                Trigger a workflow to see agent thinking and tool usage
                              </div>
                            </div>
                          )
                        ) : activeContentType === 'result' ? (
                          <ResultViewer
                            result={stageResult}
                            loading={resultLoading}
                            error={null}
                            maxHeight="100%"
                          />
                        ) : null
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="brutalist-modal-footer">
          {viewMode === 'plan' ? (
            <button
              type="button"
              onClick={handleBackToDetails}
              className="brutalist-footer-btn secondary"
            >
              <ArrowLeft size={16} />
              <span>BACK TO DETAILS</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleTriggerWorkflow}
                disabled={!websocketStatus.connected}
                className="brutalist-footer-btn primary"
              >
                <Play size={16} />
                <span>TRIGGER</span>
              </button>

              {/* PATCH - Only visible when task has an ADW ID */}
              {(task.metadata?.adw_id || workflowMetadata?.adw_id) && (
                <button
                  type="button"
                  onClick={() => setShowPatchModal(true)}
                  disabled={!websocketStatus.connected || isPatchSubmitting}
                  className="brutalist-footer-btn patch"
                  title="Apply a quick patch to this task"
                >
                  {isPatchSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>PATCHING...</span>
                    </>
                  ) : (
                    <>
                      <Wrench size={16} />
                      <span>PATCH</span>
                    </>
                  )}
                </button>
              )}

              {/* MERGE TO MAIN - Always visible, disabled when not ready or when merging */}
              {!task.metadata?.merge_completed ? (
                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={!isReadyToMerge || mergeState?.status === 'in_progress'}
                  className={`brutalist-footer-btn ${
                    mergeState?.status === 'in_progress' ? 'merge-in-progress' :
                    isReadyToMerge ? 'merge' : 'merge-disabled'
                  }`}
                  title={
                    mergeState?.status === 'in_progress' ? 'Merge in progress...' :
                    isReadyToMerge ? 'Merge to main branch' : 'Complete all stages to merge'
                  }
                >
                  {mergeState?.status === 'in_progress' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>MERGING...</span>
                    </>
                  ) : (
                    <>
                      <GitMerge size={16} />
                      <span>MERGE TO MAIN</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="brutalist-footer-btn merged">
                  <CheckCircle size={16} />
                  <span>MERGED</span>
                </div>
              )}

              {/* MARK AS COMPLETE - Only visible for eligible stages */}
              {canMarkComplete && !isCompleted && (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={isMarkingComplete}
                  className="brutalist-footer-btn complete"
                  title="Mark this task as complete"
                >
                  {isMarkingComplete ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>MARKING...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>MARK AS COMPLETE</span>
                    </>
                  )}
                </button>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit(task);
                    onClose();
                  }}
                  className="brutalist-footer-btn edit"
                >
                  <Pencil size={16} />
                  <span>EDIT</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="brutalist-footer-btn secondary"
              >
                <XCircle size={16} />
                <span>CLOSE</span>
              </button>
            </>
          )}
        </div>
      </div>

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

      {/* Patch Request Modal */}
      <PatchRequestModal
        task={task}
        isOpen={showPatchModal}
        onClose={() => setShowPatchModal(false)}
        onSubmit={handleApplyPatch}
        isSubmitting={isPatchSubmitting}
      />
    </div>
  );
};

export default CardExpandModal;
