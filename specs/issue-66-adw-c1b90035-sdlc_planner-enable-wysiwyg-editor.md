# Feature: Enable WYSIWYG Editor for Task Description

## Metadata
issue_number: `66`
adw_id: `c1b90035`
issue_json: `{"number":66,"title":"great taht we have styling enabled for our descrip...","body":"great taht we have styling enabled for our descriptoin box. \nbut I dont wnat it to be in markdowon format. \nI should be able to have direct preview \n\nalso when the prompt is begin sent it should not have markdown too.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/002f1077-5ada-41b7-a3f5-a6dc556ab82e)\n\n"}`

## Feature Description
Convert the task description editor from markdown-based editing to a true WYSIWYG (What You See Is What You Get) rich text editor. Users should see their formatted text in real-time while editing, without needing to toggle between edit and preview modes. The description should be stored as plain text or HTML (not markdown) and sent to backend/workflows without markdown formatting.

## User Story
As a task creator
I want to format my task descriptions with direct visual editing
So that I can see exactly how my text will appear without switching between edit and preview modes, and without dealing with markdown syntax

## Problem Statement
Currently, the task description uses MDEditor (@uiw/react-md-editor) which:
1. Requires users to write in markdown syntax (e.g., **bold**, *italic*)
2. Shows markdown code in the edit view rather than the formatted result
3. Requires toggling preview mode to see formatted output
4. Stores and sends data in markdown format, which requires parsing on the backend
5. Creates a disconnect between what users type and what they see

## Solution Statement
Replace the MDEditor component with a WYSIWYG rich text editor (TipTap) that:
1. Shows formatted text in real-time as users type
2. Provides toolbar buttons for formatting (bold, italic, lists, etc.)
3. Stores content as HTML internally
4. Converts to plain text for backend submission (removing HTML tags)
5. Maintains all existing functionality (validation, save, image attachments)
6. Works seamlessly in both TaskEditModal and any other description editing contexts

## Relevant Files
Use these files to implement the feature:

### Existing Files
- **src/components/forms/TaskEditModal.jsx** (lines 372-391)
  - Currently uses MDEditor for description editing
  - Need to replace with WYSIWYG editor
  - Handles description state and validation
  - Submits description to backend (line 186)

- **src/components/kanban/TaskDetailsModal.jsx** (lines 266-275)
  - Displays task description in read-only view
  - Shows description as plain text with whitespace preservation
  - May need updates if we change storage format

- **src/stores/kanbanStore.js**
  - Manages task state including description field
  - Validates task data before save
  - May need schema updates for HTML vs plain text handling

- **package.json**
  - Currently includes `@uiw/react-md-editor: ^4.0.8`
  - Need to add TipTap dependencies

- **src/styles/style.css**
  - Global styles that may need updates for TipTap editor styling

- **README.md**
  - Documents current technology stack (line 54: React Markdown)
  - Should be updated to reflect new editor choice

### New Files
- **src/components/ui/RichTextEditor.jsx**
  - New reusable WYSIWYG editor component using TipTap
  - Provides toolbar with formatting controls (bold, italic, lists, headings)
  - Accepts value/onChange props for controlled component pattern
  - Converts HTML to plain text for submission
  - Includes proper styling and UX

- **.claude/commands/e2e/test_wysiwyg_editor.md**
  - E2E test to validate WYSIWYG editor functionality
  - Tests text formatting, toolbar interactions, save/load
  - Validates plain text submission (not markdown)
  - Captures screenshots proving direct preview works

## Implementation Plan

### Phase 1: Foundation
1. **Research and select WYSIWYG editor library**
   - Evaluate TipTap (recommended: modern, extensible, React-friendly)
   - Install dependencies via `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`
   - Remove `@uiw/react-md-editor` dependency

2. **Create base RichTextEditor component**
   - Build new component in `src/components/ui/RichTextEditor.jsx`
   - Implement TipTap with basic extensions (bold, italic, lists, headings)
   - Create formatting toolbar with visual buttons
   - Provide controlled component interface (value/onChange)
   - Add placeholder text support
   - Style editor to match existing UI design

### Phase 2: Core Implementation
3. **Replace MDEditor in TaskEditModal**
   - Import and use new RichTextEditor component
   - Update description state handling to work with HTML
   - Implement HTML to plain text conversion before submission
   - Preserve all existing validation logic
   - Test that description saves correctly

4. **Update TaskDetailsModal for display**
   - Verify read-only description display works with new format
   - Test that saved descriptions render correctly
   - Handle both legacy markdown data and new HTML/plain text data

5. **Update backend data handling**
   - Verify kanbanStore correctly processes plain text descriptions
   - Ensure validateTask function works with new format
   - Test that descriptions are sent to workflows correctly

### Phase 3: Integration
6. **Update styling and UX**
   - Add TipTap-specific CSS to style.css
   - Ensure editor matches existing form field aesthetics
   - Test responsive behavior and accessibility
   - Verify placeholder text displays correctly

7. **Clean up and documentation**
   - Remove MDEditor imports and unused code
   - Update README.md to document new editor choice
   - Remove `@uiw/react-md-editor` from package.json
   - Update any JSDoc comments referencing markdown

## Step by Step Tasks

### Task 1: Install TipTap Dependencies
- Run `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`
- Verify installation succeeds without conflicts

### Task 2: Create RichTextEditor Component
- Create `src/components/ui/RichTextEditor.jsx`
- Implement TipTap editor with starter kit extensions
- Build toolbar with buttons for: Bold, Italic, Bullet List, Numbered List, Heading 1, Heading 2, Heading 3
- Add placeholder extension for empty state guidance
- Implement value/onChange props following controlled component pattern
- Add proper JSDoc documentation
- Style component to match existing form field aesthetics

### Task 3: Create E2E Test for WYSIWYG Editor
- Create `.claude/commands/e2e/test_wysiwyg_editor.md`
- Define test steps to:
  - Open task creation/edit modal
  - Verify WYSIWYG editor is present (not markdown editor)
  - Use toolbar to format text (bold, italic, lists)
  - Verify formatted text appears immediately without preview toggle
  - Save task and reopen to verify formatting persists
  - Verify description is submitted as plain text (inspect network/store)
  - Capture screenshots showing direct formatting
- Include success criteria matching the feature requirements

### Task 4: Replace MDEditor in TaskEditModal
- Import RichTextEditor component in TaskEditModal.jsx
- Remove MDEditor import and related CSS import
- Replace MDEditor component (lines 377-386) with RichTextEditor
- Update description state to handle HTML content internally
- Implement HTML-to-plain-text conversion in handleSubmit before saving (line 186)
- Preserve all existing validation and error handling
- Update placeholder text to match new editor UX
- Remove markdown-related help text (line 388-390)

### Task 5: Update TaskDetailsModal Display
- Review TaskDetailsModal.jsx description rendering (lines 266-275)
- Verify plain text display works correctly with new format
- Add migration logic if needed to handle legacy markdown descriptions
- Test that descriptions display correctly in read-only view

### Task 6: Update Styling
- Add TipTap editor styles to src/styles/style.css
- Ensure editor integrates seamlessly with existing design
- Style toolbar buttons to match application theme
- Test responsive layout on different screen sizes
- Verify focus states and accessibility

### Task 7: Clean Up Dependencies
- Remove `@uiw/react-md-editor` from package.json
- Run `npm install` to update lock file
- Remove `@uiw/react-md-editor/markdown-editor.css` imports
- Search codebase for any other MDEditor references and update

### Task 8: Update Documentation
- Update README.md line 54 to replace "React Markdown" with "TipTap WYSIWYG Editor"
- Update technology stack description
- Add any necessary usage notes for future developers

### Task 9: Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Run E2E test to validate WYSIWYG functionality
- Fix any issues discovered during validation

## Testing Strategy

### Unit Tests
- Test RichTextEditor component renders correctly
- Test toolbar buttons apply correct formatting
- Test value/onChange props work as controlled component
- Test HTML to plain text conversion preserves content
- Test placeholder text displays when empty
- Test that invalid input is handled gracefully

### Integration Tests
- Test TaskEditModal saves descriptions correctly with new editor
- Test TaskDetailsModal displays saved descriptions
- Test kanbanStore validates and processes descriptions
- Test backward compatibility with existing markdown descriptions

### Edge Cases
- Empty description (should show placeholder)
- Very long descriptions (should handle scrolling)
- Rich formatting (bold, italic, lists, headings)
- Paste from clipboard (should strip unsupported formatting)
- Legacy tasks with markdown (should display gracefully)
- Special characters and emoji
- Rapid typing and formatting changes

## Acceptance Criteria
- [ ] RichTextEditor component created and documented
- [ ] TipTap installed and MDEditor removed from dependencies
- [ ] TaskEditModal uses new WYSIWYG editor
- [ ] Formatting toolbar provides bold, italic, lists, and heading options
- [ ] Text formatting appears immediately while typing (no preview toggle needed)
- [ ] Descriptions are stored and submitted as plain text (not markdown)
- [ ] Existing task descriptions continue to display correctly
- [ ] All validation commands pass with zero regressions
- [ ] E2E test validates WYSIWYG functionality with screenshots
- [ ] README.md updated to reflect new technology choice
- [ ] Code is properly documented with JSDoc comments
- [ ] Styling matches existing application design
- [ ] Responsive and accessible on all screen sizes

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute the new E2E test `.claude/commands/e2e/test_wysiwyg_editor.md` to validate WYSIWYG functionality works with direct preview
- `cd app/server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `npm run typecheck` - Run TypeScript type checking to validate the feature works with zero regressions
- `npm run build` - Run frontend build to validate the feature works with zero regressions

## Notes

### Why TipTap?
TipTap is the recommended WYSIWYG editor because:
1. **Modern and React-friendly**: Built specifically for modern frameworks
2. **Extensible**: Modular architecture allows adding only needed features
3. **Lightweight**: Smaller bundle size than alternatives like Quill or Draft.js
4. **Active development**: Well-maintained with strong community
5. **Headless**: Provides full control over UI and styling
6. **Accessibility**: Built-in ARIA support and keyboard navigation

### Plain Text Submission
The editor stores content as HTML internally for formatting, but converts to plain text before submission to:
1. Avoid HTML injection vulnerabilities
2. Simplify backend processing
3. Ensure compatibility with existing workflow systems
4. Reduce storage requirements

### Migration Strategy
Legacy tasks with markdown descriptions should:
1. Display as-is in read-only view (whitespace-preserved plain text)
2. Convert to plain text if edited and re-saved
3. Not require manual migration or data transformation

### Future Enhancements
Consider for future iterations:
- Image insertion within description (beyond attachments)
- Code block formatting for technical descriptions
- Link insertion and validation
- Collaborative editing with real-time sync
- Description templates for common task types
