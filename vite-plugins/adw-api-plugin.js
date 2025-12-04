/**
 * Vite Plugin for ADW API Endpoints
 *
 * This plugin adds API endpoints directly to the Vite dev server, allowing
 * the frontend to open ADW worktrees and codebases without requiring the
 * FastAPI backend to be running.
 *
 * Each worktree gets its own tmux session named after the branch, with two windows:
 * - logs: Split panes running frontend and backend scripts
 * - code: Neovim for code editing
 *
 * Endpoints:
 * - POST /api/worktree/open/:adw_id - Opens terminal with logs window
 * - POST /api/codebase/open/:adw_id - Opens neovim in code window
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Get the project root directory.
 */
function getProjectRoot() {
  return process.cwd();
}

/**
 * Get the agents directory path.
 * Handles both main project and worktree environments.
 */
function getAgentsDirectory() {
  const projectRoot = getProjectRoot();

  if (projectRoot.includes('/trees/')) {
    const treesIndex = projectRoot.indexOf('/trees/');
    const mainProjectRoot = projectRoot.substring(0, treesIndex);
    return join(mainProjectRoot, 'agents');
  }

  return join(projectRoot, 'agents');
}

/**
 * Read and parse the ADW state file for a given ADW ID.
 */
function readAdwState(adwId) {
  const agentsDir = getAgentsDirectory();
  const statePath = join(agentsDir, adwId, 'adw_state.json');

  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const content = readFileSync(statePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[ADW Plugin] Error reading ADW state for ${adwId}:`, error.message);
    return null;
  }
}

/**
 * Run a shell command and return [returncode, stdout, stderr].
 */
function runCommand(cmd, options = {}) {
  try {
    const result = execSync(cmd.join(' '), {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: options.timeout || 30000,
      ...options
    });
    return [0, result.trim(), ''];
  } catch (error) {
    if (error.status !== undefined) {
      return [error.status, error.stdout?.trim() || '', error.stderr?.trim() || ''];
    }
    return [-1, '', error.message];
  }
}

/**
 * Get the git branch name for a worktree.
 */
function getBranchName(worktreePath) {
  const [returncode, stdout] = runCommand(
    ['git', '-C', `"${worktreePath}"`, 'branch', '--show-current']
  );
  return returncode === 0 && stdout ? stdout : null;
}

/**
 * Sanitize branch name for use as tmux session name.
 * Replaces periods, colons, and slashes with dashes.
 */
function sanitizeSessionName(branchName) {
  return branchName
    .replace(/\./g, '-')
    .replace(/:/g, '-')
    .replace(/\//g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a tmux session exists.
 */
function sessionExists(sessionName) {
  const [returncode] = runCommand(['tmux', 'has-session', '-t', sessionName]);
  return returncode === 0;
}

/**
 * Check if a tmux window exists in the session.
 */
function windowExists(sessionName, windowName) {
  const [returncode, stdout] = runCommand(
    ['tmux', 'list-windows', '-t', sessionName, '-F', '"#{window_name}"']
  );
  if (returncode !== 0) return false;
  return stdout.split('\n').some(w => w.replace(/"/g, '') === windowName);
}

/**
 * Create a new tmux session with the first window.
 */
function createSession(sessionName, worktreePath, windowName) {
  const [returncode, , stderr] = runCommand([
    'tmux', 'new-session', '-d',
    '-s', sessionName,
    '-n', windowName,
    '-c', `"${worktreePath}"`
  ]);
  return [returncode === 0, stderr];
}

/**
 * Create a new window in an existing session.
 */
function createWindow(sessionName, windowName, worktreePath) {
  const [returncode, , stderr] = runCommand([
    'tmux', 'new-window',
    '-t', sessionName,
    '-n', windowName,
    '-c', `"${worktreePath}"`
  ]);
  return [returncode === 0, stderr];
}

/**
 * Select/switch to a window in the session.
 */
function selectWindow(sessionName, windowName) {
  const [returncode, , stderr] = runCommand([
    'tmux', 'select-window', '-t', `"${sessionName}:${windowName}"`
  ]);
  return [returncode === 0, stderr];
}

/**
 * Send keys to a tmux pane.
 */
function sendKeys(target, keys) {
  const [returncode, , stderr] = runCommand([
    'tmux', 'send-keys', '-t', `"${target}"`, `"${keys}"`, 'Enter'
  ]);
  return [returncode === 0, stderr];
}

/**
 * Split the window horizontally (side by side panes).
 */
function splitHorizontal(windowTarget, worktreePath) {
  const [returncode, , stderr] = runCommand([
    'tmux', 'split-window', '-h',
    '-t', `"${windowTarget}"`,
    '-c', `"${worktreePath}"`
  ]);
  return [returncode === 0, stderr];
}

/**
 * Setup the logs window with split panes and scripts.
 */
function setupLogsWindow(sessionName, windowName, worktreePath, runScripts) {
  if (!runScripts) return;

  const windowTarget = `${sessionName}:${windowName}`;

  // Run frontend script in pane 0
  sendKeys(`${windowTarget}.0`, './scripts/start_fe.sh');

  // Split horizontally and run backend script in pane 1
  const [success] = splitHorizontal(windowTarget, worktreePath);
  if (success) {
    sendKeys(`${windowTarget}.1`, './scripts/start_adw.sh');
  }
}

/**
 * Open WezTerm and switch to the tmux session.
 */
function openWezTerm(sessionName) {
  // Try to switch existing client first
  const [switchSuccess] = runCommand(['tmux', 'switch-client', '-t', sessionName]);
  if (switchSuccess === 0) {
    runCommand(['open', '-a', 'WezTerm']);
    return [true, ''];
  }

  // Open new WezTerm with tmux attach
  let [returncode, , stderr] = runCommand([
    'open', '-a', 'WezTerm', '--args',
    'start', '--', 'tmux', 'attach-session', '-t', sessionName
  ]);

  if (returncode !== 0) {
    // Fallback: try wezterm CLI directly
    try {
      spawn('wezterm', ['start', '--', 'tmux', 'attach-session', '-t', sessionName], {
        detached: true,
        stdio: 'ignore'
      }).unref();
      return [true, ''];
    } catch (e) {
      stderr = e.message;
    }
  }

  return [returncode === 0, stderr];
}

/**
 * Send a JSON response.
 */
function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

/**
 * Send an error response.
 */
function sendError(res, status, detail) {
  sendJson(res, status, { detail, success: false });
}

/**
 * Handle opening a worktree - creates logs window with split panes.
 */
async function handleOpenWorktree(adwId, res) {
  try {
    // Validate ADW ID format (8 alphanumeric characters)
    if (!/^[a-zA-Z0-9]{8}$/.test(adwId)) {
      return sendError(res, 400, `Invalid ADW ID format: ${adwId}. Must be 8 alphanumeric characters.`);
    }

    const stateData = readAdwState(adwId);
    if (!stateData) {
      return sendError(res, 404, `ADW ID '${adwId}' not found or adw_state.json is missing`);
    }

    const worktreePath = stateData.worktree_path;
    if (!worktreePath) {
      return sendError(res, 404, `Worktree path not found for ADW ID '${adwId}'`);
    }

    if (!existsSync(worktreePath)) {
      return sendError(res, 404, `Worktree not found at path: ${worktreePath}`);
    }

    // Get branch name and create session name
    const branchName = getBranchName(worktreePath) || `adw-${adwId.substring(0, 8)}`;
    const sessionName = sanitizeSessionName(branchName);
    const windowName = 'logs';
    const frontendPort = stateData.frontend_port || 5173;

    console.log(`[ADW Plugin] Opening worktree for ADW ${adwId}`);
    console.log(`[ADW Plugin]   Session: ${sessionName}`);
    console.log(`[ADW Plugin]   Window: ${windowName}`);
    console.log(`[ADW Plugin]   Path: ${worktreePath}`);

    const sessExists = sessionExists(sessionName);
    const winExists = sessExists && windowExists(sessionName, windowName);

    if (winExists) {
      // Window exists, just switch to it
      console.log(`[ADW Plugin] Window ${windowName} exists, switching to it`);
      selectWindow(sessionName, windowName);
    } else if (sessExists) {
      // Session exists, add the window
      console.log(`[ADW Plugin] Adding ${windowName} to session ${sessionName}`);
      const [success, err] = createWindow(sessionName, windowName, worktreePath);
      if (!success) {
        return sendError(res, 500, `Failed to create logs window: ${err}`);
      }
      setupLogsWindow(sessionName, windowName, worktreePath, true);
    } else {
      // Create new session with the window
      console.log(`[ADW Plugin] Creating session ${sessionName}`);
      const [success, err] = createSession(sessionName, worktreePath, windowName);
      if (!success) {
        return sendError(res, 500, `Failed to create session: ${err}`);
      }
      setupLogsWindow(sessionName, windowName, worktreePath, true);
    }

    // Open WezTerm and attach to session
    const [weztermSuccess, weztermErr] = openWezTerm(sessionName);
    if (!weztermSuccess) {
      console.warn(`[ADW Plugin] WezTerm warning: ${weztermErr}`);
    }

    sendJson(res, 200, {
      success: true,
      adw_id: adwId,
      worktree_path: worktreePath,
      session_name: sessionName,
      window_name: windowName,
      branch_name: branchName,
      frontend_port: frontendPort,
      message: `Opened worktree in session '${sessionName}' window '${windowName}'`
    });

  } catch (error) {
    console.error(`[ADW Plugin] Error opening worktree for ${adwId}:`, error);
    sendError(res, 500, `Failed to open worktree: ${error.message}`);
  }
}

/**
 * Handle opening a codebase - creates code window with neovim.
 */
async function handleOpenCodebase(adwId, res) {
  try {
    // Validate ADW ID format (8 alphanumeric characters)
    if (!/^[a-zA-Z0-9]{8}$/.test(adwId)) {
      return sendError(res, 400, `Invalid ADW ID format: ${adwId}. Must be 8 alphanumeric characters.`);
    }

    const stateData = readAdwState(adwId);
    if (!stateData) {
      return sendError(res, 404, `ADW ID '${adwId}' not found or adw_state.json is missing`);
    }

    const worktreePath = stateData.worktree_path;
    if (!worktreePath) {
      return sendError(res, 404, `Worktree path not found for ADW ID '${adwId}'`);
    }

    if (!existsSync(worktreePath)) {
      return sendError(res, 404, `Worktree not found at path: ${worktreePath}`);
    }

    // Get branch name and create session name
    const branchName = getBranchName(worktreePath) || `adw-${adwId.substring(0, 8)}`;
    const sessionName = sanitizeSessionName(branchName);
    const windowName = 'code';

    console.log(`[ADW Plugin] Opening codebase for ADW ${adwId}`);
    console.log(`[ADW Plugin]   Session: ${sessionName}`);
    console.log(`[ADW Plugin]   Window: ${windowName}`);
    console.log(`[ADW Plugin]   Path: ${worktreePath}`);

    const sessExists = sessionExists(sessionName);
    const winExists = sessExists && windowExists(sessionName, windowName);

    if (winExists) {
      // Window exists, just switch to it
      console.log(`[ADW Plugin] Window ${windowName} exists, switching to it`);
      selectWindow(sessionName, windowName);
    } else if (sessExists) {
      // Session exists, add the window
      console.log(`[ADW Plugin] Adding ${windowName} to session ${sessionName}`);
      const [success, err] = createWindow(sessionName, windowName, worktreePath);
      if (!success) {
        return sendError(res, 500, `Failed to create code window: ${err}`);
      }
      sendKeys(`${sessionName}:${windowName}.0`, 'nvim .');
    } else {
      // Create new session with the window
      console.log(`[ADW Plugin] Creating session ${sessionName}`);
      const [success, err] = createSession(sessionName, worktreePath, windowName);
      if (!success) {
        return sendError(res, 500, `Failed to create session: ${err}`);
      }
      sendKeys(`${sessionName}:${windowName}.0`, 'nvim .');
    }

    // Open WezTerm and attach to session
    const [weztermSuccess, weztermErr] = openWezTerm(sessionName);
    if (!weztermSuccess) {
      console.warn(`[ADW Plugin] WezTerm warning: ${weztermErr}`);
    }

    sendJson(res, 200, {
      success: true,
      adw_id: adwId,
      worktree_path: worktreePath,
      session_name: sessionName,
      window_name: windowName,
      branch_name: branchName,
      message: `Opened codebase in session '${sessionName}' window '${windowName}'`
    });

  } catch (error) {
    console.error(`[ADW Plugin] Error opening codebase for ${adwId}:`, error);
    sendError(res, 500, `Failed to open codebase: ${error.message}`);
  }
}

/**
 * Vite plugin that adds ADW API endpoints to the dev server.
 */
export function adwApiPlugin() {
  return {
    name: 'adw-api-plugin',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        const worktreeMatch = req.url?.match(/^\/api\/worktree\/open\/([a-zA-Z0-9]{8})$/);
        const codebaseMatch = req.url?.match(/^\/api\/codebase\/open\/([a-zA-Z0-9]{8})$/);

        if (worktreeMatch) {
          console.log(`[ADW Plugin] Handling worktree open for ${worktreeMatch[1]}`);
          await handleOpenWorktree(worktreeMatch[1], res);
        } else if (codebaseMatch) {
          console.log(`[ADW Plugin] Handling codebase open for ${codebaseMatch[1]}`);
          await handleOpenCodebase(codebaseMatch[1], res);
        } else {
          next();
        }
      });

      console.log('[ADW Plugin] ADW API plugin initialized');
      console.log('[ADW Plugin] Registered endpoints:');
      console.log('[ADW Plugin]   POST /api/worktree/open/:adw_id');
      console.log('[ADW Plugin]   POST /api/codebase/open/:adw_id');
    }
  };
}
