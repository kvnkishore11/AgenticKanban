
🎯 Core Vision
A web-based application that serves as an intelligent Kanban board for managing AI-driven development workflows with self-improving capabilities, comprehensive state management, and autonomous sub-agent support.


I wnat to create a kanban style board with 6 stages plan, build, test, review, document, PR, Errored

There should be an option to open the project by selecting any folder from the system just like how VS Code does. 

what i am envisioning is that all the commands within .claude/commands are the prmitives like implement, plan, prime, build, commit etc  meaning they are called /slashcommands

Each Feature will have its own pipeline visualisation. before the entry into pipeline it should have github issues type  of input to type things in like title is nto required since it will be decided by my agents in further stages of the app

All basic logging should be visible within the cards of the pipeline stages feature.

then I want to create a folder agentics which has many foldres like specs, ai-docs, app-docs, scripts, agents, adws something like this
Template Structure of every project that my kanban app works with

Project File Structure (Conceptual)

The application is built around the conceptual existence of a specific project folder structure. The frontend must be designed to visualize and manage data related to these paths:

```
/selected-project-root
├── .claude/
│   └── commands/
│       ├── implement.md
│       ├── plan.md
│       ├── prime.md
│       └── build.md
│       ├── implement.md
│       ├── test.md
│       ├── review.md
│       ├── document.md
│       └── research.md
│   ├── hooks/                  ← Pre/post execution hooks
│   └── settings.json           ← Project-level config
│
├── agentics/
│   ├── specs/    --> Generated Plans/specs
│   ├── ai-docs/.     --> Documentation for AI Agents
│   ├── app-docs/.    --> Documentation for General users of the respository
│   ├── scripts/      --> Utility Scripts
│   ├── agents/       --> adw logs will be stored with adwid as subfolder name
│   ├── adws/
│       ├── adw_plan.py
│       ├── adw_build.py
│       ├── adw_review.py
│       ├── adw_test.py
│       ├── adw_document.py
│       ├── adw_plan-build.py
│       ├── adw-plan-build-document.py
│       └── adw_logs.py
└── ... other project files
```


within the adws there are different types of ai developer workflows like adw_plan, adw_build, adw_review, adw_test, adw_document



Various Stages

Plan - Initial task planning and decomposition
Implement - Implementation phase with sub-agents
Test - Testing with active monitoring(Did everything built is working without any regression or failures)
Review - Code review (Did you build what we asked)
Document - Documentation generation(Document what was built)
PR - Pull request preparation
Feedback Loop - Error collection and replanning (NEW continuing)
Errored - Terminal state tracking failure stage (Stopped)


Each of this stage can also have substages like shown below:
PLAN_SUBSTAGES = [
    ("initialize", "Initializing workflow"),
    ("classify", "Analyzing issue type"),
    ("branch", "Creating feature branch"),
    ("generate", "Generating implementation plan"),
    ("commit", "Committing plan")
]


BUILD_SUBSTAGES = [
    ("validate", "Validating prerequisites"),
    ("implement", "Implementing solution"),
    ("verify", "Verifying implementation"),
    ("commit", "Committing changes")
]



TEST_SUBSTAGES = [
    ("setup", "Setting up test environment"),
    ("unit", "Running unit tests"),
    ("e2e", "Running E2E tests"),
    ("report", "Generating test report")
]

REVIEW_SUBSTAGES = [
    ("analyze", "Analyzing implementation"),
    ("capture", "Capturing screenshots"),
    ("assess", "Assessing quality"),
    ("resolve", "Resolving issues"),
    ("commit", "Committing review")
]

DOCUMENT_SUBSTAGES = [
    ("generate", "Generating documentation"),
    ("kpis", "Updating KPIs"),
    ("commit", "Committing documentation")
]



Advanced Prompt Editor:

Rich text editing capabilities
Image support: paste, annotate, crop, markup
Multi-media input support


C. Sub-Agent System
Autonomous Monitoring Agents

Frontend Sub-Agent: Monitors frontend build/test/review
Backend Sub-Agent: Monitors backend build/test/review
Lifecycle:

Start: When main agent begins Implementing
Active: During Build, Test, Review stages
Report: Continuously report issues to main ADW
Stop: Before Documentation phase or when main agent completes



Agent Communication

Sub-agents report errors/warnings in real-time
Main agent receives aggregated feedback
Feedback loop triggers replanning when needed



Automated code review in Review stage
Feedback incorporated into versioning system
Issues tracked and linked to ADW context


Error Handling & Logging

Comprehensive logging instrumentation in generated code
Error catching at all potential failure points
LLM-readable log format for easy agent interpretation
Errored stage tracks:

Which stage failed
Error details and context
Related ADWID for debugging


🛠️ Technical Stack

Frontend: React with Tailwind CSS, ShadCn, Framer Motion for animations

Storage:
SQLite for structured data
File system for logs/artifacts

State Management: Zustand
Rich Editor: TipTap or Quill with image editing plugins

AI Integration Points

Prompt validation and suggestion API
Similarity search for prompts
KPI analysis and improvement suggestions
Sub-agent communication protocol


After each prompt for feature or chore or bug or patch, Ai should tell what it understood and get verifycation if that is what is intended. if possible it can prototype it undestanding either through some mermaid diagram

This should support multiple projects multiple projects 
when I select each project (by opening the root folder of the project just like we do in VS Code) there should be tabs (Ongoing , Completed)
Ongoing is the current status
history should have all the previous completed requests




Kanban is Project Agnostic
One Kanban app works with ANY project
As long as project has agentics/ and .claude/ structure
Like VS Code can open any codebase


### 3. **Kanban Board Responsibilities**
✅ UI for task management (Automatic stage advanements No drag and drop) 
✅ Visualize workflow stages  
✅ Discover available primitives and pipelines (can also be customised we can select from any of the primitive adws) 
✅ Trigger ADW executions  
✅ Monitor execution progress  
✅ Display logs and results  

❌ NOT responsible for AI orchestration (that's `agentics/adws/`)  
❌ NOT responsible for Claude Code execution (that's `.claude/`)

---

## Refined Architecture Diagram:
```
┌─────────────────────────────────────────────────────────────┐
│  KANBAN BOARD (App)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Project Selector: [/path/to/my-ecommerce-app ▼]    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────┬─────────┬─────────┬─────────┬──────────────┐  │
│  │  Plan   │  Build  │  Test   │ Review  │  Document    │  │
│  │ ┌─────┐ │ ┌─────┐ │         │         │              │  │
│  │ │Card1│ │ │Card2│ │         │         │              │  │
│  │ └─────┘ │ └─────┘ │         │         │              │  │
│  └─────────┴─────────┴─────────┴─────────┴──────────────┘  │
│                                                              │
│  Available Pipelines: [plan-build] [plan-build-document]    │
│  Primitives: /bug /feature /implement /commit /pr           │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PROJECT: my-ecommerce-app/                                 │
│                                                              │
│  .claude/commands/          ← Primitive commands            │
│    ├── bug.md                                               │
│    ├── feature.md                                           │
│    └── implement.md                                         │
│                                                              │
│  agentics/                  ← Orchestration layer           │
│    ├── adws/                ← ADW execution scripts         │
│    │   ├── adw_plan_build.py                                │
│    │   ├── trigger_cron.py                                  │
│    │   └── agent.py                                         │
│    ├── specs/               ← Generated plans               │
│    ├── logs/                ← Execution logs                │
│    └── scripts/             ← Utilities                     │
│                                                              │
│  app/                       ← Your actual application       │
│    ├── server/                                              │
│    └── client/                                              │
└─────────────────────────────────────────────────────────────┘

------------------------------------------------------------------------------------------------------------------------









