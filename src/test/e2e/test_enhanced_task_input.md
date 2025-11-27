# E2E Test: Enhanced Task Input Interface

Test the comprehensive enhanced task input interface with work item types, stage queueing, rich text editing, and image upload functionality.

## User Story

As a developer
I want to create tasks with work item types, queue stages, rich text descriptions, and image attachments
So that I can efficiently manage my development workflow with detailed context and proper categorization

## Test Steps

### Initial Setup and Modal Opening

1. Navigate to the `Application URL`
2. Take a screenshot of the initial Kanban board state
3. **Verify** the application loads correctly
4. Click the "+" button to create a new task
5. **Verify** the "Create New Task" modal opens
6. Take a screenshot of the enhanced task input modal
7. **Verify** modal shows enhanced interface with all new elements:
   - Optional title field (no asterisk)
   - Work Item Type radio buttons (Feature, Chore, Bug, Patch)
   - Queue Stages checkboxes (Plan, Implement, Test, Review, Document, PR)
   - Rich text editor with toolbar
   - Image upload dropzone

### Test Optional Title Field

8. **Verify** title field shows "(optional)" in label
9. **Verify** title field placeholder says "Enter task title (optional)..."
10. **Verify** title field is not marked as required (no asterisk)
11. Leave title field empty for now
12. Take a screenshot showing optional title field

### Test Work Item Type Selection

13. **Verify** "Feature" is selected by default
14. Click on "Bug" work item type
15. **Verify** "Bug" radio button becomes selected with red styling
16. Take a screenshot of Bug selection
17. Click on "Chore" work item type
18. **Verify** "Chore" radio button becomes selected with gray styling
19. Click on "Patch" work item type
20. **Verify** "Patch" radio button becomes selected with yellow styling
21. Click back on "Feature" work item type
22. **Verify** "Feature" radio button becomes selected with blue styling
23. Take a screenshot of Feature selection

### Test Stage Queue Selection

24. **Verify** "Plan" and "Implement" are selected by default
25. Click on "Test" checkbox to select it
26. **Verify** "Test" stage becomes selected with green indicator
27. Click on "Review" checkbox to select it
28. **Verify** "Review" stage becomes selected with purple indicator
29. Click on "Document" checkbox to select it
30. **Verify** "Document" stage becomes selected with indigo indicator
31. Click on "PR" checkbox to select it
32. **Verify** "PR" stage becomes selected with pink indicator
33. Take a screenshot showing all stages selected
34. Click on "Plan" checkbox to deselect it
35. **Verify** "Plan" stage becomes deselected
36. Click on "Plan" checkbox again to reselect it
37. Take a screenshot of final stage selection

### Test Rich Text Editor

38. Click in the description rich text editor
39. Type: "This is a **bold** text with *italic* formatting"
40. **Verify** text appears in the editor
41. Select the word "bold" and click the Bold button (B) in toolbar
42. **Verify** text becomes bold in the editor
43. Select the word "italic" and click the Italic button (I) in toolbar
44. **Verify** text becomes italic in the editor
45. Add a new line and type: "- First bullet point"
46. Add another line and type: "- Second bullet point"
47. **Verify** markdown formatting renders correctly in preview
48. Take a screenshot of rich text editor with formatted content

### Test Image Upload

49. Scroll down to the "Attachments" section
50. **Verify** dropzone shows "Drag & drop images here, or click to select"
51. **Verify** dropzone has dashed border and file size limit message
52. Take a screenshot of empty dropzone
53. Create a test image file or use an existing small image file
54. Drag and drop the image onto the dropzone (or click to select)
55. **Verify** image appears in preview grid below dropzone
56. **Verify** image shows thumbnail, name, and remove button on hover
57. Take a screenshot showing uploaded image preview
58. Add a second test image
59. **Verify** both images appear in the grid
60. Hover over first image and click the remove button (X)
61. **Verify** first image is removed from the grid
62. Take a screenshot showing one remaining image

### Test Form Validation

63. Clear the description field completely
64. Try to submit the form
65. **Verify** error message appears: "Task description is required"
66. **Verify** form does not submit
67. Take a screenshot of validation error
68. Uncheck all stage selections
69. Try to submit the form
70. **Verify** error message appears: "At least one stage must be selected"
71. Take a screenshot of stage validation error
72. Re-select "Plan" and "Implement" stages
73. Add description: "Test task with all features"
74. **Verify** error messages disappear

### Test Successful Task Creation

75. Add optional title: "Enhanced Task Input Test"
76. Ensure "Feature" work item type is selected
77. Ensure "Plan" and "Implement" stages are selected
78. Ensure description contains formatted text
79. Ensure one image is attached
80. Take a screenshot of completed form
81. Click "Create Task" button
82. **Verify** modal closes
83. **Verify** new task appears in the Backlog column
84. Take a screenshot of Kanban board with new task
85. Click on the new task to view details
86. **Verify** task shows:
    - Title: "Enhanced Task Input Test"
    - Work item type: Feature (blue badge)
    - Description with rich text formatting
    - Attached image
    - Queued stages: Plan, Implement
87. Take a screenshot of task details

### Test Responsive Design

88. Resize browser window to tablet size (768px width)
89. Open task creation modal again
90. **Verify** layout adapts responsively:
    - Work item types stack in 2 columns
    - Stage selections adapt to smaller grid
    - Modal stays usable
91. Take a screenshot of tablet layout
92. Resize browser window to mobile size (480px width)
93. **Verify** layout adapts to mobile:
    - Work item types in single column
    - Stage selections in single column
    - Modal fits screen properly
94. Take a screenshot of mobile layout
95. Resize browser back to desktop size

### Test Cancel and Close Functionality

96. Open task creation modal again
97. Fill in some data (title, description, select stages)
98. Click "Cancel" button
99. **Verify** modal closes without creating task
100. **Verify** no new task appears in Kanban board
101. Open task creation modal again
102. Fill in some data again
103. Click the X button in top-right corner
104. **Verify** modal closes without creating task
105. Take a screenshot of final Kanban board state

## Success Criteria

- Enhanced task input modal opens and displays all new features
- Optional title field works correctly (no required validation)
- Work item type selection works with visual feedback
- Stage queue selection allows multiple selections with proper indicators
- Rich text editor supports formatting (bold, italic, markdown)
- Image upload works with drag-and-drop and file selection
- Image preview shows thumbnails with remove functionality
- Form validation prevents submission with missing required fields
- Task creation succeeds with all enhanced data
- Created task displays all enhanced information correctly
- Responsive design works on tablet and mobile
- Cancel and close functionality works properly
- 15+ screenshots are taken documenting all features

## Additional Validation Points

- **Accessibility**: All form elements should be keyboard navigable
- **Performance**: Modal should open and close smoothly
- **Data Persistence**: Created tasks should persist after page refresh
- **Error Handling**: File upload should handle large files gracefully
- **Browser Compatibility**: Should work across modern browsers
- **Image Formats**: Should support PNG, JPG, GIF, WebP formats
- **File Size Limits**: Should enforce 5MB limit on image uploads
- **Markdown Rendering**: Rich text should render markdown correctly
- **State Management**: Form state should reset properly after creation/cancel