/**
 * Tests for Workflow Parser Utility
 */

import { describe, it, expect } from 'vitest';
import {
  parseWorkflowStages,
  isValidWorkflowName,
  getWorkflowDescription,
} from '../workflowParser';

describe('workflowParser', () => {
  describe('parseWorkflowStages', () => {
    it('should parse single-stage workflows', () => {
      expect(parseWorkflowStages('adw_plan_iso')).toEqual(['plan']);
      expect(parseWorkflowStages('adw_build_iso')).toEqual(['build']);
      expect(parseWorkflowStages('adw_test_iso')).toEqual(['test']);
    });

    it('should parse composite workflows', () => {
      expect(parseWorkflowStages('adw_plan_build_iso')).toEqual(['plan', 'build']);
      expect(parseWorkflowStages('adw_plan_build_test_iso')).toEqual([
        'plan',
        'build',
        'test',
      ]);
      expect(parseWorkflowStages('adw_build_test_review_iso')).toEqual([
        'build',
        'test',
        'review',
      ]);
    });

    it('should handle special case: sdlc', () => {
      expect(parseWorkflowStages('adw_sdlc_iso')).toEqual([
        'plan',
        'build',
        'test',
        'review',
        'document',
      ]);
    });

    it('should handle edge cases', () => {
      expect(parseWorkflowStages(null)).toEqual([]);
      expect(parseWorkflowStages(undefined)).toEqual([]);
      expect(parseWorkflowStages('')).toEqual([]);
      expect(parseWorkflowStages('invalid')).toEqual([]);
      expect(parseWorkflowStages(123)).toEqual([]);
    });

    it('should handle workflows without prefix/suffix', () => {
      expect(parseWorkflowStages('plan_build')).toEqual(['plan', 'build']);
    });

    it('should filter out empty stages', () => {
      expect(parseWorkflowStages('adw__plan__build_iso')).toEqual(['plan', 'build']);
    });
  });

  describe('isValidWorkflowName', () => {
    it('should validate correct workflow names', () => {
      expect(isValidWorkflowName('adw_plan_iso')).toBe(true);
      expect(isValidWorkflowName('adw_plan_build_iso')).toBe(true);
      expect(isValidWorkflowName('adw_plan_build_test_iso')).toBe(true);
      expect(isValidWorkflowName('adw_sdlc_iso')).toBe(true);
    });

    it('should reject invalid workflow names', () => {
      expect(isValidWorkflowName('plan_iso')).toBe(false); // Missing prefix
      expect(isValidWorkflowName('adw_plan')).toBe(false); // Missing suffix
      expect(isValidWorkflowName('invalid')).toBe(false);
      expect(isValidWorkflowName('')).toBe(false);
      expect(isValidWorkflowName(null)).toBe(false);
      expect(isValidWorkflowName(undefined)).toBe(false);
    });
  });

  describe('getWorkflowDescription', () => {
    it('should generate descriptions for single-stage workflows', () => {
      expect(getWorkflowDescription('adw_plan_iso')).toBe('Plan only');
      expect(getWorkflowDescription('adw_build_iso')).toBe('Build only');
    });

    it('should generate descriptions for composite workflows', () => {
      expect(getWorkflowDescription('adw_plan_build_iso')).toBe('Plan → Build');
      expect(getWorkflowDescription('adw_plan_build_test_iso')).toBe(
        'Plan → Build → Test'
      );
    });

    it('should handle sdlc workflow', () => {
      expect(getWorkflowDescription('adw_sdlc_iso')).toBe(
        'Plan → Build → Test → Review → Document'
      );
    });

    it('should handle invalid workflows', () => {
      expect(getWorkflowDescription('')).toBe('Unknown workflow');
      expect(getWorkflowDescription(null)).toBe('Unknown workflow');
    });
  });
});
