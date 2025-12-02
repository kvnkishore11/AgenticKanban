/**
 * @fileoverview Test suite for Kanban Store database integration
 * Tests ADW loading, creation, updates, and deletion with database API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import adwDbService from '../../services/api/adwDbService';

// Mock the adwDbService
vi.mock('../../services/api/adwDbService', () => ({
  default: {
    listAdws: vi.fn(),
    createAdw: vi.fn(),
    updateAdw: vi.fn(),
    deleteAdw: vi.fn(),
  },
}));

// Mock other services to avoid side effects
vi.mock('../../services/api/adwService', () => ({
  default: {
    getAllPipelines: vi.fn(() => []),
  },
}));

vi.mock('../../services/adwCreationService', () => ({
  default: {
    createAdwConfiguration: vi.fn(),
  },
}));

vi.mock('../../services/storage/localStorage', () => ({
  default: {},
}));

vi.mock('../../services/storage/projectPersistenceService', () => ({
  default: {
    initialize: vi.fn(() => ({ success: true })),
    getAllProjects: vi.fn(() => []),
  },
}));

vi.mock('../../services/websocket/stageProgressionService', () => ({
  default: {},
}));

vi.mock('../../services/websocket/websocketService', () => ({
  default: {
    triggerWorkflowForTask: vi.fn(),
  },
}));

import websocketService from '../../services/websocket/websocketService';

vi.mock('../../services/storage/projectNotificationService', () => ({
  default: {},
}));

vi.mock('../../utils/dataMigration', () => ({
  default: {},
}));

vi.mock('../../utils/workflowValidation', () => ({
  getNextStageInWorkflow: vi.fn(),
  isWorkflowComplete: vi.fn(),
}));

describe('Kanban Store - Database Integration', () => {
  let useKanbanStore;

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Reset module cache to get fresh store instance
    vi.resetModules();

    // Import store after mocks are set up
    const module = await import('../kanbanStore');
    useKanbanStore = module.useKanbanStore;

    // Reset store state to initial values
    useKanbanStore.setState({
      tasks: [],
      taskIdCounter: 1,
      tasksByAdwId: {},
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadAdwsFromDatabase', () => {
    it('should load ADWs from database and map to tasks', async () => {
      const mockAdws = [
        {
          adw_id: 'abc12345',
          issue_title: 'Test Issue 1',
          issue_body: 'Test description 1',
          issue_class: 'feature',
          issue_number: 1,
          current_stage: 'plan',
          status: 'in_progress',
          workflow_name: 'adw_plan_build_test_iso',
          branch_name: 'feat-issue-1',
          worktree_path: '/path/to/worktree',
          backend_port: 9104,
          websocket_port: 9105,
          frontend_port: 5173,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          adw_id: 'def67890',
          issue_title: 'Test Issue 2',
          issue_body: 'Test description 2',
          issue_class: 'bug',
          issue_number: 2,
          current_stage: 'backlog',
          status: 'pending',
          workflow_name: 'adw_plan_iso',
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
      ];

      adwDbService.listAdws.mockResolvedValue({
        adws: mockAdws,
        total_count: 2,
      });

      const store = useKanbanStore.getState();
      await store.loadAdwsFromDatabase();

      // Verify API was called
      expect(adwDbService.listAdws).toHaveBeenCalledTimes(1);

      // Verify tasks were created
      const state = useKanbanStore.getState();
      expect(state.tasks).toHaveLength(2);

      // Verify task mapping
      const task1 = state.tasks[0];
      expect(task1.title).toBe('Test Issue 1');
      expect(task1.description).toBe('Test description 1');
      expect(task1.workItemType).toBe('feature');
      expect(task1.stage).toBe('plan');
      expect(task1.status).toBe('in_progress');
      expect(task1.metadata.adw_id).toBe('abc12345');
      expect(task1.metadata.issue_number).toBe(1);

      // Verify tasksByAdwId index
      expect(state.tasksByAdwId['abc12345']).toBe(task1.id);
      expect(state.tasksByAdwId['def67890']).toBe(state.tasks[1].id);

      // Verify loading state is reset
      expect(state.isLoading).toBe(false);
    });

    it('should handle empty ADW list', async () => {
      adwDbService.listAdws.mockResolvedValue({
        adws: [],
        total_count: 0,
      });

      const store = useKanbanStore.getState();
      await store.loadAdwsFromDatabase();

      const state = useKanbanStore.getState();
      expect(state.tasks).toHaveLength(0);
      expect(state.isLoading).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      adwDbService.listAdws.mockRejectedValue(mockError);

      const store = useKanbanStore.getState();
      await store.loadAdwsFromDatabase();

      const state = useKanbanStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toContain('Failed to load tasks from database');
    });
  });

  describe('createTask with database persistence', () => {
    it('should persist new task to database', async () => {
      const adwCreationService = (await import('../../services/adwCreationService')).default;

      adwCreationService.createAdwConfiguration.mockReturnValue({
        adw_id: 'new12345',
        workflow_name: 'adw_plan_iso',
        task_metadata: {
          title: 'New Task',
        },
        worktree: {
          branch_name: 'feat-new-task',
          path: '/path/to/new/worktree',
        },
      });

      adwDbService.createAdw.mockResolvedValue({
        adw_id: 'new12345',
        issue_title: 'New Task',
        issue_body: 'New task description',
        current_stage: 'backlog',
        status: 'pending',
      });

      const store = useKanbanStore.getState();
      const newTask = await store.createTask({
        title: 'New Task',
        description: 'New task description',
        workItemType: 'feature',
        queuedStages: ['plan'],
      });

      // Verify database API was called
      expect(adwDbService.createAdw).toHaveBeenCalledWith({
        adw_id: 'new12345',
        issue_title: 'New Task',
        issue_body: 'New task description',
        issue_class: 'feature',
        current_stage: 'backlog',
        status: 'pending',
        workflow_name: 'adw_plan_iso',
        branch_name: 'feat-new-task',
        worktree_path: '/path/to/new/worktree',
        data_source: 'kanban',
      });

      // Verify task was added to local state
      const state = useKanbanStore.getState();
      expect(state.tasks).toContainEqual(expect.objectContaining({
        title: 'New Task',
        description: 'New task description',
      }));
    });

    it('should continue with local task creation if database persistence fails', async () => {
      const adwCreationService = (await import('../../services/adwCreationService')).default;

      adwCreationService.createAdwConfiguration.mockReturnValue({
        adw_id: 'new12345',
        workflow_name: 'adw_plan_iso',
        task_metadata: {
          title: 'New Task',
        },
        worktree: {
          branch_name: 'feat-new-task',
          path: '/path/to/new/worktree',
        },
      });

      adwDbService.createAdw.mockRejectedValue(new Error('Database write failed'));

      const store = useKanbanStore.getState();
      const newTask = await store.createTask({
        title: 'New Task',
        description: 'New task description',
        workItemType: 'feature',
        queuedStages: ['plan'],
      });

      // Verify task was still created locally despite database failure
      expect(newTask).toBeDefined();
      expect(newTask.title).toBe('New Task');
    });
  });

  describe('updateTask with database sync', () => {
    it('should sync task updates to database', async () => {
      adwDbService.updateAdw.mockResolvedValue({
        adw_id: 'abc12345',
        issue_title: 'Updated Title',
      });

      // Create a task in the store first
      useKanbanStore.setState({
        tasks: [{
          id: 1,
          title: 'Original Title',
          description: 'Original description',
          stage: 'backlog',
          metadata: { adw_id: 'abc12345' },
        }],
        tasksByAdwId: { 'abc12345': 1 },
      });

      const store = useKanbanStore.getState();

      await store.updateTask(1, { title: 'Updated Title' });

      // Verify database API was called
      expect(adwDbService.updateAdw).toHaveBeenCalledWith('abc12345', {
        issue_title: 'Updated Title',
      });

      // Verify local state was updated
      const state = useKanbanStore.getState();
      const task = state.tasks.find(t => t.id === 1);
      expect(task.title).toBe('Updated Title');
    });

    it('should revert optimistic update on database failure', async () => {
      adwDbService.updateAdw.mockRejectedValue(new Error('Database update failed'));

      useKanbanStore.setState({
        tasks: [{
          id: 1,
          title: 'Original Title',
          description: 'Original description',
          stage: 'backlog',
          metadata: { adw_id: 'abc12345' },
        }],
        tasksByAdwId: { 'abc12345': 1 },
      });

      const store = useKanbanStore.getState();
      await store.updateTask(1, { title: 'Updated Title' });

      // Verify the update was reverted
      const state = useKanbanStore.getState();
      const task = state.tasks.find(t => t.id === 1);
      expect(task.title).toBe('Original Title');
    });
  });

  describe('moveTaskToStage with database sync', () => {
    it('should sync stage changes to database', async () => {
      adwDbService.updateAdw.mockResolvedValue({
        adw_id: 'abc12345',
        current_stage: 'plan',
      });

      useKanbanStore.setState({
        tasks: [{
          id: 1,
          title: 'Test Task',
          stage: 'backlog',
          metadata: { adw_id: 'abc12345' },
        }],
        tasksByAdwId: { 'abc12345': 1 },
      });

      const store = useKanbanStore.getState();
      await store.moveTaskToStage(1, 'plan');

      // Verify database API was called
      expect(adwDbService.updateAdw).toHaveBeenCalledWith('abc12345', {
        current_stage: 'plan',
      });

      // Verify local state was updated
      const state = useKanbanStore.getState();
      const task = state.tasks.find(t => t.id === 1);
      expect(task.stage).toBe('plan');
    });

    it('should revert stage change on database failure', async () => {
      adwDbService.updateAdw.mockRejectedValue(new Error('Database update failed'));

      useKanbanStore.setState({
        tasks: [{
          id: 1,
          title: 'Test Task',
          stage: 'backlog',
          metadata: { adw_id: 'abc12345' },
        }],
        tasksByAdwId: { 'abc12345': 1 },
      });

      const store = useKanbanStore.getState();
      await store.moveTaskToStage(1, 'plan');

      // Verify the stage change was reverted
      const state = useKanbanStore.getState();
      const task = state.tasks.find(t => t.id === 1);
      expect(task.stage).toBe('backlog');
    });
  });

  describe('deleteTask with database cleanup', () => {
    it('should delete task from database and trigger worktree cleanup', async () => {
      adwDbService.deleteAdw.mockResolvedValue({
        message: 'ADW deleted successfully',
      });

      useKanbanStore.setState({
        tasks: [{
          id: 1,
          title: 'Test Task',
          stage: 'backlog',
          metadata: { adw_id: 'abc12345' },
        }],
        tasksByAdwId: { 'abc12345': 1 },
      });

      const store = useKanbanStore.getState();
      await store.deleteTask(1);

      // Verify database API was called
      expect(adwDbService.deleteAdw).toHaveBeenCalledWith('abc12345');

      // Verify task was removed from local state
      const state = useKanbanStore.getState();
      expect(state.tasks).toHaveLength(0);
      expect(state.tasksByAdwId['abc12345']).toBeUndefined();
    });

    it('should not delete from local state if database delete fails', async () => {
      adwDbService.deleteAdw.mockRejectedValue(new Error('Database delete failed'));

      useKanbanStore.setState({
        tasks: [{
          id: 1,
          title: 'Test Task',
          stage: 'backlog',
          metadata: { adw_id: 'abc12345' },
        }],
        tasksByAdwId: { 'abc12345': 1 },
        addNotification: vi.fn(),
      });

      const store = useKanbanStore.getState();
      await store.deleteTask(1);

      // Verify task was NOT removed from local state
      const state = useKanbanStore.getState();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasksByAdwId['abc12345']).toBe(1);

      // Verify error notification was shown
      expect(state.addNotification).toHaveBeenCalledWith({
        type: 'error',
        message: expect.stringContaining('Failed to delete task'),
      });
    });
  });

  describe('applyPatch', () => {
    it('should persist patch to database when applying a patch', async () => {
      // Mock successful workflow trigger
      websocketService.triggerWorkflowForTask.mockResolvedValue({
        adw_id: 'patch123',
        workflow_name: 'adw_patch_iso',
        logs_path: '/path/to/logs',
      });

      // Mock successful database update
      adwDbService.updateAdw.mockResolvedValue({
        adw_id: 'abc12345',
        current_stage: 'build',
      });

      // Set up initial task state
      useKanbanStore.setState({
        tasks: [{
          id: 1,
          title: 'Test Task',
          stage: 'ready_to_merge',
          metadata: {
            adw_id: 'abc12345',
            patch_history: [],
          },
        }],
        tasksByAdwId: { 'abc12345': 1 },
        isLoading: false,
        trackActiveWorkflow: vi.fn(),
      });

      const store = useKanbanStore.getState();
      await store.applyPatch(1, 'Fix the login bug');

      // Verify database update was called with patch data
      expect(adwDbService.updateAdw).toHaveBeenCalledWith('abc12345', {
        current_stage: 'build',
        patch_history: expect.arrayContaining([
          expect.objectContaining({
            patch_number: 1,
            patch_reason: 'Fix the login bug',
            status: 'pending',
          }),
        ]),
      });

      // Verify second database call for workflow started state
      expect(adwDbService.updateAdw).toHaveBeenCalledTimes(2);
    });

    it('should revert local state if database persistence fails', async () => {
      // Mock database failure
      adwDbService.updateAdw.mockRejectedValue(new Error('Database error'));

      // Set up initial task state
      const originalTask = {
        id: 1,
        title: 'Test Task',
        stage: 'ready_to_merge',
        metadata: {
          adw_id: 'abc12345',
          patch_history: [],
        },
      };

      useKanbanStore.setState({
        tasks: [originalTask],
        tasksByAdwId: { 'abc12345': 1 },
        isLoading: false,
      });

      const store = useKanbanStore.getState();

      // Expect the applyPatch to throw
      await expect(store.applyPatch(1, 'Fix the bug')).rejects.toThrow('Database error');

      // Verify task was reverted
      const state = useKanbanStore.getState();
      expect(state.tasks[0].stage).toBe('ready_to_merge');
      expect(state.error).toContain('Database error');
    });

    it('should update patch history status to in_progress after workflow starts', async () => {
      // Mock successful workflow trigger
      websocketService.triggerWorkflowForTask.mockResolvedValue({
        adw_id: 'patchadw1',
        workflow_name: 'adw_patch_iso',
        logs_path: '/path/to/logs',
      });

      // Mock successful database updates
      adwDbService.updateAdw.mockResolvedValue({});

      useKanbanStore.setState({
        tasks: [{
          id: 1,
          title: 'Test Task',
          stage: 'ready_to_merge',
          metadata: {
            adw_id: 'abc12345',
            patch_history: [],
          },
        }],
        tasksByAdwId: { 'abc12345': 1 },
        isLoading: false,
        trackActiveWorkflow: vi.fn(),
      });

      const store = useKanbanStore.getState();
      await store.applyPatch(1, 'Fix bug');

      // The second call should include the updated patch history with in_progress status
      const secondCall = adwDbService.updateAdw.mock.calls[1];
      expect(secondCall[0]).toBe('abc12345');
      expect(secondCall[1].patch_history).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'in_progress',
            adw_id: 'patchadw1',
          }),
        ])
      );
    });

    it('should persist multiple patches with correct patch numbers', async () => {
      websocketService.triggerWorkflowForTask.mockResolvedValue({
        adw_id: 'patch456',
        workflow_name: 'adw_patch_iso',
        logs_path: '/logs',
      });
      adwDbService.updateAdw.mockResolvedValue({});

      // Task with existing patch history
      useKanbanStore.setState({
        tasks: [{
          id: 1,
          title: 'Test Task',
          stage: 'ready_to_merge',
          metadata: {
            adw_id: 'abc12345',
            patch_history: [
              { patch_number: 1, patch_reason: 'First fix', status: 'completed' },
            ],
          },
        }],
        tasksByAdwId: { 'abc12345': 1 },
        isLoading: false,
        trackActiveWorkflow: vi.fn(),
      });

      const store = useKanbanStore.getState();
      await store.applyPatch(1, 'Second fix');

      // Verify the new patch has number 2
      expect(adwDbService.updateAdw).toHaveBeenCalledWith('abc12345', {
        current_stage: 'build',
        patch_history: expect.arrayContaining([
          expect.objectContaining({ patch_number: 1, patch_reason: 'First fix' }),
          expect.objectContaining({ patch_number: 2, patch_reason: 'Second fix' }),
        ]),
      });
    });
  });
});
