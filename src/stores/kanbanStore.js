/**
 * @fileoverview Kanban Store - Central state management for the AgenticKanban application
 * Manages projects, tasks, stages, and coordinates between various services
 * Built with Zustand for reactive state management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import adwService from '../services/api/adwService';
import adwCreationService from '../services/adwCreationService';
import localStorageService from '../services/storage/localStorage';
import projectPersistenceService from '../services/storage/projectPersistenceService';
import stageProgressionService from '../services/websocket/stageProgressionService';
import websocketService from '../services/websocket/websocketService';
import projectNotificationService from '../services/storage/projectNotificationService';
import dataMigration from '../utils/dataMigration';

import { WORK_ITEM_TYPES, QUEUEABLE_STAGES } from '../constants/workItems';

// Re-export for backward compatibility
export { WORK_ITEM_TYPES, QUEUEABLE_STAGES };

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
    { id: 'pr', name: 'PR', color: 'pink' },
    { id: 'errored', name: 'Errored', color: 'red' },
  ],

  // ADW pipeline configurations
  availablePipelines: adwService.getAllPipelines(),

  // UI state
  showTaskInput: false,
  selectedTaskId: null,
  isLoading: false,
  error: null,

  // WebSocket state
  websocketConnected: false,
  websocketConnecting: false,
  websocketError: null,
  activeWorkflows: new Map(), // Map of adw_id -> workflow info
  workflowStatusUpdates: [], // Array of recent status updates

  // Project notification state
  projectNotificationEnabled: true,
  projectNotificationConfigs: {}, // Map of projectId -> notification config
  projectNotificationStatus: {}, // Map of projectId -> connection status
  notificationHistory: [], // Array of recent notification attempts
};

export const useKanbanStore = create()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Initialize data migrations on store creation
        initializeStore: () => {
          console.log('Initializing Kanban store...');

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

          console.log('Store initialization completed', { persistenceResult, migrationResult });
          return { persistenceResult, migrationResult };
        },

        // Project actions
        selectProject: (project) => {
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
        createTask: (taskData) => {
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
              substage: 'initializing',
              progress: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              logs: [],
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
              },
              images: taskData.images || [], // Support for uploaded images
            };

            set((state) => ({
              tasks: [...state.tasks, newTask],
              taskIdCounter: state.taskIdCounter + 1,
              showTaskInput: false,
            }), false, 'createTask');

            // Send project notification after successful task creation
            get().sendProjectNotification(newTask);

            return newTask;

          } catch (error) {
            console.error('Failed to create ADW configuration:', error);

            // Fallback to creating task without ADW configuration
            const fallbackTask = {
              id: taskId,
              title: taskData.title || '',
              description: taskData.description,
              workItemType: taskData.workItemType || WORK_ITEM_TYPES.FEATURE,
              queuedStages: taskData.queuedStages || [],
              pipelineId: `adw_${(taskData.queuedStages || []).join('_')}`,
              pipelineIdStatic: taskData.pipelineId,
              stage: 'backlog',
              substage: 'initializing',
              progress: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              logs: [],
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

            return fallbackTask;
          }
        },

        updateTask: (taskId, updates) => {
          set((state) => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { ...task, ...updates, updatedAt: new Date().toISOString() }
                : task
            ),
          }), false, 'updateTask');
        },

        deleteTask: (taskId) => {
          set((state) => ({
            tasks: state.tasks.filter(task => task.id !== taskId),
            selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
          }), false, 'deleteTask');
        },

        moveTaskToStage: (taskId, newStage) => {
          set((state) => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    stage: newStage,
                    substage: 'initializing',
                    progress: 0,
                    updatedAt: new Date().toISOString()
                  }
                : task
            ),
          }), false, 'moveTaskToStage');
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

          if (task.description && task.description.length > 2000) {
            errors.push('Task description must be less than 2000 characters');
          }

          // Work item type validation
          if (!task.workItemType || !Object.values(WORK_ITEM_TYPES).includes(task.workItemType)) {
            errors.push('Valid work item type is required (Feature, Chore, Bug, or Patch)');
          }

          // Queued stages validation
          if (task.queuedStages && !Array.isArray(task.queuedStages)) {
            errors.push('Queued stages must be an array');
          }

          if (task.queuedStages && task.queuedStages.length === 0) {
            errors.push('At least one stage must be selected');
          }

          // Validate each queued stage
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
            } else if (task.stage === 'pr' && task.progress === 100) {
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
            set({ websocketConnecting: true, websocketError: null }, false, 'initializeWebSocket');

            // Set up event listeners
            websocketService.on('connect', () => {
              set({
                websocketConnected: true,
                websocketConnecting: false,
                websocketError: null
              }, false, 'websocketConnected');
            });

            websocketService.on('disconnect', () => {
              set({
                websocketConnected: false,
                websocketConnecting: false
              }, false, 'websocketDisconnected');
            });

            websocketService.on('error', (error) => {
              set({
                websocketError: error.message || 'WebSocket error',
                websocketConnecting: false
              }, false, 'websocketError');
            });

            websocketService.on('status_update', (statusUpdate) => {
              get().handleWorkflowStatusUpdate(statusUpdate);
            });

            // Connect to WebSocket server
            await websocketService.connect();

          } catch (error) {
            set({
              websocketError: error.message || 'Failed to initialize WebSocket',
              websocketConnecting: false
            }, false, 'initializeWebSocketError');
            console.error('Failed to initialize WebSocket:', error);
          }
        },

        disconnectWebSocket: () => {
          websocketService.disconnect();
          set({
            websocketConnected: false,
            websocketConnecting: false,
            websocketError: null
          }, false, 'disconnectWebSocket');
        },

        // Workflow triggering via WebSocket
        triggerWorkflowForTask: async (taskId, options = {}) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            throw new Error('Task not found');
          }

          try {
            set({ isLoading: true }, false, 'triggerWorkflowForTask');

            // Determine workflow type based on task's current stage and queued stages
            const workflowType = options.workflowType ||
              websocketService.getWorkflowTypeForStage(task.stage, task.queuedStages);

            // Determine model set based on work item type
            const modelSet = options.modelSet ||
              websocketService.getModelSetForWorkItem(task.workItemType);

            const triggerOptions = {
              adw_id: options.adw_id,
              issue_number: options.issue_number,
              model_set: modelSet,
              ...options
            };

            // Trigger workflow via WebSocket
            const response = await websocketService.triggerWorkflowForTask(task, workflowType, triggerOptions);

            // Track the active workflow
            get().trackActiveWorkflow(response.adw_id, {
              taskId,
              workflowName: response.workflow_name,
              status: 'started',
              logsPath: response.logs_path,
              startedAt: new Date().toISOString(),
            });

            // Update task with ADW information
            get().updateTask(taskId, {
              metadata: {
                ...task.metadata,
                adw_id: response.adw_id,
                workflow_name: response.workflow_name,
                workflow_status: 'started',
                logs_path: response.logs_path,
              }
            });

            set({ isLoading: false }, false, 'triggerWorkflowForTaskSuccess');
            return response;

          } catch (error) {
            set({
              isLoading: false,
              error: `Failed to trigger workflow: ${error.message}`
            }, false, 'triggerWorkflowForTaskError');
            throw error;
          }
        },

        // Handle workflow status updates from WebSocket
        handleWorkflowStatusUpdate: (statusUpdate) => {
          const { adw_id, status, message, progress_percent, current_step } = statusUpdate;

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

          // Find and update the associated task
          const { tasks } = get();
          const task = tasks.find(t => t.metadata?.adw_id === adw_id);

          if (task) {
            get().updateTask(task.id, {
              metadata: {
                ...task.metadata,
                workflow_status: status,
                workflow_message: message,
                workflow_progress: progress_percent,
                workflow_step: current_step,
              }
            });

            // Auto-progress task stage based on workflow status
            if (status === 'completed') {
              get().handleWorkflowCompletion(task.id, statusUpdate);
            } else if (status === 'failed') {
              get().moveTaskToStage(task.id, 'errored');
            }
          }
        },

        // Handle workflow completion
        handleWorkflowCompletion: (taskId) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) return;

          // Determine next stage based on workflow type and current stage
          const workflowType = task.metadata?.workflow_name;

          if (workflowType) {
            // Map workflow completion to next stage
            const workflowStageMap = {
              'adw_plan_iso': 'build',
              'adw_build_iso': 'test',
              'adw_test_iso': 'review',
              'adw_review_iso': 'document',
              'adw_document_iso': 'pr',
              'adw_ship_iso': 'pr',
            };

            const nextStage = workflowStageMap[workflowType];
            if (nextStage && task.stage !== nextStage) {
              get().moveTaskToStage(taskId, nextStage);
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

        // WebSocket connection status
        getWebSocketStatus: () => {
          const { websocketConnected, websocketConnecting, websocketError } = get();
          return {
            connected: websocketConnected,
            connecting: websocketConnecting,
            error: websocketError,
            serverStatus: websocketService.getStatus(),
          };
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
            console.log('Manually cleaning up dummy data...');
            const cleanupResult = dataMigration.manualCleanup();

            if (cleanupResult.success) {
              console.log(`Cleanup completed. Removed ${cleanupResult.removedProjects} dummy projects, preserved ${cleanupResult.preservedProjects} real projects.`);

              // Refresh store state after cleanup
              // The persist middleware will reload from localStorage
              window.location.reload(); // Force reload to ensure clean state

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
            console.log('Initializing data migrations...');

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
        }),
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