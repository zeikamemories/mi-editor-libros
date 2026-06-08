'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import '../orden.css'

export default function ConfirmadoPage() {
  const params  = useSearchParams()
  const orderId = params.get('order_id')
  const status  = params.get('status') // null = success, 'failure', 'pending'
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!orderId || status === 'failure') { setDone(true); return }

    async function confirm() {
      const newStatus = status === 'pending' ? 'pendiente_pago' : 'confirmado'

      // Fetch order data + update status
      const [{ data: orderData }] = await Promise.all([
        supabase.from('orders').select('book_name, size').eq('id', orderId!).single(),
        supabase.from('orders').update({
          status:       newStatus,
          status_dates: { confirmado: new Date().toISOString() },
        }).eq('id', orderId!),
      ])

      // Auto-create project linked to this order (only on successful payment)
      if (newStatus === 'confirmado' && orderData) {
        const { data: existing } = await supabase
          .from('projects').select('id').eq('order_id', orderId!).maybeSingle()
        if (!existing) {
          await supabase.from('projects').insert({
            name:          orderData.book_name ?? 'Sin título',
            book_size:     orderData.size ?? 'vertical',
            total_spreads: 13,
            photos:        [],
            spreads:       {},
            order_id:      orderId,
          })
        }
      }
      setDone(true)
    }
    confirm()
  }, [orderId, status])

  if (!done) {
    return <div className="orden-loading"><div className="orden-spinner" /></div>
  }

  if (status === 'failure') {
    return (
      <div className="orden">
        <div className="orden__confirmed">
          <div className="orden__check-circle" style={{ background: '#c0392b' }}>✕</div>
          <h2 className="orden__step-title">El pago no se completó</h2>
          <p className="orden__step-sub">Podés intentarlo de nuevo.</p>
          <a className="orden__black-btn" href="/orden">Volver al pedido</a>
        </div>
      </div>
    )
  }

  return (
    <div className="orden">
      <div className="orden__confirmed">
        <div className="orden__check-circle">✓</div>
        <h2 className="orden__step-title">
          {status === 'pending' ? '¡Pago en proceso!' : '¡Pedido confirmado!'}
        </h2>
        <p className="orden__step-sub">
          {status === 'pending'
            ? 'Tu pago está siendo procesado. Te avisamos cuando se confirme.'
            : 'Te mandamos el comprobante por WhatsApp. Ahora subí tu material.'}
        </p>
        {status !== 'pending' && (
          <ol className="orden__next-steps">
            <li>Subí tus fotos al proyecto</li>
            <li>Diseñamos en menos de 48 hs</li>
            <li>Te enviamos el preview</li>
          </ol>
        )}
        <a className="orden__black-btn" href="/mis-proyectos">Ir a mi proyecto</a>
      </div>
    </div>
  )
}
