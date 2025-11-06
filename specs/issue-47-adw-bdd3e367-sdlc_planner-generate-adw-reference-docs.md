# Chore: Generate ADW Reference Documentation

## Metadata
issue_number: `47`
adw_id: `bdd3e367`
issue_json: `{"number":47,"title":"i want to have a drop of all the adws that are ava...","body":"i want to have a drop of all the adws that are available in my codebase with a small description so that I can refer to any of them later on. you may have to use the filesystem adn other ways of accessing agents folder -> allthe subfoldresa re teh adws in the system. reference: Image.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/f1459c46-9d13-457b-9c15-791b7c81f3da)\n\n"}`

## Chore Description
Create a comprehensive reference document that lists all ADW (AI Developer Workflow) scripts available in the codebase. The document should include:
- All ADW Python scripts (adw_*.py) in the adws/ directory
- A brief description of what each ADW does
- Usage information for each ADW
- Categorization by workflow type (entry points, dependent workflows, orchestrators)

This will serve as a quick reference guide for developers to understand what ADW workflows are available and when to use each one.

## Relevant Files
Use these files to resolve the chore:

- **adws/README.md** - Comprehensive documentation about ADW system architecture, workflows, and usage. Contains detailed descriptions of all ADW scripts that will be extracted and formatted into the reference document.

- **adws/adw_plan_iso.py** - Entry point workflow for planning in isolation. Includes docstring with workflow description and usage.

- **adws/adw_patch_iso.py** - Entry point workflow for quick patches in isolation. Includes docstring with workflow description and usage.

- **adws/adw_build_iso.py** - Dependent workflow for implementation. Includes docstring with workflow description and usage.

- **adws/adw_test_iso.py** - Dependent workflow for testing. Includes docstring with workflow description and usage.

- **adws/adw_review_iso.py** - Dependent workflow for code review. Includes docstring with workflow description and usage.

- **adws/adw_document_iso.py** - Dependent workflow for documentation generation. Includes docstring with workflow description and usage.

- **adws/adw_ship_iso.py** - Final shipping workflow that merges PR to main. Includes docstring with workflow description and usage.

- **adws/adw_merge_worktree.py** - Alternative merge workflow that directly merges worktree to main. Includes docstring with workflow description and usage.

- **adws/adw_complete_iso.py** - Workflow completion orchestrator. Includes docstring with workflow description and usage.

- **adws/adw_plan_build_iso.py** - Orchestrator for plan + build phases. Includes docstring with workflow description and usage.

- **adws/adw_plan_build_test_iso.py** - Orchestrator for plan + build + test phases. Includes docstring with workflow description and usage.

- **adws/adw_plan_build_test_review_iso.py** - Orchestrator for plan + build + test + review phases. Includes docstring with workflow description and usage.

- **adws/adw_plan_build_review_iso.py** - Orchestrator for plan + build + review (skip tests) phases. Includes docstring with workflow description and usage.

- **adws/adw_plan_build_document_iso.py** - Orchestrator for plan + build + document phases. Includes docstring with workflow description and usage.

- **adws/adw_sdlc_iso.py** - Complete SDLC orchestrator (plan + build + test + review + document). Includes docstring with workflow description and usage.

- **adws/adw_sdlc_zte_iso.py** - Zero Touch Execution SDLC with auto-ship. Includes docstring with workflow description and usage.

### New Files

- **app_docs/adw-reference.md** - New reference document that will contain a quick lookup table of all ADW workflows with descriptions and usage examples. This will be formatted as a markdown table for easy scanning.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Read all ADW script files
- Read the docstrings from all adw_*.py files in the adws/ directory
- Extract the script name, description, and usage information from each file's docstring
- Identify the category for each script (entry point, dependent, or orchestrator)
- Note any special requirements or dependencies mentioned in the docstrings

### 2. Create ADW reference document structure
- Create the new file `app_docs/adw-reference.md`
- Add a clear title and introduction explaining the purpose of the document
- Create sections for different ADW categories:
  - Entry Point Workflows (create worktrees)
  - Dependent Workflows (require existing worktrees)
  - Orchestrator Workflows (chain multiple phases)
  - Utility Workflows (merge, cleanup)
- Include a quick reference table at the top with columns: Script Name, Category, Description, Usage Pattern

### 3. Populate reference document with ADW details
- For each ADW script, add an entry to the appropriate category section
- Include:
  - Script name with proper formatting
  - One-line description
  - Usage pattern with example command
  - Key features or workflow steps (bullet points)
  - Requirements (e.g., "requires existing worktree and ADW ID")
  - Related workflows (if applicable)
- Ensure descriptions are concise but informative (1-3 sentences)
- Use consistent formatting throughout the document

### 4. Add cross-references and usage notes
- Add a "How to Choose the Right ADW" section explaining when to use each workflow type
- Include common usage scenarios with recommended ADW scripts
- Add links to the main adws/README.md for detailed documentation
- Include notes about ADW ID tracking, worktree isolation, and port allocation
- Add information about model selection (base vs heavy)

### 5. Run validation commands
- Execute all validation commands listed below to ensure the chore is complete with zero regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `ls -la app_docs/adw-reference.md` - Verify the reference document was created
- `wc -l app_docs/adw-reference.md` - Verify the document has substantial content (should be 100+ lines)
- `grep -c "adw_.*\.py" app_docs/adw-reference.md` - Verify all ADW scripts are mentioned in the document
- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The reference document should be designed for quick lookup - developers should be able to scan it quickly to find the right ADW for their needs
- Use markdown tables for the quick reference section to enable easy scanning
- Keep descriptions concise but ensure they clearly differentiate between similar workflows (e.g., adw_plan_build_test_iso vs adw_plan_build_test_review_iso)
- The document should complement, not replace, the detailed adws/README.md documentation
- Consider adding visual indicators (emojis or symbols) for different workflow types to improve scannability
- Extract information directly from the existing adws/README.md as it already contains comprehensive descriptions of all workflows
- The new document should serve as a condensed, table-based quick reference that links to the full README for details
