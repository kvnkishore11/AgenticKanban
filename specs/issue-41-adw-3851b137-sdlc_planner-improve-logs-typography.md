# Chore: Improve Logs Communication and Typography

## Metadata
issue_number: `41`
adw_id: `3851b137`
issue_json: `{"number":41,"title":"The app over here /Users/kvnkishore/WebstormProjec...","body":"The app over here /Users/kvnkishore/WebstormProjects/multi-agent-orchestration handles great communication of logs of agents from their backend to the frontend and frontend so perfectly shows the logs. In our app the logs are so minimal. Can you try to see what they have implemented and see if we can incorporate that into our logs. \n\nBy the way I liked the way their text looks(the typography is so sleek) try to adop their style too"}`

## Chore Description
Improve the log communication system in AgenticKanban by incorporating best practices from the reference multi-agent-orchestration app, which features excellent real-time log streaming, comprehensive event tracking, and sleek typography. The reference app demonstrates superior log handling with WebSocket broadcasting, structured event types, AI-generated summaries, and a polished visual presentation using JetBrains Mono, smooth scrolling, and clean markdown rendering.

Key improvements needed:
1. **Enhanced Log Communication**: Real-time streaming with structured events, comprehensive hook/tool use logging, AI summaries, and better categorization
2. **Typography Improvements**: Adopt the sleek, modern typography style from the reference app with proper font stacks, spacing, and markdown rendering

## Relevant Files

### Frontend Components (Log Display)
- **src/components/kanban/WorkflowLogViewer.jsx** - Main log viewer component; needs enhanced real-time streaming, better event categorization, improved visual presentation with new typography
- **src/components/kanban/StageLogsViewer.jsx** - Stage-specific logs viewer; needs better integration with real-time updates and improved typography
- **src/utils/websocketService.js** - WebSocket client; needs support for more event types (agent_log, thinking_block, tool_use_block) with structured payload handling

### Backend API (Log Generation & Broadcasting)
- **server/api/stage_logs.py** - Stage logs endpoint; needs enhancement to provide more structured log data with timestamps, levels, and event categorization
- **server/core/logger.py** - Backend logging utility; needs structured logging format compatible with frontend event stream
- **server/server.py** - FastAPI main server; needs WebSocket event broadcasting similar to reference app's `websocket_manager.py`

### Styling & Typography
- **src/index.css** - Global styles; needs updated font imports (JetBrains Mono for code, Inter/system fonts for UI), CSS variables for consistent spacing/colors, and markdown rendering styles
- **src/styles/kanban.css** - Kanban-specific styles; needs improved log viewer styling with smooth scrolling, better contrast, and modern aesthetics
- **src/App.css** - App-level styles; minimal updates needed for consistency

### State Management
- **src/stores/kanbanStore.js** - Zustand store; needs enhanced log state management, real-time event subscription, and filtering capabilities

### New Files

#### Backend WebSocket Manager
- **server/core/websocket_manager.py** - New WebSocket manager module for broadcasting structured events (agent_log, agent_summary_update, system_log, chat_stream) to all connected clients; inspired by reference app's implementation

#### Frontend Event Stream Types
- **src/types/eventStream.ts** - New TypeScript type definitions for structured event types (EventStreamEntry, AgentLogEvent, ThinkingBlockEvent, ToolUseBlockEvent) matching backend event structure

## Step by Step Tasks

### 1. Backend: Implement WebSocket Broadcasting Infrastructure
- Create `server/core/websocket_manager.py` module based on reference app's pattern
  - Implement `WebSocketManager` class with connection management (connect, disconnect, active_connections list)
  - Add broadcast methods: `broadcast_agent_log()`, `broadcast_system_log()`, `broadcast_agent_summary_update()`
  - Add structured event types with timestamps, event_category (hook/response), event_type (PreToolUse, ToolUseBlock, TextBlock)
  - Include connection metadata tracking and error handling
- Update `server/server.py` to integrate WebSocket manager
  - Register WebSocket endpoint `/ws` for real-time connections
  - Create global `ws_manager` instance in app.state
  - Add connection/disconnection handlers
  - Broadcast events during ADW workflow execution (when logs are generated)

### 2. Backend: Enhance Structured Logging in APIs
- Update `server/api/stage_logs.py` to return more structured log data
  - Add `event_category` field (hook, response, status)
  - Add `event_type` field (PreToolUse, ToolUseBlock, TextBlock, ThinkingBlock)
  - Include `summary` field for AI-generated 15-word summaries of events (can be generated client-side initially)
  - Add `payload` field with full event metadata (tool names, parameters, file changes)
  - Ensure all log entries have proper timestamps in ISO format
- Update `server/core/logger.py` for consistent structured output
  - Add log levels: INFO, SUCCESS, WARNING, ERROR, DEBUG
  - Include current_step field for workflow context
  - Add details field for additional context
  - Format logs as JSON for machine parsing while maintaining human readability

### 3. Frontend: Create TypeScript Event Stream Types
- Create `src/types/eventStream.ts` with structured type definitions
  - Define `EventStreamEntry` interface (id, sourceType, eventType, timestamp, content, metadata)
  - Define `AgentLogEvent` interface (agent_id, event_category, event_type, summary, payload)
  - Define `ThinkingBlockEvent` and `ToolUseBlockEvent` interfaces
  - Define `OrchestratorChatEvent` interface for chat messages
  - Export all types for use across frontend components

### 4. Frontend: Enhance WebSocket Service for Structured Events
- Update `src/utils/websocketService.js` to handle new event types
  - Add handlers for `agent_log`, `agent_summary_update`, `system_log` events
  - Add handlers for `thinking_block` and `tool_use_block` events
  - Parse structured payloads and route to Zustand store
  - Add connection status tracking and auto-reconnect logic
  - Emit events to store for real-time UI updates

### 5. Frontend: Update Kanban Store for Enhanced Log State
- Update `src/stores/kanbanStore.js` with enhanced log management
  - Add `eventStream` array for unified event log (similar to reference app)
  - Add `addEventStreamEntry()` action for real-time event insertion
  - Add `updateAgentSummary()` action for live agent status updates
  - Add filtering state (by agent, by event type, by log level)
  - Add `autoScroll` state for controlling scroll behavior
  - Keep existing `workflowLogs` for backward compatibility

### 6. Frontend: Implement Typography System
- Update `src/index.css` with new typography foundation
  - Import JetBrains Mono font for code/monospace content: `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');`
  - Import Inter font for UI text (already present, ensure proper weights)
  - Define CSS variables for font stacks:
    - `--font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;`
    - `--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`
  - Define CSS variables for typography scale (text-xs: 0.75rem, text-sm: 0.875rem, text-base: 1rem, text-lg: 1.125rem)
  - Set global font smoothing: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`
  - Add markdown rendering styles for `.message-content` class (headings, code blocks, lists, blockquotes, tables)
  - Style inline code with background, padding, border-radius, and monospace font
  - Style code blocks with dark background, proper padding, and syntax highlighting support

### 7. Frontend: Enhance WorkflowLogViewer Component
- Update `src/components/kanban/WorkflowLogViewer.jsx` with improved features
  - Apply new typography: use `font-mono` class for log content, proper text sizing (text-xs, text-sm)
  - Add event type icons (similar to reference app's log level icons: AlertCircle, CheckCircle, Info, AlertTriangle)
  - Improve log entry layout: timestamp on right, icon on left, content in center, better spacing
  - Add AI summary display field (if available in log entry)
  - Enhance color coding for log levels with consistent palette (red for ERROR, yellow for WARNING, green for SUCCESS, blue for INFO)
  - Improve auto-scroll behavior with smooth scrolling and bottom-detection
  - Add pagination/virtualization for large log sets (consider react-window if performance issues arise)
  - Style markdown content in log messages using new markdown CSS classes

### 8. Frontend: Enhance StageLogsViewer Component
- Update `src/components/kanban/StageLogsViewer.jsx` for better UX
  - Apply consistent typography across all tabs
  - Add real-time event stream integration for "All" tab (connect to WebSocket events)
  - Show loading states with spinner and proper messaging using new typography
  - Improve empty states with better iconography and messaging
  - Add stage-specific event filtering (show only events from current stage)
  - Display event summaries prominently for quick scanning
  - Ensure smooth transitions between tabs

### 9. Frontend: Update Styling for Log Components
- Update `src/styles/kanban.css` with log-specific improvements
  - Add smooth scrollbar styling (width: 8px, rounded thumb, subtle hover effect)
  - Style log container with proper background, borders, and shadows
  - Add hover effects for log entries (subtle background change, smooth transition)
  - Style timestamps with muted color and proper alignment
  - Add event type badges with rounded corners and color coding
  - Improve spacing and padding throughout log components
  - Ensure responsive design for smaller screens

### 10. Testing: Verify Real-Time Log Streaming
- Start backend server and frontend dev server
- Create a test task and trigger ADW workflow
- Verify WebSocket connection establishes successfully
- Confirm real-time log events appear in WorkflowLogViewer as they're generated
- Test log filtering by level, search functionality
- Verify auto-scroll behavior works correctly (scrolls on new logs, stops on manual scroll)
- Test stage-specific log loading in StageLogsViewer
- Verify all log types render correctly with proper icons, colors, and formatting

### 11. Testing: Verify Typography Improvements
- Review all text elements in log viewers for proper font application
- Verify JetBrains Mono is used for code, logs, and monospace content
- Verify Inter is used for UI labels, buttons, and body text
- Check markdown rendering in log messages (headings, code blocks, lists)
- Verify proper font smoothing and readability
- Test on different screen sizes and browsers
- Compare visual appearance with reference app for consistency

### 12. Run Validation Commands
Execute all validation commands to ensure zero regressions and complete implementation

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/3851b137 && npm run typecheck` - TypeScript type checking (ensure new types are valid)
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/3851b137 && npm run lint` - ESLint validation (ensure code quality)
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/3851b137/server && uv run pytest` - Run server tests to validate backend changes
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/3851b137 && npm run dev` - Start frontend dev server and manually verify log viewer functionality, typography, and WebSocket connectivity
- Manually test: Create task → Trigger workflow → Verify real-time logs appear with proper styling and typography

## Notes

### Reference App Insights (multi-agent-orchestration)

**Log Communication System:**
- Uses WebSocket broadcasting via `WebSocketManager` class with methods like `broadcast_agent_log()`, `broadcast_agent_summary_update()`
- Structured event types: `agent_log`, `orchestrator_chat`, `system_log`, `thinking_block`, `tool_use_block`
- Every event has: timestamp (ISO format), event_category (hook/response), event_type (PreToolUse, ToolUseBlock, TextBlock)
- AI-generated 15-word summaries for quick scanning
- Real-time streaming with Vue 3 reactivity (we'll adapt for React/Zustand)
- Comprehensive filtering: by agent, by category, by event type, by search query

**Typography System:**
- Primary monospace font: `'JetBrains Mono', 'Fira Code', 'Courier New', monospace`
- Primary sans-serif font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`
- Font smoothing: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`
- Typography scale: text-xs (0.75rem), text-sm (0.875rem), text-base (1rem), text-lg (1.125rem)
- Markdown rendering: Comprehensive styles for headings, code blocks, lists, blockquotes, tables, links
- Inline code: Background color, padding, border-radius, monospace font
- Code blocks: Dark background, proper padding, syntax highlighting support
- Line height: 1.6 for readability
- Color palette: Primary text (#ffffff on dark backgrounds), secondary text (#b0b0b0), muted text (#6b7280)

### Key Differences to Address
- Our app currently shows minimal logs (basic text messages)
- Reference app shows structured events with icons, categories, and summaries
- Our typography is standard; reference app uses sleek JetBrains Mono + careful spacing
- Our WebSocket is basic; reference app has comprehensive broadcasting infrastructure
- Reference app has AI summaries for events; we can add this field for future enhancement

### Implementation Priority
1. Backend WebSocket infrastructure (foundation for real-time updates)
2. Frontend event types and WebSocket handlers (enable structured events)
3. Typography system (visual polish)
4. Enhanced log components (improved UX)
5. Testing and validation (ensure quality)

### Future Enhancements (Not in Scope)
- AI-generated summaries for logs (requires LLM integration)
- Advanced filtering UI (multi-select dropdowns, saved filters)
- Log export functionality (CSV, JSON)
- Log analytics dashboard (metrics, charts)
- Real-time collaboration features (multiple users viewing same logs)
