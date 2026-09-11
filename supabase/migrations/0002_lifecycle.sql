-- ChoVot lifecycle helpers. Apply after 0001_core.sql.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'profiles_set_updated_at') then
    create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'seller_verifications_set_updated_at') then
    create trigger seller_verifications_set_updated_at before update on public.seller_verifications for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'paddle_models_set_updated_at') then
    create trigger paddle_models_set_updated_at before update on public.paddle_models for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'listings_set_updated_at') then
    create trigger listings_set_updated_at before update on public.listings for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'conversations_set_updated_at') then
    create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict (id) do nothing;

  insert into public.seller_verifications(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Public-safe seller trust view: never exposes raw KYC provider refs or bank/identity details.
create or replace view public.public_seller_trust
with (security_invoker = true)
as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  p.province,
  p.seller_score,
  p.rating,
  p.rating_count,
  p.created_at as joined_at,
  (v.status = 'verified') as seller_verified,
  v.phone_verified,
  v.identity_verified,
  v.bank_name_verified
from public.profiles p
left join public.seller_verifications v on v.user_id = p.id;

-- A listing cannot be published if seller verification has expired/suspended or moderation is not approved.
create or replace function public.enforce_listing_publish_state()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  seller_ok boolean;
begin
  if new.status = 'active' and old.status is distinct from 'active' then
    select exists(
      select 1 from public.seller_verifications v
      where v.user_id = new.seller_id and v.status = 'verified'
    ) into seller_ok;

    if not seller_ok then
      raise exception 'Seller must be verified before publishing';
    end if;
    if new.moderation_state <> 'approved' then
      raise exception 'Listing must pass moderation before publishing';
    end if;
    if new.published_at is null then new.published_at = now(); end if;
    if new.expires_at is null then new.expires_at = now() + interval '45 days'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_enforce_publish_state on public.listings;
create trigger listings_enforce_publish_state
before update on public.listings
for each row execute function public.enforce_listing_publish_state();

-- Counters are derived server-side, never trusted from browser writes.
create or replace function public.recount_listing_favorites(target_listing uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings l
  set favorite_count = (select count(*) from public.favorites f where f.listing_id = target_listing)
  where l.id = target_listing;
$$;

create or replace function public.sync_favorite_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recount_listing_favorites(coalesce(new.listing_id, old.listing_id));
  return coalesce(new,old);
end;
$$;

drop trigger if exists favorites_sync_count on public.favorites;
create trigger favorites_sync_count
after insert or delete on public.favorites
for each row execute function public.sync_favorite_count();

-- RLS should be paired with storage bucket policies. See docs/STORAGE_SECURITY.md.
