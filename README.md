# Seasoning Stock

A small stock register for seasonings: receive stock, use it in production, write off expired stock, and see what's on hand per client and batch, with expiry alerts.

**No stock data lives in this repo.** All data is in a private Supabase database that only approved email addresses can open. The project URL, key and login are typed into the app and kept only in that browser.

## How it fits together

- `index.html` + `app.js`: the site (GitHub Pages).
- `supabase/schema.sql`: the database tables, access rules and a `stock` view. Run it once in Supabase.

## Set up Supabase (once, about 10 minutes)

1. Go to **supabase.com**, sign up, and create a **New project** (region: Mumbai). Save the database password somewhere safe.
2. **SQL Editor → New query**: paste `supabase/schema.sql`. Uncomment the `insert into public.members` line, put your email in it, then **Run**.
3. **Authentication → Users → Add user → Create new user**: your email and a password, with **Auto Confirm User** ticked.
4. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
6. Open the site, tap **Connection**, and paste the URL and key with your email and password.
7. The database is empty the first time, so import the starting `.json` stock file. This works once only.

**Adding a teammate:** add their email to `members` (SQL Editor: `insert into public.members values ('name@company.com');`), create their user in step 3, then send them the site link, URL and key privately.

## Reliability and safety

- Each entry gets a unique id and waits in the browser until the database confirms it. If the internet drops or the tab closes, it's retried later and never counted twice.
- Phones update live when someone else saves, and the app also refreshes every minute.
- Access rules in the database: only emails in `members` can read or write. Nobody can delete rows; deleting a movement only marks it `deleted`.
- The database rejects impossible entries, such as a negative "use" or an unknown batch.
- Batches record who last changed them and when.
- The `stock` view in Supabase's Table Editor shows Received / Used / Written off / Closing per batch.
- Supabase takes daily backups on the free plan.
