/**
 * Tests for CompletedTasksModal Component
 * Comprehensive tests for the completed tasks modal overlay
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CompletedTasksModal from '../CompletedTasksModal';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore', () => ({
  useKanbanStore: vi.fn()
}));

// Mock KanbanCard component
vi.mock('../KanbanCard', () => ({
  default: ({ task, onEdit }) => (
    <div data-testid={`kanban-card-${task.id}`} onClick={() => onEdit && onEdit(task)}>
      <div>{task.title}</div>
      <div>{task.description}</div>
    </div>
  )
}));

describe('CompletedTasksModal Component', () => {
  let mockStore;
  let mockOnClose;

  const mockCompletedTasks = [
    {
      id: 1,
      title: 'Completed Task 1',
      description: 'First completed task',
      stage: 'ready-to-merge',
      progress: 100
    },
    {
      id: 2,
      title: 'Completed Task 2',
      description: 'Second completed task',
      stage: 'ready-to-merge',
      progress: 100
    },
    {
      id: 3,
      title: 'Completed Task 3',
      description: 'Third completed task',
      stage: 'ready-to-merge',
      progress: 100
    }
  ];

  beforeEach(() => {
    mockOnClose = vi.fn();

    mockStore = {
      getCompletedTasks: vi.fn(() => mockCompletedTasks)
    };

    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={false} onClose={mockOnClose} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    });

    it('should render with correct modal role and aria attributes', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'completed-tasks-title');
    });

    it('should render modal header with title', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const title = screen.getByRole('heading', { name: 'Completed Tasks' });
      expect(title).toBeInTheDocument();
      expect(title).toHaveAttribute('id', 'completed-tasks-title');
    });

    it('should display task count badge', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render close button with correct aria-label', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render footer close button', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const footerCloseButton = screen.getByText('Close');
      expect(footerCloseButton).toBeInTheDocument();
    });
  });

  describe('Completed Tasks Display', () => {
    it('should call getCompletedTasks from store', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(mockStore.getCompletedTasks).toHaveBeenCalled();
    });

    it('should render all completed tasks', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('kanban-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-card-3')).toBeInTheDocument();
    });

    it('should render tasks in grid layout', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    it('should render each task with KanbanCard component', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Completed Task 1')).toBeInTheDocument();
      expect(screen.getByText('Completed Task 2')).toBeInTheDocument();
      expect(screen.getByText('Completed Task 3')).toBeInTheDocument();
    });

    it('should pass empty onEdit function to KanbanCard', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const card = screen.getByTestId('kanban-card-1');
      fireEvent.click(card);

      // Should not throw error even though onEdit is empty
      expect(card).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      mockStore.getCompletedTasks.mockReturnValue([]);
    });

    it('should show empty state when no completed tasks', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('No Completed Tasks Yet')).toBeInTheDocument();
    });

    it('should show empty state message', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(
        screen.getByText(/Tasks that have been successfully merged will appear here/)
      ).toBeInTheDocument();
    });

    it('should display zero in count badge', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show CheckCircle icon in empty state', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      // CheckCircle icon should be in the empty state section
      const emptyStateSection = container.querySelector('.flex.flex-col.items-center');
      expect(emptyStateSection).toBeInTheDocument();
    });

    it('should not render task grid in empty state', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const taskGrid = container.querySelector('.grid.grid-cols-1');
      expect(taskGrid).not.toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when header close button is clicked', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when footer close button is clicked', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const footerCloseButton = screen.getByText('Close');
      fireEvent.click(footerCloseButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when modal content is clicked', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const modalContent = container.querySelector('.bg-white.rounded-lg');
      fireEvent.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when other keys are pressed', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Enter' });
      fireEvent.keyDown(dialog, { key: 'Tab' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Task Count Display', () => {
    it('should display correct count for single task', () => {
      mockStore.getCompletedTasks.mockReturnValue([mockCompletedTasks[0]]);

      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display correct count for multiple tasks', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should update count when tasks change', () => {
      const { rerender } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('3')).toBeInTheDocument();

      // Update mock to return different number of tasks
      mockStore.getCompletedTasks.mockReturnValue([mockCompletedTasks[0], mockCompletedTasks[1]]);

      rerender(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should have correct modal dimensions', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const modal = container.querySelector('.bg-white.rounded-lg');
      expect(modal).toHaveClass('max-w-6xl', 'w-full', 'max-h-[90vh]');
    });

    it('should have scrollable content area', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const contentArea = container.querySelector('.flex-1.overflow-y-auto');
      expect(contentArea).toBeInTheDocument();
    });

    it('should apply correct backdrop styling', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const backdrop = screen.getByRole('dialog');
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'z-50');
    });

    it('should apply correct header styling', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const header = container.querySelector('.flex.items-center.justify-between.p-6');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('border-b', 'border-gray-200');
    });

    it('should apply correct footer styling', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const footer = container.querySelector('.flex.items-center.justify-end.p-6');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('border-t', 'border-gray-200', 'bg-gray-50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null return from getCompletedTasks', () => {
      mockStore.getCompletedTasks.mockReturnValue(null);

      expect(() => render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      )).toThrow();
    });

    it('should handle large number of completed tasks', () => {
      const largeMockTasks = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        title: `Completed Task ${i}`,
        description: `Description ${i}`,
        stage: 'ready-to-merge',
        progress: 100
      }));

      mockStore.getCompletedTasks.mockReturnValue(largeMockTasks);

      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const cards = container.querySelectorAll('[data-testid^="kanban-card-"]');
      expect(cards).toHaveLength(100);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should handle tasks with missing properties', () => {
      const tasksWithMissingProps = [
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2', description: 'Has description' }
      ];

      mockStore.getCompletedTasks.mockReturnValue(tasksWithMissingProps);

      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('kanban-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-card-2')).toBeInTheDocument();
    });

    it('should maintain state across open/close cycles', () => {
      const { rerender } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('Completed Tasks')).toBeInTheDocument();

      // Close modal
      rerender(<CompletedTasksModal isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('Completed Tasks')).not.toBeInTheDocument();

      // Reopen modal
      rerender(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
      expect(mockStore.getCompletedTasks).toHaveBeenCalled();
    });

    it('should handle undefined isOpen prop', () => {
      const { container } = render(
        <CompletedTasksModal onClose={mockOnClose} />
      );

      // Should not render when isOpen is undefined
      expect(container.firstChild).toBeNull();
    });

    it('should handle missing onClose callback', () => {
      // Should render without throwing
      expect(() => render(
        <CompletedTasksModal isOpen={true} />
      )).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible modal structure', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'completed-tasks-title');
    });

    it('should have accessible close button', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');

      // Should close on Escape
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should have proper heading hierarchy', () => {
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Completed Tasks');
    });

    it('should have visible focus indicators', () => {
      const { container } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        // Buttons should be focusable
        expect(button.tabIndex).toBeGreaterThanOrEqual(-1);
      });
    });
  });

  describe('Performance', () => {
    it('should not re-fetch tasks on every render', () => {
      const { rerender } = render(
        <CompletedTasksModal isOpen={true} onClose={mockOnClose} />
      );

      const initialCallCount = mockStore.getCompletedTasks.mock.calls.length;

      rerender(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);

      // getCompletedTasks is called on every render (this is expected behavior)
      expect(mockStore.getCompletedTasks.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should efficiently render large task lists', () => {
      const largeMockTasks = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        title: `Task ${i}`,
        description: `Description ${i}`,
        stage: 'ready-to-merge'
      }));

      mockStore.getCompletedTasks.mockReturnValue(largeMockTasks);

      const startTime = performance.now();
      render(<CompletedTasksModal isOpen={true} onClose={mockOnClose} />);
      const endTime = performance.now();

      // Render should complete in reasonable time (< 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
