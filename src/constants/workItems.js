/**
 * Work item types and stage definitions
 * Central constants for task management and workflow configuration
 */

// Work item types
export const WORK_ITEM_TYPES = {
  FEATURE: 'feature',
  CHORE: 'chore',
  BUG: 'bug',
  PATCH: 'patch'
};

// Available stages for queueing
export const QUEUEABLE_STAGES = [
  { id: 'plan', name: 'Plan', color: 'blue' },
  { id: 'implement', name: 'Implement', color: 'yellow' },
  { id: 'test', name: 'Test', color: 'green' },
  { id: 'review', name: 'Review', color: 'purple' },
  { id: 'document', name: 'Document', color: 'indigo' },
  { id: 'pr', name: 'PR', color: 'pink' }
];

// SDLC stages definition (for full SDLC workflow mapping)
export const SDLC_STAGES = ['plan', 'implement', 'test', 'review', 'document'];

// Stage progression order
export const STAGE_ORDER = ['plan', 'implement', 'test', 'review', 'pr'];

// Default pipeline configuration
export const DEFAULT_PIPELINE_CONFIG = {
  name: 'Full Development Lifecycle',
  stages: QUEUEABLE_STAGES,
  defaultWorkItemType: WORK_ITEM_TYPES.FEATURE
};