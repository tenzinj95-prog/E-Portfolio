JIGME TENZIN ePORTFOLIO - FINAL ALL-FEATURE VERSION

This version preserves the existing public design, About media, profile photo/CV upload support,
Skills/Education/Projects media, footer, responsive layout, SPA navigation and page-specific moving text.

PUBLIC CONTENT
- Skills, Education and Projects load from Supabase and normalize common field names used by older data.
- If a public query temporarily fails, built-in fallback cards keep the page usable instead of leaving it blank.
- Uploaded images, galleries, videos, project links and certificates are supported.
- About supports text before/middle/after plus image, video and gallery.
- Profile photo and CV remain connected to the public site.
- Footer remains minimal with quote, contact details and copyright.
- Navy/teal/gold visual palette and Poppins + Playfair Display typography are preserved.

PAGE MOVING TEXT
- Every page has its own moving message.
- Movement is controlled by JavaScript requestAnimationFrame from LEFT TO RIGHT continuously.
- It is intentionally independent of CSS marquee animation and browser reduced-motion settings.

SUPABASE
- Keep the same Supabase project and existing data.
- If public visitors still cannot see admin-entered content, run the public SELECT policies in supabase.sql.
- Do not delete existing tables or data.

DEPLOYMENT
1. Keep js/config.js connected to the same Supabase project.
2. Upload/push the complete folder to GitHub/Vercel.
3. After deployment, press Ctrl+F5 once to clear old cached JS/CSS.
4. Existing Supabase records and storage media remain in the same project.
