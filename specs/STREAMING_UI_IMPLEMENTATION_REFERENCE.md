# Streaming UI Implementation Reference

## Document Purpose

This document provides a comprehensive reference for implementing advanced streaming UI features in AgenticKanban, based on patterns observed in the multi-agent-orchestration codebase. It serves as the implementation guide for all subsequent development steps.

## Table of Contents

1. [Overview](#overview)
2. [WebSocket Message Structures](#websocket-message-structures)
3. [Hook System Architecture](#hook-system-architecture)
4. [FileTracker Design](#filetracker-design)
5. [IDE Integration API](#ide-integration-api)
6. [AI Summarization Patterns](#ai-summarization-patterns)
7. [Frontend Component Architecture](#frontend-component-architecture)
8. [State Management](#state-management)
9. [Implementation Examples](#implementation-examples)

## Overview

The multi-agent-orchestration codebase implements five key features that enhance developer experience:

1. **Granular Streaming**: Detailed sub-stage information via WebSocket events
2. **Click-to-Open Navigation**: IDE integration for direct file opening
3. **Enhanced File Viewing**: Syntax highlighting and git diffs
4. **File Modification Tracking**: Automated tracking of read/write operations
5. **Session Summaries**: Comprehensive reports with AI-generated summaries

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                     Workflow Execution                      │
│                    (ADW/Claude Code)                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      Hook System                            │
│  ┌──────────────┬──────────────┬────────────┬────────────┐  │
│  │ PreToolUse   │ PostToolUse  │ Thinking   │ TextBlock  │  │
│  └──────┬───────┴──────┬───────┴─────┬──────┴──────┬─────┘  │
└─────────┼──────────────┼─────────────┼─────────────┼────────┘
          │              │             │             │
          ▼              ▼             ▼             ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────────────┐
│  FileTracker    │ │ WebSocket   │ │ Summarization Service   │
│  - track files  │ │ Manager     │ │ - AI summaries          │
│  - gen diffs    │ │ - broadcast │ │ - fire-and-forget       │
└─────────────────┘ └──────┬──────┘ └─────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Frontend    │
                    │  - Zustand   │
                    │  - Components│
                    └──────────────┘
```

## WebSocket Message Structures

### Event Types

The system uses 15+ distinct WebSocket event types for granular streaming:

#### 1. Thinking Block Event

```json
{
  "type": "thinking_block",
  "timestamp": "2025-11-04T10:30:45.123Z",
  "adw_id": "a69d56e7",
  "payload": {
    "content": "I need to analyze the current state...",
    "duration_ms": 150,
    "sequence": 1
  }
}
```

**Purpose**: Stream AI thinking in real-time as Claude processes information
**Frequency**: Multiple per tool execution
**Frontend Display**: ThinkingBlock component with syntax highlighting

#### 2. Tool Use Pre Event

```json
{
  "type": "tool_use_pre",
  "timestamp": "2025-11-04T10:30:45.500Z",
  "adw_id": "a69d56e7",
  "payload": {
    "tool_name": "Read",
    "input": {
      "file_path": "/path/to/file.py"
    },
    "tool_use_id": "toolu_abc123"
  }
}
```

**Purpose**: Broadcast before tool execution starts
**Frequency**: Once per tool call
**Frontend Display**: ToolUseBlock component (pending state)

#### 3. Tool Use Post Event

```json
{
  "type": "tool_use_post",
  "timestamp": "2025-11-04T10:30:46.200Z",
  "adw_id": "a69d56e7",
  "payload": {
    "tool_name": "Read",
    "tool_use_id": "toolu_abc123",
    "output": "File contents...",
    "duration_ms": 700,
    "success": true,
    "error": null
  }
}
```

**Purpose**: Broadcast after tool execution completes
**Frequency**: Once per tool call
**Frontend Display**: ToolUseBlock component (completed state)

#### 4. File Changed Event

```json
{
  "type": "file_changed",
  "timestamp": "2025-11-04T10:30:46.250Z",
  "adw_id": "a69d56e7",
  "payload": {
    "file_path": "/path/to/file.py",
    "operation": "modified",
    "diff": "@@ -10,3 +10,4 @@\n-old line\n+new line",
    "summary": "Updated function to handle edge cases",
    "lines_added": 5,
    "lines_removed": 2
  }
}
```

**Purpose**: Track file read/write operations with diffs
**Frequency**: Once per file operation
**Frontend Display**: FileChangesDisplay component

#### 5. Summary Update Event

```json
{
  "type": "summary_update",
  "timestamp": "2025-11-04T10:30:47.000Z",
  "adw_id": "a69d56e7",
  "payload": {
    "summary_type": "file_change",
    "content": "Refactored authentication logic to use async/await pattern",
    "related_file": "/path/to/file.py",
    "metadata": {
      "model": "claude-3-haiku-20240307",
      "tokens": 150
    }
  }
}
```

**Purpose**: Provide AI-generated summaries for events
**Frequency**: Async, after event processing
**Frontend Display**: Inline in FileChangesDisplay and SessionSummary

#### 6. Text Block Event

```json
{
  "type": "text_block",
  "timestamp": "2025-11-04T10:30:45.300Z",
  "adw_id": "a69d56e7",
  "payload": {
    "content": "I'll help you implement this feature...",
    "sequence": 2
  }
}
```

**Purpose**: Stream Claude's text responses
**Frequency**: Multiple per response
**Frontend Display**: DetailedLogViewer as text entries

### Message Format Standards

All messages follow this structure:

```typescript
interface WebSocketMessage {
  type: string;              // Event type identifier
  timestamp: string;         // ISO 8601 timestamp
  adw_id: string;           // Workflow execution ID
  payload: Record<string, any>;  // Event-specific data
}
```

**Implementation Notes**:
- Always include `adw_id` for proper event routing
- Use ISO 8601 timestamps for consistency
- Keep payload flat when possible (easier to serialize)
- Include sequence numbers for ordered events (thinking blocks, text blocks)

## Hook System Architecture

### Hook Types

The hook system provides four primary hook points:

#### 1. PreToolUse Hook

**Trigger**: Before any tool execution
**Purpose**: Track intent, validate input, broadcast pre-event
**Context Provided**:

```python
{
    "tool_name": str,
    "input": dict,
    "tool_use_id": str,
    "adw_id": str,
    "timestamp": str
}
```

**Typical Actions**:
- Broadcast `tool_use_pre` WebSocket event
- Log tool invocation
- Validate tool input
- Start performance timer

#### 2. PostToolUse Hook

**Trigger**: After tool execution completes
**Purpose**: Track results, update FileTracker, broadcast post-event
**Context Provided**:

```python
{
    "tool_name": str,
    "input": dict,
    "output": str | dict,
    "tool_use_id": str,
    "adw_id": str,
    "duration_ms": int,
    "success": bool,
    "error": str | None,
    "timestamp": str
}
```

**Typical Actions**:
- Broadcast `tool_use_post` WebSocket event
- Call FileTracker if tool is Read/Write/Edit
- Generate git diff for modified files
- Trigger AI summarization (async)
- Broadcast `file_changed` event

#### 3. ThinkingBlock Hook

**Trigger**: When Claude generates thinking content
**Purpose**: Stream thinking in real-time
**Context Provided**:

```python
{
    "content": str,
    "adw_id": str,
    "sequence": int,
    "timestamp": str
}
```

**Typical Actions**:
- Broadcast `thinking_block` WebSocket event
- Track thinking duration
- Log for debugging

#### 4. TextBlock Hook

**Trigger**: When Claude generates text response
**Purpose**: Stream text responses in real-time
**Context Provided**:

```python
{
    "content": str,
    "adw_id": str,
    "sequence": int,
    "timestamp": str
}
```

**Typical Actions**:
- Broadcast `text_block` WebSocket event
- Track response length
- Log for debugging

### Hook System Implementation Pattern

```python
# server/modules/hook_system.py

from typing import Callable, Dict, List, Any
from enum import Enum

class HookType(Enum):
    PRE_TOOL_USE = "pre_tool_use"
    POST_TOOL_USE = "post_tool_use"
    THINKING_BLOCK = "thinking_block"
    TEXT_BLOCK = "text_block"

class HookSystem:
    def __init__(self):
        self._hooks: Dict[HookType, List[Callable]] = {
            hook_type: [] for hook_type in HookType
        }

    def register_hook(self, hook_type: HookType, callback: Callable):
        """Register a callback for a specific hook type"""
        self._hooks[hook_type].append(callback)

    def execute_hooks(self, hook_type: HookType, context: Dict[str, Any]):
        """Execute all registered hooks for the given type"""
        for callback in self._hooks[hook_type]:
            try:
                callback(context)
            except Exception as e:
                # Log error but don't break workflow
                print(f"Hook error: {e}")

    def create_tool_use_context(
        self,
        tool_name: str,
        input_data: dict,
        output_data: Any = None,
        tool_use_id: str = None,
        adw_id: str = None,
        duration_ms: int = None,
        success: bool = True,
        error: str = None
    ) -> Dict[str, Any]:
        """Build context dictionary for tool use hooks"""
        return {
            "tool_name": tool_name,
            "input": input_data,
            "output": output_data,
            "tool_use_id": tool_use_id,
            "adw_id": adw_id,
            "duration_ms": duration_ms,
            "success": success,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }
```

### Hook Registration Example

```python
# Register hooks during workflow initialization

from server.modules.hook_system import HookSystem, HookType
from server.modules.file_tracker import FileTracker
from server.core.websocket_manager import WebSocketManager

hook_system = HookSystem()
file_tracker = FileTracker(adw_id="a69d56e7")
ws_manager = WebSocketManager()

# Register PreToolUse hook
def pre_tool_use_handler(context):
    ws_manager.broadcast_tool_use_pre(
        adw_id=context["adw_id"],
        tool_name=context["tool_name"],
        input_data=context["input"],
        tool_use_id=context["tool_use_id"]
    )

hook_system.register_hook(HookType.PRE_TOOL_USE, pre_tool_use_handler)

# Register PostToolUse hook with FileTracker integration
def post_tool_use_handler(context):
    # Broadcast tool completion
    ws_manager.broadcast_tool_use_post(
        adw_id=context["adw_id"],
        tool_name=context["tool_name"],
        tool_use_id=context["tool_use_id"],
        output=context["output"],
        duration_ms=context["duration_ms"],
        success=context["success"],
        error=context["error"]
    )

    # Track file operations
    tool_name = context["tool_name"]
    if tool_name in ["Read", "Grep", "Glob"]:
        file_path = context["input"].get("file_path") or context["input"].get("path")
        if file_path:
            file_tracker.track_read(file_path)

    elif tool_name in ["Write", "Edit"]:
        file_path = context["input"].get("file_path")
        if file_path and context["success"]:
            file_tracker.track_modified(file_path)

            # Generate diff and broadcast file change
            diff = file_tracker.get_file_diff(file_path)
            summary = file_tracker.generate_file_summary(file_path, diff)

            ws_manager.broadcast_file_changed(
                adw_id=context["adw_id"],
                file_path=file_path,
                operation="modified",
                diff=diff,
                summary=summary
            )

hook_system.register_hook(HookType.POST_TOOL_USE, post_tool_use_handler)
```

## FileTracker Design

### Class Structure

```python
# server/modules/file_tracker.py

import subprocess
from typing import Dict, List, Set, Optional
from pathlib import Path

class FileTracker:
    """Tracks file read and write operations during workflow execution"""

    def __init__(self, adw_id: str, repo_path: str = None):
        self.adw_id = adw_id
        self.repo_path = repo_path or Path.cwd()
        self._read_files: Set[str] = set()
        self._modified_files: Set[str] = set()
        self._file_diffs: Dict[str, str] = {}
        self._file_summaries: Dict[str, str] = {}

    def track_read(self, file_path: str):
        """Track a file read operation"""
        self._read_files.add(file_path)

    def track_modified(self, file_path: str):
        """Track a file modification operation"""
        self._modified_files.add(file_path)

    def get_file_diff(self, file_path: str, timeout: int = 5) -> Optional[str]:
        """Generate git diff for a modified file"""
        try:
            result = subprocess.run(
                ["git", "diff", file_path],
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=self.repo_path
            )

            if result.returncode == 0:
                diff = result.stdout

                # Truncate large diffs
                lines = diff.split("\n")
                if len(lines) > 1000:
                    diff = "\n".join(lines[:1000]) + "\n... (truncated)"

                self._file_diffs[file_path] = diff
                return diff
            else:
                return None

        except subprocess.TimeoutExpired:
            return "Diff generation timed out"
        except Exception as e:
            return f"Error generating diff: {str(e)}"

    def get_tracked_files(self) -> Dict[str, List[str]]:
        """Get all tracked files"""
        return {
            "read": list(self._read_files),
            "modified": list(self._modified_files)
        }

    def generate_file_summary(self, file_path: str, diff: str) -> Dict[str, Any]:
        """Prepare data for AI summarization"""
        if not diff:
            return {
                "file_path": file_path,
                "lines_added": 0,
                "lines_removed": 0,
                "summary": None
            }

        # Count added/removed lines
        lines_added = len([line for line in diff.split("\n") if line.startswith("+")])
        lines_removed = len([line for line in diff.split("\n") if line.startswith("-")])

        return {
            "file_path": file_path,
            "lines_added": lines_added,
            "lines_removed": lines_removed,
            "diff": diff
        }

    def get_statistics(self) -> Dict[str, int]:
        """Get tracking statistics"""
        return {
            "files_read": len(self._read_files),
            "files_modified": len(self._modified_files),
            "total_files": len(self._read_files | self._modified_files)
        }
```

### Usage Pattern

```python
# Initialize per workflow execution
file_tracker = FileTracker(adw_id="a69d56e7")

# In PostToolUse hook
if tool_name == "Write":
    file_path = context["input"]["file_path"]
    file_tracker.track_modified(file_path)

    # Get diff
    diff = file_tracker.get_file_diff(file_path)

    # Prepare for summarization
    summary_data = file_tracker.generate_file_summary(file_path, diff)

    # Trigger async summarization (fire-and-forget)
    summarization_service.async_summarize(
        file_path=file_path,
        diff=diff,
        operation="modified",
        adw_id=file_tracker.adw_id
    )
```

## IDE Integration API

### Endpoint Design

```python
# server/api/file_operations.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess
import os

router = APIRouter()

class OpenFileRequest(BaseModel):
    file_path: str
    line_number: int = 1
    ide_preference: str = None  # 'code' or 'cursor'

@router.post("/api/open-file")
async def open_file_in_ide(request: OpenFileRequest):
    """Open a file in the user's IDE at a specific line number"""

    # Validate file exists
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Determine IDE
    ide = request.ide_preference or os.getenv("IDE_PREFERENCE", "code")

    # Construct command
    if ide == "cursor":
        command = ["cursor", "--goto", f"{request.file_path}:{request.line_number}"]
    else:
        command = ["code", "--goto", f"{request.file_path}:{request.line_number}"]

    try:
        # Execute command
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            return {
                "success": True,
                "message": f"Opened {request.file_path} in {ide}"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to open IDE: {result.stderr}"
            )

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"IDE '{ide}' not found. Please install {ide} or set IDE_PREFERENCE."
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail="IDE command timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error opening file: {str(e)}"
        )
```

### Frontend Integration

```javascript
// src/services/fileService.js

export async function openFileInIDE(filePath, lineNumber = 1) {
  try {
    const response = await fetch('/api/open-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: filePath,
        line_number: lineNumber,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to open file');
    }

    const result = await response.json();

    // Show success notification
    toast.success(`Opened ${filePath} in IDE`);

    return result;
  } catch (error) {
    // Show error notification
    toast.error(`Failed to open file: ${error.message}`);
    throw error;
  }
}
```

## AI Summarization Patterns

### Service Design

```python
# server/modules/summarization_service.py

from anthropic import Anthropic
import asyncio
from typing import Optional

class SummarizationService:
    """Generate AI summaries for file changes and events"""

    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-3-haiku-20240307"
        self._cache = {}

    def summarize_file_change(
        self,
        file_path: str,
        diff: str,
        operation: str
    ) -> str:
        """Generate concise summary of file change (<200 chars)"""

        # Check cache
        cache_key = f"{file_path}:{hash(diff)}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        prompt = f"""Summarize this code change in 1-2 sentences (max 200 chars):

File: {file_path}
Operation: {operation}

Diff:
{diff[:1000]}  # Truncate for cost savings

Focus on WHAT changed and WHY, not implementation details."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}]
            )

            summary = response.content[0].text.strip()

            # Cache result
            self._cache[cache_key] = summary

            return summary

        except Exception as e:
            # Fallback to generic summary
            return f"{operation.capitalize()} {file_path}"

    async def async_summarize(
        self,
        file_path: str,
        diff: str,
        operation: str,
        adw_id: str,
        ws_manager
    ):
        """Fire-and-forget async summarization with WebSocket broadcast"""

        def _summarize_and_broadcast():
            summary = self.summarize_file_change(file_path, diff, operation)

            # Broadcast summary update
            ws_manager.broadcast_summary_update(
                adw_id=adw_id,
                summary_type="file_change",
                content=summary,
                related_file=file_path
            )

        # Run in background without blocking
        asyncio.create_task(asyncio.to_thread(_summarize_and_broadcast))
```

### Usage Pattern

```python
# In PostToolUse hook after file modification

if tool_name == "Edit":
    file_path = context["input"]["file_path"]
    diff = file_tracker.get_file_diff(file_path)

    # Broadcast file change immediately (without summary)
    ws_manager.broadcast_file_changed(
        adw_id=context["adw_id"],
        file_path=file_path,
        operation="modified",
        diff=diff,
        summary=None  # Will be updated later
    )

    # Trigger async summarization (doesn't block)
    await summarization_service.async_summarize(
        file_path=file_path,
        diff=diff,
        operation="modified",
        adw_id=context["adw_id"],
        ws_manager=ws_manager
    )
```

## Frontend Component Architecture

### Component Hierarchy

```
CardExpandModal
├── TaskDetailsTab
├── WorkflowStatusTab
├── StageLogsTab
├── FileChangesTab (NEW)
│   └── FileChangesDisplay
│       ├── FileCard (read)
│       │   ├── FilePathLink (clickable)
│       │   ├── OperationBadge
│       │   └── AISummary
│       └── FileCard (modified)
│           ├── FilePathLink (clickable)
│           ├── OperationBadge
│           ├── AISummary
│           └── GitDiffViewer (collapsible)
│               └── SyntaxHighlighter
└── SessionSummaryTab (NEW)
    └── SessionSummary
        ├── SessionOverview (stats)
        ├── FileChangesTimeline
        ├── AISummary
        └── ExportButtons
            ├── ExportJSON
            └── ExportMarkdown
```

### Component Patterns

#### FileChangesDisplay Component

```jsx
// src/components/workflow/FileChangesDisplay.jsx

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { openFileInIDE } from '../../services/fileService';

export const FileChangesDisplay = ({ taskId }) => {
  const fileChanges = useKanbanStore(state => state.taskFileChanges[taskId]);
  const [expandedFiles, setExpandedFiles] = useState(new Set());

  if (!fileChanges) {
    return (
      <div className="text-gray-500 text-center py-8">
        No file changes tracked for this task
      </div>
    );
  }

  const handleFileClick = async (filePath) => {
    try {
      await openFileInIDE(filePath, 1);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const toggleDiff = (filePath) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Files Read Section */}
      <section>
        <h3 className="text-lg font-semibold mb-3">
          Files Read ({fileChanges.read?.length || 0})
        </h3>
        <div className="space-y-2">
          {fileChanges.read?.map(filePath => (
            <FileCard
              key={filePath}
              filePath={filePath}
              operation="read"
              onClick={() => handleFileClick(filePath)}
            />
          ))}
        </div>
      </section>

      {/* Files Modified Section */}
      <section>
        <h3 className="text-lg font-semibold mb-3">
          Files Modified ({fileChanges.modified?.length || 0})
        </h3>
        <div className="space-y-2">
          {fileChanges.modified?.map(filePath => (
            <FileCard
              key={filePath}
              filePath={filePath}
              operation="modified"
              onClick={() => handleFileClick(filePath)}
              diff={fileChanges.diffs?.[filePath]}
              summary={fileChanges.summaries?.[filePath]}
              expanded={expandedFiles.has(filePath)}
              onToggleDiff={() => toggleDiff(filePath)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

const FileCard = ({ filePath, operation, onClick, diff, summary, expanded, onToggleDiff }) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <button
          onClick={onClick}
          className="flex-1 text-left hover:text-blue-600 transition-colors"
        >
          <span className="font-mono text-sm">{filePath}</span>
        </button>

        <span className={`px-2 py-1 rounded text-xs font-medium ${
          operation === 'read'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-orange-100 text-orange-800'
        }`}>
          {operation}
        </span>
      </div>

      {summary && (
        <div className="mt-2 text-sm text-gray-600">
          {summary}
        </div>
      )}

      {diff && (
        <div className="mt-3">
          <button
            onClick={onToggleDiff}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {expanded ? 'Hide Diff' : 'Show Diff'}
          </button>

          {expanded && (
            <div className="mt-2 overflow-x-auto">
              <SyntaxHighlighter
                language="diff"
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{ fontSize: '12px' }}
              >
                {diff}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### ThinkingBlock Component

```jsx
// src/components/workflow/ThinkingBlock.jsx

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export const ThinkingBlock = ({ content, timestamp, duration }) => {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = content.length > 500;

  return (
    <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-purple-700">
          Thinking
        </span>
        <span className="text-xs text-gray-500">
          {duration}ms
        </span>
      </div>

      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>
          {shouldTruncate && !expanded
            ? content.slice(0, 500) + '...'
            : content}
        </ReactMarkdown>
      </div>

      {shouldTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm text-purple-600 hover:text-purple-800"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
};
```

## State Management

### Zustand Store Updates

```javascript
// src/stores/kanbanStore.js

export const useKanbanStore = create((set, get) => ({
  // ... existing state ...

  // New state for streaming UI features
  taskFileChanges: {},
  taskThinkingBlocks: {},
  taskToolUseEvents: {},
  taskSessionSummaries: {},

  // New WebSocket event handlers
  handleThinkingBlock: (data) => {
    const { adw_id, payload } = data;

    set((state) => ({
      taskThinkingBlocks: {
        ...state.taskThinkingBlocks,
        [adw_id]: [
          ...(state.taskThinkingBlocks[adw_id] || []),
          {
            content: payload.content,
            timestamp: data.timestamp,
            duration: payload.duration_ms,
            sequence: payload.sequence,
          },
        ].slice(-500), // Keep last 500 events
      },
    }));
  },

  handleToolUsePre: (data) => {
    const { adw_id, payload } = data;

    set((state) => ({
      taskToolUseEvents: {
        ...state.taskToolUseEvents,
        [adw_id]: [
          ...(state.taskToolUseEvents[adw_id] || []),
          {
            tool_use_id: payload.tool_use_id,
            tool_name: payload.tool_name,
            input: payload.input,
            timestamp: data.timestamp,
            status: 'pending',
          },
        ].slice(-500),
      },
    }));
  },

  handleToolUsePost: (data) => {
    const { adw_id, payload } = data;

    set((state) => {
      const events = state.taskToolUseEvents[adw_id] || [];
      const eventIndex = events.findIndex(
        e => e.tool_use_id === payload.tool_use_id
      );

      if (eventIndex !== -1) {
        // Update existing event
        const updatedEvents = [...events];
        updatedEvents[eventIndex] = {
          ...updatedEvents[eventIndex],
          output: payload.output,
          duration: payload.duration_ms,
          success: payload.success,
          error: payload.error,
          status: 'completed',
          completed_at: data.timestamp,
        };

        return {
          taskToolUseEvents: {
            ...state.taskToolUseEvents,
            [adw_id]: updatedEvents,
          },
        };
      }

      return state;
    });
  },

  handleFileChanged: (data) => {
    const { adw_id, payload } = data;

    set((state) => {
      const fileChanges = state.taskFileChanges[adw_id] || {
        read: [],
        modified: [],
        diffs: {},
        summaries: {},
      };

      if (payload.operation === 'read') {
        return {
          taskFileChanges: {
            ...state.taskFileChanges,
            [adw_id]: {
              ...fileChanges,
              read: [...new Set([...fileChanges.read, payload.file_path])],
            },
          },
        };
      } else if (payload.operation === 'modified') {
        return {
          taskFileChanges: {
            ...state.taskFileChanges,
            [adw_id]: {
              ...fileChanges,
              modified: [...new Set([...fileChanges.modified, payload.file_path])],
              diffs: {
                ...fileChanges.diffs,
                [payload.file_path]: payload.diff,
              },
              summaries: {
                ...fileChanges.summaries,
                [payload.file_path]: payload.summary,
              },
            },
          },
        };
      }

      return state;
    });
  },

  handleSummaryUpdate: (data) => {
    const { adw_id, payload } = data;

    set((state) => {
      if (payload.summary_type === 'file_change' && payload.related_file) {
        // Update file change summary
        const fileChanges = state.taskFileChanges[adw_id];
        if (fileChanges) {
          return {
            taskFileChanges: {
              ...state.taskFileChanges,
              [adw_id]: {
                ...fileChanges,
                summaries: {
                  ...fileChanges.summaries,
                  [payload.related_file]: payload.content,
                },
              },
            },
          };
        }
      } else if (payload.summary_type === 'session') {
        // Update session summary
        return {
          taskSessionSummaries: {
            ...state.taskSessionSummaries,
            [adw_id]: {
              ...state.taskSessionSummaries[adw_id],
              overall: payload.content,
              updated_at: data.timestamp,
            },
          },
        };
      }

      return state;
    });
  },

  handleTextBlock: (data) => {
    const { adw_id, payload } = data;

    set((state) => ({
      taskTextBlocks: {
        ...state.taskTextBlocks,
        [adw_id]: [
          ...(state.taskTextBlocks[adw_id] || []),
          {
            content: payload.content,
            timestamp: data.timestamp,
            sequence: payload.sequence,
          },
        ].slice(-500),
      },
    }));
  },
}));
```

## Implementation Examples

### Complete Flow Example

Here's how all components work together when a file is modified:

```
1. User triggers workflow execution (e.g., "Fix bug in auth.py")

2. Claude Code executes Edit tool
   ├── PreToolUse hook fires
   │   └── Broadcast tool_use_pre event → Frontend shows pending tool use
   │
   ├── Edit tool executes (modifies auth.py)
   │
   └── PostToolUse hook fires
       ├── FileTracker.track_modified("auth.py")
       ├── Generate git diff
       ├── Broadcast file_changed event → Frontend updates FileChangesDisplay
       └── Async: Generate AI summary
           └── Broadcast summary_update event → Frontend updates summary

3. Frontend displays:
   - DetailedLogViewer: Shows tool use with input/output
   - FileChangesDisplay: Shows auth.py with "modified" badge
   - User clicks auth.py → Opens in VS Code at line 1
   - AI summary appears: "Refactored authentication to use async/await"

4. Session completes:
   - SessionSummary shows: 1 file modified, 5 lines added
   - User clicks "Export JSON" → Downloads full session report
```

### Testing Example

```python
# server/tests/test_file_tracker.py

import pytest
from server.modules.file_tracker import FileTracker

def test_track_read_file():
    tracker = FileTracker(adw_id="test123")
    tracker.track_read("/path/to/file.py")

    tracked = tracker.get_tracked_files()
    assert "/path/to/file.py" in tracked["read"]
    assert "/path/to/file.py" not in tracked["modified"]

def test_track_modified_file():
    tracker = FileTracker(adw_id="test123")
    tracker.track_modified("/path/to/file.py")

    tracked = tracker.get_tracked_files()
    assert "/path/to/file.py" in tracked["modified"]

def test_git_diff_generation(tmp_path):
    # Create test git repo
    repo_path = tmp_path / "repo"
    repo_path.mkdir()

    # Initialize git and create test file
    subprocess.run(["git", "init"], cwd=repo_path)
    test_file = repo_path / "test.py"
    test_file.write_text("old content")
    subprocess.run(["git", "add", "."], cwd=repo_path)
    subprocess.run(["git", "commit", "-m", "initial"], cwd=repo_path)

    # Modify file
    test_file.write_text("new content")

    # Test diff generation
    tracker = FileTracker(adw_id="test123", repo_path=str(repo_path))
    diff = tracker.get_file_diff(str(test_file))

    assert diff is not None
    assert "-old content" in diff
    assert "+new content" in diff
```

## Summary

This reference document provides:

1. **15+ WebSocket event types** with complete message structures
2. **Hook system architecture** with 4 hook types and integration patterns
3. **FileTracker design** with git diff generation and file tracking
4. **IDE integration API** with VS Code/Cursor support
5. **AI summarization patterns** using Claude Haiku (fire-and-forget)
6. **Frontend component architecture** with React/Zustand patterns
7. **Complete implementation examples** showing end-to-end flows

All implementation steps should reference this document for proven patterns and code examples. This ensures consistency with the reference codebase and reduces implementation time.
