'use client'
import { useState, useEffect } from 'react'
import './Hero.css'

export default function FloatingCta() {
  const [pastHero,      setPastHero]      = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)

  useEffect(() => {
    const hero = document.querySelector('.hero') as HTMLElement | null
    const footer = document.querySelector('footer') as HTMLElement | null

    const heroObserver = hero
      ? new IntersectionObserver(
          ([entry]) => setPastHero(!entry.isIntersecting),
          { threshold: 0 }
        )
      : null
    heroObserver?.observe(hero!)

    const footerObserver = footer
      ? new IntersectionObserver(
          ([entry]) => setFooterVisible(entry.isIntersecting),
          { threshold: 0 }
        )
      : null
    footerObserver?.observe(footer!)

    return () => {
      heroObserver?.disconnect()
      footerObserver?.disconnect()
    }
  }, [])

  if (footerVisible) return null

  return (
    <div className={`hero__cta-wrap${pastHero ? ' hero__cta-wrap--past-hero' : ''}`}>
      <button
        className="hero__cta"
        onClick={() => {
          document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })
        }}
      >
        CONTAR MI HISTORIA
      </button>
    </div>
  )
}
