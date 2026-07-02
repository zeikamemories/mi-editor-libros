'use client'

import { useState } from 'react'
import { HandToggleButton, HandOverlay } from './HandCompare'
import './MobileProductModal.css'

const BOOK_DIMS: Record<string, [number, number]> = {
  chico:    [21,   14.8],
  mediano:  [28,   21.6],
  grande:   [41,   29  ],
  vertical: [21.6, 28  ],
  cuadrado: [29,   29  ],
}
const BOOK_LABELS: Record<string, string> = {
  chico:    'Chico H',
  mediano:  'Mediano H',
  grande:   'Grande H',
  vertical: 'Vertical',
  cuadrado: 'Cuadrado',
}
const ORDER = ['chico', 'mediano', 'grande', 'vertical', 'cuadrado']
const SCALE_X = 314 / 41
const SCALE_Y = 228 / 29

type Props = { onClose: () => void }

export default function MobileCompareModal({ onClose }: Props) {
  const [active, setActive] = useState('grande')
  const [showHand, setShowHand] = useState(false)

  const [aw, ah] = BOOK_DIMS[active]
  const activePxW = Math.round(aw * SCALE_X)
  const activePxH = Math.round(ah * SCALE_Y)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div className="mpm__comp-panel" onClick={e => e.stopPropagation()}>
        <div className="mpm__comp-header">
          <HandToggleButton active={showHand} onClick={() => setShowHand(v => !v)} />
          <button className="mpm__comp-close" onClick={onClose}>×</button>
        </div>
        <div className="mpm__comp-canvas-wrap">
          <div className="mpm__comp-canvas">
            <HandOverlay show={showHand} scaleX={SCALE_X} scaleY={SCALE_Y} />
            {ORDER.map(id => {
              const [w, h] = BOOK_DIMS[id]
              return (
                <div
                  key={id}
                  className={`mpm__comp-rect${id === active ? ' mpm__comp-rect--active' : ''}`}
                  style={{ width: Math.round(w * SCALE_X), height: Math.round(h * SCALE_Y) }}
                />
              )
            })}
            <span className="mpm__comp-dim mpm__comp-dim--w" style={{ top: activePxH + 6, left: activePxW / 2 }}>
              {aw} cm
            </span>
            <span className="mpm__comp-dim mpm__comp-dim--h" style={{ left: activePxW + 8, top: activePxH / 2 }}>
              {ah} cm
            </span>
          </div>
        </div>
        <div className="mpm__comp-tabs">
          {ORDER.map(id => (
            <button
              key={id}
              className={`mpm__comp-tab${id === active ? ' mpm__comp-tab--active' : ''}`}
              onClick={() => setActive(id)}
            >
              {BOOK_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
