# Agentic Workflows Analysis: Three SDLC Automation Systems

This document provides a comprehensive analysis of three different agentic software development lifecycle (SDLC) automation systems, examining their stages, substages, and technical implementations.

## Table of Contents

1. [tac-4: Monolithic SDLC Workflow](#tac-4-monolithic-sdlc-workflow)
2. [tac-7: Isolated Worktree Architecture](#tac-7-isolated-worktree-architecture)
3. [custom_7_micro_sdlc_agent: Visual Kanban SDLC](#custom_7_micro_sdlc_agent-visual-kanban-sdlc)
4. [Comparative Analysis](#comparative-analysis)

---

## tac-4: Monolithic SDLC Workflow

### Overview
A sequential GitHub webhook-triggered automation system that executes a complete SDLC pipeline in a single repository context.

### Technical Workflow: GitHub Issue → ADW Execution

#### 1. **GitHub Webhook Trigger** (`trigger_webhook.py:40-123`)
- **FastAPI webhook endpoint**: `POST /gh-webhook`
- **Triggers on**:
  - New issue opened (`issues` + `opened` action)
  - Issue comment with "adw" text (`issue_comment` + `created` action)
- **Process**:
  - Generates unique ADW ID via `make_adw_id()`
  - Launches `adw_plan_build.py` in background using `subprocess.Popen`
  - Returns immediately to meet GitHub's 10-second timeout
  - Logs stored in `agents/{adw_id}/adw_plan_build/execution.log`

#### 2. **ADW Workflow Orchestration** (`adw_plan_build.py:358-536`)
The main workflow executes these stages sequentially:

##### **Stage 1: Issue Classification** (`adw_plan_build.py:114-148`)
- Uses `issue_classifier` agent with `/classify_issue` slash command
- Analyzes issue content to determine type: `/chore`, `/bug`, or `/feature`
- Posts classification result to GitHub issue

##### **Stage 2: Branch Creation** (`adw_plan_build.py:232-258`)
- Uses `branch_generator` agent with `/generate_branch_name` slash command
- Creates feature branch: `{type}/issue-{number}-{slug}`
- Example: `feature/issue-123-add-dark-mode`

##### **Stage 3: Planning Phase** (`adw_plan_build.py:151-173`)
- Uses `sdlc_planner` agent with classified command (`/chore`, `/bug`, `/feature`)
- Generates detailed implementation plan
- Saves plan to file in project structure
- Commits plan: `"chore: add implementation plan for #{number}"`

##### **Stage 4: Implementation Phase** (`adw_plan_build.py:207-229`)
- Uses `sdlc_implementor` agent with `/implement` slash command
- Implements the solution based on the plan file
- Commits implementation: `"feature: implement #{number} - {title}"`

##### **Stage 5: Pull Request Creation** (`adw_plan_build.py:294-318`)
- Uses `pr_creator` agent with `/pull_request` slash command
- Creates PR with full context from plan and implementation
- Links back to original issue

#### 3. **Agent Execution Framework** (`agent.py:156-262`)
Each agent operates through this technical stack:

##### **Claude Code Integration**:
- Executes Claude CLI with slash commands: `claude -p "{slash_command} {args}"`
- Uses `--output-format stream-json` for structured output
- Saves all execution logs in `agents/{adw_id}/{agent_name}/`

##### **Environment Setup**:
- Isolated environment with required keys: `ANTHROPIC_API_KEY`, `GITHUB_PAT`
- Project working directory maintained via `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`

##### **Output Processing**:
- Parses JSONL output to extract results and session IDs
- Converts to JSON for structured logging
- Handles success/failure status and error propagation

#### 4. **GitHub Integration** (`github.py:76-280`)
- **Issue fetching**: Uses `gh issue view` with JSON output
- **Comment posting**: `gh issue comment` for status updates
- **Status management**: Adds labels, assigns issues
- **Authentication**: Uses `GITHUB_PAT` or `gh auth login`

#### 5. **Data Flow & State Management**
- **ADW State**: Stored in `agents/{adw_id}/adw_state.json`
- **Logging**: Structured session logs in `agents/{adw_id}/{agent_name}/`
- **Persistence**: Plan files, commit messages, and PR data tracked throughout workflow

#### 6. **Error Handling & Recovery**
- Each stage validates success before proceeding
- GitHub comments provide real-time status updates
- Detailed error logging for debugging failed workflows
- Graceful failure with descriptive error messages posted to issues

---

## tac-7: Isolated Worktree Architecture

### Overview
An advanced multi-workflow system using Git worktrees for complete isolation, featuring composable workflows and persistent state management.

### Technical Workflow: GitHub Issue → ADW Execution

#### 1. **Advanced Webhook Trigger** (`trigger_webhook.py:60-246`)

**Enhanced FastAPI webhook endpoint**: `POST /gh-webhook`

##### **Smart Trigger Logic**:
- **Issue opened**: Checks for `adw_` in issue body (`trigger_webhook.py:86-104`)
- **Issue comment**: Checks for `adw_` in comment text (`trigger_webhook.py:106-127`)
- **Bot loop prevention**: Ignores content containing `ADW_BOT_IDENTIFIER` (`trigger_webhook.py:91-94`)

##### **Intelligent ADW Classification** (`workflow_ops.py:60-105`):
- Uses `/classify_adw` slash command with temp ADW ID
- Extracts: `workflow_command`, `adw_id`, `model_set` from text
- Validates against `AVAILABLE_ADW_WORKFLOWS` list (47 total workflows)
- Example triggers: `"adw_plan_iso"`, `"adw_build_iso adw-12345678"`, `"adw_sdlc_ZTE_iso advanced"`

##### **Dependency Validation** (`trigger_webhook.py:129-147`):
- **Independent workflows**: `adw_plan_iso`, `adw_patch_iso`, `adw_sdlc_ZTE_iso`
- **Dependent workflows**: `adw_build_iso`, `adw_test_iso`, `adw_review_iso` (require existing ADW ID)
- Posts error comments for invalid dependent workflow triggers

#### 2. **Persistent State Management** (`state.py:15-173`)

##### **ADWState Class** with file persistence:
- **Storage**: `agents/{adw_id}/adw_state.json`
- **Core fields**: `adw_id`, `issue_number`, `branch_name`, `plan_file`, `worktree_path`, `backend_port`, `frontend_port`, `model_set`
- **Workflow tracking**: `all_adws` list tracks which workflows have run
- **Validation**: Uses Pydantic `ADWStateData` model for type safety

#### 3. **Isolated Worktree Architecture** (`worktree_ops.py:15-200`)

##### **Worktree Creation** (`create_worktree():`):
- **Location**: `trees/{adw_id}/` directory
- **Branch creation**: `git worktree add -b {branch_name} {path} origin/main`
- **Isolation**: Complete repository copy for parallel execution

##### **Port Allocation System**:
- **Deterministic**: `backend_port = 9100 + (hash(adw_id) % 15)`
- **Range**: Backend 9100-9114, Frontend 9200-9214
- **Environment**: Creates `.ports.env` with `BACKEND_PORT`, `FRONTEND_PORT`, `VITE_BACKEND_URL`

##### **Three-way Validation** (`validate_worktree()`):
1. State has `worktree_path`
2. Directory exists on filesystem
3. Git recognizes the worktree

### ADW Substages Breakdown

#### 1. **📋 PLAN Phase** (`adw_plan_iso.py`)

##### **Substages**:
1. **State Initialization** (`66-95`)
   - Load/create ADW state with `ensure_adw_id()`
   - Track workflow execution in `all_adws` list

2. **Environment Setup** (`108-127`)
   - **Port Allocation**: Deterministic backend/frontend ports (`9100-9114`/`9200-9214`)
   - **Worktree Creation**: Isolated git worktree in `trees/{adw_id}/`
   - **Environment Files**: Create `.ports.env` with port configuration

3. **Issue Analysis** (`128-158`)
   - **Issue Classification**: Use `/classify_issue` → `/chore|/bug|/feature`
   - **Branch Generation**: Create standardized branch name via `/generate_branch_name`

4. **Plan Generation** (`179-218`)
   - **Worktree Installation**: Run `/install_worktree` command for environment setup
   - **Plan Creation**: Execute classified command (`/chore`, `/bug`, `/feature`) in worktree
   - **Plan Validation**: Ensure plan file exists in worktree

5. **Git Operations** (`285-328`)
   - **Commit Creation**: Generate semantic commit message
   - **Plan Commit**: Commit plan to isolated branch
   - **PR Creation**: Push and create/update pull request

#### 2. **🔨 BUILD Phase** (`adw_build_iso.py`)

##### **Substages**:
1. **Prerequisites Validation** (`63-134`)
   - **State Loading**: Require existing ADW ID and state
   - **Worktree Validation**: Three-way check (state, filesystem, git)
   - **Plan File Verification**: Ensure plan exists from previous phase

2. **Implementation Execution** (`162-183`)
   - **Plan Implementation**: Execute `/implement` command with plan file
   - **Code Generation**: Generate solution based on plan in isolated worktree

3. **Quality Assurance** (`185-231`)
   - **Issue Classification**: Retrieve or re-classify issue type
   - **Commit Generation**: Create implementation commit message
   - **Implementation Commit**: Commit changes to isolated branch

4. **Integration** (`233-249`)
   - **Git Finalization**: Push changes and update PR

#### 3. **🧪 TEST Phase** (`adw_test_iso.py`)

##### **Substages**:
1. **Test Environment Setup** (`671-725`)
   - **State Validation**: Verify worktree and dependencies exist
   - **Test Configuration**: Configure unit and E2E test flags

2. **Unit Test Execution** (`346-453`)
   - **Test Execution**: Run `/test` command in worktree
   - **Result Parsing**: Parse JSON test results with pass/fail counts
   - **Failure Resolution**: Use `/resolve_failed_test` for automatic fixes
   - **Retry Logic**: Up to 4 retry attempts with resolution

3. **E2E Test Execution** (`530-645`)
   - **E2E Test Execution**: Run `/test_e2e` with isolated ports
   - **Screenshot Capture**: Capture UI test screenshots
   - **E2E Resolution**: Use `/resolve_failed_e2e_test` for UI fixes
   - **Retry Logic**: Up to 2 retry attempts for E2E tests

4. **Test Reporting** (`781-863`)
   - **Comprehensive Summary**: Post detailed test results to GitHub
   - **Test Commit**: Commit test results regardless of outcome
   - **Status Tracking**: Track test success/failure for downstream decisions

#### 4. **👀 REVIEW Phase** (`adw_review_iso.py`)

##### **Substages**:
1. **Review Preparation** (`385-410`)
   - **Spec File Discovery**: Find plan file from state or git diff
   - **Review Configuration**: Set resolution and retry parameters

2. **Implementation Review** (`71-115`)
   - **Code Review**: Execute `/review` command against specification
   - **Screenshot Analysis**: Capture visual evidence of implementation
   - **Issue Detection**: Identify blockers, tech debt, and skippable issues

3. **Issue Resolution** (`202-251`, `413-458`)
   - **Blocker Resolution**: Auto-create patch plans for critical issues
   - **Patch Implementation**: Implement resolutions automatically
   - **Retry Logic**: Up to 3 review attempts with automatic fixes

4. **Review Reporting** (`144-200`, `461-470`)
   - **Screenshot Upload**: Upload to R2 storage with public URLs
   - **Summary Generation**: Create markdown summary with embedded images
   - **Review Commit**: Commit review results and resolutions

#### 5. **📚 DOCUMENT Phase** (`adw_document_iso.py`)

##### **Substages**:
1. **Documentation Analysis** (`63-97`)
   - **Change Detection**: Check for changes vs `origin/main`
   - **Spec File Location**: Find specification from state

2. **Documentation Generation** (`99-184`)
   - **Doc Creation**: Execute `/document` command with spec file
   - **Content Validation**: Verify documentation files were created
   - **Conditional Updates**: Update conditional docs based on changes

3. **KPI Tracking** (`186-286`)
   - **Metrics Collection**: Track agentic performance metrics
   - **KPI Updates**: Update `agentic_kpis.md` with workflow statistics
   - **Commit KPIs**: Commit metrics (never fails main workflow)

4. **Documentation Finalization** (`456-515`)
   - **Doc Commit**: Commit documentation changes
   - **Git Finalization**: Push and update PR

#### 6. **🚢 SHIP Phase** (Composite Workflows)

##### **Zero Touch Execution (ZTE)** (`adw_sdlc_ZTE_iso.py`):
- **Sequential Chain**: Plan → Build → Test → Review → Document → Ship
- **Failure Gates**: Stop on any phase failure (especially tests)
- **Auto-Merge**: Automatically approve and merge PR if all phases pass

##### **Other Composite Workflows**:
- `adw_plan_build_iso`: Plan + Build only
- `adw_plan_build_test_iso`: Plan + Build + Test
- `adw_plan_build_test_review_iso`: Plan + Build + Test + Review
- `adw_plan_build_document_iso`: Plan + Build + Document

### Key Technical Features

#### **Failure Recovery Mechanisms**:
- **Test Resolution**: Automatic test fixing with up to 4 retry attempts
- **Review Resolution**: Auto-patch blocker issues with up to 3 retries
- **E2E Resolution**: UI test fixing with screenshot analysis

#### **Quality Gates**:
- **Test Phase**: Must pass unit tests to continue ZTE
- **Review Phase**: Must resolve blocker issues before proceeding
- **Documentation Phase**: Conditional generation based on actual changes

#### **State Management**:
- **Persistent State**: `agents/{adw_id}/adw_state.json` tracks all workflow progress
- **Workflow Tracking**: `all_adws` field tracks which workflows have executed
- **Port Management**: Deterministic port allocation for parallel execution

#### **Isolation Architecture**:
- **Git Worktrees**: Complete repository isolation in `trees/{adw_id}/`
- **Port Isolation**: Each ADW gets unique backend/frontend ports
- **Environment Isolation**: Separate `.ports.env` and dependencies per worktree

---

## custom_7_micro_sdlc_agent: Visual Kanban SDLC

### Overview
A visual kanban-based SDLC automation system that orchestrates three specialized Claude Agent SDK agents through a **Plan → Build → Review → Ship** workflow with real-time UI management.

### Core Architecture
This is a **visual kanban-based SDLC automation system** that orchestrates three specialized Claude Agent SDK agents through a **Plan → Build → Review → Ship** workflow.

### Main SDLC Stages

#### 1. **🗃️ Idle Stage** (Light Gray)
**Purpose**: Initial state for new tickets

##### **Substages**:
- **Ticket Creation** (`CreateTicketModal.vue`)
  - User input form with title, model selection, codebase path
  - Model choice: Sonnet (fast) vs Opus (smart)
  - Request prompt specification
- **Validation** (`database.py:77-89`)
  - Store ticket metadata in SQLite
  - Initialize empty agent message arrays
  - Set default stage and timestamps

**Manual Transitions**: `→ Plan` (trigger workflow), `→ Archived`

#### 2. **📋 Plan Stage** (Light Blue)
**Purpose**: Strategic analysis and implementation blueprint creation

##### **Substages**:

###### **2.1 Codebase Research** (`PLANNER_AGENT_SYSTEM_PROMPT.md:11-21`)
- **Tool Usage**: `Grep`, `Glob`, `Read` for existing pattern discovery
- **Analysis**: Project structure, conventions, similar features
- **Validation**: Config files (package.json, pyproject.toml) examination

###### **2.2 Plan Generation** (`agent_orchestrator.py:209-409`)
- **Agent**: Planner Agent with Claude Code integration
- **System Prompt**: Strategic planning specialization
- **File Restrictions**: Hook-based Write tool control to `specs/` directory only
- **Session Resumption**: Reuse existing session IDs for continuity

###### **2.3 Plan Output** (`PLANNER_AGENT_USER_PROMPT.md:20-22`)
- **Format**: Markdown specification file
- **Naming**: Kebab-case descriptive filenames
- **Structure**: Problem statement, technical approach, implementation guide, testing strategy
- **Storage**: `specs/<descriptive-name>.md`

**Automated Transitions**: `→ Build` (on plan completion)

#### 3. **🔨 Build Stage** (Light Green)
**Purpose**: Solution implementation based on plan

##### **Substages**:

###### **3.1 Plan Consumption** (`agent_orchestrator.py:412-516`)
- **Input**: Plan file path from previous stage
- **Agent**: Builder Agent with full codebase access
- **Permissions**: `bypassPermissions` mode for unrestricted development

###### **3.2 Implementation Execution** (`BUILDER_AGENT_USER_PROMPT.md`)
- **Strategy**: Follow plan specifications precisely
- **Tools**: All Claude Code tools available (Read, Write, Edit, Bash, etc.)
- **Output**: Functional code implementation with git diff reporting

###### **3.3 Session Management** (`main.py:399-416`)
- **Continuity**: Resume previous build sessions if available
- **Tracking**: Message and tool call counting
- **Storage**: Build response and session ID persistence

**Automated Transitions**: `→ Review` (on build completion)

#### 4. **👀 Review Stage** (Light Yellow)
**Purpose**: Quality assessment and implementation validation

##### **Substages**:

###### **4.1 Review Preparation** (`agent_orchestrator.py:519-700`)
- **Input**: Plan file path and ticket context
- **Agent**: Reviewer Agent with restricted Write access
- **File Restrictions**: Hook-controlled writes to `reviews/` directory only

###### **4.2 Quality Analysis** (`REVIEWER_AGENT_SYSTEM_PROMPT.md`)
- **Comparison**: Implementation vs original plan alignment
- **Assessment**: Code quality, best practices, completeness
- **Documentation**: Comprehensive review report generation

###### **4.3 Review Output**
- **Format**: Structured markdown review document
- **Storage**: `reviews/<ticket-based-name>.md`
- **Content**: Quality metrics, recommendations, approval status

**Automated Transitions**: `→ Shipped` (on review completion)

#### 5. **🚀 Shipped Stage** (Light Purple)
**Purpose**: Successfully completed workflow

##### **Characteristics**:
- **Final State**: Workflow completion indicator
- **Metrics**: Full session statistics and message counts
- **Artifacts**: Plan, implementation, and review files preserved

**Manual Transitions**: `→ Archived`

#### 6. **❌ Errored Stage** (Light Red)
**Purpose**: Workflow failure handling

##### **Error Handling**:
- **Capture**: Exception handling in workflow execution (`main.py:490-514`)
- **Tracking**: Error message and context preservation
- **Recovery**: Manual transition back to Idle for retry

**Manual Transitions**: `→ Idle` (retry), `→ Archived`

#### 7. **🗂️ Archived Stage** (Light Gray)
**Purpose**: Completed or cancelled tickets

**Manual Transitions**: `→ Idle` (reactivate)

### Technical Implementation

#### **Backend Architecture** (`main.py`)

##### **FastAPI Server** (Port 8001)
- **Real-time WebSocket**: Live workflow progress (`ConnectionManager`)
- **Workflow Orchestration**: Async task execution with named tracking
- **Stage Validation**: Transition rule enforcement (`main.py:258-276`)

##### **Database Layer** (`database.py`)
```sql
tickets (
  id, title, content_user_request_prompt,
  plan/build/review_responses,
  agent_messages (JSON array),
  session_ids, message_counts, tool_call_counts,
  stage, model, codebase_path
)
```

##### **Agent Integration** (`agent_orchestrator.py`)
- **Claude Agent SDK**: Full integration with tool restrictions
- **Hook System**: Pre-tool-use permission control
- **Rich Logging**: Color-coded console output with panels
- **Session Continuity**: Resume capabilities for interrupted workflows

#### **Frontend Architecture** (`App.vue`)

##### **Vue 3 + Vite Stack**
- **Draggable Kanban**: Vue-draggable-next for stage transitions
- **Real-time Updates**: WebSocket integration for live workflow tracking
- **Pinia State**: Centralized ticket and workflow state management
- **Theme Support**: Dark/light mode with system detection

##### **Drag & Drop Rules** (`App.vue:checkMove`)
```javascript
Manual Transitions:
- Idle → [Plan, Archived]
- Shipped → [Archived]
- Errored → [Idle, Archived]
- Archived → [Idle]

Automated Only:
- Plan → Build → Review → Shipped
```

### Agent Specialization

#### **Planner Agent**
- **Prompt Engineering**: Strategic planning system prompt
- **Tool Restrictions**: Write-only to `specs/` directory
- **Research Focus**: Codebase analysis before planning

#### **Builder Agent**
- **Full Access**: All development tools available
- **Plan-Driven**: Implementation follows specification exactly
- **Git Integration**: Change tracking and diff reporting

#### **Reviewer Agent**
- **Quality Focus**: Implementation assessment against plan
- **Restricted Output**: Write-only to `reviews/` directory
- **Comprehensive Analysis**: Code quality and completeness validation

### Key Design Patterns

#### **1. Agent Specialization**
Each agent has distinct roles, prompts, and file access permissions enforced via hooks.

#### **2. Session Continuity**
Claude Code session IDs enable resumption of interrupted workflows.

#### **3. Hook-Based Security**
Write tool restrictions prevent agents from modifying unauthorized directories.

#### **4. Real-time Orchestration**
WebSocket-driven UI updates with async workflow execution tracking.

#### **5. Rich Observability**
Comprehensive logging with structured agent message tracking and tool call visibility.

---

## Comparative Analysis

### Architecture Patterns

| Feature | tac-4 | tac-7 | custom_7_micro_sdlc_agent |
|---------|-------|-------|---------------------------|
| **Execution Model** | Sequential, single repository | Parallel, isolated worktrees | Visual kanban, single repository |
| **State Management** | File-based logging | Persistent JSON state | SQLite database |
| **Isolation** | None | Complete worktree separation | Agent permission hooks |
| **UI Interface** | GitHub comments | GitHub comments | Real-time web kanban |
| **Workflow Control** | GitHub webhooks | GitHub webhooks | Drag & drop interface |
| **Error Recovery** | Basic retry | Automatic resolution loops | Manual stage transitions |

### Workflow Complexity

| Aspect | tac-4 | tac-7 | custom_7_micro_sdlc_agent |
|--------|-------|-------|---------------------------|
| **Stages** | 5 (classify → branch → plan → implement → PR) | 6+ (plan → build → test → review → document → ship) | 4 (plan → build → review → ship) |
| **Composability** | Monolithic | Highly composable (47 workflows) | Fixed pipeline |
| **Parallelization** | None | Full parallel execution | Single workflow per ticket |
| **Testing Integration** | None | Comprehensive with auto-resolution | None |
| **Documentation** | None | Automated with KPI tracking | None |

### Technical Integration

| Component | tac-4 | tac-7 | custom_7_micro_sdlc_agent |
|-----------|-------|-------|---------------------------|
| **Claude Integration** | CLI commands | CLI commands | Agent SDK |
| **Git Strategy** | Single branch operations | Isolated worktrees | Single repository |
| **Port Management** | None | Deterministic allocation | None |
| **Session Management** | None | Resume capabilities | Resume capabilities |
| **Real-time Updates** | GitHub comments | GitHub comments | WebSocket streaming |

### Use Case Suitability

#### **tac-4: Best for**
- Simple, straightforward development tasks
- Teams wanting GitHub-native workflow
- Projects not requiring testing automation
- Quick prototyping and feature development

#### **tac-7: Best for**
- Enterprise development with complex requirements
- Projects requiring comprehensive testing
- Teams needing parallel development capabilities
- Quality-critical applications with review requirements

#### **custom_7_micro_sdlc_agent: Best for**
- Development teams wanting visual workflow management
- Interactive development with real-time monitoring
- Learning and experimentation with agentic workflows
- Small to medium projects with clear planning requirements

### Evolution Path

1. **tac-4**: Foundation - Basic GitHub automation
2. **tac-7**: Maturity - Enterprise-grade isolation and composability
3. **custom_7_micro_sdlc_agent**: Innovation - Visual interface and specialized agents

Each system represents a different approach to agentic SDLC automation, from simple webhook automation to sophisticated visual workflow management, demonstrating the evolution of AI-powered development tools.