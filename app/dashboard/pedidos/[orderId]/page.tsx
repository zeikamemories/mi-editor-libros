'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import './pedido.css'

const ADMIN_EMAILS = ['maikasacerdote@gmail.com', 'zeika.memories@gmail.com']

const ALL_STATUSES = [
  { value: 'confirmado',        label: 'Cargar material'   },
  { value: 'material_recibido', label: 'Material cargado'  },
  { value: 'en_diseno',         label: 'En diseño'         },
  { value: 'preview_listo',     label: 'Preview listo'     },
  { value: 'en_produccion',     label: 'En producción'     },
  { value: 'en_camino',         label: 'En camino'         },
  { value: 'entregado',         label: 'Entregado'         },
]

const SIZE_NAMES: Record<string, string> = {
  chico_h: 'Chico Horizontal', mediano_h: 'Mediano Horizontal',
  grande_h: 'Grande Horizontal', vertical: 'Vertical', cuadrado: 'Cuadrado',
}

const TEXT_EXTRA_BY_SIZE: Record<string, number> = {
  chico_h: 1, mediano_h: 10000, grande_h: 10000, vertical: 10000, cuadrado: 10000,
}

interface Project {
  id: string
  book_size: string | null
  cover_thumbnail: { left: string; right: string } | null
  created_at: string
}

interface Order {
  id: string
  user_id: string
  book_name: string
  size: string
  status: string
  price_total: number
  price_paid: number
  created_at: string
  preview_url: string | null
  tracking_number: string | null
  drive_link: string | null
  docs_link: string | null
  reference_images: string[]
  change_requests_used: number
  estimated_design_date: string | null
  estimated_delivery_date: string | null
  status_dates: Record<string, string>
  extra_pages: number
  extra_text: boolean
  pages_base: number
  delivery_type: string | null
  delivery_address: string | null
}

interface Note {
  id: string
  content: string
  type: string
  created_at: string
}

interface PreviewAnnotation {
  id: string
  type: 'comment' | 'drawing'
  page_number: number
  content: string
  created_at: string
}

function fmt(n: number) { return '$' + n.toLocaleString('es-AR') }
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR')
}
function orderNumber(id: string, date: string) {
  return `ZK-${new Date(date).getFullYear()}-${id.substring(0, 6).toUpperCase()}`
}

export default function PedidoAdminPage() {
  const router  = useRouter()
  const params  = useParams()
  const orderId = params.orderId as string

  const [order,    setOrder]    = useState<Order | null>(null)
  const [notes,           setNotes]           = useState<Note[]>([])
  const [previewAnnotations, setPreviewAnnotations] = useState<PreviewAnnotation[]>([])
  const [project,         setProject]         = useState<Project | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [creatingProject, setCreatingProject] = useState(false)
  const [clientPhone,     setClientPhone]     = useState('')

  // Status editing
  const [status,       setStatus]       = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  // Preview URL
  const [previewUrl,    setPreviewUrl]    = useState('')
  const [savingPreview, setSavingPreview] = useState(false)

  // Tracking
  const [tracking,       setTracking]       = useState('')
  const [savingTracking, setSavingTracking] = useState(false)

  // Dates
  const [designDate,   setDesignDate]   = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [savingDates,  setSavingDates]  = useState(false)

  const [adminNote,      setAdminNote]      = useState('')
  const [sendingNote,    setSendingNote]    = useState(false)
  const [adminUserId,    setAdminUserId]    = useState('')

  // Edit detalles
  const [editName,       setEditName]       = useState('')
  const [editTotal,      setEditTotal]      = useState('')
  const [editPaid,       setEditPaid]       = useState('')
  const [editPhone,      setEditPhone]      = useState('')
  const [savingDetails,  setSavingDetails]  = useState(false)

  // Asignar cliente
  const [assignEmail,    setAssignEmail]    = useState('')
  const [assigning,      setAssigning]      = useState(false)
  const [assignMsg,      setAssignMsg]      = useState('')

  // Cobrar textos extra después de la compra
  const [chargingText,   setChargingText]   = useState(false)
  const [textChargeLink, setTextChargeLink] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email
      if (!email || !ADMIN_EMAILS.includes(email)) { router.replace('/dashboard'); return }
      setAdminUserId(session!.user.id)

      Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase.from('order_notes').select('id, content, type, created_at').eq('order_id', orderId).order('created_at'),
        supabase.from('projects').select('id, book_size, cover_thumbnail, created_at').eq('order_id', orderId).maybeSingle(),
      ]).then(([{ data: o }, { data: n }, { data: p }]) => {
        if (!o) { router.replace('/dashboard'); return }
        const ord = o as Order
        setOrder(ord)
        setStatus(ord.status)
        setPreviewUrl(ord.preview_url ?? '')
        setTracking(ord.tracking_number ?? '')
        setDesignDate(ord.estimated_design_date ?? '')
        setDeliveryDate(ord.estimated_delivery_date ?? '')
        setEditName(ord.book_name)
        setEditTotal(String(ord.price_total))
        setEditPaid(String(ord.price_paid))
        setEditPhone('')
        setNotes((n ?? []) as Note[])
        if (o?.user_id) {
          supabase.from('profiles').select('whatsapp').eq('id', (o as Order).user_id).single()
            .then(({ data: prof }) => { if (prof?.whatsapp) setClientPhone(prof.whatsapp) })
        }
        if (p) {
          setProject(p as Project)
          supabase
            .from('preview_annotations')
            .select('id, type, page_number, content, created_at')
            .eq('project_id', (p as Project).id)
            .order('created_at')
            .then(({ data: ann }) => setPreviewAnnotations((ann ?? []) as PreviewAnnotation[]))
        }
        setLoading(false)
      })
    })
  }, [orderId, router])

  async function saveStatus() {
    if (!order) return
    setSavingStatus(true)
    const newDates = { ...(order.status_dates ?? {}), [status]: new Date().toISOString() }
    await supabase.from('orders').update({ status, status_dates: newDates }).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, status, status_dates: newDates } : prev)
    setSavingStatus(false)
  }

  async function savePreview() {
    if (!order) return
    setSavingPreview(true)
    const newStatus = previewUrl ? 'preview_listo' : order.status
    const newDates  = previewUrl
      ? { ...(order.status_dates ?? {}), preview_listo: new Date().toISOString() }
      : order.status_dates
    await supabase.from('orders').update({
      preview_url: previewUrl || null,
      status:      newStatus,
      status_dates: newDates,
    }).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, preview_url: previewUrl || null, status: newStatus, status_dates: newDates } : prev)
    setStatus(newStatus)
    setSavingPreview(false)
  }

  async function saveTracking() {
    if (!order) return
    setSavingTracking(true)
    const newStatus = tracking ? 'en_camino' : order.status
    const newDates  = tracking
      ? { ...(order.status_dates ?? {}), en_camino: new Date().toISOString() }
      : order.status_dates
    await supabase.from('orders').update({
      tracking_number: tracking || null,
      status:          newStatus,
      status_dates:    newDates,
    }).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, tracking_number: tracking || null, status: newStatus, status_dates: newDates } : prev)
    setStatus(newStatus)
    setSavingTracking(false)
  }

  async function saveDates() {
    if (!order) return
    setSavingDates(true)
    await supabase.from('orders').update({
      estimated_design_date:   designDate || null,
      estimated_delivery_date: deliveryDate || null,
    }).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, estimated_design_date: designDate || null, estimated_delivery_date: deliveryDate || null } : prev)
    setSavingDates(false)
  }

  function createProject() {
    if (!order) return
    router.push(`/nuevo?size=${order.size}&name=${encodeURIComponent(order.book_name)}&orderId=${order.id}`)
  }

  function openEditor() {
    if (!project) return
    const SIZE_MAP: Record<string, string> = {
      chico_h: 'chico', mediano_h: 'mediano', grande_h: 'grande',
      vertical: 'vertical', cuadrado: 'cuadrado',
    }
    const rawSize = project.book_size ?? order?.size ?? 'vertical'
    const bookSizeId = SIZE_MAP[rawSize] ?? rawSize
    sessionStorage.setItem('zeika_project_id', project.id)
    sessionStorage.setItem('zeika_book_size', bookSizeId)
    sessionStorage.setItem('zeika_return_path', `/dashboard/pedidos/${orderId}`)
    router.push(`/editor?pid=${project.id}`)
  }

  async function sendAdminNote() {
    if (!adminNote.trim() || !order) return
    setSendingNote(true)
    const { data } = await supabase.from('order_notes').insert({
      order_id: order.id, user_id: adminUserId, content: adminNote.trim(), type: 'designer_note',
    }).select().single()
    if (data) setNotes(prev => [...prev, data as Note])
    setAdminNote('')
    setSendingNote(false)
  }

  async function saveDetails() {
    if (!order) return
    setSavingDetails(true)
    const total = parseInt(editTotal) || 0
    const paid  = parseInt(editPaid)  || 0
    await supabase.from('orders').update({
      book_name:   editName.trim() || order.book_name,
      price_total: total,
      price_paid:  paid,
    }).eq('id', order.id)
    if (editPhone.trim()) {
      await supabase.from('profiles').upsert({ id: order.user_id, whatsapp: editPhone.trim() })
      setClientPhone(editPhone.trim())
    }
    setOrder(prev => prev ? { ...prev, book_name: editName.trim() || prev.book_name, price_total: total, price_paid: paid } : prev)
    setSavingDetails(false)
  }

  async function assignToClient() {
    if (!assignEmail.trim() || !order) return
    setAssigning(true)
    setAssignMsg('')
    const res  = await fetch('/api/assign-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, email: assignEmail.trim() }),
    })
    const json = await res.json()
    if (json.ok) {
      setAssignMsg(`✓ Asignado a ${json.userName}`)
      setAssignEmail('')
    } else {
      setAssignMsg(json.error ?? 'Error')
    }
    setAssigning(false)
  }

  // Cliente pidió "textos varios" después de pagar (ej. por WhatsApp) — generamos
  // un link de pago aparte por ese adicional, en vez de tocar el cálculo del
  // saldo final (que ya está resuelto por copias + envío).
  async function chargeExtraText() {
    if (!order) return
    const price = TEXT_EXTRA_BY_SIZE[order.size] ?? 10000
    if (!window.confirm(`¿Generar un link de pago por ${fmt(price)} (textos extra) para este pedido?`)) return
    setChargingText(true)
    const base = window.location.origin
    const res = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId:    order.id,
        bookName:   `${order.book_name} — Textos extra`,
        amount:     price,
        successUrl: `${base}/dashboard/pedidos/${order.id}`,
        failureUrl: `${base}/dashboard/pedidos/${order.id}`,
      }),
    })
    const json = await res.json()
    if (json.url) {
      setTextChargeLink(json.url)
      await supabase.from('orders').update({ extra_text: true }).eq('id', order.id)
      setOrder(prev => prev ? { ...prev, extra_text: true } : prev)
    }
    setChargingText(false)
  }

  function buildWaLink(message: string) {
    const phone = clientPhone || editPhone
    const digits = phone.replace(/\D/g, '')
    const waNumber = digits.startsWith('54') ? digits : '549' + digits
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
  }

  if (loading || !order) return (
    <div className="pedido-loading"><div className="pedido-spinner" /></div>
  )

  const changeRequests = notes.filter(n => n.type === 'change_request')
  const totalPages = (order.pages_base ?? 14) + (order.extra_pages ?? 0)

  return (
    <div className="pedido-root">
      <header className="pedido-header">
        <Link href="/dashboard" className="pedido-back">← Dashboard</Link>
        <span className="pedido-header-title">{order.book_name}</span>
        <span className="pedido-order-num">{orderNumber(order.id, order.created_at)}</span>
      </header>

      <div className="pedido-layout">
      <div className="pedido-main">
        {/* ── Info del pedido ─────────────────────────────────────── */}
        <div className="pedido-card">
          <h3 className="pedido-card-title">Detalles</h3>
          <div className="pedido-grid">
            <div className="pedido-item"><label>Tamaño</label><span>{SIZE_NAMES[order.size] ?? order.size}</span></div>
            <div className="pedido-item"><label>Páginas</label><span>{totalPages}</span></div>
            <div className="pedido-item"><label>Textos extra</label><span>{order.extra_text ? 'Sí' : 'No'}</span></div>
            {!order.extra_text && (
              <div className="pedido-item pedido-item--full">
                <label>&nbsp;</label>
                <button className="pedido-save-btn" onClick={chargeExtraText} disabled={chargingText}>
                  {chargingText ? 'Generando...' : `Cobrar textos extra (${fmt(TEXT_EXTRA_BY_SIZE[order.size] ?? 10000)})`}
                </button>
              </div>
            )}
            {textChargeLink && (
              <div className="pedido-item pedido-item--full">
                <label>Link de cobro</label>
                <a className="pedido-link-btn" href={textChargeLink} target="_blank" rel="noreferrer">
                  Copiá este link y mandalo por WhatsApp ↗
                </a>
              </div>
            )}
            <div className="pedido-item"><label>Total</label><span>{fmt(order.price_total)}</span></div>
            <div className="pedido-item"><label>50% pagado</label><span>{fmt(order.price_paid)}</span></div>
            <div className="pedido-item"><label>Fecha pedido</label><span>{fmtDate(order.created_at)}</span></div>
            <div className="pedido-item"><label>Envío</label><span>{order.delivery_type === 'andreani' ? 'Andreani' : order.delivery_type === 'retiro' ? 'Retiro en fábrica' : '—'}</span></div>
            {order.delivery_type === 'andreani' && order.delivery_address && (
              <div className="pedido-item pedido-item--full"><label>Dirección</label><span>{order.delivery_address}</span></div>
            )}
          </div>
          {order.drive_link && (
            <a className="pedido-link-btn" href={order.drive_link} target="_blank" rel="noreferrer">
              Ver fotos en Drive ↗
            </a>
          )}
          {order.docs_link && (
            <a className="pedido-link-btn" href={order.docs_link} target="_blank" rel="noreferrer">
              Ver textos en Docs ↗
            </a>
          )}
          {(order.reference_images ?? []).length > 0 && (
            <div className="pedido-ref-images">
              {order.reference_images.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="pedido-ref-img" />
              ))}
            </div>
          )}
          {(clientPhone || editPhone) ? (
            <a
              className="pedido-wa-btn"
              href={buildWaLink(`¡Hola! Recibimos tu pedido del fotolibro "${order.book_name}". Estamos trabajando en el diseño y te contactamos en las próximas 48hs hábiles. ¡Gracias por confiar en Zeika!`)}
              target="_blank"
              rel="noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#25D366"/><path d="M16 6C10.477 6 6 10.477 6 16c0 1.89.523 3.655 1.432 5.16L6 26l4.98-1.407A9.946 9.946 0 0016 26c5.523 0 10-4.477 10-10S21.523 6 16 6zm4.38 13.13c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.014-.374-1.932-1.19-.714-.636-1.196-1.42-1.336-1.66-.14-.24-.015-.37.105-.49.108-.108.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.468-.394-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.692 2.582 4.1 3.62.573.248 1.02.396 1.368.506.575.183 1.098.157 1.512.095.461-.069 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" fill="white"/></svg>
              Enviar confirmación de compra
            </a>
          ) : (
            <p className="pedido-hint">Ingresá el WhatsApp del cliente para habilitar los botones de mensajes.</p>
          )}

          <hr className="pedido-divider" />

          {/* Editar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ flex: '2 1 140px' }}>
              <label className="pedido-hint">Nombre</label>
              <input className="pedido-input" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 90px' }}>
              <label className="pedido-hint">Total ($)</label>
              <input className="pedido-input" type="number" value={editTotal} onChange={e => setEditTotal(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 90px' }}>
              <label className="pedido-hint">Pagado ($)</label>
              <input className="pedido-input" type="number" value={editPaid} onChange={e => setEditPaid(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label className="pedido-hint">WhatsApp</label>
              <input className="pedido-input" placeholder="11 1234 5678" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <button className="pedido-save-btn" onClick={saveDetails} disabled={savingDetails} style={{ alignSelf: 'flex-end', flexShrink: 0 }}>
              {savingDetails ? '...' : 'Guardar'}
            </button>
          </div>

          <hr className="pedido-divider" />

          {/* Asignar a cliente */}
          <p className="pedido-hint">Asignar a cliente — va a aparecer en su portal (/mis-proyectos).</p>
          <div className="pedido-row">
            <input
              className="pedido-input"
              placeholder="Email del cliente"
              value={assignEmail}
              onChange={e => { setAssignEmail(e.target.value); setAssignMsg('') }}
            />
            <button className="pedido-save-btn" onClick={assignToClient} disabled={assigning || !assignEmail.trim()}>
              {assigning ? '...' : 'Asignar'}
            </button>
          </div>
          {assignMsg && (
            <p className="pedido-hint" style={{ color: assignMsg.startsWith('✓') ? '#2d7a3a' : '#c0392b' }}>
              {assignMsg}
            </p>
          )}
        </div>

        {/* ── Preview URL ─────────────────────────────────────────── */}
        <div className="pedido-card">
          <h3 className="pedido-card-title">Preview del libro</h3>
          <p className="pedido-hint">Copiá el link desde el editor (botón Compartir). Al guardarlo, el estado pasa automáticamente a "Preview listo".</p>
          <div className="pedido-row">
            <input
              className="pedido-input"
              placeholder="https://zeikamemories.com/preview/..."
              value={previewUrl}
              onChange={e => setPreviewUrl(e.target.value)}
            />
            <button className="pedido-save-btn" onClick={savePreview} disabled={savingPreview}>
              {savingPreview ? '...' : 'Guardar'}
            </button>
          </div>
          {order.preview_url && (
            <a className="pedido-link-btn" href={(() => {
              try { const u = new URL(order.preview_url!); return u.pathname + u.search }
              catch { return order.preview_url! }
            })()} target="_blank" rel="noreferrer">
              Ver preview ↗
            </a>
          )}
          {clientPhone && previewUrl && (
            <a
              className="pedido-wa-btn"
              href={buildWaLink(`¡Hola! El diseño de tu fotolibro "${order.book_name}" está listo para que lo revises. Entrá a tu portal en Zeika para verlo y dejarnos tus comentarios. ¡Cualquier cambio nos avisás!`)}
              target="_blank"
              rel="noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#25D366"/><path d="M16 6C10.477 6 6 10.477 6 16c0 1.89.523 3.655 1.432 5.16L6 26l4.98-1.407A9.946 9.946 0 0016 26c5.523 0 10-4.477 10-10S21.523 6 16 6zm4.38 13.13c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.014-.374-1.932-1.19-.714-.636-1.196-1.42-1.336-1.66-.14-.24-.015-.37.105-.49.108-.108.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.468-.394-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.692 2.582 4.1 3.62.573.248 1.02.396 1.368.506.575.183 1.098.157 1.512.095.461-.069 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" fill="white"/></svg>
              Avisar que el preview está listo
            </a>
          )}
        </div>

        {/* ── Número de seguimiento ───────────────────────────────── */}
        <div className="pedido-card">
          <h3 className="pedido-card-title">Envío</h3>
          <p className="pedido-hint">Al guardar el número, el estado pasa automáticamente a "En camino".</p>
          <div className="pedido-row">
            <input
              className="pedido-input"
              placeholder="AND-2026-XXXXXX"
              value={tracking}
              onChange={e => setTracking(e.target.value)}
            />
            <button className="pedido-save-btn" onClick={saveTracking} disabled={savingTracking}>
              {savingTracking ? '...' : 'Guardar'}
            </button>
          </div>
          {clientPhone && tracking && (
            <a
              className="pedido-wa-btn"
              href={buildWaLink(`¡Hola! Tu fotolibro "${order.book_name}" ya está en camino. Número de seguimiento Andreani: ${tracking}. ¡Ya falta poquito!`)}
              target="_blank"
              rel="noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#25D366"/><path d="M16 6C10.477 6 6 10.477 6 16c0 1.89.523 3.655 1.432 5.16L6 26l4.98-1.407A9.946 9.946 0 0016 26c5.523 0 10-4.477 10-10S21.523 6 16 6zm4.38 13.13c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.014-.374-1.932-1.19-.714-.636-1.196-1.42-1.336-1.66-.14-.24-.015-.37.105-.49.108-.108.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.468-.394-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.692 2.582 4.1 3.62.573.248 1.02.396 1.368.506.575.183 1.098.157 1.512.095.461-.069 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" fill="white"/></svg>
              Avisar número de seguimiento
            </a>
          )}
        </div>

        {/* ── Notas del cliente y diseñadora ──────────────────────── */}
        <div className="pedido-card">
          <h3 className="pedido-card-title">Notas</h3>
          {notes.filter(n => n.type !== 'change_request').map(n => (
            <div key={n.id} className={`pedido-note ${n.type === 'designer_note' ? 'pedido-note--designer' : ''}`}>
              <span className="pedido-note-date">
                {n.type === 'designer_note' ? 'Diseñadora' : 'Cliente'} · {fmtDate(n.created_at)}
              </span>
              <p className="pedido-note-content">{n.content}</p>
            </div>
          ))}
          <textarea
            className="pedido-textarea"
            placeholder="Agregar nota interna..."
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
          />
          <button className="pedido-save-btn" onClick={sendAdminNote} disabled={!adminNote.trim() || sendingNote}>
            {sendingNote ? '...' : 'Agregar nota'}
          </button>
        </div>
      </div>

      {/* ── Columna derecha: estado + proyecto / editor ─────────── */}
      <aside className="pedido-aside">
        {/* ── Estado ─────────────────────────────────────────────── */}
        <div className="pedido-card pedido-aside-card">
          <h3 className="pedido-card-title">Estado</h3>
          <div className="pedido-row">
            <select className="pedido-select" value={status} onChange={e => setStatus(e.target.value)}>
              {ALL_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button className="pedido-save-btn" onClick={saveStatus} disabled={savingStatus}>
              {savingStatus ? '...' : 'Guardar'}
            </button>
          </div>
          <div className="pedido-dates-row">
            <div className="pedido-date-field">
              <label>Diseño estimado</label>
              <input type="date" value={designDate} onChange={e => setDesignDate(e.target.value)} />
            </div>
            <div className="pedido-date-field">
              <label>Entrega estimada</label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
            </div>
            <button className="pedido-save-btn" onClick={saveDates} disabled={savingDates}>
              {savingDates ? '...' : 'Guardar fechas'}
            </button>
          </div>
        </div>

        {/* ── Proyecto / editor ───────────────────────────────────── */}
        {!project ? (
          <button
            className="pedido-nuevo-btn"
            onClick={createProject}
            disabled={creatingProject}
          >
            {creatingProject ? 'Creando...' : 'NUEVO +'}
          </button>
        ) : (
          <div className="pedido-project-card">
            <div className="pedido-spread-thumb">
              {project.cover_thumbnail ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={project.cover_thumbnail.left}  alt="" className="pedido-thumb-page" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={project.cover_thumbnail.right} alt="" className="pedido-thumb-page" />
                </>
              ) : (
                <div className="pedido-thumb-empty">Sin diseño aún</div>
              )}
            </div>
            <div className="pedido-project-meta">
              <span className="pedido-project-name">{order.book_name}</span>
              <span className="pedido-project-date">{fmtDate(project.created_at)}</span>
            </div>
            <button className="pedido-entrar-btn" onClick={openEditor}>
              ENTRAR
            </button>
          </div>
        )}

        {/* ── Anotaciones + pedidos de cambio ─────────────────────── */}
        {(() => {
          const comments = previewAnnotations.filter(a => a.type === 'comment')
          return (comments.length > 0 || changeRequests.length > 0) && (
          <div className="pedido-card pedido-aside-card">
            <h3 className="pedido-card-title">
              Anotaciones del cliente
              <span className="pedido-badge">{comments.length + changeRequests.length}</span>
            </h3>
            {comments.map(a => (
              <div key={a.id} className="pedido-note pedido-note--change">
                <span className="pedido-note-date">
                  Comentario · Página {a.page_number + 1} · {fmtDate(a.created_at)}
                </span>
                <p className="pedido-note-content">{a.content}</p>
              </div>
            ))}
            {changeRequests.length > 0 && comments.length > 0 && (
              <hr className="pedido-divider" />
            )}
            {changeRequests.map(n => (
              <div key={n.id} className="pedido-note pedido-note--change">
                <span className="pedido-note-date">Pedido de cambio · {fmtDate(n.created_at)}</span>
                <p className="pedido-note-content">{n.content}</p>
              </div>
            ))}
          </div>
        )})()}
      </aside>
      </div>
    </div>
  )
}
