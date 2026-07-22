// Layouts para el editor de fotolibros Zeika
// Todos los valores son decimales (0–1) relativos al ancho/alto de la página.

export const MARGIN = 0.06   // margen de página en los 4 lados
export const GAP    = 0.020  // separación entre frames — siempre este valor

// GAP is a fraction of its own axis (x-gaps are a fraction of page width, y-gaps a fraction
// of page height). On landscape books (width > height) that makes a vertical gap render
// thinner in pixels than a horizontal gap of the same GAP value. GAP_V compensates using the
// average width/height ratio of the 3 landscape sizes (chico/mediano/grande ≈ 1.38) so
// stacked frames read as evenly spaced as side-by-side ones.
export const GAP_V = GAP * 1.38

export type Frame = {
  x: number; // fracción del ancho desde el borde izquierdo  (0–1)
  y: number; // fracción del alto desde el borde superior    (0–1)
  w: number; // fracción del ancho de la página             (0–1)
  h: number; // fracción del alto de la página              (0–1)
};

export type Layout = {
  id: string;
  nombre: string;
  photoCount: number;
  orientation: 'any' | 'portrait' | 'landscape' | 'square';
  frames: Frame[];
};

// ─── Helpers internos ───────────────────────────────────────────────────────
// Ancho / alto de N columnas o filas con margen y gap:
//   cols(N) = (1 - MARGIN*2 - GAP*(N-1)) / N
//   x(col)  = MARGIN + col * (cols(N) + GAP)
//   (misma lógica para filas)

const M  = MARGIN
const G  = GAP
const fw = (n: number) => (1 - M * 2 - G * (n - 1)) / n   // frame width  for N cols
const fh = (n: number) => (1 - M * 2 - G * (n - 1)) / n   // frame height for N rows
const cx = (col: number, n: number) => M + col * (fw(n) + G)
const ry = (row: number, n: number) => M + row * (fh(n) + G)

// ─── 1 FOTO ────────────────────────────────────────────────────────────────

const layout_1_1: Layout = {
  id: 'layout_1_1',
  nombre: 'Cuadrada centrada',
  photoCount: 1,
  orientation: 'any',
  frames: [
    { x: 0.2, y: 0.25, w: 0.6, h: 0.5 },
  ],
};

const layout_1_2: Layout = {
  id: 'layout_1_2',
  nombre: 'Paisaje centrado',
  photoCount: 1,
  orientation: 'any',
  frames: [
    { x: 0.1, y: 0.3, w: 0.8, h: 0.4 },
  ],
};

const layout_1_3: Layout = {
  id: 'layout_1_3',
  nombre: 'Hoja completa',
  photoCount: 1,
  orientation: 'any',
  frames: [
    { x: 0, y: 0, w: 1, h: 1 },
  ],
};

const layout_1_4: Layout = {
  id: 'layout_1_4',
  nombre: 'Borde blanco',
  photoCount: 1,
  orientation: 'any',
  frames: [
    { x: M, y: M, w: 1 - M * 2, h: 1 - M * 2 },
  ],
};

// ─── 2 FOTOS ───────────────────────────────────────────────────────────────

const layout_2_1: Layout = {
  id: 'layout_2_1',
  nombre: 'Dos columnas retrato',
  photoCount: 2,
  orientation: 'any',
  frames: (() => {
    const h = 0.45
    const y = (1 - h) / 2
    return [
      { x: cx(0, 2), y, w: fw(2), h },
      { x: cx(1, 2), y, w: fw(2), h },
    ]
  })(),
};

const layout_2_2: Layout = {
  id: 'layout_2_2',
  nombre: 'Dos filas paisaje',
  photoCount: 2,
  orientation: 'any',
  // 1 col × 2 rows, landscape
  frames: [
    { x: M, y: ry(0, 2), w: 1 - M * 2, h: fh(2) },
    { x: M, y: ry(1, 2), w: 1 - M * 2, h: fh(2) },
  ],
};

const layout_2_12: Layout = {
  id: 'layout_2_12',
  nombre: 'Dos filas centradas con margen',
  photoCount: 2,
  orientation: 'any',
  // 2 landscape frames centered, wide side margins, white space above and below
  frames: (() => {
    const mH  = 0.14
    const w   = 1 - mH * 2
    const h   = 0.27
    const y0  = (1 - h * 2 - G) / 2
    return [
      { x: mH, y: y0,         w, h },
      { x: mH, y: y0 + h + G, w, h },
    ]
  })(),
}

const layout_2_3: Layout = {
  id: 'layout_2_3',
  nombre: 'Dos filas completas',
  photoCount: 2,
  orientation: 'any',
  // Full bleed, only GAP between rows
  frames: (() => {
    const h = (1 - G) / 2
    return [
      { x: 0, y: 0,     w: 1, h },
      { x: 0, y: h + G, w: 1, h },
    ]
  })(),
};


// ─── 3 FOTOS ───────────────────────────────────────────────────────────────

const layout_3_1: Layout = {
  id: 'layout_3_1',
  nombre: 'Grande arriba, dos abajo',
  photoCount: 3,
  orientation: 'any',
  frames: (() => {
    const available = 1 - M * 2 - G
    const topH = available * 0.55
    const botH = available * 0.45
    const botW = fw(2)
    return [
      { x: M,         y: M,             w: 1 - M * 2, h: topH },
      { x: cx(0, 2),  y: M + topH + G,  w: botW,      h: botH },
      { x: cx(1, 2),  y: M + topH + G,  w: botW,      h: botH },
    ]
  })(),
};

const layout_3_2: Layout = {
  id: 'layout_3_2',
  nombre: 'Dos arriba, grande abajo',
  photoCount: 3,
  orientation: 'any',
  // Full bleed: 2 cols top + 1 full-width bottom
  frames: (() => {
    const available = 1 - G
    const topH = available * 0.45
    const botH = available * 0.55
    const colW = (1 - G) / 2
    return [
      { x: 0,         y: 0,         w: colW, h: topH },
      { x: colW + G,  y: 0,         w: colW, h: topH },
      { x: 0,         y: topH + G,  w: 1,    h: botH },
    ]
  })(),
};

const layout_3_3: Layout = {
  id: 'layout_3_3',
  nombre: 'Tres filas centradas',
  photoCount: 3,
  orientation: 'any',
  // 3 equal rows, narrower width centered with white space on sides
  frames: (() => {
    const w = 0.38
    const x = (1 - w) / 2
    return [
      { x, y: ry(0, 3), w, h: fh(3) },
      { x, y: ry(1, 3), w, h: fh(3) },
      { x, y: ry(2, 3), w, h: fh(3) },
    ]
  })(),
};

const layout_3_4: Layout = {
  id: 'layout_3_4',
  nombre: 'Tres columnas centradas',
  photoCount: 3,
  orientation: 'any',
  // 3 cols × 1 row, vertically centered
  frames: (() => {
    const frameH = 0.30
    const y = (1 - frameH) / 2
    return [
      { x: cx(0, 3), y, w: fw(3), h: frameH },
      { x: cx(1, 3), y, w: fw(3), h: frameH },
      { x: cx(2, 3), y, w: fw(3), h: frameH },
    ]
  })(),
};

// ─── 4 FOTOS ───────────────────────────────────────────────────────────────

const layout_4_1: Layout = {
  id: 'layout_4_1',
  nombre: 'Grilla 2×2 con margen',
  photoCount: 4,
  orientation: 'any',
  frames: [
    { x: cx(0, 2), y: ry(0, 2), w: fw(2), h: fh(2) },
    { x: cx(1, 2), y: ry(0, 2), w: fw(2), h: fh(2) },
    { x: cx(0, 2), y: ry(1, 2), w: fw(2), h: fh(2) },
    { x: cx(1, 2), y: ry(1, 2), w: fw(2), h: fh(2) },
  ],
};

const layout_4_2: Layout = {
  id: 'layout_4_2',
  nombre: 'Grilla 2×2 completa',
  photoCount: 4,
  orientation: 'any',
  // Full bleed 2×2
  frames: (() => {
    const s = (1 - G) / 2
    return [
      { x: 0,     y: 0,     w: s, h: s },
      { x: s + G, y: 0,     w: s, h: s },
      { x: 0,     y: s + G, w: s, h: s },
      { x: s + G, y: s + G, w: s, h: s },
    ]
  })(),
};

const layout_4_3: Layout = {
  id: 'layout_4_3',
  nombre: 'Grilla 2×2 paisaje centrada',
  photoCount: 4,
  orientation: 'any',
  // 2×2 landscape frames, vertically centered
  frames: (() => {
    const frameW = fw(2)
    const frameH = frameW * 0.80
    const startY = (1 - (frameH * 2 + G)) / 2
    return [
      { x: cx(0, 2), y: startY,            w: frameW, h: frameH },
      { x: cx(1, 2), y: startY,            w: frameW, h: frameH },
      { x: cx(0, 2), y: startY + frameH + G, w: frameW, h: frameH },
      { x: cx(1, 2), y: startY + frameH + G, w: frameW, h: frameH },
    ]
  })(),
};


const layout_4_10: Layout = {
  id: 'layout_4_10',
  nombre: 'Grilla 2×2 sin margen lateral',
  photoCount: 4,
  orientation: 'any',
  // 2×2 grid, full bleed sides, white space top and bottom
  frames: (() => {
    const mV    = 0.10
    const cellW = (1 - G) / 2
    const cellH = (1 - mV * 2 - G) / 2
    return [
      { x: 0,        y: mV,             w: cellW, h: cellH },
      { x: cellW+G,  y: mV,             w: cellW, h: cellH },
      { x: 0,        y: mV + cellH + G, w: cellW, h: cellH },
      { x: cellW+G,  y: mV + cellH + G, w: cellW, h: cellH },
    ]
  })(),
}

const layout_4_11: Layout = {
  id: 'layout_4_11',
  nombre: 'Grilla 2×2 con margen (horizontal)',
  photoCount: 4,
  orientation: 'landscape',
  // Same as layout_4_1 but with GAP_V between rows so the vertical gap visually matches
  // the horizontal gap on landscape (wider-than-tall) books.
  frames: (() => {
    const cellH = (1 - M * 2 - GAP_V) / 2
    return [
      { x: cx(0, 2), y: M,                 w: fw(2), h: cellH },
      { x: cx(1, 2), y: M,                 w: fw(2), h: cellH },
      { x: cx(0, 2), y: M + cellH + GAP_V, w: fw(2), h: cellH },
      { x: cx(1, 2), y: M + cellH + GAP_V, w: fw(2), h: cellH },
    ]
  })(),
}

// ─── 1 FOTO (editoriales) ──────────────────────────────────────────────────

const layout_1_5: Layout = {
  id: 'layout_1_5',
  nombre: 'Cine',
  photoCount: 1,
  orientation: 'any',
  // Full-bleed cinematic horizontal strip
  frames: [{ x: 0, y: 0.27, w: 1, h: 0.46 }],
}

const layout_1_6: Layout = {
  id: 'layout_1_6',
  nombre: 'Sangría izquierda',
  photoCount: 1,
  orientation: 'any',
  // Photo bleeds full left + vertical, white space on right
  frames: [{ x: 0, y: 0, w: 0.70, h: 1 }],
}

const layout_1_7: Layout = {
  id: 'layout_1_7',
  nombre: 'Polaroid',
  photoCount: 1,
  orientation: 'any',
  // Centered, big bottom white margin
  frames: [{ x: 0.10, y: 0.07, w: 0.80, h: 0.68 }],
}

const layout_1_8: Layout = {
  id: 'layout_1_8',
  nombre: 'Sangría derecha',
  photoCount: 1,
  orientation: 'any',
  // Photo bleeds full right + vertical, white space on left
  frames: [{ x: 0.30, y: 0, w: 0.70, h: 1 }],
}

// ─── 1 FOTO (horizontal) ───────────────────────────────────────────────────

const layout_1_9: Layout = {
  id: 'layout_1_9',
  nombre: 'Franja centrada',
  photoCount: 1,
  orientation: 'landscape',
  // Wide strip bleeding to left/right edges, equal white space above and below
  frames: [{ x: 0, y: (1 - 0.62) / 2, w: 1, h: 0.62 }],
}

const layout_1_10: Layout = {
  id: 'layout_1_10',
  nombre: 'Cuadrado centrado',
  photoCount: 1,
  orientation: 'landscape',
  // Small square photo, centered
  frames: [{ x: (1 - 0.33) / 2, y: (1 - 0.42) / 2, w: 0.33, h: 0.42 }],
}

const layout_1_11: Layout = {
  id: 'layout_1_11',
  nombre: 'Franja inferior',
  photoCount: 1,
  orientation: 'landscape',
  // White space at top, photo bleeds to left/right/bottom
  frames: [{ x: 0, y: 0.30, w: 1, h: 0.70 }],
}

const layout_1_12: Layout = {
  id: 'layout_1_12',
  nombre: 'Franja superior',
  photoCount: 1,
  orientation: 'landscape',
  // White space at bottom, photo bleeds to top/left/right
  frames: [{ x: 0, y: 0, w: 1, h: 0.70 }],
}

// ─── 2 FOTOS (editoriales) ─────────────────────────────────────────────────

const layout_2_5: Layout = {
  id: 'layout_2_5',
  nombre: 'Asimétrico 62/38',
  photoCount: 2,
  orientation: 'any',
  frames: (() => {
    const mV    = 0.27
    const avail = 1 - M * 2 - G
    const leftW = avail * 0.62
    const rightW = avail * 0.38
    const h     = 1 - mV * 2
    return [
      { x: M,             y: mV, w: leftW,  h },
      { x: M + leftW + G, y: mV, w: rightW, h },
    ]
  })(),
}

const layout_2_6: Layout = {
  id: 'layout_2_6',
  nombre: 'Escalonado',
  photoCount: 2,
  orientation: 'any',
  // Photo 1 top-left, Photo 2 bottom-right — diagonal feel
  frames: (() => {
    const colW  = fw(2)
    const frameH = 0.45
    return [
      { x: cx(0, 2), y: M,                     w: colW, h: frameH },
      { x: cx(1, 2), y: 1 - M - frameH,        w: colW, h: frameH },
    ]
  })(),
}

const layout_2_7: Layout = {
  id: 'layout_2_7',
  nombre: 'Díptico completo',
  photoCount: 2,
  orientation: 'any',
  // Full bleed, no gap, exactly half each
  frames: [
    { x: 0,   y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 1 },
  ],
}

const layout_2_13: Layout = {
  id: 'layout_2_13',
  nombre: 'Díptico horizontal',
  photoCount: 2,
  orientation: 'any',
  // Mirror of layout_2_7: two full-bleed halves stacked top/bottom
  frames: [
    { x: 0, y: 0,   w: 1, h: 0.5 },
    { x: 0, y: 0.5, w: 1, h: 0.5 },
  ],
}

const layout_2_8: Layout = {
  id: 'layout_2_8',
  nombre: 'Grande + detalle',
  photoCount: 2,
  orientation: 'any',
  // Big top, small bottom-right
  frames: (() => {
    const available = 1 - M * 2 - G
    const bigH   = available * 0.68
    const smallH = available * 0.32
    const smallW = fw(2)
    return [
      { x: M,          y: M,               w: 1 - M * 2, h: bigH   },
      { x: cx(1, 2),   y: M + bigH + G,    w: smallW,    h: smallH },
    ]
  })(),
}

// ─── 2 FOTOS (horizontal) ──────────────────────────────────────────────────

const layout_2_9: Layout = {
  id: 'layout_2_9',
  nombre: 'Dos columnas altas',
  photoCount: 2,
  orientation: 'landscape',
  // Two equal columns filling full height within margins
  frames: [
    { x: cx(0, 2), y: M, w: fw(2), h: 1 - M * 2 },
    { x: cx(1, 2), y: M, w: fw(2), h: 1 - M * 2 },
  ],
}

const layout_2_10: Layout = {
  id: 'layout_2_10',
  nombre: 'Dos apiladas centradas',
  photoCount: 2,
  orientation: 'landscape',
  // Two stacked photos centered horizontally
  frames: (() => {
    const w = 0.52
    const x = (1 - w) / 2
    return [
      { x, y: ry(0, 2), w, h: fh(2) },
      { x, y: ry(1, 2), w, h: fh(2) },
    ]
  })(),
}

const layout_2_11: Layout = {
  id: 'layout_2_11',
  nombre: 'Escalonado diagonal',
  photoCount: 2,
  orientation: 'landscape',
  // Two equal rectangles, centered as group, photo 1 upper-left, photo 2 lower-right
  frames: (() => {
    const w = 0.40
    const h = 0.65
    const x1 = (1 - (w * 2 + G)) / 2
    const x2 = x1 + w + G
    return [
      { x: x1, y: M,         w, h },
      { x: x2, y: 1 - M - h, w, h },
    ]
  })(),
}

// ─── 3 FOTOS (editoriales) ─────────────────────────────────────────────────

const layout_3_5: Layout = {
  id: 'layout_3_5',
  nombre: 'Columna editorial',
  photoCount: 3,
  orientation: 'any',
  // 1 large left + 2 stacked right (asymmetric widths)
  frames: (() => {
    const mV     = 0.22
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.55
    const rightW = avail * 0.45
    const rx     = M + leftW + G
    const h      = 1 - mV * 2
    const cellH  = (h - G) / 2
    return [
      { x: M,  y: mV,             w: leftW,  h        },
      { x: rx, y: mV,             w: rightW, h: cellH },
      { x: rx, y: mV + cellH + G, w: rightW, h: cellH },
    ]
  })(),
}

const layout_3_12: Layout = {
  id: 'layout_3_12',
  nombre: 'Columna editorial espejada',
  photoCount: 3,
  orientation: 'any',
  // Mirror of layout_3_5: 2 stacked left + 1 large right
  frames: (() => {
    const mV     = 0.22
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.45
    const rightW = avail * 0.55
    const rx     = M + leftW + G
    const h      = 1 - mV * 2
    const cellH  = (h - G) / 2
    return [
      { x: M,  y: mV,             w: leftW,  h: cellH },
      { x: M,  y: mV + cellH + G, w: leftW,  h: cellH },
      { x: rx, y: mV,             w: rightW, h        },
    ]
  })(),
}

const layout_3_13: Layout = {
  id: 'layout_3_13',
  nombre: 'Columna editorial sin margen',
  photoCount: 3,
  orientation: 'any',
  // Full-bleed version of layout_3_5: 1 large left + 2 stacked right, no side margins
  frames: (() => {
    const mV    = 0.22
    const avail = 1 - G
    const leftW = avail * 0.55
    const rightW = avail * 0.45
    const rx    = leftW + G
    const h     = 1 - mV * 2
    const cellH = (h - G) / 2
    return [
      { x: 0,  y: mV,             w: leftW,  h        },
      { x: rx, y: mV,             w: rightW, h: cellH },
      { x: rx, y: mV + cellH + G, w: rightW, h: cellH },
    ]
  })(),
}

const layout_3_14: Layout = {
  id: 'layout_3_14',
  nombre: 'Columna editorial espejada sin margen',
  photoCount: 3,
  orientation: 'any',
  // Full-bleed version of layout_3_12: 2 stacked left + 1 large right, no side margins
  frames: (() => {
    const mV     = 0.22
    const avail  = 1 - G
    const leftW  = avail * 0.45
    const rightW = avail * 0.55
    const rx     = leftW + G
    const h      = 1 - mV * 2
    const cellH  = (h - G) / 2
    return [
      { x: 0,  y: mV,             w: leftW,  h: cellH },
      { x: 0,  y: mV + cellH + G, w: leftW,  h: cellH },
      { x: rx, y: mV,             w: rightW, h        },
    ]
  })(),
}


// ─── 3 FOTOS (horizontal) ──────────────────────────────────────────────────

const layout_3_9: Layout = {
  id: 'layout_3_9',
  nombre: 'Dos arriba, grande abajo',
  photoCount: 3,
  orientation: 'landscape',
  // 2 equal photos top, 1 large photo bottom, all with margins
  frames: (() => {
    const available = 1 - M * 2 - G
    const topH = available * 0.45
    const botH = available * 0.55
    return [
      { x: cx(0, 2), y: M,            w: fw(2),     h: topH },
      { x: cx(1, 2), y: M,            w: fw(2),     h: topH },
      { x: M,        y: M + topH + G, w: 1 - M * 2, h: botH },
    ]
  })(),
}

const layout_3_10: Layout = {
  id: 'layout_3_10',
  nombre: 'Dos izquierda, grande derecha',
  photoCount: 3,
  orientation: 'landscape',
  // 2 stacked photos left, 1 large photo right. Uses GAP_V (not the shared ry() helper)
  // between the stacked frames so it visually matches the left/right GAP.
  frames: (() => {
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.45
    const rightW = avail * 0.55
    const rx     = M + leftW + G
    const cellH  = (1 - M * 2 - GAP_V) / 2
    return [
      { x: M,  y: M,                 w: leftW,  h: cellH },
      { x: M,  y: M + cellH + GAP_V, w: leftW,  h: cellH },
      { x: rx, y: M,                 w: rightW, h: 1 - M * 2 },
    ]
  })(),
}

const layout_3_15: Layout = {
  id: 'layout_3_15',
  nombre: 'Grande izquierda, dos derecha',
  photoCount: 3,
  orientation: 'landscape',
  // Mirror of layout_3_10: 1 large photo left + 2 stacked photos right. Uses GAP_V (not the
  // shared ry() helper) between the stacked frames so it visually matches the left/right GAP.
  frames: (() => {
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.55
    const rightW = avail * 0.45
    const rx     = M + leftW + G
    const cellH  = (1 - M * 2 - GAP_V) / 2
    return [
      { x: M,  y: M,                 w: leftW,  h: 1 - M * 2 },
      { x: rx, y: M,                 w: rightW, h: cellH },
      { x: rx, y: M + cellH + GAP_V, w: rightW, h: cellH },
    ]
  })(),
}

const layout_3_16: Layout = {
  id: 'layout_3_16',
  nombre: 'Dos izquierda, grande derecha completo',
  photoCount: 3,
  orientation: 'landscape',
  // Full-bleed version of layout_3_10: 2 stacked left + 1 large right, no margins
  frames: (() => {
    const leftW  = (1 - G) * 0.45
    const rightW = (1 - G) * 0.55
    const rx     = leftW + G
    const cellH  = (1 - G) / 2
    return [
      { x: 0,  y: 0,          w: leftW,  h: cellH },
      { x: 0,  y: cellH + G,  w: leftW,  h: cellH },
      { x: rx, y: 0,          w: rightW, h: 1      },
    ]
  })(),
}

const layout_3_17: Layout = {
  id: 'layout_3_17',
  nombre: 'Grande izquierda, dos derecha completo',
  photoCount: 3,
  orientation: 'landscape',
  // Full-bleed version of layout_3_15: 1 large left + 2 stacked right, no margins
  frames: (() => {
    const leftW  = (1 - G) * 0.55
    const rightW = (1 - G) * 0.45
    const rx     = leftW + G
    const cellH  = (1 - G) / 2
    return [
      { x: 0,  y: 0,         w: leftW,  h: 1      },
      { x: rx, y: 0,         w: rightW, h: cellH  },
      { x: rx, y: cellH + G, w: rightW, h: cellH  },
    ]
  })(),
}

const layout_3_11: Layout = {
  id: 'layout_3_11',
  nombre: 'Grande arriba, dos abajo completo',
  photoCount: 3,
  orientation: 'any',
  // Full bleed inverse of layout_3_2: 1 wide top + 2 cols bottom
  frames: (() => {
    const colW = (1 - G) / 2
    const topH = (1 - G) * 0.55
    const botH = (1 - G) * 0.45
    return [
      { x: 0,        y: 0,        w: 1,    h: topH },
      { x: 0,        y: topH + G, w: colW, h: botH },
      { x: colW + G, y: topH + G, w: colW, h: botH },
    ]
  })(),
}

// ─── 4 FOTOS (editoriales) ─────────────────────────────────────────────────

const layout_4_5: Layout = {
  id: 'layout_4_5',
  nombre: 'Tres pequeñas + grande',
  photoCount: 4,
  orientation: 'any',
  // 3 small top + 1 wide bottom
  frames: (() => {
    const available = 1 - M * 2 - G
    const topH = available * 0.36
    const botH = available * 0.64
    return [
      { x: cx(0, 3), y: M,            w: fw(3),     h: topH },
      { x: cx(1, 3), y: M,            w: fw(3),     h: topH },
      { x: cx(2, 3), y: M,            w: fw(3),     h: topH },
      { x: M,        y: M + topH + G, w: 1 - M * 2, h: botH },
    ]
  })(),
}

const layout_4_9: Layout = {
  id: 'layout_4_9',
  nombre: 'Grande arriba, tres pequeñas',
  photoCount: 4,
  orientation: 'any',
  // Mirror of layout_4_5: 1 wide top + 3 small bottom
  frames: (() => {
    const available = 1 - M * 2 - G
    const topH = available * 0.64
    const botH = available * 0.36
    return [
      { x: M,        y: M,            w: 1 - M * 2, h: topH },
      { x: cx(0, 3), y: M + topH + G, w: fw(3),     h: botH },
      { x: cx(1, 3), y: M + topH + G, w: fw(3),     h: botH },
      { x: cx(2, 3), y: M + topH + G, w: fw(3),     h: botH },
    ]
  })(),
}

const layout_4_7: Layout = {
  id: 'layout_4_7',
  nombre: '1 grande + 3 apiladas',
  photoCount: 4,
  orientation: 'any',
  // 1 large left + 3 stacked right
  frames: (() => {
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.60
    const rightW = avail * 0.40
    const rx     = M + leftW + G
    return [
      { x: M,  y: M,        w: leftW,  h: 1 - M * 2 },
      { x: rx, y: ry(0, 3), w: rightW, h: fh(3)     },
      { x: rx, y: ry(1, 3), w: rightW, h: fh(3)     },
      { x: rx, y: ry(2, 3), w: rightW, h: fh(3)     },
    ]
  })(),
}

const layout_4_8: Layout = {
  id: 'layout_4_8',
  nombre: '3 apiladas + grande derecha',
  photoCount: 4,
  orientation: 'any',
  // Mirror of layout_4_7: 3 stacked left + 1 large right
  frames: (() => {
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.40
    const rightW = avail * 0.60
    const rx     = M + leftW + G
    return [
      { x: M,  y: ry(0, 3), w: leftW,  h: fh(3)     },
      { x: M,  y: ry(1, 3), w: leftW,  h: fh(3)     },
      { x: M,  y: ry(2, 3), w: leftW,  h: fh(3)     },
      { x: rx, y: M,        w: rightW, h: 1 - M * 2 },
    ]
  })(),
}

// ─── 5 FOTOS ───────────────────────────────────────────────────────────────


const layout_5_2: Layout = {
  id: 'layout_5_2',
  nombre: 'Dos izquierda, tres derecha',
  photoCount: 5,
  orientation: 'any',
  // Full bleed columns: 2 stacked left + 3 stacked right
  frames: (() => {
    const leftW  = (1 - G) * 0.55
    const rightW = 1 - G - leftW
    const rx     = leftW + G
    const leftH  = (1 - G) / 2
    const rightH = (1 - G * 2) / 3
    return [
      { x: 0,   y: 0,               w: leftW,  h: leftH  },
      { x: 0,   y: leftH + G,       w: leftW,  h: leftH  },
      { x: rx,  y: 0,               w: rightW, h: rightH },
      { x: rx,  y: rightH + G,      w: rightW, h: rightH },
      { x: rx,  y: rightH*2 + G*2,  w: rightW, h: rightH },
    ]
  })(),
};

const layout_5_3: Layout = {
  id: 'layout_5_3',
  nombre: 'Dos arriba, tres abajo con margen',
  photoCount: 5,
  orientation: 'landscape',
  frames: (() => {
    const mV      = M
    const topW    = fw(2)
    const available = 1 - mV * 2 - G
    const topH    = available * 0.45
    const botH    = available * 0.55
    const botW    = fw(3)
    return [
      { x: cx(0, 2), y: mV,             w: topW, h: topH },
      { x: cx(1, 2), y: mV,             w: topW, h: topH },
      { x: cx(0, 3), y: mV + topH + G,  w: botW, h: botH },
      { x: cx(1, 3), y: mV + topH + G,  w: botW, h: botH },
      { x: cx(2, 3), y: mV + topH + G,  w: botW, h: botH },
    ]
  })(),
};

const layout_5_3p: Layout = {
  id: 'layout_5_3p',
  nombre: 'Dos arriba, tres abajo con margen (vertical)',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV      = 0.20
    const topW    = fw(2)
    const available = 1 - mV * 2 - G
    const topH    = available * 0.45
    const botH    = available * 0.55
    const botW    = fw(3)
    return [
      { x: cx(0, 2), y: mV,             w: topW, h: topH },
      { x: cx(1, 2), y: mV,             w: topW, h: topH },
      { x: cx(0, 3), y: mV + topH + G,  w: botW, h: botH },
      { x: cx(1, 3), y: mV + topH + G,  w: botW, h: botH },
      { x: cx(2, 3), y: mV + topH + G,  w: botW, h: botH },
    ]
  })(),
};

const layout_5_3pf: Layout = {
  id: 'layout_5_3pf',
  nombre: 'Dos arriba, tres abajo completo (vertical)',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV      = 0.20
    const topW    = (1 - G) / 2
    const botW    = (1 - G * 2) / 3
    const available = 1 - mV * 2 - G
    const topH    = available * 0.45
    const botH    = available * 0.55
    return [
      { x: 0,              y: mV,             w: topW, h: topH },
      { x: topW + G,       y: mV,             w: topW, h: topH },
      { x: 0,              y: mV + topH + G,  w: botW, h: botH },
      { x: botW + G,       y: mV + topH + G,  w: botW, h: botH },
      { x: (botW + G) * 2, y: mV + topH + G,  w: botW, h: botH },
    ]
  })(),
};

const layout_5_6: Layout = {
  id: 'layout_5_6',
  nombre: 'Tres arriba, dos abajo con margen',
  photoCount: 5,
  orientation: 'landscape',
  // Mirror of layout_5_3: 3 top + 2 bottom with margins
  frames: (() => {
    const mV      = M
    const available = 1 - mV * 2 - G
    const topH = available * 0.55
    const botH = available * 0.45
    return [
      { x: cx(0, 3), y: mV,             w: fw(3), h: topH },
      { x: cx(1, 3), y: mV,             w: fw(3), h: topH },
      { x: cx(2, 3), y: mV,             w: fw(3), h: topH },
      { x: cx(0, 2), y: mV + topH + G,  w: fw(2), h: botH },
      { x: cx(1, 2), y: mV + topH + G,  w: fw(2), h: botH },
    ]
  })(),
}

const layout_5_6p: Layout = {
  id: 'layout_5_6p',
  nombre: 'Tres arriba, dos abajo con margen (vertical)',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV      = 0.20
    const available = 1 - mV * 2 - G
    const topH = available * 0.55
    const botH = available * 0.45
    return [
      { x: cx(0, 3), y: mV,             w: fw(3), h: topH },
      { x: cx(1, 3), y: mV,             w: fw(3), h: topH },
      { x: cx(2, 3), y: mV,             w: fw(3), h: topH },
      { x: cx(0, 2), y: mV + topH + G,  w: fw(2), h: botH },
      { x: cx(1, 2), y: mV + topH + G,  w: fw(2), h: botH },
    ]
  })(),
}

const layout_5_6pf: Layout = {
  id: 'layout_5_6pf',
  nombre: 'Tres arriba, dos abajo completo (vertical)',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV      = 0.20
    const topW    = (1 - G * 2) / 3
    const botW    = (1 - G) / 2
    const available = 1 - mV * 2 - G
    const topH = available * 0.55
    const botH = available * 0.45
    return [
      { x: 0,              y: mV,             w: topW, h: topH },
      { x: topW + G,       y: mV,             w: topW, h: topH },
      { x: (topW + G) * 2, y: mV,             w: topW, h: topH },
      { x: 0,              y: mV + topH + G,  w: botW, h: botH },
      { x: botW + G,       y: mV + topH + G,  w: botW, h: botH },
    ]
  })(),
}

const layout_5_12: Layout = {
  id: 'layout_5_12',
  nombre: 'Dos arriba, tres abajo completo',
  photoCount: 5,
  orientation: 'any',
  // Full-bleed version of layout_5_3: 2 top + 3 bottom, no margins
  frames: (() => {
    const topW = (1 - G) / 2
    const botW = (1 - G * 2) / 3
    const topH = (1 - G) * 0.45
    const botH = (1 - G) * 0.55
    return [
      { x: 0,              y: 0,        w: topW, h: topH },
      { x: topW + G,       y: 0,        w: topW, h: topH },
      { x: 0,              y: topH + G, w: botW, h: botH },
      { x: botW + G,       y: topH + G, w: botW, h: botH },
      { x: (botW + G) * 2, y: topH + G, w: botW, h: botH },
    ]
  })(),
}

const layout_5_13: Layout = {
  id: 'layout_5_13',
  nombre: 'Tres arriba, dos abajo completo',
  photoCount: 5,
  orientation: 'any',
  // Full-bleed version of layout_5_6: 3 top + 2 bottom, no margins
  frames: (() => {
    const topW = (1 - G * 2) / 3
    const botW = (1 - G) / 2
    const topH = (1 - G) * 0.55
    const botH = (1 - G) * 0.45
    return [
      { x: 0,              y: 0,        w: topW, h: topH },
      { x: topW + G,       y: 0,        w: topW, h: topH },
      { x: (topW + G) * 2, y: 0,        w: topW, h: topH },
      { x: 0,              y: topH + G, w: botW, h: botH },
      { x: botW + G,       y: topH + G, w: botW, h: botH },
    ]
  })(),
}

const layout_5_4: Layout = {
  id: 'layout_5_4',
  nombre: '1 grande + 4 en grilla',
  photoCount: 5,
  orientation: 'landscape',
  // 1 large left + 2×2 grid right, extra vertical white space
  frames: (() => {
    const mV     = 0.12
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.50
    const rightW = avail * 0.50
    const rx     = M + leftW + G
    const cellW  = (rightW - G) / 2
    const cellH  = (1 - mV * 2 - G) / 2
    return [
      { x: M,              y: mV,          w: leftW, h: 1 - mV * 2 },
      { x: rx,             y: mV,          w: cellW, h: cellH       },
      { x: rx + cellW + G, y: mV,          w: cellW, h: cellH       },
      { x: rx,             y: mV + cellH + G, w: cellW, h: cellH    },
      { x: rx + cellW + G, y: mV + cellH + G, w: cellW, h: cellH    },
    ]
  })(),
}

const layout_5_8: Layout = {
  id: 'layout_5_8',
  nombre: '4 en grilla + 1 grande con margen',
  photoCount: 5,
  orientation: 'landscape',
  // Mirror of layout_5_4: 2×2 grid left + 1 large right, with side margins
  frames: (() => {
    const mV    = 0.12
    const avail = 1 - M * 2 - G
    const halfW = avail * 0.50
    const cellW = (halfW - G) / 2
    const cellH = (1 - mV * 2 - G) / 2
    const rx    = M + halfW + G
    return [
      { x: M,             y: mV,             w: cellW,  h: cellH },
      { x: M + cellW + G, y: mV,             w: cellW,  h: cellH },
      { x: M,             y: mV + cellH + G, w: cellW,  h: cellH },
      { x: M + cellW + G, y: mV + cellH + G, w: cellW,  h: cellH },
      { x: rx,            y: mV,             w: halfW,  h: 1 - mV * 2 },
    ]
  })(),
}

const layout_5_9: Layout = {
  id: 'layout_5_9',
  nombre: '1 grande + 4 en grilla sin margen',
  photoCount: 5,
  orientation: 'landscape',
  // Mirror of layout_5_7: 1 large left + 2×2 grid right, no side margins
  frames: (() => {
    const mV    = 0.12
    const half  = (1 - G) / 2
    const cellW = (half - G) / 2
    const cellH = (1 - mV * 2 - G) / 2
    const rx    = half + G
    return [
      { x: 0,             y: mV,             w: half,   h: 1 - mV * 2 },
      { x: rx,            y: mV,             w: cellW,  h: cellH },
      { x: rx + cellW + G,y: mV,             w: cellW,  h: cellH },
      { x: rx,            y: mV + cellH + G, w: cellW,  h: cellH },
      { x: rx + cellW + G,y: mV + cellH + G, w: cellW,  h: cellH },
    ]
  })(),
}

const layout_5_7: Layout = {
  id: 'layout_5_7',
  nombre: '4 en grilla + 1 grande',
  photoCount: 5,
  orientation: 'landscape',
  // Mirror of layout_5_4: 2×2 grid left + 1 large right, no side margins, white space top/bottom
  frames: (() => {
    const mV    = 0.12
    const half  = (1 - G) / 2
    const cellW = (half - G) / 2
    const cellH = (1 - mV * 2 - G) / 2
    const rx    = half + G
    return [
      { x: 0,          y: mV,             w: cellW, h: cellH },
      { x: cellW + G,  y: mV,             w: cellW, h: cellH },
      { x: 0,          y: mV + cellH + G, w: cellW, h: cellH },
      { x: cellW + G,  y: mV + cellH + G, w: cellW, h: cellH },
      { x: rx,         y: mV,             w: 1 - rx, h: 1 - mV * 2 },
    ]
  })(),
}

const layout_5_14: Layout = {
  id: 'layout_5_14',
  nombre: '1 grande + 4 en grilla (vertical)',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV     = 0.23
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.50
    const rightW = avail * 0.50
    const rx     = M + leftW + G
    const cellW  = (rightW - G) / 2
    const cellH  = (1 - mV * 2 - G) / 2
    return [
      { x: M,              y: mV,             w: leftW, h: 1 - mV * 2 },
      { x: rx,             y: mV,             w: cellW, h: cellH       },
      { x: rx + cellW + G, y: mV,             w: cellW, h: cellH       },
      { x: rx,             y: mV + cellH + G, w: cellW, h: cellH       },
      { x: rx + cellW + G, y: mV + cellH + G, w: cellW, h: cellH       },
    ]
  })(),
}

const layout_5_15: Layout = {
  id: 'layout_5_15',
  nombre: '4 en grilla + 1 grande con margen (vertical)',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV    = 0.23
    const avail = 1 - M * 2 - G
    const halfW = avail * 0.50
    const cellW = (halfW - G) / 2
    const cellH = (1 - mV * 2 - G) / 2
    const rx    = M + halfW + G
    return [
      { x: M,             y: mV,             w: cellW, h: cellH },
      { x: M + cellW + G, y: mV,             w: cellW, h: cellH },
      { x: M,             y: mV + cellH + G, w: cellW, h: cellH },
      { x: M + cellW + G, y: mV + cellH + G, w: cellW, h: cellH },
      { x: rx,            y: mV,             w: halfW, h: 1 - mV * 2 },
    ]
  })(),
}

const layout_5_16: Layout = {
  id: 'layout_5_16',
  nombre: '1 grande + 4 en grilla sin margen (vertical)',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV    = 0.23
    const half  = (1 - G) / 2
    const cellW = (half - G) / 2
    const cellH = (1 - mV * 2 - G) / 2
    const rx    = half + G
    return [
      { x: 0,              y: mV,             w: half,  h: 1 - mV * 2 },
      { x: rx,             y: mV,             w: cellW, h: cellH },
      { x: rx + cellW + G, y: mV,             w: cellW, h: cellH },
      { x: rx,             y: mV + cellH + G, w: cellW, h: cellH },
      { x: rx + cellW + G, y: mV + cellH + G, w: cellW, h: cellH },
    ]
  })(),
}

const layout_5_17: Layout = {
  id: 'layout_5_17',
  nombre: '4 en grilla + 1 grande (vertical)',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV    = 0.23
    const half  = (1 - G) / 2
    const cellW = (half - G) / 2
    const cellH = (1 - mV * 2 - G) / 2
    const rx    = half + G
    return [
      { x: 0,         y: mV,             w: cellW,  h: cellH },
      { x: cellW + G, y: mV,             w: cellW,  h: cellH },
      { x: 0,         y: mV + cellH + G, w: cellW,  h: cellH },
      { x: cellW + G, y: mV + cellH + G, w: cellW,  h: cellH },
      { x: rx,        y: mV,             w: 1 - rx, h: 1 - mV * 2 },
    ]
  })(),
}

const layout_5_18: Layout = {
  id: 'layout_5_18',
  nombre: 'Grande arriba, grilla 2×2 abajo',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV    = 0.05
    const mH    = 0.10
    const avail = 1 - mV * 2 - G
    const topH  = avail * 0.55
    const botH  = avail * 0.45
    const cellW = (1 - mH * 2 - G) / 2
    const cellH = (botH - G) / 2
    const y1    = mV + topH + G
    return [
      { x: mH,          y: mV,             w: 1 - mH * 2, h: topH  },
      { x: mH,          y: y1,             w: cellW,      h: cellH },
      { x: mH + cellW + G, y: y1,          w: cellW,      h: cellH },
      { x: mH,          y: y1 + cellH + G, w: cellW,      h: cellH },
      { x: mH + cellW + G, y: y1 + cellH + G, w: cellW,   h: cellH },
    ]
  })(),
}

const layout_5_19: Layout = {
  id: 'layout_5_19',
  nombre: 'Grilla 2×2 arriba, grande abajo',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV    = 0.05
    const mH    = 0.10
    const avail = 1 - mV * 2 - G
    const topH  = avail * 0.45
    const botH  = avail * 0.55
    const cellW = (1 - mH * 2 - G) / 2
    const cellH = (topH - G) / 2
    const y2    = mV + topH + G
    return [
      { x: mH,             y: mV,             w: cellW,      h: cellH },
      { x: mH + cellW + G, y: mV,             w: cellW,      h: cellH },
      { x: mH,             y: mV + cellH + G, w: cellW,      h: cellH },
      { x: mH + cellW + G, y: mV + cellH + G, w: cellW,      h: cellH },
      { x: mH,             y: y2,             w: 1 - mH * 2, h: botH  },
    ]
  })(),
}

const layout_5_20: Layout = {
  id: 'layout_5_20',
  nombre: 'Grande arriba, grilla 2×2 abajo completo',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV    = 0.05
    const avail = 1 - mV * 2 - G
    const topH  = avail * 0.55
    const botH  = avail * 0.45
    const cellW = (1 - G) / 2
    const cellH = (botH - G) / 2
    const y1    = mV + topH + G
    return [
      { x: 0,        y: mV,             w: 1,     h: topH  },
      { x: 0,        y: y1,             w: cellW, h: cellH },
      { x: cellW + G,y: y1,             w: cellW, h: cellH },
      { x: 0,        y: y1 + cellH + G, w: cellW, h: cellH },
      { x: cellW + G,y: y1 + cellH + G, w: cellW, h: cellH },
    ]
  })(),
}

const layout_5_21: Layout = {
  id: 'layout_5_21',
  nombre: 'Grilla 2×2 arriba, grande abajo completo',
  photoCount: 5,
  orientation: 'portrait',
  frames: (() => {
    const mV    = 0.05
    const avail = 1 - mV * 2 - G
    const topH  = avail * 0.45
    const botH  = avail * 0.55
    const cellW = (1 - G) / 2
    const cellH = (topH - G) / 2
    const y2    = mV + topH + G
    return [
      { x: 0,        y: mV,             w: cellW, h: cellH },
      { x: cellW + G,y: mV,             w: cellW, h: cellH },
      { x: 0,        y: mV + cellH + G, w: cellW, h: cellH },
      { x: cellW + G,y: mV + cellH + G, w: cellW, h: cellH },
      { x: 0,        y: y2,             w: 1,     h: botH  },
    ]
  })(),
}

const layout_5_5: Layout = {
  id: 'layout_5_5',
  nombre: 'Tres izquierda, dos derecha',
  photoCount: 5,
  orientation: 'any',
  // Full bleed columns: 3 stacked left + 2 stacked right
  frames: (() => {
    const leftW  = (1 - G) * 0.45
    const rightW = 1 - G - leftW
    const rx     = leftW + G
    const leftH  = (1 - G * 2) / 3
    const rightH = (1 - G) / 2
    return [
      { x: 0,   y: 0,              w: leftW,  h: leftH  },
      { x: 0,   y: leftH + G,      w: leftW,  h: leftH  },
      { x: 0,   y: leftH*2 + G*2,  w: leftW,  h: leftH  },
      { x: rx,  y: 0,              w: rightW, h: rightH },
      { x: rx,  y: rightH + G,     w: rightW, h: rightH },
    ]
  })(),
}

const layout_5_10: Layout = {
  id: 'layout_5_10',
  nombre: 'Dos + uno ancho + dos',
  photoCount: 5,
  orientation: 'any',
  // 2 asymmetric cols top | 1 full-width middle | 2 asymmetric cols bottom (mirrored)
  frames: (() => {
    const avail  = 1 - M * 2 - G
    const wideW  = avail * 0.60
    const narrowW = avail * 0.40
    const available3 = 1 - M * 2 - G * 2
    const topH   = available3 * 0.28
    const midH   = available3 * 0.44
    const botH   = available3 * 0.28
    const y1     = M + topH + G
    const y2     = y1 + midH + G
    return [
      { x: M,              y: M,  w: wideW,     h: topH },
      { x: M + wideW + G,  y: M,  w: narrowW,   h: topH },
      { x: M,              y: y1, w: 1 - M * 2, h: midH },
      { x: M,              y: y2, w: narrowW,   h: botH },
      { x: M + narrowW + G,y: y2, w: wideW,     h: botH },
    ]
  })(),
}

const layout_5_11: Layout = {
  id: 'layout_5_11',
  nombre: 'Uno ancho + dos + dos',
  photoCount: 5,
  orientation: 'any',
  // 1 full-width top | 2 asymmetric cols middle | 2 asymmetric cols bottom (mirrored)
  frames: (() => {
    const avail   = 1 - M * 2 - G
    const wideW   = avail * 0.60
    const narrowW = avail * 0.40
    const available3 = 1 - M * 2 - G * 2
    const topH    = available3 * 0.30
    const midH    = available3 * 0.35
    const botH    = available3 * 0.35
    const y1      = M + topH + G
    const y2      = y1 + midH + G
    return [
      { x: M,               y: M,  w: 1 - M * 2, h: topH },
      { x: M,               y: y1, w: wideW,     h: midH },
      { x: M + wideW + G,   y: y1, w: narrowW,   h: midH },
      { x: M,               y: y2, w: narrowW,   h: botH },
      { x: M + narrowW + G, y: y2, w: wideW,     h: botH },
    ]
  })(),
}

// ─── 6 FOTOS (portrait) ────────────────────────────────────────────────────

const layout_6_p1: Layout = {
  id: 'layout_6_p1',
  nombre: 'Grilla 3×2',
  photoCount: 6,
  orientation: 'portrait',
  frames: [
    { x: cx(0,3), y: ry(0,2), w: fw(3), h: fh(2) },
    { x: cx(1,3), y: ry(0,2), w: fw(3), h: fh(2) },
    { x: cx(2,3), y: ry(0,2), w: fw(3), h: fh(2) },
    { x: cx(0,3), y: ry(1,2), w: fw(3), h: fh(2) },
    { x: cx(1,3), y: ry(1,2), w: fw(3), h: fh(2) },
    { x: cx(2,3), y: ry(1,2), w: fw(3), h: fh(2) },
  ],
}

const layout_6_p2: Layout = {
  id: 'layout_6_p2',
  nombre: 'Grande, tira de 5',
  photoCount: 6,
  orientation: 'portrait',
  frames: (() => {
    const mV   = 0.06
    const avail = 1 - mV * 2 - G
    const topH  = avail * 0.60
    const botH  = avail * 0.40
    const botW  = (1 - M * 2 - G * 4) / 5
    const y1    = mV + topH + G
    return [
      { x: M,                    y: mV, w: 1 - M * 2, h: topH },
      { x: M + (botW + G) * 0,   y: y1, w: botW,      h: botH },
      { x: M + (botW + G) * 1,   y: y1, w: botW,      h: botH },
      { x: M + (botW + G) * 2,   y: y1, w: botW,      h: botH },
      { x: M + (botW + G) * 3,   y: y1, w: botW,      h: botH },
      { x: M + (botW + G) * 4,   y: y1, w: botW,      h: botH },
    ]
  })(),
}

const layout_6_p3: Layout = {
  id: 'layout_6_p3',
  nombre: '2 izquierda + grilla derecha',
  photoCount: 6,
  orientation: 'portrait',
  frames: (() => {
    const mV     = M
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.45
    const rightW = avail * 0.55
    const rx     = M + leftW + G
    const cellH  = (1 - mV * 2 - G) / 2
    const cellW  = (rightW - G) / 2
    return [
      { x: M,              y: mV,             w: leftW, h: cellH },
      { x: M,              y: mV + cellH + G, w: leftW, h: cellH },
      { x: rx,             y: mV,             w: cellW, h: cellH },
      { x: rx + cellW + G, y: mV,             w: cellW, h: cellH },
      { x: rx,             y: mV + cellH + G, w: cellW, h: cellH },
      { x: rx + cellW + G, y: mV + cellH + G, w: cellW, h: cellH },
    ]
  })(),
}

const layout_6_p4: Layout = {
  id: 'layout_6_p4',
  nombre: 'Pirámide 1-2-3',
  photoCount: 6,
  orientation: 'portrait',
  frames: (() => {
    const mV    = 0.06
    const avail = 1 - mV * 2 - G * 2
    const topH  = avail * 0.32
    const midH  = avail * 0.38
    const botH  = avail * 0.30
    const y1    = mV + topH + G
    const y2    = y1 + midH + G
    return [
      { x: M,        y: mV, w: 1 - M * 2, h: topH },
      { x: cx(0, 2), y: y1, w: fw(2),     h: midH },
      { x: cx(1, 2), y: y1, w: fw(2),     h: midH },
      { x: cx(0, 3), y: y2, w: fw(3),     h: botH },
      { x: cx(1, 3), y: y2, w: fw(3),     h: botH },
      { x: cx(2, 3), y: y2, w: fw(3),     h: botH },
    ]
  })(),
}

const layout_6_p5: Layout = {
  id: 'layout_6_p5',
  nombre: 'Grilla 3×2 completa',
  photoCount: 6,
  orientation: 'portrait',
  frames: (() => {
    const cellW = (1 - G * 2) / 3
    const cellH = (1 - G) / 2
    return [
      { x: 0,             y: 0,         w: cellW, h: cellH },
      { x: cellW + G,     y: 0,         w: cellW, h: cellH },
      { x: (cellW + G)*2, y: 0,         w: cellW, h: cellH },
      { x: 0,             y: cellH + G, w: cellW, h: cellH },
      { x: cellW + G,     y: cellH + G, w: cellW, h: cellH },
      { x: (cellW + G)*2, y: cellH + G, w: cellW, h: cellH },
    ]
  })(),
}

// ─── 6 FOTOS (landscape) ───────────────────────────────────────────────────

const layout_6_l2: Layout = {
  id: 'layout_6_l2',
  nombre: 'Grilla 3×2',
  photoCount: 6,
  orientation: 'landscape',
  frames: [
    { x: cx(0,3), y: ry(0,2), w: fw(3), h: fh(2) },
    { x: cx(1,3), y: ry(0,2), w: fw(3), h: fh(2) },
    { x: cx(2,3), y: ry(0,2), w: fw(3), h: fh(2) },
    { x: cx(0,3), y: ry(1,2), w: fw(3), h: fh(2) },
    { x: cx(1,3), y: ry(1,2), w: fw(3), h: fh(2) },
    { x: cx(2,3), y: ry(1,2), w: fw(3), h: fh(2) },
  ],
}

const layout_6_l4: Layout = {
  id: 'layout_6_l4',
  nombre: 'Grilla 2×2 + 2 columna derecha',
  photoCount: 6,
  orientation: 'landscape',
  frames: (() => {
    const mV     = M
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.60
    const rightW = avail * 0.40
    const rx     = M + leftW + G
    const cellH  = (1 - mV * 2 - G) / 2
    const cellW  = (leftW - G) / 2
    return [
      { x: M,              y: mV,             w: cellW,  h: cellH },
      { x: M + cellW + G,  y: mV,             w: cellW,  h: cellH },
      { x: M,              y: mV + cellH + G, w: cellW,  h: cellH },
      { x: M + cellW + G,  y: mV + cellH + G, w: cellW,  h: cellH },
      { x: rx,             y: mV,             w: rightW, h: cellH },
      { x: rx,             y: mV + cellH + G, w: rightW, h: cellH },
    ]
  })(),
}

const layout_6_l5: Layout = {
  id: 'layout_6_l5',
  nombre: 'Grilla 3×2 completa',
  photoCount: 6,
  orientation: 'landscape',
  frames: (() => {
    const cellW = (1 - G * 2) / 3
    const cellH = (1 - G) / 2
    return [
      { x: 0,             y: 0,         w: cellW, h: cellH },
      { x: cellW + G,     y: 0,         w: cellW, h: cellH },
      { x: (cellW + G)*2, y: 0,         w: cellW, h: cellH },
      { x: 0,             y: cellH + G, w: cellW, h: cellH },
      { x: cellW + G,     y: cellH + G, w: cellW, h: cellH },
      { x: (cellW + G)*2, y: cellH + G, w: cellW, h: cellH },
    ]
  })(),
}

// ─── 6 FOTOS (square) ──────────────────────────────────────────────────────

const layout_6_s1: Layout = {
  id: 'layout_6_s1',
  nombre: 'Grilla 3×2',
  photoCount: 6,
  orientation: 'square',
  frames: [
    { x: cx(0,3), y: ry(0,2), w: fw(3), h: fh(2) },
    { x: cx(1,3), y: ry(0,2), w: fw(3), h: fh(2) },
    { x: cx(2,3), y: ry(0,2), w: fw(3), h: fh(2) },
    { x: cx(0,3), y: ry(1,2), w: fw(3), h: fh(2) },
    { x: cx(1,3), y: ry(1,2), w: fw(3), h: fh(2) },
    { x: cx(2,3), y: ry(1,2), w: fw(3), h: fh(2) },
  ],
}

const layout_6_s2: Layout = {
  id: 'layout_6_s2',
  nombre: 'Grilla 2×3',
  photoCount: 6,
  orientation: 'square',
  frames: [
    { x: cx(0,2), y: ry(0,3), w: fw(2), h: fh(3) },
    { x: cx(1,2), y: ry(0,3), w: fw(2), h: fh(3) },
    { x: cx(0,2), y: ry(1,3), w: fw(2), h: fh(3) },
    { x: cx(1,2), y: ry(1,3), w: fw(2), h: fh(3) },
    { x: cx(0,2), y: ry(2,3), w: fw(2), h: fh(3) },
    { x: cx(1,2), y: ry(2,3), w: fw(2), h: fh(3) },
  ],
}

const layout_6_s3: Layout = {
  id: 'layout_6_s3',
  nombre: 'Grilla 3×2 completa',
  photoCount: 6,
  orientation: 'square',
  frames: (() => {
    const cellW = (1 - G * 2) / 3
    const cellH = (1 - G) / 2
    return [
      { x: 0,             y: 0,         w: cellW, h: cellH },
      { x: cellW + G,     y: 0,         w: cellW, h: cellH },
      { x: (cellW + G)*2, y: 0,         w: cellW, h: cellH },
      { x: 0,             y: cellH + G, w: cellW, h: cellH },
      { x: cellW + G,     y: cellH + G, w: cellW, h: cellH },
      { x: (cellW + G)*2, y: cellH + G, w: cellW, h: cellH },
    ]
  })(),
}

const layout_6_s4: Layout = {
  id: 'layout_6_s4',
  nombre: 'Pirámide 1-2-3',
  photoCount: 6,
  orientation: 'square',
  frames: (() => {
    const mV    = 0.06
    const avail = 1 - mV * 2 - G * 2
    const topH  = avail * 0.30
    const midH  = avail * 0.36
    const botH  = avail * 0.34
    const y1    = mV + topH + G
    const y2    = y1 + midH + G
    return [
      { x: M,        y: mV, w: 1 - M * 2, h: topH },
      { x: cx(0, 2), y: y1, w: fw(2),     h: midH },
      { x: cx(1, 2), y: y1, w: fw(2),     h: midH },
      { x: cx(0, 3), y: y2, w: fw(3),     h: botH },
      { x: cx(1, 3), y: y2, w: fw(3),     h: botH },
      { x: cx(2, 3), y: y2, w: fw(3),     h: botH },
    ]
  })(),
}

const layout_6_s5: Layout = {
  id: 'layout_6_s5',
  nombre: '2 izquierda + grilla derecha',
  photoCount: 6,
  orientation: 'square',
  frames: (() => {
    const mV     = 0.06
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.45
    const rightW = avail * 0.55
    const rx     = M + leftW + G
    const cellH  = (1 - mV * 2 - G) / 2
    const cellW  = (rightW - G) / 2
    return [
      { x: M,              y: mV,             w: leftW, h: cellH },
      { x: M,              y: mV + cellH + G, w: leftW, h: cellH },
      { x: rx,             y: mV,             w: cellW, h: cellH },
      { x: rx + cellW + G, y: mV,             w: cellW, h: cellH },
      { x: rx,             y: mV + cellH + G, w: cellW, h: cellH },
      { x: rx + cellW + G, y: mV + cellH + G, w: cellW, h: cellH },
    ]
  })(),
}

// ─── 7 FOTOS (landscape) ───────────────────────────────────────────────────
// Medidas tomadas 1:1 del diseño de Figma (frame 1704×1200, node 2291:8133):
// fila de arriba 3 columnas (las dos primeras iguales, la tercera más ancha,
// 400/400/630px) y fila de abajo un mosaico que reusa el ancho de la primera
// columna (400px) + una columna ancha (713px) + una columna angosta (323px)
// partida en dos celdas apiladas.

const layout_7_1: Layout = {
  id: 'layout_7_1',
  nombre: 'Tres arriba, mosaico abajo',
  photoCount: 7,
  orientation: 'landscape',
  frames: (() => {
    const mV = M
    const availV = 1 - mV * 2 - G
    const topH = availV * (524 / 979)   // 524/455px en Figma
    const botH = availV * (455 / 979)

    const availW = 1 - M * 2 - G * 2
    const colA = availW / (2 + 630 / 400)   // dos columnas iguales + una 1.575x más ancha
    const colC = availW - colA * 2
    const xA = M
    const xB = xA + colA + G
    const xC = xB + colA + G

    const restW  = 1 - M * 2 - colA - G   // ancho libre tras la columna izquierda de abajo
    const bcTotal = restW - G
    const colB2 = bcTotal * (713 / (713 + 323))
    const colC2 = bcTotal - colB2
    const xB2 = xB
    const xC2 = xB2 + colB2 + G

    const yTop = mV
    const yBot = mV + topH + G
    const cellH = (botH - GAP_V) / 2
    const yCell2 = yBot + cellH + GAP_V

    return [
      { x: xA,  y: yTop,   w: colA,  h: topH },
      { x: xB,  y: yTop,   w: colA,  h: topH },
      { x: xC,  y: yTop,   w: colC,  h: topH },
      { x: xA,  y: yBot,   w: colA,  h: botH },
      { x: xB2, y: yBot,   w: colB2, h: botH },
      { x: xC2, y: yBot,   w: colC2, h: cellH },
      { x: xC2, y: yCell2, w: colC2, h: cellH },
    ]
  })(),
}

// ─── 8 FOTOS (landscape) ───────────────────────────────────────────────────
// Medidas tomadas del diseño de Figma (frame 1704×1200, node 2291:8172): franja
// ancha arriba a la izquierda + foto grande arriba a la derecha, columna alta +
// foto chica abajo a la izquierda, foto ancha en el medio, columna angosta
// partida en dos a la derecha.

const layout_8_l1: Layout = {
  id: 'layout_8_l1',
  nombre: 'Mosaico asimétrico',
  photoCount: 8,
  orientation: 'landscape',
  frames: [
    { x: 0.06,   y: 0.06,   w: 0.4052, h: 0.2443 },
    { x: 0.4859, y: 0.06,   w: 0.4541, h: 0.4652 },
    { x: 0.06,   y: 0.3278, w: 0.2168, h: 0.3791 },
    { x: 0.2933, y: 0.3278, w: 0.172,  h: 0.1974 },
    { x: 0.2933, y: 0.5522, w: 0.4394, h: 0.3878 },
    { x: 0.7497, y: 0.5522, w: 0.1903, h: 0.1965 },
    { x: 0.06,   y: 0.7278, w: 0.2168, h: 0.2122 },
    { x: 0.7497, y: 0.7713, w: 0.1903, h: 0.1687 },
  ],
}

// ─── 8 FOTOS (square) ──────────────────────────────────────────────────────

const layout_8_s1: Layout = {
  id: 'layout_8_s1',
  nombre: '3-2-3 editorial',
  photoCount: 8,
  orientation: 'square',
  frames: (() => {
    const avail = 1 - M * 2 - G * 2
    const topH  = avail * 0.30
    const midH  = avail * 0.40
    const botH  = avail * 0.30
    const y1    = M + topH + G
    const y2    = y1 + midH + G
    return [
      { x: cx(0, 3), y: M,  w: fw(3), h: topH },
      { x: cx(1, 3), y: M,  w: fw(3), h: topH },
      { x: cx(2, 3), y: M,  w: fw(3), h: topH },
      { x: cx(0, 2), y: y1, w: fw(2), h: midH },
      { x: cx(1, 2), y: y1, w: fw(2), h: midH },
      { x: cx(0, 3), y: y2, w: fw(3), h: botH },
      { x: cx(1, 3), y: y2, w: fw(3), h: botH },
      { x: cx(2, 3), y: y2, w: fw(3), h: botH },
    ]
  })(),
}

// ─── 9 FOTOS (landscape) ───────────────────────────────────────────────────
// Medidas tomadas del diseño de Figma (frame 1704×1200, node 2291:8151): dos
// columnas parejas + foto ancha arriba a la izquierda, foto ancha + columna
// alta arriba a la derecha, columna angosta partida en dos a la derecha, dos
// columnas parejas abajo a la izquierda.

const layout_9_l1: Layout = {
  id: 'layout_9_l1',
  nombre: 'Mosaico asimétrico',
  photoCount: 9,
  orientation: 'landscape',
  frames: [
    { x: 0.06,   y: 0.06,   w: 0.2168, h: 0.2443 },
    { x: 0.2933, y: 0.06,   w: 0.2168, h: 0.2443 },
    { x: 0.5312, y: 0.06,   w: 0.4088, h: 0.393  },
    { x: 0.06,   y: 0.3278, w: 0.45,   h: 0.3365 },
    { x: 0.5312, y: 0.4765, w: 0.2003, h: 0.4635 },
    { x: 0.7497, y: 0.4765, w: 0.1903, h: 0.2722 },
    { x: 0.06,   y: 0.6896, w: 0.2168, h: 0.2504 },
    { x: 0.2933, y: 0.6896, w: 0.2168, h: 0.2504 },
    { x: 0.7497, y: 0.7713, w: 0.1903, h: 0.1687 },
  ],
}

const layout_9_s1: Layout = {
  id: 'layout_9_s1',
  nombre: 'Grilla 3×3',
  photoCount: 9,
  orientation: 'square',
  frames: [
    { x: cx(0,3), y: ry(0,3), w: fw(3), h: fh(3) },
    { x: cx(1,3), y: ry(0,3), w: fw(3), h: fh(3) },
    { x: cx(2,3), y: ry(0,3), w: fw(3), h: fh(3) },
    { x: cx(0,3), y: ry(1,3), w: fw(3), h: fh(3) },
    { x: cx(1,3), y: ry(1,3), w: fw(3), h: fh(3) },
    { x: cx(2,3), y: ry(1,3), w: fw(3), h: fh(3) },
    { x: cx(0,3), y: ry(2,3), w: fw(3), h: fh(3) },
    { x: cx(1,3), y: ry(2,3), w: fw(3), h: fh(3) },
    { x: cx(2,3), y: ry(2,3), w: fw(3), h: fh(3) },
  ],
}

// ─── Array principal ────────────────────────────────────────────────────────

export const LAYOUTS: Layout[] = [
  // 1 foto
  layout_1_1, layout_1_2, layout_1_3, layout_1_4,
  layout_1_5, layout_1_6, layout_1_7, layout_1_8,
  layout_1_9, layout_1_10, layout_1_11, layout_1_12,
  // 2 fotos
  layout_2_1, layout_2_2, layout_2_12, layout_2_3,
  layout_2_9, layout_2_10, layout_2_11,
  layout_2_5, layout_2_6, layout_2_7, layout_2_13, layout_2_8,
  // 3 fotos
  layout_3_1, layout_3_9, layout_3_2, layout_3_11, layout_3_3, layout_3_4,
  layout_3_5, layout_3_12, layout_3_13, layout_3_14, layout_3_10, layout_3_15, layout_3_16, layout_3_17,
  // 4 fotos
  layout_4_1, layout_4_2, layout_4_3, layout_4_10, layout_4_11,
  layout_4_5, layout_4_9, layout_4_7, layout_4_8,
  // 5 fotos
  layout_5_2, layout_5_5, layout_5_3p, layout_5_3pf, layout_5_6p, layout_5_6pf, layout_5_3, layout_5_6, layout_5_12, layout_5_13,
  layout_5_4, layout_5_8, layout_5_9, layout_5_7,
  layout_5_14, layout_5_15, layout_5_16, layout_5_17,
  layout_5_18, layout_5_19, layout_5_20, layout_5_21,
  layout_5_10, layout_5_11,
  // 6 fotos
  layout_6_p1, layout_6_p2, layout_6_p3, layout_6_p4, layout_6_p5,
  layout_6_l2, layout_6_l4, layout_6_l5,
  layout_6_s1, layout_6_s2, layout_6_s3, layout_6_s4, layout_6_s5,
  // 7 fotos
  layout_7_1,
  // 8 fotos
  layout_8_l1, layout_8_s1,
  // 9 fotos
  layout_9_l1, layout_9_s1,
];

export function getLayoutsByCantidad(cantidad: number): Layout[] {
  return LAYOUTS.filter((l) => l.photoCount === cantidad);
}
