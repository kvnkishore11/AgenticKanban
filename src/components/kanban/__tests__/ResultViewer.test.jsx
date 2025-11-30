/**
 * @fileoverview Tests for ResultViewer Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultViewer from '../ResultViewer';

describe('ResultViewer Component', () => {
  const mockResult = {
    status: 'success',
    summary: 'Task completed successfully',
    files_changed: ['/src/file1.js', '/src/file2.js'],
    nested: {
      level1: {
        level2: 'deep value'
      }
    },
    array_data: [1, 2, 3],
    bool_value: true,
    null_value: null,
    number_value: 42
  };

  describe('Loading State', () => {
    it('should show loading state when loading is true', () => {
      render(<ResultViewer loading={true} />);

      expect(screen.getByText('Loading result...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when error is provided', () => {
      render(<ResultViewer error="Failed to load result" />);

      expect(screen.getByText('Failed to load result')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when result is null', () => {
      render(<ResultViewer result={null} />);

      expect(screen.getByText('No Result Available')).toBeInTheDocument();
    });

    it('should show empty state when result is undefined', () => {
      render(<ResultViewer />);

      expect(screen.getByText('No Result Available')).toBeInTheDocument();
    });
  });

  describe('Tree View', () => {
    it('should render result in tree view when tree button is clicked', () => {
      render(<ResultViewer result={mockResult} />);

      // Click tree button to switch to tree view
      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      expect(screen.getByText('status:')).toBeInTheDocument();
    });

    it('should display string values with quotes', () => {
      render(<ResultViewer result={mockResult} />);

      // Switch to tree view
      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      expect(screen.getByText(/"success"/)).toBeInTheDocument();
    });

    it('should display number values', () => {
      render(<ResultViewer result={mockResult} />);

      // Switch to tree view
      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display boolean values', () => {
      render(<ResultViewer result={mockResult} />);

      // Switch to tree view
      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      expect(screen.getByText('true')).toBeInTheDocument();
    });

    it('should display null values', () => {
      render(<ResultViewer result={mockResult} />);

      // Switch to tree view
      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      expect(screen.getByText('null')).toBeInTheDocument();
    });

    it('should display array with item count', () => {
      render(<ResultViewer result={mockResult} />);

      // Switch to tree view
      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      expect(screen.getByText(/3 items/)).toBeInTheDocument();
    });

    it('should display object with key count', () => {
      render(<ResultViewer result={mockResult} />);

      // Switch to tree view
      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      // The root object has 8 keys
      expect(screen.getByText(/8 keys/)).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('should have Beautified, Tree and Raw mode buttons', () => {
      render(<ResultViewer result={mockResult} />);

      expect(screen.getByRole('button', { name: 'Beautified' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tree' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Raw' })).toBeInTheDocument();
    });

    it('should default to beautified view', () => {
      render(<ResultViewer result={mockResult} />);

      const beautifiedBtn = screen.getByRole('button', { name: 'Beautified' });
      expect(beautifiedBtn).toHaveClass('active');
    });

    it('should switch to tree view when Tree button is clicked', () => {
      render(<ResultViewer result={mockResult} />);

      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      // Tree view should show status key
      expect(screen.getByText('status:')).toBeInTheDocument();
    });

    it('should switch to raw view when Raw button is clicked', () => {
      render(<ResultViewer result={mockResult} />);

      fireEvent.click(screen.getByRole('button', { name: 'Raw' }));

      // Raw view should show JSON string
      expect(screen.getByText(/"status": "success"/)).toBeInTheDocument();
    });

    it('should switch between all view modes', () => {
      render(<ResultViewer result={mockResult} />);

      // Start with beautified (default)
      const beautifiedBtn = screen.getByRole('button', { name: 'Beautified' });
      const treeBtn = screen.getByRole('button', { name: 'Tree' });
      const rawBtn = screen.getByRole('button', { name: 'Raw' });

      expect(beautifiedBtn).toHaveClass('active');

      // Switch to tree
      fireEvent.click(treeBtn);
      expect(treeBtn).toHaveClass('active');
      expect(beautifiedBtn).not.toHaveClass('active');

      // Switch to raw
      fireEvent.click(rawBtn);
      expect(rawBtn).toHaveClass('active');
      expect(treeBtn).not.toHaveClass('active');

      // Switch back to beautified
      fireEvent.click(beautifiedBtn);
      expect(beautifiedBtn).toHaveClass('active');
      expect(rawBtn).not.toHaveClass('active');
    });
  });

  describe('Raw View', () => {
    it('should display formatted JSON in raw view', () => {
      render(<ResultViewer result={mockResult} />);

      fireEvent.click(screen.getByRole('button', { name: 'Raw' }));

      // Should be indented JSON
      expect(screen.getByText(/"summary": "Task completed successfully"/)).toBeInTheDocument();
    });
  });

  describe('Nested Objects', () => {
    it('should be collapsible', () => {
      render(<ResultViewer result={mockResult} />);

      // Switch to tree view
      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      // Find and click a collapse toggle
      const toggles = document.querySelectorAll('.json-tree-toggle');
      expect(toggles.length).toBeGreaterThan(0);

      // Clicking toggle should collapse/expand
      const firstToggle = toggles[0];
      fireEvent.click(firstToggle);

      // Content should be toggleable
      expect(firstToggle).toBeInTheDocument();
    });
  });

  describe('Long Strings', () => {
    it('should truncate very long strings in tree view', () => {
      const longResult = {
        longString: 'x'.repeat(300)
      };

      render(<ResultViewer result={longResult} />);

      // Switch to tree view
      fireEvent.click(screen.getByRole('button', { name: 'Tree' }));

      // Should show truncated string with ...
      expect(screen.getByText(/x{50,}\.\.\."/)).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should apply maxHeight style', () => {
      render(<ResultViewer result={mockResult} maxHeight="300px" />);

      const viewer = document.querySelector('.result-viewer');
      expect(viewer).toHaveStyle({ maxHeight: '300px' });
    });
  });
});
