import "dotenv/config";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const syncGoogleDriveFolder = async (folderId: string) => {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    console.log('Using API Key:', apiKey?.substring(0, 5) + '...');

    const drive = google.drive({ version: 'v3', auth: apiKey });

    try {
      console.log(`Scanning folder: ${folderId}`);
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
      });

      const files = res.data.files || [];
      console.log(`Found ${files.length} items.`);

      for (const file of files) {
        console.log(`- ${file.name} (${file.mimeType})`);
      }
      return true;
    } catch (err: any) {
      console.error('Drive Sync Error:', err.message);
      return false;
    }
};

syncGoogleDriveFolder('1XRiZp3jFeKK61BpSeBDRLKVQLK-0fGas');
