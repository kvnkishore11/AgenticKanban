# Chore: Add ADW ID Reference Option

## Metadata
issue_number: `33`
adw_id: `75c8c6d6`
issue_json: `{"number":33,"title":"couple of adw flows request an adw_id before hand...","body":"couple of adw flows request an adw_id before hand for example patch. please give an option to add adwid to reference. whenever patch is selected. refer to adw system within our codebase for more understanding on this. Ensure all the possible adws's are supported with this new addition. if nothing is passed it can work as it is working right now."}`

## Chore Description
Add an option for users to provide an existing ADW ID reference when triggering certain ADW workflows, particularly patch workflows. This enhancement allows users to reference previous ADW work while maintaining backward compatibility. When no ADW ID is provided, the system should work as it currently does by generating a new ADW ID.

The chore involves:
- Adding a UI option to specify an existing ADW ID when triggering workflows
- Ensuring all ADW flows that support adw_id parameters can utilize this feature
- Maintaining backward compatibility when no ADW ID is provided
- Focusing primarily on patch workflows but extending support to all applicable ADW flows

## Relevant Files
Use these files to resolve the chore:

- `src/components/ui/` - UI components where ADW selection controls might be added
- `src/stores/kanbanStore.js` - Kanban store that likely manages workflow state and triggers
- `src/constants/workItems.js` - Constants related to work items and workflow types
- `src/utils/websocketErrorMapping.js` - WebSocket utilities for ADW workflow communication
- `adws/adw_patch_iso.py` - Primary patch workflow that accepts optional adw_id parameter
- `adws/adw_plan_iso.py` - Planning workflow that accepts optional adw_id parameter
- `adws/adw_build_iso.py` - Build workflow that requires mandatory adw_id parameter
- `adws/adw_test_iso.py` - Test workflow that requires mandatory adw_id parameter
- `adws/adw_review_iso.py` - Review workflow that requires mandatory adw_id parameter
- `adws/adw_document_iso.py` - Documentation workflow that requires mandatory adw_id parameter
- `adws/adw_ship_iso.py` - Ship workflow that requires mandatory adw_id parameter
- `adws/adw_triggers/trigger_websocket.py` - WebSocket trigger server that handles workflow requests
- `adws/adw_modules/data_types.py` - Data types for ADW workflow communication
- `adws/README.md` - ADW system documentation for understanding workflow parameters

### New Files
- `src/components/ui/AdwIdInput.jsx` - New component for ADW ID input field
- `src/utils/adwValidation.js` - Utility functions for ADW ID validation

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Understand Current ADW Workflow Triggering
- Analyze `src/stores/kanbanStore.js` to understand how ADW workflows are currently triggered
- Examine `src/utils/websocketErrorMapping.js` to understand WebSocket communication patterns
- Review `adws/adw_triggers/trigger_websocket.py` to understand how ADW requests are processed
- Document the current workflow triggering flow and identify where ADW ID option should be added

### Step 2: Analyze ADW Flow Parameter Requirements
- Review all ADW flows in `adws/` directory to understand which ones accept optional vs mandatory adw_id parameters
- Document the parameter requirements for each workflow type:
  - Entry point workflows (create worktrees): `adw_plan_iso.py`, `adw_patch_iso.py` - accept optional adw_id
  - Dependent workflows (require worktrees): `adw_build_iso.py`, `adw_test_iso.py`, etc. - require mandatory adw_id
  - Orchestrator workflows: various combinations that may accept optional adw_id
- Create a mapping of which workflows should show the ADW ID input option

### Step 3: Design ADW ID Input Component
- Create `src/components/ui/AdwIdInput.jsx` component with:
  - Input field for 8-character alphanumeric ADW ID
  - Real-time validation using regex pattern `^[a-zA-Z0-9]{8}$`
  - Optional/required state based on workflow type
  - Clear labeling and help text explaining the purpose
  - Integration with form state management

### Step 4: Add ADW ID Validation Utilities
- Create `src/utils/adwValidation.js` with functions to:
  - Validate ADW ID format (8-character alphanumeric)
  - Check if ADW ID should be optional or required for specific workflow types
  - Format and sanitize ADW ID input
  - Generate helpful error messages for invalid ADW IDs

### Step 5: Update Kanban Store for ADW ID Support
- Modify `src/stores/kanbanStore.js` to:
  - Add adw_id field to workflow trigger state
  - Update workflow trigger functions to accept optional adw_id parameter
  - Ensure adw_id is properly passed in WebSocket requests to ADW trigger server
  - Maintain backward compatibility when adw_id is not provided

### Step 6: Integrate ADW ID Input in UI Workflow Triggers
- Identify where workflow selection UI exists (likely in components under `src/components/`)
- Add `AdwIdInput` component to workflow trigger forms/modals
- Show ADW ID input conditionally based on workflow type:
  - Show as optional for entry point workflows (plan, patch, orchestrators)
  - Show as required for dependent workflows (build, test, review, document, ship)
  - Hide for workflows that don't support adw_id
- Update form submission to include adw_id when provided

### Step 7: Update WebSocket Communication
- Review `adws/adw_triggers/trigger_websocket.py` to ensure it properly handles adw_id in requests
- Verify `adws/adw_modules/data_types.py` includes adw_id in WebSocket message types
- Update any missing data structures to support optional adw_id parameter
- Ensure error handling for invalid ADW ID format or missing required ADW ID

### Step 8: Test ADW ID Integration
- Test entry point workflows with optional ADW ID:
  - Provide valid existing ADW ID and verify it's used
  - Omit ADW ID and verify new one is generated
  - Provide invalid ADW ID format and verify proper error handling
- Test dependent workflows with required ADW ID:
  - Verify workflows fail appropriately when ADW ID is missing
  - Verify workflows work correctly with valid ADW ID
- Test UI behavior:
  - ADW ID input shows/hides appropriately based on workflow type
  - Form validation works correctly
  - Error messages are helpful and clear

### Step 9: Update Documentation and Constants
- Update `src/constants/workItems.js` if new workflow types or constants are needed
- Add comments and JSDoc documentation to new components and utilities
- Ensure ADW ID feature is properly integrated with existing workflow patterns

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run lint` - Run ESLint to ensure code style compliance
- `npm run build` - Build the application to ensure no compilation errors
- `npm run test` - Run frontend tests to validate functionality
- `uv run adws/adw_patch_iso.py 1 testadw1` - Test patch workflow with provided ADW ID
- `uv run adws/adw_patch_iso.py 1` - Test patch workflow without ADW ID (should generate new one)
- `uv run adws/adw_triggers/trigger_websocket.py` - Start WebSocket server to verify it handles new ADW ID parameter

## Notes
- Maintain strict backward compatibility - if no ADW ID is provided, system should work exactly as before
- ADW ID format is 8-character alphanumeric string (e.g., "a1b2c3d4", "abc12345")
- Entry point workflows (plan, patch, orchestrators) accept optional ADW ID and create worktrees
- Dependent workflows (build, test, review, document, ship) require existing ADW ID and worktree
- Focus on patch workflows as mentioned in the chore, but ensure all applicable ADW flows are supported
- The UI should clearly indicate when ADW ID is optional vs required
- Error messages should guide users on proper ADW ID format and usage