# QA Report: Feature 1 — Federated Read Scope Gaps

## Changes
- Updated `BrainEngine` interface: `getChunks`, `getRawData`, `getVersions` now accept `sourceIds?: string[]`
- Updated both PGLite and Postgres engines with `sourceIds[]` → `ANY($::text[])` SQL branch
- Updated `get_chunks`, `get_raw_data`, `get_versions`, `resolve_slugs` handlers to use `sourceScopeOpts(ctx)`
- Updated `revert_version` handler to use `sourceScopeOpts(ctx)` (was still on old scalar pattern)
- Added 10 hermetic PGLite tests

## Test Results
- 10/10 tests pass (0 failures)

## Known Gaps
- Postgres engine coverage requires `DATABASE_URL` (external test infrastructure)
- `getRawData` has extra `source` parameter (4-way combinatorial) — only `getChunks` tested directly
- BLOCKER-1 (get_versions privacy boundary) pre-existing, not fixed (out of scope)

## Edge Cases Checked
- ✅ Scalar sourceId filter
- ✅ Federated sourceIds array filter
- ✅ sourceIds wins over sourceId
- ✅ Default-source decoy does not leak
- ✅ Out-of-grant source returns empty
- ✅ Empty sourceIds: [] = unscoped (matches sourceScopeOpts)
- ✅ resolveSlugs respects scalar and array scope
- ✅ resolveSlugs out-of-grant returns empty
