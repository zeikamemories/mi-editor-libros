import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '../../../lib/verifyAdmin'

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? 'No encontrado' }, { status: 404 })

  return NextResponse.json({ email: data.user.email ?? null })
}
