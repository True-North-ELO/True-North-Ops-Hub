import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };
import fs from "fs";

async function test() {
  const results: any = { logs: [] };
  const log = (m: string) => { console.log(m); results.logs.push(m); };

  try {
    log(`Testing Project: ${firebaseConfig.projectId}`);
    log(`Env Project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
    log(`Testing Database: ${firebaseConfig.firestoreDatabaseId}`);

    if (getApps().length === 0) {
      initializeApp(); 
    }
    const app = getApps()[0];
    
    let db;
    try {
      log("Attempting write to SECONDARY database...");
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      await db.collection('test').doc('write_test').set({ time: new Date().toISOString() });
      log("SECONDARY Write SUCCESSFUL");
    } catch (err: any) {
      log(`SECONDARY Write FAILED: ${err.message}`);
      log("Attempting write to DEFAULT database...");
      db = getFirestore(app);
      await db.collection('test').doc('write_test').set({ time: new Date().toISOString() });
      log("DEFAULT Write SUCCESSFUL");
      results.prefersDefault = true;
    }

    log("Attempting read...");
    const snap = await db.collection('test').doc('write_test').get();
    log(`Read SUCCESSFUL: ${JSON.stringify(snap.data())}`);

    results.success = true;
  } catch (err: any) {
    log(`FATAL ERROR: ${err.message}`);
    log(`Error Code: ${err.code}`);
    results.success = false;
    results.error = { message: err.message, code: err.code };
  }

  fs.writeFileSync('db_test_results.json', JSON.stringify(results, null, 2));
}

test();
