/**
 * Tests for WorkflowLogViewer Component
 * Tests workflow log display with filtering, search, and export
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkflowLogViewer from '../WorkflowLogViewer';

// Mock DetailedLogEntry
vi.mock('../DetailedLogEntry', () => ({
  default: ({ log, index }) => (
    <div data-testid={`detailed-log-${index}`}>
      {log.message}
    </div>
  )
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('WorkflowLogViewer Component', () => {
  const mockLogs = [
    {
      id: '1',
      timestamp: '2024-01-01T10:00:00Z',
      level: 'INFO',
      message: 'Process started',
      current_step: 'Initialization'
    },
    {
      id: '2',
      timestamp: '2024-01-01T10:01:00Z',
      level: 'SUCCESS',
      message: 'Build completed',
      current_step: 'Build',
      progress_percent: 50
    },
    {
      id: '3',
      timestamp: '2024-01-01T10:02:00Z',
      level: 'WARNING',
      message: 'Deprecated API used',
      current_step: 'Validation'
    },
    {
      id: '4',
      timestamp: '2024-01-01T10:03:00Z',
      level: 'ERROR',
      message: 'Test failed',
      current_step: 'Testing',
      details: 'Test case XYZ failed'
    },
    {
      id: '5',
      timestamp: '2024-01-01T10:04:00Z',
      level: 'INFO',
      message: 'Cleanup started',
      workflow_name: 'test-workflow'
    }
  ];

  const mockLogsWithRichData = [
    {
      id: '1',
      timestamp: '2024-01-01T10:00:00Z',
      level: 'INFO',
      message: 'Tool executed',
      entry_type: 'tool_use',
      tool_name: 'compiler',
      usage: { tokens: 100 }
    }
  ];

  describe('Rendering', () => {
    it('should render with logs', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      expect(screen.getByText('Workflow Logs')).toBeInTheDocument();
      expect(screen.getByText(/5.*entries/)).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<WorkflowLogViewer logs={mockLogs} title="Custom Logs" />);

      expect(screen.getByText('Custom Logs')).toBeInTheDocument();
    });

    it('should display log messages', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      expect(screen.getByText('Process started')).toBeInTheDocument();
      expect(screen.getByText('Build completed')).toBeInTheDocument();
      expect(screen.getByText('Test failed')).toBeInTheDocument();
    });

    it('should display current step titles', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      expect(screen.getByText('Initialization')).toBeInTheDocument();
      expect(screen.getByText('Build')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
    });

    it('should show empty state when no logs', () => {
      render(<WorkflowLogViewer logs={[]} />);

      expect(screen.getByText('No logs yet')).toBeInTheDocument();
    });

    it('should handle null logs gracefully', () => {
      render(<WorkflowLogViewer logs={null} />);

      expect(screen.getByText('No logs yet')).toBeInTheDocument();
    });

    it('should handle undefined logs gracefully', () => {
      render(<WorkflowLogViewer logs={undefined} />);

      expect(screen.getByText('No logs yet')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should be expanded by default', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      expect(screen.getByText('Process started')).toBeInTheDocument();
    });

    it('should collapse when collapse button is clicked', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const collapseButton = screen.getByLabelText('Collapse logs');
      fireEvent.click(collapseButton);

      expect(screen.queryByText('Process started')).not.toBeInTheDocument();
    });

    it('should expand when expand button is clicked', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const collapseButton = screen.getByLabelText('Collapse logs');
      fireEvent.click(collapseButton);

      const expandButton = screen.getByLabelText('Expand logs');
      fireEvent.click(expandButton);

      expect(screen.getByText('Process started')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter logs by level', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'ERROR' } });

      expect(screen.getByText('Test failed')).toBeInTheDocument();
      expect(screen.queryByText('Process started')).not.toBeInTheDocument();
    });

    it('should show all logs when filter is set to "all"', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'ERROR' } });
      fireEvent.change(filterSelect, { target: { value: 'all' } });

      expect(screen.getByText(/5.*entries/)).toBeInTheDocument();
    });

    it('should filter by SUCCESS level', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'SUCCESS' } });

      expect(screen.getByText('Build completed')).toBeInTheDocument();
      expect(screen.queryByText('Process started')).not.toBeInTheDocument();
    });

    it('should filter by WARNING level', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'WARNING' } });

      expect(screen.getByText('Deprecated API used')).toBeInTheDocument();
      expect(screen.queryByText('Process started')).not.toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should search logs by message', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'failed' } });

      expect(screen.getByText('Test failed')).toBeInTheDocument();
      expect(screen.queryByText('Process started')).not.toBeInTheDocument();
    });

    it('should search logs by current step', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'testing' } });

      expect(screen.getByText('Test failed')).toBeInTheDocument();
      expect(screen.queryByText('Process started')).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'BUILD' } });

      expect(screen.getByText('Build completed')).toBeInTheDocument();
    });

    it('should show no match message when search has no results', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No logs match the current filter')).toBeInTheDocument();
    });

    it('should combine search and filter', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'INFO' } });

      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'cleanup' } });

      expect(screen.getByText('Cleanup started')).toBeInTheDocument();
      expect(screen.queryByText('Process started')).not.toBeInTheDocument();
    });
  });

  describe('Auto-scroll', () => {
    it('should have auto-scroll enabled by default when autoScroll prop is true', () => {
      render(<WorkflowLogViewer logs={mockLogs} autoScroll={true} />);

      const autoScrollButton = screen.getByTitle(/Auto-scroll enabled/);
      expect(autoScrollButton).toHaveClass('bg-blue-100');
    });

    it('should toggle auto-scroll', () => {
      render(<WorkflowLogViewer logs={mockLogs} autoScroll={true} />);

      const autoScrollButton = screen.getByTitle(/Auto-scroll/);
      fireEvent.click(autoScrollButton);

      expect(autoScrollButton).toHaveClass('bg-gray-100');

      fireEvent.click(autoScrollButton);
      expect(autoScrollButton).toHaveClass('bg-blue-100');
    });
  });

  describe('Export', () => {
    it('should show export button when logs exist', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const exportButton = screen.getByTitle('Export logs');
      expect(exportButton).toBeInTheDocument();
    });

    it('should not show export button when no logs', () => {
      render(<WorkflowLogViewer logs={[]} />);

      expect(screen.queryByTitle('Export logs')).not.toBeInTheDocument();
    });

    it('should show export menu when export button is clicked', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const exportButton = screen.getByTitle('Export logs');
      fireEvent.click(exportButton);

      expect(screen.getByText('Export as Text')).toBeInTheDocument();
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    });

    it('should close export menu when clicking outside', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      const exportButton = screen.getByTitle('Export logs');
      fireEvent.click(exportButton);

      const overlay = document.querySelector('.fixed.inset-0.z-10');
      fireEvent.click(overlay);

      expect(screen.queryByText('Export as Text')).not.toBeInTheDocument();
    });

    it('should export as text when text export is clicked', () => {
      // Mock URL.createObjectURL
      const createObjectURLSpy = vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:mock-url');

      render(<WorkflowLogViewer logs={mockLogs} />);

      const exportButton = screen.getByTitle('Export logs');
      fireEvent.click(exportButton);

      const textExportButton = screen.getByText('Export as Text');
      fireEvent.click(textExportButton);

      expect(createObjectURLSpy).toHaveBeenCalled();

      createObjectURLSpy.mockRestore();
    });

    it('should export as JSON when JSON export is clicked', () => {
      // Mock URL.createObjectURL
      const createObjectURLSpy = vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:mock-url');

      render(<WorkflowLogViewer logs={mockLogs} />);

      const exportButton = screen.getByTitle('Export logs');
      fireEvent.click(exportButton);

      const jsonExportButton = screen.getByText('Export as JSON');
      fireEvent.click(jsonExportButton);

      expect(createObjectURLSpy).toHaveBeenCalled();

      createObjectURLSpy.mockRestore();
    });
  });

  describe('Clear Logs', () => {
    it('should show clear button when onClear is provided and logs exist', () => {
      const onClear = vi.fn();
      render(<WorkflowLogViewer logs={mockLogs} onClear={onClear} />);

      expect(screen.getByTitle('Clear logs')).toBeInTheDocument();
    });

    it('should not show clear button when onClear is not provided', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      expect(screen.queryByTitle('Clear logs')).not.toBeInTheDocument();
    });

    it('should not show clear button when no logs', () => {
      const onClear = vi.fn();
      render(<WorkflowLogViewer logs={[]} onClear={onClear} />);

      expect(screen.queryByTitle('Clear logs')).not.toBeInTheDocument();
    });

    it('should call onClear when clear button is clicked', () => {
      const onClear = vi.fn();
      render(<WorkflowLogViewer logs={mockLogs} onClear={onClear} />);

      const clearButton = screen.getByTitle('Clear logs');
      fireEvent.click(clearButton);

      expect(onClear).toHaveBeenCalled();
    });
  });

  describe('Timestamps', () => {
    it('should show timestamps by default', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      // Check for timestamp format (HH:MM:SS.mmm)
      const timestamps = document.querySelectorAll('.log-entry-timestamp');
      expect(timestamps.length).toBeGreaterThan(0);
    });

    it('should hide timestamps when showTimestamps is false', () => {
      render(<WorkflowLogViewer logs={mockLogs} showTimestamps={false} />);

      const timestamps = document.querySelectorAll('.log-entry-timestamp');
      expect(timestamps.length).toBe(0);
    });
  });

  describe('Log Metadata', () => {
    it('should display progress percentage when available', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display workflow name when available', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      expect(screen.getByText('test-workflow')).toBeInTheDocument();
    });

    it('should display error details when available', () => {
      render(<WorkflowLogViewer logs={mockLogs} />);

      expect(screen.getByText('Test case XYZ failed')).toBeInTheDocument();
    });
  });

  describe('Detailed View', () => {
    it('should auto-detect detailed view when rich data is present', () => {
      render(<WorkflowLogViewer logs={mockLogsWithRichData} />);

      expect(screen.getByTestId('detailed-log-0')).toBeInTheDocument();
    });

    it('should use simple view when no rich data', () => {
      const { container } = render(<WorkflowLogViewer logs={mockLogs} />);

      expect(container.querySelector('.log-entry')).toBeInTheDocument();
    });

    it('should respect detailedView prop when explicitly set', () => {
      render(<WorkflowLogViewer logs={mockLogs} detailedView={true} />);

      expect(screen.getByTestId('detailed-log-0')).toBeInTheDocument();
    });

    it('should use simple view when detailedView is false', () => {
      const { container } = render(
        <WorkflowLogViewer logs={mockLogsWithRichData} detailedView={false} />
      );

      expect(container.querySelector('.log-entry')).toBeInTheDocument();
    });
  });

  describe('Log Source Badge', () => {
    it('should show "Real-time" badge for "all" logs source', () => {
      render(<WorkflowLogViewer logs={mockLogs} logsSource="all" />);

      expect(screen.getByText('Real-time')).toBeInTheDocument();
    });

    it('should show "Historical" badge for stage-specific logs', () => {
      render(<WorkflowLogViewer logs={mockLogs} logsSource="plan" />);

      expect(screen.getByText('Historical')).toBeInTheDocument();
    });
  });

  describe('Empty State with Debug Info', () => {
    it('should show task and ADW IDs when provided', () => {
      render(
        <WorkflowLogViewer
          logs={[]}
          taskId="task-123"
          adwId="adw-456"
          websocketConnected={true}
        />
      );

      expect(screen.getByText(/Task ID: task-123/)).toBeInTheDocument();
      expect(screen.getByText(/ADW ID: adw-456/)).toBeInTheDocument();
    });

    it('should show WebSocket connection status', () => {
      render(
        <WorkflowLogViewer
          logs={[]}
          adwId="adw-456"
          websocketConnected={true}
        />
      );

      expect(screen.getByText(/WebSocket: Connected/)).toBeInTheDocument();
    });

    it('should show disconnected status when WebSocket is disconnected', () => {
      render(
        <WorkflowLogViewer
          logs={[]}
          adwId="adw-456"
          websocketConnected={false}
        />
      );

      expect(screen.getByText(/WebSocket: Disconnected/)).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should use custom maxHeight', () => {
      const { container } = render(
        <WorkflowLogViewer logs={mockLogs} maxHeight="400px" />
      );

      const logContainer = container.querySelector('.overflow-y-auto');
      expect(logContainer).toHaveStyle({ maxHeight: '400px' });
    });

    it('should use default maxHeight of 300px', () => {
      const { container } = render(<WorkflowLogViewer logs={mockLogs} />);

      const logContainer = container.querySelector('.overflow-y-auto');
      expect(logContainer).toHaveStyle({ maxHeight: '300px' });
    });
  });

  describe('Log Ordering', () => {
    it('should display logs in reverse chronological order', () => {
      const { container } = render(<WorkflowLogViewer logs={mockLogs} />);

      const logMessages = container.querySelectorAll('.log-entry-description');
      const messagesText = Array.from(logMessages).map(el => el.textContent);

      // Newest logs should appear first
      expect(messagesText[0]).toContain('Cleanup started');
      expect(messagesText[messagesText.length - 1]).toContain('Process started');
    });
  });

  describe('Console Logging', () => {
    it('should log when logs prop changes', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<WorkflowLogViewer logs={mockLogs} taskId="task-1" />);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WorkflowLogViewer]'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle logs without timestamps', () => {
      const logsWithoutTimestamps = [
        { id: '1', level: 'INFO', message: 'Test' }
      ];

      render(<WorkflowLogViewer logs={logsWithoutTimestamps} />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle logs without levels', () => {
      const logsWithoutLevels = [
        { id: '1', message: 'Test message', timestamp: '2024-01-01T10:00:00Z' }
      ];

      render(<WorkflowLogViewer logs={logsWithoutLevels} />);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should handle logs without messages', () => {
      const logsWithoutMessages = [
        { id: '1', level: 'INFO', timestamp: '2024-01-01T10:00:00Z' }
      ];

      render(<WorkflowLogViewer logs={logsWithoutMessages} />);
      expect(screen.getByText('Workflow Logs')).toBeInTheDocument();
    });

    it('should handle very long log messages', () => {
      const longMessage = 'A'.repeat(10000);
      const longLogs = [
        { id: '1', level: 'INFO', message: longMessage, timestamp: '2024-01-01T10:00:00Z' }
      ];

      render(<WorkflowLogViewer logs={longLogs} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });
});
