-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create table public.profiles (
  id         text primary key,                                   -- random ID used in the bracelet link
  owner_id   uuid not null unique references auth.users(id) on delete cascade,
  data       jsonb not null check (octet_length(data::text) < 20000),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Only the signed-in owner can see or change their own row.
create policy "owner reads own"   on public.profiles for select to authenticated using (owner_id = auth.uid());
create policy "owner inserts own" on public.profiles for insert to authenticated with check (owner_id = auth.uid());
create policy "owner updates own" on public.profiles for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes own" on public.profiles for delete to authenticated using (owner_id = auth.uid());

-- Anyone with the link can read ONE profile by its ID, but cannot list or search the table.
create or replace function public.get_profile(p_id text)
returns jsonb
language sql stable security definer set search_path = public
as $$ select data from public.profiles where id = p_id; $$;

revoke all on function public.get_profile(text) from public;
grant execute on function public.get_profile(text) to anon, authenticated;
