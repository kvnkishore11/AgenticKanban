/**
 * @fileoverview Recent Projects Service - Manages tracking of recently accessed projects
 * Provides methods to track, retrieve, and manage the 5 most recently accessed projects
 */

import projectPersistenceService from './projectPersistenceService.js';

/**
 * Recent Projects Service handles tracking of recently accessed projects
 * @class
 */
class RecentProjectsService {
  constructor() {
    this.maxRecentProjects = 5;
  }

  /**
   * Get the most recently accessed projects (up to 5)
   * @returns {Array} Array of project objects sorted by lastAccessedAt (most recent first)
   */
  getRecentProjects() {
    try {
      const allProjects = projectPersistenceService.getAllProjects();

      // Filter projects that have been accessed (have lastAccessedAt timestamp)
      const accessedProjects = allProjects.filter(project => project.lastAccessedAt);

      // Sort by lastAccessedAt in descending order (most recent first)
      const sortedProjects = accessedProjects.sort((a, b) => {
        const dateA = new Date(a.lastAccessedAt);
        const dateB = new Date(b.lastAccessedAt);
        return dateB - dateA; // Descending order
      });

      // Return only the top 5 most recent
      return sortedProjects.slice(0, this.maxRecentProjects);
    } catch (error) {
      console.error('Error getting recent projects:', error);
      return [];
    }
  }

  /**
   * Track project access by updating its lastAccessedAt timestamp
   * @param {string} projectId - The ID of the project being accessed
   * @returns {Object} Result with success status
   */
  trackProjectAccess(projectId) {
    try {
      if (!projectId) {
        return {
          success: false,
          error: 'Project ID is required'
        };
      }

      // Get the project to verify it exists
      const project = projectPersistenceService.getProjectById(projectId);

      if (!project) {
        return {
          success: false,
          error: `Project with ID ${projectId} not found`
        };
      }

      // Update only the lastAccessedAt timestamp
      const result = projectPersistenceService.updateProjectAccessTime(projectId);

      if (result.success) {
        console.log(`Tracked access for project: ${project.name} (${projectId})`);
        return {
          success: true,
          project: result.project
        };
      } else {
        return {
          success: false,
          error: result.errors.join(', ')
        };
      }
    } catch (error) {
      console.error('Error tracking project access:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear recent projects tracking by removing lastAccessedAt from all projects
   * This is primarily used for testing and cleanup purposes
   * @returns {Object} Result with success status
   */
  clearRecentProjects() {
    try {
      const allProjects = projectPersistenceService.getAllProjects();
      let clearedCount = 0;

      // Remove lastAccessedAt from each project
      for (const project of allProjects) {
        if (project.lastAccessedAt) {
          // eslint-disable-next-line no-unused-vars
          const { lastAccessedAt, ...projectWithoutAccess } = project;
          const result = projectPersistenceService.updateProject(project.id, projectWithoutAccess);
          if (result.success) {
            clearedCount++;
          }
        }
      }

      console.log(`Cleared recent project tracking for ${clearedCount} projects`);

      return {
        success: true,
        clearedCount
      };
    } catch (error) {
      console.error('Error clearing recent projects:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get statistics about recent projects
   * @returns {Object} Statistics object
   */
  getRecentProjectsStats() {
    try {
      const allProjects = projectPersistenceService.getAllProjects();
      const recentProjects = this.getRecentProjects();

      return {
        totalProjects: allProjects.length,
        recentProjectsCount: recentProjects.length,
        maxRecentProjects: this.maxRecentProjects,
        projectsWithAccessTracking: allProjects.filter(p => p.lastAccessedAt).length,
        projectsWithoutAccessTracking: allProjects.filter(p => !p.lastAccessedAt).length,
        oldestRecentAccess: recentProjects.length > 0
          ? recentProjects[recentProjects.length - 1].lastAccessedAt
          : null,
        newestRecentAccess: recentProjects.length > 0
          ? recentProjects[0].lastAccessedAt
          : null
      };
    } catch (error) {
      console.error('Error getting recent projects stats:', error);
      return {
        error: error.message
      };
    }
  }
}

// Create and export singleton instance
const recentProjectsService = new RecentProjectsService();
export default recentProjectsService;
