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

const STEPS_REORDER = [
  { main: 'Usamos el diseño anterior',   sub: 'Tu libro ya está listo para imprimir.',     arrow: false },
  { main: 'Lo enviamos a producción',    sub: 'Nos comunicamos por WhatsApp.',              arrow: false },
  { main: 'Te enviamos el seguimiento',  sub: 'Andreani te lo lleva a casa.',               arrow: false },
]

function ConfirmadoContent() {
  const params       = useSearchParams()
  const orderId      = params.get('order_id') || (typeof window !== 'undefined' ? sessionStorage.getItem('zeika_pending_order_id') : null)
  const status       = params.get('status')
  const reorderFrom  = params.get('reorderFrom')
  const [done,       setDone]       = useState(false)
  const [isReorder,  setIsReorder]  = useState(false)

  useEffect(() => {
    if (!orderId || status === 'failure') { setDone(true); return }

    async function confirm() {
      const newStatus = status === 'pending' ? 'pendiente_pago' : 'confirmado'
      const now       = new Date().toISOString()

      const [{ data: orderData }, { data: { user } }] = await Promise.all([
        supabase.from('orders').select('book_name, size').eq('id', orderId!).single(),
        supabase.auth.getUser(),
        supabase.from('orders').update({
          status:       newStatus,
          status_dates: { confirmado: now },
        }).eq('id', orderId!),
      ])

      if (orderData) {
        const { data: existing } = await supabase
          .from('projects').select('id').eq('order_id', orderId!).maybeSingle()

        if (!existing) {
          if (reorderFrom) {
            // Copy design from original project
            const { data: srcProject } = await supabase
              .from('projects')
              .select('spreads, photos, total_spreads, cover_thumbnail')
              .eq('order_id', reorderFrom)
              .maybeSingle()

            await supabase.from('projects').insert({
              name:             orderData.book_name ?? 'Sin título',
              book_size:        orderData.size ?? 'vertical',
              total_spreads:    srcProject?.total_spreads ?? 13,
              photos:           srcProject?.photos        ?? [],
              spreads:          srcProject?.spreads       ?? {},
              cover_thumbnail:  srcProject?.cover_thumbnail ?? null,
              order_id:         orderId,
            })

            // Skip material phase — design already exists
            await supabase.from('orders').update({
              status:       'material_recibido',
              status_dates: { confirmado: now, material_recibido: now },
            }).eq('id', orderId!)

            setIsReorder(true)
          } else {
            const folderName = `Zeika - ${orderData.book_name ?? 'Sin título'} - ${orderId!.slice(0, 8).toUpperCase()}`
            const driveRes = await fetch('/api/create-drive-folder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                folderName,
                clientEmail: user?.email ?? null,
              }),
            })
            const driveData = driveRes.ok ? await driveRes.json() : {}
            const driveLink = driveData.folderUrl ?? null

            await Promise.all([
              supabase.from('projects').insert({
                name:          orderData.book_name ?? 'Sin título',
                book_size:     orderData.size ?? 'vertical',
                total_spreads: 13,
                photos:        [],
                spreads:       {},
                order_id:      orderId,
              }),
              driveLink
                ? supabase.from('orders').update({ drive_link: driveLink }).eq('id', orderId!)
                : Promise.resolve(),
            ])
          }
        }
      }
      setDone(true)
    }
    confirm()
  }, [orderId, status, reorderFrom])

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
              : isReorder
                ? 'Usamos el diseño de tu pedido anterior. ¡Ya lo mandamos a producción!'
                : 'Te mandamos el comprobante por WhatsApp. ¡Ahora te toca subir el material!'}
          </p>

          {!isPending && (
            <>
              <p className="conf__steps-label">Próximos pasos</p>
              <div className="conf__steps">
                {(isReorder ? STEPS_REORDER : STEPS).map((step, i) => (
                  {step.arrow ? (
                    <a className="conf__step conf__step--link" href={orderId ? `/mis-proyectos/${orderId}?open=material` : '/mis-proyectos'} key={i}>
                      <div className="conf__step-num">{i + 1}</div>
                      <div className="conf__step-text">
                        <span className="conf__step-main">{step.main}</span>
                        {step.sub && <span className="conf__step-sub">{step.sub}</span>}
                      </div>
                      <span className="conf__step-arrow">›</span>
                    </a>
                  ) : (
                    <div className="conf__step" key={i}>
                      <div className="conf__step-num">{i + 1}</div>
                      <div className="conf__step-text">
                        <span className="conf__step-main">{step.main}</span>
                        {step.sub && <span className="conf__step-sub">{step.sub}</span>}
                      </div>
                    </div>
                  )}
                ))}
              </div>
            </>
          )}

          <a className="conf__cta" href={orderId ? `/mis-proyectos/${orderId}?open=material` : '/mis-proyectos'}>IR A MI PROYECTO</a>
        </div>
      )}
    </div>
  )
}

export default function ConfirmadoPage() {
  return <Suspense><ConfirmadoContent /></Suspense>
}
