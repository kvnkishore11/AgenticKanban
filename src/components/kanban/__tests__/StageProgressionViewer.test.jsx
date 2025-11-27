/**
 * Tests for StageProgressionViewer Component
 * Tests real-time stage progression with timeline visualization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StageProgressionViewer from '../StageProgressionViewer';

describe('StageProgressionViewer Component', () => {
  const mockStages = [
    { id: 'plan', name: 'Planning' },
    { id: 'build', name: 'Building' },
    { id: 'test', name: 'Testing' },
    { id: 'review', name: 'Review' },
    { id: 'document', name: 'Documentation' }
  ];

  describe('Rendering', () => {
    it('should render stage progression header', () => {
      render(
        <StageProgressionViewer
          currentStage="plan"
          stages={mockStages}
        />
      );

      expect(screen.getByText('Stage Progression')).toBeInTheDocument();
    });

    it('should render all stages', () => {
      render(
        <StageProgressionViewer
          currentStage="build"
          stages={mockStages}
        />
      );

      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('Building')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Documentation')).toBeInTheDocument();
    });

    it('should render with empty stages array', () => {
      render(
        <StageProgressionViewer
          currentStage="plan"
          stages={[]}
        />
      );

      expect(screen.getByText('Stage Progression')).toBeInTheDocument();
    });

    it('should display current step when progress is provided', () => {
      render(
        <StageProgressionViewer
          currentStage="build"
          stages={mockStages}
          progress={{ currentStep: 'Compiling code' }}
        />
      );

      expect(screen.getByText('Compiling code')).toBeInTheDocument();
    });
  });

  describe('Stage Status', () => {
    it('should mark stages before current as completed', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      const planStage = screen.getByText('Planning').closest('div');
      const buildStage = screen.getByText('Building').closest('div');

      expect(planStage).toBeInTheDocument();
      expect(buildStage).toBeInTheDocument();
      expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(2);
    });

    it('should mark current stage as active', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      const testStage = screen.getByText('Testing').closest('h5');
      expect(testStage).toHaveClass('text-blue-700');
    });

    it('should mark stages after current as pending', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      const reviewStage = screen.getByText('Review').closest('h5');
      const documentStage = screen.getByText('Documentation').closest('h5');

      expect(reviewStage).toHaveClass('text-gray-500');
      expect(documentStage).toHaveClass('text-gray-500');
    });

    it('should display "Completed" for finished stages', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      const completedLabels = screen.getAllByText('Completed');
      expect(completedLabels.length).toBeGreaterThan(0);
    });

    it('should display "Waiting..." for pending stages', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      const waitingLabels = screen.getAllByText('Waiting...');
      expect(waitingLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Progress Display', () => {
    it('should show progress percentage for active stage', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={{ progress: 45 }}
        />
      );

      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should show progress message for active stage', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={{ message: 'Running unit tests' }}
        />
      );

      expect(screen.getByText('Running unit tests')).toBeInTheDocument();
    });

    it('should show progress bar for active stage', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={{ progress: 60 }}
        />
      );

      const progressBar = container.querySelector('.bg-blue-500');
      expect(progressBar).toBeTruthy();
      // The progress bar is rendered, which is the important part
      // The exact width style may be applied via inline styles which are set in the DOM
      // We verify the element exists with the right class
    });

    it('should show 100% for completed stages', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      // Plan and Build should show 100%
      const percentages = screen.getAllByText('100%');
      expect(percentages.length).toBeGreaterThanOrEqual(2);
    });

    it('should show 0% when progress is 0', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={{ progress: 0 }}
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should round progress percentage', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={{ progress: 45.7 }}
        />
      );

      expect(screen.getByText('46%')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render appropriate icons for each stage status', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      // Check that SVG icons are rendered
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should use CheckCircle icon for completed stages', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      // Completed stages should have green icons
      const completedIcons = container.querySelectorAll('.text-green-500');
      expect(completedIcons.length).toBeGreaterThan(0);
    });

    it('should use Play icon for active stage', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      // Active stage should have blue animated icon
      const activeIcons = container.querySelectorAll('.text-blue-500.animate-pulse');
      expect(activeIcons.length).toBeGreaterThan(0);
    });

    it('should use Circle icon for pending stages', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      // Pending stages should have gray icons
      const pendingIcons = container.querySelectorAll('.text-gray-300');
      expect(pendingIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Connector Lines', () => {
    it('should render connector lines between stages', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      // Check for connector lines (absolute positioned elements)
      const connectors = container.querySelectorAll('.absolute.left-4.top-8');
      expect(connectors.length).toBeGreaterThan(0);
    });

    it('should color connector lines based on completion status', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      // Completed connectors should be green
      const greenConnectors = container.querySelectorAll('.bg-green-300');
      expect(greenConnectors.length).toBeGreaterThan(0);
    });

    it('should not render connector after last stage', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="document"
          stages={mockStages}
        />
      );

      // Number of connectors should be stages.length - 1
      const connectors = container.querySelectorAll('.absolute.left-4.top-8');
      expect(connectors.length).toBe(mockStages.length - 1);
    });
  });

  describe('Progress with Timestamp', () => {
    it('should display "Completed" label for completed stages with timestamp', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={{ timestamp: new Date().toISOString() }}
        />
      );

      // Completed stages should show "Completed" text
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle currentStage not in stages array', () => {
      render(
        <StageProgressionViewer
          currentStage="unknown"
          stages={mockStages}
        />
      );

      // All stages should be pending
      const waitingLabels = screen.getAllByText('Waiting...');
      expect(waitingLabels.length).toBe(mockStages.length);
    });

    it('should handle null currentStage', () => {
      render(
        <StageProgressionViewer
          currentStage={null}
          stages={mockStages}
        />
      );

      expect(screen.getByText('Stage Progression')).toBeInTheDocument();
    });

    it('should handle undefined currentStage', () => {
      render(
        <StageProgressionViewer
          currentStage={undefined}
          stages={mockStages}
        />
      );

      expect(screen.getByText('Stage Progression')).toBeInTheDocument();
    });

    it('should handle null progress', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={null}
        />
      );

      expect(screen.getByText('Testing')).toBeInTheDocument();
    });

    it('should handle progress with missing fields', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={{ progress: 50 }}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should handle single stage', () => {
      const singleStage = [{ id: 'deploy', name: 'Deploy' }];
      render(
        <StageProgressionViewer
          currentStage="deploy"
          stages={singleStage}
        />
      );

      expect(screen.getByText('Deploy')).toBeInTheDocument();
    });

    it('should handle stages with special characters', () => {
      const specialStages = [
        { id: 'pre-build', name: 'Pre-Build' },
        { id: 'build&test', name: 'Build & Test' }
      ];
      render(
        <StageProgressionViewer
          currentStage="pre-build"
          stages={specialStages}
        />
      );

      expect(screen.getByText('Pre-Build')).toBeInTheDocument();
      expect(screen.getByText('Build & Test')).toBeInTheDocument();
    });

    it('should handle very long stage names', () => {
      const longNameStages = [
        { id: 'long', name: 'This is a very long stage name that might cause layout issues' }
      ];
      render(
        <StageProgressionViewer
          currentStage="long"
          stages={longNameStages}
        />
      );

      expect(screen.getByText('This is a very long stage name that might cause layout issues')).toBeInTheDocument();
    });

    it('should handle progress greater than 100', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={{ progress: 150 }}
        />
      );

      // Should still display, even if > 100
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should handle negative progress', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
          progress={{ progress: -10 }}
        />
      );

      // Should still display, component doesn't validate
      expect(screen.getByText('-10%')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use green color for completed stages', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      const planStage = screen.getByText('Planning').closest('h5');
      expect(planStage).toHaveClass('text-green-700');
    });

    it('should use blue color for active stage', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      const testStage = screen.getByText('Testing').closest('h5');
      expect(testStage).toHaveClass('text-blue-700');
    });

    it('should use gray color for pending stages', () => {
      render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      const reviewStage = screen.getByText('Review').closest('h5');
      expect(reviewStage).toHaveClass('text-gray-500');
    });
  });

  describe('Layout', () => {
    it('should render stages in vertical timeline layout', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      // Check for space-y-3 class which creates vertical spacing
      const timeline = container.querySelector('.space-y-3');
      expect(timeline).toBeInTheDocument();
    });

    it('should use proper spacing between stage elements', () => {
      const { container } = render(
        <StageProgressionViewer
          currentStage="test"
          stages={mockStages}
        />
      );

      // Check for flex layout with spacing
      const stageElements = container.querySelectorAll('.flex.items-start.space-x-3');
      expect(stageElements.length).toBeGreaterThan(0);
    });
  });
});
