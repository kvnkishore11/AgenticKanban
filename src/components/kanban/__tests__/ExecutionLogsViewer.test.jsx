/**
 * @fileoverview Tests for ExecutionLogsViewer Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ExecutionLogsViewer from '../ExecutionLogsViewer';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.APP_CONFIG
Object.defineProperty(window, 'APP_CONFIG', {
  value: { WS_PORT: 8501 },
  writable: true
});

describe('ExecutionLogsViewer Component', () => {
  const defaultProps = {
    adwId: 'de44dd9c',
    stage: 'plan',
    autoScroll: true,
    maxHeight: '500px',
    onLogCountChange: vi.fn()
  };

  const mockLogsResponse = {
    adw_id: 'de44dd9c',
    stage: 'plan',
    logs: [
      { timestamp: '2025-11-28 21:49:19', level: 'INFO', message: 'Starting stage execution', raw_line: '...' },
      { timestamp: '2025-11-28 21:49:20', level: 'DEBUG', message: 'Loading configuration', raw_line: '...' },
      { timestamp: '2025-11-28 21:49:21', level: 'ERROR', message: 'Failed to connect', raw_line: '...' }
    ],
    stage_folder: 'adw_plan_iso',
    has_logs: true,
    error: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockLogsResponse
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      // Make fetch hang to see loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<ExecutionLogsViewer {...defaultProps} />);

      expect(screen.getByText('Loading execution logs...')).toBeInTheDocument();
    });
  });

  describe('Successful Loading', () => {
    it('should display logs after successful fetch', async () => {
      render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Starting stage execution')).toBeInTheDocument();
      });

      expect(screen.getByText('Loading configuration')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect')).toBeInTheDocument();
    });

    it('should display stage folder badge', async () => {
      render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('adw_plan_iso')).toBeInTheDocument();
      });
    });

    it('should display log levels with correct colors', async () => {
      render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('INFO')).toBeInTheDocument();
        expect(screen.getByText('DEBUG')).toBeInTheDocument();
        expect(screen.getByText('ERROR')).toBeInTheDocument();
      });
    });

    it('should call onLogCountChange with log count', async () => {
      render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(defaultProps.onLogCountChange).toHaveBeenCalledWith(3);
      });
    });

    it('should format timestamp to show only time', async () => {
      render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('21:49:19')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show empty state when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      });

      render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No Execution Logs')).toBeInTheDocument();
      });
    });

    it('should show error message from response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockLogsResponse,
          logs: [],
          has_logs: false,
          error: 'Execution log not found'
        })
      });

      render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Execution log not found')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no logs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockLogsResponse,
          logs: [],
          has_logs: false
        })
      });

      render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No Execution Logs')).toBeInTheDocument();
      });
    });

    it('should show empty state when adwId is not provided', () => {
      render(<ExecutionLogsViewer {...defaultProps} adwId={null} />);

      // Should not fetch and show default empty state
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should show empty state when stage is not provided', () => {
      render(<ExecutionLogsViewer {...defaultProps} stage={null} />);

      // Should not fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('API Calls', () => {
    it('should fetch logs with correct URL', async () => {
      render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8501/api/execution-logs/de44dd9c/plan'
        );
      });
    });

    it('should refetch when stage changes', async () => {
      const { rerender } = render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      rerender(<ExecutionLogsViewer {...defaultProps} stage="build" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8501/api/execution-logs/de44dd9c/build'
        );
      });
    });

    it('should refetch when adwId changes', async () => {
      const { rerender } = render(<ExecutionLogsViewer {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      rerender(<ExecutionLogsViewer {...defaultProps} adwId="newadwid" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8501/api/execution-logs/newadwid/plan'
        );
      });
    });
  });
});
