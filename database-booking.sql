-- Booking + Credits transactional RPC
-- Run in Supabase SQL editor (Production)

-- 1) Ensure class_bookings table exists
create table if not exists public.class_bookings (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id integer not null references public.class_schedule(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.class_bookings enable row level security;

drop policy if exists "Users read own class_bookings" on public.class_bookings;
create policy "Users read own class_bookings"
  on public.class_bookings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users insert own class_bookings" on public.class_bookings;
create policy "Users insert own class_bookings"
  on public.class_bookings
  for insert to authenticated
  with check (user_id = auth.uid());

-- 2) Book class + decrement one credit atomically when needed
create or replace function public.book_class(
  in p_user_id uuid,
  in p_class_id integer,
  in p_use_credit_pass_id uuid default null
) returns jsonb as $$
declare
  v_has_unlimited boolean := false;
  v_credit_pass_id uuid := null;
  v_remaining integer := null;
  v_expires timestamptz := null;
  v_now timestamptz := now();
  v_used_credit boolean := false;
  v_remaining_out integer := null;
begin
  -- Check unlimited first (active + not expired + pass_type contains unlimited/week/month/year)
  select true
  into v_has_unlimited
  from public.user_passes up
  where up.user_id = p_user_id
    and coalesce(up.is_active, true)
    and (up.expires_at is null or up.expires_at > v_now)
    and (coalesce(lower(up.pass_type), '') like '%unlimited%'
      or coalesce(lower(up.pass_type), '') like '%weekly%'
      or coalesce(lower(up.pass_type), '') like '%monthly%'
      or coalesce(lower(up.pass_type), '') like '%year%')
  limit 1;

  if v_has_unlimited then
    insert into public.class_bookings(user_id, class_id) values (p_user_id, p_class_id);
    return jsonb_build_object('ok', true, 'usedCredit', false);
  end if;

  -- Choose a credit pass: prefer provided id; otherwise first active with credits
  if p_use_credit_pass_id is not null then
    select id, remaining_credits, expires_at into v_credit_pass_id, v_remaining, v_expires
    from public.user_passes
    where id = p_use_credit_pass_id
      and user_id = p_user_id
      and coalesce(is_active, true)
      and (expires_at is null or expires_at > v_now)
    limit 1;
  end if;

  if v_credit_pass_id is null then
    select id, remaining_credits, expires_at into v_credit_pass_id, v_remaining, v_expires
    from public.user_passes
    where user_id = p_user_id
      and coalesce(is_active, true)
      and (expires_at is null or expires_at > v_now)
      and coalesce(remaining_credits, 0) > 0
    order by created_at asc nulls last
    limit 1;
  end if;

  if v_credit_pass_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_pass');
  end if;

  -- Decrement and create booking
  update public.user_passes
    set remaining_credits = greatest(0, coalesce(remaining_credits, 0) - 1)
  where id = v_credit_pass_id
  returning remaining_credits into v_remaining_out;

  insert into public.class_bookings(user_id, class_id) values (p_user_id, p_class_id);
  v_used_credit := true;

  return jsonb_build_object('ok', true, 'usedCredit', v_used_credit, 'remainingCredits', v_remaining_out);
end; $$ language plpgsql security definer;

revoke all on function public.book_class(uuid, integer, uuid) from public;
grant execute on function public.book_class(uuid, integer, uuid) to authenticated;

-- Ensure RLS on user_passes does not block the function (security definer bypasses, OK)
-- Done.