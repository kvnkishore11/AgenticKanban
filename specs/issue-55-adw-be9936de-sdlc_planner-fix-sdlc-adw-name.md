# Bug: Incorrect ADW Name Sent When SDLC Selected

## Metadata
issue_number: `55`
adw_id: `be9936de`
issue_json: `{"number":55,"title":"whenever i seelct sdlc , you are sending teh adw_p...","body":"whenever i seelct sdlc , you are sending teh adw_plan_build_test_review_document_iso to the websocket which is resulting in an error because that adw is not present in our adw_system. But it is present as adw_sdlc_iso. You should be instead sending adw_sdlc_iso so that this will not error out"}`

## Bug Description
When a user selects the SDLC workflow option (which represents the Full SDLC workflow including plan, implement, test, review, and document stages), the system incorrectly generates the workflow name `adw_plan_build_test_review_document_iso` and sends it to the WebSocket server. However, this ADW script does not exist in the `adws/` directory. The correct ADW script that exists is `adw_sdlc_iso.py`, so the system should send `adw_sdlc_iso` instead.

This causes workflow triggering to fail with an error because the WebSocket server cannot find the specified ADW workflow file.

## Problem Statement
The `getWorkflowTypeForStage()` function in `src/services/websocket/websocketService.js` does not include logic to detect when all SDLC stages are selected and map them to `adw_sdlc_iso`. Instead, it constructs a workflow name by joining stage names, resulting in `adw_plan_build_test_review_document_iso`, which doesn't match any existing ADW script.

## Solution Statement
Add SDLC stage detection logic to `getWorkflowTypeForStage()` similar to the logic already present in `generateWorkflowName()` in `src/services/adwCreationService.js`. When all SDLC stages (`['plan', 'implement', 'test', 'review', 'document']`) are present in the `queuedStages` array, the function should return `adw_sdlc_iso` instead of constructing a workflow name from individual stages.

## Steps to Reproduce
1. Open the AgenticKanban application
2. Click "Trigger Workflow" on any task or create a new task
3. In the workflow trigger modal, select "Full SDLC" workflow option (or manually select all SDLC stages: plan, implement, test, review, document)
4. Trigger the workflow
5. Observe that the WebSocket sends a workflow trigger request with `workflow_name: "adw_plan_build_test_review_document_iso"`
6. Check the WebSocket server logs or browser console for an error indicating the workflow file doesn't exist

## Root Cause Analysis
The bug exists in two locations:

1. **Primary Issue**: `src/services/websocket/websocketService.js` - The `getWorkflowTypeForStage()` function (lines 793-826) constructs workflow names by joining stage names without checking if all SDLC stages are present. It maps stages like `implement` to `build` and joins them, resulting in `adw_plan_build_test_review_document_iso`.

2. **Inconsistency**: The logic for detecting all SDLC stages and mapping to `adw_sdlc_iso` exists in `src/services/adwCreationService.js` in the `generateWorkflowName()` function (lines 111-124), but this logic is not present in the `websocketService.js` file.

The stage mapping process:
- `implement` → `build`
- Joined stages: `plan_build_test_review_document`
- Resulting workflow: `adw_plan_build_test_review_document_iso` (doesn't exist)
- Expected workflow: `adw_sdlc_iso` (exists)

## Relevant Files
Use these files to fix the bug:

- **src/services/websocket/websocketService.js** (lines 793-826) - Contains the buggy `getWorkflowTypeForStage()` function that needs the SDLC detection logic added. This is the primary file that needs to be fixed.

- **src/services/adwCreationService.js** (lines 111-124) - Contains the correct implementation of SDLC stage detection in `generateWorkflowName()`. Use this as a reference for the fix.

- **src/constants/workItems.js** (line 24) - Defines the `SDLC_STAGES` constant (`['plan', 'implement', 'test', 'review', 'document']`) that should be used for detection.

- **adws/adw_sdlc_iso.py** - The actual ADW script that should be triggered for full SDLC workflows. Confirms this is the correct target workflow name.

### New Files
None. This is a bug fix to existing code.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Import SDLC_STAGES constant in websocketService.js
- Add import statement at the top of `src/services/websocket/websocketService.js` to import the `SDLC_STAGES` constant from `src/constants/workItems.js`
- This constant is needed to check if all SDLC stages are present

### 2. Add SDLC detection logic to getWorkflowTypeForStage()
- Locate the `getWorkflowTypeForStage()` function in `src/services/websocket/websocketService.js` (around line 793)
- Add logic at the beginning of the queued stages handling section (after line 795) to check if all SDLC stages are present
- Use the same pattern as in `adwCreationService.js`: `SDLC_STAGES.every(stage => queuedStages.includes(stage))`
- If all SDLC stages are present, return `'adw_sdlc_iso'` immediately
- This should happen before the stage mapping logic executes

### 3. Verify the fix doesn't break existing functionality
- Ensure that the fix preserves the existing behavior for:
  - Single stage workflows (e.g., `adw_plan_iso`, `adw_build_iso`)
  - Partial stage combinations (e.g., `adw_plan_build_iso`, `adw_plan_build_test_iso`)
  - Additional stages beyond SDLC stages (e.g., adding `pr` stage)
- The logic should only trigger when ALL SDLC stages are present, not just some of them

### 4. Run validation commands
- Execute all validation commands listed in the "Validation Commands" section below
- Fix any TypeScript errors or build issues that arise
- Ensure no regressions in existing tests

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run build` - Build the frontend to ensure the fix doesn't break the build process

## Notes
- The fix is surgical - we only need to add 5-7 lines of code to `websocketService.js`
- The existing test in `src/services/adwCreationService.test.js` validates the SDLC detection logic, which confirms our approach is correct
- The `adw_sdlc_iso.py` workflow exists and is the correct target for full SDLC workflows
- This bug only affects workflow triggering via WebSocket, not task creation (which already has the correct logic in `adwCreationService.js`)
- The fix maintains backward compatibility - all existing workflow types will continue to work as before
- No new dependencies are required for this fix
