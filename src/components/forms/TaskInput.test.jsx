import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskInput from './TaskInput';
import { useKanbanStore } from '../../stores/kanbanStore';
import { SDLC_STAGES } from '../../constants/workItems';

// Mock the store
jest.mock('../../stores/kanbanStore');

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: jest.fn(),
    getInputProps: jest.fn(),
    isDragActive: false
  })
}));

// Mock useClipboard hook
jest.mock('../../hooks/useClipboard', () => ({
  useClipboard: () => ({
    isSupported: false,
    setupPasteListener: jest.fn()
  })
}));

describe('TaskInput Component', () => {
  const mockCreateTask = jest.fn();
  const mockToggleTaskInput = jest.fn();
  const mockValidateTask = jest.fn();

  beforeEach(() => {
    useKanbanStore.mockReturnValue({
      createTask: mockCreateTask,
      toggleTaskInput: mockToggleTaskInput,
      validateTask: mockValidateTask.mockReturnValue({ isValid: true, errors: [] }),
      selectedProject: null,
      projectNotificationEnabled: false
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Full SDLC Selection', () => {
    it('should display Full SDLC button', () => {
      render(<TaskInput />);

      const fullSdlcButton = screen.getByText('Select Full SDLC');
      expect(fullSdlcButton).toBeInTheDocument();
    });

    it('should select all SDLC stages when Full SDLC is clicked', async () => {
      render(<TaskInput />);

      const fullSdlcButton = screen.getByText('Select Full SDLC');
      fireEvent.click(fullSdlcButton);

      // Check that all SDLC stage checkboxes are checked
      const checkboxes = screen.getAllByRole('checkbox');
      const sdlcCheckboxes = checkboxes.filter((checkbox, index) => {
        const stage = SDLC_STAGES[index];
        return stage && checkbox.checked;
      });

      // We expect 5 SDLC stages to be selected
      expect(sdlcCheckboxes.length).toBeGreaterThanOrEqual(5);
    });

    it('should show Full SDLC Selected when all stages are selected', async () => {
      render(<TaskInput />);

      const fullSdlcButton = screen.getByText('Select Full SDLC');
      fireEvent.click(fullSdlcButton);

      await waitFor(() => {
        expect(screen.getByText('✓ Full SDLC Selected')).toBeInTheDocument();
      });
    });

    it('should deselect all SDLC stages when Full SDLC is clicked again', async () => {
      render(<TaskInput />);

      const fullSdlcButton = screen.getByText('Select Full SDLC');

      // First click - select all
      fireEvent.click(fullSdlcButton);

      await waitFor(() => {
        expect(screen.getByText('✓ Full SDLC Selected')).toBeInTheDocument();
      });

      // Second click - deselect all
      fireEvent.click(screen.getByText('✓ Full SDLC Selected'));

      await waitFor(() => {
        expect(screen.getByText('Select Full SDLC')).toBeInTheDocument();
      });
    });

    it('should preserve non-SDLC stages when toggling Full SDLC', async () => {
      render(<TaskInput />);

      // First select PR stage (non-SDLC)
      const prStage = screen.getByText('PR').closest('label');
      fireEvent.click(prStage);

      // Then click Full SDLC
      const fullSdlcButton = screen.getByText('Select Full SDLC');
      fireEvent.click(fullSdlcButton);

      // PR should still be selected along with SDLC stages
      const prCheckbox = prStage.querySelector('input[type="checkbox"]');
      expect(prCheckbox.checked).toBe(true);
    });

    it('should remove Full SDLC indicator when one stage is manually deselected', async () => {
      render(<TaskInput />);

      // Select Full SDLC
      const fullSdlcButton = screen.getByText('Select Full SDLC');
      fireEvent.click(fullSdlcButton);

      await waitFor(() => {
        expect(screen.getByText('✓ Full SDLC Selected')).toBeInTheDocument();
      });

      // Deselect one SDLC stage
      const documentStage = screen.getByText('Document').closest('label');
      fireEvent.click(documentStage);

      await waitFor(() => {
        expect(screen.getByText('Select Full SDLC')).toBeInTheDocument();
      });
    });
  });

  describe('Task Creation with SDLC', () => {
    it('should create task with all SDLC stages when Full SDLC is selected', async () => {
      mockValidateTask.mockReturnValue({ isValid: true, errors: [] });

      render(<TaskInput />);

      // Click Full SDLC
      const fullSdlcButton = screen.getByText('Select Full SDLC');
      fireEvent.click(fullSdlcButton);

      // Enter description
      const descriptionField = screen.getByPlaceholderText('Describe what needs to be done...');
      await userEvent.type(descriptionField, 'Test SDLC task');

      // Submit form
      const createButton = screen.getByText('Create Task');
      fireEvent.click(createButton);

      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test SDLC task',
          queuedStages: expect.arrayContaining(SDLC_STAGES)
        })
      );
    });

    it('should validate task before creation', async () => {
      mockValidateTask.mockReturnValue({
        isValid: false,
        errors: ['Description is required']
      });

      render(<TaskInput />);

      // Try to submit without description
      const createButton = screen.getByText('Create Task');
      fireEvent.click(createButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Description is required')).toBeInTheDocument();
      });

      expect(mockCreateTask).not.toHaveBeenCalled();
    });
  });

  describe('Stage Selection', () => {
    it('should allow individual stage selection', async () => {
      render(<TaskInput />);

      const planStage = screen.getByText('Plan').closest('label');
      const implementStage = screen.getByText('Implement').closest('label');

      fireEvent.click(planStage);
      fireEvent.click(implementStage);

      const planCheckbox = planStage.querySelector('input[type="checkbox"]');
      const implementCheckbox = implementStage.querySelector('input[type="checkbox"]');

      expect(planCheckbox.checked).toBe(true);
      expect(implementCheckbox.checked).toBe(true);
    });

    it('should allow deselecting stages', async () => {
      render(<TaskInput />);

      // Plan and Implement are selected by default
      const planStage = screen.getByText('Plan').closest('label');
      fireEvent.click(planStage);

      const planCheckbox = planStage.querySelector('input[type="checkbox"]');
      expect(planCheckbox.checked).toBe(false);
    });
  });
});