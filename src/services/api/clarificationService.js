/**
 * Clarification Service
 *
 * Handles API communication for task clarification workflow.
 */

import { getWebSocketService } from '../websocket/websocketService';

/**
 * Request clarification for a task
 *
 * @param {number} taskId - The task ID
 * @param {string} description - The task description
 * @param {string} adwId - The ADW ID for this task
 * @returns {Promise<void>}
 */
export async function requestClarification(taskId, description, adwId) {
  const ws = getWebSocketService();

  return new Promise((resolve, reject) => {
    // Set up one-time listeners for clarification events
    const onComplete = (data) => {
      if (data.adw_id === adwId) {
        cleanup();
        resolve(data.result);
      }
    };

    const onFailed = (data) => {
      if (data.adw_id === adwId) {
        cleanup();
        reject(new Error(data.error || 'Clarification failed'));
      }
    };

    const cleanup = () => {
      ws.off('clarification_complete', onComplete);
      ws.off('clarification_failed', onFailed);
    };

    // Register event listeners
    ws.on('clarification_complete', onComplete);
    ws.on('clarification_failed', onFailed);

    // Send clarification request via WebSocket
    ws.send('request_clarification', {
      task_id: taskId,
      description: description,
      adw_id: adwId
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      cleanup();
      reject(new Error('Clarification request timed out'));
    }, 30000);
  });
}

/**
 * Approve a clarification result
 *
 * @param {number} taskId - The task ID
 * @param {string} adwId - The ADW ID for this task
 * @returns {Promise<void>}
 */
export async function approveClarification(taskId, adwId) {
  const ws = getWebSocketService();

  return new Promise((resolve, reject) => {
    ws.send('approve_clarification', {
      task_id: taskId,
      adw_id: adwId
    });

    // Resolve immediately for optimistic update
    // The WebSocket will send updates if anything changes
    resolve();
  });
}

/**
 * Request refinement of clarification with additional feedback
 *
 * @param {number} taskId - The task ID
 * @param {string} feedback - User feedback for refinement
 * @param {string} description - The original task description
 * @param {string} adwId - The ADW ID for this task
 * @returns {Promise<Object>} - The refined clarification result
 */
export async function requestRefinement(taskId, feedback, description, adwId) {
  const ws = getWebSocketService();

  return new Promise((resolve, reject) => {
    // Set up one-time listeners for clarification events
    const onComplete = (data) => {
      if (data.adw_id === adwId) {
        cleanup();
        resolve(data.result);
      }
    };

    const onFailed = (data) => {
      if (data.adw_id === adwId) {
        cleanup();
        reject(new Error(data.error || 'Refinement failed'));
      }
    };

    const cleanup = () => {
      ws.off('clarification_complete', onComplete);
      ws.off('clarification_failed', onFailed);
    };

    // Register event listeners
    ws.on('clarification_complete', onComplete);
    ws.on('clarification_failed', onFailed);

    // Send refinement request via WebSocket
    ws.send('request_refinement', {
      task_id: taskId,
      description: description,
      feedback: feedback,
      adw_id: adwId
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      cleanup();
      reject(new Error('Refinement request timed out'));
    }, 30000);
  });
}

export default {
  requestClarification,
  approveClarification,
  requestRefinement
};
