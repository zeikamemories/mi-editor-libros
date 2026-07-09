import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '../../../lib/verifyAdmin'

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const [{ data: orders, error }, { data: { users } }] = await Promise.all([
    admin.from('orders').select('*, profiles(full_name, whatsapp)').order('created_at', { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userMap: Record<string, string> = {}
  for (const u of users ?? []) {
    userMap[u.id] = u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? u.id
  }

  const enriched = (orders ?? []).map((o: any) => ({
    ...o,
    client_name: o.profiles?.full_name || userMap[o.user_id] || '—',
  }))

  return NextResponse.json(enriched)
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'No ids' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin.from('orders').delete().in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
