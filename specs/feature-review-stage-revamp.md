# Feature: Review Stage Revamp - Comprehensive Code Quality & Security Review

## Overview

Revamp the review stage to be a comprehensive, always-on code quality and security review system that integrates external open-source tools. The review should never be skipped by default - only when explicitly configured via task metadata.

## Problem Statement

Currently, the review stage:
1. **Auto-skips for chores/patches** - Missing quality issues on maintenance work
2. **Only does UI validation** - No code quality, security, or documentation review
3. **No external tool integration** - Missing industry-standard SAST/linting tools
4. **No guardrails** - No automated checks for common issues

## Goals

1. **Never skip by default** - Review runs for all issue types unless `skip_review: true` is set
2. **Multi-mode review** - Support UI validation, code quality, security, and documentation modes
3. **External tool integration** - Integrate open-source SAST, linting, and security tools
4. **Configurable per-task** - Allow task-level override of review behavior
5. **Comprehensive reports** - Generate detailed reports with actionable findings

## Implementation Plan

### Phase 1: Remove Auto-Skip Logic

**File: `adws/stages/review_stage.py`**

```python
def should_skip(self, ctx: StageContext) -> tuple[bool, str | None]:
    """Only skip if explicitly configured."""
    # Check for explicit skip flag in task metadata
    skip_review = ctx.state.get("issue_json", {}).get("metadata", {}).get("skip_review", False)

    if skip_review:
        ctx.logger.info("Review explicitly skipped via task metadata")
        return True, "Review skipped per task configuration"

    # Check for skip in orchestrator config
    if ctx.config.get("skip_review", False):
        ctx.logger.info("Review skipped via orchestrator config")
        return True, "Review skipped per workflow configuration"

    return False, None
```

### Phase 2: Multi-Mode Review Architecture

Create a new review mode system:

**File: `adws/stages/review_modes.py`**

```python
from enum import Enum
from typing import Protocol

class ReviewMode(Enum):
    UI_VALIDATION = "ui"           # Visual verification via Playwright
    CODE_QUALITY = "code"          # Code quality and style
    SECURITY = "security"          # Security vulnerabilities (SAST)
    DOCUMENTATION = "docs"         # Documentation completeness
    COMPREHENSIVE = "comprehensive" # All of the above

class ReviewModeHandler(Protocol):
    """Protocol for review mode handlers."""

    def execute(self, ctx: StageContext) -> ReviewResult:
        """Execute this review mode."""
        ...

    def get_tools(self) -> list[str]:
        """Get list of tools used by this mode."""
        ...
```

### Phase 3: External Tool Integration

#### 3.1 Security Tools (SAST)

**Tool: Bearer CLI** - Security + Privacy scanning
```bash
# Installation
curl -sfL https://raw.githubusercontent.com/Bearer/bearer/main/contrib/install.sh | sh

# Usage in review
bearer scan . --format json --output review_security.json
```

**Tool: Semgrep** - Custom rules + AI noise filtering
```bash
# Installation
pip install semgrep

# Usage in review
semgrep scan --config auto --json --output review_semgrep.json
```

#### 3.2 Code Quality Tools

**Tool: ESLint** (JavaScript/TypeScript)
```bash
npx eslint . --format json --output-file review_eslint.json
```

**Tool: Ruff** (Python) - Fast Python linter
```bash
pip install ruff
ruff check . --output-format json > review_ruff.json
```

**Tool: SonarQube Scanner** (Multi-language)
```bash
# For local analysis without server
sonar-scanner -Dsonar.projectKey=review -Dsonar.sources=.
```

#### 3.3 AI Code Review

**Tool: Qodo Merge (PR-Agent)** - Open source AI code review
```bash
# Self-hosted option
pip install pr-agent
python -m pr_agent.cli --pr_url <url> review
```

### Phase 4: Review Configuration Schema

**File: `adws/schemas/review_config.py`**

```python
from pydantic import BaseModel
from typing import Optional

class ReviewToolConfig(BaseModel):
    """Configuration for individual review tools."""
    enabled: bool = True
    severity_threshold: str = "warning"  # error, warning, info
    custom_rules: Optional[list[str]] = None

class ReviewConfig(BaseModel):
    """Review stage configuration."""

    # Skip controls
    skip_review: bool = False
    skip_on_no_changes: bool = False

    # Mode selection
    modes: list[str] = ["comprehensive"]  # ui, code, security, docs, comprehensive

    # Tool configurations
    tools: dict[str, ReviewToolConfig] = {
        "bearer": ReviewToolConfig(),
        "semgrep": ReviewToolConfig(),
        "eslint": ReviewToolConfig(enabled=True),
        "ruff": ReviewToolConfig(enabled=True),
    }

    # Thresholds
    fail_on_blocker: bool = True
    fail_on_security_high: bool = True
    max_issues_before_fail: int = 50

    # UI validation
    ui_validation_enabled: bool = True
    screenshot_count: int = 5

    # AI review
    ai_review_enabled: bool = True
    ai_review_provider: str = "claude"  # claude, pr-agent
```

### Phase 5: Updated Review Workflow

**File: `adws/utils/review_v2.py`**

```python
class ReviewOrchestrator:
    """Orchestrates multi-mode review execution."""

    def __init__(self, ctx: StageContext, config: ReviewConfig):
        self.ctx = ctx
        self.config = config
        self.results: list[ReviewResult] = []

    async def execute(self) -> ComprehensiveReviewResult:
        """Execute all configured review modes."""

        # 1. Run external tools in parallel
        tool_results = await self.run_external_tools()

        # 2. Run AI code review
        if self.config.ai_review_enabled:
            ai_result = await self.run_ai_review()
            self.results.append(ai_result)

        # 3. Run UI validation if applicable
        if self.config.ui_validation_enabled and self.has_ui_changes():
            ui_result = await self.run_ui_validation()
            self.results.append(ui_result)

        # 4. Aggregate results
        return self.aggregate_results()

    async def run_external_tools(self) -> list[ToolResult]:
        """Run configured external tools."""
        tasks = []

        if self.config.tools.get("bearer", {}).enabled:
            tasks.append(self.run_bearer())

        if self.config.tools.get("semgrep", {}).enabled:
            tasks.append(self.run_semgrep())

        if self.config.tools.get("eslint", {}).enabled:
            tasks.append(self.run_eslint())

        if self.config.tools.get("ruff", {}).enabled:
            tasks.append(self.run_ruff())

        return await asyncio.gather(*tasks)
```

### Phase 6: Frontend Integration

#### 6.1 Task Creation - Review Options

Add review configuration to the task creation modal:

```javascript
// In WorkflowTriggerModal.vue or similar
const reviewOptions = {
  skipReview: false,
  reviewModes: ['comprehensive'],
  enableSecurityScan: true,
  enableCodeQuality: true,
  enableUIValidation: true,
};
```

#### 6.2 Review Results Display

Create a new component to display comprehensive review results:

```javascript
// ReviewResultsPanel.vue
- Security findings with severity badges
- Code quality issues grouped by file
- UI validation screenshots
- AI review summary
- Actionable recommendations
```

### Phase 7: Report Generation

**Output Format:**

```json
{
  "review_id": "97fa3852-review-001",
  "timestamp": "2025-11-28T18:00:00Z",
  "duration_ms": 45000,
  "success": true,
  "summary": "Review completed with 3 warnings and 0 blockers",

  "modes_executed": ["security", "code", "ui"],

  "security": {
    "tool": "bearer",
    "findings": [
      {
        "severity": "high",
        "type": "sql_injection",
        "file": "src/api/users.py",
        "line": 45,
        "message": "Possible SQL injection vulnerability",
        "recommendation": "Use parameterized queries"
      }
    ],
    "summary": {
      "critical": 0,
      "high": 1,
      "medium": 2,
      "low": 5
    }
  },

  "code_quality": {
    "tools": ["eslint", "ruff"],
    "issues": [...],
    "summary": {
      "errors": 0,
      "warnings": 12,
      "info": 25
    }
  },

  "ui_validation": {
    "success": true,
    "screenshots": [
      "/agents/97fa3852/review/01_dashboard.png",
      "/agents/97fa3852/review/02_task_creation.png"
    ],
    "issues": []
  },

  "ai_review": {
    "provider": "claude",
    "summary": "Implementation matches spec requirements...",
    "suggestions": [...]
  }
}
```

## Files to Create/Modify

### New Files
1. `adws/stages/review_modes.py` - Review mode handlers
2. `adws/schemas/review_config.py` - Review configuration schema
3. `adws/utils/review_v2.py` - New review orchestrator
4. `adws/tools/bearer_runner.py` - Bearer CLI integration
5. `adws/tools/semgrep_runner.py` - Semgrep integration
6. `adws/tools/eslint_runner.py` - ESLint integration
7. `adws/tools/ruff_runner.py` - Ruff integration
8. `.claude/commands/review_v2.md` - Updated review command

### Modified Files
1. `adws/stages/review_stage.py` - Update should_skip logic
2. `adws/adw_review_iso.py` - Integrate new review system
3. `adws/utils/review.py` - Add new review modes
4. `src/components/forms/WorkflowTriggerModal.vue` - Add review options
5. `src/components/TaskCard.vue` - Show review status

## Dependencies to Add

```toml
# pyproject.toml or script dependencies
dependencies = [
    "semgrep",
    "ruff",
]
```

```bash
# System tools to install
curl -sfL https://raw.githubusercontent.com/Bearer/bearer/main/contrib/install.sh | sh
npm install -g eslint
```

## Testing Plan

1. **Unit Tests**
   - Test should_skip logic with various configurations
   - Test each tool runner individually
   - Test result aggregation

2. **Integration Tests**
   - Run full review on sample codebase
   - Verify all tools execute correctly
   - Verify report generation

3. **E2E Tests**
   - Create task with review enabled
   - Verify review runs and produces results
   - Verify frontend displays results correctly

## Rollout Plan

1. **Phase 1** (Day 1-2): Update should_skip logic, remove auto-skip
2. **Phase 2** (Day 3-5): Implement external tool runners
3. **Phase 3** (Day 6-7): Implement review orchestrator
4. **Phase 4** (Day 8-9): Frontend integration
5. **Phase 5** (Day 10): Testing and documentation

## Success Metrics

- Review runs on 100% of tasks (unless explicitly skipped)
- Security findings detected before merge
- Code quality issues caught automatically
- Developer feedback on review usefulness

## Open Questions

1. Should we fail the pipeline on high-severity security issues?
2. What's the default configuration for new projects?
3. Should we support custom Semgrep rules per project?
4. How do we handle long-running security scans?
