/**
 * Tests for PlanViewer Component
 * Tests modal display, markdown rendering, and plan content handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlanViewer from '../PlanViewer';

// Mock MDEditor - component uses MDEditor.Markdown directly
vi.mock('@uiw/react-md-editor', () => ({
  default: {
    Markdown: ({ source }) => <div className="md-editor-markdown">{source}</div>
  }
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('PlanViewer Component', () => {
  const mockPlanContent = '# Test Plan\n\n## Overview\n\nThis is a test plan.';
  const mockAdwId = 'test-adw-123';
  const mockOnClose = vi.fn();
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = 'unset';
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText(/Plan: test-adw-123/)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render plan content in markdown viewer', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Component uses MDEditor.Markdown which our mock renders with .md-editor-markdown class
      const markdownContent = document.querySelector('.md-editor-markdown');
      expect(markdownContent).toHaveTextContent(mockPlanContent);
    });

    it('should display ADW ID in header', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId="custom-adw-456"
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText(/Plan: custom-adw-456/)).toBeInTheDocument();
    });

    it('should display "Unknown" when adwId is not provided', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={null}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText(/Plan: Unknown/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(
        <PlanViewer
          planContent={null}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading plan...')).toBeInTheDocument();
    });

    it('should not show copy button when loading', () => {
      render(
        <PlanViewer
          planContent={null}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
          isLoading={true}
        />
      );

      expect(screen.queryByTitle('Copy to clipboard')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Failed to load plan';
      render(
        <PlanViewer
          planContent={null}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
          error={errorMessage}
        />
      );

      expect(screen.getByText('Error loading plan')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should show retry button when error is present and onRetry is provided', () => {
      render(
        <PlanViewer
          planContent={null}
          adwId={mockAdwId}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          isOpen={true}
          error="Failed to load plan"
        />
      );

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      render(
        <PlanViewer
          planContent={null}
          adwId={mockAdwId}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          isOpen={true}
          error="Failed to load plan"
        />
      );

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when onRetry is not provided', () => {
      render(
        <PlanViewer
          planContent={null}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
          error="Failed to load plan"
        />
      );

      expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();
    });

    it('should not show copy button when error is present', () => {
      render(
        <PlanViewer
          planContent={null}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
          error="Failed to load plan"
        />
      );

      expect(screen.queryByTitle('Copy to clipboard')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when planContent is null', () => {
      render(
        <PlanViewer
          planContent={null}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.getByText('No plan content available')).toBeInTheDocument();
    });

    it('should not show copy button when planContent is null', () => {
      render(
        <PlanViewer
          planContent={null}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(screen.queryByTitle('Copy to clipboard')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button in header is clicked', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Close button in footer is clicked', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // There are multiple close buttons (header X and footer Close), get the footer one
      const closeButtons = screen.getAllByRole('button', { name: /Close/i });
      const footerCloseButton = closeButtons[closeButtons.length - 1]; // Last one is footer
      fireEvent.click(footerCloseButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', () => {
      const { container } = render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const overlay = container.firstChild;
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content is clicked', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const modalContent = screen.getByText(/Plan: test-adw-123/).closest('.bg-white');
      fireEvent.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should copy plan content to clipboard when copy button is clicked', async () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockPlanContent);
      });
    });

    it('should handle clipboard write failure gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'));

      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to copy plan content:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should call onClose when Escape key is pressed', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose for other keys', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should prevent body scroll when modal is open', () => {
      render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', () => {
      const { rerender } = render(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <PlanViewer
          planContent={mockPlanContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={false}
        />
      );

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string planContent', () => {
      render(
        <PlanViewer
          planContent=""
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Empty string is falsy so shows empty state in component
      expect(screen.getByText('No plan content available')).toBeInTheDocument();
    });

    it('should handle very long planContent', () => {
      const longContent = 'A'.repeat(10000);
      render(
        <PlanViewer
          planContent={longContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const markdownContent = document.querySelector('.md-editor-markdown');
      expect(markdownContent).toHaveTextContent(longContent);
    });

    it('should handle special characters in planContent', () => {
      const specialContent = '# Test\n\n```javascript\nconst x = "hello";\n```\n\n**Bold** *italic*';
      render(
        <PlanViewer
          planContent={specialContent}
          adwId={mockAdwId}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      const markdownContent = document.querySelector('.md-editor-markdown');
      // Check that content is rendered (newlines may be rendered as spaces in DOM)
      expect(markdownContent).toBeTruthy();
      expect(markdownContent.textContent).toContain('# Test');
      expect(markdownContent.textContent).toContain('const x = "hello"');
      expect(markdownContent.textContent).toContain('**Bold**');
    });
  });
});
