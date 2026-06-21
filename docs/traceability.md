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
| `TRC-001` | `REQ-001` Markdown Input Intake | `VIS-006` | `CAN-007`, `CAN-014` | `AC-001`–`AC-003` | Ingest-Lauflog auf Sample-Markdown (non-destruktiver Parse + Goldstandard-Kandidat) | `EXPLICIT` | `missing-evidence` |
| `TRC-002` | `REQ-002` Goldstandard Validation | `VIS-004`, `VIS-006` | `CAN-006`, `CAN-009` | `AC-004`–`AC-006` | Validierungsreport auf valide + invalide Fixtures (strukturierte Fehler) | `ASSUMPTION` | `missing-evidence` |
| `TRC-003` | `REQ-003` Controlled Write | `VIS-009` | `CAN-010` | `AC-007`–`AC-009` | `AC-007` **verifiziert** (Isolation: Write in `gbrain-atlas-context` nicht in `default`/Cross-Source sichtbar). `AC-008` **verifiziert** (`F-001`). `AC-009` **NICHT erfüllt** → `F-002` (kein konsolidierter Audit-Record). | `EXPLICIT` | `missing-evidence` |
| `TRC-004` | `REQ-004` Semantic/Ontological Linking | `VIS-004`, `VIS-005` | `CAN-006`, `CAN-013` | `AC-010`–`AC-012` | Node/Edge-Set mit Relationstyp + Provenance-Markern | `ASSUMPTION` | `missing-evidence` |
| `TRC-005` | `REQ-005` Gap Visibility | `VIS-004`, `VIS-008` | `CAN-009`, `CAN-011` | `AC-013`–`AC-015` | Gap-Detection-Output mit ≥1 Gap nach Kriterien `GAP-C1`…`GAP-C4` (OQ-004) + Atlas-Gap-Indikator | `EXPLICIT` | `missing-evidence` |
| `TRC-006` | `REQ-006` MCP HTTP Smoke | `VIS-007` | `CAN-011` | `AC-016`–`AC-018` | Reproduzierbares MCP-HTTP-Smoke-Transkript mit Pass/Fail-Log | `EXPLICIT` | `missing-evidence` |
| `TRC-007` | `REQ-007` Atlas Graph Export | `VIS-005`, `VIS-008` | `CAN-009`, `CAN-014` | `AC-019`–`AC-021` | Graph-Export-Sample + Atlas-Render mit stabilen IDs | `ASSUMPTION` | `missing-evidence` |
| `TRC-008` | `REQ-008` Multi-Format Skill | `VIS-006`, `VIS-011` | `CAN-008` | `AC-022`–`AC-024` | Deferred (post-MVP): Conversion-Skill-Kandidat-Output, sobald gebaut | `ASSUMPTION` | `missing-evidence` |

## Coverage

- Requirements in PRD: `REQ-001`…`REQ-008` (8).
- Requirements in Matrix: `REQ-001`…`REQ-008` (8). Bijektiv — keine verwaisten REQ, keine unbekannten Trace-Referenzen.
- Vision-Linkage: vollständig (jedes REQ ≥1 `VIS-*`).
- Canvas-Linkage: vollständig (jedes REQ ≥1 `CAN-*`).
- Acceptance-Criteria-Linkage: vollständig (`AC-001`…`AC-024`, je REQ 3 AC).
- Evidence-Linkage: **offen (deferred, OQ-002)** — keine `EV-*`-Artefakte; Evidence-Bedarfe pro REQ sind formuliert, werden aber erst beim Bauen/Testen des MVP erbracht. Alle Zeilen `missing-evidence`. Der Nutzer hat Planning trotz deferred Evidence ausdrücklich bestätigt (OQ-005); Evidence + `F-002` bleiben dokumentierte offene Planning-Inputs, kein struktureller Traceability-Block.

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
