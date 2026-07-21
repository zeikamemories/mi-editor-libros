'use client'

import { useState } from 'react'
import { useReveal } from '../useReveal'
import './Productos.css'

export type ProductData = {
  sizeId:      string
  name:        string
  mobileLabel?: string
  price:       string
  dimensions:  string
  image?:      string
}

type Props = ProductData & { onOpen?: () => void; mobileDelay?: number; desktopDelay?: number }

export default function ProductCard({ sizeId, name, mobileLabel, price, dimensions, image, onOpen, mobileDelay = 0, desktopDelay = 0 }: Props) {
  const [hovered, setHovered] = useState(false)
  const { ref, visible } = useReveal<HTMLElement>()

  return (
    <article
      ref={ref}
      className={`product-card product-card--${sizeId}${visible ? ' product-card--visible' : ''}`}
      style={{ '--reveal-delay-mobile': `${mobileDelay}ms`, '--reveal-delay-desktop': `${desktopDelay}ms` } as React.CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div className="product-card__img-wrap" onClick={onOpen} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image ?? `/fotos/${sizeId}.jpg`}
          alt={name}
          className="product-card__img"
        />
        {hovered && (
          <div className="product-card__overlay" onClick={onOpen}>
            <span>Me interesa</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="product-card__details">
        <div className="product-card__name-price">
          {mobileLabel ? (
            <>
              <span className="product-card__name product-card__name--desktop">{name}</span>
              <span className="product-card__name product-card__name--mobile">{mobileLabel}</span>
            </>
          ) : (
            <span className="product-card__name">{name}</span>
          )}
          <span className="product-card__price">{price}</span>
        </div>
        <span className="product-card__dims">{dimensions}</span>
      </div>

      {/* Mobile-only button */}
      <button className="product-card__mobile-btn" onClick={onOpen}>Me interesa</button>
    </article>
  )
}
