# Merge Execute - Agent-Based Worktree Merge

Execute a worktree merge with intelligent error handling. This command runs within a persistent agent context, allowing it to fix issues (test failures, conflicts, config problems) without spawning new processes.

## Variables

adw_id: $ARGUMENT (required) - The ADW ID of the worktree to merge
merge_method: $ARGUMENT (optional, default: "squash") - Merge strategy: squash|merge|rebase

## Context

You are merging an isolated worktree back to main. You have full authority to:
- Fix failing tests
- Resolve merge conflicts
- Update configuration files
- Retry operations after fixing issues

Do NOT give up on first error. Try to fix issues yourself.

## Instructions

### Step 1: Load ADW State

```bash
cd adws
uv run -c "
from adw_modules.state import ADWState
import json
state = ADWState.load('{adw_id}')
if state:
    print(json.dumps({
        'branch_name': state.get('branch_name'),
        'worktree_path': state.get('worktree_path'),
        'issue_number': state.get('issue_number')
    }, indent=2))
else:
    print('ERROR: State not found')
"
```

If state not found, exit with error.

### Step 2: Validate Branch Exists

Check if the branch exists locally or on remote:

```bash
git branch --list {branch_name} || git branch -r --list origin/{branch_name}
```

If branch doesn't exist, check if already merged to main and report success.

### Step 3: Stash Any Uncommitted Changes

```bash
git stash push -m "merge-{adw_id}-$(date +%s)"
```

Remember to restore stash after merge completes.

### Step 4: Fetch and Checkout Main

```bash
git fetch origin
git checkout main
git pull origin main
```

### Step 5: Perform Merge

Based on merge_method:

**squash** (default - recommended for worktrees):
```bash
git merge --squash origin/{branch_name}
git commit -m "feat: merge {branch_name} (squash)"
```

**merge** (preserve history):
```bash
git merge --no-ff origin/{branch_name} -m "Merge {branch_name}"
```

**rebase** (fast-forward if possible):
```bash
git merge --ff-only origin/{branch_name} || git merge origin/{branch_name}
```

### Step 6: Handle Conflicts (If Any)

If merge has conflicts:
1. List conflicting files: `git diff --name-only --diff-filter=U`
2. For each conflicting file:
   - Read the file
   - Understand both versions (ours vs theirs)
   - Make intelligent resolution (usually prefer incoming changes from feature branch)
   - Stage the resolved file: `git add {file}`
3. Complete the merge: `git commit -m "Merge {branch_name} with conflict resolution"`

### Step 7: Restore Config Files

After merge, config files may have worktree-specific paths. Fix them:

```bash
# Check .mcp.json for worktree paths
if grep -q "trees/{adw_id}" .mcp.json 2>/dev/null; then
    # Replace worktree paths with main repo paths
    sed -i '' 's|trees/{adw_id}/||g' .mcp.json
    git add .mcp.json
fi

# Check playwright config
if grep -q "trees/{adw_id}" playwright-mcp-config.json 2>/dev/null; then
    sed -i '' 's|trees/{adw_id}/||g' playwright-mcp-config.json
    git add playwright-mcp-config.json
fi

# Amend if configs were fixed
git diff --cached --quiet || git commit --amend --no-edit
```

### Step 8: Run Validation Tests

Run the merge utility tests to ensure merge is clean:

```bash
cd adws
uv run pytest utils/merge/tests/ -v
```

**IMPORTANT**: If tests fail:
1. Read the test output carefully
2. Identify the failing test and the assertion error
3. Fix the test or the code causing the failure
4. Re-run tests
5. Repeat until all tests pass

Do NOT give up on test failures. Fix them.

### Step 9: Push to Main

```bash
git push origin main
```

### Step 10: Cleanup Worktree

```bash
# Remove worktree if it exists
if [ -d "{worktree_path}" ]; then
    git worktree remove "{worktree_path}" --force
fi

# Prune any stale worktree references
git worktree prune

# Delete remote branch
git push origin --delete {branch_name} 2>/dev/null || true
```

### Step 11: Restore Stash

```bash
git stash pop || true
```

### Step 12: Send Completion Notification

```bash
cd adws
uv run -c "
from adw_modules.websocket_client import WebSocketNotifier
notifier = WebSocketNotifier('{adw_id}')
notifier.notify_complete('adw_merge_iso', 'Merge completed successfully')
notifier.close()
"
```

## Error Handling Strategy

For EACH error encountered:

1. **Test Failures**: Read output, fix the test/code, retry
2. **Merge Conflicts**: Read both versions, make smart resolution
3. **Push Failures**: Check if branch protection, retry with force if appropriate
4. **Config Issues**: Fix paths, re-commit
5. **Missing Files**: Check if renamed/deleted, update references

Only report failure if you've exhausted reasonable attempts (3+ tries for same issue).

## Report

When complete, report:
- Branch merged
- Merge method used
- Number of issues fixed (if any)
- Test results
- Final status

If failed after multiple attempts, report:
- What was tried
- What failed
- Suggested manual intervention
