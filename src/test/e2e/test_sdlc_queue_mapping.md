# E2E Test: SDLC Queue Stage Mapping

Test automatic mapping of SDLC queue stages to adw_sdlc_iso workflow.

## User Story

As a developer using the Agentic Kanban board
I want tasks with all SDLC stages to automatically map to adw_sdlc_iso
So that I can leverage comprehensive SDLC automation without manual configuration

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial kanban board state
3. Click "Create Task" or "+" button to open task creation modal
4. **Verify** the task creation modal is displayed
5. Take a screenshot of the task creation modal

### Test Case 1: Manual Selection of All SDLC Stages

6. Select "Feature" as work item type
7. In Queue Stages section, individually select all five SDLC stages:
   - Plan
   - Implement
   - Test
   - Review
   - Document
8. **Verify** all five stages are selected (highlighted)
9. Take a screenshot showing all SDLC stages selected
10. Enter "Test SDLC workflow mapping" in the description field
11. Click "Create Task" button
12. **Verify** task is created successfully
13. Take a screenshot of the created task

### Test Case 2: Full SDLC Quick Selection

14. Click "Create Task" again to open modal
15. **Verify** "Full SDLC" option is visible in Queue Stages section
16. Take a screenshot showing the Full SDLC option
17. Click "Full SDLC" quick selection button/checkbox
18. **Verify** all five SDLC stages are automatically selected:
   - Plan (selected)
   - Implement (selected)
   - Test (selected)
   - Review (selected)
   - Document (selected)
19. Take a screenshot showing auto-selected SDLC stages
20. Enter "Test Full SDLC quick selection" in description
21. Click "Create Task" button
22. **Verify** task is created with all SDLC stages

### Test Case 3: Partial SDLC Selection (Should Not Map)

23. Click "Create Task" to open modal
24. Select only three stages:
   - Plan
   - Implement
   - Test
25. **Verify** only three stages are selected
26. Take a screenshot of partial stage selection
27. Enter "Test partial stage selection" in description
28. Click "Create Task" button
29. **Verify** task is created (but should use dynamic workflow name, not sdlc_iso)

### Test Case 4: SDLC Plus Additional Stages

30. Click "Create Task" to open modal
31. Use "Full SDLC" quick selection
32. Additionally select "PR" stage
33. **Verify** six stages are selected (all SDLC + PR)
34. Take a screenshot showing SDLC + PR selection
35. Enter "Test SDLC with additional stages" in description
36. Click "Create Task" button
37. **Verify** task is created and still maps to adw_sdlc_iso

### Test Case 5: Toggle Behavior

38. Click "Create Task" to open modal
39. Click "Full SDLC" to select all stages
40. Manually deselect "Document" stage
41. **Verify** Full SDLC indicator is no longer active
42. **Verify** only four stages are selected
43. Take a screenshot of deselected state
44. Manually reselect "Document" stage
45. **Verify** all five SDLC stages are selected again
46. Take a final screenshot of the complete test state

## Success Criteria

- Task creation modal displays properly
- Full SDLC quick selection option is visible and functional
- Clicking Full SDLC selects all five stages: Plan, Implement, Test, Review, Document
- Manual selection of all SDLC stages works correctly
- Tasks with all SDLC stages are mapped to adw_sdlc_iso workflow
- Partial SDLC selection does not trigger sdlc_iso mapping
- SDLC stages plus additional stages still map to sdlc_iso
- Toggle behavior works correctly when stages are manually adjusted
- No errors occur during task creation
- At least 10 screenshots are captured documenting the test flow

## Verification Points

- Workflow name should be "adw_sdlc_iso" when all SDLC stages are selected
- Stage order independence: selecting stages in any order should still map to sdlc_iso
- Visual indicators properly reflect selection state
- Full SDLC option provides clear user feedback