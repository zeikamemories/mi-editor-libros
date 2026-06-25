'use client'

import { useState } from 'react'
import './Productos.css'

export type ProductData = {
  sizeId:      string
  name:        string
  mobileLabel?: string
  price:       string
  dimensions:  string
}

type Props = ProductData & { onOpen?: () => void }

export default function ProductCard({ sizeId, name, mobileLabel, price, dimensions, onOpen }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <article
      className={`product-card product-card--${sizeId}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div className="product-card__img-wrap" onClick={onOpen} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/fotos/${sizeId}.jpg`}
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
