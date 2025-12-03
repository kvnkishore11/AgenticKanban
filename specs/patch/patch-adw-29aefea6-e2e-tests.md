# Patch: E2E Tests for Per-Stage Model Selection

## Metadata
adw_id: `29aefea6`
review_change_request: `Issue #5: E2E tests for the complete feature are missing. The spec requires 'src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md' with test cases for custom model selection, defaults, reset functionality, and model display in logs. Resolution: Create E2E test file with Playwright automation scripts covering all four test cases: custom per-stage model selection, default model population, reset to defaults, and model information display in logs. Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md
**Issue:** The E2E test file `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` specified in the original feature spec is missing. This is a blocker as it prevents validation of the complete feature in a real-world scenario.
**Solution:** Create comprehensive E2E test specification following the project's established E2E test format (as seen in `src/test/e2e/issue-21-adw-158e99e0-e2e-agent-log-streaming.md`). Include Playwright automation scripts for all four required test cases.

## Files to Modify
- **src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md** (new file) - E2E test specification with manual steps and Playwright automation scripts

## Implementation Steps

### Step 1: Create E2E Test Specification File
- Create `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md`
- Follow the established E2E test format used in `issue-21-adw-158e99e0-e2e-agent-log-streaming.md`
- Include sections: Overview, Test Scenario, Prerequisites, Test Steps, Expected Results, Edge Cases, Debugging Tips, Test Data, Test Report Template, Success Metrics

### Step 2: Document Test Case 1 - Custom Per-Stage Model Selection
- Write detailed test steps for selecting custom models per stage in WorkflowTriggerModal
- Include Playwright automation script that:
  - Opens Kanban board and creates a new task
  - Opens WorkflowTriggerModal
  - Selects "Full SDLC" workflow
  - Verifies stage model selectors appear for each stage
  - Changes models: Plan→Opus, Build→Opus, Test→Sonnet, Review→Sonnet, Document→Sonnet, Merge→Haiku
  - Verifies visual indicators (cost/performance badges) display correctly
  - Triggers workflow
  - Validates WebSocket payload includes `stage_models` with correct values
- Add screenshot validation points
- Define expected console output and network events

### Step 3: Document Test Case 2 - Default Model Population
- Write test steps for verifying default models are pre-populated correctly
- Include Playwright automation script that:
  - Opens WorkflowTriggerModal for a task
  - Selects "Full SDLC" workflow
  - Verifies Plan defaults to Opus with "(Default)" label
  - Verifies Build defaults to Opus
  - Verifies Test, Review, Document default to Sonnet
  - Verifies Merge defaults to Haiku
  - Triggers workflow without changing any models
  - Validates WebSocket payload contains default stage_models
- Add assertions for visual default indicators

### Step 4: Document Test Case 3 - Reset to Defaults Functionality
- Write test steps for changing models and resetting to defaults
- Include Playwright automation script that:
  - Opens WorkflowTriggerModal, selects workflow
  - Changes multiple models to non-default values (Plan→Haiku, Test→Opus, Document→Haiku)
  - Verifies changes are reflected in UI
  - Clicks "Reset to Defaults" button
  - Verifies all selectors return to default values
  - Triggers workflow
  - Validates defaults are sent in WebSocket payload
- Add visual regression checks for button state

### Step 5: Document Test Case 4 - Model Information Display in Logs
- Write test steps for verifying model information appears in stage logs
- Include Playwright automation script that:
  - Triggers a workflow with mixed models (Plan=Opus, Test=Sonnet, Merge=Haiku)
  - Waits for Plan stage to start executing
  - Opens WorkflowLogViewer for the task
  - Verifies stage logs show "Model: Opus" badge for Plan stage with correct styling
  - Waits for workflow progression to Test stage
  - Verifies "Model: Sonnet" badge appears for Test stage
  - Waits for Merge stage
  - Verifies "Model: Haiku" badge appears for Merge stage
  - Takes screenshots of log viewer showing model badges
- Add assertions for badge colors, icons, and accessibility

### Step 6: Add Edge Cases and Debugging Sections
- Document edge cases to test:
  - Workflow type changes (verify model selections reset)
  - Invalid model values (verify validation)
  - WebSocket disconnection during model selection
  - Multiple browser tabs with same task
  - Model persistence across page refreshes
- Add debugging tips section:
  - Console checks for WebSocket events
  - Network tab verification
  - Backend log validation
  - Component state inspection
- Include sample test data (WebSocket payloads, expected responses)

### Step 7: Add Test Report Template and Success Metrics
- Create test report template with sections:
  - Test execution metadata (date, tester, environment, browser)
  - Results summary (total steps, passed, failed, skipped)
  - Detailed results table
  - Issues found template
  - Screenshots section
  - Recommendations section
- Define success metrics:
  - Test pass rate: 100% of steps pass
  - UI responsiveness: Model selection < 500ms
  - WebSocket latency: Payload sent within 1 second
  - Visual accuracy: All badges and indicators display correctly
  - Error rate: 0 console errors during normal operation

## Validation
Execute every command to validate the patch is complete with zero regressions.

- `ls -la src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` - Verify file exists
- `wc -l src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` - Verify file has substantial content (>400 lines)
- `grep -c "Test Case" src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` - Verify all 4 test cases documented
- `grep -c "Playwright" src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` - Verify Playwright scripts included
- `grep "stage_models" src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` - Verify WebSocket payload validation
- `grep "Reset to Defaults" src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` - Verify reset functionality covered
- `grep "Model: Opus" src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` - Verify log display test included
- Manual review: Read through test file to ensure completeness and clarity
- Compare format with `src/test/e2e/issue-21-adw-158e99e0-e2e-agent-log-streaming.md` for consistency

## Patch Scope
**Lines of code to change:** ~500 (new E2E test specification file)
**Risk level:** low
**Testing required:** Manual review of test specification against original feature spec requirements. The E2E test file itself is documentation/test specification, not executable code, so no runtime testing required. Validation consists of verifying completeness and alignment with feature requirements.
