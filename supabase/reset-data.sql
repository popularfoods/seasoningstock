-- Clears ALL stock data so a fresh Excel import can be loaded.
-- Run schema.sql first (it adds any new columns), then this, then import in the app.
-- Members (who can sign in) are kept.
truncate public.movements, public.batches, public.flags, public.items;
