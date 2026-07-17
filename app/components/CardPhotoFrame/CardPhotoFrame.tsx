'use client'

import { useRef } from 'react'
import './CardPhotoFrame.css'

export type CardTransform = {
  scale: number
  rotation: 0 | 90 | 180 | 270
  offsetX: number
  offsetY: number
}

export const DEFAULT_CARD_TRANSFORM: CardTransform = { scale: 1, rotation: 0, offsetX: 0, offsetY: 0 }

type Props = {
  src: string | null
  transform?: CardTransform
  onChange?: (t: CardTransform) => void
  className?: string
}

/**
 * Compone la foto del cliente sobre la carta en blanco de `/fotos/CartaMockupVertical.jpg` (la
 * carta de arriba, donde dice "tu foto" — versión rotada de CartaMockup.jpg para llenar mejor
 * paneles verticales). Si se pasa `onChange`, queda interactivo: arrastrar
 * reposiciona, hay controles de zoom y rotación. Sin `onChange` es de solo lectura — aplica el
 * `transform` guardado, para reusar el mismo encuadre que eligió el cliente en cualquier otra
 * pantalla (mockup del pedido, vista del staff, etc). Sin foto, se ve el mockup vacío tal cual
 * (ya incluye el texto "( tu foto )" en la carta en blanco).
 */
export default function CardPhotoFrame({ src, transform = DEFAULT_CARD_TRANSFORM, onChange, className }: Props) {
  const interactive = !!onChange
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || !src) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: transform.offsetX, startOffsetY: transform.offsetY }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || !dragRef.current || !frameRef.current) return
    const rect = frameRef.current.getBoundingClientRect()
    const dx = (e.clientX - dragRef.current.startX) / rect.width
    const dy = (e.clientY - dragRef.current.startY) / rect.height
    onChange!({ ...transform, offsetX: dragRef.current.startOffsetX + dx, offsetY: dragRef.current.startOffsetY + dy })
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function rotate() {
    if (!onChange) return
    onChange({ ...transform, rotation: (((transform.rotation + 90) % 360) as CardTransform['rotation']) })
  }

  function reset() {
    onChange?.(DEFAULT_CARD_TRANSFORM)
  }

  return (
    <div className={`card-photo-frame${className ? ` ${className}` : ''}`}>
      <div className="card-photo-frame__mockup">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fotos/CartaMockupVertical.jpg" alt="" className="card-photo-frame__mockup-bg" draggable={false} />
        <div
          ref={frameRef}
          className="card-photo-frame__viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ cursor: interactive && src ? 'grab' : undefined }}
        >
          {src && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="card-photo-frame__img"
              style={{
                transform: `translate(${transform.offsetX * 100}%, ${transform.offsetY * 100}%) rotate(${transform.rotation}deg) scale(${transform.scale})`,
              }}
            />
          )}
        </div>

        {interactive && src && (
          <div className="card-photo-frame__controls">
            <button type="button" className="card-photo-frame__btn" onClick={rotate} aria-label="Rotar foto">⟳</button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={transform.scale}
              onChange={e => onChange!({ ...transform, scale: Number(e.target.value) })}
              className="card-photo-frame__zoom"
              aria-label="Zoom"
            />
            <button type="button" className="card-photo-frame__btn" onClick={reset} aria-label="Restablecer posición">↺</button>
          </div>
        )}
      </div>
    </div>
  )
}
