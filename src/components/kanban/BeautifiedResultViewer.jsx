/**
 * @fileoverview Beautified Result Viewer Component
 *
 * Displays agent workflow results in a user-friendly format with:
 * - Prominent display of meaningful results (what the agent accomplished)
 * - Collapsible metadata section for technical details
 * - Collapsible raw JSON view for debugging
 *
 * @module components/kanban/BeautifiedResultViewer
 */

import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  FileText,
  Code,
  Activity,
  CheckCircle,
  AlertCircle,
  Database,
  Clock,
  Hash,
  ChevronDown,
  ChevronRight,
  Cpu
} from 'lucide-react';

/**
 * Parse result object to extract primary results and metadata
 */
const parseResult = (result) => {
  if (!result) {
    return { primaryResults: null, metadata: {}, summary: null };
  }

  const metadata = {};
  const primaryResults = {};
  let summary = null;

  // Extract metadata fields
  const metadataFields = [
    'model',
    'stop_reason',
    'usage',
    'id',
    'type',
    'role',
    'stop_sequence',
    'input_tokens',
    'output_tokens',
    'cache_creation_input_tokens',
    'cache_read_input_tokens'
  ];

  // Extract primary result fields (content, tool results, etc.)
  const primaryFields = [
    'content',
    'tool_use',
    'thinking',
    'text',
    'files_changed',
    'files_created',
    'plan',
    'specification',
    'test_results',
    'review_comments',
    'documentation',
    'summary',
    'status',
    'output',
    'result'
  ];

  // Categorize fields
  Object.keys(result).forEach(key => {
    if (metadataFields.includes(key)) {
      metadata[key] = result[key];
    } else if (primaryFields.includes(key)) {
      primaryResults[key] = result[key];
    } else if (key === 'summary' || key === 'message') {
      summary = result[key];
    } else {
      // Default to primary results for unknown fields
      primaryResults[key] = result[key];
    }
  });

  // If content is an array, try to extract meaningful information
  if (Array.isArray(primaryResults.content)) {
    const textContent = [];
    const toolUses = [];
    const thinking = [];

    primaryResults.content.forEach(item => {
      if (item.type === 'text' && item.text) {
        textContent.push(item.text);
      } else if (item.type === 'tool_use') {
        toolUses.push(item);
      } else if (item.type === 'thinking' && item.thinking) {
        thinking.push(item.thinking);
      }
    });

    if (textContent.length > 0) {
      primaryResults.textContent = textContent.join('\n\n');
    }
    if (toolUses.length > 0) {
      primaryResults.toolUses = toolUses;
    }
    if (thinking.length > 0) {
      primaryResults.thinkingContent = thinking;
    }
  }

  return { primaryResults, metadata, summary };
};

/**
 * Component to display a collapsible section
 */
const CollapsibleSection = ({ title, icon: Icon, children, defaultExpanded = false, variant = 'default' }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const variantClasses = {
    default: 'bg-gray-50 border-gray-200',
    metadata: 'bg-blue-50 border-blue-200',
    raw: 'bg-gray-100 border-gray-300'
  };

  const headerVariantClasses = {
    default: 'text-gray-700 hover:text-gray-900',
    metadata: 'text-blue-700 hover:text-blue-900',
    raw: 'text-gray-700 hover:text-gray-900'
  };

  return (
    <div className={`border ${variantClasses[variant]} rounded-lg overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-3 py-2 flex items-center justify-between ${headerVariantClasses[variant]} font-medium text-sm transition-colors`}
      >
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="h-4 w-4" />}
          <span>{title}</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-inherit">
          {children}
        </div>
      )}
    </div>
  );
};

CollapsibleSection.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  children: PropTypes.node.isRequired,
  defaultExpanded: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'metadata', 'raw'])
};

/**
 * Component to display metadata in a grid layout
 */
const MetadataGrid = ({ metadata }) => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <div className="p-3 text-sm text-gray-500">
        No metadata available
      </div>
    );
  }

  const formatValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="bg-white border border-gray-200 rounded p-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
          <div className="text-sm font-mono text-gray-800 break-words">
            {formatValue(value)}
          </div>
        </div>
      ))}
    </div>
  );
};

MetadataGrid.propTypes = {
  metadata: PropTypes.object
};

/**
 * Component to display tool uses
 */
const ToolUseDisplay = ({ toolUses }) => {
  if (!toolUses || toolUses.length === 0) return null;

  return (
    <div className="space-y-2">
      {toolUses.map((tool, index) => (
        <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Code className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">
              {tool.name || 'Tool Use'}
            </span>
            {tool.id && (
              <span className="text-xs font-mono text-blue-600">
                #{tool.id}
              </span>
            )}
          </div>
          {tool.input && (
            <pre className="text-xs font-mono text-gray-700 bg-white border border-blue-200 rounded p-2 overflow-auto max-h-48">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};

ToolUseDisplay.propTypes = {
  toolUses: PropTypes.array
};

/**
 * Component to display primary results
 */
const PrimaryResultsDisplay = ({ primaryResults, summary }) => {
  if (!primaryResults || Object.keys(primaryResults).length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No results available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="bg-green-50 border-l-4 border-green-500 p-3">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-green-800 mb-1">Summary</h4>
              <p className="text-sm text-green-700">{summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Text Content */}
      {primaryResults.textContent && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-800">Result</span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {primaryResults.textContent}
          </div>
        </div>
      )}

      {/* Tool Uses */}
      {primaryResults.toolUses && (
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Code className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-800">
              Tool Uses ({primaryResults.toolUses.length})
            </span>
          </div>
          <ToolUseDisplay toolUses={primaryResults.toolUses} />
        </div>
      )}

      {/* Status */}
      {primaryResults.status && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            {primaryResults.status === 'success' || primaryResults.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <span className="text-sm font-semibold text-gray-800">Status:</span>
            <span className="text-sm font-mono text-gray-700">{primaryResults.status}</span>
          </div>
        </div>
      )}

      {/* Files Changed/Created */}
      {(primaryResults.files_changed || primaryResults.files_created) && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-800">Files</span>
          </div>
          {primaryResults.files_changed && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-gray-600 mb-1">Changed:</div>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {Array.isArray(primaryResults.files_changed) ? (
                  primaryResults.files_changed.map((file, i) => (
                    <li key={i} className="font-mono text-xs">{file}</li>
                  ))
                ) : (
                  <li className="font-mono text-xs">{String(primaryResults.files_changed)}</li>
                )}
              </ul>
            </div>
          )}
          {primaryResults.files_created && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Created:</div>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {Array.isArray(primaryResults.files_created) ? (
                  primaryResults.files_created.map((file, i) => (
                    <li key={i} className="font-mono text-xs">{file}</li>
                  ))
                ) : (
                  <li className="font-mono text-xs">{String(primaryResults.files_created)}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Other primary results (excluding already displayed fields) */}
      {Object.entries(primaryResults)
        .filter(([key]) => !['textContent', 'toolUses', 'status', 'files_changed', 'files_created', 'content'].includes(key))
        .map(([key, value]) => (
          <div key={key} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-sm font-semibold text-gray-800 mb-2">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            <pre className="text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </pre>
          </div>
        ))}
    </div>
  );
};

PrimaryResultsDisplay.propTypes = {
  primaryResults: PropTypes.object,
  summary: PropTypes.string
};

/**
 * BeautifiedResultViewer Component
 */
const BeautifiedResultViewer = ({
  result,
  loading = false,
  error = null,
  maxHeight = '100%'
}) => {
  const { primaryResults, metadata, summary } = useMemo(
    () => parseResult(result),
    [result]
  );

  if (loading) {
    return (
      <div className="beautified-result-viewer-loading flex items-center justify-center p-8">
        <Activity className="h-6 w-6 text-blue-500 animate-spin mr-2" />
        <span className="text-sm text-gray-600">Loading result...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="beautified-result-viewer-error bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading result</h3>
            <div className="mt-1 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="beautified-result-viewer-empty p-8 text-center">
        <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500 font-medium">No Result Available</p>
        <p className="text-xs text-gray-400 mt-1">
          Result will appear when the stage completes
        </p>
      </div>
    );
  }

  return (
    <div className="beautified-result-viewer" style={{ maxHeight, overflowY: 'auto' }}>
      <div className="p-4 space-y-4">
        {/* Primary Results - Always visible */}
        <div>
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-800">Results</h3>
          </div>
          <PrimaryResultsDisplay primaryResults={primaryResults} summary={summary} />
        </div>

        {/* Metadata - Collapsible */}
        {Object.keys(metadata).length > 0 && (
          <CollapsibleSection
            title="Metadata"
            icon={Cpu}
            variant="metadata"
            defaultExpanded={false}
          >
            <MetadataGrid metadata={metadata} />
          </CollapsibleSection>
        )}

        {/* Raw JSON - Collapsible */}
        <CollapsibleSection
          title="Raw JSON"
          icon={Code}
          variant="raw"
          defaultExpanded={false}
        >
          <div className="p-3">
            <pre className="text-xs font-mono text-gray-700 bg-white border border-gray-300 rounded p-3 overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

BeautifiedResultViewer.propTypes = {
  /** The result object to display */
  result: PropTypes.object,
  /** Whether the result is loading */
  loading: PropTypes.bool,
  /** Error message if loading failed */
  error: PropTypes.string,
  /** Maximum height for the viewer */
  maxHeight: PropTypes.string
};

export default BeautifiedResultViewer;
