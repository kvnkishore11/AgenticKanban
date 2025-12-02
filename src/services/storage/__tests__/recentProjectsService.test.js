/**
 * @fileoverview Unit tests for Recent Projects Service
 * Tests the tracking, retrieval, and management of recently accessed projects
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import recentProjectsService from '../recentProjectsService';
import projectPersistenceService from '../projectPersistenceService';

// Mock the projectPersistenceService
vi.mock('../projectPersistenceService', () => ({
  default: {
    getAllProjects: vi.fn(),
    getProjectById: vi.fn(),
    updateProjectAccessTime: vi.fn(),
    updateProject: vi.fn(),
  }
}));

describe('RecentProjectsService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('getRecentProjects', () => {
    it('should return empty array when no projects have been accessed', () => {
      // Mock no projects with lastAccessedAt
      projectPersistenceService.getAllProjects.mockReturnValue([
        { id: 'project-1', name: 'Project 1', path: '/path/1' },
        { id: 'project-2', name: 'Project 2', path: '/path/2' },
      ]);

      const recentProjects = recentProjectsService.getRecentProjects();

      expect(recentProjects).toEqual([]);
    });

    it('should return projects sorted by lastAccessedAt (most recent first)', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      projectPersistenceService.getAllProjects.mockReturnValue([
        {
          id: 'project-1',
          name: 'Project 1',
          path: '/path/1',
          lastAccessedAt: twoDaysAgo.toISOString()
        },
        {
          id: 'project-2',
          name: 'Project 2',
          path: '/path/2',
          lastAccessedAt: now.toISOString()
        },
        {
          id: 'project-3',
          name: 'Project 3',
          path: '/path/3',
          lastAccessedAt: oneHourAgo.toISOString()
        },
      ]);

      const recentProjects = recentProjectsService.getRecentProjects();

      expect(recentProjects).toHaveLength(3);
      expect(recentProjects[0].id).toBe('project-2'); // Most recent
      expect(recentProjects[1].id).toBe('project-3');
      expect(recentProjects[2].id).toBe('project-1'); // Least recent
    });

    it('should return a maximum of 5 most recent projects', () => {
      const projects = [];
      for (let i = 0; i < 10; i++) {
        const accessTime = new Date(Date.now() - i * 60 * 60 * 1000); // Each 1 hour apart
        projects.push({
          id: `project-${i}`,
          name: `Project ${i}`,
          path: `/path/${i}`,
          lastAccessedAt: accessTime.toISOString()
        });
      }

      projectPersistenceService.getAllProjects.mockReturnValue(projects);

      const recentProjects = recentProjectsService.getRecentProjects();

      expect(recentProjects).toHaveLength(5);
      expect(recentProjects[0].id).toBe('project-0'); // Most recent
      expect(recentProjects[4].id).toBe('project-4'); // 5th most recent
    });

    it('should handle errors gracefully and return empty array', () => {
      projectPersistenceService.getAllProjects.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const recentProjects = recentProjectsService.getRecentProjects();

      expect(recentProjects).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getting recent projects:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should filter out projects without lastAccessedAt', () => {
      const now = new Date();

      projectPersistenceService.getAllProjects.mockReturnValue([
        {
          id: 'project-1',
          name: 'Project 1',
          path: '/path/1',
          lastAccessedAt: now.toISOString()
        },
        {
          id: 'project-2',
          name: 'Project 2',
          path: '/path/2'
          // No lastAccessedAt
        },
        {
          id: 'project-3',
          name: 'Project 3',
          path: '/path/3',
          lastAccessedAt: now.toISOString()
        },
      ]);

      const recentProjects = recentProjectsService.getRecentProjects();

      expect(recentProjects).toHaveLength(2);
      expect(recentProjects.map(p => p.id)).toEqual(['project-1', 'project-3']);
    });
  });

  describe('trackProjectAccess', () => {
    it('should successfully track project access', () => {
      const project = { id: 'project-1', name: 'Test Project', path: '/test' };

      projectPersistenceService.getProjectById.mockReturnValue(project);
      projectPersistenceService.updateProjectAccessTime.mockReturnValue({
        success: true,
        project: { ...project, lastAccessedAt: new Date().toISOString() }
      });

      const result = recentProjectsService.trackProjectAccess('project-1');

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(projectPersistenceService.updateProjectAccessTime).toHaveBeenCalledWith('project-1');
    });

    it('should return error when project ID is not provided', () => {
      const result = recentProjectsService.trackProjectAccess(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project ID is required');
    });

    it('should return error when project is not found', () => {
      projectPersistenceService.getProjectById.mockReturnValue(null);

      const result = recentProjectsService.trackProjectAccess('nonexistent-project');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project with ID nonexistent-project not found');
    });

    it('should handle errors from persistence service', () => {
      const project = { id: 'project-1', name: 'Test Project', path: '/test' };

      projectPersistenceService.getProjectById.mockReturnValue(project);
      projectPersistenceService.updateProjectAccessTime.mockReturnValue({
        success: false,
        errors: ['Failed to update']
      });

      const result = recentProjectsService.trackProjectAccess('project-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update');
    });

    it('should handle exceptions gracefully', () => {
      projectPersistenceService.getProjectById.mockImplementation(() => {
        throw new Error('Database error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = recentProjectsService.trackProjectAccess('project-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');

      consoleSpy.mockRestore();
    });
  });

  describe('clearRecentProjects', () => {
    it('should clear lastAccessedAt from all projects', () => {
      const projects = [
        {
          id: 'project-1',
          name: 'Project 1',
          path: '/path/1',
          lastAccessedAt: new Date().toISOString()
        },
        {
          id: 'project-2',
          name: 'Project 2',
          path: '/path/2',
          lastAccessedAt: new Date().toISOString()
        },
      ];

      projectPersistenceService.getAllProjects.mockReturnValue(projects);
      projectPersistenceService.updateProject.mockReturnValue({ success: true });

      const result = recentProjectsService.clearRecentProjects();

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(2);
      expect(projectPersistenceService.updateProject).toHaveBeenCalledTimes(2);
    });

    it('should not attempt to clear projects without lastAccessedAt', () => {
      const projects = [
        {
          id: 'project-1',
          name: 'Project 1',
          path: '/path/1'
          // No lastAccessedAt
        },
      ];

      projectPersistenceService.getAllProjects.mockReturnValue(projects);

      const result = recentProjectsService.clearRecentProjects();

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(0);
      expect(projectPersistenceService.updateProject).not.toHaveBeenCalled();
    });

    it('should handle errors during clearing', () => {
      projectPersistenceService.getAllProjects.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = recentProjectsService.clearRecentProjects();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');

      consoleSpy.mockRestore();
    });
  });

  describe('getRecentProjectsStats', () => {
    it('should return correct statistics', () => {
      const now = new Date();

      const projects = [
        {
          id: 'project-1',
          name: 'Project 1',
          path: '/path/1',
          lastAccessedAt: now.toISOString()
        },
        {
          id: 'project-2',
          name: 'Project 2',
          path: '/path/2',
          lastAccessedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString()
        },
        {
          id: 'project-3',
          name: 'Project 3',
          path: '/path/3'
          // No lastAccessedAt
        },
      ];

      projectPersistenceService.getAllProjects.mockReturnValue(projects);

      const stats = recentProjectsService.getRecentProjectsStats();

      expect(stats.totalProjects).toBe(3);
      expect(stats.recentProjectsCount).toBe(2);
      expect(stats.maxRecentProjects).toBe(5);
      expect(stats.projectsWithAccessTracking).toBe(2);
      expect(stats.projectsWithoutAccessTracking).toBe(1);
      expect(stats.newestRecentAccess).toBe(now.toISOString());
    });

    it('should handle empty projects list', () => {
      projectPersistenceService.getAllProjects.mockReturnValue([]);

      const stats = recentProjectsService.getRecentProjectsStats();

      expect(stats.totalProjects).toBe(0);
      expect(stats.recentProjectsCount).toBe(0);
      expect(stats.oldestRecentAccess).toBeNull();
      expect(stats.newestRecentAccess).toBeNull();
    });

    it('should handle errors gracefully', () => {
      projectPersistenceService.getAllProjects.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const stats = recentProjectsService.getRecentProjectsStats();

      expect(stats.error).toBe('Storage error');

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle updating the same project multiple times', () => {
      const project = { id: 'project-1', name: 'Test Project', path: '/test' };
      let accessTime = new Date();

      projectPersistenceService.getProjectById.mockReturnValue(project);

      // First access
      projectPersistenceService.updateProjectAccessTime.mockReturnValue({
        success: true,
        project: { ...project, lastAccessedAt: accessTime.toISOString() }
      });

      const result1 = recentProjectsService.trackProjectAccess('project-1');
      expect(result1.success).toBe(true);

      // Second access (later)
      accessTime = new Date(Date.now() + 1000);
      projectPersistenceService.updateProjectAccessTime.mockReturnValue({
        success: true,
        project: { ...project, lastAccessedAt: accessTime.toISOString() }
      });

      const result2 = recentProjectsService.trackProjectAccess('project-1');
      expect(result2.success).toBe(true);

      expect(projectPersistenceService.updateProjectAccessTime).toHaveBeenCalledTimes(2);
    });

    it('should correctly handle exactly 5 projects', () => {
      const projects = [];
      for (let i = 0; i < 5; i++) {
        projects.push({
          id: `project-${i}`,
          name: `Project ${i}`,
          path: `/path/${i}`,
          lastAccessedAt: new Date(Date.now() - i * 1000).toISOString()
        });
      }

      projectPersistenceService.getAllProjects.mockReturnValue(projects);

      const recentProjects = recentProjectsService.getRecentProjects();

      expect(recentProjects).toHaveLength(5);
    });

    it('should handle projects with invalid date strings gracefully', () => {
      const projects = [
        {
          id: 'project-1',
          name: 'Project 1',
          path: '/path/1',
          lastAccessedAt: 'invalid-date'
        },
        {
          id: 'project-2',
          name: 'Project 2',
          path: '/path/2',
          lastAccessedAt: new Date().toISOString()
        },
      ];

      projectPersistenceService.getAllProjects.mockReturnValue(projects);

      // Should not throw error
      const recentProjects = recentProjectsService.getRecentProjects();

      expect(recentProjects).toHaveLength(2);
    });
  });
});
