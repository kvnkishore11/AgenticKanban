/**
 * Model Configuration Constants
 * Defines available Claude models and default assignments per stage
 */

// Available Claude models
export const CLAUDE_MODELS = {
  OPUS: 'opus',
  SONNET: 'sonnet',
  HAIKU: 'haiku'
};

// Default model assignments per stage
// Optimized for cost/performance balance
export const DEFAULT_STAGE_MODELS = {
  plan: CLAUDE_MODELS.OPUS,      // Complex planning requires most capable model
  implement: CLAUDE_MODELS.OPUS,  // Implementation requires most capable model
  test: CLAUDE_MODELS.SONNET,     // Testing benefits from balanced model
  review: CLAUDE_MODELS.SONNET,   // Code review benefits from balanced model
  document: CLAUDE_MODELS.SONNET, // Documentation benefits from balanced model
  clarify: CLAUDE_MODELS.HAIKU,   // Simple clarification can use fast model
  merge: CLAUDE_MODELS.HAIKU      // Simple merge operations can use fast model
};

// Model metadata with descriptions and use case information
export const MODEL_METADATA = {
  [CLAUDE_MODELS.OPUS]: {
    name: 'Opus',
    displayName: 'Claude Opus',
    description: 'Most capable model for complex tasks',
    icon: '🚀',
    useCase: 'Best for complex planning, architecture, and implementation',
    costIndicator: 'high',
    performance: 'highest'
  },
  [CLAUDE_MODELS.SONNET]: {
    name: 'Sonnet',
    displayName: 'Claude Sonnet',
    description: 'Balanced performance for most tasks',
    icon: '⚡',
    useCase: 'Ideal for testing, review, and documentation',
    costIndicator: 'medium',
    performance: 'balanced'
  },
  [CLAUDE_MODELS.HAIKU]: {
    name: 'Haiku',
    displayName: 'Claude Haiku',
    icon: '💨',
    description: 'Fast and economical for simple tasks',
    useCase: 'Perfect for clarification and simple operations',
    costIndicator: 'low',
    performance: 'fast'
  }
};

// Model options array for dropdowns
export const MODEL_OPTIONS = [
  {
    value: CLAUDE_MODELS.OPUS,
    label: MODEL_METADATA[CLAUDE_MODELS.OPUS].displayName,
    icon: MODEL_METADATA[CLAUDE_MODELS.OPUS].icon,
    description: MODEL_METADATA[CLAUDE_MODELS.OPUS].description
  },
  {
    value: CLAUDE_MODELS.SONNET,
    label: MODEL_METADATA[CLAUDE_MODELS.SONNET].displayName,
    icon: MODEL_METADATA[CLAUDE_MODELS.SONNET].icon,
    description: MODEL_METADATA[CLAUDE_MODELS.SONNET].description
  },
  {
    value: CLAUDE_MODELS.HAIKU,
    label: MODEL_METADATA[CLAUDE_MODELS.HAIKU].displayName,
    icon: MODEL_METADATA[CLAUDE_MODELS.HAIKU].icon,
    description: MODEL_METADATA[CLAUDE_MODELS.HAIKU].description
  }
];

/**
 * Get default model for a specific stage
 * @param {string} stageName - Stage identifier (e.g., 'plan', 'test')
 * @returns {string} Model identifier (opus/sonnet/haiku)
 */
export function getDefaultModelForStage(stageName) {
  return DEFAULT_STAGE_MODELS[stageName] || CLAUDE_MODELS.SONNET;
}

/**
 * Validate if a model value is valid
 * @param {string} model - Model identifier to validate
 * @returns {boolean} True if valid
 */
export function isValidModel(model) {
  return Object.values(CLAUDE_MODELS).includes(model);
}

/**
 * Get model metadata
 * @param {string} model - Model identifier
 * @returns {object} Model metadata object
 */
export function getModelMetadata(model) {
  return MODEL_METADATA[model] || MODEL_METADATA[CLAUDE_MODELS.SONNET];
}
