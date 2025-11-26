# Patch: Add CORS Middleware to WebSocket Trigger Server

## Metadata
adw_id: `5b8b8ed2`
review_change_request: `Issue #1: CORS error preventing plan content from loading. The frontend makes a request to http://localhost:8502/api/adws/5b8b8ed2/plan but receives a CORS error because trigger_websocket.py does not have CORSMiddleware configured. Browser console shows: 'Access to fetch at http://localhost:8502/api/adws/5b8b8ed2/plan from origin http://localhost:9202 has been blocked by CORS policy'. The Plan Viewer modal displays 'Error loading plan' and 'Failed to fetch' messages to the user. Resolution: Add CORSMiddleware configuration to adws/adw_triggers/trigger_websocket.py similar to how it's configured in server/server.py. Import CORSMiddleware from fastapi.middleware.cors and add it to the FastAPI app with appropriate allow_origins, allow_credentials, allow_methods, and allow_headers settings. This will allow the frontend to successfully make cross-origin requests to the plan endpoint. Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-7-adw-5b8b8ed2-sdlc_planner-fix-view-plan-display.md
**Issue:** The frontend at `http://localhost:9202` cannot fetch plan data from the backend API at `http://localhost:8502/api/adws/5b8b8ed2/plan` due to CORS (Cross-Origin Resource Sharing) policy blocking the request. The browser console shows: "Access to fetch at http://localhost:8502/api/adws/5b8b8ed2/plan from origin http://localhost:9202 has been blocked by CORS policy". This causes the Plan Viewer modal to display "Error loading plan" and "Failed to fetch" messages.
**Solution:** Add CORS middleware configuration to `adws/adw_triggers/trigger_websocket.py` to allow cross-origin requests from the frontend. The implementation will mirror the CORS configuration in `server/server.py` (lines 38-49).

## Files to Modify
- `adws/adw_triggers/trigger_websocket.py` - Add CORS middleware import and configuration

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add CORSMiddleware Import
- Add `from fastapi.middleware.cors import CORSMiddleware` to the imports section
- Place this import after line 32 where other FastAPI imports are located (`from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException`)

### Step 2: Configure CORS Middleware
- Add CORS middleware configuration after the FastAPI app initialization (after line 106)
- Configure with the following settings to match `server/server.py`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=[
          "http://localhost:5173",  # Vite dev server default
          f"http://localhost:{os.getenv('FRONTEND_PORT', '9202')}",  # Frontend port from env
          "http://localhost:3000",  # Alternative frontend port
      ],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- This configuration allows requests from the frontend ports (9202 is the primary one from .env) and includes support for credentials, all HTTP methods, and all headers

## Validation
Execute every command to validate the patch is complete with zero regressions.

```bash
# 1. Check Python syntax
uv run python -m py_compile adws/adw_triggers/trigger_websocket.py

# 2. Run backend linting
uv run ruff check adws/adw_triggers/trigger_websocket.py

# 3. Start the WebSocket trigger server in the background
uv run adws/adw_triggers/trigger_websocket.py &

# 4. Wait for server to start (2 seconds)
sleep 2

# 5. Test CORS headers with curl (verify CORS headers are present)
curl -v -H "Origin: http://localhost:9202" -H "Access-Control-Request-Method: GET" -X OPTIONS http://localhost:8502/api/adws/5b8b8ed2/plan 2>&1 | grep -i "access-control"

# Expected: Should see access-control-allow-origin, access-control-allow-credentials headers

# 6. Test the plan endpoint with CORS origin header
curl -H "Origin: http://localhost:9202" http://localhost:8502/api/adws/5b8b8ed2/plan

# Expected: JSON response with plan_content and plan_file fields, no CORS error

# 7. Test ADW list endpoint (regression check)
curl http://localhost:8502/api/adws/list

# Expected: JSON array of ADW objects

# 8. Test ADW metadata endpoint (regression check)
curl http://localhost:8502/api/adws/5b8b8ed2

# Expected: JSON object with ADW metadata

# 9. Kill background server
pkill -f trigger_websocket.py

# 10. Manual frontend test:
# - Start backend: uv run adws/adw_triggers/trigger_websocket.py
# - Start frontend: npm run dev
# - Navigate to http://localhost:9202
# - Find card with ADW ID 5b8b8ed2
# - Click "View Plan" button
# - Verify plan content loads successfully without CORS error
# - Check browser console for no CORS errors
```

## Patch Scope
**Lines of code to change:** ~12 lines (1 import + 11 lines for middleware configuration)
**Risk level:** low
**Testing required:** CORS preflight request testing, API endpoint regression testing, manual frontend testing
