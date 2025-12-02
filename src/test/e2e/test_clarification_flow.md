# Task Clarification Flow E2E Test

## Overview
End-to-end test suite for validating the inline task clarification feature that ensures AI understanding aligns with user intent before task execution. Clarification now happens **within the BACKLOG stage**, not as a separate column.

## Feature Summary
When a new task is created:
1. Task goes directly to BACKLOG column
2. When user clicks on the task, ClarificationPanel is shown if clarification is not yet approved
3. AI analyzes the task description and generates structured understanding
4. User reviews the AI's understanding (understanding, confidence level, clarifying questions)
5. User can approve, provide feedback, or edit the task
6. Upon approval, task moves to PLAN stage and normal workflow begins

## Clarification Response Format (v2)
The clarification API now returns a conversational v2 format:
```json
{
  "understanding": "Got it! You want me to implement...",
  "confidence": "high|medium|low",
  "questions": ["Question 1?", "Question 2?"],
  "status": "awaiting_approval"
}
```

## Test Environment Setup

### Prerequisites
- WebSocket server running on localhost:8501
- Agentic Kanban frontend application running on localhost:9201
- Backend clarification API endpoint available at `/api/clarify`
- Browser developer tools available

### Environment Variables
```bash
WEBSOCKET_PORT=8501
ADW_PORT=8501
FRONTEND_PORT=9201
VITE_ADW_PORT=8501
VITE_BACKEND_URL=http://localhost:8501
```

### Starting the Environment
```bash
# Start WebSocket backend
./scripts/start-websocket.sh

# Start frontend
./scripts/start_fe.sh
```

## Test Scenarios

### Test 1: Verify Kanban Board Columns

**Purpose**: Verify that BACKLOG column is first and there is NO separate CLARIFY column

**Steps**:
1. Start the frontend application
2. Navigate to any project's Kanban board
3. Observe the column order

**Expected Results**:
- Column order should be: BACKLOG -> PLAN -> BUILD -> TEST -> REVIEW -> DOCUMENT -> READY TO MERGE -> ERRORED
- There should be NO CLARIFY column
- BACKLOG column should have the inbox icon (📥)

**Validation**:
```javascript
// Expected column order in KanbanBoard
const expectedOrder = [
  'backlog',  // First column - clarification happens inline here
  'plan',
  'build',
  'test',
  'review',
  'document',
  'ready_to_merge',
  'errored'
];
```

---

### Test 2: New Task Goes to BACKLOG Column

**Purpose**: Verify that newly created tasks are placed in the BACKLOG column

**Steps**:
1. Click "+ NEW" in the BACKLOG column
2. Fill in task details:
   - Select type (Feature, Bug, Chore, or Patch)
   - Write a description (e.g., "Add user profile page with settings")
   - Select SDLC stages
3. Click "Create Task →"
4. Observe where the task appears

**Expected Results**:
- Task appears in BACKLOG column
- Task card shows status badge "⏳ AWAITING CLARIFICATION" if not yet clarified
- Task count in BACKLOG column increments

**Validation in DevTools**:
```javascript
// Check task in localStorage
const storage = JSON.parse(localStorage.getItem('agentic-kanban-storage'));
const task = storage.state.tasks.find(t => t.title === 'Add user profile page with settings');
console.assert(task.stage === 'backlog', 'Task should be in backlog stage');
console.assert(task.metadata.clarificationStatus === 'pending', 'Clarification should be pending');
```

---

### Test 3: Auto-trigger Clarification on Task Open

**Purpose**: Verify that opening a backlog task auto-triggers clarification analysis

**Steps**:
1. Create a new task (it will go to BACKLOG column)
2. Click on the task card to open the expanded modal
3. Observe the Clarification Panel on the right side

**Expected Results**:
- ClarificationPanel component renders in the modal (because clarification is not approved)
- If no clarification result exists, loading spinner appears
- API call is made to `/api/clarify` endpoint
- After loading, clarification result is displayed

**Console Validation**:
```javascript
// Should see in console
[ClarificationPanel] Render: {
  taskPropId: 1,
  tasksPropHasResult: false,  // Initially false
  tasksFromStore: 1,
  storeTaskHasResult: 'no',
  finalTaskHasResult: false
}

// After API call completes
[ClarificationPanel] Render: {
  taskPropId: 1,
  tasksPropHasResult: true,  // Now true
  tasksFromStore: 1,
  storeTaskHasResult: 'yes',
  finalTaskHasResult: true
}
```

**Network Validation**:
```http
POST /api/clarify HTTP/1.1
Host: localhost:8501
Content-Type: application/json

{
  "task_id": 1,
  "description": "Add user profile page with settings",
  "adw_id": "abc12345",
  "feedback": null
}
```

---

### Test 4: Clarification Result Display (v2 Format)

**Purpose**: Verify that clarification results are properly displayed with v2 format

**Steps**:
1. Open a task that has completed clarification
2. Review the Clarification Panel sections

**Expected Results**:
- "💡 Is This What You Want?" section shows the understanding with confidence badge
- Confidence badge shows: "✓ Clear" (high), "~ Mostly Clear" (medium), or "? Need More Info" (low)
- "❓ Before I Start, I Need to Know..." section shows clarifying questions (if any)
- Three action buttons are visible: "Edit Task", "Provide Feedback", "Yes, This is Correct!"

**DOM Validation**:
```javascript
// Expected sections
document.querySelector('.clarification-section.understanding');  // Understanding
document.querySelector('.confidence-badge');  // Confidence badge
document.querySelector('.clarification-section.questions');  // Questions (if any)
```

---

### Test 5: Approval Flow - Task Moves to PLAN

**Purpose**: Verify that approving clarification moves task to PLAN stage

**Steps**:
1. Open a backlog task with clarification result
2. Review the AI's understanding
3. Click "Yes, This is Correct!" button

**Expected Results**:
- Task disappears from BACKLOG column
- Task appears in PLAN column
- BACKLOG column count decrements
- PLAN column count increments
- Task metadata updated with `clarification_status: 'approved'`

**State Validation**:
```javascript
// After approval
const task = store.getState().tasks.find(t => t.id === taskId);
console.assert(task.stage === 'plan', 'Task should move to plan stage');
console.assert(
  task.metadata.clarification_status === 'approved',
  'Clarification status should be approved'
);
console.assert(
  task.metadata.clarification_approved_at !== null,
  'Approval timestamp should be set'
);
```

---

### Test 6: Feedback Flow - Refine Clarification

**Purpose**: Verify that user feedback triggers re-analysis

**Steps**:
1. Open a backlog task with clarification result
2. Click "Provide Feedback" button
3. Type feedback in the textarea (e.g., "We need OAuth support, not just username/password")
4. Click "Submit" (the button text changes)

**Expected Results**:
- Textarea appears for entering feedback
- Loading spinner appears after submitting
- New clarification result reflects the feedback
- Updated result is displayed

**API Validation**:
```http
POST /api/clarify HTTP/1.1
Host: localhost:8501
Content-Type: application/json

{
  "task_id": 1,
  "description": "Add user authentication",
  "adw_id": "abc12345",
  "feedback": "We need OAuth support, not just username/password"
}
```

---

### Test 7: Edit Flow

**Purpose**: Verify that Edit Task button opens task editor

**Steps**:
1. Open a backlog task with clarification result
2. Click "Edit Task" button in the clarification panel

**Expected Results**:
- `onEdit` callback is invoked with the task object
- Task editing modal/panel opens (implementation-specific)

---

### Test 8: Error Handling - API Failure

**Purpose**: Verify graceful handling of API failures

**Steps**:
1. Stop the backend server or simulate network failure
2. Create a new task
3. Open the task (this will try to trigger clarification)

**Expected Results**:
- Error message is displayed
- "Retry Analysis" button appears
- Clicking retry attempts the API call again

**UI Validation**:
```javascript
// Error state elements
document.querySelector('.clarification-error');  // Error container
document.querySelector('.clarification-retry-btn');  // Retry button
```

---

### Test 9: Persistence Across Page Refresh

**Purpose**: Verify clarification results persist in localStorage

**Steps**:
1. Create a task and let it receive clarification result
2. Refresh the page (F5 or browser refresh)
3. Open the same task

**Expected Results**:
- Clarification result is still displayed
- No new API call is made (data loaded from store)
- All sections (understanding, confidence, questions) are preserved

**localStorage Validation**:
```javascript
const storage = JSON.parse(localStorage.getItem('agentic-kanban-storage'));
const task = storage.state.tasks.find(t => t.id === taskId);
console.log(task.metadata.clarificationResult);
// Should contain: { understanding, confidence, questions }
```

---

### Test 10: Approved Task Shows Stage Logs View

**Purpose**: Verify that approved tasks in backlog show normal stage logs view instead of clarification panel

**Steps**:
1. Create a task and approve its clarification
2. Task moves to PLAN
3. Manually move task back to BACKLOG (if needed for testing)
4. Open the task

**Expected Results**:
- Since clarification is approved, stage logs view is shown instead of ClarificationPanel
- Normal stage tabs (PLAN, BUILD, TEST, etc.) are visible

---

### Test 11: Multiple Tasks with Different Clarification States

**Purpose**: Verify multiple tasks can have different clarification states

**Steps**:
1. Create three new tasks quickly
2. Open first task and approve clarification (moves to PLAN)
3. Open second task and leave it pending
4. Open third task and provide feedback

**Expected Results**:
- First task is in PLAN stage
- Second task is in BACKLOG with pending clarification
- Third task is in BACKLOG with updated clarification
- Each task has independent clarification state

---

## API Response Format

### Clarification Request
```json
{
  "task_id": 1,
  "description": "Task description text",
  "adw_id": "8-char-id",
  "feedback": "Optional user feedback for refinement"
}
```

### Clarification Response (v2 Format)
```json
{
  "understanding": "Got it! You want me to implement...",
  "confidence": "high",
  "questions": [
    "Clarifying question 1?",
    "Clarifying question 2?"
  ],
  "status": "awaiting_approval"
}
```

## Troubleshooting

### Common Issues

1. **API returns 404**
   - Ensure backend is running on correct port (8501)
   - Check that `/api/clarify` endpoint is registered in trigger_websocket.py

2. **Clarification result not displaying**
   - Check browser console for `[ClarificationPanel] Render:` logs
   - Verify `clarificationResult` or `clarification_result` in task metadata
   - Check both camelCase and snake_case naming conventions

3. **Task not moving to PLAN after approval**
   - Verify `updateTask` store action is called
   - Check that stage is set to 'plan' in the update payload
   - Look for errors in console during approval

4. **ClarificationPanel not showing for backlog tasks**
   - Verify task is in 'backlog' stage
   - Verify clarification_status is NOT 'approved'
   - Check CardExpandModal condition logic

5. **WebSocket connection issues**
   - Verify VITE_ADW_PORT matches backend port
   - Check WebSocket status indicator in UI
   - Review browser DevTools Network > WS tab

## Test Execution Checklist

- [ ] Test 1: No CLARIFY column, BACKLOG is first
- [ ] Test 2: New task goes to BACKLOG
- [ ] Test 3: Auto-trigger works on backlog task open
- [ ] Test 4: Clarification result displays correctly (v2 format)
- [ ] Test 5: Approval moves task to PLAN
- [ ] Test 6: Feedback flow refines clarification
- [ ] Test 7: Edit button works
- [ ] Test 8: Error handling graceful
- [ ] Test 9: Persistence across refresh
- [ ] Test 10: Approved tasks show stage logs
- [ ] Test 11: Multiple tasks supported

## Related Files

- `src/components/kanban/ClarificationPanel.jsx` - Main clarification UI component
- `src/components/kanban/CardExpandModal.jsx` - Modal integration (shows ClarificationPanel for backlog tasks)
- `src/components/kanban/KanbanBoard.jsx` - Board layout (no CLARIFY column)
- `src/stores/kanbanStore.js` - Store with tasks starting in 'backlog' stage
- `adws/adw_triggers/trigger_websocket.py` - Backend API endpoint
- `adws/adw_triggers/websocket_models.py` - Pydantic models (v2 format)
