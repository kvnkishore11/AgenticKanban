/**
 * @fileoverview Tests for BeautifiedResultViewer Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BeautifiedResultViewer from '../BeautifiedResultViewer';

describe('BeautifiedResultViewer Component', () => {
  const mockSimpleResult = {
    content: [
      {
        type: 'text',
        text: 'Task completed successfully. All files have been updated.'
      }
    ],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 1234,
      output_tokens: 567
    }
  };

  const mockComplexResult = {
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
    status: 'success',
    files_changed: ['/src/file1.js', '/src/file2.js'],
    files_created: ['/src/newfile.js'],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 2000,
      output_tokens: 1000
    }
  };

  const mockPlanResult = {
    content: [
      {
        type: 'thinking',
        thinking: 'Analyzing the requirements...'
      },
      {
        type: 'text',
        text: 'Plan created with 5 tasks'
      }
    ],
    plan: {
      tasks: ['Task 1', 'Task 2', 'Task 3']
    },
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn'
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

  describe('Primary Results Display', () => {
    it('should display text content prominently', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      expect(screen.getByText(/Task completed successfully/)).toBeInTheDocument();
    });

    it('should display status when present', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);

      expect(screen.getByText('Status:')).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
    });

    it('should display files changed', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);

      expect(screen.getByText('Files')).toBeInTheDocument();
      expect(screen.getByText('/src/file1.js')).toBeInTheDocument();
      expect(screen.getByText('/src/file2.js')).toBeInTheDocument();
    });

    it('should display files created', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);

      expect(screen.getByText('Created:')).toBeInTheDocument();
      expect(screen.getByText('/src/newfile.js')).toBeInTheDocument();
    });

    it('should display tool uses', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);

      expect(screen.getByText(/Tool Uses/)).toBeInTheDocument();
      expect(screen.getByText('Write')).toBeInTheDocument();
    });

    it('should display plan when present', () => {
      render(<BeautifiedResultViewer result={mockPlanResult} />);

      expect(screen.getByText('Plan')).toBeInTheDocument();
    });
  });

  describe('Metadata Section', () => {
    it('should have a collapsible metadata section', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      expect(screen.getByText('Metadata')).toBeInTheDocument();
    });

    it('should expand metadata when clicked', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      const metadataButton = screen.getByText('Metadata').closest('button');
      fireEvent.click(metadataButton);

      // Metadata should now be visible
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument();
    });

    it('should display usage information', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      const metadataButton = screen.getByText('Metadata').closest('button');
      fireEvent.click(metadataButton);

      expect(screen.getByText('Usage')).toBeInTheDocument();
    });

    it('should display stop reason', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      const metadataButton = screen.getByText('Metadata').closest('button');
      fireEvent.click(metadataButton);

      expect(screen.getByText('Stop Reason')).toBeInTheDocument();
      expect(screen.getByText('end_turn')).toBeInTheDocument();
    });
  });

  describe('Raw JSON Section', () => {
    it('should have a collapsible raw JSON section', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      expect(screen.getByText('Raw JSON')).toBeInTheDocument();
    });

    it('should expand raw JSON when clicked', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      const rawJsonButton = screen.getByText('Raw JSON').closest('button');
      fireEvent.click(rawJsonButton);

      // Should display formatted JSON
      const jsonContent = screen.getByText(/"model": "claude-3-5-sonnet-20241022"/);
      expect(jsonContent).toBeInTheDocument();
    });
  });

  describe('Content Parsing', () => {
    it('should extract text from content array', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      expect(screen.getByText(/Task completed successfully/)).toBeInTheDocument();
    });

    it('should extract tool uses from content array', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);

      expect(screen.getByText('Write')).toBeInTheDocument();
    });

    it('should handle multiple text blocks in content', () => {
      const multiTextResult = {
        content: [
          { type: 'text', text: 'First block' },
          { type: 'text', text: 'Second block' }
        ]
      };

      render(<BeautifiedResultViewer result={multiTextResult} />);

      expect(screen.getByText(/First block/)).toBeInTheDocument();
      expect(screen.getByText(/Second block/)).toBeInTheDocument();
    });
  });

  describe('Visual Hierarchy', () => {
    it('should display Results section header', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    it('should have metadata section collapsed by default', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      // Model should not be visible initially (metadata collapsed)
      expect(screen.queryByText('Model')).not.toBeInTheDocument();
    });

    it('should have raw JSON section collapsed by default', () => {
      render(<BeautifiedResultViewer result={mockSimpleResult} />);

      // JSON content should not be visible initially
      expect(screen.queryByText(/"model":/)).not.toBeInTheDocument();
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
    it('should handle empty content array', () => {
      const emptyContentResult = {
        content: [],
        model: 'claude-3-5-sonnet-20241022'
      };

      render(<BeautifiedResultViewer result={emptyContentResult} />);

      // Should still render metadata
      const metadataButton = screen.getByText('Metadata').closest('button');
      expect(metadataButton).toBeInTheDocument();
    });

    it('should handle result with no content field', () => {
      const noContentResult = {
        status: 'success',
        model: 'claude-3-5-sonnet-20241022'
      };

      render(<BeautifiedResultViewer result={noContentResult} />);

      expect(screen.getByText('Status:')).toBeInTheDocument();
    });

    it('should handle string files_changed instead of array', () => {
      const stringFilesResult = {
        files_changed: '/src/single-file.js'
      };

      render(<BeautifiedResultViewer result={stringFilesResult} />);

      expect(screen.getByText('/src/single-file.js')).toBeInTheDocument();
    });

    it('should handle nested objects in primary results', () => {
      const nestedResult = {
        test_results: {
          passed: 10,
          failed: 2
        }
      };

      render(<BeautifiedResultViewer result={nestedResult} />);

      expect(screen.getByText('Test Results')).toBeInTheDocument();
    });
  });

  describe('Tool Use Display', () => {
    it('should display tool ID when present', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);

      expect(screen.getByText('#tool_123')).toBeInTheDocument();
    });

    it('should display tool input as formatted JSON', () => {
      render(<BeautifiedResultViewer result={mockComplexResult} />);

      expect(screen.getByText(/file_path/)).toBeInTheDocument();
    });

    it('should handle multiple tool uses', () => {
      const multiToolResult = {
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'Read',
            input: { file: 'test.js' }
          },
          {
            type: 'tool_use',
            id: 'tool_2',
            name: 'Write',
            input: { file: 'output.js' }
          }
        ]
      };

      render(<BeautifiedResultViewer result={multiToolResult} />);

      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByText('Write')).toBeInTheDocument();
    });
  });
});
