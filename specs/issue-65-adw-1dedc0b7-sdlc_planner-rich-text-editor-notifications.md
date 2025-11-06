# Chore: Remove Redundant Notification Checkbox and Add Rich Text Editor for Task Description

## Metadata
issue_number: `65`
adw_id: `1dedc0b7`
issue_json: `{"number":65,"title":"remove this send notification to agentic kanban wh...","body":"remove this send notification to agentic kanban when task is created. this is redundant. i want to give more space for input description vertically.  make the input description box so customised. i want to add some styling options just like gmail does like fonts. tabs, bullets , numbering etc, italics.....\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/7042c591-a552-4e9a-99db-819285a1fcc6)\n\n"}`

## Chore Description
This chore involves two main improvements to the task creation form:

1. **Remove the redundant notification checkbox**: The "Send notification to agentic kanban when task is created" checkbox needs to be removed from the TaskInput form to provide more vertical space for the description input.

2. **Implement a rich text editor**: Replace the plain textarea for task description with a rich text editor that provides Gmail-like formatting options including:
   - Font styling (bold, italic, underline)
   - Lists (bullets, numbering)
   - Text indentation (tabs)
   - Other common text formatting features

The project already has `@uiw/react-md-editor` available as a dependency, which provides markdown editing capabilities with a toolbar for formatting.

## Relevant Files
Use these files to resolve the chore:

- **src/components/forms/TaskInput.jsx** (Lines 429-463)
  - Contains the current plain textarea for description input (lines 429-443)
  - Contains the notification checkbox UI that needs to be removed (lines 445-463)
  - Handles form submission with notification preferences (lines 195-221)
  - This is the primary file where UI changes will be made

- **src/components/forms/TaskEditModal.jsx** (Lines 386-421)
  - Contains similar description textarea and notification checkbox for editing tasks
  - Should receive the same rich text editor treatment for consistency
  - Maintains the same notification logic structure as TaskInput

- **src/stores/kanbanStore.js** (Lines 342-445, 2216-2278)
  - `createTask()` function calls `sendProjectNotification()` after task creation
  - `sendProjectNotification()` checks if notifications are enabled before sending
  - The notification logic should remain intact in the backend, only the UI checkbox is being removed
  - No changes needed here - notification will be controlled by project-level settings only

- **src/services/storage/projectNotificationService.js** (Lines 537-613)
  - Handles the actual sending of notifications via WebSocket
  - `sendTicketNotification()` formats and sends notifications to project servers
  - No changes needed - this service layer remains unchanged

- **src/hooks/useProjectNotification.js** (Lines 233-258)
  - React hook for managing notification state
  - No changes needed - hook functionality remains the same

- **package.json** (Line 24)
  - Already includes `@uiw/react-md-editor` dependency
  - No additional package installation required

### New Files
None - all changes will be made to existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update TaskInput.jsx to remove notification checkbox and add rich text editor
- Remove the notification checkbox UI section (lines 445-463) that displays "Send notification to {project} when task is created"
- Remove the `enableNotifications` state variable and its initialization
- Replace the plain textarea description input (lines 429-443) with the MDEditor component from `@uiw/react-md-editor`
- Import the MDEditor component and necessary CSS: `import MDEditor from '@uiw/react-md-editor'`
- Configure the MDEditor with appropriate props:
  - `value={description}` to bind to the existing description state
  - `onChange={setDescription}` to update state
  - `height={300}` or similar to provide adequate vertical space
  - Configure toolbar with formatting options: bold, italic, lists, code, links, etc.
- Update the form submission handler (lines 195-221) to remove the `enableNotifications` parameter from the task creation payload
- Ensure the description field validation still works correctly with markdown content
- Add any necessary CSS styling to integrate the MDEditor with the existing form design

### Step 2: Update TaskEditModal.jsx with the same rich text editor
- Apply the same changes to TaskEditModal.jsx for consistency:
  - Remove notification checkbox section (lines 403-421)
  - Replace textarea with MDEditor component (lines 386-401)
  - Remove `enableNotifications` state and related logic
  - Update form submission to exclude notification preferences
- Ensure the MDEditor properly displays and edits existing task descriptions
- Test that markdown content is preserved when editing tasks

### Step 3: Verify notification behavior still works at project level
- Confirm that `kanbanStore.js` still calls `sendProjectNotification()` automatically after task creation
- Verify that project-level notification settings (`projectNotificationEnabled` in the store) still control whether notifications are sent
- Test that notifications are sent based on project configuration, not per-task preferences
- Ensure the notification system continues to work without the UI checkbox

### Step 4: Test the rich text editor functionality
- Test all formatting options in the MDEditor toolbar:
  - Bold, italic, underline text formatting
  - Bullet lists and numbered lists
  - Code blocks and inline code
  - Links and images (if applicable)
  - Headings and quotes
- Verify that markdown is properly rendered when viewing tasks on the Kanban board
- Test that the editor has sufficient height and doesn't feel cramped
- Ensure tab key behavior works appropriately (indentation vs focus management)

### Step 5: Update styling if needed
- Check if the MDEditor component integrates well with the existing TailwindCSS styling
- Add custom CSS in `src/styles/kanban.css` or inline styles if the editor needs visual adjustments
- Ensure the editor has proper focus states and borders matching the design system
- Verify the form layout looks clean without the notification checkbox
- Ensure adequate vertical space is provided for the description editor

### Step 6: Run validation commands
- Execute all validation commands to ensure zero regressions
- Fix any TypeScript errors if type definitions are needed for MDEditor
- Ensure the build completes successfully
- Verify all existing tests still pass

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript compilation succeeds with MDEditor imports
- `npm run lint` - Ensure code follows linting rules
- `npm run build` - Confirm production build completes successfully
- `npm run test` - Run all frontend tests to validate no regressions
- `cd server && uv run pytest` - Run server tests to validate backend functionality remains intact

## Notes

### Rich Text Editor Implementation
- The `@uiw/react-md-editor` package is already available in the project dependencies
- This editor provides a markdown-based rich text experience with a toolbar similar to Gmail's formatting options
- The editor supports preview mode, allowing users to see formatted output while editing
- Consider setting `preview="edit"` to show only the editor, or `preview="live"` to show split view

### Notification System Architecture
- Notifications are sent automatically after task creation via `sendProjectNotification()` in kanbanStore.js
- The notification system checks project-level settings (`projectNotificationEnabled`) to determine if notifications should be sent
- Removing the per-task notification checkbox simplifies the UX while maintaining functionality through project-level configuration
- No backend changes are required - only frontend UI updates

### Markdown Rendering
- Ensure that existing components that display task descriptions can render markdown properly
- The project uses `react-markdown` (package.json line 32) for rendering markdown content
- Kanban cards and task detail views should already support markdown rendering
- If not, may need to update display components to use `ReactMarkdown` component

### Vertical Space Optimization
- Removing the notification checkbox section (approximately 40-60px) provides more space
- Increasing the MDEditor height to 300-400px will give users ample room for detailed descriptions
- Consider making the editor height adjustable or responsive based on content

### Testing Considerations
- Test with existing tasks that have plain text descriptions to ensure backward compatibility
- Verify that markdown syntax is properly escaped/handled if users include special characters
- Test copy-paste functionality from external sources (Word, Google Docs, plain text)
- Ensure the editor performs well with large amounts of text

### CSS Integration
- The MDEditor may require importing its CSS: `import '@uiw/react-md-editor/dist/markdown-editor.css'`
- May need to override some default styles to match the application's color scheme
- Consider dark mode compatibility if the application supports it
