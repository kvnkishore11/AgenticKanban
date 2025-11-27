/**
 * Tests for PlanViewerModal Component
 * Comprehensive tests for implementation plan viewer modal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlanViewerModal from '../PlanViewerModal';

// Mock MDEditor
vi.mock('@uiw/react-md-editor', () => ({
  default: {
    Markdown: ({ source }) => <div data-testid="markdown-content">{source}</div>
  }
}));

describe('PlanViewerModal Component', () => {
  const mockOnClose = vi.fn();
  const MOCK_PLAN_CONTENT = '# Implementation Plan\n\n## Overview\nTest plan content';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Modal Visibility', () => {
    it('should render when isOpen is true', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText('Implementation Plan')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <PlanViewerModal
          isOpen={false}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      expect(screen.queryByText('Implementation Plan')).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByLabelText('Close plan viewer')).toBeInTheDocument();
    });

    it('should render Close button in footer', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument();
    });
  });

  describe('Task Information Display', () => {
    it('should display task ID and ADW ID when provided', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
          taskId={123}
          adwId="abc12345"
        />
      );

      expect(screen.getByText(/issue #123/i)).toBeInTheDocument();
      expect(screen.getByText(/abc12345/i)).toBeInTheDocument();
    });

    it('should not display task info when not provided', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      expect(screen.queryByText(/issue #/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading is true', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={true}
          error={null}
        />
      );

      expect(screen.getByText('Loading plan...')).toBeInTheDocument();
    });

    it('should not display content when loading', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={true}
          error={null}
        />
      );

      expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
    });

    it('should not display error when loading', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={true}
          error="Some error"
        />
      );

      expect(screen.queryByText('Error Loading Plan')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error exists and not loading', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={false}
          error="Failed to load plan"
        />
      );

      expect(screen.getByText('Error Loading Plan')).toBeInTheDocument();
      expect(screen.getByText('Failed to load plan')).toBeInTheDocument();
    });

    it('should not display content when error exists', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error="Failed to load plan"
        />
      );

      expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
    });

    it('should show error icon in error state', () => {
      const { container } = render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={false}
          error="Failed to load plan"
        />
      );

      expect(container.querySelector('.text-red-500')).toBeInTheDocument();
    });
  });

  describe('No Plan Available State', () => {
    it('should display "No Plan Available" when no content and no error', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText('No Plan Available')).toBeInTheDocument();
      expect(screen.getByText('No implementation plan found for this task.')).toBeInTheDocument();
    });

    it('should show expected filename when taskId and adwId are provided', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={false}
          error={null}
          taskId={123}
          adwId="abc12345"
        />
      );

      expect(screen.getByText(/expected: issue-123-adw-abc12345-sdlc_planner/i)).toBeInTheDocument();
    });

    it('should not show expected filename when taskId or adwId are missing', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={false}
          error={null}
        />
      );

      expect(screen.queryByText(/expected:/i)).not.toBeInTheDocument();
    });
  });

  describe('Plan Content Display', () => {
    it('should render markdown content when plan is loaded', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toBeInTheDocument();
      // Check for key content pieces instead of exact match (markdown rendering removes formatting)
      expect(markdownContent).toHaveTextContent('# Implementation Plan');
      expect(markdownContent).toHaveTextContent('## Overview');
      expect(markdownContent).toHaveTextContent('Test plan content');
    });

    it('should render complex markdown content', () => {
      const complexMarkdown = `# Plan\n## Section 1\n- Item 1\n- Item 2\n\n## Section 2\nParagraph text`;
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={complexMarkdown}
          loading={false}
          error={null}
        />
      );

      const markdownContent = screen.getByTestId('markdown-content');
      // Check for key content pieces instead of exact match (markdown rendering removes formatting)
      expect(markdownContent).toHaveTextContent('# Plan');
      expect(markdownContent).toHaveTextContent('## Section 1');
      expect(markdownContent).toHaveTextContent('Item 1');
      expect(markdownContent).toHaveTextContent('Item 2');
      expect(markdownContent).toHaveTextContent('## Section 2');
      expect(markdownContent).toHaveTextContent('Paragraph text');
    });

    it('should handle empty string plan content', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent=""
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText('No Plan Available')).toBeInTheDocument();
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when close button (X) is clicked', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      const closeButton = screen.getByLabelText('Close plan viewer');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Close button is clicked', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      const closeButton = screen.getByRole('button', { name: /^close$/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle ESC key press', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not call onClose on other key presses', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Modal Styling and Layout', () => {
    it('should apply correct styling to markdown container', () => {
      const { container } = render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      const markdownContainer = container.querySelector('[data-color-mode="light"]');
      expect(markdownContainer).toBeInTheDocument();
    });

    it('should be scrollable when content is long', () => {
      const { container } = render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      const modal = container.querySelector('.max-h-\\[90vh\\]');
      expect(modal).toBeInTheDocument();
    });

    it('should have modal overlay', () => {
      const { container } = render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null planContent gracefully', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText('No Plan Available')).toBeInTheDocument();
    });

    it('should handle undefined planContent gracefully', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={undefined}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText('No Plan Available')).toBeInTheDocument();
    });

    it('should handle very long plan content', () => {
      const longContent = 'A'.repeat(10000);
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={longContent}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should handle special markdown characters', () => {
      const specialContent = '# Plan\n```code\nfunction() {}\n```\n> Quote\n- List';
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={specialContent}
          loading={false}
          error={null}
        />
      );

      const markdownContent = screen.getByTestId('markdown-content');
      // Check for key content pieces instead of exact match (markdown rendering removes formatting)
      expect(markdownContent).toHaveTextContent('# Plan');
      expect(markdownContent).toHaveTextContent('function() {}');
      expect(markdownContent).toHaveTextContent('Quote');
      expect(markdownContent).toHaveTextContent('List');
    });

    it('should focus modal on open', () => {
      const { container } = render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={MOCK_PLAN_CONTENT}
          loading={false}
          error={null}
        />
      );

      const modal = container.querySelector('[tabindex="-1"]');
      expect(modal).toBeInTheDocument();
    });

    it('should handle taskId as number', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={false}
          error={null}
          taskId={999}
          adwId="test123"
        />
      );

      expect(screen.getByText(/issue #999/i)).toBeInTheDocument();
    });

    it('should handle taskId as string', () => {
      render(
        <PlanViewerModal
          isOpen={true}
          onClose={mockOnClose}
          planContent={null}
          loading={false}
          error={null}
          taskId="999"
          adwId="test123"
        />
      );

      expect(screen.getByText(/issue #999/i)).toBeInTheDocument();
    });
  });
});
