/**
 * Tests for TaskEditModal Component
 * Comprehensive tests for task editing modal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskEditModal from '../TaskEditModal';
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

describe('TaskEditModal Component', () => {
  let mockStore;
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const MOCK_TASK = {
    id: 1,
    title: 'Test Task',
    description: 'Test description',
    workItemType: WORK_ITEM_TYPES.FEATURE,
    queuedStages: ['plan', 'implement'],
    images: []
  };

  beforeEach(() => {
    mockStore = {
      updateTask: vi.fn(),
      validateTask: vi.fn(() => ({ isValid: true, errors: [] }))
    };
    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Basic Elements', () => {
    it('should render modal with task data', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      // The X button in the header - check for the X element
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should render save button', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render all work item type options', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText('Feature')).toBeInTheDocument();
      expect(screen.getByText('Chore')).toBeInTheDocument();
      expect(screen.getByText('Bug')).toBeInTheDocument();
      expect(screen.getByText('Patch')).toBeInTheDocument();
    });

    it('should render title field with optional label', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText(/task title \(optional\)/i)).toBeInTheDocument();
    });

    it('should render description field with required label', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText(/description \*/i)).toBeInTheDocument();
    });
  });

  describe('Form Interactions - Title and Description', () => {
    it('should update title when input changes', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const titleInput = screen.getByDisplayValue('Test Task');
      fireEvent.change(titleInput, { target: { value: 'Updated Task' } });

      expect(screen.getByDisplayValue('Updated Task')).toBeInTheDocument();
    });

    it('should update description when editor changes', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: 'Updated description' } });

      expect(screen.getByDisplayValue('Updated description')).toBeInTheDocument();
    });

    it('should handle empty title', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const titleInput = screen.getByDisplayValue('Test Task');
      fireEvent.change(titleInput, { target: { value: '' } });

      expect(screen.getByPlaceholderText(/enter task title/i)).toBeInTheDocument();
    });
  });

  describe('Work Item Type Selection', () => {
    it('should select Feature by default', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const featureOption = screen.getByRole('radio', { name: /feature/i });
      expect(featureOption).toBeChecked();
    });

    it('should change work item type when clicked', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const bugOption = screen.getByRole('radio', { name: /bug/i });
      fireEvent.click(bugOption);

      expect(bugOption).toBeChecked();
    });

    it('should render Bug work item type from task data', () => {
      const bugTask = { ...MOCK_TASK, workItemType: WORK_ITEM_TYPES.BUG };
      render(<TaskEditModal task={bugTask} onClose={mockOnClose} />);

      const bugOption = screen.getByRole('radio', { name: /bug/i });
      expect(bugOption).toBeChecked();
    });

    it('should render Chore work item type from task data', () => {
      const choreTask = { ...MOCK_TASK, workItemType: WORK_ITEM_TYPES.CHORE };
      render(<TaskEditModal task={choreTask} onClose={mockOnClose} />);

      const choreOption = screen.getByRole('radio', { name: /chore/i });
      expect(choreOption).toBeChecked();
    });

    it('should render Patch work item type from task data', () => {
      const patchTask = { ...MOCK_TASK, workItemType: WORK_ITEM_TYPES.PATCH };
      render(<TaskEditModal task={patchTask} onClose={mockOnClose} />);

      const patchOption = screen.getByRole('radio', { name: /patch/i });
      expect(patchOption).toBeChecked();
    });
  });

  describe('Stage Queue Selection', () => {
    it('should render queued stages from task', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planCheckbox = screen.getByRole('checkbox', { name: /plan/i });
      const implementCheckbox = screen.getByRole('checkbox', { name: /implement/i });

      expect(planCheckbox).toBeChecked();
      expect(implementCheckbox).toBeChecked();
    });

    it('should toggle stage when checkbox is clicked', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const testCheckbox = screen.getByRole('checkbox', { name: /test/i });
      fireEvent.click(testCheckbox);

      expect(testCheckbox).toBeChecked();
    });

    it('should deselect stage when clicked again', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const planCheckbox = screen.getByRole('checkbox', { name: /plan/i });
      fireEvent.click(planCheckbox);

      expect(planCheckbox).not.toBeChecked();
    });

    it('should render SDLC quick select button', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /sdlc/i })).toBeInTheDocument();
    });

    it('should select all SDLC stages when SDLC button is clicked', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const sdlcButton = screen.getByRole('button', { name: /sdlc/i });
      fireEvent.click(sdlcButton);

      expect(screen.getByRole('checkbox', { name: /plan/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /implement/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /test/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /review/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /document/i })).toBeChecked();
    });

    it('should deselect all SDLC stages when SDLC button is clicked again', () => {
      const fullSdlcTask = {
        ...MOCK_TASK,
        queuedStages: ['plan', 'implement', 'test', 'review', 'document']
      };
      render(<TaskEditModal task={fullSdlcTask} onClose={mockOnClose} />);

      const sdlcButton = screen.getByRole('button', { name: /sdlc/i });
      fireEvent.click(sdlcButton);

      expect(screen.getByRole('checkbox', { name: /plan/i })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: /implement/i })).not.toBeChecked();
    });
  });

  describe('Image Attachments', () => {
    it('should render image upload dropzone', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    });

    it('should display clipboard paste hint when supported', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      expect(screen.getByText(/ctrl\+v/i)).toBeInTheDocument();
    });

    it('should render existing images from task', () => {
      const taskWithImages = {
        ...MOCK_TASK,
        images: [
          { id: 1, name: 'test.png', url: 'blob:test', annotations: [] }
        ]
      };
      render(<TaskEditModal task={taskWithImages} onClose={mockOnClose} />);

      expect(screen.getByText('test.png')).toBeInTheDocument();
    });

    it('should display image annotation count', () => {
      const taskWithAnnotatedImage = {
        ...MOCK_TASK,
        images: [
          {
            id: 1,
            name: 'test.png',
            url: 'blob:test',
            annotations: [
              { id: 1, x: 50, y: 50, note: 'Test annotation' }
            ]
          }
        ]
      };
      render(<TaskEditModal task={taskWithAnnotatedImage} onClose={mockOnClose} />);

      expect(screen.getByText(/1 annotation\(s\)/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call updateTask with correct data on submit', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} onSave={mockOnSave} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        MOCK_TASK.id,
        expect.objectContaining({
          title: 'Test Task',
          description: 'Test description',
          workItemType: WORK_ITEM_TYPES.FEATURE,
          queuedStages: ['plan', 'implement']
        })
      );
    });

    it('should call onSave callback after successful update', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} onSave={mockOnSave} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should call onClose after successful update', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should disable save button when description is empty', () => {
      const taskWithoutDesc = { ...MOCK_TASK, description: '' };
      render(<TaskEditModal task={taskWithoutDesc} onClose={mockOnClose} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should disable save button when no stages are selected', () => {
      const taskWithoutStages = { ...MOCK_TASK, queuedStages: [] };
      render(<TaskEditModal task={taskWithoutStages} onClose={mockOnClose} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should trim whitespace from title and description', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const titleInput = screen.getByDisplayValue('Test Task');
      fireEvent.change(titleInput, { target: { value: '  Trimmed Task  ' } });

      const editor = screen.getByTestId('rich-text-editor');
      fireEvent.change(editor, { target: { value: '  Trimmed desc  ' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        MOCK_TASK.id,
        expect.objectContaining({
          title: 'Trimmed Task',
          description: 'Trimmed desc'
        })
      );
    });
  });

  describe('Validation and Error Handling', () => {
    it('should display validation errors when task is invalid', () => {
      mockStore.validateTask.mockReturnValue({
        isValid: false,
        errors: ['Description is required', 'At least one stage must be selected']
      });

      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('At least one stage must be selected')).toBeInTheDocument();
    });

    it('should not call updateTask when validation fails', () => {
      mockStore.validateTask.mockReturnValue({
        isValid: false,
        errors: ['Validation error']
      });

      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(mockStore.updateTask).not.toHaveBeenCalled();
    });

    it('should not call onClose when validation fails', () => {
      mockStore.validateTask.mockReturnValue({
        isValid: false,
        errors: ['Validation error']
      });

      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when close button is clicked', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      // Find the X button in the header (first button in the modal)
      const buttons = screen.getAllByRole('button');
      const xButton = buttons.find(btn => btn.textContent === '' || btn.querySelector('.h-5.w-5'));
      fireEvent.click(xButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', () => {
      render(<TaskEditModal task={MOCK_TASK} onClose={mockOnClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without title', () => {
      const taskWithoutTitle = { ...MOCK_TASK, title: '' };
      render(<TaskEditModal task={taskWithoutTitle} onClose={mockOnClose} />);

      expect(screen.getByPlaceholderText(/enter task title/i)).toBeInTheDocument();
    });

    it('should handle task without images', () => {
      const taskWithoutImages = { ...MOCK_TASK, images: undefined };
      render(<TaskEditModal task={taskWithoutImages} onClose={mockOnClose} />);

      expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    });

    it('should include images with annotations in submission', () => {
      const taskWithImages = {
        ...MOCK_TASK,
        images: [
          { id: 1, name: 'test.png', url: 'blob:test', annotations: [] }
        ]
      };
      render(<TaskEditModal task={taskWithImages} onClose={mockOnClose} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        MOCK_TASK.id,
        expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              annotations: []
            })
          ])
        })
      );
    });
  });
});
