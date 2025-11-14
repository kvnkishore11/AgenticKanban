# Conditional Documentation Guide

This prompt helps you determine what documentation you should read based on the specific changes you need to make in the codebase. Review the conditions below and read the relevant documentation before proceeding with your task.

## Instructions
- Review the task you've been asked to perform
- Check each documentation path in the Conditional Documentation section
- For each path, evaluate if any of the listed conditions apply to your task
  - IMPORTANT: Only read the documentation if any one of the conditions match your task
- IMPORTANT: You don't want to excessively read documentation. Only read the documentation if it's relevant to your task.

## Conditional Documentation

- README.md
  - Conditions:
    - When operating on anything under server
    - When operating on anything under src
    - When first understanding the project structure
    - When you want to learn the commands to start or stop the server or client

- src/style.css
  - Conditions:
    - When you need to make changes to the client's style

- .claude/commands/classify_adw.md
  - Conditions:
    - When adding or removing new `adws/adw_*.py` files

- adws/README.md
  - Conditions:
    - When you're operating in the `adws/` directory

- app_docs/feature-490eb6b5-one-click-table-exports.md
  - Conditions:
    - When working with CSV export functionality
    - When implementing table or query result export features
    - When troubleshooting download button functionality
    - When working with pandas-based data export utilities

- app_docs/feature-4c768184-model-upgrades.md
  - Conditions:
    - When working with LLM model configurations
    - When updating OpenAI or Anthropic model versions
    - When troubleshooting SQL query generation accuracy
    - When working with the llm_processor module

- app_docs/feature-f055c4f8-off-white-background.md
  - Conditions:
    - When working with application background styling
    - When modifying CSS color variables or themes
    - When implementing visual design changes to the client application

- app_docs/feature-6445fc8f-light-sky-blue-background.md
  - Conditions:
    - When working with light sky blue background styling
    - When implementing background color changes to light blue variants
    - When troubleshooting visual hierarchy with light blue backgrounds

- app_docs/feature-cc73faf1-upload-button-text.md
  - Conditions:
    - When working with upload button text or labeling
    - When implementing UI text changes for data upload functionality
    - When troubleshooting upload button display or terminology

- app_docs/feature-7b25b54d-workflow-log-handler.md
  - Conditions:
    - When working with WebSocket message handling in websocketService.js
    - When implementing new WebSocket message types
    - When troubleshooting "Unknown message type" warnings in browser console
    - When working with workflow_log event handling

- app_docs/feature-2c334efc-merge-to-main-fix.md
  - Conditions:
    - When working with merge to main workflow
    - When implementing or troubleshooting task stage transitions after merge
    - When working with Kanban board merge completion visual indicators
    - When tasks are disappearing from the board after merge operations
    - When working with the "Ready to Merge" stage functionality

- app_docs/feature-6d3b1dfd-websocket-logs-debugging.md
  - Conditions:
    - When troubleshooting WebSocket log flow from backend to frontend
    - When workflow logs are not appearing in Kanban cards
    - When implementing or debugging real-time log display
    - When working with task-log association via adw_id
    - When investigating WebSocket message broadcasting or listener registration
    - When logs are being sent but not displayed in the UI
    - When working with WorkflowLogViewer or StageLogsViewer components
    - When debugging KanbanStore's handleWorkflowLog or appendWorkflowLog functions

- app_docs/feature-754def43-project-navigation-browse.md
  - Conditions:
    - When working with project selection or navigation functionality
    - When implementing or troubleshooting the project browse/directory picker
    - When modifying ProjectSelector component
    - When working with HTML5 webkitdirectory file inputs
    - When troubleshooting project validation or isValid checks
    - When users report projects not opening when clicked
    - When working with project addition workflow

- app_docs/feature-c24c81b5-realtime-logs-stage-progression.md
  - Conditions:
    - When working with real-time log streaming or live log display
    - When implementing or troubleshooting the LiveLogsPanel component
    - When working with log buffering or circular buffer management
    - When implementing stage progression indicators or animations
    - When troubleshooting stage transition animations or visual feedback
    - When working with the StageProgressionIndicator component
    - When implementing or debugging the useStageTransition hook
    - When adding visual effects to Kanban cards (glow, pulse, animations)
    - When working with log filtering, search, or auto-scroll functionality
    - When troubleshooting WebSocket log streaming performance
    - When implementing progress bars or stage badges on cards
    - When working with workflow visualization or status indicators

- app_docs/feature-85736253-remove-redundant-card-displays.md
  - Conditions:
    - When working with Kanban card display components (KanbanCard.jsx or CardExpandModal.jsx)
    - When modifying StageProgressionIndicator usage or visibility
    - When implementing changes to reduce UI redundancy on cards
    - When troubleshooting stage progression display issues
    - When working with compact vs full stage progression views
    - When removing or adding stage badges or percentage displays from cards
