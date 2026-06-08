'use client'

import { useState, useEffect, useRef } from 'react'
import type { ProductData } from './ProductCard'
import './MobileProductModal.css'

const IMAGES: Record<string, string[]> = {
  chico:    ['/fotos/chico2.jpg',    '', '', ''],
  mediano:  ['/fotos/mediano2.jpg',  '', '', ''],
  grande:   ['/fotos/grande2.jpg',   '', '', ''],
  vertical: ['/fotos/vertical2.jpg', '', '', ''],
  cuadrado: ['/fotos/cuadrado2.jpg', '', '', ''],
}

const EXTRA_PRICE: Record<string, string> = {
  chico:    '$2.500',
  mediano:  '$3.000',
  grande:   '$4.000',
  vertical: '$3.000',
  cuadrado: '$3.500',
}

// Mini size comparison for mobile overlay
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
const ORDER = ['chico', 'mediano', 'grande', 'vertical', 'cuadrado']
// Scale: maps Grande H to ~314×228px canvas
const SCALE_X = 314 / 41
const SCALE_Y = 228 / 29

type Props = { product: ProductData; onClose: () => void }

export default function MobileProductModal({ product, onClose }: Props) {
  const [showComp, setShowComp]   = useState(false)
  const [compSize, setCompSize]   = useState(product.sizeId)
  const [activeSlide, setActiveSlide] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const images = IMAGES[product.sizeId] ?? ['', '', '', '']

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth)
      setActiveSlide(idx)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const [aw, ah] = BOOK_DIMS[compSize]
  const activePxW = Math.round(aw * SCALE_X)
  const activePxH = Math.round(ah * SCALE_Y)

  return (
    <div className="mpm">
      {/* Scrollable content */}
      <div className="mpm__scroll">

        {/* Image carousel */}
        <div className="mpm__carousel">
          <div className="mpm__images" ref={scrollRef}>
            {images.map((src, i) =>
              src
                ? <img key={i} src={src} alt={product.name} className="mpm__image" />
                : <div key={i} className="mpm__image mpm__image--placeholder" />
            )}
          </div>
          <div className="mpm__dots">
            {images.map((_, i) => (
              <span key={i} className={`mpm__dot${i === activeSlide ? ' mpm__dot--active' : ''}`} />
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="mpm__details">
          {/* Name + dims */}
          <div className="mpm__naming">
            <h2 className="mpm__name">{product.name}</h2>
            <span className="mpm__dims">{product.dimensions}</span>
          </div>

          {/* Comparar button */}
          <button className="mpm__comparar" onClick={() => { setShowComp(true); setCompSize(product.sizeId) }}>
            Comparar con otros tamaños
          </button>

          {/* Pricing */}
          <div className="mpm__pricing">
            <p className="mpm__price-base">PRECIO BASE: {product.price}</p>
            <p className="mpm__price-note">*El precio base incluye 24 carillas</p>
            <p className="mpm__price-extra">PRECIO POR CADA PÁGINA EXTRA: {EXTRA_PRICE[product.sizeId]}</p>
          </div>

          {/* CTA */}
          <a href="/orden" className="mpm__cta">CONTAR MI HISTORIA</a>

          {/* Details bullets */}
          <div className="mpm__product-details">
            <p className="mpm__details-label">Detalles del producto:</p>
            <ul className="mpm__details-list">
              <li>Tapas duras, papel mate de alta calidad</li>
              <li>Impresión digital de alta definición, 24 carillas incluidas</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Close button */}
      <button className="mpm__close" onClick={onClose} aria-label="Cerrar">×</button>

      {/* Comparar overlay */}
      {showComp && (
        <div className="mpm__comp-backdrop" onClick={() => setShowComp(false)}>
          <div className="mpm__comp-panel" onClick={e => e.stopPropagation()}>
            <div className="mpm__comp-header">
              <button className="mpm__comp-close" onClick={() => setShowComp(false)}>×</button>
            </div>

            {/* Size diagram */}
            <div className="mpm__comp-canvas-wrap">
              <div className="mpm__comp-canvas">
                {ORDER.map(id => {
                  const [w, h] = BOOK_DIMS[id]
                  return (
                    <div
                      key={id}
                      className={`mpm__comp-rect${id === compSize ? ' mpm__comp-rect--active' : ''}`}
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

            {/* Tab pills */}
            <div className="mpm__comp-tabs">
              {ORDER.map(id => (
                <button
                  key={id}
                  className={`mpm__comp-tab${id === compSize ? ' mpm__comp-tab--active' : ''}`}
                  onClick={() => setCompSize(id)}
                >
                  {BOOK_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
