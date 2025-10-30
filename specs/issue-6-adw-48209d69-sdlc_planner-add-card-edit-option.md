# Chore: Add Card Edit Option

## Metadata
issue_number: `6`
adw_id: `48209d69`
issue_json: `{"number":6,"title":"give the option to edit the card even after u crea...","body":"give the option to edit the card even after u created it. Right now I will not be able to edit the card.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5174/4c1454fa-5dc0-4f68-b7a9-150d82113af2)\n\n"}`

## Chore Description
Currently, users can create cards (tasks) in the Agentic Kanban application, but once created, the cards become read-only. Users cannot edit the task properties like title, description, work item type, or queued stages after creation. This limitation requires users to delete and recreate cards if they need to make changes, which is inefficient and results in lost progress/metadata.

The chore is to add card editing functionality that allows users to modify existing cards after creation, providing an "Edit" option in the card's menu alongside the existing "Move to next stage" and "Delete" options.

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/KanbanCard.jsx` - The main card component that displays task information and contains the dropdown menu. This needs to be updated to include an "Edit" option in the menu and handle the edit mode state.

- `src/components/forms/TaskInput.jsx` - The existing task creation form that can be used as a template for creating the edit form. Contains all the necessary form components, validation logic, and submission handling.

- `src/stores/kanbanStore.js` - Contains the central state management including the `updateTask` function (line 393-401) that will be used to save edited task data. No changes needed here as the functionality already exists.

- `src/constants/workItems.js` - Contains work item types and stage definitions that are used in both task creation and editing forms.

### New Files
- `src/components/forms/TaskEditModal.jsx` - A new modal component for editing existing tasks, based on the TaskInput component but adapted for editing instead of creating.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create TaskEditModal Component
- Create a new `TaskEditModal.jsx` component in `src/components/forms/`
- Base it on the existing `TaskInput.jsx` component but modify it for editing existing tasks
- Initialize form fields with current task data instead of empty values
- Change the modal title to "Edit Task" instead of "Create New Task"
- Update the submit button text to "Save Changes" instead of "Create Task"
- Use the `updateTask` function from the store instead of `createTask`
- Handle form submission to update existing task data
- Ensure validation works correctly for editing scenarios

### Step 2: Add Edit State Management to KanbanCard
- Add state to track if the card is in edit mode
- Add a new `showEditModal` state variable using `useState`
- Import the new `TaskEditModal` component
- Add handlers to open and close the edit modal

### Step 3: Add Edit Option to Card Menu
- Modify the dropdown menu in KanbanCard to include an "Edit" option
- Add the edit menu item between "Move to next stage" and "Delete" options
- Add appropriate icon (e.g., Edit or Pencil icon from lucide-react)
- Ensure clicking "Edit" opens the edit modal and closes the dropdown menu
- Handle click events to prevent event propagation

### Step 4: Integrate TaskEditModal into KanbanCard
- Render the `TaskEditModal` component conditionally when `showEditModal` is true
- Pass the current task data as props to the edit modal
- Pass callback functions to handle modal close and task updates
- Ensure the modal appears above other UI elements with appropriate z-index

### Step 5: Handle Task Updates and State Refresh
- Ensure that after editing, the card UI refreshes with updated information
- Verify that all task properties (title, description, work item type, queued stages, images) can be edited
- Test that task metadata like creation date and ID remain unchanged
- Ensure that task validation works correctly during editing

### Step 6: Test Edit Functionality Thoroughly
- Test editing each task property individually
- Test editing multiple properties at once
- Verify that canceling edit doesn't change task data
- Test validation errors during editing
- Verify that the edit modal works correctly with image attachments and annotations
- Test editing tasks in different stages and with different work item types

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run lint` - Run linting to ensure code follows project standards
- `npm run build` - Build the project to ensure no compilation errors
- `npm run test` - Run tests to validate no regressions in existing functionality

## Notes
- The TaskEditModal should reuse as much logic as possible from TaskInput to maintain consistency
- Preserve all existing task metadata (ID, creation date, logs, etc.) during editing
- Ensure the edit functionality works with all task properties including images and annotations
- Consider accessibility by ensuring the edit modal can be navigated with keyboard
- The edit modal should have the same image upload and annotation capabilities as the create modal
- Make sure the "Edit" option is clearly visible and intuitive in the card menu