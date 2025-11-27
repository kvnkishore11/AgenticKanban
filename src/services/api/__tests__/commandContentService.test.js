import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import commandContentService from '../commandContentService.js';

// Mock the token counter utility
vi.mock('../../../utils/tokenCounter.js', () => ({
  calculateMarkdownTokenCount: vi.fn((content) => Math.floor(content.length / 4)),
}));

// Mock import.meta.glob
const mockCommandFiles = {
  '/.claude/commands/test.md': '# Test Command\n\nThis is a test command.',
  '/.claude/commands/build.md': '# Build Command\n\nThis builds the project.',
  '/.claude/commands/nested/deploy.md': '# Deploy Command\n\nDeploys to production.',
};

vi.mock('*.md', () => mockCommandFiles);

describe('CommandContentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the service cache
    commandContentService.contentCache.clear();
    // Re-initialize file mapping with mock data
    commandContentService.fileMapping.clear();
    for (const [path, content] of Object.entries(mockCommandFiles)) {
      const normalizedPath = path.replace(/^\//, '');
      commandContentService.fileMapping.set(normalizedPath, content);
      commandContentService.fileMapping.set(`./${normalizedPath}`, content);
      const fileName = path.split('/').pop();
      if (fileName) {
        commandContentService.fileMapping.set(fileName, content);
      }
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Environment Detection', () => {
    it('should detect browser environment', () => {
      expect(commandContentService.isNode).toBe(false);
    });
  });

  describe('File Mapping Initialization', () => {
    it('should initialize file mapping with normalized paths', () => {
      expect(commandContentService.fileMapping.size).toBeGreaterThan(0);
    });

    it('should map files by multiple path formats', () => {
      expect(commandContentService.fileMapping.has('test.md')).toBe(true);
      expect(commandContentService.fileMapping.has('.claude/commands/test.md')).toBe(true);
      expect(commandContentService.fileMapping.has('./.claude/commands/test.md')).toBe(true);
    });
  });

  describe('Get Imported File Content', () => {
    it('should get content by exact path match', () => {
      const content = commandContentService.getImportedFileContent('test.md');

      expect(content).toBe('# Test Command\n\nThis is a test command.');
    });

    it('should get content by normalized path', () => {
      const content = commandContentService.getImportedFileContent('.claude/commands/test.md');

      expect(content).toBe('# Test Command\n\nThis is a test command.');
    });

    it('should get content by filename only', () => {
      const content = commandContentService.getImportedFileContent('test.md');

      expect(content).toBe('# Test Command\n\nThis is a test command.');
    });

    it('should return null for non-existent file', () => {
      const content = commandContentService.getImportedFileContent('nonexistent.md');

      expect(content).toBeNull();
    });

    it('should handle nested command files', () => {
      const content = commandContentService.getImportedFileContent('deploy.md');

      expect(content).toBe('# Deploy Command\n\nDeploys to production.');
    });
  });

  describe('Read Command Content', () => {
    it('should read command content successfully', async () => {
      const result = await commandContentService.readCommandContent('test.md');

      expect(result).toBeDefined();
      expect(result.content).toBe('# Test Command\n\nThis is a test command.');
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.path).toBe('test.md');
      expect(result.lastModified).toBeDefined();
    });

    it('should cache command content', async () => {
      await commandContentService.readCommandContent('test.md');
      const cached = await commandContentService.readCommandContent('test.md');

      expect(cached).toBeDefined();
      expect(cached.content).toBe('# Test Command\n\nThis is a test command.');
    });

    it('should return mock content for missing files', async () => {
      const result = await commandContentService.readCommandContent('missing.md');

      expect(result.isMock).toBe(true);
      expect(result.content).toContain('mock command');
      expect(result.path).toBe('missing.md');
    });

    it('should calculate token count', async () => {
      const result = await commandContentService.readCommandContent('test.md');

      expect(result.tokenCount).toBeDefined();
      expect(typeof result.tokenCount).toBe('number');
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    it('should include lastModified timestamp', async () => {
      const result = await commandContentService.readCommandContent('test.md');

      expect(result.lastModified).toBeDefined();
      expect(new Date(result.lastModified).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Write Command Content', () => {
    it('should throw error in browser environment', async () => {
      await expect(
        commandContentService.writeCommandContent('test.md', 'New content')
      ).rejects.toThrow('Writing command files is not supported in browser environment');
    });
  });

  describe('Generate Mock Content', () => {
    it('should generate mock content with command name', () => {
      const content = commandContentService.generateMockContent('/path/to/test-command.md');

      expect(content).toContain('# Test-command Command');
      expect(content).toContain('mock command');
      expect(content).toContain('/test-command');
    });

    it('should include usage examples', () => {
      const content = commandContentService.generateMockContent('/path/to/test.md');

      expect(content).toContain('## Usage');
      expect(content).toContain('## Examples');
      expect(content).toContain('claude /test');
    });

    it('should include file path in footer', () => {
      const filePath = '/path/to/command.md';
      const content = commandContentService.generateMockContent(filePath);

      expect(content).toContain(filePath);
    });

    it('should include timestamp', () => {
      const content = commandContentService.generateMockContent('/path/to/test.md');

      expect(content).toContain('Generated at:');
    });

    it('should handle unknown filename', () => {
      const content = commandContentService.generateMockContent('');

      expect(content).toContain('# Unknown Command');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      await commandContentService.readCommandContent('test.md');
      expect(commandContentService.contentCache.size).toBeGreaterThan(0);

      commandContentService.clearCache();

      expect(commandContentService.contentCache.size).toBe(0);
    });

    it('should get cache info', async () => {
      await commandContentService.readCommandContent('test.md');
      await commandContentService.readCommandContent('build.md');

      const info = commandContentService.getCacheInfo();

      expect(info.size).toBe(2);
      expect(info.keys).toContain('test.md');
      expect(info.keys).toContain('build.md');
    });

    it('should return empty cache info when cache is empty', () => {
      commandContentService.clearCache();

      const info = commandContentService.getCacheInfo();

      expect(info.size).toBe(0);
      expect(info.keys).toHaveLength(0);
    });
  });

  describe('Preload Commands', () => {
    it('should preload multiple commands', async () => {
      const commands = [
        { path: 'test.md' },
        { path: 'build.md' },
      ];

      const results = await commandContentService.preloadCommands(commands);

      expect(results).toHaveLength(2);
      expect(commandContentService.contentCache.size).toBe(2);
    });

    it('should handle preload errors gracefully', async () => {
      const commands = [
        { path: 'test.md' },
        { path: 'nonexistent.md' },
      ];

      const results = await commandContentService.preloadCommands(commands);

      expect(results).toHaveLength(2);
      // Should still preload the valid one
      expect(commandContentService.contentCache.has('test.md')).toBe(true);
    });

    it('should preload empty array', async () => {
      const results = await commandContentService.preloadCommands([]);

      expect(results).toHaveLength(0);
    });

    it('should use Promise.allSettled for parallel loading', async () => {
      const commands = [
        { path: 'test.md' },
        { path: 'build.md' },
        { path: 'deploy.md' },
      ];

      const results = await commandContentService.preloadCommands(commands);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });
  });

  describe('Validate Markdown Content', () => {
    it('should validate valid markdown content', () => {
      const content = '# Title\n\nThis is valid markdown.';
      const result = commandContentService.validateMarkdownContent(content);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null content', () => {
      const result = commandContentService.validateMarkdownContent(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content must be a non-empty string');
    });

    it('should reject undefined content', () => {
      const result = commandContentService.validateMarkdownContent(undefined);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content must be a non-empty string');
    });

    it('should reject non-string content', () => {
      const result = commandContentService.validateMarkdownContent(123);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content must be a non-empty string');
    });

    it('should warn about missing headings', () => {
      const content = 'This is plain text without any headings.';
      const result = commandContentService.validateMarkdownContent(content);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Markdown should contain at least one heading');
    });

    it('should warn about very long lines', () => {
      const longLine = 'a'.repeat(1500);
      const content = `# Title\n\n${longLine}`;
      const result = commandContentService.validateMarkdownContent(content);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('very long line');
    });

    it('should accept markdown with headings', () => {
      const content = '# Title\n\n## Subtitle\n\nContent here.';
      const result = commandContentService.validateMarkdownContent(content);

      expect(result.isValid).toBe(true);
    });

    it('should accept markdown with various heading levels', () => {
      const content = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
      const result = commandContentService.validateMarkdownContent(content);

      expect(result.isValid).toBe(true);
    });

    it('should count multiple long lines', () => {
      const longLine1 = 'a'.repeat(1100);
      const longLine2 = 'b'.repeat(1200);
      const content = `# Title\n\n${longLine1}\n\n${longLine2}`;
      const result = commandContentService.validateMarkdownContent(content);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('2 very long line');
    });

    it('should include warnings array', () => {
      const content = '# Valid Content\n\nThis is good.';
      const result = commandContentService.validateMarkdownContent(content);

      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should accept content with exactly 1000 character lines', () => {
      const line = 'a'.repeat(1000);
      const content = `# Title\n\n${line}`;
      const result = commandContentService.validateMarkdownContent(content);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty path', async () => {
      const result = await commandContentService.readCommandContent('');

      expect(result.isMock).toBe(true);
    });

    it('should handle path with special characters', async () => {
      const result = await commandContentService.readCommandContent('test-command_v2.md');

      // Should return mock content since file doesn't exist
      expect(result.isMock).toBe(true);
      expect(result.path).toBe('test-command_v2.md');
    });

    it('should handle concurrent reads of same file', async () => {
      const [result1, result2, result3] = await Promise.all([
        commandContentService.readCommandContent('test.md'),
        commandContentService.readCommandContent('test.md'),
        commandContentService.readCommandContent('test.md'),
      ]);

      expect(result1.content).toBe(result2.content);
      expect(result2.content).toBe(result3.content);
    });

    it('should handle very large content', async () => {
      const largeContent = 'a'.repeat(100000);
      commandContentService.fileMapping.set('large.md', largeContent);

      const result = await commandContentService.readCommandContent('large.md');

      expect(result.content).toBe(largeContent);
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    it('should handle content with unicode characters', async () => {
      const unicodeContent = '# 测试命令\n\n这是一个测试命令。🚀';
      commandContentService.fileMapping.set('unicode.md', unicodeContent);

      const result = await commandContentService.readCommandContent('unicode.md');

      expect(result.content).toBe(unicodeContent);
    });
  });
});
