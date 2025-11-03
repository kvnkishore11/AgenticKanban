# Code Cleanup Plan

**Date**: 2025-11-03
**Status**: Planning Phase
**Purpose**: Document redundant, obsolete, or duplicate files identified during code quality audit

## Overview

This document identifies files and code that may be candidates for cleanup, consolidation, or removal. All items listed here require validation before any action is taken. The cleanup process follows a safe, phased approach to prevent breaking functionality.

## Cleanup Process

### Safety Protocol

Before removing ANY file:

1. ✅ **Search for References**: Use grep/ripgrep to find all imports and references
2. ✅ **Check Git History**: Review recent activity with `git log --follow <file>`
3. ✅ **Move to Deprecated**: Move to `deprecated/` folder, don't delete immediately
4. ✅ **Update Documentation**: Note the file is deprecated with reason
5. ✅ **Monitor**: Wait 24-48 hours for any issues to surface
6. ✅ **Permanent Deletion**: Only then remove permanently
7. ✅ **Document Removal**: Update this file with removal details

### Validation Commands

```bash
# Find all references to a file
grep -r "import.*filename" src/

# Check git history
git log --follow --oneline path/to/file

# Search for function/class usage
grep -r "functionName\|ClassName" src/ app/
```

## Identified Candidates

### 1. Test Files

#### Status: Review Required

**Files:**
- `src/components/forms/TaskInput.test.jsx`

**Analysis:**
- Basic component test file
- Last modified: Check git log
- Contains minimal test coverage
- May be part of incomplete test infrastructure setup

**Validation Needed:**
```bash
git log --follow src/components/forms/TaskInput.test.jsx
npm test -- TaskInput.test.jsx
```

**Recommendation:**
- **DO NOT REMOVE** - Keep as part of test infrastructure
- Instead, enhance tests to improve coverage
- This is a starting point for testing the TaskInput component

**Action:** None (keep file, enhance tests)

---

### 2. Duplicate Utility Functions

#### Status: Review Required

**Potential Duplicates:**
- Date formatting functions
- Validation helpers
- String manipulation utilities

**Analysis Needed:**
```bash
# Search for duplicate date formatting
grep -r "format.*date\|formatDate" src/utils/ src/components/

# Search for validation functions
grep -r "validate" src/utils/ src/components/
```

**Recommendation:**
- Consolidate duplicate utilities into single source files
- Update all imports to reference consolidated utilities
- **Example**: If multiple date formatters exist, keep the most comprehensive one in `src/utils/dateUtils.js`

**Action:** Requires detailed code review to identify actual duplicates

---

### 3. ADW Orchestrator Duplication

#### Status: High Priority - Refactoring Recommended

**Files with 70-80% Duplication:**
- `adws/adw_plan_build_iso.py` (~150 lines, ~100 duplicated)
- `adws/adw_plan_build_test_iso.py` (~170 lines, ~120 duplicated)
- `adws/adw_plan_build_test_review_iso.py` (~180 lines, ~130 duplicated)
- `adws/adw_plan_build_review_iso.py` (~165 lines, ~115 duplicated)
- `adws/adw_plan_build_document_iso.py` (~170 lines, ~120 duplicated)

**Total Duplication:** ~522 lines of 835 total (62%)

**Duplicated Logic:**
- Worktree setup and teardown
- State file loading/saving
- ADW ID generation and validation
- Port allocation logic
- Branch creation
- Error handling patterns
- Logging setup

**Recommendation:**
- ✅ **CREATE**: `adws/adw_modules/orchestrator.py` with `WorkflowOrchestrator` class
- ✅ **REFACTOR**: All 5 orchestrator scripts to use the new class
- ✅ **REDUCE**: From 835 lines to ~300 lines (64% reduction)
- ❌ **DO NOT DELETE**: Keep original scripts until refactored versions are validated

**Action:** See [Issue #30] for WorkflowOrchestrator implementation plan

**Status:** Planned for implementation

---

### 4. Configuration Files

#### Status: Review Required

**Potential Redundancies:**
- Multiple ESLint configurations (check for `.eslintrc.*` files)
- Duplicate TypeScript configs
- Old build configuration remnants

**Analysis:**
```bash
# Check for multiple config files
ls -la .eslintrc* eslint.config.js 2>/dev/null
ls -la tsconfig*.json
ls -la vite.config* webpack.config* 2>/dev/null
```

**Current Status:**
- ✅ `eslint.config.js` - In use (modern flat config)
- ✅ `tsconfig.json` - In use
- ✅ `tsconfig.node.json` - In use (Vite specific)
- ✅ `vite.config.js` - In use

**Recommendation:**
- No cleanup needed - all configs are active and necessary

**Action:** None

---

### 5. Obsolete Components

#### Status: Review Required

**Potential Candidates:**
- Old component variations not currently imported
- Commented-out component code
- Unused UI component libraries

**Analysis Needed:**
```bash
# Find unused components (no imports)
for file in src/components/**/*.jsx; do
  filename=$(basename "$file" .jsx)
  count=$(grep -r "import.*$filename" src/ | wc -l)
  if [ $count -eq 0 ]; then
    echo "Potentially unused: $file"
  fi
done
```

**Validation Required:**
- Run analysis script above
- Manually verify each component is truly unused
- Check if components are used dynamically (e.g., dynamic imports)

**Recommendation:**
- **DO NOT** preemptively remove any components
- Only remove after thorough validation shows zero usage

**Action:** Requires comprehensive analysis

---

### 6. Console.log Statements

#### Status: High Priority - Gradual Replacement

**Current Count:** 369 console.log statements

**Target:** <80 (78% reduction)

**Strategy:**
- ✅ **CREATED**: Centralized logger utility (`src/utils/logger.js`)
- 🔄 **REPLACE**: Gradually convert console.log to logger calls
- ✅ **KEEP**: Error logs, warnings, important user actions
- ❌ **REMOVE**: Debug noise, verbose development logging

**Prioritization:**
1. **Phase 1**: Replace in core modules (stores, API services)
2. **Phase 2**: Replace in high-traffic components (KanbanBoard, TaskCard)
3. **Phase 3**: Replace in remaining components
4. **Phase 4**: Remove unnecessary debug logs

**Action:** Ongoing - integrate logger as part of regular development

---

### 7. Commented-Out Code

#### Status: Review Required

**Search Strategy:**
```bash
# Find large blocks of commented code
grep -r "^[[:space:]]*//.*" src/ | wc -l
grep -r "^[[:space:]]*/\*" src/ | wc -l

# Find TODO comments (create issues instead)
grep -r "TODO\|FIXME\|HACK" src/ app/ adws/
```

**Recommendation:**
- **Remove** large blocks of commented-out code
- **Convert** TODO comments to GitHub issues
- **Document** any commented code that's intentionally kept for reference

**Action:** Requires manual review

---

### 8. Monolithic Files

#### Status: High Priority - Refactoring Recommended

**File:** `src/stores/kanbanStore.js` (2,382 lines)

**Issue:** Single file handles multiple concerns:
- Project management (lines 1-500)
- Task management (lines 501-1200)
- WebSocket connection (lines 1201-1600)
- Notifications (lines 1601-1800)
- Configuration (lines 1801-2000)
- Completed tasks (lines 2001-2200)
- Utilities (lines 2201-2382)

**Recommendation:**
- ✅ **SPLIT** into focused stores:
  - `projectStore.js` (~300 lines)
  - `taskStore.js` (~500 lines)
  - `websocketStore.js` (~400 lines)
  - `notificationStore.js` (~200 lines)
  - `configStore.js` (~150 lines)
  - `kanbanStore.js` (~200 lines) - Facade for backward compatibility

**Action:** See [Issue #30] for store splitting implementation plan

**Status:** Planned for implementation (Phase 3)

---

## Deprecated Files

Files moved to `deprecated/` folder pending permanent deletion:

### Currently Deprecated

None yet.

### Deletion Schedule

| File | Moved to deprecated/ | Scheduled Deletion | Reason | Status |
|------|---------------------|-------------------|--------|--------|
| _None yet_ | - | - | - | - |

---

## Removal Log

### Completed Removals

None yet.

### Format for Future Removals

When files are permanently deleted, document here:

```
**File:** path/to/file.ext
**Date Removed:** YYYY-MM-DD
**Reason:** Brief explanation
**Validation Performed:**
  - Checked references: None found
  - Checked git history: No recent activity
  - Moved to deprecated: YYYY-MM-DD
  - Monitored for: 48 hours
  - Issues reported: None
**Removed By:** Name/System
```

---

## Future Cleanup Opportunities

### Low Priority Items

1. **Bundle Size Optimization**
   - Analyze package.json for unused dependencies
   - Remove unused npm packages
   - Consider tree-shaking opportunities

2. **CSS Cleanup**
   - Remove unused Tailwind classes (use purge carefully)
   - Consolidate custom CSS
   - Remove duplicate styles

3. **Asset Optimization**
   - Compress images
   - Remove unused icons
   - Optimize SVGs

### Analysis Commands

```bash
# Check for unused npm packages
npm install -g depcheck
depcheck

# Check bundle size
npm run build
ls -lh dist/assets/

# Find large files
find . -type f -size +1M -not -path "./node_modules/*" -not -path "./.git/*"
```

---

## Metrics

### Before Cleanup

| Metric | Value |
|--------|-------|
| Total Files | ~200+ |
| Code Duplication (ADW) | 522 lines (62%) |
| Console.log Count | 369 |
| Monolithic Store Size | 2,382 lines |
| Unused Files | TBD |

### After Cleanup (Targets)

| Metric | Target |
|--------|--------|
| Total Files | ~190 (10 files consolidated/removed) |
| Code Duplication (ADW) | <150 lines (<20%) |
| Console.log Count | <80 (78% reduction) |
| Monolithic Store Size | Split into 5 focused stores |
| Unused Files | 0 |

---

## Approval Process

### Required Approvals

Before any file deletion:
1. ✅ Technical lead review
2. ✅ Successful test run (all tests pass)
3. ✅ 48-hour monitoring period complete
4. ✅ No production issues reported

### Emergency Rollback

If issues arise after cleanup:
1. Restore from `deprecated/` folder
2. Revert git commits
3. Document issue in this file
4. Investigate root cause

---

## References

- [CODE_QUALITY_AUDIT.md](./CODE_QUALITY_AUDIT.md) - Full audit report
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Code standards
- [Issue #30] - Code quality improvements tracking issue

---

## Notes

- This is a living document - update as cleanup progresses
- Always err on the side of caution - when in doubt, keep the file
- Maintain backward compatibility during transitions
- Document all decisions for future reference
- Coordinate cleanup with active development to avoid conflicts

## Last Updated

- **Date**: 2025-11-03
- **Updated By**: Code Quality Audit Process
- **Status**: Planning Phase - No deletions performed yet
