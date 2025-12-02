/**
 * Integration Tests for Browse Directory API
 * Tests the complete flow from UI to backend API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectSelector from '../../components/ProjectSelector';
import { useKanbanStore } from '../../stores/kanbanStore';
import fileOperationsService from '../../services/api/fileOperationsService';

// Mock the kanban store
vi.mock('../../stores/kanbanStore');

// Mock the file operations service
vi.mock('../../services/api/fileOperationsService');

describe('Browse Directory API Integration', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = {
      availableProjects: [],
      selectProject: vi.fn(),
      addProject: vi.fn(),
      refreshProjects: vi.fn(),
      setError: vi.fn(),
      setLoading: vi.fn()
    };

    useKanbanStore.mockReturnValue(mockStore);
    fileOperationsService.selectDirectory = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Browse and Add Flow', () => {
    it('should complete full flow: browse → select → populate → submit', async () => {
      // Mock successful directory selection
      fileOperationsService.selectDirectory.mockResolvedValue({
        path: '/Users/username/projects/MyNewProject',
        name: 'MyNewProject'
      });

      // Mock successful project addition
      mockStore.addProject.mockReturnValue({
        success: true,
        project: {
          id: '1',
          name: 'MyNewProject',
          path: '/Users/username/projects/MyNewProject',
          description: 'Recently added project with dynamic ADW support'
        }
      });

      render(<ProjectSelector />);

      // Step 1: Click "Add New Project"
      const addNewButton = screen.getAllByText('Add New Project').find(el => el.closest('button'));
      fireEvent.click(addNewButton);

      // Step 2: Click "Browse"
      const browseButton = screen.getByText('Browse');
      fireEvent.click(browseButton);

      // Step 3: Wait for API call and fields to populate
      await waitFor(() => {
        expect(fileOperationsService.selectDirectory).toHaveBeenCalled();
      });

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('My Awesome Project');
        const pathInput = screen.getByPlaceholderText('/Users/username/projects/myproject');
        expect(nameInput).toHaveValue('MyNewProject');
        expect(pathInput).toHaveValue('/Users/username/projects/MyNewProject');
      });

      // Step 4: Submit the form
      const addButton = screen.getByText('Add Project');
      fireEvent.click(addButton);

      // Step 5: Verify project was added and selected
      expect(mockStore.addProject).toHaveBeenCalledWith({
        name: 'MyNewProject',
        path: '/Users/username/projects/MyNewProject',
        description: 'Recently added project with dynamic ADW support'
      });

      expect(mockStore.selectProject).toHaveBeenCalledWith({
        id: '1',
        name: 'MyNewProject',
        path: '/Users/username/projects/MyNewProject',
        description: 'Recently added project with dynamic ADW support'
      });
    });

    it('should allow manual editing after browse selection', async () => {
      fileOperationsService.selectDirectory.mockResolvedValue({
        path: '/Users/username/projects/MyProject',
        name: 'MyProject'
      });

      mockStore.addProject.mockReturnValue({
        success: true,
        project: {
          id: '1',
          name: 'MyProject - Updated',
          path: '/Users/username/projects/MyProject/subfolder',
          description: 'Recently added project with dynamic ADW support'
        }
      });

      render(<ProjectSelector />);

      const addNewButton = screen.getAllByText('Add New Project').find(el => el.closest('button'));
      fireEvent.click(addNewButton);

      const browseButton = screen.getByText('Browse');
      fireEvent.click(browseButton);

      await waitFor(() => {
        expect(fileOperationsService.selectDirectory).toHaveBeenCalled();
      });

      // Wait for fields to populate
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('My Awesome Project');
        expect(nameInput).toHaveValue('MyProject');
      });

      // Manually edit both fields
      const nameInput = screen.getByPlaceholderText('My Awesome Project');
      const pathInput = screen.getByPlaceholderText('/Users/username/projects/myproject');

      fireEvent.change(nameInput, { target: { value: 'MyProject - Updated' } });
      fireEvent.change(pathInput, { target: { value: '/Users/username/projects/MyProject/subfolder' } });

      expect(nameInput).toHaveValue('MyProject - Updated');
      expect(pathInput).toHaveValue('/Users/username/projects/MyProject/subfolder');

      // Submit with edited values
      const addButton = screen.getByText('Add Project');
      fireEvent.click(addButton);

      expect(mockStore.addProject).toHaveBeenCalledWith({
        name: 'MyProject - Updated',
        path: '/Users/username/projects/MyProject/subfolder',
        description: 'Recently added project with dynamic ADW support'
      });
    });

    it('should handle user cancellation gracefully', async () => {
      fileOperationsService.selectDirectory.mockResolvedValue({
        path: null,
        name: null
      });

      render(<ProjectSelector />);

      const addNewButton = screen.getAllByText('Add New Project').find(el => el.closest('button'));
      fireEvent.click(addNewButton);

      const browseButton = screen.getByText('Browse');
      fireEvent.click(browseButton);

      await waitFor(() => {
        expect(fileOperationsService.selectDirectory).toHaveBeenCalled();
      });

      // Fields should remain empty
      const nameInput = screen.getByPlaceholderText('My Awesome Project');
      const pathInput = screen.getByPlaceholderText('/Users/username/projects/myproject');

      expect(nameInput).toHaveValue('');
      expect(pathInput).toHaveValue('');

      // Submit button should still be disabled
      const addButton = screen.getByText('Add Project');
      expect(addButton).toBeDisabled();

      // addProject should not have been called
      expect(mockStore.addProject).not.toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from API error and allow retry', async () => {
      // First call fails
      fileOperationsService.selectDirectory.mockRejectedValueOnce(
        new Error('Network error')
      );

      // Second call succeeds
      fileOperationsService.selectDirectory.mockResolvedValueOnce({
        path: '/Users/username/projects/MyProject',
        name: 'MyProject'
      });

      render(<ProjectSelector />);

      const addNewButton = screen.getAllByText('Add New Project').find(el => el.closest('button'));
      fireEvent.click(addNewButton);

      // First attempt - should fail
      const browseButton = screen.getByText('Browse');
      fireEvent.click(browseButton);

      await waitFor(() => {
        expect(mockStore.setError).toHaveBeenCalledWith(
          'Failed to open directory picker: Network error'
        );
      });

      // Second attempt - should succeed
      fireEvent.click(browseButton);

      await waitFor(() => {
        expect(fileOperationsService.selectDirectory).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('My Awesome Project');
        expect(nameInput).toHaveValue('MyProject');
      });
    });

    it('should handle backend unavailable error', async () => {
      fileOperationsService.selectDirectory.mockRejectedValue(
        new Error('Failed to open directory picker: 500 Internal Server Error')
      );

      render(<ProjectSelector />);

      const addNewButton = screen.getAllByText('Add New Project').find(el => el.closest('button'));
      fireEvent.click(addNewButton);

      const browseButton = screen.getByText('Browse');
      fireEvent.click(browseButton);

      await waitFor(() => {
        expect(mockStore.setError).toHaveBeenCalledWith(
          expect.stringContaining('Failed to open directory picker')
        );
      });
    });
  });

  describe('Recent Projects Integration', () => {
    it('should add browsed project to recent projects after selection', async () => {
      fileOperationsService.selectDirectory.mockResolvedValue({
        path: '/Users/username/projects/MyProject',
        name: 'MyProject'
      });

      const newProject = {
        id: '1',
        name: 'MyProject',
        path: '/Users/username/projects/MyProject',
        description: 'Recently added project with dynamic ADW support',
        lastAccessedAt: new Date().toISOString()
      };

      mockStore.addProject.mockReturnValue({
        success: true,
        project: newProject
      });

      render(<ProjectSelector />);

      const addNewButton = screen.getAllByText('Add New Project').find(el => el.closest('button'));
      fireEvent.click(addNewButton);

      const browseButton = screen.getByText('Browse');
      fireEvent.click(browseButton);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('My Awesome Project');
        expect(nameInput).toHaveValue('MyProject');
      });

      const addButton = screen.getByText('Add Project');
      fireEvent.click(addButton);

      // Verify project was selected (which triggers recent projects update)
      expect(mockStore.selectProject).toHaveBeenCalledWith(newProject);
    });
  });

  describe('Multiple Browse Operations', () => {
    it('should handle multiple browse operations in sequence', async () => {
      render(<ProjectSelector />);

      const addNewButton = screen.getAllByText('Add New Project').find(el => el.closest('button'));
      fireEvent.click(addNewButton);

      // First browse
      fileOperationsService.selectDirectory.mockResolvedValueOnce({
        path: '/Users/username/projects/Project1',
        name: 'Project1'
      });

      const browseButton = screen.getByText('Browse');
      fireEvent.click(browseButton);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('My Awesome Project');
        expect(nameInput).toHaveValue('Project1');
      });

      // Second browse (changing mind)
      fileOperationsService.selectDirectory.mockResolvedValueOnce({
        path: '/Users/username/projects/Project2',
        name: 'Project2'
      });

      fireEvent.click(browseButton);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('My Awesome Project');
        expect(nameInput).toHaveValue('Project2');
      });

      // Should have been called twice
      expect(fileOperationsService.selectDirectory).toHaveBeenCalledTimes(2);
    });

    it('should handle browse → cancel → browse → select', async () => {
      render(<ProjectSelector />);

      const addNewButton = screen.getAllByText('Add New Project').find(el => el.closest('button'));
      fireEvent.click(addNewButton);

      // First browse - cancelled
      fileOperationsService.selectDirectory.mockResolvedValueOnce({
        path: null,
        name: null
      });

      const browseButton = screen.getByText('Browse');
      fireEvent.click(browseButton);

      await waitFor(() => {
        expect(fileOperationsService.selectDirectory).toHaveBeenCalledTimes(1);
      });

      const nameInput = screen.getByPlaceholderText('My Awesome Project');
      expect(nameInput).toHaveValue('');

      // Second browse - selected
      fileOperationsService.selectDirectory.mockResolvedValueOnce({
        path: '/Users/username/projects/MyProject',
        name: 'MyProject'
      });

      fireEvent.click(browseButton);

      await waitFor(() => {
        expect(nameInput).toHaveValue('MyProject');
      });

      expect(fileOperationsService.selectDirectory).toHaveBeenCalledTimes(2);
    });
  });
});
