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
  const files = folder.getFiles();
  let latestModified = 0;
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

  const lastSync = parseInt(props.getProperty('lastSync') || '0');
  
  console.log("Drive Status: Found " + fileCount + " files.");
  console.log("Latest Mod in Drive: " + new Date(latestModified).toLocaleString() + " (" + latestFileName + ")");
  console.log("Last Sync recorded: " + new Date(lastSync).toLocaleString());

  if (latestModified > lastSync) {
    console.log(">>> CHANGE DETECTED! Triggering GitHub...");
    triggerGitHub(REPO_OWNER, REPO_NAME, GITHUB_TOKEN, latestModified);
  } else {
    console.log("No changes detected.");
  }
}

/**
 * Manually run this to force a sync to GitHub regardless of timestamps.
 */
function forceSync() {
  const props = PropertiesService.getScriptProperties();
  const GITHUB_TOKEN = props.getProperty('GITHUB_TOKEN');
  const REPO_OWNER = props.getProperty('REPO_OWNER') || 'sahibdsv';
  const REPO_NAME = props.getProperty('REPO_NAME') || 'Website';
  
  console.log("Force triggering GitHub Sync...");
  triggerGitHub(REPO_OWNER, REPO_NAME, GITHUB_TOKEN, new Date().getTime());
}

function triggerGitHub(owner, repo, token, timestamp) {
  const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
  const options = {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ event_type: 'sync_assets' })
  };

  try {
    UrlFetchApp.fetch(url, options);
    PropertiesService.getScriptProperties().setProperty('lastSync', timestamp.toString());
    console.log("GitHub Sync triggered successfully!");
  } catch (e) {
    console.error("Failed to trigger GitHub: " + e.toString());
  }
}

function manualSetup() {
  const props = PropertiesService.getScriptProperties();
}
