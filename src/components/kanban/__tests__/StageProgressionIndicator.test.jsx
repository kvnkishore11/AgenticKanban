/**
 * Tests for StageProgressionIndicator Component
 * Tests stage progression visualization with badges and progress bars
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StageProgressionIndicator from '../StageProgressionIndicator';

describe('StageProgressionIndicator Component', () => {
  const defaultStages = ['plan', 'build', 'test', 'review', 'document'];

  describe('Rendering', () => {
    it('should render with default stages', () => {
      render(<StageProgressionIndicator currentStage="plan" />);

      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('Build')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Document')).toBeInTheDocument();
    });

    it('should render with custom stages', () => {
      const customStages = ['init', 'process', 'complete'];
      render(
        <StageProgressionIndicator
          currentStage="process"
          queuedStages={customStages}
        />
      );

      expect(screen.getByText('Init')).toBeInTheDocument();
      expect(screen.getByText('Process')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should render progress bar by default', () => {
      const { container } = render(<StageProgressionIndicator currentStage="build" />);

      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).toBeInTheDocument();
    });

    it('should hide progress bar when showProgressBar is false', () => {
      const { container } = render(
        <StageProgressionIndicator currentStage="build" showProgressBar={false} />
      );

      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('should show percentage by default', () => {
      render(<StageProgressionIndicator currentStage="build" />);

      expect(screen.getByText(/Progress:/)).toBeInTheDocument();
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });

    it('should hide percentage when showPercentage is false', () => {
      render(
        <StageProgressionIndicator currentStage="build" showPercentage={false} />
      );

      expect(screen.queryByText(/Progress:/)).not.toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render compact view when compact is true', () => {
      render(<StageProgressionIndicator currentStage="plan" compact={true} />);

      // Compact view shows single letter badges
      expect(screen.getByText('P', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('B', { exact: false })).toBeInTheDocument();
    });

    it('should not render full stage names in compact mode', () => {
      render(<StageProgressionIndicator currentStage="plan" compact={true} />);

      expect(screen.queryByText('Plan', { exact: true })).not.toBeInTheDocument();
    });

    it('should show percentage in compact mode when enabled', () => {
      render(
        <StageProgressionIndicator
          currentStage="build"
          compact={true}
          showPercentage={true}
        />
      );

      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });
  });

  describe('Stage Status', () => {
    it('should mark previous stages as completed', () => {
      const { container } = render(
        <StageProgressionIndicator currentStage="test" queuedStages={defaultStages} />
      );

      const planBadge = screen.getByText('Plan').closest('div');
      const buildBadge = screen.getByText('Build').closest('div');

      expect(planBadge).toHaveClass('bg-green-500');
      expect(buildBadge).toHaveClass('bg-green-500');
    });

    it('should mark current stage as in progress', () => {
      const { container } = render(
        <StageProgressionIndicator currentStage="test" queuedStages={defaultStages} />
      );

      const testBadge = screen.getByText('Test').closest('div');
      expect(testBadge).toHaveClass('bg-blue-500');
      expect(testBadge).toHaveClass('animate-pulse');
    });

    it('should mark future stages as pending', () => {
      const { container } = render(
        <StageProgressionIndicator currentStage="test" queuedStages={defaultStages} />
      );

      const reviewBadge = screen.getByText('Review').closest('div');
      const documentBadge = screen.getByText('Document').closest('div');

      expect(reviewBadge).toHaveClass('bg-gray-200');
      expect(documentBadge).toHaveClass('bg-gray-200');
    });

    it('should mark all stages as completed when workflowComplete is true', () => {
      const { container } = render(
        <StageProgressionIndicator
          currentStage="document"
          queuedStages={defaultStages}
          workflowComplete={true}
        />
      );

      const documentBadge = screen.getByText('Document').closest('div');
      expect(documentBadge).toHaveClass('bg-green-500');
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress based on current stage', () => {
      render(
        <StageProgressionIndicator currentStage="test" queuedStages={defaultStages} />
      );

      // test is index 2 (0-based), so (2+1)/5 * 100 = 60%
      expect(screen.getByText('Progress: 60%')).toBeInTheDocument();
    });

    it('should show 0% when no current stage is set', () => {
      render(<StageProgressionIndicator currentStage="" queuedStages={defaultStages} />);

      expect(screen.getByText('Progress: 0%')).toBeInTheDocument();
    });

    it('should show 100% when workflow is complete', () => {
      render(
        <StageProgressionIndicator
          currentStage="document"
          queuedStages={defaultStages}
          workflowComplete={true}
        />
      );

      expect(screen.getByText('Progress: 100%')).toBeInTheDocument();
    });

    it('should use workflowProgress.progress when provided', () => {
      render(
        <StageProgressionIndicator
          currentStage="test"
          queuedStages={defaultStages}
          workflowProgress={{ progress: 75 }}
        />
      );

      expect(screen.getByText('Progress: 75%')).toBeInTheDocument();
    });

    it('should update progress bar width based on percentage', () => {
      const { container } = render(
        <StageProgressionIndicator
          currentStage="test"
          queuedStages={defaultStages}
          workflowProgress={{ progress: 65 }}
        />
      );

      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle({ width: '65%' });
    });
  });

  describe('Workflow Progress Display', () => {
    it('should display current step when provided', () => {
      render(
        <StageProgressionIndicator
          currentStage="build"
          queuedStages={defaultStages}
          workflowProgress={{ currentStep: 'Compiling code' }}
        />
      );

      expect(screen.getByText('Compiling code')).toBeInTheDocument();
    });

    it('should show complete indicator when workflow is complete', () => {
      render(
        <StageProgressionIndicator
          currentStage="document"
          queuedStages={defaultStages}
          workflowComplete={true}
        />
      );

      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should not show complete indicator when workflow is not complete', () => {
      render(
        <StageProgressionIndicator
          currentStage="test"
          queuedStages={defaultStages}
          workflowComplete={false}
        />
      );

      expect(screen.queryByText('Complete')).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render appropriate icons for each status', () => {
      const { container } = render(
        <StageProgressionIndicator currentStage="test" queuedStages={defaultStages} />
      );

      // Check that lucide-react icons are rendered
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Stage Name Formatting', () => {
    it('should capitalize stage names', () => {
      render(
        <StageProgressionIndicator
          currentStage="plan"
          queuedStages={['plan', 'build', 'test']}
        />
      );

      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('Build')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle multi-word stage names', () => {
      render(
        <StageProgressionIndicator
          currentStage="code-review"
          queuedStages={['code-review']}
        />
      );

      expect(screen.getByText('Code-review')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queuedStages array', () => {
      render(
        <StageProgressionIndicator currentStage="plan" queuedStages={[]} />
      );

      // Should fall back to default stages
      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('should handle null currentStage', () => {
      render(
        <StageProgressionIndicator currentStage={null} queuedStages={defaultStages} />
      );

      expect(screen.getByText('Progress: 0%')).toBeInTheDocument();
    });

    it('should handle undefined currentStage', () => {
      render(
        <StageProgressionIndicator currentStage={undefined} queuedStages={defaultStages} />
      );

      expect(screen.getByText('Progress: 0%')).toBeInTheDocument();
    });

    it('should handle currentStage not in queuedStages', () => {
      render(
        <StageProgressionIndicator
          currentStage="unknown"
          queuedStages={defaultStages}
        />
      );

      expect(screen.getByText('Progress: 0%')).toBeInTheDocument();
    });

    it('should handle case-insensitive stage matching', () => {
      render(
        <StageProgressionIndicator
          currentStage="TEST"
          queuedStages={['plan', 'build', 'test', 'review']}
        />
      );

      // Should find 'test' despite case difference
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });

    it('should handle single stage workflow', () => {
      render(
        <StageProgressionIndicator
          currentStage="deploy"
          queuedStages={['deploy']}
        />
      );

      expect(screen.getByText('Deploy')).toBeInTheDocument();
      expect(screen.getByText('Progress: 100%')).toBeInTheDocument();
    });

    it('should handle null workflowProgress', () => {
      render(
        <StageProgressionIndicator
          currentStage="test"
          queuedStages={defaultStages}
          workflowProgress={null}
        />
      );

      expect(screen.getByText(/Progress:/)).toBeInTheDocument();
    });

    it('should handle workflowProgress with only some fields', () => {
      render(
        <StageProgressionIndicator
          currentStage="test"
          queuedStages={defaultStages}
          workflowProgress={{ currentStep: 'Running tests' }}
        />
      );

      expect(screen.getByText('Running tests')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have title attributes on badges in compact mode', () => {
      render(
        <StageProgressionIndicator
          currentStage="plan"
          queuedStages={defaultStages}
          compact={true}
        />
      );

      const badge = screen.getByTitle(/Plan/i);
      expect(badge).toBeInTheDocument();
    });

    it('should have title attributes on badges in full mode', () => {
      render(
        <StageProgressionIndicator
          currentStage="plan"
          queuedStages={defaultStages}
        />
      );

      const badge = screen.getByTitle(/Plan/i);
      expect(badge).toBeInTheDocument();
    });
  });
});
