# Feature: Per-Stage Model Selection for SDLC Pipeline

## Metadata

issue_number: `1298`
adw_id: `9221d732`
issue_json: `{"number":1298,"title":"currently most of the stages are using sonnet mode...","body":"currently most of the stages are using sonnet model.. but now i wnat to change that and also want give the flexilit of selcting model per stage.. lets default plan and buid to opus, in teh plan all those smaler sub phases can use haiku, test, review, documetn - sonnet, merge -> haiku.. can u try to implement this.. while creating the ticket can you povision at the selection of stages what model also to use???? lets try what you can come up withSo basically within the plan box as you know the initial way when we create the tickets right so within the plan I can select there should be a small drop down where I can select a model and yeah I think that should be fine for now. So we can have a default some default like for plan and build we can have opus for clarify we can have high queue for other things maybe we can have you know opus only for now so by default. So what I was thinking is this can really help to save a lot of you know I can make it more flexible and configurable."}`

## Feature Description

Implement per-stage model selection in the Kanban application's SDLC workflow to allow users to configure which Claude model (Opus, Sonnet, or Haiku) should be used for each pipeline stage during ticket creation. This feature enables cost optimization and performance tuning by allowing users to assign more powerful models (Opus) to complex stages like Plan and Build, while using faster/cheaper models (Haiku) for simpler stages like Clarify and Merge. Model preferences are stored in the task document and respected throughout the workflow execution.

## User Story

As a **developer managing SDLC workflows**
I want to **select different Claude models for different pipeline stages when creating a ticket**
So that **I can optimize costs by using appropriate models for each stage's complexity and save resources while maintaining quality**

## Problem Statement

Currently, the SDLC workflow uses a single model configuration (base or heavy model set) for all stages. This approach is inflexible and doesn't allow for optimization based on stage complexity. Simple stages like Clarify or Merge don't need the most powerful model, while complex stages like Plan and Build benefit from more capable models. Users cannot fine-tune model selection per stage, leading to either:
1. Suboptimal performance when using lighter models for complex stages
2. Unnecessary costs when using powerful models for simple stages

The system needs a way to specify model preferences per stage at ticket creation time, with sensible defaults that optimize for both cost and quality.

## Solution Statement

Implement a per-stage model selection UI in the TaskInput component (ticket creation dialog) that allows users to choose between Opus, Sonnet, and Haiku for each selected pipeline stage. Model preferences are stored in the task metadata and persisted to the database. When the backend executes each stage, it reads the model preference from the stored configuration and passes it to the Claude Code agent execution system. The solution includes:

1. **Frontend UI**: Dropdown/selector next to each stage button in the ticket creation form
2. **Default Model Configuration**: Sensible defaults (Plan/Build: Opus, Clarify: Haiku, Test/Review/Document: Sonnet, Merge: Haiku)
3. **Data Model Extension**: Extend task metadata to include `stageModelPreferences` field mapping stage names to model choices
4. **Backend Integration**: Update agent execution logic to read and respect stored model preferences
5. **Database Persistence**: Store model preferences in ADW state for retrieval during workflow execution

## Relevant Files

Use these files to implement the feature:

- **Frontend - UI Components**
  - `src/components/forms/TaskInput.jsx` - Main ticket creation dialog where model selection UI will be added
    - Contains stage selection buttons (lines 457-523)
    - Handles task data submission and validation
    - Need to add model selector dropdowns next to each stage button

- **Frontend - Constants and Types**
  - `src/constants/workItems.js` - Work item types and stage definitions
    - Contains QUEUEABLE_STAGES, SDLC_STAGES definitions
    - Need to add MODEL_OPTIONS constant with available models
    - Need to add DEFAULT_STAGE_MODELS constant with default model assignments

- **Frontend - State Management**
  - `src/stores/kanbanStore.js` - Zustand store managing task state
    - `createTask` function (line 638) creates new tasks and ADW configurations
    - Need to include stageModelPreferences in task metadata
    - Passes data to adwCreationService and adwDbService

- **Frontend - Services**
  - `src/services/adwCreationService.js` - Creates ADW configuration objects
    - Generates ADW configuration from task data
    - Need to include model preferences in generated configuration

- **Backend - Database Models**
  - `server/models/adw_db_models.py` - Pydantic models for database
    - `ADWStateDB` model stores ADW state (line 71)
    - `orchestrator_state` field (line 89) stores JSON config - will include model preferences
    - `ADWStateCreate` model (line 116) for creating new ADW entries
    - `ADWStateUpdate` model (line 138) for updates

- **Backend - Stage Execution**
  - `adws/stages/base_stage.py` - Base class for all stages
    - `run_script` method (line 39) executes stage scripts
    - Need to pass model parameter to stage execution

  - `adws/stages/plan_stage.py` - Plan stage implementation
    - `execute` method (line 29) runs the plan script
    - Example of how to extract and use model from context

  - `adws/orchestrator/stage_interface.py` - Stage context and interface
    - `StageContext` dataclass (line 34) contains execution context
    - Need to add model preference to context config

- **Backend - Agent Execution**
  - `adws/adw_modules/agent.py` - Claude Code agent execution
    - `SLASH_COMMAND_MODEL_MAP` (line 27) maps slash commands to models
    - `get_model_for_slash_command` function (line 52) determines model to use
    - Need to extend to check stage-specific preferences from orchestrator state

  - `adws/adw_modules/data_types.py` - Data type definitions
    - Contains ModelSet enum and agent request types
    - Need to add per-stage model configuration types

- **Backend - Tests**
  - `adws/adw_tests/test_model_selection.py` - Existing model selection tests
    - Test model mapping and lookups
    - Need to add tests for per-stage model selection

### New Files

- `src/constants/modelDefaults.js` - Model configuration constants
  - Available models (Opus, Sonnet, Haiku)
  - Default model assignments per stage
  - Model metadata (descriptions, use cases, cost indicators)

- `src/components/forms/ModelSelector.jsx` - Reusable model selector component
  - Dropdown for selecting Claude model
  - Props: selectedModel, onChange, stage (for context-aware defaults)
  - Brutalist styling consistent with TaskInput

- `src/test/integration/model-selection-persistence.integration.test.js` - Integration tests
  - Test model preferences persist from UI through database
  - Test model preferences are applied during workflow execution

- `src/test/e2e/issue-1298-adw-9221d732-e2e-model-selection.md` - E2E test plan
  - User creates ticket with custom model selections
  - Verify models are stored correctly
  - Verify correct models are used during execution

- `adws/utils/model_config.py` - Model configuration utilities
  - Functions to extract per-stage models from orchestrator state
  - Fallback to default models when not specified
  - Model validation

## Implementation Plan

### Phase 1: Foundation - Data Model and Constants

Establish the data structures and constants needed for per-stage model selection throughout the stack.

**Tasks:**
1. Create model configuration constants in frontend
2. Extend database models to support per-stage model preferences
3. Create backend model configuration utilities
4. Update TypeScript/JSDoc types for model preferences

### Phase 2: Core Implementation - UI and State Management

Build the user-facing model selection interface and integrate it with task creation flow.

**Tasks:**
1. Create ModelSelector component with brutalist styling
2. Integrate model selectors into TaskInput stage selection UI
3. Update task creation logic to capture and store model preferences
4. Add validation for model selections
5. Persist model preferences to database via ADW state

### Phase 3: Backend Integration - Workflow Execution

Update the backend workflow execution system to read and apply stored model preferences.

**Tasks:**
1. Update orchestrator to load model preferences from ADW state
2. Modify stage execution context to include model information
3. Update agent execution to respect per-stage model preferences
4. Add fallback logic for missing model configurations
5. Update slash command model resolution to check stage preferences first

## Step by Step Tasks

### Task 1: Create Model Configuration Constants

Create a new constants file defining available models and default assignments per stage.

- Create `src/constants/modelDefaults.js`
- Define `CLAUDE_MODELS` constant with Opus, Sonnet, Haiku
- Define `DEFAULT_STAGE_MODELS` mapping each stage to its default model
  - plan: 'opus'
  - implement: 'opus'
  - test: 'sonnet'
  - review: 'sonnet'
  - document: 'sonnet'
  - clarify: 'haiku'
  - merge: 'haiku'
- Define `MODEL_METADATA` with descriptions and use case information
- Export all constants

### Task 2: Create ModelSelector Component

Build a reusable dropdown component for selecting Claude models.

- Create `src/components/forms/ModelSelector.jsx`
- Accept props: `selectedModel`, `onChange`, `stage`, `disabled`
- Render brutalist-styled dropdown matching TaskInput aesthetics
- Display model name with icon/indicator
- Show tooltip with model description on hover
- Handle disabled state for locked selections
- Add unit tests in `__tests__/ModelSelector.test.jsx`

### Task 3: Integrate Model Selectors into TaskInput

Add model selection dropdowns next to each stage button in the ticket creation form.

- Update `src/components/forms/TaskInput.jsx`
- Import ModelSelector component and modelDefaults constants
- Add `stageModelPreferences` state variable (initialized with defaults)
- Update stage button rendering (lines 484-503) to include ModelSelector
- Position ModelSelector dropdown next to each stage button
- Wire up onChange handler to update stageModelPreferences
- Ensure model selector is disabled when stage is not selected
- Update stage toggle handler to initialize model preference on first selection
- Add visual indicator showing which model is selected per stage
- Maintain brutalist styling consistency

### Task 4: Update Task Creation to Include Model Preferences

Modify the task creation flow to capture and transmit model preferences.

- Update `src/components/forms/TaskInput.jsx` handleSubmit function
- Include `stageModelPreferences` in taskData object (around line 262)
- Update `src/stores/kanbanStore.js` createTask function
- Add stageModelPreferences to task metadata (around line 682)
- Ensure model preferences are passed to adwCreationService

### Task 5: Extend ADW Creation Service

Update the ADW creation service to include model preferences in configuration.

- Update `src/services/adwCreationService.js`
- Add stageModelPreferences to generated ADW config
- Include in orchestrator_state field for backend consumption
- Validate model preferences format before inclusion
- Add JSDoc documentation for new fields

### Task 6: Update Database Models

Extend Pydantic models to support per-stage model configuration.

- Update `server/models/adw_db_models.py`
- Add documentation to `orchestrator_state` field noting it includes model prefs
- No schema changes needed (JSON field already flexible)
- Update `ADWStateCreate` JSDoc to document orchestrator_state structure
- Add validation example showing model preferences format

### Task 7: Create Backend Model Configuration Utilities

Build utility functions for extracting and validating model preferences.

- Create `adws/utils/model_config.py`
- Implement `get_stage_model(orchestrator_state, stage_name, default)` function
  - Extract model preference for specific stage from orchestrator state
  - Return default if not specified
  - Validate model is valid (opus/sonnet/haiku)
- Implement `get_all_stage_models(orchestrator_state)` function
  - Return dict mapping all stages to their models
- Implement `validate_model_preferences(model_prefs)` function
  - Ensure all models are valid values
  - Return validation errors if any
- Add unit tests in `adws/utils/tests/test_model_config.py`

### Task 8: Update Stage Context for Model Information

Modify the stage execution context to include model preferences.

- Update `adws/orchestrator/stage_interface.py`
- Add optional `model` field to `StageContext.config` documentation
- Update docstring to explain model preference propagation
- No code changes needed (config is already Dict[str, Any])

### Task 9: Update Agent Model Selection Logic

Extend agent execution to check per-stage model preferences before falling back to model set.

- Update `adws/adw_modules/agent.py`
- Modify `get_model_for_slash_command` function
- Add parameter to accept stage_name
- Check orchestrator_state for stage-specific model first
- Fall back to SLASH_COMMAND_MODEL_MAP if not specified
- Preserve existing model_set logic as final fallback
- Update all callers to pass stage information when available
- Add documentation explaining precedence: stage preference > slash command map > model set

### Task 10: Update Plan Stage to Pass Model Preference

Modify plan stage to extract and use model preference during execution.

- Update `adws/stages/plan_stage.py`
- In `execute` method, extract model from context config
- Pass model to run_script if available
- Demonstrate pattern for other stages to follow

### Task 11: Update Base Stage Script Runner

Modify base stage to support model parameter in script execution.

- Update `adws/stages/base_stage.py`
- Add optional `model` parameter to `run_script` method
- If model provided, pass it to the underlying script/agent
- Update method signature and documentation
- Ensure backward compatibility (model parameter is optional)

### Task 12: Update All Stage Implementations

Apply model preference extraction pattern to all stage classes.

- Update `adws/stages/build_stage.py`
- Update `adws/stages/test_stage.py`
- Update `adws/stages/review_stage.py`
- Update `adws/stages/document_stage.py`
- Update `adws/stages/merge_stage.py`
- Update `adws/stages/clarify_stage.py`
- Each stage extracts model from context and passes to run_script
- Use stage-specific defaults if model not in context

### Task 13: Create Frontend Unit Tests

Write comprehensive unit tests for new frontend components and logic.

- Create `src/components/forms/__tests__/ModelSelector.test.jsx`
  - Test rendering with different selected models
  - Test onChange callback
  - Test disabled state
  - Test default model selection
- Update `src/components/forms/__tests__/TaskInput.test.jsx`
  - Test model selector integration
  - Test stageModelPreferences in submitted data
  - Test default model initialization
  - Test model selector disabled when stage not selected

### Task 14: Create Backend Unit Tests

Write unit tests for backend model configuration utilities.

- Create `adws/utils/tests/test_model_config.py`
  - Test get_stage_model with various inputs
  - Test default model fallback
  - Test invalid model handling
  - Test get_all_stage_models
  - Test validate_model_preferences
- Update `adws/adw_tests/test_model_selection.py`
  - Add tests for per-stage model preference resolution
  - Test precedence: stage pref > slash command map > model set
  - Test orchestrator state integration

### Task 15: Create Integration Tests

Test end-to-end flow from UI through database to execution.

- Create `src/test/integration/model-selection-persistence.integration.test.js`
  - Mock task creation with model preferences
  - Verify preferences stored in database
  - Verify preferences retrievable from database
  - Mock workflow execution and verify correct models used
  - Test fallback behavior when preferences not specified

### Task 16: Create E2E Test Specification

Document manual E2E test scenarios for validation.

- Create `src/test/e2e/issue-1298-adw-9221d732-e2e-model-selection.md`
  - Scenario 1: Create ticket with all default models
  - Scenario 2: Create ticket with custom model selections
  - Scenario 3: Verify models stored in database
  - Scenario 4: Start workflow and verify correct models used in logs
  - Scenario 5: Test stage without model preference uses fallback
  - Include verification steps and expected outcomes

### Task 17: Update Documentation and Comments

Add comprehensive documentation for the new feature.

- Update `src/components/forms/TaskInput.jsx` JSDoc
  - Document stageModelPreferences state
  - Document model selection behavior
- Update `README.md` if appropriate
  - Add section on model selection in ticket creation
- Add inline comments explaining model preference precedence
- Update code quality documentation if applicable

### Task 18: Run Validation Commands

Execute all validation commands to ensure zero regressions and feature correctness.

- Run backend tests: `cd server && uv run pytest`
- Run TypeScript type checking: `bun tsc --noEmit`
- Run frontend build: `bun run build`
- Run frontend unit tests: `bun test`
- Manually test E2E scenarios from test spec
- Verify no console errors or warnings
- Test with different stage combinations
- Verify database persistence
- Verify model preferences respected during execution

## Testing Strategy

### Unit Tests

#### Backend Unit Tests

**Location**: `adws/utils/tests/test_model_config.py`

Test the model configuration utility functions:
- `test_get_stage_model_with_preference()` - Verify stage-specific model returned when set
- `test_get_stage_model_with_default()` - Verify default used when no preference
- `test_get_stage_model_invalid_model()` - Verify invalid models rejected/defaulted
- `test_get_all_stage_models()` - Verify all stage models extracted correctly
- `test_validate_model_preferences_valid()` - Verify valid preferences pass
- `test_validate_model_preferences_invalid()` - Verify invalid preferences caught

**Location**: `adws/adw_tests/test_model_selection.py` (extend existing)

Test model selection precedence:
- `test_stage_preference_overrides_command_map()` - Stage pref takes precedence
- `test_command_map_fallback()` - Falls back to command map when no stage pref
- `test_model_set_final_fallback()` - Falls back to model set as last resort
- `test_orchestrator_state_integration()` - Test loading from orchestrator_state

#### Frontend Unit Tests

**Location**: `src/components/forms/__tests__/ModelSelector.test.jsx`

Test ModelSelector component:
- `test_renders_with_selected_model()` - Renders showing current selection
- `test_calls_onChange_when_selection_changes()` - onChange fired correctly
- `test_displays_model_options()` - All models available in dropdown
- `test_disabled_state()` - Component disabled when prop set
- `test_shows_default_for_stage()` - Correct default shown based on stage

**Location**: `src/components/forms/__tests__/TaskInput.test.jsx` (extend existing)

Test TaskInput integration:
- `test_model_selectors_rendered_for_stages()` - Selectors shown for each stage
- `test_model_preferences_included_in_task_data()` - Submitted data includes models
- `test_default_models_initialized()` - Defaults loaded on component mount
- `test_model_selector_disabled_when_stage_not_selected()` - Selector disabled correctly
- `test_model_preference_updates()` - Changing model updates state

#### Integration Tests

**Location**: `src/test/integration/model-selection-persistence.integration.test.js`

Test cross-component data flow:
- `test_model_preferences_persist_to_database()` - Prefs saved in ADW state
- `test_model_preferences_retrieved_from_database()` - Prefs loaded correctly
- `test_workflow_execution_uses_correct_models()` - Execution respects prefs
- `test_fallback_when_preferences_missing()` - Defaults used when not specified
- `test_invalid_model_handled_gracefully()` - Invalid models don't break flow

### E2E Tests

**Location**: `src/test/e2e/issue-1298-adw-9221d732-e2e-model-selection.md`

Manual test scenarios:
1. **Create Ticket with Default Models**
   - Open TaskInput modal
   - Select all SDLC stages
   - Verify default models shown (Plan:Opus, Test:Sonnet, etc.)
   - Submit ticket
   - Verify created successfully

2. **Create Ticket with Custom Models**
   - Open TaskInput modal
   - Select Plan, Implement, Test stages
   - Change Plan to Sonnet, Test to Haiku
   - Submit ticket
   - Verify custom selections saved

3. **Verify Database Persistence**
   - Query ADW state from database
   - Verify orchestrator_state contains stageModelPreferences
   - Verify model values match UI selections

4. **Verify Execution Uses Correct Models**
   - Start workflow for ticket with custom models
   - Monitor agent execution logs
   - Verify Plan stage uses Sonnet (custom selection)
   - Verify Test stage uses Haiku (custom selection)
   - Verify logs show model being passed to Claude Code

5. **Verify Fallback Behavior**
   - Create ticket without specifying models (old flow)
   - Start workflow
   - Verify system falls back to SLASH_COMMAND_MODEL_MAP
   - Verify workflow executes successfully

### Edge Cases

Edge cases requiring special testing:

1. **Missing Model Preferences**
   - Task created before feature implementation (no stageModelPreferences)
   - System should fall back to SLASH_COMMAND_MODEL_MAP and model_set
   - Workflow should execute without errors

2. **Invalid Model Values**
   - User somehow submits invalid model name (e.g., 'gpt-4')
   - Validation should catch and reject, or sanitize to default
   - No data corruption in database

3. **Partial Model Preferences**
   - User specifies models for some stages but not all
   - Specified stages use preferences
   - Unspecified stages use defaults
   - No undefined/null errors

4. **Stage Not in Workflow**
   - Model preference exists for stage not in current workflow
   - Extra preferences ignored gracefully
   - No errors during execution

5. **Model Selector State Sync**
   - User selects stage, changes model, deselects stage, reselects
   - Model preference should be preserved
   - UI should show previously selected model

6. **Database Migration**
   - Existing tasks without stageModelPreferences field
   - Database queries handle missing field gracefully
   - Old tasks continue to work with defaults

7. **Concurrent Updates**
   - Multiple users editing tasks simultaneously
   - Last write wins or conflict resolution
   - No data loss or corruption

8. **Large Number of Stages**
   - Task with all SDLC stages selected
   - UI remains usable and doesn't overflow
   - All model selectors functional

## Acceptance Criteria

The feature is complete when all of the following criteria are met:

1. **UI Functionality**
   - ✅ Model selector dropdown appears next to each stage button in TaskInput
   - ✅ Dropdowns show Opus, Sonnet, and Haiku options
   - ✅ Default models are pre-selected based on stage (Plan:Opus, Test:Sonnet, etc.)
   - ✅ User can change model selection per stage
   - ✅ Model selector is disabled when stage is not selected
   - ✅ Visual styling matches brutalist design of TaskInput
   - ✅ Model selections are visually clear and distinguishable

2. **Data Persistence**
   - ✅ Model preferences saved in task metadata on task creation
   - ✅ Model preferences persisted to database in orchestrator_state
   - ✅ Model preferences retrievable when loading task from database
   - ✅ Database queries handle tasks with and without model preferences

3. **Workflow Execution**
   - ✅ Backend reads model preferences from orchestrator_state
   - ✅ Each stage uses the specified model during execution
   - ✅ Agent execution logs show correct model being used
   - ✅ Fallback to SLASH_COMMAND_MODEL_MAP when preference not specified
   - ✅ Fallback to model_set when no other configuration available

4. **Validation and Error Handling**
   - ✅ Invalid model selections rejected during validation
   - ✅ Missing model preferences handled gracefully with defaults
   - ✅ No errors when loading old tasks without model preferences
   - ✅ Helpful error messages for invalid configurations

5. **Testing**
   - ✅ All unit tests pass (backend and frontend)
   - ✅ Integration tests verify end-to-end flow
   - ✅ E2E manual tests executed and verified
   - ✅ Edge cases tested and handled correctly
   - ✅ Zero regressions in existing functionality

6. **Documentation**
   - ✅ Code comments explain model preference precedence
   - ✅ JSDoc updated for modified functions
   - ✅ README updated if applicable
   - ✅ E2E test documentation created

7. **Performance**
   - ✅ No performance degradation in task creation
   - ✅ No slowdown in workflow execution
   - ✅ Database queries remain performant

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

**Backend Validation:**
```bash
cd server && uv run pytest
```
Verify all backend tests pass, including new model configuration tests.

**Frontend Type Checking:**
```bash
bun tsc --noEmit
```
Verify no TypeScript errors in frontend code.

**Frontend Build:**
```bash
bun run build
```
Verify frontend builds successfully without errors or warnings.

**Frontend Unit Tests:**
```bash
bun test
```
Verify all frontend tests pass, including new ModelSelector and TaskInput tests.

**Integration Tests:**
```bash
bun test -- model-selection-persistence.integration.test.js
```
Verify model preferences persist and are used correctly.

**Backend Model Selection Tests:**
```bash
cd adws && uv run python -m pytest adw_tests/test_model_selection.py -v
```
Verify per-stage model selection logic works correctly.

**Model Config Utility Tests:**
```bash
cd adws && uv run python -m pytest utils/tests/test_model_config.py -v
```
Verify model configuration utility functions work correctly.

**Manual E2E Testing:**
Follow scenarios in `src/test/e2e/issue-1298-adw-9221d732-e2e-model-selection.md` to verify:
- Model selectors appear in UI
- Model preferences are saved
- Workflows use correct models
- Defaults work when preferences not specified

**Database Verification:**
```bash
# Query a task's model preferences from database
sqlite3 server/adw_state.db "SELECT orchestrator_state FROM adw_states WHERE adw_id = '<test_adw_id>' LIMIT 1;"
```
Verify orchestrator_state contains stageModelPreferences in correct format.

**Full Validation Suite:**
```bash
# Run all tests and checks
cd server && uv run pytest && cd .. && bun tsc --noEmit && bun run build && bun test
```
All commands must complete successfully with zero errors.

## Notes

### Model Selection Precedence

The system uses a three-tier fallback for model selection:
1. **Stage-specific preference** (from orchestrator_state.stageModelPreferences)
2. **Slash command mapping** (from SLASH_COMMAND_MODEL_MAP in agent.py)
3. **Model set fallback** (base or heavy from ADW state)

This ensures backward compatibility while enabling fine-grained control.

### Available Models

Currently limited to Claude Code models:
- **opus** - Most capable, best for complex tasks (Plan, Build)
- **sonnet** - Balanced performance (Test, Review, Document)
- **haiku** - Fastest, most economical (Clarify, Merge)

Future enhancement could support other model providers.

### UI Design Philosophy

Model selectors follow the brutalist design system established in TaskInput:
- Bold borders and sharp edges
- Monospace "Courier New" font
- High contrast colors
- Clear visual hierarchy
- Minimal but functional

### Database Schema Considerations

No schema migration needed - `orchestrator_state` is already a JSON field that can accommodate the new `stageModelPreferences` structure. Example format:

```json
{
  "stageModelPreferences": {
    "plan": "opus",
    "implement": "opus",
    "test": "sonnet",
    "review": "sonnet",
    "document": "sonnet",
    "merge": "haiku"
  }
}
```

### Performance Optimization

Model selection adds minimal overhead:
- Frontend: Single additional state variable in TaskInput
- Backend: Simple dict lookup in orchestrator state
- Database: No additional queries (data in existing JSON field)

### Future Enhancements

Potential improvements for future iterations:
1. Model selection templates (e.g., "Cost Optimized", "Performance Focused")
2. Model usage analytics and cost tracking
3. Recommended models based on task complexity
4. Model selection in edit mode (currently creation only)
5. Global model preference defaults per project
6. A/B testing different model configurations
7. Model performance metrics display

### Migration Strategy

Existing tasks without model preferences will:
1. Load successfully (no errors)
2. Use SLASH_COMMAND_MODEL_MAP for model selection
3. Fall back to model_set (base/heavy) as needed
4. Continue executing workflows normally

No data migration required - feature is additive and backward compatible.
