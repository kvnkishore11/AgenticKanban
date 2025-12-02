# Task Clarification

You are confirming your understanding of a task before the AI begins planning and implementation.

## Variables
task_description: $1
feedback: $2

## Read First

Read PROJECT_CONTEXT.md to understand this project.

## Your Goal

**Confirm you understand what the user wants.** Be conversational, not formal.

Think about:
1. What part of the codebase is this about? (Frontend? Backend? ADW workflow? API?)
2. What existing features does this relate to?
3. Is this clear enough to start planning, or do you have genuine questions?

## How to Respond

### If you understand clearly:
Write 1-2 paragraphs explaining what you'll do, in plain language. Start with something like:
- "Got it! You want me to..."
- "I understand - you're looking for..."
- "So basically, you want..."

End with: "Does this sound right?"

### If something is unclear:
First explain what you DO understand, then ask your questions. Only ask questions if they would genuinely change what you build. Don't ask generic questions like "any edge cases?" - those will be figured out during implementation.

## Output Format

Return ONLY raw JSON - no markdown, no code blocks, no explanation before or after. Just the JSON object:

{"understanding": "...", "questions": [...], "confidence": "high|medium|low"}

Fields:
- understanding (REQUIRED): Your conversational explanation of what you'll do. 1-2 paragraphs. Start with "Got it!" or "I understand -" and end with "Does this sound right?"
- questions (REQUIRED): Array of genuine questions. Can be empty [] if everything is clear.
- confidence (REQUIRED): "high", "medium", or "low"

## Examples (for reference - DO NOT include the quotes/labels in your output)

High confidence example - clear task:
{"understanding": "Got it! You want me to add a dark mode toggle to the settings. Since this is a React app with Zustand for state, I'll add a theme preference to the settings store and create a toggle component in the settings panel. The theme will persist across sessions and apply to all the UI components including the Kanban board, task cards, and modals. Does this sound right?", "questions": [], "confidence": "high"}

Low confidence example - needs clarification:
{"understanding": "I understand you're experiencing performance issues, but I need to narrow down where. This project has three layers - the React frontend, the FastAPI backend, and the ADW automation system - and each has different performance characteristics.", "questions": ["Is the slowness in the UI (Kanban board feels sluggish), the API (loading tasks takes too long), or the ADW workflows (planning/building takes too long)?", "When did this start - always been slow, or got slower recently?"], "confidence": "low"}

Medium confidence example - mostly clear with one question:
{"understanding": "You want to add a search feature to find tasks on the Kanban board. I'll add a search input component that filters tasks by title and description as you type. The filtering will happen client-side since we already load all tasks, and it'll search across all columns. Does this sound right?", "questions": ["Should search also look at task comments/notes, or just title and description?"], "confidence": "medium"}

## Task Description

$1

## Feedback (if any)

$2

---

CRITICAL: Read PROJECT_CONTEXT.md first. Then output ONLY a single JSON object with "understanding", "questions", and "confidence" fields. No other text before or after the JSON.
