# Chore: Reduce screen padding and maximize content area

## Metadata
issue_number: `4`
adw_id: `c14ef7fc`
issue_json: `{"number":4,"title":"if u see there is lot of white space around the ap...","body":"if u see there is lot of white space around the app. let the contents take almost the entire screen iwth minimal padding to the left and right of the screen.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5174/66c455ae-b390-42e6-a4f5-3ed61c899d72)\n\n![image.png](blob:http://localhost:5174/3dde5b7a-21be-4cda-8f75-65beef4ac650)\n\n"}`

## Chore Description
The application currently has excessive white space around the content areas due to max-width constraints and horizontal padding. The goal is to make the content take up almost the entire screen width with minimal padding on the left and right sides, providing a more immersive full-screen experience.

## Relevant Files
Use these files to resolve the chore:

- `src/App.jsx` - Main application component that contains the layout structure with max-width constraints and padding classes that need to be modified
- `src/App.css` - Contains root element styling with max-width and padding constraints that create the white space
- `src/index.css` - Base CSS file that may need adjustments for consistent full-width layout
- `src/styles/kanban.css` - Kanban-specific styles that may need responsive adjustments after layout changes

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update App.css to remove width constraints
- Remove or modify the `max-width: 1280px` constraint on `#root` element
- Reduce or eliminate the `padding: 2rem` on `#root` element to minimize horizontal spacing
- Ensure the changes maintain proper spacing for smaller screens

### Step 2: Update App.jsx layout containers
- Modify the header container class from `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` to use minimal horizontal padding
- Update the main content container class from `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` to remove max-width constraints
- Adjust the footer container class from `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4` to match the new layout
- Update error message container styling to maintain consistency with the new layout

### Step 3: Test responsive behavior
- Verify the layout works correctly on desktop screens
- Check that mobile responsiveness is maintained
- Ensure the kanban board and other components render properly with the increased width

### Step 4: Run validation commands
- Execute all validation commands to ensure the chore is complete with zero regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run dev` - Start the development server to manually verify the layout changes work correctly
- `npm run build` - Build the application to ensure no build errors are introduced

## Notes
- The changes should maintain accessibility and usability on all screen sizes
- Focus on preserving the visual hierarchy while maximizing content area
- Ensure that text readability is not compromised by making lines too wide on large screens
- Consider keeping minimal padding to prevent content from touching screen edges on smaller devices