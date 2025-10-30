/**
 * WebSocket Error Mapping Utility
 * Provides user-friendly error messages and recovery suggestions for WebSocket errors
 * Compliant with TAC-7 WebSocket Integration Guide requirements
 */

/**
 * Error categories for classification
 */
export const ERROR_CATEGORIES = {
  CONNECTION: 'connection',
  WORKFLOW: 'workflow',
  SYSTEM: 'system',
  AUTHENTICATION: 'authentication',
  VALIDATION: 'validation',
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  NETWORK: 'network'
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Recovery action types
 */
export const RECOVERY_ACTIONS = {
  RETRY: 'retry',
  RECONNECT: 'reconnect',
  REFRESH: 'refresh',
  CONTACT_SUPPORT: 'contact_support',
  CHECK_NETWORK: 'check_network',
  WAIT: 'wait',
  UPDATE_CONFIG: 'update_config'
};

/**
 * Error code mappings with user-friendly messages and recovery suggestions
 */
const ERROR_MAPPINGS = {
  // Connection Errors
  'connection_failed': {
    category: ERROR_CATEGORIES.CONNECTION,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Connection Failed',
    message: 'Unable to connect to the workflow service. Please check your connection and try again.',
    userMessage: 'We couldn\'t connect to the workflow service. This might be due to network issues or the service being temporarily unavailable.',
    suggestions: [
      'Check your internet connection',
      'Verify the workflow service is running',
      'Try refreshing the page'
    ],
    recoveryActions: [RECOVERY_ACTIONS.CHECK_NETWORK, RECOVERY_ACTIONS.RETRY, RECOVERY_ACTIONS.REFRESH],
    autoRetry: true,
    retryDelay: 3000
  },

  'connection_timeout': {
    category: ERROR_CATEGORIES.TIMEOUT,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Connection Timeout',
    message: 'Connection to the workflow service timed out. The service may be experiencing high load.',
    userMessage: 'The connection is taking longer than expected. The workflow service might be busy.',
    suggestions: [
      'Wait a moment and try again',
      'Check if other network services are slow',
      'Try again during off-peak hours'
    ],
    recoveryActions: [RECOVERY_ACTIONS.WAIT, RECOVERY_ACTIONS.RETRY],
    autoRetry: true,
    retryDelay: 5000
  },

  'connection_lost': {
    category: ERROR_CATEGORIES.CONNECTION,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Connection Lost',
    message: 'Lost connection to the workflow service. Attempting to reconnect automatically.',
    userMessage: 'The connection was lost, but we\'re trying to reconnect automatically.',
    suggestions: [
      'Please wait while we reconnect',
      'Check your network connection if reconnection fails',
      'Your work is saved and will continue when reconnected'
    ],
    recoveryActions: [RECOVERY_ACTIONS.RECONNECT],
    autoRetry: true,
    retryDelay: 2000
  },

  'max_reconnect_attempts': {
    category: ERROR_CATEGORIES.CONNECTION,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Cannot Reconnect',
    message: 'Failed to reconnect after multiple attempts. Manual intervention required.',
    userMessage: 'We\'ve tried several times but can\'t reconnect to the workflow service.',
    suggestions: [
      'Check your internet connection',
      'Refresh the page to restart the connection',
      'Contact support if the problem persists'
    ],
    recoveryActions: [RECOVERY_ACTIONS.CHECK_NETWORK, RECOVERY_ACTIONS.REFRESH, RECOVERY_ACTIONS.CONTACT_SUPPORT],
    autoRetry: false
  },

  // Workflow Errors
  'workflow_not_found': {
    category: ERROR_CATEGORIES.WORKFLOW,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Workflow Not Found',
    message: 'The requested workflow type is not available or has been removed.',
    userMessage: 'The workflow you\'re trying to use isn\'t available right now.',
    suggestions: [
      'Try a different workflow type',
      'Check if the workflow service has been updated',
      'Contact support for help with workflow availability'
    ],
    recoveryActions: [RECOVERY_ACTIONS.RETRY, RECOVERY_ACTIONS.CONTACT_SUPPORT],
    autoRetry: false
  },

  'workflow_failed': {
    category: ERROR_CATEGORIES.WORKFLOW,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Workflow Execution Failed',
    message: 'The workflow encountered an error during execution and could not complete.',
    userMessage: 'Something went wrong while running your workflow.',
    suggestions: [
      'Review the task requirements and try again',
      'Check the workflow logs for more details',
      'Try a simpler workflow if the issue persists'
    ],
    recoveryActions: [RECOVERY_ACTIONS.RETRY, RECOVERY_ACTIONS.CONTACT_SUPPORT],
    autoRetry: false
  },

  'workflow_timeout': {
    category: ERROR_CATEGORIES.TIMEOUT,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Workflow Timeout',
    message: 'The workflow took too long to complete and was terminated.',
    userMessage: 'Your workflow is taking longer than expected and was stopped.',
    suggestions: [
      'Try breaking down complex tasks into smaller pieces',
      'Use a simpler workflow type for quicker results',
      'Try again during off-peak hours'
    ],
    recoveryActions: [RECOVERY_ACTIONS.RETRY],
    autoRetry: false
  },

  'workflow_queue_full': {
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Workflow Queue Full',
    message: 'The workflow queue is currently full. Please try again later.',
    userMessage: 'The workflow service is busy right now. Please wait a moment.',
    suggestions: [
      'Wait a few minutes and try again',
      'Try during off-peak hours for faster processing',
      'Consider breaking large tasks into smaller ones'
    ],
    recoveryActions: [RECOVERY_ACTIONS.WAIT, RECOVERY_ACTIONS.RETRY],
    autoRetry: true,
    retryDelay: 30000
  },

  // System Errors
  'server_error': {
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Server Error',
    message: 'The workflow service encountered an internal error.',
    userMessage: 'There\'s a problem with the workflow service right now.',
    suggestions: [
      'Try again in a few minutes',
      'Contact support if the problem continues',
      'Check the service status page for updates'
    ],
    recoveryActions: [RECOVERY_ACTIONS.WAIT, RECOVERY_ACTIONS.RETRY, RECOVERY_ACTIONS.CONTACT_SUPPORT],
    autoRetry: true,
    retryDelay: 10000
  },

  'service_unavailable': {
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITY.CRITICAL,
    title: 'Service Unavailable',
    message: 'The workflow service is currently unavailable for maintenance or due to high load.',
    userMessage: 'The workflow service is temporarily unavailable.',
    suggestions: [
      'Check back in a few minutes',
      'Monitor the service status page for updates',
      'Contact support for maintenance schedules'
    ],
    recoveryActions: [RECOVERY_ACTIONS.WAIT, RECOVERY_ACTIONS.CONTACT_SUPPORT],
    autoRetry: true,
    retryDelay: 60000
  },

  // Authentication Errors
  'auth_required': {
    category: ERROR_CATEGORIES.AUTHENTICATION,
    severity: ERROR_SEVERITY.HIGH,
    title: 'Authentication Required',
    message: 'You need to authenticate before using workflow services.',
    userMessage: 'Please log in to use the workflow features.',
    suggestions: [
      'Log in with your credentials',
      'Check if your session has expired',
      'Contact support if you can\'t access your account'
    ],
    recoveryActions: [RECOVERY_ACTIONS.REFRESH, RECOVERY_ACTIONS.CONTACT_SUPPORT],
    autoRetry: false
  },

  'auth_expired': {
    category: ERROR_CATEGORIES.AUTHENTICATION,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Session Expired',
    message: 'Your authentication session has expired. Please log in again.',
    userMessage: 'Your session has expired. Please log in again.',
    suggestions: [
      'Log in again to continue',
      'Enable "Remember Me" to stay logged in longer'
    ],
    recoveryActions: [RECOVERY_ACTIONS.REFRESH],
    autoRetry: false
  },

  // Validation Errors
  'invalid_request': {
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITY.LOW,
    title: 'Invalid Request',
    message: 'The request contains invalid data or is missing required information.',
    userMessage: 'There\'s an issue with the information provided.',
    suggestions: [
      'Check that all required fields are filled',
      'Verify the data format is correct',
      'Try refreshing the page'
    ],
    recoveryActions: [RECOVERY_ACTIONS.RETRY, RECOVERY_ACTIONS.REFRESH],
    autoRetry: false
  },

  'invalid_workflow_type': {
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Invalid Workflow Type',
    message: 'The specified workflow type is not supported or valid.',
    userMessage: 'The workflow type you selected isn\'t supported.',
    suggestions: [
      'Choose a different workflow type',
      'Check for updated workflow options',
      'Contact support for workflow recommendations'
    ],
    recoveryActions: [RECOVERY_ACTIONS.RETRY, RECOVERY_ACTIONS.CONTACT_SUPPORT],
    autoRetry: false
  },

  // Rate Limiting Errors
  'rate_limit_exceeded': {
    category: ERROR_CATEGORIES.RATE_LIMIT,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Rate Limit Exceeded',
    message: 'Too many requests have been made. Please slow down and try again.',
    userMessage: 'You\'re making requests too quickly. Please wait a moment.',
    suggestions: [
      'Wait a few seconds before trying again',
      'Avoid clicking buttons multiple times',
      'Consider batching multiple tasks together'
    ],
    recoveryActions: [RECOVERY_ACTIONS.WAIT, RECOVERY_ACTIONS.RETRY],
    autoRetry: true,
    retryDelay: 15000
  },

  // Network Errors
  'network_error': {
    category: ERROR_CATEGORIES.NETWORK,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Network Error',
    message: 'A network error occurred while communicating with the workflow service.',
    userMessage: 'There\'s a network problem preventing communication with the service.',
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Switch to a different network if available'
    ],
    recoveryActions: [RECOVERY_ACTIONS.CHECK_NETWORK, RECOVERY_ACTIONS.RETRY, RECOVERY_ACTIONS.REFRESH],
    autoRetry: true,
    retryDelay: 5000
  },

  // Generic/Unknown Errors
  'unknown_error': {
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    userMessage: 'Something unexpected happened. We\'re not sure what went wrong.',
    suggestions: [
      'Try the action again',
      'Refresh the page if the problem continues',
      'Contact support with details about what you were doing'
    ],
    recoveryActions: [RECOVERY_ACTIONS.RETRY, RECOVERY_ACTIONS.REFRESH, RECOVERY_ACTIONS.CONTACT_SUPPORT],
    autoRetry: true,
    retryDelay: 3000
  }
};

/**
 * WebSocket close code mappings
 */
const CLOSE_CODE_MAPPINGS = {
  1000: { // Normal closure
    code: 'normal_closure',
    mapping: null // No error mapping needed for normal closure
  },
  1001: { // Going away
    code: 'connection_lost',
    mapping: ERROR_MAPPINGS.connection_lost
  },
  1002: { // Protocol error
    code: 'protocol_error',
    mapping: {
      category: ERROR_CATEGORIES.SYSTEM,
      severity: ERROR_SEVERITY.HIGH,
      title: 'Protocol Error',
      message: 'A protocol error occurred with the WebSocket connection.',
      userMessage: 'There\'s a technical issue with the connection.',
      suggestions: [
        'Refresh the page to restart the connection',
        'Contact support if the problem persists'
      ],
      recoveryActions: [RECOVERY_ACTIONS.REFRESH, RECOVERY_ACTIONS.CONTACT_SUPPORT],
      autoRetry: false
    }
  },
  1003: { // Unsupported data
    code: 'unsupported_data',
    mapping: {
      category: ERROR_CATEGORIES.VALIDATION,
      severity: ERROR_SEVERITY.MEDIUM,
      title: 'Data Format Error',
      message: 'The data format is not supported by the server.',
      userMessage: 'There\'s an issue with the data format.',
      suggestions: [
        'Try refreshing the page',
        'Contact support if this happens repeatedly'
      ],
      recoveryActions: [RECOVERY_ACTIONS.REFRESH, RECOVERY_ACTIONS.CONTACT_SUPPORT],
      autoRetry: false
    }
  },
  1006: { // Abnormal closure
    code: 'abnormal_closure',
    mapping: ERROR_MAPPINGS.connection_lost
  },
  1011: { // Server error
    code: 'server_error',
    mapping: ERROR_MAPPINGS.server_error
  },
  1012: { // Service restart
    code: 'service_restart',
    mapping: {
      category: ERROR_CATEGORIES.SYSTEM,
      severity: ERROR_SEVERITY.MEDIUM,
      title: 'Service Restarting',
      message: 'The workflow service is restarting. Connection will be restored automatically.',
      userMessage: 'The service is restarting. We\'ll reconnect automatically.',
      suggestions: [
        'Please wait while the service restarts',
        'Your work will continue once reconnected'
      ],
      recoveryActions: [RECOVERY_ACTIONS.WAIT, RECOVERY_ACTIONS.RECONNECT],
      autoRetry: true,
      retryDelay: 10000
    }
  },
  1013: { // Try again later
    code: 'try_again_later',
    mapping: ERROR_MAPPINGS.service_unavailable
  }
};

/**
 * Error mapping utility class
 */
export class WebSocketErrorMapper {
  /**
   * Map an error to user-friendly format
   * @param {string|Error|Object} error - Error code, Error object, or error data
   * @param {Object} context - Additional context about the error
   * @returns {Object} Mapped error with user-friendly information
   */
  static mapError(error, context = {}) {
    let errorCode = null;
    let errorData = {};

    // Handle different error input types
    if (typeof error === 'string') {
      errorCode = error;
    } else if (error instanceof Error) {
      errorCode = error.code || error.name || 'unknown_error';
      errorData = {
        originalMessage: error.message,
        stack: error.stack
      };
    } else if (error && typeof error === 'object') {
      errorCode = error.code || error.type || 'unknown_error';
      errorData = { ...error };
    } else {
      errorCode = 'unknown_error';
    }

    // Get the error mapping
    const mapping = ERROR_MAPPINGS[errorCode] || ERROR_MAPPINGS.unknown_error;

    // Create enhanced error object
    return {
      code: errorCode,
      category: mapping.category,
      severity: mapping.severity,
      title: mapping.title,
      message: mapping.message,
      userMessage: mapping.userMessage,
      suggestions: mapping.suggestions,
      recoveryActions: mapping.recoveryActions,
      autoRetry: mapping.autoRetry || false,
      retryDelay: mapping.retryDelay || 3000,
      timestamp: new Date().toISOString(),
      context: context,
      originalError: errorData
    };
  }

  /**
   * Map WebSocket close codes to user-friendly errors
   * @param {number} closeCode - WebSocket close code
   * @param {string} reason - Close reason string
   * @returns {Object|null} Mapped error or null for normal closure
   */
  static mapCloseCode(closeCode, reason = '') {
    const closeMapping = CLOSE_CODE_MAPPINGS[closeCode];

    if (!closeMapping) {
      // Unknown close code
      return this.mapError('unknown_error', {
        closeCode,
        reason,
        type: 'websocket_close'
      });
    }

    if (!closeMapping.mapping) {
      // Normal closure, no error
      return null;
    }

    // Return mapped error with close code context
    return {
      ...closeMapping.mapping,
      code: closeMapping.code,
      timestamp: new Date().toISOString(),
      context: {
        closeCode,
        reason,
        type: 'websocket_close'
      }
    };
  }

  /**
   * Get recovery instructions for an error
   * @param {string} errorCode - Error code
   * @returns {Object} Recovery instructions
   */
  static getRecoveryInstructions(errorCode) {
    const mapping = ERROR_MAPPINGS[errorCode];
    if (!mapping) {
      return {
        canRecover: false,
        instructions: ['Contact support for assistance'],
        estimatedTime: null
      };
    }

    const instructions = [];
    const actions = mapping.recoveryActions || [];

    // Generate step-by-step instructions based on recovery actions
    actions.forEach(action => {
      switch (action) {
        case RECOVERY_ACTIONS.RETRY:
          instructions.push('Click the retry button or try the action again');
          break;
        case RECOVERY_ACTIONS.RECONNECT:
          instructions.push('Wait for automatic reconnection or refresh the page');
          break;
        case RECOVERY_ACTIONS.REFRESH:
          instructions.push('Refresh the page (Ctrl+R or Cmd+R)');
          break;
        case RECOVERY_ACTIONS.CHECK_NETWORK:
          instructions.push('Check your internet connection and network settings');
          break;
        case RECOVERY_ACTIONS.WAIT:
          instructions.push(`Wait ${mapping.retryDelay ? Math.round(mapping.retryDelay / 1000) : 5} seconds and try again`);
          break;
        case RECOVERY_ACTIONS.CONTACT_SUPPORT:
          instructions.push('Contact support if the problem continues');
          break;
        case RECOVERY_ACTIONS.UPDATE_CONFIG:
          instructions.push('Update your configuration settings');
          break;
      }
    });

    return {
      canRecover: mapping.autoRetry || actions.length > 0,
      instructions,
      estimatedTime: mapping.retryDelay || null,
      autoRetry: mapping.autoRetry || false
    };
  }

  /**
   * Check if an error should trigger automatic retry
   * @param {string} errorCode - Error code
   * @returns {boolean} Whether to auto-retry
   */
  static shouldAutoRetry(errorCode) {
    const mapping = ERROR_MAPPINGS[errorCode];
    return mapping ? mapping.autoRetry === true : false;
  }

  /**
   * Get retry delay for an error
   * @param {string} errorCode - Error code
   * @returns {number} Retry delay in milliseconds
   */
  static getRetryDelay(errorCode) {
    const mapping = ERROR_MAPPINGS[errorCode];
    return mapping ? mapping.retryDelay || 3000 : 3000;
  }

  /**
   * Format error for display in UI components
   * @param {Object} mappedError - Error object from mapError()
   * @returns {Object} UI-formatted error
   */
  static formatForUI(mappedError) {
    return {
      title: mappedError.title,
      message: mappedError.userMessage,
      severity: mappedError.severity,
      suggestions: mappedError.suggestions,
      canRetry: mappedError.autoRetry || mappedError.recoveryActions.includes(RECOVERY_ACTIONS.RETRY),
      retryLabel: mappedError.autoRetry ? 'Retrying automatically...' : 'Try Again',
      showDetails: mappedError.severity === ERROR_SEVERITY.CRITICAL,
      timestamp: mappedError.timestamp
    };
  }

  /**
   * Get all available error codes
   * @returns {Array} Array of all error codes
   */
  static getAllErrorCodes() {
    return Object.keys(ERROR_MAPPINGS);
  }

  /**
   * Get errors by category
   * @param {string} category - Error category
   * @returns {Array} Array of error codes in the category
   */
  static getErrorsByCategory(category) {
    return Object.entries(ERROR_MAPPINGS)
      .filter(([, mapping]) => mapping.category === category)
      .map(([code]) => code);
  }

  /**
   * Get errors by severity
   * @param {string} severity - Error severity
   * @returns {Array} Array of error codes with the severity
   */
  static getErrorsBySeverity(severity) {
    return Object.entries(ERROR_MAPPINGS)
      .filter(([, mapping]) => mapping.severity === severity)
      .map(([code]) => code);
  }
}

export default WebSocketErrorMapper;