# Patch: Create Missing StageModelSelector UI Component

## Metadata
adw_id: `29aefea6`
review_change_request: `Issue #1: StageModelSelector UI component is missing. The spec explicitly requires 'src/components/ui/StageModelSelector.jsx' with props for stageName, selectedModel, onChange, and visual indicators (cost/performance badges), but this component was never created. Resolution: Create src/components/ui/StageModelSelector.jsx component with all required props, visual indicators (cost tier badges, performance tier badges, icons), tooltips, and styling to match existing UI patterns. Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-26-adw-29aefea6-sdlc_planner-per-stage-model-selection.md
**Issue:** The StageModelSelector UI component specified in the feature spec at `src/components/ui/StageModelSelector.jsx` was never created during implementation. This component is required to display model selection dropdowns with visual indicators (cost/performance badges, icons, tooltips) for each stage in the WorkflowTriggerModal.
**Solution:** Create the missing `StageModelSelector.jsx` component with all required props (stageName, selectedModel, onChange, disabled), visual indicators using cost tier badges and performance tier badges with color coding, Lucide icons (Zap/Scale/Crown), tooltips with model descriptions, and brutalist styling to match the existing UI patterns.

## Files to Modify
Use these files to implement the patch:

- **src/components/ui/StageModelSelector.jsx** (CREATE NEW) - Main component file with model selector dropdown and visual indicators
- **src/components/ui/__tests__/StageModelSelector.test.jsx** (CREATE NEW) - Unit tests for the component

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create StageModelSelector Component
- Create `src/components/ui/StageModelSelector.jsx` with the following structure:
  - Import React, Lucide icons (Zap, Scale, Crown, ChevronDown), and model utilities from `../../utils/modelDefaults`
  - Accept props: `stageName`, `selectedModel`, `onChange`, `disabled` (optional, default false)
  - Render a labeled container showing the stage name with brutalist styling
  - Implement a select dropdown with three options: Sonnet, Haiku, Opus
  - For each option, display:
    - Model icon (Zap for Haiku, Scale for Sonnet, Crown for Opus)
    - Model label
    - Cost tier badge with color coding using `getCostColor()` utility
    - Performance tier badge with color coding using `getPerformanceColor()` utility
  - Add visual indicator showing which model is the default for the stage (e.g., "(Default)" label)
  - Implement tooltips on hover showing model descriptions from `MODEL_INFO`
  - Style with brutalist theme: monospace font, black borders, no rounded corners, uppercase labels
  - Use CSS classes from brutalist-theme.css for consistency
  - Fire `onChange` callback when model selection changes with new model value
  - Handle disabled state by making select non-interactive with visual indication
- Add comprehensive JSDoc comments documenting props and component behavior
- Add PropTypes validation for all props

### Step 2: Create Unit Tests for StageModelSelector
- Create `src/components/ui/__tests__/StageModelSelector.test.jsx` using Vitest + React Testing Library
- Test suite should cover:
  - Component renders with correct stage name label
  - All three model options (Sonnet, Haiku, Opus) are present in dropdown
  - Selected model is correctly displayed and pre-selected
  - onChange callback is fired with correct model value when selection changes
  - Visual indicators (cost badges, performance badges) display correctly for each model
  - Icons render correctly (Zap for Haiku, Scale for Sonnet, Crown for Opus)
  - Default model indicator appears for the appropriate model based on stage name
  - Disabled state prevents user interaction and adds visual disabled styling
  - Tooltips are accessible and contain correct descriptions from MODEL_INFO
  - Component matches brutalist styling (uppercase, monospace, black borders)
- Use descriptive test names and organize tests by feature (rendering, interaction, styling, accessibility)
- Mock the modelDefaults utility imports if needed
- Test edge cases: empty stageName, invalid selectedModel, null onChange

### Step 3: Validate Component Integration Points
- Verify imports from `../../utils/modelDefaults.js` work correctly:
  - `MODEL_INFO` constant provides metadata for all models
  - `getCostColor()` returns correct Tailwind classes for cost tier badges
  - `getPerformanceColor()` returns correct Tailwind classes for performance tier badges
  - `getDefaultModelForStage()` identifies the default model for the given stage name
- Ensure component styling integrates with brutalist-theme.css variables:
  - Use `--font-brutalist` for monospace font
  - Use `--color-brutalist-black` and `--color-brutalist-white` for colors
  - Use `--border-medium` or `--border-thick` for borders
  - Apply `.uppercase-brutalist` class for uppercase text
  - Use Tailwind utility classes compatible with existing UI patterns
- Verify Lucide icons are imported from the same version used in other components (e.g., AdwIdInput.jsx)

### Step 4: Run Frontend Tests
- Execute frontend unit tests: `npm run test -- StageModelSelector`
- Verify all tests pass with zero failures
- Fix any failing tests by adjusting component implementation or test expectations
- Ensure test coverage is comprehensive (>80% for component)

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Frontend Unit Tests**: `npm run test -- StageModelSelector` - Verify all StageModelSelector tests pass
2. **TypeScript Type Check**: `npm run typecheck` - Ensure no type errors introduced
3. **Frontend Build**: `npm run build` - Verify frontend builds successfully with zero errors
4. **All Frontend Tests**: `npm run test` - Run all frontend tests to validate zero regressions
5. **Manual Verification**: Import StageModelSelector in WorkflowTriggerModal.jsx and verify it renders without errors (do not integrate fully, just verify import and basic render)

## Patch Scope
**Lines of code to change:** ~200 (150 for component + 50 for tests)
**Risk level:** low
**Testing required:** Unit tests for component rendering, interaction, visual indicators, accessibility, and styling. Integration verification with existing utilities and theme.
