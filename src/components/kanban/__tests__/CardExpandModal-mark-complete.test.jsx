/**
 * Tests for Mark as Complete functionality in CardExpandModal Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CardExpandModal from '../CardExpandModal';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore', () => ({
  useKanbanStore: vi.fn()
}));

// Mock MDEditor
vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="md-editor"
      value={value || ''}
      onChange={(e) => onChange && onChange(e.target.value)}
    />
  )
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }) => <div data-testid="react-markdown">{children}</div>
}));

// Mock all child components
vi.mock('../StageLogsViewer', () => ({
  default: () => <div data-testid="stage-logs-viewer">StageLogsViewer</div>
}));

vi.mock('../LiveLogsPanel', () => ({
  default: () => <div data-testid="live-logs-panel">LiveLogsPanel</div>
}));

vi.mock('../AgentLogsPanel', () => ({
  default: () => <div data-testid="agent-logs-panel">AgentLogsPanel</div>
}));

vi.mock('../StageTabsPanel', () => ({
  default: () => <div data-testid="stage-tabs-panel">StageTabsPanel</div>
}));

vi.mock('../PatchTabsPanel', () => ({
  default: () => <div data-testid="patch-tabs-panel">PatchTabsPanel</div>
}));

vi.mock('../ContentTypeTabs', () => ({
  default: () => <div data-testid="content-type-tabs">ContentTypeTabs</div>
}));

vi.mock('../ExecutionLogsViewer', () => ({
  default: () => <div data-testid="execution-logs-viewer">ExecutionLogsViewer</div>
}));

vi.mock('../ResultViewer', () => ({
  default: () => <div data-testid="result-viewer">ResultViewer</div>
}));

vi.mock('../../ui/Toast', () => ({
  default: ({ type, title, message, onClose }) => (
    <div data-testid="toast" data-type={type}>
      {title}: {message}
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

// Mock adwService
vi.mock('../../../services/api/adwService', () => ({
  default: {
    openInIDE: vi.fn(() => Promise.resolve({ success: true })),
    getPlanContent: vi.fn(() => Promise.resolve({ content: '# Plan' }))
  }
}));

describe('CardExpandModal - Mark as Complete', () => {
  let mockStore;
  let mockTask;
  let mockOnClose;
  let mockOnEdit;
  let mockMarkTaskAsComplete;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnEdit = vi.fn();
    mockMarkTaskAsComplete = vi.fn(() => Promise.resolve(true));

    mockTask = {
      id: 'task-123',
      title: 'Test Task Title',
      description: 'Test task description',
      stage: 'plan',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z',
      pipelineId: 'adw_plan_build_test',
      metadata: {
        adw_id: 'test123',
        summary: 'Task Summary',
        work_item_type: 'feature',
        status: 'in_progress'
      }
    };

    mockStore = {
      getPipelineById: vi.fn(() => ({
        id: 'adw_plan_build_test',
        name: 'Plan Build Test',
        stages: ['plan', 'build', 'test']
      })),
      getWebSocketStatus: vi.fn(() => ({ connected: true })),
      triggerWorkflowForTask: vi.fn(() => Promise.resolve()),
      getWorkflowLogsForTask: vi.fn(() => ({})),
      getWorkflowProgressForTask: vi.fn(() => null),
      getWorkflowMetadataForTask: vi.fn(() => null),
      clearWorkflowLogsForTask: vi.fn(),
      triggerMergeWorkflow: vi.fn(() => Promise.resolve({ success: true })),
      getMergeState: vi.fn(() => null),
      clearMergeState: vi.fn(),
      applyPatch: vi.fn(() => Promise.resolve({ success: true })),
      markTaskAsComplete: mockMarkTaskAsComplete
    };

    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show mark as complete button for plan stage task', () => {
    render(
      <CardExpandModal
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.getByText(/MARK AS COMPLETE/i)).toBeInTheDocument();
  });

  it('should show mark as complete button for build stage task', () => {
    const buildTask = { ...mockTask, stage: 'build' };
    render(
      <CardExpandModal
        task={buildTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.getByText(/MARK AS COMPLETE/i)).toBeInTheDocument();
  });

  it('should show mark as complete button for ready-to-merge stage task', () => {
    const readyTask = { ...mockTask, stage: 'ready-to-merge' };
    render(
      <CardExpandModal
        task={readyTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.getByText(/MARK AS COMPLETE/i)).toBeInTheDocument();
  });

  it('should NOT show mark as complete button for backlog stage task', () => {
    const backlogTask = { ...mockTask, stage: 'backlog' };
    render(
      <CardExpandModal
        task={backlogTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.queryByText(/MARK AS COMPLETE/i)).not.toBeInTheDocument();
  });

  it('should NOT show mark as complete button for completed stage task', () => {
    const completedTask = { ...mockTask, stage: 'completed' };
    render(
      <CardExpandModal
        task={completedTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.queryByText(/MARK AS COMPLETE/i)).not.toBeInTheDocument();
  });

  it('should call markTaskAsComplete when button is clicked', async () => {
    render(
      <CardExpandModal
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    const markCompleteBtn = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteBtn);

    await waitFor(() => {
      expect(mockMarkTaskAsComplete).toHaveBeenCalledWith(mockTask.id);
    });
  });

  it('should show success toast notification on successful completion', async () => {
    render(
      <CardExpandModal
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    const markCompleteBtn = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'success');
    });
  });

  it('should show error toast notification on failure', async () => {
    mockMarkTaskAsComplete.mockRejectedValueOnce(new Error('API Error'));

    render(
      <CardExpandModal
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    const markCompleteBtn = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'error');
    });
  });

  it('should disable button while marking complete', async () => {
    mockMarkTaskAsComplete.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(true), 100))
    );

    render(
      <CardExpandModal
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    const markCompleteBtn = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteBtn);

    // Button should be disabled during the operation
    await waitFor(() => {
      expect(screen.getByText(/MARKING\.\.\./i)).toBeInTheDocument();
    });
  });

  it('should show loading text while marking complete', async () => {
    mockMarkTaskAsComplete.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(true), 100))
    );

    render(
      <CardExpandModal
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    const markCompleteBtn = screen.getByText(/MARK AS COMPLETE/i);
    fireEvent.click(markCompleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/MARKING\.\.\./i)).toBeInTheDocument();
    });
  });

  it('should handle multiple clicks gracefully', async () => {
    render(
      <CardExpandModal
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    const markCompleteBtn = screen.getByText(/MARK AS COMPLETE/i);

    // Click multiple times quickly
    fireEvent.click(markCompleteBtn);
    fireEvent.click(markCompleteBtn);
    fireEvent.click(markCompleteBtn);

    await waitFor(() => {
      expect(mockMarkTaskAsComplete).toHaveBeenCalled();
    });

    // Should only be called once due to disabled state
    expect(mockMarkTaskAsComplete).toHaveBeenCalledTimes(1);
  });

  it('should not render when modal is closed', () => {
    render(
      <CardExpandModal
        task={mockTask}
        isOpen={false}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.queryByText(/MARK AS COMPLETE/i)).not.toBeInTheDocument();
  });

  it('should have appropriate button styling', () => {
    render(
      <CardExpandModal
        task={mockTask}
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />
    );

    const markCompleteBtn = screen.getByText(/MARK AS COMPLETE/i).closest('button');
    expect(markCompleteBtn).toHaveClass('brutalist-footer-btn');
    expect(markCompleteBtn).toHaveClass('complete');
  });
});
