/**
 * Tests for LiveLogsPanel Component
 * Tests real-time log streaming, filtering, search, and connection status
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LiveLogsPanel from '../LiveLogsPanel';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore');

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock window.confirm
global.confirm = vi.fn(() => true);

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('LiveLogsPanel Component', () => {
  let mockStore;

  const mockLogs = [
    {
      id: '1',
      timestamp: new Date('2024-01-01T10:00:00').toISOString(),
      level: 'INFO',
      message: 'Starting workflow',
      current_step: 'Initialization',
      workflow_name: 'test-workflow'
    },
    {
      id: '2',
      timestamp: new Date('2024-01-01T10:01:00').toISOString(),
      level: 'SUCCESS',
      message: 'Workflow completed successfully',
      current_step: 'Finalization',
      progress_percent: 100
    },
    {
      id: '3',
      timestamp: new Date('2024-01-01T10:02:00').toISOString(),
      level: 'ERROR',
      message: 'An error occurred',
      current_step: 'Error Handling'
    },
    {
      id: '4',
      timestamp: new Date('2024-01-01T10:03:00').toISOString(),
      level: 'WARNING',
      message: 'Warning message',
      current_step: 'Validation'
    },
    {
      id: '5',
      timestamp: new Date('2024-01-01T10:04:00').toISOString(),
      level: 'DEBUG',
      message: 'Debug information',
      current_step: 'Debugging'
    },
    {
      id: '6',
      timestamp: new Date('2024-01-01T10:05:00').toISOString(),
      level: 'INFO',
      message: 'This is a very long message that exceeds the typical length threshold for display purposes and should trigger the expand/collapse functionality when rendered in the log viewer component because it contains more than 200 characters of text content',
      current_step: 'Long Message Test'
    }
  ];

  beforeEach(() => {
    mockStore = {
      getWorkflowLogsForTask: vi.fn(() => mockLogs),
      clearWorkflowLogsForTask: vi.fn(),
      getWebSocketStatus: vi.fn(() => ({ connected: true, connecting: false }))
    };

    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the panel with logs', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('Streaming')).toBeInTheDocument();
      expect(screen.getByText(/6.*entries/)).toBeInTheDocument();
    });

    it('should display connection status as connected', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should display connection status as disconnected', () => {
      mockStore.getWebSocketStatus.mockReturnValue({ connected: false, connecting: false });
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should render all log entries', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('Starting workflow')).toBeInTheDocument();
      expect(screen.getByText('Workflow completed successfully')).toBeInTheDocument();
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('should show empty state when no logs', () => {
      mockStore.getWorkflowLogsForTask.mockReturnValue([]);
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('No Logs Available')).toBeInTheDocument();
      expect(screen.getByText('Waiting for workflow to start...')).toBeInTheDocument();
    });

    it('should display log level icons', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('INFO', { selector: '.log-entry-level' })).toBeInTheDocument();
      expect(screen.getByText('SUCCESS', { selector: '.log-entry-level' })).toBeInTheDocument();
      expect(screen.getByText('ERROR', { selector: '.log-entry-level' })).toBeInTheDocument();
    });

    it('should display current step titles', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('Initialization')).toBeInTheDocument();
      expect(screen.getByText('Finalization')).toBeInTheDocument();
      expect(screen.getByText('Error Handling')).toBeInTheDocument();
    });

    it('should display progress percentage when available', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should display workflow name when available', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('test-workflow')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter logs by level', async () => {
      render(<LiveLogsPanel taskId="task-1" />);

      // Open filter menu
      const filterButton = screen.getByTitle('Filter by level');
      fireEvent.click(filterButton);

      // Select ERROR filter
      const errorFilter = screen.getByText('ERROR', { selector: 'button' });
      fireEvent.click(errorFilter);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
        expect(screen.queryByText('Starting workflow')).not.toBeInTheDocument();
      });
    });

    it('should show filtered count', async () => {
      render(<LiveLogsPanel taskId="task-1" />);

      // Open filter menu
      const filterButton = screen.getByTitle('Filter by level');
      fireEvent.click(filterButton);

      // Select ERROR filter
      const errorFilter = screen.getByText('ERROR', { selector: 'button' });
      fireEvent.click(errorFilter);

      await waitFor(() => {
        expect(screen.getByText(/1.*\/.*6.*entries/)).toBeInTheDocument();
      });
    });

    it('should reset filter to ALL', async () => {
      render(<LiveLogsPanel taskId="task-1" />);

      // Open filter menu and select ERROR
      const filterButton = screen.getByTitle('Filter by level');
      fireEvent.click(filterButton);
      fireEvent.click(screen.getByText('ERROR', { selector: 'button' }));

      // Open filter menu again and select ALL
      fireEvent.click(filterButton);
      fireEvent.click(screen.getByText('ALL'));

      await waitFor(() => {
        expect(screen.getByText(/6.*entries/)).toBeInTheDocument();
      });
    });

    it('should close filter menu when clicking outside', async () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const filterButton = screen.getByTitle('Filter by level');
      fireEvent.click(filterButton);

      // Menu should be visible
      expect(screen.getByText('ALL')).toBeInTheDocument();

      // Click on the overlay
      const overlay = document.querySelector('.fixed.inset-0.z-10');
      fireEvent.click(overlay);

      await waitFor(() => {
        expect(screen.queryByText('ALL')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should search logs by message', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'error' } });

      expect(screen.getByText('An error occurred')).toBeInTheDocument();
      expect(screen.queryByText('Starting workflow')).not.toBeInTheDocument();
    });

    it('should search logs by current step', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'initialization' } });

      expect(screen.getByText('Starting workflow')).toBeInTheDocument();
      expect(screen.queryByText('An error occurred')).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'ERROR' } });

      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('should show no match message when search has no results', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No logs match the current filters')).toBeInTheDocument();
    });
  });

  describe('Auto-scroll', () => {
    it('should have auto-scroll enabled by default', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const autoScrollButton = screen.getByTitle('Toggle auto-scroll');
      expect(autoScrollButton).toHaveClass('bg-blue-600');
    });

    it('should toggle auto-scroll', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const autoScrollButton = screen.getByTitle('Toggle auto-scroll');
      fireEvent.click(autoScrollButton);

      expect(autoScrollButton).toHaveClass('bg-white');

      fireEvent.click(autoScrollButton);
      expect(autoScrollButton).toHaveClass('bg-blue-600');
    });

    it('should respect autoScrollDefault prop', () => {
      render(<LiveLogsPanel taskId="task-1" autoScrollDefault={false} />);

      const autoScrollButton = screen.getByTitle('Toggle auto-scroll');
      expect(autoScrollButton).toHaveClass('bg-white');
    });
  });

  describe('Actions', () => {
    it('should clear logs when clear button is clicked', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const clearButton = screen.getByTitle('Clear all logs');
      fireEvent.click(clearButton);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to clear all logs?');
      expect(mockStore.clearWorkflowLogsForTask).toHaveBeenCalledWith('task-1');
    });

    it('should not clear logs if confirmation is cancelled', () => {
      global.confirm.mockReturnValueOnce(false);
      render(<LiveLogsPanel taskId="task-1" />);

      const clearButton = screen.getByTitle('Clear all logs');
      fireEvent.click(clearButton);

      expect(mockStore.clearWorkflowLogsForTask).not.toHaveBeenCalled();
    });

    it('should copy log message to clipboard', async () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const copyButtons = screen.getAllByTitle('Copy log message');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Starting workflow');
      });
    });
  });

  describe('Long Messages', () => {
    it('should show expand button for long messages', () => {
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('Show more')).toBeInTheDocument();
    });

    it('should expand/collapse long messages', async () => {
      render(<LiveLogsPanel taskId="task-1" />);

      const showMoreButton = screen.getByText('Show more');
      fireEvent.click(showMoreButton);

      await waitFor(() => {
        expect(screen.getByText('Show less')).toBeInTheDocument();
      });

      const showLessButton = screen.getByText('Show less');
      fireEvent.click(showLessButton);

      await waitFor(() => {
        expect(screen.getByText('Show more')).toBeInTheDocument();
      });
    });
  });

  describe('Props', () => {
    it('should use custom maxHeight', () => {
      const { container } = render(<LiveLogsPanel taskId="task-1" maxHeight="600px" />);

      const logsContainer = container.querySelector('.logs-container');
      expect(logsContainer).toHaveStyle({ maxHeight: '600px' });
    });

    it('should call getWorkflowLogsForTask with correct taskId', () => {
      render(<LiveLogsPanel taskId="task-123" />);

      expect(mockStore.getWorkflowLogsForTask).toHaveBeenCalledWith('task-123');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null logs gracefully', () => {
      mockStore.getWorkflowLogsForTask.mockReturnValue(null);
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('No Logs Available')).toBeInTheDocument();
    });

    it('should handle undefined logs gracefully', () => {
      mockStore.getWorkflowLogsForTask.mockReturnValue(undefined);
      render(<LiveLogsPanel taskId="task-1" />);

      expect(screen.getByText('No Logs Available')).toBeInTheDocument();
    });

    it('should handle logs without timestamps', () => {
      const logsWithoutTimestamp = [{ id: '1', level: 'INFO', message: 'Test' }];
      mockStore.getWorkflowLogsForTask.mockReturnValue(logsWithoutTimestamp);

      render(<LiveLogsPanel taskId="task-1" />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle logs without levels', () => {
      const logsWithoutLevel = [{ id: '1', message: 'Test message', timestamp: new Date().toISOString() }];
      mockStore.getWorkflowLogsForTask.mockReturnValue(logsWithoutLevel);

      render(<LiveLogsPanel taskId="task-1" />);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should handle logs without current_step', () => {
      const logsWithoutStep = [{ id: '1', level: 'INFO', message: 'Test', timestamp: new Date().toISOString() }];
      mockStore.getWorkflowLogsForTask.mockReturnValue(logsWithoutStep);

      render(<LiveLogsPanel taskId="task-1" />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});
