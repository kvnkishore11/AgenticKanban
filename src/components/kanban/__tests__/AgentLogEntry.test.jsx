import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentLogEntry from '../AgentLogEntry';

describe('AgentLogEntry', () => {
  describe('Intelligent Default Expansion Behavior', () => {
    it('should expand thinking blocks by default', () => {
      const thinkingLog = {
        event_type: 'thinking_block',
        content: 'I need to analyze the code structure',
        reasoning_type: 'analysis',
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={thinkingLog} />);

      // Should show expanded content by default
      expect(screen.getByText('I need to analyze the code structure')).toBeInTheDocument();
    });

    it('should expand tool results with errors by default', () => {
      const errorLog = {
        event_type: 'tool_use_post',
        tool_name: 'Read',
        error: 'File not found',
        status: 'error',
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={errorLog} />);

      // Should show error by default
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('File not found')).toBeInTheDocument();
    });

    it('should expand file changes by default', () => {
      const fileChangeLog = {
        event_type: 'file_changed',
        file_path: 'src/components/Test.jsx',
        operation: 'modified',
        lines_added: 5,
        lines_removed: 2,
        diff: '+++ added line\n--- removed line',
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={fileChangeLog} />);

      // Should show diff by default
      expect(screen.getByText('Diff:')).toBeInTheDocument();
    });

    it('should collapse routine tool calls by default', () => {
      const toolCallLog = {
        event_type: 'tool_use_pre',
        tool_name: 'Read',
        tool_input: { file_path: 'test.js' },
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={toolCallLog} />);

      // Should not show input parameters by default
      expect(screen.queryByText('Input parameters:')).not.toBeInTheDocument();
    });

    it('should collapse text blocks by default', () => {
      const textLog = {
        event_type: 'text_block',
        content: 'This is a long verbose text block that should be collapsed initially',
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={textLog} />);

      // Should not show full content by default (text blocks are collapsed)
      expect(screen.queryByText('This is a long verbose text block that should be collapsed initially')).not.toBeInTheDocument();
    });

    it('should respect explicit defaultExpanded prop', () => {
      const toolCallLog = {
        event_type: 'tool_use_pre',
        tool_name: 'Read',
        tool_input: { file_path: 'test.js' },
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={toolCallLog} defaultExpanded={true} />);

      // Should show input parameters when explicitly expanded
      expect(screen.getByText('Input parameters:')).toBeInTheDocument();
    });
  });

  describe('Expandable Content', () => {
    it('should toggle expansion when clicked', () => {
      const toolCallLog = {
        event_type: 'tool_use_pre',
        tool_name: 'Read',
        tool_input: { file_path: 'test.js' },
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={toolCallLog} />);

      // Initially collapsed
      expect(screen.queryByText('Input parameters:')).not.toBeInTheDocument();

      // Click the expand button or entry
      const expandButton = screen.getByRole('button');
      fireEvent.click(expandButton);

      // Now expanded
      expect(screen.getByText('Input parameters:')).toBeInTheDocument();
    });
  });

  describe('Event Type Detection', () => {
    it('should detect thinking_block from log structure', () => {
      const log = {
        content: 'Analyzing the problem',
        reasoning_type: 'analysis',
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={log} />);

      // Should render as thinking block
      expect(screen.getByText('Thinking')).toBeInTheDocument();
    });

    it('should detect tool_use_pre from log structure', () => {
      const log = {
        tool_name: 'Read',
        tool_input: { file_path: 'test.js' },
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={log} />);

      // Should render as tool use pre
      expect(screen.getByText('Calling tool:')).toBeInTheDocument();
      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    it('should detect tool_use_post from log structure', () => {
      const log = {
        tool_name: 'Read',
        output: 'File contents here',
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={log} />);

      // Should render as tool use post
      expect(screen.getByText('Tool completed:')).toBeInTheDocument();
    });

    it('should detect file_changed from log structure', () => {
      const log = {
        file_path: 'src/test.js',
        operation: 'modified',
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={log} />);

      // Should render as file changed
      expect(screen.getByText('modified:')).toBeInTheDocument();
    });
  });

  describe('Duration Display', () => {
    it('should display duration for thinking blocks', () => {
      const log = {
        event_type: 'thinking_block',
        content: 'Thinking...',
        duration_ms: 1500,
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={log} />);

      expect(screen.getByText('1.50s')).toBeInTheDocument();
    });

    it('should display duration for tool executions', () => {
      const log = {
        event_type: 'tool_use_post',
        tool_name: 'Read',
        output: 'Success',
        duration_ms: 250,
        timestamp: '2025-12-02T10:00:00Z'
      };

      render(<AgentLogEntry log={log} />);

      expect(screen.getByText('250ms')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use error color for error logs', () => {
      const log = {
        event_type: 'tool_use_post',
        tool_name: 'Read',
        error: 'File not found',
        status: 'error',
        timestamp: '2025-12-02T10:00:00Z'
      };

      const { container } = render(<AgentLogEntry log={log} />);

      // Check for error color class
      const entry = container.querySelector('[class*="text-red"]');
      expect(entry).toBeInTheDocument();
    });

    it('should use success color for successful tool completions', () => {
      const log = {
        event_type: 'tool_use_post',
        tool_name: 'Read',
        output: 'Success',
        timestamp: '2025-12-02T10:00:00Z'
      };

      const { container } = render(<AgentLogEntry log={log} />);

      // Check for success color class
      const entry = container.querySelector('[class*="text-green"]');
      expect(entry).toBeInTheDocument();
    });
  });
});
