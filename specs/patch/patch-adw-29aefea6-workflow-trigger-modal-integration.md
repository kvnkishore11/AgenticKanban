# Patch: Integrate StageModelSelector into WorkflowTriggerModal

## Metadata
adw_id: `29aefea6`
review_change_request: `Issue #1: WorkflowTriggerModal does not integrate StageModelSelector component. According to spec requirements, the WorkflowTriggerModal should display per-stage model selectors for orchestrator workflows, allow users to select custom models per stage, and include these selections in the workflow trigger payload. Git diff shows no changes to WorkflowTriggerModal.jsx. Resolution: Integrate StageModelSelector into WorkflowTriggerModal by: (1) Importing StageModelSelector and model utilities, (2) Adding stageModels state to track per-stage selections, (3) Rendering StageModelSelector for each stage in orchestrator workflows, (4) Including stageModels in workflow trigger payload, (5) Adding 'Reset to Defaults' functionality Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md
**Issue:** WorkflowTriggerModal does not integrate the StageModelSelector component to allow per-stage model selection for orchestrator workflows (Plan + Build, Plan + Build + Test, Full SDLC, Zero Touch Execution).
**Solution:** Import StageModelSelector, add state management for per-stage model selections, render StageModelSelector components for each stage in orchestrator workflows, include stageModels in workflow trigger payload, and implement reset functionality.

## Files to Modify
- `src/components/forms/WorkflowTriggerModal.jsx` - Add per-stage model selection UI

## Implementation Steps

### Step 1: Import StageModelSelector and model utilities
- Import `StageModelSelector` component from `'../ui/StageModelSelector'`
- Import model utilities from `'../../utils/modelDefaults'`: `getDefaultModelForStage`, `generateDefaultStageModels`, `MODEL_INFO`
- Import `RotateCcw` icon from `'lucide-react'` for reset button

### Step 2: Add stageModels state and stage extraction logic
- Add state: `const [stageModels, setStageModels] = useState({})`
- Create helper function `getStagesForWorkflow(workflowType)` that returns stage names based on workflow type:
  - `adw_plan_build_iso` → `['plan', 'build']`
  - `adw_plan_build_test_iso` → `['plan', 'build', 'test']`
  - `adw_sdlc_iso` → `['plan', 'build', 'test', 'review', 'document']`
  - `adw_sdlc_zte_iso` → `['plan', 'build', 'test', 'review', 'document', 'merge']`
  - Other workflows → `[]` (empty array for non-orchestrator workflows)
- Add `useEffect` hook that runs when `workflowType` changes to initialize `stageModels` with defaults using `generateDefaultStageModels(getStagesForWorkflow(workflowType))`

### Step 3: Render StageModelSelector components for orchestrator workflows
- After the "Model Set Selection" section and before "Issue Number" section, add a conditional section that renders only for orchestrator workflows (category === 'orchestrator')
- Section header: "Per-Stage Model Configuration"
- Helper text explaining that users can customize which AI model to use for each stage
- Map over `getStagesForWorkflow(workflowType)` and render a `StageModelSelector` for each stage
- Each selector receives:
  - `key={stageName}`
  - `stageName={stageName}`
  - `selectedModel={stageModels[stageName] || getDefaultModelForStage(stageName)}`
  - `onChange={(model) => setStageModels(prev => ({ ...prev, [stageName]: model }))}`
  - `disabled={isTriggering}`

### Step 4: Include stageModels in workflow trigger payload
- In `handleSubmit()`, add `stageModels` to the `options` object before calling `triggerWorkflowForTask`
- Only include `stageModels` if the workflow is an orchestrator type (check if `getStagesForWorkflow(workflowType).length > 0`)

### Step 5: Add 'Reset to Defaults' functionality
- Add "Reset to Defaults" button below the StageModelSelector components
- Button should:
  - Use `RotateCcw` icon
  - Have styling: `btn-secondary flex items-center space-x-2`
  - OnClick: `setStageModels(generateDefaultStageModels(getStagesForWorkflow(workflowType)))`
  - Be disabled when `isTriggering`
  - Text: "Reset to Defaults"

### Step 6: Create/Update Tests
- Create unit tests in `src/components/forms/__tests__/WorkflowTriggerModal.test.jsx`:
  - Test that StageModelSelector components render for orchestrator workflows
  - Test that default models are pre-populated when workflow type is selected
  - Test that changing a model selection updates stageModels state
  - Test that workflow trigger payload includes stageModels
  - Test that "Reset to Defaults" button restores default models
  - Test that non-orchestrator workflows do not render StageModelSelector
- Run E2E test plan in `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md`:
  - Test Case 1: Custom Per-Stage Model Selection
  - Test Case 2: Default Model Population
  - Test Case 3: Reset to Defaults Functionality

## Validation
Execute every command to validate the patch is complete with zero regressions.

- `npm run test -- WorkflowTriggerModal` - Verify unit tests pass
- `npm run typecheck` - Verify TypeScript types are valid
- `npm run build` - Verify frontend builds successfully
- Manual E2E test: Follow test plan in `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md` Test Cases 1-3

## Patch Scope
**Lines of code to change:** ~80-100 lines (add imports, state, helper function, conditional UI section, update payload)
**Risk level:** low
**Testing required:** Unit tests for component state management and payload inclusion, E2E tests for UI interaction and WebSocket payload verification
