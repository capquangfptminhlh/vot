create or replace function public.is_fully_verified(uid uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id=uid and p.phone_verified and p.identity_verified and p.bank_verified
  );
$$;

-- Users may edit only public profile presentation fields; trust fields are backend-owned.
revoke update on public.profiles from authenticated;
grant update(display_name, avatar_url) on public.profiles to authenticated;
drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update safe fields" on public.profiles
for update using (auth.uid()=id) with check (auth.uid()=id);

-- A seller cannot self-assert verification/inspection status.
create or replace function public.protect_listing_trust_fields()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true),'') <> 'service_role' then
    if tg_op='INSERT' then new.paddle_verified=false; end if;
    if tg_op='UPDATE' then new.paddle_verified=old.paddle_verified; end if;
  end if;
  return new;
end$$;
drop trigger if exists protect_listing_trust_fields on public.listings;
create trigger protect_listing_trust_fields before insert or update on public.listings
for each row execute function public.protect_listing_trust_fields();

-- Public listing status requires a fully verified seller.
drop policy if exists "seller inserts listings" on public.listings;
create policy "seller inserts listings" on public.listings
for insert with check (
  auth.uid()=seller_id
  and (
    status in ('draft','pending_review')
    or (status='active' and public.is_fully_verified(auth.uid()))
  )
);

drop policy if exists "seller updates listings" on public.listings;
create policy "seller updates listings" on public.listings
for update using (auth.uid()=seller_id)
with check (
  auth.uid()=seller_id
  and (
    status in ('draft','pending_review','reserved','sold','archived')
    or (status='active' and public.is_fully_verified(auth.uid()))
  )
);

-- Buyers can only create a pending order that exactly matches the listing seller and price.
drop policy if exists "buyer creates order" on public.orders;
create policy "buyer creates valid pending order" on public.orders
for insert with check (
  auth.uid()=buyer_id
  and buyer_id<>seller_id
  and status='pending_payment'
  and exists(
    select 1 from public.listings l
    where l.id=listing_id
      and l.status='active'
      and l.seller_id=seller_id
      and l.price=amount
  )
);

-- Verification records and protected order/payment transitions are service-role managed.
revoke insert, update, delete on public.kyc_verifications from authenticated;
revoke update, delete on public.orders from authenticated;

-- Never expose service/provider references through anonymous access.
revoke all on public.kyc_verifications from anon;
