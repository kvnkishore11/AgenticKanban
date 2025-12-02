# Patch: Fix Failing Tests in Agent Thinking Display Feature

## Metadata
adw_id: `cf7877e5`
review_change_request: `please try to fix the issue and continue from where u left`

## Issue Summary
**Original Spec:** specs/issue-2-adw-cf7877e5-sdlc_planner-improve-agent-thinking-display.md
**Issue:** The agent thinking display feature has 6 failing tests that need to be fixed before the feature can be considered complete. The failures include 5 timeout issues in AgentLogsPanel smart auto-scroll tests and 1 assertion failure in CardExpandModal body scroll test.
**Solution:** Fix the test timeouts by adjusting the test setup and timing expectations, and fix the body scroll assertion by properly handling the overflow style in the modal component.

## Files to Modify
Use these files to implement the patch:

- `src/components/kanban/__tests__/AgentLogsPanel.test.jsx` - Fix 5 timeout issues in smart auto-scroll behavior tests
- `src/components/kanban/__tests__/CardExpandModal.test.jsx` - Fix body scroll overflow assertion
- `src/components/kanban/AgentLogsPanel.jsx` - Potentially adjust implementation if tests reveal issues
- `src/components/kanban/CardExpandModal.jsx` - Ensure body overflow is properly set when modal opens

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Investigate Failing Tests
- Read `src/components/kanban/__tests__/AgentLogsPanel.test.jsx` to understand the 5 timeout failures in the "Smart Auto-Scroll Behavior" suite
- Read `src/components/kanban/__tests__/CardExpandModal.test.jsx` to understand the body scroll overflow assertion failure
- Read the actual implementations in `src/components/kanban/AgentLogsPanel.jsx` and `src/components/kanban/CardExpandModal.jsx` to identify root causes

### Step 2: Fix CardExpandModal Body Scroll Test
- Examine the modal's useEffect that manages body overflow (should set `document.body.style.overflow = 'hidden'` when modal is open)
- Verify that the useEffect is properly setting the body overflow style
- If implementation is missing or incorrect, update `src/components/kanban/CardExpandModal.jsx` to properly set `document.body.style.overflow = 'hidden'` on mount and reset on unmount
- Update test expectations in `src/components/kanban/__tests__/CardExpandModal.test.jsx` if necessary to wait for effect execution

### Step 3: Fix AgentLogsPanel Auto-Scroll Timeout Tests
- Analyze why the 5 smart auto-scroll tests are timing out (likely waitFor conditions not being met)
- The failing tests are:
  1. "should auto-scroll when new logs arrive and user is at bottom"
  2. "should not auto-scroll when user has scrolled away from bottom"
  3. "should show new logs counter when user is scrolled away"
  4. "should clear new logs counter when user clicks jump to latest"
  5. "should re-enable auto-scroll when user scrolls back to bottom"
- Common causes: DOM queries not finding elements, scroll position checks failing, timing issues with polling/updates
- Review the scroll position detection logic in `src/components/kanban/AgentLogsPanel.jsx`
- Update test setup to properly mock scroll properties (scrollTop, scrollHeight, clientHeight) for JSDOM environment
- Adjust test waitFor conditions to have appropriate timeouts and intervals
- Fix any race conditions between polling intervals and test expectations

### Step 4: Update Test Mocks and Setup
- Ensure scroll-related DOM properties are properly mocked in JSDOM test environment
- Add proper mock setup for scroll event listeners
- Verify that the log polling interval (3 seconds) doesn't conflict with test timeouts
- Consider using fake timers (vi.useFakeTimers()) to control polling timing in tests

### Step 5: Run Tests Iteratively
- Run `npm run test -- src/components/kanban/__tests__/CardExpandModal.test.jsx` to verify modal test fix
- Run `npm run test -- src/components/kanban/__tests__/AgentLogsPanel.test.jsx` to verify auto-scroll test fixes
- Fix any remaining issues identified during test runs
- Ensure all tests pass consistently

### Step 6: Validate Complete Test Suite
- Run full test suite with `npm run test` to ensure no regressions
- Verify that all 6 previously failing tests now pass
- Ensure no new test failures were introduced

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. `npm run test -- src/components/kanban/__tests__/CardExpandModal.test.jsx` - Verify modal test passes
2. `npm run test -- src/components/kanban/__tests__/AgentLogsPanel.test.jsx` - Verify all auto-scroll tests pass
3. `npm run test` - Run full test suite to ensure no regressions
4. `npm run typecheck` - Verify no TypeScript errors
5. `npm run build` - Ensure production build succeeds

## Patch Scope
**Lines of code to change:** ~50-100 (primarily test fixes, minimal implementation changes)
**Risk level:** low (test fixes with minimal implementation impact)
**Testing required:** Unit tests for AgentLogsPanel and CardExpandModal components must all pass
