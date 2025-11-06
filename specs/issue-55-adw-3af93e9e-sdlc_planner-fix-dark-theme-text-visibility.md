# Chore: Fix Dark Theme Text Visibility and Center Phase Titles

## Metadata
issue_number: `55`
adw_id: `3af93e9e`
issue_json: `{"number":55,"title":"If u notice in the dark background","body":"If u notice in the dark background. i am not able to see the text since it is also dark. may be you will have to use a light colour of the text so that it will be visible. also the titles of the phase i.e Backlog, plan, Build ....... all those should be centered.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/56d2c3e0-f85f-4be3-b705-6f536e908dcc)\n\n"}`

## Chore Description
This chore addresses two UI/UX issues in the Kanban board interface:

1. **Dark Theme Text Visibility Issue**: In dark-themed sections (specifically the ADW header in KanbanCard and column headers in KanbanBoard), text color is dark (#1e293b, #334155) making it difficult to read against the dark background. The text needs to be changed to a light color for proper visibility.

2. **Phase Title Centering**: The stage/phase column headers (Backlog, Plan, Build, Test, Review, Document, PR, Ready to Merge, Errored) need to be centered for better visual presentation.

The dark backgrounds are primarily used in:
- `.adw-header` class (KanbanCard component) - has dark background (#1e293b) with light text (#f8fafc) already
- `.kanban-column-header` class - has dark background (#1e293b) with light text (#f8fafc) already

However, the issue reports that text is not visible, suggesting the problem is in the component JSX where text color classes might be overriding the CSS styles.

## Relevant Files
Use these files to resolve the chore:

- `src/styles/kanban.css` (lines 142-155, 178-202) - Contains the styles for `.kanban-column-header` and `.adw-header` with dark backgrounds. Currently sets `color: #f8fafc` but may need to verify Tailwind classes aren't overriding this.

- `src/components/kanban/KanbanBoard.jsx` (lines 116-129, 171-185, 222-236) - Renders the stage column headers. Currently uses `text-gray-900` class for the stage name which overrides the CSS light color. This needs to be changed to a light text color class like `text-white` or `text-gray-100`. The header also needs `text-center` or `justify-center` for centering the content.

- `src/components/kanban/KanbanCard.jsx` (lines 192-248) - Contains the ADW header section. Need to verify if dark text classes are being used that override the light text from CSS.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Fix Text Visibility in Kanban Column Headers
- Update `src/components/kanban/KanbanBoard.jsx` to change the text color classes in the stage column headers
- Find all instances of `<h3 className="font-bold text-gray-900">` within `.kanban-column-header` divs
- Change `text-gray-900` to `text-white` or `text-gray-100` for proper contrast against the dark background
- This affects three locations: backlog stage header (around line 120), SDLC stages header (around line 175), and other stages header (around line 226)

### Step 2: Center the Phase/Stage Column Headers
- In `src/components/kanban/KanbanBoard.jsx`, update the `.kanban-column-header` content layout
- Modify the flex container that holds the stage name and count to use `justify-center` instead of `justify-between`
- Alternatively, wrap the entire header content in a centered container while keeping the badge on the right
- Apply changes to all three stage rendering sections: backlog, SDLC stages, and other stages

### Step 3: Verify ADW Header Text Visibility in KanbanCard
- Review `src/components/kanban/KanbanCard.jsx` ADW header section (lines 192-248)
- Check if any dark text color classes like `text-gray-700`, `text-gray-800`, or `text-gray-900` are used within the `.adw-header` section
- If found, replace with light text colors like `text-white` or `text-gray-100` to ensure visibility against the dark background
- The ADW ID display and buttons should remain visible with appropriate contrast

### Step 4: Verify CSS Styles for Dark Backgrounds
- Review `src/styles/kanban.css` to ensure `.kanban-column-header` and `.adw-header` have the correct light text color
- Confirm that `color: #f8fafc` is set in both classes
- Verify that Tailwind utilities aren't being incorrectly used that would override these base styles

### Step 5: Run Validation Commands
- Execute the validation commands below to ensure the changes are complete with zero regressions
- Verify the frontend builds successfully
- Check that type checking passes
- Optionally start the dev server and visually verify the changes in the browser

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript types are correct
- `npm run build` - Ensure the frontend builds without errors
- `npm run dev` - Start the development server and manually verify:
  - Phase titles (Backlog, Plan, Build, etc.) are centered in their columns
  - Text in column headers is visible (light colored) against dark backgrounds
  - ADW header text is visible against dark backgrounds
  - No visual regressions in other parts of the application

## Notes
- The issue mentions a screenshot was attached but it's a blob URL that won't be accessible in this context. The description is sufficient to understand the problem.
- Focus on the Kanban board column headers and ADW card headers where dark backgrounds are used.
- Ensure sufficient color contrast for accessibility (WCAG AA compliance recommends at least 4.5:1 contrast ratio for normal text).
- The centering should apply to the text content while maintaining the badge count display if present.
- Test in both light and dark system themes if the application supports system theme detection.
