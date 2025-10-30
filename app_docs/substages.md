Substage Catalog for Kanban:

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


State Schema:
{
  "stages": {
    "plan": {
      "status": "running",
      "started_at": "...",
      "progress": {
        "current_step": 3,
        "total_steps": 5,
        "current_substage": "issue_analysis",
        "display": "Analyzing issue and generating branch"
      },
      "substage_history": [
        {"name": "state_init", "completed": true, "duration_ms": 500},
        {"name": "env_setup", "completed": true, "duration_ms": 15000},
        {"name": "issue_analysis", "completed": false, "duration_ms": null}
      ]
    }
  }
}

State Schema v2
{
  "stages": {
    "plan": {
      "status": "failed",
      "substages": {
        "state_init": {
          "status": "completed",
          "started_at": "...",
          "completed_at": "...",
          "checkpoint_data": {
            "adw_id": "abc123",
            "state_file_created": true
          }
        },
        "env_setup": {
          "status": "completed",
          "checkpoint_data": {
            "worktree_path": "trees/abc123",
            "backend_port": 9103,
            "frontend_port": 9203
          }
        },
        "issue_analysis": {
          "status": "failed",
          "error": "Classification API timeout",
          "attempt": 1,
          "checkpoint_data": null
        },
        "plan_generation": {
          "status": "pending"
        },
        "git_operations": {
          "status": "pending"
        }
      }
    }
  }
}

Error Recovery:
# If stage fails at substage 3:
# workflow.json shows:
{
  "stages": {
    "plan": {
      "status": "failed",
      "error": "Issue classification failed",
      "current_substage": {
        "name": "issue_analysis",
        "step": 3,
        "total_steps": 5
      },
      "completed_substages": [
        {"name": "state_init", ...},
        {"name": "env_setup", ...}
      ]
    }
  }
}

# Retry must restart entire stage (no mid-stage resume)
# But UI shows exactly where it failed
```

### ✅ Pros:
- **Real-time visibility** - UI shows current substage
- **Progress indication** - "Step 3/5" updates
- **Better debugging** - Know exactly where failure occurred
- **User confidence** - See continuous progress
- **Still simple orchestration** - no substage execution logic

### ❌ Cons:
- **No mid-stage resume** - must retry entire stage
- **More state updates** - frequent workflow.json writes
- **Stage script responsibility** - must emit progress events

### 🎯 When to Use:
- **RECOMMENDED FOR KANBAN** ✅
- Long-running stages (2+ minutes)
- Users want to see progress
- Good balance of visibility vs complexity

---

## **Design Option 3: Resumable Substages (Advanced)**

### Architecture
```
Each substage is checkpointed
Can resume from last successful substage
Orchestrator can retry individual substages
More complex but maximum recovery


Stage script Pattern:
# adw_plan.py

def load_checkpoint(adw_id, stage, substage):
    """Load checkpoint data from previous substage execution"""
    workflow = load_workflow_state(adw_id)
    return workflow["stages"][stage]["substages"][substage].get("checkpoint_data")

def save_checkpoint(adw_id, stage, substage, data):
    """Save checkpoint data for resume capability"""
    workflow = load_workflow_state(adw_id)
    workflow["stages"][stage]["substages"][substage]["checkpoint_data"] = data
    workflow["stages"][stage]["substages"][substage]["status"] = "completed"
    save_workflow_state(adw_id, workflow)

def main():
    adw_id = sys.argv[1]
    stage = "plan"
    
    # Substage 1: State Init
    if get_substage_status(adw_id, stage, "state_init") != "completed":
        state = initialize_state(adw_id)
        save_checkpoint(adw_id, stage, "state_init", {
            "adw_id": adw_id,
            "state_file_created": True
        })
    else:
        print("Skipping state_init (already completed)")
    
    # Substage 2: Env Setup
    if get_substage_status(adw_id, stage, "env_setup") != "completed":
        worktree_path = setup_worktree(adw_id)
        ports = allocate_ports(adw_id)
        save_checkpoint(adw_id, stage, "env_setup", {
            "worktree_path": worktree_path,
            "backend_port": ports["backend"],
            "frontend_port": ports["frontend"]
        })
    else:
        print("Skipping env_setup (already completed)")
        checkpoint = load_checkpoint(adw_id, stage, "env_setup")
        worktree_path = checkpoint["worktree_path"]
        # Use checkpointed data
    
    # Substage 3: Issue Analysis
    if get_substage_status(adw_id, stage, "issue_analysis") != "completed":
        issue_class = classify_issue(adw_id)
        branch_name = generate_branch(adw_id)
        save_checkpoint(adw_id, stage, "issue_analysis", {
            "issue_class": issue_class,
            "branch_name": branch_name
        })
    else:
        checkpoint = load_checkpoint(adw_id, stage, "issue_analysis")
        issue_class = checkpoint["issue_class"]
        branch_name = checkpoint["branch_name"]
    


Context.json: 

    {
  "adw_id": "abc12345",
  
  "task": {
    "issue_number": "42",
    "title": "Add user authentication",
    "description": "Implement OAuth2...",
    "issue_class": "feature",
    "labels": ["backend", "security"]
  },
  
  "git": {
    "branch_name": "feat-42-abc12345-add-auth",
    "base_branch": "main",
    "commits": [
      {
        "message": "plan: add authentication plan",
        "sha": "def456",
        "timestamp": "2025-01-15T10:02:30Z"
      }
    ]
  },
  
  "artifacts": {
    "plan_file": "agentics/specs/add-auth-plan.md",
    "test_results": null,
    "coverage_report": null
  },
  
  "config": {
    "model_set": "base",
    "backend_port": null,
    "frontend_port": null,
    "worktree_path": null
  },
  
  "stage_outputs": {
    "plan": {
      "plan_file": "agentics/specs/add-auth-plan.md",
      "complexity": "medium"
    },
    "build": null,
    "test": null
  }
}

Proposed State Schema
without substages though
{
  "adw_id": "abc12345",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:05:23Z",
  
  "pipeline": {
    "stages": ["plan", "build", "test", "review"],
    "current_stage": "build",
    "current_index": 1,
    "execution_mode": "sequential"
  },
  
  "status": {
    "overall": "running",
    "started_at": "2025-01-15T10:00:00Z",
    "completed_at": null
  },
  
  "stages": {
    "plan": {
      "status": "completed",
      "script": "adw_plan.py",
      "started_at": "2025-01-15T10:00:00Z",
      "completed_at": "2025-01-15T10:02:30Z",
      "duration_ms": 150000,
      "exit_code": 0,
      "attempt": 1,
      "session_id": "sess_abc123"
    },
    "build": {
      "status": "running",
      "script": "adw_build.py",
      "started_at": "2025-01-15T10:02:35Z",
      "completed_at": null,
      "duration_ms": null,
      "exit_code": null,
      "attempt": 1,
      "session_id": null
    },
    "test": {
      "status": "pending",
      "script": "adw_test.py",
      "started_at": null,
      "completed_at": null,
      "duration_ms": null,
      "exit_code": null,
      "attempt": 0,
      "session_id": null
    }
  },
  
  "errors": []
}

Template Structure
📁 my-new-project/
├── .claude/
│   ├── commands/               ← Primitive slash commands
│   │   ├── plan.md
│   │   ├── implement.md
│   │   ├── test.md
│   │   ├── review.md
│   │   ├── document.md
│   │   └── pr.md
│   ├── hooks/                  ← Pre/post execution hooks
│   └── settings.json           ← Project-level config
│
└── agentics/
    ├── adws/                   ← ADW primitives (executable scripts)
    │   ├── adw_plan.py
    │   ├── adw_implement.py
    │   ├── adw_test.py
    │   ├── adw_review.py
    │   ├── adw_document.py
    │   └── adw_pr.py           (Day-2: GitHub PR creation)
    │
    ├── specs/                  ← Generated plans/specs
    ├── logs/                   ← Execution logs per ADWID
    ├── ai-docs/                ← Project-specific LLM docs
    └── scripts/                ← Utility scripts