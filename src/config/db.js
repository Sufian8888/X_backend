const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  if (process.env.NODE_ENV === 'production') {
    const hostname = new URL(uri).hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      throw new Error(
        'MONGODB_URI points to localhost in production. Set Render\'s MONGODB_URI to a hosted MongoDB connection string.'
      );
    }
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  return mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'xautomate',
  });
}

module.exports = {
  connectDatabase,
};
