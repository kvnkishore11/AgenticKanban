# E2E Test: Project Navigation and Browse Functionality

Test project selection, navigation, and project addition functionality in the AgenticKanban application.

## User Story

As a user
I want to select a project from my recent projects and navigate into it
So that I can start working with my kanban board

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial project selection page
3. **Verify** the page shows "Select a Project" heading
4. **Verify** core UI elements are present:
   - "Recent Projects" section
   - "Add New Project" section
   - "Browse" button
5. **Verify** at least one project card is displayed in the Recent Projects section
6. Take a screenshot of the project cards

7. Click on the first available project card
8. **Verify** the page navigates to the kanban board (URL changes, board elements appear)
9. **Verify** the kanban board shows:
   - Project name in header
   - Logo in header (for navigation back)
   - Kanban columns (To Do, In Progress, Done, etc.)
10. Take a screenshot of the kanban board

11. Click the logo or "home" button to return to project selection
12. **Verify** the page navigates back to the project selection page
13. **Verify** "Select a Project" heading is visible again
14. Take a screenshot confirming return to project selection

15. Click the "Browse" button to add a new project
16. **Verify** the new project form appears with:
    - Project Name input field
    - Project Path input field
    - Add Project button
17. **Verify** there is NO "Validate Project" button
18. Take a screenshot of the add project form

19. Enter test data in the form:
    - Project Name: "Test Project"
    - Project Path: "/test/path"
20. **Verify** the "Add Project" button is enabled
21. Take a screenshot of the filled form

## Success Criteria
- Project selection page loads correctly
- Project cards are displayed and clickable
- Clicking a project card navigates to the kanban board
- Kanban board displays project information
- Logo/home button returns to project selection
- Browse button opens the add project form
- Add project form does NOT show validation button or validation status indicators
- Add Project button is enabled when both fields have values
- 6 screenshots are taken
