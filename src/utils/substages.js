/**
 * Substage definitions and progress tracking utilities
 * Based on ADW (AI Developer Workflow) patterns
 */

// Define substages for each stage in the pipeline
export const substageDefinitions = {
  plan: [
    {
      id: 'analyze',
      name: 'Analyze Requirements',
      description: 'Understanding and breaking down the task requirements',
      estimatedDuration: '10-30 minutes',
      outputs: ['requirements_analysis.md', 'task_breakdown.md'],
    },
    {
      id: 'design',
      name: 'Design Solution',
      description: 'Creating architectural and design plans',
      estimatedDuration: '20-60 minutes',
      outputs: ['design_document.md', 'architecture_diagram.md'],
    },
    {
      id: 'breakdown',
      name: 'Task Breakdown',
      description: 'Breaking down into actionable implementation steps',
      estimatedDuration: '10-20 minutes',
      outputs: ['implementation_plan.md', 'todo_list.md'],
    },
  ],

  build: [
    {
      id: 'setup',
      name: 'Environment Setup',
      description: 'Setting up development environment and dependencies',
      estimatedDuration: '5-15 minutes',
      outputs: ['environment_config', 'dependencies_installed'],
    },
    {
      id: 'implement',
      name: 'Implementation',
      description: 'Writing and developing the core functionality',
      estimatedDuration: '30-180 minutes',
      outputs: ['source_code', 'assets', 'configurations'],
    },
    {
      id: 'integrate',
      name: 'Integration',
      description: 'Integrating with existing systems and components',
      estimatedDuration: '15-60 minutes',
      outputs: ['integrated_system', 'updated_configurations'],
    },
  ],

  test: [
    {
      id: 'unit',
      name: 'Unit Testing',
      description: 'Testing individual components and functions',
      estimatedDuration: '20-60 minutes',
      outputs: ['unit_test_files', 'test_coverage_report'],
    },
    {
      id: 'integration',
      name: 'Integration Testing',
      description: 'Testing component interactions and data flow',
      estimatedDuration: '15-45 minutes',
      outputs: ['integration_test_files', 'api_test_results'],
    },
    {
      id: 'e2e',
      name: 'End-to-End Testing',
      description: 'Testing complete user workflows and scenarios',
      estimatedDuration: '20-90 minutes',
      outputs: ['e2e_test_files', 'user_flow_validation'],
    },
  ],

  review: [
    {
      id: 'code-review',
      name: 'Code Review',
      description: 'Reviewing code quality, standards, and best practices',
      estimatedDuration: '15-45 minutes',
      outputs: ['code_review_report', 'quality_metrics'],
    },
    {
      id: 'security-check',
      name: 'Security Review',
      description: 'Checking for security vulnerabilities and issues',
      estimatedDuration: '10-30 minutes',
      outputs: ['security_scan_report', 'vulnerability_assessment'],
    },
    {
      id: 'performance',
      name: 'Performance Review',
      description: 'Analyzing performance metrics and optimization opportunities',
      estimatedDuration: '10-30 minutes',
      outputs: ['performance_report', 'optimization_recommendations'],
    },
  ],

  document: [
    {
      id: 'api-docs',
      name: 'API Documentation',
      description: 'Documenting APIs, endpoints, and interfaces',
      estimatedDuration: '15-45 minutes',
      outputs: ['api_documentation', 'interface_specs'],
    },
    {
      id: 'user-guide',
      name: 'User Guide',
      description: 'Creating user-facing documentation and guides',
      estimatedDuration: '20-60 minutes',
      outputs: ['user_guide.md', 'tutorial_docs'],
    },
    {
      id: 'changelog',
      name: 'Changelog',
      description: 'Documenting changes, features, and version updates',
      estimatedDuration: '5-15 minutes',
      outputs: ['CHANGELOG.md', 'release_notes.md'],
    },
  ],

  pr: [
    {
      id: 'create',
      name: 'Create PR',
      description: 'Creating pull request with proper description and metadata',
      estimatedDuration: '5-15 minutes',
      outputs: ['pull_request', 'pr_template_filled'],
    },
    {
      id: 'review',
      name: 'PR Review',
      description: 'Code review process and feedback incorporation',
      estimatedDuration: '30-120 minutes',
      outputs: ['review_comments', 'approved_changes'],
    },
    {
      id: 'merge',
      name: 'Merge',
      description: 'Merging approved changes to main branch',
      estimatedDuration: '2-10 minutes',
      outputs: ['merged_commit', 'deployment_triggered'],
    },
  ],

  errored: [
    {
      id: 'identify',
      name: 'Error Identification',
      description: 'Identifying and categorizing the error or issue',
      estimatedDuration: '5-20 minutes',
      outputs: ['error_report', 'issue_classification'],
    },
    {
      id: 'debug',
      name: 'Debugging',
      description: 'Investigating root cause and debugging the issue',
      estimatedDuration: '15-120 minutes',
      outputs: ['debug_logs', 'root_cause_analysis'],
    },
    {
      id: 'resolve',
      name: 'Resolution',
      description: 'Implementing fix and validating solution',
      estimatedDuration: '10-60 minutes',
      outputs: ['fix_implementation', 'validation_results'],
    },
  ],
};

// State machine for substage progression
export const substageTransitions = {
  plan: {
    analyze: { next: 'design', canSkip: false },
    design: { next: 'breakdown', canSkip: true },
    breakdown: { next: null, canSkip: false }, // Move to next stage
  },
  build: {
    setup: { next: 'implement', canSkip: false },
    implement: { next: 'integrate', canSkip: true },
    integrate: { next: null, canSkip: false },
  },
  test: {
    unit: { next: 'integration', canSkip: false },
    integration: { next: 'e2e', canSkip: true },
    e2e: { next: null, canSkip: true },
  },
  review: {
    'code-review': { next: 'security-check', canSkip: false },
    'security-check': { next: 'performance', canSkip: true },
    performance: { next: null, canSkip: true },
  },
  document: {
    'api-docs': { next: 'user-guide', canSkip: true },
    'user-guide': { next: 'changelog', canSkip: true },
    changelog: { next: null, canSkip: false },
  },
  pr: {
    create: { next: 'review', canSkip: false },
    review: { next: 'merge', canSkip: false },
    merge: { next: null, canSkip: false },
  },
  errored: {
    identify: { next: 'debug', canSkip: false },
    debug: { next: 'resolve', canSkip: false },
    resolve: { next: null, canSkip: false }, // Usually returns to previous stage
  },
};

/**
 * Get substages for a given stage
 */
export const getSubstages = (stage) => {
  return substageDefinitions[stage] || [];
};

/**
 * Get substage by ID within a stage
 */
export const getSubstage = (stage, substageId) => {
  const substages = getSubstages(stage);
  return substages.find(s => s.id === substageId);
};

/**
 * Get next substage in the progression
 */
export const getNextSubstage = (stage, currentSubstageId) => {
  const transitions = substageTransitions[stage];
  if (!transitions || !transitions[currentSubstageId]) {
    return null;
  }

  const transition = transitions[currentSubstageId];
  if (!transition.next) {
    return null; // End of stage
  }

  return getSubstage(stage, transition.next);
};

/**
 * Check if a substage can be skipped
 */
export const canSkipSubstage = (stage, substageId) => {
  const transitions = substageTransitions[stage];
  return transitions?.[substageId]?.canSkip || false;
};

/**
 * Calculate progress within a stage based on current substage
 */
export const calculateStageProgress = (stage, currentSubstageId) => {
  const substages = getSubstages(stage);
  if (substages.length === 0) {
    return 0;
  }

  const currentIndex = substages.findIndex(s => s.id === currentSubstageId);
  if (currentIndex === -1) {
    return 0;
  }

  // Progress is based on completed substages
  return Math.round(((currentIndex + 1) / substages.length) * 100);
};

/**
 * Get all possible substage IDs for a stage
 */
export const getSubstageIds = (stage) => {
  return getSubstages(stage).map(s => s.id);
};

/**
 * Validate substage transition
 */
export const isValidTransition = (stage, fromSubstageId, toSubstageId) => {
  const transitions = substageTransitions[stage];
  if (!transitions) {
    return false;
  }

  // Allow moving to any later substage
  const substageIds = getSubstageIds(stage);
  const fromIndex = substageIds.indexOf(fromSubstageId);
  const toIndex = substageIds.indexOf(toSubstageId);

  return fromIndex < toIndex;
};

/**
 * Get estimated duration for a substage
 */
export const getSubstageDuration = (stage, substageId) => {
  const substage = getSubstage(stage, substageId);
  return substage?.estimatedDuration || 'Unknown';
};

/**
 * Get expected outputs for a substage
 */
export const getSubstageOutputs = (stage, substageId) => {
  const substage = getSubstage(stage, substageId);
  return substage?.outputs || [];
};

/**
 * Generate substage log entry
 */
export const createSubstageLog = (stage, substageId, status, message = null) => {
  const substage = getSubstage(stage, substageId);

  return {
    stage,
    substageId,
    substageName: substage?.name || substageId,
    status, // 'started', 'completed', 'failed', 'skipped'
    message: message || `${status.charAt(0).toUpperCase() + status.slice(1)} ${substage?.name || substageId}`,
    timestamp: new Date().toISOString(),
    progress: status === 'completed' ? 100 : status === 'started' ? 10 : 0,
  };
};

/**
 * Get visual indicator for substage status
 */
export const getSubstageStatusIcon = (status) => {
  const statusIcons = {
    pending: '⏳',
    started: '🔄',
    completed: '✅',
    failed: '❌',
    skipped: '⏭️',
  };

  return statusIcons[status] || '❓';
};

/**
 * Get color class for substage status
 */
export const getSubstageStatusColor = (status) => {
  const statusColors = {
    pending: 'text-gray-500',
    started: 'text-blue-500',
    completed: 'text-green-500',
    failed: 'text-red-500',
    skipped: 'text-yellow-500',
  };

  return statusColors[status] || 'text-gray-500';
};

/**
 * Simulate substage execution (for demo purposes)
 */
export const simulateSubstageExecution = (stage, substageId, onProgress) => {
  const substage = getSubstage(stage, substageId);
  if (!substage) {
    return Promise.reject(new Error(`Substage ${substageId} not found in stage ${stage}`));
  }

  return new Promise((resolve, reject) => {
    let progress = 0;
    const duration = Math.random() * 3000 + 1000; // 1-4 seconds
    const interval = 100; // Update every 100ms
    const increment = (interval / duration) * 100;

    onProgress?.(createSubstageLog(stage, substageId, 'started'));

    const timer = setInterval(() => {
      progress += increment;

      if (progress >= 100) {
        clearInterval(timer);
        onProgress?.(createSubstageLog(stage, substageId, 'completed'));
        resolve(substage);
      } else {
        onProgress?.({
          ...createSubstageLog(stage, substageId, 'started'),
          progress: Math.round(progress),
        });
      }
    }, interval);

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      setTimeout(() => {
        clearInterval(timer);
        onProgress?.(createSubstageLog(stage, substageId, 'failed', 'Simulated failure'));
        reject(new Error(`Substage ${substageId} failed`));
      }, duration * 0.5);
    }
  });
};