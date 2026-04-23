import "dotenv/config";
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

async function restTest() {
  const { projectId, firestoreDatabaseId, apiKey } = firebaseConfig;
  const collection = 'contexts';
  const docId = 'rcm';
  
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${firestoreDatabaseId}/documents/${collection}/${docId}?key=${apiKey}`;
  
  console.log(`Testing Firestore REST API for ${docId}...`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (res.ok) {
      console.log('✅ REST API Success:', data.fields?.name?.stringValue || 'Document found');
    } else {
      console.log('❌ REST API Failed:', data);
    }
  } catch (err: any) {
    console.log('❌ REST API Fetch Error:', err.message);
  }
}

restTest();
