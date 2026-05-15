# V2 Design System Rules (Minimalist)

## Typography
- **Font Family**: 'Jost', sans-serif (Double-story "regular a" only).

## Color Palette
- **Background**: Pure Black (#000000) (Dark mode only).
- **Text**: Pure White (#FFFFFF).
- **Neutral Support Tones Allowed**: Neutral grayscale support tones (e.g., #111, #333) are permitted for loading, placeholders, and subtle UI depth.
- **Media Theme Matching**: Images and videos may use `#invert` to opt into automatic light/dark inversion.

## Core Components
- **Grids**: Full-width grid of sharp square thumbnails. No gaps. 3 to 5 columns. (Exception: Placeholders and Loading states use a squircle aesthetic).
- **Pages**: Minimalist project detail views. Replaces the grid on click.
- **Buttons**: Solid, high-contrast interactive elements (e.g., Contact button).
- **Radii Policy**: Sharp corners are required for grid tiles containing media. Placeholders, Loading states, and non-grid UI should use a consistent shared radius token.
- **Link Lines**: Minimalist underlined triggers for navigation.

## Layout & Logic
- **Aspect Ratio**: Always 1:1 (Square) for grid items.
- **NO Hover Effects**: Absolutely no hover animations, transitions, fades, or color shifts for buttons, text, links, or layout. Exceptions: Contact Dropdown; grid media may move internally on desktop hover or mobile long-press only, with no layout shift.
- **No Animations**: No transitions or fades between states. Exception: loaded `model-viewer` elements may use a short opacity reveal to mask abrupt GLB first-render snapping. Loading/Placeholder states use an 80% scale squircle aesthetic.
- **Structure**: Single-level deep navigation. Grid <-> Page.


## Spacing & Alignment (Anti-Padding Law)
- **Mathematical Layout**: ALL vertical spacing must be tied to the `--header-height` variable.
- **Box Sizing**: `border-box` MUST be used sitewide.

## Infrastructure Rules
- **Flat File Structure**: `assets/style.css` and `assets/script.js` only.
- **Firebase Deploy Safety**: Never deploy with `--only hosting` from this repo. From `v2`, deploy only `hosting:v2`. To restore or update the legacy site, switch to the `v1` branch and deploy only `hosting:v1`.

- **No Hardcoding**: Identity settings in the `CONFIG` object.

## Version Control (Cache Busting)
- **Current Version**: `v2.23`
- **Cache Busting**: To force browsers to load the latest changes, the `index.html` file uses a version query parameter (e.g., `?v=2.23`) for `style.css`, `script.js`, and all internal media assets.
- **Instruction**: Whenever you make a change that affects the CSS, JS, or internal assets and requires a fresh load on the live site, increment this version number (e.g., `v2.23` -> `v2.24`) in both `index.html` and this `AGENTS.md` file.

