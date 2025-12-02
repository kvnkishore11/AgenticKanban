/**
 * @fileoverview Project selection and management component
 *
 * Provides a dropdown interface for selecting active projects, creating new
 * projects, and validating project paths. Integrates with the project store
 * to manage project state and synchronization. Supports project validation
 * with visual feedback indicators.
 *
 * @module components/ProjectSelector
 */

import { useState, useEffect } from 'react';
import { useKanbanStore } from '../stores/kanbanStore';
import { Folder, FolderOpen, Plus, FileText, Clock } from 'lucide-react';
import recentProjectsService from '../services/storage/recentProjectsService';
import fileOperationsService from '../services/api/fileOperationsService';

const ProjectSelector = () => {
  const {
    availableProjects,
    selectProject,
    addProject,
    refreshProjects,
    setError,
  } = useKanbanStore();

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectPath, setNewProjectPath] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [recentProjects, setRecentProjects] = useState([]);
  const [isBrowsing, setIsBrowsing] = useState(false);

  // Refresh projects when component mounts to ensure clean data
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Load recent projects on mount and when availableProjects changes
  useEffect(() => {
    const loadRecentProjects = () => {
      const recent = recentProjectsService.getRecentProjects();
      setRecentProjects(recent);
    };

    loadRecentProjects();
  }, [availableProjects]);

  const handleAddNewProjectClick = () => {
    setShowNewProject(true);
  };

  const handleBrowseClick = async () => {
    try {
      setError(''); // Clear previous errors
      setIsBrowsing(true);

      const result = await fileOperationsService.selectDirectory();

      if (result.path) {
        setNewProjectPath(result.path);
        setNewProjectName(result.name);
      }
      // If user cancelled, result will be empty - no action needed
    } catch (error) {
      setError('Failed to open directory picker: ' + error.message);
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleSelectProject = (project) => {
    selectProject(project);

    // Refresh recent projects list after selection
    const recent = recentProjectsService.getRecentProjects();
    setRecentProjects(recent);
  };

  const handleAddNewProject = () => {
    if (!newProjectPath.trim()) {
      setError('Please enter a valid project path');
      return;
    }

    if (!newProjectName.trim()) {
      setError('Please enter a project name');
      return;
    }

    const newProject = {
      name: newProjectName.trim(),
      path: newProjectPath.trim(),
      description: 'Recently added project with dynamic ADW support',
    };

    // Use the new persistence service through the store
    const result = addProject(newProject);

    if (result.success) {
      selectProject(result.project);

      // Reset form
      setNewProjectPath('');
      setNewProjectName('');
      setShowNewProject(false);

      console.log('Successfully added project:', result.project);
    } else {
      setError(result.errors.join(', '));
      console.error('Failed to add project:', result.errors);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <FolderOpen className="h-16 w-16 text-primary-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Select a Project
        </h1>
        <p className="text-lg text-gray-600">
          Choose any project for AI-driven development workflows
        </p>
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="card cursor-pointer transition-all hover:shadow-md hover:border-primary-300 bg-primary-50/50"
                onClick={() => handleSelectProject(project)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Folder className="h-5 w-5 text-primary-600" />
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                    Recent
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3">{project.description || 'Project ready for ADW workflows'}</p>

                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    {project.path}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-green-600">
                      <span>✓ ADW Compatible</span>
                    </div>

                    <span className="text-xs text-primary-600 font-medium">
                      {formatRelativeTime(project.lastAccessedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Projects */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Projects</h2>
        {availableProjects.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No projects available. Add a new project to get started.</p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableProjects.map((project) => (
            <div
              key={project.id}
              className="card cursor-pointer transition-all hover:shadow-md hover:border-primary-300"
              onClick={() => handleSelectProject(project)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Folder className="h-5 w-5 text-primary-600" />
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">{project.description || 'Project ready for ADW workflows'}</p>

              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  {project.path}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-green-600">
                    <span>✓ ADW Compatible</span>
                  </div>

                  <span className="text-xs text-gray-500">
                    {formatDate(project.lastModified || project.createdAt || project.updatedAt || new Date().toISOString())}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Add New Project */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Add New Project</h2>
          <button
            onClick={handleAddNewProjectClick}
            className="btn-secondary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Project</span>
          </button>
        </div>

        {showNewProject && (
          <div className="card max-w-2xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter a descriptive name for your project
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Path
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newProjectPath}
                    onChange={(e) => setNewProjectPath(e.target.value)}
                    placeholder="/Users/username/projects/myproject"
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseClick}
                    disabled={isBrowsing}
                    className="btn-secondary px-4 py-2 whitespace-nowrap"
                  >
                    {isBrowsing ? 'Selecting...' : 'Browse'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Click Browse to open a native directory picker and select your project folder. The full absolute path will be populated automatically.
                </p>
              </div>

              <button
                onClick={handleAddNewProject}
                className="btn-primary"
                disabled={!newProjectPath.trim() || !newProjectName.trim()}
              >
                Add Project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <FileText className="h-6 w-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">
              ADW Workflow Features
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Dynamic Workflows:</strong> ADW configurations created automatically for each task</p>
              <p>• <strong>Real-time Notifications:</strong> Send ticket updates to your running development server</p>
              <p>• <strong>Auto-discovery:</strong> Automatically finds development servers on common ports</p>
              <p>• <strong>No Setup Required:</strong> Works with any project directory structure</p>
              <p>• <strong>Isolated Execution:</strong> Each workflow runs in its own worktree environment</p>
              <p>• <strong>AI-Driven Development:</strong> Automated planning, building, testing, and deployment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSelector;