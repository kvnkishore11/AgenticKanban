/**
 * @fileoverview Centralized logging utility for AgenticKanban frontend
 *
 * Provides consistent logging with levels (debug, info, warn, error), timestamps,
 * and environment-aware behavior. Debug logs are automatically disabled in
 * production builds. Supports structured logging for better log analysis.
 *
 * @module utils/logger
 */

/**
 * Log level enumeration
 * @enum {number}
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Current log level based on environment
 * Production: INFO and above
 * Development: DEBUG and above
 */
const CURRENT_LEVEL = import.meta.env.PROD ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

/**
 * Format timestamp for log messages
 * @returns {string} Formatted timestamp (HH:MM:SS.mmm)
 */
const getTimestamp = () => {
  const now = new Date();
  return now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0');
};

/**
 * Logger class for structured logging
 */
class Logger {
  /**
   * Create a logger instance
   * @param {string} context - Logger context (e.g., component name, module name)
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * Log debug message (only in development)
   * @param {string} message - Log message
   * @param {Object} [data={}] - Additional structured data
   */
  debug(message, data = {}) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(
        `%c[DEBUG]%c [${getTimestamp()}] [${this.context}]`,
        'color: #6B7280; font-weight: bold',
        'color: #6B7280',
        message,
        data
      );
    }
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} [data={}] - Additional structured data
   */
  info(message, data = {}) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(
        `%c[INFO]%c [${getTimestamp()}] [${this.context}]`,
        'color: #3B82F6; font-weight: bold',
        'color: #3B82F6',
        message,
        data
      );
    }
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} [data={}] - Additional structured data
   */
  warn(message, data = {}) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(
        `%c[WARN]%c [${getTimestamp()}] [${this.context}]`,
        'color: #F59E0B; font-weight: bold',
        'color: #F59E0B',
        message,
        data
      );
    }
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|null} [error=null] - Error object with stack trace
   * @param {Object} [data={}] - Additional structured data
   */
  error(message, error = null, data = {}) {
    console.error(
      `%c[ERROR]%c [${getTimestamp()}] [${this.context}]`,
      'color: #EF4444; font-weight: bold',
      'color: #EF4444',
      message,
      error,
      data
    );
  }

  /**
   * Log WebSocket event (special formatting)
   * @param {string} event - WebSocket event name
   * @param {Object} [data={}] - Event data
   */
  ws(event, data = {}) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(
        `%c[WS]%c [${getTimestamp()}] [${this.context}]`,
        'color: #8B5CF6; font-weight: bold',
        'color: #8B5CF6',
        event,
        data
      );
    }
  }

  /**
   * Log user action (important user interactions)
   * @param {string} action - Action description
   * @param {Object} [data={}] - Action data
   */
  action(action, data = {}) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(
        `%c[ACTION]%c [${getTimestamp()}] [${this.context}]`,
        'color: #10B981; font-weight: bold',
        'color: #10B981',
        action,
        data
      );
    }
  }

  /**
   * Create a child logger with nested context
   * @param {string} childContext - Child context name
   * @returns {Logger} New logger with nested context
   */
  child(childContext) {
    return new Logger(`${this.context}:${childContext}`);
  }
}

/**
 * Create a logger instance with specific context
 * @param {string} context - Logger context (e.g., component name, module name)
 * @returns {Logger} Logger instance
 *
 * @example
 * import { createLogger } from '../utils/logger';
 * const logger = createLogger('TaskInput');
 * logger.info('Task created', { taskId: task.id });
 */
export const createLogger = (context) => new Logger(context);

/**
 * Default logger for general application logging
 */
export default createLogger('App');
