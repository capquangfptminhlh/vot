create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Thành viên ChoVot',
  avatar_url text,
  role text not null default 'member' check (role in ('member','seller','admin','moderator')),
  phone_verified boolean not null default false,
  identity_verified boolean not null default false,
  bank_verified boolean not null default false,
  rating numeric(3,2) not null default 0,
  completed_transactions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kyc_verifications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text,
  provider_reference text,
  status text not null default 'not_started' check (status in ('not_started','pending','verified','rejected')),
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  title text not null,
  brand text not null,
  model text not null,
  condition text not null check (condition in ('new','like_new','excellent','used')),
  thickness_mm integer check (thickness_mm in (12,13,14,15,16,17,18)),
  price bigint not null check (price > 0),
  location text,
  description text,
  serial_number text,
  invoice_available boolean not null default false,
  paddle_verified boolean not null default false,
  status text not null default 'draft' check (status in ('draft','pending_review','active','reserved','sold','rejected','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_created_idx on public.listings(status, created_at desc);
create index if not exists listings_brand_idx on public.listings(lower(brand));
create index if not exists listings_price_idx on public.listings(price);
create index if not exists listings_seller_idx on public.listings(seller_id);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists listing_images_listing_idx on public.listing_images(listing_id, sort_order);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, listing_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(listing_id, buyer_id, seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  amount bigint not null check (amount > 0),
  status text not null default 'pending_payment' check (status in ('pending_payment','paid_protected','seller_shipping','in_transit','delivered','buyer_confirmed','completed','disputed','cancelled','refunded')),
  payment_provider text,
  payment_reference text,
  shipping_provider text,
  tracking_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_buyer_idx on public.orders(buyer_id, created_at desc);
create index if not exists orders_seller_idx on public.orders(seller_id, created_at desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewed_user_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  listing_id uuid references public.listings(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger kyc_updated_at before update on public.kyc_verifications for each row execute function public.set_updated_at();
create trigger listings_updated_at before update on public.listings for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name','Thành viên ChoVot')) on conflict do nothing;
 return new;
end$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.kyc_verifications enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

create policy "profiles public read" on public.profiles for select using (true);
create policy "profile owner update" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
create policy "kyc owner read" on public.kyc_verifications for select using (auth.uid()=user_id);

create policy "active listings public read" on public.listings for select using (status='active' or auth.uid()=seller_id);
create policy "seller inserts listings" on public.listings for insert with check (auth.uid()=seller_id);
create policy "seller updates listings" on public.listings for update using (auth.uid()=seller_id) with check (auth.uid()=seller_id);
create policy "seller deletes draft listings" on public.listings for delete using (auth.uid()=seller_id and status in ('draft','rejected','archived'));

create policy "listing images public read" on public.listing_images for select using (exists(select 1 from public.listings l where l.id=listing_id and (l.status='active' or l.seller_id=auth.uid())));
create policy "seller manages listing images" on public.listing_images for all using (exists(select 1 from public.listings l where l.id=listing_id and l.seller_id=auth.uid())) with check (exists(select 1 from public.listings l where l.id=listing_id and l.seller_id=auth.uid()));

create policy "favorites owner all" on public.favorites for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "conversation participants read" on public.conversations for select using (auth.uid() in (buyer_id,seller_id));
create policy "buyer starts conversation" on public.conversations for insert with check (auth.uid()=buyer_id and buyer_id<>seller_id);
create policy "messages participant read" on public.messages for select using (exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid() in (c.buyer_id,c.seller_id)));
create policy "messages participant insert" on public.messages for insert with check (auth.uid()=sender_id and exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid() in (c.buyer_id,c.seller_id)));

create policy "orders participants read" on public.orders for select using (auth.uid() in (buyer_id,seller_id));
create policy "buyer creates order" on public.orders for insert with check (auth.uid()=buyer_id and buyer_id<>seller_id);
create policy "reviews public read" on public.reviews for select using (true);
create policy "reviewer creates review" on public.reviews for insert with check (auth.uid()=reviewer_id and exists(select 1 from public.orders o where o.id=order_id and o.status='completed' and auth.uid() in (o.buyer_id,o.seller_id)));
create policy "reporter creates report" on public.reports for insert with check (auth.uid()=reporter_id);
create policy "reporter reads own reports" on public.reports for select using (auth.uid()=reporter_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('listing-images','listing-images',true,8388608,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "listing image public view" on storage.objects for select using (bucket_id='listing-images');
create policy "authenticated listing image upload" on storage.objects for insert to authenticated with check (bucket_id='listing-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "owner listing image update" on storage.objects for update to authenticated using (bucket_id='listing-images' and owner_id=auth.uid()::text);
create policy "owner listing image delete" on storage.objects for delete to authenticated using (bucket_id='listing-images' and owner_id=auth.uid()::text);
create policy "avatar public view" on storage.objects for select using (bucket_id='avatars');
create policy "avatar owner upload" on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
