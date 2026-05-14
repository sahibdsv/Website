# V2 Design System Rules (Minimalist)

## Typography
- **Font Family**: 'Jost', sans-serif (Only font allowed sitewide).

## Color Palette
- **Background**: Pure Black (#000000) or Pure White (#FFFFFF) based on system preference only.
- **Text**: Inverse of background (Pure White or Pure Black).
- **Neutral Support Tones Allowed**: Neutral grayscale support tones (e.g., #111, #333) are permitted for loading, placeholders, and subtle UI depth.

## Core Components
- **Grids**: Full-width grid of sharp square thumbnails. No gaps. 3 to 5 columns.
- **Pages**: Minimalist project detail views. Replaces the grid on click.
- **Buttons**: Solid, high-contrast interactive elements (e.g., Contact button).
- **Radii Policy**: Sharp corners are required for grid tiles only. Non-grid UI should use a consistent shared radius token.
- **Link Lines**: Minimalist underlined triggers for navigation.

## Layout & Logic
- **Aspect Ratio**: Always 1:1 (Square) for grid items.
- **NO Hover Effects**: Absolutely no hover animations, transitions, fades, or color shifts. (Exception: Contact Dropdown).
- **No Animations**: No transitions or fades between states.
- **Structure**: Single-level deep navigation. Grid <-> Page.


## Spacing & Alignment (Anti-Padding Law)
- **Mathematical Layout**: ALL vertical spacing must be tied to the `--header-height` variable.
- **Box Sizing**: `border-box` MUST be used sitewide.

## Infrastructure Rules
- **Flat File Structure**: `assets/style.css` and `assets/script.js` only.
- **Blur Exception**: Backdrop blur is allowed for the name/header overlay only when kept subtle and consistent with minimalist contrast. The contact/mail button must remain a solid high-contrast button.
- **No Hardcoding**: Identity settings in the `CONFIG` object.
