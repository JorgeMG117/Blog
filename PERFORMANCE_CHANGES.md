Performance changes for / (CV)

Overview
- Migrated the / route to a real Next.js page while keeping the CV markup in public/index.html as the source of truth.
- Ensured the visual output stays the same while optimizing initial render and asset loading.

Key updates
- pages/index.tsx now reads public/index.html at build time, injects the body content into the page, and sets the head metadata with next/head.
- Google Analytics now loads via next/script (afterInteractive) with preconnect hints.
- Added content-visibility to CV sections to reduce initial rendering work.
- Preloaded the hero image and kept it high priority for LCP.
- Removed the CV scroll script file and reimplemented the active-section logic using a passive scroll listener in React.
- Converted the hero image to AVIF and WebP for smaller transfer size while keeping the JPG fallback.

Files touched
- pages/index.tsx
- public/index.html
- public/profile.avif
- public/profile.webp
- public/static/js/script.js (removed)

Build status
- npm run build passed after the changes.
