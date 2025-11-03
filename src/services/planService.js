/**
 * Plan Service
 * Handles reading plan file content for tasks
 */

// Import all plan files at build time using Vite's import.meta.glob
const planFiles = import.meta.glob('/specs/**/*.md', {
  as: 'raw',
  eager: true
});

class PlanService {
  constructor() {
    this.contentCache = new Map();

    // Create a mapping of normalized paths to content for quick lookup
    this.fileMapping = new Map();
    this.initializeFileMapping();
  }

  /**
   * Initialize the file mapping from imported plan files
   */
  initializeFileMapping() {
    for (const [importPath, content] of Object.entries(planFiles)) {
      // Normalize the path to match what we'll search for
      const normalizedPath = importPath.replace(/^\//, '');
      this.fileMapping.set(normalizedPath, content);

      // Also support absolute paths starting with ./
      const relativePath = `./${normalizedPath}`;
      this.fileMapping.set(relativePath, content);

      // Support paths that might include the full project path
      const fileName = importPath.split('/').pop();
      if (fileName) {
        this.fileMapping.set(fileName, content);
      }
    }

    console.log(`Loaded ${this.fileMapping.size / 3} plan files`);
  }

  /**
   * Get plan for a task based on issue number and ADW ID
   * @param {number|string} issueNumber - The issue/task number
   * @param {string} adwId - The ADW ID for the task
   * @returns {object|null} - Object with planPath and content, or null if not found
   */
  getPlanForTask(issueNumber, adwId) {
    if (!issueNumber || !adwId) {
      console.warn('getPlanForTask: Missing issueNumber or adwId', { issueNumber, adwId });
      return null;
    }

    // Plan files follow the pattern: issue-{issue-number}-adw-{adw-id}-sdlc_planner-*.md
    const pattern = `issue-${issueNumber}-adw-${adwId}-sdlc_planner-`;

    // Search for matching plan file
    for (const [path, content] of this.fileMapping) {
      if (path.includes(pattern)) {
        console.log(`Found plan file: ${path}`);
        return {
          planPath: path,
          content: content
        };
      }
    }

    console.warn(`No plan found for issue ${issueNumber} with ADW ID ${adwId}`);
    return null;
  }

  /**
   * Fetch plan content by path
   * @param {string} planPath - The path to the plan file
   * @returns {string|null} - The plan content, or null if not found
   */
  fetchPlanContent(planPath) {
    // Check cache first
    if (this.contentCache.has(planPath)) {
      return this.contentCache.get(planPath);
    }

    try {
      // Try exact match first
      if (this.fileMapping.has(planPath)) {
        const content = this.fileMapping.get(planPath);
        this.contentCache.set(planPath, content);
        return content;
      }

      // Try normalized variations
      const normalizedPath = planPath.replace(/^\.\//, '');
      if (this.fileMapping.has(normalizedPath)) {
        const content = this.fileMapping.get(normalizedPath);
        this.contentCache.set(planPath, content);
        return content;
      }

      // Try with ./ prefix
      const withPrefix = `./${normalizedPath}`;
      if (this.fileMapping.has(withPrefix)) {
        const content = this.fileMapping.get(withPrefix);
        this.contentCache.set(planPath, content);
        return content;
      }

      // Try just the filename
      const fileName = planPath.split('/').pop();
      if (fileName && this.fileMapping.has(fileName)) {
        const content = this.fileMapping.get(fileName);
        this.contentCache.set(planPath, content);
        return content;
      }

      console.warn(`Plan content not found for path: ${planPath}`);
      return null;
    } catch (error) {
      console.error(`Failed to fetch plan content from ${planPath}:`, error);
      return null;
    }
  }

  /**
   * Get all available plan files
   * @returns {Array} - Array of plan file paths
   */
  getAllPlanFiles() {
    const uniquePaths = new Set();
    for (const [path] of this.fileMapping) {
      // Only include normalized paths (without ./ prefix)
      if (!path.startsWith('./') && path.startsWith('specs/')) {
        uniquePaths.add(path);
      }
    }
    return Array.from(uniquePaths);
  }

  /**
   * Clear content cache
   */
  clearCache() {
    this.contentCache.clear();
  }

  /**
   * Get cached content info
   */
  getCacheInfo() {
    return {
      size: this.contentCache.size,
      keys: Array.from(this.contentCache.keys()),
    };
  }
}

// Create and export singleton instance
const planService = new PlanService();
export default planService;
