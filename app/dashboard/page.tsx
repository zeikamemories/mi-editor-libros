'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import './dashboard.css'

const ADMIN_EMAILS = [
  'maikasacerdote@gmail.com',
  'zeika.memories@gmail.com',
]

type FilterTab = 'TODOS' | 'NUEVOS' | 'EN PROCESO' | 'FINALIZADOS'

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
}

const TABS: FilterTab[] = ['TODOS', 'NUEVOS', 'EN PROCESO', 'FINALIZADOS']

const STATUS_LABEL: Record<string, string> = {
  pendiente_pago:  'Nuevo',
  en_diseno:       'En proceso',
  preview_listo:   'En proceso',
  en_produccion:   'En proceso',
  en_camino:       'Finalizado',
  entregado:       'Finalizado',
}

const STATUS_TAB: Record<FilterTab, string[] | null> = {
  TODOS:          null,
  NUEVOS:         ['pendiente_pago'],
  'EN PROCESO':   ['en_diseno', 'preview_listo', 'en_produccion'],
  FINALIZADOS:    ['en_camino', 'entregado'],
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email
      if (!email || !ADMIN_EMAILS.includes(email)) {
        router.replace('/')
      }
    })
  }, [router])

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })

      if (error) { console.error(error); setLoading(false); return }

      const rows: OrderRow[] = (data ?? []).map((o: any) => ({
        id:           o.id,
        order_number: orderNumber(o.id, o.created_at),
        book_name:    o.book_name ?? 'Sin título',
        client_name:  o.profiles?.full_name ?? '—',
        created_at:   new Date(o.created_at).toLocaleDateString('es-AR'),
        size:         o.size ?? '—',
        status:       o.status,
        price_total:  o.price_total,
        price_paid:   o.price_paid,
      }))
      setOrders(rows)
      setLoading(false)
    }
    fetchOrders()
  }, [])

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

        {loading ? (
          <p className="dash-loading">Cargando pedidos...</p>
        ) : filtered.length === 0 ? (
          <p className="dash-empty">No hay pedidos en esta categoría.</p>
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
                    </td>
                    <td>
                      <Link href="/editor" className="dash-link-abrir">ABRIR</Link>
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
