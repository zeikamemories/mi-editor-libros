'use client'
import { useState, useEffect } from 'react'
import './Hero.css'

export default function FloatingCta() {
  const [scrolled,     setScrolled]     = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 5)
    window.addEventListener('scroll', onScroll, { passive: true })

    const footer = document.querySelector('footer')
    if (footer) {
      const observer = new IntersectionObserver(
        ([entry]) => setFooterVisible(entry.isIntersecting),
        { threshold: 0 }
      )
      observer.observe(footer)
      return () => {
        window.removeEventListener('scroll', onScroll)
        observer.disconnect()
      }
    }

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (footerVisible) return null

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
