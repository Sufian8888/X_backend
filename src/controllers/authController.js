const crypto = require('crypto');

// In-memory token store. Tokens are generated on login and validated on each
// protected request. In a production app you would use JWT or a database-backed
// session store, but for this single-admin dashboard an in-memory Set is
// sufficient and keeps the dependency footprint minimal.
const activeTokens = new Set();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isValidToken(token) {
  return token && activeTokens.has(token);
}

function revokeToken(token) {
  activeTokens.delete(token);
}

async function login(req, res) {
  const { email, password } = req.body || {};

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({
      ok: false,
      error: 'Admin credentials are not configured on the server.',
    });
  }

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid email or password.',
    });
  }

  const token = generateToken();
  activeTokens.add(token);

  res.json({
    ok: true,
    data: { token, email: adminEmail },
  });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      error: 'Authentication required.',
    });
  }

  const token = authHeader.substring(7);

  if (!isValidToken(token)) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid or expired session. Please log in again.',
    });
  }

  next();
}

module.exports = {
  login,
  requireAuth,
  generateToken,
  isValidToken,
  revokeToken,
};
