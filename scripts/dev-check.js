#!/usr/bin/env node
/**
 * @fileoverview Dev Server Instance Protection Script
 * Checks for running dev server processes before starting new ones
 * Prevents multiple dev server instances that cause port conflicts and data inconsistency
 */

/* eslint-disable no-unused-vars */

import { execSync, spawn } from 'child_process';
import process from 'process';

const DEFAULT_PORTS = [5173, 5174, 5175, 5176];
const DEV_COMMAND = 'npm run dev:unsafe';

/**
 * Colors for console output
 */
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Logs a message with color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Logs an error message
 */
function logError(message) {
  log(`❌ ${message}`, colors.red);
}

/**
 * Logs a warning message
 */
function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

/**
 * Logs a success message
 */
function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

/**
 * Logs an info message
 */
function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

/**
 * Executes a command and returns the output
 */
function executeCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
    return output.trim();
  } catch (_error) {
    // Command failed or no results found
    return '';
  }
}

/**
 * Checks if a port is in use
 */
function isPortInUse(port) {
  try {
    const result = executeCommand(`lsof -ti:${port}`);
    return result.length > 0;
  } catch (_error) {
    return false;
  }
}

/**
 * Gets processes using a specific port
 */
function getProcessesOnPort(port) {
  try {
    const result = executeCommand(`lsof -i:${port}`);
    if (!result) return [];

    const lines = result.split('\n').slice(1); // Skip header
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        command: parts[0],
        pid: parts[1],
        user: parts[2],
        port: port
      };
    }).filter(proc => proc.pid && proc.pid !== 'PID');
  } catch (_error) {
    return [];
  }
}

/**
 * Finds all running dev server processes
 */
function findRunningDevServers() {
  const runningServers = [];

  // Check common dev server ports
  DEFAULT_PORTS.forEach(port => {
    const processes = getProcessesOnPort(port);
    processes.forEach(proc => {
      if (proc.command && (proc.command.includes('node') || proc.command.includes('vite'))) {
        runningServers.push({
          ...proc,
          port: port
        });
      }
    });
  });

  // Also check for npm run dev processes specifically
  try {
    const npmProcesses = executeCommand(`pgrep -f "npm run dev"`);
    if (npmProcesses) {
      const pids = npmProcesses.split('\n').filter(pid => pid.trim());
      pids.forEach(pid => {
        try {
          const processInfo = executeCommand(`ps -p ${pid} -o pid,command --no-headers`);
          if (processInfo.includes('npm run dev')) {
            runningServers.push({
              command: 'npm',
              pid: pid,
              user: process.env.USER || 'unknown',
              port: 'unknown',
              fullCommand: processInfo.trim()
            });
          }
        } catch (_error) {
          // Process might have ended
        }
      });
    }
  } catch (_error) {
    // No npm run dev processes found
  }

  return runningServers;
}

/**
 * Kills a process by PID
 */
function killProcess(pid) {
  try {
    executeCommand(`kill ${pid}`);
    return true;
  } catch (_error) {
    try {
      // Try force kill if regular kill fails
      executeCommand(`kill -9 ${pid}`);
      return true;
    } catch (_forceError) {
      return false;
    }
  }
}

/**
 * Prompts user for input (simple version)
 */
function promptUser(question) {
  process.stdout.write(question);

  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
  });
}

/**
 * Main function to check and handle running dev servers
 */
async function checkAndHandleDevServers() {
  logInfo('🔍 Checking for running dev server instances...');

  const runningServers = findRunningDevServers();

  if (runningServers.length === 0) {
    logSuccess('No running dev servers found. Safe to start new instance.');
    return true;
  }

  logWarning(`Found ${runningServers.length} running dev server process(es):`);

  runningServers.forEach((server, index) => {
    log(`  ${index + 1}. PID: ${server.pid}, Command: ${server.command}, Port: ${server.port}`, colors.cyan);
  });

  logWarning('\n⚠️  Multiple dev server instances can cause:');
  log('   • Port conflicts and connection issues', colors.yellow);
  log('   • Inconsistent data due to different localStorage contexts', colors.yellow);
  log('   • Confusion about which instance you\'re viewing', colors.yellow);
  log('   • Resource conflicts and performance issues', colors.yellow);

  const userChoice = await promptUser('\n❓ Would you like to kill existing instances? (y/n): ');

  if (userChoice === 'y' || userChoice === 'yes') {
    logInfo('🔄 Stopping existing dev server instances...');

    let killCount = 0;
    for (const server of runningServers) {
      const success = killProcess(server.pid);
      if (success) {
        logSuccess(`Stopped process ${server.pid} (${server.command})`);
        killCount++;
      } else {
        logError(`Failed to stop process ${server.pid} (${server.command})`);
      }
    }

    if (killCount > 0) {
      logSuccess(`Successfully stopped ${killCount} process(es).`);

      // Wait a moment for processes to fully terminate
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify ports are clear
      const stillRunning = findRunningDevServers();
      if (stillRunning.length === 0) {
        logSuccess('All dev server instances stopped. Safe to start new instance.');
        return true;
      } else {
        logWarning(`${stillRunning.length} process(es) still running. You may need to manually stop them.`);
        return false;
      }
    } else {
      logError('Failed to stop any processes. You may need to manually stop them.');
      return false;
    }
  } else {
    logWarning('⚠️  Proceeding with existing instances running. This may cause issues.');
    logInfo('💡 Consider stopping existing instances manually before starting a new one.');
    return false;
  }
}

/**
 * Starts the dev server
 */
function startDevServer() {
  logInfo('🚀 Starting dev server...');

  try {
    // Use spawn to start the dev server in the background
    const devProcess = spawn('npm', ['run', 'dev:unsafe'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    devProcess.on('error', (error) => {
      logError(`Failed to start dev server: ${error.message}`);
      process.exit(1);
    });

    devProcess.on('close', (code) => {
      if (code !== 0) {
        logError(`Dev server exited with code ${code}`);
        process.exit(code);
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      logInfo('\n📤 Shutting down dev server...');
      devProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      logInfo('\n📤 Shutting down dev server...');
      devProcess.kill('SIGTERM');
    });

  } catch (error) {
    logError(`Failed to start dev server: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Cleans up any orphaned processes or port locks
 */
function cleanupOrphanedProcesses() {
  logInfo('🧹 Cleaning up any orphaned processes...');

  DEFAULT_PORTS.forEach(port => {
    try {
      const processes = getProcessesOnPort(port);
      processes.forEach(proc => {
        // Check if the process is actually dead but port is still locked
        try {
          executeCommand(`ps -p ${proc.pid}`);
          // Process exists, it's not orphaned
        } catch (_error) {
          // Process doesn't exist, try to free the port
          logInfo(`Cleaning up orphaned lock on port ${port}`);
          try {
            executeCommand(`lsof -ti:${port} | xargs kill -9`);
          } catch (_cleanupError) {
            // Port might already be free
          }
        }
      });
    } catch (_error) {
      // No processes on this port
    }
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const autoKill = args.includes('--auto-kill');
  const skipCheck = args.includes('--skip-check');
  const cleanupOnly = args.includes('--cleanup-only');

  log(`${colors.bold}${colors.blue}🛡️  Dev Server Instance Protection${colors.reset}\n`);

  if (cleanupOnly) {
    cleanupOrphanedProcesses();
    return;
  }

  if (skipCheck) {
    logWarning('⚠️  Skipping dev server check as requested.');
    startDevServer();
    return;
  }

  // Cleanup orphaned processes first
  cleanupOrphanedProcesses();

  if (autoKill) {
    logInfo('🤖 Auto-kill mode enabled. Will automatically stop existing instances.');
    const runningServers = findRunningDevServers();

    if (runningServers.length > 0) {
      logInfo(`Stopping ${runningServers.length} existing instance(s)...`);
      for (const server of runningServers) {
        killProcess(server.pid);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    startDevServer();
  } else {
    const canStart = await checkAndHandleDevServers();

    if (canStart) {
      startDevServer();
    } else {
      logWarning('🛑 Not starting new dev server due to existing instances.');
      logInfo('💡 Run with --auto-kill to automatically stop existing instances.');
      logInfo('💡 Run with --skip-check to skip this check entirely.');
      process.exit(1);
    }
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Only run main if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
  });
}

export {
  checkAndHandleDevServers,
  findRunningDevServers,
  isPortInUse,
  killProcess,
  cleanupOrphanedProcesses
};