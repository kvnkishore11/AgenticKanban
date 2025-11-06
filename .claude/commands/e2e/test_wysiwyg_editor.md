# E2E Test: WYSIWYG Editor

## Objective
Validate that the WYSIWYG editor allows users to format text with direct visual preview, without markdown syntax, and submits content as plain text.

## Prerequisites
- Frontend server running on http://localhost:5173
- Backend server running
- Browser automation tools available

## Test Steps

### Step 1: Open Task Creation Modal
1. Navigate to http://localhost:5173
2. Click the "Add Task" button or trigger task creation
3. Verify the task edit modal opens
4. **Screenshot**: Capture the initial modal state

### Step 2: Verify WYSIWYG Editor is Present
1. Locate the description field in the task edit modal
2. Verify that it contains a rich text editor with formatting toolbar
3. Verify toolbar has buttons for: Bold, Italic, H1, H2, H3, Bullet List, Numbered List
4. Verify NO markdown editor interface is present (no markdown preview toggle)
5. **Screenshot**: Capture the editor with toolbar visible

### Step 3: Test Bold Formatting
1. Type "This is bold text" in the description field
2. Select the word "bold"
3. Click the Bold button (B) in the toolbar
4. Verify the word "bold" appears as **bold** immediately (not as **bold** markdown syntax)
5. **Screenshot**: Capture the bold text formatted inline

### Step 4: Test Italic Formatting
1. Type " and italic text" in the description field
2. Select the word "italic"
3. Click the Italic button (I) in the toolbar
4. Verify the word "italic" appears as *italic* immediately (not as *italic* markdown syntax)
5. **Screenshot**: Capture the italic text formatted inline

### Step 5: Test Heading Formatting
1. Create a new line
2. Type "Heading Level 1"
3. Select the text
4. Click the H1 button in the toolbar
5. Verify text appears larger/styled as heading immediately
6. **Screenshot**: Capture the heading formatted inline

### Step 6: Test Bullet List
1. Create a new line
2. Click the Bullet List button
3. Type "First item"
4. Press Enter
5. Type "Second item"
6. Press Enter
7. Type "Third item"
8. Verify bullet points appear immediately as formatted list (not as markdown "- item")
9. **Screenshot**: Capture the bullet list with visual bullets

### Step 7: Test Numbered List
1. Create a new line
2. Click the Numbered List button
3. Type "First"
4. Press Enter
5. Type "Second"
6. Press Enter
7. Type "Third"
8. Verify numbers appear immediately as formatted list (not as markdown "1. item")
9. **Screenshot**: Capture the numbered list with visual numbers

### Step 8: Verify Direct Preview (No Toggle Needed)
1. Review the editor
2. Verify ALL formatted text is visible directly in the editor
3. Verify there is NO preview toggle button
4. Verify there is NO separate preview pane
5. Verify users can see formatting applied immediately as they type
6. **Screenshot**: Capture full editor showing all formatting applied inline

### Step 9: Save Task and Verify Plain Text Submission
1. Fill in other required fields (title, stage, etc.)
2. Open browser DevTools Network tab
3. Click Save button
4. Inspect the network request payload for task creation
5. Verify the description field contains PLAIN TEXT (not HTML, not markdown)
6. Verify formatting is converted to plain text (e.g., "This is bold text and italic text")
7. **Screenshot**: Capture network request showing plain text payload

### Step 10: Reopen Task and Verify Persistence
1. Close the task edit modal
2. Find the saved task in the Kanban board
3. Click to view task details
4. Verify description displays correctly
5. Edit the task again
6. Verify description still shows in editor
7. **Screenshot**: Capture reopened task with description displayed

### Step 11: Test Empty Description (Placeholder)
1. Create a new task
2. Leave description field empty
3. Verify placeholder text "Enter description..." is visible
4. Click into the editor
5. Verify cursor is ready for input
6. **Screenshot**: Capture placeholder text in empty editor

## Success Criteria

### Must Pass
- ✅ WYSIWYG editor is present with formatting toolbar
- ✅ NO markdown editor or markdown syntax is visible
- ✅ Bold formatting applies immediately (visual bold, not **markdown**)
- ✅ Italic formatting applies immediately (visual italic, not *markdown*)
- ✅ Heading formatting applies immediately (larger text, not # markdown)
- ✅ Bullet list creates visual bullets immediately (not - markdown)
- ✅ Numbered list creates visual numbers immediately (not 1. markdown)
- ✅ All formatting is visible directly in editor (no preview toggle)
- ✅ Description is submitted as PLAIN TEXT (not HTML, not markdown)
- ✅ Saved descriptions display correctly when reopened
- ✅ Placeholder text appears when editor is empty

### Nice to Have
- Editor matches existing UI design
- Toolbar buttons have hover states
- Editor is responsive on different screen sizes
- Copy/paste works correctly

## Expected Behavior
The user should be able to format text with toolbar buttons and see the formatted result immediately in the editor, without needing to write markdown syntax or toggle a preview mode. The description should be stored and submitted as plain text for backend compatibility.

## Edge Cases to Test
- Very long text with multiple formatting styles
- Paste formatted text from external source
- Rapid formatting changes
- Undo/redo functionality
- Select all and delete

## Failure Scenarios
If any of these occur, the test FAILS:
- Markdown syntax appears in the editor (e.g., **bold**, *italic*, # heading)
- Formatting requires toggling a preview mode
- Description is submitted as HTML or markdown (not plain text)
- Editor does not respond to toolbar button clicks
- Placeholder text does not appear when empty

## Notes
- This test validates the complete replacement of MDEditor with a true WYSIWYG experience
- Screenshots are critical to prove visual formatting appears inline
- Network inspection is critical to prove plain text submission
