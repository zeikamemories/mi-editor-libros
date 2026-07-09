// Lista única de emails con acceso admin (dashboard + endpoints de /api/admin/*).
// Usada tanto en el cliente (login, guard del dashboard) como en el servidor
// (verifyAdmin.ts) — agregar acá cuando se sume gente al equipo.
export const ADMIN_EMAILS = [
  'maikasacerdote@gmail.com',
  'zeika.memories@gmail.com',
  'azucenaurangaa@gmail.com',
  'josefinaadevicentis@gmail.com',
  'totitasuarez1@gmail.com',
]

// Comparación case-insensitive — Google a veces devuelve el email con otro casing
// que el que se cargó acá.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.toLowerCase()
  return ADMIN_EMAILS.some(e => e.toLowerCase() === normalized)
}
