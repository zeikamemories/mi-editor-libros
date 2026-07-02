'use client'
import { useState } from 'react'
import { HandToggleButton, HandOverlay } from './HandCompare'

// Physical dimensions [widthCm, heightCm] for each book
const BOOK_DIMS: Record<string, [number, number]> = {
  chico:    [21,   14.8],
  mediano:  [28,   21.6],
  grande:   [41,   29  ],
  vertical: [21.6, 28  ],
  cuadrado: [29,   29  ],
}

const BOOK_LABELS: Record<string, string> = {
  chico:    'Chico horizontal',
  mediano:  'Mediano horizontal',
  grande:   'Grande horizontal',
  vertical: 'Vertical',
  cuadrado: 'Cuadrado',
}

// Scale: maps Grande H (41×29cm) to the 384×279px canvas
const SCALE_X = 384 / 41
const SCALE_Y = 279 / 29

const ORDER = ['chico', 'mediano', 'grande', 'vertical', 'cuadrado']

type Props = {
  activeSize:   string
  onChangeSize: (id: string) => void
}

export default function SizeComparison({ activeSize, onChangeSize }: Props) {
  const [hoveredSize, setHoveredSize] = useState<string | null>(null)
  const [showHand, setShowHand] = useState(false)
  const [aw, ah] = BOOK_DIMS[activeSize]
  const activePxW = Math.round(aw * SCALE_X)
  const activePxH = Math.round(ah * SCALE_Y)

  return (
    <div className="pm__comparison">
      <HandToggleButton
        active={showHand}
        onClick={() => setShowHand(v => !v)}
        className="pm__hand-toggle"
      />

      <div className="pm__comparison-canvas-wrap">
        <div className="pm__comparison-canvas">
          <HandOverlay show={showHand} scaleX={SCALE_X} scaleY={SCALE_Y} />
          {ORDER.map(id => {
            const [w, h] = BOOK_DIMS[id]
            const isActive  = id === activeSize
            const isHovered = id === hoveredSize && !isActive
            return (
              <div
                key={id}
                className={`pm__size-rect${isActive ? ' pm__size-rect--active' : ''}${isHovered ? ' pm__size-rect--hovered' : ''}`}
                style={{ width: Math.round(w * SCALE_X), height: Math.round(h * SCALE_Y) }}
              />
            )
          })}

          {/* Width label — below active rect */}
          <span
            className="pm__size-dim pm__size-dim--w"
            style={{ top: activePxH + 5, left: activePxW / 2 }}
          >
            {aw} cm
          </span>

          {/* Height label — right of active rect, rotated */}
          <span
            className="pm__size-dim pm__size-dim--h"
            style={{ left: activePxW + 10, top: activePxH / 2 }}
          >
            {ah} cm
          </span>
        </div>
      </div>

      <div className="pm__comparison-tabs">
        {ORDER.map(id => (
          <button
            key={id}
            className={`pm__size-tab${id === activeSize ? ' pm__size-tab--active' : ''}`}
            onClick={() => onChangeSize(id)}
            onMouseEnter={() => setHoveredSize(id)}
            onMouseLeave={() => setHoveredSize(null)}
          >
            {BOOK_LABELS[id]}
          </button>
        ))}
      </div>
    </div>
  )
}
