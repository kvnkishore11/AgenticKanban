/**
 * Tests for AgentLogsPanel Component
 * Tests agent-specific log filtering, display, search, event type filtering,
 * and stage-specific API fetching for log isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AgentLogsPanel from '../AgentLogsPanel';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore');

// Mock window.confirm
global.confirm = vi.fn(() => true);

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock window.APP_CONFIG
Object.defineProperty(window, 'APP_CONFIG', {
  value: { WS_PORT: 8500 },
  writable: true
});

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

  // Mock API response for stage-specific logs
  const mockApiResponse = (logs) => ({
    ok: true,
    json: () => Promise.resolve({ logs })
  });

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockStore = {
      getWorkflowLogsForTask: vi.fn(() => allLogs),
      clearWorkflowLogsForTask: vi.fn(),
      getWebSocketStatus: vi.fn(() => ({ connected: true, connecting: false }))
    };

    useKanbanStore.mockReturnValue(mockStore);

    // Default fetch mock - return empty logs
    global.fetch.mockResolvedValue(mockApiResponse([]));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render the panel with agent logs indicator', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      expect(screen.getByText('Agent Logs')).toBeInTheDocument();
    });

    it('should filter and display only agent-specific logs', async () => {
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        // Should show 5 agent logs
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });
    });

    it('should show empty state when no agent logs', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('No Agent Logs')).toBeInTheDocument();
      });
    });

    it('should show empty state with stage-specific message when no logs', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('No Agent Logs')).toBeInTheDocument();
        expect(screen.getByText(/No PLAN stage logs yet/i)).toBeInTheDocument();
      });
    });

    it('should show generic empty state when no adwId/stage provided', async () => {
      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" />);
      });

      expect(screen.getByText('No Agent Logs')).toBeInTheDocument();
      expect(screen.getByText('Agent thinking and tool usage will appear here...')).toBeInTheDocument();
    });
  });

  describe('Agent Log Filtering by Entry Type', () => {
    it('should include thinking blocks', async () => {
      const thinkingOnlyLogs = [mockAgentLogs[0]]; // thinking block
      global.fetch.mockResolvedValue(mockApiResponse(thinkingOnlyLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('1 entries')).toBeInTheDocument();
      });
    });

    it('should include tool calls', async () => {
      const toolCallLogs = [mockAgentLogs[1]]; // tool_call
      global.fetch.mockResolvedValue(mockApiResponse(toolCallLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('1 entries')).toBeInTheDocument();
      });
    });

    it('should include tool results', async () => {
      const toolResultLogs = [mockAgentLogs[2]]; // tool_result
      global.fetch.mockResolvedValue(mockApiResponse(toolResultLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('1 entries')).toBeInTheDocument();
      });
    });

    it('should include text blocks', async () => {
      const textLogs = [mockAgentLogs[3]]; // text
      global.fetch.mockResolvedValue(mockApiResponse(textLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('1 entries')).toBeInTheDocument();
      });
    });

    it('should include file changed logs', async () => {
      const fileChangedLogs = [mockAgentLogs[4]]; // file_changed
      global.fetch.mockResolvedValue(mockApiResponse(fileChangedLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('1 entries')).toBeInTheDocument();
      });
    });

    it('should exclude workflow logs (INFO, SUCCESS, etc.)', async () => {
      // Return only workflow logs - should be filtered out
      global.fetch.mockResolvedValue(mockApiResponse(mockWorkflowLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('0 entries')).toBeInTheDocument();
      });
    });
  });

  describe('Event Type Filter Menu', () => {
    it('should filter by THINKING event type', async () => {
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      // Wait for logs to load
      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

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
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

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
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

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
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

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
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

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
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

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
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'codebase' } });

      await waitFor(() => {
        // Should only match the thinking log
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should search logs by tool name', async () => {
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'Read' } });

      await waitFor(() => {
        // Should match tool_call and tool_result (both have tool_name: Read)
        expect(screen.getByText(/2.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should search logs by file path', async () => {
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'helper.js' } });

      await waitFor(() => {
        // Should match the file_changed log
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should search logs by content (via details field)', async () => {
      // Test search by content using the details field since content = message || details || ''
      const logsWithDetails = [
        {
          id: '1',
          timestamp: new Date('2024-01-01T10:00:00').toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: '', // Empty message so details is used for content
          details: 'The application uses React with Zustand for state management.'
        },
        {
          id: '2',
          timestamp: new Date('2024-01-01T10:01:00').toISOString(),
          entry_type: 'assistant',
          subtype: 'text',
          message: 'Some other message'
        }
      ];
      global.fetch.mockResolvedValue(mockApiResponse(logsWithDetails));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('2 entries')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'Zustand' } });

      await waitFor(() => {
        // Should match the thinking log with Zustand in details (transformed to content)
        expect(screen.getByText(/1.*\/.*2.*entries/)).toBeInTheDocument();
      });
    });

    it('should be case insensitive', async () => {
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'CODEBASE' } });

      await waitFor(() => {
        expect(screen.getByText(/1.*\/.*5.*entries/)).toBeInTheDocument();
      });
    });

    it('should show no match message when search has no results', async () => {
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search agent logs...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent-term-xyz' } });

      await waitFor(() => {
        expect(screen.getByText('No logs match the current filters')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-scroll', () => {
    it('should have auto-scroll enabled by default', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      const autoScrollButton = screen.getByTitle('Toggle auto-scroll');
      expect(autoScrollButton).toHaveClass('bg-purple-600');
    });

    it('should toggle auto-scroll', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      const autoScrollButton = screen.getByTitle('Toggle auto-scroll');
      fireEvent.click(autoScrollButton);

      expect(autoScrollButton).toHaveClass('bg-white');

      fireEvent.click(autoScrollButton);
      expect(autoScrollButton).toHaveClass('bg-purple-600');
    });

    it('should respect autoScrollDefault prop', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" autoScrollDefault={false} />);
      });

      const autoScrollButton = screen.getByTitle('Toggle auto-scroll');
      expect(autoScrollButton).toHaveClass('bg-white');
    });
  });

  describe('Actions', () => {
    it('should jump to latest when button is clicked', async () => {
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

      const jumpButton = screen.getByTitle('Jump to latest');
      fireEvent.click(jumpButton);

      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('should use custom maxHeight', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        const { container } = render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" maxHeight="600px" />);
      });

      // The component uses maxHeight style on the logs container
    });

    it('should fetch from API with correct adwId and stage', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-123" adwId="adw-456" stage="build" />);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8500/api/stage-logs/adw-456/build'
        );
      });
    });
  });

  describe('Combined Filtering', () => {
    it('should apply both event type filter and search together', async () => {
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

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
      global.fetch.mockResolvedValue(mockApiResponse(mockAgentLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });

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

  describe('Stage-Specific API Fetching', () => {
    it('should fetch logs from stage-specific API endpoint when adwId and stage are provided', async () => {
      const planLogs = [
        {
          timestamp: new Date('2024-01-01T10:00:00').toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Planning the feature...'
        }
      ];
      global.fetch.mockResolvedValue(mockApiResponse(planLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8500/api/stage-logs/adw-123/plan'
        );
      });
    });

    it('should display stage badge when stage prop is provided', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="build" />);
      });

      // The stage badge has text "build" but CSS uppercase transforms it visually to "BUILD"
      // Testing Library matches actual text content, not visual representation
      const stageBadge = screen.getByText('build');
      expect(stageBadge).toBeInTheDocument();
      expect(stageBadge).toHaveClass('uppercase');
    });

    it('should display logs fetched from API', async () => {
      const buildLogs = [
        {
          timestamp: new Date('2024-01-01T10:00:00').toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Implementing the feature...'
        },
        {
          timestamp: new Date('2024-01-01T10:01:00').toISOString(),
          entry_type: 'assistant',
          subtype: 'tool_use',
          message: 'Using Edit tool',
          tool_name: 'Edit'
        }
      ];
      global.fetch.mockResolvedValue(mockApiResponse(buildLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="build" />);
      });

      await waitFor(() => {
        expect(screen.getByText('2 entries')).toBeInTheDocument();
      });
    });

    it('should poll for new logs every 3 seconds', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      // Initial fetch
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance timers by 3 seconds
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // Should have fetched again
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Advance timers by another 3 seconds
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // Should have fetched a third time
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should not fetch from API when adwId is missing', async () => {
      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" stage="plan" />);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch from API when stage is missing', async () => {
      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" />);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('Error Loading Logs')).toBeInTheDocument();
      });
    });

    it('should show retry button on error and retry when clicked', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Reset mock to succeed
      global.fetch.mockResolvedValue(mockApiResponse([
        {
          timestamp: new Date().toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Now working...'
        }
      ]));

      await act(async () => {
        fireEvent.click(screen.getByText('Retry'));
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should display different logs for different stages', async () => {
      const planLogs = [
        {
          timestamp: new Date().toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Planning...'
        }
      ];
      const buildLogs = [
        {
          timestamp: new Date().toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Building...'
        },
        {
          timestamp: new Date().toISOString(),
          entry_type: 'assistant',
          subtype: 'tool_use',
          message: 'Using tool...',
          tool_name: 'Edit'
        }
      ];

      // First render with plan stage
      global.fetch.mockResolvedValue(mockApiResponse(planLogs));

      let rerenderFn;
      await act(async () => {
        const { rerender } = render(
          <AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />
        );
        rerenderFn = rerender;
      });

      // The stage badge text is lowercase, CSS transforms it to uppercase visually
      await waitFor(() => {
        expect(screen.getByText('plan')).toBeInTheDocument();
        expect(screen.getByText('1 entries')).toBeInTheDocument();
      });

      // Re-render with build stage
      global.fetch.mockResolvedValue(mockApiResponse(buildLogs));

      await act(async () => {
        rerenderFn(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="build" />);
      });

      await waitFor(() => {
        expect(screen.getByText('build')).toBeInTheDocument();
        expect(screen.getByText('2 entries')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching', async () => {
      // Create a promise that we can control
      let resolvePromise;
      const controlledPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      global.fetch.mockReturnValue(controlledPromise);

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      // Should show loading state
      expect(screen.getByText(/Loading Logs/i)).toBeInTheDocument();

      // Resolve the promise
      await act(async () => {
        resolvePromise(mockApiResponse([]));
      });
    });

    it('should show empty state with stage-specific message', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="test" />);
      });

      await waitFor(() => {
        expect(screen.getByText(/No TEST stage logs yet/i)).toBeInTheDocument();
      });
    });

    it('should clean up polling interval on unmount', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      const { unmount } = render(
        <AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />
      );

      // Unmount the component
      unmount();

      // Advance timers
      await act(async () => {
        vi.advanceTimersByTime(6000);
      });

      // Should only have the initial fetch call, not continued polling
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use correct API port (VITE_ADW_PORT env var or default 8500)', async () => {
      // Component uses import.meta.env.VITE_ADW_PORT || 8500
      // This is set at build time, so in tests it falls back to 8500
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8500/api/stage-logs/adw-123/plan'
        );
      });
    });

    it('should refresh logs when refresh button is clicked', async () => {
      global.fetch.mockResolvedValue(mockApiResponse([]));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      // Initial fetch
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Click refresh button
      const refreshButton = screen.getByTitle('Refresh logs');
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      // Should have fetched again
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Stage Log Filtering', () => {
    it('should filter out non-agent logs from API response', async () => {
      const mixedLogs = [
        // Agent logs (should be included)
        {
          timestamp: new Date().toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Thinking...'
        },
        {
          timestamp: new Date().toISOString(),
          entry_type: 'assistant',
          subtype: 'tool_use',
          message: 'Using tool',
          tool_name: 'Read'
        },
        // Non-agent logs (should be filtered out)
        {
          timestamp: new Date().toISOString(),
          entry_type: 'system',
          subtype: 'workflow',
          message: 'Workflow started'
        },
        {
          timestamp: new Date().toISOString(),
          entry_type: 'user',
          subtype: 'input',
          message: 'User input'
        }
      ];
      global.fetch.mockResolvedValue(mockApiResponse(mixedLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        // Should only show 2 agent logs, not all 4
        expect(screen.getByText('2 entries')).toBeInTheDocument();
      });
    });

    it('should include system init logs', async () => {
      const logsWithInit = [
        {
          timestamp: new Date().toISOString(),
          entry_type: 'system',
          subtype: 'init',
          message: 'Agent initialized'
        },
        {
          timestamp: new Date().toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Starting work...'
        }
      ];
      global.fetch.mockResolvedValue(mockApiResponse(logsWithInit));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        // Both logs should be shown (init + thinking)
        expect(screen.getByText('2 entries')).toBeInTheDocument();
      });
    });

    it('should include user entries with tool_result subtype', async () => {
      // This tests the fix for logs where user entries contain tool results
      // from content blocks (e.g., when backend derives subtype from message.content)
      const logsWithUserToolResult = [
        {
          timestamp: new Date().toISOString(),
          entry_type: 'user',
          subtype: 'tool_result',
          message: 'Tool result from Read tool',
          tool_name: 'Read',
          content: 'File contents here...'
        },
        {
          timestamp: new Date().toISOString(),
          entry_type: 'assistant',
          subtype: 'tool_use',
          message: 'Calling tool: Read',
          tool_name: 'Read'
        }
      ];
      global.fetch.mockResolvedValue(mockApiResponse(logsWithUserToolResult));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        // Both logs should be shown (user/tool_result + assistant/tool_use)
        expect(screen.getByText('2 entries')).toBeInTheDocument();
      });
    });

    it('should filter out user entries without tool_result subtype', async () => {
      const logsWithMixedUserEntries = [
        {
          timestamp: new Date().toISOString(),
          entry_type: 'user',
          subtype: 'tool_result',
          message: 'Tool result from Read tool'
        },
        {
          timestamp: new Date().toISOString(),
          entry_type: 'user',
          subtype: 'input',
          message: 'User input message (should be filtered out)'
        },
        {
          timestamp: new Date().toISOString(),
          entry_type: 'user',
          subtype: null,
          message: 'User message without subtype (should be filtered out)'
        },
        {
          timestamp: new Date().toISOString(),
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Thinking...'
        }
      ];
      global.fetch.mockResolvedValue(mockApiResponse(logsWithMixedUserEntries));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        // Should show only 2 logs: user/tool_result + assistant/thinking
        // (not the user/input or user/null entries)
        expect(screen.getByText('2 entries')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle logs with missing optional fields', async () => {
      const minimalLogs = [
        {
          entry_type: 'assistant',
          subtype: 'thinking',
          message: 'Thinking...'
        }
      ];
      global.fetch.mockResolvedValue(mockApiResponse(minimalLogs));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('1 entries')).toBeInTheDocument();
      });
    });

    it('should handle undefined entry_type gracefully', async () => {
      const logsWithUndefinedType = [
        { message: 'Test log without entry_type' },
        ...mockAgentLogs
      ];
      global.fetch.mockResolvedValue(mockApiResponse(logsWithUndefinedType));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        // Should still show 5 agent logs (excluding the one without entry_type)
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });
    });

    it('should handle logs with unknown subtype', async () => {
      const logsWithUnknownSubtype = [
        {
          entry_type: 'assistant',
          subtype: 'unknown_type',
          message: 'Unknown subtype log'
        },
        ...mockAgentLogs
      ];
      global.fetch.mockResolvedValue(mockApiResponse(logsWithUnknownSubtype));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        // Should still show only 5 agent logs (excluding unknown subtype)
        expect(screen.getByText('5 entries')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      await waitFor(() => {
        expect(screen.getByText('Error Loading Logs')).toBeInTheDocument();
      });
    });

    it('should handle empty API response', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ logs: null })
      });

      await act(async () => {
        render(<AgentLogsPanel taskId="task-1" adwId="adw-123" stage="plan" />);
      });

      // Should handle null logs gracefully
      await waitFor(() => {
        expect(screen.getByText('No Agent Logs')).toBeInTheDocument();
      });
    });
  });
});
