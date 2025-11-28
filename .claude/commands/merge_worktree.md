# Merge ADW Worktree

Merge an isolated ADW worktree into the main branch using automated git operations. This command provides a streamlined workflow for integrating completed work from an ADW worktree without relying on GitHub PRs.

## Variables

adw_id: $ARGUMENT (required)
merge_method: $ARGUMENT (optional, default: "rebase", options: "squash"|"merge"|"rebase")

## Instructions

Merge the worktree for the given ADW ID into the main branch and clean up resources.

Key requirements:
- Validate ADW ID and worktree exist
- Load ADW state to get branch name and worktree path
- Perform git merge in main repository
- Handle merge conflicts with Claude Code assistance if needed
- Run validation tests to ensure merge is clean
- Clean up worktree after successful merge
- Update ADW state with merge status

This command is designed to work with or without an associated issue number, making it flexible for various workflows.

## Run

Execute the merge worktree Python script:

```bash
cd adws
uv run adw_merge_iso.py {adw_id} {merge_method}
```

The script will:

1. Load ADW state and validate worktree exists
2. Get branch name and worktree path from state
3. Switch to main repository (not worktree)
4. Fetch latest changes from origin
5. Checkout and pull main branch
6. Attempt to merge the feature branch
7. If conflicts occur, invoke Claude Code for resolution:
   ```bash
   claude -p "Resolve merge conflicts from ADW worktree {adw_id}.
   The changes are from branch {branch_name}.
   Please analyze the conflicts and resolve them following best practices.
   After resolving, run tests to validate the merge."
   ```
8. Run validation tests (pytest) to ensure merge is clean
9. Push merged changes to remote main
10. Clean up worktree using `worktree_ops.remove_worktree()`
11. Optionally delete remote branch
12. Update ADW state or archive it

## Error Handling

The script handles these error scenarios:

- **ADW ID not found**: Exit with error message prompting user to verify ID
- **Worktree doesn't exist**: Exit with error explaining worktree is missing
- **Merge conflicts**: Invoke Claude Code to resolve, fail if unresolvable
- **Test failures**: Abort merge and report failed tests
- **Push failures**: Report error but don't clean up worktree (allow manual recovery)
- **Cleanup failures**: Log warning but don't fail the merge (cleanup is optional)

## Safety Features

- All operations are logged for debugging
- Merge happens in main repository, preserving worktree state
- Tests must pass before push to main
- Worktree cleanup only happens after successful merge and push
- Idempotent - safe to run multiple times on same worktree
- Original branch is restored if merge fails

## Report

Report the results of the merge operation:
- Branch that was merged
- Merge method used (squash/merge/rebase)
- Test results
- Cleanup status
- Final git status on main branch
- Any errors or warnings encountered
