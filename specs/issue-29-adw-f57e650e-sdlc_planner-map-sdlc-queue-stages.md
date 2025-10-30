# Feature: Map SDLC Queue Stages to ADW SDLC ISO Workflow

## Metadata
issue_number: `29`
adw_id: `f57e650e`
issue_json: `{"number":29,"title":"whenever user selects plan, implement, test, revie...","body":"whenever user selects plan, implement, test, review, document -> this is related to adw_sdlc_iso which is already present wtih in the list. can you ensure that that particular adw is mapped. \n\nalso we can add that option with in the ui as well as shown (Queue Stages) | give option of SDLC"}`

## Feature Description
This feature will enable automatic mapping of SDLC queue stages (plan, implement, test, review, document) to the existing adw_sdlc_iso workflow when users create tasks with all five SDLC stages selected. Additionally, it will add a UI enhancement that allows users to quickly select all SDLC stages at once through a dedicated "SDLC" option in the Queue Stages selection area.

## User Story
As a developer using the Agentic Kanban board
I want to have tasks with full SDLC stages automatically mapped to the adw_sdlc_iso workflow
So that I can leverage the existing comprehensive SDLC automation without manual configuration

## Problem Statement
Currently, when users select all SDLC stages (plan, implement, test, review, document) for a task, the system generates a dynamic workflow name but doesn't recognize that this combination should use the existing adw_sdlc_iso workflow. Users need to manually know and configure the correct ADW, which creates friction and reduces the discoverability of the full SDLC automation capability.

## Solution Statement
The solution will detect when a task includes the complete SDLC stage set and automatically map it to the adw_sdlc_iso workflow. Additionally, a UI enhancement will be added to allow users to select all SDLC stages with a single click through a dedicated "Full SDLC" option in the task creation interface, improving the user experience and making the SDLC workflow more discoverable.

## Relevant Files
Use these files to implement the feature:

- `src/services/adwCreationService.js` - Core service that generates ADW configurations and workflow names
- `src/components/forms/TaskInput.jsx` - UI component for task creation that includes queue stage selection
- `src/constants/workItems.js` - Contains QUEUEABLE_STAGES constant definition
- `adws/adw_sdlc_iso.py` - The existing SDLC workflow script to be mapped
- `app/server/handlers/taskHandler.py` - Backend handler for task processing (if exists)
- `.claude/commands/test_e2e.md` - E2E test documentation to understand test patterns
- `.claude/commands/e2e/test_basic_query.md` - Example E2E test for reference
- `.claude/commands/e2e/test_complex_query.md` - Another E2E test example

### New Files
- `.claude/commands/e2e/test_sdlc_queue_mapping.md` - E2E test for SDLC queue stage mapping functionality

## Implementation Plan
### Phase 1: Foundation
Enhance the ADW creation service to recognize and properly map SDLC stage combinations to the adw_sdlc_iso workflow.

### Phase 2: Core Implementation
Implement the logic for detecting full SDLC stage selection and mapping to adw_sdlc_iso, plus add the UI enhancement for quick SDLC selection.

### Phase 3: Integration
Integrate the mapping logic with the existing task creation flow and ensure proper state management and validation.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Task 1: Research and Analysis
- Read the existing adw_sdlc_iso.py to understand its requirements and structure
- Analyze the current workflow name generation logic in adwCreationService.js
- Review the TaskInput.jsx component to understand current queue stage selection implementation
- Document the exact mapping requirements and edge cases

### Task 2: Create E2E Test Specification
- Read `.claude/commands/test_e2e.md` to understand E2E test patterns
- Read `.claude/commands/e2e/test_basic_query.md` and `test_complex_query.md` for examples
- Create `.claude/commands/e2e/test_sdlc_queue_mapping.md` with test scenarios for:
  - Selecting all SDLC stages individually
  - Using the new "Full SDLC" quick selection option
  - Verifying correct mapping to adw_sdlc_iso
  - Testing partial SDLC stage selection (should not map to sdlc_iso)

### Task 3: Enhance ADW Creation Service
- Update the `generateWorkflowName` method in `src/services/adwCreationService.js`
- Add logic to detect when stages include all of: plan, implement, test, review, document
- When all SDLC stages are detected, return 'adw_sdlc_iso' instead of generating a dynamic name
- Ensure the mapping respects the stage name translations (implement -> build)
- Add unit tests for the new mapping logic

### Task 4: Add UI Enhancement for SDLC Selection
- Modify `src/components/forms/TaskInput.jsx` to add a "Full SDLC" quick selection option
- Add a button or checkbox that when clicked, automatically selects all five SDLC stages
- Position this option prominently in the Queue Stages section
- Add visual indicator when Full SDLC is active (all five stages selected)
- Ensure the UI updates correctly when users manually select/deselect stages

### Task 5: Update Constants and Configuration
- Review `src/constants/workItems.js` to ensure SDLC stages are properly defined
- Add a new constant for SDLC_STAGES if needed for easy reference
- Document the special behavior for SDLC stage combination

### Task 6: Add Validation and Edge Cases
- Ensure that if user selects all SDLC stages plus additional stages (like 'pr'), it still maps to sdlc_iso
- Handle cases where stages are selected in different orders
- Add proper error handling if adw_sdlc_iso is not available

### Task 7: Testing and Validation
- Run the newly created E2E test to validate the SDLC mapping functionality
- Test the UI enhancement for usability and correct behavior
- Verify that existing functionality is not broken
- Test edge cases like selecting/deselecting stages after using Full SDLC option

### Task 8: Documentation and Finalization
- Update any relevant documentation about the SDLC workflow
- Add inline comments explaining the special SDLC mapping behavior
- Run all validation commands to ensure zero regressions

## Testing Strategy
### Unit Tests
- Test generateWorkflowName returns 'adw_sdlc_iso' when all SDLC stages are present
- Test generateWorkflowName returns dynamic name when only partial SDLC stages are selected
- Test UI component correctly toggles all SDLC stages with the quick selection option
- Test stage order independence in SDLC detection

### Edge Cases
- User selects all SDLC stages plus additional stages (should still map to sdlc_iso)
- User selects SDLC stages in random order
- User uses Full SDLC option then manually deselects one stage (should not map to sdlc_iso)
- User has tasks with legacy workflow names that should not be affected
- System handles unavailability of adw_sdlc_iso gracefully

## Acceptance Criteria
- When a user selects all five SDLC stages (plan, implement, test, review, document), the task is automatically mapped to use adw_sdlc_iso workflow
- A "Full SDLC" quick selection option is visible in the Queue Stages section of the task creation form
- Clicking "Full SDLC" automatically selects all five SDLC stages
- The mapping works regardless of the order in which stages are selected
- Partial SDLC stage selection continues to use dynamic workflow generation
- Existing tasks and workflows are not affected by the change
- E2E tests pass successfully demonstrating the feature works end-to-end
- All validation commands execute without errors

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_sdlc_queue_mapping.md` test file to validate SDLC mapping functionality works
- `cd src && npm test -- adwCreationService.test.js` - Run unit tests for ADW creation service
- `cd src && npm test -- TaskInput.test.jsx` - Run unit tests for TaskInput component
- `cd app/server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend tests to validate the feature works with zero regressions
- `cd app/client && bun run build` - Run frontend build to validate the feature works with zero regressions

## Notes
- The existing adw_sdlc_iso.py script orchestrates the complete SDLC pipeline with isolation, running plan, build, test, review, and document phases sequentially
- The stage name mapping is important: UI shows "implement" but ADW uses "build" - this translation must be handled correctly
- This feature improves discoverability of the comprehensive SDLC automation already available in the system
- Future enhancement could include templates for common stage combinations beyond just full SDLC
- Consider adding telemetry to track how often users select full SDLC vs custom stage combinations