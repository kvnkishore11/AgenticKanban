# E2E Test: Image Support in Ticket Creation

Test image upload and annotation functionality in AgenticKanban ticket creation flow.

## User Story

As a developer using AgenticKanban
I want to attach images with annotations when creating tickets
So that the AI system can use visual context to better understand and implement my requirements

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial kanban board
3. **Verify** the "+" button (Add Task button) is visible
4. Click the "+" button to open the task creation modal
5. **Verify** the task creation modal appears with:
   - Title field
   - Description field
   - Upload image button (camera icon or image upload area)
   - Submit/Create button
6. Enter title: "Feature request with visual mockup"
7. Enter description: "Implement this UI design based on the attached mockup"
8. Take a screenshot of the filled form
9. Click the image upload button/area
10. Upload a test image file (prepare a test image beforehand)
11. **Verify** the image preview appears in the modal
12. Take a screenshot showing the uploaded image preview
13. Click on the image to add annotation (if annotation feature is available)
14. Add annotation text: "Focus on this button design"
15. Take a screenshot showing the image with annotation
16. Click the Submit/Create button
17. **Verify** the new task appears on the kanban board
18. Take a screenshot of the kanban board with the new task
19. Open browser developer tools to Network tab
20. **Verify** WebSocket message contains image data in the payload
21. Take a screenshot of the WebSocket payload showing image data
22. **Verify** the task card shows an image indicator or thumbnail
23. Click on the created task to view details
24. **Verify** the image and annotations are preserved in the task details
25. Take a screenshot of the task details with image

## Success Criteria
- Image upload functionality works correctly
- Image preview displays after upload
- Annotations can be added to images (if feature exists)
- Task is created with image attached
- WebSocket payload includes image data
- Image is visible in task details after creation
- No errors occur during the process
- At least 7 screenshots are captured

## Test Data Requirements
- A sample test image file (PNG or JPG)
- The image should be under 1MB for testing
- Consider using a simple wireframe or mockup image