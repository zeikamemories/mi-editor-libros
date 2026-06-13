'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import './pedido.css'

const ADMIN_EMAILS = ['maikasacerdote@gmail.com', 'zeika.memories@gmail.com']

const ALL_STATUSES = [
  { value: 'confirmado',        label: 'Confirmado'        },
  { value: 'material_recibido', label: 'Material recibido' },
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

interface Project {
  id: string
  cover_thumbnail: { left: string; right: string } | null
  created_at: string
}

interface Order {
  id: string
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
}

interface Note {
  id: string
  content: string
  type: string
  created_at: string
}

interface PreviewComment {
  id: string
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
  const [previewComments, setPreviewComments] = useState<PreviewComment[]>([])
  const [project,         setProject]         = useState<Project | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [creatingProject, setCreatingProject] = useState(false)

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email
      if (!email || !ADMIN_EMAILS.includes(email)) { router.replace('/dashboard'); return }
      setAdminUserId(session!.user.id)

      Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase.from('order_notes').select('id, content, type, created_at').eq('order_id', orderId).order('created_at'),
        supabase.from('projects').select('id, cover_thumbnail, created_at').eq('order_id', orderId).maybeSingle(),
      ]).then(([{ data: o }, { data: n }, { data: p }]) => {
        if (!o) { router.replace('/dashboard'); return }
        const ord = o as Order
        setOrder(ord)
        setStatus(ord.status)
        setPreviewUrl(ord.preview_url ?? '')
        setTracking(ord.tracking_number ?? '')
        setDesignDate(ord.estimated_design_date ?? '')
        setDeliveryDate(ord.estimated_delivery_date ?? '')
        setNotes((n ?? []) as Note[])
        if (p) {
          setProject(p as Project)
          supabase
            .from('preview_annotations')
            .select('id, page_number, content, created_at')
            .eq('project_id', (p as Project).id)
            .eq('type', 'comment')
            .order('created_at')
            .then(({ data: ann }) => setPreviewComments((ann ?? []) as PreviewComment[]))
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
    const bookSizeId = SIZE_MAP[order?.size ?? ''] ?? 'vertical'
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
            <div className="pedido-item"><label>Total</label><span>{fmt(order.price_total)}</span></div>
            <div className="pedido-item"><label>50% pagado</label><span>{fmt(order.price_paid)}</span></div>
            <div className="pedido-item"><label>Fecha pedido</label><span>{fmtDate(order.created_at)}</span></div>
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
        </div>

        {/* ── Estado ─────────────────────────────────────────────── */}
        <div className="pedido-card">
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
            <a className="pedido-link-btn" href={order.preview_url} target="_blank" rel="noreferrer">
              Ver preview ↗
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
        </div>

        {/* ── Pedidos de cambio ───────────────────────────────────── */}
        {changeRequests.length > 0 && (
          <div className="pedido-card">
            <h3 className="pedido-card-title">
              Pedidos de cambio
              <span className="pedido-badge">{changeRequests.length}</span>
            </h3>
            {changeRequests.map(n => (
              <div key={n.id} className="pedido-note pedido-note--change">
                <span className="pedido-note-date">{fmtDate(n.created_at)}</span>
                <p className="pedido-note-content">{n.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Comentarios del cliente en el preview ───────────────── */}
        {previewComments.length > 0 && (
          <div className="pedido-card">
            <h3 className="pedido-card-title">
              Comentarios del cliente en el preview
              <span className="pedido-badge">{previewComments.length}</span>
            </h3>
            {previewComments.map(c => (
              <div key={c.id} className="pedido-note pedido-note--change">
                <span className="pedido-note-date">Página {c.page_number + 1} · {fmtDate(c.created_at)}</span>
                <p className="pedido-note-content">{c.content}</p>
              </div>
            ))}
          </div>
        )}

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

      {/* ── Columna derecha: proyecto / editor ──────────────────── */}
      <aside className="pedido-aside">
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
      </aside>
      </div>
    </div>
  )
}
