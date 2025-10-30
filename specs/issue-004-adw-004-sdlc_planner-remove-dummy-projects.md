# Chore: Remove Dummy Projects and Add Logo Navigation

## Metadata
issue_number: `004`
adw_id: `004`
issue_json: `{"title": "Remove dummy projects and add logo navigation", "body": "Dont have sample projects.. just remove the dummy project files. I want only real projects to be present in the dashboard. and when i click on the branding logo, it should be able to go back to all projects so that I will be able to change to new ones."}`

## Chore Description
Remove the hardcoded dummy/simulated projects from the dashboard so only real projects are displayed. Additionally, make the branding logo clickable to navigate back to the project selection screen, allowing users to switch between projects easily.

## Relevant Files
Use these files to resolve the chore:

- `src/components/ProjectSelector.jsx` - Contains the hardcoded simulatedProjects array that needs to be removed. Also contains the project initialization logic that automatically adds dummy projects.
- `src/App.jsx` - Contains the branding logo that needs to be made clickable to navigate back to project selection.
- `src/stores/kanbanStore.js` - Contains the project management state and actions. Needs a new action to deselect/clear the current project.

### New Files
No new files need to be created for this chore.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Remove Dummy Projects from ProjectSelector
- Remove the `simulatedProjects` array (lines 26-51) from `src/components/ProjectSelector.jsx`
- Remove the `useEffect` hook that automatically adds simulated projects (lines 53-60)
- This will ensure only real projects added by users are displayed in the dashboard

### Add Project Deselection Function to Store
- Add a `deselectProject` action to the kanban store in `src/stores/kanbanStore.js`
- This function should set `selectedProject` to `null`, returning users to the project selection screen
- Place this action alongside other project actions (around line 74)

### Make Branding Logo Clickable
- Modify the branding logo section in `src/App.jsx` (lines 52-58) to be clickable
- Add an `onClick` handler that calls the new `deselectProject` action
- Only make it clickable when a project is selected (when `selectedProject` is not null)
- Add appropriate styling to indicate the logo is clickable when a project is selected

### Test Navigation Flow
- Verify that the project selector no longer shows dummy projects
- Test that clicking the logo when a project is selected returns to project selection
- Ensure the logo is not clickable when no project is selected
- Confirm that real projects can still be added and selected normally

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run lint` - Run linting to ensure code quality standards are met
- `npm run build` - Build the application to ensure no build errors
- `npm run test` - Run tests to validate the chore is complete with zero regressions

## Notes
- The removal of dummy projects will result in an empty project list initially until users add real projects
- The clickable logo provides better UX for project switching without needing a dedicated "back" button
- Consider adding visual feedback (cursor pointer, hover effects) to indicate the logo is clickable when appropriate