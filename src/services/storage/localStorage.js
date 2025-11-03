/**
 * @fileoverview Local Storage Service - Persistent data storage for AgenticKanban
 * Provides a centralized interface for managing application data in localStorage
 * with error handling, data validation, and storage management utilities
 */

/**
 * LocalStorageService manages persistent storage for the AgenticKanban application
 * @class
 */
class LocalStorageService {
  constructor() {
    this.prefix = 'agentic-kanban-';
    this.version = '1.0.0';
  }

  // Set an item in localStorage with error handling
  setItem(key, value) {
    try {
      const prefixedKey = this.prefix + key;
      const serializedValue = JSON.stringify({
        data: value,
        version: this.version,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(prefixedKey, serializedValue);
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  // Get an item from localStorage with error handling
  getItem(key, defaultValue = null) {
    try {
      const prefixedKey = this.prefix + key;
      const item = localStorage.getItem(prefixedKey);

      if (!item) {
        return defaultValue;
      }

      const parsed = JSON.parse(item);

      // Check version compatibility
      if (parsed.version !== this.version) {
        console.warn(`Version mismatch for ${key}. Expected ${this.version}, got ${parsed.version}`);
        // Could implement migration logic here
        return defaultValue;
      }

      return parsed.data;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  // Remove an item from localStorage
  removeItem(key) {
    try {
      const prefixedKey = this.prefix + key;
      localStorage.removeItem(prefixedKey);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  }

  // Clear all app-specific items from localStorage
  // @param {boolean} preserveWorkflowState - If true, preserves workflow-related data
  clear(preserveWorkflowState = false) {
    try {
      console.log('[RELOAD TRACKER] localStorage.clear() called - stack trace:', new Error().stack);
      console.log(`[RELOAD TRACKER] preserveWorkflowState: ${preserveWorkflowState}`);

      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          // If preserving workflow state, skip workflow-related keys
          if (preserveWorkflowState) {
            const storageValue = localStorage.getItem(key);
            try {
              const parsed = JSON.parse(storageValue);
              // Check if this contains workflow state
              const hasWorkflowData = parsed?.state?.taskWorkflowProgress ||
                                     parsed?.state?.taskWorkflowMetadata ||
                                     parsed?.state?.taskWorkflowLogs;

              if (!hasWorkflowData) {
                keysToRemove.push(key);
              } else {
                console.log(`[RELOAD TRACKER] Preserving workflow data in key: ${key}`);
              }
            } catch {
              // If not JSON or doesn't have workflow data, safe to remove
              keysToRemove.push(key);
            }
          } else {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[RELOAD TRACKER] Cleared ${keysToRemove.length} localStorage keys`);
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  }

  // Check if localStorage is available
  isAvailable() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Get storage usage information
  getStorageInfo() {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      let totalSize = 0;
      let appSize = 0;
      let appKeys = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const itemSize = (key.length + value.length) * 2; // Rough byte estimate

        totalSize += itemSize;

        if (key.startsWith(this.prefix)) {
          appSize += itemSize;
          appKeys++;
        }
      }

      return {
        totalKeys: localStorage.length,
        appKeys,
        totalSize,
        appSize,
        available: this.isAvailable(),
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }

  // Export all app data
  exportData() {
    try {
      const data = {};

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          const unprefixedKey = key.substring(this.prefix.length);
          data[unprefixedKey] = JSON.parse(value);
        }
      }

      return {
        data,
        exportedAt: new Date().toISOString(),
        version: this.version,
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  // Import app data (with confirmation)
  importData(importedData) {
    try {
      if (!importedData || !importedData.data) {
        throw new Error('Invalid import data format');
      }

      // Clear existing data
      this.clear();

      // Import new data
      Object.entries(importedData.data).forEach(([key, value]) => {
        this.setItem(key, value.data);
      });

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Migrate data from an older version
  migrateData(fromVersion, toVersion) {
    // Placeholder for future migration logic
    console.log(`Migration from ${fromVersion} to ${toVersion} not implemented`);
    return false;
  }
}

// Create and export a singleton instance
const localStorageService = new LocalStorageService();
export default localStorageService;