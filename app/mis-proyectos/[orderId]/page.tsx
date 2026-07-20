'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { authHeaders } from '../../lib/authFetch'
import Navbar from '../../components/Landing/Navbar/Navbar'
import CardPhotoFrame, { type CardTransform } from '../../components/CardPhotoFrame/CardPhotoFrame'
import VinoMockupFrame from '../../components/VinoMockupFrame/VinoMockupFrame'
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
  product_type: string | null
  card_type: string | null
  card_photo_url: string | null
  card_photo_transform: CardTransform | null
  variedad: string | null
  diseno_tipo: string | null
  copies: number | null
  label_photo_url: string | null
  label_text: string | null
  vino_design_url: string | null
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
  preview_listo:     'Revisar preview',
  aprobado:          'Listo para comprar',
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
  aprobado:          4,
  en_produccion:     5,
  en_camino:         6,
  entregado:         7,
}

const TIMELINE_STEPS = [
  { key: 'confirmado',        label: 'Pedido confirmado'  },
  { key: 'material_recibido', label: 'Material recibido'  },
  { key: 'en_diseno',         label: 'En diseño'          },
  { key: 'preview_listo',     label: 'Preview disponible' },
  { key: 'aprobado',          label: 'Diseño aprobado'    },
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

  const [openSection, setOpenSection] = useState<string>(searchParams.get('open') ?? '')

  // Material form
  const [driveLink,          setDriveLink]          = useState('')
  const [docsLink,           setDocsLink]           = useState('')
  const [noteText,           setNoteText]           = useState('')
  const [confirmingMaterial, setConfirmingMaterial] = useState(false)
  const [materialDone,       setMaterialDone]       = useState(false)
  const [showMaterialToast,  setShowMaterialToast]  = useState(false)
  const refInputRef = useRef<HTMLInputElement>(null)
  const [uploadingRef, setUploadingRef] = useState(false)

  // Cartas material (foto del cliente)
  const cardPhotoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCardPhoto, setUploadingCardPhoto] = useState(false)

  // Vino material form (foto_y_texto)
  const [labelText,         setLabelText]         = useState('')
  const labelPhotoInputRef  = useRef<HTMLInputElement>(null)
  const [uploadingLabelPhoto, setUploadingLabelPhoto] = useState(false)

  const [generatingLinks, setGeneratingLinks] = useState(false)

  // Preview
  const [sendingChange, setSendingChange] = useState(false)
  const [changeNote,    setChangeNote]    = useState('')
  const [approved,      setApproved]      = useState(false)
  const [approving,     setApproving]     = useState(false)
  const [coverThumbnail, setCoverThumbnail] = useState<{ left?: string; right?: string } | null>(null)

  // Entregado
  const [reviewStars,       setReviewStars]       = useState(0)
  const [reviewText,        setReviewText]         = useState('')
  const [submittingReview,  setSubmittingReview]   = useState(false)
  const [confirmingDelivery, setConfirmingDelivery] = useState(false)
  const [copied, setCopied] = useState(false)

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

      const openParam = searchParams.get('open')

      setOrder(o as Order)
      setDriveLink(o.drive_link ?? '')
      setDocsLink(o.docs_link ?? '')
      setLabelText(o.label_text ?? '')
      setNotes((n ?? []) as Note[])
      if (p?.cover_thumbnail) setCoverThumbnail(p.cover_thumbnail)

      if (!openParam) {
        if (o.status === 'preview_listo') {
          setOpenSection('preview')
        } else if (['aprobado', 'en_camino', 'en_produccion', 'entregado'].includes(o.status)) {
          setOpenSection('estado')
        } else {
          setOpenSection('material')
        }
      }

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
      status:     'material_recibido',
      status_dates: { ...(order.status_dates ?? {}), material_recibido: new Date().toISOString() },
    }
    if (order.product_type === 'vino') {
      if (order.diseno_tipo === 'foto_y_texto') updates.label_text = labelText
    } else {
      updates.drive_link = driveLink
      updates.docs_link  = docsLink
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

  async function uploadCardPhoto(file: File) {
    if (!order) return
    setUploadingCardPhoto(true)
    const form = new FormData()
    form.append('file', file)
    form.append('folder', 'zeika/cartas')
    const res  = await fetch('/api/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) {
      // Nueva foto, transform anterior ya no aplica — vuelve al centrado por defecto.
      await supabase.from('orders').update({ card_photo_url: data.url, card_photo_transform: null }).eq('id', order.id)
      setOrder(prev => prev ? { ...prev, card_photo_url: data.url, card_photo_transform: null } : prev)
    }
    setUploadingCardPhoto(false)
  }

  async function deleteCardPhoto() {
    if (!order || !window.confirm('¿Eliminar esta foto?')) return
    setUploadingCardPhoto(true)
    await supabase.from('orders').update({ card_photo_url: null, card_photo_transform: null }).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, card_photo_url: null, card_photo_transform: null } : prev)
    setUploadingCardPhoto(false)
  }

  async function uploadLabelPhoto(file: File) {
    if (!order) return
    setUploadingLabelPhoto(true)
    const form = new FormData()
    form.append('file', file)
    const res  = await fetch('/api/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) {
      await supabase.from('orders').update({ label_photo_url: data.url }).eq('id', order.id)
      setOrder(prev => prev ? { ...prev, label_photo_url: data.url } : prev)
    }
    setUploadingLabelPhoto(false)
  }

  async function requestChange() {
    if (!order || sendingChange) return
    setSendingChange(true)
    const newUsed = (order.change_requests_used ?? 0) + 1
    await supabase.from('orders').update({ change_requests_used: newUsed }).eq('id', order.id)
    const noteContent = changeNote.trim()
      ? `Ronda de cambios solicitada${changeNote.trim() ? `: ${changeNote.trim()}` : ''}`
      : 'Ronda de cambios solicitada'
    await supabase.from('order_notes').insert({
      order_id: order.id, user_id: userId, content: noteContent, type: 'change_request',
    })
    setOrder(prev => prev ? { ...prev, change_requests_used: newUsed } : prev)
    setChangeNote('')
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

  async function generateMaterialLinks() {
    if (!order || generatingLinks) return
    setGeneratingLinks(true)
    const folderName  = `Zeika - ${order.book_name} - ${order.id.slice(0, 8).toUpperCase()}`
    const auth        = await authHeaders()
    const driveRes    = await fetch('/api/create-drive-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ folderName }),
    })
    const driveData   = driveRes.ok ? await driveRes.json() : {}
    const newDriveLink = driveData.folderUrl ?? null
    const folderId    = driveData.folderId  ?? null

    const docsRes     = await fetch('/api/create-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ bookName: order.book_name, extraText: order.extra_text, folderId }),
    })
    const newDocsLink = docsRes.ok ? (await docsRes.json()).docsUrl ?? null : null

    await supabase.from('orders').update({
      ...(newDriveLink ? { drive_link: newDriveLink } : {}),
      ...(newDocsLink  ? { docs_link:  newDocsLink  } : {}),
    }).eq('id', order.id)

    if (newDriveLink) setDriveLink(newDriveLink)
    if (newDocsLink)  setDocsLink(newDocsLink)
    setGeneratingLinks(false)
  }

  function toggle(section: string) {
    setOpenSection(prev => prev === section ? '' : section)
  }

  if (loading || !order) return (
    <div className="mp-loading"><div className="mp-spinner" /></div>
  )

  const isCartas         = order.product_type === 'cartas'
  const isVino           = order.product_type === 'vino'
  const sizeInfo        = SIZE_INFO[order.size] ?? { name: order.size, dims: '' }
  const done            = STEP_DONE[order.status] ?? 0
  const allDone         = order.status === 'entregado'
  const statusDates     = order.status_dates ?? {}
  const totalPages      = (order.pages_base ?? 14) + (order.extra_pages ?? 0)
  const canPreview      = ['preview_listo','aprobado','en_produccion','en_camino','entregado'].includes(order.status)
  const canApprove      = order.status === 'preview_listo'
  const afterProduction = ['en_produccion','en_camino','entregado'].includes(order.status)
  const firstName          = userName.split(' ')[0]
  const usedRounds         = order.change_requests_used ?? 0
  const deliveryConfirmed  = notes.some(n => n.type === 'delivery_confirmed')
  const hasReview          = notes.some(n => n.type === 'review')

  // ── Section content ───────────────────────────────────────────────────────

  const detallesContent = (
    <>
      {isCartas ? (
        <>
          <div className="mpd-row">
            <span className="mpd-row__key">Producto</span>
            <span className="mpd-row__val">Cartas personalizadas</span>
          </div>
          <div className="mpd-row">
            <span className="mpd-row__key">Tipo de mazo</span>
            <span className="mpd-row__val">
              {order.card_type ? (order.card_type === 'truco' ? 'Truco' : 'Poker') : 'A elegir al comprar'}
            </span>
          </div>
        </>
      ) : isVino ? (
        <>
          <div className="mpd-row">
            <span className="mpd-row__key">Producto</span>
            <span className="mpd-row__val">Vino personalizado</span>
          </div>
          <div className="mpd-row">
            <span className="mpd-row__key">Variedad</span>
            <span className="mpd-row__val">{order.variedad === 'blanco' ? 'Blanco' : 'Tinto'}</span>
          </div>
          <div className="mpd-row">
            <span className="mpd-row__key">Tipo de diseño</span>
            <span className="mpd-row__val">
              {order.diseno_tipo === 'diseno_personalizado' ? 'Con diseño personalizado' : 'Con foto y texto'}
            </span>
          </div>
          <div className="mpd-row">
            <span className="mpd-row__key">Cantidad</span>
            <span className="mpd-row__val">{order.copies ?? 1} botella{(order.copies ?? 1) > 1 ? 's' : ''}</span>
          </div>
        </>
      ) : (
        <div className="mpd-row">
          <span className="mpd-row__key">Formato</span>
          <span className="mpd-row__val">{sizeInfo.name} {sizeInfo.dims}</span>
        </div>
      )}
      {!isCartas && !isVino && (
        <div className="mpd-row">
          <span className="mpd-row__key">Hojas</span>
          <span className="mpd-row__val">{totalPages} base</span>
        </div>
      )}
      <div className="mpd-row">
        <span className="mpd-row__key">Fecha del pedido</span>
        <span className="mpd-row__val">{fmtDate(order.created_at)}</span>
      </div>
      {!isCartas && (
        <div className="mpd-row">
          <span className="mpd-row__key">Tiempo estimado de diseño</span>
          <span className="mpd-row__val">
            {order.estimated_design_date ? fmtDate(order.estimated_design_date) : 'Primera propuesta en 48hs hábiles'}
          </span>
        </div>
      )}
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

  const materialContent = isCartas ? (
    <div className="mpd-mat-row">
      <div className="mpd-mat-header">
        <span className="mpd-mat-header__label">Tu foto</span>
      </div>
      <div className="mpd-ref-upload">
        {order.card_photo_url ? (
          <div className="mpd-ref-images-row">
            <div className="mpd-ref-img-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.card_photo_url} alt="" className="mpd-ref-img" />
              <button
                className="mpd-ref-img-remove"
                onClick={deleteCardPhoto}
                disabled={uploadingCardPhoto}
                title="Eliminar foto"
              >×</button>
            </div>
          </div>
        ) : (
          <p className="mpd-mat-pending-note">Todavía no subiste una foto.</p>
        )}
        <div className="mpd-ref-add-wrap">
          <button
            className="mpd-ref-add-btn"
            onClick={() => cardPhotoInputRef.current?.click()}
            disabled={uploadingCardPhoto}
          >
            {uploadingCardPhoto ? '...' : order.card_photo_url ? '↻' : '+'}
          </button>
          <span className="mpd-ref-upload-label">{order.card_photo_url ? 'Cambiar' : 'Subir'}</span>
        </div>
        <p className="mpd-ref-desc">Esta es la foto que va a ir impresa en cada carta del mazo.</p>
      </div>
      <input
        ref={cardPhotoInputRef} type="file" accept="image/*"
        className="mpd-hidden-input"
        onChange={e => { if (e.target.files?.[0]) uploadCardPhoto(e.target.files[0]); e.target.value = '' }}
      />
    </div>
  ) : isVino ? (
    <>
      {order.diseno_tipo === 'foto_y_texto' ? (
        <>
          <div className="mpd-mat-row">
            <div className="mpd-mat-header">
              <span className="mpd-mat-header__label">Tu foto</span>
            </div>
            <div className="mpd-ref-upload">
              {order.label_photo_url && (
                <div className="mpd-ref-images-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.label_photo_url} alt="" className="mpd-ref-img" />
                </div>
              )}
              <div className="mpd-ref-add-wrap">
                <button className="mpd-ref-add-btn" onClick={() => labelPhotoInputRef.current?.click()} disabled={uploadingLabelPhoto}>
                  {uploadingLabelPhoto ? '...' : order.label_photo_url ? '↻' : '+'}
                </button>
                <span className="mpd-ref-upload-label">{order.label_photo_url ? 'Cambiar' : 'Subir'}</span>
              </div>
              <p className="mpd-ref-desc">Esta es la foto que va a ir impresa en la etiqueta de tu vino.</p>
            </div>
            <input
              ref={labelPhotoInputRef} type="file" accept="image/*"
              className="mpd-hidden-input"
              onChange={e => { if (e.target.files?.[0]) uploadLabelPhoto(e.target.files[0]); e.target.value = '' }}
            />
          </div>
          <div className="mpd-mat-row">
            <div className="mpd-mat-header">
              <span className="mpd-mat-header__label">Texto de la etiqueta</span>
            </div>
            <textarea
              className="mpd-mat-textarea"
              placeholder="Escribí el texto que va en la etiqueta (nombres, fecha, mensaje...)"
              value={labelText}
              onChange={e => setLabelText(e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="mpd-mat-row">
            <div className="mpd-mat-header">
              <span className="mpd-mat-header__label">Referencia de diseño</span>
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
                Subí una imagen de referencia del diseño que te gustaría para tu etiqueta.
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
              <span className="mpd-mat-header__label">Notas para los diseñadores</span>
              <span className="mpd-mat-header__opt">(Opcional)</span>
            </div>
            <textarea
              className="mpd-mat-textarea"
              placeholder="Contanos cualquier detalle que quieras que tengamos en cuenta..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
          </div>
        </>
      )}
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
  ) : (
    <>
      <div className="mpd-mat-row">
        <div className="mpd-mat-header">
          <span className="mpd-mat-header__label">Fotos / Google Drive</span>
        </div>
        {driveLink ? (
          <a className="mpd-mat-link-btn" href={driveLink} target="_blank" rel="noopener noreferrer">
            Abrir carpeta de Drive →
          </a>
        ) : order.status !== 'pendiente_pago' ? (
          <button className="mpd-mat-retry-btn" onClick={generateMaterialLinks} disabled={generatingLinks}>
            {generatingLinks ? 'Generando...' : 'Generar carpeta de Drive →'}
          </button>
        ) : (
          <p className="mpd-mat-pending-note">La carpeta se genera automáticamente al confirmar el pago.</p>
        )}
        <div className="mpd-mat-tips">
          <span className="mpd-mat-tip">Subí tus fotos a esta carpeta de Drive — es la que vamos a usar para diseñar tu libro.</span>
          <span className="mpd-mat-tip">Si las fotos tienen un orden específico, enumeralas: 01.jpg, 02.jpg…</span>
          <span className="mpd-mat-tip">Si organizás por destinos o secciones, usá subcarpetas dentro de la carpeta.</span>
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
        ) : order.status !== 'pendiente_pago' ? (
          <p className="mpd-mat-pending-note">Creá un documento (tipo Google Docs) dentro de tu misma carpeta de Drive.</p>
        ) : (
          <p className="mpd-mat-pending-note">El documento se genera automáticamente, dentro de tu carpeta de Drive, al confirmar el pago.</p>
        )}
        <div className="mpd-mat-tips">
          <span className="mpd-mat-tip">Ahí escribís las dedicatorias o cartas que quieras incluir en el libro.</span>
          <span className="mpd-mat-tip">Si los textos van con fotos específicas, numeralos igual que las fotos: 01, 02…</span>
        </div>
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
      <p>Tu primera propuesta de diseño llega en 48hs hábiles desde que recibimos tu material.</p>
      <p>Después vas a tener 3 rondas de cambio incluidas — cada corrección que nos mandes te la devolvemos ajustada en menos de 24hs.</p>
    </div>
  ) : (
    <>
      {isCartas ? (
        <div className="mpd-card-mockup">
          {order.card_photo_url && (
            <div className="mpd-card-mockup__frame-wrap">
              <CardPhotoFrame src={order.card_photo_url} transform={order.card_photo_transform ?? undefined} />
            </div>
          )}
          <p className="mpd-preview-pending">
            Mockup de referencia — así queda tu foto impresa en cada carta del mazo
            {order.card_type ? ` de ${order.card_type}` : ''}.
          </p>
        </div>
      ) : isVino ? (
        <div className="mpd-card-mockup">
          <div className="mpd-card-mockup__frame-wrap mpd-vino-mockup__frame-wrap">
            <VinoMockupFrame src={order.vino_design_url} />
          </div>
          <p className="mpd-preview-pending">
            {order.vino_design_url
              ? 'Así queda el diseño de tu etiqueta sobre la botella.'
              : 'Todavía estamos preparando el diseño de tu etiqueta.'}
          </p>
        </div>
      ) : (
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
                  return u.pathname
                } catch {
                  return order.preview_url!
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
      )}

      {canApprove && !isCartas && (
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
              Tomate el tiempo que necesites para revisar: una vez que nos mandás tus correcciones, te devolvemos la
              versión ajustada en menos de 24hs.
            </p>
          </div>
          <div className="mpd-change-note-block">
            <p className="mpd-change-note-hint">
              Dentro del preview podés comentar y dibujar directamente sobre las hojas. Si querés agregar algo más, escribilo acá.
            </p>
            <p className="mpd-change-note-hint mpd-change-note-hint--em">
              Cuando estés lista, presioná <strong>Enviar cambios</strong> para que el equipo reciba todo junto.
            </p>
            <textarea
              className="mpd-mat-textarea"
              placeholder="Escribí cualquier detalle extra que quieras que tengamos en cuenta..."
              value={changeNote}
              onChange={e => setChangeNote(e.target.value)}
              disabled={sendingChange || usedRounds >= MAX_CHANGES}
            />
          </div>
          <div className="mpd-change-btn-row">
            <button
              className="mpd-guardar-cambios-btn"
              onClick={requestChange}
              disabled={sendingChange || usedRounds >= MAX_CHANGES}
            >
              {sendingChange ? 'Enviando...' : 'Enviar cambios'}
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

  // ── Approve + buy ─────────────────────────────────────────────────────────

  async function confirmApproval() {
    if (!order || !approved || !canApprove || approving) return
    setApproving(true)
    const now = new Date().toISOString()
    await supabase.from('orders').update({
      status:       'aprobado',
      status_dates: { ...(order.status_dates ?? {}), aprobado: now },
    }).eq('id', order.id)
    router.push(`/mis-proyectos?tab=listos&item=${order.id}`)
  }

  const cartasBuyContent = (
    <div className="mpd-cta-wrap">
      <a
        className="mpd-cta-btn mpd-cta-btn--active"
        href={`/mis-proyectos?tab=listos&item=${order.id}`}
      >
        Elegir tipo y comprar
      </a>
      <p className="mpd-legal">
        Por tratarse de un producto personalizado, no realizamos cambios ni devoluciones una vez enviado a producción.
      </p>
    </div>
  )

  const approveAndBuyShared = isCartas ? cartasBuyContent : (
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
          disabled={!approved || !canApprove || approving}
          onClick={confirmApproval}
        >
          {approving ? 'Confirmando...' : 'Aceptar y comprar'}
        </button>
        <p className="mpd-legal">
          Por tratarse de un producto personalizado, no realizamos cambios ni devoluciones una vez enviado a producción.
        </p>
      </div>
    </>
  )

  const approveAndBuyDesktop = !afterProduction && order.status !== 'entregado' ? (
    isCartas ? cartasBuyContent :
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
          disabled={!approved || !canApprove || approving}
          onClick={confirmApproval}
        >
          {approving ? 'Confirmando...' : 'Aceptar y comprar'}
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
            <a href={`/mis-proyectos?item=${order.id}&reorder=true`} className="mpd-action-btn mpd-action-btn--outline mpd-reorder-mobile">
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
          <a href="/mis-proyectos" className="mpd-back">‹ Mis pedidos</a>
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
                  isActive={false}
                  onClick={() => router.push(`/mis-proyectos?item=${order.id}&reorder=true`)}
                />
              )}
            </div>

            <div className="mpd-desktop-divider" />

            <div className="mpd-desktop-right">
              {openSection && (
                <div className="mpd-desktop-panel">
                  <div className="mpd-desktop-panel__header">
                    <span className="mpd-desktop-panel__title">
                      {SECTION_TITLES[openSection] ?? openSection}
                    </span>
                  </div>
                  {openSection === 'detalles'   && detallesContent}
                  {openSection === 'estado'     && estadoContent}
                  {openSection === 'material'   && materialContent}
                  {openSection === 'preview'    && previewContent}
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
          <span>¡Recibimos tu material! En menos de 48hs vas a tener tu primera propuesta de diseño.</span>
        </div>
      )}

      {order && (
        <a
          className="mpd-wa-fab"
          href={`https://wa.me/5491133521921?text=${encodeURIComponent(`Hola! Te escribo por mi ${isCartas ? 'mazo de cartas' : isVino ? 'vino' : 'fotolibro'} *${order.book_name}* (pedido #${orderId.slice(0, 8).toUpperCase()})`)}`}
          target="_blank" rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
        >
          <img src="/icons/social/whatsapp.svg" alt="WhatsApp" />
        </a>
      )}
    </div>
  )
}
