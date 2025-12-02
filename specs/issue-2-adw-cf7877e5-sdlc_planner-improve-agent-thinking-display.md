# Chore: Improve Agent Thinking Display and Execution Results

## Metadata
issue_number: `2`
adw_id: `cf7877e5`
issue_json: `{"number":2,"title":"So right now in my expanded card, so the only thin...","body":"So right now in my expanded card, so the only thing that is really helping me is the execution locks because it's very decent I'm able to go through and The agents thinking right so it is not in a great shape for me to get more insights Because all are in cards and they're contracted So even if I open a card and it doesn't stay for a long time So after two seconds, it's again snaps back to collapsed card. So I'm just thinking is there a better representation of agent thinking and the third Definitely the results right so in the results We are actually showing dot JSON, but I still see that is not really Helping me so much, you know, I want like what happened within that particular phase like sort of Maybe summary or the exact conversation I'm not so interested in all the tool calls and all those things So right now I'm still not seeing that great Confidence on it. So I want you to Thoroughly analyze what is the structure? What is what is that we are getting from the API response and See how you can provide a meaningful Summary or understanding of each stage. That's what I'm looking for"}`

## Chore Description

This chore improves the user experience of the expanded card modal by addressing three key pain points:

1. **Agent Thinking Display Issues**: Agent log entries (thinking blocks, tool calls, file changes, text blocks) currently start in a collapsed state by default, requiring users to manually click each entry to expand it. This makes it difficult to quickly scan and understand what the agent is doing. Additionally, the auto-scroll behavior when new logs arrive creates a perception that expanded cards are "snapping back" after 2 seconds, though this is actually due to new collapsed logs appearing and pushing the expanded content out of view.

2. **Result Display Clarity**: While the result viewer already has a beautified mode as the default, users are still finding it difficult to extract meaningful summaries and understand what happened during each stage. The beautified viewer attempts to parse conversation-style results, but may not be effectively handling all result formats or extracting the most relevant information. Users want clear summaries of what happened in each phase without wading through tool calls and technical details.

3. **API Response Structure Analysis**: The current implementation may not be fully leveraging the rich data structure available in the API response. Stage logs include detailed information about agent reasoning, tool usage, file changes, and execution results, but this information needs better parsing and presentation to provide truly meaningful insights.

The solution should:
- Make agent thinking more accessible by improving default expansion behavior
- Enhance the result parsing logic to extract better summaries from all stage result formats
- Improve the visual hierarchy to highlight key information (summaries, outcomes) over technical details
- Prevent the "snap-back" perception by managing scroll behavior when new logs arrive

## Relevant Files

Use these files to resolve the chore:

- **src/components/kanban/AgentLogEntry.jsx** - Individual agent log entry component that renders thinking blocks, tool calls, file changes, and text blocks. Currently initializes with `useState(false)` causing all entries to start collapsed (line 32). This component handles the display logic and expansion state for each log entry.

- **src/components/kanban/AgentLogsPanel.jsx** - Manages agent log fetching, filtering, searching, and rendering. Contains the auto-scroll logic (lines 194-198) that triggers when new logs arrive, contributing to the perceived "snap-back" behavior. Polls for new logs every 3 seconds.

- **src/components/kanban/CardExpandModal.jsx** - Main modal component with two-level tab navigation (primary: stage selection, secondary: content type selection). Coordinates the display of execution logs, agent thinking, and results. Contains state management for view modes and tab selection (lines 79-93).

- **src/components/kanban/BeautifiedResultViewer.jsx** - Beautified conversation-style result display component. Already implements parsing logic to extract text, tool uses, and thinking from result content arrays (lines 76-100). This component attempts to filter system noise and present meaningful information, but may need enhancement to handle additional result formats.

- **src/components/kanban/ResultViewer.jsx** - Displays stage results with three view modes (beautified, tree, raw). The beautified view is the default (line 154). Integrates the BeautifiedResultViewer component and provides mode switching.

- **src/components/kanban/ContentTypeTabs.jsx** - Secondary tab navigation component for switching between Execution, Thinking, and Result views within a selected stage.

- **server/api/stage_logs.py** - Backend API endpoint that provides stage logs and results (lines 60-69). Returns structured data including logs array, result object (from raw_output.json), stage folder info, and metadata.

- **app_docs/feature-5dc9d6af-beautified-agent-results.md** - Documentation for the existing beautified result viewer feature. Contains important context about the current parsing strategy, visual hierarchy design, and field categorization logic.

- **README.md** - Project overview with architecture and component structure information.

### New Files

No new files need to be created. This chore enhances existing components.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### 1. Analyze API Response Structure and Current Parsing Logic

- Read the `server/api/stage_logs.py` endpoint implementation to understand the complete structure of the `StageLogsResponse` including the `result` field format
- Examine multiple actual `raw_output.json` files from different stages (plan, implement, test, review, document) in the `adws/agents/{adw_id}/` directories to understand the variety of result formats
- Document the different message types and content structures found in the results (assistant messages with thinking/tool_use/text blocks, system messages, result entries)
- Review the current parsing logic in `BeautifiedResultViewer.jsx` (lines 76-100) to identify gaps in handling different result formats
- Create a comprehensive mapping of what meaningful information exists in each stage's results and how to extract it

### 2. Enhance BeautifiedResultViewer Parsing and Summary Generation

- Update the `extractTextFromContent` function to better handle edge cases and alternative content formats
- Add a new `generateStageSummary` function that analyzes the complete result object to produce a concise summary of what happened during the stage, focusing on:
  - Key decisions made by the agent
  - Files created/modified (high-level summary, not full diffs)
  - Test results or outcomes
  - Any errors or warnings encountered
  - Final status and completion state
- Enhance the `isSystemNoise` function to better filter out technical noise while preserving meaningful context
- Update the component's rendering logic to prominently display the generated summary at the top
- Add collapsible sections for:
  - "Key Decisions" (extracted from thinking blocks)
  - "Actions Taken" (summary of tool uses without full parameters)
  - "Outcome" (final result status)
- Improve the conversation flow display to show only assistant responses with high-value content, hiding low-value system messages
- Add visual indicators (icons, badges) to quickly communicate stage success/failure/warnings

### 3. Improve Agent Log Entry Default Expansion Behavior

- Update `AgentLogEntry.jsx` to implement intelligent default expansion:
  - Change `useState(false)` to a computed initial state based on entry type and recency
  - Expand by default: thinking blocks (high importance for understanding agent reasoning)
  - Expand by default: tool results with errors (critical information)
  - Expand by default: file changes (important for understanding modifications)
  - Keep collapsed by default: routine tool calls with no errors
  - Keep collapsed by default: text blocks (usually verbose)
- Add a prop `defaultExpanded` to allow parent components to control initial state
- Consider adding a user preference state (stored in localStorage) for "always expand all" or "expand important only"

### 4. Fix Auto-Scroll Behavior and Perceived "Snap-Back"

- Update `AgentLogsPanel.jsx` auto-scroll logic to be smarter:
  - Detect if user has manually scrolled away from the bottom (scrollTop position check)
  - Only auto-scroll to new logs if user is already at the bottom
  - If user has scrolled up, disable auto-scroll and show a "New logs available" indicator button
  - When user clicks "scroll to bottom" or re-enables auto-scroll, resume automatic scrolling
- Add a visual indicator (badge/notification) showing the number of new logs available when auto-scroll is disabled
- Preserve expansion state of existing entries when new logs are appended to avoid perceived collapse
- Add smooth scroll behavior with proper timing to prevent jarring jumps

### 5. Enhance Visual Hierarchy in Result Display

- Update `BeautifiedResultViewer.jsx` styling to create stronger visual hierarchy:
  - Make the summary section more prominent with larger text, bold styling, and distinctive background color
  - Use progressive disclosure: show summary and key decisions first, hide technical details in collapsed sections
  - Add clear section headers with icons for each category (Summary, Key Decisions, Actions, Outcome, Metadata)
  - Improve spacing and typography to make scanning easier
- Update `brutalist-modal.css` to add new styling for the enhanced result sections
- Ensure the visual design is consistent with the existing brutalist theme while improving readability

### 6. Add Result Caching and Performance Optimization

- Implement result caching in `ResultViewer.jsx` to avoid re-parsing the same result data multiple times
- Use `useMemo` hooks to memoize expensive parsing operations in `BeautifiedResultViewer.jsx`
- Add loading states for result parsing to indicate when complex results are being processed
- Optimize the rendering of large result objects by using virtualization or pagination if needed

### 7. Create Comprehensive Tests

- **Frontend Component Tests** (co-located with source in `__tests__/` directories):
  - Update `src/components/kanban/__tests__/AgentLogEntry.test.jsx` to test:
    - New intelligent default expansion behavior for different entry types
    - defaultExpanded prop functionality
    - Expansion state persistence when new logs arrive
  - Update `src/components/kanban/__tests__/AgentLogsPanel.test.jsx` to test:
    - Smart auto-scroll behavior (enabled when at bottom, disabled when scrolled up)
    - "New logs available" indicator display and functionality
    - Scroll position preservation when new logs arrive
  - Update `src/components/kanban/__tests__/BeautifiedResultViewer.test.jsx` to test:
    - New summary generation logic with various result formats
    - Enhanced parsing functions (extractTextFromContent, isSystemNoise)
    - Collapsible section rendering for Key Decisions, Actions, Outcome
    - Visual indicator rendering for success/failure/warnings
  - Update `src/components/kanban/__tests__/ResultViewer.test.jsx` to test:
    - Result caching behavior
    - Loading states during parsing
    - Integration with enhanced BeautifiedResultViewer

- **Integration Tests**:
  - Create `src/test/integration/agent-thinking-display.integration.test.js` to test:
    - End-to-end flow of opening a card, viewing thinking logs, and seeing proper expansion
    - Stage result parsing and display across different stage types
    - Auto-scroll behavior interaction with log polling and new entries

- **E2E Tests**:
  - Create `src/test/e2e/issue-2-adw-cf7877e5-e2e-agent-thinking-display.md` as a test specification documenting:
    - Manual test scenarios for verifying agent thinking display improvements
    - Expected behavior for default expansion of different log entry types
    - Verification steps for auto-scroll behavior and "snap-back" fix
    - Test cases for result summary generation across different stages
    - Visual inspection points for enhanced result hierarchy

### 8. Run Validation Commands

- Execute all validation commands to ensure zero regressions and confirm the chore is complete

## Validation Commands

Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - TypeScript type checking to ensure no type errors were introduced
- `npm run lint` - ESLint code linting to ensure code quality standards are met
- `npm run test` - Run all frontend tests including new and updated test cases
- `npm run build` - Production build to ensure the application builds without errors
- `uv run pytest adws/adw_tests/ -v --tb=short` - Run backend tests to validate no regressions in the API layer

## Notes

### API Response Structure Details

Based on the exploration, the API response from `GET /api/stage-logs/{adw_id}/{stage}` returns:

```json
{
  "adw_id": "string",
  "stage": "string",
  "logs": [
    {
      "timestamp": "ISO datetime",
      "level": "INFO|ERROR|WARNING|DEBUG",
      "message": "string",
      "entry_type": "system|assistant|user|result",
      "subtype": "init|thinking|tool_use|tool_call|tool_result|text|file_changed",
      "tool_name": "string|null",
      "tool_input": "object|null",
      "usage": {"input_tokens": int, "output_tokens": int},
      "raw_data": {...}
    }
  ],
  "result": {
    // Can be array of message objects or single result object
    // Array format: [{ role, content: [{type, text}], ... }]
    // Object format: { plan, files_changed, usage, model, ... }
  },
  "stage_folder": "string",
  "has_streaming_logs": bool,
  "has_result": bool,
  "error": "string|null"
}
```

### Key Design Principles

1. **Progressive Disclosure**: Show the most important information first (summary, outcomes) and hide technical details (tool parameters, system messages) in collapsible sections.

2. **Smart Defaults**: Expand entries that contain high-value information (thinking blocks, errors, file changes) while keeping routine operations collapsed to reduce noise.

3. **Preserve User Intent**: If the user has manually scrolled or expanded specific entries, respect that state and don't disrupt it with automatic updates.

4. **Scanning Efficiency**: Use strong visual hierarchy, clear icons, and concise summaries to enable users to quickly understand what happened in each stage without reading full logs.

### Accessibility Considerations

- Ensure all interactive elements (expand/collapse buttons, scroll indicators) are keyboard accessible
- Use semantic HTML for collapsible sections (`<details>`, `<summary>`)
- Provide sufficient color contrast for all text and icons
- Add ARIA labels for icon-only buttons and status indicators

### Performance Considerations

- Memoize expensive parsing operations to avoid repeated computation
- Use virtualization for very long log lists (100+ entries)
- Implement result caching to avoid re-parsing on re-renders
- Optimize scroll event listeners to avoid performance bottlenecks
