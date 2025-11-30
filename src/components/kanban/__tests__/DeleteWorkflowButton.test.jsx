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
      getDeletionState: vi.fn(() => null),
      getMergeState: vi.fn(() => null),
      clearMergeState: vi.fn()
    };

    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when getDeletionState returns loading', async () => {
    // Simulate loading state from store
    mockStore.getDeletionState.mockReturnValue({ loading: true, error: null });

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Delete button should show loading state
    const deleteTexts = screen.getAllByText('Deleting...');
    expect(deleteTexts.length).toBeGreaterThan(0);

    // Main delete button should be disabled
    const mainDeleteButton = deleteTexts[0].closest('button');
    expect(mainDeleteButton).toBeDisabled();
  });

  it('calls deleteWorktree when confirm is clicked', async () => {
    mockStore.getDeletionState.mockReturnValue(null);

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Click the delete button to open confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete Worktree' })).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByRole('button', { name: /Delete Worktree/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Verify deleteWorktree was called with correct ADW ID
    await waitFor(() => {
      expect(mockStore.deleteWorktree).toHaveBeenCalledWith('test1234');
    });
  });

  it('task modal remains visible while deletion is in progress', async () => {
    // Start with no loading state
    mockStore.getDeletionState.mockReturnValue(null);

    const { rerender } = render(
      <TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />
    );

    // Click the delete button
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete Worktree' })).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByRole('button', { name: /Delete Worktree/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockStore.deleteWorktree).toHaveBeenCalledWith('test1234');
    });

    // Simulate loading state from store (as would happen in real implementation)
    mockStore.getDeletionState.mockReturnValue({ loading: true, error: null });
    rerender(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Verify the task modal is still visible while deletion is in progress
    expect(screen.getByText('Test Task')).toBeInTheDocument();

    // Verify loading state is shown
    expect(screen.getAllByText('Deleting...').length).toBeGreaterThan(0);
  });

  it('closes confirmation modal after deletion completes (failure case)', async () => {
    // Deletion returns false (failure case)
    mockStore.deleteWorktree.mockResolvedValue(false);
    mockStore.getDeletionState.mockReturnValue(null);

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete Worktree' })).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByRole('button', { name: /Delete Worktree/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockStore.deleteWorktree).toHaveBeenCalled();
    });

    // Modal should close after deletion fails
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Delete Worktree' })).not.toBeInTheDocument();
    });
  });

  it('shows loading spinner in confirmation modal during deletion', async () => {
    // First start with no loading state to open the modal
    mockStore.getDeletionState.mockReturnValue(null);

    const { rerender } = render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete Worktree' })).toBeInTheDocument();
    });

    // Now simulate loading state (as if deletion was triggered)
    mockStore.getDeletionState.mockReturnValue({ loading: true, error: null });
    rerender(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Verify loading spinner is visible (component should show Deleting... with spinner)
    const loadingTexts = screen.getAllByText('Deleting...');
    // Find the one in the confirmation modal button
    const confirmModalLoadingText = loadingTexts.find(el => {
      const button = el.closest('button');
      return button && button.classList.contains('bg-red-600');
    });
    expect(confirmModalLoadingText).toBeDefined();
    const loadingSpinner = confirmModalLoadingText.previousSibling;
    expect(loadingSpinner).toHaveClass('animate-spin');
  });

  it('cancel button is disabled during deletion', async () => {
    // First start with no loading state to open the modal
    mockStore.getDeletionState.mockReturnValue(null);

    const { rerender } = render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete Worktree' })).toBeInTheDocument();
    });

    // Now simulate loading state (as if deletion was triggered)
    mockStore.getDeletionState.mockReturnValue({ loading: true, error: null });
    rerender(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Verify cancel button is disabled during deletion
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
      expect(screen.getAllByText('Delete Worktree')[0]).toBeInTheDocument();
    });

    // Click confirm
    const confirmButtons = screen.getAllByText('Delete Worktree');
    const confirmButton = confirmButtons.find(el => el.closest('button'));
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Verify deleteWorktree was called with correct ADW ID
    await waitFor(() => {
      expect(mockStore.deleteWorktree).toHaveBeenCalledWith('test1234');
    });
  });

  it('handles missing adw_id gracefully - delete button not shown', async () => {
    const taskWithoutAdw = {
      ...mockTask,
      metadata: {}
    };

    mockStore.getDeletionState.mockReturnValue(null);

    render(<TaskDetailsModal task={taskWithoutAdw} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Verify the delete button is not rendered when adw_id is missing
    // (Component only shows ADW header section when task.metadata?.adw_id exists)
    const deleteButtons = screen.queryAllByText('Delete');
    expect(deleteButtons.length).toBe(0);

    // Verify task modal is still displayed normally
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('closes confirmation modal if deletion fails immediately', async () => {
    mockStore.deleteWorktree.mockResolvedValue(false);
    mockStore.getDeletionState.mockReturnValue(null);

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete Worktree' })).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByRole('button', { name: /Delete Worktree/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // Wait for deletion to complete
    await waitFor(() => {
      expect(mockStore.deleteWorktree).toHaveBeenCalled();
    });

    // Confirmation modal should close after deletion completes
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Delete Worktree' })).not.toBeInTheDocument();
    });
  });

  it('shows main delete button disabled while deletion is in progress', async () => {
    // Simulate loading state
    mockStore.getDeletionState.mockReturnValue({ loading: true, error: null });

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Check that the main delete button shows "Deleting..." and is disabled
    const deletingButtons = screen.getAllByText('Deleting...');
    expect(deletingButtons.length).toBeGreaterThan(0);

    const mainDeleteButton = deletingButtons[0].closest('button');
    expect(mainDeleteButton).toBeDisabled();
  });

  it('shows error message in confirmation modal when deletion has error', async () => {
    const errorMessage = 'Failed to delete worktree: Network error';
    mockStore.getDeletionState.mockReturnValue({ loading: false, error: errorMessage });

    render(<TaskDetailsModal task={mockTask} onClose={mockOnClose} onEdit={mockOnEdit} />);

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete Worktree' })).toBeInTheDocument();
    });

    // Verify error message is displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Error:')).toBeInTheDocument();
  });
});
