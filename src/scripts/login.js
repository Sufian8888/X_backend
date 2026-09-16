const readline = require('node:readline');
const { loadEnvironment } = require('../config/loadEnv');
const { getLoginProfileDir, launchBrowser } = require('../utils/browser');

loadEnvironment();

function waitForEnter(message) {
  const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    input.question(message, () => {
      input.close();
      resolve();
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fillLoginForm(page, username, password) {
  const usernameSelectors = [
    'input[name="text"]',
    'input[name="username_or_email"]',
    'input[autocomplete="username"]',
  ];

  const passwordSelectors = ['input[name="password"]', 'input[type="password"]'];

  for (const selector of usernameSelectors) {
    const field = await page.$(selector);
    if (field) {
      await field.click({ clickCount: 3 });
      await field.type(username, { delay: 20 });
      break;
    }
  }

  await page.keyboard.press('Enter');
  await sleep(1500);

  for (const selector of passwordSelectors) {
    const field = await page.$(selector);
    if (field) {
      await field.click({ clickCount: 3 });
      await field.type(password, { delay: 20 });
      break;
    }
  }

  await page.keyboard.press('Enter');
}

async function main() {
  const loginProfileDir = getLoginProfileDir();
  console.log(`Using persistent login profile: ${loginProfileDir}`);

  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;

  const browser = await launchBrowser({
    headless: false,
    persistent: true,
  });
  const page = await browser.newPage();

  await page.goto('https://x.com/login', { waitUntil: 'networkidle2', timeout: 60000 });

  if (username && password) {
    await fillLoginForm(page, username, password);
    console.log('Login credentials were filled from .env. If X shows a challenge or extra step, finish it in the browser.');
  } else {
    console.log('X_USERNAME and X_PASSWORD were not found in .env, so please log in manually in the opened browser.');
  }

  console.log('Once you are logged in, press Enter here to save the session.');

  await waitForEnter('Press Enter after login... ');

  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  console.log('Session saved.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
