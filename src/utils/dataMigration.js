/**
 * @fileoverview Data Migration Utility - Handles cleanup and migration of persisted data
 * Removes dummy projects from localStorage while preserving real user data
 */

const STORAGE_KEY = 'agentic-kanban-storage';
const MIGRATION_VERSION_KEY = 'agentic-kanban-migration-version';
const CURRENT_MIGRATION_VERSION = 2;

/**
 * Common dummy project identifiers and patterns
 */
const DUMMY_PROJECT_PATTERNS = [
  // Exact matches (case-insensitive)
  'demo',
  'test',
  'sample',
  'example',
  'dummy',
  'mock',
  'placeholder',
  'template',

  // Patterns that typically indicate demo projects
  /^demo[_-]?/i,
  /[_-]?demo$/i,
  /^test[_-]?/i,
  /[_-]?test$/i,
  /^sample[_-]?/i,
  /[_-]?sample$/i,
  /^example[_-]?/i,
  /[_-]?example$/i,
  /dummy/i,
  /mock/i,
  /placeholder/i,
  /template/i,
];

/**
 * Common dummy project paths that indicate test/demo projects
 */
const DUMMY_PATH_PATTERNS = [
  /\/demo[/]?/i,
  /\/test[/]?/i,
  /\/sample[/]?/i,
  /\/example[/]?/i,
  /\/dummy[/]?/i,
  /\/mock[/]?/i,
  /\/temp[/]?/i,
  /\/tmp[/]?/i,
  /playground/i,
];

/**
 * Checks if a project appears to be a dummy/demo project
 * @param {Object} project - Project object to check
 * @returns {boolean} - True if project appears to be dummy/demo
 */
function isDummyProject(project) {
  if (!project || typeof project !== 'object') {
    return false;
  }

  const { name = '', path = '', description = '' } = project;

  // Check project name against patterns
  for (const pattern of DUMMY_PROJECT_PATTERNS) {
    if (typeof pattern === 'string') {
      if (name.toLowerCase() === pattern.toLowerCase()) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(name)) {
        return true;
      }
    }
  }

  // Check project path against patterns
  for (const pathPattern of DUMMY_PATH_PATTERNS) {
    if (pathPattern.test(path)) {
      return true;
    }
  }

  // Check description for dummy indicators
  const dummyDescriptionKeywords = ['demo', 'test', 'sample', 'example', 'dummy', 'mock', 'placeholder'];
  const lowerDescription = description.toLowerCase();
  if (dummyDescriptionKeywords.some(keyword => lowerDescription.includes(keyword))) {
    return true;
  }

  // Check if path looks like a temporary or non-existent directory
  if (path.includes('/tmp/') || path.includes('/temp/') || path.includes('\\tmp\\') || path.includes('\\temp\\')) {
    return true;
  }

  return false;
}

/**
 * Detects dummy projects in a list of projects
 * @param {Array} projects - Array of project objects
 * @returns {Object} - Object with detected dummy and real projects
 */
function detectDummyProjects(projects) {
  if (!Array.isArray(projects)) {
    return { dummyProjects: [], realProjects: [] };
  }

  const dummyProjects = [];
  const realProjects = [];

  projects.forEach(project => {
    if (isDummyProject(project)) {
      dummyProjects.push(project);
    } else {
      realProjects.push(project);
    }
  });

  return { dummyProjects, realProjects };
}

/**
 * Gets the current stored data from localStorage
 * @returns {Object|null} - Parsed localStorage data or null if not found
 */
function getStoredData() {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      return null;
    }
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error parsing stored data:', error);
    return null;
  }
}

/**
 * Saves data to localStorage
 * @param {Object} data - Data to save
 * @returns {boolean} - True if successful, false otherwise
 */
function saveStoredData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
    return false;
  }
}

/**
 * Gets the current migration version
 * @returns {number} - Current migration version, defaults to 0 if not set
 */
function getMigrationVersion() {
  try {
    const version = localStorage.getItem(MIGRATION_VERSION_KEY);
    return version ? parseInt(version, 10) : 0;
  } catch (error) {
    console.error('Error getting migration version:', error);
    return 0;
  }
}

/**
 * Sets the migration version
 * @param {number} version - Version to set
 * @returns {boolean} - True if successful, false otherwise
 */
function setMigrationVersion(version) {
  try {
    localStorage.setItem(MIGRATION_VERSION_KEY, version.toString());
    return true;
  } catch (error) {
    console.error('Error setting migration version:', error);
    return false;
  }
}

/**
 * Creates a backup of current data before migration
 * @param {Object} data - Data to backup
 * @returns {string|null} - Backup key if successful, null otherwise
 */
function createBackup(data) {
  try {
    const timestamp = Date.now();
    const backupKey = `${STORAGE_KEY}-backup-${timestamp}`;
    localStorage.setItem(backupKey, JSON.stringify({
      data,
      timestamp,
      version: getMigrationVersion(),
      reason: 'pre-migration-backup'
    }));
    console.log(`Backup created: ${backupKey}`);
    return backupKey;
  } catch (error) {
    console.error('Error creating backup:', error);
    return null;
  }
}

/**
 * Performs migration v1: Remove dummy projects
 * @param {Object} data - Current stored data
 * @returns {Object} - Migrated data
 */
function migrateV1(data) {
  console.log('Running migration v1: Remove dummy projects');

  if (!data) {
    console.log('No data to migrate');
    return data;
  }

  const migrationResults = {
    removedProjects: [],
    preservedProjects: [],
    selectedProjectRemoved: false,
  };

  // Migrate availableProjects
  if (Array.isArray(data.availableProjects)) {
    const { dummyProjects, realProjects } = detectDummyProjects(data.availableProjects);

    data.availableProjects = realProjects;
    migrationResults.removedProjects = dummyProjects;
    migrationResults.preservedProjects = realProjects;

    console.log(`Removed ${dummyProjects.length} dummy projects`);
    console.log(`Preserved ${realProjects.length} real projects`);

    if (dummyProjects.length > 0) {
      console.log('Removed dummy projects:', dummyProjects.map(p => p.name || 'Unnamed'));
    }
  }

  // Check if selectedProject is a dummy project and remove it
  if (data.selectedProject && isDummyProject(data.selectedProject)) {
    console.log(`Removing selected dummy project: ${data.selectedProject.name || 'Unnamed'}`);
    data.selectedProject = null;
    migrationResults.selectedProjectRemoved = true;
  }

  // Filter out tasks that might be associated with dummy projects
  if (Array.isArray(data.tasks)) {
    const originalTaskCount = data.tasks.length;
    data.tasks = data.tasks.filter(task => {
      // If task has projectId, check if it matches a removed dummy project
      if (task.projectId) {
        const wasDummyProject = migrationResults.removedProjects.some(
          project => project.id === task.projectId
        );
        return !wasDummyProject;
      }
      // Keep tasks without projectId (they might be global tasks)
      return true;
    });

    const removedTaskCount = originalTaskCount - data.tasks.length;
    if (removedTaskCount > 0) {
      console.log(`Removed ${removedTaskCount} tasks associated with dummy projects`);
    }
  }

  console.log('Migration v1 completed successfully');
  return { ...data, migrationResults };
}

/**
 * Performs migration v2: Complete dummy project removal and deduplication
 * @param {Object} data - Current stored data
 * @returns {Object} - Migrated data
 */
function migrateV2(data) {
  console.log('Running migration v2: Complete dummy project removal and deduplication');

  if (!data) {
    console.log('No data to migrate');
    return data;
  }

  const migrationResults = {
    removedDummyProjects: [],
    removedDuplicateProjects: [],
    preservedProjects: [],
    selectedProjectRemoved: false,
    deduplicationPerformed: false,
  };

  // Step 1: Remove dummy projects completely
  if (Array.isArray(data.availableProjects)) {
    const { dummyProjects, realProjects } = detectDummyProjects(data.availableProjects);

    migrationResults.removedDummyProjects = dummyProjects;
    migrationResults.preservedProjects = realProjects;

    if (dummyProjects.length > 0) {
      console.log(`Completely removing ${dummyProjects.length} dummy projects`);
      console.log('Removed dummy projects:', dummyProjects.map(p => p.name || 'Unnamed'));
      data.availableProjects = realProjects;
    }
  }

  // Step 2: Deduplicate projects
  if (Array.isArray(data.availableProjects) && data.availableProjects.length > 0) {
    const originalCount = data.availableProjects.length;
    const deduplicated = deduplicateProjectsByNameAndPath(data.availableProjects);

    if (deduplicated.length < originalCount) {
      const duplicatesRemoved = originalCount - deduplicated.length;
      console.log(`Removed ${duplicatesRemoved} duplicate projects during migration`);

      migrationResults.deduplicationPerformed = true;
      migrationResults.removedDuplicateProjects = data.availableProjects.slice(deduplicated.length);
      data.availableProjects = deduplicated;
    }
  }

  // Step 3: Validate and remove dummy selected project
  if (data.selectedProject && isDummyProject(data.selectedProject)) {
    console.log(`Removing selected dummy project: ${data.selectedProject.name || 'Unnamed'}`);
    data.selectedProject = null;
    migrationResults.selectedProjectRemoved = true;
  }

  // Step 4: Clean up tasks associated with removed projects
  if (Array.isArray(data.tasks)) {
    const originalTaskCount = data.tasks.length;

    // Get all removed project IDs
    const removedProjectIds = new Set([
      ...migrationResults.removedDummyProjects.map(p => p.id),
      ...migrationResults.removedDuplicateProjects.map(p => p.id)
    ].filter(Boolean));

    data.tasks = data.tasks.filter(task => {
      if (task.projectId && removedProjectIds.has(task.projectId)) {
        return false; // Remove task associated with removed project
      }
      return true; // Keep task
    });

    const removedTaskCount = originalTaskCount - data.tasks.length;
    if (removedTaskCount > 0) {
      console.log(`Removed ${removedTaskCount} tasks associated with removed projects`);
    }
  }

  // Step 5: Add migration metadata
  if (!data.migrationHistory) {
    data.migrationHistory = [];
  }

  data.migrationHistory.push({
    version: 2,
    timestamp: new Date().toISOString(),
    operation: 'complete-cleanup-and-deduplication',
    results: migrationResults
  });

  console.log('Migration v2 completed successfully');
  return { ...data, migrationResults };
}

/**
 * Deduplicate projects based on name and path, keeping the most recent
 * @param {Array} projects - Array of project objects
 * @returns {Array} - Deduplicated projects
 */
function deduplicateProjectsByNameAndPath(projects) {
  const seen = new Map();
  const unique = [];

  for (const project of projects) {
    const key = `${project.name}|${project.path}`;

    if (!seen.has(key)) {
      seen.set(key, project);
      unique.push(project);
    } else {
      // Keep the more recent project
      const existing = seen.get(key);
      const currentDate = new Date(project.updatedAt || project.createdAt || 0);
      const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);

      if (currentDate > existingDate) {
        // Replace with newer project
        const index = unique.findIndex(p => p === existing);
        if (index !== -1) {
          unique[index] = project;
          seen.set(key, project);
        }
      }
    }
  }

  return unique;
}

/**
 * Validates that project data doesn't contain dummy projects or duplicates
 * @param {Object} data - Data to validate
 * @returns {Object} - Validation results
 */
function validateProjectDataIntegrity(data) {
  const issues = [];
  const warnings = [];

  if (!data) {
    return { isValid: true, issues: [], warnings: [], message: 'No data to validate' };
  }

  // Check for dummy projects
  if (Array.isArray(data.availableProjects)) {
    const { dummyProjects } = detectDummyProjects(data.availableProjects);
    if (dummyProjects.length > 0) {
      issues.push(`Found ${dummyProjects.length} dummy projects in storage`);
    }

    // Check for duplicates
    const originalCount = data.availableProjects.length;
    const uniqueProjects = deduplicateProjectsByNameAndPath(data.availableProjects);
    const duplicateCount = originalCount - uniqueProjects.length;

    if (duplicateCount > 0) {
      warnings.push(`Found ${duplicateCount} duplicate projects`);
    }

    // Check for projects without required fields
    const invalidProjects = data.availableProjects.filter(p =>
      !p.name || !p.path || typeof p.name !== 'string' || typeof p.path !== 'string'
    );

    if (invalidProjects.length > 0) {
      issues.push(`Found ${invalidProjects.length} projects with missing required fields`);
    }
  }

  // Check selected project
  if (data.selectedProject && isDummyProject(data.selectedProject)) {
    issues.push('Selected project is a dummy project');
  }

  const isValid = issues.length === 0;
  const message = isValid
    ? (warnings.length > 0 ? `Valid with ${warnings.length} warnings` : 'Data integrity is valid')
    : `Found ${issues.length} integrity issues`;

  return {
    isValid,
    issues,
    warnings,
    message,
    stats: {
      totalProjects: data.availableProjects?.length || 0,
      totalTasks: data.tasks?.length || 0,
      hasSelectedProject: !!data.selectedProject
    }
  };
}

/**
 * Runs all necessary migrations
 * @returns {Object} - Migration results
 */
function runMigrations() {
  const currentVersion = getMigrationVersion();
  const targetVersion = CURRENT_MIGRATION_VERSION;

  if (currentVersion >= targetVersion) {
    console.log(`No migration needed. Current version: ${currentVersion}, Target: ${targetVersion}`);
    return { success: true, migrationsRun: 0, currentVersion, targetVersion };
  }

  console.log(`Running migrations from version ${currentVersion} to ${targetVersion}`);

  let data = getStoredData();
  let migrationsRun = 0;
  let migrationResults = {};

  // Create backup before migration
  if (data) {
    createBackup(data);
  }

  // Run migrations sequentially
  if (currentVersion < 1) {
    try {
      const result = migrateV1(data);
      data = result;
      migrationResults.v1 = result.migrationResults;
      migrationsRun++;
      console.log('Migration v1 completed');
    } catch (error) {
      console.error('Migration v1 failed:', error);
      return { success: false, error: error.message, migrationsRun, currentVersion, targetVersion };
    }
  }

  if (currentVersion < 2) {
    try {
      const result = migrateV2(data);
      data = result;
      migrationResults.v2 = result.migrationResults;
      migrationsRun++;
      console.log('Migration v2 completed');
    } catch (error) {
      console.error('Migration v2 failed:', error);
      return { success: false, error: error.message, migrationsRun, currentVersion, targetVersion };
    }
  }

  // Save migrated data and update version
  if (migrationsRun > 0) {
    const success = saveStoredData(data);
    if (!success) {
      console.error('Failed to save migrated data');
      return { success: false, error: 'Failed to save migrated data', migrationsRun, currentVersion, targetVersion };
    }

    setMigrationVersion(targetVersion);
    console.log(`All migrations completed. Updated version to ${targetVersion}`);
  }

  return {
    success: true,
    migrationsRun,
    currentVersion,
    targetVersion: targetVersion,
    migrationResults
  };
}

/**
 * Manually removes all dummy projects from localStorage
 * @returns {Object} - Cleanup results
 */
function manualCleanup() {
  console.log('Performing manual cleanup of dummy projects');

  const data = getStoredData();
  if (!data) {
    console.log('No data found in localStorage');
    return { success: true, removedProjects: 0, preservedProjects: 0 };
  }

  // Create backup
  createBackup(data);

  const result = migrateV1(data);
  const success = saveStoredData(result);

  if (success) {
    console.log('Manual cleanup completed successfully');
    return {
      success: true,
      removedProjects: result.migrationResults?.removedProjects?.length || 0,
      preservedProjects: result.migrationResults?.preservedProjects?.length || 0,
      selectedProjectRemoved: result.migrationResults?.selectedProjectRemoved || false
    };
  } else {
    console.error('Failed to save cleaned data');
    return { success: false, error: 'Failed to save cleaned data' };
  }
}

/**
 * Validates that no dummy projects exist in current data
 * @returns {Object} - Validation results
 */
function validateNoDummyProjects() {
  const data = getStoredData();
  if (!data) {
    return { isValid: true, dummyProjects: [], message: 'No data found' };
  }

  const availableProjects = data.availableProjects || [];
  const { dummyProjects } = detectDummyProjects(availableProjects);

  const selectedProjectIsDummy = data.selectedProject ? isDummyProject(data.selectedProject) : false;

  return {
    isValid: dummyProjects.length === 0 && !selectedProjectIsDummy,
    dummyProjects,
    selectedProjectIsDummy,
    message: dummyProjects.length === 0 && !selectedProjectIsDummy
      ? 'No dummy projects found'
      : `Found ${dummyProjects.length} dummy projects${selectedProjectIsDummy ? ' and selected project is dummy' : ''}`
  };
}

/**
 * Gets information about current localStorage state
 * @returns {Object} - Storage information
 */
function getStorageInfo() {
  const data = getStoredData();
  const migrationVersion = getMigrationVersion();
  const validation = validateNoDummyProjects();

  return {
    hasData: !!data,
    migrationVersion,
    currentTargetVersion: CURRENT_MIGRATION_VERSION,
    needsMigration: migrationVersion < CURRENT_MIGRATION_VERSION,
    validation,
    projectCount: data?.availableProjects?.length || 0,
    taskCount: data?.tasks?.length || 0,
    hasSelectedProject: !!data?.selectedProject,
    storageSize: localStorage.getItem(STORAGE_KEY)?.length || 0
  };
}

// Export all functions
export {
  isDummyProject,
  detectDummyProjects,
  runMigrations,
  manualCleanup,
  validateNoDummyProjects,
  validateProjectDataIntegrity,
  deduplicateProjectsByNameAndPath,
  getStorageInfo,
  createBackup,
  getMigrationVersion,
  setMigrationVersion,
  CURRENT_MIGRATION_VERSION,
  STORAGE_KEY
};

export default {
  isDummyProject,
  detectDummyProjects,
  runMigrations,
  manualCleanup,
  validateNoDummyProjects,
  validateProjectDataIntegrity,
  deduplicateProjectsByNameAndPath,
  getStorageInfo,
  createBackup,
  getMigrationVersion,
  setMigrationVersion,
  CURRENT_MIGRATION_VERSION,
  STORAGE_KEY
};