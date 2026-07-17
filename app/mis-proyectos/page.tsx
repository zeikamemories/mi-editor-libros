'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Landing/Navbar/Navbar'
import { REORDER_UNIT_PRICE, copiesDiscount, CARTA_PRICE, computeVinoTotal, VINO_CANTIDAD_MAX } from '../config/pricing'
import './mis-proyectos.css'

interface Order {
  id: string
  book_name: string
  size: string | null
  status: string
  price_total: number
  price_paid: number
  product_type: string | null
  card_type: string | null
  card_photo_url: string | null
  variedad: string | null
  diseno_tipo: string | null
  copies: number | null
  vino_design_url: string | null
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
  preview_listo:     'Revisar preview',
  aprobado:          'Listo para comprar',
  en_produccion:     'En producción',
  en_camino:         'En camino',
  entregado:         'Entregado',
}

// preview_listo = el staff ya subió el preview, pero el cliente todavía no lo aprobó — sigue en
// "en proceso". Recién pasa a "Listos para comprar" cuando el cliente aprueba (status 'aprobado').
const EN_PROCESO_STATUSES  = ['pendiente_pago', 'confirmado', 'material_recibido', 'en_diseno', 'preview_listo']
const REALIZADAS_STATUSES  = ['en_produccion', 'en_camino', 'entregado']

type Tab = 'proceso' | 'listos' | 'realizadas'

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

function orderName(o: Order) {
  return o.product_type === 'cartas' ? `Cartas — ${o.book_name}` : o.book_name
}

function MisProyectosContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [orders,     setOrders]     = useState<Order[]>([])
  const [projectMap, setProjectMap] = useState<Record<string, { left?: string; right?: string }>>({})
  const [loading,    setLoading]    = useState(true)
  const [userName,   setUserName]   = useState('')
  const [userEmail,  setUserEmail]  = useState('')
  const [tab,        setTab]        = useState<Tab>('proceso')

  // "Listos para comprar" selection + per-row config
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [rowCopies,   setRowCopies]   = useState<Record<string, number>>({})
  const [rowCardType, setRowCardType] = useState<Record<string, 'truco' | 'poker'>>({})
  const [isReorder,   setIsReorder]   = useState(false)
  const [paying,      setPaying]      = useState(false)

  // Entrega compartida (una sola vez para todo el combo)
  const [deliveryType,    setDeliveryType]    = useState<'andreani' | 'pickup'>('andreani')
  const [pais,      setPais]      = useState('')
  const [provincia, setProvincia] = useState('')
  const [ciudad,    setCiudad]    = useState('')
  const [calle,     setCalle]     = useState('')
  const [numero,    setNumero]    = useState('')
  const [piso,      setPiso]      = useState('')
  const [depto,     setDepto]     = useState('')
  const [cp,        setCp]        = useState('')
  const [shippingPrice,   setShippingPrice]   = useState<number | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'listos' || tabParam === 'proceso' || tabParam === 'realizadas') setTab(tabParam)

    const itemParam    = searchParams.get('item')
    const reorderParam = searchParams.get('reorder') === 'true'
    if (itemParam) {
      setTab('listos')
      setSelected(new Set([itemParam]))
      setIsReorder(reorderParam)
    }
  }, [searchParams])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.replace('/orden'); return }
      const meta = session.user.user_metadata
      setUserName(meta?.full_name || meta?.name || session.user.email?.split('@')[0] || '')
      setUserEmail(session.user.email ?? '')

      const [{ data: ordersData }, { data: projectsData }] = await Promise.all([
        supabase
          .from('orders')
          .select('id, book_name, size, status, price_total, price_paid, product_type, card_type, card_photo_url, variedad, diseno_tipo, copies, vino_design_url, created_at')
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

  // Cotización de envío — mismo mecanismo que usaba /pagar
  useEffect(() => {
    if (deliveryType !== 'andreani') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = cp.trim()
    if (!/^\d{4}$/.test(trimmed)) { setShippingPrice(null); return }
    setShippingLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/shipping-quote?cp=${trimmed}`)
        const data = await res.json()
        setShippingPrice(res.ok ? (data.price as number) : null)
      } catch {
        setShippingPrice(null)
      } finally {
        setShippingLoading(false)
      }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [cp, deliveryType])

  if (loading) return (
    <div className="mp-loading"><div className="mp-spinner" /></div>
  )

  const firstName = userName.split(' ')[0]

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const proceso    = orders.filter(o => EN_PROCESO_STATUSES.includes(o.status))
  const listos     = orders.filter(o => o.status === 'aprobado')
  const realizadas = orders.filter(o => REALIZADAS_STATUSES.includes(o.status))

  function rowCopiesFor(o: Order) {
    return rowCopies[o.id] ?? o.copies ?? 1
  }

  function computeRowPrice(o: Order) {
    const copies = rowCopiesFor(o)
    if (o.product_type === 'cartas') return CARTA_PRICE * copies
    if (o.product_type === 'vino') {
      return computeVinoTotal(o.variedad ?? '', o.diseno_tipo ?? '', copies) ?? o.price_total
    }
    const unitPrice = REORDER_UNIT_PRICE[o.size ?? ''] ?? o.price_total
    return copies * unitPrice * copiesDiscount(copies)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        // El retiro en fábrica no aplica a vinos — si se agrega uno, forzamos envío.
        const order = orders.find(o => o.id === id)
        if (order?.product_type === 'vino') setDeliveryType('andreani')
      }
      return next
    })
  }

  const selectedOrders = listos.filter(o => selected.has(o.id))
  // El retiro en fábrica no aplica a vinos — si hay uno seleccionado, solo se puede envío.
  const hasVino         = selectedOrders.some(o => o.product_type === 'vino')
  const subtotalSum    = selectedOrders.reduce((sum, o) => sum + computeRowPrice(o), 0)
  const paidSum        = isReorder ? 0 : selectedOrders.reduce((sum, o) => sum + o.price_paid, 0)
  const shippingTotal  = deliveryType === 'andreani' ? (shippingPrice ?? 0) : 0
  const payNow         = Math.round(subtotalSum - paidSum + shippingTotal)
  const shippingLabel  = shippingLoading ? 'Calculando...' : shippingPrice !== null ? fmt(shippingPrice) : 'A calcular'
  const shippingReady  = deliveryType === 'pickup' || shippingPrice !== null

  const addressFilled = deliveryType === 'pickup' || (
    pais.trim() && provincia.trim() && ciudad.trim() && calle.trim() && numero.trim() && cp.trim()
  )

  const fullAddress = [
    calle, numero, piso && `Piso ${piso}`, depto && `Depto ${depto}`,
    ciudad, provincia, pais, cp && `CP ${cp}`,
  ].filter(Boolean).join(', ')

  async function handlePay() {
    if (selected.size === 0 || !addressFilled) return
    setPaying(true)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const orderIds = [...selected]

    const res = await fetch('/api/payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orders: selectedOrders.map(o => ({
          orderId:  o.id,
          copies:   rowCopiesFor(o),
          cardType: o.product_type === 'cartas' ? (rowCardType[o.id] ?? o.card_type ?? 'poker') : undefined,
        })),
        deliveryType,
        cp:      deliveryType === 'andreani' ? cp : undefined,
        address: deliveryType === 'andreani' ? fullAddress : 'Retiro en fábrica',
        isReorder,
        successUrl: `${siteUrl}/mis-proyectos/confirmado?order_ids=${orderIds.join(',')}`,
        failureUrl: `${siteUrl}/mis-proyectos?tab=listos&error=1`,
      }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setPaying(false)
  }

  function renderGrid(list: Order[]) {
    return (
      <div className="mp-grid">
        {list.map(order => {
          const thumb  = projectMap[order.id]
          const isVino = order.product_type === 'vino'
          const photo  = order.product_type === 'cartas' ? order.card_photo_url : isVino ? order.vino_design_url : null
          return (
            <a
              key={order.id}
              href={`/mis-proyectos/${order.id}`}
              className={`mp-card${order.status === 'entregado' ? ' mp-card--delivered' : ''}`}
            >
              <div className="mp-card__thumb-wrap">
                <div className={`mp-card__thumb${isVino ? ' mp-card__thumb--vino' : ''}`}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className={`mp-card__thumb-page${isVino ? ' mp-card__thumb-page--vino' : ''}`} />
                  ) : thumb ? (
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
                <span className="mp-card__name">{orderName(order)}</span>
                <div className="mp-card__info-bottom">
                  <span className="mp-card__format">
                    {order.product_type === 'cartas' ? 'Cartas personalizadas'
                      : isVino ? `Vino ${order.variedad === 'blanco' ? 'Blanco' : 'Tinto'}`
                      : (SIZE_SHORT[order.size ?? ''] ?? order.size)}
                  </span>
                  <span className="mp-card__price-pill">{fmt(order.price_total)}</span>
                </div>
              </div>
            </a>
          )
        })}
        {tab === 'proceso' && (
          <a href="/#productos" className="mp-new">
            <span className="mp-new__plus">+</span>
            <span className="mp-new__label">Nuevo Proyecto</span>
          </a>
        )}
      </div>
    )
  }

  function renderListos() {
    if (listos.length === 0) {
      return <p className="mp-empty">No tenés proyectos listos para comprar todavía.</p>
    }
    return (
      <>
        <div className="mp-listos-list">
          {listos.map(order => {
            const checked = selected.has(order.id)
            const copies  = rowCopiesFor(order)
            const price   = computeRowPrice(order)
            const isCarta = order.product_type === 'cartas'
            const isVino  = order.product_type === 'vino'
            const cardType = rowCardType[order.id] ?? order.card_type ?? 'poker'
            return (
              <div key={order.id} className={`mp-listos-row${checked ? ' mp-listos-row--selected' : ''}`}>
                <button
                  className={`mp-listos-check${checked ? ' mp-listos-check--on' : ''}`}
                  onClick={() => toggleSelect(order.id)}
                  aria-label="Seleccionar"
                />

                <div className="mp-listos-thumb">
                  {isCarta && order.card_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={order.card_photo_url} alt="" className="mp-listos-thumb-img" />
                  ) : projectMap[order.id]?.left ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={projectMap[order.id].left} alt="" className="mp-listos-thumb-img" />
                  ) : (
                    <div className="mp-card__thumb-empty" />
                  )}
                </div>

                <div className="mp-listos-info">
                  <span className="mp-listos-name">{orderName(order)}</span>
                  <span className="mp-listos-format">
                    {isCarta ? 'Mazo de cartas' : isVino ? `Vino ${order.variedad ?? ''}` : (SIZE_SHORT[order.size ?? ''] ?? order.size)}
                  </span>

                  {isCarta && (
                    <div className="mp-cardtype-toggle">
                      <button
                        className={`mp-cardtype-btn${cardType === 'truco' ? ' mp-cardtype-btn--selected' : ''}`}
                        onClick={() => setRowCardType(prev => ({ ...prev, [order.id]: 'truco' }))}
                      >
                        Truco
                      </button>
                      <button
                        className={`mp-cardtype-btn${cardType === 'poker' ? ' mp-cardtype-btn--selected' : ''}`}
                        onClick={() => setRowCardType(prev => ({ ...prev, [order.id]: 'poker' }))}
                      >
                        Poker
                      </button>
                    </div>
                  )}

                  {isVino ? (
                    <div className="mpag-counter mp-listos-counter">
                      <button
                        className="mpag-counter-btn"
                        onClick={() => setRowCopies(prev => ({ ...prev, [order.id]: Math.max(1, copies - 1) }))}
                        disabled={copies <= 1}
                      >−</button>
                      <span className="mpag-counter-num">{copies} botella{copies > 1 ? 's' : ''}</span>
                      <button
                        className="mpag-counter-btn"
                        onClick={() => setRowCopies(prev => ({ ...prev, [order.id]: Math.min(VINO_CANTIDAD_MAX, copies + 1) }))}
                        disabled={copies >= VINO_CANTIDAD_MAX}
                      >+</button>
                    </div>
                  ) : (
                  <div className="mpag-counter mp-listos-counter">
                    <button
                      className="mpag-counter-btn"
                      onClick={() => setRowCopies(prev => ({ ...prev, [order.id]: Math.max(1, copies - 1) }))}
                      disabled={copies <= 1}
                    >−</button>
                    <span className="mpag-counter-num">{copies}</span>
                    <button
                      className="mpag-counter-btn"
                      onClick={() => setRowCopies(prev => ({ ...prev, [order.id]: copies + 1 }))}
                    >+</button>
                  </div>
                  )}
                </div>

                <span className="mp-listos-price">{fmt(price)}</span>
              </div>
            )
          })}
        </div>

        {selected.size > 0 && (
          <div className="mp-pay-section">
            <div className="mpag-entrega-section">
              <span className="mpag-section-label">Entrega</span>
              <p className="mpag-section-hint">
                Un solo envío para todo lo que selecciones — si van varios productos juntos, se despachan cuando todos estén listos.
                {hasVino && ' Los vinos solo se envían por Andreani, no hay retiro en fábrica.'}
              </p>

              <div
                className={`mpag-delivery-card${deliveryType === 'andreani' ? ' mpag-delivery-card--selected' : ''}`}
                onClick={() => setDeliveryType('andreani')}
              >
                <div className="mpag-delivery-card__header">
                  <div className="mpag-delivery-card__left">
                    <div className={`mpag-radio${deliveryType === 'andreani' ? ' mpag-radio--selected' : ''}`} />
                    <span className="mpag-delivery-name">Envío por Andreani</span>
                  </div>
                  <span className={`mpag-delivery-price${shippingPrice !== null ? ' mpag-delivery-price--known' : ''}`}>
                    {shippingLabel}
                  </span>
                </div>
                <p className="mpag-delivery-desc">Todo el país y Uruguay:<br />2-7 días hábiles</p>

                {deliveryType === 'andreani' && (
                  <div className="mpag-address-fields" onClick={e => e.stopPropagation()}>
                    <div className="mpag-field">
                      <label className="mpag-field-label">País</label>
                      <input className="mpag-field-input" placeholder="País" value={pais} onChange={e => setPais(e.target.value)} />
                    </div>
                    <div className="mpag-field-row">
                      <div className="mpag-field">
                        <label className="mpag-field-label">Provincia</label>
                        <input className="mpag-field-input" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} />
                      </div>
                      <div className="mpag-field">
                        <label className="mpag-field-label">Ciudad</label>
                        <input className="mpag-field-input" placeholder="Ciudad" value={ciudad} onChange={e => setCiudad(e.target.value)} />
                      </div>
                    </div>
                    <div className="mpag-field">
                      <label className="mpag-field-label">Calle</label>
                      <input className="mpag-field-input" placeholder="Calle" value={calle} onChange={e => setCalle(e.target.value)} />
                    </div>
                    <div className="mpag-field-row">
                      <div className="mpag-field">
                        <label className="mpag-field-label">Número</label>
                        <input className="mpag-field-input" placeholder="Número" value={numero} onChange={e => setNumero(e.target.value)} />
                      </div>
                      <div className="mpag-field mpag-field--sm">
                        <label className="mpag-field-label">Piso</label>
                        <input className="mpag-field-input" placeholder="Piso" value={piso} onChange={e => setPiso(e.target.value)} />
                      </div>
                      <div className="mpag-field mpag-field--sm">
                        <label className="mpag-field-label">Depto</label>
                        <input className="mpag-field-input" placeholder="Depto" value={depto} onChange={e => setDepto(e.target.value)} />
                      </div>
                    </div>
                    <div className="mpag-field">
                      <label className="mpag-field-label">Código postal</label>
                      <input className="mpag-field-input" placeholder="Código postal" value={cp} maxLength={6} onChange={e => setCp(e.target.value.replace(/\D/g, ''))} />
                    </div>
                  </div>
                )}
              </div>

              {!hasVino && (
                <div
                  className={`mpag-delivery-card${deliveryType === 'pickup' ? ' mpag-delivery-card--selected' : ''}`}
                  onClick={() => setDeliveryType('pickup')}
                >
                  <div className="mpag-delivery-card__header">
                    <div className="mpag-delivery-card__left">
                      <div className={`mpag-radio${deliveryType === 'pickup' ? ' mpag-radio--selected' : ''}`} />
                      <span className="mpag-delivery-name">Retiro en fábrica</span>
                    </div>
                    <span className="mpag-delivery-price mpag-delivery-price--free">Gratis</span>
                  </div>
                  <p className="mpag-delivery-desc">Retiro por Concepción Arenal 4501, Chacarita, Bs As,<br />Lunes a Viernes 10-18 hs</p>
                </div>
              )}
            </div>

            <div className="mp-pay-bar">
              <div className="mp-pay-bar__total">
                <span className="mp-pay-bar__count">{selected.size} seleccionado{selected.size > 1 ? 's' : ''}</span>
                <span className="mp-pay-bar__price">
                  {shippingReady ? fmt(payNow) : `${fmt(Math.round(subtotalSum - paidSum))} + envío`}
                </span>
              </div>
              <button
                className={`mpd-cta-btn${addressFilled && shippingReady ? ' mpd-cta-btn--active' : ''}`}
                onClick={handlePay}
                disabled={!addressFilled || !shippingReady || paying}
              >
                {paying ? 'Redirigiendo...' : 'Pagar seleccionados'}
              </button>
              <p className="mpd-legal">
                Por tratarse de productos personalizados, no realizamos cambios ni devoluciones una vez enviado a producción.
              </p>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="mp-root">
      <Navbar hideLinks />

      <div className="mp-user-strip">
        <div className="mp-user-strip__initial">{firstName[0]?.toUpperCase() ?? '?'}</div>
        <div className="mp-user-strip__info">
          <p className="mp-user-strip__name">{userName}</p>
          <p className="mp-user-strip__email">{userEmail}</p>
        </div>
        <button className="mp-user-strip__signout" onClick={signOut}>Cerrar sesión</button>
      </div>

      <main className="mp-main">
        <h1 className="mp-title">Mis pedidos</h1>

        <div className="mp-tabs">
          <button className={`mp-tab${tab === 'proceso' ? ' mp-tab--active' : ''}`} onClick={() => setTab('proceso')}>
            En proceso <span className="mp-tab__count">{proceso.length}</span>
          </button>
          <button className={`mp-tab${tab === 'listos' ? ' mp-tab--active' : ''}`} onClick={() => setTab('listos')}>
            Listos para comprar <span className="mp-tab__count">{listos.length}</span>
          </button>
          <button className={`mp-tab${tab === 'realizadas' ? ' mp-tab--active' : ''}`} onClick={() => setTab('realizadas')}>
            Compras realizadas <span className="mp-tab__count">{realizadas.length}</span>
          </button>
        </div>

        {tab === 'proceso'    && renderGrid(proceso)}
        {tab === 'listos'     && renderListos()}
        {tab === 'realizadas' && renderGrid(realizadas)}
      </main>
    </div>
  )
}

export default function MisProyectosPage() {
  return <Suspense><MisProyectosContent /></Suspense>
}
