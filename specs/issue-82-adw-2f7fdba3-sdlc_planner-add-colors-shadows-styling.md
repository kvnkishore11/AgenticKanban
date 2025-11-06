# Chore: Add Colors, Bold Text, and Shadows for Aesthetic UI Enhancement

## Metadata
issue_number: `82`
adw_id: `2f7fdba3`
issue_json: `{"number":82,"title":"I wnat to add some good colors and bold he text so...","body":"I wnat to add some good colors and bold he text so that it looks so cool. and to the phase columns and also cards add good shadows to make it look asthetic.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/a42e6acb-47ef-4a01-8809-d34ee2315c76)\n\n"}`

## Chore Description
Enhance the visual aesthetics of the AgenticKanban UI by:
1. Adding vibrant, modern colors to phase columns (stages) to make them visually distinct
2. Making text bold and more prominent for better readability and visual hierarchy
3. Adding good shadow effects to cards and phase columns to create depth and a modern, polished aesthetic
4. Ensuring the design remains consistent with the existing color scheme while enhancing visual appeal

The goal is to make the Kanban board look more modern, professional, and aesthetically pleasing with clear visual hierarchy and depth.

## Relevant Files
Use these files to resolve the chore:

- **src/styles/kanban.css** (lines 124-419)
  - Contains all Kanban-specific styling including column styles, card styles, shadows, and stage-specific color schemes
  - This is the primary file where stage column shadows, card shadows, and color enhancements will be added
  - Already has some shadow effects that can be enhanced and made more prominent

- **src/index.css** (lines 1-203)
  - Contains global CSS variables, typography settings, and base component styles
  - Defines the color palette variables and typography scale
  - Includes `.card` utility class that can be enhanced with better shadows

- **src/components/kanban/KanbanBoard.jsx** (lines 1-273)
  - React component that renders the Kanban board columns
  - Uses `getStageColorClasses()` to apply stage-specific colors
  - Text elements like stage headers can have bold/font-weight improvements

- **src/components/kanban/KanbanCard.jsx** (lines 1-330)
  - React component for individual task cards
  - Card header, title, and metadata display can be made bolder
  - Already uses `.kanban-card` class which can be enhanced with better shadows

- **tailwind.config.js** (lines 1-43)
  - Tailwind configuration with color palette definitions
  - Primary and gray color scales are defined here
  - May need to extend with additional vibrant colors for stage differentiation

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Enhance Stage Column Colors and Shadows
- Update stage-specific color schemes in `src/styles/kanban.css` (lines 317-364) to use more vibrant, distinct colors
- Make background colors more saturated and visually appealing while maintaining readability
- Add prominent box-shadow to `.kanban-column` (line 126) to create depth
- Enhance `.kanban-column:hover` shadow effect (line 137-140) to be more dramatic
- Update `.kanban-column-header` (line 142-150) with a gradient background and stronger shadow to make it stand out
- Ensure each stage (backlog, plan, build, test, review, document, pr, errored) has distinct, vibrant colors

### Step 2: Enhance Card Shadows and Visual Depth
- Increase shadow prominence on `.kanban-card` (line 160-170) to make cards stand out more
- Enhance hover effect shadow on `.kanban-card:hover` (line 205-209) with larger, more prominent shadow
- Enhance selected card shadow on `.kanban-card.selected` (line 215-219) to make selection more obvious
- Add subtle inner shadow or border enhancement to create more depth
- Update the gradient top bar effect (line 193-203) to be more visible and colorful

### Step 3: Bold Text and Typography Enhancement
- Update stage header titles in `src/components/kanban/KanbanBoard.jsx`:
  - Make stage names (line 120, 175, 226) bolder by changing from `font-medium` to `font-bold` or `font-semibold`
  - Increase font size if needed for better visibility
- Update card title text in `src/components/kanban/KanbanCard.jsx`:
  - Make card titles (line 189) bolder by changing from `font-medium` to `font-bold`
  - Make ADW ID label (line 148) bolder
- Update count badges (line 122-128 in KanbanBoard.jsx) to be bolder and more prominent
- Enhance button text to be bolder throughout the kanban components

### Step 4: Enhance Global Component Styles
- Update `.card` utility class in `src/index.css` (line 195-197) with better shadow
- Update `.btn-primary` and `.btn-secondary` in `src/index.css` (lines 187-193) to have bolder text
- Ensure consistent shadow treatment across all card-like elements
- Add CSS variables for shadow levels to maintain consistency

### Step 5: Improve Color Contrast and Accessibility
- Review and adjust text colors to ensure good contrast with new vibrant backgrounds
- Make sure all text remains readable with the enhanced colors
- Test that color combinations meet WCAG accessibility standards
- Adjust text shadows if needed for better legibility on colorful backgrounds

### Step 6: Polish and Refinement
- Review all changes to ensure visual consistency across the board
- Verify that shadows don't create visual clutter
- Ensure animations and transitions work smoothly with new shadows
- Test responsive behavior on different screen sizes
- Verify dark mode compatibility if applicable

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Ensure TypeScript has no type errors
- `npm run lint` - Ensure ESLint passes with no errors
- `npm run build` - Verify production build succeeds
- `cd app/server && uv run pytest` - Run server tests to validate no regressions

## Notes
- The user wants the UI to look "cool" and "aesthetic" - focus on modern, vibrant design
- Shadow effects should be prominent but not overwhelming
- Colors should be vibrant and distinct for each stage while maintaining harmony
- Bold text should improve readability and create clear visual hierarchy
- All changes should be in CSS/styling - no backend or business logic changes needed
- Keep the existing functionality intact - this is purely a visual enhancement
- Consider using box-shadow with multiple layers for depth (e.g., `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 0 10px 15px -3px rgba(0,0,0,0.1)`)
- For vibrant colors, consider gradients and saturated hues while maintaining professional appearance
