const admin = require('firebase-admin');

let db;

function initializeFirebase() {
  try {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: '0',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });

    db = admin.firestore();
    console.log('Firebase initialized successfully');
  } catch (err) {
    console.error('Firebase initialization error:', err.message);
    process.exit(1);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  return db;
}

module.exports = {
  initializeFirebase,
  getDb,
  admin
};
