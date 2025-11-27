import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import adwDiscoveryService from '../adwDiscoveryService.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('ADWDiscoveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with backend URL from environment', () => {
      const baseUrl = adwDiscoveryService.getApiBaseUrl();

      expect(baseUrl).toBeDefined();
      expect(typeof baseUrl).toBe('string');
    });

    it('should allow configuration updates', () => {
      const originalUrl = adwDiscoveryService.getApiBaseUrl();

      adwDiscoveryService.configure({ baseUrl: 'http://test-server:9000' });

      expect(adwDiscoveryService.getApiBaseUrl()).toBe('http://test-server:9000');

      // Restore original
      adwDiscoveryService.configure({ baseUrl: originalUrl });
    });

    it('should merge configuration options', () => {
      const originalUrl = adwDiscoveryService.getApiBaseUrl();

      adwDiscoveryService.configure({ customOption: 'test' });

      expect(adwDiscoveryService.getApiBaseUrl()).toBe(originalUrl);
      expect(adwDiscoveryService.config.customOption).toBe('test');

      // Restore original
      adwDiscoveryService.configure({ baseUrl: originalUrl });
      delete adwDiscoveryService.config.customOption;
    });
  });

  describe('List ADWs', () => {
    it('should fetch list of ADWs successfully', async () => {
      const mockAdws = [
        {
          adw_id: 'abc12345',
          issue_number: 123,
          issue_title: 'Test Feature',
          issue_class: 'feature',
          branch_name: 'feature/test-123',
        },
        {
          adw_id: 'def67890',
          issue_number: 124,
          issue_title: 'Bug Fix',
          issue_class: 'bug',
          branch_name: 'fix/bug-124',
        },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ adws: mockAdws }),
      });

      const result = await adwDiscoveryService.listAdws();

      expect(result).toEqual(mockAdws);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/adws/list'));
    });

    it('should return empty array when no ADWs found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ adws: [] }),
      });

      const result = await adwDiscoveryService.listAdws();

      expect(result).toEqual([]);
    });

    it('should return empty array when adws property is missing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await adwDiscoveryService.listAdws();

      expect(result).toEqual([]);
    });

    it('should handle HTTP error responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(adwDiscoveryService.listAdws())
        .rejects.toThrow('Failed to fetch ADW list: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adwDiscoveryService.listAdws())
        .rejects.toThrow('Network error');
    });
  });

  describe('Get ADW Details', () => {
    it('should fetch ADW details successfully', async () => {
      const mockAdw = {
        adw_id: 'abc12345',
        issue_number: 123,
        issue_title: 'Test Feature',
        issue_class: 'feature',
        branch_name: 'feature/test-123',
        created_at: '2025-01-01T00:00:00Z',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAdw,
      });

      const result = await adwDiscoveryService.getAdwDetails('abc12345');

      expect(result).toEqual(mockAdw);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/adws/abc12345'));
    });

    it('should handle 404 not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(adwDiscoveryService.getAdwDetails('nonexistent'))
        .rejects.toThrow('ADW ID \'nonexistent\' not found');
    });

    it('should handle other HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(adwDiscoveryService.getAdwDetails('abc12345'))
        .rejects.toThrow('Failed to fetch ADW details: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adwDiscoveryService.getAdwDetails('abc12345'))
        .rejects.toThrow('Network error');
    });
  });

  describe('Fetch Plan File', () => {
    it('should fetch plan file successfully', async () => {
      const mockPlanData = {
        plan_content: '# Test Plan\n\nThis is a test plan.',
        plan_file: '/path/to/plan.md',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlanData,
      });

      const result = await adwDiscoveryService.fetchPlanFile('abc12345');

      expect(result).toEqual(mockPlanData);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/adws/abc12345/plan'));
    });

    it('should handle 404 not found with detail message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Plan file does not exist' }),
      });

      await expect(adwDiscoveryService.fetchPlanFile('abc12345'))
        .rejects.toThrow('Plan file not found for ADW ID \'abc12345\': Plan file does not exist');
    });

    it('should handle 404 not found without detail message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      });

      await expect(adwDiscoveryService.fetchPlanFile('abc12345'))
        .rejects.toThrow('Plan file not found for ADW ID \'abc12345\': 404 Not Found');
    });

    it('should handle other HTTP errors with detail message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal error reading plan' }),
      });

      await expect(adwDiscoveryService.fetchPlanFile('abc12345'))
        .rejects.toThrow('Failed to fetch plan file: Internal error reading plan');
    });

    it('should handle other HTTP errors without detail message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(adwDiscoveryService.fetchPlanFile('abc12345'))
        .rejects.toThrow('Failed to fetch plan file: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adwDiscoveryService.fetchPlanFile('abc12345'))
        .rejects.toThrow('Network error');
    });
  });

  describe('Filter ADWs', () => {
    const mockAdws = [
      {
        adw_id: 'abc12345',
        issue_number: 123,
        issue_title: 'Add authentication feature',
        issue_class: 'feature',
        branch_name: 'feature/auth-123',
      },
      {
        adw_id: 'def67890',
        issue_number: 124,
        issue_title: 'Fix login bug',
        issue_class: 'bug',
        branch_name: 'fix/login-124',
      },
      {
        adw_id: 'ghi11111',
        issue_number: 125,
        issue_title: 'Update dependencies',
        issue_class: 'chore',
        branch_name: 'chore/deps-125',
      },
    ];

    it('should filter by ADW ID', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, 'abc');

      expect(result).toHaveLength(1);
      expect(result[0].adw_id).toBe('abc12345');
    });

    it('should filter by issue number', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, '124');

      expect(result).toHaveLength(1);
      expect(result[0].issue_number).toBe(124);
    });

    it('should filter by issue title', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, 'authentication');

      expect(result).toHaveLength(1);
      expect(result[0].issue_title).toBe('Add authentication feature');
    });

    it('should filter by issue class', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, 'bug');

      expect(result).toHaveLength(1);
      expect(result[0].issue_class).toBe('bug');
    });

    it('should filter by branch name', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, 'feature/auth');

      expect(result).toHaveLength(1);
      expect(result[0].branch_name).toBe('feature/auth-123');
    });

    it('should be case insensitive', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, 'AUTHENTICATION');

      expect(result).toHaveLength(1);
      expect(result[0].issue_title).toBe('Add authentication feature');
    });

    it('should return all ADWs for empty query', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, '');

      expect(result).toHaveLength(3);
    });

    it('should return all ADWs for whitespace query', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, '   ');

      expect(result).toHaveLength(3);
    });

    it('should return empty array for no matches', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, 'nonexistent');

      expect(result).toHaveLength(0);
    });

    it('should handle multiple matches', () => {
      const result = adwDiscoveryService.filterAdws(mockAdws, '12');

      expect(result.length).toBeGreaterThan(1);
    });
  });

  describe('Sort ADWs', () => {
    const mockAdws = [
      {
        adw_id: 'def67890',
        issue_number: 124,
        issue_class: 'bug',
      },
      {
        adw_id: 'abc12345',
        issue_number: 123,
        issue_class: 'feature',
      },
      {
        adw_id: 'ghi11111',
        issue_number: 125,
        issue_class: 'chore',
      },
    ];

    it('should sort by adw_id in ascending order', () => {
      const result = adwDiscoveryService.sortAdws(mockAdws, 'adw_id', 'asc');

      expect(result[0].adw_id).toBe('abc12345');
      expect(result[1].adw_id).toBe('def67890');
      expect(result[2].adw_id).toBe('ghi11111');
    });

    it('should sort by adw_id in descending order (default)', () => {
      const result = adwDiscoveryService.sortAdws(mockAdws, 'adw_id', 'desc');

      expect(result[0].adw_id).toBe('ghi11111');
      expect(result[1].adw_id).toBe('def67890');
      expect(result[2].adw_id).toBe('abc12345');
    });

    it('should sort by issue_number in ascending order', () => {
      const result = adwDiscoveryService.sortAdws(mockAdws, 'issue_number', 'asc');

      expect(result[0].issue_number).toBe(123);
      expect(result[1].issue_number).toBe(124);
      expect(result[2].issue_number).toBe(125);
    });

    it('should sort by issue_number in descending order', () => {
      const result = adwDiscoveryService.sortAdws(mockAdws, 'issue_number', 'desc');

      expect(result[0].issue_number).toBe(125);
      expect(result[1].issue_number).toBe(124);
      expect(result[2].issue_number).toBe(123);
    });

    it('should sort by issue_class in ascending order', () => {
      const result = adwDiscoveryService.sortAdws(mockAdws, 'issue_class', 'asc');

      expect(result[0].issue_class).toBe('bug');
      expect(result[1].issue_class).toBe('chore');
      expect(result[2].issue_class).toBe('feature');
    });

    it('should handle null/undefined values', () => {
      const adwsWithNulls = [
        { adw_id: 'abc', issue_number: null },
        { adw_id: 'def', issue_number: 123 },
        { adw_id: 'ghi', issue_number: undefined },
      ];

      const result = adwDiscoveryService.sortAdws(adwsWithNulls, 'issue_number', 'asc');

      expect(result[0].issue_number).toBe(123);
      expect(result[1].issue_number).toBeNull();
      expect(result[2].issue_number).toBeUndefined();
    });

    it('should not mutate original array', () => {
      const original = [...mockAdws];
      adwDiscoveryService.sortAdws(mockAdws, 'adw_id', 'asc');

      expect(mockAdws).toEqual(original);
    });

    it('should use default sort parameters', () => {
      const result = adwDiscoveryService.sortAdws(mockAdws);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Group By Issue Class', () => {
    const mockAdws = [
      { adw_id: 'abc', issue_class: 'feature' },
      { adw_id: 'def', issue_class: 'bug' },
      { adw_id: 'ghi', issue_class: 'feature' },
      { adw_id: 'jkl', issue_class: 'chore' },
      { adw_id: 'mno', issue_class: null },
      { adw_id: 'pqr', issue_class: 'unknown' },
    ];

    it('should group ADWs by issue class', () => {
      const result = adwDiscoveryService.groupByIssueClass(mockAdws);

      expect(result.feature).toHaveLength(2);
      expect(result.bug).toHaveLength(1);
      expect(result.chore).toHaveLength(1);
      expect(result.other).toHaveLength(2);
    });

    it('should handle ADWs with null issue_class', () => {
      const result = adwDiscoveryService.groupByIssueClass(mockAdws);

      expect(result.other).toContain(mockAdws[4]);
    });

    it('should handle ADWs with unknown issue_class', () => {
      const result = adwDiscoveryService.groupByIssueClass(mockAdws);

      expect(result.other).toContain(mockAdws[5]);
    });

    it('should return empty groups for empty input', () => {
      const result = adwDiscoveryService.groupByIssueClass([]);

      expect(result.feature).toHaveLength(0);
      expect(result.bug).toHaveLength(0);
      expect(result.chore).toHaveLength(0);
      expect(result.other).toHaveLength(0);
    });

    it('should maintain all group keys', () => {
      const result = adwDiscoveryService.groupByIssueClass(mockAdws);

      expect(result).toHaveProperty('feature');
      expect(result).toHaveProperty('bug');
      expect(result).toHaveProperty('chore');
      expect(result).toHaveProperty('other');
    });
  });
});
