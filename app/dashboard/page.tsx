'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, List, LayoutGrid } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './dashboard.css'

const ADMIN_EMAILS = [
  'maikasacerdote@gmail.com',
  'zeika.memories@gmail.com',
]

type FilterTab = 'TODOS' | 'NUEVOS' | 'EN PROCESO' | 'EN PRODUCCIÓN' | 'FINALIZADOS'

interface OrderRow {
  id: string
  order_number: string
  book_name: string
  client_name: string
  created_at: string
  size: string
  status: string
  price_total: number
  price_paid: number
  change_requests_used: number
}

const TABS: FilterTab[] = ['TODOS', 'NUEVOS', 'EN PROCESO', 'EN PRODUCCIÓN', 'FINALIZADOS']

const STATUS_LABEL: Record<string, string> = {
  pendiente_pago:    'Pago pend.',
  confirmado:        'Confirmado',
  material_recibido: 'Mat. recibido',
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

  const [authChecked, setAuthChecked] = useState(false)

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
      const [{ data, error }, { data: projects }] = await Promise.all([
        supabase.from('orders').select('*, profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('projects').select('order_id, cover_thumbnail').not('order_id', 'is', null),
      ])

      const map: Record<string, any> = {}
      for (const p of projects ?? []) {
        if (p.order_id) map[p.order_id] = p
      }
      setProjectMap(map)

      if (error) { console.error(error); setLoading(false); return }

      const rows: OrderRow[] = (data ?? []).map((o: any) => ({
        id:                   o.id,
        order_number:         orderNumber(o.id, o.created_at),
        book_name:            o.book_name ?? 'Sin título',
        client_name:          o.profiles?.full_name ?? '—',
        created_at:           new Date(o.created_at).toLocaleDateString('es-AR'),
        size:                 o.size ?? '—',
        status:               o.status,
        price_total:          o.price_total,
        price_paid:           o.price_paid,
        change_requests_used: o.change_requests_used ?? 0,
      }))
      setOrders(rows)
      setLoading(false)
    }
    fetchOrders()
  }, [authChecked])

  async function deleteOrder(id: string, bookName: string) {
    if (!window.confirm(`¿Eliminar el pedido "${bookName}"? Esta acción no se puede deshacer.`)) return
    await supabase.from('orders').delete().eq('id', id)
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  if (!authChecked) return <div className="dashboard-loading"><div className="dashboard-spinner" /></div>

  const filtered = orders.filter(o => {
    const allowed = STATUS_TAB[activeTab]
    return allowed === null || allowed.includes(o.status)
  })

  return (
    <div className="dash-root">
      {/* ── Topbar ─────────────────────────────── */}
      <header className="dash-topbar">
        <Image src="/LogoZeika.png" alt="Zeika" width={36} height={36} />
        <span className="dash-topbar-spacer" />
        <span className="dash-topbar-username">MAIKA</span>
        <div className="dash-avatar">M</div>
      </header>

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
        <p className="dash-greeting">Hola Maika! Hoy va a ser un gran día 🌿</p>

        <div className="dash-toolbar">
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
              return (
                <Link key={order.id} href={`/dashboard/pedidos/${order.id}`} className="dash-grid-card">
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
                  <th>PEDIDO</th>
                  <th>CLIENTE</th>
                  <th>LIBRO</th>
                  <th>FECHA</th>
                  <th>TAMAÑO</th>
                  <th>TOTAL</th>
                  <th>ESTADO</th>
                  <th>ABRIR</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="dash-table-row">
                    <td className="dash-cell-pedido">{order.order_number}</td>
                    <td>{order.client_name}</td>
                    <td>{order.book_name}</td>
                    <td>{order.created_at}</td>
                    <td>{order.size}</td>
                    <td>{fmt(order.price_total)}</td>
                    <td>
                      <span className={`dash-badge dash-badge--${order.status}`}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      {order.change_requests_used > 0 && (
                        <span className="dash-change-badge">{order.change_requests_used} cambio{order.change_requests_used > 1 ? 's' : ''}</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/dashboard/pedidos/${order.id}`} className="dash-link-abrir">ABRIR</Link>
                    </td>
                    <td>
                      <button
                        className="dash-delete-btn"
                        onClick={() => deleteOrder(order.id, order.book_name)}
                        aria-label="Eliminar pedido"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </td>
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
