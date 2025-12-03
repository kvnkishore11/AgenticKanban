# E2E Test: Per-Stage Model Selection (Issue #26, ADW: 29aefea6)

## Overview

End-to-end test specification for per-stage model selection feature that allows users to choose different Claude models (Opus, Sonnet, Haiku) for each SDLC workflow stage with visual indicators, default values, reset functionality, and model information display in logs.

## Test Scenario

**Title:** User configures custom AI models per workflow stage and verifies model usage in logs

**User Story:** As a developer using the Kanban board, I want to select different Claude models for each workflow stage (Plan, Build, Test, Review, Document, Merge), see visual indicators for cost/performance trade-offs, reset to defaults when needed, and verify which model was used in the stage logs, so that I can optimize cost and performance for different stages of my SDLC workflow.

## Prerequisites

- Backend server running on port 8001
- WebSocket server running on port 8500
- Frontend running on port 5173 (or configured port)
- Test environment with valid GitHub PAT and Claude Code setup
- StageModelSelector component integrated in WorkflowTriggerModal
- WorkflowLogViewer displaying model badges in stage logs

## Test Steps

### 1. Start Services

```bash
# Terminal 1 - Start backend server
cd server
uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Terminal 2 - Start WebSocket server
cd adws
python start-websocket.py

# Terminal 3 - Start frontend
cd /path/to/frontend
bun run dev
```

### 2. Open Browser and Navigate

1. Open browser (Chrome/Firefox recommended)
2. Navigate to `http://localhost:5173`
3. Open DevTools (F12)
4. Go to Console tab
5. Go to Network tab → Filter by "WS" (WebSocket)

### 3. Create Test Task

1. On Kanban board, create a new task:
   - Title: "Test Per-Stage Model Selection"
   - Description: "E2E test for issue #26 - per-stage model configuration"
   - Stage: Backlog
2. Note the task ID displayed
3. Verify task card appears in Backlog column

## Test Case 1: Custom Per-Stage Model Selection

### Objective
Verify that users can select custom models for each SDLC stage and that selections are sent correctly in the WebSocket payload.

### Test Steps

#### Manual Steps

1. Click on the test task card to open details modal
2. Click "Start Workflow" or trigger button to open WorkflowTriggerModal
3. Select "Full SDLC" workflow from the dropdown
4. Verify that StageModelSelector components appear for each stage:
   - Plan
   - Build
   - Test
   - Review
   - Document
   - Merge
5. Observe default model values (should be pre-populated)
6. Change models to custom configuration:
   - Plan → Select "Opus" (if not already)
   - Build → Select "Opus"
   - Test → Select "Sonnet"
   - Review → Select "Sonnet"
   - Document → Select "Sonnet"
   - Merge → Select "Haiku"
7. Verify visual indicators display correctly:
   - Opus: High-cost badge (red/orange color)
   - Sonnet: Balanced badge (blue/green color)
   - Haiku: Fast badge (green color)
8. Click "Trigger Workflow" button
9. Monitor Network tab for WebSocket message

#### Expected Results

- All six StageModelSelector dropdowns appear and are functional
- Default models are pre-populated (verified in Test Case 2)
- Custom model selection updates the UI immediately
- Visual cost/performance badges appear next to each selector
- Badges have correct colors and tooltips
- WebSocket payload includes `stage_models` object with custom values

**Expected WebSocket Payload:**
```json
{
  "type": "trigger_workflow",
  "data": {
    "task_id": "task-123",
    "workflow_type": "full_sdlc",
    "stage_models": {
      "plan": "opus",
      "build": "opus",
      "test": "sonnet",
      "review": "sonnet",
      "document": "sonnet",
      "merge": "haiku"
    }
  }
}
```

#### Playwright Automation Script

```javascript
// test-case-1-custom-model-selection.spec.js
const { test, expect } = require('@playwright/test');

test('Custom Per-Stage Model Selection', async ({ page }) => {
  // Navigate to Kanban board
  await page.goto('http://localhost:5173');

  // Create test task
  await page.click('button:has-text("Add Task")');
  await page.fill('input[name="title"]', 'Test Per-Stage Model Selection');
  await page.fill('textarea[name="description"]', 'E2E test for issue #26');
  await page.click('button:has-text("Create")');

  // Wait for task card to appear
  const taskCard = page.locator('text=Test Per-Stage Model Selection').first();
  await expect(taskCard).toBeVisible();

  // Click task card to open details modal
  await taskCard.click();

  // Open WorkflowTriggerModal
  await page.click('button:has-text("Start Workflow")');

  // Select Full SDLC workflow
  await page.selectOption('select[name="workflow_type"]', 'full_sdlc');

  // Verify stage model selectors appear
  const planSelector = page.locator('select[data-stage="plan"]');
  const buildSelector = page.locator('select[data-stage="build"]');
  const testSelector = page.locator('select[data-stage="test"]');
  const reviewSelector = page.locator('select[data-stage="review"]');
  const documentSelector = page.locator('select[data-stage="document"]');
  const mergeSelector = page.locator('select[data-stage="merge"]');

  await expect(planSelector).toBeVisible();
  await expect(buildSelector).toBeVisible();
  await expect(testSelector).toBeVisible();
  await expect(reviewSelector).toBeVisible();
  await expect(documentSelector).toBeVisible();
  await expect(mergeSelector).toBeVisible();

  // Set custom models
  await planSelector.selectOption('opus');
  await buildSelector.selectOption('opus');
  await testSelector.selectOption('sonnet');
  await reviewSelector.selectOption('sonnet');
  await documentSelector.selectOption('sonnet');
  await mergeSelector.selectOption('haiku');

  // Verify visual indicators
  const opusBadge = page.locator('.model-badge:has-text("High Cost")').first();
  await expect(opusBadge).toBeVisible();

  const sonnetBadge = page.locator('.model-badge:has-text("Balanced")').first();
  await expect(sonnetBadge).toBeVisible();

  const haikuBadge = page.locator('.model-badge:has-text("Fast")').first();
  await expect(haikuBadge).toBeVisible();

  // Set up WebSocket message listener
  const wsMessages = [];
  page.on('websocket', ws => {
    ws.on('framereceived', event => wsMessages.push(event.payload));
  });

  // Trigger workflow
  await page.click('button:has-text("Trigger Workflow")');

  // Wait for WebSocket message
  await page.waitForTimeout(2000);

  // Verify WebSocket payload
  const triggerMessage = wsMessages.find(msg => {
    try {
      const parsed = JSON.parse(msg);
      return parsed.type === 'trigger_workflow';
    } catch {
      return false;
    }
  });

  expect(triggerMessage).toBeDefined();
  const payload = JSON.parse(triggerMessage);
  expect(payload.data.stage_models).toEqual({
    plan: 'opus',
    build: 'opus',
    test: 'sonnet',
    review: 'sonnet',
    document: 'sonnet',
    merge: 'haiku'
  });

  // Take screenshot
  await page.screenshot({ path: 'screenshots/test-case-1-custom-models.png', fullPage: true });
});
```

#### Screenshots to Capture
1. WorkflowTriggerModal with all 6 stage model selectors visible
2. Custom model selections with visual badges displayed
3. Network tab showing WebSocket payload with `stage_models` object

## Test Case 2: Default Model Population

### Objective
Verify that default models are correctly pre-populated when opening WorkflowTriggerModal and "(Default)" labels are displayed.

### Test Steps

#### Manual Steps

1. Create a new test task (or use existing task)
2. Click task card to open details modal
3. Click "Start Workflow" button to open WorkflowTriggerModal
4. Select "Full SDLC" workflow
5. Observe pre-populated model values WITHOUT making any changes
6. Verify each selector shows:
   - Plan: "Opus" with "(Default)" label
   - Build: "Opus" with "(Default)" label
   - Test: "Sonnet" with "(Default)" label
   - Review: "Sonnet" with "(Default)" label
   - Document: "Sonnet" with "(Default)" label
   - Merge: "Haiku" with "(Default)" label
7. Click "Trigger Workflow" WITHOUT changing any models
8. Monitor Network tab for WebSocket message

#### Expected Results

- All selectors are pre-populated with default values
- "(Default)" label appears next to each pre-populated value
- Default values match expected configuration:
  - Plan: opus
  - Build: opus
  - Test/Review/Document: sonnet
  - Merge: haiku
- WebSocket payload includes default `stage_models` object

**Expected WebSocket Payload:**
```json
{
  "type": "trigger_workflow",
  "data": {
    "task_id": "task-456",
    "workflow_type": "full_sdlc",
    "stage_models": {
      "plan": "opus",
      "build": "opus",
      "test": "sonnet",
      "review": "sonnet",
      "document": "sonnet",
      "merge": "haiku"
    }
  }
}
```

#### Playwright Automation Script

```javascript
// test-case-2-default-population.spec.js
const { test, expect } = require('@playwright/test');

test('Default Model Population', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Create test task
  await page.click('button:has-text("Add Task")');
  await page.fill('input[name="title"]', 'Test Default Models');
  await page.fill('textarea[name="description"]', 'Verify default model population');
  await page.click('button:has-text("Create")');

  // Open task and workflow trigger modal
  const taskCard = page.locator('text=Test Default Models').first();
  await taskCard.click();
  await page.click('button:has-text("Start Workflow")');
  await page.selectOption('select[name="workflow_type"]', 'full_sdlc');

  // Verify default values
  await expect(page.locator('select[data-stage="plan"]')).toHaveValue('opus');
  await expect(page.locator('select[data-stage="build"]')).toHaveValue('opus');
  await expect(page.locator('select[data-stage="test"]')).toHaveValue('sonnet');
  await expect(page.locator('select[data-stage="review"]')).toHaveValue('sonnet');
  await expect(page.locator('select[data-stage="document"]')).toHaveValue('sonnet');
  await expect(page.locator('select[data-stage="merge"]')).toHaveValue('haiku');

  // Verify "(Default)" labels appear
  const defaultLabels = page.locator('.default-label, text=(Default)');
  await expect(defaultLabels).toHaveCount(6);

  // Set up WebSocket listener
  const wsMessages = [];
  page.on('websocket', ws => {
    ws.on('framereceived', event => wsMessages.push(event.payload));
  });

  // Trigger workflow with defaults
  await page.click('button:has-text("Trigger Workflow")');
  await page.waitForTimeout(2000);

  // Verify payload contains defaults
  const triggerMessage = wsMessages.find(msg => {
    try {
      return JSON.parse(msg).type === 'trigger_workflow';
    } catch {
      return false;
    }
  });

  const payload = JSON.parse(triggerMessage);
  expect(payload.data.stage_models).toEqual({
    plan: 'opus',
    build: 'opus',
    test: 'sonnet',
    review: 'sonnet',
    document: 'sonnet',
    merge: 'haiku'
  });

  // Screenshot
  await page.screenshot({ path: 'screenshots/test-case-2-defaults.png', fullPage: true });
});
```

#### Screenshots to Capture
1. WorkflowTriggerModal showing all default values pre-populated
2. Close-up of "(Default)" labels next to model selectors
3. Network tab showing default `stage_models` in payload

## Test Case 3: Reset to Defaults Functionality

### Objective
Verify that the "Reset to Defaults" button correctly reverts all custom model selections back to default values.

### Test Steps

#### Manual Steps

1. Create or select a test task
2. Open WorkflowTriggerModal and select "Full SDLC" workflow
3. Verify default models are pre-populated
4. Change multiple models to non-default values:
   - Plan: Change from "Opus" to "Haiku"
   - Test: Change from "Sonnet" to "Opus"
   - Document: Change from "Sonnet" to "Haiku"
5. Verify changes are reflected in the UI
6. Verify "(Default)" labels have disappeared for changed selectors
7. Click "Reset to Defaults" button
8. Verify all selectors return to default values:
   - Plan: Back to "Opus"
   - Test: Back to "Sonnet"
   - Document: Back to "Sonnet"
9. Verify "(Default)" labels reappear
10. Trigger workflow and verify defaults are sent

#### Expected Results

- Custom model changes update UI immediately
- "(Default)" labels disappear when values are customized
- "Reset to Defaults" button is visible and clickable
- Clicking reset button reverts ALL selectors to defaults
- "(Default)" labels reappear after reset
- Visual indicators update to match default models
- WebSocket payload contains default `stage_models` after reset

#### Playwright Automation Script

```javascript
// test-case-3-reset-functionality.spec.js
const { test, expect } = require('@playwright/test');

test('Reset to Defaults Functionality', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Create test task
  await page.click('button:has-text("Add Task")');
  await page.fill('input[name="title"]', 'Test Reset Functionality');
  await page.click('button:has-text("Create")');

  // Open workflow modal
  await page.locator('text=Test Reset Functionality').first().click();
  await page.click('button:has-text("Start Workflow")');
  await page.selectOption('select[name="workflow_type"]', 'full_sdlc');

  // Verify initial defaults
  await expect(page.locator('select[data-stage="plan"]')).toHaveValue('opus');
  await expect(page.locator('select[data-stage="test"]')).toHaveValue('sonnet');
  await expect(page.locator('select[data-stage="document"]')).toHaveValue('sonnet');

  // Change to custom values
  await page.selectOption('select[data-stage="plan"]', 'haiku');
  await page.selectOption('select[data-stage="test"]', 'opus');
  await page.selectOption('select[data-stage="document"]', 'haiku');

  // Verify changes applied
  await expect(page.locator('select[data-stage="plan"]')).toHaveValue('haiku');
  await expect(page.locator('select[data-stage="test"]')).toHaveValue('opus');
  await expect(page.locator('select[data-stage="document"]')).toHaveValue('haiku');

  // Take screenshot before reset
  await page.screenshot({ path: 'screenshots/test-case-3-before-reset.png' });

  // Click reset button
  const resetButton = page.locator('button:has-text("Reset to Defaults")');
  await expect(resetButton).toBeVisible();
  await resetButton.click();

  // Verify values reverted to defaults
  await expect(page.locator('select[data-stage="plan"]')).toHaveValue('opus');
  await expect(page.locator('select[data-stage="test"]')).toHaveValue('sonnet');
  await expect(page.locator('select[data-stage="document"]')).toHaveValue('sonnet');

  // Verify "(Default)" labels reappeared
  const defaultLabels = page.locator('.default-label, text=(Default)');
  await expect(defaultLabels).toHaveCount(6);

  // Take screenshot after reset
  await page.screenshot({ path: 'screenshots/test-case-3-after-reset.png' });

  // Set up WebSocket listener
  const wsMessages = [];
  page.on('websocket', ws => {
    ws.on('framereceived', event => wsMessages.push(event.payload));
  });

  // Trigger with reset defaults
  await page.click('button:has-text("Trigger Workflow")');
  await page.waitForTimeout(2000);

  // Verify defaults in payload
  const triggerMessage = wsMessages.find(msg => {
    try {
      return JSON.parse(msg).type === 'trigger_workflow';
    } catch {
      return false;
    }
  });

  const payload = JSON.parse(triggerMessage);
  expect(payload.data.stage_models.plan).toBe('opus');
  expect(payload.data.stage_models.test).toBe('sonnet');
  expect(payload.data.stage_models.document).toBe('sonnet');
});
```

#### Screenshots to Capture
1. WorkflowTriggerModal with custom (non-default) model selections
2. State immediately after clicking "Reset to Defaults" button
3. Comparison showing before/after reset state

## Test Case 4: Model Information Display in Logs

### Objective
Verify that model information (Opus/Sonnet/Haiku badges) appears correctly in WorkflowLogViewer for each stage that executes.

### Test Steps

#### Manual Steps

1. Create a new test task
2. Open WorkflowTriggerModal and select "Full SDLC" workflow
3. Configure mixed model selection for easy identification:
   - Plan: "Opus"
   - Build: "Sonnet"
   - Test: "Haiku"
   - Review: "Opus"
   - Document: "Sonnet"
   - Merge: "Haiku"
4. Click "Trigger Workflow"
5. Wait for Plan stage to start executing (monitor task card status)
6. Click on task card to open WorkflowLogViewer
7. Navigate to "Logs" tab (or equivalent log view)
8. Verify Plan stage logs display "Model: Opus" badge
9. Check badge styling:
   - Color: High-cost indicator (red/orange)
   - Icon: Model icon or crown icon
   - Position: Near stage name or timestamp
10. Wait for workflow to progress to Build stage
11. Verify Build stage logs show "Model: Sonnet" badge with balanced color (blue/green)
12. Wait for Test stage
13. Verify Test stage logs show "Model: Haiku" badge with fast color (green)
14. Continue monitoring through remaining stages
15. Verify each stage displays correct model badge

#### Expected Results

- Model badges appear in stage logs within 2 seconds of stage start
- Badge text format: "Model: {model_name}" (e.g., "Model: Opus")
- Badge colors match model characteristics:
  - Opus: Red/orange (high cost/capability)
  - Sonnet: Blue/green (balanced)
  - Haiku: Green (fast/economical)
- Badges are visually distinct and readable
- Model information persists in logs after workflow completes
- No model badge shown if stage hasn't executed yet
- Accessibility: Badges have aria-labels for screen readers

**Expected Log Entry Structure:**
```
[10:30:00] Stage: Plan | Model: Opus | Status: Running
  ├── Agent started planning...
  └── Reading specification file...
```

#### Playwright Automation Script

```javascript
// test-case-4-model-display-in-logs.spec.js
const { test, expect } = require('@playwright/test');

test('Model Information Display in Logs', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Create test task
  await page.click('button:has-text("Add Task")');
  await page.fill('input[name="title"]', 'Test Model Display in Logs');
  await page.fill('textarea[name="description"]', 'Verify model badges in log viewer');
  await page.click('button:has-text("Create")');

  // Open workflow modal
  const taskCard = page.locator('text=Test Model Display in Logs').first();
  await taskCard.click();
  await page.click('button:has-text("Start Workflow")');
  await page.selectOption('select[name="workflow_type"]', 'full_sdlc');

  // Configure mixed models for clear identification
  await page.selectOption('select[data-stage="plan"]', 'opus');
  await page.selectOption('select[data-stage="build"]', 'sonnet');
  await page.selectOption('select[data-stage="test"]', 'haiku');
  await page.selectOption('select[data-stage="review"]', 'opus');
  await page.selectOption('select[data-stage="document"]', 'sonnet');
  await page.selectOption('select[data-stage="merge"]', 'haiku');

  // Trigger workflow
  await page.click('button:has-text("Trigger Workflow")');

  // Wait for Plan stage to start
  await page.waitForSelector('.stage-status:has-text("Plan")');
  await page.waitForTimeout(3000); // Allow stage to begin execution

  // Open WorkflowLogViewer (task should still be selected)
  await page.click('button:has-text("Logs"), a:has-text("Logs")');

  // Verify Plan stage shows "Model: Opus" badge
  const planModelBadge = page.locator('.log-entry[data-stage="plan"] .model-badge:has-text("Opus")');
  await expect(planModelBadge).toBeVisible({ timeout: 10000 });

  // Verify badge styling (Opus should have high-cost color)
  const planBadgeColor = await planModelBadge.evaluate(el =>
    window.getComputedStyle(el).backgroundColor
  );
  // Red/orange hues (check for rgb values in red/orange range)
  expect(planBadgeColor).toMatch(/rgb\((25[0-5]|2[0-4][0-9]|1[5-9][0-9]),\s*([0-9]{1,2}|1[0-4][0-9]),\s*[0-9]{1,3}\)/);

  // Take screenshot of Plan stage log
  await page.screenshot({ path: 'screenshots/test-case-4-plan-opus.png' });

  // Wait for Build stage
  await page.waitForSelector('.stage-status:has-text("Build")', { timeout: 60000 });
  await page.waitForTimeout(3000);

  // Verify Build stage shows "Model: Sonnet" badge
  const buildModelBadge = page.locator('.log-entry[data-stage="build"] .model-badge:has-text("Sonnet")');
  await expect(buildModelBadge).toBeVisible({ timeout: 10000 });

  // Take screenshot of Build stage log
  await page.screenshot({ path: 'screenshots/test-case-4-build-sonnet.png' });

  // Wait for Test stage
  await page.waitForSelector('.stage-status:has-text("Test")', { timeout: 120000 });
  await page.waitForTimeout(3000);

  // Verify Test stage shows "Model: Haiku" badge
  const testModelBadge = page.locator('.log-entry[data-stage="test"] .model-badge:has-text("Haiku")');
  await expect(testModelBadge).toBeVisible({ timeout: 10000 });

  // Verify badge has fast/economical color (green)
  const testBadgeColor = await testModelBadge.evaluate(el =>
    window.getComputedStyle(el).backgroundColor
  );
  expect(testBadgeColor).toMatch(/rgb\([0-9]{1,2},\s*(1[5-9][0-9]|2[0-5]{2}),\s*[0-9]{1,3}\)/);

  // Take screenshot of Test stage log
  await page.screenshot({ path: 'screenshots/test-case-4-test-haiku.png' });

  // Verify accessibility: model badges have aria-labels
  const modelBadges = page.locator('.model-badge');
  const firstBadge = modelBadges.first();
  const ariaLabel = await firstBadge.getAttribute('aria-label');
  expect(ariaLabel).toMatch(/Model: (Opus|Sonnet|Haiku)/);

  // Take full page screenshot of log viewer
  await page.screenshot({ path: 'screenshots/test-case-4-full-logs.png', fullPage: true });
});
```

#### Screenshots to Capture
1. WorkflowLogViewer showing Plan stage with "Model: Opus" badge (red/orange styling)
2. Build stage logs with "Model: Sonnet" badge (blue/green styling)
3. Test stage logs with "Model: Haiku" badge (green styling)
4. Full log viewer showing multiple stages with different model badges
5. Close-up of model badge styling and icon

## Expected Results Summary

### Success Criteria

- ✅ StageModelSelector components appear for all 6 stages in Full SDLC workflow
- ✅ Custom model selections update UI immediately
- ✅ Visual cost/performance badges display correctly (Opus=red/orange, Sonnet=blue/green, Haiku=green)
- ✅ Default models pre-populate correctly (Plan/Build=Opus, Test/Review/Document=Sonnet, Merge=Haiku)
- ✅ "(Default)" labels appear for pre-populated values
- ✅ "Reset to Defaults" button reverts all custom selections
- ✅ WebSocket payload includes correct `stage_models` object
- ✅ Model badges appear in WorkflowLogViewer for each stage
- ✅ Model badges have correct colors and styling
- ✅ Model information persists in logs after workflow completion
- ✅ No console errors or warnings during normal operation
- ✅ UI remains responsive during model selection changes

### Performance Metrics

- **Model Selection Response:** < 500ms from dropdown change to UI update
- **WebSocket Latency:** Payload sent within 1 second of clicking "Trigger Workflow"
- **Log Badge Display:** Model badge appears within 2 seconds of stage start
- **Reset Functionality:** All selectors revert within 300ms of clicking reset
- **Visual Rendering:** No layout shifts or flickers during model changes

## Edge Cases to Test

### 1. Workflow Type Change Resets Model Selections

**Steps:**
1. Open WorkflowTriggerModal and select "Full SDLC"
2. Customize several model selections
3. Change workflow type to "Patch" or different workflow
4. Change back to "Full SDLC"
5. Verify model selections reset to defaults

**Expected:** Model selections reset when workflow type changes to prevent mismatched configurations

### 2. Invalid Model Values in State

**Steps:**
1. Manually manipulate component state to set invalid model value (e.g., "gpt-4")
2. Observe UI behavior
3. Trigger workflow

**Expected:** Validation prevents invalid values, falls back to default model, shows error message

### 3. WebSocket Disconnection During Model Selection

**Steps:**
1. Open WorkflowTriggerModal and start customizing models
2. Stop WebSocket server mid-selection
3. Finish customizing models
4. Click "Trigger Workflow"
5. Observe error handling

**Expected:** Error message displays, user notified of connection issue, workflow doesn't trigger until reconnected

### 4. Multiple Browser Tabs with Same Task

**Steps:**
1. Open same task in two browser tabs
2. In Tab 1: Customize model selections
3. In Tab 2: Observe model selector state
4. Trigger workflow from Tab 1
5. Check Tab 2 for state updates

**Expected:** Tabs remain independent (or sync via WebSocket if implemented), no state corruption

### 5. Model Persistence Across Page Refreshes

**Steps:**
1. Customize model selections in WorkflowTriggerModal
2. Do NOT trigger workflow
3. Refresh page
4. Reopen WorkflowTriggerModal for same task

**Expected:** Model selections reset to defaults (unless persistence is intentionally implemented)

### 6. Stage Not Yet Executed (No Model Badge)

**Steps:**
1. Trigger workflow with custom models
2. Open WorkflowLogViewer immediately
3. View stages that haven't started yet (e.g., Merge stage while Plan is running)

**Expected:** No model badge shown for stages not yet executed, or placeholder badge with "Pending" state

### 7. Workflow Completes Before Opening Log Viewer

**Steps:**
1. Trigger workflow with mixed models
2. Wait for workflow to fully complete
3. Open WorkflowLogViewer after completion

**Expected:** All stage logs display correct model badges, historical data loads properly

### 8. Very Long Workflow with All Stages

**Steps:**
1. Trigger Full SDLC workflow with custom models for all 6 stages
2. Monitor log viewer throughout entire workflow lifecycle
3. Verify model badges appear for each stage in sequence

**Expected:** Model badges display correctly for all 6 stages without performance degradation

## Debugging Tips

### Console Checks

```javascript
// Check StageModelSelector state
const workflowStore = useWorkflowStore.getState();
console.log('Current stage models:', workflowStore.stageModels);

// Check default models configuration
console.log('Default stage models:', DEFAULT_STAGE_MODELS);

// Listen for model selection changes
workflowStore.subscribe(state => {
  console.log('Stage models updated:', state.stageModels);
});

// Verify WebSocket payload before sending
window.addEventListener('beforeunload', () => {
  console.log('Final stage models:', workflowStore.stageModels);
});
```

### Network Tab Checks

1. Filter by "WS" to see WebSocket frames
2. Click on WebSocket connection
3. View "Messages" tab
4. Look for `trigger_workflow` message
5. Verify `stage_models` object structure:
   ```json
   {
     "plan": "opus",
     "build": "opus",
     "test": "sonnet",
     "review": "sonnet",
     "document": "sonnet",
     "merge": "haiku"
   }
   ```

### Backend Checks

```bash
# Check workflow configuration received by backend
# Look in backend logs for stage_models payload
tail -f server/logs/workflow.log | grep stage_models

# Verify agent startup with correct model
# Check agent logs for model initialization
tail -f agents/{adw_id}/sdlc_planner/raw_output.jsonl | grep model

# Check WebSocket broadcast of model info
# Verify model information sent to frontend
tail -f adws/logs/websocket.log | grep model
```

### Component State Inspection

```javascript
// React DevTools - inspect StageModelSelector props
// Look for:
// - stage: "plan" | "build" | "test" | "review" | "document" | "merge"
// - value: "opus" | "sonnet" | "haiku"
// - onChange: function
// - isDefault: boolean

// Zustand DevTools - inspect workflow store
// Check stageModels object structure
```

## Test Data

### Sample WebSocket Trigger Payload (Custom Models)

```json
{
  "type": "trigger_workflow",
  "data": {
    "task_id": "task-789",
    "workflow_type": "full_sdlc",
    "adw_id": "test-adw-29aefea6",
    "stage_models": {
      "plan": "opus",
      "build": "opus",
      "test": "sonnet",
      "review": "sonnet",
      "document": "sonnet",
      "merge": "haiku"
    },
    "timestamp": "2025-01-29T14:30:00.000Z"
  }
}
```

### Sample WebSocket Trigger Payload (Defaults)

```json
{
  "type": "trigger_workflow",
  "data": {
    "task_id": "task-101",
    "workflow_type": "full_sdlc",
    "adw_id": "test-adw-default",
    "stage_models": {
      "plan": "opus",
      "build": "opus",
      "test": "sonnet",
      "review": "sonnet",
      "document": "sonnet",
      "merge": "haiku"
    },
    "timestamp": "2025-01-29T14:35:00.000Z"
  }
}
```

### Sample Stage Log Entry with Model Badge

```json
{
  "type": "stage_log",
  "data": {
    "adw_id": "test-adw-29aefea6",
    "stage": "plan",
    "model": "opus",
    "timestamp": "2025-01-29T14:30:15.000Z",
    "level": "INFO",
    "message": "Starting plan stage with Claude Opus model",
    "metadata": {
      "model_version": "claude-opus-4-20250514",
      "cost_tier": "high",
      "performance_tier": "maximum"
    }
  }
}
```

### Default Model Configuration Reference

```javascript
const DEFAULT_STAGE_MODELS = {
  plan: 'opus',      // High capability for strategic planning
  build: 'opus',     // High capability for code generation
  test: 'sonnet',    // Balanced for test writing
  review: 'sonnet',  // Balanced for code review
  document: 'sonnet', // Balanced for documentation
  merge: 'haiku'     // Fast for simple merge operations
};
```

### Model Badge Color Mappings

```javascript
const MODEL_BADGE_STYLES = {
  opus: {
    backgroundColor: 'rgb(239, 68, 68)', // red-500
    icon: 'crown',
    label: 'High Cost',
    ariaLabel: 'High capability, high cost model'
  },
  sonnet: {
    backgroundColor: 'rgb(59, 130, 246)', // blue-500
    icon: 'balance-scale',
    label: 'Balanced',
    ariaLabel: 'Balanced capability and cost model'
  },
  haiku: {
    backgroundColor: 'rgb(34, 197, 94)', // green-500
    icon: 'zap',
    label: 'Fast',
    ariaLabel: 'Fast, economical model'
  }
};
```

## Test Report Template

```markdown
## Test Execution Report - Per-Stage Model Selection

**Date:** {YYYY-MM-DD}
**Tester:** {Name}
**Environment:** {dev/staging/production}
**Browser:** {Chrome 120 / Firefox 121 / Safari 17 / etc}
**Frontend Version:** {commit hash or version}
**Backend Version:** {commit hash or version}

### Results Summary
- Total Test Cases: 4
- Total Steps: 45 (combined across all test cases)
- Passed: {number}
- Failed: {number}
- Skipped: {number}
- Pass Rate: {percentage}%

### Detailed Results

#### Test Case 1: Custom Per-Stage Model Selection
| Step | Status | Notes | Screenshot |
|------|--------|-------|------------|
| Open WorkflowTriggerModal | ✅/❌ | | |
| Select Full SDLC workflow | ✅/❌ | | |
| Verify 6 stage selectors appear | ✅/❌ | | |
| Customize Plan to Opus | ✅/❌ | | |
| Customize Build to Opus | ✅/❌ | | |
| Customize Test to Sonnet | ✅/❌ | | |
| Customize Review to Sonnet | ✅/❌ | | |
| Customize Document to Sonnet | ✅/❌ | | |
| Customize Merge to Haiku | ✅/❌ | | |
| Verify visual badges display | ✅/❌ | | |
| Trigger workflow | ✅/❌ | | |
| Verify WebSocket payload | ✅/❌ | | screenshot-1.png |

**Test Case 1 Result:** ✅ PASS / ❌ FAIL

#### Test Case 2: Default Model Population
| Step | Status | Notes | Screenshot |
|------|--------|-------|------------|
| Open WorkflowTriggerModal | ✅/❌ | | |
| Select Full SDLC workflow | ✅/❌ | | |
| Verify Plan defaults to Opus | ✅/❌ | | |
| Verify Build defaults to Opus | ✅/❌ | | |
| Verify Test defaults to Sonnet | ✅/❌ | | |
| Verify Review defaults to Sonnet | ✅/❌ | | |
| Verify Document defaults to Sonnet | ✅/❌ | | |
| Verify Merge defaults to Haiku | ✅/❌ | | |
| Verify "(Default)" labels | ✅/❌ | | |
| Trigger with defaults | ✅/❌ | | |
| Verify WebSocket payload | ✅/❌ | | screenshot-2.png |

**Test Case 2 Result:** ✅ PASS / ❌ FAIL

#### Test Case 3: Reset to Defaults Functionality
| Step | Status | Notes | Screenshot |
|------|--------|-------|------------|
| Open WorkflowTriggerModal | ✅/❌ | | |
| Customize Plan to Haiku | ✅/❌ | | |
| Customize Test to Opus | ✅/❌ | | |
| Customize Document to Haiku | ✅/❌ | | |
| Verify changes reflected | ✅/❌ | | |
| Click "Reset to Defaults" | ✅/❌ | | |
| Verify Plan reset to Opus | ✅/❌ | | |
| Verify Test reset to Sonnet | ✅/❌ | | |
| Verify Document reset to Sonnet | ✅/❌ | | |
| Verify "(Default)" labels return | ✅/❌ | | |
| Trigger workflow | ✅/❌ | | |
| Verify defaults in payload | ✅/❌ | | screenshot-3.png |

**Test Case 3 Result:** ✅ PASS / ❌ FAIL

#### Test Case 4: Model Information Display in Logs
| Step | Status | Notes | Screenshot |
|------|--------|-------|------------|
| Configure mixed models | ✅/❌ | | |
| Trigger workflow | ✅/❌ | | |
| Open WorkflowLogViewer | ✅/❌ | | |
| Verify Plan shows "Model: Opus" | ✅/❌ | | |
| Verify badge has correct color | ✅/❌ | | |
| Wait for Build stage | ✅/❌ | | |
| Verify Build shows "Model: Sonnet" | ✅/❌ | | |
| Wait for Test stage | ✅/❌ | | |
| Verify Test shows "Model: Haiku" | ✅/❌ | | |
| Verify badge accessibility | ✅/❌ | | |
| Verify badges persist after completion | ✅/❌ | | screenshot-4.png |

**Test Case 4 Result:** ✅ PASS / ❌ FAIL

### Edge Cases Tested
| Edge Case | Status | Notes |
|-----------|--------|-------|
| Workflow type change resets selections | ✅/❌ | |
| Invalid model values handled | ✅/❌ | |
| WebSocket disconnection during selection | ✅/❌ | |
| Multiple browser tabs | ✅/❌ | |
| Model persistence across refreshes | ✅/❌ | |
| Stage not yet executed (no badge) | ✅/❌ | |
| Workflow completes before opening logs | ✅/❌ | |
| Full 6-stage workflow | ✅/❌ | |

### Issues Found

#### Issue 1: {Title}
- **Severity:** Critical / High / Medium / Low
- **Test Case:** {Test Case number}
- **Steps to Reproduce:**
  1. {step 1}
  2. {step 2}
- **Expected:** {expected behavior}
- **Actual:** {actual behavior}
- **Screenshot:** {link}
- **Console Errors:** {paste errors}

#### Issue 2: {Title}
- ...

### Performance Measurements
- Model Selection Response Time: {avg ms}
- WebSocket Latency: {avg ms}
- Log Badge Display Time: {avg ms}
- Reset Functionality Response: {avg ms}
- UI Responsiveness: {smooth / laggy}

### Browser Compatibility
| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | {version} | ✅/❌ | |
| Firefox | {version} | ✅/❌ | |
| Safari | {version} | ✅/❌ | |
| Edge | {version} | ✅/❌ | |

### Screenshots
- Test Case 1: [Custom model selection](screenshots/test-case-1-custom-models.png)
- Test Case 2: [Default population](screenshots/test-case-2-defaults.png)
- Test Case 3 Before: [Before reset](screenshots/test-case-3-before-reset.png)
- Test Case 3 After: [After reset](screenshots/test-case-3-after-reset.png)
- Test Case 4 Plan: [Opus badge](screenshots/test-case-4-plan-opus.png)
- Test Case 4 Build: [Sonnet badge](screenshots/test-case-4-build-sonnet.png)
- Test Case 4 Test: [Haiku badge](screenshots/test-case-4-test-haiku.png)
- Test Case 4 Full: [Full log view](screenshots/test-case-4-full-logs.png)

### Recommendations
1. {Recommendation based on testing findings}
2. {Suggestion for improvement}
3. {Follow-up testing needed}

### Tester Sign-off
**Name:** {Tester name}
**Date:** {Date}
**Approved for Production:** ✅ YES / ❌ NO (with conditions)
```

## Success Metrics

- **Test Pass Rate:** 100% of test steps pass
- **UI Responsiveness:** Model selection changes render in < 500ms
- **WebSocket Latency:** Payload transmission within 1 second of trigger
- **Visual Accuracy:** All badges and indicators display correctly with proper colors
- **Error Rate:** 0 console errors during normal operation
- **User Experience:** Feature is intuitive and requires no documentation to use
- **Accessibility Score:** All interactive elements meet WCAG 2.1 AA standards
- **Cross-browser Compatibility:** Works identically in Chrome, Firefox, Safari, Edge

## Notes

- This is a comprehensive E2E test specification for manual and automated testing
- Playwright automation scripts provided for each test case
- Screenshots should be saved in `docs/e2e-screenshots/issue-26/`
- Test data includes sample WebSocket payloads and configuration objects
- Edge cases cover common failure scenarios and boundary conditions
- Update this spec as new features or edge cases are discovered
- For CI/CD integration, run Playwright tests with: `npx playwright test test-case-*.spec.js`

## Automation Execution

To run all automated E2E tests for this feature:

```bash
# Install Playwright if not already installed
npm install -D @playwright/test

# Run all test cases
npx playwright test src/test/e2e/issue-26-*.spec.js

# Run specific test case
npx playwright test test-case-1-custom-model-selection.spec.js

# Run with UI mode for debugging
npx playwright test --ui

# Generate test report
npx playwright show-report
```

## Related Documentation

- **Original Feature Spec:** `specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md`
- **UI Tests Spec:** `specs/patch/patch-adw-29aefea6-ui-tests.md`
- **StageModelSelector Component:** `src/components/ui/StageModelSelector.jsx`
- **WorkflowLogViewer Component:** `src/components/WorkflowLogViewer.jsx`
- **Backend Workflow Handler:** `server/api/workflow.py`
