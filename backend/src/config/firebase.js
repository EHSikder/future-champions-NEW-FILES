const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables (same as routes/auth.js)
// This file is an alternative entry point; routes/auth.js also initializes idempotently.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (err) {
    console.warn('[Firebase] Admin init failed:', err.message);
  }
}

module.exports = admin;
