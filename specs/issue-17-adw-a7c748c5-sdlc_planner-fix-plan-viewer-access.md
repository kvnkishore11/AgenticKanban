# Bug: Unable to View Plan File

## Metadata
issue_number: `17`
adw_id: `a7c748c5`
issue_json: `{"number":17,"title":"we are not able to view the plan","body":"we are not able to view the plan. For soem reason it is not able to identify the plan. basically agents/{adw_id}. adw_state.json should have the plan file. see if you can access it. may be we can show that directly\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/7d8789f9-c14c-45bf-a5d2-cbaeaf75bd5f)\n\n"}`

## Bug Description
Users are unable to view the plan file for ADW workflows. The application can identify the ADW ID and display basic metadata (ADW ID, status, logs path) but cannot access or display the actual plan file. The plan file exists at `agents/{adw_id}/sdlc_planner/plan.md` but there is no mechanism to retrieve or display it in the UI.

## Problem Statement
The application lacks the infrastructure to access and display plan files stored at `agents/{adw_id}/sdlc_planner/plan.md`. While the `adw_state.json` file contains a `plan_file` field, there is:
1. No backend API endpoint to fetch plan file content
2. No frontend component to display plan markdown content
3. No UI affordance (button/link) in KanbanCard to view plans
4. The `plan_file` field from `adw_state.json` is not being captured in workflow metadata

## Solution Statement
Create a complete plan viewing system by:
1. Adding a backend API endpoint to fetch plan file content by ADW ID
2. Creating a reusable PlanViewer component to display markdown content
3. Integrating plan file path into workflow metadata handling
4. Adding a "View Plan" button to KanbanCard that opens the plan in a modal
5. Ensuring the plan_file field is properly tracked throughout the workflow lifecycle

## Steps to Reproduce
1. Navigate to the Kanban board at http://localhost:5173
2. Find a task/card that has an ADW ID assigned (visible in card metadata)
3. Expand the card details by clicking on it
4. Look for a way to view the associated plan file
5. Observe that there is no "View Plan" button or mechanism to display the plan
6. Check the ADW metadata display - it shows ADW ID, status, and logs path but no plan file link

## Root Cause Analysis
The root cause is a missing feature rather than a broken feature. The application was built with workflow execution tracking (logs, status, progress) but plan file viewing was never implemented:

1. **Backend Gap**: The `/api/adws/{adw_id}` endpoint returns `adw_state.json` content but doesn't provide a way to fetch the actual plan file at `agents/{adw_id}/sdlc_planner/plan.md`

2. **Frontend Gap**: No PlanViewer component exists to render markdown plan content (similar to how WorkflowLogViewer displays logs)

3. **Metadata Gap**: The WebSocket trigger response handler (src/stores/kanbanStore.js:1281-1304) captures `logs_path` but doesn't capture `plan_file` from the response

4. **UI Gap**: KanbanCard (src/components/kanban/KanbanCard.jsx:589-615) displays ADW metadata but has no button or link to view plans

## Relevant Files
Use these files to fix the bug:

- **app/server/api/adws.py** - Contains existing ADW API endpoints. Need to add a new endpoint `GET /adws/{adw_id}/plan` to fetch plan file content from `agents/{adw_id}/sdlc_planner/plan.md`

- **src/stores/kanbanStore.js** - Zustand store managing task and workflow state. Need to:
  - Update `handleTriggerResponse` (line 1281) to capture `plan_file` field
  - Update `updateWorkflowMetadata` to include `plan_file` in metadata storage
  - Add `getWorkflowPlanForTask` getter method

- **src/components/kanban/KanbanCard.jsx** - Main task card component displaying ADW metadata. Need to:
  - Add "View Plan" button in ADW metadata section (around line 615)
  - Add state for plan modal visibility
  - Integrate PlanViewer component in a modal

- **src/services/api/adwService.js** - Frontend API service for ADW operations. Need to add `fetchPlanFile(adwId)` method to call the new backend endpoint

- **adws/adw_modules/state.py** - Contains the `plan_file` field definition in ADWStateData (line 37, 85). Already properly structured, no changes needed

- **.claude/commands/conditional_docs.md** - Documentation guide to check if additional docs are needed

### New Files

- **src/components/kanban/PlanViewer.jsx** - New reusable component to display plan markdown content with:
  - Markdown rendering (use existing markdown library if available, or install react-markdown)
  - Modal/dialog wrapper
  - Copy to clipboard functionality
  - Loading and error states
  - Close button

- **.claude/commands/e2e/test_plan_viewer.md** - E2E test file to validate plan viewing functionality

## Step by Step Tasks

### Task 1: Add Backend API Endpoint for Plan File Retrieval
- Read `app/server/api/adws.py` to understand existing endpoint structure
- Add new endpoint `GET /adws/{adw_id}/plan` that:
  - Validates ADW ID format (8 alphanumeric characters)
  - Constructs path to plan file: `agents/{adw_id}/sdlc_planner/plan.md`
  - Returns 404 if plan file doesn't exist
  - Returns plan file content as JSON: `{"plan_content": "...", "plan_file": "path"}`
  - Handles errors gracefully with appropriate HTTP status codes
- Follow the pattern of `get_adw_details` endpoint for consistency
- Use the existing `get_agents_directory()` helper function

### Task 2: Create PlanViewer React Component
- Check if react-markdown is already installed in package.json, if not use `uv add react-markdown` (report in Notes section)
- Create `src/components/kanban/PlanViewer.jsx` component with:
  - Props: `planContent` (string), `adwId` (string), `onClose` (function), `isOpen` (boolean)
  - Markdown rendering using react-markdown or similar library
  - Modal/overlay backdrop (80% opacity gray background)
  - Card container with white background, rounded corners, shadow
  - Header with title "Plan: {adwId}", copy button, and close button (X icon)
  - Scrollable content area with max height and proper padding
  - Loading state while fetching plan
  - Error state if plan cannot be loaded
  - Empty state if plan content is empty
  - Proper z-index layering to appear above other UI elements
  - Click outside modal to close
  - Escape key to close

### Task 3: Add Frontend API Service Method
- Read `src/services/api/adwService.js` to understand API patterns
- Add `fetchPlanFile(adwId)` method that:
  - Makes GET request to `/api/adws/${adwId}/plan`
  - Returns plan content and metadata
  - Handles errors and throws descriptive error messages
  - Follows existing error handling patterns in the service

### Task 4: Update Kanban Store for Plan Metadata
- Read `src/stores/kanbanStore.js` to understand state management
- Update `handleTriggerResponse` function (around line 1281):
  - Extract `plan_file` from response alongside existing fields
  - Pass `plan_file` to `updateWorkflowMetadata` call
- Update `updateWorkflowMetadata` function (around line 1370):
  - Ensure `plan_file` field is stored in metadata object
- Add new getter method `getWorkflowPlanForTask`:
  - Returns plan_file path for a given task ID from `taskWorkflowMetadata`

### Task 5: Integrate Plan Viewer into KanbanCard
- Read `src/components/kanban/KanbanCard.jsx` to understand component structure
- Import PlanViewer component and required API service
- Add state: `const [showPlanModal, setShowPlanModal] = useState(false)`
- Add state: `const [planContent, setPlanContent] = useState(null)`
- Add state: `const [planLoading, setPlanLoading] = useState(false)`
- Add state: `const [planError, setPlanError] = useState(null)`
- Create async function `handleViewPlan` that:
  - Sets loading state to true
  - Fetches plan using ADW ID via the API service
  - Sets plan content on success
  - Sets error on failure
  - Opens plan modal
- In ADW metadata section (around line 615, after logs path display):
  - Add conditional check: only show button if `workflowMetadata?.adw_id` exists
  - Add "View Plan" button with eye icon or document icon
  - Button onClick calls `handleViewPlan`
  - Disable button while loading
- After ADW metadata section, add PlanViewer component:
  - Pass `isOpen={showPlanModal}`
  - Pass `planContent={planContent}`
  - Pass `adwId={workflowMetadata?.adw_id}`
  - Pass `onClose={() => setShowPlanModal(false)}`
  - Only render if `showPlanModal` is true

### Task 6: Create E2E Test File for Plan Viewing
- Read `.claude/commands/e2e/test_basic_query.md` to understand E2E test format
- Read `.claude/commands/test_e2e.md` to understand test execution structure
- Create `.claude/commands/e2e/test_plan_viewer.md` with:
  - User Story: As a user viewing a Kanban card with an ADW workflow, I want to view the associated plan file so I can understand the workflow steps
  - Test Steps that validate:
    1. Navigate to Kanban board
    2. Find and click on a card with ADW metadata
    3. Verify ADW metadata section is visible with ADW ID
    4. Take screenshot of expanded card with ADW metadata
    5. Verify "View Plan" button is present
    6. Click "View Plan" button
    7. Verify plan modal opens
    8. Verify plan content is displayed with markdown rendering
    9. Take screenshot of plan modal
    10. Verify close button (X) is present
    11. Click close button
    12. Verify modal closes
    13. Verify clicking outside modal also closes it
    14. Take screenshot after modal closes
  - Success Criteria: Plan modal opens, displays markdown content, and closes properly
  - Include 3 screenshot capture points

### Task 7: Run Validation Commands
- Execute all commands listed in the Validation Commands section
- Verify backend tests pass
- Verify frontend type checking passes
- Verify frontend build succeeds
- Execute the E2E test to validate plan viewing functionality works end-to-end

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/a7c748c5 && npm run type-check` - Run frontend type checking (if available)
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/a7c748c5 && npm run build` - Run frontend build to validate the bug is fixed with zero regressions
- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_plan_viewer.md` test file to validate this functionality works

## Notes
- This is a new feature rather than fixing broken functionality, so the implementation should be surgical and focused only on plan viewing
- The plan file path follows the pattern: `agents/{adw_id}/sdlc_planner/plan.md`
- Ensure the PlanViewer component is reusable and can be used in other parts of the application if needed
- Consider edge cases: ADW with no plan file, malformed plan file, very large plan files
- Use existing patterns from WorkflowLogViewer component as a reference for modal and display patterns
- If react-markdown is not installed, add it using: `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/a7c748c5 && npm install react-markdown`
- The backend endpoint should handle both worktree and main project directory structures (similar to existing `get_agents_directory()` logic)
