import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

async function ambientWrite() {
  console.log('Testing Write on Ambient Project: ais-us-west2-cbfbd7b235734c89b');
  try {
    admin.initializeApp({ 
      projectId: 'ais-us-west2-cbfbd7b235734c89b'
    });
    const db = getFirestore();
    
    await db.collection('test').doc('ambient_test').set({ ok: true, time: new Date().toISOString() });
    console.log('✅ Write Success on Ambient Project!');
  } catch (err: any) {
    console.log('❌ Write Failed on Ambient Project:', err.message);
  }
}

ambientWrite();
