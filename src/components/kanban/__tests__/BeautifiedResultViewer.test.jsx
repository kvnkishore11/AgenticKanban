/**
 * @fileoverview Tests for BeautifiedResultViewer Component
 *
 * Tests the conversation-style result viewer that filters system noise
 * and displays meaningful messages with markdown rendering.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BeautifiedResultViewer from '../BeautifiedResultViewer';

describe('BeautifiedResultViewer Component', () => {
  // Mock result with single assistant message (direct API response format)
  const mockSimpleResult = {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Task completed successfully. All files have been updated.'
      }
    ]
  };

  // Mock result with tool uses
  const mockComplexResult = {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Implementation completed'
      },
      {
        type: 'tool_use',
        id: 'tool_123',
        name: 'Write',
        input: {
          file_path: '/src/test.js',
          content: 'console.log("test");'
        }
      }
    ],
    files_changed: ['/src/file1.js', '/src/file2.js']
  };

  // Mock array result (Claude session format with multiple entries)
  const mockSessionResult = [
    {
      type: 'system',
      subtype: 'hook_response',
      session_id: '123-456',
      uuid: 'abc-def',
      hook_name: 'SessionStart:startup',
      hook_event: 'SessionStart',
      stderr: 'Failed to send event',
      exit_code: 0
    },
    {
      type: 'system',
      subtype: 'init',
      cwd: '/some/path',
      tools: ['Task', 'Bash', 'Glob']
    },
    {
      type: 'assistant',
      message: {
        content: [
          {
            type: 'text',
            text: 'I have analyzed the codebase and found the following:'
          },
          {
            type: 'tool_use',
            name: 'Read',
            id: 'tool_001',
            input: { file_path: '/src/index.js' }
          }
        ]
      }
    }
  ];

  // Mock result with thinking
  const mockThinkingResult = {
    role: 'assistant',
    content: [
      {
        type: 'thinking',
        thinking: 'Analyzing the requirements...'
      },
      {
        type: 'text',
        text: 'Plan created with 5 tasks'
      }
    ]
  };

  describe('Loading State', () => {
    it('should show loading state when loading is true', () => {
      render(<BeautifiedResultViewer loading={true} />);
      expect(screen.getByText('Loading result...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when error is provided', () => {
      render(<BeautifiedResultViewer error="Failed to load result" />);
      expect(screen.getByText('Error loading result')).toBeInTheDocument();
      expect(screen.getByText('Failed to load result')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when result is null', () => {
      render(<BeautifiedResultViewer result={null} />);
      expect(screen.getByText('No Result Available')).toBeInTheDocument();
    });

    it('should show empty state when result is undefined', () => {
      render(<BeautifiedResultViewer />);
      expect(screen.getByText('No Result Available')).toBeInTheDocument();
    });
  });

  describe('Execution Summary', () => {
    it('should display success banner for valid result', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);
      expect(screen.getByText('Stage completed successfully')).toBeInTheDocument();
    });

    it('should show response count in summary', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);
      expect(screen.getByText(/1 response/)).toBeInTheDocument();
    });

    it('should show tools used count when tools present', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);
      expect(screen.getByText(/1 tool used/)).toBeInTheDocument();
    });

    it('should show files changed count when files present', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);
      expect(screen.getByText(/2 files changed/)).toBeInTheDocument();
    });

    it('should display tool badges', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);
      // Tool may appear in both summary and message, so use getAllByText
      expect(screen.getAllByText('Write').length).toBeGreaterThanOrEqual(1);
    });

    it('should display file names as badges', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);
      expect(screen.getByText('file1.js')).toBeInTheDocument();
      expect(screen.getByText('file2.js')).toBeInTheDocument();
    });
  });

  describe('Conversation View', () => {
    it('should display text content in conversation format', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);
      expect(screen.getByText('Task completed successfully. All files have been updated.')).toBeInTheDocument();
    });

    it('should display agent label for assistant messages', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);
      expect(screen.getByText('Agent')).toBeInTheDocument();
    });

    it('should show conversation section header with message count', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);
      expect(screen.getByText(/Conversation \(1 message\)/)).toBeInTheDocument();
    });
  });

  describe('System Noise Filtering', () => {
    it('should filter out hook_response entries', () => {
      render(<BeautifiedResultViewer result={mockSessionResult} />);
      expect(screen.queryByText('SessionStart:startup')).not.toBeInTheDocument();
      expect(screen.queryByText('hook_response')).not.toBeInTheDocument();
    });

    it('should filter out session_id', () => {
      render(<BeautifiedResultViewer result={mockSessionResult} />);
      expect(screen.queryByText('123-456')).not.toBeInTheDocument();
    });

    it('should filter out uuid', () => {
      render(<BeautifiedResultViewer result={mockSessionResult} />);
      expect(screen.queryByText('abc-def')).not.toBeInTheDocument();
    });

    it('should filter out init messages with tools list', () => {
      render(<BeautifiedResultViewer result={mockSessionResult} />);
      // Tools list from init should not be shown raw
      expect(screen.queryByText('["Task","Bash","Glob"]')).not.toBeInTheDocument();
    });

    it('should still show assistant messages from session array', () => {
      render(<BeautifiedResultViewer result={mockSessionResult} />);
      expect(screen.getByText('I have analyzed the codebase and found the following:')).toBeInTheDocument();
    });
  });

  describe('Raw JSON Section', () => {
    it('should have a collapsible raw JSON section', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);
      expect(screen.getByText('Raw JSON')).toBeInTheDocument();
    });

    it('should be collapsed by default', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);
      // JSON content should not be visible initially
      expect(screen.queryByText(/"role":/)).not.toBeInTheDocument();
    });

    it('should expand raw JSON when clicked', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      const rawJsonButton = screen.getByText('Raw JSON').closest('button');
      fireEvent.click(rawJsonButton);

      // Should display formatted JSON
      expect(screen.getByText(/"role": "assistant"/)).toBeInTheDocument();
    });

    it('should show full result including system messages in raw view', () => {
      render(<BeautifiedResultViewer result={mockSessionResult} />);

      const rawJsonButton = screen.getByText('Raw JSON').closest('button');
      fireEvent.click(rawJsonButton);

      // Raw view should contain the session_id that was filtered from main view
      expect(screen.getByText(/"session_id": "123-456"/)).toBeInTheDocument();
    });
  });

  describe('Content Parsing', () => {
    it('should extract text from content array', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);
      expect(screen.getByText('Task completed successfully. All files have been updated.')).toBeInTheDocument();
    });

    it('should extract and display tool names', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);
      // Tool may appear in both summary and message, so use getAllByText
      expect(screen.getAllByText('Write').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple text blocks in content', () => {
      const multiTextResult = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'First block' },
          { type: 'text', text: 'Second block' }
        ]
      };

      render(<BeautifiedResultViewer result={multiTextResult} />);
      // Multiple text blocks are joined and rendered, may appear multiple times (e.g., in raw JSON)
      const firstBlocks = screen.getAllByText('First block');
      const secondBlocks = screen.getAllByText('Second block');
      expect(firstBlocks.length).toBeGreaterThanOrEqual(1);
      expect(secondBlocks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('No Meaningful Content', () => {
    it('should show fallback message when no conversation content found', () => {
      const emptyContentResult = {
        role: 'assistant',
        content: []
      };

      render(<BeautifiedResultViewer result={emptyContentResult} />);
      expect(screen.getByText('No conversation content extracted')).toBeInTheDocument();
    });

    it('should suggest checking Raw JSON when no content', () => {
      const emptyContentResult = {
        role: 'assistant',
        content: []
      };

      render(<BeautifiedResultViewer result={emptyContentResult} />);
      expect(screen.getByText(/Check the Raw JSON section/)).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should apply maxHeight style', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} maxHeight="300px" />);
      const viewer = document.querySelector('.beautified-result-viewer');
      expect(viewer).toHaveStyle({ maxHeight: '300px' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle result with only system messages', () => {
      const onlySystemResult = [
        {
          type: 'system',
          subtype: 'hook_response',
          exit_code: 0
        }
      ];

      render(<BeautifiedResultViewer result={onlySystemResult} />);
      // Should show fallback message
      expect(screen.getByText('No conversation content extracted')).toBeInTheDocument();
    });

    it('should handle empty array result', () => {
      render(<BeautifiedResultViewer result={[]} />);
      expect(screen.getByText('No conversation content extracted')).toBeInTheDocument();
    });

    it('should handle multiple assistant messages', () => {
      const multiMessageResult = [
        {
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'First response' }]
          }
        },
        {
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Second response' }]
          }
        }
      ];

      render(<BeautifiedResultViewer result={multiMessageResult} />);
      expect(screen.getByText('First response')).toBeInTheDocument();
      expect(screen.getByText('Second response')).toBeInTheDocument();
      expect(screen.getByText(/2 messages/)).toBeInTheDocument();
    });

    it('should handle string content (non-array)', () => {
      const stringContentResult = {
        role: 'assistant',
        content: 'Simple string content'
      };

      render(<BeautifiedResultViewer result={stringContentResult} />);
      const elements = screen.getAllByText('Simple string content');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Tool Use Display', () => {
    it('should count unique tools used', () => {
      const multiToolResult = {
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'Read', id: '1', input: {} },
          { type: 'tool_use', name: 'Read', id: '2', input: {} },
          { type: 'tool_use', name: 'Write', id: '3', input: {} }
        ]
      };

      render(<BeautifiedResultViewer result={multiToolResult} />);
      // Should show both tools as badges (may appear multiple times in different sections)
      expect(screen.getAllByText('Read').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Write').length).toBeGreaterThanOrEqual(1);
    });

    it('should show tool count when same tool used multiple times', () => {
      const multiToolResult = {
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'Read', id: '1', input: {} },
          { type: 'tool_use', name: 'Read', id: '2', input: {} }
        ]
      };

      render(<BeautifiedResultViewer result={multiToolResult} />);
      // Should show ×2 for Read (may appear multiple times in different sections)
      expect(screen.getAllByText('×2').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Summary Display', () => {
    it('should display summary when present in result', () => {
      const resultWithSummary = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Work done' }],
        summary: 'Successfully implemented the feature'
      };

      render(<BeautifiedResultViewer result={resultWithSummary} />);
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText(/Successfully implemented the feature/)).toBeInTheDocument();
    });

    it('should generate summary from message content when not explicitly provided', () => {
      const resultWithoutSummary = {
        role: 'assistant',
        content: [{ type: 'text', text: 'I completed the implementation by modifying the files.' }]
      };

      render(<BeautifiedResultViewer result={resultWithoutSummary} />);
      // Generated summary should be displayed
      expect(screen.getByText('Summary')).toBeInTheDocument();
    });

    it('should include tool and file information in generated summary', () => {
      const resultForSummary = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Task complete' },
          { type: 'tool_use', name: 'Read', id: '1', input: {} }
        ],
        files_changed: ['file1.js', 'file2.js']
      };

      render(<BeautifiedResultViewer result={resultForSummary} />);
      expect(screen.getByText('Summary')).toBeInTheDocument();
      // Summary should mention tools and files
      expect(screen.getByText(/Used 1 tool.*Read/)).toBeInTheDocument();
      expect(screen.getByText(/Modified 2 files/)).toBeInTheDocument();
    });
  });

  describe('Key Decisions Extraction', () => {
    it('should extract and display key decisions from thinking blocks', () => {
      const resultWithThinking = [
        {
          type: 'assistant',
          message: {
            content: [
              {
                type: 'thinking',
                thinking: 'I will refactor the code to improve readability. The approach is to extract helper functions.'
              },
              { type: 'text', text: 'Refactoring complete' }
            ]
          }
        }
      ];

      render(<BeautifiedResultViewer result={resultWithThinking} />);
      expect(screen.getByText('Key Decisions')).toBeInTheDocument();
      expect(screen.getByText(/refactor the code to improve readability/)).toBeInTheDocument();
    });

    it('should extract multiple decision patterns from thinking', () => {
      const resultWithMultipleDecisions = [
        {
          type: 'assistant',
          message: {
            content: [
              {
                type: 'thinking',
                thinking: 'I need to validate the input first. Then I decided to use the newer API endpoint.'
              },
              { type: 'text', text: 'Implementation done' }
            ]
          }
        }
      ];

      render(<BeautifiedResultViewer result={resultWithMultipleDecisions} />);
      expect(screen.getByText('Key Decisions')).toBeInTheDocument();
      expect(screen.getByText(/validate the input first/)).toBeInTheDocument();
      expect(screen.getByText(/use the newer API endpoint/)).toBeInTheDocument();
    });

    it('should not show key decisions section when no decisions found', () => {
      const resultWithoutDecisions = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Simple text without decisions' }]
      };

      render(<BeautifiedResultViewer result={resultWithoutDecisions} />);
      expect(screen.queryByText('Key Decisions')).not.toBeInTheDocument();
    });

    it('should limit key decisions to reasonable length', () => {
      const veryLongThinking = 'I will ' + 'do something '.repeat(50) + 'to complete the task.';
      const resultWithLongDecision = [
        {
          type: 'assistant',
          message: {
            content: [
              {
                type: 'thinking',
                thinking: veryLongThinking
              },
              { type: 'text', text: 'Done' }
            ]
          }
        }
      ];

      render(<BeautifiedResultViewer result={resultWithLongDecision} />);
      // Decision should be extracted but very long ones should be filtered out (< 150 chars)
      // This test verifies the length limit works
      expect(screen.queryByText(/do something do something do something do something do something do something do something do something/)).not.toBeInTheDocument();
    });
  });

  describe('Enhanced Error Detection', () => {
    it('should detect errors from stderr field', () => {
      const resultWithStderrError = [
        {
          type: 'system',
          subtype: 'hook_response',
          stderr: 'error: command failed',
          exit_code: 1
        },
        {
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Attempted operation' }]
          }
        }
      ];

      render(<BeautifiedResultViewer result={resultWithStderrError} />);
      expect(screen.getByText('Completed with warnings')).toBeInTheDocument();
    });

    it('should detect errors from result entries', () => {
      const resultWithError = [
        {
          type: 'result',
          subtype: 'error',
          result: 'Operation failed'
        },
        {
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Attempted operation' }]
          }
        }
      ];

      render(<BeautifiedResultViewer result={resultWithError} />);
      expect(screen.getByText('Completed with warnings')).toBeInTheDocument();
    });
  });
});
