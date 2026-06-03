'use client'

import { useState, useEffect } from 'react'
import './CompareSizesModal.css'

// Physical dimensions [widthCm, heightCm]
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

// Scale: maps Grande H (41×29cm) to the 520×378px canvas
const SCALE_X = 520 / 41
const SCALE_Y = 378 / 29

const ORDER = ['chico', 'mediano', 'grande', 'vertical', 'cuadrado']

type Props = { onClose: () => void }

export default function CompareSizesModal({ onClose }: Props) {
  const [active, setActive] = useState('chico')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const [aw, ah] = BOOK_DIMS[active]
  const activePxW = Math.round(aw * SCALE_X)
  const activePxH = Math.round(ah * SCALE_Y)

  return (
    <div className="csm-backdrop" onClick={onClose}>
      <div className="csm" onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button className="csm__close" onClick={onClose} aria-label="Cerrar">×</button>

        {/* Diagram */}
        <div className="csm__canvas-wrap">
          <div className="csm__canvas">
            {ORDER.map(id => {
              const [w, h] = BOOK_DIMS[id]
              return (
                <div
                  key={id}
                  className={`csm__rect${id === active ? ' csm__rect--active' : ''}`}
                  style={{ width: Math.round(w * SCALE_X), height: Math.round(h * SCALE_Y) }}
                />
              )
            })}

            {/* Width label */}
            <span
              className="csm__dim csm__dim--w"
              style={{ top: activePxH + 8, left: activePxW / 2 }}
            >
              {aw} cm
            </span>

            {/* Height label */}
            <span
              className="csm__dim csm__dim--h"
              style={{ left: activePxW + 10, top: activePxH / 2 }}
            >
              {ah} cm
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="csm__tabs">
          {ORDER.map(id => (
            <button
              key={id}
              className={`csm__tab${id === active ? ' csm__tab--active' : ''}`}
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
