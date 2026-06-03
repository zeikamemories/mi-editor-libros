'use client'

import { useState } from 'react'
import ProductCard, { type ProductData } from './ProductCard'
import ProductModal from './ProductModal'
import CompareSizesModal from './CompareSizesModal'
import './Productos.css'

const PRODUCTS: ProductData[] = [
  { sizeId: 'chico',    name: 'Chico Horizontal',  price: '$75.000',  dimensions: '21 x 14,8 cm' },
  { sizeId: 'mediano',  name: 'Mediano Horizontal', price: '$81.500',  dimensions: '28 x 21,6 cm' },
  { sizeId: 'grande',   name: 'Grande Horizontal',  price: '$100.000', dimensions: '41 x 29 cm'   },
  { sizeId: 'vertical', name: 'Vertical',           price: '$81.500',  dimensions: '28 x 21,6 cm' },
  { sizeId: 'cuadrado', name: 'Cuadrado',           price: '$97.000',  dimensions: '29 x 29 cm'   },
]

export default function Productos() {
  const [selected, setSelected]       = useState<ProductData | null>(null)
  const [showCompare, setShowCompare] = useState(false)

  return (
    <section className="productos" id="productos">
      <div className="productos__header">
        <p className="productos__label">Nuestros Productos</p>
        <button className="productos__comparar" onClick={() => setShowCompare(true)}>Comparar tamaños</button>
      </div>

      <div className="productos__grid">
        {PRODUCTS.map(p => (
          <ProductCard key={p.sizeId} {...p} onOpen={() => setSelected(p)} />
        ))}
      </div>

      {selected && (
        <ProductModal product={selected} onClose={() => setSelected(null)} />
      )}
      {showCompare && (
        <CompareSizesModal onClose={() => setShowCompare(false)} />
      )}
    </section>
  )
}
