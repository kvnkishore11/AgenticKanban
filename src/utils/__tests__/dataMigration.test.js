/**
 * Tests for Data Migration Utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isDummyProject,
  detectDummyProjects,
  runMigrations,
  manualCleanup,
  validateNoDummyProjects,
  validateProjectDataIntegrity,
  deduplicateProjectsByNameAndPath,
  getStorageInfo,
  createBackup,
  getMigrationVersion,
  setMigrationVersion,
  CURRENT_MIGRATION_VERSION,
  STORAGE_KEY,
} from '../dataMigration';

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
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
})();

global.localStorage = localStorageMock;

describe('dataMigration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('isDummyProject', () => {
    it('should identify dummy projects by exact name matches', () => {
      expect(isDummyProject({ name: 'demo', path: '/path' })).toBe(true);
      expect(isDummyProject({ name: 'test', path: '/path' })).toBe(true);
      expect(isDummyProject({ name: 'sample', path: '/path' })).toBe(true);
      expect(isDummyProject({ name: 'example', path: '/path' })).toBe(true);
      expect(isDummyProject({ name: 'dummy', path: '/path' })).toBe(true);
    });

    it('should identify dummy projects by name patterns', () => {
      expect(isDummyProject({ name: 'demo-project', path: '/path' })).toBe(true);
      expect(isDummyProject({ name: 'test_app', path: '/path' })).toBe(true);
      expect(isDummyProject({ name: 'sample-code', path: '/path' })).toBe(true);
      expect(isDummyProject({ name: 'my-mock-project', path: '/path' })).toBe(true);
    });

    it('should identify dummy projects by path patterns', () => {
      expect(isDummyProject({ name: 'RealProject', path: '/demo/project' })).toBe(true);
      expect(isDummyProject({ name: 'RealProject', path: '/test/app' })).toBe(true);
      expect(isDummyProject({ name: 'RealProject', path: '/tmp/workspace' })).toBe(true);
      expect(isDummyProject({ name: 'RealProject', path: '/temp/files' })).toBe(true);
    });

    it('should identify dummy projects by description', () => {
      expect(isDummyProject({ name: 'Project', path: '/path', description: 'This is a demo project' })).toBe(true);
      expect(isDummyProject({ name: 'Project', path: '/path', description: 'Test application' })).toBe(true);
      expect(isDummyProject({ name: 'Project', path: '/path', description: 'Sample code' })).toBe(true);
    });

    it('should not identify real projects as dummy', () => {
      expect(isDummyProject({ name: 'MyRealProject', path: '/home/user/projects' })).toBe(false);
      expect(isDummyProject({ name: 'ProductionApp', path: '/var/www/app' })).toBe(false);
      expect(isDummyProject({ name: 'ClientProject', path: '/projects/client' })).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isDummyProject({ name: 'DEMO', path: '/path' })).toBe(true);
      expect(isDummyProject({ name: 'Test', path: '/path' })).toBe(true);
      expect(isDummyProject({ name: 'SAMPLE', path: '/path' })).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isDummyProject(null)).toBe(false);
      expect(isDummyProject(undefined)).toBe(false);
      expect(isDummyProject({})).toBe(false);
      expect(isDummyProject({ name: '', path: '' })).toBe(false);
    });
  });

  describe('detectDummyProjects', () => {
    it('should separate dummy and real projects', () => {
      const projects = [
        { name: 'demo', path: '/demo' },
        { name: 'RealProject', path: '/real' },
        { name: 'test', path: '/test' },
        { name: 'AnotherReal', path: '/another' },
      ];

      const { dummyProjects, realProjects } = detectDummyProjects(projects);

      expect(dummyProjects).toHaveLength(2);
      expect(realProjects).toHaveLength(2);
      expect(dummyProjects.map(p => p.name)).toEqual(['demo', 'test']);
      expect(realProjects.map(p => p.name)).toEqual(['RealProject', 'AnotherReal']);
    });

    it('should handle all dummy projects', () => {
      const projects = [
        { name: 'demo', path: '/demo' },
        { name: 'test', path: '/test' },
      ];

      const { dummyProjects, realProjects } = detectDummyProjects(projects);

      expect(dummyProjects).toHaveLength(2);
      expect(realProjects).toHaveLength(0);
    });

    it('should handle all real projects', () => {
      const projects = [
        { name: 'RealProject1', path: '/real1' },
        { name: 'RealProject2', path: '/real2' },
      ];

      const { dummyProjects, realProjects } = detectDummyProjects(projects);

      expect(dummyProjects).toHaveLength(0);
      expect(realProjects).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const { dummyProjects, realProjects } = detectDummyProjects([]);

      expect(dummyProjects).toHaveLength(0);
      expect(realProjects).toHaveLength(0);
    });

    it('should handle non-array input', () => {
      const { dummyProjects, realProjects } = detectDummyProjects(null);

      expect(dummyProjects).toHaveLength(0);
      expect(realProjects).toHaveLength(0);
    });
  });

  describe('deduplicateProjectsByNameAndPath', () => {
    it('should remove duplicate projects by name and path', () => {
      const projects = [
        { name: 'Project1', path: '/path1', createdAt: '2024-01-01' },
        { name: 'Project1', path: '/path1', createdAt: '2024-01-02' }, // Duplicate, newer
        { name: 'Project2', path: '/path2', createdAt: '2024-01-01' },
      ];

      const unique = deduplicateProjectsByNameAndPath(projects);

      expect(unique).toHaveLength(2);
      expect(unique.find(p => p.name === 'Project1').createdAt).toBe('2024-01-02');
    });

    it('should keep the most recent duplicate', () => {
      const projects = [
        { name: 'Project', path: '/path', updatedAt: '2024-01-01' },
        { name: 'Project', path: '/path', updatedAt: '2024-01-03' }, // Most recent
        { name: 'Project', path: '/path', updatedAt: '2024-01-02' },
      ];

      const unique = deduplicateProjectsByNameAndPath(projects);

      expect(unique).toHaveLength(1);
      expect(unique[0].updatedAt).toBe('2024-01-03');
    });

    it('should preserve projects with different names or paths', () => {
      const projects = [
        { name: 'Project1', path: '/path1' },
        { name: 'Project1', path: '/path2' }, // Different path
        { name: 'Project2', path: '/path1' }, // Different name
      ];

      const unique = deduplicateProjectsByNameAndPath(projects);

      expect(unique).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const unique = deduplicateProjectsByNameAndPath([]);
      expect(unique).toHaveLength(0);
    });
  });

  describe('validateProjectDataIntegrity', () => {
    it('should validate clean data', () => {
      const data = {
        availableProjects: [
          { name: 'RealProject', path: '/real' },
        ],
        selectedProject: null,
      };

      const result = validateProjectDataIntegrity(data);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect dummy projects', () => {
      const data = {
        availableProjects: [
          { name: 'demo', path: '/demo' },
        ],
      };

      const result = validateProjectDataIntegrity(data);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('dummy projects');
    });

    it('should detect duplicate projects', () => {
      const data = {
        availableProjects: [
          { name: 'Project', path: '/path' },
          { name: 'Project', path: '/path' },
        ],
      };

      const result = validateProjectDataIntegrity(data);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('duplicate');
    });

    it('should detect projects with missing fields', () => {
      const data = {
        availableProjects: [
          { name: 'Project' }, // Missing path
          { path: '/path' }, // Missing name
        ],
      };

      const result = validateProjectDataIntegrity(data);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect dummy selected project', () => {
      const data = {
        availableProjects: [],
        selectedProject: { name: 'demo', path: '/demo' },
      };

      const result = validateProjectDataIntegrity(data);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('Selected project'))).toBe(true);
    });

    it('should handle null data', () => {
      const result = validateProjectDataIntegrity(null);

      expect(result.isValid).toBe(true);
      expect(result.message).toContain('No data');
    });

    it('should include stats in result', () => {
      const data = {
        availableProjects: [
          { name: 'Project1', path: '/path1' },
          { name: 'Project2', path: '/path2' },
        ],
        tasks: [{ id: 1 }, { id: 2 }, { id: 3 }],
        selectedProject: { name: 'Project1', path: '/path1' },
      };

      const result = validateProjectDataIntegrity(data);

      expect(result.stats.totalProjects).toBe(2);
      expect(result.stats.totalTasks).toBe(3);
      expect(result.stats.hasSelectedProject).toBe(true);
    });
  });

  describe('validateNoDummyProjects', () => {
    it('should validate data without dummy projects', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        availableProjects: [
          { name: 'RealProject', path: '/real' },
        ],
      }));

      const result = validateNoDummyProjects();

      expect(result.isValid).toBe(true);
      expect(result.dummyProjects).toHaveLength(0);
    });

    it('should detect dummy projects', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        availableProjects: [
          { name: 'demo', path: '/demo' },
        ],
      }));

      const result = validateNoDummyProjects();

      expect(result.isValid).toBe(false);
      expect(result.dummyProjects).toHaveLength(1);
    });

    it('should detect dummy selected project', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        availableProjects: [],
        selectedProject: { name: 'test', path: '/test' },
      }));

      const result = validateNoDummyProjects();

      expect(result.isValid).toBe(false);
      expect(result.selectedProjectIsDummy).toBe(true);
    });

    it('should handle missing data', () => {
      const result = validateNoDummyProjects();

      expect(result.isValid).toBe(true);
      expect(result.message).toContain('No data found');
    });
  });

  describe('getMigrationVersion and setMigrationVersion', () => {
    it('should get and set migration version', () => {
      setMigrationVersion(2);
      expect(getMigrationVersion()).toBe(2);
    });

    it('should return 0 for missing version', () => {
      expect(getMigrationVersion()).toBe(0);
    });

    it('should handle version as string', () => {
      localStorageMock.setItem('agentic-kanban-migration-version', '5');
      expect(getMigrationVersion()).toBe(5);
    });
  });

  describe('createBackup', () => {
    it('should create backup with timestamp', () => {
      const data = { test: 'data' };
      const backupKey = createBackup(data);

      expect(backupKey).toBeTruthy();
      expect(backupKey).toContain('backup');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should include version and reason in backup', () => {
      const data = { test: 'data' };
      setMigrationVersion(1);
      createBackup(data);

      // Check that setItem was called with backup data
      const calls = localStorageMock.setItem.mock.calls;
      const backupCall = calls.find(call => call[0].includes('backup'));
      expect(backupCall).toBeDefined();

      const backupData = JSON.parse(backupCall[1]);
      expect(backupData.reason).toBe('pre-migration-backup');
      expect(backupData.data).toEqual(data);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        availableProjects: [{ name: 'Project', path: '/path' }],
        tasks: [{ id: 1 }],
      }));
      setMigrationVersion(1);

      const info = getStorageInfo();

      expect(info.hasData).toBe(true);
      expect(info.migrationVersion).toBe(1);
      expect(info.currentTargetVersion).toBe(CURRENT_MIGRATION_VERSION);
      expect(info.projectCount).toBe(1);
      expect(info.taskCount).toBe(1);
    });

    it('should indicate if migration is needed', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({}));
      setMigrationVersion(0);

      const info = getStorageInfo();

      expect(info.needsMigration).toBe(true);
    });

    it('should handle missing data', () => {
      const info = getStorageInfo();

      expect(info.hasData).toBe(false);
      expect(info.projectCount).toBe(0);
      expect(info.taskCount).toBe(0);
    });
  });

  describe('runMigrations', () => {
    it('should skip migration if already at current version', () => {
      setMigrationVersion(CURRENT_MIGRATION_VERSION);

      const result = runMigrations();

      expect(result.success).toBe(true);
      expect(result.migrationsRun).toBe(0);
    });

    it('should run migration from version 0 to current', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        availableProjects: [
          { name: 'demo', path: '/demo', id: 'demo1' },
          { name: 'RealProject', path: '/real', id: 'real1' },
        ],
        tasks: [],
      }));
      setMigrationVersion(0);

      const result = runMigrations();

      expect(result.success).toBe(true);
      expect(result.migrationsRun).toBeGreaterThan(0);
    });

    it('should create backup before migration', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        availableProjects: [],
      }));
      setMigrationVersion(0);

      runMigrations();

      // Check that a backup was created
      const calls = localStorageMock.setItem.mock.calls;
      const backupCall = calls.find(call => call[0].includes('backup'));
      expect(backupCall).toBeDefined();
    });

    it('should update version after successful migration', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        availableProjects: [],
      }));
      setMigrationVersion(0);

      runMigrations();

      expect(getMigrationVersion()).toBe(CURRENT_MIGRATION_VERSION);
    });
  });

  describe('manualCleanup', () => {
    it('should remove dummy projects', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        availableProjects: [
          { name: 'demo', path: '/demo' },
          { name: 'RealProject', path: '/real' },
        ],
      }));

      const result = manualCleanup();

      expect(result.success).toBe(true);
      expect(result.removedProjects).toBe(1);
      expect(result.preservedProjects).toBe(1);
    });

    it('should handle no data', () => {
      const result = manualCleanup();

      expect(result.success).toBe(true);
      expect(result.removedProjects).toBe(0);
    });

    it('should create backup before cleanup', () => {
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
        availableProjects: [],
      }));

      manualCleanup();

      const calls = localStorageMock.setItem.mock.calls;
      const backupCall = calls.find(call => call[0].includes('backup'));
      expect(backupCall).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem(STORAGE_KEY, 'invalid json');

      const result = validateNoDummyProjects();

      expect(result.isValid).toBe(true);
      expect(result.message).toContain('No data found');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const version = getMigrationVersion();
      expect(version).toBe(0);
    });

    it('should handle setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });

      const result = setMigrationVersion(2);
      expect(result).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should export CURRENT_MIGRATION_VERSION', () => {
      expect(CURRENT_MIGRATION_VERSION).toBeDefined();
      expect(typeof CURRENT_MIGRATION_VERSION).toBe('number');
      expect(CURRENT_MIGRATION_VERSION).toBeGreaterThan(0);
    });

    it('should export STORAGE_KEY', () => {
      expect(STORAGE_KEY).toBeDefined();
      expect(typeof STORAGE_KEY).toBe('string');
      expect(STORAGE_KEY).toBe('agentic-kanban-storage');
    });
  });
});
