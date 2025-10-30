# Chore: Ensure issue_type is sent along with issue_number to prevent ADW execution stops

## Metadata
issue_number: `N/A`
adw_id: `N/A`
issue_json: `N/A`

## Chore Description
Currently, the ADW (AI Developer Workflow) system stops execution when it cannot find a GitHub issue, even when the kanban application provides an issue_type (feature/chore/bug/patch). This chore ensures that the issue_type is properly sent along with the issue_number so that ADW workflows can proceed even without a GitHub issue, using the kanban-provided issue classification.

The problem exists in three areas:
1. The WebSocket client (kanban app) doesn't send the `issue_type` field in workflow trigger requests
2. The ADW validation logic requires `issue_number` for most workflows, preventing execution even when `issue_type` is available
3. The ADW workflow system automatically attempts to classify GitHub issues using AI, which fails when no GitHub issue exists, even when `issue_type` is provided by the kanban app

## Relevant Files
Use these files to resolve the chore:

- `src/services/websocket/websocketService.js` - WebSocket service that sends workflow trigger requests to ADW. Currently missing `issue_type` in the request payload at line 292.
- `../tac-7/adws/adw_triggers/trigger_websocket.py` - ADW WebSocket trigger service that validates incoming requests. Contains validation logic at lines 167-173 that requires `issue_number` for most workflows.
- `../tac-7/adws/adw_triggers/websocket_models.py` - Already contains the `issue_type` field definition but it's not being utilized properly in validation.
- `src/services/adwCreationService.js` - Has access to `workItemType` which should be mapped to `issue_type` in WebSocket requests.
- `../tac-7/adws/adw_modules/workflow_ops.py` - Contains the `classify_issue` function (line 107) that attempts to classify GitHub issues using AI, which needs to be bypassed when `issue_type` is already provided.

### New Files
No new files need to be created.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update WebSocket client to send issue_type
- Modify `src/services/websocket/websocketService.js` in the `triggerWorkflowForTask` method (line 288)
- Add `issue_type` field to the request object using the task's `workItemType`
- Ensure the `issue_type` is properly mapped from kanban work item types to ADW issue types (feature/bug/chore/patch)

### Step 2: Update ADW validation logic to accept issue_type without issue_number
- Modify `../tac-7/adws/adw_triggers/trigger_websocket.py` in the `validate_workflow_request` function (lines 167-173)
- Update the validation logic to allow workflows to proceed when `issue_type` is provided, even if `issue_number` is missing
- Ensure that either `issue_number` OR `issue_type` is sufficient for workflow execution

### Step 3: Ensure proper issue_type handling in ADW state management
- Verify that the `issue_type` to `issue_class` conversion in `trigger_workflow` function (lines 199, 211, 224) works correctly
- Ensure the issue classification is properly stored in ADW state for workflows that don't have GitHub issues

### Step 4: Bypass GitHub issue classification when issue_type is provided
- Modify `../tac-7/adws/adw_modules/workflow_ops.py` in the workflow setup functions where `classify_issue` is called (line 551)
- Update functions to check if `issue_class` already exists in the ADW state (from WebSocket-provided `issue_type`) before attempting GitHub issue classification
- Ensure that workflows skip the `classify_issue` step when `issue_type` has already been converted to `issue_class` in the ADW state

### Step 5: Update ADW creation service integration
- Modify `src/services/adwCreationService.js` to ensure `workItemType` is consistently mapped to `issue_type` in trigger payloads
- Update the `createTriggerPayload` method (line 316) to include `issue_type` field

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban && npm run dev` - Start the kanban application to test WebSocket integration
- `cd /Users/kvnkishore/WebstormProjects/AKApp/tac-7/adws && uv run adw_triggers/trigger_websocket.py --port 8002` - Start ADW WebSocket trigger service
- Test workflow triggering from kanban app with different work item types (feature/bug/chore/patch) without GitHub issue numbers
- Verify that ADW workflows start successfully when `issue_type` is provided without `issue_number`
- Check ADW logs to ensure `issue_class` is properly set from `issue_type` in workflows

## Notes
- The `issue_type` field already exists in the WebSocket models but is not being sent by the client or properly validated by the server
- This change will maintain backward compatibility since `issue_number` will still work as before
- The modification allows ADW to work with kanban-only tasks that don't have corresponding GitHub issues
- The `issue_type` gets converted to `issue_class` format with a leading slash (e.g., "/feature") in the ADW state management
- The key insight is that ADW workflows automatically try to classify GitHub issues using AI (`classify_issue` function), which fails when no GitHub issue exists. By providing `issue_type` upfront and storing it as `issue_class` in ADW state, we can bypass this classification step entirely
- Functions that call `classify_issue` include the branch creation workflow in `workflow_ops.py` at line 551, which should check for existing `issue_class` in state before attempting GitHub classification