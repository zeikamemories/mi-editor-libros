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
  chico_h:   'Chico Horizontal 21×14,8 cm',
  mediano_h: 'Mediano Horizontal 28×21,6 cm',
  grande_h:  'Grande Horizontal 41×29 cm',
  vertical:  'Vertical 28×21,6 cm',
  cuadrado:  'Cuadrado 29×29 cm',
}

const STATUS_LABEL: Record<string, string> = {
  pendiente_pago:    'Pago pendiente',
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
  const [orders,    setOrders]    = useState<Order[]>([])
  const [loading,   setLoading]   = useState(true)
  const [userName,  setUserName]  = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace('/orden'); return }
      const meta  = session.user.user_metadata
      const name  = meta?.full_name || meta?.name || session.user.email?.split('@')[0] || ''
      setUserName(name)
      setUserEmail(session.user.email ?? '')

      supabase
        .from('orders')
        .select('id, book_name, size, status, price_total, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setOrders((data ?? []) as Order[])
          setLoading(false)
        })
    })
  }, [router])

  if (loading) return (
    <div className="mp-loading"><div className="mp-spinner" /></div>
  )

  const firstName = userName.split(' ')[0]

  return (
    <div className="mp-root">
      <Navbar hideLinks />

      {/* User strip */}
      <div className="mp-user-strip">
        <div className="mp-user-strip__initial">{firstName[0]?.toUpperCase() ?? '?'}</div>
        <div className="mp-user-strip__info">
          <p className="mp-user-strip__name">{userName}</p>
          <p className="mp-user-strip__email">{userEmail}</p>
        </div>
      </div>

      <main className="mp-main">
        <h1 className="mp-title">Mis proyectos</h1>

        <div className="mp-list">
          {orders.map(order => {
            const delivered = order.status === 'entregado'
            return (
              <a
                key={order.id}
                href={`/mis-proyectos/${order.id}`}
                className={`mp-card${delivered ? ' mp-card--delivered' : ''}`}
              >
                <div className="mp-card__row1">
                  <span className="mp-card__name">{order.book_name}</span>
                  <div className="mp-card__row1-right">
                    <span className={`mp-badge mp-badge--${order.status}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <span className="mp-card__arrow">›</span>
                  </div>
                </div>
                {!delivered && (
                  <div className="mp-card__row2">
                    <span className="mp-card__format">{SIZE_SHORT[order.size] ?? order.size}</span>
                    <span className="mp-card__price-pill">{fmt(order.price_total)}</span>
                  </div>
                )}
              </a>
            )
          })}
        </div>

        <a href="/orden" className="mp-new">
          <span className="mp-new__plus">+</span>
          <span className="mp-new__label">Nuevo Proyecto</span>
        </a>
      </main>
    </div>
  )
}
