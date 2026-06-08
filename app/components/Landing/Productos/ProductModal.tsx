'use client'

import { useState, useEffect } from 'react'
import SizeComparison from './SizeComparison'
import type { ProductData } from './ProductCard'
import './ProductModal.css'

// 4 images per product — images 2-4 are placeholders until real ones are added
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

type Props = { product: ProductData; onClose: () => void }

export default function ProductModal({ product, onClose }: Props) {
  const [slide, setSlide]       = useState(0)
  const [showComp, setShowComp] = useState(false)
  const [compSize, setCompSize] = useState(product.sizeId)

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

  function prev() { setSlide(s => (s + 3) % 4) }
  function next() { setSlide(s => (s + 1) % 4) }

  function toggleComp() {
    setShowComp(v => !v)
    setCompSize(product.sizeId)
    setSlide(0)
  }

  return (
    <div className="pm-backdrop" onClick={onClose}>
      <div className="pm" onClick={e => e.stopPropagation()}>

        {/* ── Left panel ── */}
        <div className="pm__left">
          {showComp ? (
            <SizeComparison activeSize={compSize} onChangeSize={setCompSize} />
          ) : (
            <div className="pm__carousel">
              <div className="pm__slide">
                {images[slide]
                  ? <img src={images[slide]} alt={product.name} className="pm__img" />
                  : <div className="pm__placeholder" />}
              </div>

              <button className="pm__arrow pm__arrow--prev" onClick={prev} aria-label="Anterior">
                &#8249;
              </button>
              <button className="pm__arrow pm__arrow--next" onClick={next} aria-label="Siguiente">
                &#8250;
              </button>

              <div className="pm__dots">
                {[0, 1, 2, 3].map(i => (
                  <button
                    key={i}
                    className={`pm__dot${i === slide ? ' pm__dot--active' : ''}`}
                    onClick={() => setSlide(i)}
                    aria-label={`Imagen ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Close ── */}
        <button className="pm__close" onClick={onClose} aria-label="Cerrar">×</button>

        {/* ── Right panel ── */}
        <div className="pm__right">
          <div className="pm__top">

            {/* Name + dimensions */}
            <div className="pm__naming">
              <h2 className="pm__name">{product.name}</h2>
              <span className="pm__dims">{product.dimensions}</span>
            </div>

            {/* Comparar button */}
            <div className="pm__comparar-row">
              <button
                className={`pm__comparar${showComp ? ' pm__comparar--active' : ''}`}
                onClick={toggleComp}
              >
                Comparar con otros tamaños
              </button>
              {showComp && (
                <button className="pm__comparar-x" onClick={toggleComp} aria-label="Cerrar comparación">
                  ×
                </button>
              )}
            </div>

            {/* Pricing */}
            <div className="pm__pricing">
              <p className="pm__price-base">PRECIO BASE: {product.price}</p>
              <p className="pm__price-note">*El precio base incluye 24 carillas</p>
              <p className="pm__price-extra">
                PRECIO POR CADA PÁGINA EXTRA: {EXTRA_PRICE[product.sizeId]}
              </p>
            </div>

            {/* Details bullets */}
            <div className="pm__details">
              <p className="pm__details-label">Detalles del producto:</p>
              <ul className="pm__details-list">
                <li>Tapas duras, papel mate de alta calidad</li>
                <li>Impresión digital de alta definición, 24 carillas incluidas</li>
              </ul>
            </div>
          </div>

          <a href="/orden" className="pm__cta">CONTAR MI HISTORIA</a>
        </div>
      </div>
    </div>
  )
}
