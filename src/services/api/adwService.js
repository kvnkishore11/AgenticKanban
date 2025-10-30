/**
 * ADW (AI Developer Workflow) Service
 * Handles pipeline configurations, discovery, and management
 */

class ADWService {
  constructor() {
    this.defaultPipelines = [
      {
        id: 'full-stack',
        name: 'Full Stack Development',
        description: 'Complete development workflow with all stages',
        stages: ['plan', 'build', 'test', 'review', 'document', 'pr'],
        category: 'development',
        estimatedDuration: '2-5 days',
        requirements: [],
        substages: {
          plan: ['analyze', 'design', 'breakdown'],
          build: ['setup', 'implement', 'integrate'],
          test: ['unit', 'integration', 'e2e'],
          review: ['code-review', 'security-check', 'performance'],
          document: ['api-docs', 'user-guide', 'changelog'],
          pr: ['create', 'review', 'merge'],
        },
      },
      {
        id: 'frontend-only',
        name: 'Frontend Only',
        description: 'UI/UX focused development workflow',
        stages: ['plan', 'build', 'test', 'review', 'pr'],
        category: 'frontend',
        estimatedDuration: '1-3 days',
        requirements: [],
        substages: {
          plan: ['wireframe', 'design-system', 'component-tree'],
          build: ['components', 'styling', 'interactions'],
          test: ['component-tests', 'visual-regression', 'accessibility'],
          review: ['design-review', 'usability-check'],
          pr: ['create', 'review', 'merge'],
        },
      },
      {
        id: 'backend-only',
        name: 'Backend Only',
        description: 'API and server-side focused workflow',
        stages: ['plan', 'build', 'test', 'review', 'document', 'pr'],
        category: 'backend',
        estimatedDuration: '1-4 days',
        requirements: [],
        substages: {
          plan: ['api-design', 'data-model', 'architecture'],
          build: ['endpoints', 'services', 'database'],
          test: ['unit', 'integration', 'load'],
          review: ['security-audit', 'performance-review'],
          document: ['api-spec', 'deployment-guide'],
          pr: ['create', 'review', 'merge'],
        },
      },
      {
        id: 'hotfix',
        name: 'Hotfix',
        description: 'Quick fix workflow for urgent issues',
        stages: ['build', 'test', 'pr'],
        category: 'maintenance',
        estimatedDuration: '1-6 hours',
        requirements: [],
        substages: {
          build: ['identify', 'fix', 'verify'],
          test: ['regression', 'smoke'],
          pr: ['urgent-review', 'merge'],
        },
      },
      {
        id: 'research',
        name: 'Research & Analysis',
        description: 'Investigation and analysis workflow',
        stages: ['plan', 'build', 'document'],
        category: 'research',
        estimatedDuration: '1-2 days',
        requirements: [],
        substages: {
          plan: ['scope', 'methodology', 'resources'],
          build: ['investigate', 'experiment', 'analyze'],
          document: ['findings', 'recommendations', 'report'],
        },
      },
      {
        id: 'refactor',
        name: 'Code Refactoring',
        description: 'Code improvement and optimization workflow',
        stages: ['plan', 'build', 'test', 'review', 'pr'],
        category: 'maintenance',
        estimatedDuration: '1-3 days',
        requirements: [],
        substages: {
          plan: ['audit', 'strategy', 'scope'],
          build: ['refactor', 'optimize', 'cleanup'],
          test: ['regression', 'performance'],
          review: ['quality-check', 'impact-analysis'],
          pr: ['create', 'review', 'merge'],
        },
      },
    ];

    this.customPipelines = [];
  }

  /**
   * Get all available pipelines (default + custom)
   */
  getAllPipelines() {
    return [...this.defaultPipelines, ...this.customPipelines];
  }

  /**
   * Get pipeline by ID
   */
  getPipelineById(pipelineId) {
    return this.getAllPipelines().find(pipeline => pipeline.id === pipelineId);
  }

  /**
   * Get pipelines by category
   */
  getPipelinesByCategory(category) {
    return this.getAllPipelines().filter(pipeline => pipeline.category === category);
  }

  /**
   * Validate pipeline configuration
   */
  validatePipeline(pipeline) {
    const errors = [];

    if (!pipeline.id) {
      errors.push('Pipeline ID is required');
    }

    if (!pipeline.name) {
      errors.push('Pipeline name is required');
    }

    if (!pipeline.stages || !Array.isArray(pipeline.stages) || pipeline.stages.length === 0) {
      errors.push('Pipeline must have at least one stage');
    }

    // Validate stage names
    const validStages = ['plan', 'build', 'test', 'review', 'document', 'pr', 'errored'];
    const invalidStages = pipeline.stages?.filter(stage => !validStages.includes(stage));
    if (invalidStages && invalidStages.length > 0) {
      errors.push(`Invalid stages: ${invalidStages.join(', ')}`);
    }

    // Validate substages
    if (pipeline.substages) {
      for (const [stage, substages] of Object.entries(pipeline.substages)) {
        if (!Array.isArray(substages) || substages.length === 0) {
          errors.push(`Stage '${stage}' must have at least one substage`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create custom pipeline
   */
  createCustomPipeline(pipelineData) {
    const validation = this.validatePipeline(pipelineData);
    if (!validation.isValid) {
      throw new Error(`Invalid pipeline: ${validation.errors.join(', ')}`);
    }

    // Check for duplicate IDs
    if (this.getPipelineById(pipelineData.id)) {
      throw new Error(`Pipeline with ID '${pipelineData.id}' already exists`);
    }

    const newPipeline = {
      ...pipelineData,
      category: pipelineData.category || 'custom',
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    this.customPipelines.push(newPipeline);
    return newPipeline;
  }

  /**
   * Update custom pipeline
   */
  updateCustomPipeline(pipelineId, updates) {
    const pipelineIndex = this.customPipelines.findIndex(p => p.id === pipelineId);
    if (pipelineIndex === -1) {
      throw new Error(`Custom pipeline '${pipelineId}' not found`);
    }

    const updatedPipeline = {
      ...this.customPipelines[pipelineIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const validation = this.validatePipeline(updatedPipeline);
    if (!validation.isValid) {
      throw new Error(`Invalid pipeline: ${validation.errors.join(', ')}`);
    }

    this.customPipelines[pipelineIndex] = updatedPipeline;
    return updatedPipeline;
  }

  /**
   * Delete custom pipeline
   */
  deleteCustomPipeline(pipelineId) {
    const pipelineIndex = this.customPipelines.findIndex(p => p.id === pipelineId);
    if (pipelineIndex === -1) {
      throw new Error(`Custom pipeline '${pipelineId}' not found`);
    }

    return this.customPipelines.splice(pipelineIndex, 1)[0];
  }

  /**
   * Get next stage in pipeline
   */
  getNextStage(pipelineId, currentStage) {
    const pipeline = this.getPipelineById(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`);
    }

    const currentIndex = pipeline.stages.indexOf(currentStage);
    if (currentIndex === -1) {
      throw new Error(`Stage '${currentStage}' not found in pipeline '${pipelineId}'`);
    }

    if (currentIndex < pipeline.stages.length - 1) {
      return pipeline.stages[currentIndex + 1];
    }

    return null; // Last stage
  }

  /**
   * Get previous stage in pipeline
   */
  getPreviousStage(pipelineId, currentStage) {
    const pipeline = this.getPipelineById(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`);
    }

    const currentIndex = pipeline.stages.indexOf(currentStage);
    if (currentIndex === -1) {
      throw new Error(`Stage '${currentStage}' not found in pipeline '${pipelineId}'`);
    }

    if (currentIndex > 0) {
      return pipeline.stages[currentIndex - 1];
    }

    return null; // First stage
  }

  /**
   * Get substages for a stage in a pipeline
   */
  getSubstages(pipelineId, stage) {
    const pipeline = this.getPipelineById(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`);
    }

    return pipeline.substages?.[stage] || ['initializing', 'in-progress', 'completed'];
  }

  /**
   * Check if stage is valid for pipeline
   */
  isValidStage(pipelineId, stage) {
    const pipeline = this.getPipelineById(pipelineId);
    return pipeline ? pipeline.stages.includes(stage) : false;
  }

  /**
   * Get pipeline progress for a task
   */
  calculatePipelineProgress(pipelineId, currentStage, currentSubstage = null) {
    const pipeline = this.getPipelineById(pipelineId);
    if (!pipeline) {
      return 0;
    }

    const totalStages = pipeline.stages.length;
    const currentStageIndex = pipeline.stages.indexOf(currentStage);

    if (currentStageIndex === -1) {
      return 0;
    }

    // Base progress (completed stages)
    let progress = (currentStageIndex / totalStages) * 100;

    // Add progress within current stage
    if (currentSubstage) {
      const substages = this.getSubstages(pipelineId, currentStage);
      const substageIndex = substages.indexOf(currentSubstage);
      if (substageIndex >= 0) {
        const substageProgress = ((substageIndex + 1) / substages.length) * (100 / totalStages);
        progress += substageProgress;
      }
    }

    return Math.min(Math.round(progress), 100);
  }

  /**
   * Discover pipelines for project (dynamic approach)
   */
  async discoverProjectPipelines() {
    // Dynamic pipeline discovery - no longer requires specific directory structures
    // ADW configurations are created on-demand based on task requirements

    const projectPipelines = [...this.defaultPipelines];

    // Return available pipelines for dynamic workflow creation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          discovered: projectPipelines,
          approach: 'dynamic',
          description: 'ADW workflows created dynamically based on task requirements',
        });
      }, 500);
    });
  }

  /**
   * Export pipeline configuration
   */
  exportPipeline(pipelineId) {
    const pipeline = this.getPipelineById(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`);
    }

    return {
      ...pipeline,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  /**
   * Import pipeline configuration
   */
  importPipeline(pipelineConfig) {
    const validation = this.validatePipeline(pipelineConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid pipeline: ${validation.errors.join(', ')}`);
    }

    // Remove export metadata
    const { exportedAt: _exportedAt, version: _version, ...cleanPipeline } = pipelineConfig;

    return this.createCustomPipeline({
      ...cleanPipeline,
      id: `${cleanPipeline.id}-imported-${Date.now()}`, // Avoid ID conflicts
    });
  }
}

// Create and export singleton instance
const adwService = new ADWService();
export default adwService;