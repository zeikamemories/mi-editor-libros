@AGENTS.md
# Zeika Builder — Project Context

## What this project is
Internal platform for Zeika's design team to create personalized photo books.
Designers upload client photos, arrange them on spreads using layouts, and export to JPG zip or PDF.

## Tech stack (installed)
- Next.js 16.2.1 + React 19 + TypeScript 5
- Canvas: Fabric.js v7 (`fabric` — v7 has breaking changes from v5/v6, check node_modules/next/dist/docs/ before writing code)
- Photos: Cloudinary (upload via `POST /api/upload`, stored in `zeika/fotos/`)
- Photo client compression: max 3000px longest side, JPEG 0.88 quality before upload
- PDF export: jsPDF (NOT Puppeteer — removed)
- ZIP export: JSZip
- Icons: lucide-react
- Deploy: Vercel

## NOT installed (planned but not in package.json)
Supabase, NextAuth, MercadoPago, Twilio, Puppeteer — do not reference these.

## Visual identity
- Blue: #528ED6
- Black: #191919
- Cream: #F0EFEB
- White: #FFFFFF
- Display font: Amandine (Adobe Fonts via Typekit: https://use.typekit.net/ddt8web.css)
- Body font: Overused Grotesk (local files in /public/fonts/)

## Folder structure (root is `app/`, never `src/app/`)
app/
  api/upload/route.ts          — Cloudinary upload endpoint
  components/
    Canvas/
      Canvas.tsx               — DONE: dual Fabric canvases, rulers, guides, grid, pan, frame-draw tool
      Canvas.css
      fabricHelpers.ts         — DONE: applyLayout, addTextBox, addShape, serialize/deserialize, export, drag-drop
    LayoutPanel/
      LayoutPanel.tsx          — DONE: tabs (Layouts / Fondos / Deco), drag-to-canvas support
      LayoutPanel.css
    OnboardingTour/
      OnboardingTour.tsx       — DONE: first-visit guided tour overlay
      OnboardingTour.css
    PageStrip/
      PageStrip.tsx            — DONE: spread thumbnails, add/delete spreads, layout drop
      PageStrip.css
    PhotoPanel/
      PhotoPanel.tsx           — DONE: upload, sort, filter unused, click-to-place, auto-create
      PhotoPanel.css
    PreviewModal/
      PreviewModal.tsx         — DONE: full-screen spread preview with page-flip (turn.min.js)
      PreviewModal.css
    ShareModal/
      ShareModal.tsx           — DONE: share link via localStorage
      ShareModal.css
    SpreadsView/
      SpreadsView.tsx          — DONE: overview grid of all spreads with drag-to-reorder
      SpreadsView.css
    TextModal/
      TextModal.tsx            — DONE: text editor (font, size, color, align, spacing)
      TextModal.css
    Toolbar/
      Toolbar.tsx              — DONE: undo/redo, ruler, pan, frame-draw, view toggle, bg color, grid, shapes
      Toolbar.css
    Topbar/
      Topbar.tsx               — DONE: preview, export (JPG/PDF), share, language toggle, tour
      Topbar.css
  config/
    bookSize.ts                — DONE: single BOOK_SIZE export (Vertical: 816×1058px, bleed 11px)
    layouts.ts                 — DONE: 19 layouts (4+4+4+4+3) defined in 0–1 fractions
    translations.ts            — DONE: ES/EN strings for all UI text
  context/
    LanguageContext.tsx        — DONE: LanguageProvider + useLang() hook, wraps EditorPage
  dashboard/
    page.tsx                   — DONE: order management table (mock data, no backend yet)
    dashboard.css
  editor/
    page.tsx                   — DONE: main editor — all state, spread navigation, undo/redo
    editor.css
  nuevo/
    page.tsx                   — DONE: book creation flow (size select, photo upload, designer assign)
    nuevo.css
  preview/[projectId]/
    page.tsx                   — DONE: shareable preview page, reads project from localStorage
  globals.css                  — DONE: CSS variables, fonts, reset
  layout.tsx                   — DONE: root layout with Typekit font
  page.tsx                     — redirects / → /editor

## Book size
Currently hardcoded to Vertical (816×1058px, bleed 11px) in `app/config/bookSize.ts`.
The 5-size architecture (Small/Medium/Large Horizontal, Vertical, Square) is planned but not yet wired up.

## Layouts (app/config/layouts.ts)
19 total (not 20): 4 for 1-photo, 4 for 2-photo, 4 for 3-photo, 4 for 4-photo, 3 for 5-photo.
All frame positions/sizes are 0–1 fractions of page width/height.
Constants: `MARGIN = 0.06`, `GAP = 0.025`.
Auto-create picks: layout_1_3 for 1 photo, layout_2_4 for 2, layout_3_1 for 3, layout_4_1 for 4, random for 5.

## Static assets (in /public)
- `/texturas/text1.jpg` … `text12.jpg` — 12 textures
- `/fondos/fondo.jpg`, `fondo2.jpg` … `fondo12.jpg` — 12 backgrounds
- `/stickers/stickersPNG1.png` … `stickersPNG13.png` — 13 stickers
- `/ilus/IlusZeika-14.png` … `IlusZeika-20.png` — 7 Zeika illustrations
- `/LogoZeika.jpg` — logo (used on last-spread thumbnail)
- `/js/turn.min.js` — page-flip library for PreviewModal

## State architecture (editor)
- All spread data lives in-memory (`spreadsData` ref, keyed by spread index).
- Spread state: `{ left: PageData, right: PageData }` — serialized Fabric canvas JSON.
- Undo/redo: per-spread, in-memory string snapshots.
- Photos passed from /nuevo → /editor via `sessionStorage` key `zeika_photos`.
- Share: project saved to `localStorage` as `zeika_project_{projectId}`, read by `/preview/[projectId]`.
- No database persistence yet — all state is lost on page refresh in the editor.

## Key patterns & invariants
- `isDeserializing` ref suppresses auto-save during `deserializePage` to prevent partial-state corruption.
- `currentSpreadRef` (ref, not state) is the source of truth for spread index inside callbacks.
- Fabric.js Canvas components always need `'use client'` and dynamic import with `ssr: false`.
- `saveCurrentSpread` is called on every canvas mutation (object:added/modified/removed).
- Thumbnail capture is debounced 400ms; initial thumbnails are generated from plain 2D canvas (fast-path for empty pages).

## Important rules
- ALWAYS use CSS variables from globals.css for colors and typography.
- Root is `app/` — never write `src/app/`.
- CSS always in a separate file (.css per component) — no inline styles, no Tailwind in components.
- Measurements in pixels internally; CM shown in UI. 1cm = 37.8px. Bleed = 3mm ≈ 11px.
- All user-facing strings must go through `useLang()` / `translations.ts` (ES + EN).
- Fabric.js v7 API differs significantly from v5/v6 — always verify against node_modules/fabric source.
- Prices in Argentine pesos with no decimals.
