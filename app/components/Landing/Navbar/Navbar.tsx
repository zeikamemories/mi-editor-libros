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
            <Image src="/LogoZeika.png" alt="Zeika" width={52} height={52} />
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
              <Image src="/LogoZeika.png" alt="Zeika" width={52} height={52} />
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href="#" aria-label="Facebook"><img src="/icons/social/facebook.svg"  alt="Facebook"  className="navbar__overlay-social-icon" /></a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href="#" aria-label="X / Twitter"><img src="/icons/social/twitter.svg"   alt="Twitter"   className="navbar__overlay-social-icon" /></a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href="#" aria-label="Instagram"><img src="/icons/social/instagram.svg" alt="Instagram" className="navbar__overlay-social-icon" /></a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href="#" aria-label="WhatsApp"><img src="/icons/social/whatsapp.svg"  alt="WhatsApp"  className="navbar__overlay-social-icon" /></a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
