import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

async function rawTest() {
  console.log('Testing with Database ID:', firebaseConfig.firestoreDatabaseId);
  try {
    const app = admin.initializeApp({ 
      projectId: firebaseConfig.projectId,
      credential: admin.credential.applicationDefault() 
    });
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    
    await db.collection('test').doc('admin_test').set({ ok: true, time: new Date().toISOString() });
    console.log('Write Success with Database ID!');
  } catch (err: any) {
    console.log('Write FAILED with Database ID:', err.message);
    
    try {
      console.log('Testing with DEFAULT database...');
      const app = admin.apps[0];
      const dbDefault = getFirestore(app);
      await dbDefault.collection('test').doc('admin_test').set({ ok: true, time: new Date().toISOString() });
      console.log('Write Success with DEFAULT database!');
    } catch (err2: any) {
      console.log('Write FAILED with DEFAULT database:', err2.message);
    }
  }
}

rawTest();
