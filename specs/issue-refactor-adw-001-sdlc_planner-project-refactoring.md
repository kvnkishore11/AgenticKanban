# Chore: Complete Project Refactoring and Organization

## Metadata
issue_number: `refactor`
adw_id: `001`
issue_json: `{"title": "Project Refactoring", "body": "i want to refactor this project. Remove all redundant logic, files. unused imports and files. structure code nicely. comment in such a way that it is easiliy undrestandable. organise the project files along with grouping similar files in folders etc."}`

## Chore Description
Perform a comprehensive refactoring of the Agentic Kanban project to improve code organization, remove redundancies, eliminate unused imports and files, add meaningful comments for better code understanding, and reorganize the project structure by grouping related files into appropriate folders. This will enhance code maintainability, readability, and overall project structure.

## Relevant Files
Use these files to resolve the chore:

- **Frontend React Application (src/)**:
  - `src/App.jsx` - Main application component
  - `src/main.jsx` - Application entry point
  - `src/components/*.jsx` - All React components (KanbanBoard, KanbanCard, TaskInput, SettingsModal, etc.)
  - `src/hooks/*.js` - Custom React hooks (useClipboard, useProjectNotification)
  - `src/services/*.js` - Business logic services (adwService, gitService, websocketService, etc.)
  - `src/stores/*.js` - State management with Zustand
  - `src/utils/*.js` - Utility functions (tokenCounter, substages)
  - `src/styles/*.css` - Component-specific styles
  - `src/App.css` and `src/index.css` - Global styles

- **Backend Server**:
  - `server.js` - Express server implementation

- **Configuration Files**:
  - `package.json` - Dependencies and scripts
  - `vite.config.js` - Vite build configuration
  - `tailwind.config.js` - Tailwind CSS configuration
  - `eslint.config.js` - ESLint configuration
  - `postcss.config.js` - PostCSS configuration

- **Agentics AI Workflow System**:
  - `agentics/adws/` - AI Developer Workflow scripts and configurations
  - `agentics/agents/` - Agent configurations
  - `agentics/scripts/` - Automation scripts

- **Documentation and Project Files**:
  - `README.md` - Project documentation
  - Root level markdown files (prompt.md, substages.md, etc.)
  - `.claude/` - Claude AI configuration

### New Files
- `src/constants/` - For application constants and configuration
- `src/types/` - For TypeScript type definitions (if converting to TS)
- `docs/` - Consolidated documentation folder
- `config/` - Consolidated configuration files folder

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Analyze and Document Current State
- Analyze all JavaScript/JSX files for unused imports using ESLint
- Identify redundant code patterns and duplicate logic across components and services
- Document current file structure and dependencies
- Identify files that can be consolidated or removed

### Step 2: Remove Unused Dependencies and Imports
- Run ESLint to identify unused imports across all JavaScript/JSX files
- Remove unused import statements from all components, hooks, services, and utilities
- Check package.json for unused dependencies and remove them
- Clean up redundant or duplicate utility functions

### Step 3: Reorganize Project Structure
- Create new organized folder structure:
  - Move configuration files to `config/` directory (tailwind, postcss, etc.)
  - Consolidate documentation files into `docs/` directory
  - Create `src/constants/` for application constants
  - Group related components into subdirectories within `src/components/`
  - Organize services by functionality in `src/services/`
- Update all import paths affected by the reorganization

### Step 4: Consolidate and Refactor Redundant Logic
- Identify and merge duplicate functions across different services
- Extract common constants into `src/constants/` directory
- Refactor repetitive code patterns into reusable utility functions
- Consolidate similar CSS styles and remove duplicate styling rules

### Step 5: Add Comprehensive Comments and Documentation
- Add JSDoc comments to all functions, components, and services explaining:
  - Purpose and functionality
  - Parameters and return values
  - Usage examples where appropriate
- Add inline comments for complex business logic
- Document component props and state management patterns
- Add README files for major directories explaining their purpose

### Step 6: Optimize File Organization
- Group related React components into logical subdirectories:
  - `src/components/ui/` - UI components (LoadingSpinner, Toast, etc.)
  - `src/components/kanban/` - Kanban-specific components
  - `src/components/forms/` - Form-related components
- Organize services by domain:
  - `src/services/api/` - API-related services
  - `src/services/storage/` - Storage and persistence services
  - `src/services/websocket/` - Real-time communication services

### Step 7: Update Configuration and Build Process
- Update all configuration files to reflect new project structure
- Update import paths in all affected files
- Ensure all build processes and scripts work with new structure
- Update package.json scripts if needed for new organization

### Step 8: Code Quality and Style Improvements
- Apply consistent code formatting across all files
- Ensure consistent naming conventions
- Add proper error handling where missing
- Optimize component performance (memo, callback optimizations)

### Step 9: Clean Up Root Directory
- Move miscellaneous files to appropriate directories
- Remove any temporary or unnecessary files
- Ensure root directory only contains essential files
- Update .gitignore if needed for new structure

### Step 10: Final Validation and Testing
- Run all validation commands to ensure no regressions
- Test application functionality to ensure refactoring didn't break features
- Verify all imports resolve correctly
- Confirm build process works with new structure

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run lint` - Ensure no ESLint errors after refactoring
- `npm run build` - Verify build process works with new structure
- `npm run dev` - Test that development server starts correctly
- `npm run test` - Run component tests to validate no regressions
- `npm run validate` - Run complete validation suite (lint + build + test)

## Notes
- Preserve all existing functionality while improving code organization
- Maintain backward compatibility with existing API contracts
- Ensure the refactoring enhances developer experience without breaking features
- Pay special attention to the Agentics AI workflow system to avoid disrupting automation
- Consider creating a migration guide documenting the structural changes for team members
- Back up the current state before making extensive changes
- Test thoroughly after each major structural change to catch issues early