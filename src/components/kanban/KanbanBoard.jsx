/**
 * @fileoverview Kanban board component for SDLC workflow visualization
 *
 * Main board component that renders all workflow stages (backlog, plan, build,
 * test, review, document, errored) and displays tasks in their respective columns.
 * Provides stage-specific actions and visual feedback for workflow progression.
 * Integrates with the task store for real-time updates via WebSocket.
 *
 * @module components/kanban/KanbanBoard
 */

import { useState } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import KanbanCard from './KanbanCard';
import TaskEditModal from '../forms/TaskEditModal';
import {
  ClipboardList,
  Hammer,
  TestTube,
  Eye,
  FileText,
  AlertTriangle,
  Inbox,
  Plus,
  GitMerge
} from 'lucide-react';

const stageIcons = {
  backlog: Inbox,
  plan: ClipboardList,
  build: Hammer,
  test: TestTube,
  review: Eye,
  document: FileText,
  errored: AlertTriangle,
  'ready-to-merge': GitMerge,
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
    teal: 'border-teal-200 bg-teal-50',
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
    teal: 'text-teal-600',
  };
  return colorMap[color] || 'text-gray-600';
};

const KanbanBoard = () => {
  const { stages, getTasksByStage, toggleTaskInput } = useKanbanStore();
  const [editingTask, setEditingTask] = useState(null);

  // Edit modal handlers
  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleEditModalClose = () => {
    setEditingTask(null);
  };

  const handleTaskUpdate = () => {
    // Task update is handled by the updateTask function in the modal
    // Just close the modal here
    setEditingTask(null);
  };

  // Group stages: Backlog first, then SDLC, then others
  const sdlcStageIds = ['plan', 'build', 'test', 'review', 'document', 'ready-to-merge', 'errored'];
  const backlogStage = stages.find(stage => stage.id === 'backlog');
  const sdlcStages = stages.filter(stage => sdlcStageIds.includes(stage.id));
  const otherStages = stages.filter(stage => !sdlcStageIds.includes(stage.id) && stage.id !== 'backlog');

  return (
    <div className="w-full">
      <div className="kanban-board-grid kanban-scroll">
        {/* Backlog Stage */}
        {backlogStage && (() => {
          const stageTasks = getTasksByStage(backlogStage.id);
          const StageIcon = stageIcons[backlogStage.id] || ClipboardList;

          return (
            <div
              key={backlogStage.id}
              className={`kanban-column stage-${backlogStage.id} ${
                getStageColorClasses(backlogStage.color)
              }`}
            >
              {/* Stage Header */}
              <div className="kanban-column-header">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <StageIcon className="h-5 w-5 text-white" />
                    <h3 className="font-bold text-white">{backlogStage.name}</h3>
                  </div>
                  <div className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
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
                <button
                  onClick={toggleTaskInput}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-sm hover:shadow-md"
                >
                  <Plus className="h-5 w-5" />
                  <span>New Task</span>
                </button>

                {stageTasks.length > 0 ? (
                  stageTasks.map((task) => (
                    <KanbanCard key={task.id} task={task} onEdit={handleEditTask} />
                  ))
                ) : null}

                {/* Drop Zone Indicator */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400 opacity-0 transition-opacity duration-200 hover:opacity-100">
                  <p className="text-sm">Drop tasks here</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* SDLC Stages */}
        {sdlcStages.map((stage) => {
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
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <StageIcon className="h-5 w-5 text-white" />
                    <h3 className="font-bold text-white">{stage.name}</h3>
                  </div>
                  <div className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
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
                {stageTasks.length > 0 ? (
                  stageTasks.map((task) => (
                    <KanbanCard key={task.id} task={task} onEdit={handleEditTask} />
                  ))
                ) : (
                  <div className="text-center text-gray-400 mt-8">
                    <StageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tasks in {stage.name.toLowerCase()}</p>
                  </div>
                )}

                {/* Drop Zone Indicator */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400 opacity-0 transition-opacity duration-200 hover:opacity-100">
                  <p className="text-sm">Drop tasks here</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Other Stages */}
        {otherStages.map((stage) => {
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
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <StageIcon className="h-5 w-5 text-white" />
                    <h3 className="font-bold text-white">{stage.name}</h3>
                  </div>
                  <div className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
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
                {stageTasks.length > 0 ? (
                  stageTasks.map((task) => (
                    <KanbanCard key={task.id} task={task} onEdit={handleEditTask} />
                  ))
                ) : (
                  <div className="text-center text-gray-400 mt-8">
                    <StageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tasks in {stage.name.toLowerCase()}</p>
                  </div>
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

      {/* Task Edit Modal - Rendered at board level for proper overlay */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={handleEditModalClose}
          onSave={handleTaskUpdate}
        />
      )}
    </div>
  );
};

export default KanbanBoard;