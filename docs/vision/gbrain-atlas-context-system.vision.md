# Product Vision: GBrain Atlas Context System

Status: `READY_FOR_AGILETEAM_PLANNING`
Feature Slug: `gbrain-atlas-context-system`

## VIS-001 — Vision Statement

**Status:** `EXPLICIT + ASSUMPTION`

Wir bauen ein lokal deploybares GBrain-System, das beliebige Daten in überprüfbaren Goldstandard-Markdown überführt, diese Daten semantisch und ontologisch verknüpft und sie über MCP als verlässlichen Kontext für AI-Agenten bereitstellt. Atlas ergänzt GBrain als dreidimensionale Graph-, Review- und Kuratierungsoberfläche.

## VIS-002 — Zielnutzer

**Status:** `EXPLICIT`

Der erste Zielnutzer ist ein Systemarchitekt / Power-User. Im ersten Schritt ist Ben der primäre Nutzer, weil er das System baut, testet und produktiv nutzt.

Später soll das System für jeden Menschen nutzbar sein, der an einem solchen Wissens- und Agentensystem mitarbeitet und davon profitiert, dass Daten visualisiert, semantisch/ontologisch verknüpft und als Kontext für AI-Agenten verfügbar gemacht werden.

## VIS-003 — Kernproblem

**Status:** `EXPLICIT`

AI-Agenten und menschliche Systemarchitekten verlieren Kontext, weil Wissen in unterschiedlichen Formaten, Repositories, Dokumenten, Markdown-Dateien, PDFs, HTML-Seiten und Chats verteilt liegt. Dieses Wissen ist häufig nicht standardisiert, nicht semantisch verknüpft, nicht ontologisch prüfbar und nicht zuverlässig als Agentenkontext abrufbar.

## VIS-004 — Produktabsicht

**Status:** `EXPLICIT`

Das System soll beliebige Daten in ein gemeinsames Goldstandard-Markdown-Format überführen. Diese Markdown-Dateien sollen sauber im GBrain landen, dort semantisch und ontologisch verknüpft werden und anschließend über MCP für Agenten nutzbar sein.

Zusätzlich sollen Lücken sichtbar gemacht werden: fehlende Zusammenhänge, unklare Relationen, unverbundene Knoten, schwach belegte Kontexte oder fehlende Datenquellen.

## VIS-005 — Zielarchitektur

**Status:** `ASSUMPTION`

GBrain ist der lokale Kontext-, Speicher-, Graph-, Retrieval- und MCP-Kern.

Atlas ist die 3D-Visualisierungs-, Review- und Kuratierungsoberfläche.

Die Zielarchitektur trennt damit klar:

GBrain speichert, verknüpft, validiert, durchsucht und stellt Kontext bereit.

Atlas visualisiert, macht Lücken sichtbar und unterstützt menschliches Verstehen.

MCP verbindet GBrain mit Agenten.

Goldstandard-Markdown bildet die kanonische Wissensschicht.

## VIS-006 — Erster Beweis-Use-Case

**Status:** `EXPLICIT`

Der erste Beweis-Use-Case lautet:

Beliebige Daten werden in Goldstandard-Markdown überführt, landen sauber im GBrain, werden semantisch/ontologisch verknüpft und machen Kontextlücken sichtbar.

Für MVP 1 beginnt dieser Use Case mit Markdown-Dateien als primärer Datenquelle.

## VIS-007 — MVP-Erfolgssignal

**Status:** `EXPLICIT`

Das harte technische Erfolgssignal für MVP 1 ist:

MCP HTTP Smoke läuft reproduzierbar lokal.

## VIS-008 — Ergänztes Produktwertsignal

**Status:** `ASSUMPTION`

Zusätzlich sollte MVP 1 beweisen:

Ein Markdown-Datensatz wird validiert, in GBrain geschrieben, erzeugt Graphverknüpfungen und macht mindestens eine semantische oder ontologische Lücke sichtbar.

Dieses zweite Signal verhindert, dass der MVP nur technische Anschlussfähigkeit beweist, aber noch keinen produktiven Kontextnutzen.

## VIS-009 — Write-Prinzip

**Status:** `EXPLICIT`

Der MVP soll nicht dauerhaft strict read-only bleiben. Das System soll Nutzer befähigen, aus Verstehen heraus etwas zu erzeugen, zu strukturieren und in eine eigene Source zu schreiben.

Write-Fähigkeit ist Teil des Zielbildes.

Für die erste sichere Ausbaustufe sollte Write kontrolliert erfolgen:

eigene Source

Dry-run oder Preview

Validierung vor Write

Audit Log

optional Approval Gate

## VIS-010 — Nicht-Ziele MVP 1

**Status:** `ASSUMPTION`

MVP 1 ist nicht:

vollständige SaaS-Plattform

Multi-Tenant-System

perfekte Ontologieautomatik

vollständige Unterstützung aller Dateiformate

unkontrollierte autonome Write-Automation

Ersatz für Atlas als Visualisierungsoberfläche

Produkt für breite Endnutzer ohne Power-User-Kontext

## VIS-011 — Langfristiges Ziel

**Status:** `EXPLICIT + ASSUMPTION`

Langfristig soll jeder berechtigte Mensch, der an einem GBrain-System mitarbeitet, Daten einbringen, visualisieren, semantisch verknüpfen und als Kontext für Agenten nutzbar machen können.

Das System wird dadurch zu einer lokalen, agentenfähigen Wissens- und Kontextinfrastruktur.
