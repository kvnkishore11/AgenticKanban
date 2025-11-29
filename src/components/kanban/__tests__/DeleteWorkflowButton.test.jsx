/**
 * Tests for Delete Workflow Button Behavior
 * Tests the enhanced delete flow with backend-first deletion and WebSocket confirmation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TaskDetailsModal from '../TaskDetailsModal';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore');

// Mock adwDiscoveryService
vi.mock('../../../services/api/adwDiscoveryService', () => ({
  default: {
    fetchPlanFile: vi.fn()
  }
}));

// Mock child components
vi.mock('../StageLogsViewer', () => ({
  default: () => <div data-testid="stage-logs-viewer">StageLogsViewer</div>
}));

vi.mock('../PlanViewer', () => ({
  default: () => null
}));

// Mock localStorage
Storage.prototype.getItem = vi.fn(() => null);
Storage.prototype.setItem = vi.fn();

describe('Delete Workflow Button Enhanced Tests', () => {
  let mockStore;
  const mockOnClose = vi.fn();
  const mockOnEdit = vi.fn();

  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test description',
    stage: 'build',
    pipelineId: 'adw_plan_build_test',
    metadata: {
      adw_id: 'test1234'
    }
  };

  beforeEach(() => {
    mockStore = {
      getPipelineById: vi.fn(() => ({ name: 'Test Pipeline' })),
      getWorkflowStatusForTask: vi.fn(() => null),
      getWebSocketStatus: vi.fn(() => ({ connected: true })),
      triggerWorkflowForTask: vi.fn(),
      getWorkflowLogsForTask: vi.fn(() => []),
      getWorkflowProgressForTask: vi.fn(() => null),
      getWorkflowMetadataForTask: vi.fn(() => null),
      clearWorkflowLogsForTask: vi.fn(),
      triggerMergeWorkflow: vi.fn(),
      deleteWorktree: vi.fn(() => Promise.resolve(true)),
      getDeletionState: vi.fn(() => null)
    };

    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when delete button is clicked', async () => {
    // Set up deletion state to show loading
    mockStore.getDeletionState.mockReturnValue({ loading: true, error: null });

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Find and click delete button
    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toBeInTheDocument();

    // Verify delete button shows loading state
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(deleteButton).toBeDisabled();
  });

  it('task remains in board while deletion is in progress', async () => {
    // Start with no deletion state
    mockStore.getDeletionState.mockReturnValue(null);

    const { rerender } = render(
      <TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />
    );

    // Click the delete button
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByText('Delete Worktree')).toBeInTheDocument();
    });

    // Click confirm
    const confirmButton = screen.getByText('Delete Worktree', { selector: 'button span' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockStore.deleteWorktree).toHaveBeenCalledWith('test1234');
    });

    // Update the deletion state to loading
    mockStore.getDeletionState.mockReturnValue({ loading: true, error: null });

    // Rerender with updated state
    rerender(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Verify the task modal is still visible (not closed yet)
    expect(screen.getByText('Test Task')).toBeInTheDocument();

    // Verify loading state is shown
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('displays error notification if backend deletion fails', async () => {
    // Mock deleteWorktree to fail
    mockStore.deleteWorktree.mockResolvedValue(false);
    mockStore.getDeletionState.mockReturnValue({ loading: false, error: 'Deletion failed' });

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText('Delete Worktree', { selector: 'h3' })).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Delete Worktree', { selector: 'button span' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockStore.deleteWorktree).toHaveBeenCalled();
    });

    // Verify error is displayed in the modal
    await waitFor(() => {
      expect(screen.getByText('Deletion failed')).toBeInTheDocument();
    });
  });

  it('shows loading spinner in confirmation modal during deletion', async () => {
    mockStore.getDeletionState.mockReturnValue({ loading: true, error: null });

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Worktree', { selector: 'h3' })).toBeInTheDocument();
    });

    // Verify loading spinner is visible (from Tailwind animation classes)
    const loadingSpinner = screen.getByText('Deleting...').previousSibling;
    expect(loadingSpinner).toHaveClass('animate-spin');
  });

  it('cancel button is disabled during deletion', async () => {
    mockStore.getDeletionState.mockReturnValue({ loading: true, error: null });

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Worktree', { selector: 'h3' })).toBeInTheDocument();
    });

    // Verify cancel button is disabled
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();
  });

  it('calls deleteWorktree with correct adw_id', async () => {
    mockStore.getDeletionState.mockReturnValue(null);

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Worktree', { selector: 'h3' })).toBeInTheDocument();
    });

    // Click confirm
    const confirmButton = screen.getByText('Delete Worktree', { selector: 'button span' });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Verify deleteWorktree was called with correct ADW ID
    await waitFor(() => {
      expect(mockStore.deleteWorktree).toHaveBeenCalledWith('test1234');
    });
  });

  it('handles missing adw_id gracefully', async () => {
    const taskWithoutAdw = {
      ...mockTask,
      metadata: {}
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TaskDetailsModal task={taskWithoutAdw} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Worktree', { selector: 'h3' })).toBeInTheDocument();
    });

    // Click confirm
    const confirmButton = screen.getByText('Delete Worktree', { selector: 'button span' });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith('No ADW ID found for this task');

    // Verify deleteWorktree was NOT called
    expect(mockStore.deleteWorktree).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('closes confirmation modal if deletion fails immediately', async () => {
    mockStore.deleteWorktree.mockResolvedValue(false);

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Worktree', { selector: 'h3' })).toBeInTheDocument();
    });

    // Click confirm
    const confirmButton = screen.getByText('Delete Worktree', { selector: 'button span' });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Wait for deletion to complete
    await waitFor(() => {
      expect(mockStore.deleteWorktree).toHaveBeenCalled();
    });

    // Confirmation modal should close
    await waitFor(() => {
      expect(screen.queryByText('Delete Worktree', { selector: 'h3' })).not.toBeInTheDocument();
    });
  });

  it('shows error message in confirmation modal when deletion fails', async () => {
    const errorMessage = 'Failed to delete worktree: Network error';
    mockStore.getDeletionState.mockReturnValue({ loading: false, error: errorMessage });

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Worktree', { selector: 'h3' })).toBeInTheDocument();
    });

    // Verify error message is displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Error:')).toBeInTheDocument();
  });
});
