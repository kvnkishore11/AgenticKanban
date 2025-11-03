/**
 * Tests for Workflow Validation Utility
 */

import { describe, it, expect } from 'vitest';
import {
  getWorkflowStages,
  isStageInWorkflow,
  getNextStageInWorkflow,
  isWorkflowComplete,
  getFirstStageInWorkflow,
  getLastStageInWorkflow,
  getStageIndex,
  getWorkflowCompletionPercentage,
} from '../workflowValidation';

describe('workflowValidation', () => {
  describe('getWorkflowStages', () => {
    it('should return stages for a workflow', () => {
      expect(getWorkflowStages('adw_plan_iso')).toEqual(['plan']);
      expect(getWorkflowStages('adw_plan_build_iso')).toEqual(['plan', 'build']);
      expect(getWorkflowStages('adw_plan_build_test_iso')).toEqual([
        'plan',
        'build',
        'test',
      ]);
    });
  });

  describe('isStageInWorkflow', () => {
    it('should return true if stage is in workflow', () => {
      expect(isStageInWorkflow('adw_plan_build_iso', 'plan')).toBe(true);
      expect(isStageInWorkflow('adw_plan_build_iso', 'build')).toBe(true);
    });

    it('should return false if stage is not in workflow', () => {
      expect(isStageInWorkflow('adw_plan_build_iso', 'test')).toBe(false);
      expect(isStageInWorkflow('adw_plan_build_iso', 'review')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isStageInWorkflow('adw_plan_build_iso', 'PLAN')).toBe(true);
      expect(isStageInWorkflow('adw_plan_build_iso', 'Build')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isStageInWorkflow(null, 'plan')).toBe(false);
      expect(isStageInWorkflow('adw_plan_iso', null)).toBe(false);
      expect(isStageInWorkflow('', 'plan')).toBe(false);
    });
  });

  describe('getNextStageInWorkflow', () => {
    it('should return next stage in workflow', () => {
      expect(getNextStageInWorkflow('adw_plan_build_iso', 'plan')).toBe('build');
      expect(getNextStageInWorkflow('adw_plan_build_test_iso', 'build')).toBe('test');
    });

    it('should return null if current stage is last', () => {
      expect(getNextStageInWorkflow('adw_plan_build_iso', 'build')).toBe(null);
      expect(getNextStageInWorkflow('adw_plan_iso', 'plan')).toBe(null);
    });

    it('should return null if current stage is not in workflow', () => {
      expect(getNextStageInWorkflow('adw_plan_build_iso', 'test')).toBe(null);
      expect(getNextStageInWorkflow('adw_plan_build_iso', 'invalid')).toBe(null);
    });

    it('should handle edge cases', () => {
      expect(getNextStageInWorkflow(null, 'plan')).toBe(null);
      expect(getNextStageInWorkflow('adw_plan_iso', null)).toBe(null);
      expect(getNextStageInWorkflow('', '')).toBe(null);
    });
  });

  describe('isWorkflowComplete', () => {
    it('should return true if current stage is last stage', () => {
      expect(isWorkflowComplete('adw_plan_build_iso', 'build')).toBe(true);
      expect(isWorkflowComplete('adw_plan_iso', 'plan')).toBe(true);
      expect(isWorkflowComplete('adw_plan_build_test_iso', 'test')).toBe(true);
    });

    it('should return false if current stage is not last stage', () => {
      expect(isWorkflowComplete('adw_plan_build_iso', 'plan')).toBe(false);
      expect(isWorkflowComplete('adw_plan_build_test_iso', 'plan')).toBe(false);
      expect(isWorkflowComplete('adw_plan_build_test_iso', 'build')).toBe(false);
    });

    it('should return false if current stage is not in workflow', () => {
      expect(isWorkflowComplete('adw_plan_build_iso', 'test')).toBe(false);
      expect(isWorkflowComplete('adw_plan_build_iso', 'invalid')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isWorkflowComplete(null, 'plan')).toBe(false);
      expect(isWorkflowComplete('adw_plan_iso', null)).toBe(false);
      expect(isWorkflowComplete('', '')).toBe(false);
    });
  });

  describe('getFirstStageInWorkflow', () => {
    it('should return first stage', () => {
      expect(getFirstStageInWorkflow('adw_plan_build_iso')).toBe('plan');
      expect(getFirstStageInWorkflow('adw_build_test_iso')).toBe('build');
    });

    it('should return null for invalid workflows', () => {
      expect(getFirstStageInWorkflow('')).toBe(null);
      expect(getFirstStageInWorkflow(null)).toBe(null);
    });
  });

  describe('getLastStageInWorkflow', () => {
    it('should return last stage', () => {
      expect(getLastStageInWorkflow('adw_plan_build_iso')).toBe('build');
      expect(getLastStageInWorkflow('adw_plan_build_test_iso')).toBe('test');
      expect(getLastStageInWorkflow('adw_plan_iso')).toBe('plan');
    });

    it('should return null for invalid workflows', () => {
      expect(getLastStageInWorkflow('')).toBe(null);
      expect(getLastStageInWorkflow(null)).toBe(null);
    });
  });

  describe('getStageIndex', () => {
    it('should return correct index for stage', () => {
      expect(getStageIndex('adw_plan_build_test_iso', 'plan')).toBe(0);
      expect(getStageIndex('adw_plan_build_test_iso', 'build')).toBe(1);
      expect(getStageIndex('adw_plan_build_test_iso', 'test')).toBe(2);
    });

    it('should return -1 if stage not in workflow', () => {
      expect(getStageIndex('adw_plan_build_iso', 'test')).toBe(-1);
      expect(getStageIndex('adw_plan_build_iso', 'invalid')).toBe(-1);
    });

    it('should handle edge cases', () => {
      expect(getStageIndex(null, 'plan')).toBe(-1);
      expect(getStageIndex('adw_plan_iso', null)).toBe(-1);
    });
  });

  describe('getWorkflowCompletionPercentage', () => {
    it('should calculate correct percentage for single-stage workflow', () => {
      expect(getWorkflowCompletionPercentage('adw_plan_iso', 'plan')).toBe(100);
    });

    it('should calculate correct percentage for multi-stage workflow', () => {
      expect(getWorkflowCompletionPercentage('adw_plan_build_iso', 'plan')).toBe(50);
      expect(getWorkflowCompletionPercentage('adw_plan_build_iso', 'build')).toBe(100);

      expect(getWorkflowCompletionPercentage('adw_plan_build_test_iso', 'plan')).toBe(33);
      expect(getWorkflowCompletionPercentage('adw_plan_build_test_iso', 'build')).toBe(67);
      expect(getWorkflowCompletionPercentage('adw_plan_build_test_iso', 'test')).toBe(100);
    });

    it('should return 0 for invalid inputs', () => {
      expect(getWorkflowCompletionPercentage(null, 'plan')).toBe(0);
      expect(getWorkflowCompletionPercentage('adw_plan_iso', null)).toBe(0);
      expect(getWorkflowCompletionPercentage('adw_plan_iso', 'invalid')).toBe(0);
    });
  });
});
