/**
 * Unit tests for StageButton component
 * Tests the integrated stage button with model selector dropdown
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StageButton from '../StageButton';

describe('StageButton', () => {
  const defaultProps = {
    stageId: 'plan',
    label: 'Plan',
    icon: '📋',
    isSelected: false,
    selectedModel: 'opus',
    onToggle: vi.fn(),
    onModelChange: vi.fn(),
    disabled: false,
    variant: 'default',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with label and icon', () => {
      render(<StageButton {...defaultProps} />);

      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
    });

    it('should render model selector dropdown', () => {
      render(<StageButton {...defaultProps} />);

      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveValue('opus');
    });

    it('should render with merge variant styling', () => {
      render(<StageButton {...defaultProps} variant="merge" isSelected={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-purple-500');
    });

    it('should render with default variant styling when selected', () => {
      render(<StageButton {...defaultProps} isSelected={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-black');
      expect(button).toHaveClass('text-white');
    });

    it('should render unselected state correctly', () => {
      render(<StageButton {...defaultProps} isSelected={false} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-white');
    });
  });

  describe('Interactions', () => {
    it('should call onToggle when button is clicked', () => {
      const onToggle = vi.fn();
      render(<StageButton {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onModelChange when dropdown value changes', () => {
      const onModelChange = vi.fn();
      render(<StageButton {...defaultProps} onModelChange={onModelChange} />);

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'sonnet' } });

      expect(onModelChange).toHaveBeenCalledWith('sonnet');
    });

    it('should NOT call onToggle when dropdown is clicked', () => {
      const onToggle = vi.fn();
      render(<StageButton {...defaultProps} onToggle={onToggle} />);

      const dropdown = screen.getByRole('combobox');
      fireEvent.click(dropdown);

      // Dropdown click should be stopped, onToggle should NOT be called
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('Disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<StageButton {...defaultProps} disabled={true} />);

      const button = screen.getByRole('button');
      const dropdown = screen.getByRole('combobox');

      expect(button).toBeDisabled();
      expect(dropdown).toBeDisabled();
    });

    it('should have opacity class when disabled', () => {
      render(<StageButton {...defaultProps} disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50');
    });

    it('should NOT call onToggle when disabled', () => {
      const onToggle = vi.fn();
      render(<StageButton {...defaultProps} disabled={true} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('Model options', () => {
    it('should have all model options available', () => {
      render(<StageButton {...defaultProps} />);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3); // opus, sonnet, haiku
    });

    it('should display model names in dropdown', () => {
      render(<StageButton {...defaultProps} />);

      const options = screen.getAllByRole('option');
      const optionTexts = options.map(opt => opt.textContent);

      expect(optionTexts).toContain('Opus');
      expect(optionTexts).toContain('Sonnet');
      expect(optionTexts).toContain('Haiku');
    });
  });

  describe('React component icon support', () => {
    it('should render React component as icon', () => {
      const ReactIcon = () => <span data-testid="react-icon">Icon</span>;
      render(<StageButton {...defaultProps} icon={<ReactIcon />} />);

      expect(screen.getByTestId('react-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have title attribute for dropdown', () => {
      render(<StageButton {...defaultProps} />);

      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toHaveAttribute('title', 'Select model for Plan');
    });
  });

  describe('Config variant', () => {
    it('should render with config variant styling', () => {
      render(<StageButton {...defaultProps} variant="config" isSelected={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-orange-500');
    });

    it('should render config dropdown with orange styling when selected', () => {
      render(<StageButton {...defaultProps} variant="config" isSelected={true} />);

      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toHaveClass('bg-orange-400');
      expect(dropdown).toHaveClass('border-orange-300');
    });
  });
});
