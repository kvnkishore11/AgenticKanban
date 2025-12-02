# E2E Test: Native Directory Picker with Select Button

**Issue**: #1
**ADW ID**: 96b29c89
**Patch**: Fix Browse Button to Show "Select" Instead of "Upload"
**Date**: 2025-12-02

## Test Overview

This E2E test validates the native directory picker implementation that shows a "Select" button instead of "Upload", returning the full absolute path without browser security limitations.

## Prerequisites

- Frontend application running on `http://localhost:5173`
- Backend API server running (for `/api/select-directory` endpoint)
- Python backend with tkinter installed:
  - macOS/Windows: tkinter included by default
  - Linux: Install with `sudo apt install python3-tk` (Debian/Ubuntu)
- Test project directories available on the file system

## Test Cases

### Test Case 1: Native Dialog Opens with Select Button

**Objective**: Verify that the native OS directory picker opens and shows "Select" button (not "Upload")

**Steps**:
1. Navigate to `http://localhost:5173`
2. Click "Add New Project" button
3. Click "Browse" button next to the path field
4. Observe the dialog that opens

**Expected Results**:
- Native OS directory picker dialog opens (not browser file picker)
- Dialog title shows "Select Project Directory"
- Dialog has a "Select" button (exact text may vary by OS):
  - macOS: "Select" button
  - Windows: "Select Folder" button
  - Linux: "Select" or "OK" button
- NO "Upload" button is visible
- NO browser file upload progress dialog appears

**Platform-Specific Validation**:
- **macOS**: Native Finder dialog with blue "Select" button in bottom-right
- **Windows**: Native Explorer dialog with "Select Folder" button
- **Linux**: GTK/Qt file picker with "Select" or "OK" button

---

### Test Case 2: Full Absolute Path Auto-Population

**Objective**: Verify that selecting a directory populates the full absolute path

**Steps**:
1. Click "Add New Project" button
2. Click "Browse" button
3. Navigate to `/Users/username/projects/MyTestProject` (or equivalent)
4. Click "Select" in the dialog
5. Observe the form fields

**Expected Results**:
- Project Name field is populated with: `MyTestProject`
- Project Path field is populated with: `/Users/username/projects/MyTestProject`
- Path field contains the FULL ABSOLUTE PATH (not just folder name)
- No manual editing is required
- "Add Project" button becomes enabled

**Path Format Validation**:
- Unix/Linux/macOS: `/Users/username/projects/MyTestProject`
- Windows: `C:\Users\username\projects\MyTestProject`

---

### Test Case 3: Browse Button Loading State

**Objective**: Verify that Browse button shows loading state while waiting for user selection

**Steps**:
1. Click "Add New Project" button
2. Click "Browse" button
3. Observe the button text and state (do not select directory yet)
4. Cancel the dialog or select a directory

**Expected Results**:
- Button text changes from "Browse" to "Selecting..." immediately
- Button is disabled while dialog is open
- Button returns to "Browse" after dialog closes (selection or cancellation)
- Button is enabled again after dialog closes

---

### Test Case 4: User Cancellation Handling

**Objective**: Verify that cancelling the directory picker is handled gracefully

**Steps**:
1. Click "Add New Project" button
2. Click "Browse" button
3. Cancel the directory picker dialog (press Escape or click Cancel)
4. Observe the form state

**Expected Results**:
- Dialog closes without errors
- Project Name and Path fields remain empty (or unchanged if previously populated)
- No error messages are displayed
- Browse button returns to normal state
- User can click Browse again

---

### Test Case 5: Complete Add Project Flow

**Objective**: Verify the complete flow from browse to project creation

**Steps**:
1. Click "Add New Project" button
2. Click "Browse" button
3. Navigate to a valid project directory
4. Click "Select" in the dialog
5. Verify both fields are auto-populated
6. Click "Add Project" button

**Expected Results**:
- Native dialog opens with "Select" button
- Both name and path fields populate with full absolute path
- No manual editing required
- Project is added successfully
- User is navigated to the project's kanban board
- Project appears in "Recent Projects" on return to project selector

---

### Test Case 6: Browse Multiple Times

**Objective**: Verify that browse can be used multiple times to change selection

**Steps**:
1. Click "Add New Project" button
2. Click "Browse" and select `ProjectA`
3. Observe fields populated with ProjectA
4. Click "Browse" again and select `ProjectB`
5. Observe fields updated with ProjectB

**Expected Results**:
- First browse populates fields with ProjectA details
- Second browse overwrites fields with ProjectB details
- Each browse operation works independently
- No errors occur from multiple browse operations

---

### Test Case 7: Manual Editing After Browse

**Objective**: Verify that users can manually edit auto-populated fields

**Steps**:
1. Click "Add New Project" button
2. Click "Browse" and select a directory (e.g., `/Users/username/projects/MyProject`)
3. Observe auto-populated fields
4. Manually edit Project Name to "MyProject - Dev"
5. Manually edit Path to "/Users/username/projects/MyProject/dev"
6. Click "Add Project"

**Expected Results**:
- Browse populates both fields
- User can edit both fields after browse
- Manual edits are preserved
- Project is created with edited values
- Form submission uses edited values, not original browse values

---

### Test Case 8: Backend API Error Handling

**Objective**: Verify graceful handling when backend API is unavailable

**Steps**:
1. Stop the backend API server
2. Click "Add New Project" button
3. Click "Browse" button
4. Observe the error handling

**Expected Results**:
- Error message is displayed: "Failed to open directory picker: [error details]"
- Error message is clear and actionable
- UI remains functional
- User can still manually enter project details
- Other UI elements are not affected

---

### Test Case 9: Special Characters in Directory Path

**Objective**: Verify handling of paths with special characters

**Steps**:
1. Click "Add New Project" button
2. Click "Browse" button
3. Navigate to a directory with special characters (e.g., `My-Project_2024 (v1.0)`)
4. Click "Select"
5. Observe auto-populated fields

**Expected Results**:
- Special characters are preserved in directory name
- Full path with special characters is correctly populated
- Project name shows: `My-Project_2024 (v1.0)`
- Path shows: `/full/path/to/My-Project_2024 (v1.0)`
- No encoding or escaping issues occur

---

### Test Case 10: Long Directory Paths

**Objective**: Verify handling of very long directory paths

**Steps**:
1. Create or navigate to a directory with a very long path (100+ characters)
2. Click "Browse" and select this directory
3. Observe the populated fields

**Expected Results**:
- Full long path is populated correctly
- Path field scrolls or wraps to show complete path
- No truncation occurs
- Project can be added successfully with long path

---

### Test Case 11: Helper Text Reflects Native Picker

**Objective**: Verify that helper text accurately describes the native picker

**Steps**:
1. Click "Add New Project" button
2. Observe the helper text below the Path field

**Expected Results**:
- Helper text reads: "Click Browse to open a native directory picker and select your project folder. The full absolute path will be populated automatically."
- NO mention of browser security limitations
- NO mention of manual path editing requirement
- NO blue info box about "browser security limitations"
- Helper text accurately reflects the native picker capability

---

### Test Case 12: Cross-Platform Consistency

**Objective**: Verify consistent behavior across different operating systems

**Steps**:
1. Test on macOS, Windows, and Linux (if available)
2. For each platform:
   - Click "Browse" button
   - Observe the native dialog
   - Select a directory
   - Verify path format

**Expected Results**:
- Each platform shows its native directory picker
- "Select" button appears on all platforms (text may vary)
- Path format matches platform conventions:
  - macOS/Linux: `/Users/username/projects/MyProject`
  - Windows: `C:\Users\username\projects\MyProject`
- Functionality is consistent across platforms
- No platform-specific bugs or issues

---

### Test Case 13: Network Error Recovery

**Objective**: Verify recovery from temporary network errors

**Steps**:
1. Configure network to simulate intermittent connectivity
2. Click "Browse" button (may fail due to network)
3. Observe error message
4. Restore network connectivity
5. Click "Browse" button again

**Expected Results**:
- First attempt shows appropriate network error
- Error message is displayed to user
- UI remains functional
- Second attempt (with network restored) succeeds
- User can successfully select directory after recovery

---

## Success Criteria

All test cases must pass with:
- ✅ Native OS directory picker opens (not browser picker)
- ✅ Dialog shows "Select" button (NOT "Upload")
- ✅ Full absolute path is returned (no browser security limitation)
- ✅ Auto-population works for both name and path
- ✅ Loading state during selection
- ✅ Graceful cancellation handling
- ✅ Complete add project flow works
- ✅ Multiple browse operations supported
- ✅ Manual editing after browse works
- ✅ Backend errors handled gracefully
- ✅ Special characters preserved
- ✅ Long paths handled correctly
- ✅ Helper text is accurate
- ✅ Cross-platform consistency
- ✅ Network error recovery works

## Known Issues / Limitations

1. **Backend Dependency**: Requires backend API to be running. If backend is down, browse button won't work (manual entry still available)
2. **tkinter Requirement**: Backend requires Python tkinter library (installed by default on macOS/Windows, may need `python3-tk` on Linux)
3. **Dialog Style**: Dialog appearance follows OS native styling, not customizable

## Technical Validation

### Backend API Endpoint

Test the backend API directly:

```bash
# Test the endpoint
curl -X POST http://localhost:9104/api/select-directory

# Expected response format:
{
  "path": "/Users/username/projects/MyProject",
  "name": "MyProject"
}

# Or if cancelled:
{
  "path": null,
  "name": null
}
```

### Frontend Service Method

Verify frontend service integration:

```javascript
// In browser console
const result = await fileOperationsService.selectDirectory();
console.log(result);
// Should show: { path: "...", name: "..." }
```

## Cleanup

After testing:
1. Remove test projects from localStorage if needed
2. No temporary files or directories created
3. Backend API continues running for other tests

## Notes

- The native directory picker requires the backend API server to be running
- Dialog appearance and button text may vary slightly by OS version
- This implementation eliminates the browser security limitation that prevented full path access
- Users should see this as a significant UX improvement over the previous implementation
