'use client'

import { useState, useLayoutEffect } from 'react'
import ProductCard, { type ProductData } from './ProductCard'
import ProductModal from './ProductModal'
import MobileProductModal from './MobileProductModal'
import CompareSizesModal from './CompareSizesModal'
import MobileCompareModal from './MobileCompareModal'
import VinoModal from './VinoModal'
import MobileVinoModal from './MobileVinoModal'
import AgeGateModal from './AgeGateModal'
import './Productos.css'

const AGE_CONFIRMED_KEY = 'zeika_age_confirmed'

const VINO_PRODUCT: ProductData = {
  sizeId:     'vinos',
  name:       'Vinos Personalizados',
  price:      'Desde $45.000',
  dimensions: '750 ml',
}

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
  const [showVinoModal,      setShowVinoModal]      = useState(false)
  const [showAgeGate,        setShowAgeGate]        = useState(false)

  useLayoutEffect(() => {
    const backProduct = sessionStorage.getItem('zeika_back_product')
    if (!backProduct) return
    sessionStorage.removeItem('zeika_back_product')
    if (backProduct === 'vinos') {
      openVinoModal()
      return
    }
    const product = PRODUCTS.find(p => p.sizeId === backProduct)
    if (product) setSelected(product)
  }, [])

  function openVinoModal() {
    if (sessionStorage.getItem(AGE_CONFIRMED_KEY) === 'true') {
      setShowVinoModal(true)
    } else {
      setShowAgeGate(true)
    }
  }

  function confirmAgeGate() {
    sessionStorage.setItem(AGE_CONFIRMED_KEY, 'true')
    setShowAgeGate(false)
    setShowVinoModal(true)
  }

  return (
    <section className="productos" id="productos">
      <div className="productos__header">
        <p className="productos__label">Nuestros Productos</p>
      </div>

      <div className="productos__sublabel-row">
        <p className="productos__sublabel">Fotolibros personalizados</p>
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

      <p className="productos__sublabel productos__sublabel--vinos">Vinos personalizados</p>

      <div className="productos__vinos-grid">
        <ProductCard {...VINO_PRODUCT} onOpen={openVinoModal} />
      </div>

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
      {showAgeGate && (
        <AgeGateModal onConfirm={confirmAgeGate} onDecline={() => setShowAgeGate(false)} />
      )}
      {showVinoModal && (
        <VinoModal onClose={() => setShowVinoModal(false)} />
      )}
      {showVinoModal && (
        <MobileVinoModal onClose={() => setShowVinoModal(false)} />
      )}
    </section>
  )
}
