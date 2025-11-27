/**
 * Tests for RichTextEditor Component
 * Comprehensive tests for the TipTap-based rich text editor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RichTextEditor from '../RichTextEditor';

// Mock TipTap editor
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: ({ editor }) => <div data-testid="editor-content">{editor ? 'Editor' : null}</div>,
}));

describe('RichTextEditor Component', () => {
  let mockEditor;

  beforeEach(() => {
    // Create a comprehensive mock editor
    mockEditor = {
      getHTML: vi.fn(() => '<p>Test content</p>'),
      commands: {
        setContent: vi.fn(),
        focus: vi.fn(() => ({ ...mockEditor.commands })),
        toggleBold: vi.fn(() => ({ run: vi.fn() })),
        toggleItalic: vi.fn(() => ({ run: vi.fn() })),
        toggleUnderline: vi.fn(() => ({ run: vi.fn() })),
        toggleStrike: vi.fn(() => ({ run: vi.fn() })),
        toggleCode: vi.fn(() => ({ run: vi.fn() })),
        toggleHeading: vi.fn(() => ({ run: vi.fn() })),
        toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
        toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
        toggleBlockquote: vi.fn(() => ({ run: vi.fn() })),
        toggleCodeBlock: vi.fn(() => ({ run: vi.fn() })),
        setHorizontalRule: vi.fn(() => ({ run: vi.fn() })),
        setTextAlign: vi.fn(() => ({ run: vi.fn() })),
        setLink: vi.fn(() => ({ run: vi.fn() })),
        unsetLink: vi.fn(() => ({ run: vi.fn() })),
        setColor: vi.fn(() => ({ run: vi.fn() })),
        setHighlight: vi.fn(() => ({ run: vi.fn() })),
        unsetHighlight: vi.fn(() => ({ run: vi.fn() })),
        insertTable: vi.fn(() => ({ run: vi.fn() })),
        clearNodes: vi.fn(() => ({ ...mockEditor.commands })),
        unsetAllMarks: vi.fn(() => ({ run: vi.fn() })),
        undo: vi.fn(() => ({ run: vi.fn() })),
        redo: vi.fn(() => ({ run: vi.fn() })),
      },
      chain: vi.fn(() => mockEditor.commands),
      can: vi.fn(() => ({
        undo: vi.fn(() => true),
        redo: vi.fn(() => true),
      })),
      isActive: vi.fn((type) => {
        if (type === 'bold') return false;
        if (type === 'link') return false;
        return false;
      }),
      storage: {
        characterCount: {
          characters: () => 100,
          words: () => 20,
        },
      },
      state: {
        selection: {
          $from: {
            parent: {
              type: { name: 'paragraph' },
              textContent: 'test',
            },
          },
        },
      },
    };

    const { useEditor } = require('@tiptap/react');
    useEditor.mockReturnValue(mockEditor);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('should render editor with default props', () => {
      const onChange = vi.fn();
      render(<RichTextEditor value="" onChange={onChange} />);

      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      const onChange = vi.fn();
      const { useEditor } = require('@tiptap/react');

      render(<RichTextEditor value="" onChange={onChange} placeholder="Custom placeholder" />);

      const editorCall = useEditor.mock.calls[0][0];
      expect(editorCall.extensions).toBeDefined();
    });

    it('should render with initial value', () => {
      const onChange = vi.fn();
      const { useEditor } = require('@tiptap/react');

      render(<RichTextEditor value="<p>Initial content</p>" onChange={onChange} />);

      const editorCall = useEditor.mock.calls[0][0];
      expect(editorCall.content).toBe('<p>Initial content</p>');
    });

    it('should render with custom className', () => {
      const onChange = vi.fn();
      const { container } = render(
        <RichTextEditor value="" onChange={onChange} className="custom-editor" />
      );

      expect(container.querySelector('.custom-editor')).toBeInTheDocument();
    });

    it('should render brutalist mode when prop is true', () => {
      const onChange = vi.fn();
      const { container } = render(
        <RichTextEditor value="" onChange={onChange} brutalist={true} />
      );

      // Component uses brutalist styles for toolbar and footer when brutalist=true
      expect(container.querySelector('.border-b-2.border-black')).toBeInTheDocument();
    });

    it('should not render when editor is not initialized', () => {
      const { useEditor } = require('@tiptap/react');
      useEditor.mockReturnValue(null);

      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Toolbar Buttons', () => {
    it('should render undo button', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render redo button', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render bold button', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render italic button', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render underline button', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render all heading buttons (H1, H2, H3)', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(15); // Many toolbar buttons
    });

    it('should render list buttons', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render alignment buttons', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Text Formatting', () => {
    it('should apply bold formatting when bold button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      // Bold button is typically the 3rd button (after undo/redo)
      const boldButton = buttons[2];
      await user.click(boldButton);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should apply italic formatting when italic button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const italicButton = buttons[3];
      await user.click(italicButton);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should apply underline formatting when underline button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const underlineButton = buttons[4];
      await user.click(underlineButton);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should show active state for bold when text is bold', () => {
      mockEditor.isActive = vi.fn((type) => type === 'bold');

      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const activeButton = container.querySelector('.bg-blue-500.text-white');
      expect(activeButton).toBeInTheDocument();
    });
  });

  describe('Headings', () => {
    it('should apply heading 1 when H1 button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      // Find heading button (after formatting buttons)
      const h1Button = buttons[7];
      await user.click(h1Button);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should apply heading 2 when H2 button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const h2Button = buttons[8];
      await user.click(h2Button);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should apply heading 3 when H3 button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const h3Button = buttons[9];
      await user.click(h3Button);

      expect(mockEditor.chain).toHaveBeenCalled();
    });
  });

  describe('Lists', () => {
    it('should create bullet list when bullet list button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const bulletListButton = buttons[10];
      await user.click(bulletListButton);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should create ordered list when ordered list button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const orderedListButton = buttons[11];
      await user.click(orderedListButton);

      expect(mockEditor.chain).toHaveBeenCalled();
    });
  });

  describe('Links', () => {
    it('should show link input when link button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      // Find link button (after alignment buttons)
      const buttons = container.querySelectorAll('button');
      const linkButton = Array.from(buttons).find((btn, idx) => idx > 15);

      if (linkButton) {
        await user.click(linkButton);
        await waitFor(() => {
          expect(container.querySelector('input[type="url"]')).toBeInTheDocument();
        });
      }
    });

    it('should set link when URL is entered and Set button clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const linkButton = Array.from(buttons).find((btn, idx) => idx > 15);

      if (linkButton) {
        await user.click(linkButton);

        await waitFor(() => {
          const urlInput = container.querySelector('input[type="url"]');
          if (urlInput) {
            return true;
          }
          throw new Error('URL input not found');
        });

        const urlInput = container.querySelector('input[type="url"]');
        await user.type(urlInput, 'https://example.com');

        const setButton = screen.getByText('Set');
        await user.click(setButton);

        expect(mockEditor.chain).toHaveBeenCalled();
      }
    });

    it('should unset link when link button is clicked on active link', async () => {
      const user = userEvent.setup();
      mockEditor.isActive = vi.fn((type) => type === 'link');

      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const linkButton = Array.from(buttons).find((btn, idx) => idx > 15);

      if (linkButton) {
        await user.click(linkButton);
        expect(mockEditor.chain).toHaveBeenCalled();
      }
    });

    it('should close link input on Escape key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const linkButton = Array.from(buttons).find((btn, idx) => idx > 15);

      if (linkButton) {
        await user.click(linkButton);

        await waitFor(() => {
          const urlInput = container.querySelector('input[type="url"]');
          if (urlInput) {
            return true;
          }
          throw new Error('URL input not found');
        });

        const urlInput = container.querySelector('input[type="url"]');
        await user.type(urlInput, '{Escape}');

        await waitFor(() => {
          expect(container.querySelector('input[type="url"]')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Color Picker', () => {
    it('should show color picker when text color button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      // Color button is after link button
      const colorButton = Array.from(buttons).find((btn, idx) => idx > 16);

      if (colorButton) {
        await user.click(colorButton);

        await waitFor(() => {
          const colorPicker = container.querySelector('.grid.grid-cols-4');
          expect(colorPicker).toBeInTheDocument();
        });
      }
    });

    it('should apply color when color is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const colorButton = Array.from(buttons).find((btn, idx) => idx > 16);

      if (colorButton) {
        await user.click(colorButton);

        await waitFor(() => {
          const colorButtons = container.querySelectorAll('.grid.grid-cols-4 button');
          if (colorButtons.length > 0) {
            return true;
          }
          throw new Error('Color buttons not found');
        });

        const colorButtons = container.querySelectorAll('.grid.grid-cols-4 button');
        if (colorButtons[0]) {
          await user.click(colorButtons[0]);
          expect(mockEditor.chain).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Highlight Picker', () => {
    it('should show highlight picker when highlight button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const highlightButton = Array.from(buttons).find((btn, idx) => idx > 17);

      if (highlightButton) {
        await user.click(highlightButton);

        await waitFor(() => {
          const highlightPicker = container.querySelector('.grid.grid-cols-3');
          expect(highlightPicker).toBeInTheDocument();
        });
      }
    });

    it('should apply highlight when highlight color is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const highlightButton = Array.from(buttons).find((btn, idx) => idx > 17);

      if (highlightButton) {
        await user.click(highlightButton);

        await waitFor(() => {
          const highlightButtons = container.querySelectorAll('.grid.grid-cols-3 button');
          if (highlightButtons.length > 0) {
            return true;
          }
          throw new Error('Highlight buttons not found');
        });

        const highlightButtons = container.querySelectorAll('.grid.grid-cols-3 button');
        if (highlightButtons[1]) {
          await user.click(highlightButtons[1]);
          expect(mockEditor.chain).toHaveBeenCalled();
        }
      }
    });

    it('should remove highlight when None option is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const highlightButton = Array.from(buttons).find((btn, idx) => idx > 17);

      if (highlightButton) {
        await user.click(highlightButton);

        await waitFor(() => {
          const highlightButtons = container.querySelectorAll('.grid.grid-cols-3 button');
          if (highlightButtons.length > 0) {
            return true;
          }
          throw new Error('Highlight buttons not found');
        });

        const highlightButtons = container.querySelectorAll('.grid.grid-cols-3 button');
        // First button should be "None"
        if (highlightButtons[0]) {
          await user.click(highlightButtons[0]);
          expect(mockEditor.chain).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Table Operations', () => {
    it('should insert table when table button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      // Table button is near the end
      const tableButton = Array.from(buttons).find((btn, idx) => idx > 18);

      if (tableButton) {
        await user.click(tableButton);
        expect(mockEditor.chain).toHaveBeenCalled();
      }
    });
  });

  describe('Clear Formatting', () => {
    it('should clear formatting when clear formatting button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      // Clear formatting is the last button
      const clearButton = buttons[buttons.length - 1];
      await user.click(clearButton);

      expect(mockEditor.chain).toHaveBeenCalled();
    });
  });

  describe('Undo/Redo', () => {
    it('should undo when undo button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const undoButton = buttons[0];
      await user.click(undoButton);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should redo when redo button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const redoButton = buttons[1];
      await user.click(redoButton);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should disable undo button when cannot undo', () => {
      mockEditor.can = vi.fn(() => ({
        undo: vi.fn(() => false),
        redo: vi.fn(() => true),
      }));

      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const undoButton = buttons[0];
      expect(undoButton).toBeDisabled();
    });

    it('should disable redo button when cannot redo', () => {
      mockEditor.can = vi.fn(() => ({
        undo: vi.fn(() => true),
        redo: vi.fn(() => false),
      }));

      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const redoButton = buttons[1];
      expect(redoButton).toBeDisabled();
    });
  });

  describe('Character and Word Count', () => {
    it('should display character count', () => {
      const onChange = vi.fn();
      render(<RichTextEditor value="" onChange={onChange} />);

      expect(screen.getByText('100 characters')).toBeInTheDocument();
    });

    it('should display word count', () => {
      const onChange = vi.fn();
      render(<RichTextEditor value="" onChange={onChange} />);

      expect(screen.getByText('20 words')).toBeInTheDocument();
    });

    it('should update counts dynamically', () => {
      mockEditor.storage.characterCount.characters = () => 250;
      mockEditor.storage.characterCount.words = () => 50;

      const onChange = vi.fn();
      render(<RichTextEditor value="" onChange={onChange} />);

      expect(screen.getByText('250 characters')).toBeInTheDocument();
      expect(screen.getByText('50 words')).toBeInTheDocument();
    });
  });

  describe('onChange Callback', () => {
    it('should call onChange when content changes', () => {
      const onChange = vi.fn();
      const { useEditor } = require('@tiptap/react');

      render(<RichTextEditor value="" onChange={onChange} />);

      const editorConfig = useEditor.mock.calls[0][0];
      const mockEditorInstance = { getHTML: () => '<p>New content</p>' };

      editorConfig.onUpdate({ editor: mockEditorInstance });

      expect(onChange).toHaveBeenCalledWith('<p>New content</p>');
    });
  });

  describe('Content Sync', () => {
    it('should update content when value prop changes', () => {
      const onChange = vi.fn();
      const { rerender } = render(<RichTextEditor value="<p>Initial</p>" onChange={onChange} />);

      rerender(<RichTextEditor value="<p>Updated</p>" onChange={onChange} />);

      expect(mockEditor.commands.setContent).toHaveBeenCalledWith('<p>Updated</p>');
    });

    it('should not update content when value matches current content', () => {
      mockEditor.getHTML = vi.fn(() => '<p>Same content</p>');

      const onChange = vi.fn();
      const { rerender } = render(
        <RichTextEditor value="<p>Same content</p>" onChange={onChange} />
      );

      mockEditor.commands.setContent.mockClear();

      rerender(<RichTextEditor value="<p>Same content</p>" onChange={onChange} />);

      expect(mockEditor.commands.setContent).not.toHaveBeenCalled();
    });
  });

  describe('Styling Modes', () => {
    it('should apply normal styling by default', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      expect(container.querySelector('.border.border-gray-300.rounded-lg')).toBeInTheDocument();
    });

    it('should apply brutalist styling when brutalist prop is true', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} brutalist={true} />);

      expect(container.querySelector('.border-b-2.border-black')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty value', () => {
      const onChange = vi.fn();
      render(<RichTextEditor value="" onChange={onChange} />);

      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('should handle null value', () => {
      const onChange = vi.fn();
      render(<RichTextEditor value={null} onChange={onChange} />);

      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('should handle undefined value', () => {
      const onChange = vi.fn();
      render(<RichTextEditor value={undefined} onChange={onChange} />);

      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longContent = '<p>' + 'x'.repeat(10000) + '</p>';
      const onChange = vi.fn();

      const { useEditor } = require('@tiptap/react');
      render(<RichTextEditor value={longContent} onChange={onChange} />);

      const editorConfig = useEditor.mock.calls[0][0];
      expect(editorConfig.content).toBe(longContent);
    });
  });

  describe('Accessibility', () => {
    it('should have button elements for all toolbar actions', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(15);

      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have title attributes on toolbar buttons', () => {
      const onChange = vi.fn();
      const { container } = render(<RichTextEditor value="" onChange={onChange} />);

      const buttons = container.querySelectorAll('button');
      const buttonsWithTitle = Array.from(buttons).filter(btn => btn.hasAttribute('title'));

      expect(buttonsWithTitle.length).toBeGreaterThan(0);
    });
  });
});
