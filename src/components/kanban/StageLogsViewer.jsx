import { useState, useEffect } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import {
  FileText,
  Hammer,
  FlaskConical,
  Eye,
  FileCheck,
  Activity,
  Loader2
} from 'lucide-react';
import WorkflowLogViewer from './WorkflowLogViewer';

/**
 * Stage icon mapping for visual identification
 */
const STAGE_ICONS = {
  all: Activity,
  plan: FileText,
  build: Hammer,
  test: FlaskConical,
  review: Eye,
  document: FileCheck,
};

/**
 * StageLogsViewer Component
 * Displays a tabbed interface for viewing stage-specific logs
 * from ADW workflows (Plan, Build, Test, Review, Document)
 */
const StageLogsViewer = ({
  taskId,
  adwId,
  title = "Workflow Logs",
  maxHeight = "300px",
  onClear,
  showTimestamps = true,
  autoScroll = true
}) => {
  const {
    getWorkflowLogsForTask,
    fetchStageLogsForTask,
    getStageLogsForTask,
    clearWorkflowLogsForTask,
  } = useKanbanStore();

  // Available stages for tabs
  const stages = ['all', 'plan', 'build', 'test', 'review', 'document'];

  // State for active tab
  const [activeTab, setActiveTab] = useState('all');

  // Get real-time logs for "All" tab
  const allLogs = getWorkflowLogsForTask(taskId);

  // Get stage-specific logs for the active tab
  const stageData = activeTab !== 'all'
    ? getStageLogsForTask(taskId, activeTab)
    : null;

  // Fetch stage logs when tab is clicked
  useEffect(() => {
    if (activeTab !== 'all' && adwId) {
      // Only fetch if we don't have data yet or if there was an error
      if (!stageData?.fetchedAt || stageData?.error) {
        fetchStageLogsForTask(taskId, adwId, activeTab);
      }
    }
  }, [activeTab, taskId, adwId]);

  // Get icon for stage
  const getStageIcon = (stage) => {
    const Icon = STAGE_ICONS[stage] || Activity;
    return <Icon className="h-3.5 w-3.5" />;
  };

  // Get tab label
  const getTabLabel = (stage) => {
    const labels = {
      all: 'All Logs',
      plan: 'Plan',
      build: 'Build',
      test: 'Test',
      review: 'Review',
      document: 'Document',
    };
    return labels[stage] || stage;
  };

  // Handle tab click
  const handleTabClick = (stage) => {
    setActiveTab(stage);
  };

  // Handle clear logs
  const handleClearLogs = () => {
    if (activeTab === 'all' && clearWorkflowLogsForTask) {
      clearWorkflowLogsForTask(taskId);
    }
    if (onClear) {
      onClear();
    }
  };

  // Convert stage logs to format expected by WorkflowLogViewer
  const formatStageLogsForViewer = (stageData) => {
    if (!stageData || !stageData.logs) return [];

    return stageData.logs.map((log, index) => ({
      id: `${taskId}-${activeTab}-${index}`,
      timestamp: log.timestamp,
      level: log.level || 'INFO',
      message: log.message || '',
      current_step: log.current_step,
      details: log.details,
      raw_data: log.raw_data,
    }));
  };

  // Get logs to display based on active tab
  const getLogsToDisplay = () => {
    if (activeTab === 'all') {
      return allLogs;
    }

    if (stageData?.loading) {
      return [];
    }

    return formatStageLogsForViewer(stageData);
  };

  // Get title for log viewer
  const getLogViewerTitle = () => {
    if (activeTab === 'all') {
      return `${title} (${allLogs.length})`;
    }

    const stageName = getTabLabel(activeTab);
    const logCount = formatStageLogsForViewer(stageData).length;
    return `${stageName} Logs (${logCount})`;
  };

  // Show loading state
  const isLoading = activeTab !== 'all' && stageData?.loading;

  // Show error state
  const hasError = activeTab !== 'all' && stageData?.error;

  // Show empty state for stage with no logs
  // Check if actual logs exist instead of relying solely on flags
  const isEmpty = activeTab !== 'all' &&
    !stageData?.loading &&
    (!stageData?.logs || stageData.logs.length === 0);

  return (
    <div className="stage-logs-viewer border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50 overflow-x-auto">
        {stages.map((stage) => {
          const isActive = activeTab === stage;
          return (
            <button
              key={stage}
              onClick={() => handleTabClick(stage)}
              className={`
                flex items-center space-x-1.5 px-3 py-2 text-xs font-medium
                border-b-2 transition-colors whitespace-nowrap
                ${isActive
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }
              `}
              aria-label={`View ${getTabLabel(stage)}`}
            >
              {getStageIcon(stage)}
              <span>{getTabLabel(stage)}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Loading {getTabLabel(activeTab)} logs...</span>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading logs</h3>
                <div className="mt-1 text-sm text-red-700">
                  {stageData?.error}
                </div>
                <div className="mt-2">
                  <button
                    onClick={() => fetchStageLogsForTask(taskId, adwId, activeTab)}
                    className="text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {isEmpty && !isLoading && !hasError && (
          <div className="p-8 text-center">
            <div className="flex justify-center mb-2">
              {getStageIcon(activeTab)}
            </div>
            <p className="text-sm text-gray-500">
              No logs found for {getTabLabel(activeTab)} stage
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This stage may not have been executed yet
            </p>
          </div>
        )}

        {/* Logs Viewer */}
        {!isLoading && !hasError && (activeTab === 'all' || !isEmpty) && (
          <WorkflowLogViewer
            logs={getLogsToDisplay()}
            title={getLogViewerTitle()}
            maxHeight={maxHeight}
            onClear={activeTab === 'all' ? handleClearLogs : undefined}
            showTimestamps={showTimestamps}
            autoScroll={activeTab === 'all' ? autoScroll : false}
            logsSource={activeTab}
          />
        )}

        {/* Stage Result (if available) */}
        {activeTab !== 'all' && stageData?.hasResult && stageData?.result && (
          <div className="border-t border-gray-200 bg-gray-50 p-3">
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900 select-none">
                Stage Result Data
                <span className="ml-2 text-gray-400 group-open:hidden">(click to expand)</span>
              </summary>
              <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs font-mono overflow-auto max-h-48">
                <pre className="text-gray-800 whitespace-pre-wrap break-words">
                  {JSON.stringify(stageData.result, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}

        {/* Stage Info */}
        {activeTab !== 'all' && stageData?.stageFolder && (
          <div className="border-t border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
            Stage folder: <span className="font-mono">{stageData.stageFolder}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StageLogsViewer;
