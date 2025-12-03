# Feature: Per-Stage Model Selection for ADW Workflows

## Metadata

issue_number: `26`
adw_id: `29aefea6`
issue_json: `{"number":26,"title":"currently most of the stages are using sonnet mode...","body":"currently most of the stages are using sonnet model.. but now i wnat to change that and also want give the  flexilit of selcting model per stage.. lets default plan and buid to opus, in teh plan all those smaler sub  phases can use haiku, test, review, documetn - sonnet, merge -> haiku.. can u try to implement this.. while  creating the ticket can you povision at the selection of stages what model also to use???? lets try what you can  come up with"}`

## Feature Description

This feature implements granular model selection at the per-stage level for ADW (Agentic Development Workflow) orchestration. Currently, the system uses a global model configuration (base vs heavy model sets) that applies uniformly across all stages. This enhancement allows users to specify which AI model (Sonnet, Haiku, or Opus) should be used for each individual stage in a workflow, enabling optimal resource allocation based on the complexity and requirements of each stage.

The feature adds model selection capabilities at two levels:
1. **Stage Configuration**: Allow users to specify which model to use when creating or configuring stages in the workflow orchestrator
2. **Task Creation**: Provide UI controls in the Kanban board's task creation/workflow trigger modal to select models per stage

This enables intelligent model allocation where complex stages (Plan, Build) can use more capable models (Opus), while simpler stages (Merge) can use faster, cheaper models (Haiku), and balanced stages (Test, Review, Document) can use the standard model (Sonnet).

## User Story

As a **developer using the ADW workflow system**
I want to **select specific AI models for each stage of my workflow**
So that **I can optimize for both cost and quality by using powerful models for complex tasks and efficient models for simple tasks**

## Problem Statement

The current ADW system uses a binary model set approach (base vs heavy) that applies the same model configuration across all stages of a workflow. This creates several issues:

1. **Inefficiency**: Simple stages like "merge" don't need powerful models, wasting resources
2. **Inflexibility**: Complex stages might need more capable models, but switching to "heavy" affects all stages
3. **No Per-Stage Control**: Users cannot fine-tune model selection based on the specific requirements of each stage
4. **Suboptimal Cost/Performance**: No way to balance cost vs quality at a granular level

The issue specifically requests:
- Plan and Build stages should default to Opus (most capable)
- Sub-phases within Plan can use Haiku (fastest, cheapest)
- Test, Review, Document should use Sonnet (balanced)
- Merge should use Haiku (simple task)
- UI should allow model selection when creating tasks/selecting stages

## Solution Statement

Implement a comprehensive per-stage model selection system with the following components:

1. **Backend Stage Configuration**: Extend the orchestrator's `StageConfig` to include a `model` field that specifies which AI model to use for that stage
2. **Model Mapping Enhancement**: Update the agent module to support per-stage model overrides that take precedence over global model sets
3. **Frontend UI Controls**: Add model selection dropdowns to the WorkflowTriggerModal that allow users to configure models for each selected stage
4. **Default Model Strategy**: Implement intelligent defaults (Opus for Plan/Build, Sonnet for Test/Review/Document, Haiku for Merge)
5. **State Persistence**: Store per-stage model selections in ADW state for resume capability
6. **Backward Compatibility**: Ensure existing workflows continue to work with the global model_set approach

The solution maintains the existing model_set system as a fallback while adding fine-grained control for advanced users.

## Relevant Files

### Backend Files
- **adws/orchestrator/config_loader.py** - Add `model` field to `StageConfig` dataclass to support per-stage model configuration
- **adws/orchestrator/stage_interface.py** - Update `StageContext` to include current stage's model selection, making it available to all stage implementations
- **adws/adw_modules/agent.py** - Enhance `get_model_for_slash_command()` to check for per-stage model overrides before falling back to model set mappings; update `execute_template()` to pass stage-specific model
- **adws/adw_modules/data_types.py** - Add `stage_model_overrides: Dict[str, Literal["sonnet", "haiku", "opus"]]` field to `ADWStateData` to persist per-stage model selections
- **adws/stages/base_stage.py** - Update base stage to extract and pass model configuration from context to agent execution
- **adws/adw_orchestrator.py** - Read per-stage model config from orchestrator config and apply to stage context during execution
- **adws/adw_triggers/websocket_models.py** - Add `stage_models: Optional[Dict[str, str]]` to `TriggerWorkflowRequest` to accept model selections from frontend

### Frontend Files
- **src/components/forms/WorkflowTriggerModal.jsx** - Add per-stage model selection UI with dropdowns for each selected stage; implement default model logic based on stage name
- **src/stores/kanbanStore.js** - Update `triggerWorkflowForTask` to include stage model selections in WebSocket payload
- **src/utils/adwValidation.js** - Add helper functions for validating model selections and generating default model configurations per stage

### Test Files
- **adws/adw_tests/test_model_selection.py** - Update existing model selection tests to verify per-stage model override behavior
- **server/tests/test_stage_logs.py** - Add tests to verify stage logs capture correct model information per stage

### New Files

#### Backend
- **adws/utils/model_config.py** - Utility module for managing model configuration, defaults, and validation; provides `get_default_model_for_stage()` and `validate_model_choice()` functions

#### Frontend
- **src/components/ui/StageModelSelector.jsx** - Reusable component for selecting AI model per stage with visual indicators for cost/performance trade-offs
- **src/utils/__tests__/modelDefaults.test.js** - Unit tests for default model selection logic
- **src/utils/modelDefaults.js** - Utility functions for generating default model configurations based on stage names

#### Tests
- **adws/adw_tests/test_per_stage_models.py** - Integration tests for per-stage model execution end-to-end
- **src/components/forms/__tests__/WorkflowTriggerModal.stageModels.test.jsx** - Unit tests for stage model selection UI in WorkflowTriggerModal
- **src/components/ui/__tests__/StageModelSelector.test.jsx** - Unit tests for StageModelSelector component

## Implementation Plan

### Phase 1: Foundation - Backend Model Infrastructure

Set up the backend infrastructure to support per-stage model configuration throughout the orchestrator and agent execution pipeline.

**Goals:**
- Extend data structures to support per-stage model configuration
- Implement model configuration utilities and validation
- Update orchestrator to pass model config to stages

**Key Changes:**
- Add `model` field to `StageConfig` in config_loader.py
- Extend `ADWStateData` with `stage_model_overrides` dictionary
- Create model configuration utility module with defaults and validation
- Update `StageContext` to include current stage's model

### Phase 2: Core Implementation - Agent Execution with Per-Stage Models

Implement the core logic for agent execution using per-stage model selections, including priority handling and fallback mechanisms.

**Goals:**
- Enable stages to execute with their specified models
- Implement proper priority: stage override > model set > defaults
- Ensure backward compatibility with existing model_set approach

**Key Changes:**
- Enhance `get_model_for_slash_command()` to check stage context for model overrides
- Update `execute_template()` to accept and use stage-specific models
- Modify base stages to read model from context and pass to agent
- Update orchestrator to apply stage model config during execution

### Phase 3: Integration - Frontend UI and WebSocket Communication

Build the frontend interface for per-stage model selection and integrate with the backend through WebSocket workflow triggers.

**Goals:**
- Provide intuitive UI for selecting models per stage
- Implement intelligent defaults based on stage complexity
- Pass model selections through WebSocket to orchestrator

**Key Changes:**
- Add model selection UI to WorkflowTriggerModal
- Create StageModelSelector component with cost/performance indicators
- Update WebSocket trigger payload to include stage models
- Implement default model logic in frontend utilities

## Step by Step Tasks

### Create Backend Model Configuration Utilities

- Create new file `adws/utils/model_config.py` with model configuration helpers
- Implement `get_default_model_for_stage(stage_name: str) -> str` function that returns:
  - "opus" for "plan" and "build" stages
  - "sonnet" for "test", "review", and "document" stages
  - "haiku" for "merge" stage
  - "sonnet" as fallback for unknown stages
- Implement `validate_model_choice(model: str) -> bool` function to validate model is one of ["sonnet", "haiku", "opus"]
- Implement `get_model_display_info(model: str) -> dict` to return metadata (cost tier, performance tier, description) for each model
- Add docstrings and type hints to all functions
- Write unit tests in `adws/utils/tests/test_model_config.py` covering all helper functions

### Extend Data Structures for Per-Stage Model Storage

- Update `adws/adw_modules/data_types.py`:
  - Add `stage_model_overrides: Optional[Dict[str, Literal["sonnet", "haiku", "opus"]]]` field to `ADWStateData` class with default empty dict
  - Update class docstring to explain the field stores user-specified model selections per stage
- Update `adws/orchestrator/config_loader.py`:
  - Add `model: Optional[Literal["sonnet", "haiku", "opus"]]` field to `StageConfig` dataclass
  - Update `_parse_config()` to read `model` from YAML stage configuration
  - Update `load_from_orchestrator_config()` to apply stage model from orchestrator config if provided
  - Update docstrings to document the new model field
- Update `adws/orchestrator/stage_interface.py`:
  - Add `stage_model: Optional[str]` field to `StageContext` dataclass to carry current stage's model selection
  - Update class docstring to explain this field contains the model to use for agent execution in this stage
- Write unit tests for data structure serialization/deserialization in `adws/adw_tests/test_data_structures.py`

### Update Agent Module to Support Per-Stage Model Overrides

- Update `adws/adw_modules/agent.py`:
  - Modify `get_model_for_slash_command()` signature to accept optional `stage_context: Optional[StageContext] = None` parameter
  - Add logic to check `stage_context.stage_model` first; if present and valid, return it
  - If no stage override, fall back to existing model set lookup logic
  - Add comments explaining the priority: stage override > model set > default
  - Update all call sites to pass stage context when available
  - Update `execute_template()` to accept and use `model_override: Optional[str] = None` parameter
  - Update docstrings with new parameters and priority logic
- Write unit tests in `adws/adw_tests/test_model_selection.py`:
  - Test stage override takes precedence over model set
  - Test fallback to model set when no stage override
  - Test default model when neither is specified
  - Test invalid model values are rejected or fall back to defaults

### Update Orchestrator to Apply Per-Stage Model Configuration

- Update `adws/adw_orchestrator.py`:
  - In `_create_stage_context()` method, extract stage model from `workflow_config.stages[i].model`
  - Set `context.stage_model = stage_config.model` if stage config has a model specified
  - Load stage model overrides from ADW state (`self.state.get("stage_model_overrides", {})`) and apply to context
  - Priority: orchestrator config > ADW state > defaults
  - Add debug logging: `logger.debug(f"Stage {stage_name} using model: {context.stage_model}")`
- Update `adws/stages/base_stage.py`:
  - In `run_script()` method, check if `ctx.stage_model` is set
  - If set, pass model to agent execution (this will be implemented in later tasks)
  - Add logging to show which model is being used for each stage execution
- Write integration tests in `adws/adw_tests/test_orchestrator.py`:
  - Test orchestrator applies stage model from config to context
  - Test orchestrator respects model from ADW state
  - Test priority ordering of model sources

### Update WebSocket Trigger Models to Accept Stage Models

- Update `adws/adw_triggers/websocket_models.py`:
  - Add `stage_models: Optional[Dict[str, str]] = None` field to `TriggerWorkflowRequest` Pydantic model
  - Add field validator to ensure all model values are valid ("sonnet", "haiku", or "opus")
  - Update class docstring to explain this field maps stage names to model selections
  - Add example in docstring: `{"plan": "opus", "build": "opus", "test": "sonnet", "merge": "haiku"}`
- Update `adws/adw_triggers/trigger_websocket.py`:
  - Extract `stage_models` from the trigger request payload
  - Store in ADW state: `state.update(stage_model_overrides=request.stage_models)`
  - Build orchestrator config with stage models: apply to `orchestrator_config.stage_config[stage_name].model`
  - Add logging to show received stage model configuration
- Write unit tests in `adws/adw_tests/test_websocket_trigger.py`:
  - Test stage models are correctly parsed from WebSocket payload
  - Test invalid model names are rejected with validation error
  - Test stage models are stored in ADW state
  - Test stage models are applied to orchestrator config

### Create Frontend Model Default Utilities

- Create new file `src/utils/modelDefaults.js`:
  - Export `getDefaultModelForStage(stageName)` function that returns:
    - "opus" for "plan" and "build"
    - "sonnet" for "test", "review", "document"
    - "haiku" for "merge"
    - "sonnet" as default fallback
  - Export `generateDefaultStageModels(stageNames)` function that creates a mapping object from stage names to their default models
  - Export `MODEL_INFO` constant object with metadata for each model:
    - sonnet: { label: "Sonnet", tier: "balanced", cost: "medium", description: "Balanced performance and cost" }
    - haiku: { label: "Haiku", tier: "fast", cost: "low", description: "Fast and economical" }
    - opus: { label: "Opus", tier: "powerful", cost: "high", description: "Most capable model" }
  - Add JSDoc comments to all exports
- Create unit tests in `src/utils/__tests__/modelDefaults.test.js`:
  - Test default model for each stage type
  - Test generateDefaultStageModels with various stage arrays
  - Test MODEL_INFO contains all required models
  - Test fallback behavior for unknown stages

### Create StageModelSelector UI Component

- Create new file `src/components/ui/StageModelSelector.jsx`:
  - Accept props: `stageName`, `selectedModel`, `onChange`, `disabled`
  - Render a labeled dropdown with model options (Sonnet, Haiku, Opus)
  - Display visual indicators for each model:
    - Cost tier badge (Low/Medium/High) with color coding (green/yellow/red)
    - Performance tier badge (Fast/Balanced/Powerful) with color coding
    - Tooltips with model descriptions
  - Show the default model for the stage with a "(Default)" label
  - Use Lucide icons (Zap for Haiku, Scale for Sonnet, Crown for Opus)
  - Style with Tailwind CSS to match existing UI patterns
  - Add prop types and JSDoc comments
- Create unit tests in `src/components/ui/__tests__/StageModelSelector.test.jsx`:
  - Test component renders with all model options
  - Test onChange callback fires with correct model value
  - Test visual indicators display correctly for each model
  - Test disabled state prevents selection
  - Test default model is indicated
  - Test tooltips are present and accessible

### Update WorkflowTriggerModal for Per-Stage Model Selection

- Update `src/components/forms/WorkflowTriggerModal.jsx`:
  - Import `StageModelSelector`, `getDefaultModelForStage`, and `generateDefaultStageModels`
  - Add state: `const [stageModels, setStageModels] = useState({})` to store per-stage model selections
  - When workflow type changes or orchestrator stages are selected, initialize `stageModels` with defaults using `generateDefaultStageModels()`
  - For orchestrator workflows, render a section "Per-Stage Model Configuration" after workflow type selection
  - List each stage in the selected workflow with a `StageModelSelector` component
  - Update `handleSubmit()` to include `stageModels` in the workflow trigger payload
  - Add validation to ensure all stages have valid model selections
  - Update the UI to show estimated cost/performance indicators based on selected models
  - Add a "Reset to Defaults" button to restore default model selections
- Update unit tests in `src/components/forms/__tests__/WorkflowTriggerModal.test.jsx`:
  - Test stage model selectors render for orchestrator workflows
  - Test default models are pre-populated
  - Test changing model selection updates state
  - Test workflow trigger includes stage models in payload
  - Test validation rejects invalid model selections
  - Test reset to defaults button works
- Create additional test file `src/components/forms/__tests__/WorkflowTriggerModal.stageModels.test.jsx`:
  - Test complex scenarios with multiple stages
  - Test model selection persistence during workflow type changes
  - Test interaction between model set (base/premium) and per-stage models

### Update Kanban Store to Include Stage Models in Workflow Triggers

- Update `src/stores/kanbanStore.js`:
  - Modify `triggerWorkflowForTask` action to accept `stageModels` parameter
  - Include `stageModels` in the WebSocket message payload sent to backend
  - Add validation to ensure stageModels is an object with string keys and values
  - Update JSDoc comments to document the new parameter
  - Add debug logging when stage models are included in trigger
- Update unit tests in `src/stores/__tests__/kanbanStore.test.js`:
  - Test triggerWorkflowForTask includes stageModels in payload
  - Test payload structure is correct with stage models
  - Test backward compatibility when stageModels is not provided
  - Test WebSocket message is formatted correctly

### Implement End-to-End Per-Stage Model Execution

- Update individual stage implementations to use context model:
  - `adws/stages/plan_stage.py`: Read `ctx.stage_model` and pass to agent execution
  - `adws/stages/build_stage.py`: Read `ctx.stage_model` and pass to agent execution
  - `adws/stages/test_stage.py`: Read `ctx.stage_model` and pass to agent execution
  - `adws/stages/review_stage.py`: Read `ctx.stage_model` and pass to agent execution
  - `adws/stages/document_stage.py`: Read `ctx.stage_model` and pass to agent execution
  - `adws/stages/merge_stage.py`: Read `ctx.stage_model` and pass to agent execution
- For each stage, update agent calls:
  - When calling `execute_template()`, include `model_override=ctx.stage_model` if set
  - Add logging to show which model is being used
  - Ensure fallback to default behavior if model is not specified
- Create integration tests in `adws/adw_tests/test_per_stage_models.py`:
  - Test end-to-end workflow with mixed models (Opus for plan, Haiku for merge, etc.)
  - Test logs show correct model being used per stage
  - Test agent execution uses the specified model (verify via agent logs)
  - Test backward compatibility with existing workflows (no stage models specified)
  - Test invalid model names are handled gracefully
  - Test stage model overrides from ADW state are respected

### Update Stage Log Tracking to Capture Model Information

- Update `server/api/stage_logs.py`:
  - Modify log entry structure to include `model_used: Optional[str]` field
  - Extract model information from agent execution logs if available
  - Include model in the JSON response for stage logs
- Update frontend stage log viewers:
  - `src/components/kanban/WorkflowLogViewer.jsx`: Display model badge for each stage log entry
  - `src/components/kanban/AgentStateViewer.jsx`: Show which model was used in agent state display
  - Add visual styling for model badges (color-coded by model type)
- Write tests in `server/tests/test_stage_logs.py`:
  - Test stage logs include model information
  - Test model information is correctly retrieved from logs
  - Test API returns model information in response

### Create E2E Test for Per-Stage Model Selection Workflow

- Create E2E test file `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md`:
  - Test case 1: Create task and trigger workflow with custom per-stage models
    - Open WorkflowTriggerModal for a task
    - Select "Full SDLC" workflow
    - Change Plan to Opus, Build to Opus, Test to Sonnet, Review to Sonnet, Document to Sonnet
    - Verify models are shown in UI
    - Trigger workflow
    - Verify WebSocket payload includes stage_models
  - Test case 2: Verify default models are applied
    - Open WorkflowTriggerModal
    - Select "Full SDLC" workflow
    - Verify Plan defaults to Opus, Merge defaults to Haiku, etc.
    - Do not change anything, trigger workflow
    - Verify defaults are sent to backend
  - Test case 3: Change model and reset to defaults
    - Select workflow, change models
    - Click "Reset to Defaults"
    - Verify models return to defaults
  - Test case 4: Verify stage logs show model information
    - Wait for workflow to start executing
    - View stage logs in WorkflowLogViewer
    - Verify each stage shows which model was used
  - Include Playwright automation script for each test case
  - Add screenshot validation points

### Validation and Testing

- Run all unit tests: `cd adws && uv run pytest adw_tests/test_model_selection.py adw_tests/test_per_stage_models.py adw_tests/test_data_structures.py`
- Run frontend unit tests: `npm run test -- modelDefaults StageModelSelector WorkflowTriggerModal`
- Run backend server tests: `cd server && uv run pytest tests/test_stage_logs.py`
- Run integration tests: `cd adws && uv run pytest adw_tests/test_orchestrator.py adw_tests/test_websocket_trigger.py`
- Run E2E tests: Follow manual test plan in `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md`
- Test backward compatibility: Trigger existing workflows without stage models to ensure they still work
- Manually test the complete workflow:
  - Create a new task in Kanban board
  - Open WorkflowTriggerModal
  - Select "Full SDLC" workflow
  - Verify default models are pre-populated correctly
  - Change some models to non-defaults
  - Trigger workflow and monitor execution
  - Verify agent logs show correct models being used per stage
  - Verify stage logs in UI display model information
- Run validation commands (below)

## Testing Strategy

### Unit Tests

#### Backend Unit Tests

**adws/utils/tests/test_model_config.py**
- Test `get_default_model_for_stage()` returns correct defaults for each stage type
- Test fallback to "sonnet" for unknown stages
- Test `validate_model_choice()` accepts valid models and rejects invalid ones
- Test `get_model_display_info()` returns complete metadata for each model

**adws/adw_tests/test_data_structures.py**
- Test `ADWStateData` serializes/deserializes `stage_model_overrides` correctly
- Test `StageConfig` serializes/deserializes `model` field correctly
- Test `StageContext` includes `stage_model` field
- Test Pydantic validation rejects invalid model values

**adws/adw_tests/test_model_selection.py** (existing, to be updated)
- Test per-stage model override takes precedence over model set
- Test `get_model_for_slash_command()` with stage context parameter
- Test fallback to model set when no stage override
- Test fallback to default when neither override nor model set is specified
- Test invalid model values are handled gracefully

**adws/adw_tests/test_orchestrator.py** (existing, to be updated)
- Test orchestrator applies stage model from workflow config to context
- Test orchestrator loads stage models from ADW state
- Test priority: orchestrator config > ADW state > defaults
- Test stage context receives correct model value

**adws/adw_tests/test_websocket_trigger.py**
- Test `TriggerWorkflowRequest` accepts valid `stage_models` dictionary
- Test Pydantic validation rejects invalid model names in stage_models
- Test stage_models are stored in ADW state after trigger
- Test orchestrator config receives stage models from trigger request

**server/tests/test_stage_logs.py** (existing, to be updated)
- Test stage logs include `model_used` field
- Test model information is correctly extracted from agent logs
- Test API endpoint returns model information in response

#### Frontend Unit Tests

**src/utils/__tests__/modelDefaults.test.js**
- Test `getDefaultModelForStage()` for all stage types
- Test fallback for unknown stages
- Test `generateDefaultStageModels()` creates correct mapping
- Test `MODEL_INFO` contains all required model metadata

**src/components/ui/__tests__/StageModelSelector.test.jsx**
- Test component renders with all model options (Sonnet, Haiku, Opus)
- Test onChange callback is called with correct value
- Test visual indicators (cost/performance badges) display correctly
- Test disabled state prevents interaction
- Test default model is visually indicated
- Test tooltips are accessible and contain descriptions

**src/components/forms/__tests__/WorkflowTriggerModal.test.jsx** (existing, to be updated)
- Test stage model selectors render for orchestrator workflows
- Test default models are pre-populated on workflow selection
- Test changing a model updates component state
- Test workflow trigger payload includes stageModels
- Test validation rejects missing or invalid model selections
- Test "Reset to Defaults" button restores default models

**src/components/forms/__tests__/WorkflowTriggerModal.stageModels.test.jsx**
- Test complex multi-stage workflow with mixed models
- Test model persistence when switching between workflow types
- Test interaction between global model set and per-stage models
- Test all stages in SDLC workflow can have independent models

**src/stores/__tests__/kanbanStore.test.js** (existing, to be updated)
- Test `triggerWorkflowForTask` accepts stageModels parameter
- Test WebSocket payload includes stageModels with correct structure
- Test backward compatibility when stageModels is undefined
- Test validation of stageModels structure

#### Integration Tests

**adws/adw_tests/test_per_stage_models.py**
- Test end-to-end workflow execution with per-stage models
- Test Plan stage executes with Opus model
- Test Merge stage executes with Haiku model
- Test Test/Review/Document stages execute with Sonnet model
- Test agent logs confirm correct model usage per stage
- Test mixed model workflow completes successfully
- Test backward compatibility: workflow without stage models uses model_set
- Test ADW state persists stage model selections for resume

### E2E Tests

**src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md**

Test Case 1: Custom Per-Stage Model Selection
- Open Kanban board and create a new task
- Click "Trigger Workflow" button to open WorkflowTriggerModal
- Select "Full SDLC" workflow from dropdown
- Verify stage model selectors appear for Plan, Build, Test, Review, Document stages
- Change Plan to Opus, Build to Opus, Test to Sonnet, Review to Sonnet, Document to Sonnet
- Verify each selector shows the selected model with appropriate badges
- Click "Trigger Workflow" button
- Verify WebSocket connection sends payload with stage_models object
- Verify workflow starts and task moves to Plan stage

Test Case 2: Default Model Population
- Open WorkflowTriggerModal for a new task
- Select "Full SDLC" workflow
- Verify Plan selector shows "Opus (Default)"
- Verify Build selector shows "Opus (Default)"
- Verify Test selector shows "Sonnet (Default)"
- Verify Review selector shows "Sonnet (Default)"
- Verify Document selector shows "Sonnet (Default)"
- Trigger workflow without changing anything
- Verify default models are sent in WebSocket payload

Test Case 3: Reset to Defaults Functionality
- Open WorkflowTriggerModal, select "Full SDLC"
- Change Plan to Haiku, Test to Opus, Document to Haiku
- Verify changes are reflected in selectors
- Click "Reset to Defaults" button
- Verify all selectors return to default values
- Trigger workflow and verify defaults are used

Test Case 4: Model Information Display in Logs
- Trigger a workflow with mixed models (Plan=Opus, Merge=Haiku)
- Wait for Plan stage to start executing
- Open WorkflowLogViewer for the task
- Verify stage logs show "Model: Opus" badge for Plan stage
- Wait for workflow to reach Merge stage
- Verify stage logs show "Model: Haiku" badge for Merge stage
- Take screenshots of log viewer showing model badges

### Edge Cases

1. **Invalid Model Values**: Test that invalid model names are rejected with clear error messages
2. **Missing Stage Models**: Test that stages without specified models fall back to model_set or defaults
3. **Workflow Type Changes**: Test that changing workflow type in UI resets stage models to new defaults
4. **WebSocket Disconnection**: Test that stage model selections are preserved during WebSocket reconnection
5. **Concurrent Workflows**: Test that multiple workflows with different per-stage models can run simultaneously without interference
6. **Model Override Priority**: Test that the priority order (stage override > model_set > defaults) is respected in all scenarios
7. **Resume After Failure**: Test that resumed workflows retain their original per-stage model selections
8. **Empty Stage List**: Test orchestrator handles empty stage list gracefully
9. **Unknown Stage Names**: Test that unknown stage names fall back to default model
10. **Sub-Stage Models**: Test that sub-stages within Plan use the Plan stage's model selection (or allow independent selection if desired)

## Acceptance Criteria

1. **Per-Stage Model Configuration**:
   - Backend `StageConfig` has a `model` field that accepts "sonnet", "haiku", or "opus"
   - ADW state persists `stage_model_overrides` dictionary mapping stage names to models
   - Orchestrator applies per-stage models from config to stage context
   - Stage context includes `stage_model` field accessible to all stage implementations

2. **Agent Execution with Per-Stage Models**:
   - `get_model_for_slash_command()` checks stage context for model override before falling back to model_set
   - All stages (Plan, Build, Test, Review, Document, Merge) execute agents with their configured model
   - Agent execution logs show which model is being used for each stage
   - Invalid model values fall back to safe defaults without breaking execution

3. **Default Model Strategy**:
   - Plan and Build stages default to "opus" model
   - Test, Review, and Document stages default to "sonnet" model
   - Merge stage defaults to "haiku" model
   - Unknown stages fall back to "sonnet" model

4. **Frontend UI**:
   - WorkflowTriggerModal displays per-stage model selectors for orchestrator workflows
   - Each stage shows a dropdown with Sonnet, Haiku, and Opus options
   - Visual indicators show cost tier and performance tier for each model
   - Default models are pre-populated and clearly labeled
   - "Reset to Defaults" button restores all models to their defaults
   - Model selections are included in workflow trigger WebSocket payload

5. **WebSocket Integration**:
   - `TriggerWorkflowRequest` accepts `stage_models` dictionary from frontend
   - Backend validates model values and rejects invalid models with clear errors
   - Stage models from trigger request are stored in ADW state
   - Orchestrator config is populated with stage models from trigger request

6. **Backward Compatibility**:
   - Existing workflows without per-stage models continue to work using model_set
   - Workflows with only model_set (no stage models) execute as before
   - Frontend handles tasks that don't have stage model metadata gracefully

7. **Testing**:
   - All unit tests pass for backend model utilities and agent execution
   - All frontend unit tests pass for UI components and utilities
   - Integration tests verify end-to-end per-stage model execution
   - E2E tests validate UI workflow and WebSocket communication
   - Manual testing confirms correct model usage in live workflows

8. **Documentation and Logs**:
   - Stage logs in UI display which model was used for each stage (e.g., "Model: Opus" badge)
   - WorkflowLogViewer shows model badges for each stage entry
   - Code includes comprehensive docstrings and JSDoc comments
   - Model metadata (cost, performance tier) is accessible throughout the system

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `cd adws && uv run pytest adw_tests/test_model_selection.py -v` - Verify per-stage model selection logic
- `cd adws && uv run pytest adw_tests/test_per_stage_models.py -v` - Verify end-to-end per-stage model execution
- `cd adws && uv run pytest adw_tests/test_orchestrator.py -v` - Verify orchestrator applies stage models correctly
- `cd adws && uv run pytest adw_tests/test_websocket_trigger.py -v` - Verify WebSocket trigger accepts and applies stage models
- `cd adws && uv run pytest utils/tests/test_model_config.py -v` - Verify model configuration utilities
- `npm run test -- modelDefaults` - Verify frontend model default utilities
- `npm run test -- StageModelSelector` - Verify stage model selector component
- `npm run test -- WorkflowTriggerModal` - Verify workflow trigger modal with model selection
- `npm run test -- kanbanStore` - Verify Kanban store handles stage models correctly
- `cd server && uv run pytest tests/test_stage_logs.py -v` - Verify stage logs capture model information
- `npm run typecheck` - Ensure TypeScript types are valid with zero errors
- `npm run build` - Verify frontend builds successfully with zero errors
- `cd server && uv run pytest` - Run all server tests to validate zero regressions
- Manual E2E Test: Follow test plan in `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md`

## Notes

### Model Selection Priority

The system uses a three-tier priority system for model selection:

1. **Stage-specific override** (highest priority): Model specified in orchestrator config or frontend per-stage selection
2. **Model set mapping**: Model determined by the global `model_set` (base/heavy) and slash command mapping in `SLASH_COMMAND_MODEL_MAP`
3. **Default fallback** (lowest priority): "sonnet" as the safe default

This ensures maximum flexibility while maintaining backward compatibility.

### Sub-Stage Model Selection

For stages that have internal sub-phases (e.g., Plan stage might call multiple slash commands), the current implementation applies the stage-level model to all sub-operations. Future enhancements could allow even finer granularity by specifying models per sub-phase.

### Cost and Performance Considerations

Model selection directly impacts:
- **Cost**: Opus is most expensive, Haiku is cheapest, Sonnet is balanced
- **Latency**: Haiku is fastest, Opus may be slower, Sonnet is balanced
- **Quality**: Opus provides best output quality, Haiku is sufficient for simple tasks, Sonnet is balanced

The default model strategy attempts to optimize this trade-off by using:
- Opus for complex planning and implementation (where quality matters most)
- Sonnet for testing, review, and documentation (balanced quality/cost)
- Haiku for simple operations like merge (where speed and cost matter more)

### Extensibility

The architecture supports easy addition of new models in the future:
1. Add new model to `Literal["sonnet", "haiku", "opus", "new_model"]` in data types
2. Update `MODEL_INFO` in frontend utilities
3. Update default model logic if needed
4. Add validation for the new model

### Future Enhancements

Potential future improvements to consider:
- **Model Usage Analytics**: Track which models are used most frequently and their success rates
- **Auto-Optimization**: Automatically suggest model changes based on historical performance
- **Cost Budgets**: Allow users to set cost budgets and automatically select models to stay within budget
- **A/B Testing**: Support running the same stage with different models to compare results
- **Model Capabilities Matrix**: Show which models support which features (e.g., vision, function calling)
