# Zeika Landing Page — Web Context

## IMPORTANT: Read this file before touching any landing code.

## What this is
Customer-facing marketing landing page for Zeika. Lives at `/` (root route).
The photo book editor lives at `/editor` — **do not touch any editor files**.
All landing work is in `app/page.tsx` and `app/components/Landing/`.

## Branch
`feat/landing-web` — merge to `main` when complete.

## Figma file
File key: `gWc6nDyRGdCZ8rb3myBdZX`
Always call `get_design_context` on the relevant node before implementing a section or component.

### Desktop frame: `1179:2192` "Desktop - 4" (1440px wide)
| Section | Node ID | Notes |
|---|---|---|
| Hero | `1181:2827` | 900px tall, video bg, title top-left, CTA bottom-right |
| Intro | `1179:2277` | Two serif lines + GIF strip + right-aligned body |
| Productos | `1274:1568` | 5 product cards flex-wrap + "Comparar tamaños" |
| Cómo hacerlo | `1274:1569` | 5 step cards in a horizontal row |
| Quiénes somos | `1182:1570` | bg #F0EFEB — founder + team + values + reviews |
| FAQs | `1182:2066` | 6 accordion items |
| Footer | `1274:1571` | Blue card + 3-col links + cream legal strip |

### Mobile frame: `1179:1366` "iPhone 16 - 5" (393px wide)
| Section | Node ID | Key differences from desktop |
|---|---|---|
| Hero | `1179:1371` | 852px tall, title 50px, CTA full-width bottom |
| Intro | `1179:1375` | Title 35px, GIF 405px tall, body 16px |
| Productos | `1378:1513` | Grid: row1 (chico+mediano), row2 (grande full), row3 (vertical+cuadrado). Each has "Más información" button below |
| Cómo hacerlo | `1179:1441` | Steps stacked vertically, centered layout (not horizontal row) |
| Quiénes somos | `1179:1474` | bg #F0EFEB — all centered, values as bordered cards, single review + dots |
| FAQs | `1179:1526` | Question 12px (vs 22px desktop), number 10px |
| Footer | `1361:1511` | Full-width blue bg, logo circle centered, nav links Forma DJR 28px centered, socials |

### Desktop component library: `978:2633`
| Component | Node ID | States / Notes |
|---|---|---|
| Button (CTA) | `976:458` | Default / Hover (white border ring) / Variant3 (darker). Blue `#528ED6`, Forma DJR Medium 16px uppercase, `px-15 py-10` |
| Comparar | `977:1926` | No (underlined text button) / Yes (button + X icon) |
| FAQs item | `976:1615` | Open (number + question + answer) / Closed (question only) |
| Review card | `976:731` | Times New Roman 30px quote + Forma DJR 22px body + 5 stars + date. Right border. |
| Toggl (size tab) | `977:1969` | Selected (white bg + border) / Not selected (grey bg) / Hover |
| Product Card 1 (Chico H) | `1181:2462` | 328px wide, 230px img. Hover: white "Más información" overlay |
| Product Card 2 (Mediano H) | `1181:2473` | 440px wide, 314px img |
| Product Card 3 (Grande H) | `1181:2488` | 552px wide, 400px img |
| Product Card 4 (Vertical) | `1181:2575` | 328px wide, 400px img |
| Product Card 5 (Cuadrado) | `1181:2587` | 327px wide, 318px img |
| Product Pop-up | `977:1876` | 890×605px. Default (carousel left + details right) / Activado (size diagram left) / Variant3 |
| Product Sizes Full | `1182:2931` | Size comparison diagram with 5 tab pills |
| Step card 1 | `1332:1436` | 268×350px, right border `#c0bfbc`, circle icon 70px top, step# 10px + serif title 28px + body 16px bottom |
| Step card 2 | `1332:1447` | Same structure |
| Step card 3 | `1332:1460` | Same structure |
| Step card 4 | `1332:1471` | Same structure |
| Step card 5 | `1332:1484` | Same structure |
| Desktop navbar | `976:1777` | Glassmorphism bg `rgba(250,248,244,0.8)` + backdrop-blur + border-bottom `#c0bfbc`, `px-50px py-20px`, logo 48px left, links right gap-30px |
| Nav item: Productos | `1334:1607` | Default / Active |
| Nav item: Cómo hacerlo | `1334:1617` | Default / Active |
| Nav item: Quienes somos | `1334:1626` | Default / Active |
| Nav item: FAQs | `1334:1635` | Default / Active |
| Separador | `976:542` | Full-width `#c0bfbc` horizontal line, height 0 (border) |

### Mobile component library: `1003:2907`
| Component | Node ID | States / Notes |
|---|---|---|
| Mobile menu icon | `989:794` | Hamburger (≡) / Close (✕). 50px circle |
| Mobile menu overlay | `989:1185` | Close = white navbar bar 70px. Open = full-screen cream `#F0EFEB` 852px. Logo top-left, X top-right, nav links Times New Roman 40px left, "Contactanos" + socials bottom |
| Mobile product card | `1003:2303` | 172px wide, 213px img, name+price+dims 12px, "Más información" white border button below |

---

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
        ProductCard.tsx       ← used for both desktop (5 variants) and mobile
        ProductModal.tsx      ← pop-up with carousel + details + size comparison
        SizeComparison.tsx    ← diagram with tab pills
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
  page.tsx   ← renders all Landing sections
```

---

## Design system

### Colors
- `var(--color-cream)` = `#FAF8F4` — navbar bg, page bg
- `var(--color-cream-dark)` = `#F0EFEB` — Quiénes somos bg, mobile menu overlay, review cards bg
- `var(--color-black)` = `#191919` — primary text
- `var(--color-blue)` = `#528ED6` — CTA buttons, step icon circles, footer bg
- `var(--color-border)` = `#c0bfbc` — separators, step card borders, navbar border

### Fonts
- **Display / serif**: `"Times New Roman", Times, serif` — hero title, intro headings, step titles, product pop-up title, mobile nav links (open). Always `letter-spacing: -0.02em`
- **UI**: `"forma-djr-display", sans-serif` — labels, body text, prices, nav links (desktop), step numbers, buttons. Always `letter-spacing: 0.04em`
- **Signature**: `"Meow Script", cursive` — founder signature "maika" in Quiénes somos

### Spacing
- Desktop container: `max-width: 1440px`, `padding: 0 50px`
- Mobile container: `padding: 0 20px`
- Breakpoint: `@media (min-width: 1024px)` — mobile-first

---

## Section-by-section specs

### Navbar (desktop)
- `position: sticky; top: 0; z-index: 100`
- `background: rgba(250,248,244,0.8); backdrop-filter: blur(3px)`
- `border-bottom: 1px solid #c0bfbc`
- Inner: `display: flex; justify-content: space-between; align-items: center; padding: 20px 50px; max-width: 1440px; margin: 0 auto`
- Logo: `48px × 48px`, left side
- Links: Forma DJR Medium, 18px, tracking 0.72px, `gap: 30px`, right side

### Navbar (mobile)
- `background: white; padding: 10px 20px`
- Logo: `45px × 45px`, left
- Hamburger icon: `50px` circle, right

### Mobile menu overlay (open state)
- Full-screen `#F0EFEB`, `height: 852px`
- Logo top-left, X top-right (same positions as closed)
- Nav links: Times New Roman 40px, tracking -0.8px, left-aligned at `left: 20px, top: 146px`, `gap: 10px`
- Bottom section (`top: 624px`): "Contactanos" Times New Roman 40px + social icons (FB, X, Instagram, WhatsApp) `gap: 16px, size: 38px`

### Hero (desktop)
- `height: 900px`, video background
- Title: Times New Roman 80px, white, tracking -1.6px, `top: 140px, left: calc(50% - 670px)`, `width: 1195px`
- Text: "Eternizamos momentos / a través de fotolibros / personalizados."
- CTA button: blue `#528ED6`, `width: 378px`, `position: absolute; right: 50px; top: 799px`

### Hero (mobile)
- `height: 852px`, video background
- Title: Times New Roman 50px, white, tracking -1px, `top: 518px, left: calc(50% - 176.5px)`, `width: 329px`
- Text: "Eternizamos momentos / a través / de fotolibros personalizados"
- CTA button: blue, full-width `353px`, `position: absolute; left: 20px; top: 780px`

### Intro (desktop)
- "Transformamos instantes" — Times New Roman 46px, tracking -0.92px, left-aligned `px-50px`
- GIF strip — `width: 1341px, height: 293px`
- "en recuerdos eternos." — same size, right-aligned
- Body paragraph — Forma DJR Medium 18px, tracking 0.72px, `width: 629px`, right-aligned

### Intro (mobile)
- "Transformamos / momentos" — Times New Roman 35px, tracking -0.7px, left-aligned `px-20px`
- GIF — full-width `405px tall`
- "en recuerdos eternos." — 35px, right-aligned, `width: 172px`
- Body — Forma DJR Medium 16px, tracking 0.64px, `width: 353px`, centered

### Productos (desktop)
- Section label: Forma DJR Medium 22px uppercase tracking 0.88px, left `px-50px`
- "Comparar tamaños" button: underlined text, right-aligned
- Cards: `display: flex; flex-wrap: wrap; gap: 10px; px-50px`
- Card details below image: name uppercase Forma DJR Medium 14px + price Forma DJR Regular 14px (same row, justify-between) + dimensions below

### Productos (mobile)
- Section label: Forma DJR Medium 16px uppercase centered
- Grid layout `px-20px, gap: 30px between rows`:
  - Row 1: Chico H (146px) + Mediano H (172px), `gap: 10px`
  - Row 2: Grande H (353px full width)
  - Row 3: Vertical (146px) + Cuadrado (208px), `gap: 10px`
- Each mobile card: image + name/price/dims (12px) + "Más información" white border button

### Product pop-up
- 890×605px, white bg
- Left (433px): image carousel with prev/next circle arrows (24px) + dot indicator
- Right (458px): serif title 40px + dimensions 16px | "Comparar con otros tamaños" underlined button | price base bold 14px + "precio por extra página" + bullet details 12px | blue CTA button full-width
- Close X: `position: absolute; right: 840px; top: 12px` (35px)
- "Activado" state: left side shows `ProductSizesFull` component (size comparison diagram)

### Cómo hacerlo (desktop)
- Section label: Forma DJR Medium 22px uppercase
- 5 cards horizontal row: `display: flex; justify-content: center; px-50px`
- Each card: `width: 268px; height: 350px; padding: 40px 23px; border-right: 1px solid #c0bfbc; display: flex; flex-direction: column; justify-content: space-between`
- Circle icon: 70px, blue-tinted backgrounds (each step different shade)
- Step number: Forma DJR 10px tracking 0.4px (tiny superscript)
- Title: Times New Roman 28px capitalize tracking -0.56px
- Body: Forma DJR Medium 16px tracking 0.64px, `width: 235px`

### Cómo hacerlo (mobile)
- Section label: Forma DJR Medium 16px uppercase centered
- 5 cards STACKED VERTICALLY, each `width: 353px; border: 0.5px solid #c0bfbc; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 20px`
- Icon 43px centered, step number 12px centered, title 28px centered, body 16px centered `width: 292px`

### Quiénes somos (desktop)
- `background: #F0EFEB; padding: 56px 0; gap: 75px`
- Section label: Forma DJR Medium 22px uppercase, `px-50px`
- Founder: photo (429×491px, white 10px border, slight rotation) left + letter text right (Forma DJR Medium 22px, `width: 650px`) + cursive signature "maika" 75px
- Team: `pl-615px` — "NUESTRO EQUIPO" label + 2 photos side-by-side (317px each, faded names above)
- Values: "NUESTROS VALORES" label left + 3 bordered items right (`width: 878px`), each with `[0N]` + serif title 46px + body 22px. Bottom border between items.
- Reviews: "EN PALABRAS DE NUESTROS CLIENTES" + 3×2 grid of review cards (440px wide each, white 50% bg). Quote Times New Roman 26px centered + name Forma DJR 22px

### Quiénes somos (mobile)
- `background: #F0EFEB; padding: 30px 0; gap: 50px`
- All section labels 16px centered uppercase
- Founder photo 279×279px centered + text below (14px, 18px line-height) + signature 40px right-aligned
- Team: 2 photos side-by-side `171px each, px-20px`
- Values: 3 bordered cards centered (`width: 348px, p-20px`), number 12px + title 28px + body 16px — all centered
- Reviews: 1 review card (full-width, white 50% bg) + dot carousel below

### FAQs (desktop)
- Section label: Forma DJR Medium 22px uppercase
- Items `px-50px, gap: 18.8px`
- Each item: `border-bottom: 1px solid rgba(0,0,0,0.2); padding-bottom: 20px`
- Number: `[0N]` Forma DJR Regular 16px uppercase, `width: 28px`
- Question: Forma DJR Medium 22px tracking 0.88px
- Answer: Forma DJR Medium 16px tracking 0.64px opacity 30%, `padding-left: 45px, width: 675px`

### FAQs (mobile)
- Section label: Forma DJR Medium 16px uppercase centered
- Items `px-20px, gap: 10px`
- Number: `[0N]` Forma DJR Regular 10px uppercase
- Question: Forma DJR Medium 12px tracking 0.12px
- Answer: Forma DJR Medium 12px tracking 0.12px opacity 30%, `padding-left: 31px, width: 318px`

### Footer (desktop)
- Outer wrapper: `background: #F0EFEB; padding: 100px 50px; gap: 15px`
- Blue card (`#528ED6`, `height: 299px`):
  - Logo circle: `210px` diameter, cream bg `#F0EFEB`, inset shadow, at `left: 88px, top: 41px`
  - 3-column links at `left: 448px`: MENÚ / PERFIL / CONTACTO — Forma DJR Medium 15px white, labels uppercase, items 40% opacity
  - Social icons at `left: 847px, top: 139px`: circle group icons (FB + Instagram) 42px
- Legal strip: Forma DJR Regular 15px, opacity 60%, `width: full`

### Footer (mobile)
- `background: #528ED6; padding: 30px 0; gap: 40px`
- Logo circle: `104px` diameter, cream bg, centered
- Nav links: Forma DJR Medium 28px white centered, `gap: 10px`
- "Contactanos": Forma DJR Medium 28px white centered
- Social icons: 38px each, centered, `gap: 16px` (FB, X, Instagram, WhatsApp)

---

## Key interactive behaviors
- **Navbar**: sticky, glassmorphism on desktop. Mobile hamburger opens full-screen cream overlay.
- **Mobile menu**: slides in from right (or covers full screen). Times New Roman 40px links.
- **Product cards**: hover reveals white "Más información" overlay button centered on image.
- **Product pop-up**: triggered by "Más información". Carousel with prev/next arrows. "Comparar con otros tamaños" toggles left panel to size diagram. One size active at a time via tab pills.
- **FAQs**: accordion — one item open at a time.
- **Reviews (desktop)**: static 3×2 grid. (Mobile): single card + dot indicator (carousel).

---

## Rules
- **Always read this file before writing any landing code**
- CSS in separate `.css` file per component — no inline styles, no Tailwind
- All CSS colors via `var(--color-*)` from `globals.css`
- Mobile-first: base styles = mobile, `@media (min-width: 1024px)` = desktop
- ES only — no translation system needed
- Do NOT modify any file outside `app/components/Landing/`, `app/page.tsx`, and `public/`
- Images: use local `/public/` files or Cloudinary URLs — never hardcode Figma asset URLs in production code (they expire after 7 days)
- Before implementing any section, call `get_design_context` on its Figma node ID
