-- Add blur_zones column to hg_screenshots.
-- Stores an array of rectangles [{x, y, w, h}] as JSONB.
-- Employees can mark sensitive areas on their screenshots.

alter table hg_screenshots
  add column if not exists blur_zones jsonb default '[]'::jsonb;
