import "dotenv/config";

async function testSync() {
  console.log('DRIVE_API_KEY present in .env:', !!process.env.GOOGLE_DRIVE_API_KEY);
  const gemId = 'rcm';
  const folderUrl = 'https://drive.google.com/drive/folders/1XRiZp3jFeKK61BpSeBDRLKVQLK-0fGas';

  console.log(`Setting folder for ${gemId}...`);
  try {
    const fetchRes = await fetch(`http://localhost:3000/api/context/${gemId}/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: folderUrl })
    });
    const fetchData = await fetchRes.json();
    console.log('Fetch/Link Response:', JSON.stringify(fetchData, null, 2));

    if (fetchData.success) {
      console.log('Triggering global sync...');
      const syncRes = await fetch('http://localhost:3000/api/sync-all', {
        method: 'POST'
      });
      const syncData = await syncRes.json();
      console.log('Global Sync Response:', JSON.stringify(syncData, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
testSync();
