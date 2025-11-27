import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with empty toasts array', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toEqual([]);
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should provide all toast methods', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.addToast).toBeInstanceOf(Function);
      expect(result.current.removeToast).toBeInstanceOf(Function);
      expect(result.current.success).toBeInstanceOf(Function);
      expect(result.current.error).toBeInstanceOf(Function);
      expect(result.current.warning).toBeInstanceOf(Function);
      expect(result.current.info).toBeInstanceOf(Function);
    });
  });

  describe('addToast', () => {
    it('should add a toast to the toasts array', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast({
          type: 'info',
          message: 'Test message',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'info',
        message: 'Test message',
      });
      expect(result.current.toasts[0].id).toBeDefined();
    });

    it('should generate unique IDs for toasts', () => {
      const { result } = renderHook(() => useToast());

      let id1, id2;
      act(() => {
        id1 = result.current.addToast({ type: 'info', message: 'Toast 1' });
        id2 = result.current.addToast({ type: 'info', message: 'Toast 2' });
      });

      expect(id1).not.toBe(id2);
      expect(result.current.toasts[0].id).toBe(id1);
      expect(result.current.toasts[1].id).toBe(id2);
    });

    it('should return the toast ID', () => {
      const { result } = renderHook(() => useToast());

      let toastId;
      act(() => {
        toastId = result.current.addToast({
          type: 'success',
          message: 'Success message',
        });
      });

      expect(toastId).toBeDefined();
      expect(typeof toastId).toBe('number');
    });

    it('should add multiple toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast({ type: 'info', message: 'Toast 1' });
        result.current.addToast({ type: 'success', message: 'Toast 2' });
        result.current.addToast({ type: 'error', message: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);
    });

    it('should auto-remove toast after default duration (5000ms)', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast({
          type: 'info',
          message: 'Auto-remove test',
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should auto-remove toast after custom duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast({
          type: 'warning',
          message: 'Custom duration',
          duration: 3000,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(2999);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should not auto-remove toast when duration is 0', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast({
          type: 'error',
          message: 'Persistent toast',
          duration: 0,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it('should preserve custom toast properties', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast({
          type: 'success',
          message: 'Custom props',
          title: 'Success',
          action: 'Undo',
          customData: { foo: 'bar' },
        });
      });

      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        message: 'Custom props',
        title: 'Success',
        action: 'Undo',
        customData: { foo: 'bar' },
      });
    });
  });

  describe('removeToast', () => {
    it('should remove a toast by ID', () => {
      const { result } = renderHook(() => useToast());

      let toastId;
      act(() => {
        toastId = result.current.addToast({
          type: 'info',
          message: 'Remove me',
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.removeToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should only remove the specified toast', () => {
      const { result } = renderHook(() => useToast());

      let id1, id2, id3;
      act(() => {
        id1 = result.current.addToast({ type: 'info', message: 'Toast 1' });
        id2 = result.current.addToast({ type: 'info', message: 'Toast 2' });
        id3 = result.current.addToast({ type: 'info', message: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.removeToast(id2);
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts.find((t) => t.id === id1)).toBeDefined();
      expect(result.current.toasts.find((t) => t.id === id2)).toBeUndefined();
      expect(result.current.toasts.find((t) => t.id === id3)).toBeDefined();
    });

    it('should handle removing non-existent toast ID', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast({ type: 'info', message: 'Toast' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.removeToast(99999);
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it('should handle removing from empty toasts array', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toHaveLength(0);

      act(() => {
        result.current.removeToast(12345);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('success', () => {
    it('should add a success toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Operation successful');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        message: 'Operation successful',
      });
    });

    it('should accept custom options', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Success', {
          duration: 3000,
          title: 'Great!',
        });
      });

      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        message: 'Success',
        duration: 3000,
        title: 'Great!',
      });
    });

    it('should return toast ID', () => {
      const { result } = renderHook(() => useToast());

      let id;
      act(() => {
        id = result.current.success('Success message');
      });

      expect(id).toBeDefined();
      expect(result.current.toasts[0].id).toBe(id);
    });
  });

  describe('error', () => {
    it('should add an error toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Operation failed');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'error',
        message: 'Operation failed',
      });
    });

    it('should accept custom options', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('Error', {
          duration: 0,
          action: 'Retry',
        });
      });

      expect(result.current.toasts[0]).toMatchObject({
        type: 'error',
        message: 'Error',
        duration: 0,
        action: 'Retry',
      });
    });

    it('should return toast ID', () => {
      const { result } = renderHook(() => useToast());

      let id;
      act(() => {
        id = result.current.error('Error message');
      });

      expect(id).toBeDefined();
      expect(result.current.toasts[0].id).toBe(id);
    });
  });

  describe('warning', () => {
    it('should add a warning toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.warning('Warning message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'warning',
        message: 'Warning message',
      });
    });

    it('should accept custom options', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.warning('Caution', {
          duration: 7000,
        });
      });

      expect(result.current.toasts[0]).toMatchObject({
        type: 'warning',
        message: 'Caution',
        duration: 7000,
      });
    });

    it('should return toast ID', () => {
      const { result } = renderHook(() => useToast());

      let id;
      act(() => {
        id = result.current.warning('Warning');
      });

      expect(id).toBeDefined();
      expect(result.current.toasts[0].id).toBe(id);
    });
  });

  describe('info', () => {
    it('should add an info toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.info('Information');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'info',
        message: 'Information',
      });
    });

    it('should accept custom options', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.info('FYI', {
          duration: 2000,
          icon: 'custom-icon',
        });
      });

      expect(result.current.toasts[0]).toMatchObject({
        type: 'info',
        message: 'FYI',
        duration: 2000,
        icon: 'custom-icon',
      });
    });

    it('should return toast ID', () => {
      const { result } = renderHook(() => useToast());

      let id;
      act(() => {
        id = result.current.info('Info');
      });

      expect(id).toBeDefined();
      expect(result.current.toasts[0].id).toBe(id);
    });
  });

  describe('Multiple Toast Types', () => {
    it('should handle multiple toast types simultaneously', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Success');
        result.current.error('Error');
        result.current.warning('Warning');
        result.current.info('Info');
      });

      expect(result.current.toasts).toHaveLength(4);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[1].type).toBe('error');
      expect(result.current.toasts[2].type).toBe('warning');
      expect(result.current.toasts[3].type).toBe('info');
    });

    it('should maintain correct order of toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.info('First');
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.success('Second');
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.error('Third');
      });

      expect(result.current.toasts[0].message).toBe('First');
      expect(result.current.toasts[1].message).toBe('Second');
      expect(result.current.toasts[2].message).toBe('Third');
    });
  });

  describe('Auto-removal edge cases', () => {
    it('should handle rapid toast additions and removals', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast({ type: 'info', message: '1', duration: 1000 });
        result.current.addToast({ type: 'info', message: '2', duration: 2000 });
        result.current.addToast({ type: 'info', message: '3', duration: 3000 });
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.toasts).toHaveLength(2);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle manual removal before auto-removal', () => {
      const { result } = renderHook(() => useToast());

      let id;
      act(() => {
        id = result.current.addToast({
          type: 'info',
          message: 'Test',
          duration: 5000,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(2000);
        result.current.removeToast(id);
      });

      expect(result.current.toasts).toHaveLength(0);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle hook unmount with pending timers', () => {
      const { result, unmount } = renderHook(() => useToast());

      act(() => {
        result.current.addToast({
          type: 'info',
          message: 'Test',
          duration: 5000,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      unmount();

      // Advance timers after unmount - should not cause errors
      expect(() => {
        act(() => {
          vi.advanceTimersByTime(10000);
        });
      }).not.toThrow();
    });
  });

  describe('State persistence', () => {
    it('should maintain state across multiple operations', () => {
      const { result } = renderHook(() => useToast());

      let id1, id2;
      act(() => {
        id1 = result.current.success('First');
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        id2 = result.current.error('Second');
      });

      expect(result.current.toasts).toHaveLength(2);

      act(() => {
        result.current.removeToast(id1);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].id).toBe(id2);

      act(() => {
        result.current.info('Third');
      });

      expect(result.current.toasts).toHaveLength(2);
    });
  });
});
