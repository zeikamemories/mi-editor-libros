'use client'

import { useState } from 'react'
import CatalogModal from './CatalogModal'
import { DESIGNS } from './designsData'
import './NuestrosDisenos.css'

// Subset shown in the scrolling carousel — "Ver más" opens the full catalog with all of them
const CAROUSEL_ITEMS = DESIGNS.slice(0, 12)

export default function NuestrosDisenos() {
  const [showCatalog, setShowCatalog] = useState(false)

  return (
    <section className="disenos" id="disenos">
      <p className="disenos__label">Nuestros Diseños</p>

      <div className="disenos__carousel">
        <div className="disenos__track">
          {[...CAROUSEL_ITEMS, ...CAROUSEL_ITEMS].map((item, i) => (
            <div key={i} className={`disenos__item disenos__item--${item.orientation}`}>
              <img src={item.src} alt="" className="disenos__img" />
            </div>
          ))}
        </div>
      </div>

      <button className="disenos__ver-mas" onClick={() => setShowCatalog(true)}>
        Ver más
      </button>

      {showCatalog && <CatalogModal onClose={() => setShowCatalog(false)} />}
    </section>
  )
}
