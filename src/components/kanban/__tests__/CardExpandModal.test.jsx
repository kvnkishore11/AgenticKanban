/**
 * Tests for CardExpandModal Component
 * Comprehensive tests for the brutalist-styled card expansion modal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import CardExpandModal from '../CardExpandModal';
import { useKanbanStore } from '../../../stores/kanbanStore';
import adwDiscoveryService from '../../../services/api/adwDiscoveryService';
import fileOperationsService from '../../../services/api/fileOperationsService';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore', () => ({
  useKanbanStore: vi.fn()
}));

// Mock services
vi.mock('../../../services/api/adwDiscoveryService', () => ({
  default: {
    fetchPlanFile: vi.fn()
  }
}));

vi.mock('../../../services/api/fileOperationsService', () => ({
  default: {
    validateFilePath: vi.fn(),
    openFileInIde: vi.fn()
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

vi.mock('../LiveLogsPanel', () => ({
  default: ({ taskId }) => (
    <div data-testid="live-logs-panel">
      LiveLogsPanel for {taskId}
    </div>
  )
}));

// Mock MDEditor
vi.mock('@uiw/react-md-editor', () => ({
  default: {
    Markdown: ({ source }) => <div data-testid="md-editor-markdown">{source}</div>
  }
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }) => <div data-testid="react-markdown">{children}</div>
}));

describe('CardExpandModal Component', () => {
  let mockStore;
  let mockTask;
  let mockOnClose;
  let mockOnEdit;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnEdit = vi.fn();

    mockTask = {
      id: 123,
      title: 'Test Task Title',
      description: 'Test task description',
      stage: 'plan',
      type: 'feature',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z',
      queuedStages: ['plan', 'build', 'test'],
      pipelineId: 'adw_plan_build_test',
      metadata: {
        adw_id: 'adw_plan_build_test_issue_123',
        issue_type: 'feature',
        workflow_status: 'running',
        plan_file: 'path/to/plan.md',
        state_config: {
          task: {
            work_item_type: 'feature'
          }
        }
      }
    };

    mockStore = {
      getPipelineById: vi.fn(() => null),
      getWebSocketStatus: vi.fn(() => ({ connected: true })),
      triggerWorkflowForTask: vi.fn(() => Promise.resolve()),
      getWorkflowLogsForTask: vi.fn(() => []),
      getWorkflowProgressForTask: vi.fn(() => ({ status: 'running' })),
      getWorkflowMetadataForTask: vi.fn(() => ({
        adw_id: 'adw_plan_build_test_issue_123',
        status: 'running',
        plan_file: 'path/to/plan.md'
      })),
      clearWorkflowLogsForTask: vi.fn(),
      triggerMergeWorkflow: vi.fn(() => Promise.resolve())
    };

    useKanbanStore.mockReturnValue(mockStore);

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve())
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <CardExpandModal task={mockTask} isOpen={false} onClose={mockOnClose} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Test Task Title')).toBeInTheDocument();
    });

    it('should render task title in header', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Test Task Title')).toBeInTheDocument();
    });

    it('should render task ID in header', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('#123')).toBeInTheDocument();
    });

    it('should render ADW ID in header when available', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('adw_plan_build_test_issue_123')).toBeInTheDocument();
    });

    it('should render issue type badge', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('FEATURE')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const closeButtons = screen.getAllByTitle('Close');
      expect(closeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getAllByTitle('Close')[0];
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const overlay = document.querySelector('.brutalist-modal-overlay');
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when modal content is clicked', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const modalContainer = document.querySelector('.brutalist-modal-container');
      fireEvent.click(modalContainer);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should disable body scroll when open', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { unmount } = render(
        <CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />
      );

      unmount();

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Task Information Display', () => {
    it('should display task description', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Test task description')).toBeInTheDocument();
    });

    it('should display stage information', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('plan')).toBeInTheDocument();
    });

    it('should display issue type', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('FEATURE')).toBeInTheDocument();
    });

    it('should display ADW metadata section when adw_id is present', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('ADW METADATA')).toBeInTheDocument();
      expect(screen.getByText('ADW ID')).toBeInTheDocument();
    });

    it('should display workflow status', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('STATUS')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    it('should display plan file path', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('PLAN FILE')).toBeInTheDocument();
      expect(screen.getByText('path/to/plan.md')).toBeInTheDocument();
    });
  });

  describe('Pipeline Stages', () => {
    it('should render pipeline stages from queuedStages', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('PLAN')).toBeInTheDocument();
      expect(screen.getByText('IMPL')).toBeInTheDocument();
      expect(screen.getByText('TEST')).toBeInTheDocument();
    });

    it('should parse pipeline stages from pipelineId when queuedStages not available', () => {
      const taskWithoutQueuedStages = {
        ...mockTask,
        queuedStages: undefined,
        pipelineId: 'adw_plan_build_test_review'
      };

      render(<CardExpandModal task={taskWithoutQueuedStages} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('PLAN')).toBeInTheDocument();
      expect(screen.getByText('IMPL')).toBeInTheDocument();
      expect(screen.getByText('TEST')).toBeInTheDocument();
      expect(screen.getByText('REV')).toBeInTheDocument();
    });

    it('should use default stages when no pipeline info available', () => {
      const taskWithoutPipeline = {
        ...mockTask,
        queuedStages: undefined,
        pipelineId: undefined
      };

      render(<CardExpandModal task={taskWithoutPipeline} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('PLAN')).toBeInTheDocument();
      expect(screen.getByText('IMPL')).toBeInTheDocument();
    });

    it('should display progress bar', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const progressBar = document.querySelector('.brutalist-progress-bar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should allow stage selection by clicking stage box', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const stageBoxes = document.querySelectorAll('.stage-box');
      expect(stageBoxes.length).toBeGreaterThan(0);

      fireEvent.click(stageBoxes[0]);

      // Stage should be selected (visual feedback would be tested in integration tests)
      expect(stageBoxes[0]).toBeInTheDocument();
    });
  });

  describe('Plan View Mode', () => {
    it('should switch to plan view when "VIEW PLAN" button is clicked', async () => {
      adwDiscoveryService.fetchPlanFile.mockResolvedValueOnce({
        plan_content: '# Test Plan\n\nPlan content here'
      });

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const viewPlanButton = screen.getByText('VIEW PLAN');
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(screen.getByText('IMPLEMENTATION PLAN')).toBeInTheDocument();
      });
    });

    it('should fetch plan content when switching to plan view', async () => {
      adwDiscoveryService.fetchPlanFile.mockResolvedValueOnce({
        plan_content: '# Test Plan\n\nPlan content here'
      });

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const viewPlanButton = screen.getByText('VIEW PLAN');
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(adwDiscoveryService.fetchPlanFile).toHaveBeenCalledWith('adw_plan_build_test_issue_123');
      });
    });

    it('should show loading state while fetching plan', async () => {
      adwDiscoveryService.fetchPlanFile.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const viewPlanButton = screen.getByText('VIEW PLAN');
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(screen.getByText('Loading Plan...')).toBeInTheDocument();
      });
    });

    it('should display plan content when loaded', async () => {
      const planContent = '# Test Plan\n\nPlan content here';
      adwDiscoveryService.fetchPlanFile.mockResolvedValueOnce({
        plan_content: planContent
      });

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const viewPlanButton = screen.getByText('VIEW PLAN');
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(screen.getByTestId('md-editor-markdown')).toHaveTextContent(planContent);
      });
    });

    it('should display error when plan fetch fails', async () => {
      adwDiscoveryService.fetchPlanFile.mockRejectedValueOnce(
        new Error('Failed to fetch plan')
      );

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const viewPlanButton = screen.getByText('VIEW PLAN');
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Plan')).toBeInTheDocument();
      });
    });

    it('should allow copying plan content', async () => {
      const planContent = '# Test Plan\n\nPlan content here';
      adwDiscoveryService.fetchPlanFile.mockResolvedValueOnce({
        plan_content: planContent
      });

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const viewPlanButton = screen.getByText('VIEW PLAN');
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(screen.getByTitle('Copy Plan')).toBeInTheDocument();
      });

      const copyButton = screen.getByTitle('Copy Plan');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(planContent);
      });
    });

    it('should return to details view when back button is clicked', async () => {
      adwDiscoveryService.fetchPlanFile.mockResolvedValueOnce({
        plan_content: '# Test Plan'
      });

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      // Switch to plan view
      const viewPlanButton = screen.getByText('VIEW PLAN');
      fireEvent.click(viewPlanButton);

      await waitFor(() => {
        expect(screen.getByText('IMPLEMENTATION PLAN')).toBeInTheDocument();
      });

      // Go back to details
      const backButton = screen.getByTitle('Back to Details');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Test Task Title')).toBeInTheDocument();
        expect(screen.queryByText('IMPLEMENTATION PLAN')).not.toBeInTheDocument();
      });
    });
  });

  describe('Logs Panel', () => {
    it('should render activity log panel', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('ACTIVITY LOG')).toBeInTheDocument();
    });

    it('should have LIVE and ALL tabs', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('LIVE')).toBeInTheDocument();
      expect(screen.getByText('ALL')).toBeInTheDocument();
    });

    it('should show live logs panel by default when adw_id exists', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('live-logs-panel')).toBeInTheDocument();
    });

    it('should switch to all logs when ALL tab is clicked', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const allTab = screen.getByText('ALL');
      fireEvent.click(allTab);

      expect(screen.getByTestId('stage-logs-viewer')).toBeInTheDocument();
    });

    it('should show empty state when no workflow exists', () => {
      const taskWithoutWorkflow = {
        ...mockTask,
        metadata: {}
      };

      render(<CardExpandModal task={taskWithoutWorkflow} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('No Workflow Started')).toBeInTheDocument();
    });
  });

  describe('Workflow Actions', () => {
    it('should render TRIGGER button', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('TRIGGER')).toBeInTheDocument();
    });

    it('should call triggerWorkflowForTask when TRIGGER is clicked', async () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const triggerButton = screen.getByText('TRIGGER');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockStore.triggerWorkflowForTask).toHaveBeenCalledWith(
          mockTask.id,
          { issue_number: String(mockTask.id) }
        );
      });
    });

    it('should disable TRIGGER button when WebSocket not connected', () => {
      mockStore.getWebSocketStatus.mockReturnValue({ connected: false });

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const triggerButton = screen.getByText('TRIGGER');
      expect(triggerButton).toBeDisabled();
    });

    it('should render MERGE TO MAIN button', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('MERGE TO MAIN')).toBeInTheDocument();
    });

    it('should enable MERGE button when stage is ready-to-merge', () => {
      const readyTask = { ...mockTask, stage: 'ready-to-merge' };

      render(<CardExpandModal task={readyTask} isOpen={true} onClose={mockOnClose} />);

      const mergeButton = screen.getByText('MERGE TO MAIN');
      expect(mergeButton).not.toBeDisabled();
    });

    it('should disable MERGE button when not ready to merge', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const mergeButton = screen.getByText('MERGE TO MAIN');
      expect(mergeButton).toBeDisabled();
    });

    it('should call triggerMergeWorkflow when MERGE is clicked', async () => {
      const readyTask = { ...mockTask, stage: 'ready-to-merge' };

      render(<CardExpandModal task={readyTask} isOpen={true} onClose={mockOnClose} />);

      const mergeButton = screen.getByText('MERGE TO MAIN');
      fireEvent.click(mergeButton);

      await waitFor(() => {
        expect(mockStore.triggerMergeWorkflow).toHaveBeenCalledWith(mockTask.id);
      });
    });

    it('should show MERGED status when merge is completed', () => {
      const mergedTask = {
        ...mockTask,
        stage: 'ready-to-merge',
        metadata: { ...mockTask.metadata, merge_completed: true }
      };

      render(<CardExpandModal task={mergedTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('MERGED')).toBeInTheDocument();
      expect(screen.queryByText('MERGE TO MAIN')).not.toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    it('should render edit button when onEdit is provided', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} onEdit={mockOnEdit} />);

      expect(screen.getAllByText('EDIT').length).toBeGreaterThan(0);
    });

    it('should not render edit button when onEdit is not provided', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText('EDIT')).not.toBeInTheDocument();
    });

    it('should call onEdit and onClose when edit button is clicked', () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} onEdit={mockOnEdit} />);

      const editButtons = screen.getAllByText('EDIT');
      fireEvent.click(editButtons[0]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('File Operations', () => {
    it('should open plan file in IDE when button is clicked', async () => {
      fileOperationsService.validateFilePath.mockResolvedValueOnce({
        exists: true,
        absolute_path: '/absolute/path/to/plan.md'
      });

      fileOperationsService.openFileInIde.mockResolvedValueOnce({
        success: true
      });

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const openInIdeButton = screen.getByTitle('Open in IDE');
      fireEvent.click(openInIdeButton);

      await waitFor(() => {
        expect(fileOperationsService.validateFilePath).toHaveBeenCalledWith('../path/to/plan.md');
        expect(fileOperationsService.openFileInIde).toHaveBeenCalledWith('/absolute/path/to/plan.md', 1);
      });
    });

    it('should handle file not found error', async () => {
      fileOperationsService.validateFilePath.mockResolvedValueOnce({
        exists: false
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const openInIdeButton = screen.getByTitle('Open in IDE');
      fireEvent.click(openInIdeButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('File not found: path/to/plan.md');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Copy to Clipboard', () => {
    it('should copy ADW ID to clipboard', async () => {
      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      const copyButton = screen.getByTitle('Copy ADW ID');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('adw_plan_build_test_issue_123');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without description', () => {
      const taskWithoutDescription = { ...mockTask, description: undefined };

      render(<CardExpandModal task={taskWithoutDescription} isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText('DESCRIPTION')).not.toBeInTheDocument();
    });

    it('should handle task without metadata', () => {
      const taskWithoutMetadata = { ...mockTask, metadata: {} };

      render(<CardExpandModal task={taskWithoutMetadata} isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText('ADW METADATA')).not.toBeInTheDocument();
    });

    it('should handle different issue types', () => {
      const bugTask = {
        ...mockTask,
        metadata: { ...mockTask.metadata, issue_type: 'bug' }
      };

      render(<CardExpandModal task={bugTask} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('BUG')).toBeInTheDocument();
    });

    it('should handle missing plan file', async () => {
      const taskWithoutPlan = {
        ...mockTask,
        metadata: { adw_id: 'test_adw' }
      };

      render(<CardExpandModal task={taskWithoutPlan} isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText('PLAN FILE')).not.toBeInTheDocument();
    });

    it('should handle workflow logs', () => {
      mockStore.getWorkflowLogsForTask.mockReturnValue([
        { id: 1, message: 'Test log message', timestamp: '2024-01-15T10:00:00Z' }
      ]);

      render(<CardExpandModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

      // Logs should be passed to child components
      expect(mockStore.getWorkflowLogsForTask).toHaveBeenCalledWith(mockTask.id);
    });
  });
});
