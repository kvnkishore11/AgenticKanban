/**
 * Tests for ClaudeCommandsService
 * Comprehensive tests for command discovery, management, and execution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock commandContentService
vi.mock('./commandContentService.js', () => ({
  default: {
    readCommandContent: vi.fn().mockResolvedValue({
      content: '# Test Command\n\nThis is test content.',
      tokenCount: 150,
      lastModified: '2024-01-15T10:00:00Z'
    }),
    writeCommandContent: vi.fn().mockResolvedValue({
      content: 'Updated content',
      tokenCount: 200,
      lastModified: '2024-01-15T12:00:00Z'
    })
  }
}));

// Mock tokenCounter
vi.mock('../../utils/tokenCounter.js', () => ({
  formatTokenCount: vi.fn((count) => `${count} tokens`)
}));

describe('ClaudeCommandsService', () => {
  let service;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../claudeCommandsService.js');
    service = module.default;

    // Reset state
    service.commands = [];
    service.commandsPath = null;
    service.contentCache.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty commands', () => {
      expect(service.commands).toEqual([]);
      expect(service.commandsPath).toBeNull();
    });

    it('should have content cache', () => {
      expect(service.contentCache).toBeInstanceOf(Map);
    });
  });

  describe('Command Discovery', () => {
    it('should discover commands from project path', async () => {
      const result = await service.discoverCommands('/test/project');

      expect(result.commandsPath).toBe('/test/project/.claude/commands/');
      expect(result.discovered).toBeDefined();
      expect(result.totalCount).toBeGreaterThan(0);
    });

    it('should throw error if project path is missing', async () => {
      await expect(service.discoverCommands(null)).rejects.toThrow('Project path is required');
    });

    it('should return available count', async () => {
      const result = await service.discoverCommands('/test/project');

      expect(result.availableCount).toBe(result.totalCount);
    });
  });

  describe('Category Inference', () => {
    it('should infer testing category', () => {
      expect(service.inferCategoryFromCommand('test', '')).toBe('testing');
      expect(service.inferCategoryFromCommand('test_e2e', '')).toBe('testing');
      expect(service.inferCategoryFromCommand('e2e_test', 'e2e/')).toBe('testing');
    });

    it('should infer development category', () => {
      expect(service.inferCategoryFromCommand('bug', '')).toBe('development');
      expect(service.inferCategoryFromCommand('feature', '')).toBe('development');
      expect(service.inferCategoryFromCommand('implement', '')).toBe('development');
      expect(service.inferCategoryFromCommand('patch', '')).toBe('development');
    });

    it('should infer review category', () => {
      expect(service.inferCategoryFromCommand('review', '')).toBe('review');
      expect(service.inferCategoryFromCommand('in_loop_review', '')).toBe('review');
    });

    it('should infer documentation category', () => {
      expect(service.inferCategoryFromCommand('document', '')).toBe('documentation');
      expect(service.inferCategoryFromCommand('conditional_docs', '')).toBe('documentation');
    });

    it('should infer git category', () => {
      expect(service.inferCategoryFromCommand('commit', '')).toBe('git');
      expect(service.inferCategoryFromCommand('pull_request', '')).toBe('git');
      expect(service.inferCategoryFromCommand('generate_branch_name', '')).toBe('git');
    });

    it('should infer setup category', () => {
      expect(service.inferCategoryFromCommand('install', '')).toBe('setup');
      expect(service.inferCategoryFromCommand('prepare_app', '')).toBe('setup');
      expect(service.inferCategoryFromCommand('start', '')).toBe('setup');
    });

    it('should infer maintenance category', () => {
      expect(service.inferCategoryFromCommand('cleanup_worktrees', '')).toBe('maintenance');
      expect(service.inferCategoryFromCommand('chore', '')).toBe('maintenance');
    });

    it('should return general for unknown commands', () => {
      expect(service.inferCategoryFromCommand('unknown_command', '')).toBe('general');
    });
  });

  describe('Metadata Inference', () => {
    it('should infer metadata for testing category', () => {
      const metadata = service.inferMetadataFromCommand('test', 'testing');

      expect(metadata.stage).toBe('test');
      expect(metadata.substage).toBe('unit');
    });

    it('should infer e2e substage for e2e tests', () => {
      const metadata = service.inferMetadataFromCommand('test_e2e', 'testing');

      expect(metadata.substage).toBe('e2e');
    });

    it('should infer metadata for setup category', () => {
      const metadata = service.inferMetadataFromCommand('install', 'setup');

      expect(metadata.stage).toBe('plan');
      expect(metadata.substage).toBe('setup');
    });

    it('should infer metadata for review category', () => {
      const metadata = service.inferMetadataFromCommand('review', 'review');

      expect(metadata.stage).toBe('review');
      expect(metadata.substage).toBe('code-review');
    });

    it('should infer metadata for git category', () => {
      const metadata = service.inferMetadataFromCommand('commit', 'git');

      expect(metadata.stage).toBe('pr');
      expect(metadata.substage).toBe('create');
    });

    it('should include supports array', () => {
      const metadata = service.inferMetadataFromCommand('test', 'testing');

      expect(metadata.supports).toContain('all');
    });
  });

  describe('Display Name Inference', () => {
    it('should convert snake_case to Title Case', () => {
      expect(service.inferDisplayNameFromCommand('test_e2e')).toBe('Test E2e');
      expect(service.inferDisplayNameFromCommand('pull_request')).toBe('Pull Request');
    });

    it('should convert kebab-case to Title Case', () => {
      expect(service.inferDisplayNameFromCommand('some-command')).toBe('Some Command');
    });

    it('should capitalize single words', () => {
      expect(service.inferDisplayNameFromCommand('test')).toBe('Test');
    });
  });

  describe('Description Inference', () => {
    it('should return known command descriptions', () => {
      expect(service.inferDescriptionFromCommand('bug', 'development'))
        .toBe('Fix bugs and issues in the codebase');
      expect(service.inferDescriptionFromCommand('feature', 'development'))
        .toBe('Develop new features and functionality');
      expect(service.inferDescriptionFromCommand('test', 'testing'))
        .toBe('Execute comprehensive validation tests');
    });

    it('should infer description for e2e tests', () => {
      const desc = service.inferDescriptionFromCommand('test_kanban_workflow', 'testing');
      expect(desc).toContain('End-to-end test');
    });

    it('should return category description for unknown commands', () => {
      const desc = service.inferDescriptionFromCommand('unknown', 'testing');
      expect(desc).toBe('Execute tests and validation');
    });
  });

  describe('Duration Inference', () => {
    it('should return known command durations', () => {
      expect(service.inferDurationFromCommand('bug', 'development')).toBe('10-60 minutes');
      expect(service.inferDurationFromCommand('feature', 'development')).toBe('30-120 minutes');
      expect(service.inferDurationFromCommand('commit', 'git')).toBe('1-2 minutes');
    });

    it('should return category duration for unknown commands', () => {
      expect(service.inferDurationFromCommand('unknown', 'testing')).toBe('5-15 minutes');
      expect(service.inferDurationFromCommand('unknown', 'setup')).toBe('2-10 minutes');
    });
  });

  describe('Command Retrieval', () => {
    beforeEach(async () => {
      await service.discoverCommands('/test/project');
    });

    it('should get all commands', () => {
      const commands = service.getAllCommands();
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should get available commands', () => {
      const commands = service.getAvailableCommands();
      expect(commands.every(cmd => cmd.isAvailable)).toBe(true);
    });

    it('should get commands by category', () => {
      const testingCommands = service.getCommandsByCategory('testing');
      expect(testingCommands.every(cmd => cmd.category === 'testing')).toBe(true);
    });

    it('should get commands for stage', () => {
      const testCommands = service.getCommandsForStage('test');
      expect(testCommands.every(cmd => cmd.metadata.stage === 'test')).toBe(true);
    });

    it('should get commands for stage and substage', () => {
      const e2eCommands = service.getCommandsForStage('test', 'e2e');
      expect(e2eCommands.every(cmd =>
        cmd.metadata.stage === 'test' && cmd.metadata.substage === 'e2e'
      )).toBe(true);
    });

    it('should get command by ID', () => {
      const command = service.getCommandById('bug');
      expect(command).toBeDefined();
      expect(command.id).toBe('bug');
    });

    it('should return undefined for unknown command ID', () => {
      const command = service.getCommandById('nonexistent');
      expect(command).toBeUndefined();
    });
  });

  describe('Pipeline Support', () => {
    beforeEach(async () => {
      await service.discoverCommands('/test/project');
    });

    it('should check if command supports pipeline type', () => {
      // Commands with 'all' in supports should support any pipeline
      const result = service.isCommandSupportedForPipeline('bug', 'frontend');
      expect(result).toBe(true);
    });

    it('should return false for unknown command', () => {
      const result = service.isCommandSupportedForPipeline('nonexistent', 'frontend');
      expect(result).toBe(false);
    });
  });

  describe('Command Execution', () => {
    let originalRandom;

    beforeEach(async () => {
      await service.discoverCommands('/test/project');
      // Mock Math.random to always return 0.5 (prevents random failures in tests)
      originalRandom = Math.random;
      Math.random = vi.fn(() => 0.5);
    });

    afterEach(() => {
      Math.random = originalRandom;
    });

    it('should execute available command', async () => {
      const result = await service.executeCommand('bug');

      expect(result.commandId).toBe('bug');
      expect(result.status).toBe('completed');
      expect(result.output).toBeDefined();
    });

    it('should throw for unknown command', async () => {
      await expect(service.executeCommand('nonexistent'))
        .rejects.toThrow("Command 'nonexistent' not found");
    });

    it('should include context in result', async () => {
      const context = { taskId: '123' };
      const result = await service.executeCommand('bug', context);

      expect(result.context).toEqual(context);
    });
  });

  describe('Categories', () => {
    beforeEach(async () => {
      await service.discoverCommands('/test/project');
    });

    it('should get all categories', () => {
      const categories = service.getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('id');
      expect(categories[0]).toHaveProperty('name');
      expect(categories[0]).toHaveProperty('commands');
    });

    it('should capitalize category names', () => {
      const categories = service.getCategories();
      const testingCategory = categories.find(c => c.id === 'testing');

      expect(testingCategory.name).toBe('Testing');
    });
  });

  describe('Command Validation', () => {
    it('should validate valid command', () => {
      const command = {
        id: 'test',
        name: '/test',
        file: 'test.md',
        category: 'testing'
      };

      const result = service.validateCommand(command);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing command ID', () => {
      const command = {
        name: '/test',
        file: 'test.md',
        category: 'testing'
      };

      const result = service.validateCommand(command);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command ID is required');
    });

    it('should detect missing command name', () => {
      const command = {
        id: 'test',
        file: 'test.md',
        category: 'testing'
      };

      const result = service.validateCommand(command);

      expect(result.errors).toContain('Command name is required');
    });

    it('should detect missing file', () => {
      const command = {
        id: 'test',
        name: '/test',
        category: 'testing'
      };

      const result = service.validateCommand(command);

      expect(result.errors).toContain('Command file is required');
    });

    it('should detect missing category', () => {
      const command = {
        id: 'test',
        name: '/test',
        file: 'test.md'
      };

      const result = service.validateCommand(command);

      expect(result.errors).toContain('Command category is required');
    });
  });

  describe('Usage Statistics', () => {
    beforeEach(async () => {
      await service.discoverCommands('/test/project');
    });

    it('should return usage statistics', () => {
      const stats = service.getUsageStatistics();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.available).toBeDefined();
      expect(stats.unavailable).toBeDefined();
      expect(stats.categories).toBeGreaterThan(0);
      expect(stats.byCategory).toBeDefined();
    });

    it('should include category breakdown', () => {
      const stats = service.getUsageStatistics();

      expect(stats.byCategory.length).toBe(stats.categories);
      expect(stats.byCategory[0]).toHaveProperty('category');
      expect(stats.byCategory[0]).toHaveProperty('total');
      expect(stats.byCategory[0]).toHaveProperty('available');
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      await service.discoverCommands('/test/project');
    });

    it('should search by name', () => {
      const results = service.searchCommands('bug');

      expect(results.some(cmd => cmd.id === 'bug')).toBe(true);
    });

    it('should search by description', () => {
      const results = service.searchCommands('fix');

      expect(results.some(cmd => cmd.description.toLowerCase().includes('fix'))).toBe(true);
    });

    it('should search by category', () => {
      const results = service.searchCommands('testing');

      expect(results.some(cmd => cmd.category === 'testing')).toBe(true);
    });

    it('should return all commands for empty query', () => {
      const results = service.searchCommands('');

      expect(results.length).toBe(service.commands.length);
    });

    it('should be case insensitive', () => {
      const results1 = service.searchCommands('BUG');
      const results2 = service.searchCommands('bug');

      expect(results1.length).toBe(results2.length);
    });
  });

  describe('Enhanced Search', () => {
    beforeEach(async () => {
      await service.discoverCommands('/test/project');
    });

    it('should search by display name', () => {
      const results = service.searchCommandsEnhanced('Pull Request');

      expect(results.some(cmd => cmd.id === 'pull_request')).toBe(true);
    });

    it('should search by command ID', () => {
      const results = service.searchCommandsEnhanced('pull_request');

      expect(results.some(cmd => cmd.id === 'pull_request')).toBe(true);
    });

    it('should return all for empty query', () => {
      const results = service.searchCommandsEnhanced('');

      expect(results.length).toBe(service.commands.length);
    });
  });

  describe('Token Count Sorting', () => {
    beforeEach(async () => {
      await service.discoverCommands('/test/project');
      // Set some token counts
      service.commands[0].tokenCount = 100;
      service.commands[1].tokenCount = 500;
      service.commands[2].tokenCount = 200;
    });

    it('should sort by token count descending', () => {
      const sorted = service.getCommandsByTokenCount(false);

      expect(sorted[0].tokenCount).toBeGreaterThanOrEqual(sorted[1].tokenCount);
    });

    it('should sort by token count ascending', () => {
      const sorted = service.getCommandsByTokenCount(true);

      expect(sorted[0].tokenCount).toBeLessThanOrEqual(sorted[1].tokenCount);
    });
  });

  describe('Command Complexity', () => {
    it('should classify simple commands', () => {
      const complexity = service.getCommandComplexity({ tokenCount: 50 });

      expect(complexity.level).toBe('simple');
      expect(complexity.color).toBe('green');
    });

    it('should classify moderate commands', () => {
      const complexity = service.getCommandComplexity({ tokenCount: 300 });

      expect(complexity.level).toBe('moderate');
      expect(complexity.color).toBe('yellow');
    });

    it('should classify complex commands', () => {
      const complexity = service.getCommandComplexity({ tokenCount: 700 });

      expect(complexity.level).toBe('complex');
      expect(complexity.color).toBe('orange');
    });

    it('should classify very complex commands', () => {
      const complexity = service.getCommandComplexity({ tokenCount: 1500 });

      expect(complexity.level).toBe('very complex');
      expect(complexity.color).toBe('red');
    });

    it('should handle missing token count', () => {
      const complexity = service.getCommandComplexity({});

      expect(complexity.level).toBe('simple');
    });
  });

  describe('Pipeline Type Detection', () => {
    it('should detect frontend pipeline', () => {
      expect(service.getPipelineType({ id: 'frontend-pipeline' })).toBe('frontend');
    });

    it('should detect backend pipeline', () => {
      expect(service.getPipelineType({ id: 'backend-api' })).toBe('backend');
    });

    it('should detect fullstack pipeline', () => {
      expect(service.getPipelineType({ id: 'fullstack-app' })).toBe('fullstack');
      expect(service.getPipelineType({ id: 'full-stack-service' })).toBe('fullstack');
    });

    it('should return all for unrecognized pipeline', () => {
      expect(service.getPipelineType({ id: 'some-pipeline' })).toBe('all');
    });

    it('should return unknown for null pipeline', () => {
      expect(service.getPipelineType(null)).toBe('unknown');
    });
  });

  describe('Display and Slash Names', () => {
    it('should get command display name', () => {
      const command = { displayName: 'Custom Name', name: '/test' };
      expect(service.getCommandDisplayName(command)).toBe('Custom Name');
    });

    it('should fallback to name if no displayName', () => {
      const command = { name: '/test' };
      expect(service.getCommandDisplayName(command)).toBe('/test');
    });

    it('should get slash notation name', () => {
      expect(service.getCommandSlashName({ id: 'test', name: '/test' })).toBe('/test');
    });

    it('should add slash if missing', () => {
      expect(service.getCommandSlashName({ id: 'test', name: 'test' })).toBe('/test');
    });
  });

  describe('Execution History', () => {
    it('should return empty history initially', () => {
      expect(service.getExecutionHistory()).toEqual([]);
    });
  });

  describe('Recommended Commands', () => {
    beforeEach(async () => {
      await service.discoverCommands('/test/project');
    });

    it('should get recommended commands for task', () => {
      const task = { stage: 'test', substage: 'unit' };
      const pipelineInfo = { id: 'frontend-app' };

      const recommended = service.getRecommendedCommands(task, pipelineInfo);

      expect(recommended.every(cmd => cmd.isAvailable)).toBe(true);
    });
  });

  describe('Command Availability Check', () => {
    beforeEach(async () => {
      await service.discoverCommands('/test/project');
    });

    it('should check command availability', async () => {
      const result = await service.checkCommandAvailability('bug');

      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('lastChecked');
    });

    it('should return unavailable for unknown command', async () => {
      const result = await service.checkCommandAvailability('nonexistent');

      expect(result.available).toBe(false);
      expect(result.reason).toBe('Command not found');
    });
  });
});
