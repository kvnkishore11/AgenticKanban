# Bug: Card Expand Modal Showing Within Card Instead of as Modal

## Metadata
issue_number: `40`
adw_id: `97464c72`
issue_json: `{"number":40,"title":"Thsi si what happens when I expand it","body":"Thsi si what happens when I expand it. ideally it should open a model and show the details in it. but it is showing within the card itself. this is nto expected. try to fix this\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/2c3d5e14-1a8e-46a0-9067-aa167e502962)\n\n"}`

## Bug Description
When a user clicks on a Kanban card to expand it, the expanded content is displaying within the card itself instead of opening as a proper modal overlay. The expected behavior is that clicking a card should open a large modal (70% width x 90% height) that overlays the entire screen with a backdrop, showing comprehensive card information including workflow status, logs, metadata, and actions. Currently, the expanded details are rendering inline within the card component itself.

## Problem Statement
The card expand functionality is not working correctly - the modal is rendering inside the card instead of as a separate overlay modal that covers the screen. This makes the expanded view cramped and unusable, as it's constrained by the card's dimensions rather than displaying as a full-screen modal dialog.

## Solution Statement
Fix the modal rendering by ensuring the `CardExpandModal` component is rendered at the correct DOM level using React portals. The modal should render as a direct child of the document body, not nested within the card component's DOM hierarchy. This will allow it to properly overlay the entire screen with the backdrop and display at the correct z-index level.

## Steps to Reproduce
1. Start the application (frontend on port 5173, backend on port 8001, WebSocket on port 3000)
2. Navigate to http://localhost:5173
3. Locate any Kanban card on the board
4. Click on the card or click the expand button (Maximize2 icon)
5. Observe that the expanded content shows within the card itself instead of opening as a modal overlay

## Root Cause Analysis
The issue is caused by the `CardExpandModal` component being rendered directly in the JSX tree of the `KanbanCard` component (lines 364-372 in KanbanCard.jsx). When React renders this modal, it's placed within the card's DOM hierarchy. The modal's CSS uses `position: fixed` with `inset-0` to cover the screen, but because it's nested within the card's DOM structure which may have positioning contexts (transform, will-change, etc.), the fixed positioning is relative to the card container instead of the viewport.

The card component has CSS properties like:
- `position: relative` (line 167 in kanban.css)
- `overflow: hidden` (line 168 in kanban.css)
- `will-change: transform, box-shadow` (line 169 in kanban.css)

These properties create a new stacking context that prevents the modal from properly rendering at the viewport level. The `will-change: transform` specifically creates a containing block for fixed position elements, making the modal render relative to the card instead of the viewport.

## Relevant Files
Use these files to fix the bug:

- `src/components/kanban/KanbanCard.jsx` - The parent card component that renders the modal. Need to use React portal to render modal outside the card's DOM hierarchy (lines 364-372).
- `src/components/kanban/CardExpandModal.jsx` - The modal component itself. May need minor adjustments to ensure it works correctly when rendered via portal.
- `src/styles/kanban.css` - Contains the kanban card styling (lines 160-223) and modal styling (lines 866-991). The card's CSS properties are creating a stacking context that traps the modal.

### New Files
- `.claude/commands/e2e/test_card_expand_modal.md` - E2E test file to validate the card expand modal functionality works correctly

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Fix Modal Rendering Using React Portal
- Import `createPortal` from `react-dom` in `src/components/kanban/KanbanCard.jsx`
- Modify the modal rendering (lines 364-372) to use `createPortal` to render the `CardExpandModal` as a direct child of `document.body`
- This ensures the modal breaks out of the card's DOM hierarchy and renders at the correct level
- Example: `{showExpandModal && createPortal(<CardExpandModal ... />, document.body)}`

### 2. Verify Modal Component Portal Compatibility
- Review `src/components/kanban/CardExpandModal.jsx` to ensure it works correctly when rendered via portal
- Confirm the modal's overlay and container structure is correct (lines 178-196)
- Ensure the modal's z-index and positioning styles allow it to overlay properly
- Verify the `onClick` handlers for closing the modal work correctly (overlay click and close button)

### 3. Test Modal Functionality Locally
- Start the development server: `npm run dev`
- Start the backend: `cd app/server && uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001`
- Start WebSocket: `python start-websocket.py`
- Navigate to http://localhost:5173
- Create or locate a test card
- Click the expand button or click on the card
- Verify the modal opens as a full-screen overlay with backdrop
- Verify all modal interactions work: close button, escape key, overlay click
- Verify the modal displays all expected sections: card info, workflow status, logs, actions

### 4. Create E2E Test File
- Read `.claude/commands/e2e/test_basic_query.md` and `.claude/commands/test_e2e.md` to understand how to create an E2E test file
- Create a new E2E test file in `.claude/commands/e2e/test_card_expand_modal.md` that validates:
  - Card can be clicked to expand
  - Modal opens as a full-screen overlay (not within the card)
  - Modal displays with correct dimensions (70vw x 90vh)
  - Modal backdrop is visible and covers the screen
  - Modal can be closed via close button
  - Modal can be closed via escape key
  - Modal can be closed by clicking the backdrop
  - All modal sections are visible: header, card info, workflow status, logs, actions
  - Take screenshots at key steps to prove the bug is fixed
- The test should include before and after screenshots showing the modal rendering correctly

### 5. Run Validation Commands
- Execute all validation commands listed in the `Validation Commands` section below
- Ensure all tests pass with zero errors
- Read `.claude/commands/test_e2e.md`, then read and execute the new `.claude/commands/e2e/test_card_expand_modal.md` test file to validate the fix

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `bun tsc --noEmit` - Run TypeScript type checking to ensure no type errors
- `bun run build` - Run frontend build to validate the bug is fixed with zero regressions
- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_card_expand_modal.md` test file to validate the modal functionality works correctly with screenshots proving the fix

## Notes
- The key to fixing this bug is using React's `createPortal` API to render the modal outside the card's DOM hierarchy
- React portals allow rendering children into a DOM node that exists outside the parent component's DOM hierarchy
- This is the standard React pattern for modals, tooltips, and other overlay components
- The bug was introduced in commit `4be1712` when the card expand modal was added
- The modal component itself (CardExpandModal.jsx) is well-structured and should work correctly once rendered via portal
- The CSS for the modal is already correct (lines 866-991 in kanban.css) - it just needs to be rendered at the right DOM level
- No new libraries are needed - `react-dom` is already a dependency
- This is a minimal, surgical fix that only changes how the modal is rendered, not what it renders
