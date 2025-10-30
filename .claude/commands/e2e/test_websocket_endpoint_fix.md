# E2E Test: WebSocket Endpoint Configuration Fix

Test WebSocket endpoint configuration and UI location fixes in the AgenticKanban application.

## User Story

As a user
I want WebSocket notifications to work correctly with the proper endpoint
So that I can receive task notifications in my development environment without UI confusion

## Test Steps

### 1. WebSocket Endpoint Validation

1. Navigate to the `Application URL`
2. Take a screenshot of the initial state
3. **Verify** the page title contains "AgenticKanban"
4. Select a project from the project selector
5. Click the Settings icon next to the project name in ProjectSelector
6. **Verify** the notification configuration panel opens
7. Configure port 8002 in the notification settings
8. Take a screenshot of the notification configuration
9. Click "Test Connection" button
10. **Verify** connection test attempts to connect to `ws://localhost:8002/ws/trigger` (check browser dev tools network tab)
11. **Verify** connection test does NOT attempt `ws://localhost:8002` (without `/ws/trigger`)
12. Take a screenshot of the connection test result

### 2. UI Location Validation

13. Close the notification configuration panel
14. Click "Create New Task" button to open task creation form
15. Take a screenshot of the task creation form
16. **Verify** the task creation form does NOT contain:
    - "Project Notifications" section with detailed configuration
    - "Configure" button for notifications
    - "Preview notification data" button
    - ProjectPortConfiguration component
17. **Verify** the task creation form DOES contain:
    - Simple notification checkbox: "Send notification to [project] when task is created"
    - Text: "Configure notification settings in project settings"
18. **Verify** notification settings are ONLY accessible via ProjectSelector settings icon

### 3. End-to-End Notification Functionality

19. In the task creation form, ensure notification checkbox is checked
20. Fill in task details:
    - Description: "Test WebSocket endpoint fix"
    - Work Item Type: "Feature"
    - Queue Stages: "plan", "implement"
21. Click "Create Task" button
22. **Verify** task is created successfully
23. **Verify** if WebSocket server is running on port 8002, notification is sent to `ws://localhost:8002/ws/trigger`
24. Take a screenshot of the created task in the kanban board
25. **Verify** the task appears in the backlog

### 4. Notification Configuration Access

26. Return to project selector
27. **Verify** Settings icon is visible next to each project
28. Click Settings icon for the selected project
29. **Verify** notification configuration opens with:
    - Port configuration field
    - Host configuration field
    - Enable/Disable toggle
    - Test Connection button
    - Connect/Disconnect button
30. Take a screenshot of the full notification configuration

## Success Criteria

- WebSocket connections use `/ws/trigger` endpoint path
- Task creation form has simplified notification UI only
- Detailed notification configuration is only in ProjectSelector settings
- Task creation successfully triggers notifications via kanban store
- Settings icon provides access to full notification configuration
- No "Configure" button exists in task creation form
- Connection tests validate proper endpoint construction
- 5 screenshots are taken

## Expected WebSocket URLs

- ✅ Correct: `ws://localhost:8002/ws/trigger`
- ❌ Incorrect: `ws://localhost:8002`

## Validation Commands

After manual testing, run these commands to validate code quality:
- `npm run lint` - Validate code quality
- `npm run build` - Ensure no build errors
- `npm run test` - Run unit tests