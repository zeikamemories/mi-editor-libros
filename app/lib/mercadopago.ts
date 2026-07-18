// Verificación server-side de un pago contra la API real de MercadoPago — nunca hay que
// confiar en el status/payment_id que manda el navegador (query params del back_url), porque
// cualquiera puede navegar directo a esa URL sin haber pagado. Este helper es la única fuente
// de verdad sobre si un pago fue realmente aprobado.

export interface MpPayment {
  id: number
  status: string
  transaction_amount: number
  external_reference: string | null
  currency_id: string
}

export async function fetchMpPayment(paymentId: string): Promise<MpPayment | null> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  })
  if (!res.ok) return null
  return res.json()
}
