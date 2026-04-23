
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const adminApp = getApps().length === 0 
  ? initializeApp({ projectId: firebaseConfig.projectId }) 
  : getApps()[0];

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

async function connectSopDrive() {
  const folderId = "1RAFWfi6MuyLG7qlIyID8ejP4oZAZn9eE";
  const gemId = 'sop';
  
  console.log(`Connecting folder ${folderId} to ${gemId}...`);
  
  await db.collection('contexts').doc(gemId).set({
    folderId,
    lastUpdated: new Date().toISOString()
  }, { merge: true });

  console.log('Successfully connected SOP drive folder in Firestore.');
}

connectSopDrive();
