/**
 * Integration tests for Mark Task as Complete feature
 *
 * Tests the end-to-end flow from UI interaction to backend API call
 * and state updates across the application.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { useKanbanStore } from '../../stores/kanbanStore';
import KanbanCard from '../../components/kanban/KanbanCard';
import CardExpandModal from '../../components/kanban/CardExpandModal';

// Mock all required services
vi.mock('../../services/api/adwService', () => ({
  default: {
    getAllPipelines: vi.fn(() => [
      { id: 'full-stack', name: 'Full Stack', stages: ['plan', 'build', 'test', 'review', 'document'] }
    ]),
    openWorktree: vi.fn(() => Promise.resolve({ success: true })),
    openCodebase: vi.fn(() => Promise.resolve({ success: true })),
    openInIDE: vi.fn(() => Promise.resolve({ success: true })),
    getPlanContent: vi.fn(() => Promise.resolve({ content: '# Plan' }))
  }
}));

vi.mock('../../services/adwCreationService', () => ({
  default: {
    createAdwConfiguration: vi.fn()
  }
}));

// Mock adwDbService
vi.mock('../../services/api/adwDbService', () => ({
  default: {
    updateAdw: vi.fn(),
    getAdw: vi.fn(),
    getAllAdws: vi.fn(() => Promise.resolve([])),
    createAdw: vi.fn(),
    deleteAdw: vi.fn()
  }
}));

vi.mock('../../services/storage/localStorage', () => ({
  default: {
    getItem: vi.fn(() => []),
    setItem: vi.fn(() => true),
    removeItem: vi.fn(() => true),
    clear: vi.fn(() => true)
  }
}));

vi.mock('../../services/storage/projectPersistenceService', () => ({
  default: {
    initialize: vi.fn(() => ({ success: true })),
    getAllProjects: vi.fn(() => []),
    addProject: vi.fn(),
    updateProject: vi.fn(),
    removeProject: vi.fn(),
    removeDummyProjects: vi.fn(() => ({ success: true, removedCount: 0 })),
    deduplicateProjects: vi.fn(() => ({ success: true, removedCount: 0 })),
    getStorageStats: vi.fn(() => ({ totalProjects: 0 })),
    exportProjects: vi.fn(() => ({ projects: [], version: '1.0.0' })),
    importProjects: vi.fn(() => ({ success: true, importedCount: 0 }))
  }
}));

vi.mock('../../services/websocket/stageProgressionService', () => ({
  default: {
    setupStageProgressionListener: vi.fn(),
    cleanupStageProgressionListener: vi.fn()
  }
}));

vi.mock('../../services/websocket/websocketService', () => ({
  default: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    sendMessage: vi.fn(),
    getStatus: vi.fn(() => ({ connected: true }))
  }
}));

vi.mock('../../services/storage/recentProjectsService', () => ({
  default: {
    addRecentProject: vi.fn(),
    getRecentProjects: vi.fn(() => []),
    removeRecentProject: vi.fn()
  }
}));

vi.mock('../../services/storage/projectNotificationService', () => ({
  default: {
    initialize: vi.fn(),
    addPendingNotification: vi.fn(),
    getPendingNotifications: vi.fn(() => []),
    clearPendingNotifications: vi.fn()
  }
}));

vi.mock('../../utils/dataMigration', () => ({
  default: {
    runMigrations: vi.fn()
  }
}));

vi.mock('../../utils/workflowValidation', () => ({
  getNextStageInWorkflow: vi.fn(),
  isWorkflowComplete: vi.fn(() => false)
}));

// Mock child components for CardExpandModal
vi.mock('../../components/kanban/StageLogsViewer', () => ({
  default: () => <div data-testid="stage-logs-viewer">StageLogsViewer</div>
}));

vi.mock('../../components/kanban/LiveLogsPanel', () => ({
  default: () => <div data-testid="live-logs-panel">LiveLogsPanel</div>
}));

vi.mock('../../components/kanban/AgentLogsPanel', () => ({
  default: () => <div data-testid="agent-logs-panel">AgentLogsPanel</div>
}));

vi.mock('../../components/kanban/StageTabsPanel', () => ({
  default: () => <div data-testid="stage-tabs-panel">StageTabsPanel</div>
}));

vi.mock('../../components/kanban/PatchTabsPanel', () => ({
  default: () => <div data-testid="patch-tabs-panel">PatchTabsPanel</div>
}));

vi.mock('../../components/kanban/ContentTypeTabs', () => ({
  default: () => <div data-testid="content-type-tabs">ContentTypeTabs</div>
}));

vi.mock('../../components/kanban/ExecutionLogsViewer', () => ({
  default: () => <div data-testid="execution-logs-viewer">ExecutionLogsViewer</div>
}));

vi.mock('../../components/kanban/ResultViewer', () => ({
  default: () => <div data-testid="result-viewer">ResultViewer</div>
}));

vi.mock('../../components/ui/Toast', () => ({
  default: ({ type, title, message, onClose }) => (
    <div data-testid="toast" data-type={type}>
      {title}: {message}
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="md-editor"
      value={value || ''}
      onChange={(e) => onChange && onChange(e.target.value)}
    />
  )
}));

vi.mock('react-markdown', () => ({
  default: ({ children }) => <div data-testid="react-markdown">{children}</div>
}));

vi.mock('../../hooks/useStageTransition', () => ({
  useStageTransition: () => ({
    getTransitionClass: () => 'transition-class',
    getGlowClass: () => 'glow-class',
    shouldPulse: () => false
  })
}));

vi.mock('react-dom', () => ({
  createPortal: (element) => element
}));

describe('Mark Task as Complete - Integration Tests', () => {
  let mockUpdateAdw;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Get reference to the mocked updateAdw function
    const adwDbService = await import('../../services/api/adwDbService');
    mockUpdateAdw = adwDbService.default.updateAdw;

    // Reset the store state
    const module = await import('../../stores/kanbanStore');
    const useKanbanStore = module.useKanbanStore;
    useKanbanStore.setState({ tasks: [], notifications: [] });

    // Mock successful API response
    mockUpdateAdw.mockResolvedValue({
      id: 1,
      adw_id: 'test123',
      current_stage: 'completed',
      status: 'completed',
      updated_at: new Date().toISOString()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should mark task as complete via store action and update backend', async () => {
    const { useKanbanStore } = await import('../../stores/kanbanStore');
    const { result } = renderHook(() => useKanbanStore());

    // Add a test task directly to state
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-1',
          title: 'Integration Test Task',
          stage: 'plan',
          status: 'in_progress',
          metadata: { adw_id: 'test123' }
        }]
      });
    });

    // Mark task as complete
    await act(async () => {
      await result.current.markTaskAsComplete('task-1');
    });

    // Verify API was called with correct parameters
    expect(mockUpdateAdw).toHaveBeenCalledWith('test123', {
      current_stage: 'completed',
      status: 'completed',
      completed_at: expect.any(String)
    });

    // Verify task was updated in store
    const task = result.current.tasks.find(t => t.id === 'task-1');
    expect(task.stage).toBe('completed');
    expect(task.status).toBe('completed');

    // Verify notification was added
    expect(result.current.notifications.length).toBeGreaterThan(0);
    const notification = result.current.notifications.find(n => n.type === 'success');
    expect(notification).toBeDefined();
  });

  it('should handle multiple tasks being marked complete independently', async () => {
    const { useKanbanStore } = await import('../../stores/kanbanStore');
    const { result } = renderHook(() => useKanbanStore());

    // Add multiple tasks directly to state
    await act(async () => {
      useKanbanStore.setState({
        tasks: [
          {
            id: 'task-1',
            title: 'Task 1',
            stage: 'plan',
            metadata: { adw_id: 'adw1' }
          },
          {
            id: 'task-2',
            title: 'Task 2',
            stage: 'build',
            metadata: { adw_id: 'adw2' }
          }
        ]
      });
    });

    // Mark both as complete
    await act(async () => {
      await result.current.markTaskAsComplete('task-1');
      await result.current.markTaskAsComplete('task-2');
    });

    // Verify both API calls were made
    expect(mockUpdateAdw).toHaveBeenCalledTimes(2);
    expect(mockUpdateAdw).toHaveBeenCalledWith('adw1', expect.any(Object));
    expect(mockUpdateAdw).toHaveBeenCalledWith('adw2', expect.any(Object));

    // Verify both tasks were updated
    const task1 = result.current.tasks.find(t => t.id === 'task-1');
    const task2 = result.current.tasks.find(t => t.id === 'task-2');
    expect(task1.stage).toBe('completed');
    expect(task2.stage).toBe('completed');
  });

  it('should rollback on API failure', async () => {
    mockUpdateAdw.mockRejectedValueOnce(new Error('API Error'));

    const { useKanbanStore } = await import('../../stores/kanbanStore');
    const { result } = renderHook(() => useKanbanStore());

    // Add a test task directly to state
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-3',
          title: 'Test Task',
          stage: 'plan',
          metadata: { adw_id: 'test456' }
        }]
      });
    });

    // Try to mark as complete
    await act(async () => {
      await result.current.markTaskAsComplete('task-3');
    });

    // Task should remain unchanged
    const task = result.current.tasks.find(t => t.id === 'task-3');
    expect(task.stage).toBe('plan');

    // Error notification should be added
    const errorNotification = result.current.notifications.find(n => n.type === 'error');
    expect(errorNotification).toBeDefined();
  });

  it('should handle concurrent mark complete requests', async () => {
    const { useKanbanStore } = await import('../../stores/kanbanStore');
    const { result } = renderHook(() => useKanbanStore());

    // Add a test task directly to state
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-4',
          title: 'Test Task',
          stage: 'plan',
          metadata: { adw_id: 'test789' }
        }]
      });
    });

    // Trigger multiple concurrent mark complete calls
    await act(async () => {
      await Promise.all([
        result.current.markTaskAsComplete('task-4'),
        result.current.markTaskAsComplete('task-4'),
        result.current.markTaskAsComplete('task-4')
      ]);
    });

    // API should be called (possibly multiple times due to concurrency)
    // But task should end up in completed state
    const task = result.current.tasks.find(t => t.id === 'task-4');
    expect(task.stage).toBe('completed');
  });

  it('should update task timestamp on completion', async () => {
    const { useKanbanStore } = await import('../../stores/kanbanStore');
    const { result } = renderHook(() => useKanbanStore());

    const oldTimestamp = new Date('2024-01-01').toISOString();

    // Add a test task with old timestamp directly to state
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-5',
          title: 'Test Task',
          stage: 'plan',
          updatedAt: oldTimestamp,
          metadata: { adw_id: 'test999' }
        }]
      });
    });

    // Mark as complete
    await act(async () => {
      await result.current.markTaskAsComplete('task-5');
    });

    // Timestamp should be updated
    const task = result.current.tasks.find(t => t.id === 'task-5');
    expect(task.updatedAt).not.toBe(oldTimestamp);
    expect(new Date(task.updatedAt).getTime()).toBeGreaterThan(new Date(oldTimestamp).getTime());
  });
});
