-- ChoVot staff moderation API.
-- Apply after 0005_messaging_media_integrity.sql.

create or replace function public.get_moderation_queue(queue_limit integer default 50)
returns table(
  listing_id uuid,
  title text,
  seller_id uuid,
  price_vnd bigint,
  condition text,
  province text,
  moderation_state text,
  created_at timestamptz,
  evidence_count bigint,
  image_count bigint,
  report_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'Staff role required'; end if;
  return query
  select l.id, l.title, l.seller_id, l.price_vnd, l.condition, l.province,
         l.moderation_state, l.created_at,
         (select count(*) from public.listing_evidence e where e.listing_id = l.id),
         (select count(*) from public.listing_images i where i.listing_id = l.id),
         (select count(*) from public.reports r where r.listing_id = l.id and r.status in ('open','reviewing'))
  from public.listings l
  where l.status = 'pending_review'
  order by l.created_at asc
  limit least(greatest(coalesce(queue_limit,50),1),100);
end;
$$;
revoke all on function public.get_moderation_queue(integer) from public;
grant execute on function public.get_moderation_queue(integer) to authenticated;

create or replace function public.get_staff_dashboard_counts()
returns table(pending_review bigint, open_reports bigint, suspended_sellers bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'Staff role required'; end if;
  return query
  select
    (select count(*) from public.listings where status = 'pending_review'),
    (select count(*) from public.reports where status in ('open','reviewing')),
    (select count(*) from public.seller_verifications where status = 'suspended');
end;
$$;
revoke all on function public.get_staff_dashboard_counts() from public;
grant execute on function public.get_staff_dashboard_counts() to authenticated;

-- Staff can fetch private evidence only through this bounded RPC; provider refs / KYC secrets are excluded.
create or replace function public.get_listing_moderation_evidence(target_listing uuid)
returns table(
  evidence_id uuid,
  evidence_type text,
  public_label text,
  storage_path text,
  verification_status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'Staff role required'; end if;
  return query
  select e.id, e.evidence_type, e.public_label, e.storage_path, e.verification_status, e.created_at
  from public.listing_evidence e
  where e.listing_id = target_listing
  order by e.created_at asc;
end;
$$;
revoke all on function public.get_listing_moderation_evidence(uuid) from public;
grant execute on function public.get_listing_moderation_evidence(uuid) to authenticated;
