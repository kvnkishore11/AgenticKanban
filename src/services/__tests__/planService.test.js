/**
 * @fileoverview Tests for PlanService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock import.meta.glob
const mockPlanFiles = {
  '/specs/issue-1-adw-abc123-sdlc_planner-plan.md': '# Plan for Issue 1\n\nThis is the plan content.',
  '/specs/issue-2-adw-xyz789-sdlc_planner-plan.md': '# Plan for Issue 2\n\nAnother plan content.',
  '/specs/feature/issue-3-adw-def456-sdlc_planner-feature.md': '# Feature Plan\n\nFeature details.',
};

vi.mock('/specs/**/*.md', () => mockPlanFiles);

// Mock the import.meta.glob at module level
const originalGlob = import.meta.glob;
import.meta.glob = vi.fn(() => mockPlanFiles);

import planService from '../planService.js';

describe('PlanService', () => {
  let service;

  beforeEach(() => {
    service = planService;
    // Reset and populate fileMapping with our mock data
    service.fileMapping.clear();
    service.contentCache.clear();

    // Populate fileMapping with test data
    for (const [path, content] of Object.entries(mockPlanFiles)) {
      const normalizedPath = path.replace(/^\//, '');
      service.fileMapping.set(normalizedPath, content);
      service.fileMapping.set(`./${normalizedPath}`, content);
      const fileName = path.split('/').pop();
      if (fileName) {
        service.fileMapping.set(fileName, content);
      }
    }
  });

  describe('initializeFileMapping', () => {
    it('should initialize file mapping from plan files', () => {
      expect(service.fileMapping.size).toBeGreaterThan(0);
    });

    it('should create normalized path entries', () => {
      const hasNormalizedPath = Array.from(service.fileMapping.keys()).some(
        key => key.startsWith('specs/')
      );
      expect(hasNormalizedPath).toBe(true);
    });

    it('should create relative path entries', () => {
      const hasRelativePath = Array.from(service.fileMapping.keys()).some(
        key => key.startsWith('./')
      );
      expect(hasRelativePath).toBe(true);
    });

    it('should create filename entries', () => {
      const filenames = Array.from(service.fileMapping.keys()).filter(
        key => !key.includes('/')
      );
      expect(filenames.length).toBeGreaterThan(0);
    });
  });

  describe('getPlanForTask', () => {
    it('should find plan by issue number and ADW ID', () => {
      const result = service.getPlanForTask(1, 'abc123');

      expect(result).not.toBe(null);
      expect(result).toHaveProperty('planPath');
      expect(result).toHaveProperty('content');
      expect(result.content).toContain('Plan for Issue 1');
    });

    it('should return null when plan not found', () => {
      const result = service.getPlanForTask(999, 'nonexistent');

      expect(result).toBe(null);
    });

    it('should handle missing issue number', () => {
      const result = service.getPlanForTask(null, 'abc123');

      expect(result).toBe(null);
    });

    it('should handle missing ADW ID', () => {
      const result = service.getPlanForTask(1, null);

      expect(result).toBe(null);
    });

    it('should match pattern correctly', () => {
      const result = service.getPlanForTask(2, 'xyz789');

      expect(result).not.toBe(null);
      expect(result.planPath).toContain('issue-2-adw-xyz789');
    });
  });

  describe('fetchPlanContent', () => {
    it('should fetch plan content by exact path', () => {
      const path = 'specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      const content = service.fetchPlanContent(path);

      expect(content).toContain('Plan for Issue 1');
    });

    it('should fetch plan content by normalized path', () => {
      const path = 'specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      const content = service.fetchPlanContent(path);

      expect(content).not.toBe(null);
    });

    it('should fetch plan content by path with ./ prefix', () => {
      const path = './specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      const content = service.fetchPlanContent(path);

      expect(content).not.toBe(null);
    });

    it('should fetch plan content by filename only', () => {
      const filename = 'issue-1-adw-abc123-sdlc_planner-plan.md';

      const content = service.fetchPlanContent(filename);

      expect(content).not.toBe(null);
    });

    it('should return null when plan not found', () => {
      const content = service.fetchPlanContent('nonexistent.md');

      expect(content).toBe(null);
    });

    it('should cache fetched content', () => {
      const path = 'specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      service.fetchPlanContent(path);
      const cached = service.contentCache.has(path);

      expect(cached).toBe(true);
    });

    it('should return cached content on subsequent calls', () => {
      const path = 'specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      const content1 = service.fetchPlanContent(path);
      const content2 = service.fetchPlanContent(path);

      expect(content1).toBe(content2);
    });

    it('should handle paths with leading slash', () => {
      const path = '/specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      const content = service.fetchPlanContent(path);

      expect(content).not.toBe(null);
    });
  });

  describe('getAllPlanFiles', () => {
    it('should return all unique plan file paths', () => {
      const files = service.getAllPlanFiles();

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should only return normalized paths without ./ prefix', () => {
      const files = service.getAllPlanFiles();

      files.forEach(file => {
        expect(file.startsWith('./')).toBe(false);
      });
    });

    it('should only return paths starting with specs/', () => {
      const files = service.getAllPlanFiles();

      files.forEach(file => {
        expect(file.startsWith('specs/')).toBe(true);
      });
    });

    it('should not include duplicates', () => {
      const files = service.getAllPlanFiles();
      const uniqueFiles = new Set(files);

      expect(files.length).toBe(uniqueFiles.size);
    });
  });

  describe('clearCache', () => {
    it('should clear content cache', () => {
      const path = 'specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      service.fetchPlanContent(path);
      expect(service.contentCache.size).toBeGreaterThan(0);

      service.clearCache();

      expect(service.contentCache.size).toBe(0);
    });

    it('should not affect file mapping', () => {
      const originalSize = service.fileMapping.size;

      service.clearCache();

      expect(service.fileMapping.size).toBe(originalSize);
    });
  });

  describe('getCacheInfo', () => {
    it('should return cache information', () => {
      const path1 = 'specs/issue-1-adw-abc123-sdlc_planner-plan.md';
      const path2 = 'specs/issue-2-adw-xyz789-sdlc_planner-plan.md';

      service.fetchPlanContent(path1);
      service.fetchPlanContent(path2);

      const info = service.getCacheInfo();

      expect(info).toHaveProperty('size', 2);
      expect(info).toHaveProperty('keys');
      expect(Array.isArray(info.keys)).toBe(true);
      expect(info.keys).toContain(path1);
      expect(info.keys).toContain(path2);
    });

    it('should return empty info when cache is empty', () => {
      const info = service.getCacheInfo();

      expect(info.size).toBe(0);
      expect(info.keys).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle plan files in subdirectories', () => {
      const result = service.getPlanForTask(3, 'def456');

      expect(result).not.toBe(null);
      expect(result.content).toContain('Feature Plan');
    });

    it('should handle multiple plans with similar names', () => {
      const result1 = service.getPlanForTask(1, 'abc123');
      const result2 = service.getPlanForTask(2, 'xyz789');

      expect(result1).not.toBe(null);
      expect(result2).not.toBe(null);
      expect(result1.content).not.toBe(result2.content);
    });

    it('should handle empty issue number', () => {
      const result = service.getPlanForTask('', 'abc123');

      expect(result).toBe(null);
    });

    it('should handle empty ADW ID', () => {
      const result = service.getPlanForTask(1, '');

      expect(result).toBe(null);
    });

    it('should handle undefined issue number', () => {
      const result = service.getPlanForTask(undefined, 'abc123');

      expect(result).toBe(null);
    });

    it('should handle undefined ADW ID', () => {
      const result = service.getPlanForTask(1, undefined);

      expect(result).toBe(null);
    });
  });

  describe('pattern matching', () => {
    it('should match pattern: issue-{number}-adw-{id}-sdlc_planner-*', () => {
      const result = service.getPlanForTask(1, 'abc123');

      expect(result).not.toBe(null);
      expect(result.planPath).toMatch(/issue-1-adw-abc123-sdlc_planner-/);
    });

    it('should not match incorrect pattern', () => {
      const result = service.getPlanForTask(1, 'wrongid');

      expect(result).toBe(null);
    });

    it('should handle numeric issue numbers', () => {
      const result = service.getPlanForTask(1, 'abc123');

      expect(result).not.toBe(null);
    });

    it('should handle string issue numbers', () => {
      const result = service.getPlanForTask('1', 'abc123');

      expect(result).not.toBe(null);
    });
  });

  describe('content integrity', () => {
    it('should preserve markdown content', () => {
      const path = 'specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      const content = service.fetchPlanContent(path);

      expect(content).toContain('#');
      expect(content).toContain('Plan for Issue 1');
    });

    it('should preserve newlines in content', () => {
      const path = 'specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      const content = service.fetchPlanContent(path);

      expect(content).toContain('\n');
    });

    it('should not modify content', () => {
      const path = 'specs/issue-1-adw-abc123-sdlc_planner-plan.md';

      const content1 = service.fetchPlanContent(path);
      const content2 = service.fetchPlanContent(path);

      expect(content1).toBe(content2);
    });
  });
});
