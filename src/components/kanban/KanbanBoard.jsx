import { useState } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import KanbanCard from './KanbanCard';
import {
  ClipboardList,
  Hammer,
  TestTube,
  Eye,
  FileText,
  GitPullRequest,
  AlertTriangle,
  Inbox,
  Plus
} from 'lucide-react';

const stageIcons = {
  backlog: Inbox,
  plan: ClipboardList,
  build: Hammer,
  test: TestTube,
  review: Eye,
  document: FileText,
  pr: GitPullRequest,
  errored: AlertTriangle,
};


const getStageColorClasses = (color) => {
  const colorMap = {
    gray: 'border-gray-200 bg-gray-50',
    blue: 'border-blue-200 bg-blue-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    indigo: 'border-indigo-200 bg-indigo-50',
    pink: 'border-pink-200 bg-pink-50',
    red: 'border-red-200 bg-red-50',
  };
  return colorMap[color] || 'border-gray-200 bg-gray-50';
};

const getStageIconColorClasses = (color) => {
  const colorMap = {
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600',
    pink: 'text-pink-600',
    red: 'text-red-600',
  };
  return colorMap[color] || 'text-gray-600';
};

const KanbanBoard = () => {
  const { stages, tasks, getTasksByStage, toggleTaskInput } = useKanbanStore();
  const [showPipelineSummary, setShowPipelineSummary] = useState(false);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Kanban Board</h2>
        <p className="text-gray-600">Manage your ADW tasks across the development pipeline</p>
      </div>

      <div className="kanban-board-grid kanban-scroll">
        {stages.map((stage) => {
          const stageTasks = getTasksByStage(stage.id);
          const StageIcon = stageIcons[stage.id] || ClipboardList;

          return (
            <div
              key={stage.id}
              className={`kanban-column stage-${stage.id} ${
                getStageColorClasses(stage.color)
              }`}
            >
              {/* Stage Header */}
              <div className="kanban-column-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <StageIcon className={`h-5 w-5 ${getStageIconColorClasses(stage.color)}`} />
                    <h3 className="font-medium text-gray-900">{stage.name}</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    stageTasks.length > 0
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stageTasks.length}
                  </div>
                </div>
              </div>

              {/* Stage Content */}
              <div className="kanban-column-body space-y-4">
                {/* New Task Button for Backlog Stage */}
                {stage.id === 'backlog' && (
                  <button
                    onClick={toggleTaskInput}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span>New Task</span>
                  </button>
                )}

                {stageTasks.length > 0 ? (
                  stageTasks.map((task) => (
                    <KanbanCard key={task.id} task={task} />
                  ))
                ) : (
                  stage.id !== 'backlog' && (
                    <div className="text-center text-gray-400 mt-8">
                      <StageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No tasks in {stage.name.toLowerCase()}</p>
                    </div>
                  )
                )}

                {/* Drop Zone Indicator */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400 opacity-0 transition-opacity duration-200 hover:opacity-100">
                  <p className="text-sm">Drop tasks here</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Summary Toggle */}
      <div className="mt-8 text-center">
        <button
          onClick={() => setShowPipelineSummary(!showPipelineSummary)}
          className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 flex items-center justify-center space-x-1 mx-auto"
        >
          <span>{showPipelineSummary ? 'Hide' : 'Show'} Pipeline Summary</span>
          <div className={`transform transition-transform duration-200 ${showPipelineSummary ? 'rotate-180' : ''}`}>
            ▼
          </div>
        </button>
      </div>

      {/* Summary Stats */}
      {showPipelineSummary && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pipeline Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {stages.map((stage) => {
              const stageTasks = getTasksByStage(stage.id);
              const StageIcon = stageIcons[stage.id] || ClipboardList;

              return (
                <div key={`${stage.id}-summary`} className="text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${
                    getStageColorClasses(stage.color)
                  } mb-2`}>
                    <StageIcon className={`h-6 w-6 ${getStageIconColorClasses(stage.color)}`} />
                  </div>
                  <div className="text-sm font-medium text-gray-900">{stageTasks.length}</div>
                  <div className="text-xs text-gray-500">{stage.name}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <div className="text-sm text-gray-600">
              Total Tasks: <span className="font-medium">{tasks.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;