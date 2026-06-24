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
    const h = 0.56
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

const layout_2_4: Layout = {
  id: 'layout_2_4',
  nombre: 'Dos filas con margen',
  photoCount: 2,
  orientation: 'any',
  // Full width within margin, 2 equal rows
  frames: [
    { x: M, y: ry(0, 2), w: 1 - M * 2, h: fh(2) },
    { x: M, y: ry(1, 2), w: 1 - M * 2, h: fh(2) },
  ],
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
  // 1 col × 3 rows within margin
  frames: [
    { x: M, y: ry(0, 3), w: 1 - M * 2, h: fh(3) },
    { x: M, y: ry(1, 3), w: 1 - M * 2, h: fh(3) },
    { x: M, y: ry(2, 3), w: 1 - M * 2, h: fh(3) },
  ],
};

const layout_3_4: Layout = {
  id: 'layout_3_4',
  nombre: 'Tres columnas centradas',
  photoCount: 3,
  orientation: 'any',
  // 3 cols × 1 row, vertically centered
  frames: (() => {
    const frameH = 0.4
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
    const frameH = frameW * 0.65
    const startY = (1 - (frameH * 2 + G)) / 2
    return [
      { x: cx(0, 2), y: startY,            w: frameW, h: frameH },
      { x: cx(1, 2), y: startY,            w: frameW, h: frameH },
      { x: cx(0, 2), y: startY + frameH + G, w: frameW, h: frameH },
      { x: cx(1, 2), y: startY + frameH + G, w: frameW, h: frameH },
    ]
  })(),
};

const layout_4_4: Layout = {
  id: 'layout_4_4',
  nombre: 'Grande izquierda, tres derecha',
  photoCount: 4,
  orientation: 'any',
  frames: (() => {
    const available = 1 - M * 2 - G
    const leftW     = available * 0.52
    const rightW    = available * 0.48
    const rightH    = fh(3)
    const rx        = M + leftW + G
    return [
      { x: M,  y: M,            w: leftW,  h: 1 - M * 2 },
      { x: rx, y: ry(0, 3),     w: rightW, h: rightH     },
      { x: rx, y: ry(1, 3),     w: rightW, h: rightH     },
      { x: rx, y: ry(2, 3),     w: rightW, h: rightH     },
    ]
  })(),
};

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

// ─── 2 FOTOS (editoriales) ─────────────────────────────────────────────────

const layout_2_5: Layout = {
  id: 'layout_2_5',
  nombre: 'Asimétrico 62/38',
  photoCount: 2,
  orientation: 'any',
  frames: (() => {
    const avail = 1 - M * 2 - G
    const leftW = avail * 0.62
    const rightW = avail * 0.38
    return [
      { x: M,                y: M, w: leftW,  h: 1 - M * 2 },
      { x: M + leftW + G,    y: M, w: rightW, h: 1 - M * 2 },
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
    const frameH = 0.56
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

// ─── 3 FOTOS (editoriales) ─────────────────────────────────────────────────

const layout_3_5: Layout = {
  id: 'layout_3_5',
  nombre: 'Columna editorial',
  photoCount: 3,
  orientation: 'any',
  // 1 large left + 2 stacked right (asymmetric widths)
  frames: (() => {
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.55
    const rightW = avail * 0.45
    const rx     = M + leftW + G
    return [
      { x: M,  y: M,        w: leftW,  h: 1 - M * 2 },
      { x: rx, y: ry(0, 2), w: rightW, h: fh(2)     },
      { x: rx, y: ry(1, 2), w: rightW, h: fh(2)     },
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

const layout_3_7: Layout = {
  id: 'layout_3_7',
  nombre: 'Franja + dos',
  photoCount: 3,
  orientation: 'any',
  // Full-bleed strip top, 2 columns with margin below
  frames: (() => {
    const stripH = 0.42
    const botY   = stripH + G
    const botH   = 1 - botY - M
    return [
      { x: 0,          y: 0,   w: 1,    h: stripH },
      { x: cx(0, 2),   y: botY, w: fw(2), h: botH  },
      { x: cx(1, 2),   y: botY, w: fw(2), h: botH  },
    ]
  })(),
}

const layout_3_8: Layout = {
  id: 'layout_3_8',
  nombre: 'Tres columnas desiguales',
  photoCount: 3,
  orientation: 'any',
  // Columns: narrow / wide / narrow — editorial magazine feel
  frames: (() => {
    const avail = 1 - M * 2 - G * 2
    const w1 = avail * 0.24
    const w2 = avail * 0.52
    const w3 = avail * 0.24
    return [
      { x: M,                     y: M, w: w1, h: 1 - M * 2 },
      { x: M + w1 + G,            y: M, w: w2, h: 1 - M * 2 },
      { x: M + w1 + G + w2 + G,   y: M, w: w3, h: 1 - M * 2 },
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

const layout_4_6: Layout = {
  id: 'layout_4_6',
  nombre: 'Banda + tres',
  photoCount: 4,
  orientation: 'any',
  // Full-bleed strip top, 3 small with margin below
  frames: (() => {
    const stripH = 0.44
    const botY   = stripH + G
    const botH   = 1 - botY - M
    return [
      { x: 0,          y: 0,    w: 1,     h: stripH },
      { x: cx(0, 3),   y: botY, w: fw(3), h: botH   },
      { x: cx(1, 3),   y: botY, w: fw(3), h: botH   },
      { x: cx(2, 3),   y: botY, w: fw(3), h: botH   },
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
    const leftW  = avail * 0.52
    const rightW = avail * 0.48
    const rx     = M + leftW + G
    return [
      { x: M,  y: M,        w: leftW,  h: 1 - M * 2 },
      { x: rx, y: ry(0, 3), w: rightW, h: fh(3)     },
      { x: rx, y: ry(1, 3), w: rightW, h: fh(3)     },
      { x: rx, y: ry(2, 3), w: rightW, h: fh(3)     },
    ]
  })(),
}

// ─── 5 FOTOS ───────────────────────────────────────────────────────────────

const layout_5_1: Layout = {
  id: 'layout_5_1',
  nombre: 'Grilla 2×2 + franja inferior',
  photoCount: 5,
  orientation: 'any',
  // 2×2 grid + 1 thin wide frame at bottom
  frames: (() => {
    const colW     = fw(2)
    const available = 1 - M * 2 - G * 2  // vertical space for 3 rows
    const topH     = available * 0.42
    const midH     = available * 0.42
    const botH     = available * 0.16
    return [
      { x: cx(0, 2), y: M,                        w: colW,      h: topH },
      { x: cx(1, 2), y: M,                        w: colW,      h: topH },
      { x: cx(0, 2), y: M + topH + G,             w: colW,      h: midH },
      { x: cx(1, 2), y: M + topH + G,             w: colW,      h: midH },
      { x: M,        y: M + topH + midH + G * 2,  w: 1 - M * 2, h: botH },
    ]
  })(),
};

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

const layout_5_4: Layout = {
  id: 'layout_5_4',
  nombre: '1 grande + 4 en grilla',
  photoCount: 5,
  orientation: 'any',
  // 1 large left + 2×2 grid right
  frames: (() => {
    const avail  = 1 - M * 2 - G
    const leftW  = avail * 0.50
    const rightW = avail * 0.50
    const rx     = M + leftW + G
    const cellW  = (rightW - G) / 2
    const cellH  = (1 - M * 2 - G) / 2
    return [
      { x: M,             y: M,         w: leftW, h: 1 - M * 2 },
      { x: rx,            y: ry(0, 2),  w: cellW, h: cellH      },
      { x: rx + cellW + G,y: ry(0, 2),  w: cellW, h: cellH      },
      { x: rx,            y: ry(1, 2),  w: cellW, h: cellH      },
      { x: rx + cellW + G,y: ry(1, 2),  w: cellW, h: cellH      },
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
  // 2 fotos
  layout_2_1, layout_2_2, layout_2_3, layout_2_4,
  layout_2_5, layout_2_6, layout_2_7, layout_2_8,
  // 3 fotos
  layout_3_1, layout_3_2, layout_3_3, layout_3_4,
  layout_3_5, layout_3_6, layout_3_7, layout_3_8,
  // 4 fotos
  layout_4_1, layout_4_2, layout_4_3, layout_4_4,
  layout_4_5, layout_4_6, layout_4_7,
  // 5 fotos
  layout_5_1, layout_5_2, layout_5_3,
  layout_5_4, layout_5_5,
];

export function getLayoutsByCantidad(cantidad: number): Layout[] {
  return LAYOUTS.filter((l) => l.photoCount === cantidad);
}
