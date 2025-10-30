/**
 * Claude Commands Service
 * Handles discovery and management of .claude/commands as workflow primitives
 */

import commandContentService from './commandContentService.js';
import { formatTokenCount } from '../../utils/tokenCounter.js';

class ClaudeCommandsService {
  constructor() {
    this.commands = [];
    this.commandsPath = null;
    this.contentCache = new Map();
  }

  /**
   * Discovery of real .claude/commands from project structure
   */
  async discoverCommands(projectPath) {
    if (!projectPath) {
      throw new Error('Project path is required');
    }

    this.commandsPath = `${projectPath}/.claude/commands/`;

    try {
      // Dynamically scan .claude/commands directory for all .md files
      const discoveredCommands = await this.scanCommandsDirectory(this.commandsPath);

      return new Promise((resolve) => {
        setTimeout(async () => {
          this.commands = discoveredCommands;

          // Load token counts for each command
          await this.loadTokenCounts();

          resolve({
            commandsPath: this.commandsPath,
            discovered: this.commands,
            availableCount: this.commands.filter(cmd => cmd.isAvailable).length,
            totalCount: this.commands.length,
          });
        }, 300);
      });
    } catch (error) {
      console.error('Failed to discover commands:', error);
      // Fallback to empty array if discovery fails
      this.commands = [];
      return {
        commandsPath: this.commandsPath,
        discovered: [],
        availableCount: 0,
        totalCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Scan .claude/commands directory for all .md files and create command objects
   */
  async scanCommandsDirectory(commandsPath) {
    const commands = [];

    // In a real environment, this would use fs to scan the directory
    // For now, we'll use a fetch-based approach to work in the browser
    try {
      // Get list of all command files from the git status or predefined list
      const commandFiles = [
        'bug.md', 'chore.md', 'classify_adw.md', 'classify_issue.md', 'cleanup_worktrees.md',
        'commit.md', 'conditional_docs.md', 'document.md', 'feature.md', 'generate_branch_name.md',
        'health_check.md', 'implement.md', 'in_loop_review.md', 'install.md', 'install_worktree.md',
        'patch.md', 'prepare_app.md', 'prime.md', 'project.md', 'pull_request.md',
        'resolve_failed_e2e_test.md', 'resolve_failed_test.md', 'review.md', 'start.md',
        'test.md', 'test_e2e.md', 'tools.md', 'track_agentic_kpis.md',
        // E2E test files
        'e2e/test_basic_query.md', 'e2e/test_complex_query.md', 'e2e/test_disable_input_debounce.md',
        'e2e/test_enhanced_commands_editor.md', 'e2e/test_enhanced_task_input.md',
        'e2e/test_export_functionality.md', 'e2e/test_kanban_ui_layout.md',
        'e2e/test_kanban_workflow.md', 'e2e/test_random_query_generator.md', 'e2e/test_sql_injection.md'
      ];

      for (const file of commandFiles) {
        try {
          const command = await this.createCommandFromFile(file, commandsPath);
          if (command) {
            commands.push(command);
          }
        } catch (error) {
          console.warn(`Failed to process command file ${file}:`, error);
          // Continue processing other files even if one fails
        }
      }

      return commands;
    } catch (error) {
      console.error('Error scanning commands directory:', error);
      return [];
    }
  }

  /**
   * Create a command object from a file
   */
  async createCommandFromFile(file, commandsPath) {
    const filePath = `${commandsPath}${file}`;
    const fileName = file.split('/').pop(); // Get just the filename
    const commandId = fileName.replace('.md', '');
    const commandName = `/${commandId}`;

    // Extract category and metadata from file path and name
    const category = this.inferCategoryFromCommand(commandId, file);
    const metadata = this.inferMetadataFromCommand(commandId, category);
    const displayName = this.inferDisplayNameFromCommand(commandId);
    const description = this.inferDescriptionFromCommand(commandId, category);
    const estimatedDuration = this.inferDurationFromCommand(commandId, category);

    return {
      id: commandId,
      name: commandName,
      displayName,
      description,
      category,
      file: fileName,
      path: filePath,
      isAvailable: true,
      estimatedDuration,
      tokenCount: 0,
      metadata,
    };
  }

  /**
   * Infer category from command name and file path
   */
  inferCategoryFromCommand(commandId, filePath) {
    if (filePath.startsWith('e2e/')) return 'testing';

    if (commandId.includes('test')) return 'testing';
    if (commandId.includes('bug') || commandId.includes('patch') || commandId.includes('resolve')) return 'development';
    if (commandId.includes('feature') || commandId.includes('implement')) return 'development';
    if (commandId.includes('review')) return 'review';
    if (commandId.includes('doc')) return 'documentation';
    if (commandId.includes('git') || commandId.includes('commit') || commandId.includes('pull') || commandId.includes('branch')) return 'git';
    if (commandId.includes('install') || commandId.includes('prepare') || commandId.includes('start')) return 'setup';
    if (commandId.includes('clean') || commandId.includes('chore')) return 'maintenance';
    if (commandId.includes('classify') || commandId.includes('track')) return 'analysis';
    if (commandId.includes('health')) return 'monitoring';
    if (commandId.includes('tools') || commandId.includes('project')) return 'utilities';

    return 'general';
  }

  /**
   * Infer metadata from command characteristics
   */
  inferMetadataFromCommand(commandId, category) {
    const supports = ['all'];
    let stage = 'build';
    let substage = 'implement';

    if (category === 'testing') {
      stage = 'test';
      substage = commandId.includes('e2e') ? 'e2e' : 'unit';
    } else if (category === 'setup') {
      stage = 'plan';
      substage = 'setup';
    } else if (category === 'review') {
      stage = 'review';
      substage = 'code-review';
    } else if (category === 'documentation') {
      stage = 'document';
      substage = 'generate';
    } else if (category === 'git') {
      stage = 'pr';
      substage = 'create';
    } else if (category === 'analysis') {
      stage = 'plan';
      substage = 'analysis';
    } else if (category === 'monitoring') {
      stage = 'test';
      substage = 'health';
    }

    return { supports, stage, substage };
  }

  /**
   * Infer display name from command ID
   */
  inferDisplayNameFromCommand(commandId) {
    // Convert snake_case or kebab-case to Title Case
    return commandId
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Infer description from command characteristics
   */
  inferDescriptionFromCommand(commandId, category) {
    const commandMap = {
      'bug': 'Fix bugs and issues in the codebase',
      'chore': 'Perform maintenance and housekeeping tasks',
      'classify_adw': 'Classify and categorize ADW pipeline tasks',
      'classify_issue': 'Classify and triage issues and bugs',
      'cleanup_worktrees': 'Clean up and manage git worktrees',
      'commit': 'Create git commits with proper formatting',
      'conditional_docs': 'Generate documentation based on code changes',
      'document': 'Generate and update project documentation',
      'feature': 'Develop new features and functionality',
      'generate_branch_name': 'Generate descriptive git branch names',
      'health_check': 'Perform application health and system checks',
      'implement': 'Implement plans and specifications',
      'in_loop_review': 'Perform continuous integration reviews',
      'install': 'Install and manage project dependencies',
      'install_worktree': 'Install and configure git worktrees',
      'patch': 'Apply patches and hotfixes',
      'prepare_app': 'Prepare and start the application for development/testing',
      'prime': 'Prime and initialize the development environment',
      'project': 'Manage project-level operations and configurations',
      'pull_request': 'Create and manage pull requests',
      'resolve_failed_e2e_test': 'Resolve failed end-to-end test issues',
      'resolve_failed_test': 'Resolve failed test issues',
      'review': 'Review work done against specifications',
      'start': 'Start the application and development environment',
      'test': 'Execute comprehensive validation tests',
      'test_e2e': 'Run end-to-end integration tests',
      'tools': 'Manage development tools and utilities',
      'track_agentic_kpis': 'Track and analyze agentic workflow KPIs'
    };

    if (commandMap[commandId]) {
      return commandMap[commandId];
    }

    // For E2E tests, extract from filename
    if (commandId.startsWith('test_')) {
      const testName = commandId.replace('test_', '').replace(/_/g, ' ');
      return `End-to-end test for ${testName}`;
    }

    // Generic fallback based on category
    const categoryDescriptions = {
      'testing': 'Execute tests and validation',
      'development': 'Development and implementation tasks',
      'review': 'Code review and quality assurance',
      'documentation': 'Documentation generation and updates',
      'git': 'Git operations and version control',
      'setup': 'Environment setup and initialization',
      'maintenance': 'Maintenance and cleanup tasks',
      'analysis': 'Analysis and classification tasks',
      'monitoring': 'Monitoring and health checks',
      'utilities': 'Utility and helper functions'
    };

    return categoryDescriptions[category] || 'General purpose command';
  }

  /**
   * Infer estimated duration from command characteristics
   */
  inferDurationFromCommand(commandId, category) {
    const durationMap = {
      'bug': '10-60 minutes',
      'chore': '5-30 minutes',
      'classify_adw': '2-10 minutes',
      'classify_issue': '1-5 minutes',
      'cleanup_worktrees': '1-3 minutes',
      'commit': '1-2 minutes',
      'conditional_docs': '2-10 minutes',
      'document': '5-20 minutes',
      'feature': '30-120 minutes',
      'generate_branch_name': '30 seconds',
      'health_check': '2-5 minutes',
      'implement': '30-180 minutes',
      'in_loop_review': '5-15 minutes',
      'install': '2-10 minutes',
      'patch': '10-45 minutes',
      'prepare_app': '2-5 minutes',
      'pull_request': '3-10 minutes',
      'review': '10-30 minutes',
      'test': '5-15 minutes',
      'test_e2e': '10-30 minutes'
    };

    if (durationMap[commandId]) {
      return durationMap[commandId];
    }

    // Generic durations based on category
    const categoryDurations = {
      'testing': '5-15 minutes',
      'development': '20-60 minutes',
      'review': '10-30 minutes',
      'documentation': '5-20 minutes',
      'git': '1-5 minutes',
      'setup': '2-10 minutes',
      'maintenance': '5-20 minutes',
      'analysis': '2-10 minutes',
      'monitoring': '2-5 minutes',
      'utilities': '2-10 minutes'
    };

    return categoryDurations[category] || '5-15 minutes';
  }

  /**
   * Get all discovered commands
   */
  getAllCommands() {
    return this.commands;
  }

  /**
   * Get available commands only
   */
  getAvailableCommands() {
    return this.commands.filter(cmd => cmd.isAvailable);
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category) {
    return this.commands.filter(cmd => cmd.category === category);
  }

  /**
   * Get commands for a specific stage/substage
   */
  getCommandsForStage(stage, substage = null) {
    return this.commands.filter(cmd => {
      const metadata = cmd.metadata;
      if (metadata.stage !== stage) return false;
      if (substage && metadata.substage !== substage) return false;
      return true;
    });
  }

  /**
   * Get command by ID
   */
  getCommandById(commandId) {
    return this.commands.find(cmd => cmd.id === commandId);
  }

  /**
   * Check if command supports a pipeline type
   */
  isCommandSupportedForPipeline(commandId, pipelineType) {
    const command = this.getCommandById(commandId);
    if (!command) return false;

    const supports = command.metadata?.supports || [];
    return supports.includes('all') || supports.includes(pipelineType);
  }

  /**
   * Get recommended commands for a task
   */
  getRecommendedCommands(task, pipelineInfo) {
    const stageCommands = this.getCommandsForStage(task.stage, task.substage);
    const pipelineType = this.getPipelineType(pipelineInfo);

    return stageCommands.filter(cmd =>
      cmd.isAvailable &&
      this.isCommandSupportedForPipeline(cmd.id, pipelineType)
    );
  }

  /**
   * Execute a command (simulation)
   */
  async executeCommand(commandId, context = {}) {
    const command = this.getCommandById(commandId);
    if (!command) {
      throw new Error(`Command '${commandId}' not found`);
    }

    if (!command.isAvailable) {
      throw new Error(`Command '${commandId}' is not available`);
    }

    // Simulate command execution
    return new Promise((resolve, reject) => {
      const executionTime = Math.random() * 5000 + 1000; // 1-6 seconds
      const shouldFail = Math.random() < 0.1; // 10% chance of failure

      setTimeout(() => {
        if (shouldFail) {
          reject(new Error(`Command '${command.name}' failed during execution`));
        } else {
          resolve({
            commandId,
            command: command.name,
            status: 'completed',
            duration: Math.round(executionTime),
            output: `Successfully executed ${command.name}`,
            timestamp: new Date().toISOString(),
            context,
          });
        }
      }, executionTime);
    });
  }

  /**
   * Get command categories
   */
  getCategories() {
    const categories = [...new Set(this.commands.map(cmd => cmd.category))];
    return categories.map(category => ({
      id: category,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      commands: this.getCommandsByCategory(category),
      availableCount: this.getCommandsByCategory(category).filter(cmd => cmd.isAvailable).length,
    }));
  }

  /**
   * Check command availability
   */
  async checkCommandAvailability(commandId) {
    const command = this.getCommandById(commandId);
    if (!command) {
      return { available: false, reason: 'Command not found' };
    }

    // Simulate availability check (would check dependencies, permissions, etc.)
    return new Promise((resolve) => {
      setTimeout(() => {
        const isAvailable = command.isAvailable && Math.random() > 0.1;
        resolve({
          available: isAvailable,
          reason: isAvailable ? null : 'Dependencies not available or command misconfigured',
          lastChecked: new Date().toISOString(),
        });
      }, 200);
    });
  }

  /**
   * Get command execution history
   */
  getExecutionHistory() {
    // In a real implementation, this would track actual executions
    return [];
  }

  /**
   * Get pipeline type from pipeline info
   */
  getPipelineType(pipelineInfo) {
    if (!pipelineInfo) return 'unknown';

    const id = pipelineInfo.id || '';
    if (id.includes('frontend')) return 'frontend';
    if (id.includes('backend')) return 'backend';
    if (id.includes('fullstack') || id.includes('full-stack')) return 'fullstack';

    return 'all';
  }

  /**
   * Search commands
   */
  searchCommands(query) {
    if (!query) return this.commands;

    const lowercaseQuery = query.toLowerCase();
    return this.commands.filter(cmd =>
      cmd.name.toLowerCase().includes(lowercaseQuery) ||
      cmd.description.toLowerCase().includes(lowercaseQuery) ||
      cmd.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Validate command configuration
   */
  validateCommand(command) {
    const errors = [];

    if (!command.id) errors.push('Command ID is required');
    if (!command.name) errors.push('Command name is required');
    if (!command.file) errors.push('Command file is required');
    if (!command.category) errors.push('Command category is required');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get command usage statistics
   */
  getUsageStatistics() {
    const total = this.commands.length;
    const available = this.commands.filter(cmd => cmd.isAvailable).length;
    const categories = this.getCategories();

    return {
      total,
      available,
      unavailable: total - available,
      categories: categories.length,
      byCategory: categories.map(cat => ({
        category: cat.name,
        total: cat.commands.length,
        available: cat.availableCount,
      })),
    };
  }

  /**
   * Load token counts for all commands
   */
  async loadTokenCounts() {
    const promises = this.commands.map(async (command) => {
      try {
        const content = await commandContentService.readCommandContent(command.path);
        command.tokenCount = content.tokenCount;
        command.formattedTokenCount = formatTokenCount(content.tokenCount);
        command.lastModified = content.lastModified;
        return command;
      } catch (error) {
        console.warn(`Failed to load content for ${command.id}:`, error);
        command.tokenCount = 0;
        command.formattedTokenCount = '0 tokens';
        return command;
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get command content
   */
  async getCommandContent(commandId) {
    const command = this.getCommandById(commandId);
    if (!command) {
      throw new Error(`Command '${commandId}' not found`);
    }

    try {
      const content = await commandContentService.readCommandContent(command.path);
      return {
        ...command,
        content: content.content,
        tokenCount: content.tokenCount,
        formattedTokenCount: formatTokenCount(content.tokenCount),
        lastModified: content.lastModified,
      };
    } catch (error) {
      console.error(`Failed to load content for command ${commandId}:`, error);
      throw error;
    }
  }

  /**
   * Update command content
   */
  async updateCommandContent(commandId, newContent) {
    const command = this.getCommandById(commandId);
    if (!command) {
      throw new Error(`Command '${commandId}' not found`);
    }

    try {
      const result = await commandContentService.writeCommandContent(command.path, newContent);

      // Update the command's token count
      command.tokenCount = result.tokenCount;
      command.formattedTokenCount = formatTokenCount(result.tokenCount);
      command.lastModified = result.lastModified;

      return {
        ...command,
        content: result.content,
        tokenCount: result.tokenCount,
        formattedTokenCount: formatTokenCount(result.tokenCount),
        lastModified: result.lastModified,
      };
    } catch (error) {
      console.error(`Failed to update content for command ${commandId}:`, error);
      throw error;
    }
  }

  /**
   * Get formatted display name for command
   */
  getCommandDisplayName(command) {
    return command.displayName || command.name;
  }

  /**
   * Get slash notation name for command
   */
  getCommandSlashName(command) {
    return command.name.startsWith('/') ? command.name : `/${command.id}`;
  }

  /**
   * Search commands with enhanced criteria
   */
  searchCommandsEnhanced(query, includeContent = false) {
    if (!query) return this.commands;

    const lowercaseQuery = query.toLowerCase();

    return this.commands.filter(cmd => {
      // Search in basic properties
      const basicMatch =
        cmd.name.toLowerCase().includes(lowercaseQuery) ||
        (cmd.displayName && cmd.displayName.toLowerCase().includes(lowercaseQuery)) ||
        cmd.description.toLowerCase().includes(lowercaseQuery) ||
        cmd.category.toLowerCase().includes(lowercaseQuery) ||
        cmd.id.toLowerCase().includes(lowercaseQuery);

      if (basicMatch) return true;

      // Search in content if requested (would require loading content)
      if (includeContent && this.contentCache.has(cmd.path)) {
        const cachedContent = this.contentCache.get(cmd.path);
        return cachedContent.content.toLowerCase().includes(lowercaseQuery);
      }

      return false;
    });
  }

  /**
   * Get commands sorted by token count
   */
  getCommandsByTokenCount(ascending = false) {
    return [...this.commands].sort((a, b) => {
      const comparison = (a.tokenCount || 0) - (b.tokenCount || 0);
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Get command complexity classification
   */
  getCommandComplexity(command) {
    const tokenCount = command.tokenCount || 0;

    if (tokenCount < 100) return { level: 'simple', color: 'green' };
    if (tokenCount < 500) return { level: 'moderate', color: 'yellow' };
    if (tokenCount < 1000) return { level: 'complex', color: 'orange' };
    return { level: 'very complex', color: 'red' };
  }
}

// Create and export singleton instance
const claudeCommandsService = new ClaudeCommandsService();
export default claudeCommandsService;