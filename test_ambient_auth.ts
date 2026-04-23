import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

async function rawTest() {
  console.log('Testing Ambient Initialization...');
  try {
    const app = admin.initializeApp();
    console.log('Default App Project ID:', app.options.projectId);
    
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    await db.collection('test').doc('admin_test').get();
    console.log('Read Success with Database ID!');
  } catch (err: any) {
    console.log('Ambient Sync FAILED:', err.message);
  }
}

rawTest();
