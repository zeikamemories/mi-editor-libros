'use client'

import { useEffect } from 'react'
import type { DesignItem } from '../components/Landing/NuestrosDisenos/designsData'
import './DesignModal.css'

type Props = {
  items: DesignItem[]
  order: number[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function DesignModal({ items, order, index, onClose, onNavigate }: Props) {
  const pos = order.indexOf(index)
  const prev = () => onNavigate(order[(pos - 1 + order.length) % order.length])
  const next = () => onNavigate(order[(pos + 1) % order.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [index, order])

  return (
    <div className="design-modal-backdrop" onClick={onClose}>
      <div className="design-modal" onClick={e => e.stopPropagation()}>
        <button className="design-modal__close" onClick={onClose} aria-label="Cerrar">×</button>

        <button className="design-modal__arrow design-modal__arrow--prev" onClick={prev} aria-label="Anterior">&#8249;</button>

        <img
          src={items[index].src}
          alt=""
          width={items[index].width}
          height={items[index].height}
          className={`design-modal__img${items[index].shadow ? ' design-modal__img--shadow' : ''}`}
        />

        <button className="design-modal__arrow design-modal__arrow--next" onClick={next} aria-label="Siguiente">&#8250;</button>
      </div>
    </div>
  )
}
