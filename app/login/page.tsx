'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import './login.css'

function LoginContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const defaultMode  = searchParams.get('mode') === 'signup' ? 'signup' : 'login'

  const [mode,     setMode]     = useState<'login' | 'signup'>(defaultMode)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace('/mis-proyectos')
    })
  }, [router])

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/mis-proyectos' },
    })
  }

  async function handleEmail() {
    setError('')
    setLoading(true)
    if (mode === 'signup') {
      const { error: e } = await supabase.auth.signUp({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
      if (name) await supabase.from('profiles').upsert({ id: (await supabase.auth.getUser()).data.user?.id, full_name: name })
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) { setError('Email o contraseña incorrectos.'); setLoading(false); return }
    }
    router.replace('/mis-proyectos')
  }

  return (
    <div className="login-root">
      <a href="/" className="login-logo">
        <Image src="/LogoZeika.png" alt="Zeika" width={48} height={48} />
      </a>

      <div className="login-card">
        <h1 className="login-title">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h1>

        <button className="login-google-btn" onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <div className="login-divider"><span>o</span></div>

        <div className="login-form">
          {mode === 'signup' && (
            <input
              className="login-input"
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          )}
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
          <button className="login-submit-btn" onClick={handleEmail} disabled={loading || !email || !password}>
            {loading ? '...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </div>

        <p className="login-toggle">
          {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}
          {' '}
          <button
            className="login-toggle-btn"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Registrarse' : 'Iniciar sesión'}
          </button>
        </p>
      </div>
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
