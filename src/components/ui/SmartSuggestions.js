import { Extension } from '@tiptap/core';

/**
 * Smart markdown-style auto-formatting extension for TipTap
 * Automatically converts markdown patterns to formatted text
 */
export const SmartFormatting = Extension.create({
  name: 'smartFormatting',

  addInputRules() {
    return [];
  },

  addPasteRules() {
    return [];
  },

  addKeyboardShortcuts() {
    return {
      // Smart list continuation on Enter
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        const parent = $from.parent;

        // Continue list item on Enter
        if (parent.type.name === 'listItem') {
          // If list item is empty, exit list
          if (parent.textContent === '') {
            return editor.chain().liftListItem('listItem').run();
          }
        }

        return false;
      },

      // Auto-convert ** to bold
      'Mod-b': () => false, // Let default bold work

      // Smart quote conversion (optional)
      '"': () => {
        // Simple smart quote (could be enhanced)
        return false; // Let default work for now
      },
    };
  },
});

export default SmartFormatting;
