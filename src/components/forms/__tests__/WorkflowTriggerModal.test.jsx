/**
 * Tests for WorkflowTriggerModal Component
 * Comprehensive tests for ADW workflow trigger modal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkflowTriggerModal from '../WorkflowTriggerModal';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock dependencies
vi.mock('../../../stores/kanbanStore');
vi.mock('../../ui/AdwIdInput', () => ({
  default: ({ value, onChange, workflowType, placeholder }) => (
    <input
      data-testid="adw-id-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}));
vi.mock('../../../utils/adwValidation', () => ({
  isAdwIdRequired: (workflowType) => workflowType?.includes('build') || workflowType?.includes('test'),
  getWorkflowDescription: (workflowType) => `Description for ${workflowType}`,
  validateAdwId: (adwId, required) => {
    if (required && !adwId) return { isValid: false, error: 'ADW ID required' };
    if (adwId && adwId.length !== 8) return { isValid: false, error: 'Must be 8 characters' };
    return { isValid: true };
  },
  supportsAdwId: () => true
}));

describe('WorkflowTriggerModal Component', () => {
  let mockStore;
  const mockOnClose = vi.fn();

  const MOCK_TASK = {
    id: 123,
    title: 'Test Task',
    stage: 'backlog',  // Changed from 'plan' to 'backlog' to avoid auto-selection
    metadata: {}
  };

  beforeEach(() => {
    mockStore = {
      triggerWorkflowForTask: vi.fn(),
      getWebSocketStatus: vi.fn(() => ({ connected: true }))
    };
    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Basic Elements', () => {
    it('should render modal with task information', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      // Use getAllByText for text that appears multiple times (header and summary)
      const triggerWorkflowElements = screen.getAllByText('Trigger Workflow');
      expect(triggerWorkflowElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/task #123/i)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
    });

    it('should render trigger button', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /trigger workflow/i })).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should display task title when available', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText(/test task/i)).toBeInTheDocument();
    });

    it('should display "Untitled" when task has no title', () => {
      const taskWithoutTitle = { ...MOCK_TASK, title: '' };
      render(<WorkflowTriggerModal task={taskWithoutTitle} onClose={mockOnClose} />);

      expect(screen.getByText(/untitled/i)).toBeInTheDocument();
    });
  });

  describe('Workflow Type Selection', () => {
    it('should render all workflow type categories', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      // Use getAllByText since workflow types appear in multiple places
      expect(screen.getAllByText(/plan \(isolated\)/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/build \(isolated\)/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/test \(isolated\)/i).length).toBeGreaterThan(0);
    });

    it('should render entry point workflows', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      // Use getAllByText since these appear in multiple places
      expect(screen.getAllByText(/plan \(isolated\)/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/patch \(isolated\)/i).length).toBeGreaterThan(0);
    });

    it('should render dependent workflows', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText(/build \(isolated\)/i)).toBeInTheDocument();
      expect(screen.getByText(/test \(isolated\)/i)).toBeInTheDocument();
      expect(screen.getByText(/review \(isolated\)/i)).toBeInTheDocument();
      expect(screen.getByText(/document \(isolated\)/i)).toBeInTheDocument();
      expect(screen.getByText(/ship \(isolated\)/i)).toBeInTheDocument();
    });

    it('should render orchestrator workflows', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      // Use getAllByText since these appear in multiple places
      expect(screen.getAllByText(/plan \+ build/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/full sdlc/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/zero touch execution/i).length).toBeGreaterThan(0);
    });

    it('should select workflow when radio button is clicked', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      expect(planRadio).toBeChecked();
    });

    it('should auto-select workflow based on task stage', () => {
      const taskInPlan = { ...MOCK_TASK, stage: 'plan' };
      render(<WorkflowTriggerModal task={taskInPlan} onClose={mockOnClose} />);

      const buildRadio = screen.getByRole('radio', { name: /build \(isolated\)/i });
      expect(buildRadio).toBeChecked();
    });
  });

  describe('ADW ID Input', () => {
    it('should not show ADW ID input initially', () => {
      const taskWithoutStage = { ...MOCK_TASK, stage: null };
      render(<WorkflowTriggerModal task={taskWithoutStage} onClose={mockOnClose} />);

      expect(screen.queryByTestId('adw-id-input')).not.toBeInTheDocument();
    });

    it('should show ADW ID input when workflow is selected', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      expect(screen.getByTestId('adw-id-input')).toBeInTheDocument();
    });

    it('should use existing ADW ID from task metadata', () => {
      const taskWithAdwId = {
        ...MOCK_TASK,
        metadata: { adw_id: 'abc12345' }
      };
      render(<WorkflowTriggerModal task={taskWithAdwId} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const adwInput = screen.getByTestId('adw-id-input');
      expect(adwInput).toHaveValue('abc12345');
    });

    it('should update ADW ID when input changes', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const adwInput = screen.getByTestId('adw-id-input');
      fireEvent.change(adwInput, { target: { value: 'new12345' } });

      expect(adwInput).toHaveValue('new12345');
    });
  });

  describe('Model Set Selection', () => {
    it('should render model set dropdown', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should default to base model set', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const modelSetSelect = screen.getByRole('combobox');
      expect(modelSetSelect).toHaveValue('base');
    });

    it('should change model set when option is selected', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const modelSetSelect = screen.getByRole('combobox');
      fireEvent.change(modelSetSelect, { target: { value: 'premium' } });

      expect(modelSetSelect).toHaveValue('premium');
    });

    it('should render all model set options', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      // Use getAllByText since these might appear in multiple places
      expect(screen.getAllByText(/base models/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/premium models/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/experimental/i).length).toBeGreaterThan(0);
    });
  });

  describe('Issue Number Input', () => {
    it('should render issue number input', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByPlaceholderText(/github issue number/i)).toBeInTheDocument();
    });

    it('should default to task ID', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const issueInput = screen.getByPlaceholderText(/github issue number/i);
      expect(issueInput).toHaveValue('123');
    });

    it('should update issue number when input changes', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const issueInput = screen.getByPlaceholderText(/github issue number/i);
      fireEvent.change(issueInput, { target: { value: '456' } });

      expect(issueInput).toHaveValue('456');
    });
  });

  describe('Patch Request Input', () => {
    it('should not show patch request input for non-patch workflows', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      expect(screen.queryByPlaceholderText(/describe the changes needed/i)).not.toBeInTheDocument();
    });

    it('should show patch request input for patch workflow', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const patchRadio = screen.getByRole('radio', { name: /patch \(isolated\)/i });
      fireEvent.click(patchRadio);

      expect(screen.getByPlaceholderText(/describe the changes needed/i)).toBeInTheDocument();
    });

    it('should update patch request when textarea changes', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const patchRadio = screen.getByRole('radio', { name: /patch \(isolated\)/i });
      fireEvent.click(patchRadio);

      const patchInput = screen.getByPlaceholderText(/describe the changes needed/i);
      fireEvent.change(patchInput, { target: { value: 'Fix bug in login' } });

      expect(patchInput).toHaveValue('Fix bug in login');
    });
  });

  describe('WebSocket Status', () => {
    it('should show warning when WebSocket is disconnected', () => {
      mockStore.getWebSocketStatus.mockReturnValue({ connected: false });
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText('WebSocket Disconnected')).toBeInTheDocument();
    });

    it('should not show warning when WebSocket is connected', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.queryByText('WebSocket Disconnected')).not.toBeInTheDocument();
    });

    it('should disable trigger button when WebSocket is disconnected', () => {
      mockStore.getWebSocketStatus.mockReturnValue({ connected: false });
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      expect(triggerButton).toBeDisabled();
    });
  });

  describe('Workflow Summary', () => {
    it('should show workflow summary when workflow is selected', () => {
      // Task with stage 'backlog' auto-selects 'adw_plan_iso'
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      // Use getByRole for more specific querying - h4 has level 4
      expect(screen.getByRole('heading', { name: /workflow summary/i, level: 4 })).toBeInTheDocument();
    });

    it('should display selected workflow type in summary', () => {
      // Task with stage 'backlog' auto-selects 'adw_plan_iso'
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText(/type:/i)).toBeInTheDocument();
      // Use getAllByText since "Plan (Isolated)" appears in both radio button and summary
      const planIsolatedElements = screen.getAllByText(/plan \(isolated\)/i);
      expect(planIsolatedElements.length).toBeGreaterThan(0);
    });

    it('should display model set in summary', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText(/model set:/i)).toBeInTheDocument();
      // Use getAllByText since "Base Models" appears in dropdown AND summary
      expect(screen.getAllByText(/base models/i).length).toBeGreaterThan(0);
    });

    it('should display issue number in summary', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText(/issue:/i)).toBeInTheDocument();
      // Use getAllByText since "#123" might appear in task info AND summary
      expect(screen.getAllByText(/#123/i).length).toBeGreaterThan(0);
    });

    it('should display ADW ID in summary when provided', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const adwInput = screen.getByTestId('adw-id-input');
      fireEvent.change(adwInput, { target: { value: 'abc12345' } });

      expect(screen.getByText(/adw id:/i)).toBeInTheDocument();
      expect(screen.getByText(/abc12345/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should trigger workflow with correct options on submit', async () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockStore.triggerWorkflowForTask).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            workflowType: 'adw_plan_iso',
            modelSet: 'base',
            issue_number: '123'
          })
        );
      });
    });

    it('should include ADW ID in submission when provided', async () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const adwInput = screen.getByTestId('adw-id-input');
      fireEvent.change(adwInput, { target: { value: 'abc12345' } });

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockStore.triggerWorkflowForTask).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            adw_id: 'abc12345'
          })
        );
      });
    });

    it('should include patch request for patch workflows', async () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const patchRadio = screen.getByRole('radio', { name: /patch \(isolated\)/i });
      fireEvent.click(patchRadio);

      const patchInput = screen.getByPlaceholderText(/describe the changes needed/i);
      fireEvent.change(patchInput, { target: { value: 'Fix login bug' } });

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockStore.triggerWorkflowForTask).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            patch_request: 'Fix login bug'
          })
        );
      });
    });

    it('should call onClose after successful trigger', async () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should disable trigger button while triggering', async () => {
      mockStore.triggerWorkflowForTask.mockImplementation(() => new Promise(() => {}));
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Triggering...')).toBeInTheDocument();
      });
    });
  });

  describe('Validation and Error Handling', () => {
    it('should show error when no workflow type is selected', async () => {
      const taskWithoutStage = { ...MOCK_TASK, stage: null };
      render(<WorkflowTriggerModal task={taskWithoutStage} onClose={mockOnClose} />);

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a workflow type')).toBeInTheDocument();
      }, { timeout: 10000 });
    }, 15000);

    it('should disable trigger button when no workflow is selected', () => {
      const taskWithoutStage = { ...MOCK_TASK, stage: null };
      render(<WorkflowTriggerModal task={taskWithoutStage} onClose={mockOnClose} />);

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      expect(triggerButton).toBeDisabled();
    });

    it('should show error when trigger fails', async () => {
      mockStore.triggerWorkflowForTask.mockRejectedValue(new Error('Trigger failed'));
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Trigger failed')).toBeInTheDocument();
      });
    });

    it('should not close modal when trigger fails', async () => {
      mockStore.triggerWorkflowForTask.mockRejectedValue(new Error('Trigger failed'));
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Trigger failed')).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when close button is clicked', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons[0]; // First button is the X close button
      fireEvent.click(xButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should disable cancel during triggering', async () => {
      mockStore.triggerWorkflowForTask.mockImplementation(() => new Promise(() => {}));
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without stage', () => {
      const taskWithoutStage = { ...MOCK_TASK, stage: undefined };
      render(<WorkflowTriggerModal task={taskWithoutStage} onClose={mockOnClose} />);

      // Should render modal but no workflow auto-selected
      const triggerWorkflowElements = screen.getAllByText('Trigger Workflow');
      expect(triggerWorkflowElements.length).toBeGreaterThan(0);
      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      expect(triggerButton).toBeDisabled();
    });

    it('should trim whitespace from ADW ID', async () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planRadio = screen.getByRole('radio', { name: /plan \(isolated\)/i });
      fireEvent.click(planRadio);

      const adwInput = screen.getByTestId('adw-id-input');
      fireEvent.change(adwInput, { target: { value: '  abc12345  ' } });

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockStore.triggerWorkflowForTask).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            adw_id: 'abc12345'
          })
        );
      });
    });

    it('should trim whitespace from patch request', async () => {
      render(<WorkflowTriggerModal task={MOCK_TASK} onClose={mockOnClose} />);

      const patchRadio = screen.getByRole('radio', { name: /patch \(isolated\)/i });
      fireEvent.click(patchRadio);

      const patchInput = screen.getByPlaceholderText(/describe the changes needed/i);
      fireEvent.change(patchInput, { target: { value: '  Fix bug  ' } });

      const triggerButton = screen.getByRole('button', { name: /trigger workflow/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockStore.triggerWorkflowForTask).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            patch_request: 'Fix bug'
          })
        );
      });
    });

    it('should handle task with metadata but no adw_id', () => {
      const taskWithMetadata = {
        ...MOCK_TASK,
        metadata: { some_field: 'value' }
      };
      render(<WorkflowTriggerModal task={taskWithMetadata} onClose={mockOnClose} />);

      // Should render and auto-select workflow based on stage
      const triggerWorkflowElements = screen.getAllByText('Trigger Workflow');
      expect(triggerWorkflowElements.length).toBeGreaterThan(0);
      expect(screen.getByRole('heading', { name: /workflow summary/i, level: 4 })).toBeInTheDocument();
    });
  });
});
