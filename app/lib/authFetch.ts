import { supabase } from './supabase'

// Los endpoints /api/admin/* y /api/assign-order validan quién llama por el access_token de
// la sesión actual (ver app/lib/verifyAdmin.ts) — este header hay que mandarlo en cada pedido.
export async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
