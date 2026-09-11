-- ChoVot trust hardening. Apply after 0001_core.sql and 0002_lifecycle.sql.
-- Principle: trust/moderation/counter fields are server-owned, never client-owned.

create table if not exists public.listing_evidence (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('serial','nfc','invoice','purchase_proof','condition_photo','other')),
  public_label text,
  storage_path text,
  value_hash text,
  verification_status text not null default 'submitted' check (verification_status in ('submitted','verified','rejected','not_verifiable')),
  moderation_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists listing_evidence_listing_idx on public.listing_evidence(listing_id, evidence_type);

create table if not exists public.seller_feedback (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  interaction_verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending','published','removed','disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(listing_id, reviewer_id),
  check (reviewer_id <> seller_id)
);
create index if not exists seller_feedback_seller_idx on public.seller_feedback(seller_id, status, created_at desc);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.listing_evidence enable row level security;
alter table public.seller_feedback enable row level security;
alter table public.user_blocks enable row level security;

create policy "public verified evidence labels read" on public.listing_evidence
for select using (
  verification_status = 'verified'
  and exists (select 1 from public.listings l where l.id = listing_id and l.status in ('active','reserved','sold'))
);
create policy "seller reads own evidence" on public.listing_evidence
for select using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy "seller submits own evidence" on public.listing_evidence
for insert with check (
  verification_status = 'submitted'
  and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
);
create policy "published feedback public read" on public.seller_feedback for select using (status = 'published');
create policy "reviewer reads own feedback" on public.seller_feedback for select using (reviewer_id = auth.uid());
create policy "conversation participant submits feedback" on public.seller_feedback
for insert with check (
  reviewer_id = auth.uid() and reviewer_id <> seller_id
  and status = 'pending' and interaction_verified = false
  and exists (
    select 1 from public.conversations c
    where c.listing_id = seller_feedback.listing_id
      and c.buyer_id = auth.uid() and c.seller_id = seller_feedback.seller_id
  )
);
create policy "block owner manages blocks" on public.user_blocks
for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'seller_feedback_set_updated_at') then
    create trigger seller_feedback_set_updated_at before update on public.seller_feedback
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Draft-first flow: an authenticated owner may save a draft before KYC.
-- KYC + moderation are enforced only when publishing publicly.
drop policy if exists "verified seller creates listing" on public.listings;
create policy "seller creates own draft" on public.listings
for insert with check (auth.uid() = seller_id and status = 'draft');

-- Harden publish transition for INSERT and UPDATE. Client inserts should still be draft-only below.
create or replace function public.enforce_listing_publish_state()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare seller_ok boolean;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select exists(
      select 1 from public.seller_verifications v
      where v.user_id = new.seller_id and v.status = 'verified'
    ) into seller_ok;
    if not seller_ok then raise exception 'Seller must be verified before publishing'; end if;
    if new.moderation_state <> 'approved' then raise exception 'Listing must pass moderation before publishing'; end if;
    if new.published_at is null then new.published_at = now(); end if;
    if new.expires_at is null then new.expires_at = now() + interval '45 days'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_enforce_publish_state on public.listings;
create trigger listings_enforce_publish_state
before insert or update on public.listings
for each row execute function public.enforce_listing_publish_state();

-- Column-level privilege hardening.
revoke update on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update(display_name, avatar_url, province, bio) on public.profiles to authenticated;

revoke insert, update, delete on public.seller_verifications from anon, authenticated;
grant select on public.seller_verifications to authenticated;

revoke insert, update, delete on public.brands from anon, authenticated;
revoke insert, update, delete on public.paddle_models from anon, authenticated;
grant select on public.brands, public.paddle_models to anon, authenticated;

-- Never grant status/moderation/counters during INSERT. New client listings use DB default `draft`.
revoke insert, update on public.listings from anon, authenticated;
grant select on public.listings to anon, authenticated;
grant insert(
  seller_id, paddle_model_id, custom_brand, custom_model, title, description,
  condition, condition_percent, price_vnd, province, district, serial_number,
  invoice_available, nfc_available
) on public.listings to authenticated;
-- Sellers may move their own listing among user-controlled lifecycle states; trigger blocks illegal activation.
grant update(
  paddle_model_id, custom_brand, custom_model, title, description, condition,
  condition_percent, price_vnd, province, district, serial_number,
  invoice_available, nfc_available, status
) on public.listings to authenticated;

revoke insert, update, delete on public.listing_evidence from anon, authenticated;
grant select on public.listing_evidence to anon, authenticated;
grant insert(listing_id, evidence_type, public_label, storage_path, value_hash) on public.listing_evidence to authenticated;

revoke insert, update, delete on public.seller_feedback from anon, authenticated;
grant select on public.seller_feedback to anon, authenticated;
grant insert(listing_id, reviewer_id, seller_id, rating, comment) on public.seller_feedback to authenticated;

revoke all on public.moderation_actions from anon, authenticated;

-- Safe public trust lookup. Avoid exposing provider_ref or raw KYC/bank identifiers.
create or replace function public.get_public_seller_trust(target_user uuid)
returns table(
  user_id uuid,
  display_name text,
  avatar_url text,
  province text,
  seller_score integer,
  rating numeric,
  rating_count integer,
  joined_at timestamptz,
  seller_verified boolean,
  phone_verified boolean,
  identity_verified boolean,
  bank_name_verified boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.avatar_url, p.province, p.seller_score, p.rating, p.rating_count,
         p.created_at,
         coalesce(v.status='verified',false), coalesce(v.phone_verified,false),
         coalesce(v.identity_verified,false), coalesce(v.bank_name_verified,false)
  from public.profiles p
  left join public.seller_verifications v on v.user_id=p.id
  where p.id=target_user;
$$;
revoke all on function public.get_public_seller_trust(uuid) from public;
grant execute on function public.get_public_seller_trust(uuid) to anon, authenticated;

-- Do not grant public select on the security-invoker view created in 0002; use the safe function above.
revoke all on public.public_seller_trust from anon, authenticated;

-- Supabase service_role bypasses RLS. Never expose it to browser/mobile clients.
