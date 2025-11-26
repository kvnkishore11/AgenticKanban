# Chore: Testing All Phase Colors Matching

## Metadata
issue_number: `1`
adw_id: `8904f50f`
issue_json: `{"number":1,"title":"testing all teh phases colours matching or not","body":"testing all teh phases colours matching or not"}`

## Chore Description
This chore involves comprehensive testing and validation of phase/stage color consistency across the entire AgenticKanban application. The application uses a brutalist design theme with specific color schemes for different workflow stages (plan, build, test, review, document, etc.). We need to verify that:

1. All phase colors are consistently defined across CSS files
2. Phase colors match between Kanban column headers and stage progression indicators
3. Phase tab colors in modals match the corresponding column colors
4. Stage progression badge colors align with the brutalist theme
5. There are no color mismatches or inconsistencies in phase visualizations

The goal is to ensure a cohesive visual experience where users can immediately recognize which phase a task is in based on consistent color coding throughout the UI.

## Relevant Files
Use these files to resolve the chore:

- **src/styles/brutalist-theme.css** (lines 401-441, 1217-1224)
  - Contains column-specific header background colors for all stages (backlog, plan, build, test, review, document, ready-to-merge, errored)
  - Defines left border stripe colors for columns
  - Primary source of truth for phase colors in the brutalist theme

- **src/components/kanban/StageProgressionIndicator.jsx**
  - Renders stage progression badges with color classes (lines 71-82: getStageBadgeClass)
  - Uses status-based colors (completed: green-500, in_progress: blue-500, pending: gray-200)
  - Controls progress bar colors (line 137: bg-blue-600)

- **src/components/kanban/StageProgressionViewer.jsx**
  - Displays stage progression timeline with icons and colors (lines 47-59: getStageColorClass)
  - Uses similar color scheme (completed: green-500, active: blue-500, pending: gray-200)
  - Includes connector line colors (lines 146-149)

- **src/constants/workItems.js** (lines 15-21)
  - Defines QUEUEABLE_STAGES with color attributes (blue, yellow, green, purple, indigo)
  - Note: These color names may not match the actual hex values in brutalist-theme.css

- **src/index.css** (lines 238-280)
  - Contains CSS custom properties and color palette variables
  - May include additional color definitions used by components

- **src/components/kanban/KanbanCard.jsx**
  - Renders individual task cards that may display phase indicators
  - Should be checked for color consistency with stage indicators

- **src/components/kanban/CardExpandModal.jsx**
  - Contains the detailed task view modal
  - May include phase navigation tabs that need color validation

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Document Current Color Scheme
- Read and extract all phase color definitions from `src/styles/brutalist-theme.css`:
  - Document column header background colors (lines 411-441)
  - Document left border stripe colors (lines 401-408)
  - Note any additional phase-related color definitions
- Create a color mapping table showing:
  - Phase name (backlog, plan, build, test, review, document, ready-to-merge, errored)
  - Header background color
  - Border stripe color
  - Expected usage context

### Step 2: Audit Stage Progression Component Colors
- Review `src/components/kanban/StageProgressionIndicator.jsx`:
  - Identify all color classes used for badges (completed, in_progress, pending)
  - Compare badge colors against brutalist-theme.css phase colors
  - Document any discrepancies or inconsistencies
- Review `src/components/kanban/StageProgressionViewer.jsx`:
  - Identify timeline icon and background colors
  - Compare against brutalist-theme.css phase colors
  - Note any color mismatches

### Step 3: Audit Constants and Configuration
- Review `src/constants/workItems.js`:
  - Compare QUEUEABLE_STAGES color attributes (blue, yellow, green, purple, indigo) against actual hex values in brutalist-theme.css
  - Document whether these string color names correctly represent the actual colors
  - Identify if these constants need updating to match brutalist theme

### Step 4: Cross-Reference Phase Names and Colors
- Create a comprehensive mapping document showing:
  - Phase ID → CSS class → Actual color value
  - Identify any naming inconsistencies (e.g., "build" vs "implement")
  - Document all locations where phase colors are defined or referenced
- Check for consistency between:
  - Kanban column colors
  - Stage progression badge colors
  - Progress bar colors
  - Status indicator colors

### Step 5: Test Color Consistency in UI Components
- Start the development server:
  - Run frontend: `npm run dev` in project root
  - Run backend: `cd app/server && uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001`
- Create test tasks in different stages to visually verify:
  - Column header colors match expected phase colors
  - Stage progression indicators show correct colors
  - Task card badges display consistent colors
  - Modal phase tabs (if present) use matching colors
- Take screenshots or notes documenting any visual inconsistencies

### Step 6: Identify and Document All Color Mismatches
- Create a detailed report listing:
  - All discovered color inconsistencies
  - Severity of each issue (critical, moderate, minor)
  - Recommended fixes with specific CSS class or component changes
  - Priority order for addressing issues
- Include specific line numbers and file paths for each issue

### Step 7: Create Recommendations Document
- Write a recommendations document in `specs/` directory named `issue-1-adw-8904f50f-color-consistency-findings.md` containing:
  - Executive summary of color consistency status
  - Detailed findings with screenshots (if applicable)
  - Prioritized list of fixes needed
  - Proposed color standardization approach
  - Code snippets showing recommended changes

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify no TypeScript type errors were introduced
- `npm run lint` - Ensure code follows linting standards
- `cd app/server && uv run pytest` - Run server tests to validate no backend regressions
- Manual visual testing - Start the application and verify color consistency across all stages

## Notes
- This is a testing and documentation chore, not an implementation task
- The goal is to identify inconsistencies, not to fix them (fixing would be a separate issue)
- Focus on completeness - document every color usage related to phases/stages
- The brutalist theme uses specific hex colors (#3b82f6 for blue, #f59e0b for yellow/orange, #10b981 for green, #8b5cf6 for purple, #ec4899 for pink, #14b8a6 for teal, #ef4444 for red, #6b7280 for gray)
- Pay special attention to the difference between "build" (used in brutalist-theme.css) and "implement" (used in workItems.js constants)
- Consider color accessibility and contrast ratios in the findings report
- Document the current "source of truth" for phase colors (appears to be brutalist-theme.css)
