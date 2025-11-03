# Feature: Code Quality Standards Audit and Implementation

## Metadata
issue_number: `30`
adw_id: `069258d2`
issue_json: `{"number":30,"title":"I want you research whether the code base every pa...","body":"I want you research whether the code base every part of hte code is implemented in the best possible way following all the industry standards. \n\nfeel free to safely remove the code or file or foders that are redundant. ensure that the code is not broken during this process.\n\nprovide necessary documentation whereever need for my users to konw what is what. \n\nBeginning of every file comment things out what this file is doing. it will be easy for users and also agents who are processing this information"}`

## Feature Description
This feature implements a comprehensive code quality audit and improvement initiative across the entire AgenticKanban codebase. The goal is to ensure every part of the code follows industry best practices, remove redundancies, add proper documentation, and include file-level header comments explaining what each file does. This will improve maintainability, make the codebase easier to understand for both human developers and AI agents, and ensure long-term sustainability.

## User Story
As a developer or AI agent working on the AgenticKanban codebase
I want every file to have clear documentation and follow industry standards
So that I can quickly understand what each file does, maintain the code efficiently, and avoid technical debt

## Problem Statement
The codebase currently lacks:
1. **File-level documentation**: Many files (especially React components and utility modules) don't have header comments explaining their purpose
2. **Code redundancy**: Significant duplication exists in ADW orchestrator scripts (70-80% overlap across 5 files)
3. **Monolithic structures**: The kanbanStore.js file is 2,382 lines and combines multiple concerns (project management, tasks, WebSocket, notifications, configuration)
4. **Missing root documentation**: No README.md at project root to explain architecture for new contributors
5. **Inconsistent logging**: 369 console.log statements without a centralized logging mechanism
6. **Limited test coverage**: Less than 10% test coverage across the codebase
7. **Security concerns**: Hardcoded CORS origins, missing WebSocket authentication, and inadequate input validation

## Solution Statement
Implement a phased approach to improve code quality:
1. **Documentation Enhancement**: Add JSDoc headers to all React components and Python docstrings to all modules explaining file purpose
2. **Code Refactoring**: Extract duplicated code in ADW orchestrators into a WorkflowOrchestrator class, split monolithic store into focused stores
3. **Root Documentation**: Create comprehensive README.md with architecture diagrams and getting started guides
4. **Logging Standardization**: Replace console.log with centralized logger utility
5. **Security Hardening**: Add WebSocket authentication, environment-based CORS configuration, and input validation
6. **Test Infrastructure**: Set up proper testing framework and gradually increase coverage
7. **Safe Cleanup**: Identify and remove obsolete/redundant files after validation

## Relevant Files
Use these files to implement the feature:

### Frontend Files (React/JavaScript)
- `src/App.jsx` - Main application entry point with good header example (line 1-4)
- `src/components/**/*.jsx` - 20+ components needing JSDoc headers:
  - `src/components/CommandEditor.jsx` - Missing header
  - `src/components/CommandsPalette.jsx` - Missing header
  - `src/components/ProjectSelector.jsx` - Missing header
  - `src/components/forms/SettingsModal.jsx` - Missing header
  - `src/components/forms/TaskEditModal.jsx` - Missing header
  - `src/components/forms/TaskInput.jsx` - Missing header
  - `src/components/kanban/*.jsx` - All kanban components need headers
  - `src/components/ui/*.jsx` - All UI components need headers

- `src/stores/kanbanStore.js` - Monolithic 2,382-line store to refactor into:
  - `src/stores/projectStore.js` (NEW) - Project selection and management
  - `src/stores/taskStore.js` (NEW) - Task CRUD operations
  - `src/stores/websocketStore.js` (NEW) - WebSocket connection management
  - `src/stores/notificationStore.js` (NEW) - Notifications and toasts
  - `src/stores/configStore.js` (NEW) - Application settings

- `src/utils/*.js` - Utility files needing headers and potential consolidation

### Backend Files (Python)
- `app/server/server.py` - FastAPI server needing security enhancements
- `app/server/api/*.py` - API endpoints needing Pydantic validation
- `app/server/core/utils.py` - Utility functions

### ADW Files (Python Automation)
- `adws/README.md` - Already well-documented (900+ lines)
- `adws/adw_plan_build_iso.py` - Orchestrator with duplication
- `adws/adw_plan_build_test_iso.py` - Orchestrator with duplication
- `adws/adw_plan_build_test_review_iso.py` - Orchestrator with duplication
- `adws/adw_plan_build_review_iso.py` - Orchestrator with duplication
- `adws/adw_plan_build_document_iso.py` - Orchestrator with duplication
- `adws/adw_modules/workflow_ops.py` - Core workflow operations to extract orchestration logic into

### Configuration and Documentation
- `.github/workflows/*.yml` - CI/CD configuration (if exists)
- `package.json` - Frontend dependencies
- `app/server/pyproject.toml` or requirements file - Backend dependencies
- `.eslintrc.*` or `eslint.config.js` - Linting configuration
- `.gitignore` - Git ignore rules

### New Files
- `README.md` (NEW) - Root-level project documentation with architecture overview
- `src/utils/logger.js` (NEW) - Centralized logging utility for frontend
- `app/server/core/logger.py` (NEW) - Centralized logging utility for backend
- `adws/adw_modules/orchestrator.py` (NEW) - Unified workflow orchestrator class
- `ARCHITECTURE.md` (NEW) - Detailed architecture documentation
- `CONTRIBUTING.md` (NEW) - Contribution guidelines
- `docs/CODE_QUALITY_AUDIT.md` (NEW) - Complete audit findings and recommendations

### Test Files to Review
- `src/stores/__tests__/kanbanStore.test.js` - Existing test to update after store refactoring
- `src/utils/__tests__/*.test.js` - Existing utility tests
- `app/server/tests/*.py` - Backend test files

## Implementation Plan

### Phase 1: Foundation - Documentation and Audit
Establish comprehensive documentation baseline and capture current state:
- Create root README.md with project overview, architecture, and quick start guide
- Document complete audit findings in `docs/CODE_QUALITY_AUDIT.md`
- Create ARCHITECTURE.md explaining system design (Frontend → Backend → ADW layers)
- Create CONTRIBUTING.md with coding standards and contribution workflow
- Set up documentation structure for ongoing improvements

### Phase 2: Core Implementation - Code Quality Improvements
Implement systematic code quality enhancements:
- **Documentation Enhancement**: Add file-level headers (JSDoc/docstrings) to all components and modules
- **Logging Standardization**: Create and implement centralized logger utilities
- **Code Refactoring**: Extract duplicated ADW orchestrator code into reusable WorkflowOrchestrator class
- **Store Refactoring**: Split monolithic kanbanStore.js into focused, single-responsibility stores
- **Security Hardening**: Add WebSocket authentication, environment-based CORS, input validation
- **Safe Cleanup**: Remove redundant/obsolete files after thorough validation

### Phase 3: Integration - Testing and Validation
Ensure all improvements integrate properly and don't break existing functionality:
- Set up proper test infrastructure (Jest for frontend, pytest enhancements for backend)
- Update existing tests to work with refactored code
- Run comprehensive validation commands to ensure zero regressions
- Verify all documentation is accurate and accessible
- Validate that removed redundancies haven't broken any workflows

## Step by Step Tasks

### Task 1: Create Root Documentation
- Create `README.md` at project root with:
  - Project overview and purpose
  - Architecture diagram (ASCII or link to image)
  - Quick start instructions for developers
  - Links to detailed documentation
  - Technology stack overview
- Create `ARCHITECTURE.md` with detailed system design:
  - Frontend architecture (React, Zustand, component structure)
  - Backend architecture (FastAPI, WebSocket, API design)
  - ADW automation layer (isolated workflows, worktree management)
  - Data flow diagrams
- Create `CONTRIBUTING.md` with:
  - Coding standards and style guide
  - PR process and review guidelines
  - Testing requirements
  - Documentation requirements (file headers, JSDoc, docstrings)

### Task 2: Document Audit Findings
- Create `docs/` directory if it doesn't exist
- Create `docs/CODE_QUALITY_AUDIT.md` with complete findings:
  - Executive summary
  - Detailed findings by category (documentation, duplication, security, testing)
  - Prioritized recommendations
  - Effort estimates for each improvement
  - Success metrics

### Task 3: Add File Headers to React Components
- Add JSDoc headers to all components in `src/components/`:
  - Include @fileoverview describing component purpose
  - Document key props and behaviors
  - Follow the pattern from `src/App.jsx:1-4`
- Prioritize high-traffic components first:
  - KanbanBoard, TaskCard, ProjectSelector
  - TaskInput, TaskEditModal
  - SettingsModal, CommandsPalette
- Then add headers to all remaining components
- Ensure headers are consistent in format and level of detail

### Task 4: Add File Headers to Utility Modules
- Add JSDoc headers to all files in `src/utils/`:
  - Describe module purpose and key functions
  - Document any important algorithms or data transformations
- Add docstrings to all Python files in `app/server/`:
  - Module-level docstrings explaining file purpose
  - Function-level docstrings for all public functions
- Add docstrings to ADW modules in `adws/adw_modules/`:
  - Explain module role in workflow system
  - Document key classes and functions

### Task 5: Create Centralized Logger Utilities
- Create `src/utils/logger.js` for frontend:
  ```javascript
  /**
   * @fileoverview Centralized logging utility for AgenticKanban frontend
   * Provides consistent logging with levels, timestamps, and environment-aware behavior
   */
  ```
  - Support log levels: debug, info, warn, error
  - Include timestamps and source location
  - Disable debug logs in production
  - Provide structured logging for WebSocket events
- Create `app/server/core/logger.py` for backend:
  - Use Python's logging module with custom configuration
  - Support structured logging with JSON format option
  - Include request context in logs
  - Configure log levels by environment

### Task 6: Replace Console Logs with Logger
- Replace console.log/info/warn/error in React components with logger utility
- Replace print statements in Python code with proper logging
- Focus on high-value logging:
  - Keep user action logs (task creation, workflow triggers)
  - Keep error logs and warnings
  - Remove or downgrade debug noise
- Test that logging doesn't break any functionality

### Task 7: Refactor ADW Orchestrators
- Create `adws/adw_modules/orchestrator.py` with WorkflowOrchestrator class:
  - Extract common setup/teardown logic
  - Create methods for each workflow phase (plan, build, test, review, document)
  - Support flexible phase composition
  - Maintain backward compatibility with existing scripts
- Refactor `adw_plan_build_iso.py` to use WorkflowOrchestrator
- Refactor remaining orchestrator scripts one by one:
  - `adw_plan_build_test_iso.py`
  - `adw_plan_build_test_review_iso.py`
  - `adw_plan_build_review_iso.py`
  - `adw_plan_build_document_iso.py`
- Verify each refactored script works with test run
- Update `adws/README.md` to document new orchestrator pattern

### Task 8: Split Monolithic Kanban Store
- Create `src/stores/projectStore.js`:
  - Project selection, creation, deletion
  - Current project state
  - Import/export projects
- Create `src/stores/taskStore.js`:
  - Task CRUD operations
  - Task filtering and searching
  - Task state transitions
  - Completed tasks management
- Create `src/stores/websocketStore.js`:
  - WebSocket connection management
  - Message handling and routing
  - Connection status and reconnection logic
- Create `src/stores/notificationStore.js`:
  - Toast notifications
  - Error handling
  - User feedback messages
- Create `src/stores/configStore.js`:
  - Application settings (WebSocket URL, ports, etc.)
  - User preferences
  - Theme and UI settings
- Update `src/stores/kanbanStore.js` to orchestrate the focused stores:
  - Re-export all functionality for backward compatibility
  - Or update all imports throughout the app
- Update components to use the new focused stores

### Task 9: Add Security Enhancements
- Update `app/server/server.py` CORS configuration:
  - Move allowed origins to environment variables
  - Create `.env.example` with documentation
  - Add validation for CORS configuration
- Add WebSocket authentication:
  - Implement token-based authentication for WebSocket connections
  - Add authentication middleware
  - Document authentication flow
- Add input validation:
  - Create Pydantic schemas for all API endpoints
  - Add ADW ID format validation (8-character hex)
  - Validate file paths in ADW operations to prevent directory traversal
- Add rate limiting to workflow trigger endpoints

### Task 10: Set Up Test Infrastructure
- Configure Jest for React components (if not already set up):
  - Update `package.json` with test scripts
  - Create `jest.config.js` with proper settings
  - Set up React Testing Library
- Enhance pytest configuration for backend:
  - Ensure `app/server/tests/` has proper structure
  - Configure test coverage reporting
  - Set up test fixtures for common scenarios
- Document testing requirements in CONTRIBUTING.md
- Add pre-commit hooks to run tests

### Task 11: Identify and Document Redundant Files
- Audit the codebase for unused/redundant files:
  - Check for old test files not in use
  - Look for duplicate utility functions
  - Identify obsolete configuration files
  - Find unused component variations
- Create `docs/CLEANUP_PLAN.md` documenting:
  - Files identified for removal
  - Reason for each removal
  - Validation performed to ensure safe removal
  - Backup/archival strategy if needed
- Do NOT remove files yet - document findings only

### Task 12: Safely Remove Redundant Code
- For each file in cleanup plan:
  - Verify no active imports or references
  - Search codebase for any usage
  - Check git history for recent activity
  - Move to `deprecated/` folder first as backup
  - Monitor for 24-48 hours
  - Permanently delete if no issues arise
- Update relevant documentation to reflect removals
- Update imports and dependencies as needed

### Task 13: Update Tests for Refactored Code
- Update `src/stores/__tests__/kanbanStore.test.js` for new store structure
- Add tests for new logger utilities
- Add tests for WorkflowOrchestrator
- Add tests for security enhancements (authentication, validation)
- Ensure all existing tests still pass
- Add integration tests for critical workflows

### Task 14: Run Complete Validation
- Execute all validation commands to ensure zero regressions
- Verify all documentation is accurate
- Test all major workflows end-to-end
- Review all file headers for completeness
- Validate security enhancements work correctly
- Ensure cleanup didn't break any functionality

## Testing Strategy

### Unit Tests
- **Frontend (Jest + React Testing Library)**:
  - Test new focused stores (projectStore, taskStore, websocketStore, notificationStore, configStore)
  - Test logger utility with different log levels and environments
  - Test all refactored components still render correctly
  - Test security validation functions

- **Backend (pytest)**:
  - Test WorkflowOrchestrator class with different phase combinations
  - Test logger utility with structured logging
  - Test authentication middleware
  - Test input validation with Pydantic schemas
  - Test rate limiting functionality

### Integration Tests
- Test complete SDLC workflow with refactored orchestrators
- Test WebSocket communication with authentication
- Test store interactions and state synchronization
- Test that removed redundancies haven't broken any workflows

### Edge Cases
- **Store Refactoring**:
  - Multiple stores updating simultaneously
  - Store state persistence and rehydration
  - Backward compatibility with existing localStorage data

- **Logger Utility**:
  - Handling circular references in logged objects
  - Performance with high-volume logging
  - Proper sanitization of sensitive data in logs

- **WorkflowOrchestrator**:
  - Handling workflow phase failures gracefully
  - Resume functionality after interruption
  - Concurrent workflow execution with isolated worktrees

- **Security**:
  - Invalid authentication tokens
  - Malicious input in ADW IDs and file paths
  - CORS misconfiguration scenarios
  - Rate limit exceeded scenarios

### Regression Testing
- Verify all existing functionality still works after refactoring
- Test critical user workflows end-to-end
- Validate WebSocket real-time updates still function
- Ensure ADW automation workflows execute successfully

## Acceptance Criteria
- [ ] Root `README.md` exists with comprehensive project documentation and architecture overview
- [ ] `ARCHITECTURE.md` clearly explains the three-layer system design (Frontend, Backend, ADW)
- [ ] `CONTRIBUTING.md` documents coding standards including file header requirements
- [ ] `docs/CODE_QUALITY_AUDIT.md` contains complete audit findings and recommendations
- [ ] All React components (20+) have JSDoc headers explaining their purpose
- [ ] All Python modules have docstrings explaining file and function purposes
- [ ] All utility files have proper documentation headers
- [ ] Centralized logger utilities implemented and used throughout frontend and backend
- [ ] Console.log statements reduced by 80%+ and remaining logs use proper logger
- [ ] ADW orchestrator duplication eliminated with WorkflowOrchestrator class (from 522 lines to ~150-200)
- [ ] All 5 ADW orchestrator scripts refactored to use new WorkflowOrchestrator
- [ ] Monolithic kanbanStore.js split into 5 focused stores (projectStore, taskStore, websocketStore, notificationStore, configStore)
- [ ] All components updated to use new focused stores without breaking functionality
- [ ] CORS origins moved to environment variables with proper validation
- [ ] WebSocket authentication implemented with token-based system
- [ ] Input validation added using Pydantic schemas for all API endpoints
- [ ] Rate limiting implemented on workflow trigger endpoints
- [ ] ADW ID and file path validation prevents security vulnerabilities
- [ ] Test infrastructure set up with Jest and enhanced pytest configuration
- [ ] Existing tests updated to work with refactored code
- [ ] New tests added for refactored components (stores, orchestrator, logger, security)
- [ ] Redundant files documented in `docs/CLEANUP_PLAN.md` with safety validation
- [ ] Safe removal process executed for redundant code (deprecated folder → monitoring → deletion)
- [ ] All validation commands execute without errors
- [ ] Zero regressions in existing functionality
- [ ] Code quality metrics improved:
  - Documentation coverage: 0% → 95%+
  - Code duplication: Reduced by 70-80% in ADW orchestrators
  - Test coverage: <10% → 40%+ (with plan to reach 70%)
  - Security issues: All critical issues resolved

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

### Documentation Validation
```bash
# Verify root documentation exists and is comprehensive
cat README.md | grep -E "(Architecture|Quick Start|Technology Stack)"

# Verify architecture documentation
cat ARCHITECTURE.md | grep -E "(Frontend|Backend|ADW|Data Flow)"

# Verify contributing guidelines
cat CONTRIBUTING.md | grep -E "(Coding Standards|Testing|Documentation)"

# Verify audit documentation
cat docs/CODE_QUALITY_AUDIT.md | grep -E "(Findings|Recommendations|Metrics)"

# Count files with JSDoc headers in React components
find src/components -name "*.jsx" -exec grep -l "@fileoverview" {} \; | wc -l
# Expected: 20+ files

# Count Python files with module docstrings
find app/server adws/adw_modules -name "*.py" -exec grep -l '"""' {} \; | wc -l
# Expected: High percentage of Python files
```

### Code Quality Validation
```bash
# Verify logger utilities exist
ls -la src/utils/logger.js
ls -la app/server/core/logger.py

# Count remaining console.log statements (should be significantly reduced)
grep -r "console\.log" src/ | wc -l
# Expected: <100 (down from 369)

# Verify WorkflowOrchestrator exists
ls -la adws/adw_modules/orchestrator.py
grep -n "class WorkflowOrchestrator" adws/adw_modules/orchestrator.py

# Verify focused stores exist
ls -la src/stores/projectStore.js
ls -la src/stores/taskStore.js
ls -la src/stores/websocketStore.js
ls -la src/stores/notificationStore.js
ls -la src/stores/configStore.js

# Check ADW orchestrator file sizes reduced
wc -l adws/adw_plan_build_iso.py
wc -l adws/adw_plan_build_test_iso.py
# Expected: Significantly smaller files
```

### Security Validation
```bash
# Verify CORS configuration uses environment variables
grep "ALLOWED_ORIGINS" app/server/server.py

# Verify WebSocket authentication implementation
grep -n "authenticate" app/server/ -r

# Verify Pydantic schemas exist
find app/server/api -name "*.py" -exec grep -l "BaseModel" {} \;

# Verify rate limiting implementation
grep -n "rate_limit" app/server/ -r

# Verify input validation
grep -n "validate.*adw.*id\|validate.*path" app/server/ -r
```

### Test Infrastructure Validation
```bash
# Verify Jest configuration
ls -la jest.config.js
cat package.json | grep -A 5 '"test"'

# Run frontend tests
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/069258d2 && npm test

# Run frontend type checking
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/069258d2 && npm run typecheck

# Run frontend build
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/069258d2 && npm run build

# Run backend tests
cd app/server && uv run pytest

# Check test coverage (if configured)
cd app/server && uv run pytest --cov=. --cov-report=term
```

### Cleanup Validation
```bash
# Verify cleanup plan exists
ls -la docs/CLEANUP_PLAN.md

# Check if deprecated folder exists (if cleanup started)
ls -la deprecated/ 2>/dev/null || echo "No deprecated files yet"

# Verify no broken imports after cleanup
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/069258d2 && npm run typecheck
cd app/server && uv run python -m py_compile $(find . -name "*.py")
```

### End-to-End Workflow Validation
```bash
# Test ADW workflow still functions with refactored orchestrator
cd adws && uv run python adw_plan_build_iso.py --help

# Verify WebSocket server starts with security enhancements
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/069258d2 && timeout 5 python start-websocket.py || echo "WebSocket server check complete"

# Verify backend server starts with CORS and validation
cd app/server && timeout 5 uv run uvicorn server:app --host 0.0.0.0 --port 8001 || echo "Backend server check complete"
```

### Final Validation
- `cd app/server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/069258d2 && npm run typecheck` - Run frontend type checking to validate the feature works with zero regressions
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/069258d2 && npm run build` - Run frontend build to validate the feature works with zero regressions

## Notes

### Implementation Approach
This is a **phased, incremental approach** to avoid breaking existing functionality. Each step builds on the previous one and includes validation before moving forward.

### Priority Recommendations
Based on the audit findings, prioritize in this order:
1. **Week 1 (High Priority - 8 hours)**: Documentation (README, file headers), Logger utility, WorkflowOrchestrator
2. **Week 2-3 (Medium Priority - 12 hours)**: Store refactoring, Security enhancements, Test infrastructure
3. **Week 4+ (Low Priority)**: Cleanup, additional testing, advanced improvements

### Backward Compatibility
- Maintain backward compatibility during store refactoring by re-exporting from kanbanStore.js initially
- Keep old orchestrator scripts working during transition to WorkflowOrchestrator
- Use feature flags or environment variables to gradually roll out security enhancements

### Testing Philosophy
- Write tests DURING refactoring, not just at the end
- Focus on integration tests for critical workflows
- Aim for 40% coverage initially, with a roadmap to 70%+
- Use test-driven approach for security features

### Security Considerations
- WebSocket authentication is CRITICAL before production deployment
- CORS configuration must be environment-aware
- Rate limiting prevents abuse of automated workflows
- Input validation prevents directory traversal and injection attacks
- Never log sensitive information (tokens, passwords, API keys)

### Documentation Standards
All file headers should follow this format:

**JavaScript/JSX (JSDoc):**
```javascript
/**
 * @fileoverview Brief description of what this file does
 * Additional context about the component/module's role
 * @module optional-module-name
 */
```

**Python (docstrings):**
```python
"""
Brief description of what this module does.

Additional context about the module's role in the system.
Explain key classes, functions, or patterns used.
"""
```

### Refactoring Best Practices
- **One change at a time**: Don't mix refactoring with feature additions
- **Test before and after**: Ensure tests pass before starting, and after each change
- **Small commits**: Commit frequently with clear, descriptive messages
- **Code reviews**: Get another set of eyes on significant refactorings
- **Monitoring**: Watch for issues in production after deploying refactored code

### Store Refactoring Strategy
The monolithic kanbanStore.js should be split using this pattern:
1. Create new focused stores with clear, single responsibilities
2. Keep kanbanStore.js as a "facade" that re-exports everything (Phase 1)
3. Gradually update components to import from focused stores (Phase 2)
4. Once all components updated, simplify or remove kanbanStore.js (Phase 3)
5. This incremental approach minimizes risk and allows rollback if issues occur

### WorkflowOrchestrator Design
The new orchestrator should:
- Accept a list of phase names to execute: `['plan', 'build', 'test', 'review', 'document']`
- Handle state management (ADWState) consistently across all phases
- Provide hooks for pre/post phase execution (logging, validation, cleanup)
- Support resume functionality if a phase fails
- Maintain compatibility with existing ADW workflow scripts

### Cleanup Safety Protocol
Before removing ANY file:
1. Search entire codebase for imports/references
2. Check git log for recent activity (`git log --follow filename`)
3. Move to `deprecated/` folder, don't delete immediately
4. Update documentation noting the file is deprecated
5. Monitor for 24-48 hours for any issues
6. Only then permanently delete
7. Document the removal in a CHANGELOG or cleanup log

### Success Metrics
Track these metrics to measure success:
- **Documentation Coverage**: Files with headers / Total files
- **Code Duplication**: Lines of duplicated code (use tools like `jscpd`)
- **Test Coverage**: % of code covered by tests
- **Console.log Count**: Number of console.log statements (aim to reduce by 80%)
- **Security Issues**: Number of known vulnerabilities (aim for 0 critical)
- **Build Time**: Time to run `npm run build` (should not increase significantly)
- **Test Execution Time**: Time to run test suite (should remain reasonable)

### Future Enhancements (Out of Scope)
These are valuable but not part of this initial audit implementation:
- Full TypeScript migration
- Storybook for component development
- OpenAPI/Swagger documentation for backend
- Advanced error tracking (Sentry integration)
- Performance monitoring and APM
- Comprehensive E2E test suite with Playwright
- Automated dependency updates with Renovate/Dependabot

### Related Documentation
- ADW system documentation: `adws/README.md`
- Conditional documentation guide: `.claude/commands/conditional_docs.md`
- Project specs directory: `specs/`
