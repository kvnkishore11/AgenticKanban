/**
 * Log Buffer Service
 *
 * Implements a circular buffer for managing real-time log entries with efficient
 * insertion, filtering, and memory management. Designed to handle high-frequency
 * log streams while maintaining optimal performance.
 */

class LogBuffer {
  constructor(maxSize = 1000) {
    this.maxSize = Math.min(Math.max(maxSize, 100), 10000); // Clamp between 100-10000
    this.buffer = [];
    this.logCount = 0; // Total logs received (including evicted ones)
    this.evictedCount = 0; // Number of logs evicted due to overflow
  }

  /**
   * Append a log entry to the buffer
   * @param {Object} logEntry - The log entry to append
   * @returns {Object} The appended log entry with added metadata
   */
  append(logEntry) {
    const timestamp = logEntry.timestamp || new Date().toISOString();
    const entry = {
      ...logEntry,
      id: logEntry.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      bufferIndex: this.logCount,
    };

    this.buffer.push(entry);
    this.logCount++;

    // Evict oldest entries if buffer exceeds max size
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
      this.evictedCount++;
    }

    return entry;
  }

  /**
   * Append multiple log entries
   * @param {Array} logEntries - Array of log entries to append
   * @returns {Array} Array of appended log entries
   */
  appendBatch(logEntries) {
    return logEntries.map(entry => this.append(entry));
  }

  /**
   * Get all logs in the buffer
   * @returns {Array} All log entries
   */
  getAll() {
    return [...this.buffer];
  }

  /**
   * Get logs filtered by level
   * @param {string|Array<string>} levels - Log level(s) to filter by
   * @returns {Array} Filtered log entries
   */
  getByLevel(levels) {
    const levelArray = Array.isArray(levels) ? levels : [levels];
    return this.buffer.filter(entry =>
      entry.level && levelArray.includes(entry.level.toUpperCase())
    );
  }

  /**
   * Search logs by text query
   * @param {string} query - Search query string
   * @param {Object} options - Search options
   * @param {boolean} options.caseSensitive - Whether search is case-sensitive
   * @param {Array<string>} options.fields - Fields to search in (default: ['message'])
   * @returns {Array} Matching log entries
   */
  search(query, options = {}) {
    if (!query || query.trim() === '') {
      return this.getAll();
    }

    const { caseSensitive = false, fields = ['message'] } = options;
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    return this.buffer.filter(entry => {
      return fields.some(field => {
        const value = entry[field];
        if (!value) return false;

        const searchValue = caseSensitive ? String(value) : String(value).toLowerCase();
        return searchValue.includes(searchQuery);
      });
    });
  }

  /**
   * Filter logs by timestamp range
   * @param {Date|string} startTime - Start of time range
   * @param {Date|string} endTime - End of time range
   * @returns {Array} Filtered log entries
   */
  getByTimeRange(startTime, endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    return this.buffer.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime >= start && entryTime <= end;
    });
  }

  /**
   * Get the most recent N logs
   * @param {number} count - Number of recent logs to retrieve
   * @returns {Array} Recent log entries
   */
  getRecent(count) {
    return this.buffer.slice(-count);
  }

  /**
   * Clear all logs from buffer
   */
  clear() {
    this.buffer = [];
    this.logCount = 0;
    this.evictedCount = 0;
  }

  /**
   * Get buffer statistics
   * @returns {Object} Buffer statistics
   */
  getStats() {
    return {
      currentSize: this.buffer.length,
      maxSize: this.maxSize,
      totalReceived: this.logCount,
      evictedCount: this.evictedCount,
      utilizationPercent: (this.buffer.length / this.maxSize) * 100,
      oldestTimestamp: this.buffer.length > 0 ? this.buffer[0].timestamp : null,
      newestTimestamp: this.buffer.length > 0 ? this.buffer[this.buffer.length - 1].timestamp : null,
    };
  }

  /**
   * Update max buffer size
   * @param {number} newSize - New maximum buffer size
   */
  setMaxSize(newSize) {
    const validSize = Math.min(Math.max(newSize, 100), 10000);
    this.maxSize = validSize;

    // Trim buffer if new size is smaller than current buffer
    while (this.buffer.length > this.maxSize) {
      this.buffer.shift();
      this.evictedCount++;
    }
  }

  /**
   * Check if buffer is full
   * @returns {boolean} True if buffer is at max capacity
   */
  isFull() {
    return this.buffer.length >= this.maxSize;
  }

  /**
   * Get memory usage estimate (in bytes)
   * @returns {number} Approximate memory usage in bytes
   */
  getMemoryUsage() {
    // Rough estimate: average log entry size
    const avgEntrySize = 500; // bytes (estimated)
    return this.buffer.length * avgEntrySize;
  }
}

/**
 * Log Buffer Manager
 *
 * Manages multiple log buffers (one per task/ADW ID)
 */
class LogBufferManager {
  constructor(defaultMaxSize = 1000) {
    this.buffers = new Map(); // Map of taskId/adwId -> LogBuffer
    this.defaultMaxSize = defaultMaxSize;
  }

  /**
   * Get or create a buffer for a task
   * @param {string|number} taskId - Task/ADW identifier
   * @returns {LogBuffer} Log buffer for the task
   */
  getBuffer(taskId) {
    if (!this.buffers.has(taskId)) {
      this.buffers.set(taskId, new LogBuffer(this.defaultMaxSize));
    }
    return this.buffers.get(taskId);
  }

  /**
   * Append log to a task's buffer
   * @param {string|number} taskId - Task identifier
   * @param {Object} logEntry - Log entry to append
   * @returns {Object} Appended log entry
   */
  append(taskId, logEntry) {
    const buffer = this.getBuffer(taskId);
    return buffer.append(logEntry);
  }

  /**
   * Get all logs for a task
   * @param {string|number} taskId - Task identifier
   * @returns {Array} All logs for the task
   */
  getAll(taskId) {
    const buffer = this.getBuffer(taskId);
    return buffer.getAll();
  }

  /**
   * Clear logs for a task
   * @param {string|number} taskId - Task identifier
   */
  clear(taskId) {
    const buffer = this.getBuffer(taskId);
    buffer.clear();
  }

  /**
   * Remove a task's buffer entirely
   * @param {string|number} taskId - Task identifier
   */
  remove(taskId) {
    this.buffers.delete(taskId);
  }

  /**
   * Get statistics for all buffers
   * @returns {Object} Aggregated statistics
   */
  getGlobalStats() {
    const stats = {
      bufferCount: this.buffers.size,
      totalLogs: 0,
      totalMemoryUsage: 0,
      buffers: {},
    };

    this.buffers.forEach((buffer, taskId) => {
      const bufferStats = buffer.getStats();
      stats.totalLogs += bufferStats.currentSize;
      stats.totalMemoryUsage += buffer.getMemoryUsage();
      stats.buffers[taskId] = bufferStats;
    });

    return stats;
  }

  /**
   * Clear all buffers
   */
  clearAll() {
    this.buffers.forEach(buffer => buffer.clear());
  }

  /**
   * Set default max size for all new buffers
   * @param {number} newSize - New default max size
   */
  setDefaultMaxSize(newSize) {
    this.defaultMaxSize = Math.min(Math.max(newSize, 100), 10000);
  }
}

// Export singleton instance and classes
const logBufferManager = new LogBufferManager();

export { LogBuffer, LogBufferManager, logBufferManager };
export default logBufferManager;
