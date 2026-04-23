import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

async function clientOnServerTest() {
  console.log('Testing Client SDK on Server...');
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Test public read
    const ref = doc(db, 'contexts', 'rcm');
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      console.log('✅ Client SDK Read Success:', snap.data().name);
    } else {
      console.log('⚠️ Context document doesn\'t exist yet, but read succeeded.');
    }
    
    const testRef = doc(db, 'test', 'connection');
    const testSnap = await getDoc(testRef);
    console.log('✅ Connection test read success:', testSnap.data());

  } catch (err: any) {
    console.log('❌ Client SDK on Server Failed:', err.message);
  }
}

clientOnServerTest();
