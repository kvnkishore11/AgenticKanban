/**
 * Tests for DetailedLogEntry Component
 * Comprehensive tests for the detailed log entry display with collapsible sections
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DetailedLogEntry from '../DetailedLogEntry';

describe('DetailedLogEntry Component', () => {
  let mockLog;

  beforeEach(() => {
    mockLog = {
      entry_type: 'assistant',
      subtype: 'tool_use',
      tool_name: 'read_file',
      timestamp: '2024-01-15T10:30:45.123Z',
      message: 'Reading file content from disk',
      session_id: 'session-abc-123-def-456',
      model: 'claude-sonnet-4',
      tool_input: {
        file_path: '/path/to/file.js',
        encoding: 'utf-8'
      },
      usage: {
        input_tokens: 1500,
        output_tokens: 500,
        cache_read_input_tokens: 800,
        cache_creation_input_tokens: 200
      },
      stop_reason: 'end_turn',
      current_step: 3,
      raw_data: {
        full_request: 'complete raw data',
        additional_info: 'extra details'
      }
    };

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve())
      }
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render log entry with message', () => {
      render(<DetailedLogEntry log={mockLog} />);

      expect(screen.getByText('Reading file content from disk')).toBeInTheDocument();
    });

    it('should render entry type badge', () => {
      render(<DetailedLogEntry log={mockLog} />);

      expect(screen.getByText('ASSISTANT')).toBeInTheDocument();
    });

    it('should render subtype badge when present', () => {
      render(<DetailedLogEntry log={mockLog} />);

      expect(screen.getByText('tool_use')).toBeInTheDocument();
    });

    it('should render tool name badge when present', () => {
      render(<DetailedLogEntry log={mockLog} />);

      expect(screen.getByText('read_file')).toBeInTheDocument();
    });

    it('should render timestamp when showTimestamps is true', () => {
      render(<DetailedLogEntry log={mockLog} showTimestamps={true} />);

      // Timestamp should be formatted as HH:MM:SS.mmm
      expect(screen.getByText(/10:30:45/)).toBeInTheDocument();
    });

    it('should not render timestamp when showTimestamps is false', () => {
      render(<DetailedLogEntry log={mockLog} showTimestamps={false} />);

      expect(screen.queryByText(/10:30:45/)).not.toBeInTheDocument();
    });

    it('should render session ID when present', () => {
      render(<DetailedLogEntry log={mockLog} />);

      // Should show truncated session ID
      expect(screen.getByText(/Session: session-abc.../)).toBeInTheDocument();
    });

    it('should render model name when present', () => {
      render(<DetailedLogEntry log={mockLog} />);

      expect(screen.getByText(/Model: claude-sonnet-4/)).toBeInTheDocument();
    });

    it('should start collapsed by default', () => {
      render(<DetailedLogEntry log={mockLog} />);

      // Expanded content should not be visible
      expect(screen.queryByText('Tool Input')).not.toBeInTheDocument();
    });
  });

  describe('Entry Type Icons and Colors', () => {
    it('should render assistant entry type with correct styling', () => {
      render(<DetailedLogEntry log={mockLog} />);

      const badge = screen.getByText('ASSISTANT').closest('span');
      expect(badge).toHaveClass('bg-blue-50', 'border-blue-300', 'text-blue-700');
    });

    it('should render system entry type with correct styling', () => {
      const systemLog = { ...mockLog, entry_type: 'system' };
      render(<DetailedLogEntry log={systemLog} />);

      const badge = screen.getByText('SYSTEM').closest('span');
      expect(badge).toHaveClass('bg-purple-50', 'border-purple-300', 'text-purple-700');
    });

    it('should render user entry type with correct styling', () => {
      const userLog = { ...mockLog, entry_type: 'user' };
      render(<DetailedLogEntry log={userLog} />);

      const badge = screen.getByText('USER').closest('span');
      expect(badge).toHaveClass('bg-green-50', 'border-green-300', 'text-green-700');
    });

    it('should render result entry type with correct styling', () => {
      const resultLog = { ...mockLog, entry_type: 'result' };
      render(<DetailedLogEntry log={resultLog} />);

      const badge = screen.getByText('RESULT').closest('span');
      expect(badge).toHaveClass('bg-amber-50', 'border-amber-300', 'text-amber-700');
    });

    it('should render unknown entry type with default styling', () => {
      const unknownLog = { ...mockLog, entry_type: 'unknown' };
      render(<DetailedLogEntry log={unknownLog} />);

      const badge = screen.getByText('UNKNOWN').closest('span');
      expect(badge).toHaveClass('bg-gray-50', 'border-gray-300', 'text-gray-700');
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('should expand when clicked', () => {
      render(<DetailedLogEntry log={mockLog} />);

      const entry = screen.getByText('Reading file content from disk').closest('.detailed-log-entry');
      fireEvent.click(entry);

      expect(screen.getByText('Tool Input')).toBeInTheDocument();
    });

    it('should collapse when clicked again', () => {
      render(<DetailedLogEntry log={mockLog} />);

      const entry = screen.getByText('Reading file content from disk').closest('.detailed-log-entry');

      // Expand
      fireEvent.click(entry);
      expect(screen.getByText('Tool Input')).toBeInTheDocument();

      // Collapse
      fireEvent.click(entry);
      expect(screen.queryByText('Tool Input')).not.toBeInTheDocument();
    });

    it('should toggle chevron icon on expand/collapse', () => {
      const { container } = render(<DetailedLogEntry log={mockLog} />);

      const button = container.querySelector('button');

      // Should show ChevronRight when collapsed
      expect(button.querySelector('.lucide-chevron-right')).toBeInTheDocument();

      // Click to expand
      fireEvent.click(button);

      // Should show ChevronDown when expanded
      expect(button.querySelector('.lucide-chevron-down')).toBeInTheDocument();
    });

    it('should allow clicking expand button directly', () => {
      const { container } = render(<DetailedLogEntry log={mockLog} />);

      const expandButton = container.querySelector('button');
      fireEvent.click(expandButton);

      expect(screen.getByText('Tool Input')).toBeInTheDocument();
    });

    it('should stop propagation when clicking expand button', () => {
      const { container } = render(<DetailedLogEntry log={mockLog} />);

      const expandButton = container.querySelector('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

      expandButton.dispatchEvent(clickEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Tool Input Display', () => {
    it('should display tool input when expanded', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText('Tool Input')).toBeInTheDocument();
      expect(screen.getByText(/file_path/)).toBeInTheDocument();
      expect(screen.getByText(/\/path\/to\/file.js/)).toBeInTheDocument();
    });

    it('should format tool input as JSON', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      const toolInputPre = screen.getByText(/file_path/).closest('pre');
      expect(toolInputPre).toHaveClass('whitespace-pre-wrap', 'break-words');
    });

    it('should not display tool input section when not present', () => {
      const logWithoutToolInput = { ...mockLog };
      delete logWithoutToolInput.tool_input;

      render(<DetailedLogEntry log={logWithoutToolInput} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.queryByText('Tool Input')).not.toBeInTheDocument();
    });
  });

  describe('Usage Statistics Display', () => {
    it('should display token usage when expanded', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText('Token Usage')).toBeInTheDocument();
    });

    it('should display input tokens', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText('Input:')).toBeInTheDocument();
      expect(screen.getByText('1,500')).toBeInTheDocument();
    });

    it('should display output tokens', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText('Output:')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('should display cache read tokens with green styling', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText('Cache Read:')).toBeInTheDocument();
      const cacheReadValue = screen.getByText('800');
      expect(cacheReadValue).toHaveClass('text-green-600');
    });

    it('should display cache creation tokens with blue styling', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText('Cache Creation:')).toBeInTheDocument();
      const cacheCreationValue = screen.getByText('200');
      expect(cacheCreationValue).toHaveClass('text-blue-600');
    });

    it('should not display usage section when not present', () => {
      const logWithoutUsage = { ...mockLog };
      delete logWithoutUsage.usage;

      render(<DetailedLogEntry log={logWithoutUsage} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.queryByText('Token Usage')).not.toBeInTheDocument();
    });

    it('should handle partial usage data', () => {
      const partialUsageLog = {
        ...mockLog,
        usage: { input_tokens: 100 }
      };

      render(<DetailedLogEntry log={partialUsageLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText('Token Usage')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Additional Metadata', () => {
    it('should display stop reason when expanded', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText(/Stop Reason:/)).toBeInTheDocument();
      expect(screen.getByText('end_turn')).toBeInTheDocument();
    });

    it('should display current step when expanded', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText(/Step:/)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not display metadata when not present', () => {
      const logWithoutMetadata = { ...mockLog };
      delete logWithoutMetadata.stop_reason;
      delete logWithoutMetadata.current_step;

      render(<DetailedLogEntry log={logWithoutMetadata} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.queryByText(/Stop Reason:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Step:/)).not.toBeInTheDocument();
    });
  });

  describe('Raw Data Display', () => {
    it('should show "Show Raw JSON" button when expanded', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText('Show Raw JSON')).toBeInTheDocument();
    });

    it('should expand raw data when button is clicked', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));
      fireEvent.click(screen.getByText('Show Raw JSON'));

      expect(screen.getByText(/full_request/)).toBeInTheDocument();
      expect(screen.getByText(/complete raw data/)).toBeInTheDocument();
    });

    it('should change button text to "Hide Raw JSON" when expanded', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));
      fireEvent.click(screen.getByText('Show Raw JSON'));

      expect(screen.getByText('Hide Raw JSON')).toBeInTheDocument();
    });

    it('should collapse raw data when button is clicked again', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));
      fireEvent.click(screen.getByText('Show Raw JSON'));

      expect(screen.getByText(/full_request/)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Hide Raw JSON'));

      expect(screen.queryByText(/full_request/)).not.toBeInTheDocument();
    });

    it('should format raw data as JSON', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));
      fireEvent.click(screen.getByText('Show Raw JSON'));

      const rawDataPre = screen.getByText(/full_request/).closest('pre');
      expect(rawDataPre).toHaveClass('text-green-400', 'whitespace-pre-wrap', 'break-words');
    });

    it('should not show raw data section when raw_data is missing', () => {
      const logWithoutRawData = { ...mockLog };
      delete logWithoutRawData.raw_data;

      render(<DetailedLogEntry log={logWithoutRawData} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText('Show Raw JSON')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Show Raw JSON'));

      // Should not display raw data content
      expect(screen.queryByText(/full_request/)).not.toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    it('should copy raw data to clipboard when copy button is clicked', async () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));
      fireEvent.click(screen.getByText('Show Raw JSON'));

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          JSON.stringify(mockLog.raw_data, null, 2)
        );
      });
    });

    it('should show checkmark icon temporarily after copying', async () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));
      fireEvent.click(screen.getByText('Show Raw JSON'));

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(copyButton.querySelector('.lucide-check-circle')).toBeInTheDocument();
      });
    });

    it('should reset copy icon after 2 seconds', async () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));
      fireEvent.click(screen.getByText('Show Raw JSON'));

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      // Fast-forward time by 2 seconds
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(copyButton.querySelector('.lucide-copy')).toBeInTheDocument();
        expect(copyButton.querySelector('.lucide-check-circle')).not.toBeInTheDocument();
      });
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamp with milliseconds', () => {
      render(<DetailedLogEntry log={mockLog} showTimestamps={true} />);

      // Should show HH:MM:SS.mmm format
      expect(screen.getByText('10:30:45.123')).toBeInTheDocument();
    });

    it('should use 24-hour format', () => {
      const afternoonLog = {
        ...mockLog,
        timestamp: '2024-01-15T14:30:45.123Z'
      };

      render(<DetailedLogEntry log={afternoonLog} showTimestamps={true} />);

      expect(screen.getByText('14:30:45.123')).toBeInTheDocument();
    });

    it('should not render timestamp when missing', () => {
      const logWithoutTimestamp = { ...mockLog };
      delete logWithoutTimestamp.timestamp;

      render(<DetailedLogEntry log={logWithoutTimestamp} showTimestamps={true} />);

      expect(screen.queryByText(/:/)).not.toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render subtype badge when not present', () => {
      const logWithoutSubtype = { ...mockLog };
      delete logWithoutSubtype.subtype;

      render(<DetailedLogEntry log={logWithoutSubtype} />);

      expect(screen.queryByText('tool_use')).not.toBeInTheDocument();
    });

    it('should not render tool name badge when not present', () => {
      const logWithoutToolName = { ...mockLog };
      delete logWithoutToolName.tool_name;

      render(<DetailedLogEntry log={logWithoutToolName} />);

      expect(screen.queryByText('read_file')).not.toBeInTheDocument();
    });

    it('should not render session info when missing', () => {
      const logWithoutSession = { ...mockLog };
      delete logWithoutSession.session_id;
      delete logWithoutSession.model;

      render(<DetailedLogEntry log={logWithoutSession} />);

      expect(screen.queryByText(/Session:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Model:/)).not.toBeInTheDocument();
    });

    it('should not render entry type badge when missing', () => {
      const logWithoutEntryType = { ...mockLog };
      delete logWithoutEntryType.entry_type;

      render(<DetailedLogEntry log={logWithoutEntryType} />);

      expect(screen.queryByText(/ASSISTANT|USER|SYSTEM|RESULT/)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const logWithEmptyMessage = { ...mockLog, message: '' };

      render(<DetailedLogEntry log={logWithEmptyMessage} />);

      expect(screen.getByText('ASSISTANT')).toBeInTheDocument();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const logWithLongMessage = { ...mockLog, message: longMessage };

      render(<DetailedLogEntry log={logWithLongMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle complex nested tool input', () => {
      const complexToolInput = {
        level1: {
          level2: {
            level3: {
              data: 'nested value'
            }
          }
        }
      };

      const logWithComplexInput = {
        ...mockLog,
        tool_input: complexToolInput
      };

      render(<DetailedLogEntry log={logWithComplexInput} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      expect(screen.getByText(/level1/)).toBeInTheDocument();
      expect(screen.getByText(/nested value/)).toBeInTheDocument();
    });

    it('should handle missing all optional fields', () => {
      const minimalLog = {
        message: 'Minimal log entry'
      };

      render(<DetailedLogEntry log={minimalLog} />);

      expect(screen.getByText('Minimal log entry')).toBeInTheDocument();
    });

    it('should truncate session ID correctly', () => {
      render(<DetailedLogEntry log={mockLog} />);

      // Session ID should be truncated to first 8 characters
      expect(screen.getByText(/Session: session-abc.../)).toBeInTheDocument();
      expect(screen.queryByText('session-abc-123-def-456')).not.toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply hover styling to entry', () => {
      const { container } = render(<DetailedLogEntry log={mockLog} />);

      const entry = container.querySelector('.detailed-log-entry');
      expect(entry).toHaveClass('hover:border-blue-400');
    });

    it('should apply cursor pointer to clickable area', () => {
      const { container } = render(<DetailedLogEntry log={mockLog} />);

      const clickableArea = container.querySelector('.cursor-pointer');
      expect(clickableArea).toBeInTheDocument();
    });

    it('should use monospace font for code blocks', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      const toolInputPre = screen.getByText(/file_path/).closest('pre');
      expect(toolInputPre).toHaveClass('font-mono');
    });

    it('should limit max height of scrollable areas', () => {
      render(<DetailedLogEntry log={mockLog} />);

      fireEvent.click(screen.getByText('Reading file content from disk'));

      const toolInputContainer = screen.getByText(/file_path/).closest('div');
      expect(toolInputContainer).toHaveClass('max-h-32');
    });
  });
});
