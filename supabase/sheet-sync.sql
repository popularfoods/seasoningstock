-- Google Sheet → website sync (read-only on the sheet side).
-- Run once in Supabase → SQL Editor, after schema.sql. Safe to run again.

-- where each batch came from in the sheet, and the sheet's last known quantity
alter table public.batches add column if not exists src_key text;
alter table public.batches add column if not exists sheet_qty numeric;
create unique index if not exists batches_src_key_idx on public.batches (src_key);
-- Summary lines: the sheet's FG Qty and Qty, so website edits survive until the sheet changes
alter table public.items add column if not exists sheet_fg numeric;
alter table public.items add column if not exists sheet_qty numeric;

-- secret shared only with your Apps Script (no policies: unreadable through the API)
create table if not exists public.sync_secret (secret text primary key);
alter table public.sync_secret enable row level security;

-- a line per sync run, shown on the website
create table if not exists public.sync_log (
  id          bigserial primary key,
  ran_at      timestamptz not null default now(),
  rows_read   integer,
  new_batches integer,
  qty_changes integer,
  missing     integer
);
alter table public.sync_log enable row level security;
drop policy if exists "members read" on public.sync_log;
create policy "members read" on public.sync_log for select to authenticated using (public.is_member());
grant select on public.sync_log to authenticated;

create or replace function public.sync_sheet(p_secret text, p_rows jsonb, p_summary jsonb, p_flags jsonb default '[]')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r jsonb; s jsonb; f jsonb; b public.batches%rowtype;
  q numeric; keys text[] := '{}'; sids text[] := '{}';
  n_new int := 0; n_qty int := 0; n_gone int := 0;
begin
  if p_secret is null or not exists (select 1 from sync_secret where secret = p_secret) then
    raise exception 'bad sync secret';
  end if;

  -- Summary sheet lines
  for s in select * from jsonb_array_elements(p_summary) loop
    sids := sids || (s->>'id');
    insert into items (id, client, item, sort, fg, sheet_fg, sheet_qty, remark)
    values (s->>'id', s->>'client', s->>'item', (s->>'sort')::int,
            nullif(s->>'fg','')::numeric, nullif(s->>'fg','')::numeric, nullif(s->>'qty','')::numeric, coalesce(s->>'remark',''))
    on conflict (id) do update set
      client = excluded.client, item = excluded.item, sort = excluded.sort, sheet_qty = excluded.sheet_qty,
      fg = case when items.sheet_fg is distinct from excluded.sheet_fg then excluded.sheet_fg else items.fg end,
      sheet_fg = excluded.sheet_fg,
      remark = case when items.remark = '' then excluded.remark else items.remark end,
      updated_at = now();
  end loop;
  update items set sort = null where id like 'sum:%' and not (id = any(sids)) and sort is not null;

  -- stock rows
  for r in select * from jsonb_array_elements(p_rows) loop
    keys := keys || (r->>'key');
    q := coalesce(nullif(r->>'qty','')::numeric, 0);
    select * into b from batches where src_key = r->>'key';
    if not found then
      insert into batches (id, src_key, grp, client, item, base, supplier, code, batch, mfg, exp, ext, opening, sheet_qty, remark)
      values ('gs-' || md5(r->>'key'), r->>'key', coalesce(r->>'grp',''), r->>'client', r->>'item',
              coalesce(r->>'base',''), coalesce(r->>'supplier',''), coalesce(r->>'code',''), coalesce(r->>'batch',''),
              nullif(r->>'mfg','')::date, nullif(r->>'exp','')::date, nullif(r->>'ext','')::date,
              q, q, coalesce(r->>'remark',''));
      n_new := n_new + 1;
    else
      update batches set grp = coalesce(r->>'grp',''), client = r->>'client', item = r->>'item',
        base = coalesce(r->>'base',''), supplier = coalesce(r->>'supplier',''), code = coalesce(r->>'code',''),
        batch = coalesce(r->>'batch',''), mfg = nullif(r->>'mfg','')::date, exp = nullif(r->>'exp','')::date,
        ext = nullif(r->>'ext','')::date, remark = coalesce(r->>'remark',''), sheet_qty = q
      where id = b.id;
      if b.sheet_qty is distinct from q and q - coalesce(b.sheet_qty, 0) <> 0 then
        insert into movements (id, date, batch_id, type, qty, note)
        values ('gs-' || md5(b.id || clock_timestamp()::text), current_date, b.id, 'adj', q - coalesce(b.sheet_qty, 0),
                'From Google Sheet: ' || coalesce(b.sheet_qty::text, '–') || ' → ' || q::text || ' kg');
        n_qty := n_qty + 1;
      end if;
    end if;
  end loop;

  -- rows that disappeared from the sheet: kept, but flagged once
  for b in select * from batches where src_key is not null and not (src_key = any(keys)) loop
    insert into flags (text) values (b.client || ' · ' || b.item || coalesce(' ' || nullif(b.batch,''), '') ||
      ': no longer in the Google Sheet — write it off here if the stock is gone') on conflict do nothing;
    n_gone := n_gone + 1;
  end loop;

  for f in select * from jsonb_array_elements(p_flags) loop
    insert into flags (text) values (f #>> '{}') on conflict do nothing;
  end loop;

  insert into sync_log (rows_read, new_batches, qty_changes, missing)
  values (jsonb_array_length(p_rows), n_new, n_qty, n_gone);
  return jsonb_build_object('rows', jsonb_array_length(p_rows), 'new', n_new, 'qty_changes', n_qty, 'missing', n_gone);
end $$;

revoke all on function public.sync_sheet(text, jsonb, jsonb, jsonb) from public;
grant execute on function public.sync_sheet(text, jsonb, jsonb, jsonb) to anon, authenticated;

-- realtime: phones refresh when a sync lands
do $$ begin alter publication supabase_realtime add table public.sync_log; exception when others then null; end $$;
