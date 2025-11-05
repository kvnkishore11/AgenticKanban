# Feature: ADW ID Autocomplete Dropdown Enhancement

## Metadata
issue_number: `63`
adw_id: `e2a085da`
issue_json: `{"number":63,"title":"this adw_id field I want it to be like anautocompl...","body":"this adw_id field I want it to be like anautocomplete dropdown which can take input and it should give us all existing adw_ids with waht this adw_id did. may be all the existing immediate subfoldres for existin adws nad may be the plan_file within the adw_state.json of agents/{adw_id}/adw_state.json can be the description. It will be of great help.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/272a73a2-5750-4143-b4fe-491ea55739ec)\n\n"}`

## Feature Description
Enhance the ADW ID input field in the TaskInput component to provide autocomplete functionality similar to the existing WorkflowTriggerModal implementation. The feature will display a searchable dropdown showing all existing ADW IDs with rich metadata including:
- ADW ID (8-character identifier)
- Issue class badge (feature/bug/chore)
- Issue number
- Issue title (what the ADW did)
- Branch name
- Optional: Plan file preview/description from adw_state.json

This enhancement will improve user experience when creating tasks by making it easy to discover and reference existing ADW workflows without manually typing or remembering ADW IDs.

## User Story
As a user creating a new task
I want to see an autocomplete dropdown with all existing ADW IDs and their descriptions
So that I can easily discover and reference previous work without manually typing ADW IDs

## Problem Statement
Currently, the TaskInput component uses a simple text input for the custom ADW ID field (src/components/forms/TaskInput.jsx:362-384). Users must manually type the 8-character ADW ID and have no way to discover existing ADWs or understand what each ADW represents. This creates friction in the workflow as users need to:
1. Remember or look up existing ADW IDs separately
2. Manually type the ID with potential for errors
3. Have no visibility into what each ADW ID represents

Meanwhile, the WorkflowTriggerModal already has a sophisticated AdwIdInput component (src/components/ui/AdwIdInput.jsx) that provides autocomplete, search, and rich metadata display - but this functionality isn't available when creating new tasks.

## Solution Statement
Replace the simple text input in TaskInput component with the existing AdwIdInput component that already provides:
- Autocomplete dropdown with all available ADW IDs fetched from the backend
- Real-time search/filtering as the user types
- Rich metadata display for each ADW including issue class, number, title, and branch
- Keyboard navigation support
- Validation and error handling
- Loading states and graceful fallback to manual entry

The backend API (GET /api/adws/list in server/api/adws.py) already provides all necessary data by scanning the agents/{adw_id}/adw_state.json files. No backend changes are required - this is purely a frontend enhancement to improve consistency and user experience.

## Relevant Files
Use these files to implement the feature:

- **src/components/forms/TaskInput.jsx** - Main task creation form that currently uses a simple text input for custom ADW ID. This needs to be updated to use the AdwIdInput component (lines 32, 362-384).

- **src/components/ui/AdwIdInput.jsx** - Already-implemented autocomplete component with rich metadata display. This component is currently used in WorkflowTriggerModal and will be reused in TaskInput.

- **src/services/api/adwDiscoveryService.js** - Service that fetches ADW list from backend REST API. Already provides listAdws(), getAdwDetails(), and filterAdws() methods.

- **src/utils/adwValidation.js** - Validation utilities for ADW ID format. Provides validateAdwId() and isAdwIdRequired() functions.

- **server/api/adws.py** - Backend API endpoint that scans agents/{adw_id}/adw_state.json files and returns ADW metadata. Already implements GET /api/adws/list endpoint (lines 199-220). No changes needed.

- **src/types/eventStream.ts** - TypeScript type definitions including adw_id field usage (line 25). For reference to understand data structures.

### New Files

- **.claude/commands/e2e/test_adw_id_autocomplete.md** - E2E test file to validate the autocomplete functionality works correctly in the TaskInput form.

## Implementation Plan

### Phase 1: Foundation
Review the existing AdwIdInput component implementation to understand its props, behavior, and dependencies. Ensure the component is properly exported and can be imported into TaskInput. Verify that the adwDiscoveryService is already being used and the backend API is functioning correctly.

### Phase 2: Core Implementation
Replace the simple text input in TaskInput with the AdwIdInput component. Update the state management to work with the new component's onChange callback. Remove the custom validation logic that's duplicated in AdwIdInput. Test the integration to ensure data flows correctly between the component and the form submission.

### Phase 3: Integration
Ensure the new autocomplete input integrates seamlessly with the existing task creation flow. Verify that selected ADW IDs are properly saved to task metadata. Test that the component behaves correctly in different scenarios (empty state, with existing ADWs, with no ADWs available). Add appropriate error handling and user feedback.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Review Existing AdwIdInput Component
- Read src/components/ui/AdwIdInput.jsx to understand the component's props and behavior
- Review how AdwIdInput is currently used in src/components/forms/WorkflowTriggerModal.jsx
- Verify the component exports and imports are correct
- Understand the data flow between AdwIdInput and adwDiscoveryService

### Step 2: Update TaskInput Component to Use AdwIdInput
- Import AdwIdInput component at the top of src/components/forms/TaskInput.jsx
- Replace the custom ADW ID text input section (lines 362-384) with the AdwIdInput component
- Pass appropriate props to AdwIdInput:
  - value={customAdwId}
  - onChange={(value) => setCustomAdwId(value)}
  - isRequired={false} (ADW ID is optional when creating tasks)
  - showHelpText={true}
  - placeholder="Search or enter ADW ID..."
- Remove the custom adwIdError state and validation logic since AdwIdInput handles this internally
- Update the component to use AdwIdInput's built-in validation

### Step 3: Test the Integration
- Manually test the TaskInput form with the new AdwIdInput component
- Verify the dropdown appears and fetches ADW IDs from the backend
- Test search/filtering functionality by typing in the input
- Test keyboard navigation (Arrow Up/Down, Enter, Escape)
- Verify that selecting an ADW ID populates the field correctly
- Test manual entry of ADW IDs still works
- Verify that the form submission includes the selected ADW ID in task metadata

### Step 4: Create E2E Test File
- Create .claude/commands/e2e/test_adw_id_autocomplete.md based on the example in .claude/commands/e2e/test_basic_query.md
- Include test steps to:
  1. Navigate to the application
  2. Click the "Add Task" button to open TaskInput modal
  3. Verify the ADW ID input field is present
  4. Click the ADW ID dropdown to open the autocomplete
  5. Verify existing ADW IDs are displayed with metadata (issue class, title, branch)
  6. Type a search query and verify filtering works
  7. Select an ADW ID from the dropdown
  8. Verify the selected ADW ID appears in the input field
  9. Take screenshots of each major step
- Define success criteria including autocomplete display, search functionality, and selection

### Step 5: Handle Edge Cases
- Test behavior when no ADW IDs exist (empty agents/ directory)
- Test behavior when API request fails (backend offline)
- Verify graceful fallback to manual entry in error scenarios
- Test with very long ADW lists to ensure performance
- Verify the component clears properly when the form is reset

### Step 6: Code Cleanup
- Remove any unused imports related to the old text input implementation
- Remove the customAdwIdError state variable if it's no longer used
- Ensure consistent code formatting and style
- Add JSDoc comments if needed to document the component usage

### Step 7: Run Validation Commands
- Execute all validation commands listed below to ensure zero regressions
- Fix any issues discovered during validation
- Re-run tests until all pass successfully

## Testing Strategy

### Unit Tests
- Verify AdwIdInput component renders correctly in TaskInput context
- Test that onChange callback updates customAdwId state
- Verify that form submission includes the ADW ID in task metadata
- Test validation integration (optional field, format validation)
- Test that the component gracefully handles API errors

### Edge Cases
- Empty agents/ directory (no ADW IDs available) - should show "No ADW IDs available" message
- Backend API failure - should gracefully fallback to manual entry
- Invalid ADW ID entered manually - should show validation error
- Very long list of ADWs (100+) - dropdown should scroll and remain performant
- Rapid typing in search field - should debounce/filter correctly
- Form reset after selecting ADW ID - should clear the field
- Multiple rapid opens/closes of dropdown - should not cause flickering or errors

## Acceptance Criteria
- TaskInput component uses AdwIdInput instead of simple text input for custom ADW ID field
- Autocomplete dropdown displays all existing ADW IDs with metadata (issue class, number, title, branch)
- Search/filtering works in real-time as user types
- Keyboard navigation (Arrow Up/Down, Enter, Escape) functions correctly
- Selected ADW ID is properly saved to task metadata when form is submitted
- Component gracefully handles scenarios with no ADWs or API errors
- Manual entry of ADW IDs still works for new workflows
- Form validation provides clear feedback for invalid ADW ID formats
- E2E test validates the complete user flow
- All existing tests pass with zero regressions
- Frontend build completes without errors
- Code follows existing patterns and conventions in the codebase

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute the new E2E test file `.claude/commands/e2e/test_adw_id_autocomplete.md` to validate this functionality works end-to-end.
- `cd server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `bun tsc --noEmit` - Run frontend type checking to validate the feature works with zero regressions
- `bun run build` - Run frontend build to validate the feature works with zero regressions

## Notes
- The AdwIdInput component is already well-implemented and tested in WorkflowTriggerModal - we're simply reusing it for consistency
- No backend changes are required - the GET /api/adws/list endpoint already provides all necessary data
- This change improves UX consistency across the application by using the same component in both places where users interact with ADW IDs
- The existing adwDiscoveryService handles all API communication and filtering logic
- Consider adding caching to adwDiscoveryService in the future to reduce API calls when opening multiple dropdowns
- The agents/{adw_id}/adw_state.json structure is already parsed by the backend and returned via the API - plan_file content could be added to the dropdown in a future enhancement if desired
- This is a low-risk change since we're replacing a simple input with a more feature-rich component that's already proven to work
