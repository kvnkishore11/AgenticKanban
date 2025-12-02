# Chore: Move Patches to Dedicated Panel

## Metadata
issue_number: `4`
adw_id: `8185e70e`
issue_json: `{"number":4,"title":"I don't want patches to be displayed on the sideba...","body":"I don't want patches to be displayed on the sidebar. Instead, what we can do is like to the right side after the stages probably you can have one more section like patch one, patch two, patch three sort of things. So under each patch there can be a small stage like implement test and I should be seeing all the logs of the patch. Maybe what we can do we don't need to show the implement and test of it. But yeah, at least patch has the logs so we can show the logs, we can show the thinking and we can show the result of each patch and I can keep conversing with this particular patch. So that is what I am expecting. If at all I need some changes, so it should be like a conversational sort of thing. Similarly, I can create a new patch and as soon as I click on patch it should right away trigger it. So right now that it is not so evident that a patch is running. Those are the things I'm really expecting. Can you please work on this and"}`

## Chore Description
This chore involves redesigning how patches are displayed in the UI. Currently, patches are shown in the sidebar's "Patch History" section within the CardExpandModal. The requirement is to move patches to a new dedicated panel to the right of the stage tabs (after Clarify/Plan/Build tabs), with a visual separator. Each patch would be displayed as its own tab (Patch 1, Patch 2, etc.), and clicking on a patch tab would show its logs, thinking, and results - essentially all execution details for that specific patch. The "Apply Patch" button should trigger the patch immediately with better visual feedback to indicate a patch is running. The conversational interface is deferred for now - users will create new patches for additional changes.

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/CardExpandModal.jsx` - Main modal component that displays task details. Currently shows patches in the left sidebar. Need to modify the right panel area to add a new patch tabs section after the stage tabs.

- `src/components/kanban/StageTabsPanel.jsx` - Component that renders the stage tabs (Plan, Build, Test, etc.). This component's structure will be referenced when creating the new PatchTabsPanel component.

- `src/components/kanban/PatchRequestModal.jsx` - Modal for entering patch requests. May need minor updates to improve visual feedback when a patch is triggered.

- `src/components/kanban/KanbanCard.jsx` - Card component that displays tasks. Shows patch badges/indicators. May need updates to reflect the new patch display paradigm.

- `src/stores/kanbanStore.js` - Store that manages patch state (patch_history, patch_status, patch_number, etc.). Need to understand how patch data is structured and potentially add new state for tracking active patches.

- `src/styles/brutalist-modal.css` - Styling for the modal. Need to add styles for the new patch tabs panel, visual separator between stages and patches, and patch-related UI elements.

- `src/styles/brutalist-theme.css` - Global brutalist theme styles. May need updates for consistent patch UI theming.

### New Files

- `src/components/kanban/PatchTabsPanel.jsx` - New component to render patch tabs (Patch 1, Patch 2, etc.) similar to StageTabsPanel but for patches. Will display patch tabs horizontally with status indicators (pending, running, completed, failed).

- `src/components/kanban/__tests__/PatchTabsPanel.test.jsx` - Unit tests for the new PatchTabsPanel component.

- `src/test/e2e/issue-4-adw-8185e70e-e2e-patch-panel.md` - End-to-end test plan for the patch panel UI redesign.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Create PatchTabsPanel Component
- Create `src/components/kanban/PatchTabsPanel.jsx` component that renders patch tabs horizontally
- Each patch tab should display: patch number (e.g., "Patch 1"), patch status indicator (pending ○, running ⟳, completed ✓, failed ✗)
- Use similar structure to StageTabsPanel.jsx but adapted for patches
- Props should include: patches (array of patch objects), activePatch (currently selected patch), onPatchSelect (callback when patch is clicked)
- Apply brutalist styling consistent with existing stage tabs

### Update CardExpandModal to Add Patch Panel
- Modify `src/components/kanban/CardExpandModal.jsx` to add a new patch tabs section in the right panel
- Position the patch tabs below the stage tabs with a visual separator (horizontal border or divider)
- Remove the "PATCH HISTORY" section from the left sidebar (lines 846-889)
- Add state management for tracking the active/selected patch (similar to selectedLogStage)
- When a patch tab is selected, display the patch's logs, thinking, and results in the content panel
- The content panel should reuse existing components: ExecutionLogsViewer, AgentLogsPanel, and ResultViewer
- Add logic to fetch patch-specific logs based on the selected patch's adw_id or patch identifier

### Enhance Patch Visual Feedback
- Update `src/components/kanban/PatchRequestModal.jsx` to show a more prominent loading/running state
- Add a visual indicator (progress bar, spinner, or pulsing effect) when patch is submitted and running
- Consider adding a toast notification that confirms patch has started
- Update the isSubmitting prop handling to show clear "Patch Running" state

### Update KanbanCard Patch Display
- Modify `src/components/kanban/KanbanCard.jsx` to remove or simplify the patch badge display (lines 453-457)
- Since patches are now displayed in the dedicated panel, the card doesn't need to show detailed patch info
- Keep a simple indicator that patches exist (e.g., "🔧 PATCHED" badge)

### Add Styling for Patch Panel
- Add CSS rules to `src/styles/brutalist-modal.css` for:
  - `.patch-tabs-panel` - Container for patch tabs
  - `.patch-tab-btn` - Individual patch tab button
  - `.patch-tab-separator` - Visual separator between stages and patches
  - `.patch-tab-active`, `.patch-tab-pending`, `.patch-tab-completed`, `.patch-tab-failed` - Status-based styling
  - `.patch-running-indicator` - Visual indicator for running patches
- Ensure brutalist design consistency with existing stage tabs

### Store Updates for Patch State
- Review `src/stores/kanbanStore.js` to ensure patch state (patch_history, patch_status, patch_number) is properly structured
- Add any necessary selectors or state for tracking the active/selected patch in the UI
- Ensure patch data includes all necessary fields: adw_id, patch_number, patch_reason, status, timestamp, logs_path

### Create Unit Tests for PatchTabsPanel
- Create `src/components/kanban/__tests__/PatchTabsPanel.test.jsx`
- Test rendering of patch tabs with different statuses (pending, running, completed, failed)
- Test patch selection callback (onPatchSelect)
- Test rendering with no patches (empty state)
- Test rendering with multiple patches (1-5 patches)
- Use Vitest and React Testing Library

### Update Existing Tests for Modified Components
- Update `src/components/kanban/__tests__/CardExpandModal.test.jsx` to account for:
  - Removal of patch history from left sidebar
  - Addition of patch tabs panel in right panel
  - New patch selection interactions
- Update `src/components/kanban/__tests__/KanbanCard.test.jsx` to account for:
  - Simplified patch badge display
  - Removal of detailed patch info from card

### Create E2E Test Plan
- Create `src/test/e2e/issue-4-adw-8185e70e-e2e-patch-panel.md`
- Test opening CardExpandModal and seeing patch tabs section
- Test clicking on different patch tabs and seeing corresponding logs/thinking/results
- Test creating a new patch and verifying it appears as a new tab immediately
- Test visual feedback when patch is running
- Test patch tab status indicators (pending, running, completed, failed)

### Run Validation Commands
- Run all validation commands to ensure no regressions
- Fix any test failures or build errors
- Verify the UI changes work correctly in the browser

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run test` - Run frontend tests to validate the chore is complete with zero regressions
- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to ensure code quality
- `npm run build` - Build the frontend to ensure no build errors

## Notes
- The clarification confirmed that the conversational interface for patches is deferred - users will create new patches for changes instead
- Patches should be displayed to the right of the stage tabs with a visual separator
- Each patch tab should show logs, thinking, and results when selected
- The "Apply Patch" button should trigger patches immediately with clear visual feedback
- The patch history section in the left sidebar should be removed completely
- Reuse existing log viewer components (ExecutionLogsViewer, AgentLogsPanel, ResultViewer) for displaying patch details
- Maintain brutalist design consistency throughout the changes
