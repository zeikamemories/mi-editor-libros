'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '../../../lib/supabase'
import './Navbar.css'

const navLinks = [
  { label: 'Inicio',         href: '#'               },
  { label: 'Productos',      href: '#productos'      },
  { label: 'Cómo hacerlo',   href: '#como-hacerlo'   },
  { label: 'Quienes somos',  href: '#quienes-somos'  },
  { label: 'FAQs',           href: '#faqs'            },
]

export default function Navbar({ hideLinks }: { hideLinks?: boolean } = {}) {
  const [open,      setOpen]      = useState(false)
  const [user,      setUser]      = useState<{ name: string; initial: string } | null>(null)
  const [dropOpen,  setDropOpen]  = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta  = session.user.user_metadata
        const name  = meta?.full_name || meta?.name || session.user.email?.split('@')[0] || ''
        setUser({ name, initial: name[0]?.toUpperCase() ?? '?' })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        const meta  = session.user.user_metadata
        const name  = meta?.full_name || meta?.name || session.user.email?.split('@')[0] || ''
        setUser({ name, initial: name[0]?.toUpperCase() ?? '?' })
      } else {
        setUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropOpen])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setDropOpen(false)
    window.location.href = '/'
  }

  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <>
      <header className="navbar">
        <div className="navbar__inner">
          <a href="/" className="navbar__logo">
            <Image src="/LogoZeika.png" alt="Zeika" width={60} height={60} />
          </a>

          {/* Desktop links */}
          {!hideLinks && (
            <nav className="navbar__links">
              {navLinks.filter(l => l.label !== 'Inicio').map(l => (
                <a key={l.href} href={l.href} className="navbar__link">{l.label}</a>
              ))}
            </nav>
          )}

          {/* Desktop auth */}
          <div className="navbar__auth">
            {user ? (
              <div className="navbar__user" ref={dropRef}>
                <button
                  className="navbar__user-btn"
                  onClick={() => setDropOpen(o => !o)}
                  aria-label="Menú de usuario"
                >
                  <span className="navbar__user-name">{firstName.toUpperCase()}</span>
                  <span className="navbar__avatar">{user.initial}</span>
                </button>
                {dropOpen && (
                  <div className="navbar__user-dropdown">
                    <a href="/mis-proyectos" className="navbar__dropdown-item" onClick={() => setDropOpen(false)}>
                      Mis proyectos
                    </a>
                    <button className="navbar__dropdown-item navbar__dropdown-item--btn" onClick={signOut}>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
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
              <Image src="/LogoZeika.png" alt="Zeika" width={60} height={60} />
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
                  <a href="/mis-proyectos" className="navbar__overlay-auth-link" onClick={() => setOpen(false)}>
                    Mis proyectos
                  </a>
                  <button className="navbar__overlay-auth-link navbar__overlay-auth-btn" onClick={signOut}>
                    Cerrar sesión
                  </button>
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
