/**
 * @fileoverview Tests for ContentTypeTabs Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContentTypeTabs from '../ContentTypeTabs';

describe('ContentTypeTabs Component', () => {
  const defaultProps = {
    activeContentType: 'thinking',
    onContentTypeChange: vi.fn(),
    executionLogCount: 25,
    thinkingLogCount: 142,
    hasResult: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all three content type tabs', () => {
      render(<ContentTypeTabs {...defaultProps} />);

      expect(screen.getByText('EXECUTION')).toBeInTheDocument();
      expect(screen.getByText('THINKING')).toBeInTheDocument();
      expect(screen.getByText('RESULT')).toBeInTheDocument();
    });

    it('should show execution log count', () => {
      render(<ContentTypeTabs {...defaultProps} />);

      expect(screen.getByText('(25)')).toBeInTheDocument();
    });

    it('should show thinking log count', () => {
      render(<ContentTypeTabs {...defaultProps} />);

      expect(screen.getByText('(142)')).toBeInTheDocument();
    });

    it('should show active tab as selected', () => {
      render(<ContentTypeTabs {...defaultProps} activeContentType="thinking" />);

      const thinkingTab = screen.getByRole('button', { name: /THINKING/i });
      expect(thinkingTab).toHaveClass('active');
    });

    it('should show result check when result is available', () => {
      render(<ContentTypeTabs {...defaultProps} hasResult={true} />);

      const resultTab = screen.getByRole('button', { name: /RESULT/i });
      expect(resultTab).not.toBeDisabled();
    });

    it('should disable result tab when no result available', () => {
      render(<ContentTypeTabs {...defaultProps} hasResult={false} />);

      const resultTab = screen.getByRole('button', { name: /RESULT/i });
      expect(resultTab).toBeDisabled();
    });
  });

  describe('Tab Selection', () => {
    it('should call onContentTypeChange when clicking EXECUTION tab', () => {
      render(<ContentTypeTabs {...defaultProps} activeContentType="thinking" />);

      fireEvent.click(screen.getByRole('button', { name: /EXECUTION/i }));

      expect(defaultProps.onContentTypeChange).toHaveBeenCalledWith('execution');
    });

    it('should call onContentTypeChange when clicking THINKING tab', () => {
      render(<ContentTypeTabs {...defaultProps} activeContentType="execution" />);

      fireEvent.click(screen.getByRole('button', { name: /THINKING/i }));

      expect(defaultProps.onContentTypeChange).toHaveBeenCalledWith('thinking');
    });

    it('should call onContentTypeChange when clicking RESULT tab', () => {
      render(<ContentTypeTabs {...defaultProps} activeContentType="thinking" hasResult={true} />);

      fireEvent.click(screen.getByRole('button', { name: /RESULT/i }));

      expect(defaultProps.onContentTypeChange).toHaveBeenCalledWith('result');
    });

    it('should not call onContentTypeChange when clicking disabled RESULT tab', () => {
      render(<ContentTypeTabs {...defaultProps} activeContentType="thinking" hasResult={false} />);

      fireEvent.click(screen.getByRole('button', { name: /RESULT/i }));

      expect(defaultProps.onContentTypeChange).not.toHaveBeenCalled();
    });
  });

  describe('Count Display', () => {
    it('should not show count when count is 0', () => {
      render(<ContentTypeTabs {...defaultProps} executionLogCount={0} thinkingLogCount={0} />);

      expect(screen.queryByText('(0)')).not.toBeInTheDocument();
    });

    it('should show count when count is greater than 0', () => {
      render(<ContentTypeTabs {...defaultProps} executionLogCount={10} />);

      expect(screen.getByText('(10)')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should display icons for each tab', () => {
      render(<ContentTypeTabs {...defaultProps} />);

      // Icons are emojis in the component
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('🧠')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
    });
  });
});
