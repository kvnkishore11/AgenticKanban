# E2E Test: ADW ID Autocomplete in TaskInput

Test the ADW ID autocomplete dropdown functionality in the TaskInput component.

## User Story

As a user creating a new task
I want to see an autocomplete dropdown with all existing ADW IDs and their descriptions
So that I can easily discover and reference previous work without manually typing ADW IDs

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial state
3. **Verify** the kanban board is visible
4. Click the "Add Task" or "+" button to open the TaskInput modal
5. **Verify** the "Create New Task" modal appears

6. Scroll to the ADW ID input field
7. Take a screenshot showing the ADW ID input field
8. **Verify** the ADW ID input field is present with label "ADW ID Reference (optional)"
9. **Verify** the input has placeholder text "Search or enter ADW ID..."

10. Click the ADW ID dropdown toggle button (chevron icon)
11. **Verify** the autocomplete dropdown opens
12. Take a screenshot of the dropdown with ADW IDs
13. **Verify** the dropdown displays existing ADW IDs with metadata:
    - ADW ID (8-character identifier)
    - Issue class badge (feature/bug/chore)
    - Issue number
    - Issue title
    - Branch name

14. Type a search query in the ADW ID input (e.g., "e2a")
15. **Verify** the dropdown filters and shows matching ADW IDs only
16. Take a screenshot of the filtered results

17. Select an ADW ID from the dropdown by clicking on it
18. **Verify** the selected ADW ID appears in the input field
19. Take a screenshot showing the selected ADW ID
20. **Verify** a validation success message appears (green checkmark)

21. Click the clear button (X icon) next to the input
22. **Verify** the ADW ID field is cleared

23. Type a custom ADW ID manually (e.g., "testid12")
24. **Verify** the input accepts manual entry
25. Take a screenshot of manual entry

26. Test keyboard navigation:
    - Open the dropdown again
    - Press Arrow Down key multiple times
    - **Verify** selection moves down through items
    - Press Arrow Up key
    - **Verify** selection moves up
    - Press Enter key
    - **Verify** the selected item is chosen

27. Test edge cases:
    - Clear the field
    - Type a non-existent ADW ID
    - **Verify** dropdown shows "No matching ADW IDs found" message
    - Take a screenshot of the empty state

28. Fill out the rest of the form:
    - Add a description
    - Select work item type
    - Select stages

29. Click "Create Task"
30. **Verify** the task is created with the ADW ID
31. Take a final screenshot

## Success Criteria
- ADW ID autocomplete dropdown displays when clicked
- Existing ADW IDs are shown with rich metadata (issue class, title, branch)
- Search/filtering works in real-time as user types
- Keyboard navigation (Arrow Up/Down, Enter) functions correctly
- Selected ADW ID is populated in the input field
- Manual entry of ADW IDs still works
- Clear button removes the selected ADW ID
- Form validation provides feedback for ADW ID format
- Task is created successfully with the selected ADW ID
- At least 7 screenshots are captured
