/**
 * Tests for AgentStateViewer Component
 * Comprehensive tests for agent state visualization including WebSocket updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentStateViewer from '../AgentStateViewer';
import agentStateStreamService from '../../../services/agentStateStreamService';

// Mock the agent state stream service
vi.mock('../../../services/agentStateStreamService', () => ({
  default: {
    subscribeToAgentState: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('AgentStateViewer Component', () => {
  const mockAdwId = 'adw_plan_build_test_issue_123';

  const mockAgentState = {
    adw_id: mockAdwId,
    issue_number: 123,
    branch_name: 'feature/test-branch',
    issue_class: 'feature',
    model_set: 'claude-sonnet-4',
    backend_port: 5001,
    frontend_port: 5173,
    completed: false,
    all_adws: ['plan', 'build', 'test'],
    data_source: 'github',
    issue_json: {
      title: 'Test Issue Title',
      body: 'Test issue body content',
      images: ['image1.png', 'image2.png']
    },
    worktree_path: '/path/to/worktree'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State and Loading', () => {
    it('should show loading state initially', () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AgentStateViewer adwId={mockAdwId} />);

      expect(screen.getByText('Loading agent state...')).toBeInTheDocument();
    });

    it('should fetch agent state on mount', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: mockAgentState })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/agent-state/${mockAdwId}`);
      });
    });

    it('should display error state when fetch fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Error loading agent state')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch agent state: Not Found')).toBeInTheDocument();
      });
    });

    it('should show error when no ADW ID provided', async () => {
      render(<AgentStateViewer adwId={null} />);

      await waitFor(() => {
        expect(screen.getByText('Error loading agent state')).toBeInTheDocument();
        expect(screen.getByText('No ADW ID provided')).toBeInTheDocument();
      });
    });

    it('should show empty state when no state data returned', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // Component gets empty object and treats data.state as undefined
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('No agent state available')).toBeInTheDocument();
      });
    });
  });

  describe('State Rendering', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: mockAgentState })
      });
    });

    it('should render agent workflow state header', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Agent Workflow State')).toBeInTheDocument();
      });
    });

    it('should display ADW ID', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('ADW ID')).toBeInTheDocument();
        expect(screen.getByText(mockAdwId)).toBeInTheDocument();
      });
    });

    it('should display issue number', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Issue #')).toBeInTheDocument();
        expect(screen.getByText('123')).toBeInTheDocument();
      });
    });

    it('should display branch name', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Branch Name')).toBeInTheDocument();
        expect(screen.getByText('feature/test-branch')).toBeInTheDocument();
      });
    });

    it('should display issue class', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Issue Class')).toBeInTheDocument();
        expect(screen.getByText('feature')).toBeInTheDocument();
      });
    });

    it('should display model set', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Model Set')).toBeInTheDocument();
        expect(screen.getByText('claude-sonnet-4')).toBeInTheDocument();
      });
    });

    it('should display port configuration', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Port Configuration')).toBeInTheDocument();
        expect(screen.getByText('5001')).toBeInTheDocument();
        expect(screen.getByText('5173')).toBeInTheDocument();
      });
    });

    it('should display executed stages', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Executed Stages')).toBeInTheDocument();
        expect(screen.getByText('plan')).toBeInTheDocument();
        expect(screen.getByText('build')).toBeInTheDocument();
        expect(screen.getByText('test')).toBeInTheDocument();
      });
    });

    it('should display data source', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Data Source')).toBeInTheDocument();
        expect(screen.getByText('github')).toBeInTheDocument();
      });
    });

    it('should show "In Progress" status when not completed', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });

    it('should show "Completed" status when completed', async () => {
      const completedState = { ...mockAgentState, completed: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: completedState })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        // Wait for component to finish rendering
        expect(screen.getByText('Agent Workflow State')).toBeInTheDocument();
      });

      // Component shows "Completed" in the status badge
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Issue Details Section', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: mockAgentState })
      });
    });

    it('should render issue details section with details element', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Issue Details')).toBeInTheDocument();
      });
    });

    it('should display issue title when expanded', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        const details = screen.getByText('Issue Details').closest('details');
        details.open = true;
        expect(screen.getByText('Test Issue Title')).toBeInTheDocument();
      });
    });

    it('should display issue body when expanded', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        const details = screen.getByText('Issue Details').closest('details');
        details.open = true;
        expect(screen.getByText('Test issue body content')).toBeInTheDocument();
      });
    });

    it('should display attached images count', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        const details = screen.getByText('Issue Details').closest('details');
        details.open = true;
        expect(screen.getByText(/Attached Images \(2\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Worktree Path Section', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: mockAgentState })
      });
    });

    it('should render worktree path section', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Worktree Path')).toBeInTheDocument();
      });
    });

    it('should display worktree path when expanded', async () => {
      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        const details = screen.getByText('Worktree Path').closest('details');
        details.open = true;
        expect(screen.getByText('/path/to/worktree')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Real-time Updates', () => {
    let mockUnsubscribe;

    beforeEach(() => {
      mockUnsubscribe = vi.fn();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: mockAgentState })
      });
    });

    it('should subscribe to agent state updates on mount', async () => {
      agentStateStreamService.subscribeToAgentState.mockReturnValue(mockUnsubscribe);

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(agentStateStreamService.subscribeToAgentState).toHaveBeenCalledWith(
          mockAdwId,
          expect.any(Function)
        );
      });
    });

    it('should unsubscribe on unmount', async () => {
      agentStateStreamService.subscribeToAgentState.mockReturnValue(mockUnsubscribe);

      const { unmount } = render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(agentStateStreamService.subscribeToAgentState).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should display live indicator when receiving updates', async () => {
      let updateCallback;
      agentStateStreamService.subscribeToAgentState.mockImplementation((id, callback) => {
        updateCallback = callback;
        return mockUnsubscribe;
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(agentStateStreamService.subscribeToAgentState).toHaveBeenCalled();
      });

      // Simulate receiving an update
      updateCallback({ ...mockAgentState, completed: true });

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });
    });

    it('should update state when receiving real-time updates', async () => {
      let updateCallback;
      agentStateStreamService.subscribeToAgentState.mockImplementation((id, callback) => {
        updateCallback = callback;
        return mockUnsubscribe;
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(agentStateStreamService.subscribeToAgentState).toHaveBeenCalled();
      });

      // Simulate receiving an update with new data
      updateCallback({
        ...mockAgentState,
        completed: true,
        all_adws: ['plan', 'build', 'test', 'review']
      });

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('review')).toBeInTheDocument();
      });
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render issue number section when not provided', async () => {
      const stateWithoutIssueNumber = { ...mockAgentState };
      delete stateWithoutIssueNumber.issue_number;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: stateWithoutIssueNumber })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.queryByText('Issue #')).not.toBeInTheDocument();
      });
    });

    it('should not render branch name section when not provided', async () => {
      const stateWithoutBranch = { ...mockAgentState };
      delete stateWithoutBranch.branch_name;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: stateWithoutBranch })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.queryByText('Branch Name')).not.toBeInTheDocument();
      });
    });

    it('should not render port configuration when ports not provided', async () => {
      const stateWithoutPorts = { ...mockAgentState };
      delete stateWithoutPorts.backend_port;
      delete stateWithoutPorts.frontend_port;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: stateWithoutPorts })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.queryByText('Port Configuration')).not.toBeInTheDocument();
      });
    });

    it('should not render executed stages when empty', async () => {
      const stateWithoutStages = { ...mockAgentState };
      delete stateWithoutStages.all_adws;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: stateWithoutStages })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.queryByText('Executed Stages')).not.toBeInTheDocument();
      });
    });

    it('should not render issue details when not provided', async () => {
      const stateWithoutIssueJson = { ...mockAgentState };
      delete stateWithoutIssueJson.issue_json;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: stateWithoutIssueJson })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.queryByText('Issue Details')).not.toBeInTheDocument();
      });
    });

    it('should not render worktree path when not provided', async () => {
      const stateWithoutWorktree = { ...mockAgentState };
      delete stateWithoutWorktree.worktree_path;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: stateWithoutWorktree })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.queryByText('Worktree Path')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Error loading agent state')).toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle malformed JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.getByText('Error loading agent state')).toBeInTheDocument();
      });
    });

    it('should re-fetch when adwId changes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ state: mockAgentState })
      });

      const { rerender } = render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      const newAdwId = 'adw_plan_build_issue_456';
      rerender(<AgentStateViewer adwId={newAdwId} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenLastCalledWith(`/api/agent-state/${newAdwId}`);
      });
    });

    it('should handle empty arrays in all_adws', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: { ...mockAgentState, all_adws: [] }
        })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        expect(screen.queryByText('Executed Stages')).not.toBeInTheDocument();
      });
    });

    it('should handle missing issue_json properties', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            ...mockAgentState,
            issue_json: { title: 'Only Title' }
          }
        })
      });

      render(<AgentStateViewer adwId={mockAdwId} />);

      await waitFor(() => {
        const details = screen.getByText('Issue Details').closest('details');
        details.open = true;
        expect(screen.getByText('Only Title')).toBeInTheDocument();
      });
    });
  });
});
