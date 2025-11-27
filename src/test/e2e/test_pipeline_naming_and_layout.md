# E2E Test: Pipeline Naming and Layout Changes

Test the pipeline naming convention and UI layout improvements in the Agentic Kanban Board application.

## User Story

As a user
I want to create tasks with dynamic pipeline names based on selected stages
And I want an optimized stage selection layout with simple text input
So that I can efficiently create tasks with properly named pipelines

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial kanban board state
3. **Verify** the page title contains "Agentic Kanban"
4. **Verify** core UI elements are present:
   - "Create New Task" button
   - Kanban board with stage columns

5. Click the "Create New Task" button
6. Take a screenshot of the task creation modal
7. **Verify** the task creation modal opens with required fields:
   - Optional title field
   - Work item type selection
   - Stage selection area
   - Description field
   - Image upload area

8. **Verify** stage selection layout displays in a single row (flex layout, not grid)
9. **Verify** description field is a simple textarea (not markdown editor)

10. Test dynamic pipeline naming with first combination:
    - Select stages: Plan, Implement, Test
    - Enter description: "Test task for plan → implement → test pipeline"
    - Take a screenshot of the form with these selections

11. Submit the task by clicking "Create Task"
12. **Verify** the task appears in the backlog column
13. Click on the created task to expand details
14. **Verify** the pipeline name displays as "ADW: Plan → Implement → Test"
15. Take a screenshot of the expanded task showing the pipeline name

16. Create a second task to test different pipeline naming:
    - Click "Create New Task" again
    - Select stages: Plan, Implement, Review, Document, PR
    - Enter description: "Test task for full workflow pipeline"
    - Submit the task

17. **Verify** the second task appears with pipeline name "ADW: Plan → Implement → Review → Document → Pr"
18. Take a screenshot of both tasks showing different pipeline names

19. Test image upload and annotation functionality:
    - Click "Create New Task" again
    - Select stages: Plan, Test
    - Enter description: "Testing image annotation feature"
    - Upload an image file (if available) or verify upload area is present
    - Take a screenshot of the image upload section

20. **Verify** image upload functionality is present and working
21. Cancel the modal and take a final screenshot of the kanban board

## Success Criteria
- Stage selection displays in a single horizontal row (flex layout)
- Description field is a simple textarea without markdown editor
- Tasks created with stages [Plan, Implement, Test] show pipeline name "ADW: Plan → Implement → Test"
- Tasks created with stages [Plan, Implement, Review, Document, PR] show pipeline name "ADW: Plan → Implement → Review → Document → Pr"
- Image upload area is present and functional
- All UI elements are responsive and accessible
- 6+ screenshots are taken documenting the functionality

## Expected Results
- Dynamic pipeline names are generated correctly based on selected stages
- Stage selection layout is optimized for single-row display
- Description field uses simple textarea instead of markdown editor
- Image upload functionality is available and supports annotations
- All changes maintain existing functionality while improving usability