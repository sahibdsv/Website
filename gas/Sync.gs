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
  let latestModified = folder.getLastUpdated().getTime();
  let latestFileName = "Folder itself";

  // Check every file to find the true latest modification
  while (files.hasNext()) {
    const file = files.next();
    const modTime = file.getLastUpdated().getTime();
    console.log("- Found file: " + file.getName() + " | Mod: " + new Date(modTime).toLocaleString());
    if (modTime > latestModified) {
      latestModified = modTime;
      latestFileName = file.getName();
    }
  }

  const lastSync = parseInt(props.getProperty('lastSync') || '0');

  console.log("True Latest Mod: " + new Date(latestModified).toLocaleString() + " (" + latestFileName + ")");
  console.log("Last successful sync: " + new Date(lastSync).toLocaleString());

  // Add a small 1-second buffer to prevent double-triggering
  if (latestModified > (lastSync + 1000)) {
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
