/**
 * @fileoverview Stage Progression Indicator Component
 *
 * Displays visual stage progression with animated transitions, progress bars,
 * status badges, and completion indicators for Kanban workflow stages.
 *
 * @module components/kanban/StageProgressionIndicator
 */

import { useMemo } from 'react';
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';

const StageProgressionIndicator = ({
  currentStage,
  queuedStages = [],
  workflowProgress = null,
  workflowComplete = false,
  compact = false,
  showProgressBar = true,
  showPercentage = true,
}) => {
  // Parse stages from pipelineId or use queuedStages
  const stages = useMemo(() => {
    if (queuedStages && queuedStages.length > 0) {
      return queuedStages;
    }
    // Default SDLC stages
    return ['plan', 'build', 'test', 'review', 'document'];
  }, [queuedStages]);

  // Find current stage index
  const currentIndex = useMemo(() => {
    return stages.findIndex(stage => stage.toLowerCase() === currentStage?.toLowerCase());
  }, [stages, currentStage]);

  // Calculate overall progress percentage
  const progressPercent = useMemo(() => {
    if (workflowProgress?.progress !== undefined) {
      return workflowProgress.progress;
    }

    if (workflowComplete) {
      return 100;
    }

    if (currentIndex === -1) {
      return 0;
    }

    // Calculate progress based on stage completion
    const stageProgress = ((currentIndex + 1) / stages.length) * 100;
    return Math.round(stageProgress);
  }, [workflowProgress, workflowComplete, currentIndex, stages.length]);

  // Get stage status
  const getStageStatus = (stageIndex) => {
    if (currentIndex === -1) {
      return 'pending';
    }

    if (stageIndex < currentIndex) {
      return 'completed';
    } else if (stageIndex === currentIndex) {
      return workflowComplete ? 'completed' : 'in_progress';
    } else {
      return 'pending';
    }
  };

  // Get stage badge class
  const getStageBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white border-green-600';
      case 'in_progress':
        return 'bg-blue-500 text-white border-blue-600 animate-pulse';
      case 'pending':
        return 'bg-gray-200 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-200 text-gray-600 border-gray-300';
    }
  };

  // Get stage icon
  const getStageIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'in_progress':
        return <Clock className="h-3 w-3" />;
      case 'pending':
        return <Circle className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  // Format stage name
  const formatStageName = (stage) => {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  if (compact) {
    // Compact view: horizontal badges only
    return (
      <div className="flex items-center space-x-1">
        {stages.map((stage, index) => {
          const status = getStageStatus(index);
          const badgeClass = getStageBadgeClass(status);

          return (
            <div
              key={stage}
              className={`flex items-center justify-center px-2 py-0.5 rounded border text-xs font-bold ${badgeClass}`}
              title={`${formatStageName(stage)} - ${status}`}
            >
              {stage.charAt(0).toUpperCase()}
            </div>
          );
        })}
        {showPercentage && (
          <span className="text-xs font-semibold text-gray-700 ml-1">
            {progressPercent}%
          </span>
        )}
      </div>
    );
  }

  // Full view: Progress bar + badges + percentage
  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Stage Badges */}
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const status = getStageStatus(index);
          const badgeClass = getStageBadgeClass(status);
          const icon = getStageIcon(status);

          return (
            <div key={stage} className="flex flex-col items-center space-y-1">
              {/* Badge */}
              <div
                className={`flex items-center space-x-1 px-2 py-1 rounded border text-xs font-bold ${badgeClass}`}
                title={`${formatStageName(stage)} - ${status}`}
              >
                {icon}
                <span>{formatStageName(stage)}</span>
              </div>

              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div
                  className={`h-0.5 w-full ${
                    status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  style={{ position: 'absolute', transform: 'translateX(50%)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Percentage and Current Step */}
      <div className="flex items-center justify-between text-xs">
        {showPercentage && (
          <div className="font-semibold text-gray-700">
            Progress: {progressPercent}%
          </div>
        )}

        {workflowProgress?.currentStep && (
          <div className="text-gray-600 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{workflowProgress.currentStep}</span>
          </div>
        )}

        {workflowComplete && (
          <div className="text-green-600 flex items-center space-x-1 font-medium">
            <CheckCircle className="h-3 w-3" />
            <span>Complete</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StageProgressionIndicator;
