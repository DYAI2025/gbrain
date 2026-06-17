## Mission

Implement the next hardening sprint for GBrain:

Close federated-read source-scope gaps.

Fix VoiceSession persistence.

Implement real provider adapters for Deepgram STT and Supertonic TTS using mockable HTTP tests.

Correct voice consolidation to use `voice_session`.

Add version-drift protection for `openclaw.plugin.json`.

Run QA and code review after each testable feature, fix findings, commit, push, and continue without asking unless a safety blocker appears.

## Branch and Git Rules

Create and use this branch:

`git checkout -b feature/gbrain-voice-source-hardening`

Never commit to `main` or `master`.
Never use `git push --force`.
Never use `--no-verify`.
Commit after each coherent feature.
Push after each feature commit.

## Initial Discovery

Run:

`bun --version
bun install
bun run typecheck
bun run test
bun run verify`

If full test suites are too slow, run focused tests first and document why broader tests were deferred.

Create:

`docs/plans/2026-06-17-gbrain-voice-source-hardening.md
docs/qa/
docs/reviews/`

Write a short baseline report:

`docs/qa/BASELINE-gbrain-voice-source-hardening.md`

Include:

Bun version

install result

typecheck result

focused test result

full/partial test result

known failures before modifications

## Hard Constraints

TDD-first for every code change.

No real API keys in tests.

Use local mock HTTP servers for provider adapter tests.

Do not remove existing behavior unless a test proves the replacement.

Preserve PGLite/Postgres parity.

Preserve remote/federated source isolation.

Do not implement large rewrites.

After each feature:

Run focused tests.

Run relevant broader validation.

Spawn QA agent.

Spawn code-reviewer agent or apply the embedded review checklist.

Fix BLOCKER and MAJOR findings.

Re-run tests.

Commit.

Push.

Continue to next feature without asking.

## Feature 1 — Close Federated Read Scope Gaps

Problem evidence:

`TODOS.md` flags P1 source-scope gaps for `get_chunks`, `get_raw_data`, `get_versions`, `resolve_slugs`.

`src/core/operations.ts` currently uses scalar-only `ctx.sourceId ? { sourceId } : {}` for `get_versions`, `get_raw_data`, `get_chunks`.

`resolve_slugs` calls `ctx.engine.resolveSlugs(partial)` with no scope.

`BrainEngine` currently has `getChunks`, `getRawData`, `getVersions` typed with only `{ sourceId?: string }`.

Required behavior:

All four operations must route through `sourceScopeOpts(ctx)`.

`sourceIds?: string[]` must win over scalar `sourceId`, matching the existing project convention.

Both PGLite and Postgres engines must implement the same semantics.

Out-of-grant reads must return empty/not found, never default-source fallback.

Same-slug union for allowed federated sources must work where the existing read contract expects union.

TDD steps:

Add failing tests under existing source-isolation/federated test style.

Cover:

`get_chunks`

`get_raw_data`

`get_versions`

standalone `resolve_slugs`

scalar source

federated `allowedSources`

default-source decoy must not leak

Update `BrainEngine` interface:

`getChunks(slug, opts?: { sourceId?: string; sourceIds?: string[] })`

`getRawData(slug, source?, opts?: { sourceId?: string; sourceIds?: string[] })`

`getVersions(slug, opts?: { sourceId?: string; sourceIds?: string[] })`

Update PGLite and Postgres implementations with `source_id = ANY($n::text[])` precedence.

Update `src/core/operations.ts` handlers to call `sourceScopeOpts(ctx)`.

Run focused tests.

QA + code review.

Fix.

Commit:

`git add src test docs
git commit -m "fix(gbrain): scope remaining federated read operations"
git push -u origin feature/gbrain-voice-source-hardening`

## Feature 2 — Fix VoiceSession Persistence

Problem evidence:

`src/core/operations.ts` `voice_process` saves `type: 'concept'` and passes `content`, but `PageInput` requires `compiled_truth`.

`src/commands/voice.ts` CLI process also saves `type: 'concept'`.

`voice_session` exists as valid PageType and markdown path type.

Required behavior:

Both MCP operation and CLI must persist voice sessions as:

`type: 'voice_session'`

`title`

`compiled_truth: session.content`

`frontmatter` containing at least:

`type: 'voice_session'`

`source: 'voice'`

`confidence`

`consent`

`session_id` or `slug`

tags added through engine tag methods or supported import pathway, not ignored object fields.

Existing tests must be updated to assert real persistence shape.

TDD steps:

Add failing tests for `voice_process` operation save payload.

Add failing tests for CLI `gbrain voice process` save payload or extract save helper for unit testing.

Implement a shared helper if useful:

`buildVoiceSessionPageInput(session, context)`

Replace duplicated persistence logic in operation and CLI.

Ensure title and slug are deterministic enough for tests or injectable.

Run focused voice tests.

QA + code review.

Fix.

Commit:

`git add src test docs
git commit -m "fix(gbrain): persist voice sessions as first-class pages"
git push`

## Feature 3 — Correct Voice Consolidation

Problem evidence:

`src/commands/voice.ts` `consolidate` currently filters `pages.filter(p => p.type === 'concept' && p.title.startsWith('voice-session-'))`.

Voice sessions should be `type: voice_session`.

Required behavior:

Consolidation must target `type === 'voice_session'`.

It should not rely on title prefix when slug/type/frontmatter are available.

It should preserve original transcript as source.

It should parse tags from real page tags and/or frontmatter tags.

Failed graph writes should be reported but not crash the full batch.

TDD steps:

Add failing test with a persisted `voice_session` page.

Ensure old concept fallback is either removed or kept as backwards-compatible migration behavior with explicit test.

Implement corrected filter.

Run focused tests:

`voice-consolidation*`

`src/core/voice/consolidation.test.ts`

QA + code review.

Fix.

Commit:

`git add src test docs
git commit -m "fix(gbrain): consolidate voice_session pages"
git push`

## Feature 4 — Implement Supertonic TTS Adapter

Problem evidence:

`SupertonicTTSAdapter.synthesize()` throws `Supertonic TTS not implemented in MVP`.

Tests currently expect the placeholder error.

Required behavior:

Implement HTTP call to configurable Supertonic/OpenAI-compatible speech endpoint.

Default base URL remains configurable.

No real network in tests except mock local HTTP server.

Return `ArrayBuffer` audio bytes.

On HTTP errors, throw actionable error without leaking request body secrets.

`isAvailable()` should be true only when base URL is valid/configured or should perform no network check; choose one behavior and test it.

TDD steps:

Replace placeholder test with mock HTTP success test.

Add HTTP error test.

Add invalid URL/config test.

Implement using `fetch`.

Preserve `MockTTSAdapter`.

Run focused TTS tests.

QA + code review.

Fix.

Commit:

`git add src/core/voice test docs
git commit -m "feat(gbrain): implement supertonic tts adapter"
git push`

## Feature 5 — Implement Deepgram STT Adapter

Problem evidence:

`DeepgramSTTAdapter.transcribe()` throws `Deepgram transcription not implemented in MVP`.

Tests currently expect the placeholder error.

Required behavior:

Implement Deepgram-compatible transcription through fetch.

No real API calls in unit tests.

API key is passed via constructor/env config only.

Never log or return API key.

Accept `AudioInput` with `buffer` and `mimeType`; define behavior for `fileRef` explicitly.

Return:

`text`

`segments` if available

`language`

`confidence`

`provider: 'deepgram'`

TDD steps:

Replace placeholder test with local mock HTTP success response.

Add HTTP failure test.

Add missing API key test.

Add malformed provider response test.

Implement adapter.

Run focused STT tests.

QA + code review.

Fix.

Commit:

`git add src/core/voice test docs
git commit -m "feat(gbrain): implement deepgram stt adapter"
git push`

## Feature 6 — Make VoiceSessionService Brain-Aware

Problem evidence:

`VoiceSessionService` currently creates answer text with:

`I processed your input about: ...`

That is a demo response, not GBrain context.

Required behavior:

Add optional dependency injection:

`contextProvider?: (transcript, context) => Promise<{ answer: string; citations?: unknown[] }>`

Default behavior may remain current dummy answer for backward compatibility.

If provided, the service uses the contextProvider answer before TTS.

Persist answer in page content.

Test no-provider and provider paths.

TDD steps:

Add test proving default behavior stays compatible.

Add test proving injected contextProvider answer is used.

Add test proving provider errors degrade safely or fail explicitly; choose one behavior and document.

Implement.

Run focused tests.

QA + code review.

Fix.

Commit:

`git add src/core/voice test docs
git commit -m "feat(gbrain): allow voice sessions to use brain context"
git push`

## Feature 7 — Version Drift Protection

Problem evidence:

`package.json` and `VERSION` are `0.42.47.0`.

`openclaw.plugin.json` is `0.32.3.0`.

Required behavior:

Decide whether plugin manifest version must match package version. If yes, update it.

Add a test or check script so future drift is caught.

If intentional drift is desired, document the invariant clearly and encode the allowed behavior.

TDD steps:

Add failing test/check for version consistency.

Update `openclaw.plugin.json` or document exception.

Run relevant tests/checks.

QA + code review.

Fix.

Commit:

`git add openclaw.plugin.json test scripts docs
git commit -m "chore(gbrain): guard plugin version drift"
git push`

## Feature 8 — Update Docs and TODOs

Required behavior:

Update:

`docs/gbrain-voice.md`

`docs/gbrain-architecture.md`

`TODOS.md`

`CHANGELOG.md`

Remove or mark completed only the exact fixed TODOs.

Do not claim production readiness unless integration tests prove it.

TDD/validation:

Run docs/check scripts if available.

Run relevant voice/source-scope tests.

Run typecheck.

Run `bun run verify` if feasible.

QA + code review.

Commit:

`git add docs TODOS.md CHANGELOG.md
git commit -m "docs(gbrain): document voice and source-scope hardening"
git push`

## QA Agent Brief

After each feature, spawn QA with this instruction:

Review only the current feature delta. Verify acceptance criteria, run focused tests, inspect edge cases, and produce `docs/qa/QA-<feature>.md`.

Classify findings:

BLOCKER: must fix before commit

MAJOR: must fix before commit unless explicitly justified

MINOR: fix if local and low-risk, otherwise document

Edge cases:

federated source with default decoy

out-of-grant source

same slug across sources

missing STT/TTS config

malformed base64 audio

provider HTTP 400/500

invalid provider JSON

voice page without tags

graph write failure

no secrets in logs

## Code Reviewer Brief

After QA, spawn code reviewer or apply this checklist:

Source isolation:

every read op uses `sourceScopeOpts(ctx)` where required

`sourceIds` wins over `sourceId`

both engines behave identically

Voice persistence:

`PageInput.compiled_truth` is used

`type: voice_session`

frontmatter carries provenance

tags are actually persisted

Adapter quality:

no real API in tests

no secrets in errors/logs

actionable errors

bounded outputs

Architecture:

Core does not depend on UI

Providers are adapters

no duplicated business logic in CLI/MCP

Tests:

fail before fix

pass after fix

cover success and failure

avoid brittle timing/randomness

Git:

coherent commit

no main/master

no force push

## Final Validation

Before final response, run as much as feasible:

`bun run typecheck
bun run test
bun run verify
bun run check:all`

If a full suite is too slow or environment-bound, run focused tests plus a documented subset. Never claim a test passed unless it actually ran.

## Stop Conditions

Stop only for:

missing Bun/toolchain that cannot be installed

destructive migration requiring operator decision

external credential requirement where mock cannot cover behavior

unresolved source-isolation ambiguity

security blocker

Otherwise continue without asking.
