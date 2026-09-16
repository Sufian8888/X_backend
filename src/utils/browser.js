const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');

const loginProfileDir = path.join(os.homedir(), '.x-poster-profile');

function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function createTempProfileDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'x-poster-'));
}

async function launchBrowser({ headless = true, persistent = false, userDataDir } = {}) {
  const profileDir = userDataDir || (persistent ? loginProfileDir : createTempProfileDir());
  fs.mkdirSync(profileDir, { recursive: true });

  const executablePath = resolveExecutablePath();
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
  ];

  if (!persistent && headless) {
    args.push('--no-zygote', '--single-process');
  }

  const launchOptions = {
    headless,
    userDataDir: profileDir,
    args,
    defaultViewport: null,
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  return puppeteer.launch(launchOptions);
}

function getLoginProfileDir() {
  return loginProfileDir;
}

module.exports = {
  launchBrowser,
  createTempProfileDir,
  getLoginProfileDir,
};
