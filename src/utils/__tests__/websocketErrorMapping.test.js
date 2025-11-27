/**
 * Tests for WebSocket Error Mapping Utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  RECOVERY_ACTIONS,
  WebSocketErrorMapper,
} from '../websocketErrorMapping';

describe('websocketErrorMapping', () => {
  describe('Constants', () => {
    it('should export ERROR_CATEGORIES', () => {
      expect(ERROR_CATEGORIES).toBeDefined();
      expect(ERROR_CATEGORIES.CONNECTION).toBe('connection');
      expect(ERROR_CATEGORIES.WORKFLOW).toBe('workflow');
      expect(ERROR_CATEGORIES.SYSTEM).toBe('system');
      expect(ERROR_CATEGORIES.AUTHENTICATION).toBe('authentication');
      expect(ERROR_CATEGORIES.VALIDATION).toBe('validation');
      expect(ERROR_CATEGORIES.RATE_LIMIT).toBe('rate_limit');
      expect(ERROR_CATEGORIES.TIMEOUT).toBe('timeout');
      expect(ERROR_CATEGORIES.NETWORK).toBe('network');
    });

    it('should export ERROR_SEVERITY', () => {
      expect(ERROR_SEVERITY).toBeDefined();
      expect(ERROR_SEVERITY.LOW).toBe('low');
      expect(ERROR_SEVERITY.MEDIUM).toBe('medium');
      expect(ERROR_SEVERITY.HIGH).toBe('high');
      expect(ERROR_SEVERITY.CRITICAL).toBe('critical');
    });

    it('should export RECOVERY_ACTIONS', () => {
      expect(RECOVERY_ACTIONS).toBeDefined();
      expect(RECOVERY_ACTIONS.RETRY).toBe('retry');
      expect(RECOVERY_ACTIONS.RECONNECT).toBe('reconnect');
      expect(RECOVERY_ACTIONS.REFRESH).toBe('refresh');
      expect(RECOVERY_ACTIONS.CONTACT_SUPPORT).toBe('contact_support');
      expect(RECOVERY_ACTIONS.CHECK_NETWORK).toBe('check_network');
      expect(RECOVERY_ACTIONS.WAIT).toBe('wait');
      expect(RECOVERY_ACTIONS.UPDATE_CONFIG).toBe('update_config');
    });
  });

  describe('WebSocketErrorMapper.mapError', () => {
    it('should map string error codes', () => {
      const result = WebSocketErrorMapper.mapError('connection_failed');

      expect(result.code).toBe('connection_failed');
      expect(result.category).toBe(ERROR_CATEGORIES.CONNECTION);
      expect(result.severity).toBe(ERROR_SEVERITY.HIGH);
      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.userMessage).toBeDefined();
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.recoveryActions).toBeInstanceOf(Array);
      expect(result.timestamp).toBeDefined();
    });

    it('should map Error objects', () => {
      const error = new Error('Test error');
      error.code = 'workflow_failed';

      const result = WebSocketErrorMapper.mapError(error);

      expect(result.code).toBe('workflow_failed');
      expect(result.category).toBe(ERROR_CATEGORIES.WORKFLOW);
      expect(result.originalError.originalMessage).toBe('Test error');
    });

    it('should map error objects with code property', () => {
      const error = {
        code: 'auth_required',
        details: 'Additional info',
      };

      const result = WebSocketErrorMapper.mapError(error);

      expect(result.code).toBe('auth_required');
      expect(result.category).toBe(ERROR_CATEGORIES.AUTHENTICATION);
      expect(result.originalError.details).toBe('Additional info');
    });

    it('should map error objects with type property', () => {
      const error = {
        type: 'rate_limit_exceeded',
      };

      const result = WebSocketErrorMapper.mapError(error);

      expect(result.code).toBe('rate_limit_exceeded');
      expect(result.category).toBe(ERROR_CATEGORIES.RATE_LIMIT);
    });

    it('should handle unknown error codes', () => {
      const result = WebSocketErrorMapper.mapError('unknown_error_code');

      expect(result.code).toBe('unknown_error_code');
      expect(result.title).toBe('Unexpected Error');
    });

    it('should handle null/undefined errors', () => {
      const result1 = WebSocketErrorMapper.mapError(null);
      const result2 = WebSocketErrorMapper.mapError(undefined);

      expect(result1.code).toBe('unknown_error');
      expect(result2.code).toBe('unknown_error');
    });

    it('should include context in mapped error', () => {
      const context = { taskId: '123', workflowType: 'test' };
      const result = WebSocketErrorMapper.mapError('connection_failed', context);

      expect(result.context).toEqual(context);
    });

    it('should include autoRetry and retryDelay', () => {
      const result = WebSocketErrorMapper.mapError('connection_failed');

      expect(result.autoRetry).toBe(true);
      expect(result.retryDelay).toBe(3000);
    });

    it('should handle all connection errors', () => {
      const codes = ['connection_failed', 'connection_timeout', 'connection_lost', 'max_reconnect_attempts'];

      codes.forEach(code => {
        const result = WebSocketErrorMapper.mapError(code);
        expect(result.code).toBe(code);
        expect(result.category).toMatch(/connection|timeout/);
      });
    });

    it('should handle all workflow errors', () => {
      const codes = ['workflow_not_found', 'workflow_failed', 'workflow_timeout', 'workflow_queue_full'];

      codes.forEach(code => {
        const result = WebSocketErrorMapper.mapError(code);
        expect(result.code).toBe(code);
        expect([ERROR_CATEGORIES.WORKFLOW, ERROR_CATEGORIES.TIMEOUT, ERROR_CATEGORIES.SYSTEM]).toContain(result.category);
      });
    });
  });

  describe('WebSocketErrorMapper.mapCloseCode', () => {
    it('should return null for normal closure (1000)', () => {
      const result = WebSocketErrorMapper.mapCloseCode(1000);
      expect(result).toBeNull();
    });

    it('should map standard WebSocket close codes', () => {
      const codes = [1001, 1002, 1003, 1006, 1011, 1012, 1013];

      codes.forEach(code => {
        const result = WebSocketErrorMapper.mapCloseCode(code);
        expect(result).toBeDefined();
        expect(result.code).toBeDefined();
        expect(result.context.closeCode).toBe(code);
      });
    });

    it('should include close reason in context', () => {
      const result = WebSocketErrorMapper.mapCloseCode(1001, 'Server shutting down');

      expect(result.context.reason).toBe('Server shutting down');
    });

    it('should map unknown close codes to unknown_error', () => {
      const result = WebSocketErrorMapper.mapCloseCode(9999);

      expect(result.code).toBe('unknown_error');
      expect(result.context.closeCode).toBe(9999);
    });

    it('should handle abnormal closure (1006)', () => {
      const result = WebSocketErrorMapper.mapCloseCode(1006);

      expect(result).toBeDefined();
      expect(result.code).toBe('abnormal_closure');
    });

    it('should handle server error (1011)', () => {
      const result = WebSocketErrorMapper.mapCloseCode(1011);

      expect(result).toBeDefined();
      expect(result.code).toBe('server_error');
    });
  });

  describe('WebSocketErrorMapper.getRecoveryInstructions', () => {
    it('should return recovery instructions for known errors', () => {
      const result = WebSocketErrorMapper.getRecoveryInstructions('connection_failed');

      expect(result.canRecover).toBe(true);
      expect(result.instructions).toBeInstanceOf(Array);
      expect(result.instructions.length).toBeGreaterThan(0);
      expect(result.estimatedTime).toBeDefined();
      expect(result.autoRetry).toBe(true);
    });

    it('should return default instructions for unknown errors', () => {
      const result = WebSocketErrorMapper.getRecoveryInstructions('unknown_code');

      expect(result.canRecover).toBe(false);
      expect(result.instructions).toEqual(['Contact support for assistance']);
      expect(result.estimatedTime).toBeNull();
    });

    it('should include retry instructions', () => {
      const result = WebSocketErrorMapper.getRecoveryInstructions('workflow_failed');

      expect(result.instructions.some(i => i.includes('retry'))).toBe(true);
    });

    it('should include wait time for errors with retry delay', () => {
      const result = WebSocketErrorMapper.getRecoveryInstructions('connection_timeout');

      expect(result.estimatedTime).toBeDefined();
      expect(result.estimatedTime).toBeGreaterThan(0);
    });

    it('should generate appropriate instructions for each recovery action', () => {
      // Test different recovery actions
      const testCases = [
        { code: 'connection_failed', expectedActions: ['retry', 'check_network'] },
        { code: 'auth_required', expectedActions: ['refresh'] },
        { code: 'rate_limit_exceeded', expectedActions: ['wait'] },
      ];

      testCases.forEach(({ code }) => {
        const result = WebSocketErrorMapper.getRecoveryInstructions(code);
        expect(result.instructions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('WebSocketErrorMapper.shouldAutoRetry', () => {
    it('should return true for retryable errors', () => {
      expect(WebSocketErrorMapper.shouldAutoRetry('connection_failed')).toBe(true);
      expect(WebSocketErrorMapper.shouldAutoRetry('connection_timeout')).toBe(true);
      expect(WebSocketErrorMapper.shouldAutoRetry('connection_lost')).toBe(true);
      expect(WebSocketErrorMapper.shouldAutoRetry('network_error')).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(WebSocketErrorMapper.shouldAutoRetry('auth_required')).toBe(false);
      expect(WebSocketErrorMapper.shouldAutoRetry('workflow_not_found')).toBe(false);
      expect(WebSocketErrorMapper.shouldAutoRetry('invalid_request')).toBe(false);
    });

    it('should return false for unknown errors', () => {
      expect(WebSocketErrorMapper.shouldAutoRetry('unknown_code')).toBe(false);
    });
  });

  describe('WebSocketErrorMapper.getRetryDelay', () => {
    it('should return correct retry delays', () => {
      expect(WebSocketErrorMapper.getRetryDelay('connection_failed')).toBe(3000);
      expect(WebSocketErrorMapper.getRetryDelay('connection_timeout')).toBe(5000);
      expect(WebSocketErrorMapper.getRetryDelay('service_unavailable')).toBe(60000);
    });

    it('should return default delay for unknown errors', () => {
      expect(WebSocketErrorMapper.getRetryDelay('unknown_code')).toBe(3000);
    });

    it('should return default delay for errors without specified delay', () => {
      expect(WebSocketErrorMapper.getRetryDelay('auth_required')).toBe(3000);
    });
  });

  describe('WebSocketErrorMapper.formatForUI', () => {
    it('should format error for UI display', () => {
      const mappedError = WebSocketErrorMapper.mapError('connection_failed');
      const formatted = WebSocketErrorMapper.formatForUI(mappedError);

      expect(formatted.title).toBeDefined();
      expect(formatted.message).toBeDefined();
      expect(formatted.severity).toBeDefined();
      expect(formatted.suggestions).toBeInstanceOf(Array);
      expect(formatted.canRetry).toBeDefined();
      expect(formatted.retryLabel).toBeDefined();
      expect(formatted.showDetails).toBeDefined();
      expect(formatted.timestamp).toBeDefined();
    });

    it('should set canRetry based on autoRetry or recovery actions', () => {
      const autoRetryError = WebSocketErrorMapper.mapError('connection_failed');
      const formatted1 = WebSocketErrorMapper.formatForUI(autoRetryError);
      expect(formatted1.canRetry).toBe(true);

      const manualRetryError = WebSocketErrorMapper.mapError('workflow_failed');
      const formatted2 = WebSocketErrorMapper.formatForUI(manualRetryError);
      expect(formatted2.canRetry).toBe(true);
    });

    it('should use different retry labels for auto vs manual retry', () => {
      const autoRetryError = WebSocketErrorMapper.mapError('connection_failed');
      const formatted1 = WebSocketErrorMapper.formatForUI(autoRetryError);
      expect(formatted1.retryLabel).toBe('Retrying automatically...');

      const manualRetryError = WebSocketErrorMapper.mapError('workflow_failed');
      const formatted2 = WebSocketErrorMapper.formatForUI(manualRetryError);
      expect(formatted2.retryLabel).toBe('Try Again');
    });

    it('should show details for critical errors', () => {
      const criticalError = WebSocketErrorMapper.mapError('service_unavailable');
      const formatted = WebSocketErrorMapper.formatForUI(criticalError);
      expect(formatted.showDetails).toBe(true);
    });
  });

  describe('WebSocketErrorMapper.getAllErrorCodes', () => {
    it('should return array of all error codes', () => {
      const codes = WebSocketErrorMapper.getAllErrorCodes();

      expect(codes).toBeInstanceOf(Array);
      expect(codes.length).toBeGreaterThan(0);
      expect(codes).toContain('connection_failed');
      expect(codes).toContain('workflow_failed');
      expect(codes).toContain('auth_required');
    });
  });

  describe('WebSocketErrorMapper.getErrorsByCategory', () => {
    it('should return errors for CONNECTION category', () => {
      const errors = WebSocketErrorMapper.getErrorsByCategory(ERROR_CATEGORIES.CONNECTION);

      expect(errors).toBeInstanceOf(Array);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('connection_failed');
      expect(errors).toContain('connection_lost');
    });

    it('should return errors for WORKFLOW category', () => {
      const errors = WebSocketErrorMapper.getErrorsByCategory(ERROR_CATEGORIES.WORKFLOW);

      expect(errors).toBeInstanceOf(Array);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('workflow_not_found');
      expect(errors).toContain('workflow_failed');
    });

    it('should return errors for AUTHENTICATION category', () => {
      const errors = WebSocketErrorMapper.getErrorsByCategory(ERROR_CATEGORIES.AUTHENTICATION);

      expect(errors).toBeInstanceOf(Array);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('auth_required');
      expect(errors).toContain('auth_expired');
    });

    it('should return empty array for unknown category', () => {
      const errors = WebSocketErrorMapper.getErrorsByCategory('unknown_category');
      expect(errors).toEqual([]);
    });
  });

  describe('WebSocketErrorMapper.getErrorsBySeverity', () => {
    it('should return errors for CRITICAL severity', () => {
      const errors = WebSocketErrorMapper.getErrorsBySeverity(ERROR_SEVERITY.CRITICAL);

      expect(errors).toBeInstanceOf(Array);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('service_unavailable');
    });

    it('should return errors for HIGH severity', () => {
      const errors = WebSocketErrorMapper.getErrorsBySeverity(ERROR_SEVERITY.HIGH);

      expect(errors).toBeInstanceOf(Array);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('connection_failed');
    });

    it('should return errors for MEDIUM severity', () => {
      const errors = WebSocketErrorMapper.getErrorsBySeverity(ERROR_SEVERITY.MEDIUM);

      expect(errors).toBeInstanceOf(Array);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return errors for LOW severity', () => {
      const errors = WebSocketErrorMapper.getErrorsBySeverity(ERROR_SEVERITY.LOW);

      expect(errors).toBeInstanceOf(Array);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown severity', () => {
      const errors = WebSocketErrorMapper.getErrorsBySeverity('unknown_severity');
      expect(errors).toEqual([]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle Error objects without code', () => {
      const error = new Error('Test error');
      const result = WebSocketErrorMapper.mapError(error);

      expect(result.code).toBe('Error');
      expect(result.originalError.originalMessage).toBe('Test error');
    });

    it('should handle empty error objects', () => {
      const result = WebSocketErrorMapper.mapError({});

      expect(result.code).toBe('unknown_error');
    });

    it('should handle numeric inputs', () => {
      const result = WebSocketErrorMapper.mapError(123);

      expect(result.code).toBe('unknown_error');
    });

    it('should preserve original error data', () => {
      const error = {
        code: 'connection_failed',
        details: 'Network issue',
        timestamp: '2024-01-01',
      };

      const result = WebSocketErrorMapper.mapError(error);

      expect(result.originalError.details).toBe('Network issue');
      expect(result.originalError.timestamp).toBe('2024-01-01');
    });

    it('should handle errors with both code and type', () => {
      const error = {
        code: 'connection_failed',
        type: 'network_error',
      };

      const result = WebSocketErrorMapper.mapError(error);

      // Code should take precedence
      expect(result.code).toBe('connection_failed');
    });
  });

  describe('Integration tests', () => {
    it('should handle complete error mapping workflow', () => {
      const error = 'connection_failed';
      const context = { taskId: '123' };

      const mapped = WebSocketErrorMapper.mapError(error, context);
      const recovery = WebSocketErrorMapper.getRecoveryInstructions(mapped.code);
      const formatted = WebSocketErrorMapper.formatForUI(mapped);
      const shouldRetry = WebSocketErrorMapper.shouldAutoRetry(mapped.code);
      const delay = WebSocketErrorMapper.getRetryDelay(mapped.code);

      expect(mapped).toBeDefined();
      expect(recovery).toBeDefined();
      expect(formatted).toBeDefined();
      expect(shouldRetry).toBe(true);
      expect(delay).toBeGreaterThan(0);
    });

    it('should handle WebSocket close code workflow', () => {
      const closeCode = 1006;
      const reason = 'Connection lost';

      const mapped = WebSocketErrorMapper.mapCloseCode(closeCode, reason);

      if (mapped) {
        const recovery = WebSocketErrorMapper.getRecoveryInstructions(mapped.code);
        const formatted = WebSocketErrorMapper.formatForUI(mapped);

        expect(recovery).toBeDefined();
        expect(formatted).toBeDefined();
      }
    });
  });
});
