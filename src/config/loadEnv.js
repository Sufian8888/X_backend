const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function loadEnvironment() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath });
      return filePath;
    }
  }

  dotenv.config();
  return null;
}

module.exports = {
  loadEnvironment,
};
