'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import './orden.css'

type Step = 'loading' | 'login' | 1 | 2 | 3

const SIZES = [
  { id: 'chico_h',   name: 'Chico Horizontal',  dims: '21 × 14,8 cm', price: 75500,  col: 'half', img: '/fotos/chico.jpg' },
  { id: 'mediano_h', name: 'Mediano Horizontal', dims: '28 × 21,6 cm', price: 81500,  col: 'half', img: '/fotos/mediano.jpg' },
  { id: 'grande_h',  name: 'Grande Horizontal',  dims: '41 × 29 cm',   price: 100000, col: 'full', img: '/fotos/grande.jpg' },
  { id: 'vertical',  name: 'Vertical',           dims: '28 × 21,6 cm', price: 81500,  col: 'half', img: '/fotos/vertical.jpg' },
  { id: 'cuadrado',  name: 'Cuadrado',           dims: '29 × 29 cm',   price: 97000,  col: 'half', img: '/fotos/cuadrado.jpg' },
]

const PRICES_BY_PAGES: Record<string, [number, number, number]> = {
  chico_h:   [82700,  104300, 118700],
  mediano_h: [94700,  116700, 138700],
  grande_h:  [128800, 164800, 200800],
  vertical:  [94700,  116700, 138700],
  cuadrado:  [125800, 161800, 197800],
}

const PAGE_OPTIONS_SMALL = [
  { photos: '20-100 fotos',  pages: 20 },
  { photos: '101-180 fotos', pages: 30 },
  { photos: '180-240 fotos', pages: 40 },
]
const PAGE_OPTIONS_LARGE = [
  { photos: '20-160 fotos',  pages: 20 },
  { photos: '161-240 fotos', pages: 30 },
  { photos: '241-350 fotos', pages: 40 },
]

const BOOK_DIMS: Record<string, [number, number]> = {
  chico:    [21,   14.8],
  mediano:  [28,   21.6],
  grande:   [41,   29  ],
  vertical: [21.6, 28  ],
  cuadrado: [29,   29  ],
}
const BOOK_LABELS: Record<string, string> = {
  chico:    'Chico H',
  mediano:  'Mediano H',
  grande:   'Grande H',
  vertical: 'Vertical',
  cuadrado: 'Cuadrado',
}
const COMP_ORDER = ['chico', 'mediano', 'grande', 'vertical', 'cuadrado']
const SCALE_X = 314 / 41
const SCALE_Y = 228 / 29

// Map onboarding sizeId → landing sizeId for the comparator
const TO_LANDING: Record<string, string> = {
  chico_h: 'chico', mediano_h: 'mediano', grande_h: 'grande',
  vertical: 'vertical', cuadrado: 'cuadrado',
}

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

function StepDots({ current, onBack }: { current: 1 | 2 | 3; onBack?: () => void }) {
  return (
    <div className="orden__stepper">
      {current > 1
        ? <button className="orden__back" onClick={onBack}>‹ Atrás</button>
        : <div className="orden__back-ph" />}
      <div className="orden__dots">
        {([1, 2, 3] as const).map(n => (
          <div
            key={n}
            className={`orden__dot${n < current ? ' orden__dot--done' : ''}${n === current ? ' orden__dot--current' : ''}`}
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OrdenPage() {
  const [step,      setStep]      = useState<Step>('loading')
  const [user,      setUser]      = useState<User | null>(null)
  const [authMode,  setAuthMode]  = useState<'signup' | 'signin'>('signup')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [authError, setAuthError] = useState('')

  const [sizeId,    setSizeId]    = useState('')
  const [pageIdx,   setPageIdx]   = useState<number | null>(null)
  const [textExtra, setTextExtra] = useState<boolean | null>(null)
  const [bookName,  setBookName]  = useState('')
  const [whatsapp,  setWhatsapp]  = useState('')
  const [showComp,  setShowComp]  = useState(false)
  const [compSize,  setCompSize]  = useState('chico')
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    // Pre-fill from landing modal selection
    try {
      const raw = sessionStorage.getItem('zeika_product_selection')
      if (raw) {
        const sel = JSON.parse(raw)
        if (sel.sizeId)                           setSizeId(sel.sizeId)
        if (typeof sel.pageIdx   === 'number')    setPageIdx(sel.pageIdx)
        if (typeof sel.textExtra === 'boolean')   setTextExtra(sel.textExtra)
      }
    } catch {}

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); setStep(1) }
      else setStep('login')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); setStep(prev => prev === 'login' ? 1 : prev) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const isLarge      = ['grande_h', 'cuadrado'].includes(sizeId)
  const pageOptions  = isLarge ? PAGE_OPTIONS_LARGE : PAGE_OPTIONS_SMALL
  const pagePrices   = PRICES_BY_PAGES[sizeId] ?? [0, 0, 0]
  const totalPrice   = (sizeId && pageIdx !== null) ? pagePrices[pageIdx] + (textExtra ? 10000 : 0) : 0
  const payNow       = Math.round(totalPrice / 2)
  const selectedSize = SIZES.find(s => s.id === sizeId)
  const selectedOpt  = pageIdx !== null ? pageOptions[pageIdx] : null

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

  async function handleConfirm() {
    if (!user || !selectedSize) return
    setSaving(true)
    setAuthError('')

    const { data: order, error: orderError } = await supabase.from('orders').insert({
      user_id:     user.id,
      book_name:   bookName || 'Sin título',
      size:        sizeId,
      pages_base:  selectedOpt?.pages ?? 20,
      extra_pages: 0,
      extra_text:  textExtra,
      price_total: totalPrice,
      price_paid:  payNow,
      status:      'pendiente_pago',
    }).select().single()

    if (orderError) {
      setAuthError('Error al guardar el pedido: ' + orderError.message)
      setSaving(false)
      return
    }

    await supabase.from('profiles').upsert({ id: user.id, whatsapp })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const res = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId:    order.id,
        bookName:   bookName || 'Sin título',
        amount:     payNow,
        successUrl: `${siteUrl}/orden/confirmado?orderId=${order.id}`,
        failureUrl: `${siteUrl}/orden?error=1`,
      }),
    })
    const json = await res.json()
    if (json.url) {
      sessionStorage.removeItem('zeika_product_selection')
      window.location.href = json.url
      return
    }
    setAuthError('Error al conectar con MercadoPago.')
    setSaving(false)
  }

  if (step === 'loading') return (
    <div className="orden-loading"><div className="orden-spinner" /></div>
  )

  const STEP_TITLES: Record<number, string> = {
    1: 'Elegí tamaño',
    2: 'Contanos tu historia',
    3: 'Resumen del pedido',
  }

  return (
    <div className="orden">
      <header className="orden__header">
        <a href="/"><Image src="/LogoZeika.png" alt="Zeika" width={50} height={50} /></a>
      </header>

      {/* ── Shared step header: dots + title ───────────────────────────────── */}
      {(step === 1 || step === 2 || step === 3) && (
        <div className="orden__step-header">
          <StepDots
            current={step as 1 | 2 | 3}
            onBack={step > 1 ? () => setStep((step - 1) as 1 | 2) : undefined}
          />
          <h2 className="orden__title">{STEP_TITLES[step]}</h2>
        </div>
      )}

      {/* ── LOGIN ──────────────────────────────────────────────────────────── */}
      {step === 'login' && (
        <>
          <div className="orden__scroll">
            <div className="orden__login-content">
              <h1 className="orden__title">Empezá tu historia</h1>
              <p className="orden__subtitle">Entrá con tu cuenta de Google y en un click estás adentro.</p>

              <button className="orden__google-btn" onClick={handleGoogle}>
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                CONTINUAR CON GOOGLE
              </button>

              <div className="orden__divider"><span>o</span></div>

              <div className="orden__form">
                <input className="orden__input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                <input className="orden__input" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEmail()} />
                {authError && <p className="orden__error">{authError}</p>}
                <button className="orden__blue-btn" onClick={handleEmail} disabled={!email || !password}>CONTINUAR</button>
              </div>

              <div className="orden__toggle-section">
                <p className="orden__toggle-label">{authMode === 'signup' ? '¿Ya tenés una cuenta?' : '¿No tenés cuenta?'}</p>
                <button className="orden__outline-btn" onClick={() => { setAuthMode(m => m === 'signup' ? 'signin' : 'signup'); setAuthError('') }}>
                  {authMode === 'signup' ? 'INICIAR SESIÓN' : 'REGISTRARSE'}
                </button>
              </div>
            </div>
          </div>

          <div className="orden__wa-footer">
            <div className="orden__wa-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#25D366"/>
                <path d="M16 6C10.477 6 6 10.477 6 16c0 1.89.523 3.655 1.432 5.16L6 26l4.98-1.407A9.946 9.946 0 0016 26c5.523 0 10-4.477 10-10S21.523 6 16 6zm4.38 14.13c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.014-.374-1.932-1.19-.714-.636-1.196-1.42-1.336-1.66-.14-.24-.015-.37.105-.49.108-.108.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.468-.394-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.692 2.582 4.1 3.62.573.248 1.02.396 1.368.506.575.183 1.098.157 1.512.095.461-.069 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" fill="white"/>
              </svg>
            </div>
            <p className="orden__wa-text">Tené en cuenta que después vamos a necesitar tu número de WhatsApp, para mandarte el comprobante de pago.</p>
          </div>
        </>
      )}

      {/* ── STEP 1: TAMAÑO ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <>
          <div className="orden__scroll">
            <div className="orden__content">
              <button
                className="orden__compare-btn"
                onClick={() => { setCompSize(sizeId ? (TO_LANDING[sizeId] ?? 'chico') : 'chico'); setShowComp(true) }}
              >
                Comparar tamaños
              </button>

              <div className="orden__sizes-grid">
                {SIZES.map(s => (
                  <div key={s.id} className={`orden__size-card${s.col === 'full' ? ' orden__size-card--full' : ''}`}>
                    <div className={`orden__size-img orden__size-img--${s.id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.img} alt={s.name} />
                    </div>
                    <button
                      className={`orden__select-btn${sizeId === s.id ? ' orden__select-btn--selected' : ''}`}
                      onClick={() => setSizeId(s.id)}
                    >
                      <span className={`orden__select-dot${sizeId === s.id ? ' orden__select-dot--active' : ''}`} />
                      {sizeId === s.id ? 'Seleccionado' : 'Seleccionar'}
                    </button>
                    <div className="orden__size-meta">
                      <span className="orden__size-name">{s.name.toUpperCase()}</span>
                      <span className="orden__size-price">{fmt(s.price)}</span>
                    </div>
                    <span className="orden__size-dims">{s.dims}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="orden__cta-bar">
            <button className="orden__cta-btn" disabled={!sizeId} onClick={() => setStep(2)}>
              CONFIRMAR
            </button>
          </div>

          {/* ── Comparar overlay ─────────────────────────────────────────── */}
          {showComp && (() => {
            const [aw, ah] = BOOK_DIMS[compSize] ?? [21, 14.8]
            const activePxW = Math.round(aw * SCALE_X)
            const activePxH = Math.round(ah * SCALE_Y)
            return (
              <div className="orden__comp-backdrop" onClick={() => setShowComp(false)}>
                <div className="orden__comp-panel" onClick={e => e.stopPropagation()}>
                  <div className="orden__comp-header">
                    <button className="orden__comp-close" onClick={() => setShowComp(false)}>×</button>
                  </div>
                  <div className="orden__comp-canvas-wrap">
                    <div className="orden__comp-canvas">
                      {COMP_ORDER.map(id => {
                        const [w, h] = BOOK_DIMS[id]
                        return (
                          <div
                            key={id}
                            className={`orden__comp-rect${id === compSize ? ' orden__comp-rect--active' : ''}`}
                            style={{ width: Math.round(w * SCALE_X), height: Math.round(h * SCALE_Y) }}
                          />
                        )
                      })}
                      <span className="orden__comp-dim orden__comp-dim--w" style={{ top: activePxH + 6, left: activePxW / 2 }}>
                        {aw} cm
                      </span>
                      <span className="orden__comp-dim orden__comp-dim--h" style={{ left: activePxW + 8, top: activePxH / 2 }}>
                        {ah} cm
                      </span>
                    </div>
                  </div>
                  <div className="orden__comp-tabs">
                    {COMP_ORDER.map(id => (
                      <button
                        key={id}
                        className={`orden__comp-tab${id === compSize ? ' orden__comp-tab--active' : ''}`}
                        onClick={() => setCompSize(id)}
                      >
                        {BOOK_LABELS[id]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ── STEP 2: DETALLES ───────────────────────────────────────────────── */}
      {step === 2 && (
        <>
          <div className="orden__scroll">
            <div className="orden__content">
              <div className="orden__field orden__field--name">
                <label className="orden__label">NOMBRE DEL LIBRO</label>
                <input className="orden__input" placeholder="Ej: Verano Grecia 2024" value={bookName} onChange={e => setBookName(e.target.value)} />
              </div>

              <div className="orden__field">
                <label className="orden__label">CANTIDAD DE FOTOS A SUBIR</label>
                <div className="orden__cards">
                  {pageOptions.map((opt, i) => (
                    <button
                      key={i}
                      className={`orden__card${pageIdx === i ? ' orden__card--selected' : ''}`}
                      onClick={() => setPageIdx(i)}
                    >
                      <span className="orden__card-top">{opt.photos}</span>
                      <span className="orden__card-bot">{opt.pages} páginas</span>
                    </button>
                  ))}
                </div>
                <p className="orden__note">La cantidad de fotos es una recomendación ya que calculamos 3 fotos por carilla pero se puede adaptar a lo que buscás.</p>
              </div>

              <div className="orden__field">
                <label className="orden__label">TEXTOS</label>
                <div className="orden__cards">
                  <button className={`orden__card${textExtra === false ? ' orden__card--selected' : ''}`} onClick={() => setTextExtra(false)}>
                    <span className="orden__card-top">1 texto</span>
                    <span className="orden__card-bot">Incluído</span>
                  </button>
                  <button className={`orden__card${textExtra === true ? ' orden__card--selected' : ''}`} onClick={() => setTextExtra(true)}>
                    <span className="orden__card-top">Textos varios</span>
                    <span className="orden__card-bot">+$10.000</span>
                  </button>
                  <div />
                </div>
              </div>
            </div>
          </div>

          <div className="orden__cta-bar">
            <button className="orden__cta-btn" disabled={!bookName.trim() || pageIdx === null || textExtra === null} onClick={() => setStep(3)}>CONFIRMAR</button>
          </div>
        </>
      )}

      {/* ── STEP 3: RESUMEN ────────────────────────────────────────────────── */}
      {step === 3 && (
        <>
          <div className="orden__scroll">
            <div className="orden__content orden__content--summary">
              <p className="orden__subtitle-center">Una vez abonado se crea una carpeta dentro de tu perfil donde podés cargás el material</p>

              <div className="orden__summary">
                <div className="orden__summary-row">
                  <span className="orden__summary-key">FORMATO</span>
                  <span className="orden__summary-val">{selectedSize?.name} {selectedSize?.dims}</span>
                </div>
                <div className="orden__summary-row">
                  <span className="orden__summary-key">PÁGINAS</span>
                  <span className="orden__summary-val">{selectedOpt?.pages} páginas</span>
                </div>
                <div className="orden__summary-row">
                  <span className="orden__summary-key">TEXTOS</span>
                  <span className="orden__summary-val">{textExtra ? 'Textos varios' : '1 texto'}</span>
                </div>
                <div className="orden__summary-row">
                  <span className="orden__summary-key">NOMBRE</span>
                  <span className="orden__summary-val">{bookName || 'Sin título'}</span>
                </div>
                <div className="orden__summary-row">
                  <span className="orden__summary-key">DISEÑO ESTIMADO</span>
                  <span className="orden__summary-val">En 48hs hábiles</span>
                </div>
              </div>

              <div className="orden__totals">
                <div className="orden__total-col">
                  <span className="orden__total-label">TOTAL:</span>
                  <span className="orden__total-price">{fmt(totalPrice)}</span>
                </div>
                <div className="orden__total-col">
                  <span className="orden__total-label">A PAGAR AHORA (50%)</span>
                  <span className="orden__total-now">{fmt(payNow)}</span>
                </div>
              </div>

              <div className="orden__field">
                <label className="orden__label">WHATSAPP</label>
                <div className="orden__phone-row">
                  <span className="orden__phone-prefix">+54</span>
                  <input className="orden__input orden__input--phone" placeholder="11 1234 5678" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                </div>
              </div>

              {authError && <p className="orden__error">{authError}</p>}
            </div>
          </div>

          <div className="orden__cta-bar">
            <button className="orden__cta-btn" disabled={saving || !whatsapp} onClick={handleConfirm}>
              {saving ? 'Guardando...' : `PAGAR ${fmt(payNow)}`}
            </button>
            <p className="orden__legal">El 50% restante se paga cuando se aprueba el diseño final.</p>
          </div>
        </>
      )}
    </div>
  )
}
