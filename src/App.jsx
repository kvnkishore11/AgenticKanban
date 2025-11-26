/**
 * @fileoverview Main App Component - Entry point for AgenticKanban application
 * Manages top-level UI state and coordinates between major application sections
 */

import { useEffect, useState, useRef } from 'react';
import { useKanbanStore } from './stores/kanbanStore';
import ProjectSelector from './components/ProjectSelector';
import KanbanBoard from './components/kanban/KanbanBoard';
import TaskInput from './components/forms/TaskInput';
import CommandsPalette from './components/CommandsPalette';
import SettingsModal from './components/forms/SettingsModal';
import CompletedTasksModal from './components/kanban/CompletedTasksModal';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { Search } from 'lucide-react';
import './styles/kanban.css';

/**
 * Main application component that renders the complete AgenticKanban interface
 * @returns {JSX.Element} The main application UI
 */
function App() {
  const {
    selectedProject,
    showTaskInput,
    toggleTaskInput,
    error,
    clearError,
    isLoading,
    initializeWebSocket,
    deselectProject,
    tasks,
    getWebSocketStatus
  } = useKanbanStore();

  const [showCommandsPalette, setShowCommandsPalette] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wsInitialized = useRef(false);

  // Get WebSocket status
  const wsStatus = getWebSocketStatus();

  // Calculate task stats
  const activeTasks = tasks.filter(t => t.stage !== 'completed' && t.stage !== 'backlog').length;
  const totalTasks = tasks.length;

  useEffect(() => {
    // Initialize the application
    // Initialize WebSocket connection only once
    if (!wsInitialized.current) {
      console.log('[App] AgenticKanban initialized');
      wsInitialized.current = true;
      initializeWebSocket().catch(error => {
        console.error('[App] Failed to initialize WebSocket:', error);
      });
    }

    // NOTE: We intentionally do NOT cleanup websocketService here because:
    // 1. websocketService is a singleton that should persist for the app's lifetime
    // 2. Cleaning up on every re-render would clear event listeners
    // 3. This was causing the bug where workflow_log listeners were cleared
    // The websocketService will be cleaned up when the browser tab/window closes
  }, []); // Empty dependency array: only run once on mount. wsInitialized.current ref prevents duplicate initialization.

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchBar')?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ErrorBoundary>
      <div className="brutalist-app">
      {/* Brutalist Header */}
      <header className="brutalist-header">
        <div className="brutalist-header-content">
          <div className="brutalist-header-left">
            <div
              className={`brutalist-project-name ${selectedProject ? 'cursor-pointer' : ''}`}
              onClick={selectedProject ? deselectProject : undefined}
              title={selectedProject ? 'Return to project selection' : ''}
            >
              KANBAN.V4
            </div>

            {selectedProject && (
              <>
                <div className="brutalist-stats">
                  <div className="brutalist-stat">
                    <span className="brutalist-stat-value">{String(activeTasks).padStart(2, '0')}</span>
                    <span>ACTIVE</span>
                  </div>
                  <div className="brutalist-stat">
                    <span className="brutalist-stat-value">{String(totalTasks).padStart(2, '0')}</span>
                    <span>TOTAL</span>
                  </div>
                </div>

                <div className="brutalist-search-container">
                  <Search className="brutalist-search-icon" size={16} />
                  <input
                    type="text"
                    id="searchBar"
                    className="brutalist-search-bar"
                    placeholder="SEARCH TASKS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="brutalist-connection-status">
                  <div className={`brutalist-status-dot ${wsStatus.connected ? '' : 'disconnected'}`}></div>
                  <span>{wsStatus.connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
                </div>
              </>
            )}
          </div>

          <div className="brutalist-header-right">
            {selectedProject && (
              <>
                <button
                  className="brutalist-icon-btn"
                  onClick={toggleTaskInput}
                  title="New Task"
                >
                  +
                </button>
                <button
                  className="brutalist-icon-btn"
                  onClick={() => setShowCommandsPalette(true)}
                  title="Commands"
                >
                  /
                </button>
                <button
                  className="brutalist-icon-btn"
                  onClick={() => setShowCompletedTasks(true)}
                  title="Completed Tasks"
                >
                  =
                </button>
              </>
            )}
            <button
              className="brutalist-icon-btn"
              onClick={() => setShowSettingsModal(true)}
              title="Settings"
            >
              *
            </button>
            <button
              className={`brutalist-menu-btn ${showDropdownMenu ? 'active' : ''}`}
              onClick={() => setShowDropdownMenu(!showDropdownMenu)}
            >
              ⋮
            </button>

            <div className={`brutalist-dropdown-menu ${showDropdownMenu ? 'active' : ''}`}>
              <div className="brutalist-dropdown-item success" onClick={() => { setShowDropdownMenu(false); }}>
                <span>▶</span><span>RESUME WORKFLOW</span>
              </div>
              <div className="brutalist-dropdown-item warning" onClick={() => { setShowDropdownMenu(false); }}>
                <span>⏸</span><span>PAUSE WORKFLOW</span>
              </div>
              <div className="brutalist-dropdown-item" onClick={() => { setShowDropdownMenu(false); }}>
                <span>🔄</span><span>RESTART WORKFLOW</span>
              </div>
              <div className="brutalist-dropdown-item" onClick={() => { setShowDropdownMenu(false); }}>
                <span>⏹</span><span>STOP WORKFLOW</span>
              </div>
              <div className="brutalist-dropdown-item danger" onClick={() => { setShowDropdownMenu(false); }}>
                <span>🗑</span><span>DELETE ALL TASKS</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="brutalist-error-display">
          <span className="brutalist-error-icon">⚠</span>
          <span className="brutalist-error-text">{error}</span>
          <button onClick={clearError} className="brutalist-error-dismiss">DISMISS</button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="brutalist-loading-overlay">
          <div className="brutalist-loading-box">
            <span className="brutalist-loading-spinner">⟳</span>
            <span>LOADING...</span>
          </div>
        </div>
      )}

      {/* Main Content - Brutalist Board Container */}
      <main className="brutalist-board-container">
        {!selectedProject ? (
          <ProjectSelector />
        ) : (
          <>
            {showTaskInput && <TaskInput />}
            <KanbanBoard searchQuery={searchQuery} />
          </>
        )}
      </main>

      {/* Commands Palette */}
      <CommandsPalette
        isOpen={showCommandsPalette}
        onClose={() => setShowCommandsPalette(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Completed Tasks Modal */}
      <CompletedTasksModal
        isOpen={showCompletedTasks}
        onClose={() => setShowCompletedTasks(false)}
      />

      {/* Click outside handler for dropdown */}
      {showDropdownMenu && (
        <div
          className="brutalist-dropdown-backdrop"
          onClick={() => setShowDropdownMenu(false)}
        />
      )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
