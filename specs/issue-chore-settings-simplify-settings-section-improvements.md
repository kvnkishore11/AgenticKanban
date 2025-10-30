# Chore: Simplify Settings Section and Fix Project Management

## Metadata
issue_number: `chore`
adw_id: `settings-improvements`
issue_json: `{"title": "Simplify Settings Section and Fix Project Management", "body": "Currently when i click on the settings. I am not seeing the current project i have selected for my agentic kanban. also I dont want to have demo directories in my project. feel free to remove them not just filter as u did in hte home page. probably we can store the projects i am loading already in some json format to show the projects that have already bene used. this is just fo rnow and later we can htink of integrating a database into this system. make the settins section bit simpler we dont have to display lot of content in it . just the project and the port number where we have started the websocket , its status nad option to connect. thats it. also remove the dummy projects from here. i also notice that there are repitions of the projects ensure that these are unique nad not repititive."}`

## Chore Description
Simplify the settings section to show only essential information and fix several project management issues:

1. **Display Current Project**: Show the currently selected project in the settings modal
2. **Remove Demo/Dummy Projects**: Completely remove (not filter) demo/dummy projects from storage
3. **Persistent Project Storage**: Store projects in JSON format for proper persistence and uniqueness
4. **Simplified Settings UI**: Reduce settings content to show only:
   - Current selected project information
   - WebSocket port number and status
   - Connection controls
5. **Project Uniqueness**: Ensure no duplicate projects exist in the system
6. **WebSocket Integration**: Clean integration with WebSocket service for status and connection management

## Relevant Files
Use these files to resolve the chore:

- **src/components/forms/SettingsModal.jsx** - Main settings modal that needs simplification and current project display
- **src/stores/kanbanStore.js** - Central store managing project data, needs project persistence and uniqueness logic
- **src/utils/dataMigration.js** - Already has dummy project detection logic, needs enhancement for complete removal
- **src/services/storage/localStorage.js** - May need updates for improved project storage format
- **src/services/websocket/websocketService.js** - WebSocket service integration for status display
- **src/components/ProjectSelector.jsx** - Current project filtering logic that should be converted to removal
- **src/components/forms/ProjectPortConfiguration.jsx** - WebSocket configuration component to integrate into simplified settings

### New Files
- **src/services/storage/projectPersistenceService.js** - New service to handle project storage, uniqueness, and JSON format persistence

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Project Persistence Service
- Create `src/services/storage/projectPersistenceService.js` to handle:
  - Project storage in JSON format
  - Project uniqueness validation
  - Complete removal of dummy projects (not filtering)
  - Project deduplication logic
  - Migration from current storage format

### Step 2: Update Kanban Store for Project Management
- Modify `src/stores/kanbanStore.js` to:
  - Integrate with new project persistence service
  - Add method to get current selected project for settings
  - Ensure project uniqueness when adding/loading projects
  - Remove dummy project filtering logic (delegate to persistence service)
  - Add project cleanup and deduplication methods

### Step 3: Enhance Data Migration for Complete Removal
- Update `src/utils/dataMigration.js` to:
  - Completely remove dummy projects from storage (not just filter)
  - Add deduplication logic to remove project repetitions
  - Ensure migration runs automatically on application load
  - Add validation to prevent dummy projects from being added

### Step 4: Simplify Settings Modal
- Modify `src/components/forms/SettingsModal.jsx` to:
  - Remove complex tab navigation (keep only simple single view)
  - Display current selected project at the top
  - Show only WebSocket port, status, and connection controls
  - Remove project-specific notification settings (move to simpler format)
  - Integrate WebSocket status directly from websocketService
  - Remove all non-essential configuration options

### Step 5: Update Project Selector to Use Removal
- Modify `src/components/ProjectSelector.jsx` to:
  - Use new project persistence service
  - Remove dummy project filtering (since they'll be removed from storage)
  - Update to ensure project uniqueness during addition
  - Clean up dummy project detection warnings (no longer needed)

### Step 6: Integrate WebSocket Status in Settings
- Update settings to show:
  - Current WebSocket server status (running/stopped)
  - Port number where WebSocket is running
  - Simple connect/disconnect controls
  - Status indicators (connected/disconnected/error)

### Step 7: Test Project Persistence and Uniqueness
- Verify project storage in JSON format works correctly
- Ensure no duplicate projects can be added
- Confirm dummy projects are completely removed from storage
- Test project persistence across browser sessions

### Step 8: UI Polish and Final Integration
- Ensure simplified settings modal has clean, minimal UI
- Verify current project is displayed prominently
- Test WebSocket integration and status display
- Validate all dummy projects are removed and don't reappear

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run dev` - Start the development server to test the application
- `npm run build` - Build the application to ensure no build errors
- `npm run lint` - Check for linting errors in modified code
- `npm test` - Run tests to ensure no regressions in core functionality

## Notes
- The new project persistence service should use a clear JSON format for easy future database migration
- Settings modal should be significantly simpler with minimal configuration options
- All dummy project logic should be centralized in the new persistence service
- WebSocket integration should be straightforward and reliable
- Project uniqueness should be enforced at the service level, not UI level
- Consider localStorage size limitations when implementing JSON storage format
- Ensure backward compatibility during migration from current storage format