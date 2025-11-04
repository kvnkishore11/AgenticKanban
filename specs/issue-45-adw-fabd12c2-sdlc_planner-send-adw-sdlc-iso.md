# Chore: Send adw_sdlc_iso when SDLC button is clicked

## Metadata
issue_number: `45`
adw_id: `fabd12c2`
issue_json: `{"number":45,"title":"when ever i click on sdlc, send that adw as adw_sd...","body":"when ever i click on sdlc, send that adw as adw_sdlc_iso instead of adw_plan_build_test_reveiw_document_iso which would definitely return as an error..."}`

## Chore Description
When the user clicks the "SDLC" button in the task creation or task edit form, the system should send the workflow name as `adw_sdlc_iso` instead of the incorrectly formed `adw_plan_build_test_reveiw_document_iso` (which has a typo "reveiw" and would cause an error).

The current implementation already has logic in `adwCreationService.js` that checks if all SDLC stages are selected and should return `adw_sdlc_iso`. However, the issue description indicates that the system is currently generating `adw_plan_build_test_reveiw_document_iso` instead. This needs to be verified and fixed to ensure the SDLC button correctly triggers the `adw_sdlc_iso` workflow.

## Relevant Files
Use these files to resolve the chore:

- **src/services/adwCreationService.js** - Contains the `generateWorkflowName()` method that maps queued stages to workflow names. Lines 111-124 contain the logic for detecting all SDLC stages and returning `adw_sdlc_iso`. This is the primary file that needs to be verified and potentially fixed.

- **src/constants/workItems.js** - Defines the `SDLC_STAGES` constant which is used to determine if all SDLC stages are selected. Line 24 shows it's set to `['plan', 'implement', 'test', 'review', 'document']`.

- **src/components/forms/TaskInput.jsx** - Contains the SDLC button click handler (`handleFullSdlcToggle` at lines 193-204) that selects all SDLC stages when clicked. This triggers the workflow name generation.

- **src/components/forms/TaskEditModal.jsx** - Contains the same SDLC button click handler (`handleFullSdlcToggle` at lines 178-189) for editing tasks. Also needs to ensure SDLC stages are properly set.

- **src/services/adwCreationService.test.js** - Contains tests for the ADW creation service. Should have tests verifying that SDLC stage selection generates `adw_sdlc_iso`. Needs to be updated if test coverage is insufficient.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Verify Current Implementation
- Read the `generateWorkflowName()` method in `src/services/adwCreationService.js` to confirm the logic for detecting all SDLC stages
- Verify that `SDLC_STAGES` constant in `src/constants/workItems.js` contains the correct stages: `['plan', 'implement', 'test', 'review', 'document']`
- Check if the logic `SDLC_STAGES.every(stage => queuedStages.includes(stage))` correctly detects when all SDLC stages are present
- Identify any bugs in the current implementation that might prevent it from returning `adw_sdlc_iso`

### 2. Fix Workflow Name Generation Logic
- If the current logic in `generateWorkflowName()` is incorrect or has bugs, fix it to ensure:
  - When all SDLC stages (`['plan', 'implement', 'test', 'review', 'document']`) are present in `queuedStages`, return `adw_sdlc_iso`
  - The check should work regardless of the order of stages in the `queuedStages` array
  - Additional stages (like 'pr') should not prevent the SDLC detection from working
- Ensure the stage mapping in lines 127-135 correctly maps 'implement' to 'build' for non-SDLC workflows
- Add comments to clarify the SDLC detection logic if not already present

### 3. Verify SDLC Button Handlers
- Review `handleFullSdlcToggle()` in `src/components/forms/TaskInput.jsx` (lines 193-204)
- Review `handleFullSdlcToggle()` in `src/components/forms/TaskEditModal.jsx` (lines 178-189)
- Ensure both handlers correctly set all SDLC stages when toggled: `['plan', 'implement', 'test', 'review', 'document']`
- Verify that clicking the SDLC button sets exactly these stages in the `queuedStages` array

### 4. Update or Add Tests
- Review existing tests in `src/services/adwCreationService.test.js`
- Add or update test cases to verify:
  - When `queuedStages = ['plan', 'implement', 'test', 'review', 'document']`, `generateWorkflowName()` returns `'adw_sdlc_iso'`
  - When stages are in a different order, it still returns `'adw_sdlc_iso'`
  - When additional stages like 'pr' are included with all SDLC stages, it still returns `'adw_sdlc_iso'`
  - When only some SDLC stages are present, it returns the concatenated workflow name (e.g., `'adw_plan_build_iso'`)
- Ensure test coverage is comprehensive for all edge cases

### 5. Manual Testing Verification
- Document the manual testing steps to verify the fix:
  1. Open the task creation modal
  2. Click the "SDLC" button
  3. Verify that all SDLC stages are selected: Plan, Implement, Test, Review, Document
  4. Create the task and verify in the console/network logs that `workflow_name: 'adw_sdlc_iso'` is sent
  5. Repeat the same test with the task edit modal
- Add these manual testing steps as comments in the test file or in this plan

### 6. Run Validation Commands
- Run all validation commands to ensure zero regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript types are correct
- `npm run lint` - Ensure code follows linting standards
- `cd server && uv run pytest` - Run server tests to validate no regressions
- `npm test -- adwCreationService` - Run specific tests for ADW creation service

## Notes
- The typo "reveiw" in the issue description suggests that the current implementation might be concatenating stage names incorrectly instead of detecting the full SDLC pattern
- The fix should ensure that the SDLC button always maps to `adw_sdlc_iso` workflow, which is the orchestrator workflow that runs the complete software development lifecycle
- The current code at lines 118-124 in `adwCreationService.js` already appears to have the correct logic, so the issue might be in how the stages are being set or in a different part of the code
- Additional stages beyond SDLC (like 'pr') should still allow SDLC detection to work, as per the comment on line 121
