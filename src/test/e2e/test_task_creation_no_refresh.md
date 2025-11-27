# E2E Test: Task Creation Without Excessive Refresh

Test that creating a new task does not cause excessive app refreshing or console logging.

## User Story

As a user
I want to create a new task on the Kanban board
So that I can track work items without experiencing excessive page refreshes or console clutter

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial state
3. **Verify** the page title contains "AgenticKanban"
4. **Verify** core UI elements are present:
   - "New Task" button
   - Project selector or Kanban board

5. If project selector is visible, select the first available project
6. Take a screenshot after project selection
7. **Verify** the "New Task" button is visible

8. Evaluate JavaScript to capture console logs count before task creation:
   ```javascript
   window.__consoleLogCount = 0;
   const originalLog = console.log;
   console.log = function(...args) {
     window.__consoleLogCount++;
     originalLog.apply(console, args);
   };
   ```

9. Click the "New Task" button
10. **Verify** the task input form appears
11. Take a screenshot of the task input form

12. Fill in the task form:
    - Title: "Test Task - E2E Validation"
    - Description: "Testing that task creation does not cause excessive refreshing"
    - Select work item type (if available)

13. Take a screenshot of the filled form
14. Submit the task form by clicking the submit/create button
15. Wait for the task to appear on the board (allow 2-3 seconds for async operations)

16. **Verify** the newly created task appears on the Kanban board (in backlog column)
17. Take a screenshot of the task on the board

18. Evaluate JavaScript to check console log count:
    ```javascript
    return window.__consoleLogCount || 0;
    ```
19. **Verify** the console log count is less than 10 (reasonable threshold)
20. **Verify** no page reload or navigation occurred during task creation

21. Evaluate JavaScript to check for "[App] AgenticKanban initialized" logs:
    ```javascript
    // Count how many times the initialization log appears
    return (window.performance && window.performance.navigation.type === 0) ? 'initial_load' : 'reloaded';
    ```
22. **Verify** the page was not reloaded (should be 'initial_load')

23. Take a final screenshot of the completed state

## Success Criteria
- Task input form opens when "New Task" button is clicked
- Task form accepts input for title and description
- Task appears on the Kanban board after submission
- Console log count during task creation is less than 10
- Page does not reload or refresh during task creation
- No excessive "[App] AgenticKanban initialized" messages in console
- At least 5 screenshots are captured
- All verification steps pass

## Expected Behavior
- The app initializes once on page load
- Creating a task does not trigger re-initialization
- Console logs are minimal and relevant during task creation
- The user experience is smooth without visible lag or refresh
