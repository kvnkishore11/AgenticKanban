/**
 * Git Service
 * Handles git operations for command file management
 */

class GitService {
  constructor() {
    this.isNode = typeof window === 'undefined';
  }

  /**
   * Commit changes to a command file
   */
  async commitCommandChanges(filePath, commitMessage = null) {
    const fileName = filePath.split('/').pop();
    const defaultMessage = `Update ${fileName} command configuration

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    const finalMessage = commitMessage || defaultMessage;

    try {
      if (this.isNode) {
        // Node.js environment - use child_process
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        // Add the file to staging
        await execAsync(`git add "${filePath}"`);

        // Create the commit
        await execAsync(`git commit -m "${finalMessage}"`);

        return {
          success: true,
          message: 'Changes committed successfully',
          commitMessage: finalMessage,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Browser environment - use API
        const response = await fetch('/api/git/commit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath,
            commitMessage: finalMessage,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error('Failed to commit changes:', error);

      // Return mock success for development
      return {
        success: false,
        error: error.message,
        message: 'Git commit simulation (would commit in production)',
        commitMessage: finalMessage,
        timestamp: new Date().toISOString(),
        isMock: true,
      };
    }
  }

  /**
   * Check git status of a file
   */
  async getFileStatus(filePath) {
    try {
      if (this.isNode) {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync(`git status --porcelain "${filePath}"`);

        const status = stdout.trim();
        if (!status) {
          return { status: 'unmodified', staged: false, modified: false };
        }

        const statusCode = status.substring(0, 2);
        return this.parseGitStatus(statusCode);
      } else {
        // Browser environment - use API
        const response = await fetch(`/api/git/status?file=${encodeURIComponent(filePath)}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get file status:', error);

      // Return mock status for development
      return {
        status: 'unknown',
        staged: false,
        modified: true,
        error: error.message,
        isMock: true,
      };
    }
  }

  /**
   * Parse git status codes
   */
  parseGitStatus(statusCode) {
    const staged = statusCode[0] !== ' ' && statusCode[0] !== '?';
    const modified = statusCode[1] !== ' ';

    let status = 'unmodified';
    if (statusCode === '??') status = 'untracked';
    else if (statusCode[0] === 'A') status = 'added';
    else if (statusCode[0] === 'M') status = 'modified';
    else if (statusCode[0] === 'D') status = 'deleted';
    else if (statusCode[0] === 'R') status = 'renamed';
    else if (statusCode[1] === 'M') status = 'modified';
    else if (statusCode[1] === 'D') status = 'deleted';

    return {
      status,
      staged,
      modified,
      statusCode,
    };
  }

  /**
   * Get git repository information
   */
  async getRepoInfo() {
    try {
      if (this.isNode) {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        const [branchResult, remoteResult] = await Promise.allSettled([
          execAsync('git branch --show-current'),
          execAsync('git remote get-url origin'),
        ]);

        const branch = branchResult.status === 'fulfilled'
          ? branchResult.value.stdout.trim()
          : 'unknown';

        const remote = remoteResult.status === 'fulfilled'
          ? remoteResult.value.stdout.trim()
          : 'unknown';

        return {
          branch,
          remote,
          isGitRepo: true,
        };
      } else {
        // Browser environment - use API
        const response = await fetch('/api/git/info');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get repo info:', error);

      return {
        branch: 'main',
        remote: 'origin',
        isGitRepo: true,
        error: error.message,
        isMock: true,
      };
    }
  }

  /**
   * Create a backup of a file before making changes
   */
  async createBackup(filePath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;

    try {
      if (this.isNode) {
        const fs = await import('fs/promises');
        await fs.copyFile(filePath, backupPath);
      } else {
        // Browser environment - use API
        const response = await fetch('/api/files/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourcePath: filePath,
            backupPath,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      return {
        success: true,
        backupPath,
        timestamp,
      };
    } catch (error) {
      console.error('Failed to create backup:', error);

      return {
        success: false,
        error: error.message,
        backupPath,
        timestamp,
        isMock: true,
      };
    }
  }

  /**
   * Validate commit message
   */
  validateCommitMessage(message) {
    const errors = [];

    if (!message || typeof message !== 'string') {
      errors.push('Commit message must be a non-empty string');
      return { isValid: false, errors };
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
      errors.push('Commit message cannot be empty');
    }

    if (trimmed.length > 72) {
      errors.push('First line of commit message should be 72 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate commit message for command changes
   */
  generateCommitMessage(commandName, changeType = 'update') {
    const messages = {
      update: `Update ${commandName} command configuration`,
      create: `Add ${commandName} command`,
      delete: `Remove ${commandName} command`,
      fix: `Fix ${commandName} command issues`,
    };

    const baseMessage = messages[changeType] || messages.update;

    return `${baseMessage}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;
  }
}

// Create and export singleton instance
const gitService = new GitService();
export default gitService;