# Config File Handling in ADW Worktree Merges

## Problem

When working with ADW (Agentic Development Workflow) worktrees, certain configuration files get modified to point to worktree-specific paths:

- `.mcp.json` - Playwright MCP server config path gets updated to `trees/{adw-id}/playwright-mcp-config.json`
- `playwright-mcp-config.json` - Video recording directory gets updated to `trees/{adw-id}/videos`

When these worktrees are merged back to main, these worktree-specific paths break the main repository because the worktree directories are deleted after merge.

## Solution

We've implemented a multi-layered solution:

### 1. Automatic Config Restoration (adw_merge_worktree.py)

The merge script now includes a `restore_config_files()` function that:
- Runs automatically after merge completion
- Detects config files with worktree-specific paths (containing `trees/`)
- Restores them to main repository paths
- Amends the merge commit with the corrected configs

**Location**: Step 5.5 in the merge workflow (after conflict resolution, before validation tests)

### 2. Git Attributes Merge Strategy (.gitattributes)

The `.gitattributes` file marks config files with `merge=ours` strategy:
```
.mcp.json merge=ours
playwright-mcp-config.json merge=ours
```

This tells git to always prefer the main branch version during merge, preventing conflicts.

**Setup**: Requires `git config merge.ours.driver true` (already configured)

### 3. Prevention via Gitignore (Optional Future Enhancement)

Consider adding worktree-specific overrides:
- Create `.mcp.local.json` for worktree-specific configs
- Add to `.gitignore`
- Modify worktree setup to use local configs instead

## Testing

After implementing these fixes:

1. ✅ Merged ADW 25fe0523 - Config paths automatically restored
2. ✅ Merged ADW e2a085da - Config paths automatically restored
3. 🔄 Future merges will handle this automatically

## Monitoring

Check the merge logs for these messages:
- "Restoring configuration files to main repository paths..."
- "✅ Restored N config file(s): .mcp.json, playwright-mcp-config.json"
- "✅ No config files needed fixing"

## Troubleshooting

If config files still have worktree paths after merge:

1. Check if `restore_config_files()` was called (check logs)
2. Verify `.gitattributes` exists and is committed
3. Run `git config --get merge.ours.driver` to verify it's set to `true`
4. Manually run the restoration logic or amend the commit

## Future Improvements

1. Add pre-commit hook in worktrees to warn about config modifications
2. Create worktree-specific config override system
3. Add validation in CI/CD to detect worktree paths in main branch
