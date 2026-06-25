'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Landing/Navbar/Navbar'
import './mis-proyectos.css'

interface Order {
  id: string
  book_name: string
  size: string
  status: string
  price_total: number
  created_at: string
}

const SIZE_SHORT: Record<string, string> = {
  chico_h:   'Chico H 21×14,8 cm',
  mediano_h: 'Mediano H 28×21,6 cm',
  grande_h:  'Grande H 41×29 cm',
  vertical:  'Vertical 28×21,6 cm',
  cuadrado:  'Cuadrado 29×29 cm',
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

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export default function MisProyectosPage() {
  const router = useRouter()
  const [orders,     setOrders]     = useState<Order[]>([])
  const [projectMap, setProjectMap] = useState<Record<string, { left?: string; right?: string }>>({})
  const [loading,    setLoading]    = useState(true)
  const [userName,   setUserName]   = useState('')
  const [userEmail,  setUserEmail]  = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.replace('/orden'); return }
      const meta = session.user.user_metadata
      setUserName(meta?.full_name || meta?.name || session.user.email?.split('@')[0] || '')
      setUserEmail(session.user.email ?? '')

      const [{ data: ordersData }, { data: projectsData }] = await Promise.all([
        supabase
          .from('orders')
          .select('id, book_name, size, status, price_total, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('order_id, cover_thumbnail')
          .not('order_id', 'is', null),
      ])

      setOrders((ordersData ?? []) as Order[])

      const map: Record<string, { left?: string; right?: string }> = {}
      for (const p of projectsData ?? []) {
        if (p.order_id && p.cover_thumbnail) map[p.order_id] = p.cover_thumbnail
      }
      setProjectMap(map)
      setLoading(false)
    })
  }, [router])

  if (loading) return (
    <div className="mp-loading"><div className="mp-spinner" /></div>
  )

  const firstName = userName.split(' ')[0]

  return (
    <div className="mp-root">
      <Navbar hideLinks />

      <div className="mp-user-strip">
        <div className="mp-user-strip__initial">{firstName[0]?.toUpperCase() ?? '?'}</div>
        <div className="mp-user-strip__info">
          <p className="mp-user-strip__name">{userName}</p>
          <p className="mp-user-strip__email">{userEmail}</p>
        </div>
      </div>

      <main className="mp-main">
        <h1 className="mp-title">Mis proyectos</h1>

        <div className="mp-grid">
          {orders.map(order => {
            const thumb = projectMap[order.id]
            return (
              <a
                key={order.id}
                href={`/mis-proyectos/${order.id}`}
                className={`mp-card${order.status === 'entregado' ? ' mp-card--delivered' : ''}`}
              >
                <div className="mp-card__thumb-wrap">
                  <div className="mp-card__thumb">
                    {thumb ? (
                      <>
                        {thumb.left && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb.left} alt="" className="mp-card__thumb-page" />
                        )}
                        {thumb.right && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb.right} alt="" className="mp-card__thumb-page" />
                        )}
                      </>
                    ) : (
                      <div className="mp-card__thumb-empty" />
                    )}
                  </div>
                  <span className={`mp-badge mp-badge--${order.status} mp-card__badge`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
                <div className="mp-card__info">
                  <span className="mp-card__name">{order.book_name}</span>
                  <div className="mp-card__info-bottom">
                    <span className="mp-card__format">{SIZE_SHORT[order.size] ?? order.size}</span>
                    <span className="mp-card__price-pill">{fmt(order.price_total)}</span>
                  </div>
                </div>
              </a>
            )
          })}
          <a href="/#productos" className="mp-new">
            <span className="mp-new__plus">+</span>
            <span className="mp-new__label">Nuevo Proyecto</span>
          </a>
        </div>
      </main>
    </div>
  )
}
