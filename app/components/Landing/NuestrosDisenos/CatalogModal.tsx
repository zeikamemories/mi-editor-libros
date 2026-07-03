'use client'

import { useEffect } from 'react'
import { DESIGNS } from './designsData'
import './CatalogModal.css'

type Props = { onClose: () => void }

export default function CatalogModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="catalog-backdrop" onClick={onClose}>
      <div className="catalog" onClick={e => e.stopPropagation()}>
        <div className="catalog__header">
          <p className="catalog__title">Nuestros Diseños</p>
          <button className="catalog__close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="catalog__grid">
          {DESIGNS.map((item, i) => (
            <div key={i} className="catalog__item">
              <img src={item.src} alt="" className="catalog__img" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
