/**
 * Tests for CommandsPalette Component
 * Comprehensive tests for command palette functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import CommandsPalette from '../CommandsPalette';
import { useKanbanStore } from '../../stores/kanbanStore';
import claudeCommandsService from '../../services/api/claudeCommandsService';

// Mock the kanban store
vi.mock('../../stores/kanbanStore');

// Mock claudeCommandsService
vi.mock('../../services/api/claudeCommandsService');

// Mock CommandEditor component
vi.mock('../CommandEditor', () => ({
  default: ({ commandId, isOpen, onClose, onSave }) => (
    isOpen ? (
      <div data-testid="command-editor">
        <button onClick={onClose}>Close Editor</button>
        <button onClick={() => onSave && onSave({ id: commandId, content: 'Updated' })}>
          Save Command
        </button>
      </div>
    ) : null
  ),
}));

// Mock token counter utilities
vi.mock('../../utils/tokenCounter', () => ({
  formatTokenCount: (count) => count.toString(),
}));

describe('CommandsPalette Component', () => {
  let mockStore;

  const MOCK_PROJECT = {
    id: 'project-1',
    name: 'Test Project',
    path: '/path/to/project',
  };

  const MOCK_TASK = {
    id: 'task-1',
    title: 'Test Task',
    stage: 'plan',
    substage: 'requirements',
  };

  const MOCK_COMMANDS = [
    {
      id: 'test-command',
      name: 'Test Command',
      category: 'testing',
      description: 'Run tests',
      isAvailable: true,
      tokenCount: 100,
      estimatedDuration: '5 min',
      metadata: {
        stage: 'plan',
        substage: 'requirements',
      },
    },
    {
      id: 'doc-command',
      name: 'Documentation Command',
      category: 'documentation',
      description: 'Generate documentation',
      isAvailable: true,
      tokenCount: 200,
      estimatedDuration: '10 min',
      metadata: {
        stage: 'document',
      },
    },
    {
      id: 'review-command',
      name: 'Review Command',
      category: 'review',
      description: 'Code review',
      isAvailable: false,
      tokenCount: 150,
      estimatedDuration: '8 min',
    },
  ];

  const MOCK_CATEGORIES = [
    { id: 'all', name: 'All Commands' },
    { id: 'testing', name: 'Testing' },
    { id: 'documentation', name: 'Documentation' },
    { id: 'review', name: 'Review' },
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockStore = {
      selectedProject: MOCK_PROJECT,
    };

    useKanbanStore.mockReturnValue(mockStore);

    // Setup default mock implementations
    claudeCommandsService.discoverCommands.mockResolvedValue({
      discovered: MOCK_COMMANDS,
    });
    claudeCommandsService.getCategories.mockReturnValue(
      MOCK_CATEGORIES.filter(c => c.id !== 'all')
    );
    claudeCommandsService.searchCommands.mockImplementation((query) => {
      return MOCK_COMMANDS.filter(cmd =>
        cmd.name.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description.toLowerCase().includes(query.toLowerCase())
      );
    });
    claudeCommandsService.getCommandsForStage.mockImplementation((stage, substage) => {
      return MOCK_COMMANDS.filter(cmd =>
        cmd.metadata?.stage === stage &&
        (!substage || cmd.metadata?.substage === substage)
      );
    });
    claudeCommandsService.getCommandSlashName.mockImplementation((cmd) => `/${cmd.id}`);
    claudeCommandsService.getCommandComplexity.mockReturnValue({
      level: 'Simple',
      color: 'green',
    });
    claudeCommandsService.executeCommand.mockResolvedValue({
      success: true,
      output: 'Command executed',
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering - Basic Elements', () => {
    it('should not render when isOpen is false', () => {
      render(
        <CommandsPalette
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Claude Commands')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Claude Commands')).toBeInTheDocument();
      });
    });

    it('should display project name in description', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Available workflow primitives for Test Project/)).toBeInTheDocument();
      });
    });

    it('should load commands on open', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(claudeCommandsService.discoverCommands).toHaveBeenCalledWith('/path/to/project');
      });
    });

    it('should display loading state while fetching commands', () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Loading commands...')).toBeInTheDocument();
    });

    it('should display commands after loading', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
        expect(screen.getByText('Generate documentation')).toBeInTheDocument();
        expect(screen.getByText('Code review')).toBeInTheDocument();
      });
    });

    it('should display command slash names', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('/test-command')).toBeInTheDocument();
        expect(screen.getByText('/doc-command')).toBeInTheDocument();
        expect(screen.getByText('/review-command')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter commands by search query', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search commands...');
      fireEvent.change(searchInput, { target: { value: 'documentation' } });

      await waitFor(() => {
        expect(claudeCommandsService.searchCommands).toHaveBeenCalledWith('documentation');
      });
    });

    it('should update displayed commands based on search', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search commands...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });
    });

    it('should show empty state when no commands match search', async () => {
      claudeCommandsService.searchCommands.mockReturnValue([]);

      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search commands...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No commands found matching your criteria')).toBeInTheDocument();
      });
    });
  });

  describe('Category Filtering', () => {
    it('should render category selector', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Commands')).toBeInTheDocument();
      });
    });

    it('should filter commands by category', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('All Commands');
      fireEvent.change(categorySelect, { target: { value: 'testing' } });

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
        expect(screen.queryByText('Generate documentation')).not.toBeInTheDocument();
      });
    });

    it('should show all commands when "all" category is selected', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('All Commands');
      fireEvent.change(categorySelect, { target: { value: 'testing' } });

      await waitFor(() => {
        expect(screen.queryByText('Generate documentation')).not.toBeInTheDocument();
      });

      fireEvent.change(categorySelect, { target: { value: 'all' } });

      await waitFor(() => {
        expect(screen.getByText('Generate documentation')).toBeInTheDocument();
      });
    });
  });

  describe('Task Relevance', () => {
    it('should highlight relevant commands for task stage', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
          task={MOCK_TASK}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Relevant')).toBeInTheDocument();
      });
    });

    it('should sort relevant commands to the top', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
          task={MOCK_TASK}
        />
      );

      await waitFor(() => {
        const commands = screen.getAllByRole('button', { name: /Run/ });
        const firstCommand = commands[0].closest('.border');
        expect(within(firstCommand).getByText('Relevant')).toBeInTheDocument();
      });
    });

    it('should display task stage in statistics', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
          task={MOCK_TASK}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Relevant for plan:/)).toBeInTheDocument();
      });
    });

    it('should work without a task', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      expect(screen.queryByText('Relevant')).not.toBeInTheDocument();
    });
  });

  describe('Command Execution', () => {
    it('should execute command when run button is clicked', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const runButtons = screen.getAllByText('Run');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(claudeCommandsService.executeCommand).toHaveBeenCalledWith(
          'test-command',
          expect.objectContaining({
            project: 'project-1',
          })
        );
      });
    });

    it('should pass task ID when executing with task', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
          task={MOCK_TASK}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const runButtons = screen.getAllByText('Run');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(claudeCommandsService.executeCommand).toHaveBeenCalledWith(
          'test-command',
          expect.objectContaining({
            task: 'task-1',
            project: 'project-1',
          })
        );
      });
    });

    it('should show running state while executing', async () => {
      claudeCommandsService.executeCommand.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const runButtons = screen.getAllByText('Run');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Running...')).toBeInTheDocument();
      });
    });

    it('should disable run button when command is not available', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Code review')).toBeInTheDocument();
      });

      const allRunButtons = screen.getAllByRole('button');
      const reviewCommandButton = allRunButtons.find(btn =>
        btn.textContent.includes('Run') &&
        btn.closest('.border')?.textContent.includes('Code review')
      );

      expect(reviewCommandButton).toBeDisabled();
    });

    it('should handle execution errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      claudeCommandsService.executeCommand.mockRejectedValue(new Error('Execution failed'));

      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const runButtons = screen.getAllByText('Run');
      fireEvent.click(runButtons[0]);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Command execution failed:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Command Editor Integration', () => {
    it('should open editor when edit button is clicked', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId('command-editor')).toBeInTheDocument();
    });

    it('should close editor when editor close is clicked', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const closeEditorButton = screen.getByText('Close Editor');
      fireEvent.click(closeEditorButton);

      expect(screen.queryByTestId('command-editor')).not.toBeInTheDocument();
    });

    it('should update command list when editor saves', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const saveButton = screen.getByText('Save Command');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(claudeCommandsService.discoverCommands).toHaveBeenCalledTimes(1);
      });
    });

    it('should open editor when view details button is clicked', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });

      const detailButtons = screen.getAllByTitle('View command details');
      fireEvent.click(detailButtons[0]);

      expect(screen.getByTestId('command-editor')).toBeInTheDocument();
    });
  });

  describe('Command Display', () => {
    it('should display command categories with icons', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Testing')).toBeInTheDocument();
        expect(screen.getByText('Documentation')).toBeInTheDocument();
        expect(screen.getByText('Review')).toBeInTheDocument();
      });
    });

    it('should display token counts', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('200')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('should display estimated durations', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('5 min')).toBeInTheDocument();
        expect(screen.getByText('10 min')).toBeInTheDocument();
        expect(screen.getByText('8 min')).toBeInTheDocument();
      });
    });

    it('should display complexity badges', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const badges = screen.getAllByText('Simple');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should display stage and substage metadata', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Stage: plan/)).toBeInTheDocument();
        expect(screen.getByText(/→ requirements/)).toBeInTheDocument();
      });
    });

    it('should show availability status icons', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const commands = screen.getByText('Run tests').closest('.border');
        expect(commands).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('should show total command count', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Total: 3/)).toBeInTheDocument();
      });
    });

    it('should show available command count', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Available: 2/)).toBeInTheDocument();
      });
    });

    it('should show relevant command count when task is provided', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
          task={MOCK_TASK}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Relevant for plan: 1/)).toBeInTheDocument();
      });
    });

    it('should not show relevant count without task', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Relevant for/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should reload commands when refresh button is clicked', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(claudeCommandsService.discoverCommands).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByText('Refresh Commands');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(claudeCommandsService.discoverCommands).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button in header is clicked', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Claude Commands')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when close button in footer is clicked', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Claude Commands')).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByText('Close');
      const footerCloseButton = closeButtons.find(btn =>
        btn.closest('.bg-gray-50')
      );

      fireEvent.click(footerCloseButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle command discovery errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      claudeCommandsService.discoverCommands.mockRejectedValue(new Error('Discovery failed'));

      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load commands:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });

    it('should show empty state when no commands are discovered', async () => {
      claudeCommandsService.discoverCommands.mockResolvedValue({
        discovered: [],
      });

      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No commands found matching your criteria')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should not load commands when not open', () => {
      render(
        <CommandsPalette
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(claudeCommandsService.discoverCommands).not.toHaveBeenCalled();
    });

    it('should reload commands when project changes', async () => {
      const { rerender } = render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(claudeCommandsService.discoverCommands).toHaveBeenCalledTimes(1);
      });

      mockStore.selectedProject = { ...MOCK_PROJECT, id: 'project-2' };
      useKanbanStore.mockReturnValue(mockStore);

      rerender(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(claudeCommandsService.discoverCommands).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing project gracefully', async () => {
      mockStore.selectedProject = null;
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(claudeCommandsService.discoverCommands).not.toHaveBeenCalled();
    });

    it('should handle commands without metadata', async () => {
      const commandsWithoutMetadata = [
        {
          ...MOCK_COMMANDS[0],
          metadata: undefined,
        },
      ];

      claudeCommandsService.discoverCommands.mockResolvedValue({
        discovered: commandsWithoutMetadata,
      });

      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run tests')).toBeInTheDocument();
      });
    });

    it('should handle missing token counts', async () => {
      const commandsWithoutTokens = [
        {
          ...MOCK_COMMANDS[0],
          tokenCount: undefined,
        },
      ];

      claudeCommandsService.discoverCommands.mockResolvedValue({
        discovered: commandsWithoutTokens,
      });

      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('should handle empty categories list', async () => {
      claudeCommandsService.getCategories.mockReturnValue([]);

      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Commands')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper modal overlay', async () => {
      const { container } = render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const overlay = container.querySelector('.modal-overlay');
        expect(overlay).toBeInTheDocument();
      });
    });

    it('should have proper modal content', async () => {
      const { container } = render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const content = container.querySelector('.modal-content');
        expect(content).toBeInTheDocument();
      });
    });

    it('should have searchable input', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search commands...');
        expect(searchInput).toHaveAttribute('type', 'text');
      });
    });

    it('should have selectable category dropdown', async () => {
      render(
        <CommandsPalette
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const categorySelect = screen.getByDisplayValue('All Commands');
        expect(categorySelect.tagName).toBe('SELECT');
      });
    });
  });
});
