import { useState } from 'react';
import {
  ChevronRight,
  CheckCircle,
  Circle,
  Clock,
  Play,
  AlertCircle
} from 'lucide-react';

/**
 * StageProgressionViewer Component
 * Displays real-time stage progression with visual indicators,
 * progress bars, and timeline showing completed/current/upcoming stages
 */
const StageProgressionViewer = ({
  currentStage,
  stages = [],
  progress = null,
  compact = false
}) => {
  const [showDetails, setShowDetails] = useState(!compact);

  // Find current stage index
  const currentStageIndex = stages.findIndex(s => s.id === currentStage);

  // Get stage status
  const getStageStatus = (index) => {
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'active';
    return 'pending';
  };

  // Get stage icon
  const getStageIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'active':
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Circle className="h-4 w-4 text-gray-300" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Get stage color class
  const getStageColorClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500 text-green-700';
      case 'active':
        return 'bg-blue-500 border-blue-500 text-blue-700';
      case 'pending':
        return 'bg-gray-200 border-gray-300 text-gray-500';
      default:
        return 'bg-red-500 border-red-500 text-red-700';
    }
  };

  // Get progress bar color
  const getProgressBarColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  if (compact) {
    return (
      <div className="stage-progression-compact">
        {/* Compact Progress Bar */}
        <div className="flex items-center space-x-1">
          {stages.map((stage, index) => {
            const status = getStageStatus(index);
            const isActive = status === 'active';
            const stageProgress = isActive && progress ? progress.progress : (status === 'completed' ? 100 : 0);

            return (
              <div
                key={stage.id}
                className="flex-1 relative"
                title={`${stage.name}${isActive ? ` - ${stageProgress}%` : ''}`}
              >
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    getProgressBarColor(status)
                  }`}
                >
                  {isActive && (
                    <div
                      className="h-full bg-current rounded-full transition-all duration-300"
                      style={{ width: `${stageProgress}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Stage Label */}
        <div className="mt-1 text-xs text-gray-600 flex items-center justify-between">
          <span className="font-medium">{stages[currentStageIndex]?.name || 'Unknown'}</span>
          {progress && progress.progress !== undefined && (
            <span>{Math.round(progress.progress)}%</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="stage-progression-viewer">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Stage Progression</h4>
        {progress && progress.currentStep && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {progress.currentStep}
          </span>
        )}
      </div>

      {/* Timeline View */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const status = getStageStatus(index);
          const isActive = status === 'active';
          const isCompleted = status === 'completed';
          const isPending = status === 'pending';
          const stageProgress = isActive && progress ? progress.progress : (isCompleted ? 100 : 0);

          return (
            <div key={stage.id} className="relative">
              <div className="flex items-start space-x-3">
                {/* Stage Icon */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                  getStageColorClass(status)
                }`}>
                  {getStageIcon(status)}
                </div>

                {/* Stage Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className={`text-sm font-medium ${
                        isActive ? 'text-blue-700' :
                        isCompleted ? 'text-green-700' :
                        'text-gray-500'
                      }`}>
                        {stage.name}
                      </h5>
                      {showDetails && (
                        <p className="text-xs text-gray-500 mt-1">
                          {isCompleted && 'Completed'}
                          {isActive && progress?.message && progress.message}
                          {isPending && 'Waiting...'}
                        </p>
                      )}
                    </div>

                    {/* Progress Percentage */}
                    {(isActive || isCompleted) && (
                      <span className={`text-sm font-semibold ml-2 ${
                        isActive ? 'text-blue-700' :
                        'text-green-700'
                      }`}>
                        {Math.round(stageProgress)}%
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {isActive && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Timestamp for completed stages */}
                  {isCompleted && showDetails && progress?.timestamp && (
                    <div className="mt-1 flex items-center text-xs text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Completed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div
                  className={`absolute left-4 top-8 w-0.5 h-full -ml-px transition-all duration-300 ${
                    isCompleted ? 'bg-green-300' :
                    isActive ? 'bg-blue-300' :
                    'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Progress */}
      {progress && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span className="font-semibold">{Math.round(progress.progress || 0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress || 0}%` }}
            />
          </div>
          {progress.message && (
            <p className="mt-2 text-xs text-gray-600">{progress.message}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StageProgressionViewer;
