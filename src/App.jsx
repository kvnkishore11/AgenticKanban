/**
 * @fileoverview Main App Component - Entry point for AgenticKanban application
 * Manages top-level UI state and coordinates between major application sections
 */

import { useEffect, useState } from 'react';
import { useKanbanStore } from './stores/kanbanStore';
import ProjectSelector from './components/ProjectSelector';
import KanbanBoard from './components/kanban/KanbanBoard';
import TaskInput from './components/forms/TaskInput';
import CommandsPalette from './components/CommandsPalette';
import SettingsModal from './components/forms/SettingsModal';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { Folder, Plus, Settings, HelpCircle, Terminal } from 'lucide-react';
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
    deselectProject
  } = useKanbanStore();

  const [showCommandsPalette, setShowCommandsPalette] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    // Initialize the application
    console.log('AgenticKanban initialized');

    // Initialize WebSocket connection
    initializeWebSocket().catch(error => {
      console.error('Failed to initialize WebSocket:', error);
    });
  }, [initializeWebSocket]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="app-header">
        <div className="px-2 sm:px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-2 ${
                  selectedProject
                    ? 'cursor-pointer hover:opacity-75 transition-opacity'
                    : ''
                }`}
                onClick={selectedProject ? deselectProject : undefined}
                title={selectedProject ? 'Return to project selection' : ''}
              >
                <Folder className="h-8 w-8 text-primary-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  AgenticKanban
                </h1>
              </div>
              {selectedProject && (
                <div className="text-sm text-gray-500">
                  {selectedProject.name}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {selectedProject && (
                <>
                  <button
                    onClick={toggleTaskInput}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Task</span>
                  </button>

                  <button
                    onClick={() => setShowCommandsPalette(true)}
                    className="btn-secondary flex items-center space-x-2"
                    title="View available Claude commands"
                  >
                    <Terminal className="h-4 w-4" />
                    <span>Commands</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Open settings"
                aria-label="Open settings"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button className="p-2 text-gray-400 hover:text-gray-600">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-2 sm:mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-2 sm:px-4 py-8">
        {!selectedProject ? (
          <ProjectSelector />
        ) : (
          <>
            {showTaskInput && <TaskInput />}
            <KanbanBoard />
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="px-2 sm:px-4 py-4">
          <div className="text-center text-sm text-gray-500">
            AgenticKanban - AI-Driven Development Workflow Management
          </div>
        </div>
      </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
