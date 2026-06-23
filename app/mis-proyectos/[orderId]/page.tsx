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

const MAX_CHANGES = 3

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function orderNumber(id: string, date: string) {
  return `ZK-${new Date(date).getFullYear()}-${id.substring(0, 6).toUpperCase()}`
}

// ── Accordion ────────────────────────────────────────────────────────────────

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

// ── Step circle icon ──────────────────────────────────────────────────────────

function StepCircle({ state }: { state: 'done' | 'current' | 'pending' }) {
  if (state === 'done') {
    return (
      <div className="mpd-step-circle mpd-step-circle--done">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M1.5 6L6 10.5L14.5 1.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    )
  }
  if (state === 'current') {
    return <div className="mpd-step-circle mpd-step-circle--current" />
  }
  return <div className="mpd-step-circle mpd-step-circle--pending" />
}

// ── Round circle icon ─────────────────────────────────────────────────────────

function RoundCircle({ state }: { state: 'done' | 'current' | 'free' }) {
  if (state === 'done') {
    return (
      <div className="mpd-round-circle mpd-round-circle--done">
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    )
  }
  if (state === 'current') {
    return <div className="mpd-round-circle mpd-round-circle--current" />
  }
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

  const [openSection, setOpenSection] = useState<string>(searchParams.get('open') ?? '')

  const [driveLink,         setDriveLink]         = useState('')
  const [docsLink,          setDocsLink]          = useState('')
  const [noteText,          setNoteText]          = useState('')
  const [confirmingMaterial, setConfirmingMaterial] = useState(false)

  const refInputRef = useRef<HTMLInputElement>(null)
  const [uploadingRef, setUploadingRef] = useState(false)

  const [sendingChange, setSendingChange] = useState(false)

  const [approved, setApproved] = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [coverThumbnail, setCoverThumbnail] = useState<{ left?: string; right?: string } | null>(null)

  const [reviewStars,        setReviewStars]        = useState(0)
  const [reviewText,         setReviewText]          = useState('')
  const [submittingReview,   setSubmittingReview]    = useState(false)
  const [confirmingDelivery, setConfirmingDelivery]  = useState(false)

  useEffect(() => {
    async function init() {
      let { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        // Session may not be restored yet after MP redirect — wait and retry
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
      setOrder(o as Order)
      setDriveLink(o.drive_link ?? '')
      setDocsLink(o.docs_link ?? '')
      setNotes((n ?? []) as Note[])
      if (p?.cover_thumbnail) setCoverThumbnail(p.cover_thumbnail)
      setLoading(false)
    }
    init()
  }, [orderId, router])

  async function saveLinkSilently(field: 'drive_link' | 'docs_link', value: string) {
    if (!order || value === (order[field] ?? '')) return
    await supabase.from('orders').update({ [field]: value }).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, [field]: value } : prev)
  }

  async function confirmMaterial() {
    if (!order) return
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
      order_id: order.id, user_id: userId,
      content,
      type: 'review',
    })
    setNotes(prev => [...prev, {
      id: Date.now().toString(),
      content,
      type: 'review',
      created_at: new Date().toISOString(),
    }])
    setSubmittingReview(false)
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

  return (
    <div className="mpd-root">
      <Navbar hideLinks />

      {/* User strip */}
      <div className="mp-user-strip">
        <div className="mp-user-strip__initial">{firstName[0]?.toUpperCase() ?? '?'}</div>
        <div className="mp-user-strip__info">
          <p className="mp-user-strip__name">{userName}</p>
          <p className="mp-user-strip__email">{userEmail}</p>
        </div>
      </div>

      <div className="mpd-body">

        {/* Hero */}
        <div className="mpd-hero">
          <a href="/mis-proyectos" className="mpd-back">‹ Mis proyectos</a>
          <h1 className="mpd-title">{order.book_name}</h1>
          <p className="mpd-order-num">{orderNumber(order.id, order.created_at)}</p>
          <div className={`mpd-status-badge mpd-status-badge--${order.status}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </div>
        </div>

        {/* Accordions */}
        <div className="mpd-accordions">
          <div className="mpd-accordions__left">

          {/* ── Detalles del pedido ─────────────────────────────────────── */}
          <Accordion title="Detalles del pedido" open={openSection === 'detalles'} onToggle={() => toggle('detalles')}>
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
          </Accordion>

          {/* ── Estado ──────────────────────────────────────────────────── */}
          <Accordion title="Estado" open={openSection === 'estado'} onToggle={() => toggle('estado')}>
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
          </Accordion>
          </div>{/* end left */}
          <div className="mpd-accordions__right">

          {/* ── Tu material ─────────────────────────────────────────────── */}
          <Accordion title="Tu material" open={openSection === 'material'} onToggle={() => toggle('material')}>
            {/* Fotos / Google Drive */}
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

            {/* Textos / Google Docs */}
            <div className="mpd-mat-row">
              <div className="mpd-mat-header">
                <span className="mpd-mat-header__label">Textos / Google Docs</span>
                <span className="mpd-mat-header__opt">(Opcional)</span>
              </div>
              <input
                className="mpd-mat-input"
                placeholder="Pegá el link de tu carpeta"
                value={docsLink}
                onChange={e => setDocsLink(e.target.value)}
                onBlur={e => saveLinkSilently('docs_link', e.target.value)}
              />
            </div>

            {/* Referencias de diseño */}
            <div className="mpd-mat-row">
              <div className="mpd-mat-header">
                <span className="mpd-mat-header__label">Referencias de diseño</span>
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
                  Podes subir fotos de referencia, moodboards, ejemplos de otros libros... lo que sirva para que entendamos el estilo que querés.
                </p>
              </div>
              <input
                ref={refInputRef} type="file" accept="image/*"
                className="mpd-hidden-input"
                onChange={e => { if (e.target.files?.[0]) uploadRefImage(e.target.files[0]); e.target.value = '' }}
              />
            </div>

            {/* Notas para el equipo */}
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

            {/* Confirmar material */}
            {(() => {
              const confirmed = !['pendiente_pago', 'confirmado'].includes(order.status)
              return (
                <div className="mpd-mat-save-wrap">
                  <button
                    className={`mpd-accept-check mpd-accept-check--material${confirmed ? ' mpd-accept-check--unavailable' : ''}`}
                    onClick={!confirmed && !confirmingMaterial ? confirmMaterial : undefined}
                    disabled={confirmed || confirmingMaterial}
                  >
                    <div className={`mpd-check-circle${confirmed ? ' mpd-check-circle--checked' : ''}`} />
                    <span>{confirmingMaterial ? 'Confirmando...' : 'Material cargado'}</span>
                  </button>
                </div>
              )
            })()}
          </Accordion>

          {/* ── Preview ─────────────────────────────────────────────────── */}
          <Accordion
            title="Preview"
            open={openSection === 'preview'}
            onToggle={() => toggle('preview')}
            extraClass={!canPreview ? 'mpd-accordion--disabled' : ''}
          >
            {!canPreview ? (
              <div className="mpd-preview-unready">
                <p>Estará disponible cuando el diseño esté listo.</p>
                <p>Tendrás 3 rondas de cambio.</p>
              </div>
            ) : (
              <>
                <div className="mpd-preview-row">
                  <div className="mpd-preview-frame-box">
                    {coverThumbnail && (
                      <div className="mpd-preview-spread">
                        {coverThumbnail.left && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverThumbnail.left} alt="Portada izquierda" className="mpd-preview-spread__page" />
                        )}
                        {coverThumbnail.right && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverThumbnail.right} alt="Portada derecha" className="mpd-preview-spread__page" />
                        )}
                      </div>
                    )}
                  </div>
                  {order.preview_url ? (
                    <a
                      className="mpd-preview-link"
                      href={`${order.preview_url}?orderId=${order.id}`}
                    >
                      Ver el libro completo ›
                    </a>
                  ) : (
                    <span className="mpd-preview-pending">Preview no disponible aún</span>
                  )}
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
                        {sendingChange ? 'Guardando...' : 'Guardar cambios'}
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
            )}
          </Accordion>
          </div>{/* end right */}
        </div>

        {/* Bottom: approve + CTA — always visible, disabled when preview not ready */}
        {!afterProduction && order.status !== 'entregado' && (
          <div className="mpd-bottom">
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
          </div>
        )}

        {order.status === 'entregado' && !deliveryConfirmed && (
          <div className="mpd-bottom mpd-bottom--confirm">
            <p className="mpd-confirm-note">
              Por favor, confirmá la entrega del pedido para finalizar el proyecto.
            </p>
            <a href="/orden" className="mpd-action-btn mpd-action-btn--outline">
              Contar otra historia
            </a>
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
                    <button
                      key={n}
                      className={`mpd-star${reviewStars >= n ? ' mpd-star--on' : ''}`}
                      onClick={() => setReviewStars(n)}
                    >★</button>
                  ))}
                </div>
                <textarea
                  className="mpd-review-textarea"
                  placeholder="Contanos cómo quedó..."
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                />
                <button
                  className="mpd-action-btn mpd-action-btn--solid"
                  onClick={submitReview}
                  disabled={!reviewStars || submittingReview}
                >
                  {submittingReview ? 'Enviando...' : 'Enviar reseña'}
                </button>
              </div>
            ) : (
              <p className="mpd-review-thanks">¡Gracias por tu reseña!</p>
            )}

            <div className="mpd-finished-actions">
              <a href={`/orden?size=${order.size}&reorderFrom=${order.id}`} className="mpd-action-btn mpd-action-btn--outline">
                Volver a pedir el mismo diseño
              </a>
              <a href="/orden" className="mpd-action-btn mpd-action-btn--solid">
                Contar otra historia
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
