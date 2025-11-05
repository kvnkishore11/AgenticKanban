# Bug: Frontend App Refreshing After Triggering Workflow

## Metadata
issue_number: `54`
adw_id: `a6191f36`
issue_json: `{"number":54,"title":"After I triggere the workflow, for some reason my...","body":"After I triggere the workflow, for some reason my frontend app is refreshing. Ideally this should not happen. try to fix this issue"}`

## Bug Description
When users trigger a workflow from the Kanban board interface, the frontend application unexpectedly refreshes/reloads the entire page. This causes loss of UI state, interrupts the user experience, and is not the expected behavior. The workflow should trigger without causing any page navigation or reload.

## Problem Statement
The "Trigger Workflow" button in the CardExpandModal component is missing an explicit `type="button"` attribute. In HTML, buttons without an explicit type attribute default to `type="submit"`, which triggers form submission behavior. Even though the button is not inside a `<form>` element, the default submit behavior can still cause page refreshes in certain contexts, especially when event handlers execute asynchronously or when there are nested components.

## Solution Statement
Add explicit `type="button"` attributes to all workflow trigger buttons and any other action buttons throughout the application that don't have an explicit type. This will prevent the default form submission behavior and ensure that clicking these buttons only executes their onClick handlers without causing any page navigation or reload.

## Steps to Reproduce
1. Start the AgenticKanban application (frontend + backend + WebSocket server)
2. Create a new task or select an existing task on the Kanban board
3. Click on a task card to open the CardExpandModal
4. Ensure WebSocket is connected
5. Click the "Trigger Workflow" button in the Workflow Controls section
6. Observe that the entire frontend application refreshes/reloads
7. Notice that the page state is lost after the refresh

## Root Cause Analysis
The root cause is in `src/components/kanban/CardExpandModal.jsx` at line 463. The "Trigger Workflow" button element does not have an explicit `type="button"` attribute:

```jsx
<button
  onClick={handleTriggerWorkflow}
  disabled={!websocketStatus.connected}
  className={`flex items-center space-x-2 px-4 py-2 rounded text-sm transition-colors ${
    websocketStatus.connected
      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
  }`}
  title={websocketStatus.connected ? 'Trigger Workflow' : 'WebSocket Disconnected'}
>
```

According to HTML specifications, when a `<button>` element doesn't have an explicit `type` attribute, it defaults to `type="submit"`. This causes the browser to attempt form submission, which can trigger page navigation or reload even when the button is not inside a form element.

Additionally, there may be other buttons throughout the codebase with the same issue that should be fixed preventatively.

## Relevant Files
Use these files to fix the bug:

- `src/components/kanban/CardExpandModal.jsx` - Contains the primary "Trigger Workflow" button that is causing the refresh (line 463). This button and the "Merge to Main" button (line 479) need explicit `type="button"` attributes.

- `src/components/kanban/KanbanCard.jsx` - Contains another "Trigger Workflow" button in the card header (line 165). This button also needs the explicit `type="button"` attribute to prevent similar issues.

- `src/components/forms/WorkflowTriggerModal.jsx` - Contains workflow triggering UI in a modal with form elements. While the submit button correctly uses `type="submit"` (line 385) and the form has proper `e.preventDefault()` handling, the Cancel button (line 376) should have explicit `type="button"` to ensure it doesn't accidentally trigger form submission.

### New Files
- `.claude/commands/e2e/test_workflow_trigger_no_refresh.md` - E2E test file to validate that triggering workflows does not cause page refresh

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Fix CardExpandModal Trigger Workflow Button
- Update the "Trigger Workflow" button at line 463 in `src/components/kanban/CardExpandModal.jsx` to include `type="button"` attribute
- Update the "Merge to Main" button at line 479 in the same file to include `type="button"` attribute
- Verify all other buttons in this file have explicit type attributes where appropriate

### Fix KanbanCard Trigger Workflow Button
- Update the "Trigger Workflow" button at line 165 in `src/components/kanban/KanbanCard.jsx` to include `type="button"` attribute
- Verify all other buttons in this file have explicit type attributes where appropriate

### Fix WorkflowTriggerModal Buttons
- Update the "Cancel" button at line 376 in `src/components/forms/WorkflowTriggerModal.jsx` to include explicit `type="button"` attribute
- Verify the submit button correctly uses `type="submit"`
- Ensure the form's `onSubmit` handler properly calls `e.preventDefault()`

### Create E2E Test to Validate No Page Refresh
Read `.claude/commands/e2e/test_basic_query.md` and `.claude/commands/test_e2e.md` and create a new E2E test file at `.claude/commands/e2e/test_workflow_trigger_no_refresh.md` that validates workflow triggering does not cause page refresh. The test should:
- Navigate to the application
- Create or select a task
- Open the task card expand modal
- Verify the page URL before triggering workflow
- Click the "Trigger Workflow" button
- Wait for workflow to be triggered (check for visual feedback or status updates)
- Verify the page URL has not changed (no navigation occurred)
- Verify the modal is still open (no page refresh occurred)
- Take screenshots at key points to prove the bug is fixed

### Run Validation Commands
Execute all validation commands listed in the "Validation Commands" section to ensure the bug is fixed with zero regressions.

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run typecheck` - Run TypeScript type checking to ensure no type errors were introduced
- `npm run build` - Run frontend build to validate the bug is fixed with zero regressions and ensure the production build works
- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E test file `.claude/commands/e2e/test_workflow_trigger_no_refresh.md` to validate that workflow triggering no longer causes page refresh

## Notes
- The bug is a simple missing attribute issue, but it has significant UX impact
- This is a preventative fix that should be applied to all action buttons (not submit buttons) throughout the application
- The fix is minimal and surgical - only adding `type="button"` attributes
- E2E test will provide confidence that the fix works and prevent regressions
- After this fix, users should be able to trigger workflows without any page disruption
- The WebSocket connection and workflow execution logic are working correctly; the issue is purely on the UI button behavior
