import { useState, useEffect } from 'react';
import {
  Server,
  GitBranch,
  Hash,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
  Globe,
  Database,
  Cpu
} from 'lucide-react';

/**
 * AgentStateViewer Component
 * Displays the adw_state.json information including workflow metadata,
 * ports, model configuration, and execution status
 */
const AgentStateViewer = ({ adwId }) => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgentState = async () => {
      if (!adwId) {
        setError('No ADW ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/agent-state/${adwId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch agent state: ${response.statusText}`);
        }

        const data = await response.json();
        setState(data);
      } catch (err) {
        console.error('Error fetching agent state:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentState();
  }, [adwId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-sm text-gray-600">Loading agent state...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading agent state</h3>
            <div className="mt-1 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!state) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No agent state available</p>
      </div>
    );
  }

  return (
    <div className="agent-state-viewer p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
        <Server className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-800">Agent Workflow State</h3>
        {state.completed !== undefined && (
          <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded ${
            state.completed
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
          }`}>
            {state.completed ? 'Completed' : 'In Progress'}
          </span>
        )}
      </div>

      {/* Workflow Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* ADW ID */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Hash className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-600">ADW ID</span>
          </div>
          <div className="text-sm font-mono text-gray-800">{state.adw_id}</div>
        </div>

        {/* Issue Number */}
        {state.issue_number && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Hash className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Issue #</span>
            </div>
            <div className="text-sm font-mono text-gray-800">{state.issue_number}</div>
          </div>
        )}

        {/* Branch Name */}
        {state.branch_name && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:col-span-2">
            <div className="flex items-center space-x-2 mb-1">
              <GitBranch className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Branch Name</span>
            </div>
            <div className="text-sm font-mono text-gray-800 break-all">{state.branch_name}</div>
          </div>
        )}

        {/* Issue Class */}
        {state.issue_class && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Issue Class</span>
            </div>
            <div className="text-sm font-mono text-gray-800">{state.issue_class}</div>
          </div>
        )}

        {/* Model Set */}
        {state.model_set && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Cpu className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Model Set</span>
            </div>
            <div className="text-sm font-mono text-gray-800">{state.model_set}</div>
          </div>
        )}
      </div>

      {/* Ports Configuration */}
      {(state.backend_port || state.frontend_port) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">Port Configuration</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {state.backend_port && (
              <div className="bg-white rounded p-2">
                <span className="text-gray-500">Backend:</span>{' '}
                <span className="font-mono font-semibold text-gray-800">{state.backend_port}</span>
              </div>
            )}
            {state.frontend_port && (
              <div className="bg-white rounded p-2">
                <span className="text-gray-500">Frontend:</span>{' '}
                <span className="font-mono font-semibold text-gray-800">{state.frontend_port}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow Stages */}
      {state.all_adws && state.all_adws.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-xs font-semibold text-green-800">Executed Stages</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {state.all_adws.map((stage, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white text-xs font-mono text-green-700 rounded border border-green-300"
              >
                {stage}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Data Source */}
      {state.data_source && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Database className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-600">Data Source</span>
          </div>
          <div className="text-sm font-mono text-gray-800">{state.data_source}</div>
        </div>
      )}

      {/* Issue Details */}
      {state.issue_json && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900 select-none flex items-center">
              <span>Issue Details</span>
              <span className="ml-2 text-gray-400 group-open:hidden">(click to expand)</span>
            </summary>
            <div className="mt-2 space-y-2">
              {state.issue_json.title && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">Title</div>
                  <div className="text-sm text-gray-800">{state.issue_json.title}</div>
                </div>
              )}
              {state.issue_json.body && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">Body</div>
                  <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
                    {state.issue_json.body}
                  </div>
                </div>
              )}
              {state.issue_json.images && state.issue_json.images.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    Attached Images ({state.issue_json.images.length})
                  </div>
                  <div className="text-xs text-gray-500">
                    {state.issue_json.images.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* Worktree Path */}
      {state.worktree_path && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900 select-none flex items-center">
              <span>Worktree Path</span>
              <span className="ml-2 text-gray-400 group-open:hidden">(click to expand)</span>
            </summary>
            <div className="mt-2 text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded p-2 overflow-auto">
              {state.worktree_path}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default AgentStateViewer;
