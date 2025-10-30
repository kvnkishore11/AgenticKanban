# Bug: Fix SDLC ISO Label and Workflow Mapping

## Metadata
issue_number: `3`
adw_id: `4ef55f2d`
issue_json: `{"number":3,"title":"when i click on Select Full SDLC -> it should send...","body":"when i click on Select Full SDLC -> it should send the adw as adw_sdlc_iso, instead it is sending adw_plan_build_test_review_document_iso which is failing. Also chage the label in the ui it should just be SDLC."}`

## Bug Description
When users click the "Select Full SDLC" button in the task creation form, two issues occur:
1. The button label displays "Select Full SDLC" but should simply display "SDLC"
2. The system sends an incorrect workflow identifier "adw_plan_build_test_review_document_iso" instead of the expected "adw_sdlc_iso", causing workflow execution failures

## Problem Statement
The Full SDLC selection feature has two bugs:
- Incorrect UI label text causing user confusion
- Workflow mapping logic generating wrong workflow identifier leading to execution failures

## Solution Statement
Fix the UI label to display just "SDLC" and ensure the workflow mapping correctly generates "adw_sdlc_iso" when all SDLC stages are selected, maintaining backward compatibility with existing functionality.

## Steps to Reproduce
1. Open the task creation form (click the "+" button or equivalent)
2. Look at the Full SDLC selection button - it shows "Select Full SDLC" instead of just "SDLC"
3. Click the Full SDLC selection button to select all SDLC stages
4. Create a task with a description
5. Observe the workflow identifier being generated - it incorrectly generates "adw_plan_build_test_review_document_iso" instead of "adw_sdlc_iso"

## Root Cause Analysis
1. **UI Label Issue**: In `src/components/forms/TaskInput.jsx` line 334, the button text is hardcoded as "Select Full SDLC" instead of just "SDLC"
2. **Workflow Mapping Issue**: The `generateWorkflowName` function in `src/services/adwCreationService.js` appears to have logic that should correctly map to 'adw_sdlc_iso' when all SDLC stages are present, but there may be an issue with the stage mapping or ordering that's causing it to fall through to the generic stage-joining logic instead

## Relevant Files
Use these files to fix the bug:

- `src/components/forms/TaskInput.jsx` - Contains the UI button with incorrect label text "Select Full SDLC" that needs to be changed to just "SDLC"
- `src/services/adwCreationService.js` - Contains the `generateWorkflowName` function that should map full SDLC stage selection to 'adw_sdlc_iso' but may have a logic bug
- `src/constants/workItems.js` - Contains SDLC_STAGES definition used for comparison logic
- `src/components/forms/TaskInput.test.jsx` - Contains tests for the Full SDLC selection functionality that will need updates to reflect the label change

### New Files
- `.claude/commands/e2e/test_sdlc_iso_label.md` - E2E test to validate the bug fix

## Step by Step Tasks

### Fix UI Label Text
- Update the button text in `src/components/forms/TaskInput.jsx` from "Select Full SDLC" to just "SDLC"
- Update the selected state text from "✓ Full SDLC Selected" to "✓ SDLC Selected"

### Debug and Fix Workflow Mapping Logic
- Investigate the `generateWorkflowName` function in `src/services/adwCreationService.js` to understand why it's not correctly mapping to 'adw_sdlc_iso'
- Add debug logging to trace the workflow name generation process
- Fix any logic bugs in the SDLC stage detection and mapping

### Update Tests
- Update test files to reflect the new button text labels
- Add test cases to verify the workflow mapping generates correct 'adw_sdlc_iso' identifier

### Create E2E Test
Read `.claude/commands/e2e/test_basic_query.md` and create a new E2E test file in `.claude/commands/e2e/test_sdlc_iso_label.md` that validates the bug is fixed. The test should verify:
1. The button shows "SDLC" instead of "Select Full SDLC"
2. Clicking the button properly selects all SDLC stages
3. The selected state shows "✓ SDLC Selected"
4. The workflow mapping generates "adw_sdlc_iso" identifier correctly

### Validation
Run the validation commands to ensure the bug is fixed with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd src && find . -name "*.jsx" -o -name "*.js" | grep -E "(TaskInput|adwCreationService)" | head -5` - Verify the relevant files are identified correctly
- `cd src && grep -n "Select Full SDLC" components/forms/TaskInput.jsx` - Verify the old label text is found before fixing
- `cd src && grep -n "adw_sdlc_iso" services/adwCreationService.js` - Verify the expected workflow identifier is referenced
- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_sdlc_iso_label.md` test file to validate this functionality works
- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend tests to validate the bug is fixed with zero regressions
- `cd app/client && bun run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- The SDLC_STAGES constant is defined as `['plan', 'implement', 'test', 'review', 'document']` in workItems.js
- The existing logic in adwCreationService.js has a hasAllSdlcStages check that should work correctly, but there may be an edge case or race condition
- The button behavior for toggling (select/deselect all SDLC stages) should remain unchanged - only the label text needs updating
- Ensure backward compatibility - tasks created before this fix should still work correctly
- The bug may be related to stage ordering or additional stages being included that interfere with the SDLC detection logic