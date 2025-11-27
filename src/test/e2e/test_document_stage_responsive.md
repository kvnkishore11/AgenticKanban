# E2E Test: Document Stage Responsive Rendering

Test that the document stage renders correctly across all viewport sizes without excessive height, wrapping issues, or visual cutoff.

## User Story

As a user of the Kanban board
I want the document stage to render properly at all viewport sizes
So that I can see and interact with all stages including the document stage regardless of screen size

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial kanban board at full desktop width (1920x1080)
3. **Verify** all 8 kanban stages are visible:
   - Backlog (gray, ClipboardList icon)
   - Plan (blue, Lightbulb icon)
   - Build (amber, Wrench icon)
   - Test (green, Flask icon)
   - Review (purple, Eye icon)
   - Document (indigo, FileText icon) - 6th column position
   - PR (pink, GitPullRequest icon)
   - Errored (red, AlertCircle icon)

4. **Verify** document stage positioning:
   - Document stage is in the 6th grid position (after Backlog + Plan + Build + Test + Review)
   - Visual separator line is visible between Document and PR stages
   - Document stage is in the same row as other SDLC stages

5. **Verify** document stage styling:
   - Has indigo color theme (bg-indigo-50, border-indigo-200)
   - FileText icon is visible in the header
   - Column has reasonable min-height (~40vh, not excessive like 75vh)
   - No excessive empty vertical space in the column
   - Content is not cut off vertically

6. Resize viewport to laptop width (1366x768)
7. Take a screenshot at laptop width
8. **Verify** document stage maintains proper rendering:
   - All 8 stages still visible in single row
   - Document stage position unchanged (6th column)
   - Separator still visible
   - Min-height is reasonable without excessive space

9. Resize viewport to tablet width (1024x768)
10. Take a screenshot at tablet width
11. **Verify** responsive grid layout:
    - Grid collapses to 4 columns per row
    - Separator is hidden (display: none)
    - Document stage is visible and properly styled
    - Document stage wraps to appropriate position
    - No visual disconnection or misalignment

12. Resize viewport to mobile width (768x1024)
13. Take a screenshot at mobile width
14. **Verify** mobile grid layout:
    - Grid collapses to 2 columns
    - Document stage is visible and maintains styling
    - Min-height reduced to ~35vh
    - Column content is readable and not cut off

15. Resize viewport to small mobile width (375x667)
16. Take a screenshot at small mobile width
17. **Verify** small mobile layout:
    - Grid is single column (1fr)
    - Document stage renders as full-width column
    - Min-height reduced to ~30vh
    - All content visible and accessible

## Success Criteria
- Document stage is visible at all viewport sizes (1920px, 1366px, 1024px, 768px, 375px)
- Document stage has correct indigo color styling at all sizes
- FileText icon is visible in document stage header
- Document stage is positioned correctly (6th in grid on desktop)
- Separator is visible on desktop/laptop (>1200px) and hidden on tablet/mobile (<1200px)
- Min-height constraints are reasonable:
  - Desktop: ~40vh (not 75vh)
  - Tablet: ~35vh (not 70vh)
  - Mobile: ~30vh (not 65vh)
- No excessive empty vertical space in document stage column
- Document stage content is not cut off vertically
- Document stage doesn't appear disconnected or misaligned when wrapping
- 5 screenshots are captured (desktop, laptop, tablet, mobile, small mobile)
