# Chore: Add Plan Viewer Modal to Issue Cards

## Metadata
issue_number: `15`
adw_id: `927b2bf4`
issue_json: `{"number":15,"title":"If u notice","body":"If u notice. every card i.e every issue has almost a plan which is created. I should be able to see the plan within the card. Just give a plan cta within teh cta somewhere in the top half. When i click it lets use our markdown viewer to see teh plan. it can open in a model to see teh plan."}`

## Chore Description

Every issue card in the Agentic Kanban application has a corresponding plan file stored in the `specs/` directory. Currently, there is no way to view these plans directly from the card UI. This chore adds a "View Plan" button to each issue card that opens a modal displaying the plan markdown in a formatted, readable view.

The chore involves:
1. Adding a "View Plan" button/CTA to the KanbanCard component in the top half of the card
2. Creating a new PlanViewerModal component that displays plan markdown using the existing `@uiw/react-markdown-preview` library
3. Implementing logic to locate and fetch the plan file for a given task based on its ID and ADW ID
4. Integrating the modal with the card's click handlers and state management
5. Ensuring the modal follows existing design patterns used in SettingsModal and TaskEditModal

## Relevant Files

**Frontend Files to Modify:**
- `src/components/kanban/KanbanCard.jsx` - Lines 1-673: Main card component where the "View Plan" button will be added and modal state managed
- `src/stores/kanbanStore.js` - Zustand store that may need methods to fetch/load plan content

**Frontend Files to Reference:**
- `src/components/forms/SettingsModal.jsx` - Lines 1-265: Modal template pattern to follow (overlay, header, content, footer structure)
- `src/components/forms/TaskEditModal.jsx` - Lines 1-619: Complex modal pattern with forms and tabs
- `src/components/kanban/WorkflowLogViewer.jsx` - Reusable viewer pattern with collapsible sections
- `src/components/kanban/StageProgressionViewer.jsx` - Progress display pattern

**Data Source:**
- `specs/` directory - Contains all plan files with naming pattern: `issue-{issue-number}-adw-{adw-id}-sdlc_planner-*.md`
- Plan files are markdown documents with structured sections (Metadata, Description, Relevant Files, Step by Step Tasks, Validation Commands)

**Dependencies:**
- `@uiw/react-markdown-preview` (v4.0.8) - Already installed, provides markdown rendering component
- `lucide-react` - For icons (FileText, Eye, etc.)
- Tailwind CSS - For styling

**Documentation:**
- `adws/README.md` - Contains ADW system architecture explaining how plans are created and stored
- `.claude/commands/conditional_docs.md` - No additional docs required for this chore

### New Files
- `src/components/forms/PlanViewerModal.jsx` - New modal component to display plan markdown content
- `src/services/planService.js` - Service to fetch plan file content from the specs directory

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Plan Service Module
- Create `src/services/planService.js` to handle plan file operations
- Implement `getPlanForTask(taskId, adwId)` function that:
  - Constructs the plan filename pattern based on task ID and ADW ID
  - Searches for matching plan files in the `specs/` directory
  - Returns the plan file path if found, null otherwise
- Implement `fetchPlanContent(planPath)` function that:
  - Fetches the markdown content from the plan file
  - Handles file not found errors gracefully
  - Returns the markdown content as a string
- Add error handling for cases where plan files don't exist or can't be read

### Step 2: Create PlanViewerModal Component
- Create `src/components/forms/PlanViewerModal.jsx` following the SettingsModal pattern
- Implement modal structure with:
  - Fixed overlay (`modal-overlay fixed inset-0 bg-black bg-opacity-50`)
  - Centered content container with scroll support (`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`)
  - Header with title "Implementation Plan" and close button (X icon)
  - Content area using `@uiw/react-markdown-preview` to render the markdown
  - ESC key support to close the modal
  - Loading state while fetching plan content
  - Empty state for when no plan is found
  - Error state for when plan fetch fails
- Add proper styling using Tailwind CSS matching the existing modal patterns
- Use the `FileText` or `Eye` icon from lucide-react for the modal header

### Step 3: Add Plan Viewer Button to KanbanCard
- In `src/components/kanban/KanbanCard.jsx`, add state for plan modal visibility:
  - `const [showPlanModal, setShowPlanModal] = useState(false);`
  - `const [planContent, setPlanContent] = useState(null);`
  - `const [planLoading, setPlanLoading] = useState(false);`
  - `const [planError, setPlanError] = useState(null);`
- Add "View Plan" button in the expanded details section (after line 418, before Progression Controls)
- Position the button prominently in the top half of the expanded card details
- Button should:
  - Use FileText icon from lucide-react
  - Have text "View Plan" or "Show Plan"
  - Use existing button styles (`bg-purple-600 text-white rounded px-2 py-1 hover:bg-purple-700`)
  - Stop event propagation on click to prevent card selection
- Implement click handler that:
  - Fetches plan content using the planService
  - Shows loading state
  - Opens the modal when content is loaded
  - Handles errors gracefully

### Step 4: Integrate PlanViewerModal with KanbanCard
- Import PlanViewerModal component in KanbanCard.jsx
- Render PlanViewerModal component at the bottom of the card JSX (after the expanded details section)
- Pass required props:
  - `isOpen={showPlanModal}`
  - `onClose={() => setShowPlanModal(false)}`
  - `planContent={planContent}`
  - `loading={planLoading}`
  - `error={planError}`
  - `taskId={task.id}`
  - `adwId={task.metadata?.adw_id || workflowMetadata?.adw_id}`
- Ensure modal properly closes and clears state when dismissed

### Step 5: Add Optional Store Methods (if needed)
- If plan fetching requires backend API or store integration, add methods to `src/stores/kanbanStore.js`:
  - `getPlanForTask(taskId, adwId)` - Retrieves plan file path
  - `fetchPlanContent(planPath)` - Fetches plan content
- Update KanbanCard to use store methods instead of direct service calls if appropriate

### Step 6: Test Plan Viewer Functionality
- Verify "View Plan" button appears in expanded card details
- Test clicking the button opens the modal with markdown rendered correctly
- Verify markdown features render properly:
  - Headers and sections
  - Code blocks with syntax highlighting
  - Lists and bullet points
  - Links and references
- Test closing the modal via close button and ESC key
- Test with cards that have no plan file (should show empty state)
- Test error handling when plan file is malformed or missing
- Verify modal styling matches other modals in the application

### Step 7: Run Validation Commands
- Run linting to ensure no errors
- Run build to verify no compilation errors
- Test the complete workflow manually with multiple cards
- Execute all validation commands listed below

## Validation Commands

Execute every command to validate the chore is complete with zero regressions.

- `npm run lint` - Verify no linting errors in the codebase
- `npm run typecheck` - Verify TypeScript types are correct (if applicable)
- `npm run build` - Build the application to ensure no compilation errors
- `npm run dev` - Start development server and manually verify:
  - "View Plan" button appears on expanded cards
  - Clicking button opens modal with plan markdown
  - Modal displays plan content correctly formatted
  - Modal can be closed via X button and ESC key
  - Empty/error states work correctly

## Notes

- The plan files follow a consistent naming pattern: `issue-{issue_number}-adw-{adw_id}-sdlc_planner-{description}.md`
- Plan files may not exist for all tasks, so the UI should gracefully handle missing plans
- The `@uiw/react-markdown-preview` library is already installed and supports:
  - GitHub Flavored Markdown
  - Syntax highlighting for code blocks
  - Table rendering
  - Custom styling with Tailwind CSS classes
- Consider adding a "Copy Plan" button in the modal header for user convenience
- The modal should use the same z-index and overlay patterns as other modals to ensure proper layering
- Plan content is static (read-only), so no edit functionality is needed
- Since plans are stored as static markdown files in `specs/`, fetching them will require either:
  - Backend API endpoint to serve file content
  - Frontend logic to construct URLs and fetch via HTTP
  - Or dynamic import/bundling if Vite supports it
- For MVP, recommend creating a simple backend API endpoint or using a public directory approach
