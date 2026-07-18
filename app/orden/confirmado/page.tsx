'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '../../components/Landing/Navbar/Navbar'
import './confirmado.css'

const STEPS = [
  { main: 'Subí tus fotos y texto al proyecto', sub: '',                                                          arrow: true  },
  { main: 'Recibís tu primera propuesta',       sub: 'En 48hs hábiles desde que cargás el material.',             arrow: false },
  { main: 'Revisás y nos contás qué cambiar',   sub: 'Tenés 3 rondas de cambio; te devolvemos cada ajuste en menos de 24hs.', arrow: false },
  { main: 'Aprobás el diseño final',            sub: 'Ahí lo mandamos a producción.',                             arrow: false },
]

const STEPS_REORDER = [
  { main: 'Usamos el diseño anterior',   sub: 'Tu libro ya está listo para imprimir.',     arrow: false },
  { main: 'Lo enviamos a producción',    sub: 'Nos comunicamos por WhatsApp.',              arrow: false },
  { main: 'Te enviamos el seguimiento',  sub: 'Andreani te lo lleva a casa.',               arrow: false },
]

const STEPS_VINO = [
  { main: 'Te contactamos por WhatsApp', sub: 'Coordinamos el diseño de tu etiqueta.',      arrow: false },
  { main: 'Recibís tu primera propuesta', sub: 'En 48hs hábiles.',                          arrow: false },
  { main: 'Revisás y aprobás el diseño', sub: '',                                           arrow: false },
  { main: 'Lo mandamos a producción',    sub: '',                                           arrow: false },
]

function ConfirmadoContent() {
  const params       = useSearchParams()
  const orderId      = params.get('order_id') || (typeof window !== 'undefined' ? sessionStorage.getItem('zeika_pending_order_id') : null)
  const status       = params.get('status')
  const paymentId    = params.get('payment_id') || params.get('collection_id')
  const reorderFrom  = params.get('reorderFrom')
  const [done,       setDone]       = useState(false)
  const [isReorder,  setIsReorder]  = useState(false)
  const [isVino,     setIsVino]     = useState(false)

  useEffect(() => {
    if (!orderId) { setDone(true); return }

    // El estado del pedido (confirmado / en diseño / etc.) solo lo escribe el servidor,
    // después de verificar el pago contra la API real de MercadoPago — acá el browser
    // nunca actualiza `orders` directamente (ver app/api/confirm-payment/route.ts).
    async function confirm() {
      const res = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, paymentId, reorderFrom }),
      })
      const data = await res.json().catch(() => ({}))
      setIsVino(Boolean(data.isVino))
      setIsReorder(Boolean(data.isReorder))
      setDone(true)
    }
    confirm()
  }, [orderId, status, paymentId, reorderFrom])

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
          <a className="conf__cta" href={isVino ? '/orden-vino' : '/orden'}>Volver al pedido</a>
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
              : isVino
                ? 'Gracias por tu compra. Te contactamos por WhatsApp para definir el diseño de tu etiqueta.'
                : isReorder
                  ? 'Usamos el diseño de tu pedido anterior. ¡Ya lo mandamos a producción!'
                  : 'Gracias por tu compra. Cargá tu material dentro del proyecto, nosotras diseñamos.'}
          </p>

          {!isPending && (
            <>
              <p className="conf__steps-label">Próximos pasos</p>
              <div className="conf__steps">
                {(isVino ? STEPS_VINO : isReorder ? STEPS_REORDER : STEPS).map((step, i) =>
                  step.arrow ? (
                    <a key={i} className="conf__step conf__step--link" href={orderId ? `/mis-proyectos/${orderId}?open=material` : '/mis-proyectos'}>
                      <div className="conf__step-num">{i + 1}</div>
                      <div className="conf__step-text">
                        <span className="conf__step-main">{step.main}</span>
                        {step.sub && <span className="conf__step-sub">{step.sub}</span>}
                      </div>
                      <span className="conf__step-arrow">›</span>
                    </a>
                  ) : (
                    <div key={i} className="conf__step">
                      <div className="conf__step-num">{i + 1}</div>
                      <div className="conf__step-text">
                        <span className="conf__step-main">{step.main}</span>
                        {step.sub && <span className="conf__step-sub">{step.sub}</span>}
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}

          <a className="conf__cta" href={orderId ? `/mis-proyectos/${orderId}${isVino ? '' : '?open=material'}` : '/mis-proyectos'}>IR A MI PROYECTO</a>
        </div>
      )}
    </div>
  )
}

export default function ConfirmadoPage() {
  return <Suspense><ConfirmadoContent /></Suspense>
}
