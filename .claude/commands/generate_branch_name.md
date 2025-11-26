# Generate Git Branch Name

Generate a Git branch name from the provided issue data.

## Variables

issue_class: $ARGUMENT
adw_id: $ARGUMENT
issue: $ARGUMENT

## Instructions

- Generate a branch name in the format: `<issue_class>-issue-<issue_number>-adw-<adw_id>-<concise_name>`
- The `<concise_name>` should be:
  - 3-6 words maximum
  - All lowercase
  - Words separated by hyphens
  - Descriptive of the main task/feature
  - No special characters except hyphens
- Valid issue_class values: feat, bug, chore, test, fix, refactor, docs, style, perf, ci
- Examples:
  - `feat-issue-123-adw-a1b2c3d4-add-user-auth`
  - `bug-issue-456-adw-e5f6g7h8-fix-login-error`
  - `chore-issue-789-adw-i9j0k1l2-update-dependencies`
  - `test-issue-323-adw-m3n4o5p6-fix-failing-tests`
- Extract the issue number from the issue JSON's "number" field

## Run

Generate the branch name based on the instructions above.
Do NOT create or checkout any branches - just generate the name.

## Output Format

**CRITICAL: Your entire response must be EXACTLY the branch name string and nothing else.**

- Do NOT include any explanation, reasoning, or commentary
- Do NOT include bullet points, prefixes, or formatting
- Do NOT include phrases like "The branch name is:" or "Here is the branch name:"
- Do NOT use markdown code blocks or backticks

**CORRECT output example:**
feat-issue-42-adw-abc12345-add-dark-mode

**INCORRECT output examples:**
- "The branch name is: feat-issue-42-adw-abc12345-add-dark-mode" (has prefix text)
- "feat-issue-42-adw-abc12345-add-dark-mode" (has quotes)
- `feat-issue-42-adw-abc12345-add-dark-mode` (has backticks)
- Any multi-line response with reasoning