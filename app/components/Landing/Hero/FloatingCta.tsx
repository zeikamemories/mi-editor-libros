'use client'
import { useState, useEffect } from 'react'
import './Hero.css'

export default function FloatingCta() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 5)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      className={`hero__cta${scrolled ? ' hero__cta--full' : ''}`}
      onClick={() => {
        document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })
      }}
    >
      CONTAR MI HISTORIA
    </button>
  )
}
