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

import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useKanbanStore } from '../../stores/kanbanStore';
import CardExpandModal from './CardExpandModal';
import { useStageTransition } from '../../hooks/useStageTransition';
import adwService from '../../services/api/adwService';

// Stable empty array reference to prevent infinite re-renders
// When a selector returns `|| []`, it creates a new array each time,
// causing React to think the value changed and triggering re-renders
const EMPTY_LOGS = [];

const KanbanCard = memo(({ task, onEdit }) => {
  // Use individual selectors instead of subscribing to entire store
  // Actions are stable and don't cause re-renders
  const deleteWorktree = useKanbanStore(state => state.deleteWorktree);
  const triggerWorkflowForTask = useKanbanStore(state => state.triggerWorkflowForTask);

  // Subscribe only to data relevant to this specific task
  const adwId = task.metadata?.adw_id;
  // Use stable EMPTY_LOGS reference to prevent infinite re-renders when logs don't exist
  const taskWorkflowLogs = useKanbanStore(state => state.taskWorkflowLogs?.[task.id] || EMPTY_LOGS);
  const taskWorkflowProgress = useKanbanStore(state => state.taskWorkflowProgress?.[task.id] || null);
  // Use deletingAdws (the actual state key in the store)
  const deletionState = useKanbanStore(state => adwId ? state.deletingAdws?.[adwId] : null);
  const websocketConnected = useKanbanStore(state => state.websocketConnected);

  const [showMenu, setShowMenu] = useState(false);
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [openWorktreeStatus, setOpenWorktreeStatus] = useState('idle'); // 'idle' | 'opening' | 'success' | 'error'
  const [openWorktreeMessage, setOpenWorktreeMessage] = useState('');
  const [openCodebaseStatus, setOpenCodebaseStatus] = useState('idle'); // 'idle' | 'opening' | 'success' | 'error'
  const [openCodebaseMessage, setOpenCodebaseMessage] = useState('');
  const menuRef = useRef(null);

  // Derived state for backwards compatibility
  const isOpeningWorktree = openWorktreeStatus === 'opening';
  const isOpeningCodebase = openCodebaseStatus === 'opening';

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    // Add listener on next tick to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  // Use memoized values directly from selectors (no function calls on render)
  const workflowLogs = taskWorkflowLogs;
  const workflowProgress = taskWorkflowProgress;
  const isDeleting = deletionState?.loading || false;

  // Use stage transition hook for animations
  const { getTransitionClass, getGlowClass, shouldPulse } = useStageTransition(task, workflowProgress);

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}M`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}H`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}D`;
  };

  // Get stage abbreviation for pipeline indicator
  const getStageAbbreviation = (stage) => {
    const abbreviations = {
      'plan': 'P',
      'build': 'B',
      'implement': 'B',
      'test': 'T',
      'review': 'R',
      'document': 'D',
      'pr': 'PR'
    };
    return abbreviations[stage.toLowerCase()] || stage.charAt(0).toUpperCase();
  };

  // Get pipeline stages from queuedStages or pipelineId
  const getPipelineStages = () => {
    // Priority 1: Use queuedStages if available (most accurate)
    if (task.queuedStages && task.queuedStages.length > 0) {
      return task.queuedStages.map(s => getStageAbbreviation(s));
    }

    // Priority 2: Parse from pipelineId if it starts with 'adw_'
    if (task.pipelineId && task.pipelineId.startsWith('adw_')) {
      const stages = task.pipelineId.replace('adw_', '').split('_');
      return stages.map(s => getStageAbbreviation(s));
    }

    // Fallback: Default 2 stages
    return ['P', 'B'];
  };

  // Get current stage index dynamically based on actual pipeline stages
  const getCurrentStageIndex = () => {
    const stages = getPipelineStages();
    const currentStageAbbrev = getStageAbbreviation(task.stage);
    return stages.indexOf(currentStageAbbrev);
  };

  const handleCardClick = () => {
    setShowExpandModal(true);
  };

  const handleTriggerWorkflow = async () => {
    try {
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

  const handleDeleteClick = async () => {
    setShowMenu(false);

    if (!adwId) {
      console.error('Cannot delete task: No ADW ID found');
      return;
    }

    try {
      console.log(`Initiating deletion for ADW ${adwId}`);
      await deleteWorktree(adwId);
      // Task will be removed automatically when WebSocket confirms deletion
    } catch (error) {
      console.error('Failed to delete worktree:', error);
    }
  };

  const handleOpenWorktree = async () => {
    setShowMenu(false);

    if (!adwId) {
      console.error('Cannot open worktree: No ADW ID found');
      setOpenWorktreeStatus('error');
      setOpenWorktreeMessage('No ADW ID found');
      setTimeout(() => setOpenWorktreeStatus('idle'), 3000);
      return;
    }

    setOpenWorktreeStatus('opening');
    setOpenWorktreeMessage('Opening terminal...');

    try {
      console.log(`Opening worktree for ADW ${adwId}`);
      const result = await adwService.openWorktree(adwId);
      setOpenWorktreeStatus('success');
      setOpenWorktreeMessage('Terminal opened!');
      // Auto-hide success message after 3 seconds
      setTimeout(() => setOpenWorktreeStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to open worktree:', error);
      setOpenWorktreeStatus('error');
      // Extract meaningful error message
      const errorMsg = error.message?.includes('Worktree not found')
        ? 'Worktree not found'
        : 'Failed to open';
      setOpenWorktreeMessage(errorMsg);
      // Auto-hide error message after 4 seconds
      setTimeout(() => setOpenWorktreeStatus('idle'), 4000);
    }
  };

  const handleOpenCodebase = async () => {
    setShowMenu(false);

    if (!adwId) {
      console.error('Cannot open codebase: No ADW ID found');
      setOpenCodebaseStatus('error');
      setOpenCodebaseMessage('No ADW ID found');
      setTimeout(() => setOpenCodebaseStatus('idle'), 3000);
      return;
    }

    setOpenCodebaseStatus('opening');
    setOpenCodebaseMessage('Opening neovim...');

    try {
      console.log(`Opening codebase for ADW ${adwId}`);
      const result = await adwService.openCodebase(adwId);
      setOpenCodebaseStatus('success');
      setOpenCodebaseMessage('Neovim opened!');
      // Auto-hide success message after 3 seconds
      setTimeout(() => setOpenCodebaseStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to open codebase:', error);
      setOpenCodebaseStatus('error');
      // Extract meaningful error message
      const errorMsg = error.message?.includes('Worktree not found')
        ? 'Worktree not found'
        : 'Failed to open';
      setOpenCodebaseMessage(errorMsg);
      // Auto-hide error message after 4 seconds
      setTimeout(() => setOpenCodebaseStatus('idle'), 4000);
    }
  };

  // Check if this is a completed task
  const isCompleted = task.stage === 'completed';

  // Get transition and glow animation classes
  const transitionClass = getTransitionClass();
  const glowClass = getGlowClass();
  const pulseClass = shouldPulse() ? 'card-pulse' : '';

  // Get latest log for preview
  const latestLog = workflowLogs && workflowLogs.length > 0 ? workflowLogs[workflowLogs.length - 1] : null;

  // Determine task type (bug or feature)
  const isBug = task.metadata?.work_item_type === 'bug' || task.title?.toLowerCase().includes('bug') || task.title?.toLowerCase().includes('fix');

  // Calculate progress percentage
  const progressPercent = task.progress || (workflowProgress?.percentage ?? 0);

  const pipelineStages = getPipelineStages();
  const currentStageIdx = getCurrentStageIndex();

  // Patch information
  const patchHistory = task.metadata?.patch_history || [];
  const patchCount = patchHistory.length;
  const currentPatchNumber = task.metadata?.patch_number;
  const patchStatus = task.metadata?.patch_status;
  const hasPatch = patchCount > 0 || patchStatus;

  return (
    <div
      className={`brutalist-task-card ${transitionClass} ${glowClass} ${pulseClass} ${isDeleting ? 'deleting' : ''}`}
      onClick={isDeleting ? undefined : handleCardClick}
      style={isDeleting ? { opacity: 0.6, pointerEvents: 'none' } : {}}
    >
      {/* Deletion overlay */}
      {isDeleting && (
        <div className="brutalist-deletion-overlay">
          <span className="brutalist-deletion-spinner">⏳</span>
          <span className="brutalist-deletion-text">DELETING...</span>
        </div>
      )}
      {/* Start Worktree overlay */}
      {openWorktreeStatus !== 'idle' && (
        <div className={`brutalist-worktree-overlay ${openWorktreeStatus}`}>
          <span className="brutalist-worktree-icon">
            {openWorktreeStatus === 'opening' && '▶️'}
            {openWorktreeStatus === 'success' && '✅'}
            {openWorktreeStatus === 'error' && '❌'}
          </span>
          <span className="brutalist-worktree-text">{openWorktreeMessage}</span>
        </div>
      )}
      {/* Open Codebase overlay */}
      {openCodebaseStatus !== 'idle' && (
        <div className={`brutalist-worktree-overlay ${openCodebaseStatus}`}>
          <span className="brutalist-worktree-icon">
            {openCodebaseStatus === 'opening' && '📝'}
            {openCodebaseStatus === 'success' && '✅'}
            {openCodebaseStatus === 'error' && '❌'}
          </span>
          <span className="brutalist-worktree-text">{openCodebaseMessage}</span>
        </div>
      )}
      {/* Card Header with Issue Number and Task ID */}
      <div className="brutalist-task-card-header">
        <div className="brutalist-task-number">
          <span className="brutalist-issue-num">{task.id}</span>
          <span className="brutalist-task-id">{task.metadata?.adw_id?.slice(0, 8).toUpperCase() || 'UNKNOWN'}</span>
        </div>
        <div className="brutalist-menu-container" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="brutalist-card-menu-btn"
          >
            ⋮
          </button>

          {/* Dropdown Menu - positioned relative to menu button */}
          {showMenu && (
            <div className="brutalist-card-dropdown">
              <div className="brutalist-card-dropdown-item" onClick={(e) => { e.stopPropagation(); handleEditClick(); }}>
                ✎ EDIT
              </div>
              <div className="brutalist-card-dropdown-item" onClick={(e) => { e.stopPropagation(); handleTriggerWorkflow(); setShowMenu(false); }}>
                ▶ TRIGGER
              </div>
              <div
                className={`brutalist-card-dropdown-item ${isOpeningWorktree ? 'disabled' : ''}`}
                onClick={(e) => { e.stopPropagation(); if (!isOpeningWorktree) handleOpenWorktree(); }}
              >
                {isOpeningWorktree ? '⏳ STARTING...' : '▶️ START WORKTREE'}
              </div>
              <div
                className={`brutalist-card-dropdown-item ${isOpeningCodebase ? 'disabled' : ''}`}
                onClick={(e) => { e.stopPropagation(); if (!isOpeningCodebase) handleOpenCodebase(); }}
              >
                {isOpeningCodebase ? '⏳ OPENING...' : '📝 OPEN CODEBASE'}
              </div>
              <div
                className={`brutalist-card-dropdown-item danger ${isDeleting ? 'disabled' : ''}`}
                onClick={(e) => { e.stopPropagation(); if (!isDeleting) handleDeleteClick(); }}
              >
                {isDeleting ? '⏳ DELETING...' : '🗑 DELETE'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="brutalist-task-card-body">
        {/* Title */}
        <div className="brutalist-task-title">
          {(task.metadata?.summary || task.title || '').toUpperCase()}
        </div>

        {/* Pipeline Stage Indicator (P B T R D) */}
        <div className="brutalist-pipeline-indicator">
          {pipelineStages.map((stage, i) => (
            <div
              key={i}
              className={`brutalist-pipeline-stage ${
                i < currentStageIdx ? 'completed' : i === currentStageIdx ? 'active' : ''
              }`}
            >
              {stage}
            </div>
          ))}
        </div>

        {/* Description */}
        {task.description && (
          <div className="brutalist-task-description">
            {task.description.length > 100 ? task.description.slice(0, 100) + '...' : task.description}
          </div>
        )}

        {/* Compact Meta Row - All in one line */}
        <div className="brutalist-task-meta-row">
          {workflowLogs && workflowLogs.length > 0 && (
            <span className="brutalist-meta-badge status">📝 {workflowLogs.length} LOG{workflowLogs.length !== 1 ? 'S' : ''}</span>
          )}
          <span className="brutalist-meta-badge time">🕒 {formatTimeAgo(task.updatedAt)}</span>
          {isBug ? (
            <span className="brutalist-label bug">🐛 BUG</span>
          ) : (
            <span className="brutalist-label feature">✨ FEATURE</span>
          )}
          {hasPatch && (
            <span className={`brutalist-label patch ${patchStatus || ''}`}>
              🔧 {patchStatus === 'in_progress' ? `PATCH #${currentPatchNumber}` : patchCount > 0 ? `${patchCount} PATCH${patchCount !== 1 ? 'ES' : ''}` : 'PATCH'}
            </span>
          )}
        </div>

        {/* Compact Log Preview - Single line with integrated progress */}
        <div className="brutalist-log-preview-compact">
          <span className="brutalist-log-preview-icon">⚡</span>
          <span className={`brutalist-log-preview-level ${latestLog?.level || 'info'}`}>
            {(latestLog?.level || 'INFO').toUpperCase()}
          </span>
          <span className="brutalist-log-preview-message">
            {latestLog?.message?.slice(0, 25) || 'Waiting for activity...'}
          </span>
          <div className="brutalist-log-progress-mini">
            <div className="brutalist-log-progress-fill" style={{ width: `${Math.min((workflowLogs?.length || 0) * 10, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Progress Bar at Bottom */}
      {progressPercent > 0 && (
        <div className="brutalist-context-progress">
          <div className="brutalist-context-progress-bar" style={{ width: `${progressPercent}%` }}></div>
        </div>
      )}


      {/* Card Expand Modal */}
      {showExpandModal && createPortal(
        <CardExpandModal
          task={task}
          isOpen={showExpandModal}
          onClose={() => setShowExpandModal(false)}
          onEdit={onEdit}
        />,
        document.body
      )}
    </div>
  );
});

// Display name for React DevTools
KanbanCard.displayName = 'KanbanCard';

export default KanbanCard;