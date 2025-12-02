/**
 * Tests for KanbanCard Component
 * Tests StatusIndicator integration and card rendering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KanbanCard from '../KanbanCard';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore', () => ({
  useKanbanStore: vi.fn()
}));

// Note: StatusIndicator was removed from KanbanCard in a previous refactor
// Status is now shown inline in the card design

// Mock CardExpandModal
vi.mock('../CardExpandModal', () => ({
  default: ({ task, isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="card-expand-modal">
        CardExpandModal for task {task.id}
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
}));

// Mock useStageTransition hook
vi.mock('../../../hooks/useStageTransition', () => ({
  useStageTransition: () => ({
    getTransitionClass: () => 'transition-class',
    getGlowClass: () => 'glow-class',
    shouldPulse: () => false
  })
}));

// Mock createPortal
vi.mock('react-dom', () => ({
  createPortal: (element) => element
}));

describe('KanbanCard Component', () => {
  let mockStore;
  let mockTask;
  let mockOnEdit;

  beforeEach(() => {
    mockOnEdit = vi.fn();

    mockTask = {
      id: 123,
      title: 'Test Task Title',
      description: 'Test task description',
      stage: 'plan',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z',
      queuedStages: ['plan', 'build', 'test'],
      pipelineId: 'adw_plan_build_test',
      metadata: {
        adw_id: 'adw_plan_build_test_issue_123',
        summary: 'Task Summary',
        work_item_type: 'feature',
        status: 'in_progress'
      }
    };

    mockStore = {
      deleteWorktree: vi.fn(() => Promise.resolve()),
      triggerWorkflowForTask: vi.fn(() => Promise.resolve()),
      taskWorkflowLogs: {},
      taskWorkflowProgress: {},
      deletingAdws: {},
      websocketConnected: true
    };

    useKanbanStore.mockImplementation((selector) => selector(mockStore));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Note: StatusIndicator tests removed - StatusIndicator component was removed
  // from KanbanCard in a previous refactor. Status is now shown inline via
  // pipeline stages and card styling.

  describe('Card Rendering', () => {
    it('should render task ID', () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('should render ADW ID (first 8 chars)', () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      expect(screen.getByText('ADW_PLAN')).toBeInTheDocument();
    });

    it('should render task title in uppercase', () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      expect(screen.getByText('TASK SUMMARY')).toBeInTheDocument();
    });

    it('should render task description', () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      expect(screen.getByText('Test task description')).toBeInTheDocument();
    });

    it('should show feature label for feature tasks', () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      expect(screen.getByText(/FEATURE/)).toBeInTheDocument();
    });

    it('should show bug label for bug tasks', () => {
      const bugTask = {
        ...mockTask,
        metadata: {
          ...mockTask.metadata,
          work_item_type: 'bug'
        }
      };

      render(<KanbanCard task={bugTask} onEdit={mockOnEdit} />);

      expect(screen.getByText(/BUG/)).toBeInTheDocument();
    });
  });

  describe('Card Interactions', () => {
    it('should open expand modal when card is clicked', () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      const card = screen.getByText('TASK SUMMARY').closest('.brutalist-task-card');
      fireEvent.click(card);

      expect(screen.getByTestId('card-expand-modal')).toBeInTheDocument();
    });

    it('should show menu when menu button is clicked', () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      const menuButton = screen.getByText('⋮');
      fireEvent.click(menuButton);

      expect(screen.getByText('✎ EDIT')).toBeInTheDocument();
      expect(screen.getByText('▶ TRIGGER')).toBeInTheDocument();
      expect(screen.getByText('🗑 DELETE')).toBeInTheDocument();
    });

    it('should call onEdit when edit menu item is clicked', () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      const menuButton = screen.getByText('⋮');
      fireEvent.click(menuButton);

      const editButton = screen.getByText('✎ EDIT');
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
    });

    it('should trigger workflow when trigger menu item is clicked', async () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      const menuButton = screen.getByText('⋮');
      fireEvent.click(menuButton);

      const triggerButton = screen.getByText('▶ TRIGGER');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockStore.triggerWorkflowForTask).toHaveBeenCalledWith(
          mockTask.id,
          { issue_number: '123' }
        );
      });
    });

    it('should call deleteWorktree when delete menu item is clicked', async () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      const menuButton = screen.getByText('⋮');
      fireEvent.click(menuButton);

      const deleteButton = screen.getByText('🗑 DELETE');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockStore.deleteWorktree).toHaveBeenCalledWith('adw_plan_build_test_issue_123');
      });
    });
  });

  describe('Deletion State', () => {
    it('should show deleting overlay when task is being deleted', () => {
      mockStore.deletingAdws = {
        'adw_plan_build_test_issue_123': { loading: true }
      };

      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      expect(screen.getByText('DELETING...')).toBeInTheDocument();
    });

    it('should disable card interactions when deleting', () => {
      mockStore.deletingAdws = {
        'adw_plan_build_test_issue_123': { loading: true }
      };

      const { container } = render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      const card = container.querySelector('.brutalist-task-card');
      expect(card).toHaveStyle({ pointerEvents: 'none' });
    });
  });

  describe('Pipeline Stages', () => {
    it('should render pipeline stages from queuedStages', () => {
      const { container } = render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      const pipelineStages = container.querySelectorAll('.brutalist-pipeline-stage');
      expect(pipelineStages.length).toBe(3); // plan, build, test
    });

    it('should mark current stage as active', () => {
      const { container } = render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      const activeStages = container.querySelectorAll('.brutalist-pipeline-stage.active');
      expect(activeStages.length).toBe(1);
    });

    it('should use default stages when pipelineId is adw_unknown', () => {
      // This tests the fix for the "U" (unknown) stage issue
      const taskWithUnknownPipeline = {
        ...mockTask,
        queuedStages: [], // Empty so it falls through to pipelineId
        pipelineId: 'adw_unknown' // This should NOT be parsed, should use fallback
      };

      const { container } = render(<KanbanCard task={taskWithUnknownPipeline} onEdit={mockOnEdit} />);

      const pipelineStages = container.querySelectorAll('.brutalist-pipeline-stage');
      // Should show default stages ['P', 'B'], not ['U']
      expect(pipelineStages.length).toBe(2);

      // Verify the stage text content is P and B, not U
      const stageTexts = Array.from(pipelineStages).map(el => el.textContent);
      expect(stageTexts).toContain('P');
      expect(stageTexts).toContain('B');
      expect(stageTexts).not.toContain('U');
    });

    it('should filter out unknown and iso from parsed pipelineId', () => {
      const taskWithMixedStages = {
        ...mockTask,
        queuedStages: [],
        pipelineId: 'adw_plan_build_unknown_test_iso'
      };

      const { container } = render(<KanbanCard task={taskWithMixedStages} onEdit={mockOnEdit} />);

      const pipelineStages = container.querySelectorAll('.brutalist-pipeline-stage');
      // Should show ['P', 'B', 'T'] after filtering out 'unknown' and 'iso'
      expect(pipelineStages.length).toBe(3);

      const stageTexts = Array.from(pipelineStages).map(el => el.textContent);
      expect(stageTexts).toContain('P');
      expect(stageTexts).toContain('B');
      expect(stageTexts).toContain('T');
      expect(stageTexts).not.toContain('U'); // unknown
      expect(stageTexts).not.toContain('I'); // iso
    });

    it('should use default stages when no valid pipeline info available', () => {
      const taskWithNoPipeline = {
        ...mockTask,
        queuedStages: [],
        pipelineId: null,
        workflow_stages: null,
        workflow_name: null,
        metadata: {}
      };

      const { container } = render(<KanbanCard task={taskWithNoPipeline} onEdit={mockOnEdit} />);

      const pipelineStages = container.querySelectorAll('.brutalist-pipeline-stage');
      // Should show default stages ['P', 'B']
      expect(pipelineStages.length).toBe(2);

      const stageTexts = Array.from(pipelineStages).map(el => el.textContent);
      expect(stageTexts).toContain('P');
      expect(stageTexts).toContain('B');
    });

    it('should parse valid pipelineId correctly', () => {
      const taskWithValidPipeline = {
        ...mockTask,
        queuedStages: [],
        pipelineId: 'adw_plan_build_test_review_document'
      };

      const { container } = render(<KanbanCard task={taskWithValidPipeline} onEdit={mockOnEdit} />);

      const pipelineStages = container.querySelectorAll('.brutalist-pipeline-stage');
      expect(pipelineStages.length).toBe(5); // P, B, T, R, D

      const stageTexts = Array.from(pipelineStages).map(el => el.textContent);
      expect(stageTexts).toEqual(['P', 'B', 'T', 'R', 'D']);
    });

    it('should prioritize workflow_stages over pipelineId', () => {
      const taskWithBothSources = {
        ...mockTask,
        queuedStages: [],
        workflow_stages: [{ stage_name: 'plan' }, { stage_name: 'test' }],
        pipelineId: 'adw_plan_build_test_review_document'
      };

      const { container } = render(<KanbanCard task={taskWithBothSources} onEdit={mockOnEdit} />);

      const pipelineStages = container.querySelectorAll('.brutalist-pipeline-stage');
      // Should use workflow_stages (P, T), not pipelineId (P, B, T, R, D)
      expect(pipelineStages.length).toBe(2);

      const stageTexts = Array.from(pipelineStages).map(el => el.textContent);
      expect(stageTexts).toEqual(['P', 'T']);
    });
  });

  describe('Workflow Logs', () => {
    it('should display log count when logs are available', () => {
      mockStore.taskWorkflowLogs = {
        [mockTask.id]: [
          { id: 1, message: 'Log 1', level: 'info' },
          { id: 2, message: 'Log 2', level: 'debug' }
        ]
      };

      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      expect(screen.getByText(/2 LOGS/)).toBeInTheDocument();
    });

    it('should display latest log message', () => {
      mockStore.taskWorkflowLogs = {
        [mockTask.id]: [
          { id: 1, message: 'First log message', level: 'info' },
          { id: 2, message: 'Latest log message', level: 'success' }
        ]
      };

      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      expect(screen.getByText(/Latest log message/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without metadata', () => {
      const taskWithoutMetadata = {
        id: 456,
        title: 'Task without metadata',
        stage: 'plan',
        updatedAt: '2024-01-15T12:00:00Z'
      };

      render(<KanbanCard task={taskWithoutMetadata} onEdit={mockOnEdit} />);

      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });

    it('should handle task without description', () => {
      const taskWithoutDescription = {
        ...mockTask,
        description: undefined
      };

      const { container } = render(<KanbanCard task={taskWithoutDescription} onEdit={mockOnEdit} />);

      const description = container.querySelector('.brutalist-task-description');
      expect(description).not.toBeInTheDocument();
    });

    it('should handle task with minimal required values', () => {
      // Task must have id, title, and stage (required for rendering)
      // Other fields can be null/undefined
      const minimalTask = {
        id: 789,
        title: 'Minimal Task',
        stage: 'backlog', // Stage is required - used for rendering
        updatedAt: null,
        description: null,
        queuedStages: null,
        pipelineId: null
      };

      expect(() => {
        render(<KanbanCard task={minimalTask} onEdit={mockOnEdit} />);
      }).not.toThrow();
    });

    it('should handle missing queuedStages and pipelineId', () => {
      const taskWithoutPipeline = {
        ...mockTask,
        queuedStages: undefined,
        pipelineId: undefined
      };

      const { container } = render(<KanbanCard task={taskWithoutPipeline} onEdit={mockOnEdit} />);

      const pipelineStages = container.querySelectorAll('.brutalist-pipeline-stage');
      expect(pipelineStages.length).toBeGreaterThan(0); // Should use default stages
    });
  });

  describe('Card Core Functionality', () => {
    it('should render all main card elements', () => {
      render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

      // Verify all main card elements render correctly
      expect(screen.getByText('123')).toBeInTheDocument(); // Task ID
      expect(screen.getByText('TASK SUMMARY')).toBeInTheDocument(); // Title
      expect(screen.getByText('⋮')).toBeInTheDocument(); // Menu button
    });

    it('should render card for all ADW workflow stages', () => {
      const stages = [
        { stage: 'backlog' },
        { stage: 'plan' },
        { stage: 'build' },
        { stage: 'test' },
        { stage: 'review' },
        { stage: 'completed' }
      ];

      stages.forEach(({ stage }) => {
        const task = {
          ...mockTask,
          stage,
          metadata: {
            ...mockTask.metadata,
            status: stage === 'completed' ? 'completed' : 'in_progress'
          }
        };

        const { unmount, container } = render(<KanbanCard task={task} onEdit={mockOnEdit} />);

        // Card should render without crashing for all stages
        const card = container.querySelector('.brutalist-task-card');
        expect(card).toBeInTheDocument();

        unmount();
      });
    });
  });
});
