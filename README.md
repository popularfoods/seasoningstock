# Seasoning Stock

A small stock register for seasonings: receive stock, use it in production, write off expired stock, and see what's on hand per client and batch, with expiry alerts.

**No stock data lives in this repo.** All data is stored in a private Google Sheet. The site only holds code; each browser stores the sheet's address and team key locally after you connect.

## How it fits together

- `index.html` + `app.js`: the site (GitHub Pages).
- `apps-script/Code.gs`: the backend. Paste it into the Google Sheet's Apps Script.
- Google Sheet tabs: **Batches** (one row per batch, with live Received / Used / Written off / Closing columns), **Movements** (every entry, never hard-deleted), **Flags**.

## Set up the Google Sheet (once)

1. Create a new Google Sheet, e.g. "Seasoning Stock DB". Keep it private.
2. **Extensions → Apps Script**. Delete what's there, paste `apps-script/Code.gs`, then save.
3. Pick **setup** in the function dropdown, click **Run**, and allow access.
4. Open **Execution log** and copy the **TEAM KEY**.
5. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Copy the URL ending in `/exec`.
6. Open the site, click **Connection**, and paste the URL and team key.
7. The sheet is empty the first time, so import the starting `.json` stock file. This works once only.

To let someone else use it, give them the site link, the URL and the team key privately.
If the key leaks, run `rotateKey` in Apps Script and re-enter the new key in each browser.

## Reliability

- Every change gets a unique id and goes into a queue in the browser until the sheet confirms it. If you go offline or close the tab, the change is retried later and never applied twice.
- The backend uses a lock, so two people saving at once don't overwrite each other.
- The app reloads from the sheet every 45 seconds and when the tab regains focus, so everyone sees the same numbers.
- Dates are stored as plain `YYYY-MM-DD` text, so Sheets can't flip day and month.
- Deleting a movement marks it `deleted = yes` in the sheet; nothing is erased.
- The Google Sheet keeps its own version history (**File → Version history**).

## Updating the backend

After changing `Code.gs`: **Deploy → Manage deployments → Edit → Version: New version → Deploy**. The URL stays the same.
