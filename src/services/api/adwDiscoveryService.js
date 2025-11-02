/**
 * ADW Discovery Service
 * Fetches ADW metadata from the backend REST API
 */

class ADWDiscoveryService {
  constructor() {
    // Use VITE_BACKEND_URL from environment (required)
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('VITE_BACKEND_URL environment variable is required');
    }
    this.config = {
      baseUrl: backendUrl
    };
  }

  /**
   * Configure API connection parameters
   */
  configure(options = {}) {
    this.config = { ...this.config, ...options };
  }

  /**
   * Get API base URL
   */
  getApiBaseUrl() {
    return this.config.baseUrl;
  }

  /**
   * Fetch list of all available ADW IDs with metadata
   * @returns {Promise<Array>} Array of ADW objects with metadata
   */
  async listAdws() {
    try {
      const url = `${this.getApiBaseUrl()}/api/adws/list`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch ADW list: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.adws || [];
    } catch (error) {
      console.error('Error fetching ADW list:', error);
      throw error;
    }
  }

  /**
   * Fetch details for a specific ADW ID
   * @param {string} adwId - The ADW ID to fetch details for
   * @returns {Promise<Object>} ADW metadata object
   */
  async getAdwDetails(adwId) {
    try {
      const url = `${this.getApiBaseUrl()}/api/adws/${adwId}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`ADW ID '${adwId}' not found`);
        }
        throw new Error(`Failed to fetch ADW details: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching ADW details for ${adwId}:`, error);
      throw error;
    }
  }

  /**
   * Search/filter ADW list by various criteria
   * @param {Array} adws - List of ADW objects
   * @param {string} query - Search query string
   * @returns {Array} Filtered ADW list
   */
  filterAdws(adws, query) {
    if (!query || query.trim() === '') {
      return adws;
    }

    const lowerQuery = query.toLowerCase();

    return adws.filter(adw => {
      // Search by ADW ID
      if (adw.adw_id && adw.adw_id.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search by issue number
      if (adw.issue_number && adw.issue_number.toString().toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search by issue title
      if (adw.issue_title && adw.issue_title.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search by issue class
      if (adw.issue_class && adw.issue_class.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search by branch name
      if (adw.branch_name && adw.branch_name.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Sort ADW list by various criteria
   * @param {Array} adws - List of ADW objects
   * @param {string} sortBy - Sort criteria ('adw_id', 'issue_number', 'issue_class')
   * @param {string} order - Sort order ('asc' or 'desc')
   * @returns {Array} Sorted ADW list
   */
  sortAdws(adws, sortBy = 'adw_id', order = 'desc') {
    const sorted = [...adws].sort((a, b) => {
      let compareA = a[sortBy];
      let compareB = b[sortBy];

      // Handle null/undefined values
      if (compareA == null) return 1;
      if (compareB == null) return -1;

      // For issue_number, convert to number for proper sorting
      if (sortBy === 'issue_number') {
        compareA = parseInt(compareA, 10) || 0;
        compareB = parseInt(compareB, 10) || 0;
      }

      if (typeof compareA === 'string') {
        compareA = compareA.toLowerCase();
        compareB = compareB.toLowerCase();
      }

      if (compareA < compareB) return order === 'asc' ? -1 : 1;
      if (compareA > compareB) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  /**
   * Group ADW list by issue class
   * @param {Array} adws - List of ADW objects
   * @returns {Object} Grouped ADW list by issue class
   */
  groupByIssueClass(adws) {
    const grouped = {
      feature: [],
      bug: [],
      chore: [],
      other: []
    };

    adws.forEach(adw => {
      const issueClass = adw.issue_class || 'other';
      if (grouped[issueClass]) {
        grouped[issueClass].push(adw);
      } else {
        grouped.other.push(adw);
      }
    });

    return grouped;
  }
}

// Create and export singleton instance
const adwDiscoveryService = new ADWDiscoveryService();
export default adwDiscoveryService;
