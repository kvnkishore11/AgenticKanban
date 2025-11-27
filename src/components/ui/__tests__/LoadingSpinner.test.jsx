/**
 * Tests for LoadingSpinner Component
 * Comprehensive tests for the loading spinner UI component
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  afterEach(() => {
    // Clean up any rendered components
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('should render spinner with default props', () => {
      render(<LoadingSpinner />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render custom message', () => {
      render(<LoadingSpinner message="Please wait..." />);

      expect(screen.getByText('Please wait...')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should not render message when message prop is empty', () => {
      render(<LoadingSpinner message="" />);

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small spinner', () => {
      const { container } = render(<LoadingSpinner size="small" />);

      const spinner = container.querySelector('.h-4.w-4');
      expect(spinner).toBeInTheDocument();
    });

    it('should render medium spinner by default', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.h-6.w-6');
      expect(spinner).toBeInTheDocument();
    });

    it('should render large spinner', () => {
      const { container } = render(<LoadingSpinner size="large" />);

      const spinner = container.querySelector('.h-8.w-8');
      expect(spinner).toBeInTheDocument();
    });

    it('should render xlarge spinner', () => {
      const { container } = render(<LoadingSpinner size="xlarge" />);

      const spinner = container.querySelector('.h-12.w-12');
      expect(spinner).toBeInTheDocument();
    });

    it('should fallback to medium size for invalid size prop', () => {
      const { container } = render(<LoadingSpinner size="invalid" />);

      const spinner = container.querySelector('.h-6.w-6');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Overlay Mode', () => {
    it('should render as overlay when overlay prop is true', () => {
      const { container } = render(<LoadingSpinner overlay={true} />);

      const overlayElement = container.querySelector('.fixed.inset-0');
      expect(overlayElement).toBeInTheDocument();
      expect(overlayElement).toHaveClass('bg-black', 'bg-opacity-50', 'z-50');
    });

    it('should not render as overlay by default', () => {
      const { container } = render(<LoadingSpinner />);

      const overlayElement = container.querySelector('.fixed.inset-0');
      expect(overlayElement).not.toBeInTheDocument();
    });

    it('should render centered content in overlay mode', () => {
      const { container } = render(<LoadingSpinner overlay={true} message="Processing..." />);

      const contentContainer = container.querySelector('.bg-white.rounded-lg.p-6.shadow-lg');
      expect(contentContainer).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should render without white background when not in overlay mode', () => {
      const { container } = render(<LoadingSpinner overlay={false} />);

      const contentContainer = container.querySelector('.bg-white.rounded-lg.p-6.shadow-lg');
      expect(contentContainer).not.toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should apply spin animation to spinner', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply primary color to spinner', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.text-primary-600');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper text styling for readability', () => {
      const { container } = render(<LoadingSpinner message="Loading content..." />);

      const messageElement = screen.getByText('Loading content...');
      expect(messageElement).toHaveClass('text-sm', 'text-gray-600', 'font-medium');
    });

    it('should use semantic paragraph element for message', () => {
      render(<LoadingSpinner message="Loading..." />);

      const messageElement = screen.getByText('Loading...');
      expect(messageElement.tagName).toBe('P');
    });
  });

  describe('Layout', () => {
    it('should center spinner and message', () => {
      const { container } = render(<LoadingSpinner message="Centering test" />);

      const innerContainer = container.querySelector('.flex.flex-col.items-center');
      expect(innerContainer).toBeInTheDocument();
    });

    it('should add spacing between spinner and message', () => {
      const { container } = render(<LoadingSpinner message="Spacing test" />);

      const innerContainer = container.querySelector('.space-y-3');
      expect(innerContainer).toBeInTheDocument();
    });

    it('should apply padding when not in overlay mode', () => {
      const { container } = render(<LoadingSpinner overlay={false} />);

      const mainContainer = container.querySelector('.p-4');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Props Combinations', () => {
    it('should handle all props together - overlay with custom size and message', () => {
      const { container } = render(
        <LoadingSpinner
          overlay={true}
          size="large"
          message="Processing your request..."
          className="custom-spinner"
        />
      );

      expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument();
      expect(container.querySelector('.h-8.w-8')).toBeInTheDocument();
      expect(screen.getByText('Processing your request...')).toBeInTheDocument();
      expect(container.querySelector('.custom-spinner')).toBeInTheDocument();
    });

    it('should handle minimal props - no message, default size', () => {
      const { container } = render(<LoadingSpinner message="" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('should handle size and className without overlay', () => {
      const { container } = render(
        <LoadingSpinner size="xlarge" className="my-custom-class" overlay={false} />
      );

      expect(container.querySelector('.h-12.w-12')).toBeInTheDocument();
      expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
      expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null message gracefully', () => {
      render(<LoadingSpinner message={null} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should handle undefined message gracefully', () => {
      render(<LoadingSpinner message={undefined} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should handle very long message text', () => {
      const longMessage = 'This is a very long loading message that might cause layout issues if not handled properly';
      render(<LoadingSpinner message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Loading... <script>alert("XSS")</script>';
      render(<LoadingSpinner message={specialMessage} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('should handle empty className', () => {
      const { container } = render(<LoadingSpinner className="" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should handle boolean overlay prop explicitly', () => {
      const { container: containerTrue } = render(<LoadingSpinner overlay={true} />);
      const { container: containerFalse } = render(<LoadingSpinner overlay={false} />);

      expect(containerTrue.querySelector('.fixed.inset-0')).toBeInTheDocument();
      expect(containerFalse.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
    });
  });

  describe('Visual Consistency', () => {
    it('should maintain consistent structure across different sizes', () => {
      const sizes = ['small', 'medium', 'large', 'xlarge'];

      sizes.forEach(size => {
        const { container } = render(<LoadingSpinner size={size} />);
        const spinner = container.querySelector('.animate-spin.text-primary-600');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should maintain consistent structure with and without message', () => {
      const { container: withMessage } = render(<LoadingSpinner message="With message" />);
      const { container: withoutMessage } = render(<LoadingSpinner message="" />);

      expect(withMessage.querySelector('.animate-spin')).toBeInTheDocument();
      expect(withoutMessage.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should maintain Lucide-react icon usage', () => {
      const { container } = render(<LoadingSpinner />);

      // Loader2 from lucide-react should be rendered
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner.tagName).toBe('svg');
    });
  });
});
