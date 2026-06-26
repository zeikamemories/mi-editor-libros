'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, List, LayoutGrid } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Landing/Navbar/Navbar'
import './dashboard.css'

const ADMIN_EMAILS = [
  'maikasacerdote@gmail.com',
  'zeika.memories@gmail.com',
]

type FilterTab = 'TODOS' | 'NUEVOS' | 'EN PROCESO' | 'EN PRODUCCIÓN' | 'FINALIZADOS'

type Designer = 'maika' | 'vicky' | 'jose' | null

const DESIGNER_COLORS: Record<string, string> = {
  maika: '#109e90',
  vicky: '#a719d3',
  jose:  '#f97944',
}
const DESIGNER_CYCLE: Designer[] = ['maika', 'vicky', 'jose', null]

interface OrderRow {
  id: string
  order_number: string
  book_name: string
  client_name: string
  client_phone: string
  created_at: string
  size: string
  status: string
  price_total: number
  price_paid: number
  change_requests_used: number
  designer: Designer
}

const TABS: FilterTab[] = ['TODOS', 'NUEVOS', 'EN PROCESO', 'EN PRODUCCIÓN', 'FINALIZADOS']

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

const STATUS_TAB: Record<FilterTab, string[] | null> = {
  TODOS:           null,
  NUEVOS:          ['pendiente_pago', 'confirmado'],
  'EN PROCESO':    ['material_recibido', 'en_diseno', 'preview_listo'],
  'EN PRODUCCIÓN': ['en_produccion', 'en_camino'],
  FINALIZADOS:     ['entregado'],
}

function orderNumber(id: string, date: string) {
  const year = new Date(date).getFullYear()
  return `ZK-${year}-${id.substring(0, 6).toUpperCase()}`
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab]   = useState<FilterTab>('TODOS')
  const [orders, setOrders]         = useState<OrderRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [viewMode, setViewMode]     = useState<'list' | 'grid'>('list')
  const [projectMap, setProjectMap] = useState<Record<string, { cover_thumbnail: { left: string; right: string } | null }>>({})

  const [authChecked, setAuthChecked]     = useState(false)
  const [editMode, setEditMode]           = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [deleting, setDeleting]           = useState(false)
  const [designerPopup, setDesignerPopup] = useState<string | null>(null)
  useEffect(() => {
    if (!designerPopup) return
    const close = () => setDesignerPopup(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [designerPopup])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email
      if (!email || !ADMIN_EMAILS.includes(email)) {
        router.replace('/login')
      } else {
        setAuthChecked(true)
      }
    })
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    async function fetchOrders() {
      const [res, { data: projects }] = await Promise.all([
        fetch('/api/admin/orders'),
        supabase.from('projects').select('order_id, cover_thumbnail').not('order_id', 'is', null),
      ])

      const map: Record<string, any> = {}
      for (const p of projects ?? []) {
        if (p.order_id) map[p.order_id] = p
      }
      setProjectMap(map)

      if (!res.ok) { console.error('Failed to fetch orders'); setLoading(false); return }
      const data = await res.json()

      const rows: OrderRow[] = (data ?? []).map((o: any) => ({
        id:                   o.id,
        order_number:         orderNumber(o.id, o.created_at),
        book_name:            o.book_name ?? 'Sin título',
        client_name:          o.client_name ?? '—',
        client_phone:         o.profiles?.whatsapp ? '+54 ' + o.profiles.whatsapp : '—',
        created_at:           new Date(o.created_at).toLocaleDateString('es-AR'),
        size:                 o.size ?? '—',
        status:               o.status,
        price_total:          o.price_total,
        price_paid:           o.price_paid,
        change_requests_used: o.change_requests_used ?? 0,
        designer:             (o.designer as Designer) ?? null,
      }))
      setOrders(rows)
      setLoading(false)
    }
    fetchOrders()
  }, [authChecked])

  async function deleteOrder(id: string, bookName: string) {
    if (!window.confirm(`¿Eliminar el pedido "${bookName}"? Esta acción no se puede deshacer.`)) return
    const res = await fetch('/api/admin/orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
    if (!res.ok) { alert('Error al eliminar'); return }
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(o => o.id)))
    }
  }

  async function deleteSelected() {
    if (!window.confirm(`¿Eliminar ${selected.size} pedido${selected.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    const ids = Array.from(selected)
    const res = await fetch('/api/admin/orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
    if (!res.ok) { setDeleting(false); alert('Error al eliminar'); return }
    setOrders(prev => prev.filter(o => !ids.includes(o.id)))
    setSelected(new Set())
    setEditMode(false)
    setDeleting(false)
  }

  async function selectDesigner(id: string, value: Designer) {
    await supabase.from('orders').update({ designer: value }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, designer: value } : o))
    setDesignerPopup(null)
  }

  function exitEditMode() {
    setEditMode(false)
    setSelected(new Set())
  }


  if (!authChecked) return <div className="dashboard-loading"><div className="dashboard-spinner" /></div>

  const filtered = orders.filter(o => {
    const allowed = STATUS_TAB[activeTab]
    return allowed === null || allowed.includes(o.status)
  })

  return (
    <div className="dash-root">
      {/* ── Topbar ─────────────────────────────── */}
      <Navbar hideLinks hideMisProyectos />

      {/* ── Sidebar ────────────────────────────── */}
      <aside className="dash-sidebar">
        <nav className="dash-nav-section">
          <p className="dash-nav-label">Libros</p>
          <ul>
            <li><Link href="/dashboard" className="dash-nav-link dash-nav-link--active">TODOS</Link></li>
            <li><Link href="/dashboard" className="dash-nav-link dash-nav-link--maika">MAIKA</Link></li>
            <li><Link href="/dashboard" className="dash-nav-link dash-nav-link--vicky">VICKY</Link></li>
            <li><Link href="/dashboard" className="dash-nav-link dash-nav-link--jose">JOSE</Link></li>
          </ul>
        </nav>
        <nav className="dash-nav-section">
          <p className="dash-nav-label">Otros</p>
          <ul>
            <li><Link href="/dashboard" className="dash-nav-link">Sheets</Link></li>
            <li><Link href="/dashboard" className="dash-nav-link">Catálogo</Link></li>
          </ul>
        </nav>
      </aside>

      {/* ── Right sidebar ──────────────────────── */}
      <aside className="dash-sidebar-right">
        <Link href="/nuevo" className="dash-btn-nuevo">NUEVO +</Link>
      </aside>

      {/* ── Main ───────────────────────────────── */}
      <main className="dash-main">

        <div className="dash-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`dash-tab ${activeTab === tab ? 'dash-tab--active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="dash-toolbar">
          <div className="dash-toolbar-actions">
            {editMode ? (
              <>
                {selected.size > 0 && (
                  <button className="dash-bulk-delete-btn" onClick={deleteSelected} disabled={deleting}>
                    {deleting ? 'Eliminando...' : `Eliminar (${selected.size})`}
                  </button>
                )}
                <button className="dash-edit-btn dash-edit-btn--cancel" onClick={exitEditMode}>Cancelar</button>
              </>
            ) : (
              <button className="dash-edit-btn" onClick={() => setEditMode(true)}>Editar</button>
            )}
          </div>
          <div className="dash-view-toggle">
            <button
              className={`dash-toggle-btn ${viewMode === 'list' ? 'dash-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista lista"
            >
              <List size={16} strokeWidth={1.8} />
            </button>
            <button
              className={`dash-toggle-btn ${viewMode === 'grid' ? 'dash-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista cuadrícula"
            >
              <LayoutGrid size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {loading ? (
          <p className="dash-loading">Cargando pedidos...</p>
        ) : filtered.length === 0 ? (
          <p className="dash-empty">No hay pedidos en esta categoría.</p>
        ) : viewMode === 'grid' ? (
          <div className="dash-grid">
            {filtered.map(order => {
              const proj = projectMap[order.id]
              const isSelected = selected.has(order.id)
              return editMode ? (
                <div
                  key={order.id}
                  className={`dash-grid-card dash-grid-card--selectable ${isSelected ? 'dash-grid-card--selected' : ''}`}
                  onClick={() => toggleSelect(order.id)}
                >
                  <div className="dash-grid-checkbox">{isSelected ? '✓' : ''}</div>
                  <div className="dash-grid-thumb-wrap">
                    <div className="dash-grid-thumb">
                      {proj?.cover_thumbnail ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proj.cover_thumbnail.left}  alt="" className="dash-grid-thumb-page" />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proj.cover_thumbnail.right} alt="" className="dash-grid-thumb-page" />
                        </>
                      ) : (
                        <div className="dash-grid-thumb-empty" />
                      )}
                    </div>
                    {order.status && (
                      <span className={`dash-badge dash-badge--${order.status} dash-grid-badge`}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    )}
                  </div>
                  <div className="dash-grid-info">
                    <div className="dash-grid-name">{order.book_name}</div>
                    <div className="dash-grid-meta">{order.client_name} · {order.created_at}</div>
                  </div>
                </div>
              ) : (
                <Link key={order.id} href={`/dashboard/pedidos/${order.id}`} className="dash-grid-card">
                  <div className="dash-grid-thumb-wrap">
                    <div className="dash-grid-thumb">
                      {proj?.cover_thumbnail ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proj.cover_thumbnail.left}  alt="" className="dash-grid-thumb-page" />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proj.cover_thumbnail.right} alt="" className="dash-grid-thumb-page" />
                        </>
                      ) : (
                        <div className="dash-grid-thumb-empty" />
                      )}
                    </div>
                    {order.status && (
                      <span className={`dash-badge dash-badge--${order.status} dash-grid-badge`}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    )}
                  </div>
                  <div className="dash-grid-info">
                    <div className="dash-grid-name">{order.book_name}</div>
                    <div className="dash-grid-meta">{order.client_name} · {order.created_at}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr className="dash-table-header-row">
                  <th className="dash-col-designer-th"></th>
                  {editMode && (
                    <th className="dash-col-check">
                      <input type="checkbox" onChange={toggleSelectAll} checked={selected.size === filtered.length && filtered.length > 0} />
                    </th>
                  )}
                  <th>PEDIDO</th>
                  <th>CLIENTE</th>
                  <th>TELÉFONO</th>
                  <th>LIBRO</th>
                  <th>FECHA</th>
                  <th>TAMAÑO</th>
                  <th>TOTAL</th>
                  <th>ESTADO</th>
                  {!editMode && <th>ABRIR</th>}
                  {!editMode && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr
                    key={order.id}
                    className={`dash-table-row ${editMode && selected.has(order.id) ? 'dash-table-row--selected' : ''}`}
                    onClick={editMode ? () => toggleSelect(order.id) : undefined}
                    style={editMode ? { cursor: 'pointer' } : undefined}
                  >
                    <td className="dash-col-designer-td" onClick={e => { e.stopPropagation(); setDesignerPopup(designerPopup === order.id ? null : order.id) }}>
                      <div className="dash-designer-dot" style={{ background: order.designer ? DESIGNER_COLORS[order.designer] : '#ddd' }} />
                      {designerPopup === order.id && (
                        <div className="dash-designer-popup" onClick={e => e.stopPropagation()}>
                          {(['maika', 'vicky', 'jose'] as Designer[]).map(d => (
                            <button key={d} className="dash-designer-option" onClick={() => selectDesigner(order.id, d)}>
                              <span className="dash-designer-option-dot" style={{ background: DESIGNER_COLORS[d!] }} />
                              {d}
                            </button>
                          ))}
                          <button className="dash-designer-option" onClick={() => selectDesigner(order.id, null)}>
                            <span className="dash-designer-option-dot" style={{ background: '#ddd' }} />
                            ninguna
                          </button>
                        </div>
                      )}
                    </td>
                    {editMode && (
                      <td className="dash-col-check">
                        <input type="checkbox" checked={selected.has(order.id)} onChange={() => toggleSelect(order.id)} onClick={e => e.stopPropagation()} />
                      </td>
                    )}
                    <td className="dash-cell-pedido">{order.order_number}</td>
                    <td>{order.client_name}</td>
                    <td className="dash-cell-phone">{order.client_phone}</td>
                    <td>{order.book_name}</td>
                    <td>{order.created_at}</td>
                    <td>{order.size}</td>
                    <td>{fmt(order.price_total)}</td>
                    <td>
                      <div className="dash-status-cell">
                        <span className={`dash-badge dash-badge--${order.status}`}>
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                        {order.change_requests_used > 0 && (
                          <span className="dash-change-dot">{order.change_requests_used}</span>
                        )}
                      </div>
                    </td>
                    {!editMode && (
                      <td>
                        <Link href={`/dashboard/pedidos/${order.id}`} className="dash-link-abrir">ABRIR</Link>
                      </td>
                    )}
                    {!editMode && (
                      <td>
                        <button
                          className="dash-delete-btn"
                          onClick={() => deleteOrder(order.id, order.book_name)}
                          aria-label="Eliminar pedido"
                        >
                          <Trash2 size={18} strokeWidth={1.5} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
