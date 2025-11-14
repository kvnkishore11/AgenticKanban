# Chore: Remove Redundant Card Displays

## Metadata
issue_number: `3`
adw_id: `85736253`
issue_json: `{"number":3,"title":"these cards have redundant P I T R D i guess","body":"these cards have redundant P I T R D i guess. you have to remove teh top one for now. and for bottom one i dont need the percentage display\n\n## Attached Images\n\n![image.png](blob:http://192.168.1.57:5173/e5edcbd5-6acd-467c-891d-e310c4812c7b)\n\n"}`

## Chore Description
The Kanban cards are displaying redundant P I T R D (Plan, Implement, Test, Review, Document) stage progression indicators. According to the issue:

1. **Top Display (Remove)**: The compact stage progression badges with percentage are shown in the KanbanCard component (lines 343-356 in KanbanCard.jsx)
2. **Bottom Display (Keep, but remove percentage)**: The full stage progression indicator in the CardExpandModal should remain but without the percentage display (lines 354-363 in CardExpandModal.jsx)

The redundancy occurs because:
- KanbanCard.jsx shows compact stage badges with percentage (P, I, T, R, D badges + percentage) in the card itself
- CardExpandModal.jsx shows full stage progression with progress bar AND percentage when the card is expanded

The user wants to:
1. Remove the top compact stage progression display from KanbanCard
2. Keep the full progression display in CardExpandModal but remove the percentage text (keep progress bar visual only)

## Relevant Files
Use these files to resolve the chore:

### Files to Modify

- **src/components/kanban/KanbanCard.jsx** (lines 343-356)
  - Contains the compact `<StageProgressionIndicator>` component that displays stage badges and percentage
  - This is the "top one" that needs to be removed entirely
  - Located in the card body between the description and current substage display

- **src/components/kanban/CardExpandModal.jsx** (lines 354-363)
  - Contains the full `<StageProgressionIndicator>` component in the expanded modal
  - This is the "bottom one" that should remain but without percentage display
  - Need to change `showPercentage={true}` to `showPercentage={false}`

- **src/components/kanban/StageProgressionIndicator.jsx** (entire file)
  - The reusable component that renders stage progression
  - Review to understand the `showPercentage` and `compact` props
  - No changes needed, but review for understanding of how props control display

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove Compact Stage Progression from KanbanCard
- Open `src/components/kanban/KanbanCard.jsx`
- Locate lines 343-356 which contain the compact Stage Progression Indicator section:
  ```jsx
  {/* Stage Progression Indicator (compact view) */}
  {task.queuedStages && task.queuedStages.length > 0 && task.stage !== 'completed' && task.stage !== 'errored' && (
    <div className="mb-3">
      <StageProgressionIndicator
        currentStage={task.stage}
        queuedStages={task.queuedStages}
        workflowProgress={workflowProgress}
        workflowComplete={task.metadata?.workflow_complete}
        compact={true}
        showProgressBar={false}
        showPercentage={true}
      />
    </div>
  )}
  ```
- Delete this entire section (comment and component)
- Verify the card layout still maintains proper spacing without this element

### Step 2: Remove Percentage Display from CardExpandModal
- Open `src/components/kanban/CardExpandModal.jsx`
- Locate lines 354-363 which contain the full Stage Progression Indicator in the Workflow Status section
- Change the `showPercentage` prop from `true` to `false`:
  ```jsx
  <StageProgressionIndicator
    currentStage={task.stage}
    queuedStages={task.queuedStages || []}
    workflowProgress={workflowProgress}
    workflowComplete={task.metadata?.workflow_complete}
    showProgressBar={true}
    showPercentage={false}  // Changed from true to false
    compact={false}
  />
  ```
- This will keep the visual progress bar but remove the "Progress: X%" text display

### Step 3: Verify StageProgressionIndicator Component Behavior
- Open `src/components/kanban/StageProgressionIndicator.jsx`
- Review lines 120-127 (compact view) to confirm percentage only shows when `showPercentage={true}`
- Review lines 175-181 (full view) to confirm percentage only shows when `showPercentage={true}`
- No changes needed, but verify the component properly respects the `showPercentage` prop

### Step 4: Test the Changes in Development Environment
- Start the development server: `npm run dev`
- Navigate to the Kanban board
- Verify that task cards NO LONGER show the compact P I T R D badges with percentage in the card body
- Click on a task card to expand it
- Verify the expanded modal shows:
  - Full stage progression badges with progress bar (visual indicator)
  - NO "Progress: X%" percentage text below the progress bar
  - All other card information displays correctly
- Test with multiple tasks at different stages to ensure consistency

### Step 5: Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Verify no TypeScript errors were introduced
- Verify no ESLint warnings related to the changes
- Confirm all tests pass

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to check for code quality issues
- `npm run build` - Build the frontend to ensure no build errors
- `cd app/server && uv run pytest` - Run server tests to validate no backend regressions
- Manual Testing: Start dev server (`npm run dev`) and verify card displays work correctly without redundancy

## Notes
- The "P I T R D" refers to the stage abbreviations: Plan, Build/Implement, Test, Review, Document
- The compact view in KanbanCard was showing these as letter badges (P, B, T, R, D) with a percentage next to them
- The full view in CardExpandModal shows the complete stage names with progress bar and percentage text
- After this change, users will only see the full stage progression when they expand a card, reducing visual clutter on the main board
- The progress bar visual will remain in the modal (showProgressBar={true}), only the percentage text will be hidden
- This improves the card design by removing redundant information while keeping essential workflow status visible in the expanded view
