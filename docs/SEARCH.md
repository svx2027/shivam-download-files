# Search design

The vault's search box (`src/components/SearchVault.tsx`) calls one Postgres
function, `search_files(q)`. It's first defined in `supabase/01_schema.sql`,
then dropped and recreated in `supabase/04_hardening.sql` with the same
matching and ranking logic but a narrower return type — `setof public.files`
(every column) becomes an explicit column list that drops `storage_path` and
`search_tsv`, so the browser-facing key can never read the internal storage
path or the raw search vector. `04_hardening.sql` runs last, so that's the
version live in production; everything below about matching and ranking is
identical between the two.

## Two problems, one query

A file title is usually a few words a visitor half-remembers ("tax pdf",
"resme", "onboarding doc"). That means search has to handle two different
failure modes at once:

1. **Keyword match** — the query shares real words with the title/description/
   tags, just not necessarily in order or with the same casing.
2. **Typos** — the query is close to a word but doesn't share a clean token
   with it (`resme` vs `resume`), so keyword matching alone returns nothing.

`search_files()` runs both in a single SQL statement and lets Postgres rank
the result, rather than doing two separate queries and merging them in the
app:

```sql
where
      f.search_tsv @@ websearch_to_tsquery('english', q)  -- exact / keyword
   or f.title ilike '%' || q || '%'                       -- partial substring
   or word_similarity(q, f.title) > 0.3                   -- typo-tolerant (per word)
order by
      (case when f.search_tsv @@ websearch_to_tsquery('english', q) then 1 else 0 end) desc,
      ts_rank(f.search_tsv, websearch_to_tsquery('english', q)) desc,
      word_similarity(q, f.title) desc,
      f.created_at desc;
```

## Keyword matching: `search_tsv`

`files.search_tsv` is a stored, generated `tsvector` column (built once at
write time, not recomputed per search):

```sql
search_tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
 || setweight(to_tsvector('english', coalesce(description, '')), 'B')
 || setweight(to_tsvector('english', files_tags_text(tags)), 'C')
) stored
```

Title, description, and tags are folded into one vector with different
weights (A > B > C), so a query hit in the title outranks the same word only
appearing in a tag. A GIN index (`files_search_tsv_idx`) makes the
`@@ websearch_to_tsquery(...)` lookup fast. `websearch_to_tsquery` (rather
than plain `to_tsquery`) is what lets a visitor type `tax form 2024` like a
search-engine query instead of formal tsquery syntax.

`files_tags_text()` exists only because a generated column requires every
function it calls to be `IMMUTABLE`, and Postgres ships `array_to_string` as
merely `stable`. Joining a `text[]` with a fixed separator is genuinely
deterministic, so it's wrapped in a one-line `IMMUTABLE` SQL function to
satisfy the generated-column rule.

## Typo tolerance: `pg_trgm`

Keyword search alone fails the moment a query doesn't share a clean token
with the title — a misspelling, a missing letter, a transposed pair. That's
what `pg_trgm` (`create extension if not exists pg_trgm`) adds:
`word_similarity(q, title)` breaks both the query and the title into
3-character trigrams and scores how much they overlap, per word rather than
across the whole title, so a typo in one word doesn't drag down a match on
an otherwise-good title. `files_title_trgm_idx` is a GIN trigram index on
`title` so that comparison doesn't scan the whole table.

The `> 0.3` threshold is a tuned cutoff, not a Postgres default: low enough
to catch a genuine one-letter typo, high enough that two unrelated short
titles don't accidentally clear it. There's also a plain `ilike '%q%'`
substring clause alongside it, which catches the case trigram similarity is
worst at — a short, exact substring inside a much longer title (a trigram
score naturally drops as the non-matching remainder of the title grows).

## Ranking

All three clauses can each independently make a row eligible; the `order by`
is what keeps results useful once they are. A row that satisfies the exact
keyword clause is always sorted above one that only satisfies substring or
trigram matching, regardless of any similarity score — a real keyword hit is
a stronger signal than any fuzzy score, so it isn't let compete with the
fuzzy score for the top spot. Within each tier, `ts_rank` orders keyword hits
by title/description/tag weight, and `word_similarity` orders fuzzy hits by
closeness; `created_at desc` is the final tiebreaker.

## Where the client fits in

`src/lib/files.ts`'s `searchFiles()` calls this as one RPC —
`supabase.rpc('search_files', { q })` — so all of the above runs inside
Postgres in a single round trip; the client does no client-side filtering or
merging of separate result sets. An empty/whitespace-only query skips the
RPC entirely and falls back to `listRecent()` (newest files first), since
"no query yet" and "query that matches nothing" should not look the same to
a visitor who just opened the page. `SearchVault.tsx` debounces keystrokes by
180ms before calling `searchFiles()`, and tracks each request's id so a
slow, stale response can never overwrite a newer one if responses arrive out
of order.
