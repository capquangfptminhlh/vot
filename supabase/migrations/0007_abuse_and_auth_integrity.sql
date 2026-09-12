-- ChoVot auth/trust synchronization and abuse controls.
-- Apply after 0006_staff_moderation_api.sql.

create or replace function public.normalize_seller_verification_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status not in ('rejected','suspended') then
    if new.phone_verified and new.identity_verified and new.bank_name_verified then
      new.status := 'verified';
      if new.reviewed_at is null then new.reviewed_at := now(); end if;
    else
      new.status := 'pending';
      new.reviewed_at := null;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists seller_verification_normalize_status on public.seller_verifications;
create trigger seller_verification_normalize_status
before insert or update on public.seller_verifications
for each row execute function public.normalize_seller_verification_status();

create or replace function public.sync_phone_verification_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.seller_verifications
  set phone_verified = (new.phone is not null and new.phone_confirmed_at is not null),
      updated_at = now()
  where user_id = new.id;
  return new;
end;
$$;
drop trigger if exists auth_phone_verification_sync on auth.users;
create trigger auth_phone_verification_sync
after update of phone, phone_confirmed_at on auth.users
for each row execute function public.sync_phone_verification_from_auth();

-- KYC provider events are server-only audit records. Never expose raw payloads publicly.
create table if not exists public.kyc_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  event_type text not null,
  provider_event_ref text,
  result text not null check (result in ('received','verified','rejected','error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.kyc_audit_events enable row level security;
revoke all on public.kyc_audit_events from anon, authenticated;

-- Server-side chat burst limit: 30 messages/minute/user.
create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recent_count integer;
begin
  if new.sender_id <> auth.uid() then raise exception 'Invalid sender'; end if;
  select count(*) into recent_count
  from public.messages
  where sender_id = new.sender_id and created_at > now() - interval '1 minute';
  if recent_count >= 30 then raise exception 'Too many messages. Please slow down'; end if;
  return new;
end;
$$;
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
for each row execute function public.enforce_message_rate_limit();

-- Reports go through a bounded RPC. Client cannot choose report status/resolution.
revoke insert on public.reports from anon, authenticated;
drop policy if exists "authenticated reports create" on public.reports;

create unique index if not exists reports_one_open_per_user_listing_idx
on public.reports(reporter_id, listing_id)
where reporter_id is not null and listing_id is not null and status in ('open','reviewing');

create or replace function public.report_listing(target_listing uuid, report_reason text, report_detail text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare report_id uuid; clean_reason text; clean_detail text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.listings l where l.id = target_listing and l.status in ('active','reserved','sold')) then
    raise exception 'Listing is not reportable';
  end if;
  clean_reason := lower(trim(coalesce(report_reason,'')));
  if clean_reason not in ('fake','scam','wrong_condition','wrong_product','prohibited','spam','other') then
    raise exception 'Invalid report reason';
  end if;
  clean_detail := nullif(trim(coalesce(report_detail,'')), '');
  if clean_detail is not null and char_length(clean_detail) > 2000 then raise exception 'Report detail too long'; end if;

  insert into public.reports(reporter_id, listing_id, reason, detail, status)
  values (auth.uid(), target_listing, clean_reason, clean_detail, 'open')
  on conflict (reporter_id, listing_id) where reporter_id is not null and listing_id is not null and status in ('open','reviewing')
  do update set reason = excluded.reason, detail = excluded.detail
  returning id into report_id;
  return report_id;
end;
$$;
revoke all on function public.report_listing(uuid,text,text) from public;
grant execute on function public.report_listing(uuid,text,text) to authenticated;

-- Prevent browser-side mutation of report workflow fields.
revoke update, delete on public.reports from anon, authenticated;
