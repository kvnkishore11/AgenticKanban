# Chore: Decouple adw_patch from GitHub issues and integrate with kanban board

## Metadata
issue_number: `67`
adw_id: `662ea49d`
issue_json: `{"number":67,"title":"currently adw_patch is closely coupled with github...","body":"currently adw_patch is closely coupled with github issues. You need to make it work with kanban board. i can select any adw_id and selct patch and can request to make some changes if things dont work as expected. please try to work on these"}`

## Chore Description
Currently, the `adw_patch_iso.py` workflow is tightly coupled with GitHub issues, requiring the 'adw_patch' keyword to be present in either issue comments or the issue body. This creates a limitation when working with the kanban board interface, where users want to trigger patch workflows on any existing ADW ID based on kanban task data rather than GitHub issue comments.

The goal is to decouple adw_patch from GitHub dependencies and make it work seamlessly with the kanban board, allowing users to:
1. Select any existing ADW ID from the kanban board
2. Request patch changes based on kanban task metadata (description, images, comments)
3. Trigger patch workflows without requiring GitHub issue comments with 'adw_patch' keyword
4. Handle scenarios where things don't work as expected by creating follow-up patches

## Relevant Files
Use these files to resolve the chore:

- **adws/adw_patch_iso.py** (lines 69-129)
  - Contains `get_patch_content()` function that enforces 'adw_patch' keyword requirement from GitHub issues/comments
  - Main entry point that needs to support kanban mode where patch content comes from kanban task data instead
  - Currently only looks for patch requests in GitHub issue body or comments

- **adws/adw_modules/workflow_ops.py**
  - Contains `create_github_issue_from_kanban_data()` function for handling kanban issue data
  - Contains `create_and_implement_patch()` function used by patch workflows
  - Already has kanban mode support infrastructure that can be leveraged

- **adws/adw_modules/kanban_mode.py**
  - Contains kanban mode detection logic (`is_kanban_mode()`)
  - Contains functions for handling kanban-specific data formats
  - May need new functions to extract patch content from kanban task data

- **adws/adw_modules/state.py**
  - ADWState class that manages workflow state including kanban mode flag
  - State includes `issue_json` which contains kanban task data when in kanban mode

- **src/components/forms/WorkflowTriggerModal.jsx**
  - UI component for triggering ADW workflows from kanban board
  - Already includes 'adw_patch_iso' as an entry point workflow option (line 42-47)
  - Provides interface for ADW ID input and workflow selection

- **src/services/adwCreationService.js**
  - Handles ADW configuration creation including task metadata with description and images
  - Task data structure includes title, description, images that can be used for patch content

- **src/stores/kanbanStore.js**
  - Manages kanban board state and task operations
  - Coordinates workflow triggering via WebSocket service

### New Files
- **adws/adw_modules/patch_content_extractor.py**
  - New module to handle patch content extraction from both GitHub and Kanban sources
  - Provides unified interface for getting patch requests regardless of source

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create patch content extractor module
- Create new file `adws/adw_modules/patch_content_extractor.py`
- Implement `extract_patch_content_from_github()` function that:
  - Searches for 'adw_patch' keyword in GitHub issue comments and body (existing logic from adw_patch_iso.py)
  - Returns patch content and metadata (source type, timestamp)
- Implement `extract_patch_content_from_kanban()` function that:
  - Extracts patch request content from kanban task metadata stored in `issue_json`
  - Formats kanban task data (title, description, images) as patch request
  - Does not require 'adw_patch' keyword when in kanban mode
- Implement unified `get_patch_content()` function that:
  - Detects mode (GitHub vs Kanban) using `is_kanban_mode()` from state
  - Routes to appropriate extractor function
  - Returns consistent patch content format

### Step 2: Update adw_patch_iso.py to use new extractor
- Import the new `patch_content_extractor` module
- Replace the existing `get_patch_content()` function (lines 69-129) with a call to the new unified extractor
- Update to support kanban mode:
  - When in kanban mode, skip GitHub comment searching
  - Use kanban task data from `state.issue_json` directly
  - Remove requirement for 'adw_patch' keyword in kanban mode
- Maintain backward compatibility for GitHub mode:
  - Keep existing 'adw_patch' keyword requirement for GitHub issues
  - Preserve GitHub comment/issue body precedence logic
- Update error messages to be mode-aware (different messages for GitHub vs Kanban)

### Step 3: Enhance kanban_mode.py utilities
- Add function `format_kanban_task_as_patch_request()` that:
  - Takes kanban task data (from `issue_json` in state)
  - Formats it as a patch request string
  - Includes task title, description, images (as markdown), and any additional metadata
- Add function `get_patch_reason_from_kanban()` that:
  - Extracts reason for patch from kanban task metadata
  - Supports common scenarios: "fix failing tests", "address review comments", "improve implementation"

### Step 4: Update state handling for patch workflows
- In `adw_modules/state.py`, ensure ADWState properly tracks:
  - Patch source mode (GitHub vs Kanban)
  - Previous patch attempts (for follow-up patches)
  - Kanban task metadata required for patches
- Add validation to ensure required fields are present based on mode

### Step 5: Update WorkflowTriggerModal UI
- In `src/components/forms/WorkflowTriggerModal.jsx`:
  - Add optional patch request input field for 'adw_patch_iso' workflow type
  - Allow users to provide patch description directly in the UI
  - Show helpful placeholder text: "Describe the changes needed (e.g., 'Fix failing test in module X')"
  - Make ADW ID required and prominent for patch workflows
  - Add validation to ensure either ADW ID is provided or auto-detected from task metadata

### Step 6: Add patch content to workflow trigger payload
- In `src/stores/kanbanStore.js` or WebSocket service:
  - When triggering 'adw_patch_iso' workflow, include patch request content in payload
  - Extract patch content from task description or user input
  - Include task images if present
- Update WebSocket message format to support patch content field

### Step 7: Update adw_triggers/trigger_websocket.py
- Add support for receiving patch content in WebSocket workflow trigger messages
- Store patch content in ADW state when creating new workflow instance
- Pass patch content to adw_patch_iso.py via environment variable or state file

### Step 8: Update documentation
- Update `adws/README.md` section on `adw_patch_iso.py` to document:
  - Dual-mode operation (GitHub and Kanban)
  - Kanban mode does not require 'adw_patch' keyword
  - How to trigger patches from kanban board
  - Patch content format for kanban mode
- Add examples of kanban-based patch workflows

### Step 9: Add follow-up patch support
- Implement logic to detect when a patch is being applied to an existing ADW ID
- Track patch history in ADW state (patch number, timestamp, reason)
- Support iterative patching: user can request multiple patches on same ADW ID
- Store patch history for debugging and audit trail

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `uv run adws/adw_patch_iso.py 67 662ea49d` - Test patch workflow with kanban mode using this ADW ID
- `cd adws && uv run python -m pytest adw_modules/test_patch_content_extractor.py -v` - Run unit tests for new patch content extractor module (create this test file)
- `npm run typecheck` - Ensure TypeScript changes have no type errors
- `npm run lint` - Ensure code style is consistent

## Notes
- The key architectural change is introducing a **source-agnostic patch content extraction layer** that abstracts away the difference between GitHub issues and Kanban tasks
- In **kanban mode**, the patch content comes from task metadata (`issue_json`) which includes title, description, and images - no need to search for 'adw_patch' keyword
- In **GitHub mode**, maintain existing behavior requiring 'adw_patch' keyword for safety and explicit opt-in
- The `is_kanban_mode()` function already exists and can be used to detect the source mode
- Consider adding a `patch_history` array to ADW state to track multiple patch attempts on the same ADW ID
- The WebSocket trigger interface may need to be enhanced to pass patch request content from the UI to the backend
- This change makes the patch workflow more flexible and user-friendly while maintaining backward compatibility with GitHub-based workflows
