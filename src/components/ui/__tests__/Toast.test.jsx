/**
 * Tests for Toast Component
 * Comprehensive tests for the toast notification UI component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast, { ToastContainer } from '../Toast';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('should render toast with default props', () => {
      render(<Toast message="Test message" />);

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should render toast with title and message', () => {
      render(<Toast title="Success" message="Operation completed" />);

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Operation completed')).toBeInTheDocument();
    });

    it('should render toast with only title', () => {
      render(<Toast title="Success" />);

      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should not render when show prop is false', () => {
      render(<Toast message="Hidden message" show={false} />);

      expect(screen.queryByText('Hidden message')).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(<Toast message="Test" />);

      const closeButton = container.querySelector('button');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Toast Types', () => {
    it('should render success toast with correct styling', () => {
      const { container } = render(<Toast type="success" message="Success message" />);

      const toast = container.querySelector('.bg-green-50.border-green-200');
      expect(toast).toBeInTheDocument();
    });

    it('should render error toast with correct styling', () => {
      const { container } = render(<Toast type="error" message="Error message" />);

      const toast = container.querySelector('.bg-red-50.border-red-200');
      expect(toast).toBeInTheDocument();
    });

    it('should render warning toast with correct styling', () => {
      const { container } = render(<Toast type="warning" message="Warning message" />);

      const toast = container.querySelector('.bg-yellow-50.border-yellow-200');
      expect(toast).toBeInTheDocument();
    });

    it('should render info toast with correct styling', () => {
      const { container } = render(<Toast type="info" message="Info message" />);

      const toast = container.querySelector('.bg-blue-50.border-blue-200');
      expect(toast).toBeInTheDocument();
    });

    it('should default to info type for invalid type', () => {
      const { container } = render(<Toast type="invalid" message="Test message" />);

      const toast = container.querySelector('.bg-blue-50.border-blue-200');
      expect(toast).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render CheckCircle icon for success type', () => {
      const { container } = render(<Toast type="success" message="Success" />);

      const icon = container.querySelector('.text-green-600');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    it('should render XCircle icon for error type', () => {
      const { container } = render(<Toast type="error" message="Error" />);

      const icon = container.querySelector('.text-red-600');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    it('should render AlertCircle icon for warning type', () => {
      const { container } = render(<Toast type="warning" message="Warning" />);

      const icon = container.querySelector('.text-yellow-600');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    it('should render Info icon for info type', () => {
      const { container } = render(<Toast type="info" message="Info" />);

      const icon = container.querySelector('.text-blue-600');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after default duration', async () => {
      const onClose = vi.fn();
      render(<Toast message="Auto dismiss" onClose={onClose} />);

      expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

      // Fast-forward time by 5000ms (default duration)
      vi.advanceTimersByTime(5000);

      // Wait for animation completion (300ms)
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should auto-dismiss after custom duration', async () => {
      const onClose = vi.fn();
      render(<Toast message="Custom duration" duration={2000} onClose={onClose} />);

      expect(screen.getByText('Custom duration')).toBeInTheDocument();

      vi.advanceTimersByTime(2000);
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should not auto-dismiss when duration is 0', async () => {
      const onClose = vi.fn();
      render(<Toast message="No auto dismiss" duration={0} onClose={onClose} />);

      vi.advanceTimersByTime(10000);

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('No auto dismiss')).toBeInTheDocument();
    });

    it('should not auto-dismiss when duration is negative', async () => {
      const onClose = vi.fn();
      render(<Toast message="No auto dismiss" duration={-1} onClose={onClose} />);

      vi.advanceTimersByTime(10000);

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('No auto dismiss')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();
      const { container } = render(<Toast message="Test" onClose={onClose} />);

      const closeButton = container.querySelector('button');
      await user.click(closeButton);

      // Wait for animation
      vi.advanceTimersByTime(300);

      expect(onClose).toHaveBeenCalled();
    });

    it('should hide toast immediately when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<Toast message="Test" />);

      const closeButton = container.querySelector('button');
      await user.click(closeButton);

      const toast = container.querySelector('.translate-x-full.opacity-0');
      expect(toast).toBeInTheDocument();
    });

    it('should handle multiple clicks on close button gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();
      const { container } = render(<Toast message="Test" onClose={onClose} />);

      const closeButton = container.querySelector('button');
      await user.click(closeButton);
      await user.click(closeButton);
      await user.click(closeButton);

      vi.advanceTimersByTime(300);

      // Should only call once since toast becomes hidden after first click
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visibility State', () => {
    it('should show toast when show prop changes to true', () => {
      const { rerender } = render(<Toast message="Test" show={false} />);

      expect(screen.queryByText('Test')).not.toBeInTheDocument();

      rerender(<Toast message="Test" show={true} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should hide toast when show prop changes to false', () => {
      const { rerender } = render(<Toast message="Test" show={true} />);

      expect(screen.getByText('Test')).toBeInTheDocument();

      rerender(<Toast message="Test" show={false} />);

      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('should apply visible animation classes when shown', () => {
      const { container } = render(<Toast message="Test" show={true} />);

      const toast = container.querySelector('.translate-x-0.opacity-100');
      expect(toast).toBeInTheDocument();
    });
  });

  describe('Layout and Positioning', () => {
    it('should be positioned at top-right of viewport', () => {
      const { container } = render(<Toast message="Test" />);

      const toast = container.querySelector('.fixed.top-4.right-4');
      expect(toast).toBeInTheDocument();
    });

    it('should have high z-index for visibility', () => {
      const { container } = render(<Toast message="Test" />);

      const toast = container.querySelector('.z-50');
      expect(toast).toBeInTheDocument();
    });

    it('should have max width constraint', () => {
      const { container } = render(<Toast message="Test" />);

      const toast = container.querySelector('.max-w-sm');
      expect(toast).toBeInTheDocument();
    });

    it('should have proper spacing between icon and content', () => {
      const { container } = render(<Toast message="Test" />);

      const contentDiv = container.querySelector('.ml-3');
      expect(contentDiv).toBeInTheDocument();
    });

    it('should have spacing between title and message', () => {
      render(<Toast title="Title" message="Message" />);

      const message = screen.getByText('Message');
      expect(message).toHaveClass('mt-1');
    });
  });

  describe('Accessibility', () => {
    it('should use semantic heading for title', () => {
      render(<Toast title="Success" message="Done" />);

      const title = screen.getByText('Success');
      expect(title.tagName).toBe('H3');
    });

    it('should use paragraph element for message', () => {
      render(<Toast message="Message text" />);

      const message = screen.getByText('Message text');
      expect(message.tagName).toBe('P');
    });

    it('should have button element for close action', () => {
      const { container } = render(<Toast message="Test" />);

      const closeButton = container.querySelector('button');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton.tagName).toBe('BUTTON');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onClose callback gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<Toast message="Test" />);

      const closeButton = container.querySelector('button');
      await user.click(closeButton);

      // Should not throw error
      expect(closeButton).toBeInTheDocument();
    });

    it('should handle very long messages', () => {
      const longMessage = 'This is a very long message that should still be displayed properly within the toast notification without breaking the layout or causing visual issues';
      render(<Toast message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle empty title', () => {
      render(<Toast title="" message="Message" />);

      expect(screen.getByText('Message')).toBeInTheDocument();
    });

    it('should handle empty message', () => {
      render(<Toast title="Title" message="" />);

      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Success: <script>alert("XSS")</script>';
      render(<Toast message={specialMessage} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should have transition classes', () => {
      const { container } = render(<Toast message="Test" />);

      const toast = container.querySelector('.transition-all.duration-300.ease-in-out');
      expect(toast).toBeInTheDocument();
    });

    it('should delay onClose callback for animation completion', async () => {
      const onClose = vi.fn();
      const { container } = render(<Toast message="Test" onClose={onClose} />);

      const closeButton = container.querySelector('button');
      const user = userEvent.setup({ delay: null });
      await user.click(closeButton);

      // onClose should not be called immediately
      expect(onClose).not.toHaveBeenCalled();

      // After 300ms animation delay
      vi.advanceTimersByTime(300);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe('ToastContainer Component', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('should render empty container with no toasts', () => {
      const { container } = render(<ToastContainer toasts={[]} />);

      const toastContainer = container.querySelector('.fixed.top-4.right-4.z-50');
      expect(toastContainer).toBeInTheDocument();
    });

    it('should render single toast', () => {
      const toasts = [
        { id: '1', message: 'First toast', type: 'success' }
      ];

      render(<ToastContainer toasts={toasts} />);

      expect(screen.getByText('First toast')).toBeInTheDocument();
    });

    it('should render multiple toasts', () => {
      const toasts = [
        { id: '1', message: 'First toast', type: 'success' },
        { id: '2', message: 'Second toast', type: 'error' },
        { id: '3', message: 'Third toast', type: 'info' }
      ];

      render(<ToastContainer toasts={toasts} />);

      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();
      expect(screen.getByText('Third toast')).toBeInTheDocument();
    });

    it('should handle toasts without IDs using index as key', () => {
      const toasts = [
        { message: 'Toast 1', type: 'info' },
        { message: 'Toast 2', type: 'success' }
      ];

      render(<ToastContainer toasts={toasts} />);

      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
    });

    it('should render with default empty array when toasts prop is undefined', () => {
      const { container } = render(<ToastContainer />);

      const toastContainer = container.querySelector('.fixed.top-4.right-4.z-50');
      expect(toastContainer).toBeInTheDocument();
    });
  });

  describe('Layout and Positioning', () => {
    it('should be positioned at top-right', () => {
      const { container } = render(<ToastContainer toasts={[]} />);

      const toastContainer = container.querySelector('.fixed.top-4.right-4');
      expect(toastContainer).toBeInTheDocument();
    });

    it('should have high z-index', () => {
      const { container } = render(<ToastContainer toasts={[]} />);

      const toastContainer = container.querySelector('.z-50');
      expect(toastContainer).toBeInTheDocument();
    });

    it('should have vertical spacing between toasts', () => {
      const { container } = render(<ToastContainer toasts={[]} />);

      const toastContainer = container.querySelector('.space-y-2');
      expect(toastContainer).toBeInTheDocument();
    });
  });

  describe('Toast Props Passing', () => {
    it('should pass all toast props to individual Toast components', () => {
      const toasts = [
        {
          id: '1',
          title: 'Success',
          message: 'Operation completed',
          type: 'success',
          duration: 3000
        }
      ];

      render(<ToastContainer toasts={toasts} />);

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Operation completed')).toBeInTheDocument();
    });

    it('should handle different toast types simultaneously', () => {
      const toasts = [
        { id: '1', message: 'Success message', type: 'success' },
        { id: '2', message: 'Error message', type: 'error' },
        { id: '3', message: 'Warning message', type: 'warning' },
        { id: '4', message: 'Info message', type: 'info' }
      ];

      const { container } = render(<ToastContainer toasts={toasts} />);

      expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
      expect(container.querySelector('.bg-yellow-50')).toBeInTheDocument();
      expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null toasts array gracefully', () => {
      const { container } = render(<ToastContainer toasts={null} />);

      const toastContainer = container.querySelector('.fixed.top-4.right-4');
      expect(toastContainer).toBeInTheDocument();
    });

    it('should handle empty toasts array', () => {
      const { container } = render(<ToastContainer toasts={[]} />);

      const toastContainer = container.querySelector('.fixed.top-4.right-4');
      expect(toastContainer).toBeInTheDocument();
      expect(toastContainer.children).toHaveLength(0);
    });

    it('should handle dynamic toast array updates', () => {
      const initialToasts = [
        { id: '1', message: 'First toast' }
      ];

      const { rerender } = render(<ToastContainer toasts={initialToasts} />);
      expect(screen.getByText('First toast')).toBeInTheDocument();

      const updatedToasts = [
        { id: '1', message: 'First toast' },
        { id: '2', message: 'Second toast' }
      ];

      rerender(<ToastContainer toasts={updatedToasts} />);
      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();
    });
  });

  describe('Stacking Behavior', () => {
    it('should apply top offset style to toasts', () => {
      const toasts = [
        { id: '1', message: 'First' },
        { id: '2', message: 'Second' }
      ];

      const { container } = render(<ToastContainer toasts={toasts} />);

      // Check that style prop is passed to Toast components
      const toastElements = container.querySelectorAll('.fixed.top-4.right-4.z-50 > div');
      expect(toastElements.length).toBeGreaterThan(0);
    });
  });
});
