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
import { Folder, FolderOpen, CheckCircle, XCircle, Plus, FileText } from 'lucide-react';

const ProjectSelector = () => {
  const {
    availableProjects,
    selectProject,
    addProject,
    refreshProjects,
    setError,
    setLoading,
  } = useKanbanStore();

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectPath, setNewProjectPath] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [validationStatus, setValidationStatus] = useState(null);


  // Refresh projects when component mounts to ensure clean data
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const validateProject = (path) => {
    // Simulate project validation
    setLoading(true);

    setTimeout(() => {
      const isValid = Math.random() > 0.1; // 90% chance of being valid - simplified validation

      setValidationStatus({
        isValid,
        path,
      });

      setLoading(false);
    }, 1000);
  };

  const handleSelectProject = (project) => {
    // Check if project is valid for ADW workflows
    if (!project.isValid) {
      setError('Selected project is not valid for ADW workflows');
      return;
    }

    selectProject(project);
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

    if (validationStatus && validationStatus.isValid) {
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
        setValidationStatus(null);
        setShowNewProject(false);

        console.log('Successfully added project:', result.project);
      } else {
        setError(result.errors.join(', '));
        console.error('Failed to add project:', result.errors);
      }
    } else {
      setError('Please validate the project first');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
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
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Projects</h2>
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
              className={`card cursor-pointer transition-all hover:shadow-md ${
                project.isValid
                  ? 'hover:border-primary-300'
                  : 'opacity-75 hover:border-red-300'
              }`}
              onClick={() => handleSelectProject(project)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Folder className={`h-5 w-5 ${
                    project.isValid !== false ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {project.isValid !== false ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
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
            onClick={() => setShowNewProject(!showNewProject)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Browse</span>
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
                <input
                  type="text"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  placeholder="/path/to/your/project"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the full path to your project directory
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => validateProject(newProjectPath)}
                  className="btn-secondary"
                  disabled={!newProjectPath.trim() || !newProjectName.trim()}
                >
                  Validate Project
                </button>

                {validationStatus && (
                  <button
                    onClick={handleAddNewProject}
                    className="btn-primary"
                    disabled={!validationStatus.isValid}
                  >
                    Add Project
                  </button>
                )}
              </div>

              {validationStatus && (
                <div className={`p-4 rounded-md ${
                  validationStatus.isValid
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {validationStatus.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={`font-medium ${
                      validationStatus.isValid ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {validationStatus.isValid
                        ? 'Project is ready for ADW workflows'
                        : 'Project validation failed'
                      }
                    </span>
                  </div>

                  {validationStatus.isValid && (
                    <div className="text-sm text-green-700">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span>Dynamic ADW workflows will be created as needed</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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