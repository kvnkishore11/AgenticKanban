# Patch: Fix Browse Button to Show "Select" Instead of "Upload"

## Metadata
adw_id: `96b29c89`
review_change_request: `i still see the issue.. So I am trying to click on browse right as soon as I click on browse it opens the file picker and it is showing the option of upload ideally it should be select so when again when I am clicking on upload it is immediately popping like it's trying to upload the entire project so that's not what I was asking for so what I am clearly looking for is as soon as I select on that upload right now it should be changed to select so it should just update the path and if possible the name of the project is the route where we are at and it should take me in so that is what I am looking for and sorry you are not getting it right after a lot of requests`

## Issue Summary
**Original Spec:** specs/patch/patch-adw-96b29c89-add-browse-directory-selector.md
**Issue:** The Browse button currently uses `webkitdirectory` attribute which triggers a file picker dialog showing "Upload" button. When users click "Upload", it attempts to upload the entire project, which is not the desired behavior. Users want a "Select" button that simply updates the path field with the full absolute path of the selected directory, and auto-populates the project name from the root directory name.
**Solution:** Replace the `webkitdirectory` approach with a backend API endpoint that uses Node.js dialog to show a native directory picker with "Select" button. This will extract the full absolute path and populate both the project name and path fields without triggering any file upload behavior.

## Files to Modify
Use these files to implement the patch:

1. `app/server/routes/filesystem.js` - Add new `/api/filesystem/select-directory` endpoint using `dialog.showOpenDialogSync`
2. `src/components/ProjectSelector.jsx` - Replace file input with API call to backend directory picker
3. `src/services/api.js` - Add `selectDirectory()` method to call the new backend endpoint
4. `src/components/__tests__/ProjectSelector.test.jsx` - Update tests to mock API call instead of file input
5. `src/test/e2e/issue-1-adw-96b29c89-e2e-recent-projects.md` - Update E2E test to reflect new native dialog behavior

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create backend endpoint for native directory selection

- In `app/server/routes/filesystem.js`, add a new POST endpoint `/api/filesystem/select-directory`
- Import `dialog` from Electron (if using Electron) or use a Node.js native dialog library
- The endpoint should:
  - Call `dialog.showOpenDialogSync({ properties: ['openDirectory'] })` to show native directory picker
  - Return the selected directory path as JSON: `{ path: '/absolute/path/to/directory', name: 'directory-name' }`
  - Extract the directory name from the full path (e.g., `/Users/username/projects/MyProject` → `MyProject`)
  - Handle cancellation case (return empty response if user cancels)
  - Handle errors gracefully with appropriate error messages

### Step 2: Update ProjectSelector to use backend API

- In `src/components/ProjectSelector.jsx`:
  - Remove the `fileInputRef` and hidden file input element
  - Remove the `handleDirectorySelect` function
  - Update `handleBrowseClick` to:
    - Call the new API endpoint via `api.selectDirectory()`
    - Show a loading state while waiting for user selection
    - On success, populate both `newProjectName` and `newProjectPath` with the returned values
    - On error or cancellation, show appropriate user feedback
    - Clear any previous errors
- Remove the `webkitdirectory`, `directory`, and `multiple` attributes from the file input (since it's removed)
- Update the helper text to reflect that Browse now opens a native dialog with "Select" button

### Step 3: Create API service method

- In `src/services/api.js`, add a new method:
  ```javascript
  async selectDirectory() {
    const response = await fetch('/api/filesystem/select-directory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }
  ```
- Handle network errors and return meaningful error messages
- Add proper error handling for timeout scenarios

### Step 4: Update ProjectSelector component implementation

- Replace the Browse button's `onClick` handler to use the new async API call:
  ```javascript
  const handleBrowseClick = async () => {
    try {
      setError(''); // Clear previous errors
      const result = await api.selectDirectory();

      if (result.path) {
        setNewProjectPath(result.path);
        setNewProjectName(result.name);
      }
      // If user cancelled, result will be empty - no action needed
    } catch (error) {
      setError('Failed to open directory picker: ' + error.message);
    }
  };
  ```
- Update the helper text to explain the new behavior:
  - "Click Browse to open a native directory picker and select your project folder"
  - Remove references to browser security limitations since we're now using a backend API

### Step 5: Update tests for new API-based browse

- In `src/components/__tests__/ProjectSelector.test.jsx`:
  - Remove tests that mock file input events
  - Add tests that mock the `api.selectDirectory()` call using `vi.mock()`
  - Test successful directory selection with path and name population
  - Test cancellation scenario (empty response)
  - Test error handling scenarios
  - Verify that both name and path fields are populated correctly
  - Ensure existing manual entry tests still pass

### Step 6: Update E2E test documentation

- In `src/test/e2e/issue-1-adw-96b29c89-e2e-recent-projects.md`:
  - Update the browse functionality test case:
    - Click "Add New Project" button
    - Click "Browse" button
    - **Native dialog opens with "Select" button** (not "Upload")
    - User navigates to a project directory and clicks "Select"
    - Verify project name field is auto-populated with directory name
    - Verify path field shows the full absolute path
    - Click "Add Project" and verify success
  - Remove notes about browser security limitations
  - Add note that this uses native OS directory picker via backend API

### Step 7: Create/Update Tests

- Create unit tests in `src/components/__tests__/ProjectSelector.test.jsx`:
  - Test that Browse button triggers API call to backend
  - Test that successful API response populates both fields correctly
  - Test that cancellation (empty response) doesn't change form state
  - Test that API errors are displayed to the user
  - Test that manual editing still works after using Browse
- Create integration test in `src/test/integration/browse-directory-api.integration.test.js`:
  - Test complete flow: click Browse → backend dialog → select directory → populate fields → submit
  - Test that recent projects work after adding via Browse
  - Test error recovery and retry scenarios
- Create E2E test in `src/test/e2e/patch-adw-96b29c89-e2e-browse-select.md`:
  - Detailed manual test steps for the new native dialog behavior
  - Verification that "Select" button appears instead of "Upload"
  - Verification that full absolute path is populated
  - Test on different OS platforms (macOS, Windows, Linux)

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Run unit tests**: `npm test -- ProjectSelector.test.jsx`
   - All browse-related tests should pass
   - Manual entry tests should still pass

2. **Run all frontend tests**: `npm test`
   - All tests should pass
   - Verify no regressions in other components

3. **Run TypeScript check**: `npm run typecheck`
   - No type errors

4. **Run build**: `npm run build`
   - Build succeeds without errors

5. **Manual E2E validation**:
   - Start backend: `npm run server` or equivalent command
   - Start frontend: `npm run dev`
   - Navigate to project selector
   - Click "Add New Project" button
   - Click "Browse" button
   - **Verify native OS dialog opens (not browser file picker)**
   - **Verify dialog shows "Select" button (not "Upload")**
   - Navigate to a project directory and click "Select"
   - Verify project name field is auto-populated with the directory name
   - Verify path field shows the **full absolute path** (e.g., `/Users/username/projects/MyProject`)
   - Click "Add Project" and verify success
   - Verify the project appears in recent projects
   - Test cancellation: Click Browse, then cancel the dialog - verify no errors occur
   - Test on different OS platforms if possible (macOS, Windows, Linux)

6. **Backend API validation**:
   - Test the `/api/filesystem/select-directory` endpoint directly using curl or Postman
   - Verify it returns correct JSON format: `{ path: '...', name: '...' }`
   - Verify it handles cancellation gracefully
   - Verify it handles errors appropriately

## Patch Scope
**Lines of code to change:** ~100 (additions + modifications across frontend and backend)
**Risk level:** medium
**Testing required:** Unit tests for API integration, integration tests for complete flow, manual E2E validation on multiple OS platforms to verify native dialog behavior with "Select" button, backend API endpoint testing
