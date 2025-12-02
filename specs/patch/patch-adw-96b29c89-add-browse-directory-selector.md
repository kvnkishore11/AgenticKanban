# Patch: Add Browse Button with Directory Selector

## Metadata
adw_id: `96b29c89`
review_change_request: `So I think now as soon as I select project add project, it should open a file viewer. So visually I can select the file and I can instead of upload button, right? So it can just select. So then the entire path will be selected or will be pasted within that path input field. This is what I was looking for. So of course we can directly paste the path, but it's not ideal to always paste the path, right? So you can give the flexibility for the users to select the project and click on select option that will place the path of the project over there.`

## Issue Summary
**Original Spec:** specs/patch/patch-adw-96b29c89-remove-browse-file-picker.md
**Issue:** The Browse functionality was completely removed in the previous patch. Users now have to manually type the full project path, which is not ideal UX. Users want a visual directory picker that opens a file browser, allows selecting a project directory, and populates the path input field with the selected directory path - without triggering file uploads.
**Solution:** Re-introduce a Browse button with optimized directory selection logic that:
1. Opens the native file/directory picker dialog
2. Allows users to visually navigate and select a project directory
3. Extracts only the directory path from the selection (without loading file contents)
4. Auto-populates both the project name and path input fields
5. Provides immediate visual feedback without lag or file upload dialogs

## Files to Modify
Use these files to implement the patch:

1. `src/components/ProjectSelector.jsx` - Add Browse button and optimized directory selection handler
2. `src/components/__tests__/ProjectSelector.test.jsx` - Add tests for browse functionality
3. `src/test/e2e/issue-1-adw-96b29c89-e2e-recent-projects.md` - Update E2E tests to include browse functionality

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add optimized directory selection to ProjectSelector

- Add a `fileInputRef` using `useRef()` hook to reference the hidden file input
- Create a `handleBrowseClick` function that triggers the file input click
- Create an optimized `handleDirectorySelect` function that:
  - Takes the first file from the FileList (to get the directory path)
  - Extracts the directory path from `file.webkitRelativePath` by removing the filename
  - Extracts the root directory name as the project name
  - Sets both `newProjectName` and `newProjectPath` state
  - Does NOT read file contents or enumerate all files (avoiding the 45,000 files issue)
  - Executes synchronously for instant feedback
- Add a hidden file input with `webkitdirectory` attribute after the path input field
- Add a "Browse" button next to the path input field that triggers `handleBrowseClick`

### Step 2: Optimize the directory selection to prevent file upload lag

- In `handleDirectorySelect`, access only the minimal metadata needed:
  - Use only `files[0].webkitRelativePath` to extract the directory structure
  - Do NOT iterate through all files in the FileList
  - Do NOT read file contents using FileReader
  - Do NOT access file.size or other properties that might trigger file loading
- Extract the directory path by:
  - Getting the first file's `webkitRelativePath` (e.g., "MyProject/src/index.js")
  - Splitting by "/" to get path segments
  - Taking the first segment as the project name (e.g., "MyProject")
  - Note: Due to browser security, we can only get the folder name, not the full absolute path
- Update the UI helper text to clarify that:
  - The Browse button extracts the folder name only (browser security limitation)
  - Users can manually edit the path field to add the full absolute path if needed
  - The Browse functionality is primarily for convenience in getting the project name

### Step 3: Improve UX with visual feedback

- Show a visual loading state or brief confirmation when directory is selected
- Clear any previous error messages when browse is triggered
- Ensure the form fields are visually highlighted after auto-population
- Add helper text near the Browse button explaining its purpose
- Update the placeholder text to reflect that Browse can help, but manual entry may be needed for full paths

### Step 4: Update tests for browse functionality

- In `src/components/__tests__/ProjectSelector.test.jsx`, add test cases:
  - Test that clicking Browse button triggers file input click
  - Test that `handleDirectorySelect` correctly extracts project name from files
  - Test that both name and path fields are populated after directory selection
  - Mock the file input to simulate directory selection with a FileList containing mock files with `webkitRelativePath`
  - Test that only the first file is accessed (performance optimization)
  - Test edge cases: empty FileList, files with special characters in paths
- Ensure existing tests for manual entry still pass

### Step 5: Update E2E test documentation

- Update `src/test/e2e/issue-1-adw-96b29c89-e2e-recent-projects.md`:
  - Add test cases for browse functionality:
    - Test Case: Browse Directory Selection
      - Click "Add New Project" button
      - Click "Browse" button
      - Select a project directory from the file picker
      - Verify project name is extracted from directory name
      - Verify path field shows the folder name
      - User can manually edit the path to add full absolute path if needed
      - Click "Add Project" and verify success
  - Add note about browser security limitations (can only get folder name, not full path)
  - Add note that this is a convenience feature; manual path editing may be required

### Step 6: Create/Update Tests

- Update unit tests in `src/components/__tests__/ProjectSelector.test.jsx` to verify:
  - Browse button exists and triggers file input
  - Directory selection auto-populates name and path fields
  - Only minimal file metadata is accessed (no file content reading)
  - Manual editing of auto-populated fields works correctly
- Create integration test in `src/test/integration/browse-directory-selection.integration.test.js`:
  - Test complete flow: click Browse → select directory → auto-populate → submit
  - Test that recent projects work after adding via Browse
  - Test Browse with special characters in directory names

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
   - Start frontend: `npm run dev`
   - Navigate to project selector
   - Click "Add New Project" button
   - Click "Browse" button next to the path input
   - Select a project directory from the file picker dialog
   - Verify NO file upload progress dialog appears
   - Verify NO lag occurs (even with large directories)
   - Verify project name field is auto-populated with folder name
   - Verify path field shows the folder name
   - Manually edit the path field to add the full absolute path
   - Click "Add Project" and verify success
   - Verify the project appears in recent projects
   - Test with a large directory (10,000+ files) to ensure no lag

6. **Performance validation**:
   - Use browser DevTools Performance tab
   - Profile the directory selection with a large directory
   - Verify `handleDirectorySelect` executes in < 100ms
   - Verify no file reading operations occur

## Patch Scope
**Lines of code to change:** ~80 (additions + modifications)
**Risk level:** medium
**Testing required:** Unit tests for browse functionality, integration tests for complete flow, manual E2E validation with large directories to verify no lag, performance profiling to ensure optimization works
