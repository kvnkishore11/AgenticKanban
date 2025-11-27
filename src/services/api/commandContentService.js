/**
 * Command Content Service
 * Handles reading command file content and token counting
 */

import { calculateMarkdownTokenCount } from '../../utils/tokenCounter.js';

// Import all command files at build time using Vite's import.meta.glob
const commandFiles = import.meta.glob('/.claude/commands/**/*.md', {
  as: 'raw',
  eager: true
});

class CommandContentService {
  constructor() {
    this.contentCache = new Map();
    this.isNode = typeof window === 'undefined';

    // Create a mapping of normalized paths to content for quick lookup
    this.fileMapping = new Map();
    this.initializeFileMapping();
  }

  /**
   * Initialize the file mapping from imported command files
   */
  initializeFileMapping() {
    for (const [importPath, content] of Object.entries(commandFiles)) {
      // Normalize the path to match what claudeCommandsService provides
      const normalizedPath = importPath.replace(/^\//, '');
      this.fileMapping.set(normalizedPath, content);

      // Also support absolute paths starting with ./
      const relativePath = `./${normalizedPath}`;
      this.fileMapping.set(relativePath, content);

      // Support paths that might include the full project path
      const fileName = importPath.split('/').pop();
      if (fileName) {
        this.fileMapping.set(fileName, content);
      }
    }

    console.log(`Loaded ${this.fileMapping.size} command files:`, Array.from(this.fileMapping.keys()));
  }

  /**
   * Read content from a command file using direct imports
   */
  async readCommandContent(commandPath) {
    // Handle empty path - return mock
    if (!commandPath || commandPath.trim() === '') {
      const mockContent = this.generateMockContent('empty.md');
      return {
        content: mockContent,
        tokenCount: calculateMarkdownTokenCount(mockContent),
        lastModified: new Date().toISOString(),
        path: commandPath || '',
        isMock: true,
      };
    }

    // Check cache first
    if (this.contentCache.has(commandPath)) {
      return this.contentCache.get(commandPath);
    }

    try {
      let content;

      if (this.isNode) {
        // Node.js environment - use fs (for backwards compatibility)
        const fs = await import('fs/promises');
        content = await fs.readFile(commandPath, 'utf-8');
      } else {
        // Browser environment - use direct file imports
        content = this.getImportedFileContent(commandPath);

        if (!content) {
          throw new Error(`Command file not found in imports: ${commandPath}`);
        }
      }

      // Calculate token count
      const tokenCount = calculateMarkdownTokenCount(content);

      const result = {
        content,
        tokenCount,
        lastModified: new Date().toISOString(),
        path: commandPath,
      };

      // Cache the result
      this.contentCache.set(commandPath, result);

      return result;
    } catch (error) {
      console.error(`Failed to read command content from ${commandPath}:`, error);

      // Return mock content only when files are truly missing from the build
      const mockContent = this.generateMockContent(commandPath);
      const result = {
        content: mockContent,
        tokenCount: calculateMarkdownTokenCount(mockContent),
        lastModified: new Date().toISOString(),
        path: commandPath,
        isMock: true,
      };

      this.contentCache.set(commandPath, result);
      return result;
    }
  }

  /**
   * Get content from imported files using various path matching strategies
   */
  getImportedFileContent(commandPath) {
    // Try exact match first
    if (this.fileMapping.has(commandPath)) {
      return this.fileMapping.get(commandPath);
    }

    // Try normalized variations
    const normalizedPath = commandPath.replace(/^\.\//, '');
    if (this.fileMapping.has(normalizedPath)) {
      return this.fileMapping.get(normalizedPath);
    }

    // Try with ./ prefix
    const withPrefix = `./${normalizedPath}`;
    if (this.fileMapping.has(withPrefix)) {
      return this.fileMapping.get(withPrefix);
    }

    // Try just the filename
    const fileName = commandPath.split('/').pop();
    if (fileName && this.fileMapping.has(fileName)) {
      return this.fileMapping.get(fileName);
    }

    // Try to find by partial path match
    for (const [mappedPath, content] of this.fileMapping) {
      if (mappedPath.includes(commandPath) || commandPath.includes(mappedPath)) {
        return content;
      }
    }

    return null;
  }

  /**
   * Write content to a command file
   * Note: In browser environment, writing is not supported with direct imports
   */
  async writeCommandContent(commandPath, content) {
    try {
      if (this.isNode) {
        // Node.js environment - use fs
        const fs = await import('fs/promises');
        await fs.writeFile(commandPath, content, 'utf-8');
      } else {
        // Browser environment - writing not supported with static imports
        throw new Error('Writing command files is not supported in browser environment with static imports');
      }

      // Update cache
      const tokenCount = calculateMarkdownTokenCount(content);
      const result = {
        content,
        tokenCount,
        lastModified: new Date().toISOString(),
        path: commandPath,
      };

      this.contentCache.set(commandPath, result);

      return result;
    } catch (error) {
      console.error(`Failed to write command content to ${commandPath}:`, error);
      throw error;
    }
  }

  /**
   * Generate mock content for development/demo purposes
   */
  generateMockContent(commandPath) {
    const fileName = commandPath.split('/').pop() || 'unknown.md';
    const commandName = fileName.replace('.md', '');

    return `# ${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Command

## Description
This is a mock command for demonstration purposes. The actual command content would be loaded from the file system.

## Usage
\`\`\`bash
claude /${commandName}
\`\`\`

## Parameters
- **task**: The task to process (optional)
- **project**: The project context (optional)

## Examples
\`\`\`bash
# Basic usage
claude /${commandName}

# With specific task
claude /${commandName} --task="Fix authentication bug"

# With project context
claude /${commandName} --project="my-app"
\`\`\`

## Notes
- This command is part of the AgenticKanban workflow system
- Execution time varies based on complexity
- Requires appropriate permissions and dependencies

## Related Commands
- \`/test\` - Run tests after implementation
- \`/review\` - Review completed work
- \`/commit\` - Commit changes

---

*This is mock content generated for development purposes.*
*File path: ${commandPath}*
*Generated at: ${new Date().toISOString()}*`;
  }

  /**
   * Clear content cache
   */
  clearCache() {
    this.contentCache.clear();
  }

  /**
   * Get cached content info
   */
  getCacheInfo() {
    return {
      size: this.contentCache.size,
      keys: Array.from(this.contentCache.keys()),
    };
  }

  /**
   * Preload command content for better performance
   */
  async preloadCommands(commands) {
    const promises = commands.map(command =>
      this.readCommandContent(command.path).catch(error => {
        console.warn(`Failed to preload ${command.path}:`, error);
        return null;
      })
    );

    const results = await Promise.allSettled(promises);
    return results;
  }

  /**
   * Validate markdown content
   */
  validateMarkdownContent(content) {
    const errors = [];

    if (!content || typeof content !== 'string') {
      errors.push('Content must be a non-empty string');
      return { isValid: false, errors };
    }

    // Check for basic markdown structure
    if (!content.includes('#')) {
      errors.push('Markdown should contain at least one heading');
    }

    // Check for extremely long lines that might cause display issues
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 1000);
    if (longLines.length > 0) {
      errors.push(`Contains ${longLines.length} very long line(s) that may cause display issues`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: errors.length > 0 ? [] : [],
    };
  }
}

// Create and export singleton instance
const commandContentService = new CommandContentService();
export default commandContentService;