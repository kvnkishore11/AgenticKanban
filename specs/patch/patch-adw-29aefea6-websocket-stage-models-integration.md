# Patch: WebSocket Stage Models Integration

## Metadata
adw_id: `29aefea6`
review_change_request: `Issue #2: No integration of stage models into kanbanStore.triggerWorkflowForTask. The spec requires that the Kanban store's triggerWorkflowForTask action should accept and include stageModels parameter in the WebSocket message payload. Review of kanbanStore.js changes shows modifications were made but need verification that stageModels parameter is properly handled. Resolution: Verify and ensure kanbanStore.triggerWorkflowForTask properly accepts stageModels parameter and includes it in the WebSocket payload sent to the backend trigger endpoint Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md
**Issue:** The WorkflowTriggerModal passes `stageModels` in the options to `triggerWorkflowForTask`, but the WebSocket service's `triggerWorkflowForTask` method does not include `stageModels` in the request payload sent to the backend. This breaks the per-stage model selection feature as the backend never receives the model configuration.
**Solution:** Update `websocketService.js` to extract `stageModels` from options and include it in the WebSocket trigger request payload. Verify the complete data flow from UI → kanbanStore → websocketService → backend.

## Files to Modify
- `src/services/websocket/websocketService.js` - Add stageModels to WebSocket request payload
- `src/services/websocket/__tests__/websocketService.test.js` - Add tests for stageModels in payload

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update websocketService.js to include stageModels in payload
- Locate the `triggerWorkflowForTask` method in `src/services/websocket/websocketService.js` (around line 672-720)
- After building the base `request` object (after line 705), add conditional logic to include `stageModels` if provided in options
- Add code: `if (options.stageModels) { request.stage_models = options.stageModels; }`
- Add debug logging: `console.log('[WebSocketService] Including stage_models:', options.stageModels);`
- Ensure this happens before the orchestrator stages check (before line 707)
- Update the existing log statement to show stage_models in the request object

### Step 2: Verify data flow in kanbanStore.js
- Confirm that `kanbanStore.js` triggerWorkflowForTask (line 1324) correctly passes options including stageModels to websocketService
- Verify the options spread operator (`...options` at line 1352) includes stageModels
- No changes needed if spread is working correctly - just verification

### Step 3: Create/Update Tests
- Update `src/services/websocket/__tests__/websocketService.test.js` to test stageModels inclusion
- Add test case: "should include stage_models in request payload when provided"
- Test that stageModels object is correctly mapped to stage_models in the WebSocket message
- Add test case: "should not include stage_models when not provided in options"
- Verify backward compatibility with workflows that don't use stage models

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. Run frontend unit tests to ensure no regressions:
   ```bash
   npm run test
   ```

2. Run TypeScript type checking:
   ```bash
   npm run typecheck
   ```

3. Run frontend build to ensure no build errors:
   ```bash
   npm run build
   ```

4. Manual E2E verification:
   - Start the application
   - Open WorkflowTriggerModal for a task
   - Select an orchestrator workflow (e.g., "Full SDLC")
   - Verify stage model selectors appear
   - Change some models from defaults
   - Open browser DevTools console
   - Trigger the workflow
   - Verify console logs show `[WebSocketService] Including stage_models: {plan: "opus", ...}`
   - Verify WebSocket message includes `stage_models` field in the payload

## Patch Scope
**Lines of code to change:** ~5 lines (2-3 lines in websocketService.js, plus tests)
**Risk level:** low
**Testing required:** Unit tests for websocketService, manual verification of WebSocket payload, integration verification with backend
