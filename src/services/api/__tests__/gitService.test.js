import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import gitService from '../gitService.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('GitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Environment Detection', () => {
    it('should detect browser environment', () => {
      expect(gitService.isNode).toBe(false);
    });
  });

  describe('Commit Command Changes', () => {
    it('should commit changes with custom message', async () => {
      const mockResponse = {
        success: true,
        message: 'Changes committed successfully',
        commitMessage: 'Custom commit message',
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gitService.commitCommandChanges(
        '/path/to/file.md',
        'Custom commit message'
      );

      expect(result.success).toBe(true);
      expect(result.commitMessage).toBe('Custom commit message');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/git/commit',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should commit changes with default message', async () => {
      const mockCommitMessage = `Update file.md command configuration

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

      const mockResponse = {
        success: true,
        message: 'Changes committed successfully',
        commitMessage: mockCommitMessage,
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gitService.commitCommandChanges('/path/to/file.md');

      expect(result.success).toBe(true);
      expect(result.commitMessage).toContain('Update file.md command configuration');
      expect(result.commitMessage).toContain('Claude Code');
      expect(result.commitMessage).toContain('Co-Authored-By: Claude');
    });

    it('should handle commit failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await gitService.commitCommandChanges('/path/to/file.md');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.isMock).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await gitService.commitCommandChanges('/path/to/file.md');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.isMock).toBe(true);
    });
  });

  describe('Get File Status', () => {
    it('should get file status successfully', async () => {
      const mockStatus = {
        status: 'modified',
        staged: false,
        modified: true,
        statusCode: ' M',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await gitService.getFileStatus('/path/to/file.md');

      expect(result).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/git/status?file=' + encodeURIComponent('/path/to/file.md')
      );
    });

    it('should handle HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await gitService.getFileStatus('/path/to/file.md');

      expect(result.status).toBe('unknown');
      expect(result.isMock).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await gitService.getFileStatus('/path/to/file.md');

      expect(result.status).toBe('unknown');
      expect(result.isMock).toBe(true);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Parse Git Status', () => {
    it('should parse untracked status', () => {
      const result = gitService.parseGitStatus('??');

      expect(result.status).toBe('untracked');
      expect(result.staged).toBe(false); // '?' is excluded from staged in parseGitStatus logic
      expect(result.modified).toBe(true); // Second char is '?' not ' ', so modified is true
    });

    it('should parse added status', () => {
      const result = gitService.parseGitStatus('A ');

      expect(result.status).toBe('added');
      expect(result.staged).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should parse modified and staged status', () => {
      const result = gitService.parseGitStatus('M ');

      expect(result.status).toBe('modified');
      expect(result.staged).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should parse modified unstaged status', () => {
      const result = gitService.parseGitStatus(' M');

      expect(result.status).toBe('modified');
      expect(result.staged).toBe(false);
      expect(result.modified).toBe(true);
    });

    it('should parse deleted status', () => {
      const result = gitService.parseGitStatus('D ');

      expect(result.status).toBe('deleted');
      expect(result.staged).toBe(true);
    });

    it('should parse renamed status', () => {
      const result = gitService.parseGitStatus('R ');

      expect(result.status).toBe('renamed');
      expect(result.staged).toBe(true);
    });

    it('should parse unmodified status', () => {
      const result = gitService.parseGitStatus('  ');

      expect(result.status).toBe('unmodified');
      expect(result.staged).toBe(false);
      expect(result.modified).toBe(false);
    });
  });

  describe('Get Repository Info', () => {
    it('should get repository info successfully', async () => {
      const mockInfo = {
        branch: 'main',
        remote: 'git@github.com:user/repo.git',
        isGitRepo: true,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInfo,
      });

      const result = await gitService.getRepoInfo();

      expect(result).toEqual(mockInfo);
      expect(global.fetch).toHaveBeenCalledWith('/api/git/info');
    });

    it('should handle HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await gitService.getRepoInfo();

      expect(result.isMock).toBe(true);
      expect(result.branch).toBe('main');
      expect(result.remote).toBe('origin');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await gitService.getRepoInfo();

      expect(result.isMock).toBe(true);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Create Backup', () => {
    it('should create backup successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await gitService.createBackup('/path/to/file.md');

      expect(result.success).toBe(true);
      expect(result.backupPath).toContain('file.md.backup-');
      expect(result.timestamp).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/files/backup',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle backup failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await gitService.createBackup('/path/to/file.md');

      expect(result.success).toBe(false);
      expect(result.isMock).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await gitService.createBackup('/path/to/file.md');

      expect(result.success).toBe(false);
      expect(result.isMock).toBe(true);
      expect(result.error).toBe('Network error');
    });

    it('should generate timestamped backup path', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await gitService.createBackup('/path/to/file.md');

      expect(result.backupPath).toMatch(/file\.md\.backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });
  });

  describe('Validate Commit Message', () => {
    it('should validate valid commit message', () => {
      const result = gitService.validateCommitMessage('Add new feature');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null commit message', () => {
      const result = gitService.validateCommitMessage(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Commit message must be a non-empty string');
    });

    it('should reject undefined commit message', () => {
      const result = gitService.validateCommitMessage(undefined);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Commit message must be a non-empty string');
    });

    it('should reject non-string commit message', () => {
      const result = gitService.validateCommitMessage(123);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Commit message must be a non-empty string');
    });

    it('should reject empty commit message', () => {
      const result = gitService.validateCommitMessage('');

      expect(result.isValid).toBe(false);
      // Empty string is falsy, so it triggers the first error
      expect(result.errors).toContain('Commit message must be a non-empty string');
    });

    it('should reject whitespace-only commit message', () => {
      const result = gitService.validateCommitMessage('   ');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Commit message cannot be empty');
    });

    it('should warn about very long first line', () => {
      const longMessage = 'a'.repeat(100);
      const result = gitService.validateCommitMessage(longMessage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('First line of commit message should be 72 characters or less');
    });

    it('should accept exactly 72 characters', () => {
      const message = 'a'.repeat(72);
      const result = gitService.validateCommitMessage(message);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept message with multiple lines', () => {
      const message = 'Short title\n\nLonger description that explains the change in detail.';
      const result = gitService.validateCommitMessage(message);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Generate Commit Message', () => {
    it('should generate update commit message', () => {
      const message = gitService.generateCommitMessage('test-command', 'update');

      expect(message).toContain('Update test-command command configuration');
      expect(message).toContain('Claude Code');
      expect(message).toContain('Co-Authored-By: Claude');
    });

    it('should generate create commit message', () => {
      const message = gitService.generateCommitMessage('test-command', 'create');

      expect(message).toContain('Add test-command command');
      expect(message).toContain('Claude Code');
    });

    it('should generate delete commit message', () => {
      const message = gitService.generateCommitMessage('test-command', 'delete');

      expect(message).toContain('Remove test-command command');
      expect(message).toContain('Claude Code');
    });

    it('should generate fix commit message', () => {
      const message = gitService.generateCommitMessage('test-command', 'fix');

      expect(message).toContain('Fix test-command command issues');
      expect(message).toContain('Claude Code');
    });

    it('should default to update for unknown change type', () => {
      const message = gitService.generateCommitMessage('test-command', 'unknown');

      expect(message).toContain('Update test-command command configuration');
    });

    it('should use update when change type is not provided', () => {
      const message = gitService.generateCommitMessage('test-command');

      expect(message).toContain('Update test-command command configuration');
    });

    it('should always include Claude Code signature', () => {
      const updateMsg = gitService.generateCommitMessage('test', 'update');
      const createMsg = gitService.generateCommitMessage('test', 'create');
      const deleteMsg = gitService.generateCommitMessage('test', 'delete');
      const fixMsg = gitService.generateCommitMessage('test', 'fix');

      expect(updateMsg).toContain('🤖 Generated with [Claude Code]');
      expect(createMsg).toContain('🤖 Generated with [Claude Code]');
      expect(deleteMsg).toContain('🤖 Generated with [Claude Code]');
      expect(fixMsg).toContain('🤖 Generated with [Claude Code]');
    });

    it('should always include Co-Authored-By tag', () => {
      const message = gitService.generateCommitMessage('test-command', 'update');

      expect(message).toContain('Co-Authored-By: Claude <noreply@anthropic.com>');
    });
  });
});
