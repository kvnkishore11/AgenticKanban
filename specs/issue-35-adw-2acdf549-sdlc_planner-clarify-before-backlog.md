# Feature: Clarification Stage Before Backlog

## Metadata

issue_number: `35`
adw_id: `2acdf549`
issue_json: `{"number":35,"title":"I have an idea","body":"I have an idea. So basically, as soon as you are typing, you know, as soon as you have your request in this input model, I want the agent to have a very good understanding of what I have asked. Like I want to know what is requested and what it has understood is 100% matching. So like, so that will really help me to get the best output. So I was just thinking probably within the back and backlog stage, as soon as ticket goes into backlog stage. So it should do all these things like it should verify its understanding with me. And if I am happy, only then the trigger button will be active on it. It can go. So I am trying to think of that sort of flow. Like I have to verify, yes, this is what I am looking for sort of thing. So that will really refine the system. So maybe you can see how you can implement it. Maybe you will have an ADW clarify stage, an ADW backlog stage, whatever it is. Things like that will really help to accomplish."}`

## Feature Description

This feature introduces a new "Clarify" stage in the Kanban workflow that acts as an intelligent verification checkpoint before tasks reach the backlog. When a user creates a task, the system will analyze the task description using AI to understand the request, then present that understanding back to the user for confirmation. Only after the user confirms that the AI's understanding matches their intent will the task be allowed to proceed to the backlog and beyond. This ensures 100% alignment between user intent and agent understanding, dramatically improving output quality and reducing wasted effort on misunderstood requirements.

## User Story

As a user creating tasks in the AgenticKanban system
I want the AI agent to verify its understanding of my request before proceeding
So that I can confirm we're aligned on the requirements and get the best possible output

## Problem Statement

Currently, when users create tasks and trigger workflows, there's no verification step to ensure the AI agent correctly understands the user's intent. This can lead to:

1. Wasted time and resources when the agent implements the wrong thing
2. Frustration when output doesn't match expectations
3. Multiple iterations needed to correct misunderstandings
4. Lower confidence in the automated workflow system

The lack of a clarification checkpoint means users can't validate the agent's interpretation before work begins, leading to potential misalignment between what was requested and what gets implemented.

## Solution Statement

Introduce a new "Clarify" stage that sits between task creation and the backlog. When a task is created:

1. It automatically enters the "Clarify" stage
2. An AI agent analyzes the task description and generates a structured understanding including:
   - What is being requested (objective)
   - Key requirements identified
   - Assumptions being made
   - Questions or ambiguities that need clarification
3. This understanding is displayed to the user in an interactive modal
4. User can either:
   - Approve the understanding → task moves to backlog, trigger button becomes active
   - Request refinement → provide additional context, AI re-analyzes
   - Edit the task → modify description and re-trigger clarification
5. Only after approval can the task proceed through the normal workflow stages

This creates a verification gate that ensures alignment before any work begins, improving success rates and user confidence.

## Relevant Files

Use these files to implement the feature:

- `src/stores/kanbanStore.js` (lines 87-96) - Contains the stages array definition where we'll add the new "clarify" stage
- `src/stores/kanbanStore.js` - Contains task creation logic (`createTask` function) that needs to be modified to place new tasks in "clarify" stage by default
- `src/components/forms/TaskInput.jsx` - Task creation form that creates new tasks (needs to set initial stage to "clarify")
- `src/components/kanban/KanbanBoard.jsx` - Renders Kanban columns and cards, needs to handle the new "clarify" stage column
- `src/components/kanban/KanbanCard.jsx` - Individual card component that needs to show clarification status and disable triggers when not approved
- `src/components/forms/WorkflowTriggerModal.jsx` - Workflow trigger modal that needs to check if task has been clarified before allowing execution
- `src/services/websocket/websocketService.js` - WebSocket service for real-time communication with backend
- `adws/adw_modules/data_types.py` - Contains ADWWorkflow type definitions where we may need to add a clarification workflow
- `adws/stages/` - Directory containing stage implementations where we'll potentially add a clarify stage
- `app/server/api/` - Backend API endpoints for task operations that need to support clarification workflow
- `src/constants/workItems.js` - Constants file that may need clarification stage definitions

### New Files

- `src/components/forms/ClarificationModal.jsx` - New modal component to display AI understanding and collect user approval/feedback
- `adws/adw_clarify_iso.py` - New ADW script to run the clarification workflow in isolated environment
- `adws/stages/clarify_stage.py` - New stage implementation for the clarify stage in the orchestrator
- `.claude/commands/clarify.md` - New slash command for the clarification workflow
- `src/services/api/clarificationService.js` - New service to handle clarification API calls
- `src/components/kanban/__tests__/ClarificationModal.test.jsx` - Unit tests for ClarificationModal component
- `adws/utils/clarify/clarification_analyzer.py` - Utility to analyze task descriptions and generate understanding summaries
- `adws/utils/clarify/tests/test_clarification_analyzer.py` - Unit tests for clarification analyzer
- `src/test/e2e/issue-35-adw-2acdf549-e2e-clarification-workflow.md` - E2E test for the complete clarification flow

## Implementation Plan

### Phase 1: Foundation

First, establish the clarify stage infrastructure in both frontend and backend:

1. Add "clarify" stage to the Kanban board configuration in the frontend store
2. Create data types and constants for clarification status (pending, approved, needs_revision)
3. Modify task creation flow to automatically place new tasks in "clarify" stage
4. Update database schema if needed to store clarification metadata (understanding summary, approval status, revision history)

### Phase 2: Core Implementation

Implement the AI-powered clarification analysis and user interaction:

1. Create the clarification analyzer utility that uses Claude to analyze task descriptions
2. Build the ClarificationModal component to display AI understanding with approve/refine/edit actions
3. Implement the ADW clarify workflow script that orchestrates the analysis
4. Create the clarify stage for the orchestrator
5. Build the clarification service to handle API communication
6. Add WebSocket event handlers for real-time clarification status updates

### Phase 3: Integration

Connect all components and enforce clarification requirements:

1. Update WorkflowTriggerModal to check clarification approval status before allowing workflow execution
2. Modify KanbanCard to visually indicate clarification status (pending approval, approved, needs revision)
3. Integrate the ClarificationModal into the task creation flow
4. Add keyboard shortcuts and accessibility features to ClarificationModal
5. Implement auto-save for refinement feedback to prevent data loss

## Step by Step Tasks

### Task 1: Add Clarify Stage to Kanban Configuration

- Read `src/stores/kanbanStore.js` to understand current stage structure
- Add new "clarify" stage object to the stages array after backlog (or between task creation and backlog)
- Define stage properties: `{ id: 'clarify', name: 'Clarify', color: 'orange' }`
- Update TypeScript types if applicable

### Task 2: Create Clarification Data Types

- Create `src/types/clarification.js` (or add to existing types file) with:
  - ClarificationStatus enum: PENDING, APPROVED, NEEDS_REVISION
  - ClarificationResult interface with fields: understanding, requirements, assumptions, questions, status
- Update `adws/adw_modules/data_types.py` to add ClarificationResult model
- Add clarification metadata fields to task data structure

### Task 3: Create Clarification Analyzer Utility

- Create `adws/utils/clarify/clarification_analyzer.py`
- Implement `analyze_task_description(description: str) -> ClarificationResult` function
- Use Claude API to analyze the task description and extract:
  - Objective (what is being requested in 1-2 sentences)
  - Key requirements (bulleted list of specific requirements identified)
  - Assumptions (any assumptions the AI is making)
  - Questions (ambiguities or clarifications needed)
- Return structured ClarificationResult object
- Create corresponding unit tests in `adws/utils/clarify/tests/test_clarification_analyzer.py`

### Task 4: Create Clarify Slash Command

- Create `.claude/commands/clarify.md` with prompt template
- Template should instruct Claude to:
  - Analyze the task description thoroughly
  - Identify the core objective
  - Extract specific requirements
  - Note any assumptions being made
  - List questions or ambiguities
  - Return results in structured JSON format
- Test the command manually to validate output quality

### Task 5: Create ADW Clarify Workflow Script

- Create `adws/adw_clarify_iso.py` following existing workflow patterns
- Workflow should:
  - Accept task description as input
  - Create isolated worktree (or run in-place for lightweight operation)
  - Execute the `/clarify` slash command via agent
  - Parse and return the clarification result
  - Send WebSocket updates for real-time status
- Follow the same structure as other `adw_*_iso.py` scripts

### Task 6: Create Clarify Stage for Orchestrator

- Create `adws/stages/clarify_stage.py` extending BaseStage
- Implement `execute()` method to run the clarification workflow
- Define preconditions (task must have description)
- Handle success/failure states
- Create unit tests following existing stage test patterns

### Task 7: Build ClarificationModal Component

- Create `src/components/forms/ClarificationModal.jsx`
- Design brutalist UI matching existing modal styles (black borders, monospace font)
- Display sections for:
  - Original task description (read-only, for reference)
  - AI Understanding (Objective, Requirements, Assumptions, Questions)
  - Action buttons: Approve, Request Refinement, Edit Task
- Add refinement feedback textarea that appears when "Request Refinement" is clicked
- Implement keyboard shortcuts (Enter to approve, Esc to close)
- Add loading states while AI is analyzing

### Task 8: Create Clarification Service

- Create `src/services/api/clarificationService.js`
- Implement functions:
  - `requestClarification(taskId, description)` - Triggers clarification workflow
  - `approveClarification(taskId)` - Marks clarification as approved
  - `requestRefinement(taskId, feedback)` - Requests re-analysis with additional context
- Handle API errors and WebSocket fallbacks
- Follow existing service patterns in the codebase

### Task 9: Modify Task Creation Flow

- Update `src/components/forms/TaskInput.jsx`:
  - Set initial stage to "clarify" for all new tasks
  - After task creation, automatically trigger clarification workflow
  - Show loading indicator while clarification is in progress
- Update `src/stores/kanbanStore.js` `createTask` function:
  - Set task.stage = 'clarify'
  - Set task.metadata.clarificationStatus = 'pending'
  - Trigger clarification workflow via WebSocket

### Task 10: Update KanbanCard to Show Clarification Status

- Modify `src/components/kanban/KanbanCard.jsx`:
  - Add visual indicator for clarification status (orange border for pending, green checkmark for approved)
  - Show "Awaiting Clarification" badge when status is pending
  - Add click handler to open ClarificationModal when in clarify stage
  - Disable workflow trigger button if clarification not approved

### Task 11: Integrate ClarificationModal into Kanban Board

- Modify `src/components/kanban/KanbanBoard.jsx`:
  - Add state for managing ClarificationModal visibility
  - Pass clarification data to modal when opened
  - Handle approve/refine/edit actions from modal
  - Update task when clarification is approved (move to backlog)

### Task 12: Enforce Clarification in WorkflowTriggerModal

- Update `src/components/forms/WorkflowTriggerModal.jsx`:
  - Check task.metadata.clarificationStatus before allowing workflow execution
  - Show error message if status is not 'approved'
  - Add "Complete Clarification First" button that opens ClarificationModal
  - Disable workflow selection until clarification is complete

### Task 13: Add WebSocket Event Handlers

- Update `src/services/websocket/websocketService.js`:
  - Add handler for 'clarification_complete' event
  - Add handler for 'clarification_failed' event
  - Emit events when user approves/requests refinement
- Update backend WebSocket server to broadcast clarification events
- Test real-time updates work correctly

### Task 14: Add Clarification History Tracking

- Modify task metadata to store clarification history array
- Each history entry contains: timestamp, understanding snapshot, user feedback, status
- Display history in ClarificationModal for transparency
- Allow users to view previous clarification attempts

### Task 15: Add Validation and Error Handling

- Validate task description is not empty before allowing clarification
- Handle API timeouts gracefully (show retry option)
- Handle malformed AI responses (fallback to manual clarification)
- Add error boundary around ClarificationModal
- Show user-friendly error messages

### Task 16: Write Unit Tests for ClarificationModal

- Create `src/components/kanban/__tests__/ClarificationModal.test.jsx`
- Test rendering with different clarification results
- Test approve action updates task status
- Test refinement request shows feedback textarea
- Test edit action closes modal and opens task editor
- Test keyboard shortcuts work correctly
- Achieve >80% code coverage

### Task 17: Write Unit Tests for Clarification Analyzer

- Create `adws/utils/clarify/tests/test_clarification_analyzer.py`
- Test analysis with various task descriptions (clear, ambiguous, complex)
- Test extraction of requirements, assumptions, questions
- Test handling of empty or invalid input
- Mock Claude API calls for deterministic testing
- Achieve >90% code coverage

### Task 18: Write Integration Tests

- Create `src/test/integration/clarification-workflow.integration.test.js`
- Test complete flow: task creation → clarification → approval → backlog
- Test refinement request flow with feedback
- Test edit and re-clarify flow
- Test WebSocket event propagation
- Test concurrent clarification requests

### Task 19: Write E2E Tests

- Create `src/test/e2e/issue-35-adw-2acdf549-e2e-clarification-workflow.md`
- Test user creates task and sees it in clarify stage
- Test opening clarification modal from card
- Test reviewing AI understanding
- Test approving clarification moves task to backlog
- Test requesting refinement re-analyzes with additional context
- Test workflow trigger is disabled until clarification approved
- Test full end-to-end flow with Playwright

### Task 20: Run Validation Commands

- Execute all validation commands to ensure zero regressions
- Fix any test failures or build errors
- Verify all new tests pass
- Confirm E2E tests execute successfully

## Testing Strategy

### Unit Tests

#### Backend Unit Tests

**adws/utils/clarify/tests/test_clarification_analyzer.py**
- Test `analyze_task_description()` with various inputs:
  - Clear, well-defined task description
  - Vague or ambiguous description
  - Complex multi-requirement description
  - Empty or null description
  - Very long description (edge case)
- Test extraction accuracy of objectives, requirements, assumptions, questions
- Test error handling when AI API fails
- Mock Claude API calls to ensure deterministic tests
- Test parsing of AI response into ClarificationResult structure

**adws/stages/tests/test_clarify_stage.py**
- Test `execute()` method runs clarification workflow
- Test preconditions check for task description presence
- Test successful clarification returns correct StageResult
- Test failure handling when analyzer fails
- Test WebSocket event emission
- Test integration with orchestrator state machine

#### Frontend Unit Tests

**src/components/kanban/__tests__/ClarificationModal.test.jsx**
- Test modal renders with clarification data (objective, requirements, assumptions, questions)
- Test approve button updates task status and closes modal
- Test "Request Refinement" shows feedback textarea
- Test refinement submission triggers re-analysis
- Test edit button opens task editor
- Test keyboard shortcuts (Enter to approve, Esc to close)
- Test loading states during analysis
- Test error states and error messages
- Test accessibility (ARIA labels, focus management)

**src/services/api/__tests__/clarificationService.test.js**
- Test `requestClarification()` makes correct API call
- Test `approveClarification()` updates backend state
- Test `requestRefinement()` sends feedback correctly
- Test error handling and retry logic
- Test WebSocket fallback when API unavailable
- Mock API responses for deterministic tests

**src/stores/__tests__/kanbanStore.test.js** (update existing)
- Test task creation sets initial stage to "clarify"
- Test task metadata includes clarificationStatus
- Test clarification approval moves task to backlog
- Test refinement request updates clarification data
- Test clarification history is tracked correctly

#### Integration Tests

**src/test/integration/clarification-workflow.integration.test.js**
- Test complete happy path: create task → auto-clarify → approve → backlog → trigger workflow
- Test refinement flow: create → clarify → request refinement → re-clarify → approve
- Test edit flow: create → clarify → edit → re-clarify → approve
- Test WebSocket events propagate correctly across components
- Test concurrent clarification requests don't interfere
- Test clarification data persists across page reloads
- Test task with no description shows appropriate error

### E2E Tests

**src/test/e2e/issue-35-adw-2acdf549-e2e-clarification-workflow.md**

Complete end-to-end test covering:

1. **Task Creation with Clarification**
   - User opens task creation modal
   - User enters task description "Add user authentication with JWT tokens"
   - User clicks "Create Task"
   - Verify task appears in "Clarify" stage column
   - Verify clarification workflow starts automatically

2. **Viewing Clarification Results**
   - User clicks on task card in clarify stage
   - ClarificationModal opens showing AI understanding
   - Verify modal displays:
     - Original description
     - Objective section with clear summary
     - Requirements list with extracted requirements
     - Assumptions list
     - Questions section (if any ambiguities)
   - Verify approve/refine/edit buttons are visible

3. **Approving Clarification**
   - User reviews AI understanding
   - User clicks "Approve" button
   - Verify success toast appears
   - Verify task moves from "Clarify" to "Backlog" column
   - Verify green checkmark appears on task card
   - Verify workflow trigger button becomes enabled

4. **Requesting Refinement**
   - User creates new task with vague description
   - User opens clarification modal
   - User clicks "Request Refinement"
   - Feedback textarea appears
   - User enters additional context
   - User submits refinement request
   - Verify modal shows loading state
   - Verify updated understanding appears
   - User approves refined understanding
   - Verify task moves to backlog

5. **Workflow Trigger Validation**
   - User creates task in clarify stage (not yet approved)
   - User clicks "Trigger Workflow" button
   - Verify error message: "Please complete clarification first"
   - Verify workflow selection is disabled
   - User completes clarification
   - User clicks "Trigger Workflow" again
   - Verify workflow selection is now enabled

6. **Edit and Re-Clarify**
   - User creates task
   - User reviews clarification
   - User decides to edit description
   - User clicks "Edit Task"
   - Task editor opens with current description
   - User modifies description
   - User saves changes
   - Verify clarification runs again automatically
   - User approves new clarification
   - Task moves to backlog

### Edge Cases

- **Empty Task Description**: System should prevent clarification and show validation error
- **Very Long Description**: Should handle descriptions >5000 characters gracefully, possibly with truncation or chunking
- **AI API Timeout**: Should show retry button and preserve user state
- **Malformed AI Response**: Should fall back to manual clarification or show error
- **Concurrent Refinements**: If user requests multiple refinements rapidly, should queue or debounce
- **Page Refresh During Clarification**: Should resume clarification process when page reloads
- **WebSocket Disconnect**: Should fall back to polling or show "working offline" indicator
- **Multiple Users Clarifying Same Task**: Should handle concurrent access with optimistic locking or last-write-wins
- **Task Deleted During Clarification**: Should handle gracefully and cancel in-flight requests
- **Clarification for Imported Tasks**: Tasks imported from GitHub should also go through clarification flow
- **Editing Approved Task**: Should re-trigger clarification if description changes after approval

## Acceptance Criteria

- [ ] New "Clarify" stage appears in Kanban board between task creation and backlog
- [ ] When user creates task, it automatically enters "Clarify" stage and analysis begins
- [ ] ClarificationModal displays AI's understanding including objective, requirements, assumptions, and questions
- [ ] User can approve clarification, moving task to backlog with green checkmark indicator
- [ ] User can request refinement with additional feedback, triggering re-analysis
- [ ] User can edit task, which triggers fresh clarification analysis
- [ ] Workflow trigger button remains disabled until clarification is approved
- [ ] WorkflowTriggerModal shows clear error message when attempting to trigger without approval
- [ ] Clarification status is visually indicated on task cards (orange border for pending, green check for approved)
- [ ] WebSocket events provide real-time updates for clarification status changes
- [ ] Clarification history is tracked and viewable for transparency
- [ ] System handles errors gracefully (API timeouts, malformed responses, network issues)
- [ ] All unit tests pass with >80% code coverage for new components
- [ ] Integration tests confirm complete flow works end-to-end
- [ ] E2E tests validate user journey from task creation through clarification to workflow execution
- [ ] Zero regressions in existing functionality

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `cd adws && uv run pytest adws/utils/clarify/tests/test_clarification_analyzer.py -v` - Run clarification analyzer unit tests
- `cd adws && uv run pytest adws/stages/tests/test_clarify_stage.py -v` - Run clarify stage unit tests
- `cd app/server && uv run pytest` - Run all server tests to validate no regressions
- `bun test src/components/kanban/__tests__/ClarificationModal.test.jsx` - Run ClarificationModal component tests
- `bun test src/services/api/__tests__/clarificationService.test.js` - Run clarification service tests
- `bun test src/stores/__tests__/kanbanStore.test.js` - Run store tests with clarification changes
- `bun test src/test/integration/clarification-workflow.integration.test.js` - Run integration tests
- `bun tsc --noEmit` - Run TypeScript type checking to ensure no type errors
- `bun run build` - Run frontend build to validate no build errors
- `bun run test:e2e -- src/test/e2e/issue-35-adw-2acdf549-e2e-clarification-workflow.md` - Run E2E test for clarification workflow

## Notes

### Implementation Considerations

1. **Performance**: The clarification analysis should complete within 5-10 seconds. Consider implementing:
   - Loading indicators with progress updates
   - Ability to cancel in-flight clarification requests
   - Caching of clarification results to avoid re-analysis on page refresh

2. **AI Prompt Engineering**: The `/clarify` slash command prompt is critical for quality output. Consider:
   - Few-shot examples to guide Claude's response format
   - Clear instructions to extract specific, actionable requirements
   - Guidance to identify ambiguities rather than make assumptions
   - JSON schema validation for structured output

3. **User Experience**: Make clarification feel helpful, not burdensome:
   - Auto-approve simple, unambiguous tasks with high confidence scores
   - Allow users to skip clarification for very simple tasks (with confirmation)
   - Pre-populate refinement feedback with suggested questions
   - Show diff when description changes after refinement

4. **Data Privacy**: If storing clarification history:
   - Consider data retention policies
   - Allow users to clear clarification history
   - Ensure sensitive information in feedback is handled securely

5. **Extensibility**: Design for future enhancements:
   - Support multiple clarification rounds (current design supports this via refinement)
   - Allow manual clarification notes without AI (for offline scenarios)
   - Enable clarification templates for common task types
   - Add confidence scores to AI understanding (low confidence triggers auto-refinement)

### Future Enhancements (Out of Scope)

- **Clarification Templates**: Pre-defined clarification structures for common task types (feature, bug, chore)
- **Collaborative Clarification**: Allow multiple users to contribute to clarification feedback
- **Confidence Scoring**: AI assigns confidence score to its understanding; low scores auto-request refinement
- **Smart Suggestions**: AI suggests missing requirements based on project context
- **Voice Input**: Allow users to provide clarification feedback via voice recording
- **Clarification Analytics**: Track clarification success rates, common ambiguities, refinement patterns
- **Auto-Skip for Simple Tasks**: High-confidence simple tasks auto-approve to reduce friction
- **Clarification Diff View**: Visual diff showing what changed between clarification rounds

### Related Features

This feature lays groundwork for:
- Automated requirement extraction for planning
- Context-aware suggestions during task creation
- Quality gates at other workflow stages
- Better integration with external issue trackers (GitHub, Jira)
