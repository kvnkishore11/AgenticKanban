/**
 * @fileoverview Tests for ADWCreationService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock constants
vi.mock('../../constants/workItems.js', () => ({
  SDLC_STAGES: ['plan', 'implement', 'test', 'review', 'document']
}));

// Mock crypto.randomUUID for consistent testing
const mockRandomUUID = vi.fn(() => 'abcd1234-5678-90ab-cdef-1234567890ab');
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockRandomUUID
  },
  writable: true,
  configurable: true
});

import adwCreationService from '../adwCreationService.js';
import { SDLC_STAGES } from '../../constants/workItems.js';

describe('ADWCreationService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = adwCreationService;
  });

  afterEach(() => {
    service.adwConfigurations.clear();
  });

  describe('generateAdwId', () => {
    it('should generate unique ADW ID automatically', () => {
      const taskData = { description: 'Test task' };

      const adwId = service.generateAdwId(taskData);

      expect(adwId).toBeTruthy();
      expect(adwId.length).toBe(8);
    });

    it('should use custom ADW ID when provided', () => {
      const taskData = { description: 'Test task' };
      const customId = 'custom-adw-123';

      const adwId = service.generateAdwId(taskData, customId);

      expect(adwId).toBe(customId);
    });

    it('should validate custom ADW ID format', () => {
      const taskData = { description: 'Test task' };
      const invalidId = 'invalid id with spaces!';

      expect(() => {
        service.generateAdwId(taskData, invalidId);
      }).toThrow('Invalid ADW ID format');
    });

    it('should accept valid custom ADW ID with hyphens', () => {
      const taskData = { description: 'Test task' };
      const customId = 'valid-adw-id-123';

      const adwId = service.generateAdwId(taskData, customId);

      expect(adwId).toBe(customId);
    });

    it('should accept valid custom ADW ID with underscores', () => {
      const taskData = { description: 'Test task' };
      const customId = 'valid_adw_id_123';

      const adwId = service.generateAdwId(taskData, customId);

      expect(adwId).toBe(customId);
    });

    it('should trim whitespace from custom ADW ID', () => {
      const taskData = { description: 'Test task' };
      const customId = '  trimmed-id  ';

      const adwId = service.generateAdwId(taskData, customId);

      expect(adwId).toBe('trimmed-id');
    });

    it('should use crypto.randomUUID when available', () => {
      const taskData = { description: 'Test task' };

      const adwId = service.generateAdwId(taskData);

      expect(adwId).toBe('abcd1234');
      expect(mockRandomUUID).toHaveBeenCalled();
    });

    it('should fallback when crypto.randomUUID not available', () => {
      const originalCrypto = global.crypto;
      global.crypto = undefined;

      const taskData = { description: 'Test task' };
      const adwId = service.generateAdwId(taskData);

      expect(adwId).toBeTruthy();
      expect(adwId.length).toBe(8);

      global.crypto = originalCrypto;
    });
  });

  describe('validateAdwIdFormat', () => {
    it('should validate correct ADW ID', () => {
      expect(service.validateAdwIdFormat('abc123')).toBe(true);
      expect(service.validateAdwIdFormat('test-id-123')).toBe(true);
      expect(service.validateAdwIdFormat('test_id_123')).toBe(true);
      expect(service.validateAdwIdFormat('TestID123')).toBe(true);
    });

    it('should reject invalid ADW IDs', () => {
      expect(service.validateAdwIdFormat('invalid id')).toBe(false);
      expect(service.validateAdwIdFormat('invalid@id')).toBe(false);
      expect(service.validateAdwIdFormat('invalid.id')).toBe(false);
      expect(service.validateAdwIdFormat('')).toBe(false);
      expect(service.validateAdwIdFormat(null)).toBe(false);
    });

    it('should reject ADW IDs over 100 characters', () => {
      const longId = 'a'.repeat(101);
      expect(service.validateAdwIdFormat(longId)).toBe(false);
    });

    it('should accept ADW IDs up to 100 characters', () => {
      const maxLengthId = 'a'.repeat(100);
      expect(service.validateAdwIdFormat(maxLengthId)).toBe(true);
    });
  });

  describe('createAdwConfiguration', () => {
    it('should create complete ADW configuration', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        workItemType: 'feature',
        queuedStages: ['plan', 'implement'],
        images: []
      };

      const config = service.createAdwConfiguration(taskData);

      expect(config).toHaveProperty('adw_id');
      expect(config).toHaveProperty('workflow_name');
      expect(config).toHaveProperty('workspace_id', 'agentic-kanban');
      expect(config).toHaveProperty('task_metadata');
      expect(config).toHaveProperty('state');
      expect(config).toHaveProperty('worktree');
      expect(config).toHaveProperty('execution_context');
      expect(config).toHaveProperty('outputs');
      expect(config).toHaveProperty('created_at');
      expect(config).toHaveProperty('updated_at');
    });

    it('should generate title from description when not provided', () => {
      const taskData = {
        description: 'This is a long description that should be truncated to create a title',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);

      expect(config.task_metadata.title).toBeTruthy();
      expect(config.task_metadata.title.length).toBeLessThanOrEqual(53); // 50 + '...'
    });

    it('should store configuration for future reference', () => {
      const taskData = {
        description: 'Test task',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);

      expect(service.adwConfigurations.has(config.adw_id)).toBe(true);
      expect(service.adwConfigurations.get(config.adw_id)).toEqual(config);
    });

    it('should include project context in state', () => {
      const taskData = {
        description: 'Test task',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const projectContext = {
        name: 'Test Project',
        path: '/path/to/project'
      };

      const config = service.createAdwConfiguration(taskData, projectContext);

      expect(config.state.workspace.project_name).toBe('Test Project');
      expect(config.state.workspace.project_path).toBe('/path/to/project');
    });
  });

  describe('generateWorkflowName', () => {
    it('should generate adw_general_iso for empty stages', () => {
      const workflowName = service.generateWorkflowName([]);

      expect(workflowName).toBe('adw_general_iso');
    });

    it('should generate adw_sdlc_iso when all SDLC stages present', () => {
      const workflowName = service.generateWorkflowName([
        'plan', 'implement', 'test', 'review', 'document'
      ]);

      expect(workflowName).toBe('adw_sdlc_iso');
    });

    it('should generate adw_sdlc_iso even with additional stages', () => {
      const workflowName = service.generateWorkflowName([
        'plan', 'implement', 'test', 'review', 'document', 'pr'
      ]);

      expect(workflowName).toBe('adw_sdlc_iso');
    });

    it('should map stage names correctly', () => {
      const workflowName = service.generateWorkflowName(['plan', 'build']);

      expect(workflowName).toBe('adw_plan_build_iso');
    });

    it('should handle implement stage mapping to build', () => {
      const workflowName = service.generateWorkflowName(['implement']);

      expect(workflowName).toBe('adw_build_iso');
    });

    it('should remove duplicate stages', () => {
      const workflowName = service.generateWorkflowName(['plan', 'plan', 'test']);

      expect(workflowName).toBe('adw_plan_test_iso');
    });

    it('should generate workflow for partial SDLC stages', () => {
      const workflowName = service.generateWorkflowName(['plan', 'test']);

      expect(workflowName).toBe('adw_plan_test_iso');
    });
  });

  describe('createStateConfiguration', () => {
    it('should create complete state configuration', () => {
      const taskData = {
        id: 'task-1',
        title: 'Test',
        description: 'Test description',
        workItemType: 'feature',
        queuedStages: ['plan', 'implement']
      };

      const state = service.createStateConfiguration(taskData, {});

      expect(state).toHaveProperty('version', '1.0.0');
      expect(state).toHaveProperty('workspace');
      expect(state).toHaveProperty('task');
      expect(state).toHaveProperty('workflow');
      expect(state).toHaveProperty('context');
      expect(state).toHaveProperty('tracking');
      expect(state).toHaveProperty('outputs');
    });

    it('should include execution plan in workflow', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: ['plan', 'implement']
      };

      const state = service.createStateConfiguration(taskData, {});

      expect(state.workflow.execution_plan).toHaveLength(2);
      expect(state.workflow.execution_plan[0]).toHaveProperty('stage', 'plan');
      expect(state.workflow.execution_plan[1]).toHaveProperty('stage', 'implement');
    });

    it('should set default values when fields missing', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: []
      };

      const state = service.createStateConfiguration(taskData, {});

      expect(state.task.priority).toBe('medium');
      expect(state.task.assignee).toBe('ai-agent');
      expect(state.task.labels).toEqual([]);
    });
  });

  describe('generateExecutionPlan', () => {
    it('should generate execution plan for stages', () => {
      const plan = service.generateExecutionPlan(['plan', 'implement', 'test']);

      expect(plan).toHaveLength(3);
      expect(plan[0].order).toBe(1);
      expect(plan[0].stage).toBe('plan');
      expect(plan[1].order).toBe(2);
      expect(plan[2].order).toBe(3);
    });

    it('should include substages for each stage', () => {
      const plan = service.generateExecutionPlan(['plan']);

      expect(plan[0].substages).toEqual(['analyze', 'design', 'breakdown']);
    });

    it('should set dependencies correctly', () => {
      const plan = service.generateExecutionPlan(['plan', 'implement', 'test']);

      expect(plan[0].dependencies).toEqual([]);
      expect(plan[1].dependencies).toEqual(['plan']);
      expect(plan[2].dependencies).toEqual(['implement']);
    });

    it('should handle unknown stages with defaults', () => {
      const plan = service.generateExecutionPlan(['unknown-stage']);

      expect(plan[0]).toHaveProperty('stage', 'unknown-stage');
      expect(plan[0].substages).toEqual(['initializing', 'executing', 'completed']);
    });
  });

  describe('getModelSetForWorkItem', () => {
    it('should return heavy for features', () => {
      expect(service.getModelSetForWorkItem('feature')).toBe('heavy');
    });

    it('should return base for bugs', () => {
      expect(service.getModelSetForWorkItem('bug')).toBe('base');
    });

    it('should return base for chores', () => {
      expect(service.getModelSetForWorkItem('chore')).toBe('base');
    });

    it('should return base for patches', () => {
      expect(service.getModelSetForWorkItem('patch')).toBe('base');
    });

    it('should return base for unknown types', () => {
      expect(service.getModelSetForWorkItem('unknown')).toBe('base');
    });
  });

  describe('getTimeoutForWorkflow', () => {
    it('should calculate timeout based on stages', () => {
      const timeout = service.getTimeoutForWorkflow(['plan', 'implement', 'test']);

      expect(timeout).toBeGreaterThan(30);
      expect(timeout).toBeLessThanOrEqual(480);
    });

    it('should cap timeout at 8 hours (480 minutes)', () => {
      const manyStages = Array(20).fill('implement');
      const timeout = service.getTimeoutForWorkflow(manyStages);

      expect(timeout).toBe(480);
    });

    it('should return base timeout for empty stages', () => {
      const timeout = service.getTimeoutForWorkflow([]);

      expect(timeout).toBe(30);
    });
  });

  describe('generateTitleFromDescription', () => {
    it('should use first sentence when short', () => {
      const title = service.generateTitleFromDescription('Short description.');

      expect(title).toBe('Short description');
    });

    it('should truncate long descriptions', () => {
      const longDesc = 'This is a very long description that exceeds the maximum length allowed for a title';
      const title = service.generateTitleFromDescription(longDesc);

      expect(title.length).toBeLessThanOrEqual(53);
      expect(title).toContain('...');
    });

    it('should handle descriptions without periods', () => {
      const title = service.generateTitleFromDescription('Description without period');

      expect(title).toBeTruthy();
    });

    it('should return default for empty description', () => {
      const title = service.generateTitleFromDescription('');

      expect(title).toBe('Untitled Task');
    });

    it('should return default for null description', () => {
      const title = service.generateTitleFromDescription(null);

      expect(title).toBe('Untitled Task');
    });
  });

  describe('updateAdwConfiguration', () => {
    it('should update existing configuration', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);
      const updates = {
        task_metadata: {
          ...config.task_metadata,
          title: 'Updated Title'
        }
      };

      const updated = service.updateAdwConfiguration(config.adw_id, updates);

      expect(updated.task_metadata.title).toBe('Updated Title');
      expect(updated).toHaveProperty('updated_at');
    });

    it('should throw error for non-existent configuration', () => {
      expect(() => {
        service.updateAdwConfiguration('non-existent', {});
      }).toThrow('ADW configuration not found');
    });
  });

  describe('getAdwConfiguration', () => {
    it('should retrieve configuration by ID', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);
      const retrieved = service.getAdwConfiguration(config.adw_id);

      expect(retrieved).toEqual(config);
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = service.getAdwConfiguration('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllAdwConfigurations', () => {
    it('should return all configurations', () => {
      // Clear any existing configurations first
      service.adwConfigurations.clear();

      // Create unique IDs for each task to avoid collision
      let callCount = 0;
      mockRandomUUID.mockImplementation(() => {
        callCount++;
        return `abcd${callCount}234-5678-90ab-cdef-1234567890ab`;
      });

      const taskData1 = { description: 'Test 1', workItemType: 'feature', queuedStages: ['plan'] };
      const taskData2 = { description: 'Test 2', workItemType: 'bug', queuedStages: ['test'] };

      service.createAdwConfiguration(taskData1);
      service.createAdwConfiguration(taskData2);

      const all = service.getAllAdwConfigurations();

      expect(all).toHaveLength(2);
    });

    it('should return empty array when no configurations', () => {
      const all = service.getAllAdwConfigurations();

      expect(all).toEqual([]);
    });
  });

  describe('deleteAdwConfiguration', () => {
    it('should delete configuration by ID', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);
      const result = service.deleteAdwConfiguration(config.adw_id);

      expect(result).toBe(true);
      expect(service.adwConfigurations.has(config.adw_id)).toBe(false);
    });

    it('should return false for non-existent ID', () => {
      const result = service.deleteAdwConfiguration('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('createTriggerPayload', () => {
    it('should create trigger payload from config', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);
      const payload = service.createTriggerPayload(config);

      expect(payload).toHaveProperty('adw_id', config.adw_id);
      expect(payload).toHaveProperty('workflow_name', config.workflow_name);
      expect(payload).toHaveProperty('workspace_id', config.workspace_id);
      expect(payload).toHaveProperty('state');
      expect(payload).toHaveProperty('metadata');
    });

    it('should accept options to override values', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);
      const options = {
        model_set: 'custom',
        issue_number: 123,
        trigger_reason: 'Manual trigger'
      };

      const payload = service.createTriggerPayload(config, options);

      expect(payload.model_set).toBe('custom');
      expect(payload.issue_number).toBe(123);
      expect(payload.trigger_reason).toBe('Manual trigger');
    });
  });

  describe('validateAdwConfiguration', () => {
    it('should validate correct configuration', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);
      const validation = service.validateAdwConfiguration(config);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject configuration without ADW ID', () => {
      const config = {
        workflow_name: 'test',
        task_metadata: { description: 'test' },
        state: {}
      };

      const validation = service.validateAdwConfiguration(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('ADW ID is required');
    });

    it('should reject configuration without workflow name', () => {
      const config = {
        adw_id: 'test',
        task_metadata: { description: 'test' },
        state: {}
      };

      const validation = service.validateAdwConfiguration(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Workflow name is required');
    });

    it('should reject configuration without task description', () => {
      const config = {
        adw_id: 'test',
        workflow_name: 'test',
        task_metadata: {},
        state: {}
      };

      const validation = service.validateAdwConfiguration(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Task description is required');
    });

    it('should reject configuration without state', () => {
      const config = {
        adw_id: 'test',
        workflow_name: 'test',
        task_metadata: { description: 'test' }
      };

      const validation = service.validateAdwConfiguration(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('State configuration is required');
    });
  });

  describe('exportConfiguration', () => {
    it('should export configuration with metadata', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);
      const exported = service.exportConfiguration(config.adw_id);

      expect(exported).toHaveProperty('exported_at');
      expect(exported).toHaveProperty('version', '1.0.0');
      expect(exported.adw_id).toBe(config.adw_id);
    });

    it('should throw error for non-existent configuration', () => {
      expect(() => {
        service.exportConfiguration('non-existent');
      }).toThrow('ADW configuration not found');
    });
  });

  describe('importConfiguration', () => {
    it('should import valid configuration', () => {
      const taskData = {
        description: 'Test',
        workItemType: 'feature',
        queuedStages: ['plan']
      };

      const config = service.createAdwConfiguration(taskData);
      const exported = service.exportConfiguration(config.adw_id);

      service.deleteAdwConfiguration(config.adw_id);

      const imported = service.importConfiguration(exported);

      expect(imported.adw_id).toBe(config.adw_id);
      expect(service.adwConfigurations.has(config.adw_id)).toBe(true);
    });

    it('should reject invalid configuration', () => {
      const invalidConfig = {
        adw_id: 'test'
        // Missing required fields
      };

      expect(() => {
        service.importConfiguration(invalidConfig);
      }).toThrow('Invalid ADW configuration');
    });
  });
});
