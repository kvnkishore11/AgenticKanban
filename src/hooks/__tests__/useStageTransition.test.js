import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStageTransition } from '../useStageTransition';

describe('useStageTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const task = {
        id: 'task-1',
        stage: 'backlog',
        metadata: {},
      };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.transitionState).toMatchObject({
        isTransitioning: false,
        transitionType: null,
        fromStage: null,
        toStage: null,
      });
    });

    it('should handle null task', () => {
      const { result } = renderHook(() => useStageTransition(null, null));

      expect(result.current.transitionState.isTransitioning).toBe(false);
    });

    it('should provide all necessary methods', () => {
      const task = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.getTransitionClass).toBeInstanceOf(Function);
      expect(result.current.getGlowClass).toBeInstanceOf(Function);
      expect(result.current.shouldPulse).toBeInstanceOf(Function);
      expect(result.current.triggerTransition).toBeInstanceOf(Function);
    });
  });

  describe('Stage Transitions', () => {
    it('should detect stage change and trigger transition', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'backlog',
        metadata: {},
      };

      const { result, rerender } = renderHook(
        ({ task, workflowProgress }) => useStageTransition(task, workflowProgress),
        {
          initialProps: { task: initialTask, workflowProgress: null },
        }
      );

      expect(result.current.transitionState.isTransitioning).toBe(false);

      const updatedTask = {
        ...initialTask,
        stage: 'in-progress',
      };

      act(() => {
        rerender({ task: updatedTask, workflowProgress: null });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.fromStage).toBe('backlog');
      expect(result.current.transitionState.toStage).toBe('in-progress');
      expect(result.current.transitionState.transitionType).toBe('progress');
    });

    it('should clear transition state after animation duration', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'backlog',
        metadata: {},
      };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        {
          initialProps: { task: initialTask },
        }
      );

      const updatedTask = {
        ...initialTask,
        stage: 'in-progress',
      };

      act(() => {
        rerender({ task: updatedTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.transitionState.isTransitioning).toBe(false);
    });

    it('should detect transition to error stage', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'in-progress',
        metadata: {},
      };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        {
          initialProps: { task: initialTask },
        }
      );

      const errorTask = {
        ...initialTask,
        stage: 'errored',
      };

      act(() => {
        rerender({ task: errorTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.transitionType).toBe('error');
    });

    it('should detect transition to completed stage', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'in-progress',
        metadata: {},
      };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        {
          initialProps: { task: initialTask },
        }
      );

      const completedTask = {
        ...initialTask,
        stage: 'completed',
      };

      act(() => {
        rerender({ task: completedTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.transitionType).toBe('completion');
    });

    it('should detect transition to ready-to-merge as success', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'in-progress',
        metadata: {},
      };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        {
          initialProps: { task: initialTask },
        }
      );

      const successTask = {
        ...initialTask,
        stage: 'ready-to-merge',
      };

      act(() => {
        rerender({ task: successTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.transitionType).toBe('success');
    });

    it('should detect transition to document stage as success', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'in-progress',
        metadata: {},
      };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        {
          initialProps: { task: initialTask },
        }
      );

      const documentTask = {
        ...initialTask,
        stage: 'document',
      };

      act(() => {
        rerender({ task: documentTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.transitionType).toBe('success');
    });

    it('should detect transition to pr stage as success', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'in-progress',
        metadata: {},
      };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        {
          initialProps: { task: initialTask },
        }
      );

      const prTask = {
        ...initialTask,
        stage: 'pr',
      };

      act(() => {
        rerender({ task: prTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.transitionType).toBe('success');
    });
  });

  describe('Workflow Completion', () => {
    it('should detect workflow completion', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'in-progress',
        metadata: { workflow_complete: false },
      };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        {
          initialProps: { task: initialTask },
        }
      );

      const completedTask = {
        ...initialTask,
        metadata: { workflow_complete: true },
      };

      act(() => {
        rerender({ task: completedTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.transitionType).toBe('completion');
    });

    it('should detect workflow completion without stage change', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'document',
        metadata: {},
      };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        {
          initialProps: { task: initialTask },
        }
      );

      const completedTask = {
        ...initialTask,
        metadata: { workflow_complete: true },
      };

      act(() => {
        rerender({ task: completedTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.transitionType).toBe('completion');
      expect(result.current.transitionState.fromStage).toBe('document');
      expect(result.current.transitionState.toStage).toBe('document');
    });

    it('should use longer animation for completion', () => {
      const initialTask = {
        id: 'task-1',
        stage: 'document',
        metadata: {},
      };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        {
          initialProps: { task: initialTask },
        }
      );

      const completedTask = {
        ...initialTask,
        metadata: { workflow_complete: true },
      };

      act(() => {
        rerender({ task: completedTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.transitionState.isTransitioning).toBe(false);
    });
  });

  describe('getTransitionClass', () => {
    it('should return empty string when not transitioning', () => {
      const task = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.getTransitionClass()).toBe('');
    });

    it('should return success class for success transition', () => {
      const initialTask = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        { initialProps: { task: initialTask } }
      );

      const updatedTask = { ...initialTask, stage: 'ready-to-merge' };

      act(() => {
        rerender({ task: updatedTask });
      });

      expect(result.current.getTransitionClass()).toBe('stage-transition-success');
    });

    it('should return error class for error transition', () => {
      const initialTask = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        { initialProps: { task: initialTask } }
      );

      const errorTask = { ...initialTask, stage: 'errored' };

      act(() => {
        rerender({ task: errorTask });
      });

      expect(result.current.getTransitionClass()).toBe('stage-transition-error');
    });

    it('should return completion class for completion transition', () => {
      const initialTask = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        { initialProps: { task: initialTask } }
      );

      const completedTask = { ...initialTask, stage: 'completed' };

      act(() => {
        rerender({ task: completedTask });
      });

      expect(result.current.getTransitionClass()).toBe('stage-transition-completion');
    });

    it('should return progress class for progress transition', () => {
      const initialTask = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        { initialProps: { task: initialTask } }
      );

      const progressTask = { ...initialTask, stage: 'in-progress' };

      act(() => {
        rerender({ task: progressTask });
      });

      expect(result.current.getTransitionClass()).toBe('stage-transition-progress');
    });
  });

  describe('getGlowClass', () => {
    it('should return empty string for null task', () => {
      const { result } = renderHook(() => useStageTransition(null, null));

      expect(result.current.getGlowClass()).toBe('');
    });

    it('should return active glow for in-progress workflow', () => {
      const task = { id: 'task-1', stage: 'in-progress', metadata: {} };
      const workflowProgress = { status: 'in_progress' };

      const { result } = renderHook(() => useStageTransition(task, workflowProgress));

      expect(result.current.getGlowClass()).toBe('card-glow-active');
    });

    it('should return success glow for completed workflow', () => {
      const task = {
        id: 'task-1',
        stage: 'document',
        metadata: { workflow_complete: true },
      };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.getGlowClass()).toBe('card-glow-success');
    });

    it('should return success glow for completed stage', () => {
      const task = {
        id: 'task-1',
        stage: 'completed',
        metadata: {},
      };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.getGlowClass()).toBe('card-glow-success');
    });

    it('should return error glow for errored stage', () => {
      const task = {
        id: 'task-1',
        stage: 'errored',
        metadata: {},
      };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.getGlowClass()).toBe('card-glow-error');
    });

    it('should prioritize active workflow over other states', () => {
      const task = {
        id: 'task-1',
        stage: 'completed',
        metadata: { workflow_complete: true },
      };
      const workflowProgress = { status: 'in_progress' };

      const { result } = renderHook(() => useStageTransition(task, workflowProgress));

      expect(result.current.getGlowClass()).toBe('card-glow-active');
    });

    it('should return empty string for normal task state', () => {
      const task = {
        id: 'task-1',
        stage: 'in-progress',
        metadata: {},
      };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.getGlowClass()).toBe('');
    });
  });

  describe('shouldPulse', () => {
    it('should return true for in-progress workflow', () => {
      const task = { id: 'task-1', stage: 'in-progress', metadata: {} };
      const workflowProgress = { status: 'in_progress' };

      const { result } = renderHook(() => useStageTransition(task, workflowProgress));

      expect(result.current.shouldPulse()).toBe(true);
    });

    it('should return false for completed workflow', () => {
      const task = { id: 'task-1', stage: 'completed', metadata: {} };
      const workflowProgress = { status: 'completed' };

      const { result } = renderHook(() => useStageTransition(task, workflowProgress));

      expect(result.current.shouldPulse()).toBe(false);
    });

    it('should return false when no workflow progress', () => {
      const task = { id: 'task-1', stage: 'in-progress', metadata: {} };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.shouldPulse()).toBe(false);
    });
  });

  describe('triggerTransition', () => {
    it('should manually trigger a transition', () => {
      const task = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.transitionState.isTransitioning).toBe(false);

      act(() => {
        result.current.triggerTransition('success');
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.transitionType).toBe('success');
      expect(result.current.transitionState.fromStage).toBe('backlog');
      expect(result.current.transitionState.toStage).toBe('backlog');
    });

    it('should use default progress type when no type specified', () => {
      const task = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result } = renderHook(() => useStageTransition(task, null));

      act(() => {
        result.current.triggerTransition();
      });

      expect(result.current.transitionState.transitionType).toBe('progress');
    });

    it('should clear transition after timeout', () => {
      const task = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result } = renderHook(() => useStageTransition(task, null));

      act(() => {
        result.current.triggerTransition('error');
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.transitionState.isTransitioning).toBe(false);
    });

    it('should handle rapid manual triggers', () => {
      const task = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result } = renderHook(() => useStageTransition(task, null));

      act(() => {
        result.current.triggerTransition('success');
      });

      expect(result.current.transitionState.transitionType).toBe('success');

      act(() => {
        vi.advanceTimersByTime(500);
        result.current.triggerTransition('error');
      });

      expect(result.current.transitionState.transitionType).toBe('error');
      expect(result.current.transitionState.isTransitioning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.transitionState.isTransitioning).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup timers on unmount', () => {
      const initialTask = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result, rerender, unmount } = renderHook(
        ({ task }) => useStageTransition(task, null),
        { initialProps: { task: initialTask } }
      );

      const updatedTask = { ...initialTask, stage: 'in-progress' };

      act(() => {
        rerender({ task: updatedTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);

      unmount();

      // Verify no errors thrown after unmount
      expect(() => {
        act(() => {
          vi.advanceTimersByTime(2000);
        });
      }).not.toThrow();
    });

    it('should clear previous timeout when new transition occurs', () => {
      const initialTask = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        { initialProps: { task: initialTask } }
      );

      const task1 = { ...initialTask, stage: 'in-progress' };

      act(() => {
        rerender({ task: task1 });
      });

      expect(result.current.transitionState.fromStage).toBe('backlog');
      expect(result.current.transitionState.toStage).toBe('in-progress');

      act(() => {
        vi.advanceTimersByTime(500);
      });

      const task2 = { ...task1, stage: 'completed' };

      act(() => {
        rerender({ task: task2 });
      });

      expect(result.current.transitionState.fromStage).toBe('in-progress');
      expect(result.current.transitionState.toStage).toBe('completed');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.transitionState.isTransitioning).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle task with no metadata', () => {
      const task = { id: 'task-1', stage: 'backlog' };

      const { result } = renderHook(() => useStageTransition(task, null));

      expect(result.current.transitionState.isTransitioning).toBe(false);
      expect(result.current.getGlowClass()).toBe('');
    });

    it('should handle rapid stage changes', () => {
      const initialTask = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        { initialProps: { task: initialTask } }
      );

      act(() => {
        rerender({ task: { ...initialTask, stage: 'in-progress' } });
      });

      act(() => {
        vi.advanceTimersByTime(100);
        rerender({ task: { ...initialTask, stage: 'ready-to-merge' } });
      });

      act(() => {
        vi.advanceTimersByTime(100);
        rerender({ task: { ...initialTask, stage: 'completed' } });
      });

      expect(result.current.transitionState.isTransitioning).toBe(true);
      expect(result.current.transitionState.transitionType).toBe('completion');
    });

    it('should not transition when stage remains the same', () => {
      const initialTask = { id: 'task-1', stage: 'backlog', metadata: {} };

      const { result, rerender } = renderHook(
        ({ task }) => useStageTransition(task, null),
        { initialProps: { task: initialTask } }
      );

      const updatedTask = { ...initialTask, title: 'Updated title' };

      act(() => {
        rerender({ task: updatedTask });
      });

      expect(result.current.transitionState.isTransitioning).toBe(false);
    });

    it('should handle undefined workflow progress', () => {
      const task = { id: 'task-1', stage: 'in-progress', metadata: {} };

      const { result } = renderHook(() => useStageTransition(task, undefined));

      expect(result.current.shouldPulse()).toBe(false);
      expect(result.current.getGlowClass()).toBe('');
    });
  });
});
