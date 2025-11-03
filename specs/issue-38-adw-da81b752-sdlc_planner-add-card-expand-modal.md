# Chore: Add Card Expand Modal for Better Information Viewing

## Metadata
issue_number: `38`
adw_id: `da81b752`
issue_json: `{"number":38,"title":"I want to have an expand button for the card to vi...","body":"I want to have an expand button for the card to view the information. especially it is difficult to view when the width of the card is too less. lets try to rethink. may be a good model which takes like 70% of the width and 90% of the vertical height so that it can have decent real estate to work on showcasing what is happening."}`

## Chore Description
Currently, cards in the Kanban board have limited display space, making it difficult to view all information when the card width is constrained. This chore adds an expand button to each card that opens a large modal (70% width x 90% height) providing ample space to display all card information including:
- Full title and description
- Complete ADW workflow information
- Full workflow logs with better readability
- All metadata and status information
- Workflow controls and actions
- Stage progression details

The modal should provide a comprehensive view of the card without the space constraints of the narrow column layout.

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/KanbanCard.jsx` - The main card component that needs the expand button and modal integration. This file contains all card display logic, workflow status, and actions.

- `src/components/kanban/PlanViewer.jsx` - Reference for modal implementation patterns. Shows how to create a large modal with proper styling, escape key handling, and content display.

- `src/components/forms/TaskEditModal.jsx` - Reference for modal implementation with complex content including form fields, images, and structured data display. Shows proper modal overlay and content structure.

- `src/styles/kanban.css` - Contains all Kanban-specific styles including modal styling patterns (`.modal-overlay`, `.modal-content`, `.enhanced-modal`). Will need new styles for the expanded card modal.

- `src/index.css` - Contains base styles and utility classes that can be reused for the modal.

### New Files
- `src/components/kanban/CardExpandModal.jsx` - New component for the large card view modal. This will render all card information in a spacious layout optimized for readability.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create CardExpandModal Component
- Create new file `src/components/kanban/CardExpandModal.jsx`
- Implement modal structure with:
  - Modal overlay with backdrop (70% width, 90% height)
  - Header with card title, ADW ID, and close button
  - Content area divided into sections:
    - Card Information section (title, description, stage, pipeline)
    - Workflow Status section (current status, progress bar, current step)
    - ADW Metadata section (ADW ID, workflow name, status)
    - Workflow Logs section (full logs with timestamps, scrollable)
    - Actions section (workflow controls, progression controls, stage movement)
  - Footer with action buttons
- Add escape key handler to close modal
- Add click-outside handler to close modal
- Accept props: `task`, `isOpen`, `onClose`, `onEdit`
- Use existing hooks from KanbanCard: `useKanbanStore` for all state management
- Ensure all functionality from KanbanCard is accessible in expanded view

### Step 2: Add Expand Button to KanbanCard
- Open `src/components/kanban/KanbanCard.jsx`
- Import the new `CardExpandModal` component
- Import `Maximize2` or `Expand` icon from lucide-react
- Add state to manage modal open/closed: `const [showExpandModal, setShowExpandModal] = useState(false)`
- Add expand button in the card header next to the existing menu button
- Button should have icon and be styled consistently with other card buttons
- Button click should set `setShowExpandModal(true)` and stop propagation
- Add `CardExpandModal` component at the bottom of the card JSX, before closing div
- Pass required props: `task={task}`, `isOpen={showExpandModal}`, `onClose={() => setShowExpandModal(false)}`, `onEdit={onEdit}`

### Step 3: Style the CardExpandModal
- Open `src/styles/kanban.css`
- Add new CSS class `.card-expand-modal` for the modal container
- Set dimensions: width: 70vw, height: 90vh
- Add proper z-index to ensure modal appears above all other content
- Style the modal content area with:
  - Proper padding and spacing
  - Section dividers
  - Scrollable content areas
  - Responsive font sizes for better readability
- Style the workflow logs section with:
  - Monospace font for log content
  - Line numbers if beneficial
  - Syntax highlighting for log levels (INFO, ERROR, WARNING)
  - Alternating row colors for better readability
- Add responsive styles for smaller screens:
  - Mobile: 95vw width, 95vh height
  - Tablet: 85vw width, 92vh height
- Ensure consistent styling with existing modal patterns (`.modal-overlay`, `.enhanced-modal`)

### Step 4: Enhance Log Display in Expanded View
- In `CardExpandModal.jsx`, create a dedicated log display section
- Use the existing `StageLogsViewer` component but with expanded configuration:
  - Increase maxHeight to allow more logs visible: `maxHeight="500px"`
  - Enable all features: timestamps, auto-scroll, clear button
  - Add search/filter functionality for logs if time permits
- Display logs in a well-formatted, easy-to-read layout
- Add copy-to-clipboard button for log content
- Show log statistics (total logs, errors, warnings)

### Step 5: Add All Card Information to Expanded View
- Implement comprehensive card information display:
  - Full title (no truncation)
  - Full description with proper formatting and line breaks
  - Pipeline information with visual indicators
  - Created and updated timestamps
  - Stage information with color coding
  - Progress indicators
- Display all workflow metadata:
  - Workflow name and status
  - ADW ID with copy functionality
  - Current step and progress percentage
  - Logs path and plan file path
  - Completion status and badges
- Include all workflow controls from the card:
  - Trigger workflow button
  - Pause/Resume/Stop progression buttons
  - View plan button
  - Merge workflow button (if ready-to-merge stage)
  - Stage movement buttons
- Ensure all buttons are functional and properly connected to store actions

### Step 6: Test the Expand Modal
- Test opening the modal from different card states (collapsed, expanded, selected)
- Verify modal displays correctly at 70% width and 90% height
- Test escape key closes the modal
- Test click outside closes the modal
- Verify all card information is displayed correctly
- Test all workflow controls work in the modal
- Verify logs display properly with timestamps
- Test responsive behavior on different screen sizes
- Ensure no layout issues or overlapping content
- Verify modal animations are smooth
- Test with cards that have different amounts of data (minimal vs. lots of logs)

### Step 7: Run Validation Commands
Execute all validation commands to ensure the chore is complete with zero regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to ensure code quality standards are met
- `npm run build` - Build the frontend to ensure no build errors

## Notes
- The expand button should be clearly visible and accessible on all cards
- The modal should maintain the same functionality as the card but with better layout and spacing
- Consider using the same workflow status display components to avoid code duplication
- The expanded view should make it easy to read long descriptions and view complete workflow logs
- Ensure the modal doesn't block critical actions - all card actions should be available in the modal
- Follow the existing modal patterns from `PlanViewer.jsx` and `TaskEditModal.jsx` for consistency
- Use existing Kanban CSS classes and patterns for consistent styling
- The 70% x 90% dimensions provide good screen coverage while not being overwhelming
- Add proper loading states if any async operations are performed
- Consider accessibility: keyboard navigation, focus management, screen reader support
