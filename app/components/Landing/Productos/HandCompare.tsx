'use client'
import './HandCompare.css'

const HAND_SRC      = '/fotos/mano.png'
const HAND_ICON_SRC = '/fotos/mano2.png' // thicker strokes — reads better at icon size

// Size of the reference hand overlay, drawn bigger than life for visibility
// against the comparison boxes. Keeps the source image's aspect ratio (718×888px).
const HAND_HEIGHT_CM = 23
const HAND_WIDTH_CM  = 18.7

// Fixed anchor within the comparison canvas — same real-world spot regardless
// of which book size tab is active, so the hand acts as a constant ruler.
const HAND_LEFT_CM   = 12.5
const HAND_BOTTOM_CM = 1

type ToggleProps = {
  active: boolean
  onClick: () => void
  className?: string
}

export function HandToggleButton({ active, onClick, className = '' }: ToggleProps) {
  return (
    <button
      type="button"
      className={`hand-toggle${active ? ' hand-toggle--active' : ''}${className ? ' ' + className : ''}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label="Comparar con el tamaño de una mano"
    >
      <img src={HAND_ICON_SRC} alt="" className="hand-toggle__icon" />
    </button>
  )
}

type OverlayProps = {
  show: boolean
  scaleX: number
  scaleY: number
}

export function HandOverlay({ show, scaleX, scaleY }: OverlayProps) {
  if (!show) return null
  return (
    <img
      src={HAND_SRC}
      alt="Mano de referencia (tamaño real aproximado)"
      className="hand-overlay"
      style={{
        width:  Math.round(HAND_WIDTH_CM  * scaleX),
        height: Math.round(HAND_HEIGHT_CM * scaleY),
        left:   Math.round(HAND_LEFT_CM   * scaleX),
        bottom: Math.round(HAND_BOTTOM_CM * scaleY),
      }}
    />
  )
}
