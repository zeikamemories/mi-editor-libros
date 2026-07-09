'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { isAdminEmail } from '../lib/adminEmails'
import './login.css'

function redirectDest(email: string | undefined | null, afterParam?: string | null) {
  // afterParam (from URL) takes priority — it survives Google OAuth redirects
  const after = afterParam || sessionStorage.getItem('zeika_after_login')
  if (after) {
    sessionStorage.removeItem('zeika_after_login')
    return after
  }
  return isAdminEmail(email) ? '/dashboard' : '/mis-proyectos'
}

function LoginContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const defaultMode  = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const afterParam   = searchParams.get('after')

  const [mode,     setMode]     = useState<'login' | 'signup'>(defaultMode)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace(redirectDest(session.user.email, afterParam))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        router.replace(redirectDest(session.user.email, afterParam))
      }
    })
    return () => subscription.unsubscribe()
  }, [router, afterParam])

  async function handleGoogle() {
    // Encode the after-login destination in the OAuth redirectTo URL
    // so it survives the Google → Supabase → app redirect chain
    const after = afterParam || sessionStorage.getItem('zeika_after_login') || ''
    const redirectTo = window.location.origin + '/login' + (after ? '?after=' + encodeURIComponent(after) : '')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  async function handleEmail() {
    setError('')
    setLoading(true)
    if (mode === 'signup') {
      const { error: e } = await supabase.auth.signUp({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) { setError('Email o contraseña incorrectos.'); setLoading(false); return }
    }
    const { data: { session } } = await supabase.auth.getSession()
    router.replace(redirectDest(session?.user?.email, afterParam))
  }

  const isSignup = mode === 'signup'

  return (
    <div className="login-root">

      {/* Header */}
      <header className="login-header">
        <a href="/" className="login-header-logo">
          <Image src="/LogoZeika.png" alt="Zeika" width={52} height={52} />
        </a>
      </header>

      {/* Main form */}
      <main className="login-main">

        {/* Title + subtitle — wider on desktop */}
        <div className="login-heading">
          <h1 className="login-title">
            {isSignup ? 'Empezá tu historia' : 'Bienvenida de vuelta'}
          </h1>
          <p className="login-subtitle">
            {isSignup
              ? 'Entrá con tu cuenta de Google y en un click estás adentro.'
              : 'Ingresá con tu cuenta de Google o con tu email y contraseña.'}
          </p>
        </div>

        <div className="login-content">

          {/* Google */}
          <button className="login-google-btn" onClick={handleGoogle}>
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            CONTINUAR CON GOOGLE
          </button>

          {/* Divider */}
          <div className="login-divider"><span>o</span></div>

          {/* Email + password */}
          <div className="login-form">
            <input
              className="login-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="login-input"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
            />
            {error && <p className="login-error">{error}</p>}
            <button
              className="login-submit-btn"
              onClick={handleEmail}
              disabled={loading || !email || !password}
            >
              {loading ? '...' : 'CONTINUAR'}
            </button>
          </div>

          {/* Toggle mode */}
          <div className="login-toggle-section">
            <p className="login-toggle-label">
              {isSignup ? '¿Ya tenés una cuenta?' : '¿No tenés cuenta?'}
            </p>
            <button
              className="login-toggle-btn"
              onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError('') }}
            >
              {isSignup ? 'INICIAR SESIÓN' : 'REGISTRARSE'}
            </button>
          </div>

        </div>
      </main>

      {/* WhatsApp note */}
      <footer className="login-footer">
        <div className="login-whatsapp-note">
          <div className="login-wa-icon">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#25D366"/>
              <path d="M16 6C10.477 6 6 10.477 6 16c0 1.89.523 3.655 1.432 5.16L6 26l4.98-1.407A9.946 9.946 0 0016 26c5.523 0 10-4.477 10-10S21.523 6 16 6zm0 18a7.95 7.95 0 01-4.054-1.107l-.29-.172-3.003.849.849-3.003-.19-.3A7.95 7.95 0 018 16c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8zm4.38-5.87c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.014-.374-1.932-1.19-.714-.636-1.196-1.42-1.336-1.66-.14-.24-.015-.37.105-.49.108-.108.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.468-.394-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.692 2.582 4.1 3.62.573.248 1.02.396 1.368.506.575.183 1.098.157 1.512.095.461-.069 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" fill="white"/>
            </svg>
          </div>
          <p className="login-wa-text">
            Tené en cuenta que después vamos a necesitar tu número de WhatsApp, para mandarte el comprobante de pago.
          </p>
        </div>
      </footer>

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
