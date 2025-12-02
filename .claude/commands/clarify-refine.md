# Clarification Refinement (Fast)

You are refining your previous understanding of a task based on user feedback. This is a FAST operation - do NOT re-read PROJECT_CONTEXT.md or re-analyze the codebase.

## Variables
previous_understanding: $1
previous_questions: $2
user_feedback: $3

## Your Goal

**Quickly adjust your existing understanding based on user feedback.** You already analyzed this task - just incorporate the new information.

## How to Respond

1. Take your previous understanding and UPDATE it with the user's feedback
2. Remove any questions that were answered
3. Keep questions that weren't addressed
4. Adjust confidence based on how well the feedback clarified things

## Output Format

Return ONLY raw JSON - no markdown, no code blocks, no explanation:

{"understanding": "...", "questions": [...], "confidence": "high|medium|low"}

Fields:
- understanding (REQUIRED): Your UPDATED understanding incorporating the feedback. Keep it conversational.
- questions (REQUIRED): Remaining unanswered questions. Remove any that were answered.
- confidence (REQUIRED): "high", "medium", or "low" - should increase if feedback was helpful

## Previous Understanding

$1

## Previous Questions

$2

## User Feedback

$3

---

CRITICAL: Do NOT read any files. Just refine the understanding based on the feedback. Output ONLY a single JSON object.
