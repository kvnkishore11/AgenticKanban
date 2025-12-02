/**
 * File Operations Service
 * Provides API integration for file-related operations like opening files in IDE
 */

class FileOperationsService {
  constructor() {
    // Use VITE_BACKEND_URL from environment (required)
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('VITE_BACKEND_URL environment variable is required');
    }
    this.config = {
      baseUrl: backendUrl
    };
  }

  /**
   * Configure API connection parameters
   */
  configure(options = {}) {
    this.config = { ...this.config, ...options };
  }

  /**
   * Get API base URL
   */
  getApiBaseUrl() {
    return this.config.baseUrl;
  }

  /**
   * Open a file in the user's IDE (VS Code or Cursor)
   * @param {string} filePath - Absolute path to the file
   * @param {number} lineNumber - Line number to navigate to (default: 1)
   * @param {string|null} idePreference - IDE to use ('code' or 'cursor', default: null for auto-detect)
   * @returns {Promise<Object>} Response with success status and message
   */
  async openFileInIde(filePath, lineNumber = 1, idePreference = null) {
    try {
      const url = `${this.getApiBaseUrl()}/api/open-file`;
      console.log(`Opening file in IDE: ${filePath}:${lineNumber}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          line_number: lineNumber,
          ide_preference: idePreference
        })
      });

      if (!response.ok) {
        // Try to extract error details from response
        let errorDetail = `${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorDetail = errorData.detail;
          }
        } catch {
          // Failed to parse error response, use default
        }

        if (response.status === 404) {
          throw new Error(`File or IDE not found: ${errorDetail}`);
        } else if (response.status === 504) {
          throw new Error(`IDE command timed out: ${errorDetail}`);
        } else {
          throw new Error(`Failed to open file in IDE: ${errorDetail}`);
        }
      }

      const data = await response.json();
      console.log(`Successfully opened file in IDE: ${data.ide_used}`);
      return data;
    } catch (error) {
      console.error(`Error opening file in IDE:`, error);
      throw error;
    }
  }

  /**
   * Get the status of available IDEs on the system
   * @returns {Promise<Object>} IDE availability status
   */
  async getIdeStatus() {
    try {
      const url = `${this.getApiBaseUrl()}/api/ide-status`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to get IDE status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting IDE status:', error);
      throw error;
    }
  }

  /**
   * Validate that a file path exists and is accessible
   * @param {string} filePath - Path to validate
   * @returns {Promise<Object>} Validation result with exists, is_file, is_readable, and absolute_path
   */
  async validateFilePath(filePath) {
    try {
      const url = `${this.getApiBaseUrl()}/api/validate-file-path?file_path=${encodeURIComponent(filePath)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to validate file path: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating file path:', error);
      throw error;
    }
  }

  /**
   * Open a native directory picker dialog and return the selected directory
   * @returns {Promise<Object>} Object with path and name properties, or { path: null, name: null } if cancelled
   * @throws {Error} If the directory picker fails to open or encounters an error
   */
  async selectDirectory() {
    try {
      const url = `${this.getApiBaseUrl()}/api/select-directory`;
      console.log('Opening native directory picker...');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        // Try to extract error details from response
        let errorDetail = `${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorDetail = errorData.detail;
          }
        } catch {
          // Failed to parse error response, use default
        }

        throw new Error(`Failed to open directory picker: ${errorDetail}`);
      }

      const data = await response.json();

      // User cancelled selection
      if (!data.path) {
        console.log('Directory selection cancelled by user');
        return { path: null, name: null };
      }

      console.log(`Directory selected: ${data.path} (name: ${data.name})`);
      return data;
    } catch (error) {
      console.error('Error selecting directory:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const fileOperationsService = new FileOperationsService();
export default fileOperationsService;
