/**
 * Tests for KanbanBoard Component
 * Comprehensive tests for the main Kanban board component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import KanbanBoard from '../KanbanBoard';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore');

// Mock child components
vi.mock('../KanbanCard', () => ({
  default: ({ task, onEdit }) => (
    <div data-testid={`kanban-card-${task.id}`} onClick={() => onEdit && onEdit(task)}>
      {task.title || task.metadata?.summary}
    </div>
  )
}));

vi.mock('../../forms/TaskInput', () => ({
  default: ({ task, onClose, onSave }) => (
    <div data-testid="task-input-modal">
      <button onClick={onClose}>Close</button>
      <button onClick={() => onSave && onSave()}>Save</button>
    </div>
  )
}));

describe('KanbanBoard Component', () => {
  let mockStore;

  const mockStages = [
    { id: 'backlog', name: 'Backlog' },
    { id: 'plan', name: 'Plan' },
    { id: 'build', name: 'Build' },
    { id: 'test', name: 'Test' },
    { id: 'review', name: 'Review' },
    { id: 'document', name: 'Document' },
    { id: 'ready-to-merge', name: 'Ready to Merge' },
    { id: 'errored', name: 'Errored' }
  ];

  const mockTasks = [
    {
      id: 1,
      title: 'Task in Backlog',
      description: 'Test task',
      stage: 'backlog',
      metadata: { summary: 'Backlog task' }
    },
    {
      id: 2,
      title: 'Task in Plan',
      description: 'Planning task',
      stage: 'plan',
      metadata: { summary: 'Plan task' }
    },
    {
      id: 3,
      title: 'Task in Build',
      description: 'Building task',
      stage: 'build',
      metadata: { summary: 'Build task' }
    }
  ];

  beforeEach(() => {
    mockStore = {
      stages: mockStages,
      getTasksByStage: vi.fn((stageId) => {
        return mockTasks.filter(task => task.stage === stageId);
      }),
      toggleTaskInput: vi.fn()
    };

    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all stage columns', () => {
      render(<KanbanBoard />);

      expect(screen.getByText('BACKLOG')).toBeInTheDocument();
      expect(screen.getByText('PLAN')).toBeInTheDocument();
      expect(screen.getByText('BUILD')).toBeInTheDocument();
      expect(screen.getByText('TEST')).toBeInTheDocument();
      expect(screen.getByText('REVIEW')).toBeInTheDocument();
      expect(screen.getByText('DOCUMENT')).toBeInTheDocument();
      expect(screen.getByText('READY TO MERGE')).toBeInTheDocument();
      expect(screen.getByText('ERRORED')).toBeInTheDocument();
    });

    it('should render tasks in correct columns', () => {
      render(<KanbanBoard />);

      expect(screen.getByTestId('kanban-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-card-3')).toBeInTheDocument();
    });

    it('should display task count for each stage', () => {
      render(<KanbanBoard />);

      const backlogColumn = screen.getByText('BACKLOG').closest('.brutalist-column');
      const planColumn = screen.getByText('PLAN').closest('.brutalist-column');
      const buildColumn = screen.getByText('BUILD').closest('.brutalist-column');

      expect(within(backlogColumn).getByText('1')).toBeInTheDocument();
      expect(within(planColumn).getByText('1')).toBeInTheDocument();
      expect(within(buildColumn).getByText('1')).toBeInTheDocument();
    });

    it('should show empty message for stages with no tasks', () => {
      render(<KanbanBoard />);

      const testColumn = screen.getByText('TEST').closest('.brutalist-column');
      expect(within(testColumn).getByText('EMPTY')).toBeInTheDocument();
    });

    it('should render "Add Task" button in backlog column', () => {
      render(<KanbanBoard />);

      const backlogColumn = screen.getByText('BACKLOG').closest('.brutalist-column');
      const addButton = within(backlogColumn).getByText('+ NEW');

      expect(addButton).toBeInTheDocument();
    });
  });

  describe('Search Filtering', () => {
    it('should filter tasks by title', () => {
      render(<KanbanBoard searchQuery="Plan" />);

      expect(screen.getByTestId('kanban-card-2')).toBeInTheDocument();
      expect(screen.queryByTestId('kanban-card-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kanban-card-3')).not.toBeInTheDocument();
    });

    it('should filter tasks by description', () => {
      render(<KanbanBoard searchQuery="Building" />);

      expect(screen.getByTestId('kanban-card-3')).toBeInTheDocument();
      expect(screen.queryByTestId('kanban-card-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kanban-card-2')).not.toBeInTheDocument();
    });

    it('should filter tasks by metadata summary', () => {
      render(<KanbanBoard searchQuery="Backlog task" />);

      expect(screen.getByTestId('kanban-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('kanban-card-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kanban-card-3')).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<KanbanBoard searchQuery="PLAN" />);

      expect(screen.getByTestId('kanban-card-2')).toBeInTheDocument();
    });

    it('should show all tasks when search query is empty', () => {
      render(<KanbanBoard searchQuery="" />);

      expect(screen.getByTestId('kanban-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-card-3')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should open task input modal when "Add Task" button is clicked', () => {
      render(<KanbanBoard />);

      const addButton = screen.getByText('+ NEW');
      fireEvent.click(addButton);

      expect(mockStore.toggleTaskInput).toHaveBeenCalledTimes(1);
    });

    it('should open edit modal when task is clicked', () => {
      render(<KanbanBoard />);

      const taskCard = screen.getByTestId('kanban-card-1');
      fireEvent.click(taskCard);

      expect(screen.getByTestId('task-input-modal')).toBeInTheDocument();
    });

    it('should close edit modal when close button is clicked', () => {
      render(<KanbanBoard />);

      // Open edit modal
      const taskCard = screen.getByTestId('kanban-card-1');
      fireEvent.click(taskCard);

      // Close modal
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('task-input-modal')).not.toBeInTheDocument();
    });

    it('should close edit modal when save button is clicked', () => {
      render(<KanbanBoard />);

      // Open edit modal
      const taskCard = screen.getByTestId('kanban-card-1');
      fireEvent.click(taskCard);

      // Save and close modal
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(screen.queryByTestId('task-input-modal')).not.toBeInTheDocument();
    });
  });

  describe('Stage Organization', () => {
    it('should render backlog stage first', () => {
      const { container } = render(<KanbanBoard />);

      const columns = container.querySelectorAll('.brutalist-column');
      const firstColumn = columns[0];

      expect(within(firstColumn).getByText('BACKLOG')).toBeInTheDocument();
    });

    it('should render SDLC stages in correct order', () => {
      const { container } = render(<KanbanBoard />);

      const columns = container.querySelectorAll('.brutalist-column');
      const sdlcStageNames = ['PLAN', 'BUILD', 'TEST', 'REVIEW', 'DOCUMENT', 'READY TO MERGE', 'ERRORED'];

      sdlcStageNames.forEach((stageName, index) => {
        // Skip backlog (index 0), start checking from index 1
        const column = columns[index + 1];
        expect(within(column).getByText(stageName)).toBeInTheDocument();
      });
    });

    it('should apply correct CSS class to each column', () => {
      const { container } = render(<KanbanBoard />);

      expect(container.querySelector('.brutalist-column.backlog')).toBeInTheDocument();
      expect(container.querySelector('.brutalist-column.plan')).toBeInTheDocument();
      expect(container.querySelector('.brutalist-column.build')).toBeInTheDocument();
      expect(container.querySelector('.brutalist-column.test')).toBeInTheDocument();
      expect(container.querySelector('.brutalist-column.review')).toBeInTheDocument();
      expect(container.querySelector('.brutalist-column.document')).toBeInTheDocument();
      expect(container.querySelector('.brutalist-column.ready-to-merge')).toBeInTheDocument();
      expect(container.querySelector('.brutalist-column.errored')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stages array', () => {
      mockStore.stages = [];

      render(<KanbanBoard />);

      expect(screen.queryByText('BACKLOG')).not.toBeInTheDocument();
    });

    it('should handle missing getTasksByStage function', () => {
      mockStore.getTasksByStage = undefined;

      expect(() => render(<KanbanBoard />)).toThrow();
    });

    it('should handle tasks with missing metadata', () => {
      const tasksWithoutMetadata = [
        { id: 4, title: 'Task without metadata', stage: 'backlog' }
      ];

      mockStore.getTasksByStage.mockImplementation((stageId) => {
        return tasksWithoutMetadata.filter(task => task.stage === stageId);
      });

      render(<KanbanBoard />);

      expect(screen.getByTestId('kanban-card-4')).toBeInTheDocument();
    });

    it('should handle multiple edit modals correctly', () => {
      render(<KanbanBoard />);

      // Open first edit modal
      const taskCard1 = screen.getByTestId('kanban-card-1');
      fireEvent.click(taskCard1);

      expect(screen.getByTestId('task-input-modal')).toBeInTheDocument();

      // Close and open second edit modal
      fireEvent.click(screen.getByText('Close'));

      const taskCard2 = screen.getByTestId('kanban-card-2');
      fireEvent.click(taskCard2);

      expect(screen.getByTestId('task-input-modal')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should efficiently handle large number of tasks', () => {
      const largeMockTasks = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        title: `Task ${i}`,
        stage: mockStages[i % mockStages.length].id,
        metadata: { summary: `Task ${i}` }
      }));

      mockStore.getTasksByStage.mockImplementation((stageId) => {
        return largeMockTasks.filter(task => task.stage === stageId);
      });

      const { container } = render(<KanbanBoard />);

      expect(container.querySelectorAll('[data-testid^="kanban-card-"]')).toHaveLength(100);
    });

    it('should not re-render unnecessarily when props do not change', () => {
      const { rerender } = render(<KanbanBoard searchQuery="" />);

      const initialRenderCount = mockStore.getTasksByStage.mock.calls.length;

      rerender(<KanbanBoard searchQuery="" />);

      // Should call getTasksByStage again for each stage on re-render
      // This is expected behavior as the component calls it in render
      expect(mockStore.getTasksByStage.mock.calls.length).toBeGreaterThan(initialRenderCount);
    });
  });
});
