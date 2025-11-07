# Chore: Update Card Header Styling

## Metadata
issue_number: `68`
adw_id: `02fe1ed4`
issue_json: `{"number":68,"title":"I dont wnat this dark colour for the headers of th...","body":"I dont wnat this dark colour for the headers of the cards. Also remove # before teh issue number.Issue number before P B can be removed sinc it is redundant .probably the 67 i.e the issuenumber can also have a box around but with a differnt background colour and can be almost mixed with the adw\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/66c67bea-a251-46d4-ac3e-f86ea294b7c9)\n\n"}`

## Chore Description
Update the card header styling to improve visual presentation and reduce redundancy:

1. **Remove dark background color** from card headers (currently using #1e293b slate color)
2. **Remove "#" prefix** from issue numbers displayed throughout the application
3. **Remove redundant issue number** display before stage badges (P, B, T) since it's already shown in the ADW header
4. **Add styled box around issue number** with a different background color that blends better with the ADW ID display

The current implementation has a dark slate background (#1e293b) on the ADW header which the user doesn't want. Issue numbers are shown with "#" prefix in multiple locations, and the issue number appears redundantly in the card header when it's already shown in the ADW header above.

## Relevant Files
Use these files to resolve the chore:

- **src/components/kanban/KanbanCard.jsx** - Main card component that renders the card headers
  - Line 193: ADW header section with dark styling (`className="adw-header"`)
  - Line 197: Issue number display with "#" prefix in ADW header (`#{task.id}`)
  - Line 258: Redundant issue number display in card header (`#{task.id}`)
  - Lines 260-264: Stage badges section where issue number appears redundantly
  - Lines 100-112: `getStageAbbreviation` function that defines P, B, T labels
  - Lines 114-141: `renderStageBadges` function that renders the stage badges

- **src/styles/kanban.css** - Stylesheet containing ADW header styling
  - Lines 177-202: `.adw-header` class with dark background color (#1e293b)
  - This styling needs to be updated to use a lighter background color

- **src/components/kanban/CardExpandModal.jsx** - Expanded card view modal
  - Line 237: Issue number display with "#" prefix (`#{task.id}`)
  - Needs to be updated to remove the "#" prefix

- **src/components/kanban/TaskDetailsModal.jsx** - Task details modal
  - Line 202: Issue number display with "#" prefix (`#{task.id}`)
  - Needs to be updated to remove the "#" prefix

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update ADW Header Background Color in CSS
- Open `src/styles/kanban.css`
- Locate the `.adw-header` class definition (lines 177-187)
- Change the background color from dark slate (#1e293b) to a lighter color that works well with the UI
- Consider using a light gray or subtle blue tone (e.g., #f1f5f9 slate-100, #e2e8f0 slate-200, or #e0f2fe sky-100)
- Update the text color from light (#f8fafc) to dark for better contrast with the new light background
- Remove or update the text-shadow since it won't work well with light backgrounds
- Update border-bottom color to match the new lighter theme
- Update button colors in `.adw-header button` and `.adw-header button:hover` classes to work with the new background

### Step 2: Style Issue Number with Distinct Box in ADW Header
- Open `src/components/kanban/KanbanCard.jsx`
- Locate line 196-198 where issue number is displayed in ADW header
- Remove the "#" prefix from `#{task.id}` → change to `{task.id}`
- Add styling classes to the issue number span to give it a distinct box with background color
- The box should have a different background color from the ADW ID box (which uses `bg-slate-700`)
- Consider using a complementary color like `bg-blue-100 text-blue-800` or `bg-indigo-100 text-indigo-800`
- Add padding and rounded corners to match the ADW ID styling pattern
- Ensure the issue number box visually blends well with the ADW ID display

### Step 3: Remove Redundant Issue Number from Card Header
- In `src/components/kanban/KanbanCard.jsx`
- Locate line 257-258 where issue number is displayed in the card header
- Remove the entire line containing `<span className="truncate">#{task.id}</span>` and the following separator `<span className="mx-1">•</span>`
- This removes the redundant display since issue number is already shown in the ADW header above
- Ensure the stage badges (P, B, T) section still renders correctly after removal

### Step 4: Remove "#" Prefix from CardExpandModal
- Open `src/components/kanban/CardExpandModal.jsx`
- Locate line 237 where issue number is displayed
- Change `#{task.id}` to `{task.id}` to remove the "#" prefix
- Verify the modal header layout still looks correct

### Step 5: Remove "#" Prefix from TaskDetailsModal
- Open `src/components/kanban/TaskDetailsModal.jsx`
- Locate line 202 where issue number is displayed
- Change `#{task.id}` to `{task.id}` to remove the "#" prefix
- Verify the modal layout still looks correct

### Step 6: Test Visual Changes Locally
- Start the development server using `npm run dev`
- Start the backend server using `cd app/server && uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001`
- Open the application in browser at http://localhost:5173
- Verify the following:
  - ADW header has a lighter background color (not dark slate)
  - Issue numbers appear without "#" prefix in all locations
  - Issue number in ADW header has a distinct styled box with background color
  - Issue number is NOT redundantly displayed in the card header below the ADW header
  - Stage badges (P, B, T) are still visible and properly styled
  - Text is readable with good contrast on the new background colors
  - Expanded modal and task details modal display correctly
- Test with multiple cards to ensure consistency

### Step 7: Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Verify TypeScript type checking passes
- Verify frontend linting passes
- Verify backend tests pass

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to ensure code quality standards are met
- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The user mentioned an attached image (`blob:http://localhost:5173/66c67bea-a251-46d4-ac3e-f86ea294b7c9`) but blob URLs are temporary and not accessible from the file system
- Focus on making the header styling lighter and more visually appealing
- Ensure the issue number box has good visual hierarchy - it should be distinct but complementary to the ADW ID display
- The ADW ID uses `bg-slate-700` with white text, so consider using a lighter, colored background for the issue number (like blue or indigo tones)
- Maintain consistency across all three display locations: KanbanCard, CardExpandModal, and TaskDetailsModal
- The stage badges (P, B, T, R, D, PR) should remain functional and visible after removing the redundant issue number
- Test responsiveness and truncation behavior to ensure long ADW IDs and issue numbers don't break the layout
