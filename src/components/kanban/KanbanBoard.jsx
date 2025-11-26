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

// Brutalist stage icons (using emojis for simplicity)
const stageIcons = {
  backlog: '📥',
  plan: '📋',
  build: '🔨',
  test: '🧪',
  review: '👀',
  document: '📄',
  errored: '⚠️',
  'ready-to-merge': '✅',
};

const KanbanBoard = ({ searchQuery = '' }) => {
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

  // Filter tasks based on search query
  const filterTasks = (tasks) => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(task =>
      task.title?.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.metadata?.summary?.toLowerCase().includes(query) ||
      task.metadata?.adw_id?.toLowerCase().includes(query)
    );
  };

  return (
    <div className="brutalist-board">
      {/* Backlog Stage */}
      {backlogStage && (() => {
        const stageTasks = filterTasks(getTasksByStage(backlogStage.id));
        const icon = stageIcons[backlogStage.id] || '📋';

        return (
          <div key={backlogStage.id} className={`brutalist-column ${backlogStage.id}`}>
            <div className="brutalist-column-header">
              <div className="brutalist-column-title">
                <span className="brutalist-column-icon">{icon}</span>
                <span>{backlogStage.name.toUpperCase()}</span>
              </div>
              <span className="brutalist-column-count">{stageTasks.length}</span>
            </div>

            <div className="brutalist-column-tasks">
              {/* Add Task Button */}
              <div className="brutalist-add-task" onClick={toggleTaskInput}>
                + NEW
              </div>

              {stageTasks.map((task) => (
                <KanbanCard key={task.id} task={task} onEdit={handleEditTask} />
              ))}

              {stageTasks.length === 0 && (
                <div className="brutalist-empty-column">EMPTY</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* SDLC Stages */}
      {sdlcStages.map((stage) => {
        const stageTasks = filterTasks(getTasksByStage(stage.id));
        const icon = stageIcons[stage.id] || '📋';

        return (
          <div key={stage.id} className={`brutalist-column ${stage.id}`}>
            <div className="brutalist-column-header">
              <div className="brutalist-column-title">
                <span className="brutalist-column-icon">{icon}</span>
                <span>{stage.name.toUpperCase()}</span>
              </div>
              <span className="brutalist-column-count">{stageTasks.length}</span>
            </div>

            <div className="brutalist-column-tasks">
              {stageTasks.map((task) => (
                <KanbanCard key={task.id} task={task} onEdit={handleEditTask} />
              ))}

              {stageTasks.length === 0 && (
                <div className="brutalist-empty-column">EMPTY</div>
              )}
            </div>
          </div>
        );
      })}

      {/* Other Stages */}
      {otherStages.map((stage) => {
        const stageTasks = filterTasks(getTasksByStage(stage.id));
        const icon = stageIcons[stage.id] || '📋';

        return (
          <div key={stage.id} className={`brutalist-column ${stage.id}`}>
            <div className="brutalist-column-header">
              <div className="brutalist-column-title">
                <span className="brutalist-column-icon">{icon}</span>
                <span>{stage.name.toUpperCase()}</span>
              </div>
              <span className="brutalist-column-count">{stageTasks.length}</span>
            </div>

            <div className="brutalist-column-tasks">
              {stageTasks.map((task) => (
                <KanbanCard key={task.id} task={task} onEdit={handleEditTask} />
              ))}

              {stageTasks.length === 0 && (
                <div className="brutalist-empty-column">EMPTY</div>
              )}
            </div>
          </div>
        );
      })}

      {/* Task Edit Modal */}
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