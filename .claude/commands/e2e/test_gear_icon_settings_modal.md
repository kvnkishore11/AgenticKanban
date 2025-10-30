# E2E Test: Gear Icon Settings Modal Functionality

Test gear icon settings modal functionality in the AgenticKanban application.

## User Story

As a user
I want to access application settings through the gear icon in the navigation
So that I can configure project notifications and other application preferences

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial state
3. **Verify** the page title contains "AgenticKanban"
4. **Verify** core UI elements are present:
   - AgenticKanban header
   - Gear/settings icon in top navigation
   - Project selector (if no project selected)

5. **Verify** gear icon is clickable and visible
6. Click the gear/settings icon in the top navigation
7. Take a screenshot of the settings modal opening
8. **Verify** settings modal opens with:
   - Modal title "Settings"
   - Close button (X)
   - Navigation tabs ("Notifications", "General")
   - Settings content area

9. **Verify** "Notifications" tab is active by default
10. **Verify** notification settings section contains:
    - "Project Notifications" toggle switch
    - Project-specific configuration areas (if projects exist)
    - Notification status indicators

11. Take a screenshot of the notifications settings
12. Click the "General" tab
13. **Verify** general settings section displays:
    - "Coming Soon" placeholder content
    - Monitor icon
    - Future settings message

14. Take a screenshot of the general settings tab
15. Click back to "Notifications" tab
16. **Verify** can toggle project notifications on/off
17. Toggle the project notifications switch
18. **Verify** the switch state changes visually

19. **Verify** modal can be closed via close button
20. Click the X close button
21. **Verify** modal closes and returns to main application view
22. Take a screenshot of the closed modal state

23. **Verify** modal can be opened again
24. Click gear icon again to reopen settings
25. **Verify** settings modal opens again successfully

26. **Verify** ESC key closes modal
27. Press ESC key
28. **Verify** modal closes

## Success Criteria
- Gear icon is clickable and visible
- Settings modal opens when gear icon is clicked
- Modal contains proper structure (title, tabs, content, close button)
- Notifications tab shows project notification settings
- General tab shows placeholder content
- Project notifications toggle works
- Modal can be closed via close button
- Modal can be closed via ESC key
- Modal can be reopened after closing
- Settings persist properly
- 5 screenshots are taken

## Expected Elements
- Gear icon: `button` with Settings icon
- Settings modal: Modal with "Settings" title
- Notifications tab: Tab with Bell icon and "Notifications" text
- General tab: Tab with Monitor icon and "General" text
- Project notifications toggle: Toggle switch component
- Close button: X button in modal header