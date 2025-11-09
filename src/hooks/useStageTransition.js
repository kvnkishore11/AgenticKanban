/**
 * @fileoverview useStageTransition Hook
 *
 * Manages stage transition animations and visual effects for Kanban cards.
 * Detects stage changes and triggers appropriate animations based on
 * transition type (success, error, progress).
 *
 * @module hooks/useStageTransition
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Stage transition hook
 *
 * @param {Object} task - The task object
 * @param {Object} workflowProgress - Current workflow progress data
 * @returns {Object} Transition state and handlers
 */
export const useStageTransition = (task, workflowProgress) => {
  const [transitionState, setTransitionState] = useState({
    isTransitioning: false,
    transitionType: null, // 'success', 'error', 'progress', 'completion'
    fromStage: null,
    toStage: null,
  });

  const prevStageRef = useRef(task?.stage);
  const prevWorkflowCompleteRef = useRef(task?.metadata?.workflow_complete);
  const animationTimeoutRef = useRef(null);

  useEffect(() => {
    if (!task) return;

    const currentStage = task.stage;
    const previousStage = prevStageRef.current;
    const workflowComplete = task.metadata?.workflow_complete;
    const prevWorkflowComplete = prevWorkflowCompleteRef.current;

    // Detect stage change
    if (currentStage !== previousStage) {
      // Determine transition type
      let transitionType = 'progress';

      if (currentStage === 'errored') {
        transitionType = 'error';
      } else if (currentStage === 'completed' || workflowComplete) {
        transitionType = 'completion';
      } else if (
        currentStage === 'ready-to-merge' ||
        currentStage === 'document' ||
        currentStage === 'pr'
      ) {
        transitionType = 'success';
      }

      // Set transition state
      setTransitionState({
        isTransitioning: true,
        transitionType,
        fromStage: previousStage,
        toStage: currentStage,
      });

      // Clear transition state after animation duration
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      animationTimeoutRef.current = setTimeout(() => {
        setTransitionState(prev => ({
          ...prev,
          isTransitioning: false,
        }));
      }, 1000); // Animation duration: 1 second

      // Update ref
      prevStageRef.current = currentStage;
    }

    // Detect workflow completion (without stage change)
    if (workflowComplete && !prevWorkflowComplete && currentStage === previousStage) {
      setTransitionState({
        isTransitioning: true,
        transitionType: 'completion',
        fromStage: currentStage,
        toStage: currentStage,
      });

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      animationTimeoutRef.current = setTimeout(() => {
        setTransitionState(prev => ({
          ...prev,
          isTransitioning: false,
        }));
      }, 1500); // Longer animation for completion

      prevWorkflowCompleteRef.current = workflowComplete;
    }

    // Cleanup
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [task]);

  /**
   * Get CSS class for transition animation
   * @returns {string} CSS animation class
   */
  const getTransitionClass = () => {
    if (!transitionState.isTransitioning) {
      return '';
    }

    switch (transitionState.transitionType) {
      case 'success':
        return 'stage-transition-success';
      case 'error':
        return 'stage-transition-error';
      case 'completion':
        return 'stage-transition-completion';
      case 'progress':
        return 'stage-transition-progress';
      default:
        return '';
    }
  };

  /**
   * Get glow effect class based on card state
   * @returns {string} CSS glow class
   */
  const getGlowClass = () => {
    if (!task) return '';

    // Active workflow (in progress)
    if (workflowProgress?.status === 'in_progress') {
      return 'card-glow-active';
    }

    // Completed workflow
    if (task.metadata?.workflow_complete || task.stage === 'completed') {
      return 'card-glow-success';
    }

    // Errored
    if (task.stage === 'errored') {
      return 'card-glow-error';
    }

    return '';
  };

  /**
   * Check if card should show pulsing animation
   * @returns {boolean} True if should pulse
   */
  const shouldPulse = () => {
    return workflowProgress?.status === 'in_progress';
  };

  /**
   * Manual trigger for transition animation
   * @param {string} type - Transition type
   */
  const triggerTransition = (type = 'progress') => {
    setTransitionState({
      isTransitioning: true,
      transitionType: type,
      fromStage: task?.stage,
      toStage: task?.stage,
    });

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      setTransitionState(prev => ({
        ...prev,
        isTransitioning: false,
      }));
    }, 1000);
  };

  return {
    transitionState,
    getTransitionClass,
    getGlowClass,
    shouldPulse,
    triggerTransition,
  };
};

export default useStageTransition;
