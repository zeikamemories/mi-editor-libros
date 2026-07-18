import { createClient } from '@supabase/supabase-js'

// Resuelve el email de la sesión autenticada a partir del Authorization: Bearer <token> —
// nunca hay que confiar en un email que mande el body del request, porque cualquiera podría
// pasar el email de un tercero.
export async function getSessionEmail(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await admin.auth.getUser(token)
  if (error) return null
  return data.user?.email ?? null
}
