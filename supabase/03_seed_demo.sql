-- ============================================================
-- FILE VAULT: demo content + improved search (Phase 3)
-- Run this WHOLE file in: Supabase Dashboard -> SQL Editor.
-- Safe to re-run (it clears the demo rows first, then re-inserts).
--
-- NOTE: this file is intentionally 100% ASCII with NO spaced hyphens.
-- A spaced " - " pasted into the browser SQL editor gets auto-converted to
-- a long dash (macOS smart dashes) and then mis-stored. Colons sidestep it.
-- ============================================================

-- 1) Upgrade the search function: keyword + partial substring + per-word
--    typo tolerance.
create or replace function public.search_files(q text)
returns setof public.files
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select f.*
  from public.files f
  where
        f.search_tsv @@ websearch_to_tsquery('english', q)
     or f.title ilike '%' || q || '%'
     or word_similarity(q, f.title) > 0.3
  order by
        (case when f.search_tsv @@ websearch_to_tsquery('english', q) then 1 else 0 end) desc,
        ts_rank(f.search_tsv, websearch_to_tsquery('english', q)) desc,
        word_similarity(q, f.title) desc,
        f.created_at desc;
$$;

-- 2) Clear any prior demo rows so re-running never duplicates.
delete from public.files
where storage_path like 'demo/%'
   or external_url in ('https://www.youtube.com/@Rodha', 'https://www.shivamvashisth.com');

-- 3) Demo rows. 'link' rows work end to end now (Open follows external_url).
--    'pdf'/'doc' rows are searchable now; their Download lights up once you
--    add the secret key to .env and upload the matching file to 'vault-files'.
insert into public.files (title, description, type, tags, storage_path, external_url, mime_type, size_bytes)
values
  ('CAT 2024 Quant Formula Sheet',
   'Every quant formula for CAT on two pages: arithmetic, algebra, geometry, modern math.',
   'pdf', array['cat','quant','formulas','mba'],
   'demo/cat-quant-formula-sheet.pdf', null, 'application/pdf', 1180000),

  ('SSC CGL Previous Year Papers (2020 to 2024)',
   'Tier 1 solved papers, year wise, with answer keys.',
   'pdf', array['ssc','cgl','pyq','solved'],
   'demo/ssc-cgl-pyq-2020-2024.pdf', null, 'application/pdf', 8650000),

  ('SSC Maths: One Shot Revision Notes',
   'Last night revision: shortcuts, value ranges, and common traps.',
   'pdf', array['ssc','maths','revision','shortcuts'],
   'demo/ssc-maths-revision.pdf', null, 'application/pdf', 2300000),

  ('MBA Interview: Personal Intro Template',
   'Fill in the blanks script for "tell me about yourself" in B school interviews.',
   'doc', array['mba','interview','wat-pi','template'],
   'demo/mba-intro-template.docx', null,
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 48000),

  ('Rodha: Full CAT Quant Playlist',
   'The complete free quant course on YouTube, in order.',
   'link', array['cat','quant','video','playlist'],
   null, 'https://www.youtube.com/@Rodha', null, null),

  ('Percentile Predictor (live page)',
   'Enter your mock scores, get an estimated percentile band.',
   'link', array['cat','mock','percentile','tool'],
   null, 'https://www.shivamvashisth.com', null, null);
