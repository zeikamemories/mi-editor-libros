'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Landing/Navbar/Navbar'
import './confirmado.css'

const STEPS = [
  { main: 'Subí tus fotos al proyecto',  sub: '',                                          arrow: true  },
  { main: 'Diseñamos en 48hs',           sub: 'Nos comunicamos por WhatsApp',              arrow: false },
  { main: 'Te enviamos el preview',      sub: 'Cuando esté finalizado, se manda a imprimir.', arrow: false },
]

function ConfirmadoContent() {
  const params  = useSearchParams()
  const orderId = params.get('order_id')
  const status  = params.get('status')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!orderId || status === 'failure') { setDone(true); return }

    async function confirm() {
      const newStatus = status === 'pending' ? 'pendiente_pago' : 'confirmado'

      const [{ data: orderData }] = await Promise.all([
        supabase.from('orders').select('book_name, size').eq('id', orderId!).single(),
        supabase.from('orders').update({
          status:       newStatus,
          status_dates: { confirmado: new Date().toISOString() },
        }).eq('id', orderId!),
      ])

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

  const isFailure = status === 'failure'
  const isPending = status === 'pending'

  return (
    <div className="conf">
      <Navbar hideLinks />

      {!done ? (
        <div className="conf__body">
          <div className="conf__check">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <p className="conf__subtitle">Procesando tu pedido…</p>
        </div>
      ) : isFailure ? (
        <div className="conf__body">
          <div className={`conf__check conf__check--error`}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <h1 className="conf__title">El pago no se completó</h1>
          <p className="conf__subtitle">Podés intentarlo de nuevo desde tu pedido.</p>
          <a className="conf__cta" href="/orden">Volver al pedido</a>
        </div>
      ) : (
        <div className="conf__body">
          <div className="conf__check">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>

          <h1 className="conf__title">
            {isPending ? '¡Pago en proceso!' : '¡Pedido confirmado!'}
          </h1>
          <p className="conf__subtitle">
            {isPending
              ? 'Tu pago está siendo procesado. Te avisamos cuando se confirme.'
              : 'Te mandamos el comprobante por WhatsApp. ¡Ahora te toca subir el material!'}
          </p>

          {!isPending && (
            <>
              <p className="conf__steps-label">Próximos pasos</p>
              <div className="conf__steps">
                {STEPS.map((step, i) => (
                  <div className="conf__step" key={i}>
                    <div className="conf__step-num">{i + 1}</div>
                    <div className="conf__step-text">
                      <span className="conf__step-main">{step.main}</span>
                      {step.sub && <span className="conf__step-sub">{step.sub}</span>}
                    </div>
                    {step.arrow && <span className="conf__step-arrow">›</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          <a className="conf__cta" href="/mis-proyectos">IR A MIS PROYECTOS</a>
        </div>
      )}
    </div>
  )
}

export default function ConfirmadoPage() {
  return <Suspense><ConfirmadoContent /></Suspense>
}
