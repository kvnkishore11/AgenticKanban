# Patch: Rebase Per-Stage Model Selection onto Main

## Metadata
adw_id: `29aefea6`
review_change_request: `There are a lot of code changes that happened after I have made this request. So I want you to rebase yourself onto main and ensure that all the necessary changes are made again. Just to see that everything is working fine and your latest changes are also reflected perfectly without missing out some of the things.`

## Issue Summary
**Original Spec:** specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md
**Issue:** The feature branch `feat-issue-26-adw-29aefea6-stage-model-selection` contains 6 commits ahead of main, but main has 10+ new commits that need to be integrated. Need to rebase onto main to ensure compatibility with recent changes while preserving all per-stage model selection functionality.
**Solution:** Perform git rebase onto main, resolve any conflicts that arise, verify all tests pass, and ensure the complete per-stage model selection feature is working correctly with the updated codebase.

## Files to Modify
Use these files to implement the patch:

### Files Modified in This Branch (to be preserved after rebase)
- `.claude/commands/conditional_docs.md` - Enhanced conditional documentation system
- `adws/adw_modules/agent.py` - Per-stage model override logic (45 lines)
- `adws/adw_modules/agent_directory_monitor.py` - Agent monitoring enhancements
- `adws/adw_modules/data_types.py` - Added `stage_model_overrides` field
- `adws/orchestrator/config_loader.py` - Added `model` field to `StageConfig`
- `adws/orchestrator/stage_interface.py` - Extended `StageContext` with `stage_model`
- `adws/adw_orchestrator.py` - Per-stage model application (14 lines)
- `adws/adw_triggers/trigger_websocket.py` - WebSocket stage model handling (35 lines)
- `adws/adw_triggers/websocket_models.py` - Added `stage_models` field (13 lines)
- `adws/utils/model_config.py` - NEW: Model configuration utilities (128 lines)
- `src/components/forms/WorkflowTriggerModal.jsx` - Per-stage model selection UI (65 lines)
- `src/components/ui/StageModelSelector.jsx` - NEW: Model selector component (237 lines)
- `src/services/websocket/websocketService.js` - Stage model WebSocket support (6 lines)
- `src/utils/modelDefaults.js` - NEW: Model default utilities (138 lines)
- `src/styles/brutalist-theme.css` - Letter-spacing improvements (4 lines)

### Test Files to be Preserved
- `adws/adw_tests/test_per_stage_models.py` - NEW: Integration tests (632 lines)
- `adws/utils/tests/test_model_config.py` - NEW: Utility tests (169 lines)
- `src/components/ui/__tests__/StageModelSelector.test.jsx` - NEW: Component tests (696 lines)
- `src/components/forms/__tests__/WorkflowTriggerModal.test.jsx` - NEW: Modal tests (262 lines)
- `src/utils/__tests__/modelDefaults.test.js` - NEW: Default logic tests (217 lines)
- `src/services/websocket/__tests__/websocketService.test.js` - Updated tests (66 lines)
- `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` - NEW: E2E test plan (1,110 lines)

### Potential Conflict Files (from main branch changes)
- Database-related changes from feat-issue-31
- Clarification system changes
- Terminal operations changes
- Merge workflow changes
- Various bug fixes and optimizations

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Backup Current Branch State
- Create a backup branch: `git branch feat-issue-26-adw-29aefea6-stage-model-selection-backup`
- Document current commit hash for reference
- Ensure all changes are committed with no uncommitted work

### Step 2: Fetch Latest Main and Analyze Differences
- Run `git fetch origin main`
- Run `git log --oneline HEAD..origin/main` to see incoming commits
- Run `git diff --stat HEAD origin/main` to understand scope of changes
- Identify files that may have merge conflicts
- Review main branch changes for compatibility issues

### Step 3: Perform Interactive Rebase
- Execute `git rebase origin/main` to rebase feature branch onto latest main
- For each conflict encountered:
  - Identify the conflicting sections
  - Preserve per-stage model selection logic
  - Integrate new changes from main
  - Ensure backward compatibility is maintained
- After resolving each conflict: `git add <resolved-files> && git rebase --continue`
- If rebase becomes complex, use `git rebase --abort` and switch to merge strategy

### Step 4: Verify All Per-Stage Model Selection Files Exist
- Confirm all new files are present:
  - `adws/utils/model_config.py`
  - `adws/utils/tests/test_model_config.py`
  - `src/components/ui/StageModelSelector.jsx`
  - `src/components/ui/__tests__/StageModelSelector.test.jsx`
  - `src/utils/modelDefaults.js`
  - `src/utils/__tests__/modelDefaults.test.js`
  - `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md`
- Verify modified files contain per-stage model logic:
  - Check `adws/adw_modules/agent.py` for `get_model_for_slash_command()` changes
  - Check `adws/orchestrator/config_loader.py` for `model` field in `StageConfig`
  - Check `src/components/forms/WorkflowTriggerModal.jsx` for stage model selectors

### Step 5: Resolve Import and Dependency Issues
- Check for any new import paths or module reorganizations from main
- Update imports in per-stage model files if needed
- Verify Python package dependencies are compatible
- Check for any new frontend dependencies that might affect model selection UI
- Run `npm install` if package.json was modified in main

### Step 6: Run Backend Syntax and Quality Checks
- Execute `uv run python -m py_compile adws/*.py adws/adw_modules/*.py adws/adw_triggers/*.py adws/adw_tests/*.py start-websocket.py`
- Execute `uv run ruff check adws/ start-websocket.py`
- Fix any syntax errors or quality issues identified
- Ensure all Python files compile successfully

### Step 7: Run All Backend Tests
- Execute `uv run pytest adws/utils/tests/test_model_config.py -v` - Verify model config utilities
- Execute `uv run pytest adws/adw_tests/test_per_stage_models.py -v` - Verify per-stage model execution
- Execute `uv run pytest adws/adw_tests/ -v --tb=short` - Run all backend tests
- Fix any test failures related to:
  - Database schema changes from main
  - API endpoint modifications
  - Orchestrator behavior changes
  - WebSocket protocol updates

### Step 8: Run All Frontend Tests
- Execute `npm run test -- modelDefaults` - Verify model default utilities
- Execute `npm run test -- StageModelSelector` - Verify stage model selector component
- Execute `npm run test -- WorkflowTriggerModal` - Verify workflow trigger modal
- Execute `npm run test -- websocketService` - Verify WebSocket integration
- Execute `npm run test` - Run all frontend tests
- Fix any test failures related to:
  - New component patterns from main
  - Store updates
  - API changes

### Step 9: Run Type Checking and Build
- Execute `npm run typecheck` - Ensure TypeScript types are valid
- Fix any type errors introduced by main branch changes
- Execute `npm run build` - Verify frontend builds successfully
- Address any build errors or warnings

### Step 10: Manual End-to-End Testing
- Start backend: `bash adwsh` (or equivalent command)
- Start frontend: `bash fesh` (or equivalent command)
- Test Case 1: Default Model Population
  - Open WorkflowTriggerModal
  - Select "Full SDLC" workflow
  - Verify Plan/Build show "Opus (Default)"
  - Verify Test/Review/Document show "Sonnet (Default)"
  - Verify Merge shows "Haiku (Default)"
- Test Case 2: Custom Model Selection
  - Change Plan to Haiku, Test to Opus
  - Verify visual indicators update
  - Trigger workflow
  - Monitor execution logs to confirm correct models are used
- Test Case 3: Reset to Defaults
  - Customize several stage models
  - Click "Reset to Defaults"
  - Verify all models return to defaults
- Test Case 4: Backward Compatibility
  - Trigger a workflow without specifying stage models
  - Verify workflow executes successfully using model_set approach

### Step 11: Create/Update Tests (if code was modified during rebase)
- If backend Python code was modified during conflict resolution:
  - Update tests in `adws/utils/tests/test_model_config.py`
  - Update tests in `adws/adw_tests/test_per_stage_models.py`
  - Add new test cases for any rebase-related changes
- If frontend code was modified during conflict resolution:
  - Update tests in `src/components/ui/__tests__/StageModelSelector.test.jsx`
  - Update tests in `src/components/forms/__tests__/WorkflowTriggerModal.test.jsx`
  - Update tests in `src/utils/__tests__/modelDefaults.test.js`
- If integration points were modified:
  - Update E2E test plan in `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md`

### Step 12: Document Rebase Changes
- Update `app_docs/feature-29aefea6-per-stage-model-selection.md` with:
  - Note about rebase onto main
  - Any compatibility changes made during rebase
  - New dependencies or requirements
  - Changes to test execution if any
- Create a summary of conflicts resolved and how they were addressed

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Verify Git State**
   - `git status` - Ensure no uncommitted changes, clean working directory
   - `git log --oneline -10` - Verify rebase created proper commit history
   - `git diff origin/main...HEAD --stat` - Confirm all per-stage model changes are present

2. **Backend Validation**
   - `uv run python -m py_compile adws/*.py adws/adw_modules/*.py adws/adw_triggers/*.py adws/adw_tests/*.py start-websocket.py` - Verify Python syntax
   - `uv run ruff check adws/ start-websocket.py` - Verify code quality
   - `uv run pytest adws/utils/tests/test_model_config.py -v` - Model config utilities pass
   - `uv run pytest adws/adw_tests/test_per_stage_models.py -v` - Per-stage execution tests pass
   - `uv run pytest adws/adw_tests/ -v --tb=short` - All backend tests pass

3. **Frontend Validation**
   - `npm run test -- modelDefaults` - Model defaults tests pass
   - `npm run test -- StageModelSelector` - Stage selector tests pass
   - `npm run test -- WorkflowTriggerModal` - Workflow modal tests pass
   - `npm run test -- websocketService` - WebSocket tests pass
   - `npm run test` - All frontend tests pass
   - `npm run typecheck` - No TypeScript errors
   - `npm run build` - Build succeeds

4. **Integration Validation**
   - Start backend with `bash adwsh`
   - Start frontend with `bash fesh`
   - Open browser to frontend
   - Create test task and trigger "Full SDLC" workflow
   - Verify default models are populated correctly
   - Customize models and trigger workflow
   - Monitor agent logs to confirm per-stage models are used
   - Verify stage logs display model information

5. **Backward Compatibility Validation**
   - Trigger workflow without stage models
   - Verify existing workflows continue to work
   - Check that model_set approach still functions
   - Ensure no breaking changes to existing functionality

## Patch Scope
**Lines of code to change:** 5,333 insertions, 33 deletions (existing), plus rebase conflict resolutions (estimate: 50-200 lines depending on conflicts)
**Risk level:** medium-high (significant feature with many files, rebase onto main with 10+ new commits)
**Testing required:** Full test suite (backend, frontend, integration, manual E2E) to ensure zero regressions and complete per-stage model selection functionality

## Success Criteria
- Rebase completes successfully with all conflicts resolved
- All backend tests pass (100% success rate)
- All frontend tests pass (100% success rate)
- TypeScript type checking passes with zero errors
- Frontend build succeeds with zero errors
- Manual E2E testing confirms per-stage model selection works correctly
- Default model strategy is preserved (Opus for Plan/Build, Sonnet for Test/Review/Document, Haiku for Merge)
- Backward compatibility maintained (existing workflows without stage models continue to work)
- All 1,800+ lines of test code execute successfully
- No regressions in functionality introduced by main branch changes
- Documentation updated to reflect any rebase-related changes
