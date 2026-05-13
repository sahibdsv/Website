# V2 Design System Rules

## Typography
- **Font Family**: 'Jost', sans-serif (Only font allowed sitewide).

## Color Palette (Strict 3-Color Limit)
- **Background**: Pure Black (#000000) or Pure White (#FFFFFF) based on system preference only.
- **Text**: Inverse of background (Pure White or Pure Black).
- **Highlights**: Only ONE highlight color per category:
    - **Personal**: Pure Green (#00FF00)
    - **Professional**: Pure Cyan (#00FFFF)
    - **Projects**: Pure Orange (#FFA500)
- **Components**: All outlines, chips, and interactive lines MUST use the category's highlight color.

## Layout & Components
- **Navigation**: 3-Tab system (Personal, Professional, Projects). No traditional nav bar.
- **Grid**: Full-width grid of rounded square thumbnails.
- **Thumbnails**: No words. Square aspect ratio.
- **3D Interaction**: GLB models float/spin on hover (Desktop only). Static posters for mobile and non-hover states.

## Implementation Rules
- **NEVER** use `!important`.
- **NEVER** add a theme toggle (honor system preference).
- **NEVER** use a second font.

