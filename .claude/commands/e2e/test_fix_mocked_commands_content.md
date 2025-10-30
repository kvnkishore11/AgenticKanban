# E2E Test: Commands Show Real Content Instead of Mock Content

Test that the Commands Palette displays actual command content from `.md` files instead of generic mock content.

## User Story

As a user
I want to see the actual command instructions when I open commands in the Commands Palette
So that I can understand what each command does based on its real documentation

## Test Steps

1. Navigate to the `Application URL` (should be running on localhost:5174)
2. Take a screenshot of the initial state
3. **Verify** the AgenticKanban application loads successfully
4. **Verify** the Commands Palette toggle button is visible
5. Click the Commands Palette toggle button to open it
6. Take a screenshot of the Commands Palette in open state
7. **Verify** the Commands list shows available commands (e.g., `/bug`, `/feature`, `/test`)
8. Click on the `/bug` command to view its content
9. Take a screenshot of the `/bug` command content
10. **Verify** the content contains real command instructions, NOT mock content:
    - Should contain "Bug Planning" heading
    - Should contain "Variables" section with issue_number, adw_id, issue_json
    - Should contain "Instructions" section with detailed planning steps
    - Should contain "Plan Format" section
    - Should NOT contain text like "This is a mock command for demonstration purposes"
    - Should NOT contain text like "mock content generated for development purposes"
11. Click on the `/feature` command to view its content
12. Take a screenshot of the `/feature` command content
13. **Verify** the `/feature` content contains real instructions:
    - Should contain "Feature Planning" heading
    - Should contain detailed instructions for creating feature plans
    - Should NOT contain mock content text
14. Check browser DevTools Console tab for any errors
15. **Verify** no API-related errors appear in console (no 404 errors for `/api/commands/read`)
16. Take a screenshot of the browser console showing no errors
17. Close the Commands Palette

## Success Criteria
- Commands Palette opens and displays available commands
- Individual command content shows real markdown content from `.claude/commands/*.md` files
- No mock content is displayed (no "This is a mock command" text)
- No API-related errors in browser console
- Command content includes proper headings, sections, and detailed instructions
- Token counts are calculated correctly for real content
- 4 screenshots are taken documenting the functionality

## Expected Real Content Indicators
- `/bug` command should contain "Create a new plan to resolve the `Bug`"
- `/feature` command should contain "Create a new plan to implement the `Feature`"
- Both commands should contain detailed "Plan Format" sections with placeholders
- Content should be substantial (not just a few generic lines)

## Mock Content Indicators (Should NOT be present)
- Text containing "This is a mock command for demonstration purposes"
- Text containing "mock content generated for development purposes"
- Generic descriptions like "This command is part of the AgenticKanban workflow system"
- File path references like "File path: ${commandPath}"
- Generic parameter examples that don't match the actual command structure