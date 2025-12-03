# Patch: Rebase Feature Branch onto Latest Main with Stage Event Tests

## Metadata
adw_id: `29aefea6`
review_change_request: `Can you update yourself with the latest changes of main and also ensure that if those changes need any of your updates because there are a lot of things that happened after we have made our changes.`

## Issue Summary
**Original Spec:** specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md
**Issue:** The local main branch has advanced with a new commit (5c0d9aa) that adds stage event persistence tests (`adws/adw_triggers/tests/test_trigger_websocket.py` + 287 lines and `adws/adw_triggers/trigger_websocket.py` + 31 lines). The feature branch `feat-issue-26-adw-29aefea6-stage-model-selection` needs to be rebased onto this updated main to integrate these changes and verify compatibility with the per-stage model selection feature.
**Solution:** Rebase the feature branch onto local main (commit 5c0d9aa), resolve any conflicts in `adws/adw_triggers/trigger_websocket.py` (since both branches modify this file), verify all tests pass including the new stage event persistence tests, and ensure the per-stage model selection feature remains fully functional.

## Files to Modify
Use these files to implement the patch:

### Potential Conflict Files
- `adws/adw_triggers/trigger_websocket.py` - Feature branch adds 10 lines for stage model handling (lines related to `stage_models`), main adds 31 lines for stage event persistence. Need to merge both changes.

### New Files from Main to Integrate
- `adws/adw_triggers/tests/test_trigger_websocket.py` - NEW: 287 lines of stage event persistence tests

### Feature Branch Files to Preserve (34 files)
All per-stage model selection files must remain intact:
- Backend: `adws/adw_modules/agent.py`, `adws/adw_modules/data_types.py`, `adws/adw_orchestrator.py`, `adws/orchestrator/config_loader.py`, `adws/orchestrator/stage_interface.py`, `adws/adw_triggers/trigger_websocket.py`, `adws/adw_triggers/websocket_models.py`, `adws/utils/model_config.py`
- Frontend: `src/components/forms/WorkflowTriggerModal.jsx`, `src/components/ui/StageModelSelector.jsx`, `src/services/websocket/websocketService.js`, `src/utils/modelDefaults.js`
- Tests: `adws/adw_tests/test_per_stage_models.py`, `adws/utils/tests/test_model_config.py`, `src/components/ui/__tests__/StageModelSelector.test.jsx`, `src/components/forms/__tests__/WorkflowTriggerModal.test.jsx`, `src/utils/__tests__/modelDefaults.test.js`, `src/services/websocket/__tests__/websocketService.test.js`, `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md`

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Backup Current State
- Create backup branch: `git branch feat-issue-26-adw-29aefea6-stage-model-selection-backup-$(date +%Y%m%d-%H%M%S)`
- Document current HEAD: `git rev-parse HEAD` (expected: c7aedbf)
- Verify clean working directory: `git status` should show no uncommitted changes

### Step 2: Analyze Rebase Requirements
- Confirm local main is at commit 5c0d9aa: `git log main -1 --oneline`
- Review the new commit: `git show 5c0d9aa --stat`
- Identify overlap: Both branches modify `adws/adw_triggers/trigger_websocket.py`
  - Feature branch adds: `stage_models` field handling (~10 lines)
  - Main adds: Stage event persistence logic (~31 lines)
  - Strategy: Merge both changes, preserving both functionalities

### Step 3: Perform Rebase onto Local Main
- Execute: `git rebase main`
- Expected conflict in `adws/adw_triggers/trigger_websocket.py`
- Conflict resolution strategy:
  - Preserve feature branch's `stage_models` parameter extraction
  - Preserve main's stage event persistence calls
  - Ensure both features coexist without interfering
  - Maintain proper import statements for both features
- After resolving: `git add adws/adw_triggers/trigger_websocket.py && git rebase --continue`

### Step 4: Verify File Integrity Post-Rebase
- Confirm new test file exists: `ls -lh adws/adw_triggers/tests/test_trigger_websocket.py`
- Verify all 34 per-stage model files still exist:
  - `ls -1 adws/utils/model_config.py src/components/ui/StageModelSelector.jsx src/utils/modelDefaults.js`
  - `ls -1 adws/adw_tests/test_per_stage_models.py adws/utils/tests/test_model_config.py`
- Check merged file has both features: `grep -E "(stage_models|stage_event)" adws/adw_triggers/trigger_websocket.py`

### Step 5: Run Backend Syntax and Quality Checks
- Execute: `uv run python -m py_compile adws/*.py adws/adw_modules/*.py adws/adw_triggers/*.py adws/adw_tests/*.py start-websocket.py`
- Execute: `uv run ruff check adws/ start-websocket.py`
- Fix any syntax errors or linting issues in merged code

### Step 6: Run All Backend Tests Including New Stage Event Tests
- Execute: `uv run pytest adws/adw_triggers/tests/test_trigger_websocket.py -v` - Verify new stage event persistence tests
- Execute: `uv run pytest adws/utils/tests/test_model_config.py -v` - Verify model config utilities
- Execute: `uv run pytest adws/adw_tests/test_per_stage_models.py -v` - Verify per-stage model execution
- Execute: `uv run pytest adws/adw_tests/ -v --tb=short` - Run all backend tests
- Fix any test failures, especially those related to:
  - Stage event persistence interacting with stage model selection
  - WebSocket message handling for both features
  - Database operations if applicable

### Step 7: Run All Frontend Tests
- Execute: `npm run test -- modelDefaults` - Verify model default utilities
- Execute: `npm run test -- StageModelSelector` - Verify stage model selector component
- Execute: `npm run test -- WorkflowTriggerModal` - Verify workflow trigger modal
- Execute: `npm run test -- websocketService` - Verify WebSocket integration
- Execute: `npm run test` - Run all frontend tests
- Fix any test failures

### Step 8: Run Type Checking and Build
- Execute: `npm run typecheck` - Ensure TypeScript types are valid
- Execute: `npm run build` - Verify frontend builds successfully
- Address any build errors or warnings

### Step 9: Integration Testing with Both Features
- Start backend: `bash adwsh`
- Start frontend: `bash fesh`
- Test Case 1: Verify Stage Event Persistence
  - Trigger a workflow
  - Monitor backend logs for stage event persistence messages
  - Verify stage events are being recorded correctly
- Test Case 2: Verify Per-Stage Model Selection Still Works
  - Open WorkflowTriggerModal
  - Select "Full SDLC" workflow
  - Verify default models populate correctly
  - Customize some stage models (e.g., Plan → Haiku, Test → Opus)
  - Trigger workflow
  - Monitor execution logs to confirm:
    - Correct models are used for each stage
    - Stage events are persisted alongside model selection
- Test Case 3: Verify Both Features Work Together
  - Trigger workflow with custom stage models
  - Verify both stage model selection AND stage event persistence function correctly
  - Check logs for any conflicts or errors

### Step 10: Create/Update Tests for Merged Code
- If conflicts required significant code changes in `adws/adw_triggers/trigger_websocket.py`:
  - Update `adws/adw_triggers/tests/test_trigger_websocket.py` to test both features together
  - Add test case verifying stage models are passed correctly when stage events are persisted
  - Add test case verifying stage event persistence works when stage models are specified
- Update integration tests if needed:
  - Check if `adws/adw_tests/test_per_stage_models.py` needs updates for stage event interaction
  - Update E2E test plan in `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` if stage event persistence affects UI

### Step 11: Document Rebase and Integration
- Update `specs/patch/patch-adw-29aefea6-rebase-main.md` or create new verification doc
- Document:
  - Successful rebase onto main commit 5c0d9aa
  - Conflict resolution strategy in `trigger_websocket.py`
  - Verification that both stage event persistence and stage model selection work together
  - Any test updates or integration considerations
- Create summary of how the two features coexist

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Verify Git State**
   - `git status` - Ensure clean working directory
   - `git log --oneline -10` - Verify rebase created proper commit history on top of 5c0d9aa
   - `git diff main...HEAD --stat` - Confirm all per-stage model changes are present (34 files, ~5,361 insertions)

2. **Backend Validation**
   - `uv run python -m py_compile adws/*.py adws/adw_modules/*.py adws/adw_triggers/*.py adws/adw_tests/*.py start-websocket.py` - Python syntax check passes
   - `uv run ruff check adws/ start-websocket.py` - Code quality check passes
   - `uv run pytest adws/adw_triggers/tests/test_trigger_websocket.py -v` - Stage event persistence tests pass (NEW)
   - `uv run pytest adws/utils/tests/test_model_config.py -v` - Model config tests pass
   - `uv run pytest adws/adw_tests/test_per_stage_models.py -v` - Per-stage model tests pass
   - `uv run pytest adws/adw_tests/ -v --tb=short` - All backend tests pass

3. **Frontend Validation**
   - `npm run test -- modelDefaults` - Model defaults tests pass
   - `npm run test -- StageModelSelector` - Stage selector tests pass
   - `npm run test -- WorkflowTriggerModal` - Workflow modal tests pass
   - `npm run test` - All frontend tests pass
   - `npm run typecheck` - No TypeScript errors
   - `npm run build` - Build succeeds

4. **Integration Validation**
   - Start backend with `bash adwsh`
   - Start frontend with `bash fesh`
   - Verify stage event persistence works (check logs)
   - Verify per-stage model selection UI works (default population, customization, reset)
   - Trigger workflow with custom models and verify:
     - Correct models are used per stage
     - Stage events are persisted correctly
     - Both features function without conflicts

5. **Regression Testing**
   - Trigger workflow without stage models (backward compatibility)
   - Verify existing workflows continue to work
   - Ensure no breaking changes from rebase

## Patch Scope
**Lines of code to change:** Minimal (primarily conflict resolution in `adws/adw_triggers/trigger_websocket.py` - estimate 10-50 lines), plus integration of new test file (287 lines)
**Risk level:** Low-Medium (straightforward rebase with one file conflict, well-defined integration point)
**Testing required:** Full test suite + integration testing to verify both stage event persistence and per-stage model selection work together without conflicts

## Success Criteria
- Rebase onto main (5c0d9aa) completes successfully
- Conflict in `trigger_websocket.py` resolved cleanly with both features preserved
- New stage event persistence tests (`test_trigger_websocket.py`) pass
- All existing per-stage model tests pass (backend: 632 + 169 lines, frontend: 696 + 262 + 217 lines)
- TypeScript type checking passes with zero errors
- Frontend build succeeds with zero errors
- Integration testing confirms both features work together
- Stage event persistence functions correctly
- Per-stage model selection functions correctly with default strategy preserved
- No regressions in either feature
- Documentation updated with rebase verification
