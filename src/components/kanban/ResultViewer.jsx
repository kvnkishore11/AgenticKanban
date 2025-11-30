/**
 * @fileoverview Result Viewer Component
 *
 * Displays the final raw_output.json result from agent stages.
 * Shows a collapsible JSON tree view with syntax highlighting.
 * Also provides a beautified view for better readability.
 *
 * @module components/kanban/ResultViewer
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import BeautifiedResultViewer from './BeautifiedResultViewer';

/**
 * Recursive component to render JSON tree nodes
 */
const JsonTreeNode = ({ data, name, depth = 0, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded && depth < 2);

  if (data === null) {
    return (
      <div className="json-tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
        {name && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-null">null</span>
      </div>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <div className="json-tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
        {name && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-boolean">{data.toString()}</span>
      </div>
    );
  }

  if (typeof data === 'number') {
    return (
      <div className="json-tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
        {name && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-number">{data}</span>
      </div>
    );
  }

  if (typeof data === 'string') {
    // Truncate long strings
    const displayValue = data.length > 200 ? `${data.slice(0, 200)}...` : data;
    return (
      <div className="json-tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
        {name && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-string">&quot;{displayValue}&quot;</span>
      </div>
    );
  }

  if (Array.isArray(data)) {
    const isEmpty = data.length === 0;
    return (
      <div className="json-tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
        <span
          className={`json-tree-toggle ${expanded ? 'expanded' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          {isEmpty ? '' : expanded ? '▼' : '▶'}
        </span>
        {name && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-bracket">[</span>
        {isEmpty ? (
          <span className="json-tree-bracket">]</span>
        ) : (
          <>
            <span className="json-tree-count">({data.length} items)</span>
            {expanded && (
              <div className="json-tree-children">
                {data.map((item, index) => (
                  <JsonTreeNode
                    key={index}
                    data={item}
                    name={`[${index}]`}
                    depth={depth + 1}
                    defaultExpanded={depth < 1}
                  />
                ))}
              </div>
            )}
            <div style={{ paddingLeft: `${depth * 16}px` }}>
              <span className="json-tree-bracket">]</span>
            </div>
          </>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    const isEmpty = keys.length === 0;
    return (
      <div className="json-tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
        <span
          className={`json-tree-toggle ${expanded ? 'expanded' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          {isEmpty ? '' : expanded ? '▼' : '▶'}
        </span>
        {name && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-bracket">{'{'}</span>
        {isEmpty ? (
          <span className="json-tree-bracket">{'}'}</span>
        ) : (
          <>
            <span className="json-tree-count">({keys.length} keys)</span>
            {expanded && (
              <div className="json-tree-children">
                {keys.map((key) => (
                  <JsonTreeNode
                    key={key}
                    data={data[key]}
                    name={key}
                    depth={depth + 1}
                    defaultExpanded={depth < 1}
                  />
                ))}
              </div>
            )}
            <div style={{ paddingLeft: `${depth * 16}px` }}>
              <span className="json-tree-bracket">{'}'}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};

JsonTreeNode.propTypes = {
  data: PropTypes.any,
  name: PropTypes.string,
  depth: PropTypes.number,
  defaultExpanded: PropTypes.bool
};

const ResultViewer = ({
  result,
  loading = false,
  error = null,
  maxHeight = '100%'
}) => {
  const [viewMode, setViewMode] = useState('beautified'); // 'beautified', 'tree', or 'raw'

  if (loading) {
    return (
      <div className="result-viewer-loading">
        <div className="result-viewer-spinner"></div>
        <div className="result-viewer-loading-text">Loading result...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-viewer-error">
        <div className="result-viewer-error-icon">⚠️</div>
        <div className="result-viewer-error-text">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-viewer-empty">
        <div className="result-viewer-empty-icon">📋</div>
        <div className="result-viewer-empty-text">No Result Available</div>
        <div className="result-viewer-empty-subtext">
          Result will appear when the stage completes
        </div>
      </div>
    );
  }

  return (
    <div className="result-viewer" style={{ maxHeight }}>
      <div className="result-viewer-toolbar">
        <div className="result-viewer-mode-toggle">
          <button
            type="button"
            className={`result-mode-btn ${viewMode === 'beautified' ? 'active' : ''}`}
            onClick={() => setViewMode('beautified')}
          >
            Beautified
          </button>
          <button
            type="button"
            className={`result-mode-btn ${viewMode === 'tree' ? 'active' : ''}`}
            onClick={() => setViewMode('tree')}
          >
            Tree
          </button>
          <button
            type="button"
            className={`result-mode-btn ${viewMode === 'raw' ? 'active' : ''}`}
            onClick={() => setViewMode('raw')}
          >
            Raw
          </button>
        </div>
      </div>

      <div className="result-viewer-content">
        {viewMode === 'beautified' ? (
          <BeautifiedResultViewer
            result={result}
            loading={loading}
            error={error}
            maxHeight="100%"
          />
        ) : viewMode === 'tree' ? (
          <div className="json-tree-container">
            <JsonTreeNode data={result} defaultExpanded={true} />
          </div>
        ) : (
          <pre className="result-raw-json">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

ResultViewer.propTypes = {
  /** The result object to display */
  result: PropTypes.object,
  /** Whether the result is loading */
  loading: PropTypes.bool,
  /** Error message if loading failed */
  error: PropTypes.string,
  /** Maximum height for the viewer */
  maxHeight: PropTypes.string
};

export default ResultViewer;
