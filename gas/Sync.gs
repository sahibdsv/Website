// CONFIGURATION (Set these in Project Settings > Script Properties)
// FOLDER_ID
// GITHUB_TOKEN
// REPO_OWNER (default: sahibdsv)
// REPO_NAME (default: Website)

function watchFolderAndSync() {
  const props = PropertiesService.getScriptProperties();
  const FOLDER_ID = props.getProperty('FOLDER_ID');
  const GITHUB_TOKEN = props.getProperty('GITHUB_TOKEN');
  const REPO_OWNER = props.getProperty('REPO_OWNER') || 'sahibdsv';
  const REPO_NAME = props.getProperty('REPO_NAME') || 'Website';

  if (!FOLDER_ID || !GITHUB_TOKEN) {
    console.error("Missing FOLDER_ID or GITHUB_TOKEN in Script Properties");
    return;
  }
  
  const folder = DriveApp.getFolderById(FOLDER_ID);
  console.log("Checking folder: " + folder.getName() + " (ID: " + FOLDER_ID + ")");

  const files = folder.getFiles();
  let latestModified = 0; // Start at 0 to ensure we find something
  let latestFileName = "None";
  let fileCount = 0;

  while (files.hasNext()) {
    const file = files.next();
    const modTime = file.getLastUpdated().getTime();
    fileCount++;
    if (modTime > latestModified) {
      latestModified = modTime;
      latestFileName = file.getName();
    }
  }

  console.log("Total files found in folder: " + fileCount);

  const lastSync = parseInt(props.getProperty('lastSync') || '0');

  console.log("Latest Mod in Drive: " + new Date(latestModified).toLocaleString() + " (" + latestFileName + ")");
  console.log("Last Sync recorded: " + new Date(lastSync).toLocaleString());

  // Trigger if Drive is newer than our record
  if (latestModified > lastSync) {
    console.log(">>> CHANGE DETECTED! Triggering GitHub...");
    
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`;
    const options = {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ event_type: 'sync_assets' })
    };

    try {
      UrlFetchApp.fetch(url, options);
      props.setProperty('lastSync', latestModified.toString());
      console.log("GitHub Sync triggered successfully.");
    } catch (e) {
      console.error("Failed to trigger GitHub: " + e.toString());
    }
  } else {
    console.log("No changes detected since " + new Date(lastSync).toLocaleString());
  }
}

/**
 * Run this once to initialize properties if you don't want to use the UI.
 * Replace the values below then run the function.
 */
function manualSetup() {
  const props = PropertiesService.getScriptProperties();
  // props.setProperty('FOLDER_ID', '...');
  // props.setProperty('GITHUB_TOKEN', '...');
  // props.setProperty('REPO_OWNER', 'sahibdsv');
  // props.setProperty('REPO_NAME', 'Website');
}
