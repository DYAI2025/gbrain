# Traceability Matrix: GBrain Atlas Context System

Status: `READY_FOR_AGILETEAM_PLANNING`
Feature Slug: `gbrain-atlas-context-system`

> Reconstructed from a format-corrupted source (`SRC-004`): the original table had
> collapsed column delimiters. Column contents are recovered; the contract-required
> `Evidence Needed` and `Source Type` columns were added, and `Status` values were
> normalized to the traceability-contract vocabulary. No `REQ` linkage was invented —
> all Vision/Canvas/AC links come from the source material.

## Traceability Table

| Trace ID | Requirement | Vision Link | Canvas Link | Acceptance Criteria | Evidence Needed | Source Type | Status |
|---|---|---|---|---|---|---|---|
| `TRC-001` | `REQ-001` Markdown Input Intake | `VIS-006` | `CAN-007`, `CAN-014` | `AC-001`–`AC-003` | **VERIFIED** (Evidence-Sweep 2026-06-21): Ingest non-destruktiv via `parseMarkdown`/`import-file`. `AC-003` Goldstandard-Kandidat hängt an REQ-002 (PARTIAL). | `EXPLICIT` | `linked` |
| `TRC-002` | `REQ-002` Goldstandard Validation | `VIS-004`, `VIS-006` | `CAN-006`, `CAN-009` | `AC-004`–`AC-006` | **VERIFIED** (`T-101`, branch `feature/t-101-goldstandard-gate`, noch nicht gemerged): source-scoped Goldstandard-Gate gebaut — eine `goldstandard:true`-Source erzwingt slug/title/type vor dem Write, blockt invalide Metadaten (AC-006) mit strukturierten Fehlern (AC-005, AC-004); `relations` optional-aber-shape-geprüft. TDD (13 Fälle) + end-to-end CLI-verifiziert. | `EXPLICIT` | `linked` |
| `TRC-003` | `REQ-003` Controlled Write | `VIS-009` | `CAN-010` | `AC-007`–`AC-009` | `AC-007` **verifiziert** (Isolation: Write in `gbrain-atlas-context` nicht in `default`/Cross-Source sichtbar). `AC-008` **verifiziert** (`F-001`). `AC-009` **NICHT erfüllt** → `F-002` (kein konsolidierter Audit-Record). | `EXPLICIT` | `missing-evidence` |
| `TRC-004` | `REQ-004` Semantic/Ontological Linking | `VIS-004`, `VIS-005` | `CAN-006`, `CAN-013` | `AC-010`–`AC-012` | **VERIFIED (live)** (Evidence-Sweep): typisierte Kanten + Provenance live reproduziert — 2. Page → `created:1`, `invested_in` aus Verb inferiert, `works_at` aus Frontmatter mit `origin_field`; Relational-Query löst korrekt auf. `created:0` der 1. Page = erwartetes Verhalten, kein Defekt. | `ASSUMPTION` | `linked` |
| `TRC-005` | `REQ-005` Gap Visibility | `VIS-004`, `VIS-008` | `CAN-009`, `CAN-011` | `AC-013`–`AC-015` | **PARTIAL** (Evidence-Sweep, nur Code): `GAP-C1` (Orphans/Backlink-Gap) bedient, `GAP-C4` teilweise; **`GAP-C2` (Kante ohne Provenance) + `GAP-C3` (Konfidenz<Schwelle) fehlen** (Kanten haben keine Confidence-Spalte). 1/4 Kriterien solide (`T-103`). | `EXPLICIT` | `missing-evidence` |
| `TRC-006` | `REQ-006` MCP HTTP Smoke | `VIS-007` | `CAN-011` | `AC-016`–`AC-018` | **VERIFIED (live)** (Evidence-Sweep): `serve --http` (PGLite) → `/health` 200, `/mcp` 401→Bearer→200 MCP-konform (SSE). Lücke: kein einzelner benannter Smoke-Befehl, verstreut (`T-104`). | `EXPLICIT` | `linked` |
| `TRC-007` | `REQ-007` Atlas Graph Export | `VIS-005`, `VIS-008` | `CAN-009`, `CAN-014` | `AC-019`–`AC-021` | **PARTIAL** (Evidence-Sweep): Atlas-App existiert + rendert 3D (`gbrain-atlas/`, react-force-graph-3d, render-ready `graph.json`, stabile IDs). Aber **kein gbrain-Export** — Atlas re-derived den Graph aus gbrains DB (Architektur invertiert, `RISK-006`-Drift) (`T-102`). | `ASSUMPTION` | `missing-evidence` |
| `TRC-008` | `REQ-008` Multi-Format Skill | `VIS-006`, `VIS-011` | `CAN-008` | `AC-022`–`AC-024` | Deferred (post-MVP): Conversion-Skill-Kandidat-Output, sobald gebaut | `ASSUMPTION` | `missing-evidence` |

> **Status-Legende.** Die `Status`-Spalte nutzt das Traceability-Contract-Enum, das **kein**
> `verified` kennt. Konvention hier: `linked` = voll verdrahtet **und** im Evidence-Sweep
> (2026-06-21) belegt; `missing-evidence` = Evidenz unvollständig/offen. Das **maßgebliche
> Evidenz-Verdikt** steht in der `Evidence Needed`-Spalte (**VERIFIED (live)** / **VERIFIED** /
> **PARTIAL** / **GAP** / deferred). `T-1xx` = TODO-Referenzen in `TODOS.md`.

## Coverage

- Requirements in PRD: `REQ-001`…`REQ-008` (8).
- Requirements in Matrix: `REQ-001`…`REQ-008` (8). Bijektiv — keine verwaisten REQ, keine unbekannten Trace-Referenzen.
- Vision-Linkage: vollständig (jedes REQ ≥1 `VIS-*`).
- Canvas-Linkage: vollständig (jedes REQ ≥1 `CAN-*`).
- Acceptance-Criteria-Linkage: vollständig (`AC-001`…`AC-024`, je REQ 3 AC).
- Evidence-Linkage (Stand nach Evidence-Sweep 2026-06-21):
  - **VERIFIED**: `REQ-001` Ingest, `REQ-002` Goldstandard-Gate (`T-101`, branch — gebaut+getestet), `REQ-004` Linking (live), `REQ-006` MCP-HTTP-Smoke (live). `REQ-003`: `AC-007`+`AC-008` verifiziert.
  - **PARTIAL**: `REQ-005` (GAP-C1 ja, C2/C3 fehlen — `T-103`), `REQ-007` (Atlas rendert, aber kein gbrain-Export → invertiert — `T-102`).
  - **GAP/offen**: `REQ-003`/`AC-009` (`F-002` Audit-Record), `REQ-008` deferred, und die o.g. PARTIAL-Restlücken (`T-101`…`T-104`).
  - Keine `EV-*`-Artefakte als formale Belegobjekte; die Sweep-Verdikte ersetzen sie für die geprüften REQ. Der Nutzer hat Planning trotz Restlücken bestätigt (OQ-005); offene Punkte bleiben dokumentierte Planning-Inputs.

## Aufgelöste offene Punkte

- `OQ-001` (Write-Ziel-Source): **aufgelöst** → `gbrain-atlas-context` (REQ-003 / NFR-003 / CAN-010).
- `OQ-004` (Gap-Kriterien): **aufgelöst** → `GAP-C1` Knoten ohne typisierte Kante, `GAP-C2` Kante ohne Provenance, `GAP-C3` Konfidenz < Cutoff (default 0.5), `GAP-C4` verwaiste Pflicht-Relation (REQ-005).
- `OQ-002` (Evidence): **deferred** — Soll-Belege formuliert, Erbringung beim MVP-Bau.
- `OQ-005` (User-Confirmation): **aufgelöst** → Nutzer hat am 2026-06-21 im Kontext explizit bestätigt; Readiness → `READY_FOR_AGILETEAM_PLANNING`. `F-002` (AC-009-Gap) + `OQ-002` (deferred Evidence) bleiben dokumentierte offene Planning-Inputs.

## Findings (Test-Evidenz)

### `F-001` — `gbrain put --dry-run` schrieb real (AC-008-Verletzung), behoben

- **Betrifft:** `REQ-003` / `AC-008` ("dry-run → kein persistenter Write, Preview zurück").
- **Symptom:** `gbrain put <slug> --source gbrain-atlas-context --dry-run` legte die Page **persistent** an (Page-Count 0→1) statt eine Preview zurückzugeben. Reproduziert am 2026-06-21.
- **Root Cause:** `ctx.dryRun` ist ein globales Context-Feld (`makeContext` liest `params.dry_run`), das von ~16 mutierenden Ops geehrt wird — aber von **keiner** als Parameter deklariert ist. Der generische Arg-Parser (`src/cli.ts:parseOpArgs`) setzte `params[key]` nur bei Op-Deklaration; `--dry-run` wurde damit stillschweigend verworfen (und konnte im Footgun-Fall sogar das Folge-Token als Wert schlucken). `ctx.dryRun` blieb `false` → echter Write. Klassen-Bug, nicht put_page-spezifisch.
- **Fix:** `parseOpArgs` erkennt `dry_run` nun als globalen Boolean unabhängig von der Op-Deklaration (`src/cli.ts`). Behebt den gesamten `ctx.dryRun`-Op-Kreis.
- **Test:** `test/cli-args.test.ts` — 2 neue Fälle (RED→GREEN), inkl. Footgun-Regression (kein Token-Swallow).
- **Verifikation:** Nach Fix liefert der Dry-run `{ "dry_run": true, "action": "put_page", "slug": … }`; `get` auf den Slug → `page_not_found` (nichts geschrieben). `AC-008` damit lokal **verifiziert**. `AC-007` (Write nur in konfigurierte Source) und `AC-009` (Audit-Log Source/Slug/Timestamp/Result) bleiben offen.
- **Status:** Code-Fix lokal verifiziert; Commit/Push separat. Kein `/ship` ohne Freigabe.

### `F-002` — `AC-009` (Write-Audit) ist nicht erfüllt: kein konsolidierter Audit-Record

- **Betrifft:** `REQ-003` / `AC-009` ("audit data is inspected → source, slug, timestamp, operation result visible").
- **Test (2026-06-21):** Realer Write von `atlas-isolation-probe` in `gbrain-atlas-context`, danach Audit-Surface inspiziert.
- **Befund:** Die vier geforderten Felder existieren nur **verstreut**, nicht als inspizierbarer Audit-Record:
  - `slug` + `status`/`result` → im `put`-Rückgabewert (`{slug, status:"created_or_updated"}`).
  - `timestamp` (Datum) + `slug` → via `gbrain list --source …`.
  - `source` → nur **implizit** über den Query-Scope; der Write-Result nennt die Ziel-Source nicht.
  - `gbrain history <slug>` → leer ("No versions"); kein Audit-/Provenance-CLI-Op; `~/.gbrain/audit/` enthält nur Budget-/Dream-/Backpressure-Logs, keinen Page-Write-Audit.
  - `write_through` wurde **übersprungen** (`skipped: source_repo_belongs_to_other_source`) — eine DB-only Source ohne `local_path` hat keinen Provenance-Schreibpfad.
- **Schluss:** `AC-009` ist mit der aktuellen Plattform **nicht erfüllbar**, ohne dass GBrain einen Put-Level-Audit-Record (source+slug+timestamp+result an einer Stelle) emittiert. Echter Gap, kein bloßes `missing-evidence`.
- **Status:** offen — Feature-Bedarf (Audit-Record für `put_page`), nicht durch Test schließbar. `AC-007` + `AC-008` dagegen verifiziert.

### `F-003` — Evidence-Sweep gegen die reale Plattform (2026-06-21)

- **Was:** 5 parallele Capability-Probes (Multi-Agent-Workflow) gegen den gbrain-Code/Runtime, um die MVP-REQ über die Spec hinaus an der **realen Plattform** zu prüfen. Mehrere Probes mit **Live-Reproduktion** in Wegwerf-Brains (`GBRAIN_HOME=/tmp`, danach gelöscht; User-Brain unangetastet).
- **Verifiziert (live):** `REQ-004` Linking (typisierte Kanten + Provenance reproduziert: `invested_in` aus Verb, `works_at` aus Frontmatter; Relational-Query löst auf). `REQ-006` MCP-HTTP-Smoke (`serve --http` → `/health` 200, Bearer→`/mcp` 200 MCP-konform/SSE). `REQ-001` Ingest non-destruktiv.
- **PARTIAL:** `REQ-002` (generischer Validator ja, Goldstandard-Required-Field-Gate nein, nicht vor Write verdrahtet — `T-101`). `REQ-005` (`GAP-C1` ja, `GAP-C2`/`GAP-C3` fehlen, Kanten ohne Confidence-Spalte — `T-103`). `REQ-007` (Atlas-App `gbrain-atlas/` existiert + rendert 3D, aber **kein gbrain-Export** — Atlas re-derived den Graph aus der DB, `RISK-006`-Drift — `T-102`).
- **Korrektur:** Das früher beobachtete `auto_links:{created:0}` war **korrektes** Verhalten (1. Page, keine Ziel-Pages), kein Defekt — live widerlegt.
- **Schluss:** Die MVP-Maschinerie existiert größtenteils und funktioniert; Restarbeit ist **Integration + 3 echte Lücken** (`T-101`…`T-104` + `F-002`), kein Greenfield. Folge-TODOs in `TODOS.md`.

## Roadmap-Ableitung (aus SRC-004, informativ)

| Phase | Ziel | Ergebnis |
|---|---|---|
| Phase 0 | Repo-/Runtime-Gate | Lokaler GBrain MCP HTTP Smoke läuft reproduzierbar. |
| Phase 1 | Markdown-Goldstandard-Kreislauf | Markdown → validierter Goldstandard → GBrain Source Write. |
| Phase 2 | Graph + Gap | Importierte Pages erzeugen Nodes/Edges; Lücken werden sichtbar. |
| Phase 3 | Atlas Export | GBrain-Graph wird in Atlas als 3D-Graph dargestellt. |
| Phase 4 | Context Pack | Agenten bekommen strukturierte Kontextpakete aus GBrain. |
| Phase 5 | Conversion Skill | PDF/HTML/andere Formate werden in Goldstandard-Markdown überführt. |
| Phase 6 | Controlled Write Workflows | Agenten dürfen validiert und auditiert in eigene Sources schreiben. |
