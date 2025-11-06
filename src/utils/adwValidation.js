/**
 * ADW ID Validation Utilities
 * Provides validation functions for ADW ID format and workflow requirements
 */

// ADW ID format: 8-character alphanumeric string
const ADW_ID_REGEX = /^[a-zA-Z0-9]{8}$/;

// Dependent workflows that require mandatory ADW ID (must reference existing worktree)
const DEPENDENT_WORKFLOWS = [
  'adw_build_iso',
  'adw_test_iso',
  'adw_review_iso',
  'adw_document_iso',
  'adw_ship_iso',
];

// Entry point workflows that accept optional ADW ID (can create new worktrees)
// Note: adw_patch_iso can work with OR without an existing ADW ID
// - With ADW ID: Patches an existing worktree
// - Without ADW ID: Creates new worktree for the patch
const ENTRY_POINT_WORKFLOWS = [
  'adw_plan_iso',
  'adw_patch_iso',
];

// Orchestrator workflows that accept optional ADW ID
const ORCHESTRATOR_WORKFLOWS = [
  'adw_sdlc_zte_iso',
  'adw_plan_build_iso',
  'adw_plan_build_test_iso',
  'adw_plan_build_test_review_iso',
  'adw_plan_build_document_iso',
  'adw_plan_build_review_iso',
  'adw_sdlc_iso',
];

/**
 * Validate ADW ID format
 * @param {string} adwId - The ADW ID to validate
 * @returns {boolean} True if format is valid
 */
export const isValidAdwIdFormat = (adwId) => {
  if (typeof adwId !== 'string') return false;
  return ADW_ID_REGEX.test(adwId);
};

/**
 * Check if ADW ID is required for a specific workflow type
 * @param {string} workflowType - The workflow type to check
 * @returns {boolean} True if ADW ID is required
 */
export const isAdwIdRequired = (workflowType) => {
  return DEPENDENT_WORKFLOWS.includes(workflowType);
};

/**
 * Check if ADW ID is optional for a specific workflow type
 * @param {string} workflowType - The workflow type to check
 * @returns {boolean} True if ADW ID is optional
 */
export const isAdwIdOptional = (workflowType) => {
  return ENTRY_POINT_WORKFLOWS.includes(workflowType) ||
         ORCHESTRATOR_WORKFLOWS.includes(workflowType);
};

/**
 * Check if workflow supports ADW ID parameter
 * @param {string} workflowType - The workflow type to check
 * @returns {boolean} True if workflow supports ADW ID
 */
export const supportsAdwId = (workflowType) => {
  return isAdwIdRequired(workflowType) || isAdwIdOptional(workflowType);
};

/**
 * Sanitize ADW ID input (remove invalid characters and limit length)
 * @param {string} input - Raw input string
 * @returns {string} Sanitized ADW ID
 */
export const sanitizeAdwId = (input) => {
  if (typeof input !== 'string') return '';

  // Remove non-alphanumeric characters and limit to 8 characters
  return input.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
};

/**
 * Format ADW ID for display (add spaces or dashes for readability)
 * @param {string} adwId - The ADW ID to format
 * @returns {string} Formatted ADW ID
 */
export const formatAdwId = (adwId) => {
  if (!adwId || typeof adwId !== 'string') return '';

  // For 8-character IDs, format as XXXX-XXXX for better readability
  if (adwId.length === 8) {
    return `${adwId.slice(0, 4)}-${adwId.slice(4)}`;
  }

  return adwId;
};

/**
 * Comprehensive ADW ID validation
 * @param {string} adwId - The ADW ID to validate
 * @param {boolean} required - Whether ADW ID is required
 * @returns {Object} Validation result with isValid and error message
 */
export const validateAdwId = (adwId, required = false) => {
  // Handle empty/null values
  if (!adwId || adwId.trim() === '') {
    if (required) {
      return {
        isValid: false,
        error: 'ADW ID is required for this workflow type'
      };
    }
    return {
      isValid: true,
      error: null
    };
  }

  // Clean the input
  const cleanId = adwId.trim();

  // Check length
  if (cleanId.length < 8) {
    return {
      isValid: false,
      error: `ADW ID must be exactly 8 characters (currently ${cleanId.length})`
    };
  }

  if (cleanId.length > 8) {
    return {
      isValid: false,
      error: `ADW ID must be exactly 8 characters (currently ${cleanId.length})`
    };
  }

  // Check format (alphanumeric only)
  if (!isValidAdwIdFormat(cleanId)) {
    return {
      isValid: false,
      error: 'ADW ID must contain only letters and numbers'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Generate helpful error messages for ADW ID validation
 * @param {string} adwId - The invalid ADW ID
 * @param {string} workflowType - The workflow type context
 * @returns {string} User-friendly error message
 */
export const getAdwIdErrorMessage = (adwId, workflowType) => {
  const validation = validateAdwId(adwId, isAdwIdRequired(workflowType));

  if (validation.isValid) return null;

  // Add workflow-specific context to the error
  let message = validation.error;

  if (workflowType) {
    if (isAdwIdRequired(workflowType)) {
      message += `. ${workflowType} requires an existing ADW ID to reference the worktree.`;
    } else if (isAdwIdOptional(workflowType)) {
      message += `. For ${workflowType}, you can leave this empty to generate a new ADW ID.`;
    }
  }

  return message;
};

/**
 * Generate helpful suggestions for ADW ID usage
 * @param {string} workflowType - The workflow type
 * @returns {Array} Array of suggestion strings
 */
export const getAdwIdSuggestions = (workflowType) => {
  if (!workflowType) {
    return [
      'Use an existing 8-character ADW ID to reference previous work',
      'Leave empty to generate a new ADW ID',
      'ADW IDs are alphanumeric: letters and numbers only'
    ];
  }

  if (isAdwIdRequired(workflowType)) {
    return [
      `${workflowType} requires an existing ADW ID from a previous workflow`,
      'Look for ADW IDs in previous task logs or workflow outputs',
      'Format: 8 alphanumeric characters (e.g., "a1b2c3d4")',
      'Cannot create new worktrees - must reference existing ones'
    ];
  }

  if (isAdwIdOptional(workflowType)) {
    return [
      `${workflowType} can use an existing ADW ID or create a new one`,
      'Provide existing ADW ID to continue previous work',
      'Leave empty to start fresh with a new ADW ID',
      'Format: 8 alphanumeric characters (e.g., "a1b2c3d4")'
    ];
  }

  return [
    `${workflowType} does not support ADW ID references`,
    'This workflow type runs independently'
  ];
};

/**
 * Check if workflow combination makes sense
 * @param {string} workflowType - The workflow type
 * @param {string} adwId - The ADW ID (optional)
 * @returns {Object} Validation result with warnings
 */
export const validateWorkflowAdwCombination = (workflowType, adwId) => {
  const warnings = [];
  const errors = [];

  if (!workflowType) {
    errors.push('Workflow type is required');
    return { isValid: false, errors, warnings };
  }

  // Check if workflow supports ADW ID
  if (adwId && !supportsAdwId(workflowType)) {
    warnings.push(`${workflowType} does not use ADW ID references. The provided ADW ID will be ignored.`);
  }

  // Check required ADW ID
  if (isAdwIdRequired(workflowType) && !adwId) {
    errors.push(`${workflowType} requires an ADW ID to reference the existing worktree.`);
  }

  // Validate ADW ID format if provided
  if (adwId) {
    const validation = validateAdwId(adwId, isAdwIdRequired(workflowType));
    if (!validation.isValid) {
      errors.push(validation.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get workflow category for UI display
 * @param {string} workflowType - The workflow type
 * @returns {string} Category name
 */
export const getWorkflowCategory = (workflowType) => {
  if (DEPENDENT_WORKFLOWS.includes(workflowType)) {
    return 'dependent';
  }
  if (ENTRY_POINT_WORKFLOWS.includes(workflowType)) {
    return 'entry_point';
  }
  if (ORCHESTRATOR_WORKFLOWS.includes(workflowType)) {
    return 'orchestrator';
  }
  return 'unknown';
};

/**
 * Get user-friendly workflow description
 * @param {string} workflowType - The workflow type
 * @returns {string} Description text
 */
export const getWorkflowDescription = (workflowType) => {
  const category = getWorkflowCategory(workflowType);

  switch (category) {
    case 'dependent':
      return 'Requires existing worktree from previous workflow';
    case 'entry_point':
      return 'Can create new worktree or use existing one';
    case 'orchestrator':
      return 'Runs multiple workflow steps in sequence';
    default:
      return 'Workflow type not recognized';
  }
};