/**
 * TAC-7 Compatible ADW Creation Service
 * Handles dynamic ADW creation without requiring specific project structures
 * Implements worktree architecture and state.json management patterns
 */

import { SDLC_STAGES } from '../constants/workItems.js';

class ADWCreationService {
  constructor() {
    this.adwConfigurations = new Map();
    this.workspaceId = 'agentic-kanban';
  }

  /**
   * Generate a unique ADW ID for a task or return custom ADW ID if provided
   */
  generateAdwId(taskData, customAdwId = null) {
    // If custom ADW ID is provided and valid, use it
    if (customAdwId && customAdwId.trim()) {
      const trimmedId = customAdwId.trim();
      // Validate custom ADW ID format
      if (this.validateAdwIdFormat(trimmedId)) {
        return trimmedId;
      } else {
        throw new Error(`Invalid ADW ID format: ${trimmedId}. Must contain only alphanumeric characters, hyphens, and underscores.`);
      }
    }

    // Generate automatic ADW ID if no custom ID provided
    // Use same format as backend: 8-character UUID (first 8 chars of UUID)
    // Backend uses: str(uuid.uuid4())[:8]
    try {
      // Try using Web Crypto API (available in modern browsers)
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID().substring(0, 8);
      }
    } catch (error) {
      console.warn('[ADWCreationService] crypto.randomUUID() not available, using fallback');
    }

    // Fallback: generate 8 random hex characters
    return Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Validate ADW ID format - alphanumeric characters, hyphens, and underscores only
   */
  validateAdwIdFormat(adwId) {
    if (!adwId || typeof adwId !== 'string') {
      return false;
    }

    // Allow alphanumeric characters, hyphens, and underscores
    // Must be between 1 and 100 characters
    const validPattern = /^[a-zA-Z0-9_-]{1,100}$/;
    return validPattern.test(adwId);
  }

  /**
   * Create dynamic ADW configuration based on task requirements
   */
  createAdwConfiguration(taskData, projectContext = {}) {
    const adwId = this.generateAdwId(taskData, taskData.customAdwId);

    // Generate workflow name based on queued stages
    const workflowName = this.generateWorkflowName(taskData.queuedStages || []);

    // Create state.json structure following TAC-7 patterns
    const stateConfig = this.createStateConfiguration(taskData, projectContext);

    // Generate ADW configuration
    const adwConfig = {
      adw_id: adwId,
      workflow_name: workflowName,
      workspace_id: this.workspaceId,
      task_metadata: {
        title: taskData.title || this.generateTitleFromDescription(taskData.description),
        description: taskData.description,
        work_item_type: taskData.workItemType,
        queued_stages: taskData.queuedStages || [],
        images: taskData.images || [],
        created_at: new Date().toISOString(),
      },
      state: stateConfig,
      worktree: {
        enabled: true,
        base_branch: 'main',
        branch_name: `feature/${adwId}`,
        isolation_level: 'full',
      },
      execution_context: {
        model_set: this.getModelSetForWorkItem(taskData.workItemType),
        timeout_minutes: this.getTimeoutForWorkflow(taskData.queuedStages),
        retry_attempts: 3,
        parallel_execution: false,
      },
      outputs: {
        logs_path: `logs/${adwId}`,
        artifacts_path: `artifacts/${adwId}`,
        state_file: `state/${adwId}.json`,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store configuration for future reference
    this.adwConfigurations.set(adwId, adwConfig);

    return adwConfig;
  }

  /**
   * Generate workflow name from queued stages
   * Special behavior: When all SDLC stages (plan, implement, test, review, document) are selected,
   * the system automatically maps to the adw_sdlc_iso workflow for comprehensive SDLC automation
   */
  generateWorkflowName(queuedStages) {
    if (!queuedStages || queuedStages.length === 0) {
      return 'adw_general_iso';
    }

    // Check if all SDLC stages are present (regardless of order or additional stages)
    // This enables automatic mapping to the comprehensive adw_sdlc_iso workflow
    const hasAllSdlcStages = SDLC_STAGES.every(stage => queuedStages.includes(stage));

    // If all SDLC stages are present, map to adw_sdlc_iso
    // Additional stages (like 'pr') are allowed and won't prevent the mapping
    if (hasAllSdlcStages) {
      return 'adw_sdlc_iso';
    }

    // Map stage names to ADW workflow conventions
    const stageMapping = {
      'plan': 'plan',
      'implement': 'build',
      'build': 'build',
      'test': 'test',
      'review': 'review',
      'document': 'document',
      'pr': 'ship'
    };

    const mappedStages = queuedStages
      .map(stage => stageMapping[stage] || stage)
      .filter((stage, index, self) => self.indexOf(stage) === index); // Remove duplicates

    return `adw_${mappedStages.join('_')}_iso`;
  }

  /**
   * Create state.json configuration following TAC-7 patterns
   */
  createStateConfiguration(taskData, projectContext) {
    return {
      version: '1.0.0',
      workspace: {
        id: this.workspaceId,
        type: 'kanban_task',
        project_path: projectContext.path || '/default/project/path',
        project_name: projectContext.name || 'Unknown Project',
      },
      task: {
        id: taskData.id || null,
        title: taskData.title || this.generateTitleFromDescription(taskData.description),
        description: taskData.description,
        work_item_type: taskData.workItemType,
        priority: taskData.priority || 'medium',
        labels: taskData.labels || [],
        assignee: taskData.assignee || 'ai-agent',
      },
      workflow: {
        stages: taskData.queuedStages || [],
        current_stage: 'backlog',
        current_substage: 'initializing',
        progress_percent: 0,
        execution_plan: this.generateExecutionPlan(taskData.queuedStages),
        stageModelPreferences: taskData.stageModelPreferences || {}, // Per-stage model selection
      },
      context: {
        images: taskData.images || [],
        attachments: taskData.attachments || [],
        environment: 'development',
        dependencies: [],
        constraints: [],
      },
      tracking: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        status: 'pending',
        error_count: 0,
        retry_count: 0,
      },
      outputs: {
        artifacts: [],
        logs: [],
        metrics: {},
        results: {},
      }
    };
  }

  /**
   * Generate execution plan for workflow stages
   */
  generateExecutionPlan(queuedStages) {
    const stageDefinitions = {
      plan: {
        name: 'Planning',
        description: 'Analyze requirements and create implementation plan',
        substages: ['analyze', 'design', 'breakdown'],
        estimated_duration: '30-60 minutes',
      },
      implement: {
        name: 'Implementation',
        description: 'Build and implement the solution',
        substages: ['setup', 'code', 'integrate'],
        estimated_duration: '1-4 hours',
      },
      build: {
        name: 'Build',
        description: 'Build and compile the solution',
        substages: ['setup', 'build', 'verify'],
        estimated_duration: '10-30 minutes',
      },
      test: {
        name: 'Testing',
        description: 'Test the implementation',
        substages: ['unit', 'integration', 'validation'],
        estimated_duration: '30-90 minutes',
      },
      review: {
        name: 'Review',
        description: 'Code review and quality assurance',
        substages: ['code_review', 'security_check', 'performance'],
        estimated_duration: '20-60 minutes',
      },
      document: {
        name: 'Documentation',
        description: 'Create documentation and guides',
        substages: ['api_docs', 'user_guide', 'changelog'],
        estimated_duration: '20-45 minutes',
      },
      pr: {
        name: 'Pull Request',
        description: 'Create and manage pull request',
        substages: ['create', 'review', 'merge'],
        estimated_duration: '15-30 minutes',
      },
    };

    return queuedStages.map((stage, index) => ({
      order: index + 1,
      stage: stage,
      ...stageDefinitions[stage] || {
        name: stage.charAt(0).toUpperCase() + stage.slice(1),
        description: `Execute ${stage} stage`,
        substages: ['initializing', 'executing', 'completed'],
        estimated_duration: '30-60 minutes',
      },
      dependencies: index > 0 ? [queuedStages[index - 1]] : [],
      parallel: false,
    }));
  }

  /**
   * Get model set based on work item type
   */
  getModelSetForWorkItem(workItemType) {
    const modelSetMap = {
      'feature': 'heavy',  // Complex features need heavy models
      'bug': 'base',       // Bug fixes are usually straightforward
      'chore': 'base',     // Chores are typically simple
      'patch': 'base'      // Patches are quick fixes
    };

    return modelSetMap[workItemType] || 'base';
  }

  /**
   * Get timeout based on workflow complexity
   */
  getTimeoutForWorkflow(queuedStages) {
    const baseTimeout = 30; // 30 minutes base
    const stageTimeouts = {
      'plan': 30,
      'implement': 120,
      'build': 15,
      'test': 45,
      'review': 30,
      'document': 30,
      'pr': 15,
    };

    const totalTimeout = queuedStages.reduce((total, stage) => {
      return total + (stageTimeouts[stage] || 30);
    }, baseTimeout);

    return Math.min(totalTimeout, 480); // Cap at 8 hours
  }

  /**
   * Generate title from description if not provided
   */
  generateTitleFromDescription(description) {
    if (!description) return 'Untitled Task';

    // Take first sentence or 50 characters, whichever is shorter
    const firstSentence = description.split('.')[0];
    const maxLength = 50;

    if (firstSentence.length <= maxLength) {
      return firstSentence.trim();
    }

    return description.substring(0, maxLength).trim() + '...';
  }

  /**
   * Update ADW configuration
   */
  updateAdwConfiguration(adwId, updates) {
    const config = this.adwConfigurations.get(adwId);
    if (!config) {
      throw new Error(`ADW configuration not found: ${adwId}`);
    }

    const updatedConfig = {
      ...config,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.adwConfigurations.set(adwId, updatedConfig);
    return updatedConfig;
  }

  /**
   * Get ADW configuration by ID
   */
  getAdwConfiguration(adwId) {
    return this.adwConfigurations.get(adwId);
  }

  /**
   * List all ADW configurations
   */
  getAllAdwConfigurations() {
    return Array.from(this.adwConfigurations.values());
  }

  /**
   * Delete ADW configuration
   */
  deleteAdwConfiguration(adwId) {
    return this.adwConfigurations.delete(adwId);
  }

  /**
   * Create ADW trigger payload for WebSocket
   */
  createTriggerPayload(adwConfig, options = {}) {
    return {
      adw_id: adwConfig.adw_id,
      workflow_name: adwConfig.workflow_name,
      workspace_id: adwConfig.workspace_id,
      model_set: options.model_set || adwConfig.execution_context.model_set,
      issue_number: options.issue_number || null,
      issue_type: options.issue_type || adwConfig.task_metadata.work_item_type || null,
      trigger_reason: options.trigger_reason || 'Kanban task execution',
      state: adwConfig.state,
      execution_context: {
        ...adwConfig.execution_context,
        ...options.execution_context,
      },
      metadata: {
        task_id: adwConfig.task_metadata.id,
        created_from: 'agentic_kanban',
        trigger_timestamp: new Date().toISOString(),
        ...options.metadata,
      },
    };
  }

  /**
   * Validate ADW configuration
   */
  validateAdwConfiguration(config) {
    const errors = [];

    if (!config.adw_id) {
      errors.push('ADW ID is required');
    }

    if (!config.workflow_name) {
      errors.push('Workflow name is required');
    }

    if (!config.task_metadata?.description) {
      errors.push('Task description is required');
    }

    if (!config.state) {
      errors.push('State configuration is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export ADW configuration for persistence
   */
  exportConfiguration(adwId) {
    const config = this.getAdwConfiguration(adwId);
    if (!config) {
      throw new Error(`ADW configuration not found: ${adwId}`);
    }

    return {
      ...config,
      exported_at: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  /**
   * Import ADW configuration
   */
  importConfiguration(configData) {
    const validation = this.validateAdwConfiguration(configData);
    if (!validation.isValid) {
      throw new Error(`Invalid ADW configuration: ${validation.errors.join(', ')}`);
    }

    this.adwConfigurations.set(configData.adw_id, configData);
    return configData;
  }
}

// Create and export singleton instance
const adwCreationService = new ADWCreationService();
export default adwCreationService;