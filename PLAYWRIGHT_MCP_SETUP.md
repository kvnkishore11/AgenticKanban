# Playwright MCP Server Setup & Troubleshooting Guide

> **Last Updated:** 2025-11-23
> **Project:** AgenticKanban
> **Issue:** Playwright MCP server failing to connect

---

## 📋 Table of Contents

- [Problem Description](#problem-description)
- [Root Cause Analysis](#root-cause-analysis)
- [Changes Made](#changes-made)
- [How to Verify the Fix](#how-to-verify-the-fix)
- [Configuration Files](#configuration-files)
- [Common Issues & Solutions](#common-issues--solutions)
- [Using Playwright MCP Tools](#using-playwright-mcp-tools)

---

## 🔍 Problem Description

The Playwright MCP server was showing **Status: ✗ failed** when running `/mcp` command in Claude Code.

**Error Screenshot:**
```
Status: ✗ failed
Command: npx @playwright/mcp@latest --isolated --config /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/playwright-mcp-config.json
Config location: /Users/kvnkishore/.claude.json [project: /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban]
```

**Why it failed:**
- The config file path didn't exist: `playwright-mcp-config.json`
- The `--isolated` flag was causing issues
- Cached configuration in `~/.claude.json` was overriding `.mcp.json`

---

## 🎯 Root Cause Analysis

### Issue 1: Missing Package
The `@playwright/mcp` npm package was not installed globally.

### Issue 2: Incorrect .mcp.json Configuration
The `.mcp.json` file had references to a non-existent config file in a `trees/` directory.

**Original `.mcp.json`:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--config",
        "/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/e4d75c88/playwright-mcp-config.json"
      ]
    }
  }
}
```

### Issue 3: Cached Configuration in ~/.claude.json
**This was the main culprit!** Claude Code caches MCP server configurations per-project in `~/.claude.json`. Even after fixing `.mcp.json`, the old cached configuration was still being used.

**Cached config in `~/.claude.json`:**
```json
"/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban": {
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx @playwright/mcp@latest --isolated --config /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/playwright-mcp-config.json",
      "args": [],
      "env": {}
    }
  }
}
```

---

## 🔧 Changes Made

### 1. Installed @playwright/mcp Package

```bash
npm install -g @playwright/mcp
```

**Result:**
- Package installed: `@playwright/mcp@0.0.48`
- Binary available: `mcp-server-playwright`

### 2. Simplified .mcp.json Configuration

**File:** `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/.mcp.json`

**Before:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--config",
        "/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/e4d75c88/playwright-mcp-config.json"
      ]
    }
  }
}
```

**After:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

**Changes:**
- ✅ Removed `--isolated` flag
- ✅ Removed `--config` parameter and non-existent config file path
- ✅ Simplified to basic npx command

### 3. Enabled MCP Servers in Global Settings

**File:** `~/.claude/settings.json`

**Added:**
```json
{
  ...,
  "enableAllProjectMcpServers": true
}
```

**Purpose:** Auto-approve all MCP servers defined in project `.mcp.json` files.

### 4. Removed Cached Configuration from ~/.claude.json

**Critical Fix!** Removed the cached MCP server configuration for this project.

**Script used:**
```javascript
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME, '.claude.json');
const projectPath = '/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban';

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (config.projects && config.projects[projectPath]) {
  if (config.projects[projectPath].mcpServers) {
    delete config.projects[projectPath].mcpServers;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Successfully removed cached MCP configuration');
  }
}
```

**Result:** The project now reads MCP configuration from `.mcp.json` instead of the cached version.

---

## ✅ How to Verify the Fix

### Step 1: Check Installed Package
```bash
npm list -g @playwright/mcp
```

**Expected output:**
```
/Users/kvnkishore/.nvm/versions/node/v20.19.5/lib
└── @playwright/mcp@0.0.48
```

### Step 2: Verify .mcp.json
```bash
cat .mcp.json
```

**Expected output:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

### Step 3: Verify Global Settings
```bash
cat ~/.claude/settings.json | grep enableAllProjectMcpServers
```

**Expected output:**
```json
"enableAllProjectMcpServers": true
```

### Step 4: Verify No Cached Config
```bash
cat ~/.claude.json | grep -A 10 "AgenticKanban" | grep mcpServers
```

**Expected output:** (empty - no mcpServers in the project config)

### Step 5: Restart Claude Code and Test
1. Exit current Claude Code session
2. Start new session: `claude-code`
3. Run: `/mcp`
4. Check status: Should show **Status: ✓ connected**

---

## 📁 Configuration Files

### Project Configuration: `.mcp.json`
**Location:** `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/.mcp.json`

**Purpose:** Defines MCP servers available for this project

**Current configuration:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

### Global Settings: `settings.json`
**Location:** `~/.claude/settings.json`

**Purpose:** Global Claude Code settings

**Relevant settings:**
```json
{
  "enableAllProjectMcpServers": true
}
```

### Per-Project Cache: `~/.claude.json`
**Location:** `~/.claude.json`

**Purpose:** Caches project-specific settings including MCP servers

**⚠️ Important:** This file can override `.mcp.json` if it contains `mcpServers` for your project path. Always check this file when MCP servers aren't working as expected.

---

## 🚨 Common Issues & Solutions

### Issue 1: MCP Server Shows "Failed" Status

**Symptoms:**
- `/mcp` command shows red ✗ failed status
- Error mentions missing config file or invalid command

**Solution:**
1. Check `~/.claude.json` for cached configuration:
   ```bash
   cat ~/.claude.json | jq '.projects["'$(pwd)'"].mcpServers'
   ```

2. If cached config exists, remove it:
   ```javascript
   // Create fix-mcp-cache.cjs
   const fs = require('fs');
   const configPath = require('path').join(process.env.HOME, '.claude.json');
   const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
   const projectPath = process.cwd();

   if (config.projects[projectPath]?.mcpServers) {
     delete config.projects[projectPath].mcpServers;
     fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
   }
   ```

   ```bash
   node fix-mcp-cache.cjs
   ```

3. Restart Claude Code

### Issue 2: MCP Tools Not Available in Session

**Symptoms:**
- No `mcp__playwright__*` tools available
- Can't use browser automation features

**Solution:**
- MCP servers load when Claude Code starts
- You must **exit and restart** Claude Code after any MCP configuration changes
- The tools won't appear mid-session

### Issue 3: Package Not Found Error

**Symptoms:**
```
npm error 404 Not Found - GET https://registry.npmjs.org/@modelcontextprotocol%2fserver-playwright
```

**Solution:**
- The correct package is `@playwright/mcp` (not `@modelcontextprotocol/server-playwright`)
- Install with: `npm install -g @playwright/mcp`

### Issue 4: Config File Path Errors

**Symptoms:**
- Error about missing `playwright-mcp-config.json`
- Error about missing `trees/` directory

**Solution:**
- Remove `--config` parameter from `.mcp.json`
- Use simple configuration without config file
- Playwright MCP works fine without a custom config file

---

## 🎮 Using Playwright MCP Tools

Once the MCP server is connected, you'll have access to browser automation tools:

### Available Tools (all prefixed with `mcp__playwright__`)

#### Navigation
- `mcp__playwright__browser_navigate` - Navigate to a URL
- `mcp__playwright__browser_navigate_back` - Go back to previous page

#### Interaction
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type text into fields
- `mcp__playwright__browser_fill_form` - Fill multiple form fields
- `mcp__playwright__browser_press_key` - Press keyboard keys

#### Information Gathering
- `mcp__playwright__browser_snapshot` - Capture accessibility snapshot
- `mcp__playwright__browser_take_screenshot` - Take screenshots
- `mcp__playwright__browser_console_messages` - Get console logs
- `mcp__playwright__browser_network_requests` - Get network activity

#### Advanced
- `mcp__playwright__browser_evaluate` - Run JavaScript in page context
- `mcp__playwright__browser_run_code` - Run Playwright code snippets
- `mcp__playwright__browser_wait_for` - Wait for conditions

### Example: Connect to localhost:5173 and Check Console Logs

```javascript
// 1. Navigate to localhost
mcp__playwright__browser_navigate({
  url: "http://localhost:5173"
})

// 2. Wait for page to load
mcp__playwright__browser_wait_for({
  time: 2
})

// 3. Get console logs
mcp__playwright__browser_console_messages({
  onlyErrors: false
})

// 4. Take screenshot
mcp__playwright__browser_take_screenshot({
  filename: "localhost-5173.png"
})
```

### Example Task Request
> "Navigate to localhost:5173, wait for it to load, and show me all console logs including errors and warnings"

Claude Code will automatically use the Playwright MCP tools to:
1. Launch a browser
2. Navigate to the URL
3. Capture console messages
4. Report back the findings

---

## 📚 Additional Resources

### Playwright MCP Documentation
- npm package: https://www.npmjs.com/package/@playwright/mcp
- Playwright docs: https://playwright.dev

### Claude Code MCP Configuration
- MCP servers are configured in `.mcp.json` (project-level)
- Global settings in `~/.claude/settings.json`
- Per-project cache in `~/.claude.json`

### Configuration Hierarchy
1. **Cached config in `~/.claude.json`** (highest priority - can override everything!)
2. **Project `.mcp.json`**
3. **Global settings `~/.claude/settings.json`**

**⚠️ Always check `~/.claude.json` first when troubleshooting MCP issues!**

---

## 🔄 Quick Reference: Fixing MCP Issues

```bash
# 1. Check if package is installed
npm list -g @playwright/mcp

# 2. Install if missing
npm install -g @playwright/mcp

# 3. Check project .mcp.json
cat .mcp.json

# 4. Check for cached config (THIS IS KEY!)
cat ~/.claude.json | jq '.projects["'$(pwd)'"].mcpServers'

# 5. Remove cached config if it exists
# Use the Node.js script from "Issue 1" above

# 6. Verify global settings
cat ~/.claude/settings.json | grep enableAllProjectMcpServers

# 7. Restart Claude Code
exit
claude-code

# 8. Test MCP status
/mcp
```

---

## 📝 Lessons Learned

1. **Cache is King:** `~/.claude.json` can override `.mcp.json` - always check it first
2. **Session Restart Required:** MCP changes require restarting Claude Code
3. **Simple is Better:** Playwright MCP doesn't need a config file for basic usage
4. **Correct Package Name:** It's `@playwright/mcp`, not `@modelcontextprotocol/server-playwright`
5. **Global Enable:** Set `enableAllProjectMcpServers: true` for convenience

---

**End of Documentation**

*This guide was created on 2025-11-23 to document the resolution of Playwright MCP server connection issues in the AgenticKanban project.*
