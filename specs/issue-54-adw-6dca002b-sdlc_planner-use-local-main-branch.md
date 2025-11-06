# Chore: Use Local Main Branch Instead of Origin/Main

## Metadata
issue_number: `54`
adw_id: `6dca002b`
issue_json: `{"number":54,"title":"whenever we are use install_worktree or merge_work...","body":"whenever we are use install_worktree or merge_worktree i dont want to reference origin main. instead i just want to use my local branch main. \n\ndo this change where ever it is applicable in the code base including /commands , /scripts, adws/"}`

## Chore Description
Update all references to `origin/main` and `origin main` to use the local `main` branch instead. This change applies to:
- ADW Python scripts in `adws/` directory
- Claude Code slash commands in `.claude/commands/` directory
- Shell scripts in `scripts/` directory (if any)

The primary motivation is to eliminate dependencies on remote branch state and instead use the local main branch for worktree creation, merge operations, and diff comparisons. This provides more control and eliminates potential issues with stale remote references.

## Relevant Files
Use these files to resolve the chore:

- **adws/adw_modules/worktree_ops.py** (lines 56-58)
  - Creates worktrees branching from `origin/main`
  - Needs to change to use local `main` branch

- **adws/adw_merge_worktree.py** (multiple references)
  - Documentation mentions pushing to `origin/main`
  - Comments should be updated for clarity

- **adws/adw_ship_iso.py** (lines 19, 119-120, 128, 297)
  - Documentation and comments mention `origin/main`
  - Push operations to `origin/main` (these should remain as they're actual push operations)

- **adws/adw_complete_iso.py** (lines 19, 120-121, 129, 323)
  - Documentation and comments mention `origin/main`
  - Push operations to `origin/main` (these should remain as they're actual push operations)

- **adws/adw_document_iso.py** (lines 62, 72, 74, 85, 378)
  - Uses `git diff origin/main` to check for changes
  - Needs to change to use local `main` branch

- **adws/adw_modules/workflow_ops.py** (line 807)
  - Uses `git diff origin/main` to check for changes
  - Needs to change to use local `main` branch

- **.claude/commands/review.md** (line 15)
  - Instructs to run `git diff origin/main`
  - Needs to change to use local `main` branch

- **.claude/commands/document.md** (lines 14-16)
  - Instructs to run `git diff origin/main`
  - Needs to change to use local `main` branch

- **.claude/commands/pull_request.md** (lines 32-34)
  - Instructs to run `git diff origin/main...HEAD`
  - Needs to change to use local `main` branch

- **.claude/commands/resolve_failed_test.md** (line 13)
  - Instructs to run `git diff origin/main`
  - Needs to change to use local `main` branch

- **.claude/commands/merge_worktree.md** (line 50)
  - Documentation mentions pushing to `origin/main`
  - Comments should be updated for clarity

- **.claude/commands/track_agentic_kpis.md** (line 36)
  - Instructs to run `git diff origin/main`
  - Needs to change to use local `main` branch

- **adws/README.md** (line 387)
  - Documentation mentions pushing to `origin/main`
  - Comments should be updated for clarity

**Note:** The `.claude/commands/install.md` file mentions `git push -u origin main` which is a legitimate push operation and should NOT be changed.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update worktree creation to use local main
- Modify `adws/adw_modules/worktree_ops.py` line 58
- Change `cmd = ["git", "worktree", "add", "-b", branch_name, worktree_path, "origin/main"]` to use `"main"` instead of `"origin/main"`

### Step 2: Update git diff commands in ADW Python scripts
- Modify `adws/adw_document_iso.py` line 74
  - Change `["git", "diff", "origin/main", "--stat"]` to use `"main"` instead of `"origin/main"`
- Modify `adws/adw_modules/workflow_ops.py` line 807
  - Change `["git", "diff", "origin/main", "--name-only"]` to use `"main"` instead of `"origin/main"`

### Step 3: Update documentation comments in ADW Python scripts
- Update comments in `adws/adw_document_iso.py` lines 62, 72, 85, 378
  - Change references from `origin/main` to `main` in comments and log messages
- Update documentation in `adws/adw_merge_worktree.py` line 26
  - Change "Push merged changes to origin/main" to "Push merged changes to remote main"
- Update documentation in `adws/adw_ship_iso.py` line 19
  - Change "Push to origin/main" to "Push to remote main"
- Update documentation in `adws/adw_complete_iso.py` line 19
  - Change "Push to origin/main" to "Push to remote main"
- Update `adws/README.md` line 387
  - Change "Pushes merged changes to origin/main" to "Pushes merged changes to remote main"

**Note:** Keep actual `git push origin main` commands as-is since those are legitimate push operations to the remote repository.

### Step 4: Update slash commands to use local main
- Modify `.claude/commands/review.md` line 15
  - Change `git diff origin/main` to `git diff main`
- Modify `.claude/commands/document.md` lines 14-16
  - Change all instances of `git diff origin/main` to `git diff main`
- Modify `.claude/commands/pull_request.md` lines 32-34
  - Change `git diff origin/main...HEAD` to `git diff main...HEAD`
  - Change `git log origin/main..HEAD` to `git log main..HEAD`
- Modify `.claude/commands/resolve_failed_test.md` line 13
  - Change `git diff origin/main` to `git diff main`
- Modify `.claude/commands/merge_worktree.md` line 50
  - Change "Push merged changes to origin/main" to "Push merged changes to remote main"
- Modify `.claude/commands/track_agentic_kpis.md` line 36
  - Change `git diff origin/main` to `git diff main`

### Step 5: Verify no scripts directory changes needed
- Check if `scripts/` directory contains any references to `origin/main` or `origin main`
- Based on grep results, no changes are needed in the scripts directory

### Step 6: Run validation commands
- Execute the validation commands below to ensure the chore is complete with zero regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `grep -r "origin/main" adws/ .claude/commands/ scripts/ || echo "No origin/main references found"` - Verify all origin/main references have been replaced
- `grep -r "origin main" adws/ .claude/commands/ scripts/ || echo "No origin main references found"` - Verify all origin main references have been replaced
- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- This change only affects references used for branching and diff operations. Actual `git push origin main` commands remain unchanged as they are legitimate remote push operations.
- The change eliminates dependency on remote branch state by using local main branch as the reference point.
- After this change, users should ensure their local main branch is up to date before running ADW workflows.
- The fetch operation in `worktree_ops.py` (line 47-54) can remain as it updates the remote tracking branches without affecting the worktree creation logic.
