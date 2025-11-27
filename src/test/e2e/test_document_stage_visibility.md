# E2E Test: Document Stage Visibility

Test that the document stage column is fully visible and not cut off vertically in the kanban board.

## User Story

As a user
I want to see the full content of the document stage column
So that I can view all tasks in the document stage without vertical cutoff

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial kanban board layout
3. **Verify** the page loads successfully with the kanban board visible
4. **Verify** all 8 stages are present and visible:
   - Backlog (1st column, slate color)
   - Plan (2nd column, blue color)
   - Build (3rd column, green color)
   - Test (4th column, purple color)
   - Review (5th column, amber color)
   - Document (6th column, indigo color)
   - PR (7th column, pink color)
   - Errored (8th column, red color)

5. **Verify** the visual separator is present between SDLC stages (backlog through document) and Other stages (PR and errored)
6. Take a screenshot focused on the document stage column
7. **Verify** the document stage column header is visible with:
   - FileText icon
   - "Document" title
   - Task count badge

8. **Verify** the document stage column body is fully visible and not cut off
9. **Verify** the document stage column has proper scrolling if content exceeds viewport
10. **Verify** the backlog stage is in the first position (as required)
11. Take a screenshot of the full board to prove layout integrity
12. **Verify** no vertical cutoff occurs on the document stage
13. **Verify** all stage columns have consistent height behavior
14. Take a screenshot showing all columns at once

## Success Criteria
- All 8 stages render correctly
- Document stage (6th column) is fully visible
- No vertical cutoff on any stage column
- Backlog stage remains in first position
- Visual separator between SDLC and Other stages is present
- Stage columns can scroll if content exceeds viewport
- Layout remains consistent across all columns
- 3 screenshots are taken showing: initial board, document stage focus, and full board layout
