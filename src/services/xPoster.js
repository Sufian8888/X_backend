const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function resolvePythonExecutable() {
  const candidates = [
    path.join(__dirname, '../..', 'venv', 'bin', 'python3'),
    path.join(__dirname, '../../..', 'venv', 'bin', 'python3'),
    process.env.PYTHON_EXECUTABLE,
    'python3',
  ].filter(Boolean);

  return candidates.find((candidate) => candidate === 'python3' || fs.existsSync(candidate));
}

function getAutomationError(error) {
  const stderr = error.stderr ? String(error.stderr).trim() : '';
  const stdout = error.stdout ? String(error.stdout).trim() : '';
  const output = stderr || stdout;

  if (!output) {
    return 'Python automation failed';
  }

  const usefulLine = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse()
    .find((line) => !line.startsWith('File "') && !line.startsWith('Traceback'));

  return usefulLine || 'Python automation failed';
}

function findExecutableInDir(dir) {
  if (!dir || !fs.existsSync(dir)) {
    return null;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && entry.name === 'chrome' && fullPath.includes('chrome-linux')) {
      return fullPath;
    }

    if (entry.isDirectory()) {
      const found = findExecutableInDir(fullPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function getPuppeteerExecutablePath() {
  const originalPuppeteerPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const originalChromeBin = process.env.CHROME_BIN;
  const originalCacheDir = process.env.PUPPETEER_CACHE_DIR;

  delete process.env.PUPPETEER_EXECUTABLE_PATH;
  delete process.env.CHROME_BIN;
  process.env.PUPPETEER_CACHE_DIR = path.join(process.cwd(), '.cache', 'puppeteer');
  delete require.cache[require.resolve('puppeteer')];

  const puppeteer = require('puppeteer');
  const executable = puppeteer.executablePath();

  if (originalPuppeteerPath) {
    process.env.PUPPETEER_EXECUTABLE_PATH = originalPuppeteerPath;
  }

  if (originalChromeBin) {
    process.env.CHROME_BIN = originalChromeBin;
  }

  if (originalCacheDir) {
    process.env.PUPPETEER_CACHE_DIR = originalCacheDir;
  } else {
    delete process.env.PUPPETEER_CACHE_DIR;
  }

  return executable;
}

function resolveChromeExecutable(env) {
  const configuredChrome = env.PUPPETEER_EXECUTABLE_PATH || env.CHROME_BIN;

  if (configuredChrome && fs.existsSync(configuredChrome)) {
    return configuredChrome;
  }

  const cacheDirs = [
    env.PUPPETEER_CACHE_DIR,
    path.join(process.cwd(), '.cache', 'puppeteer'),
    path.join(process.cwd(), 'node_modules', '.cache', 'puppeteer'),
    path.join(os.homedir(), '.cache', 'puppeteer'),
  ];

  for (const cacheDir of cacheDirs) {
    const executable = findExecutableInDir(cacheDir);
    if (executable) {
      return executable;
    }
  }

  const executable = getPuppeteerExecutablePath();

  if (!fs.existsSync(executable)) {
    throw new Error(
      `Chrome executable was not found. Resolved path: ${executable}. Clear Render build cache and redeploy.`
    );
  }

  return executable;
}

function runXAutomation(args) {
  const pythonScript = path.join(__dirname, 'x_poster_undetected.py');
  const pythonExecutable = resolvePythonExecutable();
  const env = { ...process.env };
  const chromePath = resolveChromeExecutable(env);

  env.PUPPETEER_EXECUTABLE_PATH = chromePath;
  env.CHROME_BIN = chromePath;

  let output;

  try {
    output = execFileSync(pythonExecutable, [pythonScript, ...args], {
      cwd: path.join(__dirname, '../..'),
      env,
      encoding: 'utf-8',
      timeout: 240000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(getAutomationError(error));
  }

  const jsonLine = output
    .trim()
    .split('\n')
    .reverse()
    .find((line) => line.trim().startsWith('{'));

  if (!jsonLine) {
    throw new Error('Automation did not return a JSON result');
  }

  return JSON.parse(jsonLine);
}

async function loginToX(options = {}) {
  try {
    const username = options.username || process.env.X_USERNAME || '';
    const password = options.password || process.env.X_PASSWORD || '';

    console.log(`[*] Executing X login with: ${username}`);
    return runXAutomation(['--login', username, password]);
  } catch (error) {
    console.error('[ERROR] Failed to login to X:', error.message);
    return {
      ok: false,
      error: error.message || 'Failed to login to X',
      message: 'Login failed',
    };
  }
}

async function postToX(text, options = {}) {
  try {
    const username = options.username || process.env.X_USERNAME || '';
    const password = options.password || process.env.X_PASSWORD || '';

    console.log(`[*] Executing X posting with: ${username}`);
    return runXAutomation(['--post', text, username, password]);
  } catch (error) {
    console.error('[ERROR] Failed to post to X:', error.message);
    return {
      ok: false,
      error: error.message || 'Failed to post to X',
      message: 'Posting failed',
    };
  }
}

async function searchXHandlers(query, options = {}) {
  try {
    const username = options.username || process.env.X_USERNAME || '';
    const password = options.password || process.env.X_PASSWORD || '';
    const maxResults = String(options.maxResults || 30);
    const scrollRounds = String(options.scrollRounds || 8);

    console.log(`[*] Executing X handler search with: ${username}`);
    return runXAutomation(['--search-handlers', query, username, password, maxResults, scrollRounds]);
  } catch (error) {
    console.error('[ERROR] Failed to search X handlers:', error.message);
    return {
      ok: false,
      error: error.message || 'Failed to search X handlers',
      message: 'Handler search failed',
    };
  }
}

module.exports = {
  loginToX,
  postToX,
  searchXHandlers,
};
