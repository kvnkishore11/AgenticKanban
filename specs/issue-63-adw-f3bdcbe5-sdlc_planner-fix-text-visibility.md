# Chore: Fix Text Visibility in Kanban Cards

## Metadata
issue_number: `63`
adw_id: `f3bdcbe5`
issue_json: `{"number":63,"title":"teh text here is not so visible","body":"teh text here is not so visible. i think this has to be light as well.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/11c17598-05d6-4b6f-a68f-b808005c530e)\n\n"}`

## Chore Description
Fix text visibility issues in the Kanban board interface where certain text elements are not easily readable due to insufficient contrast between text color and background. The issue specifically mentions that text visibility needs improvement, suggesting it should be lighter for better contrast.

Based on code analysis, the primary issue appears to be in the stage badge styling within KanbanCard.jsx where non-current stage badges use `text-gray-700` which may have poor contrast against light backgrounds.

## Relevant Files
Use these files to resolve the chore:

- **src/components/kanban/KanbanCard.jsx** (lines 129-137)
  - Contains the stage badge rendering logic with text color styling
  - Non-current stage badges use `text-gray-700` which may not be visible enough
  - Current stage badges use `text-slate-50` which provides good contrast

- **src/styles/kanban.css** (lines 142-155, 177-203)
  - Contains ADW header styling with dark background and light text
  - Contains card styling and color schemes
  - May need adjustments for other text visibility issues

- **src/index.css** (lines 47-53, 92-106)
  - Contains CSS custom properties for colors including log text colors
  - Contains message content styling with color definitions
  - May need review for overall text contrast improvements

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Identify All Text Visibility Issues
- Review the KanbanCard.jsx component for all text color classes
- Examine stage badge styling (current vs non-current states)
- Check ADW header text colors
- Identify any other low-contrast text elements in the component
- Document all instances where `text-gray-*` classes might have poor visibility

### 2. Fix Stage Badge Text Color
- Update the non-current stage badge styling in KanbanCard.jsx (line 132)
- Change `text-gray-700` to a darker color like `text-gray-900` or `text-slate-800`
- Ensure the color provides sufficient contrast against white/light backgrounds
- Maintain consistency with the overall design system

### 3. Review and Fix Other Text Elements
- Check all other `text-gray-*` color classes in KanbanCard.jsx
- Verify text visibility for task descriptions, timestamps, and metadata
- Ensure all text meets WCAG accessibility contrast standards (4.5:1 for normal text)
- Update any other low-contrast text colors as needed

### 4. Verify Visual Consistency
- Ensure color changes maintain visual hierarchy
- Verify that current vs non-current state distinction remains clear
- Check that the changes don't conflict with other card states (selected, completed, errored)
- Confirm the styling works across different stage types (plan, build, test, etc.)

### 5. Run Validation Commands
- Execute all validation commands to ensure no regressions
- Manually verify the changes in the browser by inspecting various card states
- Test with different tasks in different stages to confirm visibility improvements

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/f3bdcbe5 && npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/f3bdcbe5/app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The issue description mentions "teh text here is not so visible" and suggests making it "light as well"
- This likely refers to making the text darker (more visible/legible) rather than lighter in color
- The current stage badges already use good contrast (`text-slate-50` on `bg-slate-800`)
- Focus should be on non-current stage badges and any other low-contrast text
- Consider accessibility standards (WCAG 2.1 Level AA requires 4.5:1 contrast ratio for normal text)
- The attached image in the issue would provide visual context but is a blob URL (not accessible)
- Test the changes with the actual UI running to verify visual improvements
