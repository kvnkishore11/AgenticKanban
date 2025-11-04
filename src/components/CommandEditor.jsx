import { useState, useEffect, useCallback } from 'react';
import {
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  GitCommit,
  Copy,
  Download,
  RotateCcw,
  Maximize2,
  Minimize2,
  Hash,
} from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import claudeCommandsService from '../services/api/claudeCommandsService';
import gitService from '../services/api/gitService';
import { formatTokenCount, estimateReadingTime, calculateMarkdownTokenCount } from '../utils/tokenCounter';

const CommandEditor = ({ commandId, isOpen, onClose, onSave = null }) => {
  const [command, setCommand] = useState(null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [editMode, setEditMode] = useState('preview'); // 'preview', 'live', 'edit'
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error', 'dirty'

  // Load command content when editor opens
  useEffect(() => {
    if (isOpen && commandId) {
      loadCommandContent();
    }
  }, [isOpen, commandId]); // loadCommandContent is stable within component lifecycle

  // Check if content has changed and update sync status
  useEffect(() => {
    const dirty = content !== originalContent;
    setIsDirty(dirty);
    setSyncStatus(dirty ? 'dirty' : 'synced');
  }, [content, originalContent]);

  // Clear states when editor closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      setIsDirty(false);
      setEditMode('preview');
      setIsFullscreen(true);
      setShowCommitDialog(false);
      setLastSyncTime(null);
      setSyncStatus('synced');
    }
  }, [isOpen]);

  const loadCommandContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const commandWithContent = await claudeCommandsService.getCommandContent(commandId);
      setCommand(commandWithContent);
      setContent(commandWithContent.content);
      setOriginalContent(commandWithContent.content);
    } catch (err) {
      setError(`Failed to load command content: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isDirty) return;

    setSaving(true);
    setSyncStatus('syncing');
    setError(null);

    try {
      const updatedCommand = await claudeCommandsService.updateCommandContent(commandId, content);
      setCommand(updatedCommand);
      setOriginalContent(content);
      setLastSyncTime(new Date());
      setSyncStatus('synced');
      setSuccess('Command content saved and synchronized');

      // Call external save handler if provided
      if (onSave) {
        onSave(updatedCommand);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setSyncStatus('error');
      setError(`Failed to save command: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCommit = async () => {
    if (!isDirty) {
      setShowCommitDialog(false);
      return;
    }

    try {
      // First save the changes
      await handleSave();

      // Then commit to git
      const result = await gitService.commitCommandChanges(
        command.path,
        commitMessage || gitService.generateCommitMessage(command.id, 'update')
      );

      if (result.success) {
        setSuccess('Changes committed to git successfully');
        setShowCommitDialog(false);
        setCommitMessage('');
      } else {
        setError(`Git commit failed: ${result.error || result.message}`);
      }
    } catch (err) {
      setError(`Failed to commit changes: ${err.message}`);
    }
  };

  const handleDiscard = () => {
    setContent(originalContent);
    setSyncStatus('synced');
    setError(null);
    setSuccess(null);
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setSuccess('Content copied to clipboard');
    setTimeout(() => setSuccess(null), 2000);
  }, [content]);

  const getCurrentTokenCount = () => {
    if (!content) return 0;
    // Use proper markdown token counting utility
    return calculateMarkdownTokenCount(content);
  };

  const getComplexityBadge = (tokenCount) => {
    const complexity = claudeCommandsService.getCommandComplexity({ tokenCount });
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


  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white rounded-lg shadow-xl flex flex-col ${
        isFullscreen ? 'w-full h-full rounded-none' : 'max-w-6xl w-full max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Edit3 className="h-5 w-5 text-primary-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {command ? claudeCommandsService.getCommandSlashName(command) : 'Loading...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Token count and complexity */}
            {command && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Hash className="h-4 w-4" />
                  <span>{formatTokenCount(getCurrentTokenCount())}</span>
                </div>
                {getComplexityBadge(getCurrentTokenCount())}
              </div>
            )}

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Close editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-2">
            {/* Edit Mode Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setEditMode('preview')}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                  editMode === 'preview'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setEditMode('live')}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                  editMode === 'live'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setEditMode('edit')}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                  editMode === 'edit'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Raw</span>
              </button>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded"
              title="Copy content"
            >
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Discard changes */}
            {isDirty && (
              <button
                onClick={handleDiscard}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded"
                title="Discard changes"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Discard</span>
              </button>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${
                isDirty && !saving
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Commit button */}
            <button
              onClick={() => setShowCommitDialog(true)}
              disabled={!isDirty}
              className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${
                isDirty
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title="Save and commit to git"
            >
              <GitCommit className="h-4 w-4" />
              <span>Commit</span>
            </button>
          </div>
        </div>

        {/* Status messages */}
        {(error || success) && (
          <div className="p-3 border-b border-gray-100">
            {error && (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{success}</span>
              </div>
            )}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading command content...</span>
            </div>
          ) : editMode === 'preview' ? (
            <div className="h-full overflow-y-auto p-6">
              <MDEditor.Markdown
                source={content}
                style={{
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
                data-color-mode="light"
              />
            </div>
          ) : editMode === 'live' ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4">
                <MDEditor
                  value={content}
                  onChange={setContent}
                  preview="live"
                  hideToolbar={false}
                  visibleDragBar={false}
                  textareaProps={{
                    placeholder: 'Enter markdown content for this command...',
                    style: { fontSize: 14, lineHeight: 1.5, fontFamily: 'var(--font-mono)' }
                  }}
                  height={isFullscreen ? 'calc(100vh - 280px)' : '400px'}
                  data-color-mode="light"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4">
                <MDEditor
                  value={content}
                  onChange={setContent}
                  preview="edit"
                  hideToolbar={false}
                  visibleDragBar={false}
                  textareaProps={{
                    placeholder: 'Enter markdown content for this command...',
                    style: { fontSize: 14, lineHeight: 1.5, fontFamily: 'var(--font-mono)' }
                  }}
                  height={isFullscreen ? 'calc(100vh - 280px)' : '400px'}
                  data-color-mode="light"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Lines: {content.split('\n').length}</span>
              <span>Characters: {content.length}</span>
              <span>Reading time: {estimateReadingTime(getCurrentTokenCount())}</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Sync Status Indicator */}
              <div className="flex items-center space-x-1">
                {syncStatus === 'synced' && (
                  <span className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Synced</span>
                    {lastSyncTime && (
                      <span className="text-gray-500">at {lastSyncTime.toLocaleTimeString()}</span>
                    )}
                  </span>
                )}
                {syncStatus === 'dirty' && (
                  <span className="flex items-center space-x-1 text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>Unsaved changes</span>
                  </span>
                )}
                {syncStatus === 'syncing' && (
                  <span className="flex items-center space-x-1 text-blue-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                    <span>Syncing...</span>
                  </span>
                )}
                {syncStatus === 'error' && (
                  <span className="flex items-center space-x-1 text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>Sync failed</span>
                  </span>
                )}
              </div>

              {command?.lastModified && (
                <span>Last modified: {new Date(command.lastModified).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Commit dialog */}
      {showCommitDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Commit Changes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commit Message (optional)
                </label>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Leave empty to use auto-generated message"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCommitDialog(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Commit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandEditor;