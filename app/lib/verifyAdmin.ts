import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from './adminEmails'

// Las sesiones de Supabase en este proyecto viven solo en el browser (no hay cookies de
// servidor), así que el cliente manda el access_token en el header Authorization y acá lo
// validamos contra Supabase + chequeamos que el email esté en la lista de admins.
export async function verifyAdmin(req: Request): Promise<{ email: string } | null> {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user?.email) return null
  if (!isAdminEmail(data.user.email)) return null

  return { email: data.user.email }
}
