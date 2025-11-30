# Merge ADW Worktree

Merge an isolated ADW worktree into the main branch using automated git operations. This command provides a streamlined workflow for integrating completed work from an ADW worktree without relying on GitHub PRs.

## Variables

adw_id: $ARGUMENT (required)
merge_method: $ARGUMENT (optional, default: "squash", options: "squash"|"merge"|"rebase"|"squash-rebase")

## Instructions

Merge the worktree for the given ADW ID into the main branch and clean up resources.

Key requirements:
- Validate ADW ID and worktree exist
- Load ADW state to get branch name and worktree path
- Stash any uncommitted changes in main repository before merge
- Perform git merge in main repository
- Handle merge conflicts with Claude Code assistance if needed
- Restore config files to main repository paths (fixes worktree-specific paths)
- Run validation tests to ensure merge is clean
- Clean up worktree after successful merge
- Update ADW state with merge status
- Restore stashed changes after merge

This command is designed to work with or without an associated issue number, making it flexible for various workflows.

## Run

Execute the merge worktree Python script:

```bash
cd adws
uv run adw_merge_iso.py {adw_id} {merge_method}
```

The script will:

1. Initialize workflow (load ADW state, validate, setup logger and WebSocket notifier)
2. Post initial merge status to GitHub issue
3. Validate worktree exists and branch is accessible
4. Stash any uncommitted changes in main repository (auto-restores after merge)
5. Fetch latest from origin and checkout main branch
6. Pull latest main to ensure we're up to date
7. Perform the merge using the specified method:
   - **squash**: Squash all commits into one, requires commit
   - **merge**: Regular merge preserving commit history (--no-ff)
   - **rebase**: Fast-forward if possible, falls back to merge
   - **squash-rebase**: Worktree-safe squash that merges from origin/branch
8. If conflicts occur, invoke Claude Code for automatic resolution
9. Restore config files (.mcp.json, playwright-mcp-config.json) to main repo paths
10. Run validation tests (pytest) to ensure merge is clean
11. Push merged changes to remote main
12. Clean up worktree using `worktree_ops.remove_worktree()`
13. Delete remote branch
14. Update ADW state and send WebSocket completion notification

## Config File Handling

Worktrees often modify `.mcp.json` and `playwright-mcp-config.json` to point to
worktree-specific paths (e.g., `trees/adw-id/...`). After merge, these files are
automatically restored to main repository paths to prevent breaking the main repo.

## Error Handling

The script handles these error scenarios:

- **ADW ID not found**: Exit with error, sends WebSocket failure notification
- **Worktree doesn't exist**: Exit with error explaining worktree is missing
- **Uncommitted changes**: Automatically stashed and restored after merge
- **Merge conflicts**: Invoke Claude Code to resolve, fail if unresolvable
- **Test failures**: Abort merge, restore original branch and stashed changes
- **Push failures**: Report error but don't clean up worktree (allow manual recovery)
- **Cleanup failures**: Log warning but don't fail the merge (cleanup is optional)

## Safety Features

- Uncommitted changes are stashed before merge and restored after
- All operations are logged for debugging
- Merge happens in main repository, preserving worktree state
- Config files are restored to main repo paths after merge
- Tests must pass before push to main
- Worktree cleanup only happens after successful merge and push
- Original branch is restored if merge fails
- WebSocket notifications sent on success/failure for UI updates

## Report

Report the results of the merge operation:
- Branch that was merged
- Merge method used (squash/merge/rebase/squash-rebase)
- Test results
- Config restoration status
- Cleanup status
- Final git status on main branch
- Any errors or warnings encountered
