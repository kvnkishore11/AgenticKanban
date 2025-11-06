# Chore: Improve Card UI Display

## Metadata
issue_number: `51`
adw_id: `eb9b8b75`
issue_json: `{"number":51,"title":"with in the card we dont have to have adw id  text...","body":"with in the card we dont have to have adw id  text -> it is understood. just have its value. \n2. instead of Copy text lets have the copy icon which was used somewhere in the expaned card.\n3. instead of adw:plan -> Implemtn -> and all lets have P | B . boxed. bold. to show the stages of this card. \ntitle should be something else because you are just using the starting sentences of description. see if you able to use a short summary if it is available. \n4. towards the end may be you can just show the substage that is happening right now\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/43e7b45e-1f2e-4660-9724-93be42869ad0)\n\n"}`

## Chore Description
Improve the visual display of task cards in the Kanban board by implementing the following UI enhancements:

1. **Remove "ADW ID:" label text** - Display only the ADW ID value since the label is understood from context
2. **Replace "Copy" text with Copy icon** - Use the Copy icon from lucide-react (already used in CardExpandModal) instead of text for a cleaner look
3. **Replace pipeline display with abbreviated stage badges** - Instead of "ADW: Plan → Implement → Test", display compact boxed badges like "P | B | T" with bold text and borders to show workflow stages
4. **Improve title display** - Currently using the first few sentences of description as title; use a short summary if available from task metadata
5. **Show current substage** - Display the current substage/step that is actively running at the end of the card

These changes will make cards more compact, visually appealing, and easier to scan at a glance while maintaining all critical information.

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/KanbanCard.jsx` - Main card component that displays task cards in the Kanban board
  - Lines 144-184: ADW Header section with ADW ID display and copy button - needs to remove "ADW ID:" text (line 148) and replace "Copy" text with Copy icon (lines 152-162)
  - Lines 48-62: `formatPipelineName` function that creates "ADW: Plan → Implement → Test" format - needs to be replaced with abbreviated stage badges
  - Lines 189-190: Title display using `task.title` - may need logic to use summary if available from task metadata
  - Lines 64-78: `getStatusIcon` function shows workflow status - needs enhancement to show current substage information
  - Lines 270-277: Description section that could be used to display current substage

- `src/components/kanban/CardExpandModal.jsx` - Reference for Copy icon implementation
  - Line 22: Import statement shows `Copy` icon from lucide-react
  - Lines 393-401: Example of Copy icon button implementation for ADW ID

- `src/index.css` - Contains CSS custom properties and utility classes for styling
  - Lines 40-45: Shadow utility variables that can be used for boxed stage badges
  - Lines 74-89: Font and text utility classes for bold and sized text

### New Files
No new files need to be created for this chore.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Update ADW ID Display
- Remove "ADW ID:" label text from KanbanCard.jsx line 148
- Keep only the ADW ID value in the badge/box display
- Ensure the styling remains clean and the value is still clearly identifiable

### 2. Replace Copy Text with Copy Icon
- Import `Copy` icon from lucide-react in KanbanCard.jsx (add to existing import statement at line 15-30)
- Replace the "Copy" text button (lines 152-162) with a Copy icon button
- Reference CardExpandModal.jsx lines 393-401 for the icon implementation pattern
- Maintain the same functionality (copy to clipboard) and hover states
- Ensure proper sizing (h-3 w-3 or h-4 w-4) to match card aesthetics

### 3. Implement Abbreviated Stage Badges
- Create a new function `getStageAbbreviation(stage)` that maps stage names to single-letter abbreviations:
  - "plan" → "P"
  - "build" → "B"
  - "implement" → "I"
  - "test" → "T"
  - "review" → "R"
  - "document" → "D"
  - "pr" → "PR"
  - Handle any other stages appropriately
- Create a new function `renderStageBadges(pipelineId)` that:
  - Parses the pipeline ID (e.g., "adw_plan_build_test")
  - Extracts the stage names
  - Returns JSX rendering each stage as a compact badge with:
    - Bold text (font-bold)
    - Border/box styling (border border-gray-400 rounded px-1.5 py-0.5)
    - Separated by vertical bars (|)
    - Proper spacing (space-x-1)
- Replace the current pipeline display format at line 195 with the new badge rendering
- Use TailwindCSS utility classes for styling (font-bold, border, rounded, px, py, text-xs)
- Add shadow classes for depth (shadow-sm) to make badges stand out

### 4. Enhance Title Display with Summary Support
- Check if `task.metadata?.summary` exists and is non-empty
- If summary exists, use it as the title; otherwise fall back to `task.title`
- Update the title rendering at lines 189-190 to implement this logic
- Ensure truncation still works properly with the `truncate` class

### 5. Display Current Substage Information
- Add current substage/step display at the end of the card (after description section, around line 277)
- Check for `workflowProgress?.currentStep` from the store (similar to CardExpandModal line 363)
- If current step exists and workflow is in progress, render a compact substage indicator:
  - Use small text (text-xs)
  - Include an activity indicator icon or dot
  - Display format: "Currently: {currentStep}"
  - Style with subtle background (bg-blue-50) and text color (text-blue-700)
- Only show if task has an active workflow running (not completed or errored)

### 6. Test UI Changes
- Start the development server and verify all changes render correctly
- Test with cards that have:
  - ADW IDs
  - Various pipeline configurations (plan only, plan+build, full SDLC)
  - Tasks with and without summaries in metadata
  - Active workflows with current steps
  - Completed and errored workflows
- Verify copy functionality still works with icon button
- Ensure stage badges are readable and properly styled
- Confirm current substage displays correctly for in-progress workflows

### 7. Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Fix any TypeScript errors or linting issues
- Verify backend tests still pass

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript type checking passes
- `npm run lint` - Ensure ESLint passes with no errors
- `cd app/server && uv run pytest` - Run server tests to validate no backend regressions
- Manual testing:
  - Start the application with `npm run dev` and `cd app/server && uv run uvicorn server:app --reload --port 8001`
  - Create/view cards with ADW IDs and verify UI improvements
  - Test copy icon functionality
  - Verify stage badges display correctly for different pipelines
  - Check substage display for active workflows

## Notes
- The Copy icon from lucide-react is already imported in CardExpandModal.jsx, use the same pattern
- Stage abbreviations should be intuitive and consistent (single letters where possible)
- Badge styling should use existing TailwindCSS utilities to maintain consistency with the design system
- The current substage feature depends on workflow progress data being available in the store via `getWorkflowProgressForTask`
- Consider using `font-bold` and `shadow-sm` classes to make stage badges prominent but not overwhelming
- Maintain accessibility by ensuring icon buttons have proper `title` attributes for tooltips
- The issue mentions an attached image but it's a blob URL that cannot be accessed; rely on the text description for requirements
