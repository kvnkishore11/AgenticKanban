/**
 * @fileoverview Patch Tabs Panel Component
 *
 * Displays horizontal tabs for patch selection.
 * Each tab shows the patch number and status indicator.
 *
 * @module components/kanban/PatchTabsPanel
 */

import PropTypes from 'prop-types';

const PatchTabsPanel = ({
  patches = [],
  activePatch = null,
  onPatchSelect
}) => {
  if (!patches || patches.length === 0) {
    return null;
  }

  const getStatusIndicator = (status) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '⟳';
      case 'failed':
        return '✗';
      case 'pending':
      default:
        return '○';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'patch-tab-completed';
      case 'in_progress':
        return 'patch-tab-active';
      case 'failed':
        return 'patch-tab-failed';
      case 'pending':
      default:
        return 'patch-tab-pending';
    }
  };

  return (
    <div className="patch-tabs-panel">
      <div className="patch-tab-separator"></div>
      <div className="patch-tabs-container">
        {patches.map((patch) => {
          const isActive = activePatch?.patch_number === patch.patch_number;
          const status = patch.status || 'pending';
          const statusClass = getStatusClass(status);

          return (
            <button
              key={patch.patch_number}
              type="button"
              className={`patch-tab-btn ${isActive ? 'selected' : ''} ${statusClass}`}
              onClick={() => onPatchSelect(patch)}
              title={`Patch ${patch.patch_number} - ${status}`}
            >
              <span className="patch-tab-icon">🔧</span>
              <span className="patch-tab-name">PATCH {patch.patch_number}</span>
              <span className="patch-tab-status-indicator">{getStatusIndicator(status)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

PatchTabsPanel.propTypes = {
  /** Array of patch objects with patch_number, status, patch_reason, etc. */
  patches: PropTypes.arrayOf(
    PropTypes.shape({
      patch_number: PropTypes.number.isRequired,
      status: PropTypes.oneOf(['pending', 'in_progress', 'completed', 'failed']),
      patch_reason: PropTypes.string,
      timestamp: PropTypes.string,
      adw_id: PropTypes.string
    })
  ),
  /** Currently active/selected patch */
  activePatch: PropTypes.shape({
    patch_number: PropTypes.number,
    status: PropTypes.string,
    patch_reason: PropTypes.string,
    timestamp: PropTypes.string,
    adw_id: PropTypes.string
  }),
  /** Callback when a patch is selected */
  onPatchSelect: PropTypes.func.isRequired
};

export default PatchTabsPanel;
