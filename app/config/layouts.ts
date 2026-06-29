// Layouts para el editor de fotolibros Zeika
// Todos los valores son decimales (0–1) relativos al ancho/alto de la página.

export const MARGIN = 0.06   // margen de página en los 4 lados
export const GAP    = 0.025  // separación entre frames — siempre este valor

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
  nombre: 'Página completa',
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
    const mV    = 0.22
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

const layout_3_6: Layout = {
  id: 'layout_3_6',
  nombre: 'T invertida',
  photoCount: 3,
  orientation: 'any',
  // 2 small top + 1 wide bottom
  frames: (() => {
    const available = 1 - M * 2 - G
    const topH = available * 0.38
    const botH = available * 0.62
    return [
      { x: cx(0, 2), y: M,             w: fw(2),      h: topH },
      { x: cx(1, 2), y: M,             w: fw(2),      h: topH },
      { x: M,        y: M + topH + G,  w: 1 - M * 2,  h: botH },
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
  // 2 stacked photos left, 1 large photo right
  frames: (() => {
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.45
    const rightW = avail * 0.55
    const rx     = M + leftW + G
    return [
      { x: M,  y: ry(0, 2), w: leftW,  h: fh(2)     },
      { x: M,  y: ry(1, 2), w: leftW,  h: fh(2)     },
      { x: rx, y: M,        w: rightW, h: 1 - M * 2 },
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
  nombre: 'Dos arriba, tres abajo completo',
  photoCount: 5,
  orientation: 'any',
  // Full bleed: 2 cols top + 3 cols bottom
  frames: (() => {
    const topH = (1 - G) * 0.5
    const botH = (1 - G) * 0.5
    const topW = (1 - G) / 2
    const botW = (1 - G * 2) / 3
    return [
      { x: 0,            y: 0,        w: topW, h: topH },
      { x: topW + G,     y: 0,        w: topW, h: topH },
      { x: 0,            y: topH + G, w: botW, h: botH },
      { x: botW + G,     y: topH + G, w: botW, h: botH },
      { x: botW * 2 + G * 2, y: topH + G, w: botW, h: botH },
    ]
  })(),
};

const layout_5_3: Layout = {
  id: 'layout_5_3',
  nombre: 'Dos arriba, tres abajo con margen',
  photoCount: 5,
  orientation: 'any',
  frames: (() => {
    const topW     = fw(2)
    const available = 1 - M * 2 - G  // vertical space for 2 rows
    const topH     = available * 0.45
    const botH     = available * 0.55
    const botW     = fw(3)
    return [
      { x: cx(0, 2), y: M,            w: topW, h: topH },
      { x: cx(1, 2), y: M,            w: topW, h: topH },
      { x: cx(0, 3), y: M + topH + G, w: botW, h: botH },
      { x: cx(1, 3), y: M + topH + G, w: botW, h: botH },
      { x: cx(2, 3), y: M + topH + G, w: botW, h: botH },
    ]
  })(),
};

const layout_5_6: Layout = {
  id: 'layout_5_6',
  nombre: 'Tres arriba, dos abajo con margen',
  photoCount: 5,
  orientation: 'any',
  // Mirror of layout_5_3: 3 top + 2 bottom with margins
  frames: (() => {
    const available = 1 - M * 2 - G
    const topH = available * 0.55
    const botH = available * 0.45
    return [
      { x: cx(0, 3), y: M,            w: fw(3), h: topH },
      { x: cx(1, 3), y: M,            w: fw(3), h: topH },
      { x: cx(2, 3), y: M,            w: fw(3), h: topH },
      { x: cx(0, 2), y: M + topH + G, w: fw(2), h: botH },
      { x: cx(1, 2), y: M + topH + G, w: fw(2), h: botH },
    ]
  })(),
}

const layout_5_4: Layout = {
  id: 'layout_5_4',
  nombre: '1 grande + 4 en grilla',
  photoCount: 5,
  orientation: 'any',
  // 1 large left + 2×2 grid right, extra vertical white space
  frames: (() => {
    const mV     = 0.16
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

const layout_5_7: Layout = {
  id: 'layout_5_7',
  nombre: '4 en grilla + 1 grande',
  photoCount: 5,
  orientation: 'any',
  // Mirror of layout_5_4: 2×2 grid left + 1 large right, no side margins, white space top/bottom
  frames: (() => {
    const mV    = 0.16
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

const layout_5_5: Layout = {
  id: 'layout_5_5',
  nombre: 'Editorial 3+2',
  photoCount: 5,
  orientation: 'any',
  // 3 cols full-bleed top + 2 cols full-bleed bottom (unequal heights)
  frames: (() => {
    const topH = (1 - G) * 0.52
    const botH = (1 - G) * 0.48
    const tw   = (1 - G * 2) / 3
    const bw   = (1 - G) / 2
    return [
      { x: 0,            y: 0,        w: tw,  h: topH },
      { x: tw + G,       y: 0,        w: tw,  h: topH },
      { x: tw * 2 + G*2, y: 0,        w: tw,  h: topH },
      { x: 0,            y: topH + G, w: bw,  h: botH },
      { x: bw + G,       y: topH + G, w: bw,  h: botH },
    ]
  })(),
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
  layout_3_1, layout_3_6, layout_3_9, layout_3_2, layout_3_11, layout_3_3, layout_3_4,
  layout_3_5, layout_3_12, layout_3_13, layout_3_14, layout_3_10,
  // 4 fotos
  layout_4_1, layout_4_2, layout_4_3, layout_4_10,
  layout_4_5, layout_4_9, layout_4_7, layout_4_8,
  // 5 fotos
  layout_5_2, layout_5_5, layout_5_3, layout_5_6,
  layout_5_4, layout_5_7,
];

export function getLayoutsByCantidad(cantidad: number): Layout[] {
  return LAYOUTS.filter((l) => l.photoCount === cantidad);
}
