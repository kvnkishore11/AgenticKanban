/**
 * @fileoverview StatusIndicator Component
 *
 * Visual status indicator for ADW workflow states with animations and tooltips.
 * Displays different visual states based on ADW status and stuck flag.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatusIndicator - Visual indicator for ADW workflow status
 *
 * Shows different colors, icons, and animations based on status:
 * - pending: Gray
 * - in_progress: Blue with pulse animation
 * - completed: Green
 * - errored: Red
 * - stuck: Yellow with warning icon
 *
 * @param {Object} props
 * @param {string} props.status - ADW status (pending, in_progress, completed, errored, stuck)
 * @param {boolean} [props.isStuck] - Whether workflow is stuck/paused
 * @param {string} [props.currentStage] - Current workflow stage
 * @param {string} [props.lastActivity] - Last activity timestamp
 * @param {string} [props.size] - Size variant (sm, md, lg)
 * @param {boolean} [props.showTooltip] - Show tooltip on hover
 * @param {string} [props.className] - Additional CSS classes
 */
const StatusIndicator = ({
  status = 'pending',
  isStuck = false,
  currentStage,
  lastActivity,
  size = 'md',
  showTooltip = true,
  className = '',
}) => {
  // Determine visual state
  const effectiveStatus = isStuck ? 'stuck' : status;

  // Status configurations
  const statusConfig = {
    pending: {
      color: 'bg-gray-400',
      label: 'Pending',
      icon: '⏸️',
      pulse: false,
    },
    in_progress: {
      color: 'bg-blue-500',
      label: 'In Progress',
      icon: '▶️',
      pulse: true,
    },
    completed: {
      color: 'bg-green-500',
      label: 'Completed',
      icon: '✓',
      pulse: false,
    },
    errored: {
      color: 'bg-red-500',
      label: 'Errored',
      icon: '✕',
      pulse: false,
    },
    stuck: {
      color: 'bg-yellow-500',
      label: 'Stuck - Action Required',
      icon: '⚠️',
      pulse: true,
    },
  };

  const config = statusConfig[effectiveStatus] || statusConfig.pending;

  // Size configurations
  const sizeConfig = {
    sm: {
      dot: 'w-2 h-2',
      icon: 'text-xs',
      badge: 'text-xs px-1.5 py-0.5',
    },
    md: {
      dot: 'w-3 h-3',
      icon: 'text-sm',
      badge: 'text-sm px-2 py-1',
    },
    lg: {
      dot: 'w-4 h-4',
      icon: 'text-base',
      badge: 'text-base px-3 py-1.5',
    },
  };

  const sizeStyles = sizeConfig[size] || sizeConfig.md;

  // Tooltip content
  const tooltipContent = () => {
    const parts = [config.label];

    if (currentStage) {
      parts.push(`Stage: ${currentStage}`);
    }

    if (lastActivity) {
      const activityDate = new Date(lastActivity);
      const now = new Date();
      const diffMinutes = Math.floor((now - activityDate) / 60000);

      if (diffMinutes < 60) {
        parts.push(`Last activity: ${diffMinutes}m ago`);
      } else if (diffMinutes < 1440) {
        parts.push(`Last activity: ${Math.floor(diffMinutes / 60)}h ago`);
      } else {
        parts.push(`Last activity: ${Math.floor(diffMinutes / 1440)}d ago`);
      }
    }

    return parts.join(' • ');
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Status Dot with Optional Pulse */}
      <div className="relative">
        <div
          className={`
            ${sizeStyles.dot}
            ${config.color}
            rounded-full
            ${config.pulse ? 'animate-pulse' : ''}
          `}
          title={showTooltip ? tooltipContent() : undefined}
        />

        {/* Ripple effect for pulsing statuses */}
        {config.pulse && (
          <div
            className={`
              absolute inset-0
              ${config.color}
              rounded-full
              animate-ping
              opacity-75
            `}
            style={{ animationDuration: '2s' }}
          />
        )}
      </div>

      {/* Status Icon (optional for larger sizes) */}
      {size !== 'sm' && (
        <span className={sizeStyles.icon} title={showTooltip ? tooltipContent() : undefined}>
          {config.icon}
        </span>
      )}

      {/* "Action Required" Badge for Stuck Status */}
      {isStuck && (
        <span
          className={`
            ${sizeStyles.badge}
            bg-yellow-100
            text-yellow-800
            font-semibold
            rounded
            border border-yellow-300
          `}
          title="This workflow appears to be stuck or paused. Please check the activity logs."
        >
          Action Required
        </span>
      )}
    </div>
  );
};

StatusIndicator.propTypes = {
  status: PropTypes.oneOf(['pending', 'in_progress', 'completed', 'errored', 'stuck']),
  isStuck: PropTypes.bool,
  currentStage: PropTypes.string,
  lastActivity: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showTooltip: PropTypes.bool,
  className: PropTypes.string,
};

export default StatusIndicator;
