# E2E Test: Markdown Editor WYSIWYG Functionality

Test the WYSIWYG (What You See Is What You Get) markdown editing functionality in the Agentic Kanban Board application.

## User Story

As a user
I want to edit command content in WYSIWYG mode
So that I can see rendered markdown while editing without seeing raw markdown symbols

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial kanban board state
3. **Verify** the page title contains "Agentic Kanban"
4. **Verify** the kanban board with stages is displayed
5. **Verify** there are command cards visible in the "Backlog" or other stages

6. Click on any command card to open the Commands Palette
7. Take a screenshot of the Commands Palette
8. **Verify** the Commands Palette modal is open
9. **Verify** command list is displayed with command names

10. Click on any command in the list to open the Command Editor
11. Take a screenshot of the Command Editor in default Preview mode
12. **Verify** the Command Editor modal is open
13. **Verify** the editor toolbar shows three mode buttons: "Preview", "Edit", "Raw"
14. **Verify** "Preview" mode is active by default (highlighted button)
15. **Verify** the content is displayed as rendered markdown (no raw markdown symbols visible)

16. Click the "Edit" button to switch to WYSIWYG mode
17. Take a screenshot of the Command Editor in Edit (Live) mode
18. **Verify** the "Edit" button is now highlighted/active
19. **Verify** the editor shows side-by-side editing with live preview
20. **Verify** the left panel shows raw markdown for editing
21. **Verify** the right panel shows live rendered preview
22. **Verify** both panels use light theme (white background, dark text)

23. In the left editor panel, add some test markdown content:
    ```
    # Test Header
    This is **bold text** and *italic text*.

    - List item 1
    - List item 2

    [Link example](https://example.com)
    ```
24. Take a screenshot after adding the test content
25. **Verify** the right panel immediately shows the rendered output:
    - Large header "Test Header"
    - Bold and italic text formatting
    - Bulleted list with proper styling
    - Formatted link
26. **Verify** no raw markdown symbols (*, #, [, ]) are visible in the right preview panel
27. **Verify** the editor maintains light theme throughout (no dark backgrounds)

28. Click the "Raw" button to test raw markdown mode
29. Take a screenshot of the Raw mode
30. **Verify** the "Raw" button is now highlighted/active
31. **Verify** only the raw markdown editor is shown (no preview panel)
32. **Verify** raw markdown symbols are visible in this mode

33. Click the "Preview" button to test read-only preview mode
34. Take a screenshot of the Preview mode
35. **Verify** the "Preview" button is now highlighted/active
36. **Verify** only the rendered preview is shown (no editor)
37. **Verify** the content is beautifully rendered with proper styling
38. **Verify** no editing interface is visible in this mode

39. Click the "Edit" button again to return to WYSIWYG mode
40. **Verify** the side-by-side WYSIWYG editing view is restored
41. **Verify** all previous test content is still present and properly formatted

42. Test the Save functionality by clicking the "Save" button
43. **Verify** a success message appears
44. **Verify** the content persists after saving

45. Close the Command Editor by clicking the "X" button
46. **Verify** the editor closes and returns to the Commands Palette

## Success Criteria
- Command Editor opens successfully
- Three editing modes are available: Preview, Edit (WYSIWYG), Raw
- Edit mode shows side-by-side editing with live preview
- Right panel renders markdown without showing raw symbols
- Live preview updates immediately when typing
- Light theme is maintained throughout all modes
- Raw mode shows markdown symbols for technical editing
- Preview mode shows read-only rendered output
- Save functionality works correctly
- All content persists correctly
- 8 screenshots are taken documenting the functionality