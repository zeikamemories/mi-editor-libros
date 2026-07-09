import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '../../lib/verifyAdmin'

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { orderId, email } = await req.json()
  if (!orderId || !email) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const { data: { users }, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return NextResponse.json({ error: 'No existe ningún usuario con ese email.' }, { status: 404 })

  const { error: updateError } = await admin.from('orders').update({ user_id: user.id }).eq('id', orderId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, userName: user.user_metadata?.full_name ?? user.email })
}
