'use client'

import { useState, useLayoutEffect } from 'react'
import ProductCard, { type ProductData } from './ProductCard'
import ProductModal from './ProductModal'
import MobileProductModal from './MobileProductModal'
import CompareSizesModal from './CompareSizesModal'
import MobileCompareModal from './MobileCompareModal'
import VinoModal from './VinoModal'
import MobileVinoModal from './MobileVinoModal'
import CartaModal from './CartaModal'
import MobileCartaModal from './MobileCartaModal'
import AgeGateModal from './AgeGateModal'
import { PRICES_BY_PAGES, VINO_PRICE_BASE, VINO_INFO, CARTA_PRICE } from '../../../config/pricing'
import './Productos.css'

const AGE_CONFIRMED_KEY = 'zeika_age_confirmed'

function fmtPrice(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

const VINO_PRODUCT: ProductData = {
  sizeId:     'vinos',
  name:       'Vino Personalizado',
  price:      `Desde ${fmtPrice(VINO_PRICE_BASE)}`,
  dimensions: `${VINO_INFO.linea} ${VINO_INFO.varietal} · ${VINO_INFO.volumen}`,
  image:      '/fotos/VinosLanding.jpg',
}

const CARTA_PRODUCT: ProductData = {
  sizeId:     'cartas',
  name:       'Cartas Personalizadas',
  price:      fmtPrice(CARTA_PRICE),
  dimensions: 'Truco o poker',
}

const PRODUCTS: ProductData[] = [
  { sizeId: 'chico',    name: 'Chico Horizontal',  mobileLabel: 'CHICO H',   price: fmtPrice(PRICES_BY_PAGES.chico[0]),    dimensions: '21 x 14,8 cm' },
  { sizeId: 'mediano',  name: 'Mediano Horizontal', mobileLabel: 'MEDIANO H', price: fmtPrice(PRICES_BY_PAGES.mediano[0]),  dimensions: '28 x 21,6 cm' },
  { sizeId: 'grande',   name: 'Grande Horizontal',  price: fmtPrice(PRICES_BY_PAGES.grande[0]),   dimensions: '41 x 29 cm'   },
  { sizeId: 'vertical', name: 'Vertical',           price: fmtPrice(PRICES_BY_PAGES.vertical[0]), dimensions: '28 x 21,6 cm' },
  { sizeId: 'cuadrado', name: 'Cuadrado',           price: fmtPrice(PRICES_BY_PAGES.cuadrado[0]), dimensions: '29 x 29 cm'   },
]

// Reveal order difere por breakpoint porque el layout reordena las cards:
// mobile → chico, mediano, vertical, cuadrado, grande (grande ocupa su propia fila al final)
// desktop → chico, mediano, grande (fila 1), vertical, cuadrado (fila 2)
const REVEAL_DELAY: Record<string, { mobile: number; desktop: number }> = {
  chico:    { mobile: 0,   desktop: 0   },
  mediano:  { mobile: 100, desktop: 100 },
  vertical: { mobile: 200, desktop: 300 },
  cuadrado: { mobile: 300, desktop: 400 },
  // grande está sola en su propia fila en mobile (nada con quien competir el orden), así que no
  // necesita delay — con 400ms el scroll ya la había dejado bien visible cuando recién arrancaba
  // la animación, y se sentía como un "pop" en vez de crecer igual que las demás.
  grande:   { mobile: 0,   desktop: 200 },
}

export default function Productos() {
  const [selected,           setSelected]           = useState<ProductData | null>(null)
  const [showCompare,        setShowCompare]        = useState(false)
  const [showMobileCompare,  setShowMobileCompare]  = useState(false)
  const [showVinoModal,      setShowVinoModal]      = useState(false)
  const [showCartaModal,     setShowCartaModal]     = useState(false)
  const [showAgeGate,        setShowAgeGate]        = useState(false)

  useLayoutEffect(() => {
    const backProduct = sessionStorage.getItem('zeika_back_product')
    if (!backProduct) return
    sessionStorage.removeItem('zeika_back_product')
    if (backProduct === 'vinos') {
      openVinoModal()
      return
    }
    if (backProduct === 'cartas') {
      setShowCartaModal(true)
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
          <ProductCard
            key={p.sizeId}
            {...p}
            onOpen={() => setSelected(p)}
            mobileDelay={REVEAL_DELAY[p.sizeId]?.mobile}
            desktopDelay={REVEAL_DELAY[p.sizeId]?.desktop}
          />
        ))}
      </div>

      <button className="productos__comparar-mobile" onClick={() => setShowMobileCompare(true)}>
        Comparar con otros tamaños
      </button>

      <p className="productos__sublabel productos__sublabel--vinos">Vinos personalizados</p>

      <div className="productos__vinos-grid">
        <ProductCard {...VINO_PRODUCT} onOpen={openVinoModal} />
      </div>

      <p className="productos__sublabel productos__sublabel--vinos">Cartas personalizadas</p>

      <div className="productos__vinos-grid">
        <ProductCard {...CARTA_PRODUCT} onOpen={() => setShowCartaModal(true)} />
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
      {showCartaModal && (
        <CartaModal onClose={() => setShowCartaModal(false)} />
      )}
      {showCartaModal && (
        <MobileCartaModal onClose={() => setShowCartaModal(false)} />
      )}
    </section>
  )
}
