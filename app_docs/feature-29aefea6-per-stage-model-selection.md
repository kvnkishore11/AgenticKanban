# Per-Stage Model Selection for ADW Workflows

**ADW ID:** 29aefea6
**Date:** 2025-11-29
**Specification:** specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md

## Overview

This feature enables granular AI model selection at the per-stage level for ADW (Agentic Development Workflow) orchestration. Users can now specify which AI model (Sonnet, Haiku, or Opus) to use for each individual workflow stage, enabling optimal resource allocation based on stage complexity. Complex stages (Plan, Build) can use more capable models (Opus), while simpler stages (Merge) can use faster, cheaper models (Haiku), and balanced stages (Test, Review, Document) can use the standard model (Sonnet).

## What Was Built

- **Backend Model Configuration System**: Infrastructure for per-stage model configuration throughout the orchestrator and agent execution pipeline
- **Model Configuration Utilities**: Helper functions for model defaults, validation, and metadata management
- **Per-Stage Agent Execution**: Core logic enabling stages to execute with their specified models with proper priority handling
- **Frontend UI Components**: Intuitive interface for selecting models per stage with visual cost/performance indicators
- **WebSocket Integration**: Communication layer to pass model selections from frontend to backend
- **Comprehensive Testing**: 1,800+ lines of new tests covering unit, integration, and E2E scenarios
- **Backward Compatibility**: Existing workflows continue to work with the global model_set approach

## Technical Implementation

### Files Modified

#### Backend Core Files
- `adws/orchestrator/config_loader.py`: Added `model` field to `StageConfig` for per-stage model configuration
- `adws/orchestrator/stage_interface.py`: Extended `StageContext` with `stage_model` field for current stage's model selection
- `adws/adw_modules/agent.py`: Enhanced `get_model_for_slash_command()` to check per-stage model overrides before falling back to model set mappings (45 lines modified)
- `adws/adw_modules/data_types.py`: Added `stage_model_overrides` field to `ADWStateData` to persist per-stage model selections
- `adws/adw_orchestrator.py`: Updated to apply per-stage model config to stage context during execution (14 lines added)

#### Backend Utilities
- `adws/utils/model_config.py`: **New file** (128 lines) - Model configuration utilities with defaults, validation, and metadata
- `adws/utils/merge/finalization.py`: Updated to handle model configuration in merge operations (34 lines modified)
- `adws/utils/merge/merge.py`: Enhanced merge logic to preserve stage model configurations (84 lines modified)

#### WebSocket Integration
- `adws/adw_triggers/trigger_websocket.py`: Updated to accept and process `stage_models` from frontend (35 lines modified)
- `adws/adw_triggers/websocket_models.py`: Added `stage_models` field to `TriggerWorkflowRequest` (13 lines added)

#### Frontend Core Files
- `src/components/forms/WorkflowTriggerModal.jsx`: Added per-stage model selection UI with dropdowns for each stage (65 lines modified)
- `src/components/kanban/TaskDetailsModal.jsx`: Updated to display model information in task details (91 lines modified)
- `src/components/kanban/CardExpandModal.jsx`: Enhanced to show stage model selections (112 lines modified)
- `src/stores/kanbanStore.js`: Updated `triggerWorkflowForTask` to include stage model selections in WebSocket payload (133 lines modified)
- `src/services/websocket/websocketService.js`: Added support for stage models in WebSocket messages (6 lines added)

#### Frontend UI Components
- `src/components/ui/StageModelSelector.jsx`: **New file** (237 lines) - Reusable component for selecting AI model per stage with visual indicators
- `src/utils/modelDefaults.js`: **New file** (138 lines) - Utility functions for default model configurations and metadata

#### Test Files
- `adws/adw_tests/test_per_stage_models.py`: **New file** (632 lines) - Integration tests for per-stage model execution end-to-end
- `adws/utils/tests/test_model_config.py`: **New file** (169 lines) - Unit tests for model configuration utilities
- `src/components/ui/__tests__/StageModelSelector.test.jsx`: **New file** (696 lines) - Unit tests for StageModelSelector component
- `src/components/forms/__tests__/WorkflowTriggerModal.test.jsx`: **New file** (262 lines) - Unit tests for stage model selection UI
- `src/utils/__tests__/modelDefaults.test.js`: **New file** (217 lines) - Unit tests for default model selection logic
- `src/services/websocket/__tests__/websocketService.test.js`: Updated with tests for stage model WebSocket integration (66 lines added)
- `src/test/e2e/issue-26-adw-29aefea6-e2e-per-stage-model-selection.md`: **New file** (1,110 lines) - Comprehensive E2E test plan

### Key Changes

**Three-Tier Model Selection Priority System**
- Stage-specific override (highest priority): Model specified in orchestrator config or frontend per-stage selection
- Model set mapping: Model determined by global `model_set` (base/heavy) and slash command mapping
- Default fallback (lowest priority): "sonnet" as safe default

**Intelligent Default Model Strategy**
- Plan and Build stages: Default to "opus" (most capable, best for complex tasks)
- Test, Review, Document stages: Default to "sonnet" (balanced performance and cost)
- Merge stage: Default to "haiku" (fastest, cheapest for simple operations)
- Unknown stages: Fallback to "sonnet"

**State Persistence and Resume Capability**
- Per-stage model selections stored in ADW state via `stage_model_overrides` dictionary
- Workflow resume maintains original per-stage model selections
- Backward compatible with existing workflows that don't specify stage models

**Visual UI Indicators**
- Cost tier badges: Low (green) / Medium (yellow) / High (red)
- Performance tier badges: Fast (blue) / Balanced (purple) / Powerful (orange)
- Model icons: Zap (Haiku) / Scale (Sonnet) / Crown (Opus)
- Tooltips with model descriptions and trade-offs

**Comprehensive Testing Coverage**
- 42 files changed with 5,080 insertions and 692 deletions
- 1,800+ lines of new test code across unit, integration, and E2E tests
- Tests verify priority ordering, backward compatibility, and WebSocket integration

## How to Use

### For Developers Using the Workflow UI

1. **Create or select a task** in the Kanban board
2. **Click "Trigger Workflow"** to open the WorkflowTriggerModal
3. **Select a workflow type** (e.g., "Full SDLC")
4. **Review default model selections** - Each stage shows its recommended default model with visual indicators
5. **Customize models** (optional) - Click on any stage's model dropdown to select a different model:
   - Choose "Haiku" for simple, fast operations (lowest cost)
   - Choose "Sonnet" for balanced performance and cost (recommended default)
   - Choose "Opus" for complex tasks requiring highest capability (highest cost)
6. **Review cost/performance indicators** - Visual badges show the trade-offs for each model
7. **Click "Reset to Defaults"** (optional) - Restore all models to their intelligent defaults
8. **Trigger the workflow** - Your model selections will be applied to each stage during execution

### For Backend Configuration

Configure per-stage models in your orchestrator YAML config:

```yaml
stages:
  - name: plan
    type: plan
    model: opus  # Use Opus for complex planning

  - name: build
    type: build
    model: opus  # Use Opus for implementation

  - name: test
    type: test
    model: sonnet  # Use Sonnet for testing

  - name: merge
    type: merge
    model: haiku  # Use Haiku for simple merge operations
```

### Programmatic Access

Access model configuration utilities in Python:

```python
from adws.utils.model_config import (
    get_default_model_for_stage,
    validate_model_choice,
    get_model_display_info
)

# Get default model for a stage
model = get_default_model_for_stage("plan")  # Returns "opus"

# Validate a model choice
is_valid = validate_model_choice("sonnet")  # Returns True

# Get display info for a model
info = get_model_display_info("opus")
# Returns: {
#   "label": "Opus",
#   "cost_tier": "high",
#   "performance_tier": "powerful",
#   "description": "Most capable model"
# }
```

Access model utilities in JavaScript/React:

```javascript
import {
  getDefaultModelForStage,
  generateDefaultStageModels,
  MODEL_INFO
} from '../utils/modelDefaults';

// Get default for a single stage
const model = getDefaultModelForStage('plan');  // Returns "opus"

// Generate defaults for multiple stages
const stageModels = generateDefaultStageModels(['plan', 'build', 'test', 'merge']);
// Returns: { plan: "opus", build: "opus", test: "sonnet", merge: "haiku" }

// Access model metadata
const metadata = MODEL_INFO['opus'];
// Returns: { label: "Opus", tier: "powerful", cost: "high", description: "..." }
```

## Configuration

### Model Options

Three AI models are available, each optimized for different use cases:

| Model | Cost | Performance | Best For | Default Stages |
|-------|------|-------------|----------|----------------|
| **Haiku** | Low | Fast | Simple operations, code merging, quick tasks | Merge |
| **Sonnet** | Medium | Balanced | Testing, code review, documentation | Test, Review, Document |
| **Opus** | High | Powerful | Complex planning, architecture, implementation | Plan, Build |

### Priority Order

When determining which model to use for a stage, the system follows this priority:

1. **Stage-specific override** (highest): Model set in UI or orchestrator config for this specific stage
2. **Model set mapping**: Global model_set (base/heavy) determines model based on slash command type
3. **Default fallback** (lowest): "sonnet" as the safe default for unknown configurations

### Cost and Performance Considerations

**Model selection directly impacts:**
- **Cost**: Opus is most expensive, Haiku is cheapest, Sonnet is balanced
- **Latency**: Haiku is fastest, Opus may be slower, Sonnet is balanced
- **Quality**: Opus provides best output quality, Haiku is sufficient for simple tasks, Sonnet is balanced

**The default strategy optimizes for:**
- Using Opus for complex planning and implementation (where quality matters most)
- Using Sonnet for testing, review, and documentation (balanced quality/cost)
- Using Haiku for simple operations like merge (where speed and cost matter more)

## Testing

### Running Tests

**Backend Tests:**
```bash
# Model configuration utilities
cd adws && uv run pytest utils/tests/test_model_config.py -v

# Per-stage model execution
cd adws && uv run pytest adw_tests/test_per_stage_models.py -v

# Orchestrator integration
cd adws && uv run pytest adw_tests/test_orchestrator.py -v

# WebSocket trigger
cd adws && uv run pytest adw_tests/test_websocket_trigger.py -v
```

**Frontend Tests:**
```bash
# Model default utilities
npm run test -- modelDefaults

# StageModelSelector component
npm run test -- StageModelSelector

# WorkflowTriggerModal with model selection
npm run test -- WorkflowTriggerModal

# Kanban store integration
npm run test -- kanbanStore
```

**Full Test Suite:**
```bash
# All backend tests
cd adws && uv run pytest -v

# All frontend tests
npm run test

# Type checking
npm run typecheck

# Build verification
npm run build
```

### Manual Testing

1. **Test Default Model Population:**
   - Open WorkflowTriggerModal
   - Select "Full SDLC" workflow
   - Verify Plan/Build show "Opus (Default)"
   - Verify Test/Review/Document show "Sonnet (Default)"
   - Verify Merge shows "Haiku (Default)"

2. **Test Model Customization:**
   - Change Plan from Opus to Haiku
   - Change Test from Sonnet to Opus
   - Verify visual indicators update (cost/performance badges)
   - Trigger workflow
   - Monitor execution logs to confirm correct models are used

3. **Test Reset to Defaults:**
   - Customize several stage models
   - Click "Reset to Defaults" button
   - Verify all models return to their defaults

4. **Test Backward Compatibility:**
   - Trigger a workflow without specifying stage models
   - Verify workflow executes successfully using model_set approach

## Notes

### Extensibility

The architecture supports easy addition of new models in the future:
1. Add new model to `Literal["sonnet", "haiku", "opus", "new_model"]` in data types
2. Update `MODEL_INFO` in `modelDefaults.js` and `MODEL_METADATA` in `model_config.py`
3. Update default model logic in `getDefaultModelForStage()` functions if needed
4. Add validation for the new model in `validate_model_choice()`

### Sub-Stage Behavior

For stages with internal sub-phases (e.g., Plan stage calling multiple slash commands), the current implementation applies the stage-level model to all sub-operations. Future enhancements could allow finer granularity by specifying models per sub-phase.

### State Persistence

- Stage model selections are stored in ADW state via `stage_model_overrides` dictionary
- Workflow resume maintains original per-stage model selections
- WebSocket reconnection preserves model selections
- Concurrent workflows with different models run independently without interference

### Backward Compatibility

- Existing workflows without per-stage models continue to work using model_set
- Workflows with only model_set (no stage models) execute as before
- Frontend handles tasks without stage model metadata gracefully
- No breaking changes to existing APIs or data structures

## Rebase onto Main (2025-12-02)

**Branch:** feat-issue-26-adw-29aefea6-stage-model-selection
**Rebase Date:** 2025-12-02
**Main Branch State:** 6a41832 (46 commits ahead)

### Rebase Summary

Successfully rebased the per-stage model selection feature onto the latest main branch which included significant changes:
- Database state management (feature-5e58ab68) - 6,844 insertions
- Beautified agent results (feature-5dc9d6af) - 546 insertions
- Delete worktree with logs (feature-8250f1e2) - 1,066 insertions
- Clarification system improvements
- Terminal operations enhancements
- Merge workflow improvements
- Multiple bug fixes and optimizations

### Conflicts Resolved

1. **WorkflowTriggerModal.jsx** - Resolved conflict preserving per-stage model selection UI while integrating main branch workflow improvements
2. **conditional_docs.md** - Added per-stage model selection documentation entry alongside new feature documentation from main
3. **agentic_kpis.md** - Integrated KPI metrics for per-stage model selection feature with main branch metrics

### Compatibility Verification

All per-stage model selection functionality verified compatible with main branch changes:
- ✅ Backend tests: 18/18 per-stage model tests passing
- ✅ Frontend tests: 134/134 per-stage model tests passing (modelDefaults: 29, StageModelSelector: 35, WorkflowTriggerModal: 70)
- ✅ WebSocket integration: 103/103 tests passing
- ✅ TypeScript compilation: No errors
- ✅ Production build: Success
- ✅ Database integration: Compatible with new database state management
- ✅ WebSocket protocol: Compatible with enhanced WebSocket system

### No Code Changes Required

The rebase required no modifications to the per-stage model selection implementation - all conflicts were resolved by accepting our feature changes or merging documentation. The feature remains fully functional with all 1,800+ lines of tests passing.

### Future Enhancements

Potential improvements to consider:
- **Model Usage Analytics**: Track which models are used most frequently and their success rates
- **Auto-Optimization**: Automatically suggest model changes based on historical performance
- **Cost Budgets**: Allow users to set cost budgets and automatically select models to stay within budget
- **A/B Testing**: Support running the same stage with different models to compare results
- **Model Capabilities Matrix**: Show which models support which features (e.g., vision, function calling)
- **Per-Sub-Phase Models**: Allow even finer control by specifying models for sub-phases within stages
