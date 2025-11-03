/**
 * Workflow Stage Validation Utilities
 *
 * Provides functions to validate stage transitions and determine workflow completion
 * based on the workflow definition encoded in the workflow name.
 */

import { parseWorkflowStages } from './workflowParser.js';

/**
 * Get the ordered list of stages for a given workflow
 *
 * @param {string} workflowName - The workflow name (e.g., 'adw_plan_build_iso')
 * @returns {string[]} Array of stage names in order
 */
export const getWorkflowStages = (workflowName) => {
  return parseWorkflowStages(workflowName);
};

/**
 * Check if a stage is part of a workflow's definition
 *
 * @param {string} workflowName - The workflow name
 * @param {string} stage - The stage to check
 * @returns {boolean} True if the stage is part of the workflow
 */
export const isStageInWorkflow = (workflowName, stage) => {
  if (!workflowName || !stage) {
    return false;
  }

  const stages = getWorkflowStages(workflowName);
  return stages.includes(stage.toLowerCase());
};

/**
 * Get the next stage in a workflow after the current stage
 *
 * @param {string} workflowName - The workflow name
 * @param {string} currentStage - The current stage
 * @returns {string|null} The next stage name, or null if current stage is the last stage or invalid
 */
export const getNextStageInWorkflow = (workflowName, currentStage) => {
  if (!workflowName || !currentStage) {
    return null;
  }

  const stages = getWorkflowStages(workflowName);
  const currentIndex = stages.indexOf(currentStage.toLowerCase());

  // Current stage not found in workflow
  if (currentIndex === -1) {
    return null;
  }

  // Check if there's a next stage
  if (currentIndex < stages.length - 1) {
    return stages[currentIndex + 1];
  }

  // Current stage is the last stage in the workflow
  return null;
};

/**
 * Check if a workflow is complete (current stage is the last stage)
 *
 * @param {string} workflowName - The workflow name
 * @param {string} currentStage - The current stage
 * @returns {boolean} True if the workflow is complete (no more stages to execute)
 */
export const isWorkflowComplete = (workflowName, currentStage) => {
  if (!workflowName || !currentStage) {
    return false;
  }

  const stages = getWorkflowStages(workflowName);
  if (stages.length === 0) {
    return false;
  }

  const currentIndex = stages.indexOf(currentStage.toLowerCase());

  // If current stage is not in workflow, it's not complete
  if (currentIndex === -1) {
    return false;
  }

  // If current stage is the last stage in the workflow, it's complete
  return currentIndex === stages.length - 1;
};

/**
 * Get the first stage of a workflow
 *
 * @param {string} workflowName - The workflow name
 * @returns {string|null} The first stage name, or null if workflow is invalid
 */
export const getFirstStageInWorkflow = (workflowName) => {
  const stages = getWorkflowStages(workflowName);
  return stages.length > 0 ? stages[0] : null;
};

/**
 * Get the last stage of a workflow
 *
 * @param {string} workflowName - The workflow name
 * @returns {string|null} The last stage name, or null if workflow is invalid
 */
export const getLastStageInWorkflow = (workflowName) => {
  const stages = getWorkflowStages(workflowName);
  return stages.length > 0 ? stages[stages.length - 1] : null;
};

/**
 * Get the index of a stage within a workflow (0-based)
 *
 * @param {string} workflowName - The workflow name
 * @param {string} stage - The stage to find
 * @returns {number} The index of the stage, or -1 if not found
 */
export const getStageIndex = (workflowName, stage) => {
  if (!workflowName || !stage) {
    return -1;
  }

  const stages = getWorkflowStages(workflowName);
  return stages.indexOf(stage.toLowerCase());
};

/**
 * Calculate workflow completion percentage based on current stage
 *
 * @param {string} workflowName - The workflow name
 * @param {string} currentStage - The current stage
 * @returns {number} Completion percentage (0-100)
 */
export const getWorkflowCompletionPercentage = (workflowName, currentStage) => {
  if (!workflowName || !currentStage) {
    return 0;
  }

  const stages = getWorkflowStages(workflowName);
  if (stages.length === 0) {
    return 0;
  }

  const currentIndex = getStageIndex(workflowName, currentStage);
  if (currentIndex === -1) {
    return 0;
  }

  // Calculate percentage: (completed stages / total stages) * 100
  // Current stage counts as completed when we're in it
  return Math.round(((currentIndex + 1) / stages.length) * 100);
};
