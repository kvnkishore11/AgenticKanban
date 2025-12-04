/**
 * Unit tests for markTaskAsComplete action in Kanban Store
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock all dependencies
vi.mock('../../services/api/adwService', () => ({
  default: {
    getAllPipelines: vi.fn(() => [
      { id: 'full-stack', name: 'Full Stack', stages: ['plan', 'build', 'test', 'review', 'document'] }
    ]),
  }
}));

vi.mock('../../services/adwCreationService', () => ({
  default: {
    createAdwConfiguration: vi.fn()
  }
}));

const mockUpdateAdw = vi.fn();
vi.mock('../../services/api/adwDbService', () => ({
  default: {
    updateAdw: mockUpdateAdw,
    getAdw: vi.fn(() => Promise.resolve(null)),
    deleteAdw: vi.fn(() => Promise.resolve({ success: true }))
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
    getStatus: vi.fn(() => ({ connected: false }))
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

describe('kanbanStore - markTaskAsComplete', () => {
  let useKanbanStore;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset modules to get fresh store instance
    vi.resetModules();

    // Import store after mocks are set up
    const module = await import('../kanbanStore');
    useKanbanStore = module.useKanbanStore;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully mark a task as complete', async () => {
    mockUpdateAdw.mockResolvedValueOnce({
      id: 1,
      adw_id: 'test123',
      current_stage: 'completed',
      status: 'completed'
    });

    const { result } = renderHook(() => useKanbanStore());

    // Add a test task by directly setting the store state
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-1',
          title: 'Test Task',
          stage: 'plan',
          status: 'in_progress',
          metadata: { adw_id: 'test123' }
        }]
      });
    });

    // Mark task as complete
    let markResult;
    await act(async () => {
      markResult = await result.current.markTaskAsComplete('task-1');
    });

    expect(markResult).toBe(true);
    expect(mockUpdateAdw).toHaveBeenCalledWith('test123', {
      current_stage: 'completed',
      status: 'completed',
      completed_at: expect.any(String)
    });

    // Verify task was updated in store
    const updatedTask = result.current.tasks.find(t => t.id === 'task-1');
    expect(updatedTask.stage).toBe('completed');
    expect(updatedTask.status).toBe('completed');
  });

  it('should handle error when task not found', async () => {
    const { result } = renderHook(() => useKanbanStore());

    let markResult;
    await act(async () => {
      markResult = await result.current.markTaskAsComplete('non-existent-task');
    });

    expect(markResult).toBe(false);
    expect(mockUpdateAdw).not.toHaveBeenCalled();
  });

  it('should handle error when task has no adw_id', async () => {
    const { result } = renderHook(() => useKanbanStore());

    // Add a test task without adw_id
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-2',
          title: 'Test Task Without ADW',
          stage: 'plan',
          status: 'in_progress',
          metadata: {}
        }]
      });
    });

    let markResult;
    await act(async () => {
      markResult = await result.current.markTaskAsComplete('task-2');
    });

    expect(markResult).toBe(false);
    expect(mockUpdateAdw).not.toHaveBeenCalled();
  });

  it('should handle API failure gracefully', async () => {
    mockUpdateAdw.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useKanbanStore());

    // Add a test task
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-3',
          title: 'Test Task',
          stage: 'plan',
          status: 'in_progress',
          metadata: { adw_id: 'test456' }
        }]
      });
    });

    let markResult;
    await act(async () => {
      markResult = await result.current.markTaskAsComplete('task-3');
    });

    expect(markResult).toBe(false);

    // Task should remain unchanged
    const task = result.current.tasks.find(t => t.id === 'task-3');
    expect(task.stage).toBe('plan');
    expect(task.status).toBe('in_progress');
  });

  it('should add success notification on successful completion', async () => {
    mockUpdateAdw.mockResolvedValueOnce({
      id: 1,
      adw_id: 'test789',
      current_stage: 'completed',
      status: 'completed'
    });

    const { result } = renderHook(() => useKanbanStore());

    // Add a test task
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-4',
          title: 'Test Task',
          stage: 'build',
          status: 'in_progress',
          metadata: { adw_id: 'test789' }
        }]
      });
    });

    await act(async () => {
      await result.current.markTaskAsComplete('task-4');
    });

    // Check that a notification was added
    expect(result.current.notifications.length).toBeGreaterThan(0);
    const successNotification = result.current.notifications.find(n => n.type === 'success');
    expect(successNotification).toBeDefined();
  });

  it('should add error notification on failure', async () => {
    mockUpdateAdw.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useKanbanStore());

    // Add a test task
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-5',
          title: 'Test Task',
          stage: 'review',
          status: 'in_progress',
          metadata: { adw_id: 'test999' }
        }]
      });
    });

    await act(async () => {
      await result.current.markTaskAsComplete('task-5');
    });

    // Check that an error notification was added
    const errorNotification = result.current.notifications.find(n => n.type === 'error');
    expect(errorNotification).toBeDefined();
  });

  it('should update task updatedAt timestamp', async () => {
    mockUpdateAdw.mockResolvedValueOnce({
      id: 1,
      adw_id: 'test111',
      current_stage: 'completed',
      status: 'completed'
    });

    const { result } = renderHook(() => useKanbanStore());

    const originalTime = new Date('2024-01-01').toISOString();

    // Add a test task
    await act(async () => {
      useKanbanStore.setState({
        tasks: [{
          id: 'task-6',
          title: 'Test Task',
          stage: 'document',
          status: 'in_progress',
          metadata: { adw_id: 'test111' },
          updatedAt: originalTime
        }]
      });
    });

    await act(async () => {
      await result.current.markTaskAsComplete('task-6');
    });

    const updatedTask = result.current.tasks.find(t => t.id === 'task-6');
    expect(updatedTask.updatedAt).not.toBe(originalTime);
    expect(new Date(updatedTask.updatedAt).getTime()).toBeGreaterThan(new Date(originalTime).getTime());
  });
});
