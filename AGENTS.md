# V2 Design System Rules (Minimalist)

## Typography
- **Font Family**: 'Jost', sans-serif (Only font allowed sitewide).

## Color Palette
- **Background**: Pure Black (#000000) or Pure White (#FFFFFF) based on system preference only.
- **Text**: Inverse of background (Pure White or Pure Black).
- **No Highlights**: No secondary colors allowed.

## Core Components
- **Grids**: Full-width grid of sharp square thumbnails. No gaps. 3 to 5 columns.
- **Pages**: Minimalist project detail views. Replaces the grid on click.
- **Buttons**: Solid, high-contrast interactive elements (e.g., Contact button).
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
- **No Haze**: NO backdrop-filters or blurs.
- **No Hardcoding**: Identity settings in the `CONFIG` object.
