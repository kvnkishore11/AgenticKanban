# Patch: Remove Browse File Picker to Prevent File Upload Dialog

## Metadata
adw_id: `96b29c89`
review_change_request: `No, I don't see this issue to be fixed because as soon as I selected browse, it opened a pop-up telling that there are 45,000 files and it is trying to upload that into project. This is not what we are expecting from this right? I don't know why it is still showing that.`

## Issue Summary
**Original Spec:** issue-1-adw-96b29c89-e2e-browse-path-selection.md
**Issue:** When clicking the "Browse" button, the browser's file input with `webkitdirectory` attribute attempts to load ALL files in the selected directory (45,000+ files), causing a "file upload" warning/progress dialog. This is unacceptable UX for a web application.
**Solution:** Remove the file input-based browse functionality entirely. Replace it with a clear, simple manual path entry form. Since this is a web application (not Electron), there's no native directory picker API available. Manual path entry is the appropriate solution for web-based project selection.

## Files to Modify
Use these files to implement the patch:

1. `src/components/ProjectSelector.jsx` - Remove file input, browse button trigger, and file handling logic
2. `src/components/__tests__/ProjectSelector.test.jsx` - Remove/update browse-related test cases
3. `src/components/__tests__/ProjectSelector.browse-fix.test.jsx` - Remove this entire test file (no longer applicable)

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove file input and browse logic from ProjectSelector
- Remove the `fileInputRef` useRef hook
- Remove the `handleDirectorySelect` function (lines 47-66)
- Remove the `handleBrowseClick` function (lines 68-76)
- Remove the hidden file input element (lines 259-266)
- Update the "Browse" button to simply show the form without triggering file picker
- Simplify to: clicking "Add New Project" or a simple button shows the manual entry form

### Step 2: Improve manual entry UX
- Change the "Browse" button to "Add New Project" if not already done
- When clicked, simply show the form with empty fields (no auto-population)
- Update placeholder text to guide users to enter their full project path manually
- Add helper text explaining what path format is expected (e.g., `/Users/username/projects/myproject`)
- Ensure the form is clear and user-friendly for manual entry

### Step 3: Update tests to remove browse-specific logic
- In `src/components/__tests__/ProjectSelector.test.jsx`, remove or update any tests that simulate directory selection via file input
- Remove tests that check `handleDirectorySelect` behavior
- Remove tests that verify auto-population from file input
- Keep tests for manual entry functionality
- Ensure tests verify that clicking "Add New Project" shows the form

### Step 4: Delete obsolete test file
- Delete `src/components/__tests__/ProjectSelector.browse-fix.test.jsx` entirely
- This file was created to test the browse functionality which is now being removed

### Step 5: Update E2E test documentation
- Update `src/test/e2e/issue-1-adw-96b29c89-e2e-browse-path-selection.md`
- Remove test cases 1, 2, 8 (browse-specific scenarios)
- Update remaining test cases to reflect manual entry workflow
- Add note explaining why browse was removed (browser security limitations for web apps)
- Rename file to reflect new scope: `issue-1-adw-96b29c89-e2e-recent-projects.md`

### Step 6: Create/Update Tests
- Update unit tests in `src/components/__tests__/ProjectSelector.test.jsx` to verify:
  - Clicking "Add New Project" shows the manual entry form
  - Manual path and name entry works correctly
  - Form validation works for empty fields
  - Adding a project manually updates the project list
- Ensure all existing tests pass after browse functionality removal

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Run unit tests**: `npm test -- ProjectSelector.test.jsx`
   - All tests should pass
   - No browse-related test failures

2. **Run all frontend tests**: `npm test`
   - All tests should pass
   - Verify no regressions in other components

3. **Manual E2E validation**:
   - Start frontend: `./scripts/start_fe.sh`
   - Navigate to project selector
   - Verify no "Browse" button that triggers file picker
   - Verify "Add New Project" button shows manual entry form
   - Manually enter a project path and name
   - Verify project is added successfully
   - Verify recent projects functionality still works
   - Verify no file upload dialogs appear anywhere

4. **Verify removed files**:
   - Confirm `ProjectSelector.browse-fix.test.jsx` is deleted
   - No references to browse functionality remain in code

5. **Console check**:
   - No errors in browser console
   - No warnings about file inputs or directory selection

## Patch Scope
**Lines of code to change:** ~150 (mostly deletions)
**Risk level:** low
**Testing required:** Unit tests for manual entry flow, E2E validation of project addition workflow, verify recent projects feature unaffected
