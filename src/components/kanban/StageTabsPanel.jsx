/**
 * @fileoverview Stage Tabs Panel Component
 *
 * Displays horizontal tabs for stage selection with auto-follow capability.
 * Each tab shows the stage name and status indicator.
 *
 * @module components/kanban/StageTabsPanel
 */

import { useEffect } from 'react';
import PropTypes from 'prop-types';

// Stage configuration for display
const STAGE_CONFIG = {
  plan: { name: 'PLAN', icon: '📋' },
  build: { name: 'BUILD', icon: '🔨' },
  test: { name: 'TEST', icon: '✏️' },
  review: { name: 'REVIEW', icon: '👀' },
  document: { name: 'DOC', icon: '📄' }
};

const StageTabsPanel = ({
  stages = ['plan', 'build', 'test', 'review', 'document'],
  activeStage,
  currentRunningStage,
  onStageSelect,
  autoFollow = true,
  onAutoFollowToggle,
  stageStatuses = {}
}) => {
  // Auto-follow effect: switch to running stage when auto-follow is enabled
  useEffect(() => {
    if (autoFollow && currentRunningStage && currentRunningStage !== activeStage) {
      // Map implement to build for consistency
      const mappedStage = currentRunningStage.toLowerCase() === 'implement'
        ? 'build'
        : currentRunningStage.toLowerCase();

      if (stages.includes(mappedStage)) {
        onStageSelect(mappedStage);
      }
    }
  }, [autoFollow, currentRunningStage, activeStage, stages, onStageSelect]);

  const getStageConfig = (stage) => {
    return STAGE_CONFIG[stage.toLowerCase()] || { name: stage.toUpperCase(), icon: '📌' };
  };

  const getStatusClass = (stage) => {
    const status = stageStatuses[stage];
    if (status === 'completed') return 'stage-tab-completed';
    if (status === 'active') return 'stage-tab-active';
    return 'stage-tab-pending';
  };

  const handleStageClick = (stage) => {
    // Disable auto-follow when user manually selects a stage
    if (autoFollow && onAutoFollowToggle) {
      onAutoFollowToggle();
    }
    onStageSelect(stage);
  };

  return (
    <div className="stage-tabs-panel">
      <div className="stage-tabs-container">
        {stages.map((stage) => {
          const config = getStageConfig(stage);
          const isActive = activeStage === stage;
          const status = stageStatuses[stage] || 'pending';

          return (
            <button
              key={stage}
              type="button"
              className={`stage-tab-btn ${isActive ? 'selected' : ''} ${getStatusClass(stage)}`}
              onClick={() => handleStageClick(stage)}
              title={`${config.name} - ${status}`}
            >
              <span className="stage-tab-icon">{config.icon}</span>
              <span className="stage-tab-name">{config.name}</span>
              {status === 'completed' && <span className="stage-tab-check">✓</span>}
              {status === 'active' && <span className="stage-tab-running">●</span>}
            </button>
          );
        })}
      </div>

      {onAutoFollowToggle && (
        <button
          type="button"
          className={`auto-follow-btn ${autoFollow ? 'active' : ''}`}
          onClick={onAutoFollowToggle}
          title={autoFollow ? 'Auto-follow ON: Click to disable' : 'Auto-follow OFF: Click to enable'}
        >
          <span className="auto-follow-icon">⟳</span>
          <span className="auto-follow-text">Auto</span>
        </button>
      )}
    </div>
  );
};

StageTabsPanel.propTypes = {
  /** Array of stage names to display as tabs */
  stages: PropTypes.arrayOf(PropTypes.string),
  /** Currently active/selected stage */
  activeStage: PropTypes.string,
  /** Stage that is currently running (for auto-follow) */
  currentRunningStage: PropTypes.string,
  /** Callback when a stage is selected */
  onStageSelect: PropTypes.func.isRequired,
  /** Whether auto-follow is enabled */
  autoFollow: PropTypes.bool,
  /** Callback to toggle auto-follow */
  onAutoFollowToggle: PropTypes.func,
  /** Object mapping stage names to their statuses */
  stageStatuses: PropTypes.objectOf(
    PropTypes.oneOf(['pending', 'active', 'completed'])
  )
};

export default StageTabsPanel;
