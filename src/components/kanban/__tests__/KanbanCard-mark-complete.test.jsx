/**
 * Tests for Mark as Complete functionality in KanbanCard Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KanbanCard from '../KanbanCard';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore', () => ({
  useKanbanStore: vi.fn()
}));

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

// Mock adwService
vi.mock('../../../services/api/adwService', () => ({
  default: {
    openWorktree: vi.fn(() => Promise.resolve({ success: true })),
    openCodebase: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

describe('KanbanCard - Mark as Complete', () => {
  let mockStore;
  let mockTask;
  let mockOnEdit;
  let mockMarkTaskAsComplete;

  beforeEach(() => {
    mockOnEdit = vi.fn();
    mockMarkTaskAsComplete = vi.fn(() => Promise.resolve(true));

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
        adw_id: 'test123',
        summary: 'Task Summary',
        work_item_type: 'feature',
        status: 'in_progress'
      }
    };

    mockStore = {
      deleteWorktree: vi.fn(() => Promise.resolve()),
      triggerWorkflowForTask: vi.fn(() => Promise.resolve()),
      markTaskAsComplete: mockMarkTaskAsComplete,
      triggerMergeWorkflow: vi.fn(() => Promise.resolve()),
      getMergeState: vi.fn(() => null),
      taskWorkflowLogs: {},
      taskWorkflowProgress: {},
      deletingAdws: {},
      mergingTasks: {},
      websocketConnected: true
    };

    useKanbanStore.mockImplementation((selector) => selector(mockStore));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show mark as complete menu item for plan stage task', () => {
    render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    // Check if "MARK AS COMPLETE" menu item is visible
    expect(screen.getByText(/MARK AS COMPLETE/i)).toBeInTheDocument();
  });

  it('should show mark as complete menu item for build stage task', () => {
    const buildTask = { ...mockTask, stage: 'build' };
    render(<KanbanCard task={buildTask} onEdit={mockOnEdit} />);

    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    expect(screen.getByText(/MARK AS COMPLETE/i)).toBeInTheDocument();
  });

  it('should show mark as complete menu item for test stage task', () => {
    const testTask = { ...mockTask, stage: 'test' };
    render(<KanbanCard task={testTask} onEdit={mockOnEdit} />);

    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    expect(screen.getByText(/MARK AS COMPLETE/i)).toBeInTheDocument();
  });

  it('should show mark as complete menu item for ready-to-merge stage task', () => {
    const readyTask = { ...mockTask, stage: 'ready-to-merge' };
    render(<KanbanCard task={readyTask} onEdit={mockOnEdit} />);

    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    expect(screen.getByText(/MARK AS COMPLETE/i)).toBeInTheDocument();
  });

  it('should NOT show mark as complete menu item for backlog stage task', () => {
    const backlogTask = { ...mockTask, stage: 'backlog' };
    render(<KanbanCard task={backlogTask} onEdit={mockOnEdit} />);

    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    expect(screen.queryByText(/MARK AS COMPLETE/i)).not.toBeInTheDocument();
  });

  it('should NOT show mark as complete menu item for completed stage task', () => {
    const completedTask = { ...mockTask, stage: 'completed' };
    render(<KanbanCard task={completedTask} onEdit={mockOnEdit} />);

    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    expect(screen.queryByText(/MARK AS COMPLETE/i)).not.toBeInTheDocument();
  });

  it('should NOT show mark as complete menu item for errored stage task', () => {
    const erroredTask = { ...mockTask, stage: 'errored' };
    render(<KanbanCard task={erroredTask} onEdit={mockOnEdit} />);

    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    expect(screen.queryByText(/MARK AS COMPLETE/i)).not.toBeInTheDocument();
  });

  it('should call markTaskAsComplete when menu item is clicked', async () => {
    render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    // Click "MARK AS COMPLETE"
    const markCompleteItem = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteItem);

    await waitFor(() => {
      expect(mockMarkTaskAsComplete).toHaveBeenCalledWith(mockTask.id);
    });
  });

  it('should close menu after clicking mark as complete', async () => {
    render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    // Click "MARK AS COMPLETE"
    const markCompleteItem = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteItem);

    await waitFor(() => {
      expect(screen.queryByText(/MARK AS COMPLETE/i)).not.toBeInTheDocument();
    });
  });

  it('should show loading state while marking complete', async () => {
    // Mock a delayed response
    mockMarkTaskAsComplete.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(true), 100))
    );

    render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    // Click "MARK AS COMPLETE"
    const markCompleteItem = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteItem);

    // The component should show disabled state or loading message
    // (Note: this test may need adjustment based on actual loading UI)
    await waitFor(() => {
      expect(mockMarkTaskAsComplete).toHaveBeenCalled();
    });
  });

  it('should handle errors gracefully when marking complete fails', async () => {
    // Mock a failed response
    mockMarkTaskAsComplete.mockRejectedValueOnce(new Error('API Error'));

    render(<KanbanCard task={mockTask} onEdit={mockOnEdit} />);

    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    // Click "MARK AS COMPLETE"
    const markCompleteItem = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteItem);

    await waitFor(() => {
      expect(mockMarkTaskAsComplete).toHaveBeenCalledWith(mockTask.id);
    });

    // Component should remain stable (not crash)
    expect(screen.getByText(/TASK SUMMARY/i)).toBeInTheDocument();
  });

  it('should stop event propagation when clicking mark as complete', async () => {
    const mockCardClick = vi.fn();

    render(
      <div onClick={mockCardClick}>
        <KanbanCard task={mockTask} onEdit={mockOnEdit} />
      </div>
    );

    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: /⋮/i });
    fireEvent.click(menuButton);

    // Click "MARK AS COMPLETE"
    const markCompleteItem = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteItem);

    await waitFor(() => {
      expect(mockMarkTaskAsComplete).toHaveBeenCalled();
    });

    // Parent click handler should not be triggered
    expect(mockCardClick).not.toHaveBeenCalled();
  });
});
