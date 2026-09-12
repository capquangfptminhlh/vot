-- ChoVot production guardrails.
-- Apply after 0001_core.sql, 0002_lifecycle.sql and 0003_trust_hardening.sql.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','moderator','admin')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
drop policy if exists "user reads own role" on public.user_roles;
create policy "user reads own role" on public.user_roles for select using (auth.uid() = user_id);
revoke insert, update, delete on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('moderator','admin')
  );
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- System-owned lifecycle must not be directly changed by browser UPDATE.
revoke update(status) on public.listings from authenticated;

-- Listing image moderation/hash are server-owned. Browser may add a path/order only.
revoke insert, update, delete on public.listing_images from anon, authenticated;
grant select on public.listing_images to anon, authenticated;
grant insert(listing_id, storage_path, sort_order) on public.listing_images to authenticated;
grant update(sort_order) on public.listing_images to authenticated;
grant delete on public.listing_images to authenticated;

create or replace function public.submit_listing_for_review(target_listing uuid)
returns public.listings
language plpgsql security definer set search_path = public as $$
declare
  result public.listings;
  verified boolean;
  image_count integer;
begin
  select exists (
    select 1 from public.seller_verifications v
    where v.user_id = auth.uid() and v.status = 'verified'
  ) into verified;
  if not verified then raise exception 'Seller verification is required before review submission'; end if;

  select count(*) into image_count
  from public.listing_images i
  join public.listings l on l.id = i.listing_id
  where i.listing_id = target_listing and l.seller_id = auth.uid();
  if image_count < 2 then raise exception 'At least 2 listing images are required'; end if;

  update public.listings
  set status = 'pending_review', moderation_state = 'pending'
  where id = target_listing and seller_id = auth.uid() and status = 'draft'
  returning * into result;
  if result.id is null then raise exception 'Listing is not an owned draft'; end if;
  return result;
end;
$$;
revoke all on function public.submit_listing_for_review(uuid) from public;
grant execute on function public.submit_listing_for_review(uuid) to authenticated;

create or replace function public.mark_listing_sold(target_listing uuid)
returns public.listings
language plpgsql security definer set search_path = public as $$
declare result public.listings;
begin
  update public.listings set status = 'sold'
  where id = target_listing and seller_id = auth.uid() and status in ('active','reserved')
  returning * into result;
  if result.id is null then raise exception 'Listing cannot be marked sold'; end if;
  return result;
end;
$$;
revoke all on function public.mark_listing_sold(uuid) from public;
grant execute on function public.mark_listing_sold(uuid) to authenticated;

create or replace function public.moderate_listing(target_listing uuid, decision text, moderation_reason text default null)
returns public.listings
language plpgsql security definer set search_path = public as $$
declare result public.listings;
begin
  if not public.is_staff() then raise exception 'Staff role required'; end if;
  if decision not in ('approve','reject','needs_review') then raise exception 'Invalid moderation decision'; end if;

  if decision = 'approve' then
    update public.listings set moderation_state = 'approved', status = 'active'
    where id = target_listing and status = 'pending_review' returning * into result;
  elsif decision = 'reject' then
    update public.listings set moderation_state = 'rejected', status = 'rejected'
    where id = target_listing and status = 'pending_review' returning * into result;
  else
    update public.listings set moderation_state = 'needs_review'
    where id = target_listing and status = 'pending_review' returning * into result;
  end if;

  if result.id is null then raise exception 'Listing is not pending review'; end if;
  insert into public.moderation_actions(moderator_id, listing_id, action, reason)
  values (auth.uid(), target_listing, decision, moderation_reason);
  return result;
end;
$$;
revoke all on function public.moderate_listing(uuid,text,text) from public;
grant execute on function public.moderate_listing(uuid,text,text) to authenticated;

-- Private-first storage: user uploads are private; only moderated derivatives become public.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-private','listing-private',false,12582912,array['image/jpeg','image/png','image/webp']),
  ('listing-public','listing-public',true,8388608,array['image/jpeg','image/webp'])
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "seller uploads own private listing media" on storage.objects;
create policy "seller uploads own private listing media" on storage.objects for insert to authenticated
with check (bucket_id = 'listing-private' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "seller reads own private listing media" on storage.objects;
create policy "seller reads own private listing media" on storage.objects for select to authenticated
using (bucket_id = 'listing-private' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "seller deletes own private listing media" on storage.objects;
create policy "seller deletes own private listing media" on storage.objects for delete to authenticated
using (bucket_id = 'listing-private' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "public reads moderated listing media" on storage.objects;
create policy "public reads moderated listing media" on storage.objects for select to anon, authenticated
using (bucket_id = 'listing-public');

-- Browser clients deliberately have no INSERT/UPDATE/DELETE policy on listing-public.
-- A trusted Edge Function/service-role pipeline must strip EXIF, validate content and copy only approved derivatives.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_title_length_chk') then
    alter table public.listings add constraint listings_title_length_chk check (char_length(title) between 8 and 140) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_description_length_chk') then
    alter table public.listings add constraint listings_description_length_chk check (char_length(description) <= 8000) not valid;
  end if;
end $$;
