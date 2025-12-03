/**
 * @fileoverview Project Persistence Service - Manages project storage, uniqueness, and cleanup
 * Provides centralized project data management with JSON format persistence and dummy project removal
 */

import localStorageService from './localStorage.js';
import { isDummyProject, detectDummyProjects } from '../../utils/dataMigration.js';

/**
 * Project Persistence Service handles all project-related storage operations
 * @class
 */
class ProjectPersistenceService {
  constructor() {
    this.storageKey = 'projects';
    this.projectIdCounter = 'project-id-counter';
    this.lastCleanup = 'last-cleanup-timestamp';
  }

  /**
   * Initialize the service and perform cleanup if needed
   */
  initialize() {
    console.log('Initializing Project Persistence Service...');

    // Migrate from old storage format if needed
    this.migrateFromOldFormat();

    // Perform cleanup of dummy projects
    this.removeDummyProjects();

    // Remove duplicates
    this.deduplicateProjects();

    console.log('Project Persistence Service initialized');
    return this.getStorageStats();
  }

  /**
   * Get all projects in clean JSON format
   * @returns {Array} Array of project objects
   */
  getAllProjects() {
    const projects = localStorageService.getItem(this.storageKey, []);

    // Ensure no dummy projects are returned
    const cleanProjects = projects.filter(project => !isDummyProject(project));

    // If we filtered out any projects, save the cleaned list
    if (cleanProjects.length !== projects.length) {
      this.saveProjects(cleanProjects);
    }

    return cleanProjects;
  }

  /**
   * Save projects to storage in JSON format
   * @param {Array} projects - Array of project objects
   * @returns {boolean} Success status
   */
  saveProjects(projects) {
    // Filter out dummy projects before saving
    const cleanProjects = projects.filter(project => !isDummyProject(project));

    // Remove duplicates
    const uniqueProjects = this.removeDuplicateProjects(cleanProjects);

    const success = localStorageService.setItem(this.storageKey, uniqueProjects);

    if (success) {
      console.log(`Saved ${uniqueProjects.length} projects to storage`);
      console.log('Persistence Verification:', { timestamp: new Date().toISOString(), projectCount: uniqueProjects.length, projects: uniqueProjects.map(p => ({ id: p.id, name: p.name, path: p.path })) });
    }

    return success;
  }

  /**
   * Add a new project with uniqueness validation
   * @param {Object} project - Project object to add
   * @returns {Object} Result with success status and project data
   */
  addProject(project) {
    try {
      // Validate project
      const validation = this.validateProject(project);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          project: null
        };
      }

      // Check if it's a dummy project
      if (isDummyProject(project)) {
        return {
          success: false,
          errors: ['Cannot add dummy project'],
          project: null
        };
      }

      const existingProjects = this.getAllProjects();

      // Check for duplicates
      const duplicate = this.findDuplicateProject(project, existingProjects);
      if (duplicate) {
        return {
          success: false,
          errors: [`Project already exists: ${duplicate.name} at ${duplicate.path}`],
          project: duplicate
        };
      }

      // Generate unique ID if not provided
      if (!project.id) {
        project.id = this.generateProjectId();
      }

      // Add timestamps
      const projectWithMetadata = {
        ...project,
        id: project.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      // Add to list and save
      const updatedProjects = [...existingProjects, projectWithMetadata];
      const success = this.saveProjects(updatedProjects);

      if (success) {
        console.log(`Added project: ${project.name}`);
        return {
          success: true,
          errors: [],
          project: projectWithMetadata
        };
      } else {
        return {
          success: false,
          errors: ['Failed to save project to storage'],
          project: null
        };
      }

    } catch (error) {
      console.error('Error adding project:', error);
      return {
        success: false,
        errors: [error.message],
        project: null
      };
    }
  }

  /**
   * Update an existing project
   * @param {string} projectId - Project ID to update
   * @param {Object} updates - Updates to apply
   * @returns {Object} Result with success status
   */
  updateProject(projectId, updates) {
    try {
      const projects = this.getAllProjects();
      const projectIndex = projects.findIndex(p => p.id === projectId);

      if (projectIndex === -1) {
        return {
          success: false,
          errors: ['Project not found'],
          project: null
        };
      }

      const updatedProject = {
        ...projects[projectIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Validate updated project
      const validation = this.validateProject(updatedProject);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          project: null
        };
      }

      // Check if update would create a dummy project
      if (isDummyProject(updatedProject)) {
        return {
          success: false,
          errors: ['Cannot update project to become a dummy project'],
          project: null
        };
      }

      projects[projectIndex] = updatedProject;
      const success = this.saveProjects(projects);

      if (success) {
        console.log(`Updated project: ${updatedProject.name}`);
        return {
          success: true,
          errors: [],
          project: updatedProject
        };
      } else {
        return {
          success: false,
          errors: ['Failed to save updated project'],
          project: null
        };
      }

    } catch (error) {
      console.error('Error updating project:', error);
      return {
        success: false,
        errors: [error.message],
        project: null
      };
    }
  }

  /**
   * Update project access time without modifying other fields
   * This is a lightweight operation specifically for tracking recent access
   * @param {string} projectId - Project ID to update
   * @returns {Object} Result with success status
   */
  updateProjectAccessTime(projectId) {
    try {
      const projects = this.getAllProjects();
      const projectIndex = projects.findIndex(p => p.id === projectId);

      if (projectIndex === -1) {
        return {
          success: false,
          errors: ['Project not found'],
          project: null
        };
      }

      // Only update lastAccessedAt, preserving all other fields
      const updatedProject = {
        ...projects[projectIndex],
        lastAccessedAt: new Date().toISOString()
      };

      projects[projectIndex] = updatedProject;
      const success = this.saveProjects(projects);

      if (success) {
        return {
          success: true,
          errors: [],
          project: updatedProject
        };
      } else {
        return {
          success: false,
          errors: ['Failed to save project access time'],
          project: null
        };
      }

    } catch (error) {
      console.error('Error updating project access time:', error);
      return {
        success: false,
        errors: [error.message],
        project: null
      };
    }
  }

  /**
   * Remove a project by ID
   * @param {string} projectId - Project ID to remove
   * @returns {boolean} Success status
   */
  removeProject(projectId) {
    try {
      const projects = this.getAllProjects();
      const filteredProjects = projects.filter(p => p.id !== projectId);

      if (filteredProjects.length === projects.length) {
        console.warn(`Project with ID ${projectId} not found`);
        return false;
      }

      const success = this.saveProjects(filteredProjects);
      if (success) {
        console.log(`Removed project with ID: ${projectId}`);
      }
      return success;

    } catch (error) {
      console.error('Error removing project:', error);
      return false;
    }
  }

  /**
   * Get project by ID
   * @param {string} projectId - Project ID to find
   * @returns {Object|null} Project object or null
   */
  getProjectById(projectId) {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  /**
   * Find duplicate project based on name and path
   * @param {Object} project - Project to check
   * @param {Array} existingProjects - Array of existing projects
   * @returns {Object|null} Duplicate project or null
   */
  findDuplicateProject(project, existingProjects) {
    return existingProjects.find(existing =>
      existing.name === project.name && existing.path === project.path
    ) || null;
  }

  /**
   * Remove duplicate projects, keeping the most recent
   * @param {Array} projects - Array of projects
   * @returns {Array} Deduplicated projects
   */
  removeDuplicateProjects(projects) {
    const seen = new Map();
    const unique = [];

    for (const project of projects) {
      const key = `${project.name}|${project.path}`;

      if (!seen.has(key)) {
        seen.set(key, project);
        unique.push(project);
      } else {
        // Keep the more recent one
        const existing = seen.get(key);
        const currentDate = new Date(project.updatedAt || project.createdAt || 0);
        const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);

        if (currentDate > existingDate) {
          // Replace with newer project
          const index = unique.findIndex(p => p === existing);
          if (index !== -1) {
            unique[index] = project;
            seen.set(key, project);
          }
        }
      }
    }

    const removedCount = projects.length - unique.length;
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} duplicate projects`);
    }

    return unique;
  }

  /**
   * Remove all dummy projects from storage
   * @returns {Object} Cleanup results
   */
  removeDummyProjects() {
    try {
      const allProjects = localStorageService.getItem(this.storageKey, []);
      const { dummyProjects, realProjects } = detectDummyProjects(allProjects);

      if (dummyProjects.length > 0) {
        console.log(`Removing ${dummyProjects.length} dummy projects:`, dummyProjects.map(p => p.name || 'Unnamed'));

        const success = this.saveProjects(realProjects);

        if (success) {
          this.recordCleanup('dummy-removal', {
            removedCount: dummyProjects.length,
            preservedCount: realProjects.length,
            removedProjects: dummyProjects.map(p => ({ name: p.name, path: p.path }))
          });
        }

        return {
          success,
          removedCount: dummyProjects.length,
          preservedCount: realProjects.length,
          removedProjects: dummyProjects
        };
      }

      return {
        success: true,
        removedCount: 0,
        preservedCount: allProjects.length,
        removedProjects: []
      };

    } catch (error) {
      console.error('Error removing dummy projects:', error);
      return {
        success: false,
        error: error.message,
        removedCount: 0,
        preservedCount: 0
      };
    }
  }

  /**
   * Deduplicate all projects in storage
   * @returns {Object} Deduplication results
   */
  deduplicateProjects() {
    try {
      const projects = localStorageService.getItem(this.storageKey, []);
      const unique = this.removeDuplicateProjects(projects);

      const removedCount = projects.length - unique.length;

      if (removedCount > 0) {
        const success = this.saveProjects(unique);

        if (success) {
          this.recordCleanup('deduplication', {
            originalCount: projects.length,
            finalCount: unique.length,
            removedCount
          });
        }

        return {
          success,
          originalCount: projects.length,
          finalCount: unique.length,
          removedCount
        };
      }

      return {
        success: true,
        originalCount: projects.length,
        finalCount: projects.length,
        removedCount: 0
      };

    } catch (error) {
      console.error('Error deduplicating projects:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate project object
   * @param {Object} project - Project to validate
   * @returns {Object} Validation result
   */
  validateProject(project) {
    const errors = [];

    if (!project || typeof project !== 'object') {
      errors.push('Project must be an object');
      return { isValid: false, errors };
    }

    if (!project.name || typeof project.name !== 'string' || project.name.trim().length === 0) {
      errors.push('Project name is required and must be a non-empty string');
    }

    if (project.name && project.name.length > 100) {
      errors.push('Project name must be less than 100 characters');
    }

    if (!project.path || typeof project.path !== 'string' || project.path.trim().length === 0) {
      errors.push('Project path is required and must be a non-empty string');
    }

    if (project.description && typeof project.description !== 'string') {
      errors.push('Project description must be a string');
    }

    if (project.description && project.description.length > 500) {
      errors.push('Project description must be less than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique project ID
   * @returns {string} Unique project ID
   */
  generateProjectId() {
    const counter = localStorageService.getItem(this.projectIdCounter, 1);
    const newId = `project-${counter}`;
    localStorageService.setItem(this.projectIdCounter, counter + 1);
    return newId;
  }

  /**
   * Migrate from old storage format
   * @returns {Object} Migration result
   */
  migrateFromOldFormat() {
    try {
      // Check if old format data exists
      const oldData = localStorageService.getItem('agentic-kanban-storage');

      if (oldData && oldData.availableProjects && Array.isArray(oldData.availableProjects)) {
        console.log('Migrating projects from old storage format...');

        const existingProjects = localStorageService.getItem(this.storageKey, []);

        // Convert old format to new format
        const migratedProjects = oldData.availableProjects.map(project => ({
          ...project,
          id: project.id || this.generateProjectId(),
          createdAt: project.createdAt || new Date().toISOString(),
          updatedAt: project.updatedAt || new Date().toISOString(),
          version: '1.0.0',
          source: 'migration'
        }));

        // Merge with existing projects
        const allProjects = [...existingProjects, ...migratedProjects];
        const uniqueProjects = this.removeDuplicateProjects(allProjects);

        // Remove dummy projects
        const cleanProjects = uniqueProjects.filter(project => !isDummyProject(project));

        const success = this.saveProjects(cleanProjects);

        if (success) {
          console.log(`Migrated ${cleanProjects.length} projects from old format`);
          this.recordCleanup('format-migration', {
            migratedCount: migratedProjects.length,
            finalCount: cleanProjects.length,
            source: 'old-storage-format'
          });
        }

        return {
          success,
          migratedCount: migratedProjects.length,
          finalCount: cleanProjects.length
        };
      }

      return { success: true, migratedCount: 0, finalCount: 0 };

    } catch (error) {
      console.error('Error migrating from old format:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record cleanup operation for audit purposes
   * @param {string} operation - Type of cleanup operation
   * @param {Object} details - Operation details
   */
  recordCleanup(operation, details) {
    try {
      const timestamp = new Date().toISOString();
      const cleanupRecord = {
        operation,
        timestamp,
        details
      };

      const cleanupHistory = localStorageService.getItem('cleanup-history', []);
      cleanupHistory.unshift(cleanupRecord);

      // Keep only last 50 cleanup records
      const limitedHistory = cleanupHistory.slice(0, 50);

      localStorageService.setItem('cleanup-history', limitedHistory);
      localStorageService.setItem(this.lastCleanup, timestamp);

      console.log(`Recorded cleanup operation: ${operation}`, details);

    } catch (error) {
      console.error('Error recording cleanup:', error);
    }
  }

  /**
   * Get storage statistics
   * @returns {Object} Storage statistics
   */
  getStorageStats() {
    try {
      const projects = this.getAllProjects();
      const cleanupHistory = localStorageService.getItem('cleanup-history', []);
      const lastCleanup = localStorageService.getItem(this.lastCleanup);

      const stats = {
        totalProjects: projects.length,
        lastCleanup,
        cleanupOperations: cleanupHistory.length,
        projectsWithIds: projects.filter(p => p.id).length,
        projectsWithoutIds: projects.filter(p => !p.id).length,
        uniqueNames: new Set(projects.map(p => p.name)).size,
        uniquePaths: new Set(projects.map(p => p.path)).size,
        oldestProject: projects.reduce((oldest, project) => {
          const projectDate = new Date(project.createdAt || 0);
          const oldestDate = new Date(oldest?.createdAt || 0);
          return projectDate < oldestDate ? project : oldest;
        }, null),
        newestProject: projects.reduce((newest, project) => {
          const projectDate = new Date(project.createdAt || 0);
          const newestDate = new Date(newest?.createdAt || 0);
          return projectDate > newestDate ? project : newest;
        }, null),
        storageInfo: localStorageService.getStorageInfo()
      };

      return stats;

    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Get cleanup history
   * @returns {Array} Array of cleanup operations
   */
  getCleanupHistory() {
    return localStorageService.getItem('cleanup-history', []);
  }

  /**
   * Clear all project data (with backup)
   * @returns {Object} Clear operation result
   */
  clearAllData() {
    try {
      // Create backup before clearing
      const projects = this.getAllProjects();
      const backupKey = `projects-backup-${Date.now()}`;

      localStorageService.setItem(backupKey, {
        projects,
        timestamp: new Date().toISOString(),
        reason: 'manual-clear'
      });

      // Clear project data
      localStorageService.removeItem(this.storageKey);
      localStorageService.removeItem(this.projectIdCounter);

      console.log(`Cleared all project data. Backup saved as: ${backupKey}`);

      return {
        success: true,
        clearedCount: projects.length,
        backupKey
      };

    } catch (error) {
      console.error('Error clearing project data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restore projects from backup
   * @param {string} backupKey - Backup key to restore from
   * @returns {Object} Restore operation result
   */
  restoreFromBackup(backupKey) {
    try {
      const backup = localStorageService.getItem(backupKey);

      if (!backup || !backup.projects) {
        throw new Error('Invalid backup data');
      }

      const success = this.saveProjects(backup.projects);

      if (success) {
        console.log(`Restored ${backup.projects.length} projects from backup: ${backupKey}`);
        this.recordCleanup('restore-from-backup', {
          backupKey,
          restoredCount: backup.projects.length,
          backupTimestamp: backup.timestamp
        });
      }

      return {
        success,
        restoredCount: backup.projects.length,
        backupTimestamp: backup.timestamp
      };

    } catch (error) {
      console.error('Error restoring from backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export projects in JSON format
   * @returns {Object} Export data
   */
  exportProjects() {
    try {
      const projects = this.getAllProjects();
      const stats = this.getStorageStats();

      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        projects,
        metadata: {
          totalProjects: projects.length,
          source: 'project-persistence-service'
        },
        statistics: stats
      };

    } catch (error) {
      console.error('Error exporting projects:', error);
      return null;
    }
  }

  /**
   * Import projects from JSON format
   * @param {Object} importData - Import data
   * @returns {Object} Import result
   */
  importProjects(importData) {
    try {
      if (!importData || !importData.projects || !Array.isArray(importData.projects)) {
        throw new Error('Invalid import data format');
      }

      // Validate each project
      const validProjects = [];
      const errors = [];

      for (const project of importData.projects) {
        const validation = this.validateProject(project);
        if (validation.isValid && !isDummyProject(project)) {
          validProjects.push({
            ...project,
            importedAt: new Date().toISOString()
          });
        } else {
          errors.push(`Invalid project: ${project.name || 'Unnamed'} - ${validation.errors.join(', ')}`);
        }
      }

      if (validProjects.length === 0) {
        throw new Error('No valid projects found in import data');
      }

      // Merge with existing projects
      const existing = this.getAllProjects();
      const merged = [...existing, ...validProjects];
      const unique = this.removeDuplicateProjects(merged);

      const success = this.saveProjects(unique);

      if (success) {
        this.recordCleanup('import-projects', {
          importedCount: validProjects.length,
          errorCount: errors.length,
          finalCount: unique.length
        });
      }

      return {
        success,
        importedCount: validProjects.length,
        skippedCount: errors.length,
        finalCount: unique.length,
        errors: errors.slice(0, 10) // Limit error messages
      };

    } catch (error) {
      console.error('Error importing projects:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export singleton instance
const projectPersistenceService = new ProjectPersistenceService();
export default projectPersistenceService;