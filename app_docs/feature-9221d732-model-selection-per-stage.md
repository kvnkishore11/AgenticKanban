# Per-Stage Model Selection for SDLC Pipeline

**ADW ID:** 9221d732
**Date:** 2025-12-02
**Specification:** specs/issue-1298-adw-9221d732-sdlc_planner-add-model-selection-per-stage.md

## Overview

This feature implements per-stage model selection in the Kanban application's SDLC workflow, allowing users to configure which Claude model (Opus, Sonnet, or Haiku) should be used for each pipeline stage during ticket creation. This enables cost optimization and performance tuning by assigning more powerful models to complex stages like Plan and Build while using faster/cheaper models for simpler stages like Clarify and Merge.

## What Was Built

This feature introduces a complete end-to-end model selection system with the following components:

### Frontend Components
- **ModelSelector Component** (`src/components/forms/ModelSelector.jsx`) - Reusable dropdown for selecting Claude models
- **Model Configuration Constants** (`src/constants/modelDefaults.js`) - Centralized model definitions and default assignments
- **TaskInput Integration** - Model selectors next to each stage button in the ticket creation dialog
- **State Management** - Stage model preferences tracked in component state and persisted to database

### Backend Infrastructure
- **Model Configuration Utilities** (`adws/utils/model_config.py`) - Functions for extracting and validating model preferences
- **Stage Execution Updates** - All stage classes (plan, build, test, review, document, clarify, merge) now read and apply model preferences
- **Agent Integration** - Enhanced model selection logic to check stage-specific preferences before falling back to defaults

### Testing
- **Backend Unit Tests** (`adws/utils/tests/test_model_config.py`) - 243 lines of comprehensive tests for model utilities
- **E2E Test Specification** (`src/test/e2e/issue-1298-adw-9221d732-e2e-model-selection.md`) - Manual test scenarios
- **Integration Testing** - Kanban store tests updated to include model preference handling

## Technical Implementation

### Files Modified

**Frontend:**
- `src/components/forms/TaskInput.jsx` (+107 lines) - Integrated model selectors into stage selection UI
  - Added `stageModelPreferences` state variable initialized with defaults
  - Added `handleModelChange` function to update model selections
  - Wrapped stage buttons with model selector dropdowns
  - Included model preferences in task submission data

- `src/services/adwCreationService.js` (+1 line) - Passes model preferences through to backend

- `src/stores/__tests__/kanbanStore.test.js` (+11 lines) - Added test for model preference persistence

**Backend:**
- `adws/adw_modules/agent.py` (+33 lines, -21 lines) - Enhanced model selection precedence
  - Checks stage-specific preferences from orchestrator state first
  - Falls back to slash command mapping
  - Final fallback to model set (base/heavy)

- `adws/stages/*.py` - All 7 stage files updated to extract and pass model preferences:
  - `plan_stage.py` (+8 lines)
  - `build_stage.py` (+8 lines)
  - `test_stage.py` (+6 lines)
  - `review_stage.py` (+6 lines)
  - `document_stage.py` (+8 lines)
  - `clarify_stage.py` (+6 lines)
  - `merge_stage.py` (+8 lines)

- `adws/adw_triggers/trigger_websocket.py` (+3 lines, -1 line) - Updated to handle model config

**New Files Created:**
- `src/components/forms/ModelSelector.jsx` (56 lines) - Brutalist-styled model dropdown component
- `src/constants/modelDefaults.js` (103 lines) - Model configuration constants and utilities
- `adws/utils/model_config.py` (181 lines) - Backend model configuration utilities
- `adws/utils/tests/test_model_config.py` (243 lines) - Comprehensive unit tests
- `src/test/e2e/issue-1298-adw-9221d732-e2e-model-selection.md` (233 lines) - E2E test documentation

### Key Changes

1. **Three-Tier Model Selection Precedence:**
   - Stage-specific preference (from `orchestrator_state.workflow.stageModelPreferences`)
   - Slash command mapping (from `SLASH_COMMAND_MODEL_MAP` in `agent.py`)
   - Model set fallback (base or heavy from ADW state)

2. **Default Model Assignments:**
   - **Plan/Build:** Opus (most capable for complex tasks)
   - **Test/Review/Document:** Sonnet (balanced performance)
   - **Clarify/Merge:** Haiku (fastest, most economical)

3. **Data Flow:**
   - User selects models in TaskInput modal →
   - Model preferences stored in `stageModelPreferences` state →
   - Included in task metadata on submission →
   - Persisted to database in `orchestrator_state.workflow.stageModelPreferences` →
   - Loaded by backend during workflow execution →
   - Passed to each stage via `StageContext.config['model']` →
   - Applied to Claude Code agent execution

4. **Backward Compatibility:**
   - Tasks created before this feature (without model preferences) continue to work
   - System gracefully falls back to existing model selection logic
   - No database migration required (JSON field already flexible)

## How to Use

### Creating a Task with Custom Model Selection

1. **Open Task Creation Modal**
   - Click "Add Task" or "+" button in the Kanban board

2. **Select Stages**
   - Choose which SDLC stages to include (Plan, Implement, Test, etc.)
   - Click "⚡ SDLC" for full pipeline, or select stages individually

3. **Configure Models Per Stage**
   - Next to each selected stage button, you'll see a model dropdown
   - Each dropdown shows the current model selection (e.g., "🚀 Claude Opus")
   - Click the dropdown to change the model for that specific stage
   - Options:
     - **🚀 Claude Opus** - Most capable, best for complex tasks
     - **⚡ Claude Sonnet** - Balanced performance for most tasks
     - **💨 Claude Haiku** - Fast and economical for simple tasks

4. **Submit Task**
   - Fill in other task details (title, description, etc.)
   - Click "Create Task"
   - Model preferences are automatically saved with the task

5. **Monitor Execution**
   - When the workflow runs, each stage will use its configured model
   - Check agent execution logs to verify correct model is being used
   - Look for log messages like: "Using model preference: opus"

### Default Model Behavior

If you don't change any model selections, the system uses these optimized defaults:

| Stage | Default Model | Rationale |
|-------|---------------|-----------|
| Plan | Opus | Complex planning requires most capable model |
| Implement/Build | Opus | Implementation requires most capable model |
| Test | Sonnet | Testing benefits from balanced model |
| Review | Sonnet | Code review benefits from balanced model |
| Document | Sonnet | Documentation benefits from balanced model |
| Clarify | Haiku | Simple clarification can use fast model |
| Merge | Haiku | Simple merge operations can use fast model |

### Viewing Model Preferences

Model preferences are stored in the database and can be viewed:

**Via Database Query:**
```bash
sqlite3 server/adw_state.db "SELECT orchestrator_state FROM adw_states WHERE adw_id = '<adw_id>' LIMIT 1;"
```

**Expected Format:**
```json
{
  "workflow": {
    "stageModelPreferences": {
      "plan": "opus",
      "implement": "opus",
      "test": "sonnet",
      "review": "sonnet",
      "document": "sonnet",
      "merge": "haiku"
    }
  }
}
```

## Configuration

### Model Options

Three Claude models are available:

1. **Opus (`opus`)**
   - Most capable model
   - Best for: Complex planning, architecture decisions, implementation
   - Cost: Highest
   - Speed: Slower but most accurate

2. **Sonnet (`sonnet`)**
   - Balanced performance
   - Best for: Testing, code review, documentation
   - Cost: Medium
   - Speed: Balanced

3. **Haiku (`haiku`)**
   - Fast and economical
   - Best for: Simple tasks, clarification, merge operations
   - Cost: Lowest
   - Speed: Fastest

### Modifying Defaults

To change the default model assignments, edit `src/constants/modelDefaults.js`:

```javascript
export const DEFAULT_STAGE_MODELS = {
  plan: CLAUDE_MODELS.OPUS,
  implement: CLAUDE_MODELS.OPUS,
  test: CLAUDE_MODELS.SONNET,
  review: CLAUDE_MODELS.SONNET,
  document: CLAUDE_MODELS.SONNET,
  clarify: CLAUDE_MODELS.HAIKU,
  merge: CLAUDE_MODELS.HAIKU
};
```

### Backend Model Validation

The backend validates model selections using `adws/utils/model_config.py`:

```python
VALID_MODELS = {'opus', 'sonnet', 'haiku'}
```

Invalid models are rejected and fall back to defaults.

## Testing

### Running Unit Tests

**Backend Tests:**
```bash
cd adws && uv run python -m pytest utils/tests/test_model_config.py -v
```

Tests cover:
- `test_get_stage_model_with_preference` - Stage-specific model returned when set
- `test_get_stage_model_with_default` - Default used when no preference
- `test_get_stage_model_invalid_model` - Invalid models rejected/defaulted
- `test_get_all_stage_models` - All stage models extracted correctly
- `test_validate_model_preferences` - Validation catches invalid preferences
- `test_backward_compatibility` - Old tasks without preferences still work

**Frontend Tests:**
```bash
bun test -- kanbanStore.test.js
```

### E2E Testing

Refer to `src/test/e2e/issue-1298-adw-9221d732-e2e-model-selection.md` for manual test scenarios:

1. **Scenario 1:** Create ticket with all default models
2. **Scenario 2:** Create ticket with custom model selections
3. **Scenario 3:** Verify models stored in database
4. **Scenario 4:** Start workflow and verify correct models used in logs
5. **Scenario 5:** Test stage without model preference uses fallback

### Validation Commands

Run all validation to ensure feature works correctly:

```bash
# Backend tests
cd server && uv run pytest

# Frontend type checking
bun tsc --noEmit

# Frontend build
bun run build

# Frontend unit tests
bun test
```

All commands must complete successfully with zero errors.

## Notes

### Model Selection Precedence

The system uses a three-tier fallback for model selection to ensure backward compatibility:

1. **Stage-specific preference** - Explicitly selected in UI and stored in `orchestrator_state.workflow.stageModelPreferences`
2. **Slash command mapping** - Default mapping in `SLASH_COMMAND_MODEL_MAP` (`adws/adw_modules/agent.py`)
3. **Model set fallback** - Base or heavy model set from ADW state configuration

This precedence ensures that:
- New tasks can use fine-grained per-stage model selection
- Old tasks without model preferences continue to work
- Invalid or missing configurations gracefully fall back to sensible defaults

### Performance Impact

Model selection adds minimal overhead:
- **Frontend:** Single additional state variable in TaskInput (negligible memory impact)
- **Backend:** Simple dictionary lookup in orchestrator state (O(1) operation)
- **Database:** No additional queries - data stored in existing JSON field
- **Network:** ~100-200 bytes added to task creation payload

### Backward Compatibility

Existing tasks without model preferences will:
1. Load successfully with no errors
2. Use `SLASH_COMMAND_MODEL_MAP` for model selection
3. Fall back to model set (base/heavy) as needed
4. Execute workflows normally

**No database migration required** - feature is additive and backward compatible.

### UI Design

Model selectors follow the brutalist design system established in TaskInput:
- Bold 2px borders with sharp edges
- Monospace "Courier New" font
- High contrast black/white color scheme
- Hover effects with shadow and translate transforms
- Disabled state with gray styling
- Compact 9px font size for small footprint

### Future Enhancements

Potential improvements for future iterations:

1. **Model Templates** - Preset configurations like "Cost Optimized" or "Performance Focused"
2. **Analytics Dashboard** - Track model usage and cost per workflow
3. **Smart Recommendations** - Suggest models based on task complexity
4. **Edit Mode** - Change model selections after task creation
5. **Project-Level Defaults** - Set default model preferences per project
6. **A/B Testing** - Compare workflow performance with different model configurations
7. **Cost Tracking** - Display estimated or actual costs per stage
8. **Model Performance Metrics** - Show success rates and execution times per model

### Troubleshooting

**Model selectors are disabled:**
- Ensure the stage is selected (button should be highlighted in black)
- Patch-type tasks don't support stage selection

**Models not being applied during execution:**
- Check orchestrator state in database contains `stageModelPreferences`
- Verify backend logs show "Using model preference: <model>"
- Check `StageContext.config` contains `model` key

**Invalid model error:**
- Only `opus`, `sonnet`, and `haiku` are valid (lowercase)
- Check for typos in model names
- Review `VALID_MODELS` in `adws/utils/model_config.py`

**Old tasks not working:**
- Should work automatically with fallback logic
- Check backend logs for any errors during model selection
- Verify `get_stage_model` falls back correctly to defaults

### Code References

Key implementation locations:

- **Frontend Model Selection:** `src/components/forms/TaskInput.jsx:504-564`
- **Model Configuration Constants:** `src/constants/modelDefaults.js:15-22`
- **Backend Model Extraction:** `adws/utils/model_config.py:26-75`
- **Agent Model Precedence:** `adws/adw_modules/agent.py:52-89`
- **Stage Model Application:** `adws/stages/plan_stage.py:36-40`
- **Model Validation:** `adws/utils/model_config.py:119-152`
