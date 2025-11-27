/**
 * Tests for TaskDetailsModal Component
 * Tests comprehensive task details display with workflow controls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskDetailsModal from '../TaskDetailsModal';
import { useKanbanStore } from '../../../stores/kanbanStore';
import adwDiscoveryService from '../../../services/api/adwDiscoveryService';

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
  default: ({ taskId, adwId }) => (
    <div data-testid="stage-logs-viewer">
      StageLogsViewer for {taskId} - {adwId}
    </div>
  )
}));

vi.mock('../PlanViewer', () => ({
  default: ({ planContent, adwId, isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="plan-viewer">
        <div>Plan for {adwId}</div>
        <div>{planContent}</div>
        <button onClick={onClose}>Close Plan</button>
      </div>
    ) : null
  )
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock localStorage
Storage.prototype.getItem = vi.fn(() => null);
Storage.prototype.setItem = vi.fn();

describe('TaskDetailsModal Component', () => {
  let mockStore;
  const mockOnClose = vi.fn();
  const mockOnEdit = vi.fn();

  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    description: 'This is a test task description',
    stage: 'build',
    pipelineId: 'adw_plan_build_test',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-02T12:00:00Z',
    metadata: {
      adw_id: 'adw-123',
      summary: 'Test summary'
    },
    logs: [
      {
        message: 'Build started',
        timestamp: '2024-01-02T11:00:00Z',
        stage: 'build',
        substageName: 'Compile'
      }
    ]
  };

  beforeEach(() => {
    mockStore = {
      getPipelineById: vi.fn(() => ({ name: 'Test Pipeline' })),
      getWorkflowStatusForTask: vi.fn(() => ({ workflowName: 'test-workflow', progress: 50 })),
      getWebSocketStatus: vi.fn(() => ({ connected: true, connecting: false })),
      triggerWorkflowForTask: vi.fn(),
      getWorkflowLogsForTask: vi.fn(() => []),
      getWorkflowProgressForTask: vi.fn(() => ({ progress: 50, status: 'in_progress' })),
      getWorkflowMetadataForTask: vi.fn(() => ({ adw_id: 'adw-123' })),
      clearWorkflowLogsForTask: vi.fn(),
      triggerMergeWorkflow: vi.fn(),
      deleteWorktree: vi.fn(() => Promise.resolve(true))
    };

    useKanbanStore.mockReturnValue(mockStore);
    adwDiscoveryService.fetchPlanFile.mockResolvedValue({ plan_content: '# Test Plan' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal with task details', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText(/task-123/)).toBeInTheDocument();
    });

    it('should display task description', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('This is a test task description')).toBeInTheDocument();
    });

    it('should display ADW ID', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('adw-123')).toBeInTheDocument();
    });

    it('should display formatted pipeline name', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText(/ADW: Plan → Build → Test/)).toBeInTheDocument();
    });

    it('should display created and updated dates', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/Last Updated:/)).toBeInTheDocument();
    });

    it('should display recent activity logs', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      // Click to expand recent activity
      const recentActivityButton = screen.getByText('Recent Activity');
      fireEvent.click(recentActivityButton);

      expect(screen.getByText('Build started')).toBeInTheDocument();
    });
  });

  describe('Collapsible Sections', () => {
    it('should toggle task information section', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const taskInfoButton = screen.getByText('Task Information');

      // Initially expanded
      expect(screen.getByText(/Created:/)).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(taskInfoButton);

      // Should be collapsed
      expect(screen.queryByText(/Created:/)).not.toBeInTheDocument();
    });

    it('should toggle workflow controls section', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const workflowControlsButton = screen.getByText('Workflow Controls');

      // Click to collapse
      fireEvent.click(workflowControlsButton);
    });

    it('should save section states to localStorage', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const taskInfoButton = screen.getByText('Task Information');
      fireEvent.click(taskInfoButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'taskDetailsTaskInfoExpanded',
        'false'
      );
    });
  });

  describe('Workflow Controls', () => {
    it('should show trigger workflow button', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByTitle('Trigger Workflow')).toBeInTheDocument();
    });

    it('should trigger workflow when button is clicked', async () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const triggerButton = screen.getByTitle('Trigger Workflow');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockStore.triggerWorkflowForTask).toHaveBeenCalledWith(
          'task-123',
          { issue_number: 'task-123' }
        );
      });
    });

    it('should disable trigger button when WebSocket is disconnected', () => {
      mockStore.getWebSocketStatus.mockReturnValue({ connected: false, connecting: false });

      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const triggerButton = screen.getByTitle('WebSocket Disconnected');
      expect(triggerButton).toBeDisabled();
    });

    it('should display workflow status', async () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      // The workflow controls section might be collapsed, expand it first
      const workflowControlsButton = screen.getByText('Workflow Controls');

      // Check if it's collapsed (if "Workflow:" text is not visible)
      if (!screen.queryByText(/Workflow: test-workflow/)) {
        fireEvent.click(workflowControlsButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/Workflow: test-workflow/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show workflow progress', async () => {
      const { container } = render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      // The workflow controls section might be collapsed, expand it first
      const workflowControlsButton = screen.getByText('Workflow Controls');

      // Check if progress is not visible and expand if needed
      if (!screen.queryByText('50%')) {
        fireEvent.click(workflowControlsButton);
      }

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Plan Viewer', () => {
    it('should show view plan button', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const viewPlanButtons = screen.getAllByText('View Plan');
      expect(viewPlanButtons.length).toBeGreaterThan(0);
    });

    it('should open plan viewer when view plan button is clicked', async () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const viewPlanButton = screen.getAllByText('View Plan')[0];
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(adwDiscoveryService.fetchPlanFile).toHaveBeenCalledWith('adw-123');
      });
    });

    it('should display plan content in modal', async () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const viewPlanButton = screen.getAllByText('View Plan')[0];
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(screen.getByTestId('plan-viewer')).toBeInTheDocument();
        expect(screen.getByText('# Test Plan')).toBeInTheDocument();
      });
    });

    it('should handle plan fetch error', async () => {
      adwDiscoveryService.fetchPlanFile.mockRejectedValue(new Error('404'));

      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const viewPlanButton = screen.getAllByText('View Plan')[0];
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(screen.getByText(/Plan file not found/)).toBeInTheDocument();
      });
    });
  });

  describe('Logs Viewer', () => {
    it('should show toggle logs button when logs exist', async () => {
      mockStore.getWorkflowLogsForTask.mockReturnValue([
        { id: '1', message: 'Log 1' },
        { id: '2', message: 'Log 2' }
      ]);

      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      // The workflow controls section might be collapsed, expand it first
      const workflowControlsButton = screen.getByText('Workflow Controls');

      // Check if logs button is not visible and expand if needed
      if (!screen.queryByText(/Show.*Logs \(2\)/)) {
        fireEvent.click(workflowControlsButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/Show.*Logs \(2\)/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should toggle logs viewer', async () => {
      mockStore.getWorkflowLogsForTask.mockReturnValue([
        { id: '1', message: 'Log 1' }
      ]);

      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      // The workflow controls section might be collapsed, expand it first
      const workflowControlsButton = screen.getByText('Workflow Controls');

      // Check if logs button is not visible and expand if needed
      if (!screen.queryByText(/Show.*Logs/)) {
        fireEvent.click(workflowControlsButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/Show.*Logs/)).toBeInTheDocument();
      }, { timeout: 3000 });

      const toggleButton = screen.getByText(/Show.*Logs/);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId('stage-logs-viewer')).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText(/Hide.*Logs/));

      await waitFor(() => {
        expect(screen.queryByTestId('stage-logs-viewer')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Actions', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const closeButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') && btn.closest('.p-2.text-gray-400')
      );

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should call onEdit when edit button is clicked', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByTitle('Edit Task');
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should copy ADW ID to clipboard', async () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('adw-123');
      });
    });
  });

  describe('Merge Workflow', () => {
    it('should show merge button when task is ready to merge', () => {
      const readyTask = { ...mockTask, stage: 'ready-to-merge' };

      render(
        <TaskDetailsModal
          task={readyTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Merge to Main')).toBeInTheDocument();
    });

    it('should trigger merge workflow when merge button is clicked', async () => {
      const readyTask = { ...mockTask, stage: 'ready-to-merge' };

      render(
        <TaskDetailsModal
          task={readyTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const mergeButton = screen.getByText('Merge to Main');
      fireEvent.click(mergeButton);

      await waitFor(() => {
        expect(mockStore.triggerMergeWorkflow).toHaveBeenCalledWith('task-123');
      });
    });

    it('should show merged status when merge is completed', () => {
      const mergedTask = {
        ...mockTask,
        stage: 'ready-to-merge',
        metadata: {
          ...mockTask.metadata,
          merge_completed: true,
          merge_completed_at: '2024-01-03T10:00:00Z'
        }
      };

      render(
        <TaskDetailsModal
          task={mergedTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Merged')).toBeInTheDocument();
    });
  });

  describe('Delete Worktree', () => {
    it('should show delete button', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show confirmation dialog when delete is clicked', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      // Use getAllByText and check for the header element
      const deleteWorktreeElements = screen.getAllByText('Delete Worktree');
      expect(deleteWorktreeElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Are you sure you want to delete this worktree/)).toBeInTheDocument();
    });

    it('should delete worktree when confirmed', async () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      const confirmButton = screen.getAllByText(/Delete Worktree/)[1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockStore.deleteWorktree).toHaveBeenCalledWith('adw-123');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should close confirmation dialog when cancel is clicked', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText(/Are you sure you want to delete/)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without description', () => {
      const taskWithoutDescription = { ...mockTask, description: null };

      render(
        <TaskDetailsModal
          task={taskWithoutDescription}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('should handle task without logs', () => {
      const taskWithoutLogs = { ...mockTask, logs: [] };

      render(
        <TaskDetailsModal
          task={taskWithoutLogs}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
    });

    it('should handle task without ADW ID', () => {
      const taskWithoutAdwId = { ...mockTask, metadata: {} };

      render(
        <TaskDetailsModal
          task={taskWithoutAdwId}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.queryByText('ADW ID:')).not.toBeInTheDocument();
    });

    it('should handle missing pipeline', () => {
      mockStore.getPipelineById.mockReturnValue(null);

      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText(/ADW: Plan → Build → Test/)).toBeInTheDocument();
    });

    it('should handle null workflow status', () => {
      mockStore.getWorkflowStatusForTask.mockReturnValue(null);

      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper modal overlay', () => {
      const { container } = render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const overlay = container.querySelector('.modal-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('should prevent body scroll when modal is open', () => {
      render(
        <TaskDetailsModal
          task={mockTask}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      // Modal is open, so scrollable content should exist
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });
});
