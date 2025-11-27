/**
 * Tests for TaskInput Component
 * Comprehensive tests for task creation and editing form
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskInput from '../TaskInput';
import { useKanbanStore } from '../../../stores/kanbanStore';
import { WORK_ITEM_TYPES } from '../../../constants/workItems';

// Mock dependencies
vi.mock('../../../stores/kanbanStore');
vi.mock('../../../hooks/useClipboard', () => ({
  useClipboard: () => ({
    isSupported: true,
    setupPasteListener: vi.fn(() => () => {})
  })
}));
vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({ onClick: vi.fn() }),
    getInputProps: () => ({}),
    isDragActive: false
  })
}));
vi.mock('../../ui/RichTextEditor', () => ({
  default: ({ value, onChange, placeholder }) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}));
vi.mock('../../../utils/htmlUtils', () => ({
  htmlToPlainText: (html) => html
}));

describe('TaskInput Component', () => {
  let mockStore;

  const MOCK_TASK = {
    id: 1,
    title: 'Test Task',
    description: 'Test description',
    workItemType: WORK_ITEM_TYPES.FEATURE,
    queuedStages: ['plan', 'implement'],
    customAdwId: '',
    images: []
  };

  beforeEach(() => {
    mockStore = {
      createTask: vi.fn(),
      updateTask: vi.fn(),
      toggleTaskInput: vi.fn(),
      validateTask: vi.fn(() => ({ isValid: true, errors: [] }))
    };
    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Create Mode', () => {
    it('should render in create mode when no task is provided', () => {
      render(<TaskInput />);

      expect(screen.getByText('NEW TASK')).toBeInTheDocument();
      expect(screen.getByText('Create Task →')).toBeInTheDocument();
    });

    it('should render all form fields in create mode', () => {
      render(<TaskInput />);

      expect(screen.getByPlaceholderText(/enter task title/i)).toBeInTheDocument();
      expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
      expect(screen.getByText('FEATURE')).toBeInTheDocument();
    });

    it('should show start immediately option in create mode', () => {
      render(<TaskInput />);

      expect(screen.getByText(/start immediately/i)).toBeInTheDocument();
    });

    it('should show draft button in create mode', () => {
      render(<TaskInput />);

      expect(screen.getByText(/draft/i)).toBeInTheDocument();
    });
  });

  describe('Rendering - Edit Mode', () => {
    it('should render in edit mode when task is provided', () => {
      render(<TaskInput task={MOCK_TASK} />);

      expect(screen.getByText('EDIT TASK')).toBeInTheDocument();
      expect(screen.getByText('Save Changes →')).toBeInTheDocument();
    });

    it('should populate form with task data in edit mode', () => {
      render(<TaskInput task={MOCK_TASK} />);

      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    it('should not show draft button in edit mode', () => {
      render(<TaskInput task={MOCK_TASK} />);

      expect(screen.queryByText(/draft/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Fields - Title', () => {
    it('should update title when input changes', () => {
      render(<TaskInput />);

      const titleInput = screen.getByPlaceholderText(/enter task title/i);
      fireEvent.change(titleInput, { target: { value: 'New Task' } });

      expect(screen.getByDisplayValue('New Task')).toBeInTheDocument();
    });

    it('should show optional label for title', () => {
      render(<TaskInput />);

      expect(screen.getByText(/title/i)).toBeInTheDocument();
      expect(screen.getByText(/optional/i)).toBeInTheDocument();
    });
  });

  describe('Form Fields - Description', () => {
    it('should update description when editor changes', () => {
      render(<TaskInput />);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'New description' } });

      expect(screen.getByDisplayValue('New description')).toBeInTheDocument();
    });

    it('should show required label for description', () => {
      render(<TaskInput />);

      expect(screen.getByText(/description \*/i)).toBeInTheDocument();
    });
  });

  describe('Work Item Type Selection', () => {
    it('should render all work item types', () => {
      render(<TaskInput />);

      expect(screen.getByText('FEATURE')).toBeInTheDocument();
      expect(screen.getByText('CHORE')).toBeInTheDocument();
      expect(screen.getByText('BUG')).toBeInTheDocument();
      expect(screen.getByText('PATCH')).toBeInTheDocument();
    });

    it('should default to Feature type', () => {
      render(<TaskInput />);

      const featureButton = screen.getByRole('button', { name: /feature/i });
      expect(featureButton).toHaveClass('bg-blue-500');
    });

    it('should change work item type when clicked', () => {
      render(<TaskInput />);

      const bugButton = screen.getByRole('button', { name: /bug/i });
      fireEvent.click(bugButton);

      expect(bugButton).toHaveClass('bg-red-500');
    });

    it('should show toast when type is selected', async () => {
      render(<TaskInput />);

      const choreButton = screen.getByRole('button', { name: /chore/i });
      fireEvent.click(choreButton);

      await waitFor(() => {
        expect(screen.getByText(/chore selected/i)).toBeInTheDocument();
      }, { timeout: 100 });
    });
  });

  describe('Stage Selection', () => {
    it('should render all stage options', () => {
      render(<TaskInput />);

      expect(screen.getByText(/plan/i)).toBeInTheDocument();
      expect(screen.getByText(/implement/i)).toBeInTheDocument();
      expect(screen.getByText(/test/i)).toBeInTheDocument();
      expect(screen.getByText(/review/i)).toBeInTheDocument();
      expect(screen.getByText(/document/i)).toBeInTheDocument();
    });

    it('should render SDLC preset button', () => {
      render(<TaskInput />);

      expect(screen.getByRole('button', { name: /sdlc/i })).toBeInTheDocument();
    });

    it('should toggle stage when clicked', () => {
      render(<TaskInput />);

      const testButton = screen.getByRole('button', { name: /test/i });
      fireEvent.click(testButton);

      expect(testButton).toHaveClass('bg-black');
    });

    it('should select all SDLC stages when SDLC button is clicked', () => {
      render(<TaskInput />);

      const sdlcButton = screen.getByRole('button', { name: /sdlc/i });
      fireEvent.click(sdlcButton);

      expect(screen.getByRole('button', { name: /plan/i })).toHaveClass('bg-black');
      expect(screen.getByRole('button', { name: /implement/i })).toHaveClass('bg-black');
      expect(screen.getByRole('button', { name: /test/i })).toHaveClass('bg-black');
    });

    it('should show merge workflow option', () => {
      render(<TaskInput />);

      expect(screen.getByText(/merge/i)).toBeInTheDocument();
    });

    it('should toggle merge workflow when clicked', () => {
      render(<TaskInput />);

      const mergeButton = screen.getByRole('button', { name: /merge/i });
      fireEvent.click(mergeButton);

      expect(mergeButton).toHaveClass('bg-purple-500');
    });
  });

  describe('ADW Reference', () => {
    it('should render ADW reference input', () => {
      render(<TaskInput />);

      expect(screen.getByPlaceholderText(/search or enter adw id/i)).toBeInTheDocument();
    });

    it('should show optional label for ADW reference', () => {
      render(<TaskInput />);

      expect(screen.getByText(/adw reference/i)).toBeInTheDocument();
      expect(screen.getAllByText(/optional/i).length).toBeGreaterThan(0);
    });

    it('should update ADW ID when input changes', () => {
      render(<TaskInput />);

      const adwInput = screen.getByPlaceholderText(/search or enter adw id/i);
      fireEvent.change(adwInput, { target: { value: 'abc12345' } });

      expect(screen.getByDisplayValue('abc12345')).toBeInTheDocument();
    });

    it('should populate ADW ID from task in edit mode', () => {
      const taskWithAdwId = { ...MOCK_TASK, customAdwId: 'test1234' };
      render(<TaskInput task={taskWithAdwId} />);

      expect(screen.getByDisplayValue('test1234')).toBeInTheDocument();
    });
  });

  describe('Start Immediately Option', () => {
    it('should render start immediately toggle', () => {
      render(<TaskInput />);

      expect(screen.getByRole('button', { name: /start immediately/i })).toBeInTheDocument();
    });

    it('should toggle start immediately when clicked', () => {
      render(<TaskInput />);

      const startButton = screen.getByRole('button', { name: /start immediately/i });
      fireEvent.click(startButton);

      expect(startButton).toHaveClass('bg-emerald-500');
    });

    it('should show toast when toggled on', async () => {
      render(<TaskInput />);

      const startButton = screen.getByRole('button', { name: /start immediately/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/will start immediately/i)).toBeInTheDocument();
      }, { timeout: 100 });
    });
  });

  describe('Image Attachments', () => {
    it('should render attachment dropzone', () => {
      render(<TaskInput />);

      expect(screen.getByText(/drop files or click/i)).toBeInTheDocument();
    });

    it('should show file type constraints', () => {
      render(<TaskInput />);

      expect(screen.getByText(/png, jpg, pdf/i)).toBeInTheDocument();
    });

    it('should display existing images in edit mode', () => {
      const taskWithImages = {
        ...MOCK_TASK,
        images: [
          { id: 1, name: 'test.png', url: 'blob:test', annotations: [] }
        ]
      };
      render(<TaskInput task={taskWithImages} />);

      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
  });

  describe('Form Submission - Create Mode', () => {
    it('should create task with correct data', () => {
      render(<TaskInput />);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'New task description' } });

      const createButton = screen.getByText('Create Task →');
      fireEvent.click(createButton);

      expect(mockStore.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'New task description',
          workItemType: WORK_ITEM_TYPES.FEATURE,
          queuedStages: expect.arrayContaining(['plan', 'implement'])
        })
      );
    });

    it('should reset form after successful creation', () => {
      render(<TaskInput />);

      const titleInput = screen.getByPlaceholderText(/enter task title/i);
      fireEvent.change(titleInput, { target: { value: 'Test' } });

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'Description' } });

      const createButton = screen.getByText('Create Task →');
      fireEvent.click(createButton);

      expect(titleInput).toHaveValue('');
    });

    it('should include start immediately flag in task data', () => {
      render(<TaskInput />);

      const startButton = screen.getByRole('button', { name: /start immediately/i });
      fireEvent.click(startButton);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'Description' } });

      const createButton = screen.getByText('Create Task →');
      fireEvent.click(createButton);

      expect(mockStore.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          startImmediately: true
        })
      );
    });

    it('should trim whitespace from fields', () => {
      render(<TaskInput />);

      const titleInput = screen.getByPlaceholderText(/enter task title/i);
      fireEvent.change(titleInput, { target: { value: '  Title  ' } });

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: '  Description  ' } });

      const createButton = screen.getByText('Create Task →');
      fireEvent.click(createButton);

      expect(mockStore.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Title',
          description: 'Description'
        })
      );
    });
  });

  describe('Form Submission - Edit Mode', () => {
    it('should update task with correct data', () => {
      const mockOnSave = vi.fn();
      render(<TaskInput task={MOCK_TASK} onSave={mockOnSave} />);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'Updated description' } });

      const saveButton = screen.getByText('Save Changes →');
      fireEvent.click(saveButton);

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        MOCK_TASK.id,
        expect.objectContaining({
          description: 'Updated description'
        })
      );
    });

    it('should call onSave callback after update', () => {
      const mockOnSave = vi.fn();
      render(<TaskInput task={MOCK_TASK} onSave={mockOnSave} />);

      const saveButton = screen.getByText('Save Changes →');
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should close modal after successful update', () => {
      const mockOnClose = vi.fn();
      render(<TaskInput task={MOCK_TASK} onClose={mockOnClose} />);

      const saveButton = screen.getByText('Save Changes →');
      fireEvent.click(saveButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Validation and Error Handling', () => {
    it('should disable submit when description is empty', () => {
      render(<TaskInput />);

      const createButton = screen.getByText('Create Task →');
      expect(createButton).toBeDisabled();
    });

    it('should disable submit when no stages are selected', () => {
      render(<TaskInput />);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'Description' } });

      // Deselect all stages
      const planButton = screen.getByRole('button', { name: /plan/i });
      const implementButton = screen.getByRole('button', { name: /implement/i });
      fireEvent.click(planButton);
      fireEvent.click(implementButton);

      const createButton = screen.getByText('Create Task →');
      expect(createButton).toBeDisabled();
    });

    it('should show validation errors when task is invalid', () => {
      mockStore.validateTask.mockReturnValue({
        isValid: false,
        errors: ['Description is required']
      });

      render(<TaskInput />);

      const createButton = screen.getByText('Create Task →');
      fireEvent.click(createButton);

      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });

    it('should not create task when validation fails', () => {
      mockStore.validateTask.mockReturnValue({
        isValid: false,
        errors: ['Validation error']
      });

      render(<TaskInput />);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'Description' } });

      const createButton = screen.getByText('Create Task →');
      fireEvent.click(createButton);

      expect(mockStore.createTask).not.toHaveBeenCalled();
    });
  });

  describe('Modal Controls', () => {
    it('should close modal when close button is clicked in create mode', () => {
      render(<TaskInput />);

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(mockStore.toggleTaskInput).toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked in edit mode', () => {
      const mockOnClose = vi.fn();
      render(<TaskInput task={MOCK_TASK} onClose={mockOnClose} />);

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', () => {
      render(<TaskInput />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockStore.toggleTaskInput).toHaveBeenCalled();
    });

    it('should close modal on ESC key press', () => {
      render(<TaskInput />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockStore.toggleTaskInput).toHaveBeenCalled();
    });

    it('should submit form on Cmd+Enter', () => {
      render(<TaskInput />);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'Description' } });

      fireEvent.keyDown(document, { key: 'Enter', metaKey: true });

      expect(mockStore.createTask).toHaveBeenCalled();
    });

    it('should submit form on Ctrl+Enter', () => {
      render(<TaskInput />);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'Description' } });

      fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });

      expect(mockStore.createTask).toHaveBeenCalled();
    });
  });

  describe('Toast Notifications', () => {
    it('should show toast when draft is clicked', async () => {
      render(<TaskInput />);

      const draftButton = screen.getByText(/draft/i);
      fireEvent.click(draftButton);

      await waitFor(() => {
        expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
      }, { timeout: 100 });
    });

    it('should hide toast after timeout', async () => {
      vi.useFakeTimers();
      render(<TaskInput />);

      const draftButton = screen.getByText(/draft/i);
      fireEvent.click(draftButton);

      await waitFor(() => {
        expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
      });

      vi.advanceTimersByTime(2100);

      await waitFor(() => {
        expect(screen.queryByText(/draft saved/i)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without images', () => {
      const taskWithoutImages = { ...MOCK_TASK, images: undefined };
      render(<TaskInput task={taskWithoutImages} />);

      expect(screen.getByText(/drop files or click/i)).toBeInTheDocument();
    });

    it('should handle task without queuedStages', () => {
      const taskWithoutStages = { ...MOCK_TASK, queuedStages: undefined };
      render(<TaskInput task={taskWithoutStages} />);

      expect(screen.getByText('EDIT TASK')).toBeInTheDocument();
    });

    it('should focus modal on render', () => {
      const { container } = render(<TaskInput />);

      const modal = container.querySelector('[tabindex="-1"]');
      expect(modal).toBeInTheDocument();
    });

    it('should handle empty title in create mode', () => {
      render(<TaskInput />);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'Description' } });

      const createButton = screen.getByText('Create Task →');
      fireEvent.click(createButton);

      expect(mockStore.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: ''
        })
      );
    });

    it('should preserve existing ADW ID in edit mode', () => {
      const taskWithAdwId = { ...MOCK_TASK, customAdwId: 'existing1' };
      render(<TaskInput task={taskWithAdwId} />);

      expect(screen.getByDisplayValue('existing1')).toBeInTheDocument();
    });
  });
});
