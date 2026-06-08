'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '../../../lib/supabase'
import './Navbar.css'

const navLinks = [
  { label: 'Productos',      href: '#productos'      },
  { label: 'Cómo hacerlo',   href: '#como-hacerlo'   },
  { label: 'Quienes somos',  href: '#quienes-somos'  },
  { label: 'FAQs',           href: '#faqs'            },
]

export default function Navbar() {
  const [open,  setOpen]  = useState(false)
  const [user,  setUser]  = useState<{ email: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { email: session.user.email ?? '' } : null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { email: session.user.email ?? '' } : null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar__inner">
          <a href="/" className="navbar__logo">
            <Image src="/LogoZeika.png" alt="Zeika" width={52} height={52} />
          </a>

          {/* Desktop links */}
          <nav className="navbar__links">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="navbar__link">{l.label}</a>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="navbar__auth">
            {user ? (
              <>
                <a href="/mis-proyectos" className="navbar__auth-link">Mi cuenta</a>
                <button className="navbar__auth-link navbar__auth-link--btn" onClick={signOut}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <a href="/login?mode=signup" className="navbar__auth-link">Registrarse</a>
                <a href="/login" className="navbar__auth-link">Iniciar Sesión</a>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="navbar__hamburger" onClick={() => setOpen(true)} aria-label="Abrir menú">
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
            <button className="navbar__close" onClick={() => setOpen(false)} aria-label="Cerrar menú">✕</button>
          </div>

          <nav className="navbar__overlay-links">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="navbar__overlay-link" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="navbar__overlay-footer">
            <hr className="navbar__overlay-divider" />
            <div className="navbar__overlay-auth">
              {user ? (
                <>
                  <a href="/mis-proyectos" className="navbar__overlay-auth-link" onClick={() => setOpen(false)}>Mi cuenta</a>
                  <button className="navbar__overlay-auth-link navbar__overlay-auth-btn" onClick={signOut}>Cerrar sesión</button>
                </>
              ) : (
                <>
                  <a href="/login?mode=signup" className="navbar__overlay-auth-link" onClick={() => setOpen(false)}>Registrarse</a>
                  <a href="/login" className="navbar__overlay-auth-link" onClick={() => setOpen(false)}>Iniciar Sesión</a>
                </>
              )}
            </div>
            <div className="navbar__overlay-socials">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href="#" aria-label="Facebook"><img src="/icons/social/facebook.svg"  alt="Facebook"  className="navbar__overlay-social-icon" /></a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href="#" aria-label="X"><img src="/icons/social/twitter.svg"   alt="Twitter"   className="navbar__overlay-social-icon" /></a>
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
