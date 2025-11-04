# Chore: Update Project Font to JetBrains Mono

## Metadata
issue_number: `43`
adw_id: `e380573e`
issue_json: `{"number":43,"title":"i liked the font used in this snapshot","body":"i liked the font used in this snapshot. If possibel can you please update this entire project with this font\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/7b3e5bcc-103f-4b55-98e3-758391c92c52)\n\n"}`

## Chore Description
The user has seen a snapshot of the application (likely from commit 565575f which introduced JetBrains Mono font for logs and monospace elements) and wants to update the entire project to use this font consistently. Currently, the project uses:
- **Inter** as the main sans-serif font for UI elements
- **JetBrains Mono** for monospace/code elements (recently added)
- **Monaco/Menlo/Ubuntu Mono** in some older code sections

The chore involves standardizing the font usage across the application. Based on the recent typography improvements in commit 565575f, we need to ensure JetBrains Mono is applied to all monospace contexts and verify that the font stack is consistent throughout the application.

**Note**: Since the snapshot URL is a blob URL and cannot be accessed, this plan assumes the user is referring to JetBrains Mono font that was introduced in the recent typography improvements. If this is incorrect, the plan may need adjustment.

## Relevant Files
Use these files to resolve the chore:

- **src/index.css** - Main stylesheet that imports fonts and defines CSS variables for font stacks. Currently imports both Inter and JetBrains Mono. Contains `--font-mono` variable that should be used for all monospace elements.

- **src/styles/kanban.css** - Kanban-specific styles. Contains older monospace font definitions (`Monaco`, `Menlo`, `Ubuntu Mono`) in slash command styling (lines 995, 1001) that need to be updated to use the standardized `--font-mono` variable.

- **src/components/CommandEditor.jsx** - Component with inline font-family styles (lines 373, 391) using `Monaco, Menlo, "Ubuntu Mono", monospace`. Should be updated to use the standardized font stack or CSS variable.

- **tailwind.config.js** - Tailwind configuration that defines the `sans` font family. Currently uses Inter font family. This is the centralized location for defining font families used by Tailwind utility classes throughout the application.

### New Files
No new files need to be created for this chore.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Verify Current Font Configuration
- Read `src/index.css` to confirm the current font imports and CSS variable definitions
- Verify that JetBrains Mono is already imported via Google Fonts
- Verify that `--font-mono` CSS variable is properly defined
- Document any inconsistencies found

### 2. Update Kanban Styles to Use Standardized Font Variables
- Update `src/styles/kanban.css` line 995 (`.slash-command`) to use `var(--font-mono)` instead of hardcoded font stack
- Update `src/styles/kanban.css` line 1001 (`.slash-command-display`) to use `var(--font-mono)` instead of hardcoded font stack
- This ensures all kanban-specific monospace text uses the JetBrains Mono font consistently

### 3. Update CommandEditor Component Font Styles
- Update `src/components/CommandEditor.jsx` line 373 to use `var(--font-mono)` or reference the CSS variable
- Update `src/components/CommandEditor.jsx` line 391 to use `var(--font-mono)` or reference the CSS variable
- Consider extracting the inline styles to a CSS class for better maintainability
- This ensures the command editor uses the standardized monospace font

### 4. Search for Additional Font References
- Search the entire `src/` directory for any remaining hardcoded font-family references
- Check for any `fontFamily` properties in JSX/TSX files that might have been missed
- Update any found instances to use the standardized CSS variables (`--font-mono` or `--font-sans`)
- Ensure consistency across all components

### 5. Validate Font Rendering
- Start the development server (`npm run dev`)
- Visually inspect the application to verify:
  - All monospace elements (code blocks, logs, command inputs) use JetBrains Mono
  - All UI text elements use Inter font
  - Font weights and styles render correctly
  - No font-related console errors appear
- Test on multiple pages/components to ensure consistency

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run dev` - Start the development server and verify fonts render correctly in the browser
- `npm run typecheck` - Ensure TypeScript type checking passes with no errors
- `npm run lint` - Ensure ESLint passes with no linting errors
- `npm run build` - Ensure production build completes successfully
- `cd server && uv run pytest` - Run server tests to validate no regressions

## Notes
- The recent commit 565575f ("improve logs typography and styling") introduced JetBrains Mono for monospace elements and established CSS variables for font stacks. This chore builds on that work to ensure complete consistency.
- JetBrains Mono is already imported from Google Fonts in `src/index.css`, so no additional font downloads are needed.
- Using CSS variables (`--font-mono`, `--font-sans`) is the recommended approach as it allows centralized font management and easier future updates.
- The snapshot mentioned in the issue cannot be accessed (blob URL), so this plan assumes the user is referring to JetBrains Mono. If the user intended a different font, they should clarify and the plan can be adjusted.
- Monaco, Menlo, and Ubuntu Mono are fallback fonts that will still be used if JetBrains Mono fails to load, so the font stack should maintain these as fallbacks.
