import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fileOperationsService from '../fileOperationsService.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('FileOperationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with backend URL from environment', () => {
      const baseUrl = fileOperationsService.getApiBaseUrl();

      expect(baseUrl).toBeDefined();
      expect(typeof baseUrl).toBe('string');
    });

    it('should allow configuration updates', () => {
      const originalUrl = fileOperationsService.getApiBaseUrl();

      fileOperationsService.configure({ baseUrl: 'http://test-server:9000' });

      expect(fileOperationsService.getApiBaseUrl()).toBe('http://test-server:9000');

      // Restore original
      fileOperationsService.configure({ baseUrl: originalUrl });
    });

    it('should merge configuration options', () => {
      const originalUrl = fileOperationsService.getApiBaseUrl();

      fileOperationsService.configure({ customOption: 'test' });

      expect(fileOperationsService.getApiBaseUrl()).toBe(originalUrl);
      expect(fileOperationsService.config.customOption).toBe('test');

      // Restore original
      fileOperationsService.configure({ baseUrl: originalUrl });
      delete fileOperationsService.config.customOption;
    });
  });

  describe('Open File in IDE', () => {
    it('should open file in IDE successfully with default parameters', async () => {
      const mockResponse = {
        success: true,
        message: 'File opened successfully',
        ide_used: 'code',
        file_path: '/path/to/file.js',
        line_number: 1,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.openFileInIde('/path/to/file.js');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/open-file'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: '/path/to/file.js',
            line_number: 1,
            ide_preference: null,
          }),
        })
      );
    });

    it('should open file at specific line number', async () => {
      const mockResponse = {
        success: true,
        message: 'File opened successfully',
        ide_used: 'code',
        file_path: '/path/to/file.js',
        line_number: 42,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.openFileInIde('/path/to/file.js', 42);

      expect(result.line_number).toBe(42);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/open-file'),
        expect.objectContaining({
          body: JSON.stringify({
            file_path: '/path/to/file.js',
            line_number: 42,
            ide_preference: null,
          }),
        })
      );
    });

    it('should respect IDE preference', async () => {
      const mockResponse = {
        success: true,
        message: 'File opened successfully',
        ide_used: 'cursor',
        file_path: '/path/to/file.js',
        line_number: 1,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.openFileInIde(
        '/path/to/file.js',
        1,
        'cursor'
      );

      expect(result.ide_used).toBe('cursor');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/open-file'),
        expect.objectContaining({
          body: JSON.stringify({
            file_path: '/path/to/file.js',
            line_number: 1,
            ide_preference: 'cursor',
          }),
        })
      );
    });

    it('should handle 404 file not found error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'File does not exist' }),
      });

      await expect(
        fileOperationsService.openFileInIde('/nonexistent/file.js')
      ).rejects.toThrow('File or IDE not found: File does not exist');
    });

    it('should handle 404 without detail message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        fileOperationsService.openFileInIde('/nonexistent/file.js')
      ).rejects.toThrow('File or IDE not found: 404 Not Found');
    });

    it('should handle 504 timeout error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 504,
        json: async () => ({ detail: 'IDE command timed out after 5 seconds' }),
      });

      await expect(
        fileOperationsService.openFileInIde('/path/to/file.js')
      ).rejects.toThrow('IDE command timed out: IDE command timed out after 5 seconds');
    });

    it('should handle other HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal server error' }),
      });

      await expect(
        fileOperationsService.openFileInIde('/path/to/file.js')
      ).rejects.toThrow('Failed to open file in IDE: Internal server error');
    });

    it('should handle HTTP errors without detail message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        fileOperationsService.openFileInIde('/path/to/file.js')
      ).rejects.toThrow('Failed to open file in IDE: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        fileOperationsService.openFileInIde('/path/to/file.js')
      ).rejects.toThrow('Network error');
    });

    it('should log console messages', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockResponse = {
        success: true,
        ide_used: 'code',
        file_path: '/path/to/file.js',
        line_number: 1,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await fileOperationsService.openFileInIde('/path/to/file.js');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Opening file in IDE: /path/to/file.js:1')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully opened file in IDE: code')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Get IDE Status', () => {
    it('should get IDE status successfully', async () => {
      const mockStatus = {
        vscode_available: true,
        cursor_available: false,
        preferred_ide: 'code',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await fileOperationsService.getIdeStatus();

      expect(result).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/ide-status'));
    });

    it('should handle HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fileOperationsService.getIdeStatus())
        .rejects.toThrow('Failed to get IDE status: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fileOperationsService.getIdeStatus())
        .rejects.toThrow('Network error');
    });

    it('should return all IDE availability information', async () => {
      const mockStatus = {
        vscode_available: true,
        cursor_available: true,
        preferred_ide: 'cursor',
        vscode_path: '/usr/local/bin/code',
        cursor_path: '/usr/local/bin/cursor',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await fileOperationsService.getIdeStatus();

      expect(result.vscode_available).toBe(true);
      expect(result.cursor_available).toBe(true);
      expect(result.preferred_ide).toBe('cursor');
      expect(result.vscode_path).toBeDefined();
      expect(result.cursor_path).toBeDefined();
    });
  });

  describe('Validate File Path', () => {
    it('should validate existing file successfully', async () => {
      const mockResponse = {
        exists: true,
        is_file: true,
        is_readable: true,
        absolute_path: '/absolute/path/to/file.js',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.validateFilePath('/path/to/file.js');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/validate-file-path?file_path=' +
          encodeURIComponent('/path/to/file.js')),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should validate non-existent file', async () => {
      const mockResponse = {
        exists: false,
        is_file: false,
        is_readable: false,
        absolute_path: '/absolute/path/to/nonexistent.js',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.validateFilePath('/path/to/nonexistent.js');

      expect(result.exists).toBe(false);
      expect(result.is_file).toBe(false);
      expect(result.is_readable).toBe(false);
    });

    it('should validate directory (not a file)', async () => {
      const mockResponse = {
        exists: true,
        is_file: false,
        is_readable: true,
        absolute_path: '/absolute/path/to/directory',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.validateFilePath('/path/to/directory');

      expect(result.exists).toBe(true);
      expect(result.is_file).toBe(false);
    });

    it('should handle unreadable file', async () => {
      const mockResponse = {
        exists: true,
        is_file: true,
        is_readable: false,
        absolute_path: '/absolute/path/to/protected.js',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.validateFilePath('/path/to/protected.js');

      expect(result.exists).toBe(true);
      expect(result.is_file).toBe(true);
      expect(result.is_readable).toBe(false);
    });

    it('should handle HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        fileOperationsService.validateFilePath('/path/to/file.js')
      ).rejects.toThrow('Failed to validate file path: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        fileOperationsService.validateFilePath('/path/to/file.js')
      ).rejects.toThrow('Network error');
    });

    it('should properly encode file paths with special characters', async () => {
      const specialPath = '/path/to/file with spaces & special chars.js';
      const mockResponse = {
        exists: true,
        is_file: true,
        is_readable: true,
        absolute_path: specialPath,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await fileOperationsService.validateFilePath(specialPath);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/validate-file-path?file_path=' +
          encodeURIComponent(specialPath)),
        expect.any(Object)
      );
    });

    it('should return absolute path conversion', async () => {
      const mockResponse = {
        exists: true,
        is_file: true,
        is_readable: true,
        absolute_path: '/home/user/project/src/file.js',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.validateFilePath('./src/file.js');

      expect(result.absolute_path).toBe('/home/user/project/src/file.js');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file path', async () => {
      const mockResponse = {
        exists: false,
        is_file: false,
        is_readable: false,
        absolute_path: '',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.validateFilePath('');

      expect(result.exists).toBe(false);
    });

    it('should handle very long file paths', async () => {
      const longPath = '/path/' + 'a'.repeat(500) + '/file.js';
      const mockResponse = {
        exists: true,
        is_file: true,
        is_readable: true,
        absolute_path: longPath,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.validateFilePath(longPath);

      expect(result.absolute_path).toBe(longPath);
    });

    it('should handle unicode characters in file path', async () => {
      const unicodePath = '/path/to/文件.js';
      const mockResponse = {
        exists: true,
        is_file: true,
        is_readable: true,
        absolute_path: unicodePath,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fileOperationsService.validateFilePath(unicodePath);

      expect(result.absolute_path).toBe(unicodePath);
    });

    it('should handle concurrent operations', async () => {
      const mockResponse = {
        success: true,
        ide_used: 'code',
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const operations = [
        fileOperationsService.openFileInIde('/file1.js'),
        fileOperationsService.openFileInIde('/file2.js'),
        fileOperationsService.openFileInIde('/file3.js'),
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});
