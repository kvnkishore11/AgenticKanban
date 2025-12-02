# Chore: Fix Browse Path Selection and Add Recent Projects Storage

## Metadata
issue_number: `1`
adw_id: `96b29c89`
issue_json: `{"number":1,"title":"currenlty So as soon as I select browse, so I am a...","body":"currenlty So as soon as I select browse, so I am able to get the project right. So it is uploading entire project. Ideally what should happen is it should just update the path right path and sample project name that's the root project directory name within the input. So that this is what I was expecting right now I have to manually type all this path. So basically as soon as I click on browse, it should open a window, it should show the path of the project. And then when I clicked on select it should append the path on to the location of path within the screenshot I have shown you. So currently that is not happening. So it is trying to upload the entire project. It's taking a lot of time there is like a lag the sort of thing. So please try to fix that and maybe you can try to have like five previous projects already. So I can select them and storage. I'm not sure probably within the local storage you can use some space to have all the projects that are used and you can just get top five of them to be always present. So you don't always have to kind of have to select the project all the time.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/064bf42b-9aca-440c-89e0-c0e3efe7e644)\n\n"}`

## Chore Description

The current browse functionality has two critical issues:

1. **File Upload Instead of Path Selection**: When the user clicks "Browse", the system is attempting to upload the entire project directory, which causes significant lag and poor UX. The expected behavior is to simply populate the path input field with the selected directory path and automatically extract the project name from the directory name.

2. **No Recent Projects Quick Access**: Users have to manually browse and select projects every time they want to add a previously used project. The system should maintain a list of the 5 most recently accessed projects in localStorage for quick selection.

The chore involves:
- Fixing the directory picker to only capture the path (not upload files)
- Auto-populating both the project name and path fields when a directory is selected
- Implementing localStorage-based recent projects tracking
- Displaying the 5 most recently accessed projects for quick selection
- Ensuring the recent projects list updates correctly when projects are accessed

## Relevant Files

Use these files to resolve the chore:

- **src/components/ProjectSelector.jsx** - Main component that handles project selection and the browse functionality
  - Contains the directory picker implementation using `webkitdirectory`
  - Currently shows the "Add New Project" form when Browse is clicked
  - Needs modification to better handle directory selection without file upload lag
  - The `handleDirectorySelect` function at line 36 extracts directory name from files array
  - The `handleBrowseClick` function at line 48 triggers the file input

- **src/services/storage/projectPersistenceService.js** - Service that manages project storage in localStorage
  - Provides `getAllProjects()`, `addProject()`, `updateProject()` methods
  - Already tracks project metadata including `createdAt`, `updatedAt`, `lastModified` timestamps
  - Can be extended to track `lastAccessedAt` timestamp for recent projects sorting
  - The `getAllProjects()` method at line 43 returns all stored projects

- **src/services/storage/localStorage.js** - Low-level localStorage wrapper
  - Provides `setItem()`, `getItem()`, `removeItem()` methods with error handling
  - Already includes versioning and timestamp support
  - Can be used to store recent projects list separately if needed

- **src/stores/kanbanStore.js** - Zustand store that manages application state
  - Contains `selectProject()` function that should be updated to track access time
  - Contains `addProject()` function that uses projectPersistenceService
  - May need to expose methods for retrieving recent projects

- **app_docs/feature-754def43-project-navigation-browse.md** - Documentation of previous browse functionality fix
  - Shows the current implementation using HTML5 `webkitdirectory`
  - Explains browser security limitations with file paths
  - Provides context on how the directory picker currently works

### New Files

- **src/services/storage/recentProjectsService.js** - New service to manage recent projects tracking
  - Will track the 5 most recently accessed projects
  - Will provide methods to get recent projects list
  - Will update access timestamps when projects are selected

- **src/components/__tests__/recentProjectsService.test.js** - Unit tests for recentProjectsService
  - Test recent projects limit (5 max)
  - Test access timestamp updates
  - Test sorting by most recent access

- **src/components/__tests__/ProjectSelector.browse-fix.test.jsx** - Additional unit tests for browse functionality improvements
  - Test directory selection without file upload
  - Test auto-population of name and path fields
  - Test recent projects display
  - Test recent projects selection

## Step by Step Tasks

### 1. Understand Current Browse Implementation

- Read `src/components/ProjectSelector.jsx` to understand the current `handleDirectorySelect` and `handleBrowseClick` implementation
- Read `app_docs/feature-754def43-project-navigation-browse.md` to understand browser limitations and previous fixes
- Identify why the current implementation triggers file upload behavior and causes lag
- Review the `webkitdirectory` attribute usage and how it handles directory selection

### 2. Create Recent Projects Service

- Create `src/services/storage/recentProjectsService.js` to manage recent projects tracking
- Implement methods:
  - `getRecentProjects()` - Returns up to 5 most recently accessed projects sorted by `lastAccessedAt` descending
  - `trackProjectAccess(projectId)` - Updates the `lastAccessedAt` timestamp for a project when it's selected
  - `clearRecentProjects()` - Clears the recent projects tracking (for testing/cleanup)
- Use `projectPersistenceService` to update project metadata with `lastAccessedAt` timestamp
- Ensure projects are sorted by `lastAccessedAt` with most recent first
- Limit the returned list to 5 projects maximum

### 3. Update Project Persistence Service

- Modify `src/services/storage/projectPersistenceService.js` to support `lastAccessedAt` tracking
- Update `updateProject()` to accept `lastAccessedAt` in updates
- Modify `getAllProjects()` to return projects with `lastAccessedAt` field
- Add a new method `updateProjectAccessTime(projectId)` that updates only the `lastAccessedAt` timestamp without modifying other fields

### 4. Fix Directory Selection Lag

- Modify `src/components/ProjectSelector.jsx` `handleDirectorySelect` function:
  - Extract only the directory path information without reading file contents
  - Avoid triggering file upload by only accessing the minimal file metadata (webkitRelativePath)
  - Ensure the function executes quickly without loading entire file contents
  - Test with large directories to verify no lag occurs

### 5. Improve Auto-Population Logic

- Enhance `handleDirectorySelect` to better extract the project name:
  - Extract the root directory name from the first file's `webkitRelativePath`
  - Handle edge cases like paths with special characters or very long names
  - Ensure both `newProjectName` and `newProjectPath` are set correctly
  - Clear any previous form state before populating

### 6. Update Kanban Store to Track Access Time

- Modify `src/stores/kanbanStore.js` `selectProject()` function:
  - Call `recentProjectsService.trackProjectAccess(project.id)` when a project is selected
  - Ensure this happens for both existing projects and newly added projects
  - Add error handling in case access tracking fails

### 7. Display Recent Projects in UI

- Modify `src/components/ProjectSelector.jsx` to display recent projects:
  - Add a new "Recent Projects" section at the top showing the 5 most recently accessed projects
  - Fetch recent projects using `recentProjectsService.getRecentProjects()`
  - Display recent projects with badges or indicators to differentiate from all projects
  - Allow clicking on a recent project to quickly select it
  - Ensure the recent projects list updates when a project is accessed

### 8. Create Unit Tests for Recent Projects Service

- Create `src/services/storage/__tests__/recentProjectsService.test.js`:
  - Test `getRecentProjects()` returns up to 5 projects sorted by most recent access
  - Test `trackProjectAccess()` updates the `lastAccessedAt` timestamp correctly
  - Test that accessing the same project multiple times updates its position in the recent list
  - Test that the 6th project accessed removes the oldest from the recent list
  - Test edge cases: empty projects, single project, exactly 5 projects
  - Test `clearRecentProjects()` clears all recent tracking

### 9. Create Integration Tests for Browse Functionality

- Create `src/components/__tests__/ProjectSelector.browse-fix.test.jsx`:
  - Test directory selection populates both name and path fields
  - Test directory selection does not trigger file upload or cause lag
  - Test recent projects are displayed correctly
  - Test clicking a recent project selects it immediately
  - Test recent projects list updates after project selection
  - Mock the file input to simulate directory selection
  - Test that large directory selection doesn't cause performance issues

### 10. Create E2E Test for Complete Flow

- Create `src/test/e2e/issue-1-adw-96b29c89-e2e-browse-path-selection.md`:
  - Test the complete browse and select flow
  - Verify no lag occurs during directory selection
  - Verify path and name auto-populate correctly
  - Test adding a project and seeing it appear in recent projects
  - Test selecting from recent projects list
  - Test that only 5 most recent projects are shown
  - Test edge cases like special characters in paths

### 11. Run All Validation Commands

- Execute all validation commands listed below to ensure:
  - All new tests pass
  - No existing tests are broken
  - The application builds successfully
  - Type checking passes
  - No ESLint errors are introduced

## Validation Commands

Execute every command to validate the chore is complete with zero regressions.

- `npm run test` - Run all frontend tests to validate the chore is complete with zero regressions
- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to ensure code quality standards are met
- `npm run build` - Build the frontend to ensure no build errors
- `npm run dev` - Start the development server to manually verify the browse functionality works correctly

## Notes

### Browser Security Limitations

As documented in `app_docs/feature-754def43-project-navigation-browse.md`, browsers restrict access to full file system paths for security reasons. The current implementation using `webkitdirectory` can only access:
- The folder name (not the full absolute path)
- File metadata via `webkitRelativePath`

This is a browser limitation, not a bug. The solution must work within these constraints.

### Performance Considerations

The current lag is likely caused by the browser attempting to read file contents or enumerate all files in the directory. The fix should:
- Only access the minimal metadata needed (directory name from first file)
- Not enumerate all files in the directory
- Not read file contents
- Complete the operation synchronously to avoid UI lag

### Recent Projects Implementation Strategy

The recent projects feature can be implemented using the existing `projectPersistenceService`:
- Add a `lastAccessedAt` timestamp to each project
- Sort projects by `lastAccessedAt` to get the most recent
- Limit the results to 5 projects
- Update `lastAccessedAt` every time a project is selected

This approach avoids creating a separate storage mechanism and keeps all project metadata in one place.

### UX Improvements

The recent projects section should:
- Be visually distinct from the full projects list
- Show only essential information (name, path, last accessed time)
- Allow one-click access to recently used projects
- Update in real-time when a project is accessed
- Handle edge cases gracefully (no recent projects, less than 5 projects)

### Testing Strategy

- **Unit Tests**: Test the recentProjectsService in isolation
- **Integration Tests**: Test ProjectSelector component with recent projects functionality
- **E2E Tests**: Test the complete user flow from browser to project selection
- **Manual Testing**: Verify no lag with large directories, test with real projects
