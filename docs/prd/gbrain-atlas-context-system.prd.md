# PRD: GBrain Atlas Context System

Status: `READY_FOR_AGILETEAM_PLANNING`
Feature Slug: `gbrain-atlas-context-system`

## 1. Objective

**Status:** `EXPLICIT + ASSUMPTION`

Build a locally deployable GBrain-based context system that transforms Markdown files into validated Goldstandard Markdown, writes them into a controlled GBrain source, links them semantically and ontologically, exposes the resulting context through MCP, and allows Atlas to visualize the resulting graph and context gaps in 3D.

## 2. Primary User

**Status:** `EXPLICIT`

The primary MVP user is a system architect / power-user.

Initial user:

Ben, as the system builder and first operator.

Later users:

Other humans collaborating on the system who need to understand, extend, visualize and use semantic/ontological knowledge as context for AI agents.

## 3. Problem Statement

**Status:** `EXPLICIT`

System architects and AI agents need reliable context across heterogeneous project data. Existing data is fragmented across Markdown files, PDFs, HTML, repositories, documents and chats. Without canonical conversion, semantic linking, ontological gap detection and MCP exposure, this knowledge cannot reliably support agentic work.

## 4. MVP Use Case

**Status:** `EXPLICIT`

MVP 1 proves the following loop:

Markdown files are converted or validated as Goldstandard Markdown, written into GBrain, semantically/ontologically linked, and used to expose visible context gaps and reproducible MCP HTTP access.

## 5. In Scope

**Status:** `EXPLICIT + ASSUMPTION`

Markdown as first supported source format

Goldstandard-Markdown validation

controlled write into a dedicated GBrain source

semantic/ontological linking

graph gap detection or gap surfacing

MCP HTTP smoke test

Atlas-compatible graph export

initial path toward agent context creation

audit/logging for write operations

## 6. Out of Scope for MVP 1

**Status:** `ASSUMPTION`

full support for PDF, HTML and arbitrary formats

full autonomous agent write access

broad multi-user permission system

production SaaS deployment

perfect ontology quality

complete MCP prompt/resource maturity if not required for first smoke

complete Context Pack optimization if MCP smoke and graph import are not yet stable

## 7. Requirements

### REQ-001 — Markdown Input Intake

**Status:** `EXPLICIT`

The system shall accept Markdown files as the first supported MVP input format.

Acceptance Criteria:

`AC-001`: Given a Markdown file, when the ingest command runs, then the file is parsed without destroying original content.

`AC-002`: Given a Markdown file with missing metadata, when validation runs, then missing fields are reported.

`AC-003`: Given valid Markdown, when intake completes, then the system produces a normalized Goldstandard candidate.

### REQ-002 — Goldstandard Markdown Validation

**Status:** `EXPLICIT + ASSUMPTION`

The system shall validate Markdown against the Goldstandard format before writing it into GBrain.

Acceptance Criteria:

`AC-004`: Given a Goldstandard candidate, when validation runs, then required frontmatter, slug, title, type and relations are checked.

`AC-005`: Given invalid metadata, when validation fails, then structured errors are returned.

`AC-006`: Given valid Markdown, when validation passes, then the artifact is eligible for controlled write.

### REQ-003 — Controlled Write to GBrain Source

**Status:** `EXPLICIT`

The system shall allow writing validated Goldstandard Markdown into a dedicated GBrain source. The dedicated source is `gbrain-atlas-context` (resolved `OQ-001`).

Acceptance Criteria:

`AC-007`: Given a valid Goldstandard page, when write is requested, then the page is written only into the configured source `gbrain-atlas-context`.

`AC-008`: Given write mode is dry-run, when write is requested, then no persistent write occurs and a preview is returned.

`AC-009`: Given a write operation completes, when audit data is inspected, then source, slug, timestamp and operation result are visible.

### REQ-004 — Semantic/Ontological Linking

**Status:** `EXPLICIT + ASSUMPTION`

The system shall link imported pages semantically and ontologically using available GBrain graph and schema mechanisms.

Acceptance Criteria:

`AC-010`: Given imported pages, when linking runs, then candidate nodes and edges are generated.

`AC-011`: Given a generated relation, when inspected, then relation type and provenance are available or marked unknown.

`AC-012`: Given weak or missing relation evidence, when graph analysis runs, then a gap is surfaced according to the Gap Criteria defined in REQ-005.

### REQ-005 — Gap Visibility

**Status:** `EXPLICIT`

The system shall make contextual, semantic or ontological gaps visible.

**Gap Criteria (resolved `OQ-004`).** A node or relation is surfaced as a gap when ANY of the following holds:

1. `GAP-C1` — Node without typed edge: a node has zero typed incoming or outgoing edges.
2. `GAP-C2` — Edge without provenance: a relation carries no provenance/evidence marker (directly addresses `RISK-004` Scheinsemantik).
3. `GAP-C3` — Confidence below threshold: a generated relation has a confidence score below the configured cutoff (default `0.5`, configurable).
4. `GAP-C4` — Orphaned mandatory relation: the schema/ontology expects a relation for a node's type and it is absent.

Acceptance Criteria:

`AC-013`: Given imported pages with missing relations, when gap detection runs, then unlinked or weakly linked nodes are reported.

`AC-014`: Given a graph export, when Atlas renders it, then gap nodes or gap indicators are visible.

`AC-015`: Given a user inspects a gap, when details are requested, then the system explains what evidence or relation is missing.

### REQ-006 — MCP HTTP Smoke

**Status:** `EXPLICIT`

The system shall pass a reproducible local MCP HTTP smoke test.

Acceptance Criteria:

`AC-016`: Given a local environment, when GBrain MCP HTTP server starts, then the endpoint is reachable.

`AC-017`: Given an MCP HTTP request, when the smoke test runs, then the server returns an expected MCP-compatible response.

`AC-018`: Given the smoke test completes, when logs are inspected, then pass/fail status is clear and reproducible.

### REQ-007 — Atlas-Compatible Graph Export

**Status:** `ASSUMPTION`

The system shall export graph data in a structure Atlas can render as a 3D graph.

Acceptance Criteria:

`AC-019`: Given a GBrain source, when graph export runs, then nodes and edges are emitted with stable IDs.

`AC-020`: Given exported graph data, when Atlas loads it, then the graph renders without Atlas recreating GBrain semantics.

`AC-021`: Given a graph edge or node, when inspected in Atlas, then provenance or gap status is available.

### REQ-008 — Future Multi-Format Conversion Skill

**Status:** `EXPLICIT + ASSUMPTION`

The system shall later use a dedicated Skill to convert PDF, HTML and other formats into Goldstandard Markdown.

Acceptance Criteria:

`AC-022`: Given a non-Markdown file, when the future conversion Skill runs, then a Goldstandard Markdown candidate is produced.

`AC-023`: Given a generated candidate, when validation runs, then it follows the same rules as native Markdown.

`AC-024`: Given unsupported content, when conversion fails, then the failure is explicit and does not write invalid data.

## 8. Non-Functional Requirements

### NFR-001 — Local Reproducibility

**Status:** `EXPLICIT`

The MVP must be reproducible locally, especially MCP HTTP smoke.

### NFR-002 — Controlled Write Safety

**Status:** `EXPLICIT + ASSUMPTION`

Write is required, but must be scoped, validated and auditable.

### NFR-003 — Source Isolation

**Status:** `EXPLICIT`

Writes must target the defined source `gbrain-atlas-context` (resolved `OQ-001`). Cross-source writes are out of scope for MVP 1.

### NFR-004 — Explainability

**Status:** `ASSUMPTION`

Graph edges, gaps and context outputs should include provenance or uncertainty markers.

### NFR-005 — Visual Comprehensibility

**Status:** `EXPLICIT + ASSUMPTION`

Atlas should make semantic links and contextual gaps understandable through 3D graph representation.

## 9. Risks

`RISK-001`: MCP HTTP Smoke proves technical reachability but not semantic value.

`RISK-002`: Supporting arbitrary file formats too early overloads MVP 1.

`RISK-003`: Write operations can pollute GBrain if validation is weak.

`RISK-004`: Gap detection may become vague unless relation criteria are explicit.

`RISK-005`: Atlas may become decorative if gaps are not actionable.

`RISK-006`: GBrain and Atlas may drift if both define semantic truth independently.

## 10. MVP 1 Definition

**Status:** `EXPLICIT + ASSUMPTION`

MVP 1 is complete when:

Markdown files can be processed as Goldstandard candidates.

Validation reports missing or invalid metadata.

Valid pages can be written into a dedicated GBrain source.

Semantic/ontological linking runs.

At least one gap can be surfaced.

MCP HTTP smoke runs reproducibly locally.

Atlas can render an exported graph with nodes, edges and gap indicators.

## 11. Future Expansion

**Status:** `EXPLICIT + ASSUMPTION`

Future phases include:

PDF to Goldstandard Markdown

HTML to Goldstandard Markdown

broader file conversion Skill

MCP Resources

MCP Prompts

robust Context Packs for AI agents

write approvals

stronger ontology evaluation

multi-user collaboration

richer Atlas 3D review interactions
