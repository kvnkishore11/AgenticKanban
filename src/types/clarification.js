/**
 * Clarification status enum
 */
export const ClarificationStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  NEEDS_REVISION: 'needs_revision',
};

/**
 * Confidence level enum
 */
export const ClarificationConfidence = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * @typedef {Object} ClarificationResult
 * @property {string} understanding - Conversational explanation ("Got it! You want me to...")
 * @property {string} confidence - Confidence level (high/medium/low)
 * @property {string[]} questions - Clarifying questions (can be empty)
 * @property {string} status - Current status (pending, approved, needs_revision)
 * @property {string} timestamp - When the clarification was generated
 */

/**
 * @typedef {Object} ClarificationHistoryEntry
 * @property {string} timestamp - When this clarification was performed
 * @property {ClarificationResult} result - The clarification result at this point
 * @property {string} [userFeedback] - User feedback if requesting refinement
 * @property {string} status - Status at this point in history
 */
