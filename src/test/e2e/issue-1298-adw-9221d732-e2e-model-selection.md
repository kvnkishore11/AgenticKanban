# E2E Test: Per-Stage Model Selection

## Test ID
issue-1298-adw-9221d732-e2e-model-selection

## Feature
Per-stage model selection for SDLC pipeline

## Test Scenarios

### Scenario 1: Create Ticket with Default Models

**Objective**: Verify default model assignments work correctly

**Steps**:
1. Start frontend and backend servers
2. Open TaskInput modal (+ button)
3. Enter description: "Test task for model selection"
4. Select work item type: Feature
5. Select all SDLC stages (Plan, Implement, Test, Review, Document)
6. Verify model selectors appear next to each stage button
7. Verify default models are shown:
   - Plan: 🚀 Claude Opus
   - Implement: 🚀 Claude Opus
   - Test: ⚡ Claude Sonnet
   - Review: ⚡ Claude Sonnet
   - Document: ⚡ Claude Sonnet
8. Submit the task
9. Verify task created successfully

**Expected Result**: Task created with default model assignments

---

### Scenario 2: Create Ticket with Custom Model Selections

**Objective**: Verify users can override default model selections

**Steps**:
1. Open TaskInput modal
2. Enter description: "Custom model test"
3. Select stages: Plan, Implement, Test
4. Change model selections:
   - Plan: Change to Sonnet (from Opus)
   - Implement: Keep as Opus
   - Test: Change to Haiku (from Sonnet)
5. Verify model selectors update visually
6. Submit the task

**Expected Result**: Task created with custom model selections

---

### Scenario 3: Verify Database Persistence

**Objective**: Verify model preferences are stored in database

**Steps**:
1. Create a task with custom models (use Scenario 2)
2. Note the ADW ID from the created task
3. Query database directly:
   ```bash
   sqlite3 server/adw_state.db "SELECT orchestrator_state FROM adw_states WHERE adw_id = '<adw_id>';"
   ```
4. Verify orchestrator_state contains stageModelPreferences field
5. Verify model values match UI selections

**Expected Result**:
```json
{
  "workflow": {
    "stageModelPreferences": {
      "plan": "sonnet",
      "implement": "opus",
      "test": "haiku"
    }
  }
}
```

---

### Scenario 4: Verify Correct Models Used During Execution

**Objective**: Verify workflow execution uses specified models

**Steps**:
1. Create a task with custom models (Plan: Haiku, Test: Opus)
2. Start workflow execution
3. Monitor backend logs during Plan stage
4. Look for log: "Using model preference: haiku"
5. Monitor backend logs during Test stage
6. Look for log: "Using model preference: opus"
7. Verify Claude Code invoked with correct model parameter

**Expected Result**:
- Plan stage logs show "Using model preference: haiku"
- Test stage logs show "Using model preference: opus"
- Agent execution passes correct model to Claude Code CLI

---

### Scenario 5: Model Selector Disabled When Stage Not Selected

**Objective**: Verify model selectors are disabled for unselected stages

**Steps**:
1. Open TaskInput modal
2. Initially select Plan and Test stages
3. Verify model selectors for Plan and Test are enabled (not grayed out)
4. Verify model selectors for Implement, Review, Document are disabled (grayed out)
5. Click to select Review stage
6. Verify Review model selector becomes enabled
7. Deselect Plan stage
8. Verify Plan model selector becomes disabled

**Expected Result**: Model selectors are only enabled when their stage is selected

---

### Scenario 6: Verify Fallback Behavior for Legacy Tasks

**Objective**: Verify old tasks without model preferences work correctly

**Steps**:
1. Manually create a task in database without stageModelPreferences field
2. Start workflow for this legacy task
3. Monitor logs for model selection
4. Verify system falls back to SLASH_COMMAND_MODEL_MAP
5. Verify workflow executes successfully

**Expected Result**:
- No errors from missing model preferences
- Workflow uses fallback model selection
- Stages execute successfully

---

### Scenario 7: Merge Stage Model Selection

**Objective**: Verify merge workflow supports model selection

**Steps**:
1. Open TaskInput modal
2. Enter description: "Test merge model"
3. Select Plan and Implement stages
4. Click "Merge" button to add merge workflow
5. Verify model selector appears next to Merge button
6. Verify default model for Merge is Haiku (💨 Claude Haiku)
7. Change Merge model to Sonnet
8. Submit task

**Expected Result**: Merge stage has model selector and respects custom selection

---

### Scenario 8: Full SDLC Preset

**Objective**: Verify SDLC preset button works with model selectors

**Steps**:
1. Open TaskInput modal
2. Click "⚡ SDLC" preset button
3. Verify all SDLC stages are selected
4. Verify all model selectors become enabled
5. Verify correct defaults for all stages
6. Change one model (e.g., Test to Haiku)
7. Click SDLC button again to deselect all
8. Verify all model selectors become disabled
9. Click SDLC button again to reselect
10. Verify custom model change was preserved

**Expected Result**: SDLC preset works correctly with model selection UI

---

### Scenario 9: Patch Type Disables Stages and Models

**Objective**: Verify patch work item type disables model selection

**Steps**:
1. Open TaskInput modal
2. Select work item type: Patch
3. Verify stage selection area is disabled (grayed out)
4. Verify all model selectors are disabled
5. Try to click stage buttons - should not work
6. Try to change models - should not work
7. Switch back to Feature type
8. Verify stages and models become enabled again

**Expected Result**: Patch type correctly disables entire stage/model selection UI

---

### Scenario 10: Model Tooltip and Visual Feedback

**Objective**: Verify model selector UI provides good feedback

**Steps**:
1. Open TaskInput modal
2. Select Plan stage
3. Hover over Plan model selector
4. Verify tooltip shows model description (e.g., "Most capable model for complex tasks")
5. Click to change model
6. Verify dropdown shows all three options with icons:
   - 🚀 Claude Opus
   - ⚡ Claude Sonnet
   - 💨 Claude Haiku
7. Select a different model
8. Verify selector updates to show new selection

**Expected Result**: Model selectors provide clear visual feedback and helpful tooltips

---

## Test Execution Checklist

- [ ] All scenarios pass
- [ ] No console errors or warnings
- [ ] No backend errors in logs
- [ ] Database queries work correctly
- [ ] Model preferences persist across page refresh
- [ ] Workflow execution respects model preferences
- [ ] Fallback logic works for legacy tasks
- [ ] UI is responsive and intuitive

## Notes

- Run tests on clean database or with test data
- Monitor both frontend console and backend logs
- Verify network requests include model preferences
- Check that brutalist styling is consistent
- Ensure backward compatibility with existing tasks
