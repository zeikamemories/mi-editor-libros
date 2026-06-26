'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Landing/Navbar/Navbar'
import '../mis-proyectos.css'

// ── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string
  book_name: string
  size: string
  status: string
  price_total: number
  price_paid: number
  created_at: string
  extra_pages: number
  extra_text: boolean
  pages_base: number
  preview_url: string | null
  tracking_number: string | null
  drive_link: string | null
  docs_link: string | null
  reference_images: string[]
  change_requests_used: number
  estimated_design_date: string | null
  estimated_delivery_date: string | null
  status_dates: Record<string, string>
}

interface Note {
  id: string
  content: string
  type: string
  created_at: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const SIZE_INFO: Record<string, { name: string; dims: string }> = {
  chico_h:   { name: 'Chico Horizontal',  dims: '21 × 14,8 cm' },
  mediano_h: { name: 'Mediano Horizontal', dims: '28 × 21,6 cm' },
  grande_h:  { name: 'Grande Horizontal',  dims: '41 × 29 cm'   },
  vertical:  { name: 'Vertical',           dims: '28 × 21,6 cm' },
  cuadrado:  { name: 'Cuadrado',           dims: '29 × 29 cm'   },
}

const UNIT_PRICES: Record<string, number> = {
  chico_h:   75000,
  mediano_h: 81500,
  grande_h:  100000,
  vertical:  81500,
  cuadrado:  97000,
}

const STATUS_LABEL: Record<string, string> = {
  pendiente_pago:    'Cargar material',
  confirmado:        'Cargar material',
  material_recibido: 'Material Cargado',
  en_diseno:         'En diseño',
  preview_listo:     'Preview listo',
  en_produccion:     'En producción',
  en_camino:         'En camino',
  entregado:         'Entregado',
}

const STEP_DONE: Record<string, number> = {
  pendiente_pago:    0,
  confirmado:        0,
  material_recibido: 1,
  en_diseno:         2,
  preview_listo:     3,
  en_produccion:     4,
  en_camino:         5,
  entregado:         7,
}

const TIMELINE_STEPS = [
  { key: 'confirmado',        label: 'Pedido confirmado'  },
  { key: 'material_recibido', label: 'Material recibido'  },
  { key: 'en_diseno',         label: 'En diseño'          },
  { key: 'preview_listo',     label: 'Preview disponible' },
  { key: 'en_produccion',     label: 'En producción'      },
  { key: 'en_camino',         label: 'En camino'          },
  { key: 'entregado',         label: 'Entregado'          },
]

const SECTION_TITLES: Record<string, string> = {
  detalles:   'Detalles del pedido',
  estado:     'Estado',
  material:   'Tu material',
  preview:    'Preview',
  pagar:      'Finalizar compra',
  confirmado: '¡Pedido confirmado!',
}

const MAX_CHANGES = 3

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function orderNumber(id: string, date: string) {
  return `ZK-${new Date(date).getFullYear()}-${id.substring(0, 6).toUpperCase()}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Accordion({ title, children, open, onToggle, extraClass }: {
  title: string; children: React.ReactNode; open: boolean; onToggle: () => void; extraClass?: string
}) {
  return (
    <div className={`mpd-accordion${extraClass ? ` ${extraClass}` : ''}`}>
      <button className={`mpd-accordion__trigger${open ? '' : ' mpd-accordion__trigger--closed'}`} onClick={onToggle}>
        <span className="mpd-accordion__label">{title}</span>
        <div className={`mpd-accordion__btn${open ? ' mpd-accordion__btn--open' : ''}`}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      {open && <div className="mpd-accordion__body">{children}</div>}
    </div>
  )
}

function DesktopTabBtn({ title, isActive, disabled, onClick }: {
  title: string; isActive: boolean; disabled?: boolean; onClick: () => void
}) {
  return (
    <button
      className={`mpd-tab-btn${isActive ? ' mpd-tab-btn--active' : ''}${disabled ? ' mpd-tab-btn--disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="mpd-tab-btn__label">{title}</span>
      <div className="mpd-tab-btn__icon">
        {isActive ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M1 1.5L6 6L1 10.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </button>
  )
}

function StepCircle({ state }: { state: 'done' | 'current' | 'pending' }) {
  if (state === 'done') return (
    <div className="mpd-step-circle mpd-step-circle--done">
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <path d="M1.5 6L6 10.5L14.5 1.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
  if (state === 'current') return <div className="mpd-step-circle mpd-step-circle--current" />
  return <div className="mpd-step-circle mpd-step-circle--pending" />
}

function RoundCircle({ state }: { state: 'done' | 'current' | 'free' }) {
  if (state === 'done') return (
    <div className="mpd-round-circle mpd-round-circle--done">
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
        <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
  if (state === 'current') return <div className="mpd-round-circle mpd-round-circle--current" />
  return <div className="mpd-round-circle mpd-round-circle--free" />
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProyectoPage() {
  const router       = useRouter()
  const params       = useParams()
  const searchParams = useSearchParams()
  const orderId      = params.orderId as string

  const [order,    setOrder]    = useState<Order | null>(null)
  const [notes,    setNotes]    = useState<Note[]>([])
  const [userId,   setUserId]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [userName,  setUserName]  = useState('')
  const [userEmail, setUserEmail] = useState('')

  const [openSection, setOpenSection] = useState<string>(searchParams.get('open') ?? 'material')

  // Material form
  const [driveLink,          setDriveLink]          = useState('')
  const [docsLink,           setDocsLink]           = useState('')
  const [noteText,           setNoteText]           = useState('')
  const [confirmingMaterial, setConfirmingMaterial] = useState(false)
  const [materialDone,       setMaterialDone]       = useState(false)
  const [showMaterialToast,  setShowMaterialToast]  = useState(false)
  const refInputRef = useRef<HTMLInputElement>(null)
  const [uploadingRef, setUploadingRef] = useState(false)

  // Preview
  const [sendingChange, setSendingChange] = useState(false)
  const [approved,      setApproved]      = useState(false)
  const [coverThumbnail, setCoverThumbnail] = useState<{ left?: string; right?: string } | null>(null)

  // Pagar (inline for desktop)
  const [copies,          setCopies]          = useState(1)
  const [deliveryType,    setDeliveryType]    = useState<'andreani' | 'pickup'>('andreani')
  const [shippingPrice,   setShippingPrice]   = useState<number | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [pais,      setPais]      = useState('')
  const [provincia, setProvincia] = useState('')
  const [ciudad,    setCiudad]    = useState('')
  const [calle,     setCalle]     = useState('')
  const [numero,    setNumero]    = useState('')
  const [piso,      setPiso]      = useState('')
  const [depto,     setDepto]     = useState('')
  const [cp,        setCp]        = useState('')
  const [paying,    setPaying]    = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Entregado
  const [reviewStars,       setReviewStars]       = useState(0)
  const [reviewText,        setReviewText]         = useState('')
  const [submittingReview,  setSubmittingReview]   = useState(false)
  const [confirmingDelivery, setConfirmingDelivery] = useState(false)
  const [copied, setCopied] = useState(false)

  // Shipping quote debounce
  useEffect(() => {
    if (deliveryType !== 'andreani') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = cp.trim()
    if (!/^\d{4}$/.test(trimmed)) { setShippingPrice(null); return }
    setShippingLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/shipping-quote?cp=${trimmed}`)
        const data = await res.json()
        setShippingPrice(res.ok ? (data.price as number) : null)
      } catch {
        setShippingPrice(null)
      } finally {
        setShippingLoading(false)
      }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [cp, deliveryType])

  useEffect(() => {
    async function init() {
      let { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        await new Promise(r => setTimeout(r, 800))
        ;({ data: { session } } = await supabase.auth.getSession())
      }
      if (!session?.user) { router.replace('/orden'); return }
      setUserId(session.user.id)
      const meta = session.user.user_metadata
      setUserName(meta?.full_name || meta?.name || session.user.email?.split('@')[0] || '')
      setUserEmail(session.user.email ?? '')

      const [{ data: o }, { data: n }, { data: p }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).eq('user_id', session.user.id).single(),
        supabase.from('order_notes').select('id, content, type, created_at').eq('order_id', orderId).order('created_at'),
        supabase.from('projects').select('cover_thumbnail').eq('order_id', orderId).maybeSingle(),
      ])
      if (!o) { router.replace('/mis-proyectos'); return }

      // Handle coming back from MercadoPago with ?open=confirmado
      const openParam = searchParams.get('open')
      if (openParam === 'confirmado' && o.status === 'preview_listo') {
        const discount   = (o.copies ?? 1) >= 3 ? 0.8 : 1
        const unitPrice  = UNIT_PRICES[o.size] ?? o.price_total
        const total      = (o.copies ?? 1) * unitPrice * discount
        const secondPaid = Math.round(total - o.price_paid)
        const nowIso     = new Date().toISOString()
        const newDates   = { ...(o.status_dates ?? {}), en_produccion: nowIso }
        await supabase.from('orders').update({
          status:            'en_produccion',
          second_price_paid: secondPaid,
          status_dates:      newDates,
        }).eq('id', orderId)
        o.status       = 'en_produccion'
        o.status_dates = newDates
      }

      setOrder(o as Order)
      setDriveLink(o.drive_link ?? '')
      setDocsLink(o.docs_link ?? '')
      setNotes((n ?? []) as Note[])
      if (p?.cover_thumbnail) setCoverThumbnail(p.cover_thumbnail)
      setLoading(false)
    }
    init()
  }, [orderId, router, searchParams])

  async function saveLinkSilently(field: 'drive_link' | 'docs_link', value: string) {
    if (!order || value === (order[field] ?? '')) return
    await supabase.from('orders').update({ [field]: value }).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, [field]: value } : prev)
  }

  async function confirmMaterial() {
    if (!order) return
    setMaterialDone(true)
    setConfirmingMaterial(true)
    const updates: Record<string, unknown> = {
      drive_link: driveLink,
      docs_link:  docsLink,
      status:     'material_recibido',
      status_dates: { ...(order.status_dates ?? {}), material_recibido: new Date().toISOString() },
    }
    await supabase.from('orders').update(updates).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, ...updates } as Order : prev)
    if (noteText.trim()) {
      const { data } = await supabase.from('order_notes').insert({
        order_id: order.id, user_id: userId, content: noteText.trim(), type: 'note',
      }).select().single()
      if (data) setNotes(prev => [...prev, data as Note])
      setNoteText('')
    }
    setConfirmingMaterial(false)
    setShowMaterialToast(true)
    setTimeout(() => setShowMaterialToast(false), 5000)
  }

  async function uploadRefImage(file: File) {
    if (!order) return
    setUploadingRef(true)
    const form = new FormData()
    form.append('file', file)
    const res  = await fetch('/api/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) {
      const updated = [...(order.reference_images ?? []), data.url]
      await supabase.from('orders').update({ reference_images: updated }).eq('id', order.id)
      setOrder(prev => prev ? { ...prev, reference_images: updated } : prev)
    }
    setUploadingRef(false)
  }

  async function requestChange() {
    if (!order || sendingChange) return
    setSendingChange(true)
    const newUsed = (order.change_requests_used ?? 0) + 1
    await supabase.from('orders').update({ change_requests_used: newUsed }).eq('id', order.id)
    await supabase.from('order_notes').insert({
      order_id: order.id, user_id: userId, content: 'Ronda de cambios solicitada', type: 'change_request',
    })
    setOrder(prev => prev ? { ...prev, change_requests_used: newUsed } : prev)
    setSendingChange(false)
  }

  function copyTracking() {
    if (!order?.tracking_number) return
    navigator.clipboard.writeText(order.tracking_number).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function confirmDelivery() {
    if (!order || confirmingDelivery) return
    setConfirmingDelivery(true)
    await supabase.from('order_notes').insert({
      order_id: order.id, user_id: userId,
      content: 'Entrega confirmada por el cliente',
      type: 'delivery_confirmed',
    })
    setNotes(prev => [...prev, {
      id: Date.now().toString(),
      content: 'Entrega confirmada por el cliente',
      type: 'delivery_confirmed',
      created_at: new Date().toISOString(),
    }])
    setConfirmingDelivery(false)
  }

  async function submitReview() {
    if (!order || !reviewStars || submittingReview) return
    setSubmittingReview(true)
    const content = JSON.stringify({ stars: reviewStars, text: reviewText.trim() })
    await supabase.from('order_notes').insert({
      order_id: order.id, user_id: userId, content, type: 'review',
    })
    setNotes(prev => [...prev, {
      id: Date.now().toString(), content, type: 'review',
      created_at: new Date().toISOString(),
    }])
    setSubmittingReview(false)
  }

  // Inline pagar (desktop)
  async function handleReorderDesktop() {
    if (!order || paying) return
    const unitPriceR     = UNIT_PRICES[order.size] ?? order.price_total
    const discountR      = copies >= 3 ? 0.8 : 1
    const subtotalR      = copies * unitPriceR * discountR
    const shippingTotalR = deliveryType === 'andreani' ? (shippingPrice ?? 0) : 0
    const payNowR        = Math.round(subtotalR + shippingTotalR)
    const fullAddress    = [
      calle, numero, piso && `Piso ${piso}`, depto && `Depto ${depto}`,
      ciudad, provincia, pais, cp && `CP ${cp}`,
    ].filter(Boolean).join(', ')
    setPaying(true)
    await supabase.from('orders').update({
      copies,
      delivery_type:    deliveryType,
      delivery_address: deliveryType === 'andreani' ? fullAddress : 'Retiro en fábrica',
    }).eq('id', order.id)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const res = await fetch('/api/payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId:    order.id,
        bookName:   order.book_name,
        amount:     payNowR,
        successUrl: `${siteUrl}/mis-proyectos/${order.id}/confirmado`,
        failureUrl: `${siteUrl}/mis-proyectos/${order.id}?open=reorder`,
      }),
    })
    const data = await res.json()
    if (data.url) { window.location.href = data.url; return }
    setPaying(false)
  }

  async function handlePayDesktop() {
    if (!order || paying) return
    const unitPrice     = UNIT_PRICES[order.size] ?? order.price_total
    const discount      = copies >= 3 ? 0.8 : 1
    const subtotal      = copies * unitPrice * discount
    const shippingTotal = deliveryType === 'andreani' ? (shippingPrice ?? 0) : 0
    const payNow        = Math.round(subtotal - order.price_paid + shippingTotal)

    const fullAddress = [
      calle, numero, piso && `Piso ${piso}`, depto && `Depto ${depto}`,
      ciudad, provincia, pais, cp && `CP ${cp}`,
    ].filter(Boolean).join(', ')

    setPaying(true)
    await supabase.from('orders').update({
      copies,
      delivery_type:    deliveryType,
      delivery_address: deliveryType === 'andreani' ? fullAddress : 'Retiro en fábrica',
    }).eq('id', order.id)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const res = await fetch('/api/payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId:    order.id,
        bookName:   order.book_name,
        amount:     payNow,
        successUrl: `${siteUrl}/mis-proyectos/${order.id}?open=confirmado`,
        failureUrl: `${siteUrl}/mis-proyectos/${order.id}?open=pagar`,
      }),
    })
    const data = await res.json()
    if (data.url) { window.location.href = data.url; return }
    setPaying(false)
  }

  function toggle(section: string) {
    setOpenSection(prev => prev === section ? '' : section)
  }

  if (loading || !order) return (
    <div className="mp-loading"><div className="mp-spinner" /></div>
  )

  const sizeInfo        = SIZE_INFO[order.size] ?? { name: order.size, dims: '' }
  const done            = STEP_DONE[order.status] ?? 0
  const allDone         = order.status === 'entregado'
  const statusDates     = order.status_dates ?? {}
  const totalPages      = (order.pages_base ?? 14) + (order.extra_pages ?? 0)
  const canPreview      = ['preview_listo','en_produccion','en_camino','entregado'].includes(order.status)
  const canApprove      = order.status === 'preview_listo'
  const afterProduction = ['en_produccion','en_camino','entregado'].includes(order.status)
  const firstName          = userName.split(' ')[0]
  const usedRounds         = order.change_requests_used ?? 0
  const deliveryConfirmed  = notes.some(n => n.type === 'delivery_confirmed')
  const hasReview          = notes.some(n => n.type === 'review')

  // Pagar calculations
  const unitPrice     = UNIT_PRICES[order.size] ?? order.price_total
  const discount      = copies >= 3 ? 0.8 : 1
  const subtotal      = copies * unitPrice * discount
  const shippingTotal = deliveryType === 'andreani' ? (shippingPrice ?? 0) : 0
  const payNow        = Math.round(subtotal - order.price_paid + shippingTotal)
  const shippingLabel = shippingLoading ? 'Calculando...' : shippingPrice !== null ? fmt(shippingPrice) : 'A calcular'
  const shippingReady = deliveryType === 'pickup' || shippingPrice !== null
  const addressFilled = deliveryType === 'pickup' || (
    pais.trim() && provincia.trim() && ciudad.trim() && calle.trim() && numero.trim() && cp.trim()
  )

  // ── Section content ───────────────────────────────────────────────────────

  const detallesContent = (
    <>
      <div className="mpd-row">
        <span className="mpd-row__key">Formato</span>
        <span className="mpd-row__val">{sizeInfo.name} {sizeInfo.dims}</span>
      </div>
      <div className="mpd-row">
        <span className="mpd-row__key">Páginas</span>
        <span className="mpd-row__val">{totalPages} base</span>
      </div>
      <div className="mpd-row">
        <span className="mpd-row__key">Fecha del pedido</span>
        <span className="mpd-row__val">{fmtDate(order.created_at)}</span>
      </div>
      <div className="mpd-row">
        <span className="mpd-row__key">Diseño estimado</span>
        <span className="mpd-row__val">
          {order.estimated_design_date ? fmtDate(order.estimated_design_date) : 'En 48hs hábiles'}
        </span>
      </div>
      <div className="mpd-row">
        <span className="mpd-row__key">Pagado</span>
        <span className="mpd-row__val">{fmt(order.price_paid)}</span>
      </div>
      {!afterProduction && (
        <div className="mpd-row mpd-row--balance">
          <span className="mpd-row__key">Saldo pendiente</span>
          <span className="mpd-row__val">{fmt(order.price_total - order.price_paid)}</span>
        </div>
      )}
    </>
  )

  const estadoContent = (
    <>
      {TIMELINE_STEPS.map((step, i) => {
        const isDone    = i < done || allDone
        const isCurrent = !allDone && i === done
        const isPending = !isDone && !isCurrent
        const date      = statusDates[step.key]
          ?? (step.key === 'confirmado' ? order.created_at : null)
        const circleState = isDone ? 'done' : isCurrent ? 'current' : 'pending'
        return (
          <div key={step.key} className={`mpd-timeline-row${isCurrent ? ' mpd-timeline-row--current' : ''}`}>
            <div className="mpd-timeline-row__inner">
              <StepCircle state={circleState} />
              <div className="mpd-step-text">
                <div className={`mpd-step-name${isPending ? ' mpd-step-name--pending' : ''}`}>
                  {step.label}
                </div>
                {date && !isPending && (
                  <div className="mpd-step-date">{fmtDate(date)}</div>
                )}
              </div>
            </div>
            {step.key === 'en_camino' && (isDone || isCurrent) && order.tracking_number && (
              <div className="mpd-tracking-card">
                <div className="mpd-tracking-card__header">
                  <div className="mpd-tracking-card__labels">
                    <span className="mpd-tracking-card__label">Número de seguimiento</span>
                    <a
                      className="mpd-tracking-card__number"
                      href={`https://www.andreani.com/#!/informacionEnvio/${order.tracking_number}`}
                      target="_blank" rel="noreferrer"
                    >
                      {order.tracking_number}
                    </a>
                  </div>
                  <img src="/fotos/andreani.png" alt="Andreani" className="mpd-tracking-card__logo" />
                </div>
                {order.estimated_delivery_date && (
                  <div className="mpd-tracking-card__delivery">
                    <span className="mpd-tracking-card__label">Entrega estimada</span>
                    <span className="mpd-tracking-card__delivery-date">{fmtDate(order.estimated_delivery_date)}</span>
                  </div>
                )}
                <a
                  className="mpd-tracking-card__btn"
                  href={`https://www.andreani.com/#!/informacionEnvio/${order.tracking_number}`}
                  target="_blank" rel="noreferrer"
                >
                  Rastrear el pedido
                </a>
              </div>
            )}
          </div>
        )
      })}
    </>
  )

  const materialContent = (
    <>
      <div className="mpd-mat-row">
        <div className="mpd-mat-header">
          <span className="mpd-mat-header__label">Fotos / Google Drive</span>
        </div>
        <div className="mpd-mat-input-row">
          <input
            className="mpd-mat-input"
            placeholder="Pegá el link de tu carpeta"
            value={driveLink}
            onChange={e => setDriveLink(e.target.value)}
            onBlur={e => saveLinkSilently('drive_link', e.target.value)}
          />
          {driveLink && (
            <a className="mpd-mat-open-btn" href={driveLink} target="_blank" rel="noopener noreferrer">
              Abrir carpeta →
            </a>
          )}
        </div>
      </div>
      <div className="mpd-mat-row">
        <div className="mpd-mat-header">
          <span className="mpd-mat-header__label">Textos / Google Docs</span>
        </div>
        {docsLink ? (
          <a className="mpd-mat-link-btn" href={docsLink} target="_blank" rel="noopener noreferrer">
            Abrir documento de textos →
          </a>
        ) : (
          <input
            className="mpd-mat-input"
            placeholder="El documento se genera automáticamente al confirmar el pago"
            value={docsLink}
            onChange={e => setDocsLink(e.target.value)}
            onBlur={e => saveLinkSilently('docs_link', e.target.value)}
            readOnly
          />
        )}
      </div>
      <div className="mpd-mat-row">
        <div className="mpd-mat-header">
          <span className="mpd-mat-header__label">Referencias de diseño de tapa</span>
          <span className="mpd-mat-header__opt">(Opcional)</span>
        </div>
        <div className="mpd-ref-upload">
          {(order.reference_images ?? []).length > 0 && (
            <div className="mpd-ref-images-row">
              {(order.reference_images ?? []).map((url, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={idx} src={url} alt="" className="mpd-ref-img" />
              ))}
            </div>
          )}
          {(order.reference_images ?? []).length < 6 && (
            <div className="mpd-ref-add-wrap">
              <button className="mpd-ref-add-btn" onClick={() => refInputRef.current?.click()} disabled={uploadingRef}>
                {uploadingRef ? '...' : '+'}
              </button>
              <span className="mpd-ref-upload-label">Subir</span>
            </div>
          )}
          <p className="mpd-ref-desc">
            Podes subir fotos de referencia, ejemplos de otros libros... lo que nos sirva para entender el estilo que querés.
          </p>
        </div>
        <input
          ref={refInputRef} type="file" accept="image/*"
          className="mpd-hidden-input"
          onChange={e => { if (e.target.files?.[0]) uploadRefImage(e.target.files[0]); e.target.value = '' }}
        />
      </div>
      <div className="mpd-mat-row">
        <div className="mpd-mat-header">
          <span className="mpd-mat-header__label">Notas para el equipo</span>
          <span className="mpd-mat-header__opt">(Opcional)</span>
        </div>
        <textarea
          className="mpd-mat-textarea"
          placeholder="Contanos cualquier detalle que quieras que tengamos en cuenta..."
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
        />
      </div>
      {(() => {
        const confirmed = materialDone || !['pendiente_pago', 'confirmado'].includes(order.status)
        return (
          <div className="mpd-mat-save-wrap">
            <button
              className={`mpd-accept-check mpd-accept-check--material${confirmed ? ' mpd-accept-check--unavailable' : ''}`}
              onClick={!confirmed && !confirmingMaterial ? confirmMaterial : undefined}
              disabled={confirmed || confirmingMaterial}
            >
              <div className={`mpd-check-circle${confirmed ? ' mpd-check-circle--checked' : ''}`} />
              <span>Material cargado</span>
            </button>
          </div>
        )
      })()}
    </>
  )

  const previewContent = !canPreview ? (
    <div className="mpd-preview-unready">
      <p>Estará disponible cuando el diseño esté listo.</p>
      <p>Tendrás 3 rondas de cambio.</p>
    </div>
  ) : (
    <>
      <div className="mpd-preview-row">
        <div className="mpd-preview-card">
          <div className="mpd-preview-thumb">
            {coverThumbnail ? (
              <>
                {coverThumbnail.left && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverThumbnail.left} alt="Portada izquierda" className="mpd-preview-thumb-page" />
                )}
                {coverThumbnail.right && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverThumbnail.right} alt="Portada derecha" className="mpd-preview-thumb-page" />
                )}
              </>
            ) : (
              <div className="mpd-preview-thumb-empty" />
            )}
          </div>
          <div className="mpd-preview-card-info">
            <div className="mpd-preview-card-name">{order.book_name}</div>
            {order.preview_url ? (
              <a className="mpd-preview-link" href={(() => {
                try {
                  const u = new URL(order.preview_url!)
                  return `${u.pathname}?orderId=${order.id}`
                } catch {
                  return `${order.preview_url}?orderId=${order.id}`
                }
              })()}>
                Ver el libro completo ›
              </a>
            ) : (
              <span className="mpd-preview-pending">Preview no disponible aún</span>
            )}
          </div>
        </div>
      </div>

      {canApprove && (
        <>
          <div className="mpd-rounds-row">
            <div className="mpd-rounds-header">
              <span className="mpd-rounds-label">Ronda de cambios</span>
              <div className="mpd-rounds-circles">
                {Array.from({ length: MAX_CHANGES }, (_, i) => {
                  const state = i < usedRounds ? 'done' : i === usedRounds && usedRounds < MAX_CHANGES ? 'current' : 'free'
                  return <RoundCircle key={i} state={state} />
                })}
              </div>
            </div>
            <p className="mpd-rounds-desc">
              Nuestro precio incluye 3 rondas de cambios. A partir de la tercera hay un precio extra de $5.000 por ronda.
            </p>
          </div>
          <div className="mpd-change-btn-row">
            <button
              className="mpd-guardar-cambios-btn"
              onClick={requestChange}
              disabled={sendingChange || usedRounds >= MAX_CHANGES}
            >
              {sendingChange ? 'Guardando...' : 'Pedir un cambio'}
            </button>
          </div>
        </>
      )}

      {afterProduction && (
        <div className="mpd-preview-approved">
          Diseño aprobado. Tu libro está en producción.
        </div>
      )}
    </>
  )

  // ── Inline pagar content (desktop right panel) ────────────────────────────

  const pagarContent = (
    <div className="mpd-pagar-panel">
      <div className="mpd-row mpd-row--white">
        <span className="mpd-row__key">Nombre</span>
        <span className="mpd-row__val">{order.book_name}</span>
      </div>
      <div className="mpd-row mpd-row--white">
        <span className="mpd-row__key">Formato</span>
        <span className="mpd-row__val">{sizeInfo.name} · {sizeInfo.dims}</span>
      </div>

      {/* Copias */}
      <div className="mpag-copies-section">
        <div className="mpag-copies-top">
          <div className="mpag-copies-left">
            <span className="mpag-section-label">Cantidad de copias</span>
            <div className="mpag-counter">
              <button className="mpag-counter-btn" onClick={() => setCopies(c => Math.max(1, c - 1))} disabled={copies <= 1}>−</button>
              <span className="mpag-counter-num">{copies}</span>
              <button className="mpag-counter-btn" onClick={() => setCopies(c => c + 1)}>+</button>
            </div>
          </div>
          <div className="mpag-copies-right">
            <span className="mpag-unit-price">{fmt(unitPrice * discount)} <span className="mpag-cu">c/u</span></span>
            <span className="mpag-total-label">Total: {fmt(subtotal)}</span>
          </div>
        </div>
        <div className="mpag-discount-banner">A partir de 3 copias: 20% de descuento</div>
      </div>

      {/* Entrega */}
      <div className="mpag-entrega-section">
        <span className="mpag-section-label">Entrega</span>
        <div
          className={`mpag-delivery-card${deliveryType === 'andreani' ? ' mpag-delivery-card--selected' : ''}`}
          onClick={() => setDeliveryType('andreani')}
        >
          <div className="mpag-delivery-card__header">
            <div className="mpag-delivery-card__left">
              <div className={`mpag-radio${deliveryType === 'andreani' ? ' mpag-radio--selected' : ''}`} />
              <span className="mpag-delivery-name">Envío por Andreani</span>
            </div>
            <span className={`mpag-delivery-price${shippingPrice !== null ? ' mpag-delivery-price--known' : ''}`}>
              {shippingLabel}
            </span>
          </div>
          <p className="mpag-delivery-desc">Todo el país y Uruguay:<br />2-7 días hábiles</p>
          {deliveryType === 'andreani' && (
            <div className="mpag-address-fields" onClick={e => e.stopPropagation()}>
              <div className="mpag-field">
                <label className="mpag-field-label">País</label>
                <input className="mpag-field-input" placeholder="País" value={pais} onChange={e => setPais(e.target.value)} />
              </div>
              <div className="mpag-field-row">
                <div className="mpag-field">
                  <label className="mpag-field-label">Provincia</label>
                  <input className="mpag-field-input" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} />
                </div>
                <div className="mpag-field">
                  <label className="mpag-field-label">Ciudad</label>
                  <input className="mpag-field-input" placeholder="Ciudad" value={ciudad} onChange={e => setCiudad(e.target.value)} />
                </div>
              </div>
              <div className="mpag-field">
                <label className="mpag-field-label">Calle</label>
                <input className="mpag-field-input" placeholder="Calle" value={calle} onChange={e => setCalle(e.target.value)} />
              </div>
              <div className="mpag-field-row">
                <div className="mpag-field">
                  <label className="mpag-field-label">Número</label>
                  <input className="mpag-field-input" placeholder="Número" value={numero} onChange={e => setNumero(e.target.value)} />
                </div>
                <div className="mpag-field mpag-field--sm">
                  <label className="mpag-field-label">Piso</label>
                  <input className="mpag-field-input" placeholder="Piso" value={piso} onChange={e => setPiso(e.target.value)} />
                </div>
                <div className="mpag-field mpag-field--sm">
                  <label className="mpag-field-label">Depto</label>
                  <input className="mpag-field-input" placeholder="Depto" value={depto} onChange={e => setDepto(e.target.value)} />
                </div>
              </div>
              <div className="mpag-field">
                <label className="mpag-field-label">Código postal</label>
                <input className="mpag-field-input" placeholder="Código postal" value={cp} maxLength={6}
                  onChange={e => setCp(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          )}
        </div>
        <div
          className={`mpag-delivery-card${deliveryType === 'pickup' ? ' mpag-delivery-card--selected' : ''}`}
          onClick={() => setDeliveryType('pickup')}
        >
          <div className="mpag-delivery-card__header">
            <div className="mpag-delivery-card__left">
              <div className={`mpag-radio${deliveryType === 'pickup' ? ' mpag-radio--selected' : ''}`} />
              <span className="mpag-delivery-name">Retiro en fábrica</span>
            </div>
            <span className="mpag-delivery-price mpag-delivery-price--free">Gratis</span>
          </div>
          <p className="mpag-delivery-desc">Retiro por Concepción Arenal 4501, Chacarita, Bs As,<br />Lunes a Viernes 10-18 hs</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="mpag-resumen-section">
        <span className="mpag-section-label">Resumen final</span>
        <div className="mpd-row">
          <span className="mpd-row__key">{copies} {copies === 1 ? 'copia' : 'copias'}</span>
          <span className="mpd-row__val">{fmt(subtotal)}</span>
        </div>
        <div className="mpd-row">
          <span className="mpd-row__key">Ya pagaste</span>
          <span className="mpd-row__val">−{fmt(order.price_paid)}</span>
        </div>
        <div className="mpd-row">
          <span className="mpd-row__key">Envío</span>
          <span className="mpd-row__val">{deliveryType === 'pickup' ? 'Gratis' : shippingLabel}</span>
        </div>
        <div className="mpd-row mpd-row--balance">
          <span className="mpd-row__key">Pagás ahora</span>
          <span className="mpd-row__val">
            {shippingReady ? fmt(payNow) : `${fmt(Math.round(subtotal - order.price_paid))} + envío`}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="mpag-cta-wrap">
        <button
          className={`mpd-cta-btn${addressFilled && shippingReady ? ' mpd-cta-btn--active' : ''}`}
          onClick={handlePayDesktop}
          disabled={!addressFilled || !shippingReady || paying}
        >
          {paying ? 'Redirigiendo...' : 'Aceptar y finalizar'}
        </button>
        <p className="mpd-legal">
          Por tratarse de un producto personalizado, no realizamos cambios ni devoluciones una vez enviado a producción.
        </p>
      </div>
    </div>
  )

  // ── Reorder content (full price, status=entregado) ───────────────────────

  const reorderPayNow = Math.round(subtotal + shippingTotal)

  const reorderContent = (
    <div className="mpd-pagar-panel">
      <div className="mpd-row mpd-row--white">
        <span className="mpd-row__key">Nombre</span>
        <span className="mpd-row__val">{order.book_name}</span>
      </div>
      <div className="mpd-row mpd-row--white">
        <span className="mpd-row__key">Formato</span>
        <span className="mpd-row__val">{sizeInfo.name} · {sizeInfo.dims}</span>
      </div>
      <div className="mpag-copies-section">
        <div className="mpag-copies-top">
          <div className="mpag-copies-left">
            <span className="mpag-section-label">Cantidad de copias</span>
            <div className="mpag-counter">
              <button className="mpag-counter-btn" onClick={() => setCopies(c => Math.max(1, c - 1))} disabled={copies <= 1}>−</button>
              <span className="mpag-counter-num">{copies}</span>
              <button className="mpag-counter-btn" onClick={() => setCopies(c => c + 1)}>+</button>
            </div>
          </div>
          <div className="mpag-copies-right">
            <span className="mpag-unit-price">{fmt(unitPrice * discount)} <span className="mpag-cu">c/u</span></span>
            <span className="mpag-total-label">Total: {fmt(subtotal)}</span>
          </div>
        </div>
        <div className="mpag-discount-banner">A partir de 3 copias: 20% de descuento</div>
      </div>
      <div className="mpag-entrega-section">
        <span className="mpag-section-label">Entrega</span>
        <div
          className={`mpag-delivery-card${deliveryType === 'andreani' ? ' mpag-delivery-card--selected' : ''}`}
          onClick={() => setDeliveryType('andreani')}
        >
          <div className="mpag-delivery-card__header">
            <div className="mpag-delivery-card__left">
              <div className={`mpag-radio${deliveryType === 'andreani' ? ' mpag-radio--selected' : ''}`} />
              <span className="mpag-delivery-name">Envío por Andreani</span>
            </div>
            <span className={`mpag-delivery-price${shippingPrice !== null ? ' mpag-delivery-price--known' : ''}`}>
              {shippingLabel}
            </span>
          </div>
          <p className="mpag-delivery-desc">Todo el país y Uruguay:<br />2-7 días hábiles</p>
          {deliveryType === 'andreani' && (
            <div className="mpag-address-fields" onClick={e => e.stopPropagation()}>
              <div className="mpag-field">
                <label className="mpag-field-label">País</label>
                <input className="mpag-field-input" placeholder="País" value={pais} onChange={e => setPais(e.target.value)} />
              </div>
              <div className="mpag-field-row">
                <div className="mpag-field">
                  <label className="mpag-field-label">Provincia</label>
                  <input className="mpag-field-input" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} />
                </div>
                <div className="mpag-field">
                  <label className="mpag-field-label">Ciudad</label>
                  <input className="mpag-field-input" placeholder="Ciudad" value={ciudad} onChange={e => setCiudad(e.target.value)} />
                </div>
              </div>
              <div className="mpag-field">
                <label className="mpag-field-label">Calle</label>
                <input className="mpag-field-input" placeholder="Calle" value={calle} onChange={e => setCalle(e.target.value)} />
              </div>
              <div className="mpag-field-row">
                <div className="mpag-field">
                  <label className="mpag-field-label">Número</label>
                  <input className="mpag-field-input" placeholder="Número" value={numero} onChange={e => setNumero(e.target.value)} />
                </div>
                <div className="mpag-field mpag-field--sm">
                  <label className="mpag-field-label">Piso</label>
                  <input className="mpag-field-input" placeholder="Piso" value={piso} onChange={e => setPiso(e.target.value)} />
                </div>
                <div className="mpag-field mpag-field--sm">
                  <label className="mpag-field-label">Depto</label>
                  <input className="mpag-field-input" placeholder="Depto" value={depto} onChange={e => setDepto(e.target.value)} />
                </div>
              </div>
              <div className="mpag-field">
                <label className="mpag-field-label">Código postal</label>
                <input className="mpag-field-input" placeholder="Código postal" value={cp} maxLength={6}
                  onChange={e => setCp(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          )}
        </div>
        <div
          className={`mpag-delivery-card${deliveryType === 'pickup' ? ' mpag-delivery-card--selected' : ''}`}
          onClick={() => setDeliveryType('pickup')}
        >
          <div className="mpag-delivery-card__header">
            <div className="mpag-delivery-card__left">
              <div className={`mpag-radio${deliveryType === 'pickup' ? ' mpag-radio--selected' : ''}`} />
              <span className="mpag-delivery-name">Retiro en fábrica</span>
            </div>
            <span className="mpag-delivery-price mpag-delivery-price--free">Gratis</span>
          </div>
          <p className="mpag-delivery-desc">Retiro por Concepción Arenal 4501, Chacarita, Bs As,<br />Lunes a Viernes 10-18 hs</p>
        </div>
      </div>
      <div className="mpag-resumen-section">
        <span className="mpag-section-label">Resumen final</span>
        <div className="mpd-row">
          <span className="mpd-row__key">{copies} {copies === 1 ? 'copia' : 'copias'}</span>
          <span className="mpd-row__val">{fmt(subtotal)}</span>
        </div>
        <div className="mpd-row">
          <span className="mpd-row__key">Envío</span>
          <span className="mpd-row__val">{deliveryType === 'pickup' ? 'Gratis' : shippingLabel}</span>
        </div>
        <div className="mpd-row mpd-row--balance">
          <span className="mpd-row__key">Pagás ahora</span>
          <span className="mpd-row__val">
            {shippingReady ? fmt(reorderPayNow) : `${fmt(subtotal)} + envío`}
          </span>
        </div>
      </div>
      <div className="mpag-cta-wrap">
        <button
          className={`mpd-cta-btn${addressFilled && shippingReady ? ' mpd-cta-btn--active' : ''}`}
          onClick={handleReorderDesktop}
          disabled={!addressFilled || !shippingReady || paying}
        >
          {paying ? 'Redirigiendo...' : 'Aceptar y finalizar'}
        </button>
        <p className="mpd-legal">
          Por tratarse de un producto personalizado, no realizamos cambios ni devoluciones una vez enviado a producción.
        </p>
      </div>
    </div>
  )

  // ── Inline confirmado content ─────────────────────────────────────────────

  const confirmadoContent = (
    <div className="mpd-confirmado-panel">
      <div className="mpconf2-check-circle">
        <svg width="22" height="17" viewBox="0 0 22 17" fill="none">
          <path d="M2 8.5L8.5 15L20 2" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p className="mpconf2-title">¡Pedido confirmado!</p>
      <p className="mpconf2-subtitle">
        Tu libro está siendo enviado a producción.<br />
        En 2-3 días hábiles empieza a imprimirse.
      </p>
      <div className="mpconf2-wpp-box">
        Te mandamos el comprobante por WhatsApp al +54 9 11 6264 3005.<br /><br />
        También te avisamos cuando el libro salga a distribución.
      </div>
    </div>
  )

  // ── Approve + buy ─────────────────────────────────────────────────────────

  const approveAndBuyShared = (
    <>
      <button
        className={`mpd-accept-check${!canApprove ? ' mpd-accept-check--unavailable' : ''}`}
        onClick={() => canApprove && setApproved(v => !v)}
        disabled={!canApprove}
      >
        <div className={`mpd-check-circle${approved ? ' mpd-check-circle--checked' : ''}`} />
        <span>Revisé el diseño y lo acepto</span>
      </button>
      <div className="mpd-cta-wrap">
        <button
          className={`mpd-cta-btn${approved && canApprove ? ' mpd-cta-btn--active' : ''}`}
          disabled={!approved || !canApprove}
          onClick={() => router.push(`/mis-proyectos/${order.id}/pagar`)}
        >
          Aceptar y comprar
        </button>
        <p className="mpd-legal">
          Por tratarse de un producto personalizado, no realizamos cambios ni devoluciones una vez enviado a producción.
        </p>
      </div>
    </>
  )

  const approveAndBuyDesktop = !afterProduction && order.status !== 'entregado' ? (
    <>
      <button
        className={`mpd-accept-check${!canApprove ? ' mpd-accept-check--unavailable' : ''}`}
        onClick={() => canApprove && setApproved(v => !v)}
        disabled={!canApprove}
      >
        <div className={`mpd-check-circle${approved ? ' mpd-check-circle--checked' : ''}`} />
        <span>Revisé el diseño y lo acepto</span>
      </button>
      <div className="mpd-cta-wrap">
        <button
          className={`mpd-cta-btn${approved && canApprove ? ' mpd-cta-btn--active' : ''}`}
          disabled={!approved || !canApprove}
          onClick={() => { if (approved && canApprove) setOpenSection('pagar') }}
        >
          Aceptar y comprar
        </button>
        <p className="mpd-legal">
          Por tratarse de un producto personalizado, no realizamos cambios ni devoluciones una vez enviado a producción.
        </p>
      </div>
    </>
  ) : null

  const approveAndBuyMobile = !afterProduction && order.status !== 'entregado' ? approveAndBuyShared : null

  // ── Entregado sections ────────────────────────────────────────────────────

  const entregadoSections = (
    <>
      {order.status === 'entregado' && !deliveryConfirmed && (
        <div className="mpd-bottom mpd-bottom--confirm">
          <p className="mpd-confirm-note">
            Por favor, confirmá la entrega del pedido para finalizar el proyecto.
          </p>
          <a href="/#productos" className="mpd-action-btn mpd-action-btn--outline">Contar otra historia</a>
          <button
            className="mpd-action-btn mpd-action-btn--solid"
            onClick={confirmDelivery}
            disabled={confirmingDelivery}
          >
            {confirmingDelivery ? 'Confirmando...' : 'Confirmar entrega y finalizar proyecto'}
          </button>
        </div>
      )}
      {order.status === 'entregado' && deliveryConfirmed && (
        <div className="mpd-bottom mpd-bottom--finished">
          <h3 className="mpd-finished-heading">¡Gracias por confiar en Zeika!</h3>
          <p className="mpd-finished-sub">Esperamos que ames tu libro tanto como nosotras disfrutamos hacerlo.</p>
          {!hasReview ? (
            <div className="mpd-review-block">
              <p className="mpd-review-prompt">¿Cómo quedó tu libro?</p>
              <div className="mpd-stars-row">
                {[1,2,3,4,5].map(n => (
                  <button key={n} className={`mpd-star${reviewStars >= n ? ' mpd-star--on' : ''}`} onClick={() => setReviewStars(n)}>★</button>
                ))}
              </div>
              <textarea className="mpd-review-textarea" placeholder="Contanos cómo quedó..." value={reviewText} onChange={e => setReviewText(e.target.value)} />
              <button className="mpd-action-btn mpd-action-btn--solid" onClick={submitReview} disabled={!reviewStars || submittingReview}>
                {submittingReview ? 'Enviando...' : 'Enviar reseña'}
              </button>
            </div>
          ) : (
            <p className="mpd-review-thanks">¡Gracias por tu reseña!</p>
          )}
          <div className="mpd-finished-actions">
            <a href={`/mis-proyectos/${order.id}/pagar?reorder=true`} className="mpd-action-btn mpd-action-btn--outline mpd-reorder-mobile">
              Volver a pedir el mismo diseño
            </a>
            <a href="/#productos" className="mpd-action-btn mpd-action-btn--solid">Contar otra historia</a>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="mpd-root">
      <Navbar hideLinks />

      <div className="mp-user-strip">
        <div className="mp-user-strip__initial">{firstName[0]?.toUpperCase() ?? '?'}</div>
        <div className="mp-user-strip__info">
          <p className="mp-user-strip__name">{userName}</p>
          <p className="mp-user-strip__email">{userEmail}</p>
        </div>
      </div>

      <div className="mpd-body">

        <div className="mpd-hero">
          <a href="/mis-proyectos" className="mpd-back">‹ Mis proyectos</a>
          <h1 className="mpd-title">{order.book_name}</h1>
          <p className="mpd-order-num">{orderNumber(order.id, order.created_at)}</p>
          <div className={`mpd-status-badge mpd-status-badge--${order.status}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </div>
        </div>

        {/* ── MOBILE ───────────────────────────────────────────────────────── */}
        <div className="mpd-mobile-only">
          <div className="mpd-accordions">
            <div className="mpd-accordions__left">
              <Accordion title="Detalles del pedido" open={openSection === 'detalles'} onToggle={() => toggle('detalles')}>
                {detallesContent}
              </Accordion>
              <Accordion title="Estado" open={openSection === 'estado'} onToggle={() => toggle('estado')}>
                {estadoContent}
              </Accordion>
            </div>
            <div className="mpd-accordions__right">
              <Accordion title="Tu material" open={openSection === 'material'} onToggle={() => toggle('material')}>
                {materialContent}
              </Accordion>
              <Accordion
                title="Preview"
                open={openSection === 'preview'}
                onToggle={() => toggle('preview')}
                extraClass={!canPreview ? 'mpd-accordion--disabled' : ''}
              >
                {previewContent}
              </Accordion>
            </div>
          </div>
          {approveAndBuyMobile && (
            <div className="mpd-bottom">{approveAndBuyMobile}</div>
          )}
          {entregadoSections}
        </div>

        {/* ── DESKTOP ──────────────────────────────────────────────────────── */}
        <div className="mpd-desktop-only">
          <div className="mpd-desktop-layout">

            <div className="mpd-desktop-left">
              <DesktopTabBtn title="Detalles del pedido" isActive={openSection === 'detalles'} onClick={() => toggle('detalles')} />
              <DesktopTabBtn title="Estado"              isActive={openSection === 'estado'}   onClick={() => toggle('estado')} />
              <DesktopTabBtn title="Tu material"         isActive={openSection === 'material'} onClick={() => toggle('material')} />
              <DesktopTabBtn title="Preview"             isActive={openSection === 'preview'}  disabled={!canPreview} onClick={() => toggle('preview')} />
              {approveAndBuyDesktop}
              {order.status === 'entregado' && deliveryConfirmed && (
                <DesktopTabBtn
                  title="Volver a pedir el mismo diseño"
                  isActive={openSection === 'reorder'}
                  onClick={() => toggle('reorder')}
                />
              )}
            </div>

            <div className="mpd-desktop-divider" />

            <div className="mpd-desktop-right">
              {openSection && (
                <div className="mpd-desktop-panel">
                  {openSection !== 'pagar' && openSection !== 'confirmado' && openSection !== 'reorder' && (
                    <div className="mpd-desktop-panel__header">
                      <span className="mpd-desktop-panel__title">
                        {SECTION_TITLES[openSection] ?? openSection}
                      </span>
                    </div>
                  )}
                  {openSection === 'detalles'   && detallesContent}
                  {openSection === 'estado'     && estadoContent}
                  {openSection === 'material'   && materialContent}
                  {openSection === 'preview'    && previewContent}
                  {openSection === 'pagar'      && pagarContent}
                  {openSection === 'confirmado' && confirmadoContent}
                  {openSection === 'reorder'    && reorderContent}
                </div>
              )}
            </div>

          </div>
          {entregadoSections}
        </div>

      </div>

      {showMaterialToast && (
        <div className="mpd-toast">
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path d="M1.5 7L6.5 12L16.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>¡Recibimos tu material! En menos de 48hs el diseño va a estar listo.</span>
        </div>
      )}

      {order && (
        <a
          className="mpd-wa-fab"
          href={`https://wa.me/5491133521921?text=${encodeURIComponent(`Hola! Te escribo por mi fotolibro *${order.book_name}* (pedido #${orderId.slice(0, 8).toUpperCase()})`)}`}
          target="_blank" rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
        >
          <img src="/icons/social/whatsapp.svg" alt="WhatsApp" />
        </a>
      )}
    </div>
  )
}
