/**
 * @fileoverview Kanban Store - Central state management for the AgenticKanban application
 * Manages projects, tasks, stages, and coordinates between various services
 * Built with Zustand for reactive state management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import adwService from '../services/api/adwService';
import adwDbService from '../services/api/adwDbService';
import adwCreationService from '../services/adwCreationService';
import localStorageService from '../services/storage/localStorage';
import projectPersistenceService from '../services/storage/projectPersistenceService';
import recentProjectsService from '../services/storage/recentProjectsService';
import stageProgressionService from '../services/websocket/stageProgressionService';
import websocketService from '../services/websocket/websocketService';
import projectNotificationService from '../services/storage/projectNotificationService';
import dataMigration from '../utils/dataMigration';
import { getNextStageInWorkflow, isWorkflowComplete } from '../utils/workflowValidation';

import { WORK_ITEM_TYPES, QUEUEABLE_STAGES } from '../constants/workItems';

// Re-export for backward compatibility
export { WORK_ITEM_TYPES, QUEUEABLE_STAGES };

// Owner ID for kanban store listeners - used for bulk cleanup
const KANBAN_STORE_OWNER_ID = 'kanban-store';

/**
 * Utility function to parse workflow names and extract stage sequences
 * Handles both single-stage workflows (e.g., 'adw_plan_iso' -> ['plan'])
 * and composite workflows (e.g., 'adw_plan_build_test_iso' -> ['plan', 'build', 'test'])
 *
 * @param {string} workflowName - The workflow name (e.g., 'adw_plan_iso', 'adw_plan_build_test_iso')
 * @returns {string[]} Array of stage names in order
 */
const parseWorkflowStages = (workflowName) => {
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

  // Handle special case: 'orchestrator' maps to 'plan' as the initial stage
  // The orchestrator dynamically manages stage progression, but starts with plan
  if (stagesStr === 'orchestrator') {
    return ['plan'];
  }

  // Split by underscore to get stage array
  const stages = stagesStr.split('_').filter(s => s.length > 0);

  return stages;
};

/**
 * Get the initial stage for a workflow
 *
 * @param {string} workflowName - The workflow name
 * @returns {string|null} The initial stage, or null if cannot be determined
 */
const getInitialStageForWorkflow = (workflowName) => {
  const stages = parseWorkflowStages(workflowName);
  return stages.length > 0 ? stages[0] : null;
};

const initialState = {
  // Project management
  selectedProject: null,
  availableProjects: [],

  // Task management
  tasks: [],
  taskIdCounter: 1,

  // Kanban board configuration
  stages: [
    { id: 'backlog', name: 'Backlog', color: 'gray' },
    { id: 'plan', name: 'Plan', color: 'blue' },
    { id: 'build', name: 'Build', color: 'yellow' },
    { id: 'test', name: 'Test', color: 'green' },
    { id: 'review', name: 'Review', color: 'purple' },
    { id: 'document', name: 'Document', color: 'indigo' },
    { id: 'ready-to-merge', name: 'Ready to Merge', color: 'teal' },
    { id: 'completed', name: 'Completed', color: 'emerald' },
    { id: 'errored', name: 'Errored', color: 'red' },
  ],

  // ADW pipeline configurations
  availablePipelines: adwService.getAllPipelines(),

  // UI state
  showTaskInput: false,
  selectedTaskId: null,
  isLoading: false,
  error: null,
  showCompletedTasks: false,

  // WebSocket state
  websocketConnected: false,
  websocketConnecting: false,
  websocketError: null,
  // Cached websocket status object to prevent infinite re-renders
  websocketStatus: { connected: false, connecting: false, error: null, serverStatus: null },
  activeWorkflows: new Map(), // Map of adw_id -> workflow info
  workflowStatusUpdates: [], // Array of recent status updates
  taskWorkflowLogs: {}, // Map of taskId -> Array<logEntry> for real-time logs
  taskWorkflowProgress: {}, // Map of taskId -> progressData for progress tracking
  taskWorkflowMetadata: {}, // Map of taskId -> metadata for ADW metadata
  taskStageLogs: {}, // Map of taskId -> Map of stage -> { logs, result, loading, error }
  agentStates: {}, // Map of taskId -> { data, loading, error } for agent state metadata

  // Project notification state
  projectNotificationEnabled: true,
  projectNotificationConfigs: {}, // Map of projectId -> notification config
  projectNotificationStatus: {}, // Map of projectId -> connection status
  notificationHistory: [], // Array of recent notification attempts

  // Message deduplication cache to prevent duplicate workflow updates
  processedMessages: new Map(), // Map of message fingerprint -> timestamp
  messageDeduplicationMaxSize: 1000, // Maximum number of fingerprints to cache
  messageDeduplicationTTL: 5 * 60 * 1000, // 5 minutes in milliseconds

  // Task index for O(1) lookups by adw_id (performance optimization)
  tasksByAdwId: {}, // Map of adw_id -> taskId for fast lookup

  // ADW deletion state
  deletingAdws: {}, // Map of adw_id -> { loading: boolean, error: string | null } for tracking deletion state
  processedDeletions: new Set(), // Set of adw_ids that have been processed (deduplication)

  // Notifications state
  notifications: [], // Array of { id, type, message, timestamp }

  // Merge workflow state tracking
  mergingTasks: {}, // Map of taskId -> { status: 'pending'|'in_progress'|'success'|'error', message: string, timestamp: Date }


  // Cleanup state (internal)
  _cleanupScheduled: false,
};

export const useKanbanStore = create()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Initialize data migrations on store creation
        initializeStore: async () => {
          // Initialize project persistence service first
          const persistenceResult = projectPersistenceService.initialize();
          console.log('Project persistence service initialized:', persistenceResult);

          // Load projects from persistence service
          const projects = projectPersistenceService.getAllProjects();
          set({ availableProjects: projects }, false, 'loadProjectsFromPersistence');

          // Initialize project notification configurations
          get().initializeProjectNotificationConfigs();

          // Run data migrations
          const migrationResult = get().initializeDataMigrations();

          // Load ADWs from database
          await get().loadAdwsFromDatabase();

          console.log('Store initialization completed', { persistenceResult, migrationResult });
          return { persistenceResult, migrationResult };
        },

        /**
         * Load ADWs from the database and populate the Kanban board
         * Maps database ADW records to task objects
         */
        loadAdwsFromDatabase: async () => {
          try {
            set({ isLoading: true }, false, 'loadAdwsFromDatabase:start');
            console.log('Loading ADWs from database...');

            // Fetch all ADWs from the database
            const response = await adwDbService.listAdws();
            const { adws = [], total_count = 0 } = response;

            console.log(`Loaded ${total_count} ADWs from database`);

            if (adws.length === 0) {
              set({ isLoading: false }, false, 'loadAdwsFromDatabase:empty');
              return;
            }

            const currentState = get();
            let taskIdCounter = currentState.taskIdCounter;
            const newTasks = [];
            const newTasksByAdwId = { ...currentState.tasksByAdwId };

            // Transform each ADW database record to a task object
            for (const adw of adws) {
              const taskId = taskIdCounter++;

              const task = {
                id: taskId,
                title: adw.issue_title || `ADW ${adw.adw_id}`,
                description: adw.issue_body || '',
                workItemType: adw.issue_class || WORK_ITEM_TYPES.FEATURE,
                queuedStages: parseWorkflowStages(adw.workflow_name),
                pipelineId: adw.workflow_name || 'adw_unknown',
                pipelineIdStatic: adw.workflow_name,
                stage: adw.current_stage || 'backlog',
                substage: null,
                progress: 0,
                createdAt: adw.created_at || new Date().toISOString(),
                updatedAt: adw.updated_at || new Date().toISOString(),
                logs: [],
                // Include workflow_stages at top level for pipeline indicator
                // Prioritize API data, fall back to parsing from workflow_name
                workflow_stages: adw.workflow_stages || parseWorkflowStages(adw.workflow_name),
                workflow_name: adw.workflow_name,
                metadata: {
                  adw_id: adw.adw_id,
                  workflow_name: adw.workflow_name,
                  workflow_stages: adw.workflow_stages || parseWorkflowStages(adw.workflow_name),
                  issue_number: adw.issue_number,
                  branch_name: adw.branch_name,
                  worktree_path: adw.worktree_path,
                  backend_port: adw.backend_port,
                  websocket_port: adw.websocket_port,
                  frontend_port: adw.frontend_port,
                  model_set: adw.model_set,
                  data_source: adw.data_source,
                  orchestrator_state: adw.orchestrator_state,
                  patch_file: adw.patch_file,
                  patch_history: adw.patch_history,
                  is_stuck: adw.is_stuck,
                  completed_at: adw.completed_at,
                  autoProgress: false,
                },
                status: adw.status || 'pending',
                images: [],
              };

              newTasks.push(task);

              // Update the tasksByAdwId index for O(1) lookups
              if (adw.adw_id) {
                newTasksByAdwId[adw.adw_id] = taskId;
              }
            }

            // Update the store with all loaded tasks
            set({
              tasks: newTasks,
              taskIdCounter: taskIdCounter,
              tasksByAdwId: newTasksByAdwId,
              isLoading: false,
            }, false, 'loadAdwsFromDatabase:success');

            console.log(`Successfully loaded ${newTasks.length} tasks from database`);
          } catch (error) {
            console.error('Failed to load ADWs from database:', error);
            set({
              isLoading: false,
              error: `Failed to load tasks from database: ${error.message}`,
            }, false, 'loadAdwsFromDatabase:error');
          }
        },

        // ============================================================
        // Performance Optimization: O(1) Task Lookups by ADW ID
        // ============================================================

        /**
         * O(1) task lookup by adw_id using index
         * @param {string} adwId - The ADW ID to look up
         * @returns {object|null} The task object or null if not found
         */
        getTaskByAdwId: (adwId) => {
          if (!adwId) return null;
          const { tasksByAdwId, tasks } = get();
          const taskId = tasksByAdwId[adwId];
          if (!taskId) return null;
          // Final lookup by taskId (still O(n) but only once per adw_id, not on every message)
          return tasks.find(t => t.id === taskId) || null;
        },

        /**
         * Update the task index when adw_id changes
         * @param {number} taskId - The task ID
         * @param {string|null} adwId - The ADW ID to set, or null to clear
         * @param {'set'|'delete'} action - The action to perform
         */
        updateTaskAdwIndex: (taskId, adwId, action = 'set') => {
          set((state) => {
            const newIndex = { ...state.tasksByAdwId };
            if (action === 'set' && adwId) {
              newIndex[adwId] = taskId;
            } else if (action === 'delete') {
              // Find and remove by taskId
              for (const [key, value] of Object.entries(newIndex)) {
                if (value === taskId) {
                  delete newIndex[key];
                  break;
                }
              }
            }
            return { tasksByAdwId: newIndex };
          }, false, 'updateTaskAdwIndex');
        },

        // ============================================================
        // Performance Optimization: Background Message Cache Cleanup
        // ============================================================

        /**
         * Schedule background cleanup of expired messages using requestIdleCallback
         * This prevents blocking the main thread during high message throughput
         */
        scheduleMessageCacheCleanup: () => {
          if (get()._cleanupScheduled) return;

          set({ _cleanupScheduled: true }, false, 'scheduleCleanup');

          const doCleanup = () => {
            get().performMessageCacheCleanup();
            set({ _cleanupScheduled: false }, false, 'cleanupComplete');
          };

          // Use requestIdleCallback if available, otherwise setTimeout
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(doCleanup, { timeout: 5000 });
          } else {
            setTimeout(doCleanup, 100);
          }
        },

        /**
         * Perform the actual cleanup of expired messages (runs in background)
         */
        performMessageCacheCleanup: () => {
          const { processedMessages, messageDeduplicationTTL } = get();
          if (!(processedMessages instanceof Map)) return;

          const now = Date.now();
          const keysToDelete = [];

          // Collect keys to delete (safe iteration - no mutation during loop)
          for (const [key, timestamp] of processedMessages.entries()) {
            if (now - timestamp >= messageDeduplicationTTL) {
              keysToDelete.push(key);
            }
          }

          if (keysToDelete.length > 0) {
            // Create new Map to avoid mutation issues
            const newMap = new Map(processedMessages);
            keysToDelete.forEach(key => newMap.delete(key));
            set({ processedMessages: newMap }, false, 'cleanupExpiredMessages');
            console.log(`[Deduplication] Background cleanup: removed ${keysToDelete.length} expired entries`);
          }
        },

        // ============================================================
        // Performance Optimization: Batched State Updates
        // ============================================================

        /**
         * Batch multiple task-related updates into a single state mutation
         * This reduces React re-renders from 3-5 per message to just 1
         * @param {number} taskId - The task ID to update
         * @param {object} updates - Object containing updates to apply
         */
        batchedTaskUpdate: (taskId, updates) => {
          const { stage, metadata, progress, substage, workflowProgress, logEntry } = updates;

          set((state) => {
            let newTasks = state.tasks;
            let newTaskWorkflowLogs = state.taskWorkflowLogs;
            let newTaskWorkflowProgress = state.taskWorkflowProgress;

            // Update task if needed
            if (stage !== undefined || metadata || progress !== undefined || substage !== undefined) {
              newTasks = state.tasks.map(task => {
                if (task.id !== taskId) return task;
                return {
                  ...task,
                  ...(stage !== undefined && { stage, substage: null, progress: 0 }),
                  ...(substage !== undefined && { substage }),
                  ...(progress !== undefined && { progress }),
                  ...(metadata && { metadata: { ...task.metadata, ...metadata } }),
                  updatedAt: new Date().toISOString()
                };
              });
            }

            // Update workflow logs if needed
            if (logEntry) {
              const currentLogs = state.taskWorkflowLogs[taskId] || [];
              newTaskWorkflowLogs = {
                ...state.taskWorkflowLogs,
                [taskId]: [...currentLogs, {
                  ...logEntry,
                  id: `${taskId}-${Date.now()}-${Math.random()}`,
                  timestamp: logEntry.timestamp || new Date().toISOString(),
                }].slice(-500) // Keep last 500 logs
              };
            }

            // Update workflow progress if needed
            if (workflowProgress) {
              newTaskWorkflowProgress = {
                ...state.taskWorkflowProgress,
                [taskId]: { ...state.taskWorkflowProgress[taskId], ...workflowProgress }
              };
            }

            return {
              tasks: newTasks,
              taskWorkflowLogs: newTaskWorkflowLogs,
              taskWorkflowProgress: newTaskWorkflowProgress
            };
          }, false, 'batchedTaskUpdate');
        },

        // Project actions
        selectProject: (project) => {
          // Track project access time for recent projects feature
          if (project && project.id) {
            try {
              recentProjectsService.trackProjectAccess(project.id);
            } catch (error) {
              console.error('Failed to track project access:', error);
              // Don't block project selection if tracking fails
            }
          }

          set({ selectedProject: project }, false, 'selectProject');
        },

        deselectProject: () => {
          set({ selectedProject: null }, false, 'deselectProject');
        },

        addProject: (project) => {
          try {
            const result = projectPersistenceService.addProject(project);

            if (result.success) {
              // Update store with the new project from persistence service
              const projects = projectPersistenceService.getAllProjects();
              set({ availableProjects: projects }, false, 'addProject');
              return result;
            } else {
              // Handle validation errors
              set({ error: result.errors.join(', ') }, false, 'addProjectError');
              return result;
            }
          } catch (error) {
            const errorMessage = `Failed to add project: ${error.message}`;
            set({ error: errorMessage }, false, 'addProjectError');
            return { success: false, errors: [errorMessage], project: null };
          }
        },

        // Get current selected project for settings
        getCurrentProject: () => {
          return get().selectedProject;
        },

        // Get all projects from persistence service
        refreshProjects: () => {
          try {
            const projects = projectPersistenceService.getAllProjects();
            set({ availableProjects: projects }, false, 'refreshProjects');
            return { success: true, count: projects.length };
          } catch (error) {
            const errorMessage = `Failed to refresh projects: ${error.message}`;
            set({ error: errorMessage }, false, 'refreshProjectsError');
            return { success: false, error: errorMessage };
          }
        },

        // Update existing project
        updateProject: (projectId, updates) => {
          try {
            const result = projectPersistenceService.updateProject(projectId, updates);

            if (result.success) {
              // Refresh projects in store
              get().refreshProjects();

              // Update selected project if it was the one being updated
              const { selectedProject } = get();
              if (selectedProject && selectedProject.id === projectId) {
                set({ selectedProject: result.project }, false, 'updateSelectedProject');
              }
            } else {
              set({ error: result.errors.join(', ') }, false, 'updateProjectError');
            }

            return result;
          } catch (error) {
            const errorMessage = `Failed to update project: ${error.message}`;
            set({ error: errorMessage }, false, 'updateProjectError');
            return { success: false, errors: [errorMessage], project: null };
          }
        },

        // Remove project
        removeProject: (projectId) => {
          try {
            const success = projectPersistenceService.removeProject(projectId);

            if (success) {
              // Refresh projects in store
              get().refreshProjects();

              // Clear selected project if it was the one removed
              const { selectedProject } = get();
              if (selectedProject && selectedProject.id === projectId) {
                set({ selectedProject: null }, false, 'clearSelectedProject');
              }
            } else {
              set({ error: 'Failed to remove project' }, false, 'removeProjectError');
            }

            return success;
          } catch (error) {
            const errorMessage = `Failed to remove project: ${error.message}`;
            set({ error: errorMessage }, false, 'removeProjectError');
            return false;
          }
        },

        // Cleanup dummy projects manually
        cleanupDummyProjects: () => {
          try {
            const result = projectPersistenceService.removeDummyProjects();

            if (result.success) {
              // Refresh projects in store
              get().refreshProjects();

              // Clear selected project if it was a dummy
              const { selectedProject } = get();
              if (selectedProject && result.removedProjects.some(p => p.id === selectedProject.id)) {
                set({ selectedProject: null }, false, 'clearDummySelectedProject');
              }

              console.log(`Cleaned up ${result.removedCount} dummy projects`);
            } else {
              set({ error: result.error || 'Failed to cleanup dummy projects' }, false, 'cleanupDummyProjectsError');
            }

            return result;
          } catch (error) {
            const errorMessage = `Failed to cleanup dummy projects: ${error.message}`;
            set({ error: errorMessage }, false, 'cleanupDummyProjectsError');
            return { success: false, error: errorMessage };
          }
        },

        // Deduplicate projects
        deduplicateProjects: () => {
          try {
            const result = projectPersistenceService.deduplicateProjects();

            if (result.success) {
              // Refresh projects in store
              get().refreshProjects();

              console.log(`Deduplicated projects: removed ${result.removedCount} duplicates`);
            } else {
              set({ error: result.error || 'Failed to deduplicate projects' }, false, 'deduplicateProjectsError');
            }

            return result;
          } catch (error) {
            const errorMessage = `Failed to deduplicate projects: ${error.message}`;
            set({ error: errorMessage }, false, 'deduplicateProjectsError');
            return { success: false, error: errorMessage };
          }
        },

        // Get project storage statistics
        getProjectStorageStats: () => {
          try {
            return projectPersistenceService.getStorageStats();
          } catch (error) {
            console.error('Failed to get project storage stats:', error);
            return { error: error.message };
          }
        },

        // Export projects
        exportProjects: () => {
          try {
            return projectPersistenceService.exportProjects();
          } catch (error) {
            const errorMessage = `Failed to export projects: ${error.message}`;
            set({ error: errorMessage }, false, 'exportProjectsError');
            return null;
          }
        },

        // Import projects
        importProjects: (importData) => {
          try {
            const result = projectPersistenceService.importProjects(importData);

            if (result.success) {
              // Refresh projects in store
              get().refreshProjects();
              console.log(`Imported ${result.importedCount} projects`);
            } else {
              set({ error: result.error || 'Failed to import projects' }, false, 'importProjectsError');
            }

            return result;
          } catch (error) {
            const errorMessage = `Failed to import projects: ${error.message}`;
            set({ error: errorMessage }, false, 'importProjectsError');
            return { success: false, error: errorMessage };
          }
        },

        // Task actions
        createTask: async (taskData) => {
          const currentState = get();
          const taskId = currentState.taskIdCounter;

          // Prepare task data with ID for ADW creation
          const taskWithId = {
            ...taskData,
            id: taskId,
          };

          // Get current project context for ADW creation
          const projectContext = currentState.selectedProject || {};

          try {
            // Create ADW configuration using the new service
            const adwConfig = adwCreationService.createAdwConfiguration(taskWithId, projectContext);

            // Generate dynamic pipeline name based on queuedStages
            const generatePipelineName = (queuedStages) => {
              if (!queuedStages || queuedStages.length === 0) {
                return 'adw_unknown';
              }
              return `adw_${queuedStages.join('_')}`;
            };

            const dynamicPipelineId = generatePipelineName(taskData.queuedStages);

            const newTask = {
              id: taskId,
              title: taskData.title || adwConfig.task_metadata.title, // Use generated title if not provided
              description: taskData.description,
              workItemType: taskData.workItemType || WORK_ITEM_TYPES.FEATURE,
              queuedStages: taskData.queuedStages || [],
              pipelineId: dynamicPipelineId, // Dynamic pipeline name based on stages
              pipelineIdStatic: taskData.pipelineId, // Keep static pipelineId for backward compatibility
              stage: 'backlog',
              substage: null,
              progress: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              logs: [],
              // Set workflow_stages for pipeline indicator display
              workflow_stages: taskData.queuedStages || [],
              workflow_name: adwConfig.workflow_name,
              metadata: {
                // ADW metadata from the new service
                adw_id: adwConfig.adw_id,
                workflow_name: adwConfig.workflow_name,
                workspace_id: adwConfig.workspace_id,
                state_config: adwConfig.state,
                execution_context: adwConfig.execution_context,
                worktree: adwConfig.worktree,
                outputs: adwConfig.outputs,
                // Legacy metadata
                autoProgress: false,
                // Clarification metadata
                clarificationStatus: 'pending',
                clarificationResult: null,
                clarificationHistory: [],
              },
              images: taskData.images || [], // Support for uploaded images
            };

            // Persist to database
            try {
              await adwDbService.createAdw({
                adw_id: adwConfig.adw_id,
                issue_title: newTask.title,
                issue_body: newTask.description,
                issue_class: newTask.workItemType,
                current_stage: newTask.stage,
                status: 'pending',
                workflow_name: adwConfig.workflow_name,
                branch_name: adwConfig.worktree?.branch_name,
                worktree_path: adwConfig.worktree?.path,
                data_source: 'kanban',
              });
              console.log(`Successfully persisted ADW ${adwConfig.adw_id} to database`);
            } catch (dbError) {
              console.error('Failed to persist ADW to database:', dbError);
              // Continue with local task creation even if database persistence fails
            }

            set((state) => {
              const newState = {
                tasks: [...state.tasks, newTask],
                taskIdCounter: state.taskIdCounter + 1,
                showTaskInput: false,
              };
              // Update tasksByAdwId index immediately when task is created with adw_id
              // This ensures logs can be matched to tasks before triggerWorkflow completes
              if (adwConfig.adw_id) {
                newState.tasksByAdwId = { ...state.tasksByAdwId, [adwConfig.adw_id]: taskId };
              }
              return newState;
            }, false, 'createTask');

            // Send project notification after successful task creation
            get().sendProjectNotification(newTask);

            // Auto-trigger clarification in background (non-blocking)
            // This pre-warms the clarification so it's ready when user opens the task
            if (newTask.description && adwConfig.adw_id) {
              setTimeout(() => {
                get().triggerClarification(newTask.id, newTask.description).catch(error => {
                  console.warn('Background clarification failed (non-critical):', error.message);
                });
              }, 200);
            }

            // Auto-trigger workflow if "Start Immediately" was clicked
            if (taskData.startImmediately && taskData.queuedStages && taskData.queuedStages.length > 0) {
              setTimeout(() => {
                try {
                  get().triggerWorkflowForTask(newTask.id);
                } catch (error) {
                  console.error('Failed to auto-trigger workflow:', error);
                }
              }, 100);
            }

            return newTask;

          } catch (error) {
            console.error('Failed to create ADW configuration:', error);

            // Fallback to creating task without ADW configuration
            const fallbackPipelineId = `adw_${(taskData.queuedStages || []).join('_')}_iso`;
            const fallbackTask = {
              id: taskId,
              title: taskData.title || '',
              description: taskData.description,
              workItemType: taskData.workItemType || WORK_ITEM_TYPES.FEATURE,
              queuedStages: taskData.queuedStages || [],
              pipelineId: fallbackPipelineId,
              pipelineIdStatic: taskData.pipelineId,
              stage: 'backlog',
              substage: null,
              progress: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              logs: [],
              // Set workflow_stages for pipeline indicator display
              workflow_stages: taskData.queuedStages || [],
              workflow_name: fallbackPipelineId,
              metadata: {
                autoProgress: false,
                adw_creation_error: error.message,
              },
              images: taskData.images || [],
            };

            set((state) => ({
              tasks: [...state.tasks, fallbackTask],
              taskIdCounter: state.taskIdCounter + 1,
              showTaskInput: false,
            }), false, 'createTask');

            // Send project notification even for fallback task creation
            get().sendProjectNotification(fallbackTask);

            // Auto-trigger workflow if "Start Immediately" was clicked
            if (taskData.startImmediately && taskData.queuedStages && taskData.queuedStages.length > 0) {
              setTimeout(() => {
                try {
                  get().triggerWorkflowForTask(fallbackTask.id);
                } catch (error) {
                  console.error('Failed to auto-trigger workflow:', error);
                }
              }, 100);
            }

            return fallbackTask;
          }
        },

        updateTask: async (taskId, updates) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) return;

          const adwId = task.metadata?.adw_id;

          // Apply optimistic update to local state
          set((state) => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { ...task, ...updates, updatedAt: new Date().toISOString() }
                : task
            ),
          }), false, 'updateTask');

          // Sync to database if task has adw_id
          if (adwId) {
            try {
              const dbUpdateData = {};

              // Map frontend updates to database fields
              if (updates.stage !== undefined) dbUpdateData.current_stage = updates.stage;
              if (updates.title !== undefined) dbUpdateData.issue_title = updates.title;
              if (updates.description !== undefined) dbUpdateData.issue_body = updates.description;
              if (updates.workItemType !== undefined) dbUpdateData.issue_class = updates.workItemType;
              if (updates.metadata?.is_stuck !== undefined) dbUpdateData.is_stuck = updates.metadata.is_stuck;
              if (updates.metadata?.completed_at !== undefined) dbUpdateData.completed_at = updates.metadata.completed_at;
              if (updates.metadata?.patch_file !== undefined) dbUpdateData.patch_file = updates.metadata.patch_file;
              if (updates.metadata?.branch_name !== undefined) dbUpdateData.branch_name = updates.metadata.branch_name;
              if (updates.metadata?.worktree_path !== undefined) dbUpdateData.worktree_path = updates.metadata.worktree_path;

              if (Object.keys(dbUpdateData).length > 0) {
                await adwDbService.updateAdw(adwId, dbUpdateData);
                console.log(`Successfully synced task ${taskId} (ADW ${adwId}) to database`);
              }
            } catch (error) {
              console.error(`Failed to sync task ${taskId} to database:`, error);
              // Revert optimistic update on failure
              set((state) => ({
                tasks: state.tasks.map(t =>
                  t.id === taskId ? task : t
                ),
              }), false, 'updateTask:revert');
            }
          }
        },

        deleteTask: async (taskId) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) return;

          const adwId = task.metadata?.adw_id;

          // Delete from database first if task has adw_id
          if (adwId) {
            try {
              await adwDbService.deleteAdw(adwId);
              console.log(`Successfully deleted ADW ${adwId} from database (triggers worktree cleanup)`);
            } catch (error) {
              console.error(`Failed to delete ADW ${adwId} from database:`, error);
              // Show error notification to user
              get().addNotification({
                type: 'error',
                message: `Failed to delete task: ${error.message}`,
              });
              return; // Don't delete from local state if database delete fails
            }
          }

          // Delete from local state
          set((state) => {
            // Clean up the tasksByAdwId index
            const newTasksByAdwId = { ...state.tasksByAdwId };
            if (adwId) {
              delete newTasksByAdwId[adwId];
            }

            return {
              tasks: state.tasks.filter(task => task.id !== taskId),
              selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
              tasksByAdwId: newTasksByAdwId,
            };
          }, false, 'deleteTask');
        },

        // Clarification Methods
        approveClarification: (taskId) => {
          set((state) => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    stage: 'plan', // Move directly to plan after approval (skip backlog)
                    metadata: {
                      ...task.metadata,
                      clarificationStatus: 'approved',
                      clarificationApprovedAt: new Date().toISOString(),
                    },
                    updatedAt: new Date().toISOString(),
                  }
                : task
            ),
          }), false, 'approveClarification');
        },

        // Trigger clarification workflow via backend API
        // When feedback is provided WITH previous understanding, uses fast /clarify-refine
        // Otherwise uses full /clarify (reads PROJECT_CONTEXT.md)
        triggerClarification: async (taskId, description, feedback = null) => {
          const state = get();
          const task = state.tasks.find(t => t.id === taskId);
          if (!task) return;

          const adwId = task.metadata?.adw_id;
          if (!adwId) {
            console.error('No ADW ID found for task', taskId);
            return;
          }

          // Get previous understanding if available (for fast refinement)
          const previousResult = task.metadata?.clarificationResult;
          const previousUnderstanding = previousResult?.understanding || null;
          const previousQuestions = previousResult?.questions || null;

          try {
            const wsPort = import.meta.env.VITE_ADW_PORT || 8500;
            const response = await fetch(`http://localhost:${wsPort}/api/clarify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task_id: taskId,
                description: description,
                adw_id: adwId,
                feedback: feedback,
                // Pass previous understanding for fast refinement when feedback is provided
                previous_understanding: feedback ? previousUnderstanding : null,
                previous_questions: feedback ? previousQuestions : null,
              })
            });

            if (!response.ok) {
              throw new Error('Failed to trigger clarification');
            }

            const result = await response.json();

            // Update task with clarification result
            get().updateClarificationResult(taskId, result);
          } catch (error) {
            console.error('Clarification failed:', error);
            throw error;
          }
        },

        updateClarificationResult: (taskId, clarificationResult) => {
          set((state) => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    metadata: {
                      ...task.metadata,
                      clarificationResult,
                      clarificationHistory: [
                        ...(task.metadata.clarificationHistory || []),
                        {
                          timestamp: new Date().toISOString(),
                          result: clarificationResult,
                          status: clarificationResult.status,
                        },
                      ],
                    },
                    updatedAt: new Date().toISOString(),
                  }
                : task
            ),
          }), false, 'updateClarificationResult');
        },

        moveTaskToStage: async (taskId, newStage) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) return;

          const adwId = task.metadata?.adw_id;
          const oldStage = task.stage;

          // Apply optimistic update to local state
          set((state) => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    stage: newStage,
                    substage: null,
                    progress: 0,
                    updatedAt: new Date().toISOString()
                  }
                : task
            ),
          }), false, 'moveTaskToStage');

          // Sync to database if task has adw_id
          if (adwId) {
            try {
              await adwDbService.updateAdw(adwId, {
                current_stage: newStage,
              });
              console.log(`Successfully moved task ${taskId} (ADW ${adwId}) from ${oldStage} to ${newStage} in database`);
            } catch (error) {
              console.error(`Failed to move task ${taskId} to stage ${newStage} in database:`, error);
              // Revert to old stage on failure
              set((state) => ({
                tasks: state.tasks.map(t =>
                  t.id === taskId
                    ? { ...t, stage: oldStage, updatedAt: new Date().toISOString() }
                    : t
                ),
              }), false, 'moveTaskToStage:revert');
            }
          }
        },

        updateTaskProgress: (taskId, substage, progress) => {
          set((state) => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    substage,
                    progress,
                    updatedAt: new Date().toISOString()
                  }
                : task
            ),
          }), false, 'updateTaskProgress');
        },

        addTaskLog: (taskId, logEntry) => {
          set((state) => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    logs: [...task.logs, {
                      ...logEntry,
                      timestamp: new Date().toISOString(),
                    }],
                    updatedAt: new Date().toISOString()
                  }
                : task
            ),
          }), false, 'addTaskLog');
        },

        // Enhanced error handling
        handleError: (error, context = '') => {
          console.error(`KanbanStore Error${context ? ` (${context})` : ''}:`, error);

          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorDetails = {
            message: errorMessage,
            context,
            timestamp: new Date().toISOString(),
            stack: error instanceof Error ? error.stack : undefined,
          };

          set({
            error: errorMessage,
            lastError: errorDetails,
          }, false, 'handleError');

          // Return false to indicate operation failed
          return false;
        },

        // Retry mechanism for failed operations
        retryOperation: async (operation, maxRetries = 3, delay = 1000) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const result = await operation();
              return result;
            } catch (error) {
              if (attempt === maxRetries) {
                get().handleError(error, `Failed after ${maxRetries} attempts`);
                throw error;
              }

              console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error);
              await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
          }
        },

        // Validation helpers
        validateTask: (task) => {
          const errors = [];

          // Title is now optional, but if provided, must be reasonable length
          if (task.title && task.title.length > 100) {
            errors.push('Task title must be less than 100 characters');
          }

          // Description is required
          if (!task.description || task.description.trim().length === 0) {
            errors.push('Task description is required');
          }

          // Work item type validation
          if (!task.workItemType || !Object.values(WORK_ITEM_TYPES).includes(task.workItemType)) {
            errors.push('Valid work item type is required (Feature, Chore, Bug, or Patch)');
          }

          // Queued stages validation (skip for patch type - patch doesn't use stages)
          const isPatchType = task.workItemType === WORK_ITEM_TYPES.PATCH;

          if (task.queuedStages && !Array.isArray(task.queuedStages)) {
            errors.push('Queued stages must be an array');
          }

          // Patch type doesn't require stages; other types do
          if (!isPatchType && task.queuedStages && task.queuedStages.length === 0) {
            errors.push('At least one stage must be selected');
          }

          // Validate each queued stage (only if stages are provided)
          if (task.queuedStages && task.queuedStages.length > 0) {
            const validStageIds = QUEUEABLE_STAGES.map(s => s.id);
            const invalidStages = task.queuedStages.filter(stage => !validStageIds.includes(stage));
            if (invalidStages.length > 0) {
              errors.push(`Invalid stages selected: ${invalidStages.join(', ')}`);
            }
          }

          // Custom ADW ID validation (optional field)
          if (task.customAdwId && task.customAdwId.trim()) {
            const adwId = task.customAdwId.trim();

            // Check format: alphanumeric, hyphens, underscores only, 1-100 characters
            const validAdwIdPattern = /^[a-zA-Z0-9_-]{1,100}$/;
            if (!validAdwIdPattern.test(adwId)) {
              errors.push('ADW ID must contain only alphanumeric characters, hyphens, and underscores (1-100 characters)');
            }
          }

          return {
            isValid: errors.length === 0,
            errors,
          };
        },

        validateProject: (project) => {
          const errors = [];

          if (!project.name || project.name.trim().length === 0) {
            errors.push('Project name is required');
          }

          if (!project.path || project.path.trim().length === 0) {
            errors.push('Project path is required');
          }

          // Simplified validation - no longer requires specific directory structures
          // ADW workflows will be created dynamically as needed

          return {
            isValid: errors.length === 0,
            errors,
          };
        },

        // UI actions
        toggleTaskInput: () => {
          set((state) => ({ showTaskInput: !state.showTaskInput }), false, 'toggleTaskInput');
        },

        selectTask: (taskId) => {
          set({ selectedTaskId: taskId }, false, 'selectTask');
        },

        setLoading: (isLoading) => {
          set({ isLoading }, false, 'setLoading');
        },

        setError: (error) => {
          set({ error }, false, 'setError');
        },

        clearError: () => {
          set({ error: null }, false, 'clearError');
        },

        // Utility actions
        getTasksByStage: (stage) => {
          return get().tasks.filter(task => task.stage === stage);
        },

        getTasksForCurrentProject: () => {
          const { tasks, selectedProject } = get();
          return selectedProject
            ? tasks.filter(task => task.projectId === selectedProject.id)
            : tasks;
        },

        // Completed tasks management
        getCompletedTasks: () => {
          const { tasks } = get();
          // Only tasks in the 'completed' stage are shown in the Completed Tasks modal
          // Tasks move to 'completed' stage after successful merge
          return tasks.filter(task => task.stage === 'completed');
        },

        toggleCompletedTasksView: () => {
          set((state) => ({ showCompletedTasks: !state.showCompletedTasks }), false, 'toggleCompletedTasksView');
        },

        getPipelineById: (pipelineId) => {
          return adwService.getPipelineById(pipelineId);
        },

        // ADW Pipeline management
        refreshPipelines: () => {
          set({ availablePipelines: adwService.getAllPipelines() }, false, 'refreshPipelines');
        },

        createCustomPipeline: (pipelineData) => {
          try {
            const newPipeline = adwService.createCustomPipeline(pipelineData);
            set({ availablePipelines: adwService.getAllPipelines() }, false, 'createCustomPipeline');
            return newPipeline;
          } catch (error) {
            set({ error: error.message }, false, 'createCustomPipelineError');
            throw error;
          }
        },

        getNextStageInPipeline: (pipelineId, currentStage) => {
          try {
            return adwService.getNextStage(pipelineId, currentStage);
          } catch (error) {
            console.error('Error getting next stage:', error);
            return null;
          }
        },

        calculateTaskProgress: (task) => {
          try {
            return adwService.calculatePipelineProgress(task.pipelineId, task.stage, task.substage);
          } catch (error) {
            console.error('Error calculating progress:', error);
            return task.progress || 0;
          }
        },

        // Automatic stage progression
        startTaskProgression: (taskId) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            set({ error: 'Task not found for progression' }, false, 'startTaskProgressionError');
            return false;
          }

          try {
            stageProgressionService.startProgression(taskId, { getState: get });

            // Update task metadata to indicate active progression
            set((state) => ({
              tasks: state.tasks.map(t =>
                t.id === taskId
                  ? { ...t, metadata: { ...t.metadata, autoProgress: true } }
                  : t
              ),
            }), false, 'startTaskProgression');

            return true;
          } catch (error) {
            set({ error: `Failed to start progression: ${error.message}` }, false, 'startTaskProgressionError');
            return false;
          }
        },

        stopTaskProgression: (taskId) => {
          stageProgressionService.stopProgression(taskId);

          // Update task metadata
          set((state) => ({
            tasks: state.tasks.map(t =>
              t.id === taskId
                ? { ...t, metadata: { ...t.metadata, autoProgress: false } }
                : t
            ),
          }), false, 'stopTaskProgression');
        },

        pauseTaskProgression: (taskId) => {
          stageProgressionService.pauseProgression(taskId);
        },

        resumeTaskProgression: (taskId) => {
          stageProgressionService.resumeProgression(taskId);
        },

        recoverTaskFromError: async (taskId, targetStage = null) => {
          try {
            await stageProgressionService.recoverFromError(taskId, { getState: get }, targetStage);
            return true;
          } catch (error) {
            set({ error: `Recovery failed: ${error.message}` }, false, 'recoverTaskFromErrorError');
            return false;
          }
        },

        forceAdvanceTask: (taskId, targetStage) => {
          try {
            stageProgressionService.forceAdvanceToStage(taskId, { getState: get }, targetStage);
            return true;
          } catch (error) {
            set({ error: `Force advance failed: ${error.message}` }, false, 'forceAdvanceTaskError');
            return false;
          }
        },

        getTaskProgressionStatus: (taskId) => {
          return stageProgressionService.getProgressionStatus(taskId);
        },

        getAllActiveProgressions: () => {
          return stageProgressionService.getActiveProgressions();
        },

        // Data export/import
        exportData: () => {
          const state = get();
          const exportData = {
            selectedProject: state.selectedProject,
            availableProjects: state.availableProjects,
            tasks: state.tasks,
            taskIdCounter: state.taskIdCounter,
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
          };

          return localStorageService.setItem('backup', exportData) ? exportData : null;
        },

        importData: (importData) => {
          try {
            if (!importData || typeof importData !== 'object') {
              throw new Error('Invalid import data format');
            }

            set({
              selectedProject: importData.selectedProject || null,
              availableProjects: importData.availableProjects || [],
              tasks: importData.tasks || [],
              taskIdCounter: importData.taskIdCounter || 1,
            }, false, 'importData');

            return true;
          } catch (error) {
            set({ error: `Import failed: ${error.message}` }, false, 'importDataError');
            return false;
          }
        },

        // Storage management
        getStorageInfo: () => {
          return localStorageService.getStorageInfo();
        },

        clearAllData: () => {
          const success = localStorageService.clear();
          if (success) {
            set(initialState, false, 'clearAllData');
          }
          return success;
        },

        // Task filtering and search
        searchTasks: (query) => {
          const { tasks } = get();
          if (!query) return tasks;

          const lowercaseQuery = query.toLowerCase();
          return tasks.filter(task =>
            task.title.toLowerCase().includes(lowercaseQuery) ||
            task.description.toLowerCase().includes(lowercaseQuery) ||
            task.stage.toLowerCase().includes(lowercaseQuery) ||
            task.substage.toLowerCase().includes(lowercaseQuery)
          );
        },

        getTasksByPipeline: (pipelineId) => {
          const { tasks } = get();
          return tasks.filter(task => task.pipelineId === pipelineId);
        },

        getTasksByDateRange: (startDate, endDate) => {
          const { tasks } = get();
          return tasks.filter(task => {
            const taskDate = new Date(task.createdAt);
            return taskDate >= startDate && taskDate <= endDate;
          });
        },

        // Statistics
        getStatistics: () => {
          const { tasks } = get();

          const stats = {
            totalTasks: tasks.length,
            byStage: {},
            byPipeline: {},
            completedTasks: 0,
            inProgressTasks: 0,
            erroredTasks: 0,
            averageProgress: 0,
          };

          // Calculate statistics
          let totalProgress = 0;

          tasks.forEach(task => {
            // By stage
            stats.byStage[task.stage] = (stats.byStage[task.stage] || 0) + 1;

            // By pipeline
            stats.byPipeline[task.pipelineId] = (stats.byPipeline[task.pipelineId] || 0) + 1;

            // Status counts
            if (task.stage === 'errored') {
              stats.erroredTasks++;
            } else if (task.stage === 'document' && task.progress === 100) {
              stats.completedTasks++;
            } else {
              stats.inProgressTasks++;
            }

            totalProgress += task.progress || 0;
          });

          stats.averageProgress = tasks.length > 0 ? Math.round(totalProgress / tasks.length) : 0;

          return stats;
        },

        // WebSocket management
        initializeWebSocket: async () => {
          try {
            // Guard: Prevent duplicate listener registration using owner-based check
            if (websocketService.hasListenersByOwner(KANBAN_STORE_OWNER_ID)) {
              console.log('[WebSocket] Listeners already registered for kanban-store, skipping re-initialization');
              // Still attempt to connect if not connected
              if (!websocketService.isConnected && !websocketService.isConnecting) {
                await websocketService.connect();
              }
              return;
            }

            set({
              websocketConnecting: true,
              websocketError: null,
              websocketStatus: { connected: false, connecting: true, error: null, serverStatus: websocketService.getStatus() }
            }, false, 'initializeWebSocket');

            // Create listener functions locally
            const onConnect = () => {
              // Clear the deduplication cache on reconnection to prevent stale fingerprints
              const freshMap = new Map();
              console.log('[KanbanStore] WebSocket connected: Clearing processedMessages cache');
              set({
                websocketConnected: true,
                websocketConnecting: false,
                websocketError: null,
                websocketStatus: { connected: true, connecting: false, error: null, serverStatus: websocketService.getStatus() },
                processedMessages: freshMap
              }, false, 'websocketConnected');
              // Exit startup phase on successful connection
              websocketService.exitStartupPhase();

              // Sync task stages from backend on connect/reconnect
              // This ensures frontend state matches backend after any missed WebSocket events
              console.log('[KanbanStore] WebSocket connected: Triggering stage sync...');
              get().syncTaskStagesFromBackend().catch(error => {
                console.error('[KanbanStore] Stage sync failed:', error);
              });
            };

            const onDisconnect = () => {
              set({
                websocketConnected: false,
                websocketConnecting: false,
                websocketStatus: { connected: false, connecting: false, error: null, serverStatus: websocketService.getStatus() }
              }, false, 'websocketDisconnected');
            };

            const onError = (error) => {
              const errorMsg = error.message || 'WebSocket error';
              set({
                websocketError: errorMsg,
                websocketConnecting: false,
                websocketStatus: { connected: get().websocketConnected, connecting: false, error: errorMsg, serverStatus: websocketService.getStatus() }
              }, false, 'websocketError');
            };

            const onStatusUpdate = (statusUpdate) => {
              try {
                get().handleWorkflowStatusUpdate(statusUpdate);
              } catch (error) {
                console.error('[WORKFLOW ERROR] Error handling status update:', error);
              }
            };

            const onWorkflowLog = (logEntry) => {
              try {
                get().handleWorkflowLog(logEntry);
              } catch (error) {
                console.error('[WORKFLOW ERROR] Error handling workflow log:', error);
              }
            };

            const onTriggerResponse = (response) => {
              try {
                get().handleTriggerResponse(response);
              } catch (error) {
                console.error('[WORKFLOW ERROR] Error handling trigger response:', error);
              }
            };

            const onStageTransition = (transitionData) => {
              try {
                get().handleStageTransition(transitionData);
              } catch (error) {
                console.error('[WORKFLOW ERROR] Error handling stage transition:', error);
              }
            };

            const onAgentLog = (data) => {
              try {
                get().handleAgentLog(data);
              } catch (error) {
                console.error('[KanbanStore] Error handling agent log:', error);
              }
            };

            const onThinkingBlock = (data) => {
              try {
                get().handleThinkingBlock(data);
              } catch (error) {
                console.error('[KanbanStore] Error handling thinking block:', error);
              }
            };

            const onToolUsePre = (data) => {
              try {
                get().handleToolUsePre(data);
              } catch (error) {
                console.error('[KanbanStore] Error handling tool use pre:', error);
              }
            };

            const onToolUsePost = (data) => {
              try {
                get().handleToolUsePost(data);
              } catch (error) {
                console.error('[KanbanStore] Error handling tool use post:', error);
              }
            };

            const onTextBlock = (data) => {
              try {
                get().handleTextBlock(data);
              } catch (error) {
                console.error('[KanbanStore] Error handling text block:', error);
              }
            };

            const onFileChanged = (data) => {
              try {
                get().handleFileChanged(data);
              } catch (error) {
                console.error('[KanbanStore] Error handling file changed:', error);
              }
            };

            const onAgentSummaryUpdate = (data) => {
              try {
                get().handleAgentSummaryUpdate(data);
              } catch (error) {
                console.error('[KanbanStore] Error handling agent summary update:', error);
              }
            };

            const onSystemLog = (data) => {
              try {
                get().handleSystemLog(data);
              } catch (error) {
                console.error('[KanbanStore] Error handling system log:', error);
              }
            };

            const onStartupConnectionFailed = (data) => {
              console.warn('[KanbanStore] Startup connection failed:', data.message);
              set({
                websocketError: 'Backend unavailable - running in offline mode',
                websocketConnecting: false
              }, false, 'websocketOfflineMode');
            };

            // Register all listeners with owner tracking for proper cleanup
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'connect', onConnect);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'disconnect', onDisconnect);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'error', onError);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'status_update', onStatusUpdate);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'workflow_log', onWorkflowLog);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'trigger_response', onTriggerResponse);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'stage_transition', onStageTransition);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'agent_log', onAgentLog);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'thinking_block', onThinkingBlock);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'tool_use_pre', onToolUsePre);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'tool_use_post', onToolUsePost);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'text_block', onTextBlock);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'file_changed', onFileChanged);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'agent_summary_update', onAgentSummaryUpdate);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'system_log', onSystemLog);
            websocketService.onWithOwner(KANBAN_STORE_OWNER_ID, 'startup_connection_failed', onStartupConnectionFailed);

            // Attempt connection - may fail if backend unavailable, but listeners are registered
            try {
              await websocketService.connect();
            } catch (error) {
              // Connection failed but listeners are registered
              // App can still function and will reconnect when backend becomes available
              console.warn('[KanbanStore] Initial connection failed, running in offline mode:', error.message);
              const offlineError = 'Backend unavailable - will reconnect automatically';
              set({
                websocketConnected: false,
                websocketConnecting: false,
                websocketError: offlineError,
                websocketStatus: { connected: false, connecting: false, error: offlineError, serverStatus: websocketService.getStatus() }
              }, false, 'websocketOfflineMode');
              // Don't throw - allow app to continue in offline mode
            }

          } catch (error) {
            const initError = error.message || 'Failed to initialize WebSocket';
            set({
              websocketError: initError,
              websocketConnecting: false,
              websocketStatus: { connected: false, connecting: false, error: initError, serverStatus: websocketService.getStatus() }
            }, false, 'initializeWebSocketError');
            console.error('Failed to initialize WebSocket:', error);
          }
        },

        disconnectWebSocket: () => {
          console.log('[WebSocket] Disconnecting and cleaning up listeners');

          // Remove all listeners registered by kanban store using owner-based cleanup
          websocketService.offAllByOwner(KANBAN_STORE_OWNER_ID);

          // Disconnect the WebSocket
          websocketService.disconnect();

          set({
            websocketConnected: false,
            websocketConnecting: false,
            websocketError: null,
            websocketStatus: { connected: false, connecting: false, error: null, serverStatus: null }
          }, false, 'disconnectWebSocket');
        },

        // Workflow triggering via WebSocket
        triggerWorkflowForTask: async (taskId, options = {}) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            const error = new Error('Task not found');
            console.error('[WORKFLOW ERROR] Task not found:', taskId);
            throw error;
          }

          try {
            console.log('[WORKFLOW] Starting workflow trigger for task:', taskId, 'with options:', options);
            set({ isLoading: true }, false, 'triggerWorkflowForTask');

            // Determine workflow type based on task's current stage and queued stages
            const workflowType = options.workflowType ||
              websocketService.getWorkflowTypeForStage(task.stage, task.queuedStages);

            if (!workflowType) {
              throw new Error('Workflow type is required. Please select a workflow type.');
            }

            // Determine model set based on work item type
            const modelSet = options.modelSet ||
              websocketService.getModelSetForWorkItem(task.workItemType);

            const triggerOptions = {
              adw_id: options.adw_id || task.metadata?.adw_id,
              issue_number: options.issue_number,
              model_set: modelSet,
              ...options
            };

            console.log('[WORKFLOW] Triggering workflow:', workflowType, 'with options:', triggerOptions);

            // Trigger workflow via WebSocket
            const response = await websocketService.triggerWorkflowForTask(task, workflowType, triggerOptions);

            console.log('[WORKFLOW] Received response with ADW ID:', response.adw_id);
            console.log('[WORKFLOW] Immediately updating task with ADW ID to prevent log matching race condition');

            // CRITICAL: Update task with ADW ID IMMEDIATELY to prevent race condition
            // where logs arrive before the task has been updated with the ADW ID.
            // This must happen BEFORE moving the task or tracking the workflow.
            const initialStage = getInitialStageForWorkflow(response.workflow_name);
            const shouldMoveStage = initialStage && task.stage === 'backlog';

            // Atomic update: set ADW ID and optionally move stage in a single operation
            // Also update the tasksByAdwId index for O(1) lookups
            set((state) => ({
              tasks: state.tasks.map(t =>
                t.id === taskId
                  ? {
                      ...t,
                      stage: shouldMoveStage ? initialStage : t.stage,
                      substage: shouldMoveStage ? null : t.substage,
                      progress: shouldMoveStage ? 0 : t.progress,
                      metadata: {
                        ...t.metadata,
                        adw_id: response.adw_id,
                        workflow_name: response.workflow_name,
                        workflow_status: 'started',
                        logs_path: response.logs_path,
                      },
                      updatedAt: new Date().toISOString()
                    }
                  : t
              ),
              // Update the O(1) lookup index
              tasksByAdwId: { ...state.tasksByAdwId, [response.adw_id]: taskId },
            }), false, 'setAdwIdAndMoveStage');

            console.log('[WORKFLOW] Task updated with ADW ID:', response.adw_id, 'stage:', shouldMoveStage ? initialStage : task.stage);

            // Track the active workflow
            get().trackActiveWorkflow(response.adw_id, {
              taskId,
              workflowName: response.workflow_name,
              status: 'started',
              logsPath: response.logs_path,
              startedAt: new Date().toISOString(),
            });

            set({ isLoading: false }, false, 'triggerWorkflowForTaskSuccess');
            return response;

          } catch (error) {
            // Log error but don't let it propagate to ErrorBoundary
            console.error('[WORKFLOW ERROR] Failed to trigger workflow for task:', taskId, error);
            console.error('[WORKFLOW ERROR] Stack trace:', error.stack);

            set({
              isLoading: false,
              error: `Failed to trigger workflow: ${error.message}`
            }, false, 'triggerWorkflowForTaskError');

            // Re-throw so caller can handle it, but it will be caught by try-catch in components
            throw error;
          }
        },

        // Apply patch to an existing task
        // Flow: Move to Implement -> Run patch -> Test -> Ready to Merge
        applyPatch: async (taskId, patchRequest) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            const error = new Error('Task not found');
            console.error('[PATCH ERROR] Task not found:', taskId);
            throw error;
          }

          const adwId = task.metadata?.adw_id;
          if (!adwId) {
            const error = new Error('Cannot apply patch: Task has no ADW ID');
            console.error('[PATCH ERROR] No ADW ID for task:', taskId);
            throw error;
          }

          try {
            console.log('[PATCH] Starting patch for task:', taskId, 'ADW ID:', adwId);
            set({ isLoading: true }, false, 'applyPatch');

            // Calculate patch number from existing history
            const existingHistory = task.metadata?.patch_history || [];
            const patchNumber = existingHistory.length + 1;
            console.log('[PATCH] This is patch #' + patchNumber);

            // Create new patch entry
            const newPatchEntry = {
              patch_number: patchNumber,
              patch_reason: patchRequest,
              timestamp: new Date().toISOString(),
              status: 'pending',
            };

            // Update task with patch request in metadata and move to build stage
            // Note: The kanban board uses 'build' as the stage id, not 'implement'
            set((state) => ({
              tasks: state.tasks.map(t =>
                t.id === taskId
                  ? {
                      ...t,
                      stage: 'build',
                      substage: null,
                      progress: 0,
                      metadata: {
                        ...t.metadata,
                        patch_request: patchRequest,
                        patch_status: 'pending',
                        patch_number: patchNumber,
                        patch_started_at: new Date().toISOString(),
                        patch_history: [...existingHistory, newPatchEntry],
                      },
                      updatedAt: new Date().toISOString()
                    }
                  : t
              ),
            }), false, 'applyPatch_updateTask');

            // Persist initial patch state to database
            try {
              await adwDbService.updateAdw(adwId, {
                current_stage: 'build',
                patch_history: [...existingHistory, newPatchEntry],
              });
              console.log(`[PATCH] Persisted patch #${patchNumber} to database for ADW ${adwId}`);
            } catch (dbError) {
              console.error('[PATCH ERROR] Failed to persist patch to database:', dbError);
              // Revert local state on database failure
              set((state) => ({
                tasks: state.tasks.map(t =>
                  t.id === taskId ? task : t
                ),
                isLoading: false,
                error: `Failed to save patch: ${dbError.message}`
              }), false, 'applyPatch_dbError');
              throw dbError;
            }

            // Get the updated task
            const updatedTask = get().tasks.find(t => t.id === taskId);

            // Trigger patch workflow via WebSocket
            const response = await websocketService.triggerWorkflowForTask(
              updatedTask,
              'adw_patch_iso',
              {
                adw_id: adwId,
                issue_number: String(taskId),
                patch_request: patchRequest,
              }
            );

            console.log('[PATCH] Patch workflow triggered successfully:', response);

            // Update task with workflow response and update patch history status
            set((state) => ({
              tasks: state.tasks.map(t => {
                if (t.id !== taskId) return t;

                // Update the latest patch entry in history to in_progress and add adw_id
                const updatedHistory = (t.metadata?.patch_history || []).map((entry, idx, arr) =>
                  idx === arr.length - 1 ? {
                    ...entry,
                    status: 'in_progress',
                    adw_id: response.adw_id || response.workflow_id
                  } : entry
                );

                return {
                  ...t,
                  metadata: {
                    ...t.metadata,
                    workflow_name: response.workflow_name,
                    workflow_status: 'started',
                    patch_status: 'in_progress',
                    logs_path: response.logs_path,
                    patch_history: updatedHistory,
                  },
                  updatedAt: new Date().toISOString()
                };
              }),
            }), false, 'applyPatch_workflowStarted');

            // Persist workflow started state to database
            // Get the updated history with in_progress status and patch adw_id
            const taskAfterWorkflow = get().tasks.find(t => t.id === taskId);
            const historyAfterWorkflow = taskAfterWorkflow?.metadata?.patch_history || [];
            try {
              await adwDbService.updateAdw(adwId, {
                workflow_name: response.workflow_name,
                patch_history: historyAfterWorkflow,
              });
              console.log(`[PATCH] Persisted workflow started state to database for ADW ${adwId}`);
            } catch (dbError) {
              // Log but don't fail - the patch workflow has already started
              console.error('[PATCH WARNING] Failed to persist workflow state:', dbError);
            }

            // Track the active workflow
            get().trackActiveWorkflow(adwId, {
              taskId,
              workflowName: response.workflow_name,
              status: 'started',
              logsPath: response.logs_path,
              startedAt: new Date().toISOString(),
              isPatch: true,
            });

            set({ isLoading: false }, false, 'applyPatchSuccess');
            return response;

          } catch (error) {
            console.error('[PATCH ERROR] Failed to apply patch:', taskId, error);

            // Revert task stage on failure and update patch history
            set((state) => ({
              tasks: state.tasks.map(t => {
                if (t.id !== taskId) return t;

                // Update the latest patch entry in history to failed
                const updatedHistory = (t.metadata?.patch_history || []).map((entry, idx, arr) =>
                  idx === arr.length - 1 ? { ...entry, status: 'failed', error: error.message } : entry
                );

                return {
                  ...t,
                  metadata: {
                    ...t.metadata,
                    patch_status: 'failed',
                    patch_error: error.message,
                    patch_history: updatedHistory,
                  },
                  updatedAt: new Date().toISOString()
                };
              }),
              isLoading: false,
              error: `Failed to apply patch: ${error.message}`
            }), false, 'applyPatchError');

            // Persist failed state to database (best effort)
            const failedTask = get().tasks.find(t => t.id === taskId);
            const failedHistory = failedTask?.metadata?.patch_history || [];
            try {
              await adwDbService.updateAdw(adwId, {
                patch_history: failedHistory,
              });
              console.log(`[PATCH] Persisted failed patch state to database for ADW ${adwId}`);
            } catch (dbError) {
              console.error('[PATCH WARNING] Failed to persist error state:', dbError);
            }

            throw error;
          }
        },

        // Helper function to generate message fingerprint for deduplication
        getMessageFingerprint: (messageType, data) => {
          // Create a unique fingerprint based on message characteristics
          // NOTE: timestamp is intentionally excluded because it makes every message unique,
          // defeating the purpose of deduplication. Only content-based fields are included.
          const adw_id = data.adw_id || '';
          const status = data.status || '';
          const level = data.level || '';
          const message = data.message || '';
          const progress = data.progress_percent !== undefined ? data.progress_percent : '';
          const step = data.current_step || '';

          // Combine fields to create unique fingerprint (without timestamp)
          const fingerprint = `${messageType}:${adw_id}:${status}${level}:${progress}:${step}:${message}`;
          return fingerprint;
        },

        // Helper function to check and record message for deduplication
        isDuplicateMessage: (messageType, data) => {
          const fingerprint = get().getMessageFingerprint(messageType, data);
          let { processedMessages, messageDeduplicationMaxSize, messageDeduplicationTTL, tasks } = get();

          // Defensive check: Ensure processedMessages is a Map instance
          // This prevents crashes if the Map becomes corrupted (e.g., from localStorage serialization)
          if (!(processedMessages instanceof Map)) {
            console.error('[Deduplication] processedMessages is not a Map! Type:', typeof processedMessages);
            console.error('[Deduplication] Recreating Map to recover from corruption');
            processedMessages = new Map();
            set({ processedMessages }, false, 'recreateProcessedMessagesMap');
            // Allow this message through since we can't verify if it's a duplicate
            return false;
          }

          // Check if message was already processed
          if (processedMessages.has(fingerprint)) {
            const processedTime = processedMessages.get(fingerprint);
            const now = Date.now();

            // Check if the fingerprint is still within TTL
            if (now - processedTime < messageDeduplicationTTL) {
              // For status_update messages, check if task state indicates message hasn't been applied
              // This handles the reconnection scenario where cache is cleared but state wasn't updated
              if (messageType === 'status_update' && data.current_step && data.adw_id) {
                const task = get().getTaskByAdwId(data.adw_id);
                if (task && data.current_step) {
                  const stageMatch = data.current_step.match(/^Stage:\s*(\w+)/i);
                  if (stageMatch) {
                    const targetStage = stageMatch[1].toLowerCase();
                    // If task is not in the target stage, allow reprocessing
                    // This handles page refresh where state was lost and needs to be restored
                    if (task.stage !== targetStage) {
                      console.log(`[Deduplication] Allowing reprocessing: task stage (${task.stage}) doesn't match target (${targetStage})`);
                      // Don't return true - allow processing to continue
                      // But still record it with new timestamp to prevent actual duplicates
                      processedMessages.set(fingerprint, now);
                      set({ processedMessages }, false, 'updateMessageDeduplicationCache');
                      return false; // Not considered a duplicate in this case
                    }
                  }
                }
              }

              console.warn(`[Deduplication] Ignoring duplicate ${messageType}:`, {
                fingerprint: fingerprint.substring(0, 100),
                cacheSize: processedMessages.size
              });
              return true; // It's a duplicate
            }
            // Fingerprint expired, remove it
            processedMessages.delete(fingerprint);
          }

          // Record this message as processed
          processedMessages.set(fingerprint, Date.now());

          // Cleanup old entries if cache is too large (safe iteration - collect then delete)
          if (processedMessages.size > messageDeduplicationMaxSize) {
            console.warn(`[Deduplication] Cache size (${processedMessages.size}) exceeded max size (${messageDeduplicationMaxSize})`);
            // Remove oldest entries (first 20% of max size) - collect keys first to avoid mutation during iteration
            const entriesToRemove = Math.floor(messageDeduplicationMaxSize * 0.2);
            const keysToRemove = Array.from(processedMessages.keys()).slice(0, entriesToRemove);
            keysToRemove.forEach(key => processedMessages.delete(key));
            console.log(`[Deduplication] Cache cleanup: removed ${keysToRemove.length} old entries, size now: ${processedMessages.size}`);
          }

          // Schedule background cleanup instead of blocking on every message
          // Only trigger cleanup check occasionally (every ~50 messages or when cache is 80% full)
          const shouldTriggerCleanup = processedMessages.size > messageDeduplicationMaxSize * 0.8;
          if (shouldTriggerCleanup && !get()._cleanupScheduled) {
            get().scheduleMessageCacheCleanup();
          }

          // Update the store with modified cache
          set({ processedMessages }, false, 'updateMessageDeduplicationCache');

          return false; // Not a duplicate
        },

        // Handle workflow status updates from WebSocket
        handleWorkflowStatusUpdate: (statusUpdate) => {
          // Check for duplicate messages
          if (get().isDuplicateMessage('status_update', statusUpdate)) {
            return; // Skip processing duplicate
          }

          const { adw_id, status, message, progress_percent, current_step } = statusUpdate;

          console.log('[WebSocket] Processing new status update:', { adw_id, status, progress_percent, current_step, message });

          // Update active workflow tracking
          set((state) => {
            const activeWorkflows = new Map(state.activeWorkflows);
            const workflow = activeWorkflows.get(adw_id);

            if (workflow) {
              activeWorkflows.set(adw_id, {
                ...workflow,
                status,
                lastUpdate: message,
                progress: progress_percent,
                currentStep: current_step,
                updatedAt: new Date().toISOString(),
              });
            }

            // Add to status updates history (keep last 100)
            const workflowStatusUpdates = [
              ...state.workflowStatusUpdates,
              { ...statusUpdate, receivedAt: new Date().toISOString() }
            ].slice(-100);

            return { activeWorkflows, workflowStatusUpdates };
          }, false, 'handleWorkflowStatusUpdate');

          // Find task using O(1) index lookup instead of O(n) array scan
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            // Calculate stage transition (if any)
            let newStage = undefined;
            if (current_step && typeof current_step === 'string') {
              const stageMatch = current_step.match(/^Stage:\s*(\w+)/i);
              if (stageMatch) {
                const targetStage = stageMatch[1].toLowerCase();
                const validStages = ['plan', 'build', 'test', 'review', 'document'];
                if (validStages.includes(targetStage)) {
                  const workflowStages = parseWorkflowStages(task.metadata?.workflow_name || '');
                  const targetIndex = workflowStages.indexOf(targetStage);
                  const currentIndex = workflowStages.indexOf(task.stage);
                  if ((targetIndex === -1 || currentIndex === -1 || targetIndex > currentIndex) && task.stage !== targetStage) {
                    console.log(`[Workflow] Auto-transitioning task from ${task.stage} to ${targetStage} (detected from current_step: "${current_step}")`);
                    newStage = targetStage;
                  }
                }
              }
            }

            // PERFORMANCE: Single batched update instead of 3 separate set() calls
            get().batchedTaskUpdate(task.id, {
              stage: newStage,
              metadata: {
                workflow_status: status,
                workflow_message: message,
                workflow_progress: progress_percent,
                workflow_step: current_step,
              },
              workflowProgress: {
                status,
                progress: progress_percent,
                currentStep: current_step,
                message,
                timestamp: statusUpdate.timestamp || new Date().toISOString(),
              }
            });

            // Handle status-based actions
            // NOTE: Stage transitions are now handled via explicit 'stage_transition' events
            // from the backend. The 'completed' status here is just informational.
            // Only 'failed' status triggers automatic stage change (to 'errored')
            if (status === 'completed') {
              // Check if this is a merge worktree completion (special case)
              const adwIds = task.metadata?.adw_ids || [];
              if (adwIds.includes('adw_merge_iso') ||
                  (statusUpdate.workflow_name && statusUpdate.workflow_name.includes('merge_iso'))) {
                console.log(`[Workflow] Merge worktree completed for ADW ${adw_id}`);
                get().handleMergeCompletion(adw_id);
              }
              // For all other 'completed' statuses, we just log it
              // The backend will send a 'stage_transition' event to move the task
              console.log(`[Workflow] Status 'completed' received for ${adw_id}. Waiting for stage_transition event.`);
            } else if (status === 'failed') {
              // Check if this is a merge workflow failure (special case)
              if (statusUpdate.workflow_name && statusUpdate.workflow_name.includes('merge_iso')) {
                console.log(`[Workflow] Merge workflow failed for ${adw_id}`);
                get().handleMergeFailure(adw_id, statusUpdate.message || 'Merge failed');
              } else {
                // Failed status automatically moves to errored stage
                console.log(`[Workflow] Workflow failed for ${adw_id}, moving to errored`);
                get().batchedTaskUpdate(task.id, { stage: 'errored' });
              }
            }
          }
        },

        // Handle workflow log entries from WebSocket
        handleWorkflowLog: (logEntry) => {
          if (import.meta.env.DEV) {
            console.log('[KanbanStore] handleWorkflowLog received:', JSON.stringify(logEntry, null, 2));
          }

          // Check for duplicate messages
          if (get().isDuplicateMessage('workflow_log', logEntry)) {
            if (import.meta.env.DEV) {
              console.log('[KanbanStore] Duplicate log entry detected, skipping:', logEntry);
            }
            return; // Skip processing duplicate
          }

          const { adw_id } = logEntry;

          // Find task using O(1) index lookup
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            if (import.meta.env.DEV) {
              console.log('[KanbanStore] Processing log for task:', task.title);
            }
            get().appendWorkflowLog(task.id, logEntry);
          } else {
            console.error('[KanbanStore] ❌ NO TASK FOUND for log entry with adw_id:', adw_id);
            console.error('[KanbanStore] Available task adw_ids:', Object.keys(get().tasksByAdwId));
          }
        },

        // Handle trigger response from WebSocket
        handleTriggerResponse: (response) => {
          // Check for duplicate messages
          if (get().isDuplicateMessage('trigger_response', response)) {
            return; // Skip processing duplicate
          }

          const { adw_id, status, workflow_name, message } = response;

          console.log('[WebSocket] Processing new trigger response:', { adw_id, status, workflow_name, message });

          // Find task using O(1) index lookup
          const task = get().getTaskByAdwId(adw_id);

          if (task && status === 'accepted') {
            get().updateWorkflowMetadata(task.id, {
              adw_id,
              workflow_name,
              status: 'accepted',
              message,
              logs_path: response.logs_path,
              plan_file: response.plan_file,
              triggeredAt: new Date().toISOString(),
            });
          }
        },

        // Handle explicit stage transition events from WebSocket
        // This is the PRIMARY mechanism for stage progression - backend tells frontend where to go
        handleStageTransition: (transitionData) => {
          const { adw_id, from_stage, to_stage } = transitionData;

          console.log('[WebSocket] Stage Transition:', { adw_id, from_stage, to_stage });

          // Find task using O(1) index lookup
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            // All valid kanban stages including terminal states
            const validStages = [
              'backlog',
              'plan', 'build', 'test', 'review', 'document',  // Workflow stages
              'ready-to-merge', 'pr', 'completed',             // Terminal success states
              'errored'                                         // Error state
            ];

            if (validStages.includes(to_stage)) {
              console.log(`[Workflow] Moving task from ${task.stage} to ${to_stage} via stage transition event`);
              get().moveTaskToStage(task.id, to_stage);

              // Handle terminal states with additional metadata updates
              if (to_stage === 'ready-to-merge' || to_stage === 'completed') {
                // Update patch history if this was a patch workflow
                let updatedPatchHistory = task.metadata?.patch_history;
                if (task.metadata?.patch_status === 'in_progress' && updatedPatchHistory?.length > 0) {
                  updatedPatchHistory = updatedPatchHistory.map((entry, idx, arr) =>
                    idx === arr.length - 1 ? { ...entry, status: 'completed' } : entry
                  );
                }

                get().updateTask(task.id, {
                  metadata: {
                    ...task.metadata,
                    workflow_complete: true,
                    patch_status: task.metadata?.patch_status === 'in_progress' ? 'completed' : task.metadata?.patch_status,
                    patch_history: updatedPatchHistory,
                  },
                  progress: 100,
                });
              } else if (to_stage === 'errored') {
                get().updateTask(task.id, {
                  metadata: {
                    ...task.metadata,
                    workflow_status: 'failed',
                  },
                });
              }
            } else {
              console.warn(`[Workflow] Invalid target stage: ${to_stage}`);
            }
          } else {
            console.warn('[WebSocket] No task found for stage transition with adw_id:', adw_id);
          }
        },

        // Sync task stages from backend - called on WebSocket reconnect or page load
        // This ensures frontend stage state matches backend state
        syncTaskStagesFromBackend: async () => {
          const { tasks } = get();
          const backendUrl = import.meta.env.VITE_BACKEND_URL;

          if (!backendUrl) {
            console.warn('[StageSync] VITE_BACKEND_URL not set, skipping stage sync');
            return;
          }

          // Find all tasks with adw_ids that are in workflow stages (not completed/errored)
          const workflowStages = ['backlog', 'plan', 'build', 'test', 'review', 'document', 'ready-to-merge'];
          const tasksToSync = tasks.filter(task =>
            task.metadata?.adw_id &&
            workflowStages.includes(task.stage)
          );

          if (tasksToSync.length === 0) {
            console.log('[StageSync] No tasks to sync');
            return;
          }

          console.log(`[StageSync] Syncing ${tasksToSync.length} tasks with backend...`);

          // Sync each task's stage from backend
          for (const task of tasksToSync) {
            try {
              const adwId = task.metadata.adw_id;
              const response = await fetch(`${backendUrl}/api/adws/${adwId}`);

              if (!response.ok) {
                console.warn(`[StageSync] Failed to fetch ADW ${adwId}: ${response.status}`);
                continue;
              }

              const data = await response.json();

              // Check if backend has a different stage than frontend
              if (data.current_stage && data.current_stage !== task.stage) {
                console.log(`[StageSync] Updating task ${task.id} from stage '${task.stage}' to '${data.current_stage}'`);

                // Move task to the correct stage
                get().moveTaskToStage(task.id, data.current_stage);

                // Handle terminal states
                if (data.current_stage === 'ready-to-merge' || data.current_stage === 'completed') {
                  get().updateTask(task.id, {
                    metadata: {
                      ...task.metadata,
                      workflow_complete: true,
                      workflow_status: data.workflow_status,
                    },
                    progress: 100,
                  });
                } else if (data.current_stage === 'errored') {
                  get().updateTask(task.id, {
                    metadata: {
                      ...task.metadata,
                      workflow_status: 'failed',
                    },
                  });
                } else {
                  // Update workflow status for in-progress stages
                  get().updateTask(task.id, {
                    metadata: {
                      ...task.metadata,
                      workflow_status: data.workflow_status,
                    },
                  });
                }
              }
            } catch (error) {
              console.error(`[StageSync] Error syncing task ${task.id}:`, error);
            }
          }

          console.log('[StageSync] Stage sync complete');
        },

        // Sync a single task's stage from backend
        syncSingleTaskStage: async (taskId) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task || !task.metadata?.adw_id) {
            return;
          }

          const backendUrl = import.meta.env.VITE_BACKEND_URL;
          if (!backendUrl) {
            return;
          }

          try {
            const adwId = task.metadata.adw_id;
            const response = await fetch(`${backendUrl}/api/adws/${adwId}`);

            if (!response.ok) {
              console.warn(`[StageSync] Failed to fetch ADW ${adwId}: ${response.status}`);
              return;
            }

            const data = await response.json();

            if (data.current_stage && data.current_stage !== task.stage) {
              console.log(`[StageSync] Syncing task ${task.id} from '${task.stage}' to '${data.current_stage}'`);
              get().moveTaskToStage(task.id, data.current_stage);

              // Handle terminal states
              if (data.current_stage === 'ready-to-merge' || data.current_stage === 'completed') {
                get().updateTask(task.id, {
                  metadata: {
                    ...task.metadata,
                    workflow_complete: true,
                    workflow_status: data.workflow_status,
                  },
                  progress: 100,
                });
              }
            }

            return data;
          } catch (error) {
            console.error(`[StageSync] Error syncing task ${task.id}:`, error);
          }
        },

        // Handle agent_log events
        handleAgentLog: (data) => {
          const { adw_id, level, message, timestamp, session_id, model } = data;
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            const enrichedLog = {
              entry_type: level === 'ERROR' ? 'system' : 'system',
              subtype: level?.toLowerCase() || 'info',
              message: message || 'Agent log entry',
              timestamp: timestamp || new Date().toISOString(),
              session_id,
              model,
              raw_data: data,
              adw_id,
            };
            get().appendWorkflowLog(task.id, enrichedLog);
          }
        },

        // Handle thinking_block events
        handleThinkingBlock: (data) => {
          const { adw_id, content, timestamp, session_id, model } = data;
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            const enrichedLog = {
              entry_type: 'assistant',
              subtype: 'thinking',
              message: content || 'Thinking...',
              timestamp: timestamp || new Date().toISOString(),
              session_id,
              model,
              raw_data: data,
              adw_id,
            };
            get().appendWorkflowLog(task.id, enrichedLog);
          }
        },

        // Handle tool_use_pre events
        handleToolUsePre: (data) => {
          const { adw_id, tool_name, tool_input, timestamp, session_id, model } = data;
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            const enrichedLog = {
              entry_type: 'assistant',
              subtype: 'tool_call',
              message: `Calling tool: ${tool_name}`,
              tool_name,
              tool_input,
              timestamp: timestamp || new Date().toISOString(),
              session_id,
              model,
              raw_data: data,
              adw_id,
            };
            get().appendWorkflowLog(task.id, enrichedLog);
          }
        },

        // Handle tool_use_post events
        handleToolUsePost: (data) => {
          const { adw_id, tool_name, usage, timestamp, session_id, model, stop_reason } = data;
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            const enrichedLog = {
              entry_type: 'result',
              subtype: 'tool_result',
              message: `Tool result: ${tool_name}`,
              tool_name,
              usage,
              stop_reason,
              timestamp: timestamp || new Date().toISOString(),
              session_id,
              model,
              raw_data: data,
              adw_id,
            };
            get().appendWorkflowLog(task.id, enrichedLog);
          }
        },

        // Handle text_block events
        handleTextBlock: (data) => {
          const { adw_id, content, timestamp, session_id, model } = data;
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            const enrichedLog = {
              entry_type: 'assistant',
              subtype: 'text',
              message: content || 'Text output',
              timestamp: timestamp || new Date().toISOString(),
              session_id,
              model,
              raw_data: data,
              adw_id,
            };
            get().appendWorkflowLog(task.id, enrichedLog);
          }
        },

        // Handle file_changed events
        handleFileChanged: (data) => {
          const { adw_id, file_path, change_type, timestamp } = data;
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            const enrichedLog = {
              entry_type: 'system',
              subtype: 'file_operation',
              message: `File ${change_type || 'changed'}: ${file_path}`,
              timestamp: timestamp || new Date().toISOString(),
              raw_data: data,
              adw_id,
            };
            get().appendWorkflowLog(task.id, enrichedLog);
          }
        },

        // Handle agent_summary_update events
        handleAgentSummaryUpdate: (data) => {
          const { adw_id, summary, timestamp, current_step } = data;
          const task = get().getTaskByAdwId(adw_id);

          if (task) {
            const enrichedLog = {
              entry_type: 'system',
              subtype: 'summary',
              message: summary || 'Agent summary update',
              current_step,
              timestamp: timestamp || new Date().toISOString(),
              raw_data: data,
              adw_id,
            };
            get().appendWorkflowLog(task.id, enrichedLog);
          }
        },

        /**
         * Handle system log events from WebSocket, including worktree deletion
         */
        handleSystemLog: (data) => {
          console.log('[KanbanStore] Received system_log event:', data);

          const { context, level, message } = data;

          // Check if this is a worktree deletion event
          if (context && context.event_type === 'worktree_deleted' && context.adw_id) {
            const adw_id = context.adw_id;
            console.log(`[KanbanStore] Processing worktree_deleted event for ${adw_id}`);

            // Check if we've already processed this deletion (deduplication)
            const { processedDeletions } = get();
            if (processedDeletions && processedDeletions.has(adw_id)) {
              console.log(`[KanbanStore] Skipping duplicate worktree_deleted event for ${adw_id}`);
              return;
            }

            // Mark this deletion as processed
            set((state) => ({
              processedDeletions: new Set([...(state.processedDeletions || []), adw_id])
            }), false, 'markDeletionProcessed');

            // Find the task associated with this ADW
            const task = get().getTaskByAdwId(adw_id);

            if (task) {
              console.log(`[KanbanStore] Deleting task ${task.id} associated with ADW ${adw_id}`);

              // Delete the task from the kanban board
              get().deleteTask(task.id);

              // Clear deletion loading state
              set((state) => {
                const deletingAdws = { ...state.deletingAdws };
                delete deletingAdws[adw_id];
                return { deletingAdws };
              }, false, 'worktreeDeletedSuccess');

              // Show success notification
              get().addNotification('success', message || `ADW ${adw_id} deleted successfully`, 5000);
              console.log(`✅ ${message || `ADW ${adw_id} deleted successfully`}`);

              // Clear from processedDeletions after a delay to allow cleanup
              setTimeout(() => {
                set((state) => {
                  const newSet = new Set(state.processedDeletions || []);
                  newSet.delete(adw_id);
                  return { processedDeletions: newSet };
                }, false, 'clearProcessedDeletion');
              }, 5000);
            } else {
              console.warn(`[KanbanStore] No task found for ADW ${adw_id}`);
            }
          } else if (context && context.event_type === 'worktree_delete_failed' && context.adw_id) {
            const adw_id = context.adw_id;
            console.error(`[KanbanStore] Worktree deletion failed for ${adw_id}: ${message}`);

            // Update deletion state with error
            set((state) => ({
              deletingAdws: {
                ...state.deletingAdws,
                [adw_id]: { loading: false, error: message || 'Deletion failed' }
              }
            }), false, 'worktreeDeleteFailed');

            // Show error notification
            get().addNotification('error', message || `Failed to delete ADW ${adw_id}`, 7000);
          } else {
            // Generic system log - just log it
            console.log(`[SystemLog] ${level}: ${message}`);
          }
        },

        // Append log entry to task
        appendWorkflowLog: (taskId, logEntry) => {
          console.log('[KanbanStore] appendWorkflowLog called for taskId:', taskId, 'logEntry:', logEntry);

          // Validate that task exists
          const { tasks } = get();
          const taskExists = tasks.some(t => t.id === taskId);

          console.log('[KanbanStore] appendWorkflowLog called for taskId:', taskId);
          console.log('[KanbanStore] Task exists:', taskExists);

          if (!taskExists) {
            console.error('[KanbanStore] ❌ Task not found for taskId:', taskId, 'Available task IDs:', tasks.map(t => t.id));
            // Still store the log in case task is added later
          }

          set((state) => {
            const currentLogs = state.taskWorkflowLogs[taskId] || [];
            const previousLogCount = currentLogs.length;
            const newLogs = [...currentLogs, {
              ...logEntry,
              id: `${taskId}-${Date.now()}-${Math.random()}`,
              timestamp: logEntry.timestamp || new Date().toISOString(),
            }];

            // Keep last 500 logs per task to prevent memory issues
            const limitedLogs = newLogs.slice(-500);

            console.log('[KanbanStore] ✅ Appended log to store. Previous logs:', previousLogCount, '→ New logs:', limitedLogs.length);
            console.log('[KanbanStore] Log entry stored:', {
              taskId,
              logId: limitedLogs[limitedLogs.length - 1].id,
              level: logEntry.level,
              message: logEntry.message?.substring(0, 100)
            });

            return {
              taskWorkflowLogs: {
                ...state.taskWorkflowLogs,
                [taskId]: limitedLogs,
              }
            };
          }, false, 'appendWorkflowLog');
        },

        // Update workflow progress for task
        updateWorkflowProgress: (taskId, progressData) => {
          set((state) => ({
            taskWorkflowProgress: {
              ...state.taskWorkflowProgress,
              [taskId]: {
                ...state.taskWorkflowProgress[taskId],
                ...progressData,
                updatedAt: new Date().toISOString(),
              }
            }
          }), false, 'updateWorkflowProgress');
        },

        // Update workflow metadata for task
        updateWorkflowMetadata: (taskId, metadata) => {
          set((state) => ({
            taskWorkflowMetadata: {
              ...state.taskWorkflowMetadata,
              [taskId]: {
                ...state.taskWorkflowMetadata[taskId],
                ...metadata,
                updatedAt: new Date().toISOString(),
              }
            }
          }), false, 'updateWorkflowMetadata');
        },

        // Get workflow logs for task (pure getter - NO state mutations!)
        getWorkflowLogsForTask: (taskId) => {
          const { taskWorkflowLogs, tasks } = get();

          // First try direct lookup by task ID
          if (taskWorkflowLogs[taskId] && taskWorkflowLogs[taskId].length > 0) {
            return taskWorkflowLogs[taskId];
          }

          // Fallback: Find task by ID to get its ADW ID, then search for logs by ADW ID
          const task = tasks.find(t => t.id === taskId);
          if (task?.metadata?.adw_id) {
            // Search through all logs to find any with matching ADW ID
            for (const [, logs] of Object.entries(taskWorkflowLogs)) {
              if (logs.length > 0 && logs[0].adw_id === task.metadata.adw_id) {
                // Return logs directly - do NOT call set() here!
                // State mutations in getters cause infinite re-render loops
                return logs;
              }
            }
          }

          return [];
        },

        // Get workflow progress for task
        getWorkflowProgressForTask: (taskId) => {
          const { taskWorkflowProgress } = get();
          return taskWorkflowProgress[taskId] || null;
        },

        // Get workflow metadata for task
        getWorkflowMetadataForTask: (taskId) => {
          const { taskWorkflowMetadata } = get();
          return taskWorkflowMetadata[taskId] || null;
        },

        // Get workflow plan file path for task
        getWorkflowPlanForTask: (taskId) => {
          const { taskWorkflowMetadata } = get();
          const metadata = taskWorkflowMetadata[taskId];
          return metadata?.plan_file || null;
        },

        // Clear workflow logs for task
        clearWorkflowLogsForTask: (taskId) => {
          set((state) => {
            const taskWorkflowLogs = { ...state.taskWorkflowLogs };
            delete taskWorkflowLogs[taskId];
            return { taskWorkflowLogs };
          }, false, 'clearWorkflowLogsForTask');
        },

        // ===== Stage-specific logs actions =====

        // Fetch stage-specific logs for a task
        fetchStageLogsForTask: async (taskId, adwId, stage) => {
          if (!taskId || !adwId || !stage) {
            console.error('[StageLogsStore] Missing required parameters:', { taskId, adwId, stage });
            return;
          }

          // Set loading state
          set((state) => ({
            taskStageLogs: {
              ...state.taskStageLogs,
              [taskId]: {
                ...(state.taskStageLogs[taskId] || {}),
                [stage]: {
                  logs: [],
                  result: null,
                  loading: true,
                  error: null,
                  stageFolder: null,
                  hasStreamingLogs: false,
                  hasResult: false,
                }
              }
            }
          }), false, 'fetchStageLogsForTask:loading');

          try {
            // Get backend URL from environment (required - set via .ports.env)
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            if (!backendUrl) {
              throw new Error('VITE_BACKEND_URL environment variable is required');
            }

            // Fetch stage logs from backend
            const response = await fetch(`${backendUrl}/api/stage-logs/${adwId}/${stage}`);

            if (!response.ok) {
              throw new Error(`Failed to fetch stage logs: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            console.log(`[StageLogsStore] Fetched logs for stage '${stage}':`, data);

            // Update state with fetched logs
            set((state) => ({
              taskStageLogs: {
                ...state.taskStageLogs,
                [taskId]: {
                  ...(state.taskStageLogs[taskId] || {}),
                  [stage]: {
                    logs: data.logs || [],
                    result: data.result,
                    loading: false,
                    error: data.error || null,
                    stageFolder: data.stage_folder,
                    hasStreamingLogs: data.has_streaming_logs,
                    hasResult: data.has_result,
                    fetchedAt: new Date().toISOString(),
                  }
                }
              }
            }), false, 'fetchStageLogsForTask:success');

          } catch (error) {
            console.error(`[StageLogsStore] Error fetching stage logs for ${stage}:`, error);

            // Update state with error
            set((state) => ({
              taskStageLogs: {
                ...state.taskStageLogs,
                [taskId]: {
                  ...(state.taskStageLogs[taskId] || {}),
                  [stage]: {
                    logs: [],
                    result: null,
                    loading: false,
                    error: error.message,
                    stageFolder: null,
                    hasStreamingLogs: false,
                    hasResult: false,
                  }
                }
              }
            }), false, 'fetchStageLogsForTask:error');
          }
        },

        // Get stage logs for a task
        getStageLogsForTask: (taskId, stage) => {
          const { taskStageLogs } = get();
          return taskStageLogs[taskId]?.[stage] || {
            logs: [],
            result: null,
            loading: false,
            error: null,
            stageFolder: null,
            hasStreamingLogs: false,
            hasResult: false,
          };
        },

        // Clear stage logs cache for a task
        clearStageLogsForTask: (taskId) => {
          set((state) => {
            const taskStageLogs = { ...state.taskStageLogs };
            delete taskStageLogs[taskId];
            return { taskStageLogs };
          }, false, 'clearStageLogsForTask');
        },

        // Clear specific stage log for a task
        clearStageLogForTaskAndStage: (taskId, stage) => {
          set((state) => {
            const taskStageLogs = { ...state.taskStageLogs };
            if (taskStageLogs[taskId]) {
              const updatedTaskLogs = { ...taskStageLogs[taskId] };
              delete updatedTaskLogs[stage];
              taskStageLogs[taskId] = updatedTaskLogs;
            }
            return { taskStageLogs };
          }, false, 'clearStageLogForTaskAndStage');
        },

        // ===== Agent State actions =====

        // Fetch agent state for a task
        fetchAgentState: async (taskId, adwId) => {
          if (!taskId || !adwId) {
            console.error('[AgentStateStore] Missing required parameters:', { taskId, adwId });
            return;
          }

          // Set loading state
          set((state) => ({
            agentStates: {
              ...state.agentStates,
              [taskId]: {
                data: null,
                loading: true,
                error: null,
              }
            }
          }), false, 'fetchAgentState:loading');

          try {
            // Get backend URL from environment (required - set via .ports.env)
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            if (!backendUrl) {
              throw new Error('VITE_BACKEND_URL environment variable is required');
            }

            // Fetch agent state from backend
            const response = await fetch(`${backendUrl}/api/agent-state/${adwId}`);

            if (!response.ok) {
              throw new Error(`Failed to fetch agent state: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            console.log(`[AgentStateStore] Fetched agent state:`, data);

            // Update state with fetched data
            set((state) => ({
              agentStates: {
                ...state.agentStates,
                [taskId]: {
                  data: data,
                  loading: false,
                  error: null,
                  fetchedAt: new Date().toISOString(),
                }
              }
            }), false, 'fetchAgentState:success');

          } catch (error) {
            console.error(`[AgentStateStore] Error fetching agent state:`, error);

            // Update state with error
            set((state) => ({
              agentStates: {
                ...state.agentStates,
                [taskId]: {
                  data: null,
                  loading: false,
                  error: error.message,
                }
              }
            }), false, 'fetchAgentState:error');
          }
        },

        // Get agent state for a task
        getAgentState: (taskId) => {
          const { agentStates } = get();
          return agentStates?.[taskId] || {
            data: null,
            loading: false,
            error: null,
          };
        },

        // Trigger merge workflow for a task in ready-to-merge stage
        // This now uses the slash command approach - simple and powerful
        // Let Claude handle the complexity instead of scripting every edge case
        triggerMergeWorkflow: async (taskId) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            throw new Error('Task not found');
          }

          // Validate task is in ready-to-merge stage
          if (task.stage !== 'ready-to-merge') {
            throw new Error('Task must be in "Ready to Merge" stage to trigger merge');
          }

          // Get ADW ID from task metadata
          const adw_id = task.metadata?.adw_id;

          if (!adw_id) {
            throw new Error('Task is missing ADW ID');
          }

          try {
            // Set merge state to in_progress BEFORE triggering
            set((state) => ({
              isLoading: true,
              mergingTasks: {
                ...state.mergingTasks,
                [taskId]: {
                  status: 'in_progress',
                  message: 'Starting agent-based merge workflow...',
                  timestamp: new Date().toISOString()
                }
              }
            }), false, 'triggerMergeWorkflow');

            // Use trigger_workflow via WebSocket for agent-based merge
            // This runs adw_merge_iso which uses the agent pattern to handle errors
            // within the same context instead of spawning new Claude instances
            const response = await websocketService.triggerWorkflow({
              workflow_type: 'adw_merge_iso',
              adw_id: adw_id,
              issue_number: task.metadata?.issue_number || String(task.id),
              issue_type: task.workItemType || null,
              issue_json: {
                title: task.title || `Task ${task.id}`,
                body: task.description || '',
                number: task.id,
                metadata: task.metadata || {},
                stage: task.stage,
              },
              trigger_reason: `Merge worktree for: ${task.title || task.description?.substring(0, 50)}`
            });

            // Check for successful trigger acceptance
            // Note: 'accepted' means workflow was triggered, not completed
            // Actual completion comes via WebSocket status updates
            if (response.status === 'accepted') {
              // Update task metadata to indicate merge was triggered
              get().updateTask(taskId, {
                metadata: {
                  ...task.metadata,
                  merge_triggered: true,
                  merge_triggered_at: new Date().toISOString(),
                  merge_adw_id: response.adw_id || adw_id,
                }
              });

              // Update merge state - workflow is running (agent handles errors internally)
              set((state) => ({
                isLoading: false,
                mergingTasks: {
                  ...state.mergingTasks,
                  [taskId]: {
                    status: 'running',
                    message: 'Agent-based merge workflow running...',
                    timestamp: new Date().toISOString()
                  }
                }
              }), false, 'triggerMergeWorkflowAccepted');

              // Return success - actual completion will be notified via WebSocket
              return { success: true, message: 'Merge workflow triggered successfully' };
            } else {
              throw new Error(response.error || response.message || 'Merge trigger failed');
            }

          } catch (error) {
            // DO NOT move task to errored stage - keep it in ready-to-merge so user can retry
            // Update task with error message in metadata
            get().updateTask(taskId, {
              metadata: {
                ...task.metadata,
                merge_error: error.message,
                merge_error_at: new Date().toISOString(),
              }
            });

            // Update merge state to error
            set((state) => ({
              isLoading: false,
              error: `Failed to merge: ${error.message}`,
              mergingTasks: {
                ...state.mergingTasks,
                [taskId]: {
                  status: 'error',
                  message: error.message || 'Failed to merge',
                  timestamp: new Date().toISOString()
                }
              }
            }), false, 'triggerMergeWorkflowError');

            throw error;
          }
        },

        // Handle merge completion - called by WebSocket listener
        handleMergeCompletion: (adw_id) => {
          const task = get().getTaskByAdwId(adw_id);
          if (!task) {
            console.warn(`Task not found for ADW ID: ${adw_id}`);
            return;
          }

          // Update task metadata with merge completion info and move to completed stage
          get().updateTask(task.id, {
            stage: 'completed',
            metadata: {
              ...task.metadata,
              merge_completed: true,
              merge_completed_at: new Date().toISOString(),
              merged_branch: task.metadata?.branch_name,
              merge_in_progress: false,
              merge_method: 'squash',
            }
          });

          // Update merge state to success
          set((state) => ({
            mergingTasks: {
              ...state.mergingTasks,
              [task.id]: {
                status: 'success',
                message: 'Branch successfully merged to main!',
                timestamp: new Date().toISOString()
              }
            }
          }), false, 'handleMergeCompletion');

          console.log(`Task ${task.id} merge completed - moved to 'completed' stage`);
        },

        // Handle merge failure - called by WebSocket listener when merge workflow fails
        handleMergeFailure: (adw_id, errorMessage) => {
          const task = get().getTaskByAdwId(adw_id);
          if (!task) {
            console.warn(`Task not found for ADW ID: ${adw_id}`);
            return;
          }

          // DO NOT move task to errored stage - keep it in ready-to-merge so user can retry
          // Update task metadata with error info
          get().updateTask(task.id, {
            metadata: {
              ...task.metadata,
              merge_error: errorMessage,
              merge_error_at: new Date().toISOString(),
              merge_in_progress: false,
            }
          });

          // Update merge state to error
          set((state) => ({
            mergingTasks: {
              ...state.mergingTasks,
              [task.id]: {
                status: 'error',
                message: errorMessage || 'Merge failed',
                timestamp: new Date().toISOString()
              }
            }
          }), false, 'handleMergeFailure');

          console.log(`Task ${task.id} merge failed - staying in ready-to-merge for retry. Error: ${errorMessage}`);
        },

        // Get merge state for a task
        getMergeState: (taskId) => {
          const { mergingTasks } = get();
          return mergingTasks?.[taskId] || null;
        },

        // Clear merge state for a task (after user has seen the notification)
        clearMergeState: (taskId) => {
          set((state) => {
            const newMergingTasks = { ...state.mergingTasks };
            delete newMergingTasks[taskId];
            return { mergingTasks: newMergingTasks };
          }, false, 'clearMergeState');
        },

        /**
         * Execute any slash command from the UI.
         * This is the generic, extensible way to trigger slash commands.
         *
         * The key insight: let Claude handle complexity, don't script everything.
         *
         * @param {string} command - Command name (e.g., "merge_worktree", "cleanup_worktrees")
         * @param {string[]} args - Command arguments
         * @param {object} context - Additional context (adw_id, task_id, etc.)
         * @returns {Promise<object>} - Command execution result
         */
        executeSlashCommand: async (command, args = [], context = {}) => {
          try {
            console.log(`[KanbanStore] Executing slash command: /${command} ${args.join(' ')}`);

            const response = await websocketService.triggerSlashCommand(command, args, context);

            if (response.success) {
              console.log(`[KanbanStore] Slash command completed successfully:`, response);
              return response;
            } else {
              throw new Error(response.error || 'Command failed');
            }
          } catch (error) {
            console.error(`[KanbanStore] Slash command failed:`, error);
            throw error;
          }
        },

        /**
         * Get list of available slash commands
         * @returns {Promise<object[]>} - Array of available commands
         */
        getAvailableSlashCommands: async () => {
          try {
            return await websocketService.listSlashCommands();
          } catch (error) {
            console.error('[KanbanStore] Failed to get slash commands:', error);
            return [];
          }
        },

        /**
         * Delete a worktree and associated task
         * This calls the backend API to:
         * - Kill processes on allocated ports
         * - Remove the git worktree
         * - Delete the agents/{adw_id} directory
         * The task is only removed after receiving WebSocket confirmation.
         *
         * @param {string} adw_id - The ADW identifier to delete
         * @returns {Promise<boolean>} True if deletion request succeeded
         */
        deleteWorktree: async (adw_id) => {
          try {
            // Set loading state for this specific ADW
            set((state) => ({
              deletingAdws: {
                ...state.deletingAdws,
                [adw_id]: { loading: true, error: null }
              }
            }), false, 'deleteWorktreeStart');

            console.log(`Starting deletion of worktree ${adw_id}`);

            // Call the backend API to delete the worktree
            const response = await adwService.deleteWorktree(adw_id);

            if (response.success) {
              console.log(`Backend confirmed deletion request for ${adw_id}, waiting for WebSocket confirmation`);
              // DO NOT delete the task here - wait for WebSocket confirmation
              // The WebSocket handler will receive 'worktree_deleted' event and remove the task
              return true;
            } else {
              throw new Error(response.message || 'Deletion failed');
            }

          } catch (error) {
            console.error(`Failed to delete worktree ${adw_id}:`, error);

            // Update error state for this specific ADW
            set((state) => ({
              deletingAdws: {
                ...state.deletingAdws,
                [adw_id]: { loading: false, error: error.message }
              },
              error: `Failed to delete worktree: ${error.message}`
            }), false, 'deleteWorktreeError');

            // Show error notification
            get().addNotification('error', `Failed to delete worktree: ${error.message}`, 7000);

            return false;
          }
        },

        /**
         * Get the deletion state for a specific ADW
         * @param {string} adw_id - The ADW identifier
         * @returns {{ loading: boolean, error: string | null } | null} Deletion state or null
         */
        getDeletionState: (adw_id) => {
          return get().deletingAdws[adw_id] || null;
        },

        /**
         * Mark a task as complete
         * Updates the task's stage to 'completed' and status to 'completed'
         * in both the frontend state and backend database.
         *
         * @param {string} taskId - The task identifier to mark as complete
         * @returns {Promise<boolean>} True if successfully marked complete
         */
        markTaskAsComplete: async (taskId) => {
          try {
            // Find the task
            const task = get().tasks.find(t => t.id === taskId);
            if (!task) {
              throw new Error(`Task ${taskId} not found`);
            }

            // Extract adw_id from metadata
            const adw_id = task.metadata?.adw_id;
            if (!adw_id) {
              throw new Error(`Task ${taskId} does not have an adw_id`);
            }

            // Set loading state
            set((state) => ({
              isLoading: true,
            }), false, 'markTaskAsCompleteStart');

            console.log(`Marking task ${taskId} (ADW: ${adw_id}) as complete`);

            // Call backend API to update stage and status
            const response = await adwDbService.updateAdw(adw_id, {
              current_stage: 'completed',
              status: 'completed',
              completed_at: new Date().toISOString()
            });

            if (response) {
              console.log(`Successfully marked task ${taskId} as complete`);

              // Update frontend state optimistically
              set((state) => ({
                tasks: state.tasks.map(t =>
                  t.id === taskId
                    ? {
                        ...t,
                        stage: 'completed',
                        status: 'completed',
                        updatedAt: new Date().toISOString()
                      }
                    : t
                ),
                isLoading: false,
              }), false, 'markTaskAsCompleteSuccess');

              // Show success notification
              get().addNotification('success', `Task marked as complete`, 5000);

              return true;
            } else {
              throw new Error('Failed to update task status');
            }

          } catch (error) {
            console.error(`Failed to mark task ${taskId} as complete:`, error);

            // Update error state
            set((state) => ({
              isLoading: false,
              error: `Failed to mark task as complete: ${error.message}`
            }), false, 'markTaskAsCompleteError');

            // Show error notification
            get().addNotification('error', `Failed to mark task as complete: ${error.message}`, 7000);

            return false;
          }
        },

        /**
         * Add a notification to the notifications list
         * @param {string} type - 'success', 'error', 'warning', 'info'
         * @param {string} message - Notification message
         * @param {number} duration - Auto-dismiss duration in ms (default: 5000, 0 for no auto-dismiss)
         */
        addNotification: (type, message, duration = 5000) => {
          const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const notification = {
            id,
            type,
            message,
            timestamp: new Date().toISOString()
          };

          set((state) => ({
            notifications: [...state.notifications, notification]
          }), false, 'addNotification');

          // Auto-dismiss after duration
          if (duration > 0) {
            setTimeout(() => {
              get().removeNotification(id);
            }, duration);
          }

          return id;
        },

        /**
         * Remove a notification by ID
         * @param {string} id - Notification ID
         */
        removeNotification: (id) => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }), false, 'removeNotification');
        },

        /**
         * Clear all notifications
         */
        clearAllNotifications: () => {
          set({ notifications: [] }, false, 'clearAllNotifications');
        },

        // Handle workflow completion
        handleWorkflowCompletion: (taskId) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) return;

          // Determine next stage based on workflow type and current stage
          const workflowType = task.metadata?.workflow_name;

          if (workflowType) {
            console.log(`[Workflow] Handling completion for workflow ${workflowType} at stage ${task.stage}`);

            // Check if the workflow is complete (current stage is the last stage in the workflow)
            if (isWorkflowComplete(workflowType, task.stage)) {
              console.log(`[Workflow] Workflow ${workflowType} is complete. Moving to 'ready-to-merge' stage.`);

              // Workflow is complete, move to ready-to-merge stage
              get().moveTaskToStage(taskId, 'ready-to-merge');

              // Update task metadata to indicate workflow completion
              get().updateTask(taskId, {
                metadata: {
                  ...task.metadata,
                  workflow_complete: true,
                },
                progress: 100,
                substage: 'ready',
              });
            } else {
              // Get next stage in the workflow
              const nextStage = getNextStageInWorkflow(workflowType, task.stage);

              if (nextStage) {
                console.log(`[Workflow] Moving task from ${task.stage} to ${nextStage} (workflow: ${workflowType})`);
                get().moveTaskToStage(taskId, nextStage);
              } else {
                console.warn(`[Workflow] No next stage found for workflow ${workflowType} at stage ${task.stage}`);
              }
            }
          }

          // Remove from active workflows after completion
          setTimeout(() => {
            set((state) => {
              const activeWorkflows = new Map(state.activeWorkflows);
              activeWorkflows.delete(task.metadata?.adw_id);
              return { activeWorkflows };
            }, false, 'removeCompletedWorkflow');
          }, 5000); // Keep for 5 seconds after completion
        },

        // Track active workflow
        trackActiveWorkflow: (adwId, workflowInfo) => {
          set((state) => {
            const activeWorkflows = new Map(state.activeWorkflows);
            activeWorkflows.set(adwId, workflowInfo);
            return { activeWorkflows };
          }, false, 'trackActiveWorkflow');
        },

        // Get active workflows
        getActiveWorkflows: () => {
          return Array.from(get().activeWorkflows.values());
        },

        // Get workflow status for task
        getWorkflowStatusForTask: (taskId) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task?.metadata?.adw_id) return null;

          return get().activeWorkflows.get(task.metadata.adw_id);
        },

        // WebSocket connection status - returns cached object to prevent infinite re-renders
        getWebSocketStatus: () => {
          return get().websocketStatus;
        },

        // Check WebSocket server health
        checkWebSocketHealth: async () => {
          try {
            const health = await websocketService.checkHealth();
            return health;
          } catch (error) {
            console.error('WebSocket health check failed:', error);
            throw error;
          }
        },

        // Project Notification Management
        sendProjectNotification: async (taskData) => {
          const { selectedProject, projectNotificationEnabled } = get();

          // Skip if project notifications are disabled globally
          if (!projectNotificationEnabled) {
            console.log('Project notifications disabled globally');
            return false;
          }

          // Skip if no project is selected
          if (!selectedProject?.id) {
            console.log('No project selected for notifications');
            return false;
          }

          try {
            // Get project notification configuration
            const config = get().getProjectNotificationConfig(selectedProject.id);

            // Skip if project notifications are disabled for this project
            if (!config?.enabled) {
              console.log(`Project notifications disabled for project ${selectedProject.id}`);
              return false;
            }

            // Skip if no port is configured
            if (!config?.port) {
              console.log(`No port configured for project ${selectedProject.id} notifications`);
              return false;
            }

            console.log(`Sending notification for task ${taskData.id} to project ${selectedProject.id}`);

            await projectNotificationService.sendTicketNotification(selectedProject.id, taskData);

            // Add to notification history
            get().addNotificationToHistory({
              taskId: taskData.id,
              projectId: selectedProject.id,
              status: 'success',
              timestamp: new Date().toISOString(),
              message: 'Ticket notification sent successfully'
            });

            return true;

          } catch (error) {
            console.error(`Failed to send project notification for task ${taskData.id}:`, error);

            // Add failure to notification history
            get().addNotificationToHistory({
              taskId: taskData.id,
              projectId: selectedProject?.id,
              status: 'failed',
              timestamp: new Date().toISOString(),
              message: error.message || 'Failed to send notification',
              error: error.message
            });

            // Don't throw the error - just log it so task creation doesn't fail
            return false;
          }
        },

        // Project notification configuration management
        setProjectNotificationConfig: (projectId, config) => {
          set((state) => ({
            projectNotificationConfigs: {
              ...state.projectNotificationConfigs,
              [projectId]: config
            }
          }), false, 'setProjectNotificationConfig');

          // Persist to localStorage
          const configs = get().projectNotificationConfigs;
          localStorageService.setItem('project-notification-configs', configs);
        },

        getProjectNotificationConfig: (projectId) => {
          const { projectNotificationConfigs } = get();
          return projectNotificationConfigs[projectId] || {
            enabled: true,
            host: 'localhost',
            port: '',
            autoDiscover: true
          };
        },

        // Project notification status management
        updateProjectNotificationStatus: (projectId, status) => {
          set((state) => ({
            projectNotificationStatus: {
              ...state.projectNotificationStatus,
              [projectId]: {
                ...state.projectNotificationStatus[projectId],
                ...status,
                lastUpdated: new Date().toISOString()
              }
            }
          }), false, 'updateProjectNotificationStatus');
        },

        getProjectNotificationStatus: (projectId) => {
          const { projectNotificationStatus } = get();
          return projectNotificationStatus[projectId] || {
            connected: false,
            connecting: false,
            error: null
          };
        },

        // Global project notification toggle
        toggleProjectNotifications: (enabled) => {
          set({ projectNotificationEnabled: enabled }, false, 'toggleProjectNotifications');
        },

        // Notification history management
        addNotificationToHistory: (notification) => {
          set((state) => {
            const history = [notification, ...state.notificationHistory];
            return {
              notificationHistory: history.slice(0, 100) // Keep last 100 notifications
            };
          }, false, 'addNotificationToHistory');
        },

        getNotificationHistory: (projectId = null, taskId = null) => {
          const { notificationHistory } = get();
          let filtered = notificationHistory;

          if (projectId) {
            filtered = filtered.filter(n => n.projectId === projectId);
          }

          if (taskId) {
            filtered = filtered.filter(n => n.taskId === taskId);
          }

          return filtered;
        },

        clearNotificationHistory: () => {
          set({ notificationHistory: [] }, false, 'clearNotificationHistory');
        },

        // Connect/disconnect project notifications
        connectProjectNotifications: async (projectId) => {
          try {
            const config = get().getProjectNotificationConfig(projectId);

            if (!config.enabled || !config.port) {
              throw new Error('Project notifications not properly configured');
            }

            get().updateProjectNotificationStatus(projectId, { connecting: true, error: null });

            await projectNotificationService.connectToProject(projectId, {
              host: config.host || 'localhost',
              port: parseInt(config.port)
            });

            get().updateProjectNotificationStatus(projectId, {
              connected: true,
              connecting: false,
              error: null
            });

            return true;

          } catch (error) {
            get().updateProjectNotificationStatus(projectId, {
              connected: false,
              connecting: false,
              error: error.message
            });
            throw error;
          }
        },

        disconnectProjectNotifications: (projectId) => {
          projectNotificationService.disconnectFromProject(projectId);
          get().updateProjectNotificationStatus(projectId, {
            connected: false,
            connecting: false,
            error: null
          });
        },

        // Test project notification connection
        testProjectNotificationConnection: async (projectId, config = null) => {
          const testConfig = config || get().getProjectNotificationConfig(projectId);

          if (!testConfig.port) {
            throw new Error('No port configured for testing');
          }

          return await projectNotificationService.testConnection(
            testConfig.host || 'localhost',
            parseInt(testConfig.port),
            5000
          );
        },

        // Initialize project notification configurations from localStorage
        initializeProjectNotificationConfigs: () => {
          try {
            const savedConfigs = localStorageService.getItem('project-notification-configs', {});

            // Validate and sanitize saved configurations
            const validatedConfigs = {};
            Object.entries(savedConfigs).forEach(([projectId, config]) => {
              try {
                // Ensure config has required structure
                const validatedConfig = {
                  enabled: typeof config.enabled === 'boolean' ? config.enabled : true,
                  host: typeof config.host === 'string' ? config.host : 'localhost',
                  port: config.port && !isNaN(parseInt(config.port)) ? config.port : '',
                  autoDiscover: typeof config.autoDiscover === 'boolean' ? config.autoDiscover : true,
                  lastUpdated: config.lastUpdated || new Date().toISOString()
                };

                validatedConfigs[projectId] = validatedConfig;
              } catch (configError) {
                console.warn(`Invalid configuration for project ${projectId}, using defaults:`, configError);
                validatedConfigs[projectId] = {
                  enabled: true,
                  host: 'localhost',
                  port: '',
                  autoDiscover: true,
                  lastUpdated: new Date().toISOString()
                };
              }
            });

            set({ projectNotificationConfigs: validatedConfigs }, false, 'initializeProjectNotificationConfigs');
            console.log(`Loaded ${Object.keys(validatedConfigs).length} project notification configurations`);

          } catch (error) {
            console.error('Failed to load project notification configurations:', error);
            // Set empty config on error
            set({ projectNotificationConfigs: {} }, false, 'initializeProjectNotificationConfigsError');
          }
        },

        // Export project notification settings
        exportProjectNotificationSettings: () => {
          try {
            const { projectNotificationConfigs, projectNotificationEnabled } = get();

            const exportData = {
              version: '1.0.0',
              exportedAt: new Date().toISOString(),
              globalSettings: {
                projectNotificationEnabled
              },
              projectConfigurations: projectNotificationConfigs,
              metadata: {
                totalProjects: Object.keys(projectNotificationConfigs).length,
                exportSource: 'agentic-kanban'
              }
            };

            // Save to localStorage as backup
            const success = localStorageService.setItem('notification-settings-backup', exportData);

            if (success) {
              console.log('Project notification settings exported successfully');
              return exportData;
            } else {
              throw new Error('Failed to save export to localStorage');
            }

          } catch (error) {
            console.error('Failed to export project notification settings:', error);
            get().handleError(error, 'Export notification settings');
            return null;
          }
        },

        // Import project notification settings
        importProjectNotificationSettings: (importData) => {
          try {
            if (!importData || typeof importData !== 'object') {
              throw new Error('Invalid import data format');
            }

            if (!importData.version) {
              throw new Error('Import data missing version information');
            }

            // Validate import structure
            const requiredFields = ['projectConfigurations', 'globalSettings'];
            for (const field of requiredFields) {
              if (!importData[field]) {
                throw new Error(`Import data missing required field: ${field}`);
              }
            }

            // Validate and merge configurations
            const validatedConfigs = {};
            Object.entries(importData.projectConfigurations || {}).forEach(([projectId, config]) => {
              try {
                validatedConfigs[projectId] = {
                  enabled: typeof config.enabled === 'boolean' ? config.enabled : true,
                  host: typeof config.host === 'string' ? config.host : 'localhost',
                  port: config.port && !isNaN(parseInt(config.port)) ? config.port : '',
                  autoDiscover: typeof config.autoDiscover === 'boolean' ? config.autoDiscover : true,
                  lastUpdated: config.lastUpdated || new Date().toISOString(),
                  importedAt: new Date().toISOString()
                };
              } catch (configError) {
                console.warn(`Skipping invalid configuration for project ${projectId}:`, configError);
              }
            });

            // Apply imported settings
            set({
              projectNotificationConfigs: validatedConfigs,
              projectNotificationEnabled: importData.globalSettings?.projectNotificationEnabled ?? true
            }, false, 'importProjectNotificationSettings');

            // Persist to localStorage
            localStorageService.setItem('project-notification-configs', validatedConfigs);

            console.log(`Imported ${Object.keys(validatedConfigs).length} project notification configurations`);
            return {
              success: true,
              importedProjects: Object.keys(validatedConfigs).length,
              skippedProjects: Object.keys(importData.projectConfigurations || {}).length - Object.keys(validatedConfigs).length
            };

          } catch (error) {
            console.error('Failed to import project notification settings:', error);
            get().handleError(error, 'Import notification settings');
            return {
              success: false,
              error: error.message
            };
          }
        },

        // Backup project notification settings
        backupProjectNotificationSettings: () => {
          try {
            const exportData = get().exportProjectNotificationSettings();
            if (exportData) {
              const backupKey = `notification-backup-${Date.now()}`;
              const success = localStorageService.setItem(backupKey, exportData);

              if (success) {
                console.log(`Notification settings backed up with key: ${backupKey}`);
                return backupKey;
              }
            }
            return null;

          } catch (error) {
            console.error('Failed to backup notification settings:', error);
            return null;
          }
        },

        // Restore project notification settings from backup
        restoreProjectNotificationSettings: (backupKey) => {
          try {
            const backupData = localStorageService.getItem(backupKey);
            if (!backupData) {
              throw new Error(`Backup not found: ${backupKey}`);
            }

            const result = get().importProjectNotificationSettings(backupData);
            if (result.success) {
              console.log(`Notification settings restored from backup: ${backupKey}`);
            }
            return result;

          } catch (error) {
            console.error('Failed to restore notification settings:', error);
            get().handleError(error, 'Restore notification settings');
            return { success: false, error: error.message };
          }
        },

        // Clear all project notification settings
        clearAllProjectNotificationSettings: () => {
          try {
            // Create backup before clearing
            const backupKey = get().backupProjectNotificationSettings();

            // Clear from store
            set({
              projectNotificationConfigs: {},
              projectNotificationStatus: {},
              notificationHistory: []
            }, false, 'clearAllProjectNotificationSettings');

            // Clear from localStorage
            localStorageService.removeItem('project-notification-configs');

            console.log('All project notification settings cleared');
            if (backupKey) {
              console.log(`Backup created before clearing: ${backupKey}`);
            }

            return { success: true, backupKey };

          } catch (error) {
            console.error('Failed to clear notification settings:', error);
            get().handleError(error, 'Clear notification settings');
            return { success: false, error: error.message };
          }
        },

        // Get project notification settings statistics
        getProjectNotificationSettingsStats: () => {
          try {
            const { projectNotificationConfigs, notificationHistory } = get();

            const stats = {
              totalProjects: Object.keys(projectNotificationConfigs).length,
              enabledProjects: Object.values(projectNotificationConfigs).filter(c => c.enabled).length,
              disabledProjects: Object.values(projectNotificationConfigs).filter(c => !c.enabled).length,
              configuredPorts: Object.values(projectNotificationConfigs).filter(c => c.port).length,
              unconfiguredPorts: Object.values(projectNotificationConfigs).filter(c => !c.port).length,
              autoDiscoveryEnabled: Object.values(projectNotificationConfigs).filter(c => c.autoDiscover).length,
              totalNotifications: notificationHistory.length,
              successfulNotifications: notificationHistory.filter(n => n.status === 'success').length,
              failedNotifications: notificationHistory.filter(n => n.status === 'failed').length,
              storageInfo: localStorageService.getStorageInfo()
            };

            return stats;

          } catch (error) {
            console.error('Failed to get notification settings stats:', error);
            return null;
          }
        },

        // Data Migration Management
        runDataMigrations: () => {
          try {
            console.log('Running data migrations...');
            const migrationResult = dataMigration.runMigrations();

            if (migrationResult.success) {
              console.log(`Data migrations completed. Ran ${migrationResult.migrationsRun} migrations.`);

              // If migrations were run, we should reload the store state
              if (migrationResult.migrationsRun > 0) {
                console.log('Reloading store state after migrations...');
                // The persist middleware will automatically reload the state from localStorage
                // We can trigger a state refresh by reading from localStorage
                const storageData = dataMigration.getStorageInfo();
                console.log('Store state refreshed after migration', storageData);
              }

              return migrationResult;
            } else {
              console.error('Data migrations failed:', migrationResult.error);
              set({
                error: `Migration failed: ${migrationResult.error}`
              }, false, 'migrationError');
              return migrationResult;
            }
          } catch (error) {
            console.error('Error running data migrations:', error);
            set({
              error: `Migration error: ${error.message}`
            }, false, 'migrationError');
            return { success: false, error: error.message };
          }
        },

        // Validate current data integrity
        validateDataIntegrity: () => {
          try {
            const validation = dataMigration.validateNoDummyProjects();
            console.log('Data integrity validation:', validation);

            if (!validation.isValid) {
              console.warn('Data integrity issues found:', validation.message);
              set({
                error: `Data integrity warning: ${validation.message}`
              }, false, 'dataIntegrityWarning');
            }

            return validation;
          } catch (error) {
            console.error('Error validating data integrity:', error);
            return { isValid: false, error: error.message };
          }
        },

        // Manual cleanup of dummy data
        cleanupDummyData: () => {
          try {
            console.log('[RELOAD TRACKER] cleanupDummyData called - stack trace:', new Error().stack);
            console.log('Manually cleaning up dummy data...');
            const cleanupResult = dataMigration.manualCleanup();

            if (cleanupResult.success) {
              console.log(`Cleanup completed. Removed ${cleanupResult.removedProjects} dummy projects, preserved ${cleanupResult.preservedProjects} real projects.`);

              // Refresh store state after cleanup by rehydrating from localStorage
              // NO PAGE RELOAD - use Zustand's persist middleware to refresh state
              const state = get();
              const storedState = JSON.parse(localStorage.getItem('agentic-kanban-store') || '{}');

              // Update the store with fresh data from localStorage
              if (storedState.state) {
                set({
                  projects: storedState.state.projects || [],
                  tasks: storedState.state.tasks || [],
                  // Preserve workflow state to avoid disrupting active workflows
                  taskWorkflowProgress: state.taskWorkflowProgress,
                  taskWorkflowMetadata: state.taskWorkflowMetadata,
                  taskWorkflowLogs: state.taskWorkflowLogs,
                }, false, 'cleanupRefresh');
              }

              return cleanupResult;
            } else {
              console.error('Cleanup failed:', cleanupResult.error);
              set({
                error: `Cleanup failed: ${cleanupResult.error}`
              }, false, 'cleanupError');
              return cleanupResult;
            }
          } catch (error) {
            console.error('Error during manual cleanup:', error);
            set({
              error: `Cleanup error: ${error.message}`
            }, false, 'cleanupError');
            return { success: false, error: error.message };
          }
        },

        // Get migration and storage information
        getDataMigrationInfo: () => {
          try {
            return dataMigration.getStorageInfo();
          } catch (error) {
            console.error('Error getting migration info:', error);
            return { error: error.message };
          }
        },

        // Initialize data migrations on store load
        initializeDataMigrations: () => {
          try {
            // Check if migrations are needed
            const migrationInfo = dataMigration.getStorageInfo();
            console.log('Migration info:', migrationInfo);

            if (migrationInfo.needsMigration) {
              console.log('Running automatic migrations...');
              return get().runDataMigrations();
            } else {
              console.log('No migrations needed');

              // Still validate data integrity
              const validation = get().validateDataIntegrity();
              if (!validation.isValid && validation.dummyProjects?.length > 0) {
                console.log('Found dummy projects that need cleanup, running manual cleanup...');
                return get().cleanupDummyData();
              }

              return { success: true, migrationsRun: 0, message: 'No migrations needed' };
            }
          } catch (error) {
            console.error('Error initializing data migrations:', error);
            set({
              error: `Migration initialization error: ${error.message}`
            }, false, 'migrationInitError');
            return { success: false, error: error.message };
          }
        },

        // Reset store
        reset: () => {
          // Disconnect WebSocket before reset
          get().disconnectWebSocket();

          // Disconnect all project notifications
          const { projectNotificationStatus } = get();
          Object.keys(projectNotificationStatus).forEach(projectId => {
            get().disconnectProjectNotifications(projectId);
          });

          set(initialState, false, 'reset');
        },
      }),
      {
        name: 'agentic-kanban-storage',
        version: 1,
        partialize: (state) => ({
          selectedProject: state.selectedProject,
          availableProjects: state.availableProjects,
          tasks: state.tasks,
          taskIdCounter: state.taskIdCounter,
          projectNotificationEnabled: state.projectNotificationEnabled,
          projectNotificationConfigs: state.projectNotificationConfigs,
          notificationHistory: state.notificationHistory,
          // Persist workflow state to survive page refreshes (fixes bug #6)
          taskWorkflowProgress: state.taskWorkflowProgress,
          taskWorkflowMetadata: state.taskWorkflowMetadata,
          taskWorkflowLogs: state.taskWorkflowLogs,
          // Persist tasksByAdwId index for O(1) lookups
          tasksByAdwId: state.tasksByAdwId,
          // NOTE: processedMessages is intentionally excluded from persistence
          // because Map objects don't serialize properly in localStorage
          // NOTE: _cleanupScheduled is intentionally excluded (internal state)
        }),
        onRehydrateStorage: () => (state) => {
          // Reset processedMessages to a fresh Map after rehydration
          // This prevents Map corruption from localStorage serialization
          // and clears stale fingerprints that could block new messages
          if (state) {
            state.processedMessages = new Map();
            state._cleanupScheduled = false;

            // Rebuild tasksByAdwId index from tasks to ensure consistency
            const rebuiltIndex = {};
            if (Array.isArray(state.tasks)) {
              state.tasks.forEach(task => {
                if (task.metadata?.adw_id) {
                  rebuiltIndex[task.metadata.adw_id] = task.id;
                }
              });
            }
            state.tasksByAdwId = rebuiltIndex;

            console.log('[KanbanStore] Rehydration: Reset processedMessages, rebuilt tasksByAdwId index with', Object.keys(rebuiltIndex).length, 'entries');
          }
        },
      }
    ),
    {
      name: 'AgenticKanban',
    }
  )
);

// Initialize the store with migrations when the module loads
// Use a timeout to ensure the store is fully created before initialization
setTimeout(() => {
  try {
    const store = useKanbanStore.getState();
    if (store.initializeStore) {
      store.initializeStore();
    }
  } catch (error) {
    console.error('Failed to initialize store:', error);
  }
}, 0);

export default useKanbanStore;