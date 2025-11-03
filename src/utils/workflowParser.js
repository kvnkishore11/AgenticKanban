/**
 * Workflow Parser Utility
 *
 * Extracts stage information from workflow names following the ADW naming convention.
 * Workflow names follow the pattern: adw_<stage1>_<stage2>_..._iso
 * Special case: adw_sdlc_iso represents the full SDLC pipeline
 */

/**
 * Parse workflow name to extract ordered stages
 * Handles simple workflows (e.g., 'adw_plan_iso' -> ['plan'])
 * and composite workflows (e.g., 'adw_plan_build_test_iso' -> ['plan', 'build', 'test'])
 *
 * @param {string} workflowName - The workflow name (e.g., 'adw_plan_iso', 'adw_plan_build_test_iso')
 * @returns {string[]} Array of stage names in order
 */
export const parseWorkflowStages = (workflowName) => {
  if (!workflowName || typeof workflowName !== 'string') {
    return [];
  }

  // Remove 'adw_' prefix and '_iso' suffix
  let stagesStr = workflowName;
  if (stagesStr.startsWith('adw_')) {
    stagesStr = stagesStr.substring(4);
  }
  if (stagesStr.endsWith('_iso')) {
    stagesStr = stagesStr.substring(0, stagesStr.length - 4);
  }

  // Handle special case: 'sdlc' maps to full pipeline
  if (stagesStr === 'sdlc') {
    return ['plan', 'build', 'test', 'review', 'document'];
  }

  // Split by underscore to get stage array
  const stages = stagesStr.split('_').filter(s => s.length > 0);

  return stages;
};

/**
 * Validate if a given string is a valid workflow name
 *
 * @param {string} workflowName - The workflow name to validate
 * @returns {boolean} True if the workflow name is valid
 */
export const isValidWorkflowName = (workflowName) => {
  if (!workflowName || typeof workflowName !== 'string') {
    return false;
  }

  // Check basic pattern: adw_*_iso
  if (!workflowName.startsWith('adw_') || !workflowName.endsWith('_iso')) {
    return false;
  }

  // Extract and validate stages
  const stages = parseWorkflowStages(workflowName);
  return stages.length > 0;
};

/**
 * Get a human-readable description of a workflow
 *
 * @param {string} workflowName - The workflow name
 * @returns {string} Human-readable description
 */
export const getWorkflowDescription = (workflowName) => {
  const stages = parseWorkflowStages(workflowName);

  if (stages.length === 0) {
    return 'Unknown workflow';
  }

  const capitalizedStages = stages.map(s => s.charAt(0).toUpperCase() + s.slice(1));

  if (stages.length === 1) {
    return `${capitalizedStages[0]} only`;
  }

  return capitalizedStages.join(' → ');
};
