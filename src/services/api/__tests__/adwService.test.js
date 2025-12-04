import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import adwService from '../adwService.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the workflowValidation module
vi.mock('../../../utils/workflowValidation.js', () => ({
  getNextStageInWorkflow: vi.fn((workflowName, currentStage) => {
    if (workflowName === 'adw_plan_build_iso') {
      const stages = { plan: 'build', build: 'test', test: null };
      return stages[currentStage] || null;
    }
    return null;
  }),
  isWorkflowComplete: vi.fn((workflowName, currentStage) => {
    if (workflowName === 'adw_plan_build_iso') {
      return currentStage === 'test';
    }
    return false;
  }),
}));

describe('ADWService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    global.fetch.mockReset();

    // Reset custom pipelines
    adwService.customPipelines = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Pipeline Management', () => {
    it('should return all default pipelines', () => {
      const pipelines = adwService.getAllPipelines();

      expect(pipelines).toBeDefined();
      expect(Array.isArray(pipelines)).toBe(true);
      expect(pipelines.length).toBeGreaterThan(0);

      // Check that default pipelines are included
      const pipelineIds = pipelines.map(p => p.id);
      expect(pipelineIds).toContain('full-stack');
      expect(pipelineIds).toContain('frontend-only');
      expect(pipelineIds).toContain('backend-only');
      expect(pipelineIds).toContain('hotfix');
      expect(pipelineIds).toContain('research');
      expect(pipelineIds).toContain('refactor');
    });

    it('should get pipeline by ID', () => {
      const pipeline = adwService.getPipelineById('full-stack');

      expect(pipeline).toBeDefined();
      expect(pipeline.id).toBe('full-stack');
      expect(pipeline.name).toBe('Full Stack Development');
      expect(pipeline.stages).toContain('plan');
      expect(pipeline.stages).toContain('build');
    });

    it('should return undefined for non-existent pipeline ID', () => {
      const pipeline = adwService.getPipelineById('non-existent');

      expect(pipeline).toBeUndefined();
    });

    it('should get pipelines by category', () => {
      const developmentPipelines = adwService.getPipelinesByCategory('development');

      expect(Array.isArray(developmentPipelines)).toBe(true);
      expect(developmentPipelines.length).toBeGreaterThan(0);
      expect(developmentPipelines[0].category).toBe('development');
    });

    it('should return empty array for non-existent category', () => {
      const pipelines = adwService.getPipelinesByCategory('non-existent');

      expect(Array.isArray(pipelines)).toBe(true);
      expect(pipelines.length).toBe(0);
    });
  });

  describe('Pipeline Validation', () => {
    it('should validate a valid pipeline', () => {
      const validPipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        stages: ['plan', 'build', 'test'],
        substages: {
          plan: ['analyze', 'design'],
          build: ['implement'],
          test: ['unit', 'integration'],
        },
      };

      const validation = adwService.validatePipeline(validPipeline);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for missing ID', () => {
      const invalidPipeline = {
        name: 'Test Pipeline',
        stages: ['plan', 'build'],
      };

      const validation = adwService.validatePipeline(invalidPipeline);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Pipeline ID is required');
    });

    it('should fail validation for missing name', () => {
      const invalidPipeline = {
        id: 'test-pipeline',
        stages: ['plan', 'build'],
      };

      const validation = adwService.validatePipeline(invalidPipeline);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Pipeline name is required');
    });

    it('should fail validation for missing stages', () => {
      const invalidPipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
      };

      const validation = adwService.validatePipeline(invalidPipeline);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Pipeline must have at least one stage');
    });

    it('should fail validation for empty stages array', () => {
      const invalidPipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        stages: [],
      };

      const validation = adwService.validatePipeline(invalidPipeline);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Pipeline must have at least one stage');
    });

    it('should fail validation for invalid stage names', () => {
      const invalidPipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        stages: ['plan', 'invalid-stage', 'build'],
      };

      const validation = adwService.validatePipeline(invalidPipeline);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Invalid stages:');
      expect(validation.errors[0]).toContain('invalid-stage');
    });

    it('should fail validation for empty substages', () => {
      const invalidPipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        stages: ['plan', 'build'],
        substages: {
          plan: [],
        },
      };

      const validation = adwService.validatePipeline(invalidPipeline);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Stage \'plan\' must have at least one substage');
    });
  });

  describe('Custom Pipeline Management', () => {
    it('should create a custom pipeline', () => {
      const customPipeline = {
        id: 'custom-pipeline',
        name: 'Custom Pipeline',
        description: 'Custom workflow',
        stages: ['plan', 'build'],
      };

      const result = adwService.createCustomPipeline(customPipeline);

      expect(result).toBeDefined();
      expect(result.id).toBe('custom-pipeline');
      expect(result.isCustom).toBe(true);
      expect(result.category).toBe('custom');
      expect(result.createdAt).toBeDefined();
    });

    it('should throw error for invalid custom pipeline', () => {
      const invalidPipeline = {
        name: 'Invalid Pipeline',
      };

      expect(() => {
        adwService.createCustomPipeline(invalidPipeline);
      }).toThrow('Invalid pipeline:');
    });

    it('should throw error for duplicate pipeline ID', () => {
      const customPipeline = {
        id: 'custom-pipeline',
        name: 'Custom Pipeline',
        stages: ['plan', 'build'],
      };

      adwService.createCustomPipeline(customPipeline);

      expect(() => {
        adwService.createCustomPipeline(customPipeline);
      }).toThrow('Pipeline with ID \'custom-pipeline\' already exists');
    });

    it('should update custom pipeline', () => {
      const customPipeline = {
        id: 'custom-pipeline',
        name: 'Custom Pipeline',
        stages: ['plan', 'build'],
      };

      adwService.createCustomPipeline(customPipeline);

      const updates = {
        name: 'Updated Custom Pipeline',
        description: 'Updated description',
      };

      const result = adwService.updateCustomPipeline('custom-pipeline', updates);

      expect(result.name).toBe('Updated Custom Pipeline');
      expect(result.description).toBe('Updated description');
      expect(result.updatedAt).toBeDefined();
    });

    it('should throw error when updating non-existent custom pipeline', () => {
      expect(() => {
        adwService.updateCustomPipeline('non-existent', { name: 'Updated' });
      }).toThrow('Custom pipeline \'non-existent\' not found');
    });

    it('should throw error when updating custom pipeline with invalid data', () => {
      const customPipeline = {
        id: 'custom-pipeline',
        name: 'Custom Pipeline',
        stages: ['plan', 'build'],
      };

      adwService.createCustomPipeline(customPipeline);

      expect(() => {
        adwService.updateCustomPipeline('custom-pipeline', { stages: [] });
      }).toThrow('Invalid pipeline:');
    });

    it('should delete custom pipeline', () => {
      const customPipeline = {
        id: 'custom-pipeline',
        name: 'Custom Pipeline',
        stages: ['plan', 'build'],
      };

      adwService.createCustomPipeline(customPipeline);

      const deleted = adwService.deleteCustomPipeline('custom-pipeline');

      expect(deleted.id).toBe('custom-pipeline');
      expect(adwService.getPipelineById('custom-pipeline')).toBeUndefined();
    });

    it('should throw error when deleting non-existent custom pipeline', () => {
      expect(() => {
        adwService.deleteCustomPipeline('non-existent');
      }).toThrow('Custom pipeline \'non-existent\' not found');
    });
  });

  describe('Pipeline Navigation', () => {
    it('should get next stage in pipeline', () => {
      const nextStage = adwService.getNextStage('full-stack', 'plan');

      expect(nextStage).toBe('build');
    });

    it('should return null for last stage', () => {
      const pipeline = adwService.getPipelineById('full-stack');
      const lastStage = pipeline.stages[pipeline.stages.length - 1];

      const nextStage = adwService.getNextStage('full-stack', lastStage);

      expect(nextStage).toBeNull();
    });

    it('should throw error for non-existent pipeline in getNextStage', () => {
      expect(() => {
        adwService.getNextStage('non-existent', 'plan');
      }).toThrow('Pipeline \'non-existent\' not found');
    });

    it('should throw error for invalid stage in getNextStage', () => {
      expect(() => {
        adwService.getNextStage('full-stack', 'invalid-stage');
      }).toThrow('Stage \'invalid-stage\' not found in pipeline \'full-stack\'');
    });

    it('should get previous stage in pipeline', () => {
      const prevStage = adwService.getPreviousStage('full-stack', 'build');

      expect(prevStage).toBe('plan');
    });

    it('should return null for first stage', () => {
      const pipeline = adwService.getPipelineById('full-stack');
      const firstStage = pipeline.stages[0];

      const prevStage = adwService.getPreviousStage('full-stack', firstStage);

      expect(prevStage).toBeNull();
    });

    it('should throw error for non-existent pipeline in getPreviousStage', () => {
      expect(() => {
        adwService.getPreviousStage('non-existent', 'build');
      }).toThrow('Pipeline \'non-existent\' not found');
    });

    it('should throw error for invalid stage in getPreviousStage', () => {
      expect(() => {
        adwService.getPreviousStage('full-stack', 'invalid-stage');
      }).toThrow('Stage \'invalid-stage\' not found in pipeline \'full-stack\'');
    });
  });

  describe('Workflow-Aware Navigation', () => {
    it('should get next stage for workflow', () => {
      const nextStage = adwService.getNextStageForWorkflow('adw_plan_build_iso', 'plan');

      expect(nextStage).toBe('build');
    });

    it('should return null when workflow is complete', () => {
      const nextStage = adwService.getNextStageForWorkflow('adw_plan_build_iso', 'test');

      expect(nextStage).toBeNull();
    });

    it('should return null for missing workflow name', () => {
      const nextStage = adwService.getNextStageForWorkflow(null, 'plan');

      expect(nextStage).toBeNull();
    });

    it('should return null for missing current stage', () => {
      const nextStage = adwService.getNextStageForWorkflow('adw_plan_build_iso', null);

      expect(nextStage).toBeNull();
    });

    it('should check if workflow is complete', () => {
      const isComplete = adwService.isWorkflowComplete('adw_plan_build_iso', 'test');

      expect(isComplete).toBe(true);
    });

    it('should check if workflow is not complete', () => {
      const isComplete = adwService.isWorkflowComplete('adw_plan_build_iso', 'plan');

      expect(isComplete).toBe(false);
    });

    it('should return false for missing workflow parameters', () => {
      expect(adwService.isWorkflowComplete(null, 'plan')).toBe(false);
      expect(adwService.isWorkflowComplete('adw_plan_build_iso', null)).toBe(false);
    });
  });

  describe('Substages', () => {
    it('should get substages for a stage', () => {
      const substages = adwService.getSubstages('full-stack', 'plan');

      expect(Array.isArray(substages)).toBe(true);
      expect(substages).toContain('analyze');
      expect(substages).toContain('design');
      expect(substages).toContain('breakdown');
    });

    it('should return default substages for stage without custom substages', () => {
      const customPipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        stages: ['plan', 'build'],
      };

      adwService.createCustomPipeline(customPipeline);

      const substages = adwService.getSubstages('test-pipeline', 'plan');

      expect(substages).toEqual(['initializing', 'in-progress', 'completed']);
    });

    it('should throw error for non-existent pipeline', () => {
      expect(() => {
        adwService.getSubstages('non-existent', 'plan');
      }).toThrow('Pipeline \'non-existent\' not found');
    });
  });

  describe('Stage Validation', () => {
    it('should validate stage exists in pipeline', () => {
      const isValid = adwService.isValidStage('full-stack', 'plan');

      expect(isValid).toBe(true);
    });

    it('should return false for invalid stage', () => {
      const isValid = adwService.isValidStage('full-stack', 'invalid-stage');

      expect(isValid).toBe(false);
    });

    it('should return false for non-existent pipeline', () => {
      const isValid = adwService.isValidStage('non-existent', 'plan');

      expect(isValid).toBe(false);
    });
  });

  describe('Pipeline Progress Calculation', () => {
    it('should calculate progress at start of pipeline', () => {
      const progress = adwService.calculatePipelineProgress('full-stack', 'plan');

      expect(progress).toBe(0);
    });

    it('should calculate progress in middle of pipeline', () => {
      const pipeline = adwService.getPipelineById('full-stack');
      const midStage = pipeline.stages[2]; // Third stage

      const progress = adwService.calculatePipelineProgress('full-stack', midStage);

      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });

    it('should include substage progress', () => {
      const progress = adwService.calculatePipelineProgress('full-stack', 'plan', 'design');

      expect(progress).toBeGreaterThan(0);
    });

    it('should return 0 for non-existent pipeline', () => {
      const progress = adwService.calculatePipelineProgress('non-existent', 'plan');

      expect(progress).toBe(0);
    });

    it('should return 0 for invalid stage', () => {
      const progress = adwService.calculatePipelineProgress('full-stack', 'invalid-stage');

      expect(progress).toBe(0);
    });

    it('should not exceed 100%', () => {
      const pipeline = adwService.getPipelineById('full-stack');
      const lastStage = pipeline.stages[pipeline.stages.length - 1];
      const lastSubstages = adwService.getSubstages('full-stack', lastStage);
      const lastSubstage = lastSubstages[lastSubstages.length - 1];

      const progress = adwService.calculatePipelineProgress('full-stack', lastStage, lastSubstage);

      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Pipeline Discovery', () => {
    it('should discover project pipelines', async () => {
      const result = await adwService.discoverProjectPipelines();

      expect(result).toBeDefined();
      expect(result.discovered).toBeDefined();
      expect(Array.isArray(result.discovered)).toBe(true);
      expect(result.approach).toBe('dynamic');
      expect(result.description).toContain('ADW workflows');
    });
  });

  describe('Pipeline Import/Export', () => {
    it('should export pipeline configuration', () => {
      const exported = adwService.exportPipeline('full-stack');

      expect(exported).toBeDefined();
      expect(exported.id).toBe('full-stack');
      expect(exported.exportedAt).toBeDefined();
      expect(exported.version).toBe('1.0.0');
    });

    it('should throw error when exporting non-existent pipeline', () => {
      expect(() => {
        adwService.exportPipeline('non-existent');
      }).toThrow('Pipeline \'non-existent\' not found');
    });

    it('should import pipeline configuration', () => {
      const pipelineConfig = {
        id: 'imported',
        name: 'Imported Pipeline',
        stages: ['plan', 'build'],
        exportedAt: '2025-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const imported = adwService.importPipeline(pipelineConfig);

      expect(imported).toBeDefined();
      expect(imported.id).toContain('imported-imported-');
      expect(imported.name).toBe('Imported Pipeline');
      expect(imported.exportedAt).toBeUndefined(); // Should be removed
      expect(imported.version).toBeUndefined(); // Should be removed
    });

    it('should throw error when importing invalid pipeline', () => {
      const invalidConfig = {
        name: 'Invalid Import',
      };

      expect(() => {
        adwService.importPipeline(invalidConfig);
      }).toThrow('Invalid pipeline:');
    });
  });

  describe('API Integration - Merge Operations', () => {
    it('should trigger merge successfully', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Merge triggered',
        adw_id: 'test-adw',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await adwService.triggerMerge('test-adw', 123);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/merge/trigger'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adw_id: 'test-adw', issue_number: 123 }),
        })
      );
    });

    it('should handle merge trigger error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Merge failed' }),
      });

      await expect(adwService.triggerMerge('test-adw', 123))
        .rejects.toThrow('Merge failed');
    });

    it('should handle merge trigger network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adwService.triggerMerge('test-adw', 123))
        .rejects.toThrow('Network error');
    });

    it('should get merge status successfully', async () => {
      const mockResponse = {
        status: 'in_progress',
        adw_id: 'test-adw',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await adwService.getMergeStatus('test-adw');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/merge/status/test-adw'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle merge status error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'ADW not found' }),
      });

      await expect(adwService.getMergeStatus('test-adw'))
        .rejects.toThrow('ADW not found');
    });
  });

  describe('API Integration - Worktree Deletion', () => {
    it('should delete worktree successfully', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Worktree deleted',
        adw_id: 'test-adw',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await adwService.deleteWorktree('test-adw');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/adws/test-adw'),
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle worktree deletion error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Worktree not found' }),
      });

      await expect(adwService.deleteWorktree('test-adw'))
        .rejects.toThrow('Worktree not found');
    });

    it('should handle worktree deletion network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adwService.deleteWorktree('test-adw'))
        .rejects.toThrow('Network error');
    });
  });

  describe('API Integration - Open Codebase', () => {
    it('should open codebase successfully using relative URL', async () => {
      const mockResponse = {
        success: true,
        adw_id: 'test1234',
        worktree_path: '/path/to/worktree',
        tmux_session: 'AgenticKanban',
        window_name: 'nvim-test1234',
        message: "Opened neovim in tmux session 'AgenticKanban' window 'nvim-test1234'",
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await adwService.openCodebase('test1234');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/codebase/open/test1234',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle codebase open error with detail message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'ADW not found' }),
      });

      await expect(adwService.openCodebase('test1234'))
        .rejects.toThrow('ADW not found');
    });

    it('should handle codebase open with non-JSON error response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); },
      });

      await expect(adwService.openCodebase('test1234'))
        .rejects.toThrow('Unknown error');
    });

    it('should handle codebase open network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adwService.openCodebase('test1234'))
        .rejects.toThrow('Network error');
    });
  });

  describe('API Integration - Open Worktree', () => {
    it('should open worktree successfully using relative URL', async () => {
      const mockResponse = {
        success: true,
        adw_id: 'test1234',
        worktree_path: '/path/to/worktree',
        tmux_session: 'AgenticKanban',
        window_name: 'term-test1234',
        wezterm_opened: true,
        message: "Opened terminal in tmux session 'AgenticKanban' window 'term-test1234'",
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await adwService.openWorktree('test1234');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/worktree/open/test1234',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle worktree open error with detail message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Worktree not found' }),
      });

      await expect(adwService.openWorktree('test1234'))
        .rejects.toThrow('Worktree not found');
    });

    it('should handle worktree open with non-JSON error response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => { throw new Error('Invalid JSON'); },
      });

      await expect(adwService.openWorktree('test1234'))
        .rejects.toThrow('Unknown error');
    });

    it('should handle worktree open network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adwService.openWorktree('test1234'))
        .rejects.toThrow('Network error');
    });
  });
});
