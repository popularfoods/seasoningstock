-- Seasoning Stock — Supabase database
-- Run once: Supabase dashboard → SQL Editor → New query → paste all → Run.
-- Safe to run again after changes.

-- 1. Who may use the app. Only these emails can read or change anything.
create table if not exists public.members (email text primary key);
alter table public.members enable row level security;   -- no policies: not readable through the API

-- >>> PUT YOUR TEAM'S EMAILS HERE (lowercase), then run. Add more any time. <<<
-- insert into public.members (email) values ('you@example.com') on conflict do nothing;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where email = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;

-- 2. Tables
create table if not exists public.batches (
  id         text primary key,
  client     text not null,
  item       text not null,
  base       text not null default '',
  supplier   text not null default '',
  code       text not null default '',
  batch      text not null default '',
  mfg        date,
  exp        date,
  ext        date,                       -- shelf-life extension
  opening    numeric not null default 0,
  remark     text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table if not exists public.movements (
  id         text primary key,           -- made by the app, so a retried save is never counted twice
  date       date not null,
  batch_id   text not null references public.batches(id),
  type       text not null check (type in ('in','use','exp','adj')),
  qty        numeric not null check (qty <> 0 and (type = 'adj' or qty > 0)),
  note       text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  deleted    boolean not null default false,   -- entries are never erased, only marked
  deleted_at timestamptz
);
create index if not exists movements_batch_idx on public.movements (batch_id);
create index if not exists movements_date_idx  on public.movements (date);

create table if not exists public.flags (
  text text primary key,
  done boolean not null default false
);

-- 3. Keep "who changed it, when" on batches
create or replace function public.touch_batch() returns trigger language plpgsql as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
drop trigger if exists batches_touch on public.batches;
create trigger batches_touch before update on public.batches for each row execute function public.touch_batch();

-- 4. Access rules: members can read, add and edit. Nobody can delete through the app.
alter table public.batches   enable row level security;
alter table public.movements enable row level security;
alter table public.flags     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['batches','movements','flags'] loop
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('drop policy if exists "members add" on public.%I', t);
    execute format('drop policy if exists "members edit" on public.%I', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('create policy "members add"  on public.%I for insert to authenticated with check (public.is_member())', t);
    execute format('create policy "members edit" on public.%I for update to authenticated using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;

-- 5. A ready-made stock view for the Table Editor / reports (same numbers as the app)
create or replace view public.stock with (security_invoker = true) as
select b.id, b.client, b.item, b.base, b.supplier, b.code, b.batch, b.mfg, b.exp, b.ext, b.opening,
       coalesce(sum(m.qty) filter (where m.type = 'in'),  0) as received,
       coalesce(sum(m.qty) filter (where m.type = 'use'), 0) as used,
       coalesce(sum(m.qty) filter (where m.type = 'exp'), 0) as written_off,
       coalesce(sum(m.qty) filter (where m.type = 'adj'), 0) as corrected,
       b.opening + coalesce(sum(case m.type when 'in' then m.qty when 'adj' then m.qty when 'use' then -m.qty when 'exp' then -m.qty end), 0) as closing,
       b.remark
from public.batches b
left join public.movements m on m.batch_id = b.id and not m.deleted
group by b.id;

-- 6. Live updates between phones
do $$
begin
  begin alter publication supabase_realtime add table public.batches;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.movements; exception when others then null; end;
  begin alter publication supabase_realtime add table public.flags;     exception when others then null; end;
end $$;
