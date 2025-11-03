/**
 * Stage Progression Service
 * Handles automatic task progression through pipeline stages based on ADW execution status
 */

import { simulateSubstageExecution, getNextSubstage, getSubstages } from '../../utils/substages';
import adwService from '../api/adwService';
import { getNextStageInWorkflow, isWorkflowComplete } from '../../utils/workflowValidation.js';

class StageProgressionService {
  constructor() {
    this.activeProgressions = new Map(); // Track active progressions
    this.progressionCallbacks = new Map(); // Store callback functions
  }

  /**
   * Start automatic progression for a task
   */
  startProgression(taskId, kanbanStore) {
    if (this.activeProgressions.has(taskId)) {
      console.warn(`Progression already active for task ${taskId}`);
      return;
    }

    console.log(`Starting automatic progression for task ${taskId}`);

    const progression = {
      taskId,
      isActive: true,
      startedAt: new Date().toISOString(),
      store: kanbanStore,
    };

    this.activeProgressions.set(taskId, progression);
    this.processTaskProgression(taskId);
  }

  /**
   * Stop automatic progression for a task
   */
  stopProgression(taskId) {
    const progression = this.activeProgressions.get(taskId);
    if (progression) {
      progression.isActive = false;
      this.activeProgressions.delete(taskId);
      console.log(`Stopped automatic progression for task ${taskId}`);
    }
  }

  /**
   * Check if task has active progression
   */
  isProgressionActive(taskId) {
    return this.activeProgressions.has(taskId);
  }

  /**
   * Process task progression through current substage
   */
  async processTaskProgression(taskId) {
    const progression = this.activeProgressions.get(taskId);
    if (!progression || !progression.isActive) {
      return;
    }

    const { store } = progression;
    const task = store.getState().tasks.find(t => t.id === taskId);

    if (!task) {
      this.stopProgression(taskId);
      return;
    }

    try {
      // Process current substage
      await this.executeSubstage(task, store);

      // Check if we need to move to next substage or stage
      await this.checkProgression(task, store);

    } catch (error) {
      console.error(`Progression error for task ${taskId}:`, error);
      this.handleProgressionError(task, store, error);
    }
  }

  /**
   * Execute current substage
   */
  async executeSubstage(task, store) {
    const { stage, substage } = task;

    // Add log entry for substage start
    store.getState().addTaskLog(task.id, {
      stage,
      substageId: substage,
      message: `Starting ${substage} in ${stage} stage`,
      level: 'info',
    });

    // Simulate substage execution
    return new Promise((resolve, reject) => {
      simulateSubstageExecution(stage, substage, (progressUpdate) => {
        // Update task progress in real-time
        store.getState().updateTaskProgress(
          task.id,
          progressUpdate.substageId,
          progressUpdate.progress
        );

        // Add progress log
        if (progressUpdate.status === 'completed') {
          store.getState().addTaskLog(task.id, {
            stage: progressUpdate.stage,
            substageId: progressUpdate.substageId,
            message: progressUpdate.message,
            level: 'success',
          });
        }
      })
        .then((result) => {
          console.log(`Substage completed: ${stage}.${substage} for task ${task.id}`);
          resolve(result);
        })
        .catch((error) => {
          console.error(`Substage failed: ${stage}.${substage} for task ${task.id}`, error);
          reject(error);
        });
    });
  }

  /**
   * Check if task should progress to next substage or stage
   */
  async checkProgression(task, store) {
    const { stage, substage, pipelineId, metadata } = task;
    const workflowName = metadata?.workflow_name;

    // Check if there's a next substage in the current stage
    const nextSubstage = getNextSubstage(stage, substage);

    if (nextSubstage) {
      // Move to next substage
      console.log(`Moving task ${task.id} to next substage: ${nextSubstage.id}`);

      store.getState().updateTaskProgress(task.id, nextSubstage.id, 0);

      // Continue progression with next substage
      setTimeout(() => {
        if (this.isProgressionActive(task.id)) {
          this.processTaskProgression(task.id);
        }
      }, 1000); // Brief pause between substages

    } else {
      // Current stage is complete, check if we should move to next stage
      let nextStage = null;

      // If task has a workflow name, use workflow-aware progression
      if (workflowName) {
        console.log(`Checking workflow-aware progression for task ${task.id} (workflow: ${workflowName}, current stage: ${stage})`);

        // Check if workflow is complete
        if (isWorkflowComplete(workflowName, stage)) {
          console.log(`Workflow ${workflowName} is complete after stage ${stage}. Moving to 'pr' stage.`);

          // Workflow is complete, move to PR stage
          store.getState().moveTaskToStage(task.id, 'pr');

          store.getState().updateTask(task.id, {
            progress: 100,
            substage: 'ready',
            metadata: {
              ...metadata,
              workflow_complete: true,
            }
          });

          store.getState().addTaskLog(task.id, {
            stage: 'pr',
            substageId: 'ready',
            message: `Workflow completed successfully. Ready for PR/merge.`,
            level: 'success',
          });

          this.stopProgression(task.id);
          return;
        }

        // Get next stage from workflow
        nextStage = getNextStageInWorkflow(workflowName, stage);
        console.log(`Next stage in workflow ${workflowName}: ${nextStage || 'none'}`);
      } else {
        // Fallback to pipeline-based progression if no workflow name
        console.log(`No workflow name found for task ${task.id}, using pipeline-based progression`);
        nextStage = adwService.getNextStage(pipelineId, stage);
      }

      if (nextStage) {
        console.log(`Moving task ${task.id} to next stage: ${nextStage}`);

        // Move to next stage
        store.getState().moveTaskToStage(task.id, nextStage);

        // Get first substage of the new stage
        const newStageSubstages = getSubstages(nextStage);
        const firstSubstage = newStageSubstages.length > 0 ? newStageSubstages[0].id : 'initializing';

        store.getState().updateTaskProgress(task.id, firstSubstage, 0);

        // Add stage transition log
        store.getState().addTaskLog(task.id, {
          stage: nextStage,
          substageId: firstSubstage,
          message: `Advanced to ${nextStage} stage`,
          level: 'info',
        });

        // Continue progression in new stage
        setTimeout(() => {
          if (this.isProgressionActive(task.id)) {
            this.processTaskProgression(task.id);
          }
        }, 2000); // Longer pause for stage transitions

      } else {
        // Pipeline complete (fallback scenario)
        console.log(`Task ${task.id} completed pipeline`);

        store.getState().updateTask(task.id, {
          progress: 100,
          substage: 'completed'
        });

        store.getState().addTaskLog(task.id, {
          stage,
          substageId: 'completed',
          message: 'Pipeline completed successfully',
          level: 'success',
        });

        this.stopProgression(task.id);
      }
    }
  }

  /**
   * Handle progression errors
   */
  handleProgressionError(task, store, error) {
    console.error(`Progression error for task ${task.id}:`, error);

    // Move task to errored stage
    store.getState().moveTaskToStage(task.id, 'errored');
    store.getState().updateTaskProgress(task.id, 'identify', 0);

    // Add error log
    store.getState().addTaskLog(task.id, {
      stage: 'errored',
      substageId: 'identify',
      message: `Error during ${task.stage}.${task.substage}: ${error.message}`,
      level: 'error',
    });

    // Stop progression
    this.stopProgression(task.id);
  }

  /**
   * Simulate task recovery from error stage
   */
  async recoverFromError(taskId, kanbanStore, targetStage = null) {
    const task = kanbanStore.getState().tasks.find(t => t.id === taskId);
    if (!task || task.stage !== 'errored') {
      throw new Error('Task is not in errored state');
    }

    // Simulate error resolution
    console.log(`Attempting recovery for task ${taskId}`);

    // Process error resolution substages
    const errorSubstages = ['identify', 'debug', 'resolve'];

    for (const substage of errorSubstages) {
      kanbanStore.getState().updateTaskProgress(taskId, substage, 0);

      kanbanStore.getState().addTaskLog(taskId, {
        stage: 'errored',
        substageId: substage,
        message: `Processing error resolution: ${substage}`,
        level: 'info',
      });

      // Simulate substage execution
      await simulateSubstageExecution('errored', substage, (progressUpdate) => {
        kanbanStore.getState().updateTaskProgress(
          taskId,
          progressUpdate.substageId,
          progressUpdate.progress
        );
      });
    }

    // Move back to previous stage or specified target stage
    const previousStage = targetStage || task.metadata?.previousStage || 'build';

    kanbanStore.getState().moveTaskToStage(taskId, previousStage);

    const substages = getSubstages(previousStage);
    const firstSubstage = substages.length > 0 ? substages[0].id : 'initializing';

    kanbanStore.getState().updateTaskProgress(taskId, firstSubstage, 0);

    kanbanStore.getState().addTaskLog(taskId, {
      stage: previousStage,
      substageId: firstSubstage,
      message: `Recovered from error, resumed at ${previousStage} stage`,
      level: 'success',
    });

    // Resume automatic progression
    this.startProgression(taskId, kanbanStore);
  }

  /**
   * Pause progression (without stopping)
   */
  pauseProgression(taskId) {
    const progression = this.activeProgressions.get(taskId);
    if (progression) {
      progression.isPaused = true;
      console.log(`Paused progression for task ${taskId}`);
    }
  }

  /**
   * Resume paused progression
   */
  resumeProgression(taskId) {
    const progression = this.activeProgressions.get(taskId);
    if (progression && progression.isPaused) {
      progression.isPaused = false;
      console.log(`Resumed progression for task ${taskId}`);
      this.processTaskProgression(taskId);
    }
  }

  /**
   * Get progression status for a task
   */
  getProgressionStatus(taskId) {
    const progression = this.activeProgressions.get(taskId);
    if (!progression) {
      return { active: false };
    }

    return {
      active: progression.isActive,
      paused: progression.isPaused || false,
      startedAt: progression.startedAt,
      duration: new Date() - new Date(progression.startedAt),
    };
  }

  /**
   * Get all active progressions
   */
  getActiveProgressions() {
    return Array.from(this.activeProgressions.entries()).map(([taskId]) => ({
      taskId,
      ...this.getProgressionStatus(taskId),
    }));
  }

  /**
   * Force progress to next stage (manual override)
   */
  forceAdvanceToStage(taskId, kanbanStore, targetStage) {
    const task = kanbanStore.getState().tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    console.log(`Forcing task ${taskId} to advance to stage: ${targetStage}`);

    // Stop current progression
    this.stopProgression(taskId);

    // Move to target stage
    kanbanStore.getState().moveTaskToStage(taskId, targetStage);

    const substages = getSubstages(targetStage);
    const firstSubstage = substages.length > 0 ? substages[0].id : 'initializing';

    kanbanStore.getState().updateTaskProgress(taskId, firstSubstage, 0);

    // Add manual override log
    kanbanStore.getState().addTaskLog(taskId, {
      stage: targetStage,
      substageId: firstSubstage,
      message: `Manually advanced to ${targetStage} stage`,
      level: 'warning',
    });

    // Restart progression in new stage
    this.startProgression(taskId, kanbanStore);
  }

  /**
   * Cleanup - stop all progressions
   */
  cleanup() {
    console.log('Stopping all active progressions');
    for (const taskId of this.activeProgressions.keys()) {
      this.stopProgression(taskId);
    }
  }
}

// Create and export singleton instance
const stageProgressionService = new StageProgressionService();
export default stageProgressionService;