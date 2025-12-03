# Patch: Create UI Tests for Stage Model Selection Components

## Metadata
adw_id: `29aefea6`
review_change_request: `Issue #4: No UI tests were created for the frontend components. The spec requires unit tests in 'src/components/ui/__tests__/StageModelSelector.test.jsx' and 'src/components/forms/__tests__/WorkflowTriggerModal.stageModels.test.jsx', but these test files are missing. Resolution: Create comprehensive unit tests for StageModelSelector component and WorkflowTriggerModal stage model selection functionality to ensure UI components work correctly. Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md
**Issue:** The per-stage model selection feature was implemented, but the required unit tests for the frontend components were not created. The spec explicitly requires tests in `src/components/ui/__tests__/StageModelSelector.test.jsx` and `src/components/forms/__tests__/WorkflowTriggerModal.stageModels.test.jsx`, which are currently missing.
**Solution:** Create comprehensive unit tests for both the StageModelSelector component and the WorkflowTriggerModal stage model selection functionality using Vitest and React Testing Library to validate all component behaviors and interactions.

## Files to Modify
This patch creates new test files only:

- `src/components/ui/__tests__/StageModelSelector.test.jsx` (CREATE NEW)
- `src/components/forms/__tests__/WorkflowTriggerModal.stageModels.test.jsx` (CREATE NEW)

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create StageModelSelector Component Tests
Create comprehensive unit tests for the StageModelSelector component in `src/components/ui/__tests__/StageModelSelector.test.jsx`:
- Test component renders with all model options (Sonnet, Haiku, Opus)
- Test onChange callback fires with correct model value when a selection is made
- Test visual indicators (cost/performance badges) display correctly for each model type
- Test disabled state prevents user interaction and selection
- Test default model is visually indicated with "(Default)" label
- Test tooltips are present, accessible, and contain model descriptions
- Test dropdown open/close behavior when clicking the selector button
- Test proper icon rendering for each model (Zap for Haiku, Scale for Sonnet, Crown for Opus)
- Test help text displays the correct default model for the stage
- Test keyboard navigation and accessibility features

### Step 2: Create WorkflowTriggerModal Stage Model Selection Tests
Create comprehensive unit tests for WorkflowTriggerModal stage model selection in `src/components/forms/__tests__/WorkflowTriggerModal.stageModels.test.jsx`:
- Test complex scenarios with multiple stages (Plan, Build, Test, Review, Document, Merge)
- Test default models are pre-populated correctly for each stage type
- Test changing model selection updates component state correctly
- Test workflow trigger payload includes stageModels object with correct structure
- Test model selection persistence during workflow type changes
- Test "Reset to Defaults" button restores all stage models to their defaults
- Test interaction between global model set (base/premium) and per-stage model selections
- Test validation rejects invalid model selections with appropriate error messages
- Test stage model selectors only render for orchestrator workflows (not single-command workflows)
- Test all stages in Full SDLC workflow can have independent model selections

### Step 3: Run and Validate Tests
Execute the test suite to ensure all new tests pass:
- Run `npm run test -- StageModelSelector` to validate StageModelSelector component tests
- Run `npm run test -- WorkflowTriggerModal.stageModels` to validate WorkflowTriggerModal stage model tests
- Verify all tests pass with 100% coverage of the intended functionality
- Fix any test failures or issues identified during validation

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. `npm run test -- StageModelSelector` - Verify all StageModelSelector component tests pass
2. `npm run test -- WorkflowTriggerModal.stageModels` - Verify all WorkflowTriggerModal stage model tests pass
3. `npm run test` - Run full frontend test suite to ensure zero regressions
4. `npm run typecheck` - Verify TypeScript types are valid with zero errors
5. `npm run build` - Verify frontend builds successfully with zero errors

## Patch Scope
**Lines of code to change:** ~500-700 (new test files only)
**Risk level:** low
**Testing required:** Unit tests for frontend UI components using Vitest + React Testing Library
