'use client'
import { useState, useEffect } from 'react'
import './Hero.css'

export default function FloatingCta() {
  const [mounted,       setMounted]       = useState(false)
  const [pastHero,      setPastHero]      = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setPastHero(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    const footer = document.querySelector('footer') as HTMLElement | null
    const footerObserver = footer
      ? new IntersectionObserver(
          ([entry]) => setFooterVisible(entry.isIntersecting),
          { threshold: 0 }
        )
      : null
    footerObserver?.observe(footer!)

    return () => {
      window.removeEventListener('scroll', onScroll)
      footerObserver?.disconnect()
    }
  }, [])

  if (footerVisible) return null

  return (
    <div className={`hero__cta-wrap${mounted && pastHero ? ' hero__cta-wrap--past-hero' : ''}`}>
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
