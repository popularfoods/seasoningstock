/**
 * Seasoning Stock — hourly READ-ONLY sync from the Google Sheet to the website.
 *
 * This script only reads the sheet (openById + getDisplayValues). It never writes to it.
 * Install it in YOUR Google account as a standalone project (script.google.com → New project),
 * not inside the sheet, so the sheet itself is not touched at all.
 *
 *   1. Paste this file, fill in SHEET_ID and SUPABASE_ANON below, Save.
 *   2. Run `makeSecret` once → copy the SQL line from the log and run it in Supabase → SQL Editor.
 *   3. Run `syncNow` once → allow access. Check the log says "Synced".
 *   4. Run `setupHourly` once → it then runs every hour on its own.
 */
const SHEET_ID      = 'PASTE_GOOGLE_SHEET_ID';
const SUPABASE_URL  = 'https://oqmvufrwgkgauwohoawc.supabase.co';
const SUPABASE_ANON = 'PASTE_ANON_PUBLIC_KEY';

/** Stock rows whose name differs from the Summary line they belong to.
 *  Key: "sheet|seasoning" or "sheet#batch" (lowercase). Value: [Summary name, start of Summary client]. */
const ALIASES = {
  'noice|peri peri cl':  ['Peri Peri (CL)', 'Noice'],
  'rostaa|peri peri':    ['Piri Piri (Rostaa)', 'Rostaa'],
  'rostaa|starwberry':   ['Strawberry', 'Rostaa'],
  'pe|siracha':          ['SRIRACHA', 'PE'],
  'pe#s000768351':       ['Sour Cream and Onion (Amazon)', 'Amazon']
};

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const pad = n => String(n).padStart(2, '0');

/** Creates the shared secret and stores it in this script's own (private) properties. */
function makeSecret() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SYNC_SECRET');
  if (!s) { s = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); props.setProperty('SYNC_SECRET', s); }
  Logger.log("Run this once in Supabase → SQL Editor:\ninsert into public.sync_secret (secret) values ('" + s + "') on conflict do nothing;");
}

function syncNow() {
  const secret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
  if (!secret) throw new Error('Run makeSecret first.');
  const book = SpreadsheetApp.openById(SHEET_ID);            // read access is enough
  const tabs = book.getSheets().map(sh => ({ name: sh.getName(), values: sh.getDataRange().getDisplayValues() }));
  const out = buildPayload(tabs);
  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/sync_sheet', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON },
    payload: JSON.stringify({ p_secret: secret, p_rows: out.rows, p_summary: out.summary, p_flags: out.flags })
  });
  if (res.getResponseCode() >= 300) throw new Error('Sync failed ' + res.getResponseCode() + ': ' + res.getContentText());
  Logger.log('Synced: ' + res.getContentText());
}

function setupHourly() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'syncNow').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncNow').timeBased().everyHours(1).create();
  Logger.log('Hourly sync is on.');
}

/* ---------- pure parsing (no Google calls below, so it can be tested anywhere) ---------- */
function buildPayload(tabs) {
  const flags = [], rows = [], summary = [];
  const sumTab = tabs.find(t => norm(t.name) === 'summary');
  if (sumTab) {
    const v = sumTab.values, hr = v.findIndex(r => r.some(c => norm(c) === 'name') && r.some(c => norm(c) === 'client'));
    if (hr >= 0) {
      const h = v[hr].map(norm), c = k => h.indexOf(k);
      for (let i = hr + 1; i < v.length; i++) {
        const r = v[i], name = String(r[c('name')] || '').trim(); if (!name) continue;
        const client = String(r[c('client')] || '').trim();
        summary.push({ id: 'sum:' + norm(name) + '|' + norm(client), item: name, client: client,
          sort: parseInt(r[c('sl no')], 10) || i, qty: num(r[c('qty (kg)')]), fg: num(r[c('fg qty (kg)')]), remark: String(r[c('remarks')] || '').trim() });
      }
    }
  }
  const findGroup = (sheet, item, batch) => {
    const a = ALIASES[norm(sheet) + '#' + norm(batch)] || ALIASES[norm(sheet) + '|' + norm(item)];
    const [name, cl] = a || [item, sheet];
    const hit = summary.find(s => norm(s.item) === norm(name) && norm(s.client).startsWith(norm(cl)));
    return hit ? hit.id : '';
  };
  tabs.forEach(t => {
    if (norm(t.name) === 'summary' || !t.values.length) return;
    const sheet = t.name.trim(), h = t.values[0].map(norm), col = k => h.indexOf(k);
    const iItem = col('seasoning'); if (iItem < 0) return;
    const seen = {};
    for (let i = 1; i < t.values.length; i++) {
      const r = t.values[i], get = k => col(k) >= 0 ? String(r[col(k)] || '').trim() : '';
      const item = get('seasoning').replace(/\s+/g, ' '); if (!item) continue;
      const batch = get('batch'), ctx = sheet + ' · ' + item + (batch ? ' ' + batch : '');
      const mfgRaw = get('mfg'), expRaw = get('exp');
      let key = norm(sheet) + (batch ? '#' + norm(batch) : '|' + norm(item) + '|' + norm(mfgRaw) + '|' + norm(expRaw));
      seen[key] = (seen[key] || 0) + 1; if (seen[key] > 1) key += '~' + seen[key];
      const closing = num(get('closing stock')), opening = num(get('opening stock'));
      const qty = closing !== '' ? closing : opening;
      const mfg = date(mfgRaw, false, ctx, 'MFG', flags), exp = date(expRaw, true, ctx, 'EXP', flags);
      if (mfg && exp && mfg > exp) flags.push(ctx + ': MFG ' + mfgRaw + ' is after EXP ' + expRaw + ' in the Google Sheet');
      rows.push({ key: key, grp: findGroup(sheet, item, batch), client: sheet, item: item, base: get('base'), supplier: get('supplier'),
        code: get('product code'), batch: batch, mfg: mfg, exp: exp, ext: date(get('shel-life extension'), true, ctx, 'extension', flags),
        qty: qty === '' ? 0 : qty, remark: get('remark') });
    }
  });
  return { rows: rows, summary: summary, flags: flags };
}

function num(s) {
  const t = String(s == null ? '' : s).replace(/,/g, '').trim();
  return t !== '' && !isNaN(+t) ? +t : '';
}

/** dd/mm/yyyy, dd-mm-yy, dd.mm.yyyy, "Sep - 2026" → YYYY-MM-DD. Unreadable → '' plus a flag. */
function date(s, isEnd, ctx, what, flags) {
  s = String(s || '').trim(); if (!s) return '';
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    let d = +m[1], mo = +m[2], y = +m[3];
    if (y < 1000) y = 2000 + (y % 100);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) return y + '-' + pad(mo) + '-' + pad(d);
    flags.push(ctx + ': ' + what + ' "' + s + '" is not a real date in the Google Sheet'); return '';
  }
  m = s.match(/^([A-Za-z]+)\.?\s*-?\s*(\d{4})$/);
  if (m && MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) >= 0) {
    const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, y = +m[2];
    const d = isEnd ? new Date(Date.UTC(y, mo, 0)).getUTCDate() : 1;
    return y + '-' + pad(mo) + '-' + pad(d);
  }
  flags.push(ctx + ': could not read ' + what + ' "' + s + '" in the Google Sheet'); return '';
}

if (typeof module !== 'undefined') module.exports = { buildPayload: buildPayload, date: date };
