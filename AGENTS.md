# V2 Design System Rules (Minimalist)

## Typography
- **Font Family**: 'Jost', sans-serif (Double-story "regular a" only).

## Color Palette
- **Background**: Pure Black (#000000) (Dark mode only).
- **Text**: Pure White (#FFFFFF).
- **Neutral Support Tones Allowed**: Neutral grayscale support tones (e.g., #111, #333) are permitted for loading, placeholders, and subtle UI depth.
- **Media Theme Matching**: Images and videos may use `#invert` to opt into automatic light/dark inversion.

## Core Components
- **Grids**: Full-width grid of sharp square thumbnails. No gaps. 3 to 5 columns.
- **Pages**: Minimalist project detail views. Replaces the grid on click.
- **Buttons**: Solid, high-contrast interactive elements (e.g., Contact button).
- **Radii Policy**: Sharp corners are required for grid tiles only. Non-grid UI should use a consistent shared radius token.
- **Link Lines**: Minimalist underlined triggers for navigation.

## Layout & Logic
- **Aspect Ratio**: Always 1:1 (Square) for grid items.
- **NO Hover Effects**: Absolutely no hover animations, transitions, fades, or color shifts. (Exception: Contact Dropdown).
- **No Animations**: No transitions or fades between states. Exception: loaded `model-viewer` elements may use a short opacity reveal to mask abrupt GLB first-render snapping.
- **Structure**: Single-level deep navigation. Grid <-> Page.


## Spacing & Alignment (Anti-Padding Law)
- **Mathematical Layout**: ALL vertical spacing must be tied to the `--header-height` variable.
- **Box Sizing**: `border-box` MUST be used sitewide.

## Infrastructure Rules
- **Flat File Structure**: `assets/style.css` and `assets/script.js` only.
- **Firebase Deploy Safety**: Never deploy with `--only hosting` from this repo. From `v2`, deploy only `hosting:v2`. To restore or update the legacy site, switch to the `v1` branch and deploy only `hosting:v1`.

- **No Hardcoding**: Identity settings in the `CONFIG` object.

## Version Control (Cache Busting)
- **Current Version**: `v2.02`
- **Cache Busting**: To force browsers to load the latest changes, the `index.html` file uses a version query parameter (e.g., `?v=2.02`) for `style.css` and `script.js`.
- **Instruction**: Whenever you make a change that affects the CSS or JS and requires a fresh load on the live site, increment this version number (e.g., `v2.02` -> `v2.03`) in both `index.html` and this `AGENTS.md` file.

## Google Doc Embeds (Dynamic Height)
To allow Google Doc iframes to expand to their full content height (no internal scrolling), you must use a Google Apps Script proxy.
1. Create a new Google Apps Script project at `script.google.com`.
2. Use the following code:
```javascript
function doGet(e) {
  var docId = e.parameter.id;
  var url = "https://docs.google.com/document/d/" + docId + "/pub?embedded=true";
  var html = UrlFetchApp.fetch(url).getContentText();
  var injection = '<script>' +
    'function sendHeight() {' +
    '  var height = document.documentElement.scrollHeight;' +
    '  window.parent.postMessage({ gdocHeight: height }, "*");' +
    '}' +
    'window.onload = sendHeight;' +
    'window.onresize = sendHeight;' +
    'setInterval(sendHeight, 1000);' +
    '</script>';
  return HtmlService.createHtmlOutput(html + injection)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```
3. Deploy as a Web App (Access: Anyone).
4. Use the Web App URL with `?id=YOUR_DOC_ID` in your database.
