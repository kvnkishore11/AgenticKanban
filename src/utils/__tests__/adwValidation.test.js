/**
 * Tests for ADW Validation Utility
 */

import { describe, it, expect } from 'vitest';
import {
  isValidAdwIdFormat,
  isAdwIdRequired,
  isAdwIdOptional,
  supportsAdwId,
  sanitizeAdwId,
  formatAdwId,
  validateAdwId,
  getAdwIdErrorMessage,
  getAdwIdSuggestions,
  validateWorkflowAdwCombination,
  getWorkflowCategory,
  getWorkflowDescription,
} from '../adwValidation';

describe('adwValidation', () => {
  describe('isValidAdwIdFormat', () => {
    it('should validate correct ADW ID format', () => {
      expect(isValidAdwIdFormat('a1b2c3d4')).toBe(true);
      expect(isValidAdwIdFormat('12345678')).toBe(true);
      expect(isValidAdwIdFormat('abcdefgh')).toBe(true);
      expect(isValidAdwIdFormat('ABCD1234')).toBe(true);
      expect(isValidAdwIdFormat('ZzYy9988')).toBe(true);
    });

    it('should reject invalid ADW ID format', () => {
      expect(isValidAdwIdFormat('abc')).toBe(false); // Too short
      expect(isValidAdwIdFormat('abcdefghijk')).toBe(false); // Too long
      expect(isValidAdwIdFormat('abc-def1')).toBe(false); // Contains dash
      expect(isValidAdwIdFormat('abc_def1')).toBe(false); // Contains underscore
      expect(isValidAdwIdFormat('abc def1')).toBe(false); // Contains space
      expect(isValidAdwIdFormat('abc@def1')).toBe(false); // Special character
    });

    it('should handle edge cases', () => {
      expect(isValidAdwIdFormat('')).toBe(false);
      expect(isValidAdwIdFormat(null)).toBe(false);
      expect(isValidAdwIdFormat(undefined)).toBe(false);
      expect(isValidAdwIdFormat(123)).toBe(false);
      expect(isValidAdwIdFormat({})).toBe(false);
    });
  });

  describe('isAdwIdRequired', () => {
    it('should return true for dependent workflows', () => {
      expect(isAdwIdRequired('adw_build_iso')).toBe(true);
      expect(isAdwIdRequired('adw_test_iso')).toBe(true);
      expect(isAdwIdRequired('adw_review_iso')).toBe(true);
      expect(isAdwIdRequired('adw_document_iso')).toBe(true);
      expect(isAdwIdRequired('adw_ship_iso')).toBe(true);
    });

    it('should return false for entry point workflows', () => {
      expect(isAdwIdRequired('adw_plan_iso')).toBe(false);
      expect(isAdwIdRequired('adw_patch_iso')).toBe(false);
    });

    it('should return false for orchestrator workflows', () => {
      expect(isAdwIdRequired('adw_sdlc_zte_iso')).toBe(false);
      expect(isAdwIdRequired('adw_plan_build_iso')).toBe(false);
      expect(isAdwIdRequired('adw_sdlc_iso')).toBe(false);
    });

    it('should return false for unknown workflows', () => {
      expect(isAdwIdRequired('unknown_workflow')).toBe(false);
      expect(isAdwIdRequired('')).toBe(false);
    });
  });

  describe('isAdwIdOptional', () => {
    it('should return true for entry point workflows', () => {
      expect(isAdwIdOptional('adw_plan_iso')).toBe(true);
      expect(isAdwIdOptional('adw_patch_iso')).toBe(true);
    });

    it('should return true for orchestrator workflows', () => {
      expect(isAdwIdOptional('adw_sdlc_zte_iso')).toBe(true);
      expect(isAdwIdOptional('adw_plan_build_iso')).toBe(true);
      expect(isAdwIdOptional('adw_plan_build_test_iso')).toBe(true);
      expect(isAdwIdOptional('adw_sdlc_iso')).toBe(true);
    });

    it('should return false for dependent workflows', () => {
      expect(isAdwIdOptional('adw_build_iso')).toBe(false);
      expect(isAdwIdOptional('adw_test_iso')).toBe(false);
    });

    it('should return false for unknown workflows', () => {
      expect(isAdwIdOptional('unknown_workflow')).toBe(false);
    });
  });

  describe('supportsAdwId', () => {
    it('should return true for workflows that require ADW ID', () => {
      expect(supportsAdwId('adw_build_iso')).toBe(true);
      expect(supportsAdwId('adw_test_iso')).toBe(true);
    });

    it('should return true for workflows where ADW ID is optional', () => {
      expect(supportsAdwId('adw_plan_iso')).toBe(true);
      expect(supportsAdwId('adw_patch_iso')).toBe(true);
      expect(supportsAdwId('adw_sdlc_iso')).toBe(true);
    });

    it('should return false for workflows that do not support ADW ID', () => {
      expect(supportsAdwId('unknown_workflow')).toBe(false);
      expect(supportsAdwId('')).toBe(false);
    });
  });

  describe('sanitizeAdwId', () => {
    it('should remove non-alphanumeric characters', () => {
      expect(sanitizeAdwId('abc-def1')).toBe('abcdef1');
      expect(sanitizeAdwId('abc_def1')).toBe('abcdef1');
      expect(sanitizeAdwId('abc def1')).toBe('abcdef1');
      expect(sanitizeAdwId('abc@def#1')).toBe('abcdef1');
    });

    it('should limit to 8 characters', () => {
      expect(sanitizeAdwId('abcdefghijk')).toBe('abcdefgh');
      expect(sanitizeAdwId('123456789012')).toBe('12345678');
    });

    it('should handle input shorter than 8 characters', () => {
      expect(sanitizeAdwId('abc')).toBe('abc');
      expect(sanitizeAdwId('12')).toBe('12');
    });

    it('should handle edge cases', () => {
      expect(sanitizeAdwId('')).toBe('');
      expect(sanitizeAdwId(null)).toBe('');
      expect(sanitizeAdwId(undefined)).toBe('');
      expect(sanitizeAdwId(123)).toBe('');
    });

    it('should preserve alphanumeric characters', () => {
      expect(sanitizeAdwId('aBc123XyZ')).toBe('aBc123Xy');
    });
  });

  describe('formatAdwId', () => {
    it('should format 8-character IDs with dash', () => {
      expect(formatAdwId('abcd1234')).toBe('abcd-1234');
      expect(formatAdwId('12345678')).toBe('1234-5678');
    });

    it('should not format IDs shorter than 8 characters', () => {
      expect(formatAdwId('abc')).toBe('abc');
      expect(formatAdwId('1234567')).toBe('1234567');
    });

    it('should not format IDs longer than 8 characters', () => {
      expect(formatAdwId('abcdefghijk')).toBe('abcdefghijk');
    });

    it('should handle edge cases', () => {
      expect(formatAdwId('')).toBe('');
      expect(formatAdwId(null)).toBe('');
      expect(formatAdwId(undefined)).toBe('');
    });
  });

  describe('validateAdwId', () => {
    it('should validate correct ADW IDs', () => {
      const result = validateAdwId('abcd1234', false);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject too short ADW IDs', () => {
      const result = validateAdwId('abc', false);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('8 characters');
      expect(result.error).toContain('3');
    });

    it('should reject too long ADW IDs', () => {
      const result = validateAdwId('abcdefghijk', false);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('should reject ADW IDs with invalid characters', () => {
      const result = validateAdwId('abc-def1', false);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('letters and numbers');
    });

    it('should allow empty when not required', () => {
      const result = validateAdwId('', false);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty when required', () => {
      const result = validateAdwId('', true);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should handle whitespace-only input', () => {
      const result1 = validateAdwId('   ', false);
      expect(result1.isValid).toBe(true);

      const result2 = validateAdwId('   ', true);
      expect(result2.isValid).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      const result = validateAdwId('  abcd1234  ', false);

      expect(result.isValid).toBe(true);
    });

    it('should handle null and undefined', () => {
      const result1 = validateAdwId(null, false);
      expect(result1.isValid).toBe(true);

      const result2 = validateAdwId(undefined, false);
      expect(result2.isValid).toBe(true);

      const result3 = validateAdwId(null, true);
      expect(result3.isValid).toBe(false);
    });
  });

  describe('getAdwIdErrorMessage', () => {
    it('should return null for valid ADW IDs', () => {
      expect(getAdwIdErrorMessage('abcd1234', 'adw_plan_iso')).toBeNull();
    });

    it('should return error message for invalid ADW IDs', () => {
      const message = getAdwIdErrorMessage('abc', 'adw_plan_iso');

      expect(message).toBeTruthy();
      expect(message).toContain('8 characters');
    });

    it('should include workflow-specific context for required workflows', () => {
      const message = getAdwIdErrorMessage('', 'adw_build_iso');

      expect(message).toBeTruthy();
      expect(message).toContain('adw_build_iso');
      expect(message).toContain('requires');
    });

    it('should include workflow-specific context for optional workflows', () => {
      const message = getAdwIdErrorMessage('abc', 'adw_plan_iso');

      expect(message).toBeTruthy();
      expect(message).toContain('adw_plan_iso');
    });

    it('should work without workflow type', () => {
      const message = getAdwIdErrorMessage('abc', null);

      expect(message).toBeTruthy();
      expect(message).toContain('8 characters');
    });
  });

  describe('getAdwIdSuggestions', () => {
    it('should return suggestions for required workflows', () => {
      const suggestions = getAdwIdSuggestions('adw_build_iso');

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('requires'))).toBe(true);
      expect(suggestions.some(s => s.includes('Cannot create new') || s.includes('must reference'))).toBe(true);
    });

    it('should return suggestions for optional workflows', () => {
      const suggestions = getAdwIdSuggestions('adw_plan_iso');

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('optional') || s.includes('can use'))).toBe(true);
    });

    it('should return default suggestions when no workflow type provided', () => {
      const suggestions = getAdwIdSuggestions(null);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should include format example in suggestions', () => {
      const suggestions = getAdwIdSuggestions('adw_build_iso');

      expect(suggestions.some(s => s.includes('a1b2c3d4'))).toBe(true);
    });
  });

  describe('validateWorkflowAdwCombination', () => {
    it('should validate correct combinations', () => {
      const result = validateWorkflowAdwCombination('adw_plan_iso', '');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require workflow type', () => {
      const result = validateWorkflowAdwCombination('', 'abcd1234');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Workflow type'))).toBe(true);
    });

    it('should error when required workflow has no ADW ID', () => {
      const result = validateWorkflowAdwCombination('adw_build_iso', '');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('requires'))).toBe(true);
    });

    it('should warn when workflow does not use ADW ID', () => {
      const result = validateWorkflowAdwCombination('unknown_workflow', 'abcd1234');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('does not use'))).toBe(true);
    });

    it('should validate ADW ID format', () => {
      const result = validateWorkflowAdwCombination('adw_build_iso', 'abc');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should allow valid workflow and ADW ID combination', () => {
      const result = validateWorkflowAdwCombination('adw_build_iso', 'abcd1234');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle optional ADW ID for entry point workflows', () => {
      const result1 = validateWorkflowAdwCombination('adw_plan_iso', '');
      expect(result1.isValid).toBe(true);

      const result2 = validateWorkflowAdwCombination('adw_plan_iso', 'abcd1234');
      expect(result2.isValid).toBe(true);
    });
  });

  describe('getWorkflowCategory', () => {
    it('should categorize dependent workflows', () => {
      expect(getWorkflowCategory('adw_build_iso')).toBe('dependent');
      expect(getWorkflowCategory('adw_test_iso')).toBe('dependent');
      expect(getWorkflowCategory('adw_review_iso')).toBe('dependent');
    });

    it('should categorize entry point workflows', () => {
      expect(getWorkflowCategory('adw_plan_iso')).toBe('entry_point');
      expect(getWorkflowCategory('adw_patch_iso')).toBe('entry_point');
    });

    it('should categorize orchestrator workflows', () => {
      expect(getWorkflowCategory('adw_sdlc_iso')).toBe('orchestrator');
      expect(getWorkflowCategory('adw_plan_build_iso')).toBe('orchestrator');
      expect(getWorkflowCategory('adw_plan_build_test_iso')).toBe('orchestrator');
    });

    it('should return unknown for unrecognized workflows', () => {
      expect(getWorkflowCategory('unknown_workflow')).toBe('unknown');
      expect(getWorkflowCategory('')).toBe('unknown');
    });
  });

  describe('getWorkflowDescription', () => {
    it('should return description for dependent workflows', () => {
      const desc = getWorkflowDescription('adw_build_iso');

      expect(desc).toContain('existing worktree');
    });

    it('should return description for entry point workflows', () => {
      const desc = getWorkflowDescription('adw_plan_iso');

      expect(desc).toContain('create new');
    });

    it('should return description for orchestrator workflows', () => {
      const desc = getWorkflowDescription('adw_sdlc_iso');

      expect(desc).toContain('multiple workflow');
    });

    it('should return default description for unknown workflows', () => {
      const desc = getWorkflowDescription('unknown_workflow');

      expect(desc).toContain('not recognized');
    });
  });

  describe('Integration tests', () => {
    it('should handle complete validation workflow for required ADW ID', () => {
      const workflowType = 'adw_build_iso';
      const adwId = 'abcd1234';

      expect(isAdwIdRequired(workflowType)).toBe(true);
      expect(supportsAdwId(workflowType)).toBe(true);

      const validation = validateAdwId(adwId, true);
      expect(validation.isValid).toBe(true);

      const combination = validateWorkflowAdwCombination(workflowType, adwId);
      expect(combination.isValid).toBe(true);

      const category = getWorkflowCategory(workflowType);
      expect(category).toBe('dependent');
    });

    it('should handle complete validation workflow for optional ADW ID', () => {
      const workflowType = 'adw_plan_iso';

      // Test with ADW ID
      const adwId = 'test1234';
      expect(isAdwIdOptional(workflowType)).toBe(true);

      const validation1 = validateAdwId(adwId, false);
      expect(validation1.isValid).toBe(true);

      const combination1 = validateWorkflowAdwCombination(workflowType, adwId);
      expect(combination1.isValid).toBe(true);

      // Test without ADW ID
      const combination2 = validateWorkflowAdwCombination(workflowType, '');
      expect(combination2.isValid).toBe(true);
    });

    it('should provide helpful error messages for invalid inputs', () => {
      const workflowType = 'adw_build_iso';
      const invalidAdwId = 'abc';

      const errorMessage = getAdwIdErrorMessage(invalidAdwId, workflowType);
      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toContain('8 characters');

      const suggestions = getAdwIdSuggestions(workflowType);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle sanitize and format workflow', () => {
      const input = 'abc-def1@#$';
      const sanitized = sanitizeAdwId(input);

      expect(sanitized).toBe('abcdef1');

      // If we had a valid 8-char ID
      const validId = 'abcd1234';
      const formatted = formatAdwId(validId);

      expect(formatted).toBe('abcd-1234');
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in ADW ID', () => {
      const special = '!@#$%^&*';
      const sanitized = sanitizeAdwId(special);

      expect(sanitized).toBe('');
    });

    it('should handle unicode characters', () => {
      const unicode = 'test世界';
      const sanitized = sanitizeAdwId(unicode);

      expect(sanitized).toBe('test');
    });

    it('should handle mixed case ADW IDs', () => {
      const mixedCase = 'AbCd1234';
      const validation = validateAdwId(mixedCase, false);

      expect(validation.isValid).toBe(true);
    });

    it('should handle exactly 8 characters', () => {
      const exact = '12345678';
      const validation = validateAdwId(exact, false);

      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeNull();
    });

    it('should handle numeric-only ADW IDs', () => {
      const numeric = '12345678';
      expect(isValidAdwIdFormat(numeric)).toBe(true);
    });

    it('should handle alpha-only ADW IDs', () => {
      const alpha = 'abcdefgh';
      expect(isValidAdwIdFormat(alpha)).toBe(true);
    });
  });
});
