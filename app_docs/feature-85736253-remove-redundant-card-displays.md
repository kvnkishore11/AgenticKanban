# Remove Redundant Card Displays

**ADW ID:** 85736253
**Date:** 2025-11-14
**Specification:** specs/issue-3-adw-85736253-sdlc_planner-remove-redundant-card-displays.md

## Overview

This chore removes redundant stage progression displays from Kanban cards. Previously, cards showed P I T R D (Plan, Implement, Test, Review, Document) stage badges both in the collapsed card view and the expanded modal view with percentage displays. This change eliminates the compact stage badges from the card itself and removes the percentage text from the expanded modal, keeping only the visual progress bar.

## Screenshots

![Kanban Card with Stage Badges](assets/01_kanban_card_with_stage_badges.png)
*Kanban card after changes - compact stage badges removed, cleaner card layout*

## What Was Built

- Removed compact stage progression indicator from KanbanCard component
- Disabled percentage text display in CardExpandModal while preserving progress bar
- Streamlined card UI by removing redundant workflow status information

## Technical Implementation

### Files Modified

- `src/components/kanban/KanbanCard.jsx`: Removed compact StageProgressionIndicator section (lines 343-356) that displayed P I T R D badges with percentage in the card body
- `src/components/kanban/CardExpandModal.jsx`: Changed `showPercentage` prop from `true` to `false` to hide percentage text while keeping the progress bar visual

### Key Changes

- **KanbanCard.jsx (lines 343-356)**: Deleted entire compact Stage Progression Indicator block including conditional rendering logic, StageProgressionIndicator component call with compact props, and surrounding container div
- **CardExpandModal.jsx (line 361)**: Modified StageProgressionIndicator to set `showPercentage={false}`, removing "Progress: X%" text while maintaining visual progress bar
- The StageProgressionIndicator component itself was not modified - it already supported the `showPercentage` prop to control percentage display

## How to Use

The changes are automatic and require no user action:

1. View Kanban board - cards now show cleaner layout without compact P I T R D stage badges
2. Click on any task card to expand it
3. In the expanded modal, view the Workflow Status section which displays:
   - Full stage progression badges (Plan, Implement, Test, Review, Document)
   - Visual progress bar showing completion
   - No percentage text (removed to reduce clutter)

## Configuration

No configuration required. Changes are applied automatically to all Kanban cards.

## Testing

To verify the changes work correctly:

1. Start development server: `npm run dev`
2. Navigate to Kanban board with tasks in various workflow stages
3. Verify collapsed cards no longer show compact P I T R D badges
4. Click on a card to expand the modal
5. Confirm expanded modal shows stage progression with progress bar but no percentage text
6. Test with tasks at different stages (planning, implementing, testing, etc.)

## Notes

- The "P I T R D" abbreviations refer to: Plan, Implement, Test, Review, Document stages
- Only tasks with active workflows (`queuedStages.length > 0`) and not in completed/errored states previously showed stage progression
- The visual progress bar remains in the expanded modal to provide workflow status feedback
- This change improves card design by removing redundant information while keeping essential workflow visibility in the expanded view
- No changes were made to the StageProgressionIndicator component itself - it already supported conditional percentage display via props
