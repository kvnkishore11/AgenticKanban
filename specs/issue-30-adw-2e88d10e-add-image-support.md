# Feature: Add Image Support to AgenticKanban and ADW System

## Metadata
issue_number: `30`
adw_id: `2e88d10e`
issue_json: `{"number":30,"title":"when ever I am writing my highlevel prompt usign t...","body":"when ever I am writing my highlevel prompt usign the new ticket -> description box, i also add some images. I want to ensure that the images are also passed by my kanban and the wesocket -> adw system should be able to pass on this images just like claude code cli is able to send the images. add this functionality(in my agentickanban and also the adw system)"}`

## Feature Description
Enable the AgenticKanban application to pass images with annotations from the ticket creation interface through the WebSocket connection to the ADW (AI Developer Workflow) system. The ADW system should then include these images in its planning and implementation phases, similar to how Claude Code CLI handles images. This will allow users to provide visual context when creating tickets, which will be preserved and utilized throughout the entire development workflow.

## User Story
As a developer using AgenticKanban
I want to attach images with annotations when creating tickets
So that the AI system can use visual context to better understand and implement my requirements

## Problem Statement
Currently, users can add images with annotations when creating tickets in the AgenticKanban interface. However, these images are not being passed through the WebSocket connection to the ADW system. This means the AI loses valuable visual context that could help it better understand requirements and generate more accurate implementations. The images are captured but not utilized throughout the workflow pipeline.

## Solution Statement
Enhance the data flow from AgenticKanban to ADW to include images. The WebSocket service will be updated to include images in the issue_json payload. The ADW system will be enhanced to extract and format images from kanban data, making them available to the AI agents during planning and implementation phases. Images will be converted to a format compatible with Claude Code's markdown image handling.

## Relevant Files
Use these files to implement the feature:

- `src/services/websocket/websocketService.js` - Update triggerWorkflowForTask to include images in issue_json
- `src/stores/kanbanStore.js` - Already stores images, verify data flow
- `src/components/forms/TaskInput.jsx` - Already captures images, no changes needed
- `adws/adw_modules/kanban_mode.py` - Update create_kanban_issue_from_data to handle images
- `adws/adw_triggers/websocket_models.py` - Ensure models can handle images in issue_json
- `adws/adw_modules/workflow_ops.py` - Update build_plan to include images in prompt
- `.claude/commands/test_e2e.md` - Reference for E2E test structure
- `.claude/commands/e2e/test_basic_query.md` - Reference for E2E test examples

### New Files
- `.claude/commands/e2e/test_image_support.md` - E2E test for image support feature

## Implementation Plan
### Phase 1: Foundation
Ensure data models and structures support images throughout the pipeline. Update WebSocket communication to include image data in payloads.

### Phase 2: Core Implementation
Modify the WebSocket service to include images when triggering workflows. Update ADW kanban mode to extract and format images for AI consumption. Enhance the planning phase to include images in the context provided to Claude Code.

### Phase 3: Integration
Test the complete flow from UI to ADW. Ensure images are properly formatted for Claude Code markdown. Verify the AI can reference and use images in its responses.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Task 1: Create E2E Test Specification
- Read `.claude/commands/test_e2e.md` to understand E2E test structure
- Read `.claude/commands/e2e/test_basic_query.md` and `.claude/commands/e2e/test_complex_query.md` for examples
- Create `.claude/commands/e2e/test_image_support.md` with steps to test image upload and processing

### Task 2: Update WebSocket Service to Include Images
- Modify `src/services/websocket/websocketService.js`
- In the `triggerWorkflowForTask` method, update the request object to include images from the task
- Ensure images and their annotations are included in the issue_json field

### Task 3: Enhance ADW Kanban Mode for Image Support
- Update `adws/adw_modules/kanban_mode.py`
- Modify `create_kanban_issue_from_data` function to extract images from issue_json
- Format images as markdown-compatible strings with base64 encoding or URLs

### Task 4: Add Image Handling Utilities
- Create helper functions in `adws/adw_modules/kanban_mode.py` to:
  - Convert image objects to markdown format
  - Handle image annotations as markdown comments
  - Generate a combined body text with images embedded

### Task 5: Update Workflow Operations for Images
- Modify `adws/adw_modules/workflow_ops.py`
- Update the `build_plan` function to include images in the issue body passed to Claude Code
- Ensure images are formatted in a way Claude Code can interpret

### Task 6: Test Frontend to Backend Image Flow
- Verify images are captured in TaskInput component
- Confirm images are stored in kanbanStore
- Test that images are sent through WebSocket
- Validate images arrive in ADW system

### Task 7: Test ADW Image Processing
- Test that ADW correctly extracts images from kanban data
- Verify images are formatted for Claude Code
- Confirm planning phase includes images in context
- Test that Claude Code receives and can reference images

### Task 8: Run E2E Tests
- Read `.claude/commands/test_e2e.md`
- Execute the new E2E test `.claude/commands/e2e/test_image_support.md`
- Capture screenshots showing image support working end-to-end

### Task 9: Run Validation Commands
Execute the validation commands to ensure no regressions and feature works correctly.

## Testing Strategy
### Unit Tests
- Test image extraction from kanban data in ADW
- Test image formatting for Claude Code markdown
- Test WebSocket payload includes images
- Test image annotation conversion to markdown

### Edge Cases
- Empty image array
- Images without annotations
- Images with multiple annotations
- Large image files (base64 encoding size)
- Invalid image formats
- Missing image metadata

## Acceptance Criteria
- Users can add images with annotations in the ticket creation UI
- Images are successfully transmitted through WebSocket to ADW
- ADW extracts and formats images from kanban data
- Claude Code receives images in planning prompts
- Images are referenced in generated plans and implementations
- Image annotations are preserved and accessible to AI
- System handles edge cases gracefully
- No performance degradation with reasonable image sizes

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `cd src && npm test` - Run frontend tests if available
- `bun tsc --noEmit` - Run TypeScript compilation check from project root
- `bun run build` - Run frontend build to validate no build errors
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_image_support.md` test file to validate image support functionality works

## Notes
- Images should be converted to base64 format or served as data URLs for transmission through WebSocket
- Consider size limitations for base64 encoded images in JSON payloads
- Claude Code supports markdown image syntax: `![alt text](data:image/png;base64,...)` or `![alt text](url)`
- Image annotations should be preserved as they provide important context for the AI
- Future enhancement: Consider implementing image compression or optimization before transmission
- Ensure sensitive information in images is handled appropriately
- The implementation should gracefully degrade if images cannot be processed