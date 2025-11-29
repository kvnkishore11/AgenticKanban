/**
 * @fileoverview Content Type Tabs Component
 *
 * Displays secondary tabs for switching between EXECUTION, THINKING, and RESULT content types.
 * Shows counts for logs when available.
 *
 * @module components/kanban/ContentTypeTabs
 */

import PropTypes from 'prop-types';

const ContentTypeTabs = ({
  activeContentType,
  onContentTypeChange,
  executionLogCount = 0,
  thinkingLogCount = 0,
  hasResult = false
}) => {
  const tabs = [
    {
      id: 'execution',
      label: 'EXECUTION',
      icon: '📊',
      count: executionLogCount,
      showCount: executionLogCount > 0
    },
    {
      id: 'thinking',
      label: 'THINKING',
      icon: '🧠',
      count: thinkingLogCount,
      showCount: thinkingLogCount > 0
    },
    {
      id: 'result',
      label: 'RESULT',
      icon: '📋',
      count: null,
      showCount: false,
      hasData: hasResult
    }
  ];

  return (
    <div className="content-type-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`content-type-tab ${activeContentType === tab.id ? 'active' : ''} ${
            tab.id === 'result' && !tab.hasData ? 'disabled' : ''
          }`}
          onClick={() => onContentTypeChange(tab.id)}
          disabled={tab.id === 'result' && !tab.hasData}
          title={tab.id === 'result' && !tab.hasData ? 'No result available yet' : tab.label}
        >
          <span className="content-type-icon">{tab.icon}</span>
          <span className="content-type-label">{tab.label}</span>
          {tab.showCount && (
            <span className="content-type-count">({tab.count})</span>
          )}
          {tab.id === 'result' && tab.hasData && (
            <span className="content-type-check">✓</span>
          )}
        </button>
      ))}
    </div>
  );
};

ContentTypeTabs.propTypes = {
  /** Currently active content type */
  activeContentType: PropTypes.oneOf(['execution', 'thinking', 'result']).isRequired,
  /** Callback when content type changes */
  onContentTypeChange: PropTypes.func.isRequired,
  /** Number of execution log entries */
  executionLogCount: PropTypes.number,
  /** Number of thinking/agent log entries */
  thinkingLogCount: PropTypes.number,
  /** Whether a result is available */
  hasResult: PropTypes.bool
};

export default ContentTypeTabs;
