'use client'

import { useState, useLayoutEffect } from 'react'
import ProductCard, { type ProductData } from './ProductCard'
import ProductModal from './ProductModal'
import MobileProductModal from './MobileProductModal'
import CompareSizesModal from './CompareSizesModal'
import MobileCompareModal from './MobileCompareModal'
import './Productos.css'

const PRODUCTS: ProductData[] = [
  { sizeId: 'chico',    name: 'Chico Horizontal',  mobileLabel: 'CHICO H',   price: '$1',       dimensions: '21 x 14,8 cm' },
  { sizeId: 'mediano',  name: 'Mediano Horizontal', mobileLabel: 'MEDIANO H', price: '$94.700',  dimensions: '28 x 21,6 cm' },
  { sizeId: 'grande',   name: 'Grande Horizontal',  price: '$128.800', dimensions: '41 x 29 cm'   },
  { sizeId: 'vertical', name: 'Vertical',           price: '$94.700',  dimensions: '28 x 21,6 cm' },
  { sizeId: 'cuadrado', name: 'Cuadrado',           price: '$125.800', dimensions: '29 x 29 cm'   },
]

export default function Productos() {
  const [selected,           setSelected]           = useState<ProductData | null>(null)
  const [showCompare,        setShowCompare]        = useState(false)
  const [showMobileCompare,  setShowMobileCompare]  = useState(false)

  useLayoutEffect(() => {
    const backProduct = sessionStorage.getItem('zeika_back_product')
    if (!backProduct) return
    sessionStorage.removeItem('zeika_back_product')
    const product = PRODUCTS.find(p => p.sizeId === backProduct)
    if (product) setSelected(product)
  }, [])

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

      <button className="productos__comparar-mobile" onClick={() => setShowMobileCompare(true)}>
        Comparar con otros tamaños
      </button>

      {selected && (
        <ProductModal product={selected} onClose={() => setSelected(null)} />
      )}
      {selected && (
        <MobileProductModal product={selected} onClose={() => setSelected(null)} />
      )}
      {showCompare && (
        <CompareSizesModal onClose={() => setShowCompare(false)} />
      )}
      {showMobileCompare && (
        <MobileCompareModal onClose={() => setShowMobileCompare(false)} />
      )}
    </section>
  )
}
