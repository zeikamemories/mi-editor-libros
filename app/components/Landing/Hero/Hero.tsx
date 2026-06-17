'use client'
import { useState, useEffect } from 'react'
import './Hero.css'

export default function Hero() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 5)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="hero">
      <video
        className="hero__video hero__video--mobile"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/videos/Hero-Mobile.mp4" type="video/mp4" />
      </video>

      <video
        className="hero__video hero__video--desktop"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/videos/Animacion-Hero.mp4" type="video/mp4" />
      </video>

      {/* Single overlay — title at top, CTA at bottom via flex */}
      <div className="hero__overlay">
        <h1 className="hero__title hero__title--desktop">
          Eternizamos momentos<br />
          a través de fotolibros<br />
          personalizados.
        </h1>
        <h1 className="hero__title hero__title--mobile">
          Eternizamos momentos<br />
          a través<br />
          de fotolibros personalizados
        </h1>

        <button
          className={`hero__cta${scrolled ? ' hero__cta--full' : ''}`}
          onClick={() => {
            document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          CONTAR MI HISTORIA
        </button>
      </div>
    </section>
  )
}
