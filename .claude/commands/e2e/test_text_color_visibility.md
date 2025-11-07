# E2E Test: Text Color Visibility in WYSIWYG Editor

## Objective
Validate that all text in the WYSIWYG rich text editor (TipTap/ProseMirror) has proper color styling with good contrast, ensuring readability against the editor background.

## Prerequisites
- Frontend server running on http://localhost:5173
- Backend server running
- Browser automation tools available
- Bug fix for text color visibility has been applied to `src/index.css`

## Test Steps

### Step 1: Open Task Creation Modal
1. Navigate to http://localhost:5173
2. Click the "Add Task" button or trigger task creation
3. Verify the task edit modal opens
4. **Screenshot**: Capture the initial modal state with empty editor

### Step 2: Test Regular Paragraph Text Color
1. Click into the description field
2. Type "This is regular paragraph text that should be clearly visible"
3. Verify the text appears in dark gray color (#374151)
4. Verify the text has good contrast against the editor background
5. Verify the text is NOT invisible, too light, or difficult to read
6. **Screenshot**: Capture regular paragraph text with visible color

### Step 3: Test Heading Text Colors
1. Create a new line
2. Type "Heading Level 1"
3. Select the text
4. Click the H1 button in the toolbar
5. Verify the heading appears in darker gray color (#1f2937)
6. Verify the heading is clearly visible and darker than body text
7. **Screenshot**: Capture H1 heading with proper color

8. Create a new line
9. Type "Heading Level 2"
10. Select the text
11. Click the H2 button
12. Verify the heading appears in darker gray color (#1f2937)
13. **Screenshot**: Capture H2 heading with proper color

14. Create a new line
15. Type "Heading Level 3"
16. Select the text
17. Click the H3 button
18. Verify the heading appears in darker gray color (#1f2937)
19. **Screenshot**: Capture H3 heading with proper color

### Step 4: Test Bullet List Text Color
1. Create a new line
2. Click the Bullet List button
3. Type "First bullet item"
4. Press Enter
5. Type "Second bullet item"
6. Press Enter
7. Type "Third bullet item"
8. Verify all list items appear in dark gray color (#374151)
9. Verify the bullet points are visible
10. Verify list text has good contrast and is clearly readable
11. **Screenshot**: Capture bullet list with visible text color

### Step 5: Test Numbered List Text Color
1. Create a new line
2. Click the Numbered List button
3. Type "First numbered item"
4. Press Enter
5. Type "Second numbered item"
6. Press Enter
7. Type "Third numbered item"
8. Verify all numbered items appear in dark gray color (#374151)
9. Verify the numbers are visible
10. Verify list text has good contrast and is clearly readable
11. **Screenshot**: Capture numbered list with visible text color

### Step 6: Test Bold Text Color
1. Type " This is bold text" on a new line
2. Select the words "bold text"
3. Click the Bold button (B)
4. Verify the bold text inherits proper text color
5. Verify bold text is clearly visible with good contrast
6. **Screenshot**: Capture bold text with proper color visibility

### Step 7: Test Italic Text Color
1. Type " This is italic text" on a new line
2. Select the words "italic text"
3. Click the Italic button (I)
4. Verify the italic text inherits proper text color
5. Verify italic text is clearly visible with good contrast
6. **Screenshot**: Capture italic text with proper color visibility

### Step 8: Test Combined Formatting with Text Color
1. Create a new line
2. Type "Combined: bold, italic, and regular text"
3. Select "bold" and apply bold formatting
4. Select "italic" and apply italic formatting
5. Verify all text (bold, italic, regular) has proper color
6. Verify all text is clearly visible with consistent contrast
7. **Screenshot**: Capture mixed formatting with proper text colors

### Step 9: Verify Text Color Contrast Against Background
1. Review all the text in the editor
2. Verify the editor background is light (#f8fafc or similar)
3. Verify body text (#374151) provides excellent contrast
4. Verify heading text (#1f2937) is darker and provides emphasis
5. Verify NO text appears invisible, too light, or unreadable
6. Verify placeholder text (#adb5bd) is appropriately muted but visible
7. **Screenshot**: Capture full editor showing all text with proper contrast

### Step 10: Test Text Visibility in Different Editor States
1. Fill in task title and other required fields
2. Save the task
3. Close the modal
4. Find and click the saved task to edit it
5. Verify the description text is still clearly visible when reopened
6. Verify all formatting and text colors persist correctly
7. **Screenshot**: Capture reopened task showing text with proper visibility

### Step 11: Test Placeholder Text Color
1. Create a new task
2. Leave description field empty
3. Verify placeholder text "Enter description..." is visible in muted gray (#adb5bd)
4. Verify placeholder is distinguishable from actual content
5. Click into editor and start typing
6. Verify placeholder disappears and typed text appears in proper color (#374151)
7. **Screenshot**: Capture placeholder text and transition to regular text

## Success Criteria

### Must Pass
- ✅ Regular paragraph text appears in #374151 (dark gray) with excellent contrast
- ✅ Heading text (H1, H2, H3) appears in #1f2937 (darker gray) for emphasis
- ✅ Bullet list items appear in #374151 with clear visibility
- ✅ Numbered list items appear in #374151 with clear visibility
- ✅ Bold text has proper color and is clearly visible
- ✅ Italic text has proper color and is clearly visible
- ✅ Combined formatting maintains proper text colors
- ✅ NO text is invisible, too light, or difficult to read
- ✅ Text color provides excellent contrast against editor background (#f8fafc)
- ✅ Placeholder text is visible in muted gray (#adb5bd)
- ✅ Text colors persist correctly when task is reopened
- ✅ All screenshots show clearly visible text

### Color Specifications
- Body text (paragraphs, lists): `color: #374151;`
- Heading text (h1, h2, h3): `color: #1f2937;`
- Placeholder text: `color: #adb5bd;`
- Editor background: `background-color: #f8fafc;` (or similar light color)

## Expected Behavior
All text in the WYSIWYG editor should be clearly visible with excellent contrast against the background. Body text should be dark gray (#374151), headings should be darker (#1f2937), and all text should be immediately readable without any visibility issues.

## Edge Cases to Test
- Very long text blocks to verify consistent color
- Nested lists (bullets within bullets) for color inheritance
- Mixed formatting (bold + italic + heading) for color consistency
- Copy/paste formatted text from external sources
- Rapid typing to verify color applies immediately

## Failure Scenarios
If any of these occur, the test FAILS:
- Any text appears invisible or too light to read
- Text color is missing or defaults to black/inherit incorrectly
- Poor contrast between text and background
- Headings do not appear darker than body text
- List items do not have proper text color
- Bold or italic text loses proper color
- Placeholder text is invisible or too similar to content text
- Text colors do not persist when task is reopened

## Notes
- This test validates the bug fix for Issue #67 (text color visibility)
- The fix adds explicit `color` properties to `.ProseMirror` CSS classes in `src/index.css`
- Screenshots are critical to prove text is visible with proper contrast
- Test should be performed after applying CSS changes to lines 5-88 in `src/index.css`
- Colors must match the application's design system (same as `.message-content` styles)
