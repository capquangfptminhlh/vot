-- ChoVot messaging and public-media integrity.
-- Apply after 0004_production_guardrails.sql.

-- Public listing image metadata is visible only after the derivative is approved.
drop policy if exists "public listing images read" on public.listing_images;
create policy "public approved listing images read" on public.listing_images
for select using (
  moderation_state = 'approved'
  and exists (
    select 1 from public.listings l
    where l.id = listing_id and l.status in ('active','reserved','sold')
  )
);

-- Sellers can still read their own image metadata while a draft/review is private.
drop policy if exists "seller manages listing images" on public.listing_images;
drop policy if exists "seller reads own listing images" on public.listing_images;
drop policy if exists "seller inserts own listing image metadata" on public.listing_images;
drop policy if exists "seller reorders own draft images" on public.listing_images;
drop policy if exists "seller deletes own draft images" on public.listing_images;
create policy "seller reads own listing images" on public.listing_images
for select using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy "seller inserts own listing image metadata" on public.listing_images
for insert with check (
  moderation_state = 'pending'
  and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid() and l.status = 'draft')
);
create policy "seller reorders own draft images" on public.listing_images
for update using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid() and l.status = 'draft')
) with check (
  moderation_state = 'pending'
  and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid() and l.status = 'draft')
);
create policy "seller deletes own draft images" on public.listing_images
for delete using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid() and l.status = 'draft')
);

-- Conversation identity/listing binding is system-enforced through RPC only.
drop policy if exists "buyer starts conversation" on public.conversations;
revoke insert on public.conversations from anon, authenticated;

create or replace function public.start_listing_conversation(target_listing uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare target_seller uuid; result public.conversations;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select seller_id into target_seller from public.listings where id = target_listing and status in ('active','reserved');
  if target_seller is null then raise exception 'Listing is not available for contact'; end if;
  if target_seller = auth.uid() then raise exception 'Seller cannot start a buyer conversation with own listing'; end if;
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = target_seller)
       or (b.blocker_id = target_seller and b.blocked_id = auth.uid())
  ) then raise exception 'Conversation is unavailable'; end if;
  insert into public.conversations(listing_id, buyer_id, seller_id)
  values (target_listing, auth.uid(), target_seller)
  on conflict (listing_id,buyer_id,seller_id) do update set updated_at = now()
  returning * into result;
  return result;
end;
$$;
revoke all on function public.start_listing_conversation(uuid) from public;
grant execute on function public.start_listing_conversation(uuid) to authenticated;

-- Message send policy also honors block state and verifies the sender is a participant.
drop policy if exists "messages participants send" on public.messages;
drop policy if exists "messages participants send unblocked" on public.messages;
create policy "messages participants send unblocked" on public.messages
for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.buyer_id,c.seller_id)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = c.buyer_id and b.blocked_id = c.seller_id)
           or (b.blocker_id = c.seller_id and b.blocked_id = c.buyer_id)
      )
  )
);

create or replace function public.touch_conversation_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages
for each row execute function public.touch_conversation_on_message();

-- Minimal abuse-control indexes for server-side rate limiting and inbox ordering.
create index if not exists messages_sender_created_idx on public.messages(sender_id, created_at desc);
create index if not exists conversations_buyer_updated_idx on public.conversations(buyer_id, updated_at desc);
create index if not exists conversations_seller_updated_idx on public.conversations(seller_id, updated_at desc);
