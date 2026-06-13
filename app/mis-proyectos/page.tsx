'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import './mis-proyectos.css'

interface Order {
  id: string
  book_name: string
  size: string
  status: string
  price_total: number
  created_at: string
}

const SIZE_NAMES: Record<string, string> = {
  chico_h:   'Chico Horizontal · 21×14,8 cm',
  mediano_h: 'Mediano Horizontal · 28×21,6 cm',
  grande_h:  'Grande Horizontal · 41×29 cm',
  vertical:  'Vertical · 28×21,6 cm',
  cuadrado:  'Cuadrado · 29×29 cm',
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

// done = fully completed steps. In-progress dot = dot[done] if status !== 'entregado'
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

const ACTION_LABEL: Record<string, string> = {
  preview_listo:  'Ver preview →',
  en_produccion:  'Ver →',
  en_camino:      'Ver →',
  entregado:      'Ver →',
}

function orderNumber(id: string, date: string) {
  return `ZK-${new Date(date).getFullYear()}-${id.substring(0, 6).toUpperCase()}`
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

function ProgressDots({ status }: { status: string }) {
  const done = STEP_DONE[status] ?? 0
  const allDone = status === 'entregado'
  return (
    <div className="mp-dots">
      {Array.from({ length: 6 }, (_, i) => {
        const filled = i < done
        const current = !allDone && i === done
        return (
          <span
            key={i}
            className={`mp-dot ${filled ? 'mp-dot--filled' : current ? 'mp-dot--current' : 'mp-dot--grey'}`}
          />
        )
      })}
    </div>
  )
}

function UserAvatar({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initial = name ? name[0].toUpperCase() : '?'
  const firstName = name ? name.split(' ')[0].toUpperCase() : ''

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="mp-user" ref={ref}>
      <button className="mp-user-btn" onClick={() => setOpen(o => !o)} aria-label="Menú de usuario">
        <span className="mp-user-name">{firstName}</span>
        <div className="mp-avatar">{initial}</div>
      </button>
      {open && (
        <div className="mp-user-dropdown">
          <button
            className="mp-user-dropdown-item"
            onClick={() => { setOpen(false); onSignOut() }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default function MisProyectosPage() {
  const router = useRouter()
  const [orders,   setOrders]   = useState<Order[]>([])
  const [loading,  setLoading]  = useState(true)
  const [userName, setUserName] = useState('')

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace('/orden'); return }
      const meta = session.user.user_metadata
      setUserName(meta?.full_name || meta?.name || session.user.email?.split('@')[0] || '')
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

  return (
    <div className="mp-root">
      <header className="mp-header">
        <Link href="/" className="mp-header-logo">
          <Image src="/LogoZeika.png" alt="Zeika" width={60} height={60} />
        </Link>
        <span className="mp-header-title">Mis Proyectos</span>
        <UserAvatar name={userName} onSignOut={signOut} />
      </header>

      <main className="mp-main">
        {orders.map(order => {
          const action = ACTION_LABEL[order.status] ?? 'Ver proyecto →'
          return (
            <Link key={order.id} href={`/mis-proyectos/${order.id}`} className={`mp-card mp-card--${order.status}`}>
              <div className="mp-card-top">
                <h2 className="mp-card-name">{order.book_name}</h2>
                <span className="mp-card-number">{orderNumber(order.id, order.created_at)}</span>
              </div>
              <span className={`mp-badge mp-badge--${order.status}`}>
                {STATUS_BADGE[order.status] ?? order.status}
              </span>
              {order.status !== 'entregado' && <ProgressDots status={order.status} />}
              <div className="mp-card-bottom">
                <span className="mp-card-size">{SIZE_NAMES[order.size] ?? order.size}</span>
                <span className="mp-card-action">{action}</span>
              </div>
            </Link>
          )
        })}

        <Link href="/orden" className="mp-card-new">
          <span className="mp-card-new-label">+ Nuevo proyecto</span>
        </Link>
      </main>
    </div>
  )
}
