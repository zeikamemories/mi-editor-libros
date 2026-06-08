'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import './orden.css'

type Step = 'loading' | 'login' | 1 | 2 | 3
type AuthMode = 'signup' | 'signin'

const SIZES = [
  { id: 'chico_h',   name: 'Chico Horizontal',  dims: '21 × 14,8 cm', pages: 14, price: 75000,  img: '/chico.png',    col: 'half' },
  { id: 'mediano_h', name: 'Mediano Horizontal', dims: '28 × 21,6 cm', pages: 14, price: 81500,  img: '/mediano.png',  col: 'half' },
  { id: 'grande_h',  name: 'Grande Horizontal',  dims: '41 × 29 cm',   pages: 14, price: 100000, img: '/grande.png',   col: 'full' },
  { id: 'vertical',  name: 'Vertical',           dims: '28 × 21,6 cm', pages: 14, price: 81500,  img: '/vertical.png', col: 'half' },
  { id: 'cuadrado',  name: 'Cuadrado',           dims: '29 × 29 cm',   pages: 14, price: 97000,  img: '/cuadrado.png', col: 'half' },
]

const EXTRA_PAGES_OPTIONS = [
  { value: 0,  label: 'Sin extras',  sublabel: '14 págs base', extra: 0 },
  { value: 10, label: '+10 páginas', sublabel: '+$8.000',      extra: 8000 },
  { value: 20, label: '+20 páginas', sublabel: '+$15.000',     extra: 15000 },
  { value: 30, label: '+30 páginas', sublabel: '+$28.000',     extra: 28000 },
]

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

export default function OrdenPage() {
  const [step, setStep]           = useState<Step>('loading')
  const [authMode, setAuthMode]   = useState<AuthMode>('signup')
  const [user, setUser]           = useState<User | null>(null)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [authError, setAuthError] = useState('')
  const [sizeId, setSizeId]       = useState<string>('')
  const [bookName, setBookName]   = useState('')
  const [extraPages, setExtraPages] = useState(0)
  const [extraText, setExtraText]   = useState(false)
  const [whatsapp, setWhatsapp]     = useState('')
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); setStep(1) }
      else setStep('login')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); setStep(prev => prev === 'login' ? 1 : prev) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/orden' },
    })
  }

  async function handleEmail() {
    setAuthError('')
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setAuthError(error.message)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError('Email o contraseña incorrectos.')
    }
  }

  const selectedSize = SIZES.find(s => s.id === sizeId)
  const extraPagesOption = EXTRA_PAGES_OPTIONS.find(o => o.value === extraPages)!
  const totalPrice = selectedSize
    ? selectedSize.price + (extraPagesOption?.extra ?? 0) + (extraText ? 10000 : 0)
    : 0
  const payNow = Math.round(totalPrice / 2)

  async function handleConfirm() {
    if (!user || !selectedSize) return
    setSaving(true)
    setAuthError('')

    // 1. Guardar pedido en Supabase
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      user_id:     user.id,
      book_name:   bookName || 'Sin título',
      size:        sizeId,
      pages_base:  selectedSize.pages,
      extra_pages: extraPages,
      extra_text:  extraText,
      price_total: totalPrice,
      price_paid:  payNow,
      status:      'pendiente_pago',
    }).select().single()

    if (orderError) {
      console.error('Order insert error:', orderError)
      setAuthError('Error al guardar el pedido: ' + orderError.message)
      setSaving(false)
      return
    }

    await supabase.from('profiles').upsert({ id: user.id, whatsapp })

    // 2. Crear preferencia en MercadoPago y redirigir
    const res = await fetch('/api/payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        orderId:  order.id,
        bookName: bookName || 'Sin título',
        amount:   payNow,
      }),
    })
    const json = await res.json()
    console.log('MP response:', json)

    if (json.url) {
      window.location.href = json.url
      return
    }

    setAuthError('Error al conectar con MercadoPago. Intentá de nuevo.')
    setSaving(false)
  }

  if (step === 'loading') {
    return <div className="orden-loading"><div className="orden-spinner" /></div>
  }

  return (
    <div className="orden">

      {/* ── LOGIN ─────────────────────────────────────────────── */}
      {step === 'login' && (
        <div className="orden__login-card">
          <h1 className="orden__login-title">Empezá tu historia</h1>
          <p className="orden__login-sub">Entrá con tu cuenta de Google y en un click estás adentro.</p>

          <button className="orden__google-btn" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <div className="orden__divider"><span>o</span></div>

          <form className="orden__email-form" onSubmit={e => { e.preventDefault(); handleEmail() }}>
            <input className="orden__input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="orden__input" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
            {authError && <p className="orden__error">{authError}</p>}
            <button type="submit" className="orden__black-btn">Continuar</button>
          </form>

          <p className="orden__auth-toggle">
            {authMode === 'signup'
              ? <>¿Ya tenés cuenta? <button onClick={() => setAuthMode('signin')}>Iniciá sesión</button></>
              : <>¿No tenés cuenta? <button onClick={() => setAuthMode('signup')}>Registrate</button></>
            }
          </p>

          <div className="orden__hint-box">
            <p className="orden__hint-label">Lo único que te pedimos después</p>
            <div className="orden__hint-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.11 6.11l.95-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>
              <span>Tu número de WhatsApp, para mandarte el comprobante de pago.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: TAMAÑO ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="orden__step">
          <div className="orden__progress-bar">
            <span className="orden__step-num">PASO 1 DE 3</span>
            <div className="orden__segments">
              <div className="orden__segment orden__segment--active" />
              <div className="orden__segment" />
              <div className="orden__segment" />
            </div>
          </div>

          <div className="orden__step-header">
            <h2 className="orden__step-title">Elegí tamaño</h2>
            <button className="orden__compare-btn">Comparar tamaños</button>
          </div>

          <div className="orden__sizes-grid">
            {SIZES.map(s => (
              <button
                key={s.id}
                className={`orden__size-card orden__size-card--${s.col}${sizeId === s.id ? ' orden__size-card--selected' : ''}`}
                onClick={() => setSizeId(s.id)}
              >
                <div className="orden__size-img">
                  <Image src={s.img} alt={s.name} fill style={{ objectFit: 'cover' }} />
                </div>
                <div className="orden__size-meta">
                  <span className="orden__size-name">{s.name.toUpperCase()}</span>
                  <span className="orden__size-price">{fmt(s.price)}</span>
                </div>
                <span className="orden__size-dims">{s.dims}</span>
              </button>
            ))}
          </div>

          <button className="orden__black-btn" disabled={!sizeId} onClick={() => setStep(2)}>
            Continuar
          </button>
        </div>
      )}

      {/* ── STEP 2: DETALLES ───────────────────────────────────── */}
      {step === 2 && (
        <div className="orden__step">
          <div className="orden__progress-bar">
            <span className="orden__step-num">PASO 2 DE 3</span>
            <div className="orden__segments">
              <div className="orden__segment orden__segment--active" />
              <div className="orden__segment orden__segment--active" />
              <div className="orden__segment" />
            </div>
          </div>

          <h2 className="orden__step-title">Contanos tu historia</h2>

          <div className="orden__field">
            <label className="orden__label">Nombre del libro</label>
            <input
              className="orden__input"
              placeholder="Ej: Verano Grecia 2024"
              value={bookName}
              onChange={e => setBookName(e.target.value)}
            />
          </div>

          <div className="orden__field">
            <label className="orden__label">Páginas extra</label>
            <p className="orden__field-hint">
              En una página (dos carillas) recomendamos 6 fotos. Este libro incluye {selectedSize?.pages} páginas por lo que entrarían {(selectedSize?.pages ?? 14) * 6} fotos aprox.
            </p>
            <div className="orden__options-grid">
              {EXTRA_PAGES_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={`orden__option${extraPages === o.value ? ' orden__option--selected' : ''}`}
                  onClick={() => setExtraPages(o.value)}
                >
                  <span className="orden__option-label">{o.label}</span>
                  <span className="orden__option-sub">{o.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="orden__field">
            <label className="orden__label">Textos</label>
            <p className="orden__field-hint">El precio incluye una pieza de texto. Elegí si querés más.</p>
            <div className="orden__options-grid orden__options-grid--2col">
              <button
                className={`orden__option${!extraText ? ' orden__option--selected' : ''}`}
                onClick={() => setExtraText(false)}
              >
                <span className="orden__option-label">Sin extras</span>
                <span className="orden__option-sub">1 texto base</span>
              </button>
              <button
                className={`orden__option${extraText ? ' orden__option--selected' : ''}`}
                onClick={() => setExtraText(true)}
              >
                <span className="orden__option-label">Textos varios</span>
                <span className="orden__option-sub">+$10.000</span>
              </button>
            </div>
          </div>

          <div className="orden__nav">
            <button className="orden__back-btn" onClick={() => setStep(1)}>← Volver</button>
            <button className="orden__black-btn" onClick={() => setStep(3)}>Continuar</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: RESUMEN ────────────────────────────────────── */}
      {step === 3 && (
        <div className="orden__step">
          <div className="orden__progress-bar">
            <span className="orden__step-num">PASO 3 DE 3</span>
            <div className="orden__segments">
              <div className="orden__segment orden__segment--active" />
              <div className="orden__segment orden__segment--active" />
              <div className="orden__segment orden__segment--active" />
            </div>
          </div>

          <h2 className="orden__step-title">Resumen del pedido</h2>
          <p className="orden__step-sub">Una vez abonado se crea una carpeta dentro de tu perfil donde podés cargar el material.</p>

          <div className="orden__summary">
            <div className="orden__summary-row">
              <span>Formato</span><span>{selectedSize?.name} {selectedSize?.dims}</span>
            </div>
            <div className="orden__summary-row">
              <span>Páginas</span><span>{(selectedSize?.pages ?? 14) + extraPages} págs base</span>
            </div>
            <div className="orden__summary-row">
              <span>Nombre</span><span>{bookName || 'Sin título'}</span>
            </div>
            <div className="orden__summary-row">
              <span>Diseño estimado</span><span>en 48 hs hábiles</span>
            </div>
            <div className="orden__summary-row">
              <span>Total</span><span>{fmt(totalPrice)}</span>
            </div>
            <div className="orden__summary-row orden__summary-row--total">
              <span>Pagás ahora (50%)</span><span>{fmt(payNow)}</span>
            </div>
          </div>

          <div className="orden__field">
            <label className="orden__label">WhatsApp</label>
            <div className="orden__phone-row">
              <span className="orden__phone-prefix">+54</span>
              <input
                className="orden__input orden__input--phone"
                placeholder="11 1234 5678"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
              />
            </div>
            <p className="orden__field-hint">Te mandamos el comprobante y te avisamos cuando el diseño esté listo.</p>
          </div>

          <button
            className="orden__black-btn"
            disabled={saving || !whatsapp}
            onClick={handleConfirm}
          >
            {saving ? 'Guardando...' : `Pagar ${fmt(payNow)}`}
          </button>
          <p className="orden__legal">El 50% restante lo pagás cuando apruebes el diseño final.</p>

          <button className="orden__back-btn" onClick={() => setStep(2)}>← Volver</button>
        </div>
      )}

      {/* ── CONFIRMADO ─────────────────────────────────────────── */}
      {step === 'confirmed' && (
        <div className="orden__confirmed">
          <div className="orden__check-circle">✓</div>
          <h2 className="orden__step-title">¡Pedido confirmado!</h2>
          <p className="orden__step-sub">Te mandamos el comprobante por WhatsApp. Ahora subí tu material.</p>
          <ol className="orden__next-steps">
            <li>Subí tus fotos al proyecto</li>
            <li>Diseñamos en menos de 48 hs</li>
            <li>Te enviamos el preview</li>
          </ol>
          <a className="orden__black-btn" href="/mis-proyectos">Ir a mi proyecto</a>
        </div>
      )}

    </div>
  )
}
