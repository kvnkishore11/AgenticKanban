# Chore: Create Merge Worktree Slash Command

## Metadata
issue_number: `22`
adw_id: `73156739`
issue_json: `{"number":22,"title":"We might not need an issue number","body":"We might not need an issue number. we will have to merge the worktree with this adw_id inot the main branch. we should create a /slash command that will be triggered by this. which should use headless claude mode like claude -p \"merged worktree {adw_id} into main branch. If there are any merge conflicts try to resolve them. Once done, you should clear the worktree\". \n\nFollow the best software developer practices and try to incorporte this in our system (both frontend adn also adw system)\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/a3eb3497-f692-4e59-8076-7e659bf603b8)\n\n"}`

## Chore Description
Create a new `/merge_worktree` slash command that automates the process of merging an ADW worktree into the main branch. This command should:
- Accept an ADW ID as input
- Use Claude Code in headless mode to perform the merge
- Handle merge conflicts automatically
- Clean up the worktree after successful merge
- Integrate with both the frontend kanban system and the ADW backend system

This simplifies the workflow by removing the dependency on issue numbers for merging worktrees, allowing developers to directly merge completed work from isolated environments.

## Relevant Files
Use these files to resolve the chore:

- `.claude/commands/cleanup_worktrees.md` - Existing worktree cleanup command that provides patterns for worktree management
- `adws/adw_modules/worktree_ops.py` - Contains worktree operations including `remove_worktree()`, `validate_worktree()`, and `get_worktree_path()` functions
- `adws/adw_modules/git_ops.py` - Contains git operations including `approve_pr()`, `merge_pr()`, `get_current_branch()`, and `push_branch()` functions
- `adws/adw_modules/state.py` - State management for ADW workflows, tracks worktree paths and branch names
- `adws/adw_ship_iso.py` - Existing ship workflow that approves and merges PRs, provides pattern for final merge operations
- `.claude/commands/chore.md` - Reference for slash command structure and formatting
- `.claude/commands/classify_adw.md` - Documentation on ADW classification system (relevant if adding new ADW script)
- `adws/README.md` - Comprehensive ADW system documentation including worktree architecture and workflow patterns

### New Files
- `.claude/commands/merge_worktree.md` - New slash command definition for merging worktrees
- `adws/adw_merge_worktree.py` (optional) - Python script to orchestrate merge operations if needed for complex logic

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create the Merge Worktree Slash Command
- Create `.claude/commands/merge_worktree.md` following the pattern from other commands
- Define command parameters:
  - `adw_id` (required): The ADW ID of the worktree to merge
  - `merge_method` (optional): Default to "squash", support "merge", "rebase"
- Document the command flow:
  1. Validate the ADW ID exists
  2. Load ADW state to get worktree path and branch name
  3. Validate worktree exists using `worktree_ops.validate_worktree()`
  4. Switch to main branch and pull latest changes
  5. Attempt to merge the worktree branch into main
  6. If conflicts occur, use Claude Code headless mode to resolve them
  7. Run validation commands to ensure merge is clean
  8. Push merged changes to main
  9. Clean up worktree using `worktree_ops.remove_worktree()`
- Include error handling for:
  - ADW ID not found
  - Worktree doesn't exist
  - Merge conflicts that can't be auto-resolved
  - Test failures after merge

### Step 2: Implement Core Merge Logic
- Add merge logic to `.claude/commands/merge_worktree.md` that:
  - Validates worktree state using existing `validate_worktree()` function
  - Checks out main branch in project root: `git checkout main && git pull origin main`
  - Fetches the worktree branch: `git fetch origin {branch_name}`
  - Attempts merge: `git merge {branch_name} --no-ff` (or squash based on parameter)
  - Detects conflicts by checking git status
  - If conflicts exist, invoke Claude Code to resolve:
    ```bash
    claude -p "I need help resolving merge conflicts in the following files: {conflict_files}.
    The changes are from ADW worktree {adw_id}. Please analyze the conflicts and resolve them
    following best practices. After resolving, run tests to validate the merge."
    ```
- Ensure the command runs validation tests before finalizing merge
- Add logging at each step for traceability

### Step 3: Integrate Worktree Cleanup
- After successful merge, call worktree cleanup operations:
  - Use `worktree_ops.remove_worktree(adw_id, logger)` to clean up the worktree directory
  - Run `git worktree prune` to clean up git metadata
  - Optionally clean up the remote branch: `git push origin --delete {branch_name}`
- Add cleanup confirmation logging
- Handle cleanup failures gracefully (log warning but don't fail the merge)

### Step 4: Add State Management Integration
- Load ADW state at the beginning using `ADWState.load(adw_id)`
- Validate required state fields exist:
  - `worktree_path`
  - `branch_name`
  - `issue_number` (optional, may not exist per issue description)
- After successful merge, update state or archive it
- Consider adding a "merged" status to ADW state for tracking

### Step 5: Create Optional Python Orchestrator Script
- If complex logic is needed beyond bash commands, create `adws/adw_merge_worktree.py`
- This script should:
  - Parse command line arguments (adw_id, merge_method)
  - Load and validate ADW state
  - Orchestrate the merge process with proper error handling
  - Use existing functions from `git_ops.py` and `worktree_ops.py`
  - Log all operations for debugging
- Follow the pattern from `adw_ship_iso.py` for structure
- Make it executable with: `chmod +x adws/adw_merge_worktree.py`

### Step 6: Add Frontend Integration Points
- Document how the frontend kanban system can trigger this command
- Add WebSocket message support if using `adw_triggers/trigger_websocket.py`
- Consider adding a "Merge" button in the kanban UI that calls this command
- Ensure the command can be triggered with: `uv run adws/adw_merge_worktree.py {adw_id}`

### Step 7: Update Documentation
- Add the new command to `adws/README.md` in the appropriate section
- Document the merge workflow including:
  - When to use `/merge_worktree` vs. normal PR merge
  - How it differs from `/ship` command
  - Prerequisites and requirements
  - Example usage scenarios
- Update `.claude/commands/classify_adw.md` if a new ADW script was created

### Step 8: Run Validation Commands
- Test the slash command with a test worktree
- Verify worktree cleanup works correctly
- Ensure no regressions in existing ADW workflows
- Run all validation commands listed below

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/73156739 && git worktree list` - Verify worktree list command works
- `ls -la /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/73156739/.claude/commands/merge_worktree.md` - Verify slash command file exists
- `cat /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/73156739/.claude/commands/merge_worktree.md | head -20` - Verify command structure is correct
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/73156739/adws && uv run python -c "from adw_modules.worktree_ops import remove_worktree; print('Import successful')"` - Verify worktree_ops module imports correctly
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/73156739/adws && uv run python -c "from adw_modules.git_ops import merge_pr; print('Import successful')"` - Verify git_ops module imports correctly
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/73156739 && grep -r "merge_worktree" .claude/commands/` - Verify command is registered
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/73156739 && grep -r "merge_worktree" adws/README.md` - Verify documentation is updated
- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The merge process should be as automated as possible but safe - prefer to fail and ask for human intervention rather than force a bad merge
- Consider adding dry-run mode (`--dry-run`) to preview merge without executing
- The command should work with or without an associated issue number (per the chore description)
- Ensure proper logging throughout for debugging failed merges
- Consider adding metrics/tracking for successful vs. failed merges
- The command should be idempotent - running it multiple times on the same worktree should be safe
- Think about how this integrates with the existing `/ship` command - they may have overlapping functionality
- Since this removes dependency on issue numbers, ensure the command can handle worktrees created without issue context
