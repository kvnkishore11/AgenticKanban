# Chore: ADW ID Dropdown Auto-Populate from Agents Folder

## Metadata
issue_number: `1`
adw_id: `c118defa`
issue_json: `{"number":1,"title":"when ever we try to fill the adw_id","body":"when ever we try to fill the adw_id. since the agents folder of the client project already have all the subfolders whose names are the adw_is they should autopopulate. i feel we should have a drop down of teh adw information along with its id like if it is feature and small definition of what it does."}`

## Chore Description

The user wants to implement an auto-populate dropdown for the ADW ID field that dynamically fetches available ADW IDs from the `agents/` folder in the project root. Currently, the frontend has a dropdown UI component (`AdwIdInput.jsx`) that attempts to fetch ADW data from the backend API endpoint `/api/adws/list`, but this endpoint is not implemented on the backend.

The chore involves:
1. Creating a backend API endpoint that scans the `agents/` directory for existing ADW IDs
2. Extracting metadata from each ADW's `adw_state.json` file
3. Returning structured ADW information including: adw_id, issue_class, issue_number, issue_title (from issue_json), and branch_name
4. Ensuring the existing frontend dropdown component can successfully fetch and display this data

## Relevant Files

**Backend Files (to be created/modified):**
- `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c118defa/app/server/server.py` - Currently minimal placeholder; needs to be implemented as a FastAPI/Flask server with the `/api/adws/list` endpoint
- `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c118defa/app/server/core/utils.py` - May contain utility functions; can be used for ADW scanning logic

**Frontend Files (already implemented, verify integration):**
- `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c118defa/src/components/ui/AdwIdInput.jsx` - Lines 1-378: Dropdown component that fetches from `/api/adws/list` and displays ADW metadata
- `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c118defa/src/services/api/adwDiscoveryService.js` - Lines 7-70: API service that calls the backend endpoint
- `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c118defa/src/utils/adwValidation.js` - Lines 1-58: Validation logic for ADW IDs

**Data Source:**
- `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/agents/` - Directory containing all ADW subfolders (e.g., `c118defa/`, `0f799fa0/`, etc.)
- Each ADW subfolder contains `adw_state.json` with metadata

**Documentation:**
- `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c118defa/adws/README.md` - Contains ADW system architecture and state management details
- `.claude/commands/conditional_docs.md` - No additional docs required for this chore

### New Files
- `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c118defa/app/server/api/__init__.py` - Initialize API routes module
- `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c118defa/app/server/api/adws.py` - ADW listing endpoint implementation

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Implement Backend Server Infrastructure
- Set up FastAPI server in `app/server/server.py` with CORS support
- Configure the server to run on the expected port (default: 8002 based on frontend config)
- Add health check endpoint to verify server is running
- Create API routes module structure under `app/server/api/`

### Step 2: Create ADW Listing Endpoint
- Implement `GET /api/adws/list` endpoint in `app/server/api/adws.py`
- Scan the `agents/` directory in the project root for ADW ID subfolders
- For each ADW subfolder, read the `adw_state.json` file
- Extract required fields: `adw_id`, `issue_class`, `issue_number`, `branch_name`, and `issue_json.title`
- Handle cases where `adw_state.json` is missing or malformed
- Return JSON response in the format expected by the frontend:
  ```json
  {
    "adws": [
      {
        "adw_id": "c118defa",
        "issue_class": "chore",
        "issue_number": 1,
        "issue_title": "when ever we try to fill the adw_id",
        "branch_name": "chore-issue-1-adw-c118defa-adw-id-dropdown-autopopulate"
      }
    ]
  }
  ```

### Step 3: Add Error Handling and Validation
- Add try-except blocks for file reading operations
- Return appropriate HTTP status codes (200 for success, 500 for server errors)
- Log errors to help with debugging
- Handle edge cases like empty agents directory or no valid ADW states

### Step 4: Verify Frontend Integration
- Review `src/services/api/adwDiscoveryService.js` to ensure it's correctly configured
- Verify the API base URL matches the backend server configuration (default: `http://localhost:8002`)
- Test that `AdwIdInput.jsx` can successfully fetch and display the ADW list
- Confirm dropdown filtering and search functionality works with real data

### Step 5: Add Server Start Scripts
- Update or create start script in `scripts/` to launch the backend server
- Ensure the server can be started alongside the frontend development server
- Document the command to start the backend in the project README or scripts

### Step 6: Run Validation Commands
- Start the backend server and verify `/api/adws/list` returns valid data
- Start the frontend and verify the ADW ID dropdown populates correctly
- Test the complete workflow: select an ADW ID from dropdown and trigger a workflow
- Run all validation commands listed below

## Validation Commands

Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c118defa && npm run lint` - Verify no linting errors in frontend code
- Manual validation: Start backend server and verify `curl http://localhost:8002/api/adws/list` returns valid JSON with ADW data
- Manual validation: Start frontend and verify ADW ID dropdown in WorkflowTriggerModal displays the list of ADWs from the agents folder

## Notes

- The `agents/` directory is located at the project root level (not inside `app/client/` or `app/server/`)
- ADW IDs are 8-character alphanumeric identifiers (e.g., `c118defa`)
- The `adw_state.json` file structure includes: `adw_id`, `issue_number`, `branch_name`, `issue_class`, `issue_json` (with `title` and `body`)
- The `issue_class` field uses the format `/chore`, `/bug`, `/feature` - frontend expects without the leading slash
- The frontend component already handles loading states, error states, and filtering
- No changes to the frontend components are required if the backend returns data in the expected format
- The backend server needs to support CORS to allow requests from the Vite dev server (typically running on port 5173)
