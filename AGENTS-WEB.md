# Zeika Landing Page — Web Context

## What this is
Customer-facing marketing landing page for Zeika. Lives at `/` (root route).
The photo book editor lives at `/editor` — **do not touch any editor files**.
All landing work is in `app/page.tsx` and `app/components/Landing/`.

## Branch
`feat/landing-web` — merge to `main` when complete.

## Figma file
File key: `gWc6nDyRGdCZ8rb3myBdZX`

### Desktop frame: `1179:2192` "Desktop - 4" (1440px wide)
| Section | Node ID | Height |
|---|---|---|
| Hero | `1181:2827` | 900px |
| Intro | `1179:2277` | 507px |
| Productos | `1274:1568` | 977px |
| Cómo hacerlo | `1274:1569` | 396px |
| Quiénes somos | `1182:1570` | 2452px |
| FAQs | `1182:2066` | 814px |
| Footer | `1274:1571` | 532px |

### Mobile frame: `1179:1366` "iPhone 16 - 5" (393px wide)
| Section | Node ID |
|---|---|
| Hero | `1179:1371` |
| Intro | `1179:1375` |
| Productos | `1378:1513` |
| Cómo hacerlo | `1179:1441` |
| Quiénes somos | `1179:1474` |
| FAQs | `1179:1526` |
| Footer | `1361:1511` |

### Desktop component library: `978:2633`
| Component | Node ID | States |
|---|---|---|
| Botton (CTA) | `976:458` | Default / Hover / Variant3 |
| Comparar | `977:1926` | No / Yes (with X) / Variant3 |
| FAQs item | `976:1615` | Open / Closed |
| Review card | `976:731` | — |
| Toggl (size tab) | `977:1969` | Selected / Not selected / Hover |
| Product Card 1 (Chico H) | `1181:2462` | Default / Hover (overlay) |
| Product Card 2 (Mediano H) | `1181:2473` | Default / Hover |
| Product Card 3 (Grande H) | `1181:2488` | Default / Hover |
| Product Card 4 (Vertical) | `1181:2575` | Default / Hover |
| Product Card 5 (Cuadrado) | `1181:2587` | Default / Hover |
| Product Pop-up | `977:1876` | Default / Activado (comparison) / Variant3 |
| Product Sizes Full | `1182:2931` | 5 variants (one per size) |
| Step cards 1–5 | `1332:1436–1484` | 1 state each |
| Desktop navbar | `976:1777` | — |
| Nav items | `1334:1607–1635` | Default / Active |
| Separador | `976:542` | — |

### Mobile component library: `1003:2907`
| Component | Node ID | States |
|---|---|---|
| Mobile menu icon | `989:794` | No (≡) / Yes (✕) |
| Mobile menu overlay | `989:1185` | Close (70px bar) / Open (full screen) |
| Mobile product card | `1003:2303` | — |

## Component file structure
```
app/
  components/
    Landing/
      Navbar/
        Navbar.tsx
        Navbar.css
      Hero/
        Hero.tsx
        Hero.css
      Intro/
        Intro.tsx
        Intro.css
      Productos/
        Productos.tsx
        Productos.css
        ProductCard.tsx
        ProductModal.tsx
        SizeComparison.tsx
      ComoHacerlo/
        ComoHacerlo.tsx
        ComoHacerlo.css
        StepCard.tsx
      QuienesSomos/
        QuienesSomos.tsx
        QuienesSomos.css
        ReviewCard.tsx
      FAQs/
        FAQs.tsx
        FAQs.css
        FAQItem.tsx
      Footer/
        Footer.tsx
        Footer.css
  page.tsx   ← renders all Landing sections (replaces redirect to /editor)
```

## Design system
- **Breakpoint**: `@media (min-width: 1024px)` for desktop. Mobile-first.
- **Background**: `var(--color-cream)` = `#F0EFEB`
- **Text**: `var(--color-black)` = `#191919`
- **Accent**: `var(--color-blue)` = `#528ED6` — used for CTA buttons, step icons, footer
- **Display font**: `"Times New Roman", Times, serif` — large headings, hero, intro, mobile nav links. Always `letter-spacing: -0.02em`
- **UI font**: `forma-djr-display` (Adobe Fonts via Typekit `ddt8web.css`, already in `app/layout.tsx`) — labels, body, prices, nav links desktop, step numbers. Always `letter-spacing: 0.04em`
- **Container max-width**: 1340px, padding 50px each side on desktop, 20px on mobile

## Typography patterns (from design)
- Section labels: Forma DJR Display uppercase, small tracking (e.g. "NUESTROS PRODUCTOS")
- Display headings: Times New Roman (system serif), large size (e.g. Hero, Intro)
- Step titles: Times New Roman, large
- Step numbers: superscript style, small, Forma DJR Display
- Prices: Forma DJR Display, right-aligned
- Nav links desktop: `"forma-djr-display", sans-serif`, `font-weight: 600`, `font-style: normal`
- Nav links (mobile open): Times New Roman, large
- Body paragraphs: Forma DJR Display

## Key design decisions
- **Intro section**: large empty space in center is an animated GIF asset (to be placed in `/public/`)
- **Product cards**: 5 types with different aspect ratios matching physical book sizes
- **Product modal**: triggered by "Más información" hover on card. Has image carousel (arrows), price info, bullet details, "Comparar" toggle that opens size diagram
- **Size comparison diagram**: shows all 5 book sizes to scale with cm labels + tab pills to switch active size
- **Mobile nav**: full-screen cream overlay slides from right, large Amandine links, social icons at bottom (FB, X, Instagram, WhatsApp)
- **Reviews (desktop)**: 3×2 grid of cards; (mobile): single card with dot carousel
- **FAQs**: accordion — one item open at a time, `[01]` numbered
- **Footer**: blue (`#528ED6`) filled card with logo + 3-column links + social, below it a cream strip with legal text

## Build order
1. Navbar (sticky, mobile hamburger)
2. Hero
3. Intro (+ GIF asset)
4. Productos (cards → modal → size comparison)
5. Cómo hacerlo
6. Quiénes somos (founder + team + values + reviews)
7. FAQs
8. Footer
9. `app/page.tsx` wires everything together

## Rules
- CSS in separate `.css` file per component — no inline styles, no Tailwind
- All CSS colors via `var(--color-*)` from `globals.css`
- Translations not needed for landing (ES only, public-facing Argentine site)
- Images: product photos are Cloudinary URLs or local placeholders during build
- Do NOT modify any file outside `app/components/Landing/`, `app/page.tsx`, and `public/` assets
