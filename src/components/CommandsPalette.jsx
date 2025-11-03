/**
 * @fileoverview Keyboard shortcuts palette component for Claude commands
 *
 * Displays available Claude commands for the selected project with search,
 * filtering by category, and task-specific relevance. Shows command details
 * including complexity, token count, and execution status. Allows command
 * execution and editing through integrated interfaces.
 *
 * @module components/CommandsPalette
 */

import { useState, useEffect } from 'react';
import { useKanbanStore } from '../stores/kanbanStore';
import claudeCommandsService from '../services/api/claudeCommandsService';
import CommandEditor from './CommandEditor';
import { formatTokenCount } from '../utils/tokenCounter';
import {
  Terminal,
  Search,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  ExternalLink,
  Filter,
  Edit3,
  Hash,
  FileText,
} from 'lucide-react';

const CommandsPalette = ({ isOpen, onClose, task = null }) => {
  const { selectedProject } = useKanbanStore();
  const [commands, setCommands] = useState([]);
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executingCommand, setExecutingCommand] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCommandId, setEditingCommandId] = useState(null);

  useEffect(() => {
    if (selectedProject && isOpen) {
      loadCommands();
    }
  }, [selectedProject, isOpen]);

  useEffect(() => {
    filterCommands();
  }, [commands, searchQuery, selectedCategory, task]);

  const loadCommands = async () => {
    setLoading(true);
    try {
      const result = await claudeCommandsService.discoverCommands(selectedProject.path);
      setCommands(result.discovered);
      setCategories([
        { id: 'all', name: 'All Commands' },
        ...claudeCommandsService.getCategories()
      ]);
    } catch (error) {
      console.error('Failed to load commands:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCommands = () => {
    let filtered = commands;

    // Filter by search query
    if (searchQuery) {
      filtered = claudeCommandsService.searchCommands(searchQuery);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(cmd => cmd.category === selectedCategory);
    }

    // Filter by task relevance if task is provided
    if (task) {
      const stageCommands = claudeCommandsService.getCommandsForStage(task.stage, task.substage);
      const stageCommandIds = stageCommands.map(cmd => cmd.id);
      filtered = filtered.sort((a, b) => {
        const aRelevant = stageCommandIds.includes(a.id);
        const bRelevant = stageCommandIds.includes(b.id);
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        return 0;
      });
    }

    setFilteredCommands(filtered);
  };

  const executeCommand = async (command) => {
    setExecutingCommand(command.id);
    try {
      const result = await claudeCommandsService.executeCommand(command.id, {
        task: task?.id,
        project: selectedProject?.id,
      });

      console.log('Command executed successfully:', result);
      // Here you would typically update the task with the command result
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setExecutingCommand(null);
    }
  };

  const openEditor = (commandId) => {
    setEditingCommandId(commandId);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingCommandId(null);
  };

  const handleEditorSave = (updatedCommand) => {
    // Update the command in the list
    setCommands(prevCommands =>
      prevCommands.map(cmd =>
        cmd.id === updatedCommand.id ? { ...cmd, ...updatedCommand } : cmd
      )
    );
  };

  const getComplexityBadge = (command) => {
    const complexity = claudeCommandsService.getCommandComplexity(command);
    const colors = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[complexity.color]}`}>
        {complexity.level}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      testing: '🧪',
      documentation: '📝',
      quality: '✨',
      security: '🔒',
      performance: '⚡',
      review: '👀',
      deployment: '🚀',
    };
    return icons[category] || '⚙️';
  };

  const getCommandStatusColor = (command) => {
    if (!command.isAvailable) return 'text-gray-400';
    if (executingCommand === command.id) return 'text-blue-500';
    return 'text-green-500';
  };

  const getCommandStatusIcon = (command) => {
    if (!command.isAvailable) return <XCircle className="h-4 w-4" />;
    if (executingCommand === command.id) return <Clock className="h-4 w-4 animate-spin" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Terminal className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Claude Commands
              </h2>
              <p className="text-sm text-gray-600">
                Available workflow primitives for {selectedProject?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
            <span>Total: {commands.length}</span>
            <span>Available: {commands.filter(cmd => cmd.isAvailable).length}</span>
            {task && (
              <span>
                Relevant for {task.stage}: {filteredCommands.filter(cmd =>
                  claudeCommandsService.getCommandsForStage(task.stage).some(sc => sc.id === cmd.id)
                ).length}
              </span>
            )}
          </div>
        </div>

        {/* Commands List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading commands...</span>
            </div>
          ) : filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No commands found matching your criteria</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCommands.map((command) => {
                const isRelevant = task && claudeCommandsService
                  .getCommandsForStage(task.stage, task.substage)
                  .some(sc => sc.id === command.id);

                return (
                  <div
                    key={command.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isRelevant
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-lg">
                            {getCategoryIcon(command.category)}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-mono font-bold text-primary-700">
                                {claudeCommandsService.getCommandSlashName(command)}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Hash className="h-3 w-3" />
                              <span>{formatTokenCount(command.tokenCount || 0)}</span>
                            </div>
                            {getComplexityBadge(command)}
                            <div className={`flex items-center space-x-1 ${getCommandStatusColor(command)}`}>
                              {getCommandStatusIcon(command)}
                            </div>
                            {isRelevant && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                Relevant
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {command.description}
                        </p>

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Tag className="h-3 w-3" />
                            <span className="capitalize">{command.category}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{command.estimatedDuration}</span>
                          </div>
                          {command.metadata?.stage && (
                            <div>
                              Stage: {command.metadata.stage}
                              {command.metadata.substage && ` → ${command.metadata.substage}`}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => executeCommand(command)}
                          disabled={!command.isAvailable || executingCommand === command.id}
                          className={`flex items-center space-x-2 px-3 py-1 rounded text-sm ${
                            command.isAvailable
                              ? 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Play className="h-3 w-3" />
                          <span>
                            {executingCommand === command.id ? 'Running...' : 'Run'}
                          </span>
                        </button>

                        <button
                          onClick={() => openEditor(command.id)}
                          className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                          title="Edit command content"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => openEditor(command.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View command details"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Commands are dynamically generated and available for workflow automation
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadCommands}
                className="text-primary-600 hover:text-primary-700"
              >
                Refresh Commands
              </button>
              <button
                onClick={onClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Command Editor Modal */}
      <CommandEditor
        commandId={editingCommandId}
        isOpen={editorOpen}
        onClose={closeEditor}
        onSave={handleEditorSave}
      />
    </div>
  );
};

export default CommandsPalette;