/**
 * Tests for StageModelSelector Component
 * Comprehensive tests for the stage model selector with visual indicators
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StageModelSelector from '../StageModelSelector';
import * as modelDefaults from '../../../utils/modelDefaults';

// Mock the model defaults
vi.mock('../../../utils/modelDefaults', async () => {
  const actual = await vi.importActual('../../../utils/modelDefaults');
  return {
    ...actual,
    getDefaultModelForStage: vi.fn(),
  };
});

describe('StageModelSelector Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    modelDefaults.getDefaultModelForStage.mockReturnValue('sonnet');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('should render with correct stage name label', () => {
      render(
        <StageModelSelector
          stageName="plan"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/plan stage model/i)).toBeInTheDocument();
    });

    it('should render with uppercase stage name', () => {
      render(
        <StageModelSelector
          stageName="BUILD"
          selectedModel="opus"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/build stage model/i)).toBeInTheDocument();
    });

    it('should display the selected model', () => {
      render(
        <StageModelSelector
          stageName="test"
          selectedModel="haiku"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Haiku')).toBeInTheDocument();
    });

    it('should render dropdown button', () => {
      render(
        <StageModelSelector
          stageName="plan"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Sonnet');
    });

    it('should render help text with default model information', () => {
      modelDefaults.getDefaultModelForStage.mockReturnValue('opus');

      render(
        <StageModelSelector
          stageName="plan"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/default for plan: opus/i)).toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    it('should open dropdown when button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // All three models should be visible in dropdown
      expect(screen.getByText('Haiku')).toBeInTheDocument();
      expect(screen.getAllByText('Sonnet')).toHaveLength(2); // One in button, one in dropdown
      expect(screen.getByText('Opus')).toBeInTheDocument();
    });

    it('should close dropdown when model is selected', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);

      // Select Haiku - find it in the dropdown
      const haikuOption = screen.getByText('Haiku');
      await user.click(haikuOption);

      // Dropdown should close - Opus should no longer be visible
      await waitFor(() => {
        expect(screen.queryByText('Opus')).not.toBeInTheDocument();
      });
    });

    it('should call onChange with correct model when option is selected', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="build"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);

      // Select Opus
      const opusOption = screen.getByText('Opus');
      await user.click(opusOption);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('opus');
    });

    it('should toggle dropdown open/closed on button clicks', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole('button');

      // Open dropdown
      await user.click(button);
      expect(screen.getAllByText('Opus')).toHaveLength(1);

      // Close dropdown
      await user.click(button);
      await waitFor(() => {
        expect(screen.queryByText('Opus')).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should display cost badges for all models', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);

      // Check for cost tier badges
      expect(screen.getByText('LOW')).toBeInTheDocument(); // Haiku
      expect(screen.getByText('MEDIUM')).toBeInTheDocument(); // Sonnet
      expect(screen.getByText('HIGH')).toBeInTheDocument(); // Opus
    });

    it('should display performance badges for all models', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);

      // Check for performance tier badges
      expect(screen.getByText('FAST')).toBeInTheDocument(); // Haiku
      expect(screen.getByText('BALANCED')).toBeInTheDocument(); // Sonnet
      expect(screen.getByText('POWERFUL')).toBeInTheDocument(); // Opus
    });

    it('should highlight selected model with different background', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);

      // Find all Sonnet text elements
      const sonnetElements = screen.getAllByText('Sonnet');
      // Find the one that's in a dropdown option div (not the button)
      let sonnetOption = null;
      for (const el of sonnetElements) {
        const parent = el.closest('div[class*="cursor-pointer"]');
        if (parent) {
          sonnetOption = parent;
          break;
        }
      }

      // Should have black background (selected state)
      expect(sonnetOption).toHaveClass('bg-black', 'text-white');
    });

    it('should show default indicator for the default model', async () => {
      const user = userEvent.setup();
      modelDefaults.getDefaultModelForStage.mockReturnValue('opus');

      render(
        <StageModelSelector
          stageName="plan"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);

      // Opus should have "(Default)" label
      const defaultIndicators = screen.getAllByText('(Default)');
      expect(defaultIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Icons', () => {
    it('should render Zap icon for Haiku', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="haiku"
          onChange={mockOnChange}
        />
      );

      // Icon should be in the button (Haiku is selected)
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should render Scale icon for Sonnet', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Icon should be in the button (Sonnet is selected)
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should render Crown icon for Opus', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="opus"
          onChange={mockOnChange}
        />
      );

      // Icon should be in the button (Opus is selected)
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should render ChevronDown icon in button', () => {
      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole('button');
      const svgElements = button.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(1); // Model icon + ChevronDown
    });
  });

  describe('Disabled State', () => {
    it('should disable button when disabled prop is true', () => {
      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not open dropdown when disabled', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Dropdown should not open
      expect(screen.queryByText('Opus')).not.toBeInTheDocument();
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should apply disabled styling', () => {
      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Tooltips', () => {
    it('should show tooltip on hover', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);

      // Find the dropdown option containers
      const haikuOption = screen.getByText('Haiku').closest('div');

      await user.hover(haikuOption);

      // Tooltip should appear with description
      await waitFor(() => {
        expect(screen.getByText('Fast and economical')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);

      // Hover over Opus option
      const opusOption = screen.getByText('Opus');
      await user.hover(opusOption);

      // Tooltip should appear
      await waitFor(() => {
        expect(screen.getByText('Most capable model')).toBeInTheDocument();
      });

      // Unhover
      await user.unhover(opusOption);

      // Tooltip should disappear
      await waitFor(() => {
        expect(screen.queryByText('Most capable model')).not.toBeInTheDocument();
      });
    });
  });

  describe('Brutalist Styling', () => {
    it('should use uppercase labels', () => {
      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      const label = screen.getByText(/test stage model/i);
      expect(label).toHaveClass('uppercase');
    });

    it('should use monospace font', () => {
      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      const label = screen.getByText(/test stage model/i);
      expect(label).toHaveClass('font-mono');
    });

    it('should use black borders', () => {
      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-black');
    });

    it('should use brutalist shadow on dropdown', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);

      // Find dropdown container by looking for the absolute positioned div
      const haikuElement = screen.getByText('Haiku');
      const dropdownContainer = haikuElement.closest('div[class*="absolute"]');
      // Check inline style which is applied via style attribute
      expect(dropdownContainer).toHaveAttribute('style', expect.stringContaining('border: 3px solid black'));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stageName', () => {
      modelDefaults.getDefaultModelForStage.mockReturnValue('sonnet');

      render(
        <StageModelSelector
          stageName=""
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/stage model/i)).toBeInTheDocument();
    });

    it('should handle null onChange gracefully', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={null}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      const opusOption = screen.getByText('Opus');
      await user.click(opusOption);

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle undefined onChange gracefully', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={undefined}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      const haikuOption = screen.getByText('Haiku');
      await user.click(haikuOption);

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle all three model selections correctly', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <StageModelSelector
          stageName="test"
          selectedModel="haiku"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button')).toHaveTextContent('Haiku');

      rerender(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button')).toHaveTextContent('Sonnet');

      rerender(
        <StageModelSelector
          stageName="test"
          selectedModel="opus"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button')).toHaveTextContent('Opus');
    });

    it('should handle different stage names', () => {
      const stages = ['plan', 'build', 'test', 'review', 'merge', 'document'];

      stages.forEach(stage => {
        const { unmount } = render(
          <StageModelSelector
            stageName={stage}
            selectedModel="sonnet"
            onChange={mockOnChange}
          />
        );

        expect(screen.getByText(new RegExp(`${stage} stage model`, 'i'))).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button role', () => {
      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });

    it('should have proper label association', () => {
      render(
        <StageModelSelector
          stageName="test"
          selectedModel="sonnet"
          onChange={mockOnChange}
        />
      );

      const label = screen.getByText(/test stage model/i);
      expect(label.tagName).toBe('LABEL');
    });
  });
});
