# Patch: Integration Tests for Per-Stage Model Execution

## Metadata
adw_id: `29aefea6`
review_change_request: `Issue #6: Integration tests for per-stage model execution are missing. The spec requires 'adws/adw_tests/test_per_stage_models.py' with end-to-end tests verifying workflows execute with correct models per stage. Resolution: Create adws/adw_tests/test_per_stage_models.py with integration tests that verify: (1) End-to-end workflow with mixed models, (2) Logs show correct model per stage, (3) Agent execution uses specified model, (4) Backward compatibility, (5) Invalid model handling. Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md
**Issue:** Integration tests file `adws/adw_tests/test_per_stage_models.py` is missing despite being specified in the requirements. This is a blocker issue preventing validation of per-stage model selection functionality.
**Solution:** Create comprehensive integration test file that validates end-to-end per-stage model execution, log verification, agent execution with correct models, backward compatibility, and invalid model handling.

## Files to Modify
- **adws/adw_tests/test_per_stage_models.py** (NEW) - Create integration test file with comprehensive test cases for per-stage model execution

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Integration Test File
Create `adws/adw_tests/test_per_stage_models.py` with the following test cases:

**Test 1: End-to-End Workflow with Mixed Models**
- Mock workflow execution with different models per stage (Plan=opus, Build=opus, Test=sonnet, Review=sonnet, Document=sonnet, Merge=haiku)
- Verify orchestrator applies correct model to each stage context
- Verify workflow completes successfully with mixed models
- Assert each stage receives its designated model in StageContext

**Test 2: Logs Show Correct Model Per Stage**
- Execute workflow with per-stage model configuration
- Capture log output from each stage execution
- Verify logs contain model information for each stage
- Assert log entries show correct model name (e.g., "Using model: opus" for plan stage)

**Test 3: Agent Execution Uses Specified Model**
- Mock AgentTemplateRequest for different stages with stage_model set
- Call get_model_for_slash_command() with stage context containing model override
- Verify function returns the stage-specific model (not model_set default)
- Test priority: stage override > model_set > defaults
- Assert agent execution receives correct model parameter

**Test 4: Backward Compatibility**
- Execute workflow without stage_model_overrides in ADW state
- Verify workflow falls back to model_set behavior
- Test with model_set="base" and model_set="heavy"
- Assert existing workflows continue to work without per-stage models

**Test 5: Invalid Model Handling**
- Test stage context with invalid model name (e.g., "gpt-4")
- Verify system falls back to default model (sonnet)
- Test empty string and None values for stage_model
- Assert invalid models don't cause execution failures, only fallback to safe defaults

**Test Implementation Details:**
- Use pytest framework with fixtures for mocking
- Mock StageContext, AgentTemplateRequest, and ADWState
- Use unittest.mock for patching agent execution
- Add setup/teardown for test isolation
- Include comprehensive assertions and error messages
- Add docstrings explaining each test's purpose

### Step 2: Add Test Utilities and Fixtures
- Create pytest fixtures for common test data:
  - `mock_stage_context(stage_name, model)` - Returns StageContext with specified model
  - `mock_adw_state(adw_id, stage_models)` - Returns ADWState with stage_model_overrides
  - `mock_orchestrator_config(stages)` - Returns OrchestratorConfig with stage models
- Add helper functions:
  - `extract_model_from_logs(log_output)` - Parses log output to extract model name
  - `verify_stage_model(stage_context, expected_model)` - Asserts stage has correct model

### Step 3: Integrate with Test Execution Sequence
- Ensure test file follows pytest conventions (test_*.py pattern)
- Add test to `.claude/commands/test.md` validation sequence if not already included
- Verify test can run with: `uv run pytest adws/adw_tests/test_per_stage_models.py -v`
- Add test markers for categorization (@pytest.mark.integration)

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Run the new integration tests:**
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/29aefea6
   uv run pytest adws/adw_tests/test_per_stage_models.py -v
   ```

2. **Run all backend tests to ensure no regressions:**
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/29aefea6
   uv run pytest adws/adw_tests/ -v --tb=short
   ```

3. **Verify model selection tests still pass:**
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/29aefea6
   uv run pytest adws/adw_tests/test_model_selection.py -v
   ```

4. **Verify orchestrator tests still pass:**
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/29aefea6
   uv run pytest adws/adw_tests/test_orchestrator.py -v
   ```

5. **Python syntax check:**
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/29aefea6
   uv run python -m py_compile adws/adw_tests/test_per_stage_models.py
   ```

## Patch Scope
**Lines of code to change:** ~300-400 lines (new file)
**Risk level:** low
**Testing required:** New integration tests must pass; all existing backend tests must continue to pass with zero regressions
