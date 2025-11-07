# Chore: Enhance Editor Options and Fix Bugs

## Metadata
issue_number: `69`
adw_id: `7233edf6`
issue_json: `{"number":69,"title":"can you add more options to this","body":"can you add more options to this . also there are some bugs. like list does not show bullet also numbers. once i select bold, it can never be unbold again. same with italics too. i want the text look so attractive a way that you should feel like typing more and more. see if can add feature like cursor tab which automatically suggests based on what you are trying to type.. you may have to explore mroe. think harder\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/59fc99cf-e2d3-4bcc-ac3b-c7387fe170eb)\n\n"}`

## Chore Description
The TipTap rich text editor in TaskEditModal needs significant enhancements and bug fixes:

**Bugs to Fix:**
1. Lists (bullets and numbers) are not displaying properly in the editor
2. Bold formatting cannot be toggled off once applied
3. Italic formatting cannot be toggled off once applied

**Enhancements Requested:**
1. Add more formatting options to make the text editor more feature-rich
2. Improve visual appeal to encourage more typing
3. Add AI-powered autocomplete/suggestions (like Cursor Tab) that suggests text based on context
4. Add additional formatting toolbar options (underline, strikethrough, code, blockquote, etc.)
5. Enhance the editor styling to make it more attractive and engaging

## Relevant Files
Use these files to resolve the chore:

### Frontend - Editor Component
- **src/components/ui/RichTextEditor.jsx**
  - Contains the TipTap editor component with toolbar buttons
  - Currently implements: Bold, Italic, H1-H3, Bullet/Numbered lists
  - Bug: Toggle commands may not be working properly (bold/italic stay active)
  - Bug: List styles not visible due to CSS issues
  - Needs: More formatting options, better styling, AI autocomplete extension

### Frontend - CSS Styles
- **src/index.css**
  - Contains ProseMirror styles for the editor
  - Has basic styles for lists (`.ProseMirror ul`, `.ProseMirror ol`)
  - Needs: Enhanced styling for better visual appeal
  - Needs: List style type declarations (bullets and numbers visibility)
  - Needs: Better focus states, hover effects, and overall polish

### Frontend - Task Modal
- **src/components/forms/TaskEditModal.jsx**
  - Uses RichTextEditor component for task descriptions
  - Currently shows the editor with minimal options
  - May need updates if new editor features require configuration

### Dependencies
- **package.json**
  - Currently has: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder
  - Needs: Additional TipTap extensions for new features (underline, text style, color, highlight, etc.)
  - Needs: AI autocomplete extension or similar (may require custom implementation or third-party)

### New Files
- **src/components/ui/EditorAutocomplete.jsx** (if implementing custom AI autocomplete)
  - Custom TipTap extension for AI-powered text suggestions
  - Integration with OpenAI API or similar for context-aware completions
  - Keyboard shortcuts (Tab key) to trigger and accept suggestions

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Fix List Display Bug
- Investigate why bullet and numbered lists are not showing visual indicators
- Update CSS in `src/index.css` to ensure `list-style-type` is properly set
- Add explicit `list-style-type: disc` for `ul` and `list-style-type: decimal` for `ol`
- Ensure the list indentation and padding are correct for visibility
- Test both bullet and numbered lists to confirm they display properly

### Step 2: Fix Bold/Italic Toggle Bug
- Debug why `toggleBold()` and `toggleItalic()` commands don't deactivate formatting
- Review TipTap command chain in `RichTextEditor.jsx` toolbar buttons
- Verify that `editor.isActive('bold')` and `editor.isActive('italic')` return correct state
- Test that clicking bold/italic buttons when already active removes the formatting
- Ensure the toolbar buttons show correct active state (blue background when active)

### Step 3: Add More Formatting Options
- Install additional TipTap extensions:
  - `@tiptap/extension-underline` for underline support
  - `@tiptap/extension-text-style` for text styling
  - `@tiptap/extension-color` for text color
  - `@tiptap/extension-highlight` for text highlighting
  - `@tiptap/extension-link` for hyperlinks
  - `@tiptap/extension-text-align` for text alignment
  - `@tiptap/extension-code-block-lowlight` for better code blocks
  - `@tiptap/extension-table` for tables
- Add toolbar buttons in `RichTextEditor.jsx` for new formatting options:
  - Underline (U)
  - Strikethrough (S)
  - Code inline (`<>`)
  - Blockquote (quote icon)
  - Horizontal rule (divider)
  - Link (chain icon with modal for URL input)
  - Text color picker
  - Highlight color picker
  - Text alignment (left/center/right)
  - Clear formatting button
- Organize toolbar into logical groups with visual separators
- Use Lucide React icons for better visual appearance where appropriate

### Step 4: Enhance Editor Visual Appeal
- Update `src/index.css` ProseMirror styles for better aesthetics:
  - Add subtle background color or texture to editor area
  - Improve focus states with smooth transitions and colored borders
  - Add better spacing and typography for readability
  - Use a more pleasant color palette for headings and text
  - Add smooth transitions for all formatting changes
- Enhance toolbar styling in `RichTextEditor.jsx`:
  - Add icons instead of text labels where possible
  - Use better color schemes for active/inactive states
  - Add hover effects with smooth transitions
  - Consider a floating toolbar or bubble menu for better UX
  - Add tooltips for all toolbar buttons
- Add a character/word count indicator below the editor
- Consider adding a "zen mode" toggle for distraction-free writing

### Step 5: Implement AI Autocomplete Feature
- Research TipTap autocomplete extensions (e.g., `@tiptap/extension-mention` as a base)
- Create custom autocomplete extension or integrate existing solution:
  - Option A: Use TipTap's suggestion extension with custom AI backend
  - Option B: Create custom extension that calls OpenAI API for completions
  - Option C: Use a lightweight local ML model for suggestions
- Implement trigger mechanism (Tab key or automatic as user types)
- Add UI component for showing suggestions (dropdown or inline ghost text)
- Configure debouncing to avoid excessive API calls
- Add loading states and error handling
- Make the feature optional/toggleable in settings if it requires API costs
- Add visual indicators (ghost text in gray) showing the suggestion
- Implement keyboard shortcuts:
  - Tab to accept suggestion
  - Esc to dismiss suggestion
  - Arrow keys to navigate multiple suggestions

### Step 6: Add Context-Aware Smart Features
- Implement auto-formatting features:
  - Auto-convert `**text**` to bold
  - Auto-convert `*text*` to italic
  - Auto-convert `~~text~~` to strikethrough
  - Auto-convert URLs to links
  - Auto-convert markdown-style lists to formatted lists
- Add slash commands (type `/` to show command palette):
  - `/heading1`, `/heading2`, `/heading3`
  - `/bullet`, `/numbered`
  - `/code`, `/quote`
  - `/table`, `/divider`
- Add smart paste handling (preserve formatting from copied content)
- Implement collaborative editing indicators (if needed for future)

### Step 7: Testing and Polish
- Test all new formatting options work correctly
- Verify bold/italic toggle bug is completely fixed
- Verify list display bug is completely fixed
- Test keyboard shortcuts work as expected
- Test all toolbar buttons display correct active states
- Test editor performance with large documents
- Verify the editor is responsive on different screen sizes
- Test paste functionality with various content types
- Test undo/redo functionality works with all new features
- Ensure accessibility (keyboard navigation, screen readers)

### Step 8: Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Verify frontend builds successfully
- Verify no TypeScript errors
- Verify no ESLint warnings
- Verify all existing functionality still works

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run lint` - Run ESLint to check for code quality issues
- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run build` - Build the frontend to ensure no build errors
- `npm run test` - Run frontend tests to validate no regressions
- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes

### AI Autocomplete Implementation Considerations
The AI autocomplete feature is the most complex part of this chore. Consider these approaches:
1. **OpenAI Integration**: Use GPT-3.5/4 API for high-quality suggestions but requires API key and costs
2. **Local ML Model**: Use a lightweight model like GPT-2 running in browser via TensorFlow.js (free but lower quality)
3. **Rule-based Suggestions**: Start with simpler completions based on common patterns (quick win, no API needed)
4. **Defer to Future**: Mark this as "nice to have" and implement simpler enhancements first

### TipTap Extensions to Consider
Beyond the required extensions, consider these for "feel like typing more":
- `@tiptap/extension-typography` - Smart quotes, ellipses, em dashes
- `@tiptap/extension-emoji` - Emoji picker and shortcuts
- `@tiptap/extension-task-list` - Checkboxes for task lists
- `@tiptap/extension-collaboration-cursor` - For future collaboration features

### Performance Considerations
- Debounce AI autocomplete calls (300-500ms)
- Lazy load heavy extensions (tables, code highlighting)
- Use virtual scrolling for very long documents
- Optimize re-renders with React.memo if needed

### UX Enhancements for "Attractive" Experience
- Smooth animations for all state changes
- Delightful micro-interactions (button presses, format changes)
- Pleasant color palette (blues, purples, soft gradients)
- Typography that's easy on the eyes (good line-height, letter-spacing)
- Visual feedback for all user actions
- Keyboard shortcuts displayed in tooltips
- Dark mode support (optional but attractive)
