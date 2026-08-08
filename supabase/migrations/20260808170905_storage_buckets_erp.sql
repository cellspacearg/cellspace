-- ============================================================
-- Storage: buckets para el CMS + ERP
-- ------------------------------------------------------------
-- Ya existe 'product-images' (público). Se agregan:
--   cms-media    → público (imágenes/banners del CMS)   · write solo admin
--   repair-media → privado (fotos/videos de reparaciones) · solo admin (se ampliará
--                  cuando exista el módulo de reparaciones, para que el cliente vea las suyas)
--   documents    → privado (comprobantes, PDFs)          · solo admin
--
-- RLS de storage.objects ya está habilitado por Supabase. Solo agregamos políticas.
-- Idempotente: drop-if-exists antes de cada create.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('cms-media',    'cms-media',    true),
       ('repair-media', 'repair-media', false),
       ('documents',    'documents',    false)
on conflict (id) do nothing;

-- ---------- cms-media: lectura pública, escritura solo admin ----------
drop policy if exists "cms_media_read"   on storage.objects;
drop policy if exists "cms_media_insert" on storage.objects;
drop policy if exists "cms_media_update" on storage.objects;
drop policy if exists "cms_media_delete" on storage.objects;

create policy "cms_media_read" on storage.objects
  for select using (bucket_id = 'cms-media');
create policy "cms_media_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'cms-media' and public.is_admin());
create policy "cms_media_update" on storage.objects
  for update to authenticated using (bucket_id = 'cms-media' and public.is_admin());
create policy "cms_media_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'cms-media' and public.is_admin());

-- ---------- repair-media: solo admin (por ahora) ----------
drop policy if exists "repair_media_admin_all" on storage.objects;
create policy "repair_media_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'repair-media' and public.is_admin())
  with check (bucket_id = 'repair-media' and public.is_admin());

-- ---------- documents: solo admin ----------
drop policy if exists "documents_admin_all" on storage.objects;
create policy "documents_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'documents' and public.is_admin())
  with check (bucket_id = 'documents' and public.is_admin());
