/**
 * Tests for Substages Utility
 */

import { describe, it, expect, vi } from 'vitest';
import {
  substageDefinitions,
  substageTransitions,
  getSubstages,
  getSubstage,
  getNextSubstage,
  canSkipSubstage,
  calculateStageProgress,
  getSubstageIds,
  isValidTransition,
  getSubstageDuration,
  getSubstageOutputs,
  createSubstageLog,
  getSubstageStatusIcon,
  getSubstageStatusColor,
  simulateSubstageExecution,
} from '../substages';

describe('substages', () => {
  describe('substageDefinitions', () => {
    it('should have definitions for all stages', () => {
      expect(substageDefinitions.plan).toBeDefined();
      expect(substageDefinitions.build).toBeDefined();
      expect(substageDefinitions.test).toBeDefined();
      expect(substageDefinitions.review).toBeDefined();
      expect(substageDefinitions.document).toBeDefined();
      expect(substageDefinitions.errored).toBeDefined();
    });

    it('should have correct structure for each substage', () => {
      const substage = substageDefinitions.plan[0];

      expect(substage).toHaveProperty('id');
      expect(substage).toHaveProperty('name');
      expect(substage).toHaveProperty('description');
      expect(substage).toHaveProperty('estimatedDuration');
      expect(substage).toHaveProperty('outputs');
    });

    it('should have multiple substages for plan', () => {
      expect(substageDefinitions.plan.length).toBeGreaterThan(0);
      expect(substageDefinitions.plan[0].id).toBe('analyze');
      expect(substageDefinitions.plan[1].id).toBe('design');
      expect(substageDefinitions.plan[2].id).toBe('breakdown');
    });

    it('should have multiple substages for build', () => {
      expect(substageDefinitions.build.length).toBeGreaterThan(0);
      expect(substageDefinitions.build[0].id).toBe('setup');
      expect(substageDefinitions.build[1].id).toBe('implement');
      expect(substageDefinitions.build[2].id).toBe('integrate');
    });

    it('should have multiple substages for test', () => {
      expect(substageDefinitions.test.length).toBeGreaterThan(0);
      expect(substageDefinitions.test[0].id).toBe('unit');
      expect(substageDefinitions.test[1].id).toBe('integration');
      expect(substageDefinitions.test[2].id).toBe('e2e');
    });
  });

  describe('substageTransitions', () => {
    it('should have transitions for all stages', () => {
      expect(substageTransitions.plan).toBeDefined();
      expect(substageTransitions.build).toBeDefined();
      expect(substageTransitions.test).toBeDefined();
      expect(substageTransitions.review).toBeDefined();
      expect(substageTransitions.document).toBeDefined();
      expect(substageTransitions.errored).toBeDefined();
    });

    it('should have correct transition structure', () => {
      const transition = substageTransitions.plan.analyze;

      expect(transition).toHaveProperty('next');
      expect(transition).toHaveProperty('canSkip');
    });

    it('should have null next for final substages', () => {
      expect(substageTransitions.plan.breakdown.next).toBeNull();
      expect(substageTransitions.build.integrate.next).toBeNull();
    });
  });

  describe('getSubstages', () => {
    it('should return substages for valid stage', () => {
      const substages = getSubstages('plan');

      expect(substages).toBeInstanceOf(Array);
      expect(substages.length).toBeGreaterThan(0);
      expect(substages[0].id).toBe('analyze');
    });

    it('should return empty array for invalid stage', () => {
      expect(getSubstages('invalid')).toEqual([]);
      expect(getSubstages(null)).toEqual([]);
      expect(getSubstages(undefined)).toEqual([]);
    });

    it('should return all substages for each stage', () => {
      expect(getSubstages('plan')).toHaveLength(3);
      expect(getSubstages('build')).toHaveLength(3);
      expect(getSubstages('test')).toHaveLength(3);
    });
  });

  describe('getSubstage', () => {
    it('should return substage by id', () => {
      const substage = getSubstage('plan', 'analyze');

      expect(substage).toBeDefined();
      expect(substage.id).toBe('analyze');
      expect(substage.name).toBe('Analyze Requirements');
    });

    it('should return undefined for invalid substage id', () => {
      expect(getSubstage('plan', 'invalid')).toBeUndefined();
    });

    it('should return undefined for invalid stage', () => {
      expect(getSubstage('invalid', 'analyze')).toBeUndefined();
    });
  });

  describe('getNextSubstage', () => {
    it('should return next substage in sequence', () => {
      const next = getNextSubstage('plan', 'analyze');

      expect(next).toBeDefined();
      expect(next.id).toBe('design');
    });

    it('should return null for last substage', () => {
      expect(getNextSubstage('plan', 'breakdown')).toBeNull();
      expect(getNextSubstage('build', 'integrate')).toBeNull();
    });

    it('should return null for invalid stage', () => {
      expect(getNextSubstage('invalid', 'analyze')).toBeNull();
    });

    it('should return null for invalid substage', () => {
      expect(getNextSubstage('plan', 'invalid')).toBeNull();
    });

    it('should handle all stages correctly', () => {
      expect(getNextSubstage('build', 'setup').id).toBe('implement');
      expect(getNextSubstage('test', 'unit').id).toBe('integration');
      expect(getNextSubstage('review', 'code-review').id).toBe('security-check');
    });
  });

  describe('canSkipSubstage', () => {
    it('should return true for skippable substages', () => {
      expect(canSkipSubstage('plan', 'design')).toBe(true);
      expect(canSkipSubstage('build', 'implement')).toBe(true);
    });

    it('should return false for non-skippable substages', () => {
      expect(canSkipSubstage('plan', 'analyze')).toBe(false);
      expect(canSkipSubstage('plan', 'breakdown')).toBe(false);
    });

    it('should return false for invalid stage or substage', () => {
      expect(canSkipSubstage('invalid', 'analyze')).toBe(false);
      expect(canSkipSubstage('plan', 'invalid')).toBe(false);
    });
  });

  describe('calculateStageProgress', () => {
    it('should calculate progress correctly for first substage', () => {
      expect(calculateStageProgress('plan', 'analyze')).toBe(33);
    });

    it('should calculate progress correctly for middle substage', () => {
      expect(calculateStageProgress('plan', 'design')).toBe(67);
    });

    it('should calculate progress correctly for last substage', () => {
      expect(calculateStageProgress('plan', 'breakdown')).toBe(100);
    });

    it('should return 0 for invalid substage', () => {
      expect(calculateStageProgress('plan', 'invalid')).toBe(0);
    });

    it('should return 0 for invalid stage', () => {
      expect(calculateStageProgress('invalid', 'analyze')).toBe(0);
    });

    it('should handle stages with different numbers of substages', () => {
      expect(calculateStageProgress('build', 'setup')).toBe(33);
      expect(calculateStageProgress('build', 'implement')).toBe(67);
      expect(calculateStageProgress('build', 'integrate')).toBe(100);
    });
  });

  describe('getSubstageIds', () => {
    it('should return array of substage ids', () => {
      const ids = getSubstageIds('plan');

      expect(ids).toEqual(['analyze', 'design', 'breakdown']);
    });

    it('should return empty array for invalid stage', () => {
      expect(getSubstageIds('invalid')).toEqual([]);
    });

    it('should return correct ids for all stages', () => {
      expect(getSubstageIds('build')).toEqual(['setup', 'implement', 'integrate']);
      expect(getSubstageIds('test')).toEqual(['unit', 'integration', 'e2e']);
    });
  });

  describe('isValidTransition', () => {
    it('should allow forward transitions', () => {
      expect(isValidTransition('plan', 'analyze', 'design')).toBe(true);
      expect(isValidTransition('plan', 'analyze', 'breakdown')).toBe(true);
      expect(isValidTransition('plan', 'design', 'breakdown')).toBe(true);
    });

    it('should not allow backward transitions', () => {
      expect(isValidTransition('plan', 'design', 'analyze')).toBe(false);
      expect(isValidTransition('plan', 'breakdown', 'analyze')).toBe(false);
    });

    it('should not allow same substage transition', () => {
      expect(isValidTransition('plan', 'analyze', 'analyze')).toBe(false);
    });

    it('should return false for invalid stage', () => {
      expect(isValidTransition('invalid', 'analyze', 'design')).toBe(false);
    });

    it('should handle invalid substages', () => {
      // When fromSubstage is invalid (-1), it's < any valid toSubstage index
      expect(isValidTransition('plan', 'invalid', 'design')).toBe(true);
      // When toSubstage is invalid (-1), it's not > any valid fromSubstage index
      expect(isValidTransition('plan', 'analyze', 'invalid')).toBe(false);
      // When both are invalid, -1 < -1 is false
      expect(isValidTransition('plan', 'invalid', 'invalid')).toBe(false);
    });
  });

  describe('getSubstageDuration', () => {
    it('should return duration for valid substage', () => {
      const duration = getSubstageDuration('plan', 'analyze');

      expect(duration).toBe('10-30 minutes');
    });

    it('should return Unknown for invalid substage', () => {
      expect(getSubstageDuration('plan', 'invalid')).toBe('Unknown');
    });

    it('should return Unknown for invalid stage', () => {
      expect(getSubstageDuration('invalid', 'analyze')).toBe('Unknown');
    });

    it('should return correct durations for different substages', () => {
      expect(getSubstageDuration('build', 'implement')).toBe('30-180 minutes');
      expect(getSubstageDuration('test', 'unit')).toBe('20-60 minutes');
    });
  });

  describe('getSubstageOutputs', () => {
    it('should return outputs for valid substage', () => {
      const outputs = getSubstageOutputs('plan', 'analyze');

      expect(outputs).toBeInstanceOf(Array);
      expect(outputs).toContain('requirements_analysis.md');
      expect(outputs).toContain('task_breakdown.md');
    });

    it('should return empty array for invalid substage', () => {
      expect(getSubstageOutputs('plan', 'invalid')).toEqual([]);
    });

    it('should return empty array for invalid stage', () => {
      expect(getSubstageOutputs('invalid', 'analyze')).toEqual([]);
    });

    it('should return correct outputs for different substages', () => {
      const outputs = getSubstageOutputs('build', 'implement');

      expect(outputs).toContain('source_code');
      expect(outputs).toContain('assets');
    });
  });

  describe('createSubstageLog', () => {
    it('should create log entry with correct structure', () => {
      const log = createSubstageLog('plan', 'analyze', 'started');

      expect(log).toHaveProperty('stage');
      expect(log).toHaveProperty('substageId');
      expect(log).toHaveProperty('substageName');
      expect(log).toHaveProperty('status');
      expect(log).toHaveProperty('message');
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('progress');
    });

    it('should include correct values', () => {
      const log = createSubstageLog('plan', 'analyze', 'started');

      expect(log.stage).toBe('plan');
      expect(log.substageId).toBe('analyze');
      expect(log.substageName).toBe('Analyze Requirements');
      expect(log.status).toBe('started');
    });

    it('should set progress based on status', () => {
      expect(createSubstageLog('plan', 'analyze', 'completed').progress).toBe(100);
      expect(createSubstageLog('plan', 'analyze', 'started').progress).toBe(10);
      expect(createSubstageLog('plan', 'analyze', 'failed').progress).toBe(0);
    });

    it('should include custom message if provided', () => {
      const log = createSubstageLog('plan', 'analyze', 'failed', 'Custom error message');

      expect(log.message).toBe('Custom error message');
    });

    it('should generate default message if not provided', () => {
      const log = createSubstageLog('plan', 'analyze', 'completed');

      expect(log.message).toContain('Completed');
      expect(log.message).toContain('Analyze Requirements');
    });

    it('should handle invalid substage', () => {
      const log = createSubstageLog('plan', 'invalid', 'started');

      expect(log.substageId).toBe('invalid');
      expect(log.substageName).toBe('invalid');
    });
  });

  describe('getSubstageStatusIcon', () => {
    it('should return correct icons for statuses', () => {
      expect(getSubstageStatusIcon('pending')).toBe('⏳');
      expect(getSubstageStatusIcon('started')).toBe('🔄');
      expect(getSubstageStatusIcon('completed')).toBe('✅');
      expect(getSubstageStatusIcon('failed')).toBe('❌');
      expect(getSubstageStatusIcon('skipped')).toBe('⏭️');
    });

    it('should return default icon for unknown status', () => {
      expect(getSubstageStatusIcon('unknown')).toBe('❓');
    });
  });

  describe('getSubstageStatusColor', () => {
    it('should return correct color classes for statuses', () => {
      expect(getSubstageStatusColor('pending')).toBe('text-gray-500');
      expect(getSubstageStatusColor('started')).toBe('text-blue-500');
      expect(getSubstageStatusColor('completed')).toBe('text-green-500');
      expect(getSubstageStatusColor('failed')).toBe('text-red-500');
      expect(getSubstageStatusColor('skipped')).toBe('text-yellow-500');
    });

    it('should return default color for unknown status', () => {
      expect(getSubstageStatusColor('unknown')).toBe('text-gray-500');
    });
  });

  describe('simulateSubstageExecution', () => {
    it('should resolve with substage on success', async () => {
      // Mock Math.random to avoid the 5% simulated failure
      const originalRandom = Math.random;
      Math.random = () => 0.1; // > 0.05, so no simulated failure

      try {
        const onProgress = vi.fn();
        const result = await simulateSubstageExecution('plan', 'analyze', onProgress);

        expect(result).toBeDefined();
        expect(result.id).toBe('analyze');
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should call onProgress callback during execution', async () => {
      const originalRandom = Math.random;
      Math.random = () => 0.1;

      try {
        const onProgress = vi.fn();
        await simulateSubstageExecution('plan', 'analyze', onProgress);

        expect(onProgress).toHaveBeenCalled();
        expect(onProgress).toHaveBeenCalledWith(
          expect.objectContaining({
            stage: 'plan',
            substageId: 'analyze',
            status: 'started',
          })
        );
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should call onProgress with completed status on success', async () => {
      const originalRandom = Math.random;
      Math.random = () => 0.1;

      try {
        const onProgress = vi.fn();
        await simulateSubstageExecution('plan', 'analyze', onProgress);

        const completedCalls = onProgress.mock.calls.filter(
          call => call[0].status === 'completed'
        );
        expect(completedCalls.length).toBeGreaterThan(0);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should reject for invalid substage', async () => {
      await expect(
        simulateSubstageExecution('plan', 'invalid', vi.fn())
      ).rejects.toThrow();
    });

    it('should reject for invalid stage', async () => {
      await expect(
        simulateSubstageExecution('invalid', 'analyze', vi.fn())
      ).rejects.toThrow();
    });

    it('should update progress incrementally', async () => {
      const originalRandom = Math.random;
      Math.random = () => 0.1;

      try {
        const onProgress = vi.fn();
        await simulateSubstageExecution('plan', 'analyze', onProgress);

        const progressCalls = onProgress.mock.calls.filter(
          call => call[0].progress !== undefined
        );
        expect(progressCalls.length).toBeGreaterThan(1);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should work without onProgress callback', async () => {
      const originalRandom = Math.random;
      Math.random = () => 0.1;

      try {
        const result = await simulateSubstageExecution('plan', 'analyze');

        expect(result).toBeDefined();
        expect(result.id).toBe('analyze');
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  describe('Integration tests', () => {
    it('should handle complete substage workflow', () => {
      const stage = 'plan';
      const substages = getSubstages(stage);

      expect(substages.length).toBeGreaterThan(0);

      let current = substages[0];
      const ids = [];

      while (current) {
        ids.push(current.id);
        const next = getNextSubstage(stage, current.id);
        current = next;
      }

      expect(ids).toEqual(['analyze', 'design', 'breakdown']);
    });

    it('should track progress through all substages', () => {
      const stage = 'plan';
      const substageIds = getSubstageIds(stage);

      const progressValues = substageIds.map(id =>
        calculateStageProgress(stage, id)
      );

      expect(progressValues[0]).toBeLessThan(progressValues[1]);
      expect(progressValues[1]).toBeLessThan(progressValues[2]);
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });

    it('should handle all stages and substages', () => {
      const stages = ['plan', 'build', 'test', 'review', 'document', 'errored'];

      stages.forEach(stage => {
        const substages = getSubstages(stage);
        expect(substages.length).toBeGreaterThan(0);

        substages.forEach(substage => {
          expect(getSubstage(stage, substage.id)).toBeDefined();
          expect(getSubstageDuration(stage, substage.id)).toBeDefined();
          expect(getSubstageOutputs(stage, substage.id)).toBeInstanceOf(Array);
        });
      });
    });

    it('should create and format logs correctly', () => {
      const log = createSubstageLog('plan', 'analyze', 'started');
      const icon = getSubstageStatusIcon(log.status);
      const color = getSubstageStatusColor(log.status);

      expect(log).toBeDefined();
      expect(icon).toBeDefined();
      expect(color).toBeDefined();
      expect(color).toContain('text-');
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(getSubstages(null)).toEqual([]);
      expect(getSubstages(undefined)).toEqual([]);
      expect(getSubstage(null, null)).toBeUndefined();
      expect(getNextSubstage(null, null)).toBeNull();
      expect(canSkipSubstage(null, null)).toBe(false);
      expect(calculateStageProgress(null, null)).toBe(0);
    });

    it('should handle empty strings', () => {
      expect(getSubstages('')).toEqual([]);
      expect(getSubstage('', '')).toBeUndefined();
      expect(getNextSubstage('', '')).toBeNull();
    });

    it('should handle case sensitivity', () => {
      expect(getSubstages('PLAN')).toEqual([]);
      expect(getSubstage('PLAN', 'ANALYZE')).toBeUndefined();
    });
  });
});
