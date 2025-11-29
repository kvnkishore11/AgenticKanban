/**
 * Tests for AgentLogsPanel Component
 * Tests agent-specific log filtering, display, search, and event type filtering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgentLogsPanel from '../AgentLogsPanel';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore');

// Mock window.confirm
global.confirm = vi.fn(() => true);

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('AgentLogsPanel Component', () => {
  let mockStore;

  // Agent-specific logs (thinking, tool_call, text, file_changed, tool_result)
  const mockAgentLogs = [
    {
      id: '1',
      timestamp: new Date('2024-01-01T10:00:00').toISOString(),
      entry_type: 'assistant',
      subtype: 'thinking',
      message: 'Analyzing the codebase structure...',
      content: 'Let me examine the project files to understand the architecture.'
    },
    {
      id: '2',
      timestamp: new Date('2024-01-01T10:01:00').toISOString(),
      entry_type: 'assistant',
      subtype: 'tool_call',
      message: 'Calling tool: Read',
      tool_name: 'Read',
      tool_input: { file_path: '/src/app.js' }
    },
    {
      id: '3',
      timestamp: new Date('2024-01-01T10:02:00').toISOString(),
      entry_type: 'result',
      subtype: 'tool_result',
      message: 'Tool result received',
      tool_name: 'Read',
      content: 'File contents here...'
    },
    {
      id: '4',
      timestamp: new Date('2024-01-01T10:03:00').toISOString(),
      entry_type: 'assistant',
      subtype: 'text',
      message: 'Based on my analysis, I recommend...',
      content: 'The application uses React with Zustand for state management.'
    },
    {
      id: '5',
      timestamp: new Date('2024-01-01T10:04:00').toISOString(),
      entry_type: 'assistant',
      subtype: 'file_changed',
      message: 'File modified: /src/utils/helper.js',
      file_path: '/src/utils/helper.js',
      change_type: 'modified'
    }
  ];

  // Non-agent logs (workflow/stage logs)
  const mockWorkflowLogs = [
    {
      id: '6',
      timestamp: new Date('2024-01-01T09:59:00').toISOString(),
      level: 'INFO',
      message: 'Starting planning workflow',
      current_step: 'Initialization'
    },
    {
      id: '7',
      timestamp: new Date('2024-01-01T10:05:00').toISOString(),
      level: 'SUCCESS',
      message: 'Workflow completed successfully',
      current_step: 'Finalization'
    }
  ];

  // Combined logs (both agent and workflow)
  const allLogs = [...mockWorkflowLogs, ...mockAgentLogs];

  beforeEach(() => {
    mockStore = {
      getWorkflowLogsForTask: vi.fn(() => allLogs),
      clearWorkflowLogsForTask: vi.fn(),
      getWebSocketStatus: vi.fn(() => ({ connected: true, connecting: false }))
    };

    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the panel with agent logs indicator', () => {
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('Agent Logs')).toBeInTheDocument();
    });

    it('should filter and display only agent-specific logs', () => {
      render(<AgentLogsPanel taskId="task-1" />);

      // Should show 5 agent logs (not the 2 workflow logs)
      expect(screen.getByText('5 entries')).toBeInTheDocument();
    });

    it('should display connection status as connected', () => {
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should display connection status as disconnected', () => {
      mockStore.getWebSocketStatus.mockReturnValue({ connected: false, connecting: false });
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should show empty state when no agent logs', () => {
      // Return only workflow logs (no agent logs)
      mockStore.getWorkflowLogsForTask.mockReturnValue(mockWorkflowLogs);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('No Agent Logs')).toBeInTheDocument();
      expect(screen.getByText('Agent thinking and tool usage will appear here...')).toBeInTheDocument();
    });

    it('should show empty state when logs are null', () => {
      mockStore.getWorkflowLogsForTask.mockReturnValue(null);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('No Agent Logs')).toBeInTheDocument();
    });

    it('should show empty state when logs are empty array', () => {
      mockStore.getWorkflowLogsForTask.mockReturnValue([]);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('No Agent Logs')).toBeInTheDocument();
    });
  });

  describe('Agent Log Filtering by Entry Type', () => {
    it('should include thinking blocks', () => {
      const thinkingOnlyLogs = [mockAgentLogs[0]]; // thinking block
      mockStore.getWorkflowLogsForTask.mockReturnValue(thinkingOnlyLogs);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('1 entries')).toBeInTheDocument();
    });

    it('should include tool calls', () => {
      const toolCallLogs = [mockAgentLogs[1]]; // tool_call
      mockStore.getWorkflowLogsForTask.mockReturnValue(toolCallLogs);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('1 entries')).toBeInTheDocument();
    });

    it('should include tool results', () => {
      const toolResultLogs = [mockAgentLogs[2]]; // tool_result
      mockStore.getWorkflowLogsForTask.mockReturnValue(toolResultLogs);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('1 entries')).toBeInTheDocument();
    });

    it('should include text blocks', () => {
      const textLogs = [mockAgentLogs[3]]; // text
      mockStore.getWorkflowLogsForTask.mockReturnValue(textLogs);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('1 entries')).toBeInTheDocument();
    });

    it('should include file changed logs', () => {
      const fileChangedLogs = [mockAgentLogs[4]]; // file_changed
      mockStore.getWorkflowLogsForTask.mockReturnValue(fileChangedLogs);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('1 entries')).toBeInTheDocument();
    });

    it('should exclude workflow logs (INFO, SUCCESS, etc.)', () => {
      // Return only workflow logs
      mockStore.getWorkflowLogsForTask.mockReturnValue(mockWorkflowLogs);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('0 entries')).toBeInTheDocument();
    });
  });

  describe('Event Type Filter Menu', () => {
    it('should filter by THINKING event type', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      // Open filter menu
      const filterButton = screen.getByTitle('Filter by event type');
      fireEvent.click(filterButton);

      // Select THINKING filter
      const thinkingFilter = screen.getByRole('button', { name: /THINKING/i });
      fireEvent.click(thinkingFilter);

      await waitFor(() => {
        // Should only show 1 thinking log
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should filter by TOOL event type', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      // Open filter menu
      const filterButton = screen.getByTitle('Filter by event type');
      fireEvent.click(filterButton);

      // Select TOOL filter
      const toolFilter = screen.getByRole('button', { name: /TOOL/i });
      fireEvent.click(toolFilter);

      await waitFor(() => {
        // Should show 2 tool logs (tool_call + tool_result)
        expect(screen.getByText(/2.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should filter by FILE event type', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      // Open filter menu
      const filterButton = screen.getByTitle('Filter by event type');
      fireEvent.click(filterButton);

      // Select FILE filter
      const fileFilter = screen.getByRole('button', { name: /FILE/i });
      fireEvent.click(fileFilter);

      await waitFor(() => {
        // Should show 1 file_changed log
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should filter by TEXT event type', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      // Open filter menu
      const filterButton = screen.getByTitle('Filter by event type');
      fireEvent.click(filterButton);

      // Select TEXT filter
      const textFilter = screen.getByRole('button', { name: /TEXT/i });
      fireEvent.click(textFilter);

      await waitFor(() => {
        // Should show 1 text log
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should reset filter to ALL', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      // Open filter menu and select THINKING
      const filterButton = screen.getByTitle('Filter by event type');
      fireEvent.click(filterButton);

      const thinkingFilter = screen.getByRole('button', { name: /THINKING/i });
      fireEvent.click(thinkingFilter);

      // Open filter menu again and select ALL
      fireEvent.click(filterButton);

      // Find ALL in the dropdown menu
      const allButtons = screen.getAllByRole('button', { name: /ALL/i });
      const allFilterButton = allButtons.find(btn => btn.closest('.absolute'));
      fireEvent.click(allFilterButton);

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });
    });

    it('should close filter menu when clicking outside', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const filterButton = screen.getByTitle('Filter by event type');
      fireEvent.click(filterButton);

      // Menu should be visible
      const menuItems = screen.getAllByRole('button', { name: /THINKING/i });
      expect(menuItems.length).toBeGreaterThan(0);

      // Click on the overlay
      const overlay = document.querySelector('.fixed.inset-0.z-10');
      if (overlay) {
        fireEvent.click(overlay);
      }

      // Menu should close
      await waitFor(() => {
        const dropdown = document.querySelector('.absolute.right-0.top-full');
        expect(dropdown).not.toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should search logs by message', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'codebase' } });

      await waitFor(() => {
        // Should only match the thinking log
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should search logs by tool name', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'Read' } });

      await waitFor(() => {
        // Should match tool_call and tool_result (both have tool_name: Read)
        expect(screen.getByText(/2.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should search logs by file path', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'helper.js' } });

      await waitFor(() => {
        // Should match the file_changed log
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should search logs by content', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'Zustand' } });

      await waitFor(() => {
        // Should match the text log with Zustand in content
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should be case insensitive', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'CODEBASE' } });

      await waitFor(() => {
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should show no match message when search has no results', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent-term-xyz' } });

      await waitFor(() => {
        expect(screen.getByText('No logs match the current filters')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-scroll', () => {
    it('should have auto-scroll enabled by default', () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const autoScrollButton = screen.getByTitle('Toggle auto-scroll');
      expect(autoScrollButton).toHaveClass('bg-purple-600');
    });

    it('should toggle auto-scroll', () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const autoScrollButton = screen.getByTitle('Toggle auto-scroll');
      fireEvent.click(autoScrollButton);

      expect(autoScrollButton).toHaveClass('bg-white');

      fireEvent.click(autoScrollButton);
      expect(autoScrollButton).toHaveClass('bg-purple-600');
    });

    it('should respect autoScrollDefault prop', () => {
      render(<AgentLogsPanel taskId="task-1" autoScrollDefault={false} />);

      const autoScrollButton = screen.getByTitle('Toggle auto-scroll');
      expect(autoScrollButton).toHaveClass('bg-white');
    });
  });

  describe('Actions', () => {
    it('should clear logs when clear button is clicked', () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const clearButton = screen.getByTitle('Clear all logs');
      fireEvent.click(clearButton);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to clear all logs?');
      expect(mockStore.clearWorkflowLogsForTask).toHaveBeenCalledWith('task-1');
    });

    it('should not clear logs if confirmation is cancelled', () => {
      global.confirm.mockReturnValueOnce(false);
      render(<AgentLogsPanel taskId="task-1" />);

      const clearButton = screen.getByTitle('Clear all logs');
      fireEvent.click(clearButton);

      expect(mockStore.clearWorkflowLogsForTask).not.toHaveBeenCalled();
    });

    it('should jump to latest when button is clicked', () => {
      render(<AgentLogsPanel taskId="task-1" />);

      const jumpButton = screen.getByTitle('Jump to latest');
      fireEvent.click(jumpButton);

      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('should use custom maxHeight', () => {
      const { container } = render(<AgentLogsPanel taskId="task-1" maxHeight="600px" />);

      const logsContainer = container.querySelector('.flex-1.overflow-y-auto');
      expect(logsContainer).toHaveStyle({ maxHeight: '600px' });
    });

    it('should call getWorkflowLogsForTask with correct taskId', () => {
      render(<AgentLogsPanel taskId="task-123" />);

      expect(mockStore.getWorkflowLogsForTask).toHaveBeenCalledWith('task-123');
    });
  });

  describe('Combined Filtering', () => {
    it('should apply both event type filter and search together', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      // First filter by TOOL
      const filterButton = screen.getByTitle('Filter by event type');
      fireEvent.click(filterButton);

      const toolFilter = screen.getByRole('button', { name: /TOOL/i });
      fireEvent.click(toolFilter);

      // Then search for "Read"
      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'Read' } });

      await waitFor(() => {
        // Should show 2 tool logs that match "Read"
        expect(screen.getByText(/2.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should show no match when filter and search have no overlap', async () => {
      render(<AgentLogsPanel taskId="task-1" />);

      // Filter by FILE
      const filterButton = screen.getByTitle('Filter by event type');
      fireEvent.click(filterButton);

      const fileFilter = screen.getByRole('button', { name: /FILE/i });
      fireEvent.click(fileFilter);

      // Search for something only in thinking logs
      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'codebase' } });

      await waitFor(() => {
        expect(screen.getByText('No logs match the current filters')).toBeInTheDocument();
      });
    });
  });

  describe('Stage Filtering', () => {
    it('should include logs without agent_role when filtering by stage', () => {
      // Logs from thinking_block events typically don't have agent_role
      const logsWithoutAgentRole = [
        {
          id: '1',
          timestamp: new Date('2024-01-01T10:00:00').toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Analyzing the codebase...'
          // No agent_role or source field
        },
        {
          id: '2',
          timestamp: new Date('2024-01-01T10:01:00').toISOString(),
          entry_type: 'assistant',
          subtype: 'tool_call',
          message: 'Calling tool: Read',
          tool_name: 'Read'
          // No agent_role or source field
        }
      ];
      mockStore.getWorkflowLogsForTask.mockReturnValue(logsWithoutAgentRole);

      // Render with stage filter
      render(<AgentLogsPanel taskId="task-1" stage="plan" />);

      // Both logs should be shown even though they don't have agent_role
      expect(screen.getByText('2 entries')).toBeInTheDocument();
    });

    it('should filter logs with agent_role by stage', () => {
      const logsWithAgentRole = [
        {
          id: '1',
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Planning analysis...',
          agent_role: 'sdlc_planner'
        },
        {
          id: '2',
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Implementation analysis...',
          agent_role: 'sdlc_implementor'
        }
      ];
      mockStore.getWorkflowLogsForTask.mockReturnValue(logsWithAgentRole);

      // Filter by plan stage - should only show planner logs
      // The implementor log should be filtered out since it has a non-matching agent_role
      render(<AgentLogsPanel taskId="task-1" stage="plan" />);

      // Only planner log should be shown
      expect(screen.getByText('1 entries')).toBeInTheDocument();
    });

    it('should show all agent logs when no stage filter is applied', () => {
      const mixedLogs = [
        {
          id: '1',
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Planning...',
          agent_role: 'sdlc_planner'
        },
        {
          id: '2',
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'No role log...'
          // No agent_role
        }
      ];
      mockStore.getWorkflowLogsForTask.mockReturnValue(mixedLogs);

      // Render without stage filter
      render(<AgentLogsPanel taskId="task-1" />);

      // Both logs should be shown
      expect(screen.getByText('2 entries')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle logs with missing optional fields', () => {
      const minimalLogs = [
        {
          id: '1',
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Thinking...'
        }
      ];
      mockStore.getWorkflowLogsForTask.mockReturnValue(minimalLogs);
      render(<AgentLogsPanel taskId="task-1" />);

      expect(screen.getByText('1 entries')).toBeInTheDocument();
    });

    it('should handle undefined entry_type gracefully', () => {
      const logsWithUndefinedType = [
        { id: '1', message: 'Test log without entry_type' },
        ...mockAgentLogs
      ];
      mockStore.getWorkflowLogsForTask.mockReturnValue(logsWithUndefinedType);
      render(<AgentLogsPanel taskId="task-1" />);

      // Should still show 5 agent logs (excluding the one without entry_type)
      expect(screen.getByText('5 entries')).toBeInTheDocument();
    });

    it('should handle logs with unknown subtype', () => {
      const logsWithUnknownSubtype = [
        {
          id: '1',
          entry_type: 'assistant',
          subtype: 'unknown_type',
          message: 'Unknown subtype log'
        },
        ...mockAgentLogs
      ];
      mockStore.getWorkflowLogsForTask.mockReturnValue(logsWithUnknownSubtype);
      render(<AgentLogsPanel taskId="task-1" />);

      // Should still show only 5 agent logs (excluding unknown subtype)
      expect(screen.getByText('5 entries')).toBeInTheDocument();
    });
  });
});
