'use client'

import { useState } from 'react'
import Image from 'next/image'
import './Navbar.css'

const links = [
  { label: 'Productos', href: '#productos' },
  { label: 'Cómo hacerlo', href: '#como-hacerlo' },
  { label: 'Quienes somos', href: '#quienes-somos' },
  { label: 'FAQs', href: '#faqs' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="navbar">
        <div className="navbar__inner">
          <a href="/" className="navbar__logo">
            <Image src="/LogoZeika.png" alt="Zeika" width={48} height={48} />
          </a>

          {/* Desktop links */}
          <nav className="navbar__links">
            {links.map(l => (
              <a key={l.href} href={l.href} className="navbar__link">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="navbar__hamburger"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div className="navbar__overlay">
          <div className="navbar__overlay-top">
            <a href="/" className="navbar__logo">
              <Image src="/LogoZeika.png" alt="Zeika" width={48} height={48} />
            </a>
            <button
              className="navbar__close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          </div>

          <nav className="navbar__overlay-links">
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="navbar__overlay-link"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="navbar__overlay-footer">
            <span className="navbar__overlay-contact">Contactanos</span>
            <div className="navbar__overlay-socials">
              <a href="#" aria-label="Facebook">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              <a href="#" aria-label="X / Twitter">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 4l16 16M4 20L20 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
              </a>
              <a href="#" aria-label="WhatsApp">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
