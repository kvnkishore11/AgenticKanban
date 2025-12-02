/**
 * @fileoverview CompletedTasksView Component
 * Full-page view for displaying all completed tasks (replaces modal)
 */

import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useKanbanStore } from '../../stores/kanbanStore';
import KanbanCard from './KanbanCard';

/**
 * Full-page view component for displaying completed tasks
 * @param {Object} props - Component props
 * @param {Function} props.onBack - Callback to go back to the kanban board
 * @returns {JSX.Element} The completed tasks full-page view
 */
const CompletedTasksView = ({ onBack }) => {
  const { getCompletedTasks } = useKanbanStore();
  const completedTasks = getCompletedTasks();

  return (
    <div className="brutalist-board">
      {/* Header Column with Back Button */}
      <div className="brutalist-column completed-view-header" style={{ minWidth: '200px', maxWidth: '200px' }}>
        <div className="brutalist-column-header" style={{ background: '#059669' }}>
          <div className="brutalist-column-title">
            <span className="brutalist-column-icon">✅</span>
            <span>COMPLETED</span>
          </div>
          <span className="brutalist-column-count">{completedTasks.length}</span>
        </div>
        <div className="brutalist-column-tasks">
          <div
            className="brutalist-add-task"
            onClick={onBack}
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={14} style={{ marginRight: '4px' }} />
            BACK TO BOARD
          </div>
        </div>
      </div>

      {/* Completed Tasks Grid */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '16px',
        alignContent: 'flex-start',
        overflowY: 'auto',
        background: '#f5f5f5'
      }}>
        {completedTasks.length > 0 ? (
          completedTasks.map((task) => (
            <div
              key={task.id}
              style={{
                width: '300px',
                flexShrink: 0
              }}
            >
              <KanbanCard task={task} onEdit={() => {}} />
            </div>
          ))
        ) : (
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px',
            textAlign: 'center'
          }}>
            <CheckCircle size={64} style={{ color: '#d1d5db', marginBottom: '16px' }} />
            <h3 style={{
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              No Completed Tasks Yet
            </h3>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              maxWidth: '400px'
            }}>
              Tasks that have been successfully merged will appear here.
              Complete your workflows and merge to main to see tasks in this list!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedTasksView;
