import express from 'express';
import cors from 'cors';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to validate file path
function validateCommandPath(filePath) {
  const commandsDir = path.join(__dirname, '.claude', 'commands');
  const resolvedPath = path.resolve(filePath);
  const normalizedCommandsDir = path.resolve(commandsDir);

  // Ensure the path is within the .claude/commands directory
  if (!resolvedPath.startsWith(normalizedCommandsDir)) {
    throw new Error('Invalid file path: must be within .claude/commands directory');
  }

  return resolvedPath;
}

// API endpoint to read command files
app.post('/api/commands/read', async (req, res) => {
  try {
    const { path: filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const validatedPath = validateCommandPath(filePath);

    if (!existsSync(validatedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = await readFile(validatedPath, 'utf-8');
    const stats = await import('fs').then(fs => fs.promises.stat(validatedPath));

    res.json({
      content,
      lastModified: stats.mtime.toISOString(),
      path: filePath,
    });
  } catch (error) {
    console.error('Error reading command file:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to write command files
app.post('/api/commands/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    const validatedPath = validateCommandPath(filePath);

    await writeFile(validatedPath, content, 'utf-8');
    const stats = await import('fs').then(fs => fs.promises.stat(validatedPath));

    res.json({
      success: true,
      lastModified: stats.mtime.toISOString(),
      path: filePath,
    });
  } catch (error) {
    console.error('Error writing command file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Command content API server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});