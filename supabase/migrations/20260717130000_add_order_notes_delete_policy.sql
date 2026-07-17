-- Designers can now delete a client's "pedido de cambio" from the dashboard
-- (app/dashboard/pedidos/[orderId]/page.tsx, deleteChangeRequest). order_notes
-- only had select/insert/update policies so far — delete was silently denied.

drop policy if exists "order_notes_delete_admin_only" on public.order_notes;
create policy "order_notes_delete_admin_only"
on public.order_notes for delete
to authenticated
using (
  (auth.jwt() ->> 'email') in (
    'maikasacerdote@gmail.com',
    'zeika.memories@gmail.com',
    'azucenaurangaa@gmail.com',
    'josefinaadevicentis@gmail.com',
    'totitasuarez1@gmail.com'
  )
);
