# Product Canvas: GBrain Atlas Context System

Status: `READY_FOR_AGILETEAM_PLANNING`
Feature Slug: `gbrain-atlas-context-system`

## CAN-001 — Product Name

**Status:** `ASSUMPTION`

GBrain Atlas Context System

## CAN-002 — One-Liner

**Status:** `EXPLICIT + ASSUMPTION`

Ein lokal deploybares GBrain-System, das beliebige Daten in Goldstandard-Markdown überführt, sie semantisch und ontologisch verknüpft, Lücken sichtbar macht und über MCP als verlässlichen Kontext für AI-Agenten bereitstellt — mit Atlas als 3D-Graph- und Review-Oberfläche.

## CAN-003 — Zielnutzer

**Status:** `EXPLICIT`

Primärer MVP-Nutzer: Systemarchitekt / Power-User.
Initialer konkreter Nutzer: Ben als Builder, Architekt und erster Power-User.
Spätere Nutzer: Andere Menschen, die an einem solchen System mitarbeiten, Wissen einbringen, Graphstrukturen verstehen, semantische/ontologische Verknüpfungen nutzen und Agenten mit hochwertigem Kontext versorgen wollen.

## CAN-004 — Problem

**Status:** `EXPLICIT`

Wissens- und Projektdaten liegen in unterschiedlichen Formaten und Kontexten vor. Ohne Standardisierung, semantische Verknüpfung und verlässliche Agentenschnittstelle bleiben sie schwer nutzbar. AI-Agenten erhalten dadurch unvollständigen, unstrukturierten oder nicht nachvollziehbaren Kontext.

## CAN-005 — Nutzerbedürfnis

**Status:** `EXPLICIT`

Der Nutzer will Daten verstehen, visualisieren, semantisch einordnen, ontologische Lücken erkennen und anschließend etwas daraus machen können. Das System soll nicht nur lesen, sondern auch kontrolliertes Schreiben in eine eigene Source ermöglichen.

## CAN-006 — Value Proposition

**Status:** `EXPLICIT + ASSUMPTION`

Das System verwandelt heterogene Daten in ein einheitliches Goldstandard-Markdown-Format, speichert sie im GBrain, verknüpft sie semantisch und ontologisch, macht Lücken sichtbar und stellt den daraus entstehenden Kontext über MCP für Agenten bereit. Atlas macht diesen Wissensraum dreidimensional sichtbar und reviewfähig.

## CAN-007 — Erste Datenquelle

**Status:** `EXPLICIT`

Markdown-Dateien sind die primäre Datenquelle für MVP 1.

## CAN-008 — Erweiterte Datenquellen

**Status:** `EXPLICIT`

PDF, HTML und weitere Formate sollen später über einen separaten Konvertierungs-Skill in Goldstandard-Markdown übertragen werden. Wichtig: Für MVP 1 sollte nicht „alles" direkt unterstützt werden. Zuerst muss der Goldstandard-Markdown-Pfad robust sein.

## CAN-009 — MVP-Scope

**Status:** `EXPLICIT + ASSUMPTION`

MVP 1 umfasst:

- Markdown-Dateien als Input
- Validierung gegen Goldstandard-Markdown-Regeln
- Import in GBrain
- semantische/ontologische Verknüpfung
- Sichtbarmachung von Lücken
- MCP HTTP Smoke reproduzierbar lokal
- Atlas-kompatibler Graph-Export
- kontrollierter Write in eigene Source oder mindestens Write-Preview

## CAN-010 — Write-Scope

**Status:** `EXPLICIT`

Write ist Teil des Zielbildes. Für MVP 1 gilt:

- Write nicht global erlauben
- Write nur in die definierte Source `gbrain-atlas-context`
- vor Write validieren
- Dry-run/Preview ermöglichen
- Write-Aktionen protokollieren
- später Approval Gate ergänzen

Die Write-Ziel-Source ist auf `gbrain-atlas-context` festgelegt (aufgelöst: `OQ-001`).

## CAN-011 — Erfolgssignale

**Status:** `EXPLICIT + ASSUMPTION`

Harter technischer Erfolg: MCP HTTP Smoke läuft reproduzierbar lokal.
Empfohlenes Produktwertsignal: Ein Markdown-Datensatz wird in Goldstandard-Markdown validiert, im GBrain gespeichert, semantisch/ontologisch verknüpft und erzeugt in Atlas oder im Graph-Output eine sichtbare Kontextlücke.

## CAN-012 — Risiken

**Status:** `ASSUMPTION`

| Risiko | Beschreibung |
|---|---|
| Technisches Gate ersetzt Produktwert | MCP Smoke beweist Schnittstelle, aber nicht Kontextqualität. |
| Zu früher Universal-Ingest | PDF/HTML/alles andere kann den MVP überladen. |
| Unkontrollierter Write | Agentisches Schreiben kann falsche oder schwache Semantik persistieren. |
| Scheinsemantik | Graphkanten können plausibel wirken, ohne fachlich stark zu sein. |
| Atlas/GBrain-Doppelmodell | Wenn Atlas eigene Wahrheit erzeugt, entsteht Drift. |
| Kontextinflation | Agenten bekommen zu viel Kontext statt präzise Context Packs. |

## CAN-013 — Differenzierung

**Status:** `ASSUMPTION`

Die Differenzierung entsteht durch die Kombination aus:

- lokalem GBrain
- Goldstandard-Markdown als kanonischer Datenform
- semantischer und ontologischer Verknüpfung
- sichtbaren Kontextlücken
- MCP-fähiger Agentenanbindung
- Atlas als 3D-Verständnisoberfläche
- kontrolliertem Write in eigene Sources

## CAN-014 — MVP-Prinzip

**Status:** `ASSUMPTION`

Der MVP soll nicht „beliebige Daten vollständig lösen", sondern zuerst den Kernkreislauf beweisen:

Markdown → Goldstandard-Validierung → GBrain Write → Graphverknüpfung → Lückensichtbarkeit → MCP HTTP Smoke → Atlas-Darstellung.
