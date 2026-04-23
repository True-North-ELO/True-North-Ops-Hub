import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

if (admin.apps.length === 0) {
  admin.initializeApp({ 
    projectId: firebaseConfig.projectId,
    credential: admin.credential.applicationDefault() 
  });
}

const db = getFirestore(admin.apps[0], firebaseConfig.firestoreDatabaseId);

async function checkConfigs() {
  // Link the folder to 'rcm' gem
  const folderId = '1XRiZp3jFeKK61BpSeBDRLKVQLK-0fGas';
  await db.collection('contexts').doc('rcm').set({ folderId }, { merge: true });
  console.log(`Linked folder ${folderId} to gem 'rcm'`);

  const snap = await db.collection('contexts').get();
  console.log('\n--- Context Configurations ---');
  snap.forEach(doc => {
    console.log(`Gem: ${doc.id}`);
    console.log(`Folder ID: ${doc.data().folderId || 'None'}`);
  });
  console.log('--- Environment Check ---');
  console.log(`DRIVE_API_KEY set: ${!!process.env.GOOGLE_DRIVE_API_KEY}`);
  console.log(`SERVICE_ACCOUNT set: ${!!process.env.GOOGLE_SERVICE_ACCOUNT_JSON}`);
}

checkConfigs();
