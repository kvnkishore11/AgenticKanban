# Claude Code UI Implementation Guide

## Overview

This document provides a comprehensive guide to implementing a UI-based application that replicates the Claude Code CLI experience. The goal is to enable users to interact with Claude Code's features through a graphical interface while maintaining the same typing experience and command functionality.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Input System Implementation](#input-system-implementation)
4. [Command System](#command-system)
5. [Hooks System](#hooks-system)
6. [Permission System](#permission-system)
7. [Session Management](#session-management)
8. [Real-time Features](#real-time-features)
9. [UI/UX Guidelines](#uiux-guidelines)
10. [API Integration](#api-integration)

---

## 1. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Input Editor │  │ Chat Display │  │ Tool Viewer  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                    Command Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Slash Cmds   │  │ Quick Cmds   │  │ Built-in Cmds│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                     Control Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Permissions  │  │ Hooks System │  │ Session Mgr  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Claude SDK   │  │ MCP Protocol │  │ File System  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack Recommendations

**Frontend:**
- React/Vue/Svelte for UI components
- Monaco Editor or CodeMirror for code editing
- xterm.js for terminal emulation (optional)
- markdown-it or react-markdown for rendering
- WebSocket for real-time updates

**Backend:**
- Node.js/Python/Go for API server
- WebSocket server for live updates
- File system watcher for project changes
- Claude API SDK integration

**State Management:**
- Context/Redux/Zustand for global state
- LocalStorage/IndexedDB for persistence

---

## 2. Core Components

### 2.1 Input Editor Component

The input editor is the primary interaction point, requiring sophisticated features:

#### Features to Implement

**Multiline Input Support:**
```javascript
// Example implementation concept
const handleKeyDown = (e) => {
  // Shift+Enter for newline
  if (e.shiftKey && e.key === 'Enter') {
    e.preventDefault();
    insertNewline();
  }
  // Option+Enter for newline (Mac)
  else if (e.altKey && e.key === 'Enter') {
    e.preventDefault();
    insertNewline();
  }
  // Backslash+Enter for newline
  else if (e.key === 'Enter' && lastChar === '\\') {
    e.preventDefault();
    removeBackslash();
    insertNewline();
  }
  // Plain Enter to submit
  else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitMessage();
  }
};
```

**Autocomplete System:**
```javascript
const AutocompleteEngine = {
  triggers: {
    '/': 'slashCommands',
    '@': 'filePaths',
    '#': 'memoryShortcuts',
    '!': 'bashCommands'
  },

  getCompletions: async (trigger, query) => {
    switch(trigger) {
      case '/':
        return getSlashCommands(query);
      case '@':
        return await getFilePaths(query);
      case '#':
        return getMemoryItems(query);
      case '!':
        return getBashHistory(query);
    }
  },

  render: (completions) => {
    // Show dropdown with completions
    // Highlight matching characters
    // Show descriptions and argument hints
  }
};

// File path autocomplete for web apps
class FilePathProvider {
  constructor(mode = 'backend') {
    this.mode = mode; // 'backend', 'filesystem-api', 'uploaded', 'git'
    this.fileCache = [];
    this.provider = null;
  }

  async initialize(config) {
    switch (this.mode) {
      case 'backend':
        // Backend API provides file listings
        this.provider = {
          search: async (query) => {
            const res = await fetch(`/api/files?q=${encodeURIComponent(query)}`);
            return await res.json();
          },
          readFile: async (path) => {
            const res = await fetch(`/api/files/${encodeURIComponent(path)}`);
            return await res.text();
          }
        };
        break;

      case 'filesystem-api':
        // Use browser's File System Access API (Chrome/Edge)
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await this.buildFileCache(dirHandle);
        this.provider = {
          search: (query) => this.searchCache(query),
          readFile: async (path) => await this.readFromHandle(dirHandle, path)
        };
        break;

      case 'uploaded':
        // User uploads their project once
        await this.requestUpload();
        this.provider = {
          search: (query) => this.searchCache(query),
          readFile: async (path) => await this.readFromIndexedDB(path)
        };
        break;

      case 'git':
        // Connect to Git repository (GitHub/GitLab API)
        await this.loadGitRepo(config.repoUrl, config.token);
        this.provider = {
          search: (query) => this.searchCache(query),
          readFile: async (path) => await this.readFromGit(config.repoUrl, path)
        };
        break;
    }
  }

  async buildFileCache(dirHandle, path = '') {
    for await (const entry of dirHandle.values()) {
      const fullPath = path ? `${path}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        this.fileCache.push(fullPath);
      } else if (entry.kind === 'directory') {
        await this.buildFileCache(entry, fullPath);
      }
    }
  }

  searchCache(query) {
    return this.fileCache.filter(f =>
      f.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getFilePaths(query) {
    if (!this.provider) {
      return [];
    }
    return await this.provider.search(query);
  }

  async readFile(path) {
    if (!this.provider) {
      throw new Error('File provider not initialized');
    }
    return await this.provider.readFile(path);
  }
}

// Usage in autocomplete
const fileProvider = new FilePathProvider('backend');
await fileProvider.initialize({ apiUrl: '/api' });

async function getFilePaths(query) {
  return await fileProvider.getFilePaths(query);
}
```

**Command History:**
```javascript
class CommandHistory {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
    this.tempInput = '';
  }

  add(command) {
    this.history.push(command);
    this.currentIndex = this.history.length;
  }

  navigateUp() {
    if (this.currentIndex > 0) {
      if (this.currentIndex === this.history.length) {
        this.tempInput = getCurrentInput();
      }
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
  }

  navigateDown() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    } else if (this.currentIndex === this.history.length - 1) {
      this.currentIndex++;
      return this.tempInput;
    }
  }

  // Implement Ctrl+R reverse search
  reverseSearch(query) {
    return this.history
      .slice()
      .reverse()
      .filter(cmd => cmd.includes(query));
  }
}
```

### 2.2 Chat Display Component

Display both user messages and Claude's responses with rich formatting:

#### Message Types
```typescript
interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    toolUses?: ToolUse[];
    thinking?: string;
  };
}

interface ToolUse {
  id: string;
  name: string;
  input: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
}
```

#### Rendering Features
- Syntax highlighting for code blocks
- File path links with click-to-open
- Tool use collapsible sections
- Extended thinking toggle (Ctrl+O equivalent)
- Streaming text support with cursor animation

### 2.3 Tool Viewer Component

Display tool executions in real-time:

```javascript
const ToolViewer = ({ toolUses }) => {
  return (
    <div className="tool-viewer">
      {toolUses.map(tool => (
        <ToolCard key={tool.id}>
          <ToolHeader>
            <ToolIcon name={tool.name} />
            <ToolName>{tool.name}</ToolName>
            <ToolStatus status={tool.status} />
          </ToolHeader>

          <Collapsible>
            <ToolInput>{formatToolInput(tool.input)}</ToolInput>
            {tool.result && (
              <ToolOutput>{formatToolOutput(tool.result)}</ToolOutput>
            )}
          </Collapsible>
        </ToolCard>
      ))}
    </div>
  );
};
```

---

## 3. Input System Implementation

### 3.1 Quick Command Prefixes

Implement all Claude Code command prefixes:

```javascript
class InputProcessor {
  process(input) {
    const firstChar = input.charAt(0);

    switch(firstChar) {
      case '/':
        return this.handleSlashCommand(input);
      case '!':
        return this.handleBashCommand(input.slice(1));
      case '@':
        return this.handleFileReference(input);
      case '#':
        return this.handleMemoryShortcut(input.slice(1));
      default:
        return this.handleNaturalLanguage(input);
    }
  }

  handleSlashCommand(input) {
    const [command, ...args] = input.slice(1).split(' ');
    return {
      type: 'slash_command',
      command,
      arguments: args.join(' ')
    };
  }

  handleBashCommand(command) {
    return {
      type: 'bash',
      command,
      requiresPermission: this.checkBashPermission(command)
    };
  }

  handleFileReference(input) {
    // Parse @ file references
    const fileRefs = input.match(/@[\w\/.]+/g);
    return {
      type: 'message',
      content: input,
      fileReferences: fileRefs
    };
  }

  handleMemoryShortcut(content) {
    return {
      type: 'memory_add',
      content
    };
  }
}
```

### 3.2 Keyboard Shortcuts

Implement all keyboard shortcuts from interactive mode:

```javascript
const keyboardShortcuts = {
  'Ctrl+C': () => cancelCurrentOperation(),
  'Ctrl+D': () => exitSession(),
  'Ctrl+L': () => clearScreen(),
  'Ctrl+O': () => toggleToolDetails(),
  'Ctrl+R': () => activateReverseSearch(),
  'Ctrl+B': () => moveCommandToBackground(),
  'Tab': () => toggleExtendedThinking(),
  'Shift+Tab': () => cyclePermissionMode(),
  'Alt+M': () => cyclePermissionMode(),
  'ArrowUp': () => navigateHistoryUp(),
  'ArrowDown': () => navigateHistoryDown(),

  // Platform-specific
  'Option+Enter': () => insertNewline(), // Mac
  'Shift+Enter': () => insertNewline()
};

// Register shortcuts
document.addEventListener('keydown', (e) => {
  const key = buildKeyCombo(e);
  if (keyboardShortcuts[key]) {
    e.preventDefault();
    keyboardShortcuts[key]();
  }
});
```

### 3.3 Vim Mode Implementation

For advanced users who prefer Vim keybindings:

```javascript
class VimMode {
  constructor(editor) {
    this.editor = editor;
    this.mode = 'NORMAL'; // NORMAL, INSERT, VISUAL
    this.setupBindings();
  }

  setupBindings() {
    this.normalModeBindings = {
      'h': () => this.moveCursorLeft(),
      'j': () => this.moveCursorDown(),
      'k': () => this.moveCursorUp(),
      'l': () => this.moveCursorRight(),
      'i': () => this.enterInsertMode(),
      'a': () => this.enterInsertModeAfter(),
      'o': () => this.openNewLine(),
      'dd': () => this.deleteLine(),
      'yy': () => this.yankLine(),
      'p': () => this.paste(),
      '/': () => this.startSearch(),
      ':': () => this.startCommand()
    };

    // ESC to return to NORMAL mode from any mode
    this.insertModeBindings = {
      'Escape': () => this.enterNormalMode()
    };
  }

  handleKeypress(e) {
    if (this.mode === 'NORMAL') {
      return this.handleNormalMode(e);
    } else if (this.mode === 'INSERT') {
      return this.handleInsertMode(e);
    }
  }
}
```

---

## 4. Command System

### 4.1 Built-in Commands

Implement all 30+ built-in commands:

```javascript
const builtInCommands = {
  // Session Management
  '/clear': {
    description: 'Clear conversation history',
    execute: async () => {
      await clearHistory();
      refreshDisplay();
    }
  },

  '/exit': {
    description: 'Exit the session',
    execute: () => {
      confirmExit();
    }
  },

  '/rewind': {
    description: 'Undo last changes',
    execute: async (steps = 1) => {
      await rewindSession(steps);
    }
  },

  // Configuration
  '/model': {
    description: 'Change AI model',
    argumentHint: '<sonnet|opus|haiku>',
    execute: async (model) => {
      await setModel(model);
    }
  },

  '/config': {
    description: 'Open settings',
    execute: () => {
      openSettingsModal();
    }
  },

  '/status': {
    description: 'View version and account info',
    execute: async () => {
      const status = await getStatus();
      displayStatus(status);
    }
  },

  // Context & Usage
  '/context': {
    description: 'Visualize token consumption',
    execute: () => {
      showContextVisualization();
    }
  },

  '/cost': {
    description: 'Display usage statistics',
    execute: async () => {
      const stats = await getUsageStats();
      displayStats(stats);
    }
  },

  // Code Operations
  '/review': {
    description: 'Request code review',
    execute: async () => {
      await requestCodeReview();
    }
  },

  '/sandbox': {
    description: 'Toggle sandbox mode',
    execute: () => {
      toggleSandboxMode();
    }
  },

  '/export': {
    description: 'Export conversation',
    argumentHint: '<format>',
    execute: async (format = 'markdown') => {
      await exportConversation(format);
    }
  },

  // Advanced Features
  '/compact': {
    description: 'Compact conversation history',
    argumentHint: '[focus]',
    execute: async (focus) => {
      await compactHistory(focus);
    }
  },

  '/hooks': {
    description: 'Configure hooks',
    execute: () => {
      openHooksConfiguration();
    }
  },

  '/mcp': {
    description: 'Manage MCP servers',
    execute: () => {
      openMCPManager();
    }
  }
};
```

### 4.2 Custom Slash Commands

Load and execute custom slash commands:

```javascript
class SlashCommandManager {
  constructor() {
    this.projectCommands = {};
    this.personalCommands = {};
    this.pluginCommands = {};
    this.mcpCommands = {};
  }

  async loadCommands() {
    // Load from .claude/commands/
    this.projectCommands = await this.loadFromDirectory(
      '.claude/commands'
    );

    // Load from ~/.claude/commands/
    this.personalCommands = await this.loadFromDirectory(
      '~/.claude/commands'
    );

    // Load from plugins
    this.pluginCommands = await this.loadPluginCommands();

    // Load from MCP servers
    this.mcpCommands = await this.loadMCPCommands();
  }

  async loadFromDirectory(dir) {
    const files = await fs.readdir(dir, { recursive: true });
    const commands = {};

    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        const command = this.parseCommandFile(content, file);
        commands[command.name] = command;
      }
    }

    return commands;
  }

  parseCommandFile(content, filename) {
    const frontmatter = this.extractFrontmatter(content);
    const prompt = this.extractPrompt(content);

    return {
      name: path.basename(filename, '.md'),
      description: frontmatter.description || '',
      argumentHint: frontmatter['argument-hint'] || '',
      allowedTools: frontmatter['allowed-tools'] || [],
      model: frontmatter.model,
      disableModelInvocation: frontmatter['disable-model-invocation'],
      prompt,
      execute: (args) => this.executeCommand(prompt, args, frontmatter)
    };
  }

  extractFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      return yaml.parse(match[1]);
    }
    return {};
  }

  extractPrompt(content) {
    // Remove frontmatter if present
    return content.replace(/^---\n[\s\S]*?\n---\n/, '');
  }

  async executeCommand(prompt, args, config) {
    // Replace $ARGUMENTS placeholder
    let expandedPrompt = prompt.replace('$ARGUMENTS', args);

    // Replace $1, $2, $3 placeholders
    const argArray = args.split(' ');
    argArray.forEach((arg, i) => {
      expandedPrompt = expandedPrompt.replace(`$${i + 1}`, arg);
    });

    // Execute bash prefix if present (!)
    if (config.bashPrefix) {
      await executeBashCommand(config.bashPrefix);
    }

    // Send to Claude with allowed tools
    return await sendToClaude(expandedPrompt, {
      allowedTools: config.allowedTools,
      model: config.model
    });
  }

  getAllCommands() {
    return {
      ...this.projectCommands,
      ...this.personalCommands,
      ...this.pluginCommands,
      ...this.mcpCommands
    };
  }

  getCommandSuggestions(query) {
    const allCommands = this.getAllCommands();
    return Object.entries(allCommands)
      .filter(([name, cmd]) => name.includes(query))
      .map(([name, cmd]) => ({
        name: `/${name}`,
        description: cmd.description,
        argumentHint: cmd.argumentHint
      }));
  }
}
```

### 4.3 SlashCommand Tool Integration

Allow Claude to programmatically invoke commands:

```javascript
class SlashCommandTool {
  constructor(commandManager) {
    this.commandManager = commandManager;
    this.charBudget = 15000; // Default budget
  }

  async canInvoke(commandName) {
    const command = this.commandManager.getAllCommands()[commandName];

    if (!command) return false;
    if (command.disableModelInvocation) return false;
    if (!command.description) return false;

    return true;
  }

  async execute(commandName, args) {
    if (!await this.canInvoke(commandName)) {
      throw new Error(`Command ${commandName} cannot be auto-invoked`);
    }

    const command = this.commandManager.getAllCommands()[commandName];

    // Add to message history showing expansion
    addSystemMessage(
      `<command-message>The "${commandName}" command is loading</command-message>`
    );

    return await command.execute(args);
  }

  getToolDescription() {
    const commands = this.commandManager.getAllCommands();
    const descriptions = Object.entries(commands)
      .filter(([name, cmd]) => cmd.description && !cmd.disableModelInvocation)
      .map(([name, cmd]) => `/${name}: ${cmd.description}`)
      .join('\n');

    // Truncate if exceeds budget
    return descriptions.slice(0, this.charBudget);
  }
}
```

---

## 5. Hooks System

### 5.1 Hook Event Types

Implement all hook events:

```javascript
class HooksManager {
  constructor() {
    this.hooks = {
      PreToolUse: [],
      PostToolUse: [],
      UserPromptSubmit: [],
      Notification: [],
      Stop: [],
      SubagentStop: [],
      PreCompact: [],
      SessionStart: [],
      SessionEnd: []
    };
  }

  loadFromSettings(settings) {
    // Load hooks from settings.json
    Object.entries(settings.hooks || {}).forEach(([event, matchers]) => {
      matchers.forEach(matcher => {
        this.registerHook(event, matcher.matcher, matcher.hooks);
      });
    });
  }

  registerHook(event, matcher, hooks) {
    this.hooks[event].push({
      matcher,
      hooks
    });
  }

  async triggerPreToolUse(toolName, toolInput, sessionData) {
    const hookData = {
      tool_name: toolName,
      tool_input: toolInput,
      session_id: sessionData.id,
      timestamp: new Date().toISOString()
    };

    return await this.executeHooks('PreToolUse', toolName, hookData);
  }

  async triggerPostToolUse(toolName, toolInput, toolOutput, sessionData) {
    const hookData = {
      tool_name: toolName,
      tool_input: toolInput,
      tool_output: toolOutput,
      session_id: sessionData.id,
      timestamp: new Date().toISOString()
    };

    return await this.executeHooks('PostToolUse', toolName, hookData);
  }

  async executeHooks(event, matcher, data) {
    const applicableHooks = this.hooks[event].filter(h =>
      this.matcherMatches(h.matcher, matcher)
    );

    for (const hook of applicableHooks) {
      for (const hookCmd of hook.hooks) {
        const result = await this.executeHook(hookCmd, data);

        // Exit code 2 blocks tool call
        if (result.exitCode === 2) {
          return {
            blocked: true,
            message: result.stderr
          };
        }

        // Exit code 1 shows message but allows continuation
        if (result.exitCode === 1) {
          showHookMessage(result.stderr);
        }
      }
    }

    return { blocked: false };
  }

  async executeHook(hookCmd, data) {
    if (hookCmd.type === 'command') {
      // Execute shell command with data piped to stdin
      return await executeShellCommand(hookCmd.command, {
        stdin: JSON.stringify(data),
        env: {
          ...process.env,
          CLAUDE_PROJECT_DIR: getCurrentProjectDir()
        }
      });
    }
  }

  matcherMatches(pattern, value) {
    if (pattern === '') return true; // Empty matches all
    if (pattern.includes('*')) {
      // Convert to regex
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(value);
    }
    return pattern === value;
  }
}
```

### 5.2 Hook Implementation Examples

**Example: Pre-Tool-Use Hook for Security**
```javascript
// Implement equivalent of pre_tool_use.py
class SecurityHook {
  async validate(toolData) {
    const { tool_name, tool_input } = toolData;

    // Block .env file access
    if (this.isEnvFileAccess(tool_name, tool_input)) {
      return {
        blocked: true,
        message: 'BLOCKED: Access to .env files is prohibited'
      };
    }

    // Block dangerous rm commands
    if (tool_name === 'Bash') {
      if (this.isDangerousRmCommand(tool_input.command)) {
        return {
          blocked: true,
          message: 'BLOCKED: Dangerous rm command detected'
        };
      }
    }

    return { blocked: false };
  }

  isEnvFileAccess(toolName, toolInput) {
    const fileTools = ['Read', 'Edit', 'Write'];
    if (fileTools.includes(toolName)) {
      const filePath = toolInput.file_path || '';
      return filePath.includes('.env') && !filePath.endsWith('.env.sample');
    }
    return false;
  }

  isDangerousRmCommand(command) {
    const patterns = [
      /\brm\s+.*-[a-z]*r[a-z]*f/i,
      /\brm\s+.*-[a-z]*f[a-z]*r/i,
      /\brm\s+--recursive\s+--force/i
    ];

    return patterns.some(pattern => pattern.test(command));
  }
}
```

---

## 6. Permission System

### 6.1 Permission Modes

Implement three permission modes:

```javascript
class PermissionManager {
  constructor() {
    this.mode = 'STANDARD'; // STANDARD, AUTO_ACCEPT, PLAN
    this.allowList = [];
    this.denyList = [];
  }

  loadFromSettings(settings) {
    this.allowList = settings.permissions?.allow || [];
    this.denyList = settings.permissions?.deny || [];
  }

  async checkPermission(toolName, toolInput) {
    // AUTO_ACCEPT mode - allow all
    if (this.mode === 'AUTO_ACCEPT') {
      return { granted: true };
    }

    // PLAN mode - block all executions
    if (this.mode === 'PLAN') {
      return {
        granted: false,
        reason: 'Plan mode active - no tools executed'
      };
    }

    // Check deny list first
    if (this.isDenied(toolName, toolInput)) {
      return {
        granted: false,
        reason: 'Tool denied by settings'
      };
    }

    // Check allow list
    if (this.isAllowed(toolName, toolInput)) {
      return { granted: true };
    }

    // Prompt user
    return await this.promptUser(toolName, toolInput);
  }

  isAllowed(toolName, toolInput) {
    return this.allowList.some(pattern =>
      this.matchesPattern(pattern, toolName, toolInput)
    );
  }

  isDenied(toolName, toolInput) {
    return this.denyList.some(pattern =>
      this.matchesPattern(pattern, toolName, toolInput)
    );
  }

  matchesPattern(pattern, toolName, toolInput) {
    // Pattern format: "ToolName(arg:*)" or "ToolName"
    const match = pattern.match(/^(\w+)(?:\(([^:]+):(.+)\))?$/);
    if (!match) return false;

    const [, patternTool, paramName, paramValue] = match;

    // Check tool name
    if (patternTool !== toolName && patternTool !== '*') {
      return false;
    }

    // If no parameters specified, match any
    if (!paramName) return true;

    // Check parameter value
    const actualValue = toolInput[paramName];
    if (paramValue === '*') return true;
    if (paramValue.endsWith('*')) {
      return actualValue.startsWith(paramValue.slice(0, -1));
    }

    return actualValue === paramValue;
  }

  async promptUser(toolName, toolInput) {
    return new Promise((resolve) => {
      showPermissionDialog({
        tool: toolName,
        input: toolInput,
        onApprove: (remember) => {
          if (remember) {
            this.allowList.push(this.createPattern(toolName, toolInput));
          }
          resolve({ granted: true });
        },
        onDeny: (remember) => {
          if (remember) {
            this.denyList.push(this.createPattern(toolName, toolInput));
          }
          resolve({ granted: false });
        }
      });
    });
  }

  cycleMode() {
    const modes = ['STANDARD', 'AUTO_ACCEPT', 'PLAN'];
    const currentIndex = modes.indexOf(this.mode);
    this.mode = modes[(currentIndex + 1) % modes.length];

    showNotification(`Permission mode: ${this.mode}`);
    return this.mode;
  }
}
```

### 6.2 Permission UI

Design a permission prompt modal:

```javascript
const PermissionDialog = ({ tool, input, onApprove, onDeny }) => {
  const [remember, setRemember] = useState(false);

  return (
    <Modal>
      <ModalHeader>
        Tool Permission Required
      </ModalHeader>

      <ModalBody>
        <ToolName>{tool}</ToolName>

        <InputPreview>
          {formatToolInput(input)}
        </InputPreview>

        <Checkbox
          checked={remember}
          onChange={setRemember}
          label="Remember this decision"
        />
      </ModalBody>

      <ModalFooter>
        <Button
          variant="danger"
          onClick={() => onDeny(remember)}
        >
          Deny
        </Button>

        <Button
          variant="primary"
          onClick={() => onApprove(remember)}
        >
          Approve
        </Button>
      </ModalFooter>
    </Modal>
  );
};
```

---

## 7. Session Management

### 7.1 Session State

Track conversation state:

```javascript
class SessionManager {
  constructor() {
    this.currentSession = null;
    this.sessions = [];
  }

  async createSession(options = {}) {
    const session = {
      id: generateId(),
      startTime: new Date(),
      model: options.model || 'claude-sonnet-4-5',
      messages: [],
      context: {
        workingDirectory: process.cwd(),
        additionalDirectories: options.addDir || [],
        files: []
      },
      settings: await loadSettings(),
      metadata: {
        tokens: 0,
        cost: 0,
        turns: 0
      }
    };

    this.currentSession = session;
    this.sessions.push(session);

    // Trigger SessionStart hooks
    await hooksManager.executeHooks('SessionStart', '', session);

    return session;
  }

  async resumeSession(sessionId) {
    const session = await loadSessionFromStorage(sessionId);
    this.currentSession = session;

    // Trigger SessionStart hooks
    await hooksManager.executeHooks('SessionStart', '', session);

    return session;
  }

  async continueLatest() {
    const latestSession = await getLatestSession();
    return this.resumeSession(latestSession.id);
  }

  async addMessage(message) {
    this.currentSession.messages.push(message);
    await this.saveSession();
  }

  async saveSession() {
    await saveSessionToStorage(this.currentSession);
  }

  async exportSession(format = 'markdown') {
    if (format === 'markdown') {
      return this.exportAsMarkdown();
    } else if (format === 'json') {
      return JSON.stringify(this.currentSession, null, 2);
    }
  }

  exportAsMarkdown() {
    const lines = [];

    lines.push(`# Session ${this.currentSession.id}`);
    lines.push(`Started: ${this.currentSession.startTime}`);
    lines.push(`Model: ${this.currentSession.model}`);
    lines.push('');

    this.currentSession.messages.forEach(msg => {
      lines.push(`## ${msg.type === 'user' ? 'User' : 'Assistant'}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');

      if (msg.metadata?.toolUses) {
        lines.push('### Tool Uses');
        msg.metadata.toolUses.forEach(tool => {
          lines.push(`- **${tool.name}**`);
          lines.push(`  \`\`\`json`);
          lines.push(`  ${JSON.stringify(tool.input, null, 2)}`);
          lines.push(`  \`\`\``);
        });
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  async endSession() {
    // Trigger SessionEnd hooks
    await hooksManager.executeHooks('SessionEnd', '', this.currentSession);

    await this.saveSession();
    this.currentSession = null;
  }
}
```

### 7.2 Context Management

Track token usage and context:

```javascript
class ContextManager {
  constructor(session) {
    this.session = session;
    this.tokenLimit = 200000; // Model-dependent
  }

  calculateTokens(message) {
    // Approximate token counting
    // For accurate counting, use tiktoken or similar
    return Math.ceil(message.length / 4);
  }

  getTotalTokens() {
    return this.session.messages.reduce((total, msg) => {
      return total + this.calculateTokens(msg.content);
    }, 0);
  }

  getRemainingTokens() {
    return this.tokenLimit - this.getTotalTokens();
  }

  getContextVisualization() {
    const used = this.getTotalTokens();
    const percentage = (used / this.tokenLimit) * 100;

    return {
      used,
      total: this.tokenLimit,
      remaining: this.tokenLimit - used,
      percentage,
      visualization: this.renderBar(percentage)
    };
  }

  renderBar(percentage) {
    const width = 50;
    const filled = Math.floor(width * percentage / 100);
    const empty = width - filled;

    return `[${'█'.repeat(filled)}${' '.repeat(empty)}] ${percentage.toFixed(1)}%`;
  }

  async compact(focus) {
    // Implement conversation compaction
    // Keep important messages, summarize others
    const compacted = await compactMessages(
      this.session.messages,
      focus
    );

    this.session.messages = compacted;
    await this.session.save();
  }
}
```

---

## 8. Real-time Features

### 8.1 Streaming Responses

Implement streaming for immediate feedback:

```javascript
class StreamingManager {
  constructor() {
    this.activeStreams = new Map();
  }

  async streamResponse(prompt, options) {
    const streamId = generateId();
    const stream = await claudeAPI.streamMessage({
      messages: options.messages,
      model: options.model,
      stream: true
    });

    this.activeStreams.set(streamId, {
      stream,
      onText: options.onText,
      onToolUse: options.onToolUse,
      onComplete: options.onComplete
    });

    await this.processStream(streamId, stream);

    return streamId;
  }

  async processStream(streamId, stream) {
    const handler = this.activeStreams.get(streamId);
    let textBuffer = '';
    let thinkingBuffer = '';
    let currentToolUse = null;

    for await (const chunk of stream) {
      switch (chunk.type) {
        case 'content_block_start':
          if (chunk.content_block.type === 'text') {
            // Start of text block
          } else if (chunk.content_block.type === 'thinking') {
            // Start of thinking block
          } else if (chunk.content_block.type === 'tool_use') {
            currentToolUse = {
              id: chunk.content_block.id,
              name: chunk.content_block.name,
              input: ''
            };
          }
          break;

        case 'content_block_delta':
          if (chunk.delta.type === 'text_delta') {
            textBuffer += chunk.delta.text;
            handler.onText?.(chunk.delta.text);
          } else if (chunk.delta.type === 'thinking_delta') {
            thinkingBuffer += chunk.delta.thinking;
          } else if (chunk.delta.type === 'input_json_delta') {
            currentToolUse.input += chunk.delta.partial_json;
          }
          break;

        case 'content_block_stop':
          if (currentToolUse) {
            currentToolUse.input = JSON.parse(currentToolUse.input);
            handler.onToolUse?.(currentToolUse);
            currentToolUse = null;
          }
          break;

        case 'message_stop':
          handler.onComplete?.({
            text: textBuffer,
            thinking: thinkingBuffer
          });
          this.activeStreams.delete(streamId);
          break;
      }
    }
  }

  cancelStream(streamId) {
    const handler = this.activeStreams.get(streamId);
    if (handler) {
      handler.stream.abort();
      this.activeStreams.delete(streamId);
    }
  }
}
```

### 8.2 Background Tasks

Support long-running operations:

```javascript
class BackgroundTaskManager {
  constructor() {
    this.tasks = new Map();
  }

  async runInBackground(command, options = {}) {
    const taskId = generateId();

    const task = {
      id: taskId,
      command,
      status: 'running',
      output: [],
      startTime: new Date(),
      process: null
    };

    this.tasks.set(taskId, task);

    // Execute command
    task.process = spawn(command, {
      shell: true,
      ...options
    });

    // Capture output
    task.process.stdout.on('data', (data) => {
      task.output.push({
        type: 'stdout',
        data: data.toString(),
        timestamp: new Date()
      });

      // Emit event for real-time updates
      this.emit('output', taskId, data.toString());
    });

    task.process.stderr.on('data', (data) => {
      task.output.push({
        type: 'stderr',
        data: data.toString(),
        timestamp: new Date()
      });

      this.emit('output', taskId, data.toString());
    });

    task.process.on('close', (code) => {
      task.status = code === 0 ? 'success' : 'failed';
      task.exitCode = code;
      task.endTime = new Date();

      this.emit('complete', taskId, task);
    });

    return taskId;
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  async killTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task && task.process) {
      task.process.kill();
      task.status = 'killed';
    }
  }

  listTasks() {
    return Array.from(this.tasks.values());
  }

  getRecentOutput(taskId, lines = 100) {
    const task = this.tasks.get(taskId);
    if (!task) return [];

    return task.output.slice(-lines);
  }
}
```

---

## 9. UI/UX Guidelines

### 9.1 Visual Design

**Color Scheme:**
```css
:root {
  /* Terminal colors */
  --color-bg-primary: #1e1e1e;
  --color-bg-secondary: #252526;
  --color-text-primary: #cccccc;
  --color-text-secondary: #808080;

  /* Syntax highlighting */
  --color-keyword: #569cd6;
  --color-string: #ce9178;
  --color-comment: #6a9955;
  --color-function: #dcdcaa;

  /* Status colors */
  --color-success: #4ec9b0;
  --color-error: #f48771;
  --color-warning: #dcdcaa;
  --color-info: #4fc1ff;

  /* Interactive elements */
  --color-button-primary: #0e639c;
  --color-button-hover: #1177bb;
  --color-border: #3e3e42;
}
```

**Typography:**
```css
body {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.message-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

code, pre {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}
```

### 9.2 Layout Structure

```jsx
const AppLayout = () => {
  return (
    <Container>
      <Header>
        <Logo />
        <SessionInfo />
        <ToolbarActions>
          <ModelSelector />
          <PermissionModeToggle />
          <SettingsButton />
        </ToolbarActions>
      </Header>

      <MainContent>
        <Sidebar>
          <SessionHistory />
          <FileTree />
        </Sidebar>

        <ChatArea>
          <MessageList>
            {messages.map(msg => (
              <Message key={msg.id} message={msg} />
            ))}
          </MessageList>

          <InputArea>
            <InputEditor />
            <SubmitButton />
          </InputArea>
        </ChatArea>

        <RightPanel>
          <Tabs>
            <Tab label="Tools">
              <ToolViewer />
            </Tab>
            <Tab label="Context">
              <ContextVisualization />
            </Tab>
            <Tab label="Background Tasks">
              <BackgroundTaskList />
            </Tab>
          </Tabs>
        </RightPanel>
      </MainContent>

      <StatusBar>
        <TokenUsage />
        <ModelIndicator />
        <ConnectionStatus />
      </StatusBar>
    </Container>
  );
};
```

### 9.3 Responsive Behavior

```css
/* Desktop layout */
@media (min-width: 1024px) {
  .main-content {
    display: grid;
    grid-template-columns: 250px 1fr 350px;
  }
}

/* Tablet layout */
@media (max-width: 1023px) {
  .main-content {
    display: grid;
    grid-template-columns: 1fr;
  }

  .sidebar, .right-panel {
    display: none; /* Show in modal/drawer */
  }
}

/* Mobile layout */
@media (max-width: 640px) {
  .input-area {
    flex-direction: column;
  }

  .toolbar-actions {
    overflow-x: auto;
  }
}
```

---

## 10. API Integration

### 10.1 Claude API Client

```javascript
class ClaudeAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.anthropic.com/v1';
    this.model = 'claude-sonnet-4-5-20250929';
  }

  async sendMessage(messages, options = {}) {
    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || this.model,
        messages,
        max_tokens: options.maxTokens || 8192,
        system: options.systemPrompt,
        tools: options.tools,
        stream: false
      })
    });

    return await response.json();
  }

  async *streamMessage(messages, options = {}) {
    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || this.model,
        messages,
        max_tokens: options.maxTokens || 8192,
        system: options.systemPrompt,
        tools: options.tools,
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          yield data;
        }
      }
    }
  }
}
```

### 10.2 Tool Definitions

Define tools for Claude to use:

```javascript
const tools = [
  {
    name: 'Read',
    description: 'Read a file from the filesystem',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'The absolute path to the file'
        },
        offset: {
          type: 'number',
          description: 'Line number to start reading from'
        },
        limit: {
          type: 'number',
          description: 'Number of lines to read'
        }
      },
      required: ['file_path']
    }
  },

  {
    name: 'Write',
    description: 'Write content to a file',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'The absolute path to the file'
        },
        content: {
          type: 'string',
          description: 'The content to write'
        }
      },
      required: ['file_path', 'content']
    }
  },

  {
    name: 'Edit',
    description: 'Edit a file by replacing text',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'The absolute path to the file'
        },
        old_string: {
          type: 'string',
          description: 'The text to replace'
        },
        new_string: {
          type: 'string',
          description: 'The replacement text'
        },
        replace_all: {
          type: 'boolean',
          description: 'Replace all occurrences'
        }
      },
      required: ['file_path', 'old_string', 'new_string']
    }
  },

  {
    name: 'Bash',
    description: 'Execute a bash command',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute'
        },
        description: {
          type: 'string',
          description: 'Description of what the command does'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds'
        },
        run_in_background: {
          type: 'boolean',
          description: 'Run command in background'
        }
      },
      required: ['command']
    }
  },

  {
    name: 'Glob',
    description: 'Find files matching a pattern',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to match'
        },
        path: {
          type: 'string',
          description: 'Directory to search in'
        }
      },
      required: ['pattern']
    }
  },

  {
    name: 'Grep',
    description: 'Search for text in files',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regular expression to search for'
        },
        path: {
          type: 'string',
          description: 'File or directory to search in'
        },
        output_mode: {
          type: 'string',
          enum: ['content', 'files_with_matches', 'count'],
          description: 'Output mode'
        },
        '-i': {
          type: 'boolean',
          description: 'Case insensitive search'
        }
      },
      required: ['pattern']
    }
  }
];
```

### 10.3 Tool Execution Handler

```javascript
class ToolExecutor {
  constructor() {
    this.handlers = {
      Read: this.handleRead,
      Write: this.handleWrite,
      Edit: this.handleEdit,
      Bash: this.handleBash,
      Glob: this.handleGlob,
      Grep: this.handleGrep
    };
  }

  async executeTool(toolUse) {
    const handler = this.handlers[toolUse.name];
    if (!handler) {
      throw new Error(`Unknown tool: ${toolUse.name}`);
    }

    // Check hooks
    const hookResult = await hooksManager.triggerPreToolUse(
      toolUse.name,
      toolUse.input,
      sessionManager.currentSession
    );

    if (hookResult.blocked) {
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        is_error: true,
        content: hookResult.message
      };
    }

    // Check permissions
    const permission = await permissionManager.checkPermission(
      toolUse.name,
      toolUse.input
    );

    if (!permission.granted) {
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        is_error: true,
        content: 'Permission denied'
      };
    }

    // Execute tool
    try {
      const result = await handler.call(this, toolUse.input);

      // Trigger post-hook
      await hooksManager.triggerPostToolUse(
        toolUse.name,
        toolUse.input,
        result,
        sessionManager.currentSession
      );

      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result
      };
    } catch (error) {
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        is_error: true,
        content: error.message
      };
    }
  }

  async handleRead(input) {
    const { file_path, offset, limit } = input;
    const content = await fs.readFile(file_path, 'utf-8');
    const lines = content.split('\n');

    const start = offset || 0;
    const end = limit ? start + limit : lines.length;
    const selectedLines = lines.slice(start, end);

    // Format with line numbers
    return selectedLines
      .map((line, i) => `${start + i + 1}\t${line}`)
      .join('\n');
  }

  async handleWrite(input) {
    const { file_path, content } = input;
    await fs.writeFile(file_path, content, 'utf-8');
    return `File written: ${file_path}`;
  }

  async handleEdit(input) {
    const { file_path, old_string, new_string, replace_all } = input;
    let content = await fs.readFile(file_path, 'utf-8');

    if (replace_all) {
      content = content.replaceAll(old_string, new_string);
    } else {
      content = content.replace(old_string, new_string);
    }

    await fs.writeFile(file_path, content, 'utf-8');
    return `File edited: ${file_path}`;
  }

  async handleBash(input) {
    const { command, timeout, run_in_background } = input;

    if (run_in_background) {
      const taskId = await backgroundTaskManager.runInBackground(command);
      return `Command running in background (ID: ${taskId})`;
    }

    return new Promise((resolve, reject) => {
      exec(command, { timeout }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async handleGlob(input) {
    const { pattern, path } = input;
    const results = await glob(pattern, {
      cwd: path || process.cwd()
    });
    return results.join('\n');
  }

  async handleGrep(input) {
    const { pattern, path, output_mode } = input;
    // Implement using ripgrep or similar
    // Return results based on output_mode
  }
}
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

Test individual components:

```javascript
describe('InputProcessor', () => {
  it('should detect slash commands', () => {
    const processor = new InputProcessor();
    const result = processor.process('/clear');

    expect(result.type).toBe('slash_command');
    expect(result.command).toBe('clear');
  });

  it('should parse command arguments', () => {
    const processor = new InputProcessor();
    const result = processor.process('/model opus');

    expect(result.command).toBe('model');
    expect(result.arguments).toBe('opus');
  });
});

describe('PermissionManager', () => {
  it('should respect allow list', () => {
    const manager = new PermissionManager();
    manager.allowList = ['Bash(npm:*)'];

    const result = manager.isAllowed('Bash', { command: 'npm install' });
    expect(result).toBe(true);
  });

  it('should block denied tools', () => {
    const manager = new PermissionManager();
    manager.denyList = ['Bash(rm -rf:*)'];

    const result = manager.isDenied('Bash', { command: 'rm -rf /' });
    expect(result).toBe(true);
  });
});
```

### 11.2 Integration Tests

Test component interactions:

```javascript
describe('Command Execution Flow', () => {
  it('should execute custom slash command', async () => {
    const commandManager = new SlashCommandManager();
    await commandManager.loadCommands();

    const result = await commandManager.executeCommand(
      'implement',
      'Add user authentication'
    );

    expect(result).toBeDefined();
  });

  it('should trigger hooks on tool execution', async () => {
    const hookFn = jest.fn();
    hooksManager.registerHook('PreToolUse', 'Bash', [{
      type: 'function',
      function: hookFn
    }]);

    await toolExecutor.executeTool({
      name: 'Bash',
      input: { command: 'echo test' }
    });

    expect(hookFn).toHaveBeenCalled();
  });
});
```

### 11.3 E2E Tests

Test complete workflows:

```javascript
describe('End-to-End Workflows', () => {
  it('should complete a code review workflow', async () => {
    // Start session
    await sessionManager.createSession();

    // Submit review request
    await submitMessage('/review');

    // Wait for response
    const response = await waitForResponse();

    expect(response).toContain('code review');
  });

  it('should handle permission prompts', async () => {
    // Set to standard mode
    permissionManager.mode = 'STANDARD';

    // Submit bash command
    submitMessage('!rm file.txt');

    // Check for permission dialog
    expect(isPermissionDialogVisible()).toBe(true);

    // Approve
    clickApprove();

    // Wait for execution
    await waitForCompletion();
  });
});
```

---

## 12. Deployment Considerations

### 12.1 Desktop App (Electron)

Package as a desktop application:

```javascript
// main.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

### 12.2 Web App

Deploy as a web application with backend:

```javascript
// server.js
const express = require('express');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// API endpoints
app.post('/api/message', async (req, res) => {
  const { message, sessionId } = req.body;
  // Handle message
});

// WebSocket for real-time updates
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // Handle WebSocket message
  });
});

server.listen(3000);
```

### 12.3 Security Considerations

- Never store API keys in frontend code
- Use environment variables or secure key storage
- Implement rate limiting
- Sanitize all file paths to prevent directory traversal
- Validate and escape all bash commands
- Use HTTPS for web deployments
- Implement authentication for multi-user scenarios

---

## 13. Summary and Next Steps

### Implementation Checklist

- [ ] Set up project structure and dependencies
- [ ] Implement input editor with autocomplete
- [ ] Create chat display with markdown rendering
- [ ] Build command system (built-in + custom)
- [ ] Implement hooks system
- [ ] Add permission management
- [ ] Create session management
- [ ] Integrate Claude API
- [ ] Add tool execution handlers
- [ ] Implement streaming responses
- [ ] Build background task support
- [ ] Create settings UI
- [ ] Add keyboard shortcuts
- [ ] Implement vim mode (optional)
- [ ] Write tests
- [ ] Package for deployment

### Resources

- Claude API Documentation: https://docs.anthropic.com
- Claude Code Documentation: https://code.claude.com/docs
- Monaco Editor: https://microsoft.github.io/monaco-editor/
- xterm.js: https://xtermjs.org/
- React/Vue/Svelte Documentation

### Support

For questions or issues:
- Open an issue on your project repository
- Consult Claude Code documentation
- Review example implementations in this guide

---

*This document provides a comprehensive foundation for implementing a Claude Code UI. Adapt and extend these patterns based on your specific requirements and constraints.*
