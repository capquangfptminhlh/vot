-- ChoVot column privacy + realtime publication.
-- Apply after 0007_abuse_and_auth_integrity.sql.

-- Public/authenticated marketplace reads never expose raw paddle serials.
revoke select on public.listings from anon, authenticated;
grant select(
  id, seller_id, paddle_model_id, custom_brand, custom_model, title, description,
  condition, condition_percent, price_vnd, province, district,
  invoice_available, nfc_available, status, moderation_state,
  view_count, favorite_count, published_at, expires_at, created_at, updated_at
) on public.listings to anon, authenticated;

-- Seller verification provider identifiers stay server-only even to the owner.
revoke select on public.seller_verifications from anon, authenticated;
grant select(
  user_id, phone_verified, identity_verified, bank_name_verified,
  status, reviewed_at, created_at, updated_at
) on public.seller_verifications to authenticated;

-- Evidence hashes, private storage paths and moderation notes stay server-only.
revoke select on public.listing_evidence from anon, authenticated;
grant select(
  id, listing_id, evidence_type, public_label,
  verification_status, created_at, reviewed_at
) on public.listing_evidence to anon, authenticated;

-- Owner-only RPC for sensitive listing fields needed during editing.
create or replace function public.get_own_listing_sensitive(target_listing uuid)
returns table(listing_id uuid, serial_number text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return query
  select l.id, l.serial_number
  from public.listings l
  where l.id = target_listing and l.seller_id = auth.uid();
end;
$$;
revoke all on function public.get_own_listing_sensitive(uuid) from public;
grant execute on function public.get_own_listing_sensitive(uuid) to authenticated;

-- Realtime chat requires messages in the Supabase realtime publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
