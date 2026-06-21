# Design: Goldstandard write-gate (T-101, REQ-002)

**Date:** 2026-06-21 · **Branch:** `feature/t-101-goldstandard-gate` · **Source:** TODOS.md `T-101`, traceability `TRC-002`

## Problem

REQ-002 / AC-004–AC-006 require validating Markdown against a "Goldstandard" format
(required frontmatter: `slug`, `title`, `type`; `relations` checked) **before** writing,
with structured errors, so invalid metadata **blocks** the write (AC-006). Today gbrain
has only a generic structural frontmatter validator (`parseMarkdown({validate:true})`,
8 codes) which is opt-in and not wired into the write path, plus a non-gating `gbrain lint`.

## Key constraint (from code investigation)

A **global** required-field gate on `put_page` would break gbrain: ~20 callers
(capture, extract, voice, brainstorm, sync, MCP dispatch …) write pages without explicit
`type`, and gbrain deliberately **tolerates** this (v0.39 unknown-type auto-prompt, not a
block). `relations` is not an input field at all — it is schema-pack `frontmatter_links`.
So the gate MUST be **opt-in and source-scoped**, default behaviour unchanged.

## Decisions (brainstormed with user)

1. **Scope = source policy.** A source carrying `goldstandard: true` in its config enforces
   the gate on writes **into** it. Set via `gbrain sources add --goldstandard`. The source
   enforces — the writing agent cannot forget a per-call flag. Mirrors `federated`.
2. **Strictness.** Required (non-empty): `slug`, `title`, `type`. `relations` is **optional**
   but, when present, must be an array (shape-checked) — NOT presence-required. Rationale:
   REQ-004 is verified — the first/standalone page legitimately has no relations
   (`created:0` is correct); a ≥1-relation mandate would block legitimate pages and fight
   the auto-link pipeline.
3. **Architecture.** Extend the existing `parseMarkdown` validation path; reuse
   `ParseValidationError`. No parallel validator, no new CLI surface beyond `--goldstandard`.

## Mechanism

- **`src/core/markdown.ts`**: add codes `MISSING_REQUIRED_FIELD`, `INVALID_RELATIONS_SHAPE`;
  add `field?: string` to `ParseValidationError`; add `goldstandard?: boolean` to `ParseOpts`.
  When `goldstandard`, assert non-empty `slug`/`title`/`type` in frontmatter and array-shape
  for `relations` if present. `result.errors` is populated when `validate` **or** `goldstandard`.
- **Source flag**: `isGoldstandard(config)` helper (mirrors `isFederated`); `--goldstandard`
  flag in `sources add`.
- **Write path (`put_page` in `src/core/operations.ts`)**: at the top of the handler, after
  slug resolution and **before** the dry-run return and persist, look up the target source's
  config (`ctx.sourceId`). If goldstandard, run `parseMarkdown(content, slug+'.md',
  {validate:true, goldstandard:true, expectedSlug:slug})`. On any errors, throw
  `OperationError('goldstandard_validation_failed', {errors})` — blocks the write AND surfaces
  errors in dry-run (more honest than a "preview ok"). Non-goldstandard sources: a boolean
  short-circuit, zero behaviour change.

## Cost / blast radius

One extra source-config read per `put_page` into a goldstandard source (tiny table). The
~20 existing callers and the tolerant unknown-type flow are untouched (non-goldstandard
sources skip the check entirely).

## TDD plan

1. `markdown.ts` unit: missing `slug`/`title`/`type` → `MISSING_REQUIRED_FIELD` (one per
   field); `relations` non-array → `INVALID_RELATIONS_SHAPE`; `relations` absent → ok; all
   present → no goldstandard errors.
2. `put_page` integration: invalid write into a goldstandard source → blocked, no page;
   valid → writes; dry-run invalid → returns errors. (Throwaway PGLite brain.)
3. Regression: write into a **non**-goldstandard source without `type` → still succeeds
   (tolerant flow intact).

## Out of scope (YAGNI)

`relations` presence mandate; per-call flag; standalone validate-only command; auto-fix of
invalid metadata; back-validation of already-written pages.
