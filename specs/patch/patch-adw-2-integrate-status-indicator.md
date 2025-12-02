# Patch: Integrate StatusIndicator Component into KanbanCard

## Metadata
adw_id: `2`
review_change_request: `Issue #2: StatusIndicator component created but not integrated into KanbanCard.jsx. The spec requires visual indicators for all ADW states (pending, in_progress, completed, errored, stuck) with 'Action Required' badges for stuck workflows. The StatusIndicator component exists and appears well-implemented, but KanbanCard.jsx was not updated to import and use it. Resolution: Import StatusIndicator in KanbanCard.jsx and add it to the card UI to display the current ADW status with appropriate visual styling and animations. Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-31-adw-5e58ab68-sdlc_planner-database-state-management.md
**Issue:** StatusIndicator component was created in src/components/kanban/StatusIndicator.jsx with full support for all ADW states (pending, in_progress, completed, errored, stuck) and "Action Required" badges, but it was never integrated into KanbanCard.jsx where it should be displayed.
**Solution:** Import StatusIndicator component in KanbanCard.jsx and add it to the card header area to display the current ADW workflow status with appropriate visual styling and animations.

## Files to Modify

- `src/components/kanban/KanbanCard.jsx` - Import StatusIndicator and add to card UI

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Import StatusIndicator component
- Add import statement: `import StatusIndicator from './StatusIndicator';`
- Place import after existing component imports around line 16

### Step 2: Determine status and stuck state from task data
- Extract ADW status from `task.metadata?.status` or `task.stage`
- Map task stage to StatusIndicator status prop (e.g., 'plan' → 'in_progress', 'completed' → 'completed')
- Determine `isStuck` from `task.metadata?.is_stuck` or workflow progress stale timestamp
- Extract `currentStage` from `task.stage`
- Extract `lastActivity` from `task.updatedAt` or `workflowProgress?.lastUpdate`

### Step 3: Add StatusIndicator to card header
- Place StatusIndicator in the card header section (between task number and menu button)
- Use size="sm" for compact card display
- Pass status, isStuck, currentStage, and lastActivity props
- Ensure StatusIndicator is visually aligned with other header elements

### Step 4: Create/Update Tests
- Create frontend test: `src/components/kanban/__tests__/KanbanCard.test.jsx`
- Test StatusIndicator renders with correct status (pending, in_progress, completed, errored, stuck)
- Test "Action Required" badge appears when isStuck is true
- Test StatusIndicator receives correct props from task data
- Test StatusIndicator does not break existing card functionality

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. `npm run test` - Run all frontend unit tests including new KanbanCard tests
2. `npm run typecheck` - Validate TypeScript compilation
3. `npm run build` - Validate frontend builds successfully
4. Visual inspection: Start frontend and verify StatusIndicator appears on Kanban cards with correct visual states

## Patch Scope
**Lines of code to change:** ~10-15 lines (1 import, status mapping logic, StatusIndicator JSX)
**Risk level:** low
**Testing required:** Frontend unit tests for StatusIndicator integration, visual verification of all status states in UI
