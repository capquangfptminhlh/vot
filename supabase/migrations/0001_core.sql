-- ChoVot core schema: production-ready starting point for Supabase/Postgres.
-- Apply only to the dedicated ChoVot project after review.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  province text,
  bio text,
  seller_score integer not null default 0 check (seller_score between 0 and 100),
  rating numeric(3,2),
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_verified boolean not null default false,
  identity_verified boolean not null default false,
  bank_name_verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending','verified','rejected','suspended')),
  provider_ref text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  country text,
  official_url text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','partial','verified')),
  created_at timestamptz not null default now()
);

create table if not exists public.paddle_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  slug text unique not null,
  name text not null,
  generation text,
  thickness_mm numeric(5,2),
  surface text,
  core text,
  shape text,
  average_weight_oz numeric(5,2),
  length_in numeric(5,2),
  width_in numeric(5,2),
  grip_length_in numeric(5,2),
  grip_circumference_in numeric(5,2),
  approval text,
  nfc boolean,
  play_style text,
  source_url text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','partial','verified')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, name)
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  paddle_model_id uuid references public.paddle_models(id) on delete set null,
  custom_brand text,
  custom_model text,
  title text not null,
  description text not null default '',
  condition text not null,
  condition_percent integer check (condition_percent between 1 and 100),
  price_vnd bigint not null check (price_vnd >= 0),
  province text,
  district text,
  serial_number text,
  invoice_available boolean,
  nfc_available boolean,
  status text not null default 'draft' check (status in ('draft','pending_review','active','reserved','sold','expired','rejected','removed')),
  moderation_state text not null default 'pending' check (moderation_state in ('pending','approved','needs_review','rejected')),
  view_count bigint not null default 0,
  favorite_count bigint not null default 0,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists listings_status_published_idx on public.listings(status, published_at desc);
create index if not exists listings_seller_idx on public.listings(seller_id, created_at desc);
create index if not exists listings_model_idx on public.listings(paddle_model_id, status);
create index if not exists listings_price_idx on public.listings(price_vnd);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  image_hash text,
  moderation_state text not null default 'pending' check (moderation_state in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique(listing_id, sort_order)
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, listing_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(listing_id, buyer_id, seller_id),
  check (buyer_id <> seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  listing_id uuid references public.listings(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references auth.users(id) on delete set null,
  listing_id uuid references public.listings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  notify boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.seller_verifications enable row level security;
alter table public.brands enable row level security;
alter table public.paddle_models enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.saved_searches enable row level security;

create policy "public profiles readable" on public.profiles for select using (true);
create policy "profile owner updates" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "verification owner readable" on public.seller_verifications for select using (auth.uid() = user_id);
create policy "brands public read" on public.brands for select using (true);
create policy "models public read" on public.paddle_models for select using (true);
create policy "active listings public read" on public.listings for select using (status in ('active','reserved','sold'));
create policy "seller reads own listings" on public.listings for select using (auth.uid() = seller_id);
create policy "verified seller creates listing" on public.listings for insert with check (
  auth.uid() = seller_id and exists (
    select 1 from public.seller_verifications v
    where v.user_id = auth.uid() and v.status = 'verified'
  )
);
create policy "seller updates own listing" on public.listings for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "seller deletes own draft" on public.listings for delete using (auth.uid() = seller_id and status = 'draft');
create policy "public listing images read" on public.listing_images for select using (
  exists (select 1 from public.listings l where l.id = listing_id and l.status in ('active','reserved','sold'))
);
create policy "seller manages listing images" on public.listing_images for all using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
) with check (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
);
create policy "favorites owner" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conversation participants read" on public.conversations for select using (auth.uid() in (buyer_id, seller_id));
create policy "buyer starts conversation" on public.conversations for insert with check (auth.uid() = buyer_id and buyer_id <> seller_id);
create policy "messages participants read" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id,c.seller_id))
);
create policy "messages participants send" on public.messages for insert with check (
  auth.uid() = sender_id and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id,c.seller_id))
);
create policy "authenticated reports create" on public.reports for insert to authenticated with check (reporter_id is null or reporter_id = auth.uid());
create policy "reporter reads own reports" on public.reports for select using (reporter_id = auth.uid());
create policy "saved searches owner" on public.saved_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- moderation_actions deliberately has no client policy: service role/admin backend only.
