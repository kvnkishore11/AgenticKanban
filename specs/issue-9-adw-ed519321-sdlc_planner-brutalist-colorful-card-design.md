# Chore: Brutalist Colorful Card Design for Expanded Card Modal

## Metadata
issue_number: `9`
adw_id: `ed519321`
issue_json: `{"number":9,"title":"for the expanded card","body":"for the expanded card. can you try this design.. i am also attaching teh code here..."}`

## Chore Description
Implement a brutalist colorful design for the expanded card modal (CardExpandModal) based on the provided HTML/CSS design reference. The new design features:

- Bold, monospace typography (Courier New)
- Thick black borders (6px on modal, 3-4px on sections)
- Colorful gradient backgrounds (blue, orange, purple, green gradients)
- Strong box shadows for depth
- No rounded corners (brutalist aesthetic)
- Compact, information-dense layout with:
  - Left sidebar: Compact info, description, and ADW metadata
  - Right panel: Pipeline stages + Stage logs with live/historical tabs
- Bold, uppercase headers with distinct visual hierarchy
- Brutalist-style buttons with sharp edges and hover effects
- Progress bars with shimmer animations
- Color-coded stage indicators with icons

The design should maintain all existing functionality while applying the new brutalist visual style.

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/CardExpandModal.jsx` - The main modal component that needs to be redesigned with the brutalist style. Currently uses a soft, rounded design with gradients. Needs to be transformed to use the brutalist aesthetic with thick borders, bold colors, and monospace fonts.

- `src/styles/brutalist-theme.css` - Contains existing brutalist theme variables and styles. May need additional styles or modifications to support the new card expand modal design, particularly for modals, gradients, and progress indicators.

- `src/components/kanban/StageProgressionIndicator.jsx` - Used within the CardExpandModal to display pipeline stages. May need to be styled or modified to fit the brutalist pipeline section with color-coded stage boxes.

- `src/components/kanban/StageLogsViewer.jsx` - Displays historical logs in the modal. Needs styling updates to match the brutalist logs panel design with proper headers, borders, and typography.

- `src/components/kanban/LiveLogsPanel.jsx` - Displays live logs in the modal. Needs styling updates to match the brutalist logs panel with live indicators and proper formatting.

### New Files
- `src/styles/brutalist-modal.css` - New dedicated stylesheet for brutalist modal styles to keep the CardExpandModal styles organized and maintainable, separate from the main theme file.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Create dedicated brutalist modal stylesheet
- Create `src/styles/brutalist-modal.css` with comprehensive styles for the modal
- Define modal structure styles: overlay, container, header, main content grid, sidebar, right panel
- Add color gradient utilities for backgrounds (blue, orange, purple, green, teal gradients)
- Define border width variables (6px ultra, 4px thick, 3px medium, 2px thin)
- Add box shadow styles for brutalist depth effects
- Define section styles: compact info, description, metadata, pipeline, logs
- Add button styles: header buttons, action buttons, toolbar buttons
- Add progress bar styles with shimmer animations
- Define log entry styles with level indicators (info, success, warning, error)
- Add responsive grid layouts
- Import this file in `src/index.css` or `src/App.css`

### 2. Update CardExpandModal component structure
- Modify the modal container to use brutalist styling classes
- Update modal dimensions to 1200px max-width, 90vh height
- Restructure the layout to use a grid: 300px sidebar + 1fr right panel
- Add brutalist-style header with icon, title, and action buttons
- Implement left sidebar with three sections:
  - Compact info (Stage, Type, Created, Updated, Pipeline indicator)
  - Description section with markdown rendering
  - ADW Metadata section with grid layout and copy buttons
- Implement right panel with:
  - Pipeline section with progress bar and stage boxes
  - Stage info banner with selected stage details
  - Logs panel with tabs (Live/All) and toolbar
  - Logs container with log entries

### 3. Style the modal header
- Apply black background gradient (135deg, #1e1e1e 0%, #2d2d2d 100%)
- Add white text with uppercase styling
- Include icon (⚡) with orange/red gradient background
- Add issue number and ADW ID display
- Style action buttons (Edit, Close) with hover effects
- Add 6px solid black border at bottom

### 4. Implement left sidebar sections
- **Compact Info Section:**
  - Light blue gradient background (#f0f9ff to #e0f2fe)
  - 2x2 grid layout for metadata fields
  - Small uppercase labels (8px font)
  - Mini pipeline indicator with stage boxes (Plan → Impl → Test → Rev → Doc)
  - Active/completed stage styling with color gradients

- **Description Section:**
  - Yellow/amber gradient background (#fffbeb to #fef3c7)
  - Section icon (📝) with orange gradient
  - White content box with markdown rendering
  - Scrollable content area
  - 3px black borders

- **ADW Metadata Section:**
  - Purple gradient background (#faf5ff to #f3e8ff)
  - Section icon (📁) with purple gradient
  - 2-column grid for metadata fields
  - Copy buttons for ADW ID
  - "View Plan" button with purple gradient and hover effects

### 5. Implement right panel pipeline section
- Gray gradient background (#fafafa to #f0f0f0)
- Pipeline header with title and status badge
- Progress bar with gradient fill and shimmer animation
- Five stage boxes (Plan, Implement, Test, Review, Document) with:
  - Icons for each stage (📋, 🔨, 🧪, 👀, 📄)
  - Uppercase stage names
  - Time indicators
  - Active/completed/pending states with color gradients
  - Hover effects (translateY and box shadow)
  - Click handlers to view stage logs
- 4px black border at bottom

### 6. Implement stage info banner
- Blue gradient background (#dbeafe to #bfdbfe)
- Large stage icon (44x44px) with gradient
- Stage name and status (In Progress/Completed/Pending)
- Mini progress bar with percentage
- Dynamic content based on selected stage
- 3px blue border at bottom

### 7. Implement logs panel
- **Logs Header:**
  - Black gradient background (#1e1e1e to #2d2d2d)
  - White uppercase title with log count
  - Tab toggle buttons (Live/All)
  - Connection status indicator (green/red with pulse animation)

- **Logs Toolbar:**
  - Light gray background (#f8f8f8)
  - Search input with brutalist styling
  - Filter buttons (▽ ALL, ↓ Auto, ⬇, 🗑)
  - 2px borders

- **Logs Container:**
  - Scrollable area with individual log entries
  - Each log entry with:
    - Colored indicator dot (blue/green/orange/red)
    - Timestamp, level badge, title, description
    - Progress and agent metadata
    - Copy button
    - Hover effect (light blue background, translateX)

### 8. Style modal footer
- Gray gradient background (#f8f8f8 to #f0f0f0)
- 4px black border at top
- Action buttons with brutalist styling
- "Edit Task" button (blue gradient)
- "Close" button (gray)
- Hover effects with translate and box shadow

### 9. Add brutalist animations and interactions
- Shimmer animation for progress bars (translateX animation)
- Pulse animation for status dots
- Hover effects for buttons (translate -3px, -3px with box shadow)
- Stage box hover effects (translateY -4px)
- Log entry hover effects (background change, translateX)
- Tab button active states with blue gradient

### 10. Update component to use plan view mode
- Maintain existing plan view functionality
- Style plan view with:
  - Back button in header
  - MDEditor.Markdown component for rendering
  - White background with proper padding
  - Border styling consistent with brutalist theme
  - Copy plan button in header

### 11. Ensure responsive behavior
- Test modal at different viewport sizes
- Ensure sidebar scrolls properly
- Ensure logs panel scrolls properly
- Test grid layout responsiveness
- Verify all interactive elements work on touch devices

### 12. Test brutalist styling integration
- Verify all gradients render correctly
- Check border widths and colors
- Test all hover and active states
- Verify animations work smoothly
- Check typography (monospace, uppercase, weights)
- Ensure color contrast meets accessibility standards
- Test with different amounts of content (empty logs, many logs, etc.)

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Ensure no TypeScript errors in the updated components
- `npm run lint` - Ensure code style is consistent with project standards
- `npm run dev` - Start the development server and manually test:
  - Open a card's expand modal
  - Verify brutalist styling is applied throughout
  - Test all interactive elements (buttons, tabs, stage selection)
  - Test plan view mode
  - Test logs display (live and historical)
  - Verify animations and hover effects
  - Test responsive behavior
  - Verify all existing functionality still works
- `npm run build` - Ensure production build succeeds without errors

## Notes
- The design reference includes extensive inline CSS that should be extracted into the dedicated brutalist modal stylesheet
- Maintain all existing functionality including:
  - WebSocket log streaming
  - Plan viewer integration
  - Stage progression indicators
  - Workflow triggers
  - Merge functionality
  - Edit task navigation
- The brutalist aesthetic requires:
  - NO rounded corners anywhere (border-radius: 0)
  - Monospace font (Courier New) throughout
  - Thick black borders (2px, 3px, 4px, 6px depending on hierarchy)
  - Bold, uppercase typography
  - Strong color gradients for visual interest
  - Box shadows for depth (not blur, but offset solid shadows)
- Color palette:
  - Black (#000) and White (#fff) as base
  - Blue gradients (#3b82f6 to #2563eb) for primary actions
  - Orange/Amber gradients (#f59e0b to #d97706) for warnings/descriptions
  - Purple gradients (#8b5cf6 to #6d28d9) for metadata/plan
  - Green gradients (#10b981 to #059669) for success states
  - Red gradients (#ef4444 to #dc2626) for errors
  - Teal gradients (#14b8a6 to #0d9488) for merge/ready states
- Ensure the modal remains accessible (keyboard navigation, screen readers, color contrast)
- The provided HTML includes JavaScript for interactions - ensure these are properly implemented in React event handlers
