/**
 * @fileoverview Beautified Result Viewer Component
 *
 * Displays agent workflow results in a conversation-style format with:
 * - Summary of what happened during execution
 * - Meaningful messages extracted from assistant responses
 * - Filtered view that hides system noise (session_ids, uuids, hooks)
 * - Markdown rendering for proper formatting
 * - Collapsible raw JSON view for debugging
 *
 * @module components/kanban/BeautifiedResultViewer
 */

import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  Code,
  Activity,
  CheckCircle,
  AlertCircle,
  Database,
  MessageSquare,
  Wrench,
  Terminal,
  ChevronDown,
  ChevronRight,
  Bot,
  User,
  Lightbulb,
  FolderGit2,
  ListChecks
} from 'lucide-react';

/**
 * Fields that should be filtered out as system noise
 */
const SYSTEM_NOISE_FIELDS = [
  'session_id', 'uuid', 'hook_name', 'hook_event', 'exit_code',
  'cwd', 'tools', 'subtype', 'stderr', 'stdout'
];

/**
 * Subtypes that indicate system/init messages (not user-facing content)
 */
const SYSTEM_SUBTYPES = ['hook_response', 'init', 'result'];

/**
 * Check if a result entry is system noise that should be hidden
 */
const isSystemNoise = (entry) => {
  if (!entry || typeof entry !== 'object') return false;

  // Check for system subtypes
  if (entry.subtype && SYSTEM_SUBTYPES.includes(entry.subtype)) {
    return true;
  }

  // Check if it's a hook response
  if (entry.hook_name || entry.hook_event) {
    return true;
  }

  // Check if it's just session metadata
  if (entry.session_id && entry.type === 'system' && !entry.message?.content) {
    return true;
  }

  return false;
};

/**
 * Extract text content from a content array (Claude API format)
 */
const extractTextFromContent = (content) => {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .filter(item => item.type === 'text' && item.text)
    .map(item => item.text)
    .join('\n\n');
};

/**
 * Extract tool uses from a content array
 */
const extractToolUses = (content) => {
  if (!Array.isArray(content)) return [];
  return content.filter(item => item.type === 'tool_use');
};

/**
 * Extract thinking content from a content array
 */
const extractThinking = (content) => {
  if (!Array.isArray(content)) return [];
  return content
    .filter(item => item.type === 'thinking' && item.thinking)
    .map(item => item.thinking);
};

/**
 * Parse result to extract conversation messages and summary
 */
const parseConversationResult = (result) => {
  if (!result) {
    return { messages: [], summary: null, toolsUsed: [], filesChanged: [], hasErrors: false };
  }

  const messages = [];
  const toolsUsed = new Set();
  const filesChanged = new Set();
  let summary = null;
  let hasErrors = false;

  // Handle array of messages/events (Claude session format)
  if (Array.isArray(result)) {
    result.forEach((entry, index) => {
      // Skip system noise
      if (isSystemNoise(entry)) {
        // But check for errors in stderr
        if (entry.stderr && entry.stderr.includes('error')) {
          hasErrors = true;
        }
        return;
      }

      // Extract assistant messages
      if (entry.type === 'assistant' || entry.role === 'assistant') {
        const content = entry.message?.content || entry.content;
        const text = extractTextFromContent(content);
        const tools = extractToolUses(content);
        const thinking = extractThinking(content);

        if (text || tools.length > 0) {
          messages.push({
            type: 'assistant',
            text,
            tools,
            thinking,
            index
          });

          // Track tools used
          tools.forEach(tool => {
            if (tool.name) toolsUsed.add(tool.name);
          });
        }
      }

      // Extract user messages
      if (entry.type === 'user' || entry.role === 'user') {
        const content = entry.message?.content || entry.content;
        const text = extractTextFromContent(content);
        if (text) {
          messages.push({
            type: 'user',
            text,
            index
          });
        }
      }

      // Extract result/completion messages
      if (entry.type === 'result' || entry.subtype === 'result') {
        if (entry.result) {
          summary = typeof entry.result === 'string' ? entry.result : JSON.stringify(entry.result);
        }
      }
    });
  } else if (typeof result === 'object') {
    // Handle single object result (direct API response format)
    const text = extractTextFromContent(result.content);
    const tools = extractToolUses(result.content);
    const thinking = extractThinking(result.content);

    if (text || tools.length > 0) {
      messages.push({
        type: result.role || 'assistant',
        text,
        tools,
        thinking,
        index: 0
      });

      tools.forEach(tool => {
        if (tool.name) toolsUsed.add(tool.name);
      });
    }

    // Check for summary field
    if (result.summary) {
      summary = result.summary;
    }

    // Check for files_changed
    if (result.files_changed) {
      const files = Array.isArray(result.files_changed) ? result.files_changed : [result.files_changed];
      files.forEach(f => filesChanged.add(f));
    }
  }

  return {
    messages,
    summary,
    toolsUsed: Array.from(toolsUsed),
    filesChanged: Array.from(filesChanged),
    hasErrors
  };
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
 * Component to display tools used as badges
 */
const ToolsBadges = ({ tools }) => {
  if (!tools || tools.length === 0) return null;

  // Group and count tools
  const toolCounts = tools.reduce((acc, tool) => {
    acc[tool] = (acc[tool] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(toolCounts).map(([tool, count]) => (
        <span
          key={tool}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
        >
          <Wrench className="h-3 w-3 mr-1" />
          {tool}
          {count > 1 && <span className="ml-1 text-blue-600">×{count}</span>}
        </span>
      ))}
    </div>
  );
};

ToolsBadges.propTypes = {
  tools: PropTypes.array
};

/**
 * Component to display a single message in conversation style
 */
const MessageBubble = ({ message, showThinking = false }) => {
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const isAssistant = message.type === 'assistant';

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-[90%] ${isAssistant ? 'order-2' : 'order-1'}`}>
        {/* Message header */}
        <div className={`flex items-center gap-2 mb-1 ${isAssistant ? '' : 'justify-end'}`}>
          {isAssistant ? (
            <Bot className="h-4 w-4 text-purple-600" />
          ) : (
            <User className="h-4 w-4 text-green-600" />
          )}
          <span className="text-xs font-medium text-gray-500">
            {isAssistant ? 'Agent' : 'User'}
          </span>
        </div>

        {/* Message content */}
        <div
          className={`rounded-lg p-3 ${
            isAssistant
              ? 'bg-purple-50 border border-purple-200'
              : 'bg-green-50 border border-green-200'
          }`}
        >
          {message.text && (
            <div className="prose prose-sm max-w-none text-gray-800">
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
          )}

          {/* Tool uses summary */}
          {message.tools && message.tools.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Terminal className="h-3 w-3" />
                <span>Tools used:</span>
              </div>
              <ToolsBadges tools={message.tools.map(t => t.name)} />
            </div>
          )}

          {/* Thinking toggle */}
          {showThinking && message.thinking && message.thinking.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setThinkingExpanded(!thinkingExpanded)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <Lightbulb className="h-3 w-3" />
                <span>Thinking</span>
                {thinkingExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              {thinkingExpanded && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-gray-600 max-h-48 overflow-auto">
                  {message.thinking.map((thought, i) => (
                    <p key={i} className="mb-2 last:mb-0">{thought}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.shape({
    type: PropTypes.string.isRequired,
    text: PropTypes.string,
    tools: PropTypes.array,
    thinking: PropTypes.array
  }).isRequired,
  showThinking: PropTypes.bool
};

/**
 * Component to display execution summary banner
 */
const ExecutionSummary = ({ messages, toolsUsed, filesChanged, hasErrors }) => {
  const assistantMessages = messages.filter(m => m.type === 'assistant');
  const totalTools = toolsUsed.length;

  return (
    <div className={`rounded-lg p-4 mb-4 ${hasErrors ? 'bg-yellow-50 border border-yellow-300' : 'bg-green-50 border border-green-300'}`}>
      <div className="flex items-start gap-3">
        {hasErrors ? (
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${hasErrors ? 'text-yellow-800' : 'text-green-800'} mb-2`}>
            {hasErrors ? 'Completed with warnings' : 'Stage completed successfully'}
          </h4>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{assistantMessages.length} response{assistantMessages.length !== 1 ? 's' : ''}</span>
            </div>
            {totalTools > 0 && (
              <div className="flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5" />
                <span>{totalTools} tool{totalTools !== 1 ? 's' : ''} used</span>
              </div>
            )}
            {filesChanged.length > 0 && (
              <div className="flex items-center gap-1">
                <FolderGit2 className="h-3.5 w-3.5" />
                <span>{filesChanged.length} file{filesChanged.length !== 1 ? 's' : ''} changed</span>
              </div>
            )}
          </div>

          {/* Tools badges */}
          {toolsUsed.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Tools:</div>
              <ToolsBadges tools={toolsUsed} />
            </div>
          )}

          {/* Files changed */}
          {filesChanged.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Files:</div>
              <div className="flex flex-wrap gap-1">
                {filesChanged.slice(0, 5).map((file, i) => (
                  <span key={i} className="inline-block px-2 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700 truncate max-w-[200px]">
                    {file.split('/').pop()}
                  </span>
                ))}
                {filesChanged.length > 5 && (
                  <span className="text-xs text-gray-500">+{filesChanged.length - 5} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ExecutionSummary.propTypes = {
  messages: PropTypes.array.isRequired,
  toolsUsed: PropTypes.array.isRequired,
  filesChanged: PropTypes.array.isRequired,
  hasErrors: PropTypes.bool
};

/**
 * Component to display conversation view of messages
 */
const ConversationView = ({ messages }) => {
  if (!messages || messages.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No conversation messages found</p>
        <p className="text-xs text-gray-400 mt-1">
          The agent may have only performed system operations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((message, index) => (
        <MessageBubble key={index} message={message} showThinking={false} />
      ))}
    </div>
  );
};

ConversationView.propTypes = {
  messages: PropTypes.array
};

/**
 * BeautifiedResultViewer Component
 *
 * Displays agent workflow results in a conversation-style format.
 * Filters out system noise and shows meaningful messages with markdown rendering.
 */
const BeautifiedResultViewer = ({
  result,
  loading = false,
  error = null,
  maxHeight = '100%'
}) => {
  const { messages, summary, toolsUsed, filesChanged, hasErrors } = useMemo(
    () => parseConversationResult(result),
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

  // Check if we extracted any meaningful content
  const hasMeaningfulContent = messages.length > 0 || toolsUsed.length > 0;

  return (
    <div className="beautified-result-viewer" style={{ maxHeight, overflowY: 'auto' }}>
      <div className="p-4 space-y-4">
        {/* Execution Summary Banner */}
        {hasMeaningfulContent && (
          <ExecutionSummary
            messages={messages}
            toolsUsed={toolsUsed}
            filesChanged={filesChanged}
            hasErrors={hasErrors}
          />
        )}

        {/* Summary if provided */}
        {summary && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r">
            <div className="flex items-start gap-2">
              <ListChecks className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">Summary</h4>
                <div className="prose prose-sm max-w-none text-blue-700">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversation Messages */}
        {hasMeaningfulContent ? (
          <CollapsibleSection
            title={`Conversation (${messages.length} message${messages.length !== 1 ? 's' : ''})`}
            icon={MessageSquare}
            defaultExpanded={true}
            variant="default"
          >
            <div className="p-3">
              <ConversationView messages={messages} />
            </div>
          </CollapsibleSection>
        ) : (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg">
            <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium">No conversation content extracted</p>
            <p className="text-xs text-gray-400 mt-1">
              Check the Raw JSON section for full details
            </p>
          </div>
        )}

        {/* Raw JSON - Collapsible (for debugging) */}
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
