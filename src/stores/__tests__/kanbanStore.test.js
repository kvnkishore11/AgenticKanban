/**
 * Tests for Kanban Store
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock all dependencies
vi.mock('../../services/api/adwService', () => ({
  default: {
    getAllPipelines: vi.fn(() => [
      { id: 'full-stack', name: 'Full Stack', stages: ['plan', 'build', 'test', 'review', 'document'] }
    ]),
    getNextStage: vi.fn((pipeline, stage) => {
      const stages = ['plan', 'build', 'test', 'review', 'document'];
      const idx = stages.indexOf(stage);
      return idx < stages.length - 1 ? stages[idx + 1] : null;
    }),
    triggerMerge: vi.fn(() => Promise.resolve({ success: true })),
    deleteWorktree: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

vi.mock('../../services/adwCreationService', () => ({
  default: {
    createAdwConfiguration: vi.fn((task) => ({
      adw_id: `ADW${task.id}TEST`,
      workflow_name: 'adw_plan_build_test_iso',
      workspace_id: 'ws-123',
      state: {},
      execution_context: {},
      worktree: {},
      outputs: {},
      task_metadata: { title: task.title || 'Test Task' }
    }))
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
    addProject: vi.fn((project) => ({
      success: true,
      errors: [],
      project: { ...project, id: 'project-1' }
    })),
    updateProject: vi.fn((id, updates) => ({
      success: true,
      errors: [],
      project: { id, ...updates }
    })),
    removeProject: vi.fn(() => true),
    removeDummyProjects: vi.fn(() => ({ success: true, removedCount: 0 })),
    deduplicateProjects: vi.fn(() => ({ success: true, removedCount: 0 })),
    getStorageStats: vi.fn(() => ({ totalProjects: 0 })),
    exportProjects: vi.fn(() => ({ projects: [], version: '1.0.0' })),
    importProjects: vi.fn(() => ({ success: true, importedCount: 0 }))
  }
}));

vi.mock('../../services/websocket/stageProgressionService', () => ({
  default: {
    startProgression: vi.fn(),
    stopProgression: vi.fn()
  }
}));

vi.mock('../../services/websocket/websocketService', () => ({
  default: {
    connect: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn()
  }
}));

vi.mock('../../services/storage/projectNotificationService', () => ({
  default: {
    sendNotification: vi.fn(() => Promise.resolve({ success: true })),
    getConfig: vi.fn(() => null),
    setConfig: vi.fn(() => true)
  }
}));

vi.mock('../../utils/dataMigration', () => ({
  default: {
    needsMigration: vi.fn(() => false),
    migrate: vi.fn(() => ({ success: true }))
  }
}));

vi.mock('../../utils/workflowValidation', () => ({
  getNextStageInWorkflow: vi.fn((workflow, stage) => {
    const stages = workflow.replace('adw_', '').replace('_iso', '').split('_');
    const idx = stages.indexOf(stage);
    return idx < stages.length - 1 ? stages[idx + 1] : null;
  }),
  isWorkflowComplete: vi.fn((workflow, stage) => {
    const stages = workflow.replace('adw_', '').replace('_iso', '').split('_');
    return stages.indexOf(stage) === stages.length - 1;
  })
}));

describe('Kanban Store', () => {
  let useKanbanStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import fresh store for each test
    const module = await import('../kanbanStore');
    useKanbanStore = module.useKanbanStore;

    // Reset store state
    useKanbanStore.setState({
      selectedProject: null,
      availableProjects: [],
      tasks: [],
      taskIdCounter: 1,
      error: null,
      taskWorkflowLogs: {},
      taskWorkflowProgress: {},
      taskWorkflowMetadata: {},
      tasksByAdwId: {},
      processedMessages: new Map()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useKanbanStore.getState();

      expect(state.selectedProject).toBeNull();
      expect(state.availableProjects).toEqual([]);
      expect(state.tasks).toEqual([]);
      expect(state.stages).toBeDefined();
      expect(state.stages.length).toBeGreaterThan(0);
    });

    it('should have default stages', () => {
      const state = useKanbanStore.getState();

      const stageIds = state.stages.map(s => s.id);
      expect(stageIds).toContain('backlog');
      expect(stageIds).toContain('plan');
      expect(stageIds).toContain('build');
      expect(stageIds).toContain('test');
      expect(stageIds).toContain('review');
    });
  });

  describe('Project Management', () => {
    it('should select project', () => {
      const project = { id: '1', name: 'Test Project', path: '/test' };

      act(() => {
        useKanbanStore.getState().selectProject(project);
      });

      expect(useKanbanStore.getState().selectedProject).toEqual(project);
    });

    it('should deselect project', () => {
      const project = { id: '1', name: 'Test Project' };
      useKanbanStore.setState({ selectedProject: project });

      act(() => {
        useKanbanStore.getState().deselectProject();
      });

      expect(useKanbanStore.getState().selectedProject).toBeNull();
    });

    it('should add project', () => {
      const project = { name: 'New Project', path: '/new' };

      const result = useKanbanStore.getState().addProject(project);

      expect(result.success).toBe(true);
    });

    it('should get current project', () => {
      const project = { id: '1', name: 'Test' };
      useKanbanStore.setState({ selectedProject: project });

      const current = useKanbanStore.getState().getCurrentProject();

      expect(current).toEqual(project);
    });
  });

  describe('Task Management', () => {
    it('should create task', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Description',
        queuedStages: ['plan', 'build']
      };

      const task = useKanbanStore.getState().createTask(taskData);

      expect(task).toBeDefined();
      expect(task.id).toBe(1);
      expect(task.title).toBe('Test Task');
      expect(task.stage).toBe('backlog');
      expect(useKanbanStore.getState().tasks).toHaveLength(1);
    });

    it('should update task', () => {
      // Create initial task
      useKanbanStore.setState({
        tasks: [{ id: 1, title: 'Original', stage: 'backlog' }]
      });

      act(() => {
        useKanbanStore.getState().updateTask(1, { title: 'Updated' });
      });

      const task = useKanbanStore.getState().tasks[0];
      expect(task.title).toBe('Updated');
    });

    it('should delete task', () => {
      useKanbanStore.setState({
        tasks: [{ id: 1, title: 'To Delete' }]
      });

      act(() => {
        useKanbanStore.getState().deleteTask(1);
      });

      expect(useKanbanStore.getState().tasks).toHaveLength(0);
    });

    it('should move task to stage', () => {
      useKanbanStore.setState({
        tasks: [{ id: 1, stage: 'backlog' }]
      });

      act(() => {
        useKanbanStore.getState().moveTaskToStage(1, 'plan');
      });

      const task = useKanbanStore.getState().tasks[0];
      expect(task.stage).toBe('plan');
    });
  });

  describe('Task Lookup by ADW ID', () => {
    it('should get task by ADW ID', () => {
      useKanbanStore.setState({
        tasks: [
          { id: 1, title: 'Task 1', metadata: { adw_id: 'ABC12345' } }
        ],
        tasksByAdwId: { 'ABC12345': 1 }
      });

      const task = useKanbanStore.getState().getTaskByAdwId('ABC12345');

      expect(task).toBeDefined();
      expect(task.id).toBe(1);
    });

    it('should return null for non-existent ADW ID', () => {
      const task = useKanbanStore.getState().getTaskByAdwId('NOTFOUND');

      expect(task).toBeNull();
    });

    it('should return null for null ADW ID', () => {
      const task = useKanbanStore.getState().getTaskByAdwId(null);

      expect(task).toBeNull();
    });

    it('should update task ADW index', () => {
      act(() => {
        useKanbanStore.getState().updateTaskAdwIndex(1, 'ABC12345', 'set');
      });

      expect(useKanbanStore.getState().tasksByAdwId['ABC12345']).toBe(1);
    });

    it('should delete task from ADW index', () => {
      useKanbanStore.setState({
        tasksByAdwId: { 'ABC12345': 1 }
      });

      act(() => {
        useKanbanStore.getState().updateTaskAdwIndex(1, null, 'delete');
      });

      expect(useKanbanStore.getState().tasksByAdwId['ABC12345']).toBeUndefined();
    });
  });

  describe('Batched Task Updates', () => {
    it('should batch multiple updates', () => {
      useKanbanStore.setState({
        tasks: [{ id: 1, stage: 'backlog', metadata: {} }],
        taskWorkflowLogs: {},
        taskWorkflowProgress: {}
      });

      act(() => {
        useKanbanStore.getState().batchedTaskUpdate(1, {
          stage: 'plan',
          metadata: { adw_id: 'ABC12345' },
          logEntry: { message: 'Test log' },
          workflowProgress: { progress: 50 }
        });
      });

      const state = useKanbanStore.getState();
      expect(state.tasks[0].stage).toBe('plan');
      expect(state.tasks[0].metadata.adw_id).toBe('ABC12345');
      expect(state.taskWorkflowLogs[1]).toHaveLength(1);
      expect(state.taskWorkflowProgress[1].progress).toBe(50);
    });
  });

  describe('Workflow Logs', () => {
    it('should get workflow logs for task', () => {
      useKanbanStore.setState({
        taskWorkflowLogs: {
          1: [{ message: 'Log 1' }, { message: 'Log 2' }]
        }
      });

      const logs = useKanbanStore.getState().getWorkflowLogsForTask(1);

      expect(logs).toHaveLength(2);
    });

    it('should return empty array for task without logs', () => {
      const logs = useKanbanStore.getState().getWorkflowLogsForTask(999);

      expect(logs).toEqual([]);
    });
  });

  describe('Workflow Progress', () => {
    it('should get workflow progress for task', () => {
      useKanbanStore.setState({
        taskWorkflowProgress: { 1: { progress: 75, status: 'running' } }
      });

      const progress = useKanbanStore.getState().getWorkflowProgressForTask(1);

      expect(progress.progress).toBe(75);
      expect(progress.status).toBe('running');
    });

    it('should return null for task without progress', () => {
      const progress = useKanbanStore.getState().getWorkflowProgressForTask(999);

      expect(progress).toBeNull();
    });
  });

  describe('Workflow Metadata', () => {
    it('should get workflow metadata for task', () => {
      useKanbanStore.setState({
        taskWorkflowMetadata: { 1: { adw_id: 'ABC12345' } }
      });

      const metadata = useKanbanStore.getState().getWorkflowMetadataForTask(1);

      expect(metadata.adw_id).toBe('ABC12345');
    });

    it('should return null for task without metadata', () => {
      const metadata = useKanbanStore.getState().getWorkflowMetadataForTask(999);

      expect(metadata).toBeNull();
    });
  });

  describe('UI State', () => {
    it('should select task', () => {
      act(() => {
        useKanbanStore.getState().selectTask(5);
      });

      expect(useKanbanStore.getState().selectedTaskId).toBe(5);
    });

    it('should clear error', () => {
      useKanbanStore.setState({ error: 'Test error' });

      act(() => {
        useKanbanStore.getState().clearError();
      });

      expect(useKanbanStore.getState().error).toBeNull();
    });
  });

  describe('Message Deduplication', () => {
    it('should schedule message cache cleanup', () => {
      // Set up some processed messages
      const messages = new Map();
      messages.set('msg1', Date.now() - 10 * 60 * 1000); // 10 minutes ago (expired)
      messages.set('msg2', Date.now()); // Now (not expired)
      useKanbanStore.setState({ processedMessages: messages });

      act(() => {
        useKanbanStore.getState().scheduleMessageCacheCleanup();
      });

      // Cleanup is scheduled (async), so we can't check immediate result
      expect(useKanbanStore.getState()._cleanupScheduled).toBe(true);
    });

    it('should perform message cache cleanup', () => {
      const messages = new Map();
      messages.set('msg1', Date.now() - 10 * 60 * 1000); // Expired
      messages.set('msg2', Date.now()); // Not expired

      useKanbanStore.setState({
        processedMessages: messages,
        messageDeduplicationTTL: 5 * 60 * 1000 // 5 minutes
      });

      act(() => {
        useKanbanStore.getState().performMessageCacheCleanup();
      });

      const remaining = useKanbanStore.getState().processedMessages;
      expect(remaining.has('msg1')).toBe(false);
      expect(remaining.has('msg2')).toBe(true);
    });
  });

  describe('Task Logs', () => {
    it('should add task log', () => {
      useKanbanStore.setState({
        tasks: [{ id: 1, logs: [] }]
      });

      act(() => {
        useKanbanStore.getState().addTaskLog(1, {
          message: 'Test log',
          level: 'info',
          stage: 'build'
        });
      });

      const task = useKanbanStore.getState().tasks[0];
      expect(task.logs).toHaveLength(1);
      expect(task.logs[0].message).toBe('Test log');
    });
  });

  describe('Task Progress', () => {
    it('should update task progress', () => {
      useKanbanStore.setState({
        tasks: [{ id: 1, progress: 0, substage: null }]
      });

      act(() => {
        useKanbanStore.getState().updateTaskProgress(1, 'compiling', 50);
      });

      const task = useKanbanStore.getState().tasks[0];
      expect(task.progress).toBe(50);
      expect(task.substage).toBe('compiling');
    });
  });

  describe('Pipelines', () => {
    it('should get available pipelines', () => {
      const pipelines = useKanbanStore.getState().availablePipelines;

      expect(pipelines).toBeDefined();
      expect(Array.isArray(pipelines)).toBe(true);
    });
  });
});
