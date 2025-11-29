/**
 * @fileoverview Tests for StageTabsPanel Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StageTabsPanel from '../StageTabsPanel';

describe('StageTabsPanel Component', () => {
  const defaultProps = {
    stages: ['plan', 'build', 'test', 'review', 'document'],
    activeStage: 'build',
    currentRunningStage: null,
    onStageSelect: vi.fn(),
    autoFollow: true,
    onAutoFollowToggle: vi.fn(),
    stageStatuses: {
      plan: 'completed',
      build: 'active',
      test: 'pending',
      review: 'pending',
      document: 'pending'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all stage tabs', () => {
      render(<StageTabsPanel {...defaultProps} />);

      expect(screen.getByText('PLAN')).toBeInTheDocument();
      expect(screen.getByText('BUILD')).toBeInTheDocument();
      expect(screen.getByText('TEST')).toBeInTheDocument();
      expect(screen.getByText('REVIEW')).toBeInTheDocument();
      expect(screen.getByText('DOC')).toBeInTheDocument();
    });

    it('should show active stage as selected', () => {
      render(<StageTabsPanel {...defaultProps} />);

      const buildTab = screen.getByRole('button', { name: /BUILD/i });
      expect(buildTab).toHaveClass('selected');
    });

    it('should show completed stage with check mark', () => {
      render(<StageTabsPanel {...defaultProps} />);

      const planTab = screen.getByRole('button', { name: /PLAN/i });
      expect(planTab).toHaveClass('stage-tab-completed');
    });

    it('should show auto-follow button', () => {
      render(<StageTabsPanel {...defaultProps} />);

      expect(screen.getByTitle(/Auto-follow/i)).toBeInTheDocument();
    });

    it('should show auto-follow as active when enabled', () => {
      render(<StageTabsPanel {...defaultProps} autoFollow={true} />);

      const autoFollowBtn = screen.getByTitle(/Auto-follow ON/i);
      expect(autoFollowBtn).toHaveClass('active');
    });

    it('should show auto-follow as inactive when disabled', () => {
      render(<StageTabsPanel {...defaultProps} autoFollow={false} />);

      const autoFollowBtn = screen.getByTitle(/Auto-follow OFF/i);
      expect(autoFollowBtn).not.toHaveClass('active');
    });
  });

  describe('Stage Selection', () => {
    it('should call onStageSelect when clicking a stage tab', () => {
      render(<StageTabsPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /TEST/i }));

      expect(defaultProps.onStageSelect).toHaveBeenCalledWith('test');
    });

    it('should disable auto-follow when manually selecting a stage', () => {
      render(<StageTabsPanel {...defaultProps} autoFollow={true} />);

      fireEvent.click(screen.getByRole('button', { name: /TEST/i }));

      expect(defaultProps.onAutoFollowToggle).toHaveBeenCalled();
    });

    it('should not disable auto-follow if already disabled', () => {
      render(<StageTabsPanel {...defaultProps} autoFollow={false} />);

      fireEvent.click(screen.getByRole('button', { name: /TEST/i }));

      // Should still call onStageSelect but not onAutoFollowToggle
      expect(defaultProps.onStageSelect).toHaveBeenCalledWith('test');
      expect(defaultProps.onAutoFollowToggle).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Follow', () => {
    it('should toggle auto-follow when clicking the button', () => {
      render(<StageTabsPanel {...defaultProps} />);

      fireEvent.click(screen.getByTitle(/Auto-follow/i));

      expect(defaultProps.onAutoFollowToggle).toHaveBeenCalled();
    });

    it('should not render auto-follow button if onAutoFollowToggle is not provided', () => {
      const propsWithoutAutoFollow = {
        ...defaultProps,
        onAutoFollowToggle: undefined
      };

      render(<StageTabsPanel {...propsWithoutAutoFollow} />);

      expect(screen.queryByText('Auto')).not.toBeInTheDocument();
    });
  });

  describe('Stage Status Display', () => {
    it('should display running indicator for active stage', () => {
      render(<StageTabsPanel {...defaultProps} />);

      const buildTab = screen.getByRole('button', { name: /BUILD/i });
      expect(buildTab).toHaveClass('stage-tab-active');
    });

    it('should display pending style for pending stages', () => {
      render(<StageTabsPanel {...defaultProps} />);

      const testTab = screen.getByRole('button', { name: /TEST/i });
      expect(testTab).toHaveClass('stage-tab-pending');
    });
  });

  describe('Custom Stages', () => {
    it('should handle custom stage array', () => {
      const customProps = {
        ...defaultProps,
        stages: ['plan', 'build'],
        stageStatuses: {
          plan: 'completed',
          build: 'active'
        }
      };

      render(<StageTabsPanel {...customProps} />);

      expect(screen.getByText('PLAN')).toBeInTheDocument();
      expect(screen.getByText('BUILD')).toBeInTheDocument();
      expect(screen.queryByText('TEST')).not.toBeInTheDocument();
    });

    it('should handle unknown stage names gracefully', () => {
      const customProps = {
        ...defaultProps,
        stages: ['custom_stage'],
        stageStatuses: { custom_stage: 'pending' }
      };

      render(<StageTabsPanel {...customProps} />);

      expect(screen.getByText('CUSTOM_STAGE')).toBeInTheDocument();
    });
  });
});
