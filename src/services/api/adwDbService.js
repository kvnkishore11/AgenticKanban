/**
 * @fileoverview ADW Database Service - API client for database-backed ADW operations
 *
 * Provides methods to interact with the database-backed ADW state management system:
 * - Create, read, update, delete ADW states
 * - Query ADW activity history
 * - Allocate issue numbers
 * - Health checks
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8502';

/**
 * ADW Database Service
 *
 * API client for database-backed ADW operations
 */
class AdwDbService {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Helper method to make API requests with error handling
   *
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Create a new ADW state in the database
   *
   * @param {Object} adwData - ADW state data
   * @param {string} adwData.adw_id - ADW identifier (8 characters)
   * @param {number} [adwData.issue_number] - Issue number
   * @param {string} [adwData.issue_title] - Issue title
   * @param {string} [adwData.issue_body] - Issue body
   * @param {string} [adwData.issue_class] - Issue class (feature, bug, chore, patch)
   * @param {string} [adwData.branch_name] - Git branch name
   * @param {string} [adwData.worktree_path] - Worktree path
   * @param {string} [adwData.current_stage] - Current stage (default: backlog)
   * @param {string} [adwData.status] - Status (default: pending)
   * @param {string} [adwData.workflow_name] - Workflow name
   * @param {string} [adwData.model_set] - Model set (base, heavy)
   * @param {string} [adwData.data_source] - Data source (github, kanban)
   * @param {Object} [adwData.issue_json] - Full issue JSON
   * @param {Object} [adwData.orchestrator_state] - Orchestrator state
   * @param {number} [adwData.backend_port] - Backend port
   * @param {number} [adwData.websocket_port] - WebSocket port
   * @param {number} [adwData.frontend_port] - Frontend port
   * @returns {Promise<Object>} Created ADW state
   */
  async createAdw(adwData) {
    return await this.request('/api/adws', {
      method: 'POST',
      body: JSON.stringify(adwData),
    });
  }

  /**
   * Get a single ADW by ID
   *
   * @param {string} adwId - ADW identifier
   * @returns {Promise<Object>} ADW state
   */
  async getAdw(adwId) {
    return await this.request(`/api/adws/${adwId}`);
  }

  /**
   * List all ADWs with optional filtering
   *
   * @param {Object} filters - Optional filters
   * @param {string} [filters.status] - Filter by status
   * @param {string} [filters.stage] - Filter by current stage
   * @param {boolean} [filters.is_stuck] - Filter by stuck status
   * @param {boolean} [filters.include_deleted] - Include soft-deleted ADWs
   * @returns {Promise<Object>} List response with adws array and total_count
   */
  async listAdws(filters = {}) {
    const queryParams = new URLSearchParams();

    if (filters.status) queryParams.append('status', filters.status);
    if (filters.stage) queryParams.append('stage', filters.stage);
    if (filters.is_stuck !== undefined) queryParams.append('is_stuck', filters.is_stuck);
    if (filters.include_deleted) queryParams.append('include_deleted', filters.include_deleted);

    const queryString = queryParams.toString();
    const endpoint = `/api/adws${queryString ? `?${queryString}` : ''}`;

    return await this.request(endpoint);
  }

  /**
   * Update an ADW state
   *
   * @param {string} adwId - ADW identifier
   * @param {Object} updateData - Fields to update
   * @param {string} [updateData.current_stage] - Current stage
   * @param {string} [updateData.status] - Status
   * @param {boolean} [updateData.is_stuck] - Stuck flag
   * @param {string} [updateData.issue_title] - Issue title
   * @param {string} [updateData.issue_body] - Issue body
   * @param {string} [updateData.issue_class] - Issue class
   * @param {string} [updateData.branch_name] - Branch name
   * @param {string} [updateData.worktree_path] - Worktree path
   * @param {string} [updateData.workflow_name] - Workflow name
   * @param {Object} [updateData.orchestrator_state] - Orchestrator state
   * @param {string} [updateData.patch_file] - Patch file path
   * @param {Array} [updateData.patch_history] - Patch history
   * @param {string} [updateData.completed_at] - Completion timestamp
   * @returns {Promise<Object>} Updated ADW state
   */
  async updateAdw(adwId, updateData) {
    return await this.request(`/api/adws/${adwId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Delete an ADW (soft delete by default)
   *
   * Note: This will also trigger worktree and agent directory cleanup
   *
   * @param {string} adwId - ADW identifier
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteAdw(adwId) {
    // Use the existing DELETE endpoint from adws.py which handles cleanup
    return await this.request(`/api/adws/${adwId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Log an activity event for an ADW
   *
   * @param {string} adwId - ADW identifier
   * @param {Object} activityData - Activity log data
   * @param {string} activityData.event_type - Event type
   * @param {Object} [activityData.event_data] - Event data
   * @param {string} [activityData.field_changed] - Field that changed
   * @param {string} [activityData.old_value] - Old value
   * @param {string} [activityData.new_value] - New value
   * @param {string} [activityData.user] - User who triggered the action
   * @param {string} [activityData.workflow_step] - Workflow step
   * @returns {Promise<Object>} Created activity log entry
   */
  async logActivity(adwId, activityData) {
    return await this.request(`/api/adws/${adwId}/activity`, {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  }

  /**
   * Get activity history for an ADW
   *
   * @param {string} adwId - ADW identifier
   * @param {Object} options - Pagination options
   * @param {number} [options.page] - Page number (1-indexed)
   * @param {number} [options.page_size] - Items per page
   * @returns {Promise<Object>} Activity history with pagination info
   */
  async getActivityHistory(adwId, options = {}) {
    const queryParams = new URLSearchParams();

    if (options.page) queryParams.append('page', options.page);
    if (options.page_size) queryParams.append('page_size', options.page_size);

    const queryString = queryParams.toString();
    const endpoint = `/api/adws/${adwId}/activity${queryString ? `?${queryString}` : ''}`;

    return await this.request(endpoint);
  }

  /**
   * Detect and flag stuck workflows
   *
   * @param {string} [adwId] - Optional specific ADW to check (if null, checks all)
   * @returns {Promise<Object>} Count of stuck workflows detected
   */
  async detectStuckWorkflows(adwId = null) {
    const endpoint = adwId
      ? `/api/adws/${adwId}/detect-stuck`
      : '/api/adws/detect-stuck';

    return await this.request(endpoint, {
      method: 'POST',
    });
  }

  /**
   * Allocate the next sequential issue number
   *
   * @param {Object} issueData - Issue data
   * @param {string} issueData.issue_title - Issue title
   * @param {string} [issueData.project_id] - Project ID (default: "default")
   * @param {string} [issueData.adw_id] - ADW ID to link to this issue
   * @returns {Promise<Object>} Allocated issue number and details
   */
  async allocateIssueNumber(issueData) {
    return await this.request('/api/issues/allocate', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  /**
   * Get a specific issue by number
   *
   * @param {number} issueNumber - Issue number
   * @returns {Promise<Object>} Issue details
   */
  async getIssue(issueNumber) {
    return await this.request(`/api/issues/${issueNumber}`);
  }

  /**
   * List all issues
   *
   * @param {Object} options - List options
   * @param {string} [options.project_id] - Filter by project ID
   * @param {boolean} [options.include_deleted] - Include soft-deleted issues
   * @param {number} [options.page] - Page number (1-indexed)
   * @param {number} [options.page_size] - Items per page
   * @returns {Promise<Array>} List of issues
   */
  async listIssues(options = {}) {
    const queryParams = new URLSearchParams();

    if (options.project_id) queryParams.append('project_id', options.project_id);
    if (options.include_deleted) queryParams.append('include_deleted', options.include_deleted);
    if (options.page) queryParams.append('page', options.page);
    if (options.page_size) queryParams.append('page_size', options.page_size);

    const queryString = queryParams.toString();
    const endpoint = `/api/issues${queryString ? `?${queryString}` : ''}`;

    return await this.request(endpoint);
  }

  /**
   * Check database health
   *
   * @returns {Promise<Object>} Health check status
   */
  async healthCheck() {
    return await this.request('/api/health');
  }

  /**
   * Get list of completed ADWs
   *
   * Convenience method that filters by status=completed
   *
   * @returns {Promise<Object>} List of completed ADWs
   */
  async getCompletedAdws() {
    return await this.listAdws({ status: 'completed' });
  }

  /**
   * Get list of stuck ADWs
   *
   * Convenience method that filters by is_stuck=true
   *
   * @returns {Promise<Object>} List of stuck ADWs
   */
  async getStuckAdws() {
    return await this.listAdws({ is_stuck: true });
  }

  /**
   * Get list of active (non-completed, non-errored) ADWs
   *
   * Convenience method that filters for in-progress ADWs
   *
   * @returns {Promise<Object>} List of active ADWs
   */
  async getActiveAdws() {
    return await this.listAdws({ status: 'in_progress' });
  }
}

// Create singleton instance
const adwDbService = new AdwDbService();

export default adwDbService;
