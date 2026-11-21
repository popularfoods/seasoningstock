/**
 * Seasoning Stock — Google Sheets backend
 *
 * 1. Create a new Google Sheet (e.g. "Seasoning Stock DB").
 * 2. Extensions → Apps Script → replace everything with this file → Save.
 * 3. Select `setup` in the toolbar → Run → allow access.
 *    View → Logs (or Execution log) shows your TEAM KEY. Keep it private.
 * 4. Deploy → New deployment → type "Web app"
 *      Execute as: Me    Who has access: Anyone
 *    Copy the Web app URL (ends in /exec).
 * 5. Open the app, paste the URL + team key.
 *
 * After editing this file later: Deploy → Manage deployments → Edit → Version: New → Deploy
 * (the URL stays the same).
 */

const BATCH_COLS = ['id','client','item','base','supplier','code','batch','mfg','exp','ext','opening','remark','updated_at'];
const CALC_COLS  = ['received','used','written_off','corrected','closing'];
const MOVE_COLS  = ['id','date','batch_id','type','qty','note','created_at','deleted'];
const FLAG_COLS  = ['text','done'];
const TYPES      = ['in','use','exp','adj'];
const EDITABLE   = ['client','item','base','supplier','code','batch','mfg','exp','ext','opening','remark'];
const DATE_FIELDS = ['mfg','exp','ext'];

/* ---------- one-time setup ---------- */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const b = sheet_(ss, 'Batches', BATCH_COLS.concat(CALC_COLS));
  b.getRange('A:M').setNumberFormat('@');          // keep dates as typed text: no dd/mm ↔ mm/dd flips
  b.getRange('K:K').setNumberFormat('0.###');
  b.getRange('N:R').setNumberFormat('0.###');
  const sum = t => '=ARRAYFORMULA(IF(A2:A="",,SUMIF(Movements!C2:C&Movements!D2:D&Movements!H2:H,A2:A&"' + t + '",Movements!E2:E)))';
  b.getRange('N2:Q2').setFormulas([[sum('in'), sum('use'), sum('exp'), sum('adj')]]);
  b.getRange('R2').setFormula('=ARRAYFORMULA(IF(A2:A="",,K2:K+N2:N-O2:O-P2:P+Q2:Q))');

  const m = sheet_(ss, 'Movements', MOVE_COLS);
  m.getRange('A:H').setNumberFormat('@');
  m.getRange('E:E').setNumberFormat('0.###');

  const f = sheet_(ss, 'Flags', FLAG_COLS);
  f.getRange('A:B').setNumberFormat('@');

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TEAM_KEY')) props.setProperty('TEAM_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 12));
  Logger.log('TEAM KEY: ' + props.getProperty('TEAM_KEY'));
}

/** Run this if the key leaks: everyone re-enters the new key once. */
function rotateKey() {
  PropertiesService.getScriptProperties().setProperty('TEAM_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 12));
  Logger.log('NEW TEAM KEY: ' + PropertiesService.getScriptProperties().getProperty('TEAM_KEY'));
}

/* ---------- web endpoints ---------- */
function doGet() { return out_({ ok: true, app: 'seasoning-stock' }); }

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'bad_request', drop: true }); }
  const key = PropertiesService.getScriptProperties().getProperty('TEAM_KEY');
  if (!key || req.key !== key) return out_({ ok: false, error: 'bad_key' });
  const fn = API[req.a];
  if (!fn) return out_({ ok: false, error: 'unknown_action', drop: true });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return out_({ ok: false, error: 'busy' });
  try {
    return out_(Object.assign({ ok: true }, fn(req.p || {}) || {}));
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err), drop: !!(err && err.drop) });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

const API = {
  all() {
    const batches = rows_('Batches', BATCH_COLS.length).map(r => {
      const o = {}; BATCH_COLS.forEach((c, i) => o[c] = cell_(r[i]));
      o.opening = Number(o.opening) || 0; delete o.updated_at; return o;
    });
    const moves = rows_('Movements', MOVE_COLS.length)
      .filter(r => String(r[7]) !== 'yes')
      .map(r => ({ id: cell_(r[0]), date: cell_(r[1]), b: cell_(r[2]), t: cell_(r[3]), q: Number(r[4]) || 0, note: cell_(r[5]) }));
    const flags = rows_('Flags', 2).filter(r => String(r[1]) !== 'yes').map(r => cell_(r[0]));
    return { batches, moves, flags };
  },

  addMove(p) {
    const m = p.move || {};
    if (!m.id || TYPES.indexOf(m.t) < 0) bad_('Invalid entry');
    const q = Number(m.q);
    if (!isFinite(q) || q === 0 || (m.t !== 'adj' && q < 0)) bad_('Invalid quantity');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date || '')) bad_('Invalid date');
    const bs = sh_('Batches'), ms = sh_('Movements');
    if (p.batch && p.batch.id && findRow_(bs, p.batch.id) < 0) {
      const b = p.batch;
      append_(bs, [b.id, b.client, b.item, b.base, b.supplier, b.code, b.batch, date_(b.mfg), date_(b.exp), date_(b.ext), Number(b.opening) || 0, b.remark, now_()]);
    }
    const existing = findRow_(ms, m.id);
    if (existing > 0) { ms.getRange(existing, 8).setValue(''); return {}; }   // retry or undo of a delete
    if (findRow_(bs, m.b) < 0) bad_('Unknown batch');
    append_(ms, [m.id, m.date, m.b, m.t, q, m.note || '', now_(), '']);
    return {};
  },

  deleteMove(p) {
    const ms = sh_('Movements'), r = findRow_(ms, p.id);
    if (r > 0) ms.getRange(r, 8).setValue('yes');   // soft delete: the audit trail stays in the sheet
    return {};
  },

  updateBatch(p) {
    if (EDITABLE.indexOf(p.f) < 0) bad_('Field not editable');
    const bs = sh_('Batches'), r = findRow_(bs, p.id);
    if (r < 0) bad_('Unknown batch');
    let v = p.v;
    if (p.f === 'opening') { v = Number(v); if (!isFinite(v)) bad_('Invalid number'); }
    else if (DATE_FIELDS.indexOf(p.f) >= 0) v = date_(v);
    else v = safe_(v);
    bs.getRange(r, BATCH_COLS.indexOf(p.f) + 1).setValue(v);
    bs.getRange(r, BATCH_COLS.indexOf('updated_at') + 1).setValue(now_());
    return {};
  },

  dismissFlag(p) {
    const fs = sh_('Flags'), vals = fs.getRange('A:B').getValues();
    for (let i = 1; i < vals.length; i++) if (String(vals[i][0]) === String(p.text) && vals[i][1] !== 'yes') { fs.getRange(i + 1, 2).setValue('yes'); break; }
    return {};
  },

  importAll(p) {
    const bs = sh_('Batches'), ms = sh_('Movements'), fs = sh_('Flags');
    if (lastRow_(bs) > 1 || lastRow_(ms) > 1) bad_('The sheet already has data — import is only for an empty sheet');
    const B = (p.batches || []).map(b => [b.id, b.client, b.item, b.base, b.supplier, b.code, b.batch, date_(b.mfg), date_(b.exp), date_(b.ext), Number(b.opening) || 0, b.remark, now_()].map(safe_));
    const M = (p.moves || []).map(m => [m.id, m.date, m.b, m.t, Number(m.q) || 0, m.note || '', now_(), ''].map(safe_));
    const F = (p.flags || []).map(t => [safe_(t), '']);
    if (B.length) bs.getRange(2, 1, B.length, B[0].length).setValues(B);
    if (M.length) ms.getRange(2, 1, M.length, M[0].length).setValues(M);
    if (F.length) fs.getRange(2, 1, F.length, 2).setValues(F);
    return { imported: { batches: B.length, moves: M.length, flags: F.length } };
  }
};

/* ---------- helpers ---------- */
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function bad_(msg) { const e = new Error(msg); e.drop = true; throw e; }
function sh_(name) { const s = SpreadsheetApp.getActive().getSheetByName(name); if (!s) throw new Error('Run setup() first'); return s; }
function sheet_(ss, name, cols) {
  const s = ss.getSheetByName(name) || ss.insertSheet(name);
  s.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
  s.setFrozenRows(1);
  return s;
}
function lastRow_(s) { const v = s.getRange('A:A').getValues(); for (let i = v.length - 1; i >= 0; i--) if (v[i][0] !== '') return i + 1; return 1; }
function rows_(name, n) { const s = sh_(name), last = lastRow_(s); return last < 2 ? [] : s.getRange(2, 1, last - 1, n).getValues(); }
function findRow_(s, id) { if (!id) return -1; const v = s.getRange('A:A').getValues(); for (let i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) return i + 1; return -1; }
function append_(s, row) { s.getRange(lastRow_(s) + 1, 1, 1, row.length).setValues([row.map(safe_)]); }
function now_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); }
function date_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  v = String(v || '').trim();
  if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) bad_('Dates must be YYYY-MM-DD');
  return v;
}
function cell_(v) { return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v == null ? '' : v); }
/* stops text like "=IMPORTXML(...)" from being run as a formula */
function safe_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : (v == null ? '' : v); }
