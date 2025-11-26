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

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useKanbanStore } from '../../stores/kanbanStore';
import CardExpandModal from './CardExpandModal';
import { useStageTransition } from '../../hooks/useStageTransition';

const KanbanCard = ({ task, onEdit }) => {
  const {
    deleteTask,
    getWebSocketStatus,
    triggerWorkflowForTask,
    getWorkflowProgressForTask,
    getWorkflowLogsForTask
  } = useKanbanStore();

  const [showMenu, setShowMenu] = useState(false);
  const [showExpandModal, setShowExpandModal] = useState(false);
  const menuRef = useRef(null);

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

  const websocketStatus = getWebSocketStatus();
  const workflowProgress = getWorkflowProgressForTask(task.id);
  const workflowLogs = getWorkflowLogsForTask(task.id);

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

  // Get pipeline stages from pipelineId
  const getPipelineStages = () => {
    if (!task.pipelineId || !task.pipelineId.startsWith('adw_')) {
      return ['P', 'B', 'T', 'R', 'D'];
    }
    const stages = task.pipelineId.replace('adw_', '').split('_');
    return stages.map(s => getStageAbbreviation(s));
  };

  // Get current stage index
  const getCurrentStageIndex = () => {
    const stageMap = { 'plan': 0, 'build': 1, 'implement': 1, 'test': 2, 'review': 3, 'document': 4 };
    return stageMap[task.stage] ?? -1;
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

  return (
    <div
      className={`brutalist-task-card ${transitionClass} ${glowClass} ${pulseClass}`}
      onClick={handleCardClick}
    >
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
              <div className="brutalist-card-dropdown-item danger" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); setShowMenu(false); }}>
                🗑 DELETE
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
          {workflowProgress?.currentStep && (
            <span className="brutalist-meta-badge status">⚡ {workflowProgress.currentStep.toUpperCase().slice(0, 4)}</span>
          )}
          <span className="brutalist-meta-badge time">🕒 {formatTimeAgo(task.updatedAt)}</span>
          {isBug ? (
            <span className="brutalist-label bug">🐛 BUG</span>
          ) : (
            <span className="brutalist-label feature">✨ FEATURE</span>
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
};

export default KanbanCard;