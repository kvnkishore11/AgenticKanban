/**
 * @fileoverview Tests for ProjectPersistenceService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// Create a storage map to track data
const storageMap = new Map();

// Mock dependencies
vi.mock('../localStorage.js', () => ({
  default: {
    getItem: vi.fn((key, defaultValue = null) => {
      const value = storageMap.get(key);
      return value !== undefined ? value : defaultValue;
    }),
    setItem: vi.fn((key, value) => {
      storageMap.set(key, value);
      return true;
    }),
    removeItem: vi.fn((key) => {
      storageMap.delete(key);
      return true;
    }),
    getStorageInfo: vi.fn(() => ({
      totalKeys: 10,
      appKeys: 5,
      totalSize: 1000,
      appSize: 500,
      available: true
    }))
  }
}));

vi.mock('../../utils/dataMigration.js', () => ({
  isDummyProject: vi.fn((project) => {
    return project?.name === 'Dummy Project' || project?.path === '/dummy/path';
  }),
  detectDummyProjects: vi.fn((projects) => {
    const dummyProjects = projects.filter(p => p.name === 'Dummy Project' || p.path === '/dummy/path');
    const realProjects = projects.filter(p => p.name !== 'Dummy Project' && p.path !== '/dummy/path');
    return { dummyProjects, realProjects };
  })
}));

import projectPersistenceService from '../projectPersistenceService.js';
import localStorageService from '../localStorage.js';

describe('ProjectPersistenceService', () => {
  let service;

  beforeEach(() => {
    localStorageMock.clear();
    storageMap.clear();
    vi.clearAllMocks();
    service = projectPersistenceService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize service and return stats', () => {
      const stats = service.initialize();

      expect(stats).toHaveProperty('totalProjects');
      expect(stats).toHaveProperty('storageInfo');
    });

    it('should clean up dummy projects on initialization', () => {
      // Set up projects in storage including a dummy project
      storageMap.set('projects', [
        { id: '1', name: 'Real Project', path: '/real/path' },
        { id: '2', name: 'Dummy Project', path: '/dummy/path' }
      ]);

      service.initialize();

      // Check that only real project remains
      const projects = storageMap.get('projects');
      expect(projects).toBeDefined();
      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('Real Project');
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects', () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', path: '/path1' },
        { id: '2', name: 'Project 2', path: '/path2' }
      ];

      localStorageService.getItem.mockReturnValueOnce(mockProjects);

      const projects = service.getAllProjects();

      expect(projects).toEqual(mockProjects);
    });

    it('should filter out dummy projects', () => {
      const mockProjects = [
        { id: '1', name: 'Real Project', path: '/real/path' },
        { id: '2', name: 'Dummy Project', path: '/dummy/path' }
      ];

      localStorageService.getItem.mockReturnValueOnce(mockProjects);

      const projects = service.getAllProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Real Project');
    });

    it('should return empty array when no projects exist', () => {
      localStorageService.getItem.mockReturnValueOnce([]);

      const projects = service.getAllProjects();

      expect(projects).toEqual([]);
    });
  });

  describe('saveProjects', () => {
    it('should save projects successfully', () => {
      const projects = [
        { id: '1', name: 'Project 1', path: '/path1' }
      ];

      const result = service.saveProjects(projects);

      expect(result).toBe(true);
      expect(localStorageService.setItem).toHaveBeenCalled();
    });

    it('should filter out dummy projects before saving', () => {
      const projects = [
        { id: '1', name: 'Real Project', path: '/real/path' },
        { id: '2', name: 'Dummy Project', path: '/dummy/path' }
      ];

      service.saveProjects(projects);

      const savedProjects = localStorageService.setItem.mock.calls[0][1];
      expect(savedProjects).toHaveLength(1);
      expect(savedProjects[0].name).toBe('Real Project');
    });

    it('should remove duplicates before saving', () => {
      const projects = [
        { id: '1', name: 'Project 1', path: '/path1' },
        { id: '2', name: 'Project 1', path: '/path1' }
      ];

      service.saveProjects(projects);

      const savedProjects = localStorageService.setItem.mock.calls[0][1];
      expect(savedProjects).toHaveLength(1);
    });
  });

  describe('addProject', () => {
    it('should add a valid project', () => {
      // Ensure storage starts empty
      storageMap.set('projects', []);

      const project = {
        name: 'New Project',
        path: '/new/path',
        description: 'A real production project'
      };

      const result = service.addProject(project);

      expect(result.success).toBe(true);
      expect(result.project).toHaveProperty('id');
      expect(result.project).toHaveProperty('createdAt');
      expect(result.project).toHaveProperty('updatedAt');
      expect(result.project).toHaveProperty('version', '1.0.0');
    });

    it('should reject invalid project', () => {
      const project = {
        name: '',
        path: '/path'
      };

      const result = service.addProject(project);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject dummy project', () => {
      const project = {
        name: 'Dummy Project',
        path: '/dummy/path'
      };

      const result = service.addProject(project);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cannot add dummy project');
    });

    it('should detect duplicates', () => {
      // First add a project
      service.addProject({
        id: '1',
        name: 'Existing',
        path: '/existing/path'
      });

      // Try to add duplicate
      const result = service.addProject({
        name: 'Existing',
        path: '/existing/path'
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('already exists');
    });

    it('should generate ID if not provided', () => {
      // Ensure storage starts empty
      storageMap.set('projects', []);

      const project = {
        name: 'Production App',
        path: '/projects/production-app'
      };

      const result = service.addProject(project);

      expect(result.success).toBe(true);
      expect(result.project.id).toBeTruthy();
    });

    it('should validate project name length', () => {
      const project = {
        name: 'a'.repeat(101),
        path: '/path'
      };

      const result = service.addProject(project);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('less than 100 characters'))).toBe(true);
    });

    it('should validate description length', () => {
      const project = {
        name: 'Test',
        path: '/path',
        description: 'a'.repeat(501)
      };

      const result = service.addProject(project);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('less than 500 characters'))).toBe(true);
    });
  });

  describe('updateProject', () => {
    it('should update existing project', () => {
      // Add a project first
      service.addProject({
        id: 'project-1',
        name: 'Original',
        path: '/original'
      });

      const result = service.updateProject('project-1', { name: 'Updated' });

      expect(result.success).toBe(true);
      expect(result.project.name).toBe('Updated');
      expect(result.project).toHaveProperty('updatedAt');
    });

    it('should fail when project not found', () => {
      const result = service.updateProject('non-existent', { name: 'Updated' });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Project not found');
    });

    it('should validate updated project', () => {
      // Add a project first
      service.addProject({
        id: 'project-1',
        name: 'Original',
        path: '/original'
      });

      const result = service.updateProject('project-1', { name: '' });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject update to dummy project', () => {
      // Add a project first
      service.addProject({
        id: 'project-1',
        name: 'Original',
        path: '/original'
      });

      const result = service.updateProject('project-1', {
        name: 'Dummy Project',
        path: '/dummy/path'
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('dummy project'))).toBe(true);
    });
  });

  describe('removeProject', () => {
    it('should remove project by ID', () => {
      // Add two projects first
      service.addProject({ id: 'project-1', name: 'Project 1', path: '/path1' });
      service.addProject({ id: 'project-2', name: 'Project 2', path: '/path2' });

      const result = service.removeProject('project-1');

      expect(result).toBe(true);
      const remainingProjects = service.getAllProjects();
      expect(remainingProjects).toHaveLength(1);
      expect(remainingProjects[0].id).toBe('project-2');
    });

    it('should return false when project not found', () => {
      localStorageService.getItem.mockReturnValueOnce([]);

      const result = service.removeProject('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getProjectById', () => {
    it('should return project by ID', () => {
      // Add a project first
      service.addProject({ id: 'project-1', name: 'Project 1', path: '/path1' });

      const project = service.getProjectById('project-1');

      expect(project).toBeTruthy();
      expect(project.name).toBe('Project 1');
    });

    it('should return null when not found', () => {
      const project = service.getProjectById('non-existent');

      expect(project).toBe(null);
    });
  });

  describe('validateProject', () => {
    it('should validate correct project', () => {
      const project = {
        name: 'Valid Project',
        path: '/valid/path',
        description: 'Valid description'
      };

      const result = service.validateProject(project);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object', () => {
      const result = service.validateProject('not an object');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project must be an object');
    });

    it('should reject missing name', () => {
      const result = service.validateProject({ path: '/path' });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('name is required'))).toBe(true);
    });

    it('should reject missing path', () => {
      const result = service.validateProject({ name: 'Test' });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('path is required'))).toBe(true);
    });

    it('should reject empty strings', () => {
      const result = service.validateProject({ name: '  ', path: '  ' });

      expect(result.isValid).toBe(false);
    });
  });

  describe('removeDuplicateProjects', () => {
    it('should remove duplicates keeping most recent', () => {
      const projects = [
        {
          id: '1',
          name: 'Project',
          path: '/path',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Project',
          path: '/path',
          createdAt: '2023-01-02T00:00:00Z',
          updatedAt: '2023-01-02T00:00:00Z'
        }
      ];

      const unique = service.removeDuplicateProjects(projects);

      expect(unique).toHaveLength(1);
      expect(unique[0].id).toBe('2'); // More recent one
    });

    it('should handle projects without timestamps', () => {
      const projects = [
        { id: '1', name: 'Project', path: '/path' },
        { id: '2', name: 'Project', path: '/path' }
      ];

      const unique = service.removeDuplicateProjects(projects);

      expect(unique).toHaveLength(1);
    });
  });

  describe('generateProjectId', () => {
    it('should generate unique project IDs', () => {
      const id1 = service.generateProjectId();
      const id2 = service.generateProjectId();

      expect(id1).toMatch(/^project-\d+$/);
      expect(id2).toMatch(/^project-\d+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('clearAllData', () => {
    it('should clear all project data with backup', () => {
      // Add a project first
      service.addProject({ id: '1', name: 'Project 1', path: '/path1' });

      const result = service.clearAllData();

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(1);
      expect(result.backupKey).toBeTruthy();
      expect(localStorageService.removeItem).toHaveBeenCalled();
    });
  });

  describe('exportProjects', () => {
    it('should export all projects', () => {
      // Add a project first
      const addResult = service.addProject({ id: '1', name: 'Project 1', path: '/path1' });

      const exported = service.exportProjects();

      expect(exported).toHaveProperty('version', '1.0.0');
      expect(exported).toHaveProperty('exportedAt');
      expect(exported).toHaveProperty('projects');
      expect(exported.projects).toHaveLength(1);
      expect(exported.projects[0].name).toBe('Project 1');
    });
  });

  describe('importProjects', () => {
    it('should import valid projects', () => {
      const importData = {
        version: '1.0.0',
        projects: [
          { id: '1', name: 'Project 1', path: '/path1' }
        ]
      };

      localStorageService.getItem.mockReturnValueOnce([]);

      const result = service.importProjects(importData);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
    });

    it('should reject invalid import format', () => {
      const result = service.importProjects({ invalid: true });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should skip invalid projects', () => {
      const importData = {
        version: '1.0.0',
        projects: [
          { id: '1', name: 'Valid', path: '/path1' },
          { id: '2', name: '', path: '/path2' } // Invalid
        ]
      };

      localStorageService.getItem.mockReturnValueOnce([]);

      const result = service.importProjects(importData);

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
    });
  });

  describe('getStorageStats', () => {
    it('should return comprehensive storage statistics', () => {
      const projects = [
        {
          id: '1',
          name: 'Project 1',
          path: '/path1',
          createdAt: '2023-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Project 2',
          path: '/path2',
          createdAt: '2023-01-02T00:00:00Z'
        }
      ];

      localStorageService.getItem.mockReturnValueOnce(projects);
      localStorageService.getItem.mockReturnValueOnce([]);
      localStorageService.getItem.mockReturnValueOnce(null);

      const stats = service.getStorageStats();

      expect(stats).toHaveProperty('totalProjects', 2);
      expect(stats).toHaveProperty('projectsWithIds', 2);
      expect(stats).toHaveProperty('uniqueNames', 2);
      expect(stats).toHaveProperty('uniquePaths', 2);
      expect(stats).toHaveProperty('oldestProject');
      expect(stats).toHaveProperty('newestProject');
    });
  });
});
