/**
 * Model configuration utilities for per-stage model selection.
 *
 * Provides default model mappings and metadata for AI models used in ADW workflows.
 */

/**
 * Model metadata for display and cost/performance considerations
 */
export const MODEL_INFO = {
  sonnet: {
    label: 'Sonnet',
    tier: 'balanced',
    cost: 'medium',
    description: 'Balanced performance and cost',
    icon: 'Scale'
  },
  haiku: {
    label: 'Haiku',
    tier: 'fast',
    cost: 'low',
    description: 'Fast and economical',
    icon: 'Zap'
  },
  opus: {
    label: 'Opus',
    tier: 'powerful',
    cost: 'high',
    description: 'Most capable model',
    icon: 'Crown'
  }
};

/**
 * Get the default AI model for a given stage.
 *
 * @param {string} stageName - Name of the stage (e.g., "plan", "build", "test")
 * @returns {string} The default model type for the stage ("sonnet", "haiku", or "opus")
 *
 * @example
 * getDefaultModelForStage("plan") // Returns "opus"
 * getDefaultModelForStage("merge") // Returns "haiku"
 * getDefaultModelForStage("test") // Returns "sonnet"
 */
export function getDefaultModelForStage(stageName) {
  if (!stageName) return 'sonnet';

  const stageNameLower = stageName.toLowerCase();

  // Opus for complex planning and implementation stages
  if (stageNameLower === 'plan' || stageNameLower === 'build') {
    return 'opus';
  }

  // Haiku for simple operational stages
  if (stageNameLower === 'merge') {
    return 'haiku';
  }

  // Sonnet for balanced stages (test, review, document)
  if (['test', 'review', 'document'].includes(stageNameLower)) {
    return 'sonnet';
  }

  // Default to sonnet for unknown stages
  return 'sonnet';
}

/**
 * Generate a default model configuration mapping for a list of stages.
 *
 * @param {string[]} stageNames - Array of stage names
 * @returns {Object} Object mapping stage names to their default models
 *
 * @example
 * generateDefaultStageModels(["plan", "build", "test", "merge"])
 * // Returns: { plan: "opus", build: "opus", test: "sonnet", merge: "haiku" }
 */
export function generateDefaultStageModels(stageNames) {
  if (!Array.isArray(stageNames)) {
    return {};
  }

  const stageModels = {};
  stageNames.forEach(stageName => {
    stageModels[stageName] = getDefaultModelForStage(stageName);
  });

  return stageModels;
}

/**
 * Validate that a model choice is valid.
 *
 * @param {string} model - The model name to validate
 * @returns {boolean} True if the model is valid
 */
export function isValidModel(model) {
  return model === 'sonnet' || model === 'haiku' || model === 'opus';
}

/**
 * Get cost tier color for UI display.
 *
 * @param {string} cost - Cost tier ("low", "medium", "high")
 * @returns {string} Tailwind CSS color class
 */
export function getCostColor(cost) {
  switch (cost) {
    case 'low':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'high':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get performance tier color for UI display.
 *
 * @param {string} tier - Performance tier ("fast", "balanced", "powerful")
 * @returns {string} Tailwind CSS color class
 */
export function getPerformanceColor(tier) {
  switch (tier) {
    case 'fast':
      return 'text-blue-600 bg-blue-100';
    case 'balanced':
      return 'text-purple-600 bg-purple-100';
    case 'powerful':
      return 'text-orange-600 bg-orange-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}
