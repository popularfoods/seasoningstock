-- Seasoning usage projections. Run once in Supabase → SQL Editor (after schema.sql). Safe to run again.

-- each seasoning: % of finished goods, and which Summary line holds its stock
create table if not exists public.p_seasonings (
  name       text primary key,
  pct        numeric check (pct is null or (pct > 0 and pct <= 1)),   -- 0.18 = 18%
  stock_grp  text not null default '',                                -- a Summary line id (items.id)
  updated_at timestamptz not null default now()
);

-- each product (SKU): pack size and the seasonings it uses
create table if not exists public.p_skus (
  id         text primary key,                 -- PE ID, e.g. NC0007
  item_code  text not null default '',
  name       text not null,
  client     text not null default '',
  pack_kg    numeric check (pack_kg is null or pack_kg > 0),   -- 0.05 = 50 g
  seasonings text[] not null default '{}',
  sort       integer,
  updated_at timestamptz not null default now()
);

-- planned packets per product per month
create table if not exists public.p_plan (
  sku_id     text not null references public.p_skus(id),
  month      date not null,                    -- first day of the month
  packets    numeric not null default 0 check (packets >= 0),
  updated_at timestamptz not null default now(),
  primary key (sku_id, month)
);

alter table public.p_seasonings enable row level security;
alter table public.p_skus       enable row level security;
alter table public.p_plan       enable row level security;
do $$
declare t text;
begin
  foreach t in array array['p_seasonings','p_skus','p_plan'] loop
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('drop policy if exists "members add" on public.%I', t);
    execute format('drop policy if exists "members edit" on public.%I', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('create policy "members add"  on public.%I for insert to authenticated with check (public.is_member())', t);
    execute format('create policy "members edit" on public.%I for update to authenticated using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;
grant select, insert, update on public.p_seasonings, public.p_skus, public.p_plan to authenticated;
revoke all on public.p_seasonings, public.p_skus, public.p_plan from anon;

do $$
begin
  begin alter publication supabase_realtime add table public.p_seasonings; exception when others then null; end;
  begin alter publication supabase_realtime add table public.p_skus;       exception when others then null; end;
  begin alter publication supabase_realtime add table public.p_plan;       exception when others then null; end;
end $$;
