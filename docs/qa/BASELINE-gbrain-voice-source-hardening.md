# Baseline Report — gbrain Voice + Source Hardening

**Date:** 2026-06-17
**Branch:** `feature/gbrain-voice-source-hardening`

## Environment

| Item | Value |
|------|-------|
| Bun version | 1.3.3 |
| Install result | No changes (285 installs across 277 packages) |
| Typecheck | Pass (0 errors) |

## Test Results (focused)

| File | Tests | Pass | Fail |
|------|-------|------|------|
| test/graph-adapter-pglite.test.ts | 9 | 9 | 0 |
| test/voice-consolidation-pglite.test.ts | 5 | 5 | 0 |
| test/freshness-digest-pglite.test.ts | 5 | 5 | 0 |
| test/voice-gate.test.ts | 24 | 24 | 0 |
| test/operations-descriptions.test.ts | 27 | 27 | 0 |
| **Total focused** | **70** | **70** | **0** |

## Verify

| Check | Result |
|-------|--------|
| 30 checks | Pass (30/30) |

## Known Failures Before Modifications

None. All focused tests + verify pass at baseline.
