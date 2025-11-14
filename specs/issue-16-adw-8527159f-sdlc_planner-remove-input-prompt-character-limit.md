# Chore: Remove Input Prompt Character Limit

## Metadata
issue_number: `16`
adw_id: `8527159f`
issue_json: `{"number":16,"title":"for the description where i write my input prompt...","body":"for the description where i write my input prompt seems like there is some limitation of some characters. please remove the limit we have there. I wnat to past long passages sometimes it is throwing some error…"}`

## Chore Description
Remove the 2000-character limit on task descriptions in the input prompt field. Users are currently unable to paste long passages into the task description field due to a character validation constraint that throws an error when descriptions exceed 2000 characters. This limitation prevents users from providing detailed task descriptions or pasting documentation/specifications that may be longer than 2000 characters.

The current implementation:
- Uses TipTap WYSIWYG rich text editor for task descriptions
- Displays character count to users but doesn't prevent typing beyond the limit
- Validates description length on form submission
- Shows error "Task description must be less than 2000 characters" when limit is exceeded
- Prevents task creation/editing when description is too long

## Relevant Files
Use these files to resolve the chore:

### Files to Modify

- **src/stores/kanbanStore.js** (lines 565-567)
  - Contains the validation logic that enforces the 2000-character limit
  - The `validateTask()` function checks: `if (task.description && task.description.length > 2000)`
  - This is the primary file that needs modification to remove the character limit constraint

- **src/components/ui/RichTextEditor.jsx** (lines 75, 151-152, 442)
  - Implements the TipTap rich text editor with CharacterCount extension
  - Displays character count to users in the editor footer
  - Currently shows character count for informational purposes
  - May need review to ensure character counting doesn't cause performance issues with very long text

- **src/components/forms/TaskInput.jsx** (lines 192, 202, 421-425)
  - Uses RichTextEditor component for task description input
  - Converts HTML to plain text before validation: `htmlToPlainText(description).trim()`
  - Calls `validateTask()` which currently checks the 2000-character limit
  - May need testing to ensure long descriptions work properly in the create flow

- **src/components/forms/TaskEditModal.jsx** (lines 186, 195, 377-381)
  - Uses RichTextEditor component for editing task descriptions
  - Converts HTML to plain text before validation
  - Calls `validateTask()` which currently checks the 2000-character limit
  - May need testing to ensure long descriptions work properly in the edit flow

### Files for Testing/Validation

- **app/server/tests/** (backend tests directory)
  - Need to verify that backend API can handle long task descriptions
  - Ensure no database constraints or API payload size limits that would block long descriptions

- **src/utils/htmlUtils.js**
  - Contains `htmlToPlainText()` conversion utility
  - Should be reviewed to ensure it handles very long HTML content efficiently

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove Character Limit Validation
- Open `src/stores/kanbanStore.js`
- Locate the validation block at lines 565-567
- Remove or comment out the character limit check:
  ```javascript
  if (task.description && task.description.length > 2000) {
    errors.push('Task description must be less than 2000 characters');
  }
  ```
- Save the file

### Step 2: Verify RichTextEditor Performance with Long Text
- Open `src/components/ui/RichTextEditor.jsx`
- Review the CharacterCount extension usage (line 75)
- Review the character count display logic (lines 151-152, 442)
- Ensure the editor can handle very long text without performance degradation
- Consider if character count should continue to be displayed for informational purposes (no changes needed, just verification)

### Step 3: Test htmlToPlainText Utility with Long Content
- Open `src/utils/htmlUtils.js`
- Review the `htmlToPlainText()` function implementation
- Ensure it can efficiently convert very long HTML content (multiple pages) to plain text
- Verify no hidden character limits or performance issues in the conversion logic

### Step 4: Verify Backend Can Handle Long Descriptions
- Navigate to `app/server/`
- Check the task model/schema to ensure there are no database column length constraints on the description field
- Review API endpoint payload size limits
- Ensure WebSocket message size can accommodate long descriptions for real-time updates
- If any backend constraints exist, document them or remove them

### Step 5: Manual Testing - Create Task with Long Description
- Start the application (frontend + backend)
- Navigate to the Kanban board
- Click "Add Task" to open the TaskInput modal
- Paste a very long passage (5000+ characters) into the description field
- Verify the character count displays correctly
- Submit the form and verify the task is created successfully
- Verify no errors are thrown in the browser console or backend logs

### Step 6: Manual Testing - Edit Task with Long Description
- Open an existing task for editing using TaskEditModal
- Replace the description with a very long passage (5000+ characters)
- Verify the character count displays correctly
- Save the changes and verify the task updates successfully
- Verify the long description displays correctly in the card and expanded modal views

### Step 7: Test Edge Cases
- Test with extremely long descriptions (20,000+ characters) to identify any practical limits
- Test with descriptions containing special characters, emojis, and rich formatting
- Test copy/paste functionality with various content sources (Word docs, web pages, etc.)
- Verify WebSocket real-time updates work correctly with long descriptions
- Verify task export/import functionality handles long descriptions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript types are correct after removing validation
- `npm run lint` - Ensure code style is consistent
- `cd app/server && uv run pytest` - Run server tests to validate backend handles long descriptions with zero regressions
- Manual validation: Create and edit tasks with 5000+ character descriptions without errors

## Notes
- The 2000-character limit was likely implemented to prevent database issues or performance problems, but the user needs support for longer descriptions
- After removing the limit, monitor for:
  - Database storage constraints (ensure TEXT or LONGTEXT column types are used)
  - API payload size limits (ensure backend can accept large requests)
  - WebSocket message size limits (ensure real-time updates work with long content)
  - Frontend rendering performance (ensure long descriptions don't slow down the UI)
- Consider implementing a soft warning (not a hard limit) at 10,000+ characters to alert users about potential performance impacts
- The RichTextEditor already has CharacterCount extension enabled, so users can see how long their descriptions are
- Keep the required validation (`task.description.trim().length === 0`) but remove only the maximum length check
- Test thoroughly with very long content (10,000+ characters) to ensure the entire system handles it gracefully
