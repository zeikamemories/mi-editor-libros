'use client'

import { useState } from 'react'
import './Productos.css'

export type ProductData = {
  sizeId:     string
  name:       string
  price:      string
  dimensions: string
}

export default function ProductCard({ sizeId, name, price, dimensions }: ProductData) {
  const [hovered, setHovered] = useState(false)

  return (
    <article
      className={`product-card product-card--${sizeId}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div className="product-card__img-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/fotos/${sizeId}.jpg`}
          alt={name}
          className="product-card__img"
        />
        {hovered && (
          <div className="product-card__overlay">
            <span>Más información</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="product-card__details">
        <div className="product-card__name-price">
          <span className="product-card__name">{name}</span>
          <span className="product-card__price">{price}</span>
        </div>
        <span className="product-card__dims">{dimensions}</span>
      </div>

      {/* Mobile-only button (always visible) */}
      <button className="product-card__mobile-btn">Más información</button>
    </article>
  )
}
