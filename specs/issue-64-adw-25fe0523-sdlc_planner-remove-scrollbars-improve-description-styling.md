# Chore: Remove scrollbars in contracted cards and improve description styling in expanded state

## Metadata
issue_number: `64`
adw_id: `25fe0523`
issue_json: `{"number":64,"title":"I did not like the vertical scroll bars in the car...","body":"I did not like the vertical scroll bars in the cards in contracted state. Please remove that. \nIn the expanded state. I see the description is too compact with no formatting or styling. i want it to be more readable since that is the base of your entire compute. try to work on these changes.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/89756c33-20c0-4fe3-9b02-dd5c1549c7f1)\n\n"}`

## Chore Description
The user has identified two UX issues with the Kanban card display:

1. **Vertical scrollbars in contracted card state**: Currently, the description section in `KanbanCard.jsx` shows scrollbars when the content exceeds `max-h-48`. This creates visual clutter in the contracted state and should be removed.

2. **Description styling in expanded modal**: In the `CardExpandModal.jsx`, the description is displayed with minimal styling in a compact gray box with scrolling. Since the description is the foundation of the entire workflow computation, it needs better formatting and readability with proper markdown rendering similar to how the PlanViewer component displays content.

## Relevant Files
Use these files to resolve the chore:

- **src/components/kanban/KanbanCard.jsx** (lines 271-277)
  - Contains the description rendering in contracted card state
  - Currently uses `max-h-48 overflow-y-auto` which adds scrollbars
  - Need to modify to remove scrollbars or limit visible content differently

- **src/components/kanban/CardExpandModal.jsx** (lines 294-302)
  - Contains the description rendering in the expanded modal state
  - Currently displays description in a compact box with `max-h-20 overflow-y-auto`
  - Need to enhance with markdown rendering and better styling for readability

- **src/styles/kanban.css**
  - Contains styling for kanban cards and modals
  - May need to add new styles for enhanced description rendering
  - Contains existing markdown styles that can be referenced (message-content class in index.css)

- **src/index.css** (lines 84-183)
  - Contains the `.message-content` class with comprehensive markdown styling
  - These styles should be used as reference for description rendering

- **src/components/kanban/PlanViewer.jsx**
  - Reference implementation showing how to use ReactMarkdown with proper styling
  - Uses `prose prose-sm max-w-none` classes for markdown rendering

### New Files
None required - all changes will be made to existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove scrollbars from contracted card description
- Open `src/components/kanban/KanbanCard.jsx`
- Locate the description rendering section (lines 271-277)
- Remove the `max-h-48 overflow-y-auto` classes that add scrollbars
- Replace with a text truncation approach:
  - Use `line-clamp-3` or similar to show only 3-4 lines of text
  - Add `overflow-hidden` to prevent any scrolling
  - Keep the `whitespace-pre-wrap break-words` for proper text wrapping
- Test that the contracted card no longer shows vertical scrollbars

### Step 2: Enhance description styling in expanded modal with markdown rendering
- Open `src/components/kanban/CardExpandModal.jsx`
- Import `ReactMarkdown` from 'react-markdown' at the top of the file
- Locate the description rendering section (lines 294-302)
- Replace the current compact description display with an enhanced version:
  - Remove the `max-h-20 overflow-y-auto` constraint to allow full description display
  - Wrap the description in a ReactMarkdown component similar to PlanViewer
  - Apply proper markdown styling classes: `prose prose-sm max-w-none`
  - Add appropriate padding and spacing for better readability
  - Use a white background with subtle border for visual separation
  - Ensure the description section expands to show the full content without forced scrolling

### Step 3: Update CSS if needed for description styling
- Open `src/styles/kanban.css`
- Add a new CSS class `.description-content` if custom styling is needed beyond the existing `.message-content` styles
- Ensure markdown elements (headings, lists, code blocks, etc.) are properly styled in the modal context
- Verify that the styling doesn't conflict with existing card expand modal styles

### Step 4: Test the changes in development environment
- Start the development server using `npm run dev`
- Create or view a task with a long description that previously showed scrollbars
- Verify in contracted card state:
  - No vertical scrollbars are visible
  - Description is truncated cleanly with ellipsis or fade effect
  - Card appearance is clean and uncluttered
- Click to expand the card modal
- Verify in expanded modal state:
  - Description is fully visible without forced scrolling
  - Markdown formatting is rendered properly (if description contains markdown)
  - Text is readable with proper spacing and styling
  - The description section is visually distinct and easy to read

### Step 5: Run validation commands
- Execute all validation commands listed below to ensure zero regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript types are correct after changes
- `npm run lint` - Ensure code style is maintained
- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes

**Design Considerations:**
- The contracted card state should prioritize visual cleanliness - use text truncation instead of scrollbars
- The expanded modal state should prioritize readability - allow full content display with proper markdown rendering
- Consider using the existing `.message-content` styles from `index.css` as a foundation for markdown rendering

**Markdown Rendering:**
- ReactMarkdown is already available in the project (used in PlanViewer.jsx)
- The `prose` utility classes provide good default markdown styling
- Ensure descriptions with markdown syntax (headers, lists, code blocks) render correctly

**User Experience:**
- Users should not see scrollbars in the compact card view
- The expanded modal should make the description the focal point since it's "the base of your entire compute"
- The description should be easy to scan and read with proper visual hierarchy

**Testing Focus:**
- Test with various description lengths (short, medium, very long)
- Test with plain text descriptions
- Test with markdown-formatted descriptions (headers, lists, code blocks)
- Verify responsive behavior on different screen sizes
