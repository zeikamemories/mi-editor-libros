'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
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

const STATUS_BADGE: Record<string, string> = {
  pendiente_pago:    'Pago pendiente',
  confirmado:        'Confirmado',
  material_recibido: 'Material recibido',
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
  entregado:         6,
}

const TIMELINE_STEPS = [
  { key: 'confirmado',        label: 'Pedido confirmado'  },
  { key: 'material_recibido', label: 'Material recibido'  },
  { key: 'en_diseno',         label: 'En diseño'          },
  { key: 'preview_listo',     label: 'Preview disponible' },
  { key: 'en_produccion',     label: 'En producción'      },
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

function Accordion({ title, children, open, onToggle }: {
  title: string; children: React.ReactNode; open: boolean; onToggle: () => void
}) {
  return (
    <div className="mp-accordion">
      <button className="mp-accordion-trigger" onClick={onToggle}>
        {title}
        <span className={`mp-accordion-arrow ${open ? 'mp-accordion-arrow--open' : ''}`}>↓</span>
      </button>
      {open && <div className="mp-accordion-body">{children}</div>}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProyectoPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder]     = useState<Order | null>(null)
  const [notes, setNotes]     = useState<Note[]>([])
  const [userId, setUserId]   = useState('')
  const [loading, setLoading] = useState(true)

  const [openSection, setOpenSection] = useState<string>('detalles')

  // Material form state
  const [driveLink,  setDriveLink]  = useState('')
  const [docsLink,   setDocsLink]   = useState('')
  const [noteText,   setNoteText]   = useState('')
  const [savingLink, setSavingLink] = useState<'drive'|'docs'|null>(null)
  const [sendingNote, setSendingNote] = useState(false)

  // Reference images
  const refInputRef = useRef<HTMLInputElement>(null)
  const [uploadingRef, setUploadingRef] = useState(false)

  // Change request
  const [showChangeInput, setShowChangeInput] = useState(false)
  const [changeText,      setChangeText]      = useState('')
  const [sendingChange,   setSendingChange]   = useState(false)

  // Approval
  const [approved, setApproved] = useState(false)

  // Tracking copy feedback
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace('/orden'); return }
      setUserId(session.user.id)

      Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).eq('user_id', session.user.id).single(),
        supabase.from('order_notes').select('id, content, type, created_at').eq('order_id', orderId).order('created_at'),
      ]).then(([{ data: o }, { data: n }]) => {
        if (!o) { router.replace('/mis-proyectos'); return }
        setOrder(o as Order)
        setDriveLink(o.drive_link ?? '')
        setDocsLink(o.docs_link ?? '')
        setNotes((n ?? []) as Note[])
        setLoading(false)
      })
    })
  }, [orderId, router])

  async function saveLink(field: 'drive_link' | 'docs_link', value: string) {
    if (!order) return
    setSavingLink(field === 'drive_link' ? 'drive' : 'docs')

    // When client saves Drive link, auto-advance to material_recibido
    const statusUpdate = field === 'drive_link' && value &&
      ['confirmado', 'pendiente_pago'].includes(order.status)
      ? { [field]: value, status: 'material_recibido', status_dates: { ...(order.status_dates ?? {}), material_recibido: new Date().toISOString() } }
      : { [field]: value }

    await supabase.from('orders').update(statusUpdate).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, ...statusUpdate } : prev)
    setSavingLink(null)
  }

  async function sendNote() {
    if (!noteText.trim() || !order) return
    setSendingNote(true)
    const { data } = await supabase.from('order_notes').insert({
      order_id: order.id, user_id: userId, content: noteText.trim(), type: 'note',
    }).select().single()
    if (data) setNotes(prev => [...prev, data as Note])
    setNoteText('')
    setSendingNote(false)
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

  async function sendChangeRequest() {
    if (!changeText.trim() || !order) return
    setSendingChange(true)
    const { data } = await supabase.from('order_notes').insert({
      order_id: order.id, user_id: userId, content: changeText.trim(), type: 'change_request',
    }).select().single()
    const newUsed = (order.change_requests_used ?? 0) + 1
    await supabase.from('orders').update({ change_requests_used: newUsed }).eq('id', order.id)
    if (data) setNotes(prev => [...prev, data as Note])
    setOrder(prev => prev ? { ...prev, change_requests_used: newUsed } : prev)
    setChangeText('')
    setShowChangeInput(false)
    setSendingChange(false)
  }

  function copyTracking() {
    if (!order?.tracking_number) return
    navigator.clipboard.writeText(order.tracking_number).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggle(section: string) {
    setOpenSection(prev => prev === section ? '' : section)
  }

  if (loading || !order) return (
    <div className="mp-loading"><div className="mp-spinner" /></div>
  )

  const sizeInfo  = SIZE_INFO[order.size] ?? { name: order.size, dims: '' }
  const done      = STEP_DONE[order.status] ?? 0
  const allDone   = order.status === 'entregado'
  const statusDates = order.status_dates ?? {}
  const totalPages = (order.pages_base ?? 14) + (order.extra_pages ?? 0)
  const remaining = MAX_CHANGES - (order.change_requests_used ?? 0)
  const canPreview = ['preview_listo','en_produccion','en_camino','entregado'].includes(order.status)
  const canApprove = order.status === 'preview_listo'
  const afterProduction = ['en_produccion','en_camino','entregado'].includes(order.status)

  return (
    <div className="mp-detail-root">
      <header className="mp-detail-header">
        <Link href="/mis-proyectos" className="mp-detail-back">←</Link>
        <span className="mp-detail-header-title">Mis Proyectos</span>
        <div className="mp-avatar">{userId[0]?.toUpperCase() ?? 'U'}</div>
      </header>

      <div className="mp-detail-main">
        <h1 className="mp-detail-title">{order.book_name}</h1>
        <div className="mp-detail-meta">
          <span className={`mp-badge mp-badge--${order.status}`}>
            {STATUS_BADGE[order.status] ?? order.status}
          </span>
          <span className="mp-detail-order-num">{orderNumber(order.id, order.created_at)}</span>
        </div>

        {/* ── Detalles del pedido ─────────────────────────────────────── */}
        <Accordion title="Detalles del pedido" open={openSection === 'detalles'} onToggle={() => toggle('detalles')}>
          <div className="mp-details-grid">
            <div className="mp-detail-item">
              <label>Formato</label>
              <span>{sizeInfo.name}</span>
            </div>
            <div className="mp-detail-item">
              <label>Medidas</label>
              <span>{sizeInfo.dims}</span>
            </div>
            <div className="mp-detail-item">
              <label>Páginas</label>
              <span>{totalPages} base</span>
            </div>
            <div className="mp-detail-item">
              <label>Fecha pedido</label>
              <span>{fmtDate(order.created_at)}</span>
            </div>
            {order.estimated_design_date && (
              <div className="mp-detail-item">
                <label>Diseño estimado</label>
                <span>{fmtDate(order.estimated_design_date)}</span>
              </div>
            )}
            <div className="mp-detail-item">
              <label>Pagado</label>
              <span>{fmt(order.price_paid)}</span>
            </div>
          </div>
          {!afterProduction && (
            <div className="mp-saldo-row">
              <span>Saldo pendiente</span>
              <span className="mp-saldo-amount">{fmt(order.price_total - order.price_paid)}</span>
            </div>
          )}
        </Accordion>

        {/* ── Estado ─────────────────────────────────────────────────── */}
        <Accordion title="Estado" open={openSection === 'estado'} onToggle={() => toggle('estado')}>
          <div className="mp-timeline">
            {TIMELINE_STEPS.map((step, i) => {
              const stepDone  = i < done
              const stepCurrent = !allDone && i === done
              const stepGrey  = !stepDone && !stepCurrent
              const date = statusDates[step.key]
                ?? (step.key === 'confirmado' ? order.created_at : null)
              const isTracking = step.key === 'en_produccion' && order.status === 'en_camino'
              return (
                <div key={step.key} className="mp-timeline-step">
                  <div className={`mp-step-icon ${stepDone ? 'mp-step-icon--done' : stepCurrent ? 'mp-step-icon--current' : 'mp-step-icon--grey'}`}>
                    {stepDone ? '✓' : null}
                  </div>
                  <div className="mp-step-info">
                    <div className={`mp-step-label ${stepGrey ? 'mp-step-label--grey' : ''}`}>
                      {step.label}
                      {step.key === 'en_camino' && order.tracking_number
                        ? ` · AND-${order.tracking_number}` : ''}
                    </div>
                    {date && <div className="mp-step-date">{fmtDate(date)}</div>}
                    {step.key === 'en_camino' && order.tracking_number && (
                      <div className="mp-tracking-box">
                        <span className="mp-tracking-label">Número de seguimiento</span>
                        <div className="mp-tracking-number-row">
                          <span className="mp-tracking-number">{order.tracking_number}</span>
                          <button className="mp-tracking-copy" onClick={copyTracking}>
                            {copied ? '✓' : 'Copiar'}
                          </button>
                        </div>
                        <a
                          className="mp-tracking-andreani"
                          href={`https://www.andreani.com/#!/informacionEnvio/${order.tracking_number}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Rastrear en Andreani ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Accordion>

        {/* ── Tu material ────────────────────────────────────────────── */}
        <Accordion title="Tu material" open={openSection === 'material'} onToggle={() => toggle('material')}>
          <div className="mp-material-field">
            <span className="mp-material-label">Fotos — Google Drive</span>
            <div className="mp-material-row">
              <input
                className="mp-material-input"
                placeholder="Pegá el link de tu carpeta"
                value={driveLink}
                onChange={e => setDriveLink(e.target.value)}
              />
              <button
                className="mp-material-save-btn"
                onClick={() => saveLink('drive_link', driveLink)}
                disabled={savingLink === 'drive'}
              >
                {savingLink === 'drive' ? '...' : 'Guardar'}
              </button>
            </div>
          </div>

          <div className="mp-material-field">
            <span className="mp-material-label">Textos — Google Docs (opcional)</span>
            <div className="mp-material-row">
              <input
                className="mp-material-input"
                placeholder="Pegá el link del documento"
                value={docsLink}
                onChange={e => setDocsLink(e.target.value)}
              />
              <button
                className="mp-material-save-btn"
                onClick={() => saveLink('docs_link', docsLink)}
                disabled={savingLink === 'docs'}
              >
                {savingLink === 'docs' ? '...' : 'Guardar'}
              </button>
            </div>
          </div>

          <div className="mp-material-field">
            <span className="mp-material-label">Referencias de diseño (tapa, contratapa, estilo)</span>
            <div className="mp-ref-images">
              {(order.reference_images ?? []).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="mp-ref-img" />
              ))}
              {(order.reference_images ?? []).length < 6 && (
                <button className="mp-ref-upload-btn" onClick={() => refInputRef.current?.click()} disabled={uploadingRef}>
                  {uploadingRef ? '...' : (<>↑<span>Subir</span></>)}
                </button>
              )}
            </div>
            <input
              ref={refInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) uploadRefImage(e.target.files[0]); e.target.value = '' }}
            />
            <p style={{ fontFamily: '"forma-djr-display",sans-serif', fontSize: 11, color: '#aaa', margin: 0 }}>
              Podés subir fotos de referencia, moodboards, ejemplos de otros libros.
            </p>
          </div>

          <div className="mp-material-field">
            <span className="mp-material-label">Notas para el equipo</span>
            <textarea
              className="mp-material-note"
              placeholder="Contanos cualquier detalle que quieras que tengamos en cuenta..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <button className="mp-send-btn" onClick={sendNote} disabled={!noteText.trim() || sendingNote}>
              {sendingNote ? 'Enviando...' : 'Enviar nota'}
            </button>
          </div>
        </Accordion>

        {/* ── Preview del libro ───────────────────────────────────────── */}
        <Accordion title="Preview del libro" open={openSection === 'preview'} onToggle={() => toggle('preview')}>
          {!canPreview ? (
            <div className="mp-preview-locked">
              <p>Disponible cuando el diseño esté listo.</p>
              <p>Tenés {MAX_CHANGES} rondas de cambios.</p>
            </div>
          ) : (
            <>
              <div className="mp-preview-frame">
                {order.preview_url ? (
                  <a className="mp-preview-link" href={order.preview_url} target="_blank" rel="noreferrer">
                    Ver libro completo ↗
                  </a>
                ) : (
                  <span style={{ fontFamily: '"forma-djr-display",sans-serif', fontSize: 13, color: '#aaa' }}>
                    Preview no disponible aún
                  </span>
                )}
              </div>

              {canApprove && (
                <>
                  <div className="mp-rounds">
                    <div className="mp-rounds-header">
                      <span className="mp-rounds-label">Rondas de cambios</span>
                      <div className="mp-rounds-dots">
                        {Array.from({ length: MAX_CHANGES }, (_, i) => (
                          <span key={i} className={`mp-round-dot ${i < (order.change_requests_used ?? 0) ? 'mp-round-dot--used' : 'mp-round-dot--free'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="mp-rounds-text">
                      Nuestro precio incluye {MAX_CHANGES} rondas de cambios.
                      A partir de la tercera hay un precio extra de $5.000 por ronda.
                    </p>
                  </div>

                  {!showChangeInput ? (
                    <button className="mp-change-btn" onClick={() => setShowChangeInput(true)}>
                      Pedir un cambio
                    </button>
                  ) : (
                    <>
                      <textarea
                        className="mp-change-input"
                        placeholder="Describí los cambios que necesitás..."
                        value={changeText}
                        onChange={e => setChangeText(e.target.value)}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="mp-change-btn" style={{ flex: 1 }} onClick={() => setShowChangeInput(false)}>
                          Cancelar
                        </button>
                        <button className="mp-send-btn" style={{ flex: 1 }} onClick={sendChangeRequest} disabled={!changeText.trim() || sendingChange}>
                          {sendingChange ? 'Enviando...' : 'Enviar cambio'}
                        </button>
                      </div>
                    </>
                  )}

                  <div className="mp-approve-row">
                    <input
                      type="checkbox"
                      id="approve"
                      checked={approved}
                      onChange={e => setApproved(e.target.checked)}
                    />
                    <label htmlFor="approve">Revisé el diseño y estoy de acuerdo con él</label>
                  </div>

                  <button
                    className="mp-cta-btn"
                    disabled={!approved}
                    onClick={() => router.push(`/mis-proyectos/${order.id}/pagar`)}
                  >
                    Aceptar y comprar
                  </button>

                  <p className="mp-legal">
                    Por tratarse de un producto personalizado, no realizamos cambios ni devoluciones una vez enviado a producción.
                  </p>
                </>
              )}

              {afterProduction && (
                <p style={{ fontFamily: '"forma-djr-display",sans-serif', fontSize: 13, color: '#666', margin: 0 }}>
                  Diseño aprobado. Tu libro está en producción.
                </p>
              )}
            </>
          )}
        </Accordion>

        {/* ── Thank you (entregado) ───────────────────────────────────── */}
        {order.status === 'entregado' && (
          <div className="mp-thankyou">
            <h3>¡Gracias por confiar en Zeika!</h3>
            <p>Esperamos que ames tu libro tanto como nosotras disfrutamos hacerlo.</p>
            <Link href="/orden" className="mp-cta-btn" style={{ marginTop: 8 }}>
              Contar otra historia
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
