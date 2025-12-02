# E2E Test: Recent Projects and Manual Path Entry

**Issue**: #1
**ADW ID**: 96b29c89
**Feature**: Recent Projects Storage and Manual Path Entry
**Date**: 2025-12-01
**Updated**: 2025-12-02

## Test Overview

This E2E test validates the complete user flow for:
1. Manually adding projects with name and path
2. Viewing and accessing recent projects
3. Selecting from the recent projects list
4. Project persistence across sessions

## Prerequisites

- Application running on `http://localhost:5173`
- Backend WebSocket service running (if applicable)
- Test project directories available on the file system

## Important Note: Native Directory Picker via Backend API

The browse functionality now uses a **native OS directory picker** via the backend API. This provides a true "Select" button (not "Upload") and returns the full absolute path without any browser security limitations.

**Current Approach**:
- Users click "Browse" to trigger a backend API call that opens a native OS directory picker dialog
- The dialog shows a "Select" button (not "Upload")
- Upon selection, both the project name and **full absolute path** are automatically populated
- No file upload or content reading occurs
- Alternatively, users can still manually enter both name and path without using Browse

**Technical Implementation**: The backend uses Python's tkinter library to show a native directory picker dialog, which returns the full absolute directory path to the frontend.

## Test Cases

### Test Case 1: Manual Project Entry

**Objective**: Verify that manual project entry works correctly

**Steps**:
1. Navigate to `http://localhost:5173`
2. If a project is already selected, click the logo/header to return to project selection
3. Click the "Add New Project" button in the "Add New Project" section
4. Verify the "Add New Project" form appears
5. Manually type a project name: "Test Project"
6. Manually type a project path: "/Users/test/projects/test-project"
7. Click "Add Project"

**Expected Results**:
- The form shows with empty fields (no auto-population)
- Both fields accept text input
- The "Add Project" button is disabled until both fields have values
- After filling both fields, the button becomes enabled
- The project is added successfully
- The user is navigated to the new project's kanban board
- No validation errors appear

**Visual Validation**:
- Placeholder shows: "/Users/username/projects/myproject"
- Helper text shows: "Enter the full absolute path to your project directory"
- Examples are displayed showing macOS/Linux and Windows path formats

---

### Test Case 2: Native Directory Picker Selection

**Objective**: Verify that browse functionality opens native OS directory picker with "Select" button

**Steps**:
1. Navigate to `http://localhost:5173`
2. Click the "Add New Project" button
3. Click the "Browse" button next to the path field
4. Wait for the native OS directory picker dialog to appear
5. Navigate to a project directory in the dialog
6. Click the "Select" button in the dialog (NOT "Upload")
7. Observe the auto-populated fields
8. Click "Add Project" (no manual editing needed)

**Expected Results**:
- The "Browse" button is visible next to the path input field
- Clicking Browse shows a loading state ("Selecting...")
- A **native OS directory picker dialog** opens (not a browser file picker)
- The dialog shows a **"Select" button** (not "Upload")
- NO file upload progress dialog appears
- NO browser lag occurs (works with any directory size)
- After selecting, both fields are auto-populated:
  - Project name field: folder name (e.g., "MyProject")
  - Path field: **full absolute path** (e.g., "/Users/username/projects/MyProject")
- User can submit immediately without manual editing
- Helper text reflects the native picker approach

**Visual Validation**:
- Browse button appears with secondary styling
- Browse button shows "Selecting..." while dialog is open
- Browse button is disabled while selecting
- Helper text reads: "Click Browse to open a native directory picker and select your project folder. The full absolute path will be populated automatically."
- No blue info box about browser limitations (limitation removed)

**Performance Validation**:
- Dialog opens instantly (backend API call)
- Directory selection returns immediately with full path
- No file content reading or upload occurs
- Works with any directory size without lag

**Dialog Validation** (Platform-Specific):
- **macOS**: Native Finder dialog with "Select" button
- **Windows**: Native Explorer dialog with "Select Folder" button
- **Linux**: Native file picker dialog (GTK/Qt) with "Select" button

---

### Test Case 3: Form Validation

**Objective**: Verify form validation works correctly

**Steps**:
1. Click "Add New Project" button
2. Try to click "Add Project" without filling any fields
3. Fill only the project name, try to submit
4. Fill only the project path, try to submit
5. Fill both fields with whitespace only, try to submit

**Expected Results**:
- "Add Project" button is disabled when fields are empty
- Button remains disabled when only one field is filled
- Button remains disabled when fields contain only whitespace
- Appropriate error messages are shown via the error system

---

### Test Case 3: Recent Projects Display

**Objective**: Verify that recently accessed projects appear in the "Recent Projects" section

**Steps**:
1. Add or select 3-5 different projects (using manual entry)
2. Return to the project selection page
3. Observe the "Recent Projects" section

**Expected Results**:
- A "Recent Projects" section appears at the top (if recent projects exist)
- Recent projects are displayed with a visual distinction (light blue background, "Recent" badge)
- Up to 5 most recently accessed projects are shown
- Each recent project card shows:
  - Project name
  - Project description
  - Project path
  - "Recent" badge
  - Relative time (e.g., "Just now", "5m ago", "2h ago", "3d ago")
  - ADW Compatible indicator

**Visual Validation**:
- Recent project cards have a light background color (bg-primary-50/50)
- Recent project cards have a "Recent" badge in the top-right
- Time is displayed in primary color (text-primary-600) and is formatted as relative time

---

### Test Case 4: Recent Projects Ordering

**Objective**: Verify that recent projects are sorted by most recent access

**Steps**:
1. Ensure you have at least 3 projects in the system
2. Click on "Project A" - note the time
3. Wait 5 seconds
4. Return to project selection
5. Click on "Project B" - note the time
6. Wait 5 seconds
7. Return to project selection
8. Click on "Project C" - note the time
9. Return to project selection
10. Observe the "Recent Projects" section

**Expected Results**:
- Recent projects appear in order: Project C, Project B, Project A
- The most recently accessed project (Project C) appears first
- Relative timestamps reflect the correct access order
- Accessing the same project multiple times updates its position to the top

---

### Test Case 5: Recent Projects Limit

**Objective**: Verify that only the 5 most recent projects are displayed

**Steps**:
1. Access 6 or more different projects sequentially
2. Note the order of access
3. Return to project selection
4. Observe the "Recent Projects" section

**Expected Results**:
- Only 5 projects are shown in the "Recent Projects" section
- The 5 most recently accessed projects are displayed
- The 6th (or older) accessed project is not in the recent list
- The 6th project still appears in the "All Projects" section

---

### Test Case 6: Select from Recent Projects

**Objective**: Verify that clicking a recent project navigates to it

**Steps**:
1. Navigate to project selection page with recent projects visible
2. Click on a project card in the "Recent Projects" section

**Expected Results**:
- User is immediately navigated to the selected project's kanban board
- No validation errors occur
- The project's lastAccessedAt timestamp is updated
- After returning to project selection, the clicked project should be at the top of recent projects

---

### Test Case 7: Edge Cases - Special Characters in Path

**Objective**: Verify handling of paths with special characters

**Steps**:
1. Click "Add New Project"
2. Enter a project name: "Special Project"
3. Enter a path with special characters: "/Users/test/My-Project_2024 (v1.0)"
4. Click "Add Project"

**Expected Results**:
- Path with special characters is accepted
- Project is added without errors
- Special characters are preserved in the project name and path
- Project displays correctly in the project list

---

### Test Case 8: Edge Cases - Empty Recent Projects

**Objective**: Verify behavior when no recent projects exist

**Steps**:
1. Clear browser localStorage (or use incognito mode)
2. Navigate to project selection page
3. Observe the UI

**Expected Results**:
- "Recent Projects" section does NOT appear
- Only "All Projects" section is visible
- If no projects exist at all, "No projects available" message is shown
- No errors in console

---

### Test Case 9: Recent Projects Persistence

**Objective**: Verify recent projects persist across browser sessions

**Steps**:
1. Access 3 different projects
2. Note their order in "Recent Projects"
3. Close the browser tab
4. Reopen the application
5. Navigate to project selection

**Expected Results**:
- Recent projects are still displayed
- The order is preserved from the previous session
- Relative timestamps are recalculated based on current time
- No data loss occurs

---

### Test Case 10: All Projects Section

**Objective**: Verify the "All Projects" section displays all projects

**Steps**:
1. Ensure you have several projects (some recent, some not recent)
2. Navigate to project selection
3. Observe both "Recent Projects" and "All Projects" sections

**Expected Results**:
- "All Projects" section appears below "Recent Projects" (if recent exist)
- All projects are listed in "All Projects", including recent ones
- Recent projects appear in BOTH sections
- Non-recent projects appear only in "All Projects"
- Each section is clearly labeled

---

### Test Case 11: Helper Text and Examples

**Objective**: Verify that helper text and examples are displayed

**Steps**:
1. Click "Add New Project" button
2. Observe the form fields and helper text

**Expected Results**:
- Project Name field has helper text: "Enter a descriptive name for your project"
- Project Path field has helper text: "Enter the full absolute path to your project directory"
- Path examples are shown for macOS/Linux: `/Users/username/projects/myproject`
- Path examples are shown for Windows: `C:\Users\username\projects\myproject`
- Examples are displayed in a blue info box

---

### Test Case 12: Path Input Flexibility

**Objective**: Verify different path formats are accepted

**Steps**:
1. Test with absolute Unix path: `/Users/test/projects/proj1`
2. Test with absolute Windows path: `C:\Users\test\projects\proj1`
3. Test with relative path: `./projects/proj1`
4. Test with tilde path: `~/projects/proj1`

**Expected Results**:
- All path formats are accepted as input
- Backend validation determines if paths are valid
- Clear error messages are shown for invalid paths
- Valid paths allow successful project creation

---

## Test Data Setup

### Sample Projects for Testing

```
Project 1: TestProject1
Path: /Users/test/Documents/TestProject1

Project 2: TestProject2
Path: /Users/test/Documents/TestProject2

Project 3: ManualProject
Path: /Users/test/manual-entry

Project 4: Special-Chars_2024 (v1.0)
Path: /Users/test/Special-Chars_2024 (v1.0)

Project 5: WindowsProject
Path: C:\Users\test\projects\windowsproject
```

## Success Criteria

All test cases must pass with:
- ✅ Manual path entry works correctly
- ✅ Native directory picker opens with "Select" button (NOT "Upload")
- ✅ Browse functionality returns full absolute path
- ✅ Browse functionality has no lag with any directory size
- ✅ Form validation prevents invalid submissions
- ✅ Recent projects display correctly
- ✅ Correct sorting by access time
- ✅ Maximum 5 recent projects shown
- ✅ Navigation works from recent projects
- ✅ Special characters handled correctly
- ✅ Empty state handled gracefully
- ✅ Data persists across sessions
- ✅ All projects section displays all projects
- ✅ Helper text reflects native picker capability
- ✅ Different path formats are accepted
- ✅ User cancellation handled gracefully

## Known Limitations

1. **Backend Dependency**: The native directory picker requires the backend API to be running. If the backend is unavailable, users must manually enter paths.
2. **Path Validation**: Path validation is performed on the backend. Invalid paths will show errors after submission.
3. **tkinter Requirement**: The backend requires Python's tkinter library to be installed. On Linux, this may require installing `python3-tk` package. macOS and Windows include tkinter by default.

## Browse Functionality Implementation

The browse functionality now uses a **backend API with native OS directory picker**:

**Implementation Strategy**:
- Frontend calls `/api/select-directory` endpoint when Browse button is clicked
- Backend uses Python's `tkinter.filedialog.askdirectory()` to show native OS directory picker
- Native dialog shows "Select" button (not "Upload")
- Backend extracts full absolute path and directory name
- Returns JSON with `path` and `name` to frontend
- Frontend populates both fields automatically with full absolute path

**Advantages Over Previous Implementation**:
- ✅ No browser security limitations - full absolute paths are returned
- ✅ True native OS dialog with "Select" button (not "Upload")
- ✅ No file content reading or upload occurs
- ✅ Works with any directory size without lag
- ✅ Consistent behavior across all browsers
- ✅ Users can submit immediately without manual path editing

**Previous Problem (Now Solved)**:
- Old implementation used browser's `<input type="file" webkitdirectory>`
- Could only extract folder name, not full path (browser security limitation)
- Showed "Upload" button which confused users
- Required manual path completion
- New backend-based implementation eliminates all these issues

**Technical Details**:
- **Backend Endpoint**: `/api/select-directory` (POST)
- **Backend Library**: Python tkinter for native dialogs
- **Response Format**: `{ "path": "/full/absolute/path", "name": "directory-name" }`
- **Cancellation Handling**: Returns `{ "path": null, "name": null }` if user cancels
- **Error Handling**: Returns HTTP 500 with error details if dialog fails to open

## Cleanup

After testing:
1. Remove test projects from localStorage if needed
2. No temporary directories need cleanup (manual entry only)

## Notes

- Test in multiple browsers (Chrome, Firefox, Safari, Edge) to ensure compatibility
- Test with various path formats and special characters
- Verify console has no errors during any test case
- No file upload dialogs should appear during any test case
