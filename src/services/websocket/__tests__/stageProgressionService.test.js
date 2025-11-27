/**
 * @fileoverview Tests for StageProgressionService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../utils/substages', () => ({
  simulateSubstageExecution: vi.fn((stage, substage, callback) => {
    return new Promise((resolve) => {
      callback({
        stage,
        substageId: substage,
        progress: 100,
        status: 'completed',
        message: `${substage} completed`
      });
      resolve({ status: 'completed' });
    });
  }),
  getNextSubstage: vi.fn((stage, currentSubstage) => {
    const substages = {
      plan: ['analyze', 'design', 'breakdown'],
      implement: ['setup', 'code', 'integrate'],
      test: ['unit', 'integration', 'validation']
    };

    const stageSubstages = substages[stage] || [];
    const currentIndex = stageSubstages.indexOf(currentSubstage);

    if (currentIndex >= 0 && currentIndex < stageSubstages.length - 1) {
      return { id: stageSubstages[currentIndex + 1], name: stageSubstages[currentIndex + 1] };
    }

    return null;
  }),
  getSubstages: vi.fn((stage) => {
    const substages = {
      plan: [{ id: 'analyze' }, { id: 'design' }, { id: 'breakdown' }],
      implement: [{ id: 'setup' }, { id: 'code' }, { id: 'integrate' }],
      test: [{ id: 'unit' }, { id: 'integration' }, { id: 'validation' }],
      pr: [{ id: 'ready' }]
    };

    return substages[stage] || [{ id: 'initializing' }];
  })
}));

vi.mock('../api/adwService', () => ({
  default: {
    getNextStage: vi.fn((pipelineId, currentStage) => {
      const stageOrder = ['plan', 'implement', 'test', 'pr'];
      const currentIndex = stageOrder.indexOf(currentStage);
      return currentIndex >= 0 && currentIndex < stageOrder.length - 1
        ? stageOrder[currentIndex + 1]
        : null;
    })
  }
}));

vi.mock('../../utils/workflowValidation.js', () => ({
  getNextStageInWorkflow: vi.fn((workflowName, currentStage) => {
    if (workflowName === 'adw_sdlc_iso') {
      const stages = ['plan', 'implement', 'test', 'review', 'document'];
      const currentIndex = stages.indexOf(currentStage);
      return currentIndex >= 0 && currentIndex < stages.length - 1
        ? stages[currentIndex + 1]
        : null;
    }
    return null;
  }),
  isWorkflowComplete: vi.fn((workflowName, currentStage) => {
    if (workflowName === 'adw_sdlc_iso') {
      return currentStage === 'document';
    }
    return false;
  })
}));

import stageProgressionService from '../stageProgressionService.js';
import { simulateSubstageExecution, getNextSubstage, getSubstages } from '../../utils/substages';
import { getNextStageInWorkflow, isWorkflowComplete } from '../../utils/workflowValidation.js';

describe('StageProgressionService', () => {
  let service;
  let mockStore;

  beforeEach(() => {
    vi.clearAllMocks();
    service = stageProgressionService;

    // Create mock Kanban store
    mockStore = {
      getState: vi.fn(() => ({
        tasks: [],
        addTaskLog: vi.fn(),
        updateTaskProgress: vi.fn(),
        moveTaskToStage: vi.fn(),
        updateTask: vi.fn()
      }))
    };
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('startProgression', () => {
    it('should start progression for a task', () => {
      const taskId = 'task-1';

      service.startProgression(taskId, mockStore);

      expect(service.isProgressionActive(taskId)).toBe(true);
    });

    it('should not start duplicate progression', () => {
      const taskId = 'task-1';

      service.startProgression(taskId, mockStore);
      service.startProgression(taskId, mockStore);

      expect(service.activeProgressions.size).toBe(1);
    });
  });

  describe('stopProgression', () => {
    it('should stop active progression', () => {
      const taskId = 'task-1';

      service.startProgression(taskId, mockStore);
      service.stopProgression(taskId);

      expect(service.isProgressionActive(taskId)).toBe(false);
    });

    it('should handle stopping non-existent progression', () => {
      expect(() => {
        service.stopProgression('non-existent');
      }).not.toThrow();
    });
  });

  describe('isProgressionActive', () => {
    it('should return true for active progression', () => {
      const taskId = 'task-1';

      service.startProgression(taskId, mockStore);

      expect(service.isProgressionActive(taskId)).toBe(true);
    });

    it('should return false for inactive progression', () => {
      expect(service.isProgressionActive('non-existent')).toBe(false);
    });
  });

  describe('processTaskProgression', () => {
    it('should process task through substage', async () => {
      const taskId = 'task-1';
      const task = {
        id: taskId,
        stage: 'plan',
        substage: 'analyze'
      };

      mockStore.getState.mockReturnValue({
        tasks: [task],
        addTaskLog: vi.fn(),
        updateTaskProgress: vi.fn(),
        moveTaskToStage: vi.fn(),
        updateTask: vi.fn()
      });

      service.startProgression(taskId, mockStore);
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = mockStore.getState();
      expect(state.addTaskLog).toHaveBeenCalled();
      expect(state.updateTaskProgress).toHaveBeenCalled();
    });

    it('should stop when task not found', async () => {
      const taskId = 'task-1';

      mockStore.getState.mockReturnValue({
        tasks: [],
        addTaskLog: vi.fn(),
        updateTaskProgress: vi.fn()
      });

      service.startProgression(taskId, mockStore);
      await service.processTaskProgression(taskId);

      expect(service.isProgressionActive(taskId)).toBe(false);
    });

    it('should not process when progression is inactive', async () => {
      const taskId = 'task-1';

      await service.processTaskProgression(taskId);

      const state = mockStore.getState();
      expect(state.addTaskLog).not.toHaveBeenCalled();
    });
  });

  describe('executeSubstage', () => {
    it('should execute substage with progress updates', async () => {
      const task = {
        id: 'task-1',
        stage: 'plan',
        substage: 'analyze'
      };

      const state = {
        addTaskLog: vi.fn(),
        updateTaskProgress: vi.fn()
      };

      mockStore.getState.mockReturnValue(state);

      await service.executeSubstage(task, mockStore);

      expect(state.addTaskLog).toHaveBeenCalled();
      expect(state.updateTaskProgress).toHaveBeenCalled();
      expect(simulateSubstageExecution).toHaveBeenCalledWith(
        'plan',
        'analyze',
        expect.any(Function)
      );
    });

    it('should handle substage execution errors', async () => {
      const task = {
        id: 'task-1',
        stage: 'plan',
        substage: 'analyze'
      };

      simulateSubstageExecution.mockRejectedValueOnce(new Error('Execution failed'));

      const state = {
        addTaskLog: vi.fn(),
        updateTaskProgress: vi.fn()
      };

      mockStore.getState.mockReturnValue(state);

      await expect(service.executeSubstage(task, mockStore)).rejects.toThrow('Execution failed');
    });
  });

  describe('checkProgression', () => {
    it('should move to next substage when available', async () => {
      const task = {
        id: 'task-1',
        stage: 'plan',
        substage: 'analyze',
        pipelineId: 'pipeline-1'
      };

      const state = {
        updateTaskProgress: vi.fn(),
        moveTaskToStage: vi.fn(),
        addTaskLog: vi.fn()
      };

      mockStore.getState.mockReturnValue({
        tasks: [task],
        ...state
      });

      service.startProgression('task-1', mockStore);

      await service.checkProgression(task, mockStore);

      expect(getNextSubstage).toHaveBeenCalledWith('plan', 'analyze');
      expect(state.updateTaskProgress).toHaveBeenCalled();
    });

    it('should move to next stage when substages complete', async () => {
      const task = {
        id: 'task-1',
        stage: 'plan',
        substage: 'breakdown',
        pipelineId: 'pipeline-1'
      };

      getNextSubstage.mockReturnValueOnce(null);

      const state = {
        updateTaskProgress: vi.fn(),
        moveTaskToStage: vi.fn(),
        addTaskLog: vi.fn()
      };

      mockStore.getState.mockReturnValue({
        tasks: [task],
        ...state
      });

      service.startProgression('task-1', mockStore);

      await service.checkProgression(task, mockStore);

      expect(state.moveTaskToStage).toHaveBeenCalled();
    });

    it('should handle workflow completion', async () => {
      const task = {
        id: 'task-1',
        stage: 'document',
        substage: 'changelog',
        metadata: {
          workflow_name: 'adw_sdlc_iso'
        }
      };

      getNextSubstage.mockReturnValueOnce(null);
      isWorkflowComplete.mockReturnValueOnce(true);

      const state = {
        updateTaskProgress: vi.fn(),
        moveTaskToStage: vi.fn(),
        addTaskLog: vi.fn(),
        updateTask: vi.fn()
      };

      mockStore.getState.mockReturnValue({
        tasks: [task],
        ...state
      });

      service.startProgression('task-1', mockStore);

      await service.checkProgression(task, mockStore);

      expect(state.moveTaskToStage).toHaveBeenCalledWith('task-1', 'pr');
      expect(service.isProgressionActive('task-1')).toBe(false);
    });

    it('should use workflow-aware progression when workflow name exists', async () => {
      const task = {
        id: 'task-1',
        stage: 'plan',
        substage: 'breakdown',
        metadata: {
          workflow_name: 'adw_sdlc_iso'
        }
      };

      getNextSubstage.mockReturnValueOnce(null);
      isWorkflowComplete.mockReturnValueOnce(false);
      getNextStageInWorkflow.mockReturnValueOnce('implement');

      const state = {
        updateTaskProgress: vi.fn(),
        moveTaskToStage: vi.fn(),
        addTaskLog: vi.fn()
      };

      mockStore.getState.mockReturnValue({
        tasks: [task],
        ...state
      });

      service.startProgression('task-1', mockStore);

      await service.checkProgression(task, mockStore);

      expect(getNextStageInWorkflow).toHaveBeenCalledWith('adw_sdlc_iso', 'plan');
      expect(state.moveTaskToStage).toHaveBeenCalledWith('task-1', 'implement');
    });
  });

  describe('handleProgressionError', () => {
    it('should move task to errored stage', () => {
      const task = {
        id: 'task-1',
        stage: 'plan',
        substage: 'analyze'
      };

      const error = new Error('Test error');

      const state = {
        moveTaskToStage: vi.fn(),
        updateTaskProgress: vi.fn(),
        addTaskLog: vi.fn()
      };

      mockStore.getState.mockReturnValue(state);

      service.handleProgressionError(task, mockStore, error);

      expect(state.moveTaskToStage).toHaveBeenCalledWith('task-1', 'errored');
      expect(state.addTaskLog).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          stage: 'errored',
          level: 'error'
        })
      );
      expect(service.isProgressionActive('task-1')).toBe(false);
    });
  });

  describe('recoverFromError', () => {
    it('should recover task from errored state', async () => {
      const taskId = 'task-1';
      const task = {
        id: taskId,
        stage: 'errored',
        substage: 'identify',
        metadata: {
          previousStage: 'plan'
        }
      };

      const state = {
        tasks: [task],
        updateTaskProgress: vi.fn(),
        moveTaskToStage: vi.fn(),
        addTaskLog: vi.fn()
      };

      mockStore.getState.mockReturnValue(state);

      await service.recoverFromError(taskId, mockStore);

      expect(state.moveTaskToStage).toHaveBeenCalledWith(taskId, 'plan');
      expect(service.isProgressionActive(taskId)).toBe(true);
    });

    it('should throw error when task not in errored state', async () => {
      const taskId = 'task-1';
      const task = {
        id: taskId,
        stage: 'plan',
        substage: 'analyze'
      };

      mockStore.getState.mockReturnValue({
        tasks: [task]
      });

      await expect(service.recoverFromError(taskId, mockStore)).rejects.toThrow(
        'Task is not in errored state'
      );
    });

    it('should use target stage if provided', async () => {
      const taskId = 'task-1';
      const task = {
        id: taskId,
        stage: 'errored',
        substage: 'identify'
      };

      const state = {
        tasks: [task],
        updateTaskProgress: vi.fn(),
        moveTaskToStage: vi.fn(),
        addTaskLog: vi.fn()
      };

      mockStore.getState.mockReturnValue(state);

      await service.recoverFromError(taskId, mockStore, 'test');

      expect(state.moveTaskToStage).toHaveBeenCalledWith(taskId, 'test');
    });
  });

  describe('pauseProgression', () => {
    it('should pause active progression', () => {
      const taskId = 'task-1';

      service.startProgression(taskId, mockStore);
      service.pauseProgression(taskId);

      const progression = service.activeProgressions.get(taskId);
      expect(progression.isPaused).toBe(true);
    });
  });

  describe('resumeProgression', () => {
    it('should resume paused progression', () => {
      const taskId = 'task-1';
      const task = {
        id: taskId,
        stage: 'plan',
        substage: 'analyze'
      };

      mockStore.getState.mockReturnValue({
        tasks: [task],
        addTaskLog: vi.fn(),
        updateTaskProgress: vi.fn()
      });

      service.startProgression(taskId, mockStore);
      service.pauseProgression(taskId);
      service.resumeProgression(taskId);

      const progression = service.activeProgressions.get(taskId);
      expect(progression.isPaused).toBe(false);
    });
  });

  describe('getProgressionStatus', () => {
    it('should return status for active progression', () => {
      const taskId = 'task-1';

      service.startProgression(taskId, mockStore);

      const status = service.getProgressionStatus(taskId);

      expect(status.active).toBe(true);
      expect(status).toHaveProperty('startedAt');
      expect(status).toHaveProperty('duration');
    });

    it('should return inactive status for non-existent progression', () => {
      const status = service.getProgressionStatus('non-existent');

      expect(status.active).toBe(false);
    });
  });

  describe('getActiveProgressions', () => {
    it('should return all active progressions', () => {
      service.startProgression('task-1', mockStore);
      service.startProgression('task-2', mockStore);

      const activeProgressions = service.getActiveProgressions();

      expect(activeProgressions).toHaveLength(2);
      expect(activeProgressions[0]).toHaveProperty('taskId');
      expect(activeProgressions[0]).toHaveProperty('active', true);
    });
  });

  describe('forceAdvanceToStage', () => {
    it('should force advance task to target stage', () => {
      const taskId = 'task-1';
      const task = {
        id: taskId,
        stage: 'plan',
        substage: 'analyze'
      };

      const state = {
        tasks: [task],
        moveTaskToStage: vi.fn(),
        updateTaskProgress: vi.fn(),
        addTaskLog: vi.fn()
      };

      mockStore.getState.mockReturnValue(state);

      service.forceAdvanceToStage(taskId, mockStore, 'test');

      expect(state.moveTaskToStage).toHaveBeenCalledWith(taskId, 'test');
      expect(state.addTaskLog).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          stage: 'test',
          level: 'warning'
        })
      );
      expect(service.isProgressionActive(taskId)).toBe(true);
    });

    it('should throw error when task not found', () => {
      mockStore.getState.mockReturnValue({
        tasks: []
      });

      expect(() => {
        service.forceAdvanceToStage('non-existent', mockStore, 'test');
      }).toThrow('Task not found');
    });
  });

  describe('cleanup', () => {
    it('should stop all active progressions', () => {
      service.startProgression('task-1', mockStore);
      service.startProgression('task-2', mockStore);

      service.cleanup();

      expect(service.activeProgressions.size).toBe(0);
      expect(service.isProgressionActive('task-1')).toBe(false);
      expect(service.isProgressionActive('task-2')).toBe(false);
    });
  });
});
