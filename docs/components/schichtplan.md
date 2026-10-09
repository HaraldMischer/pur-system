<!-- pur-system/docs/components/schichtplan.md -->

# Schichtplan-Komponenten

Der routbare Schichtplan-Bereich besteht aus getrennten Pages für Ansicht, Planung und Schichtvorlagen. Wiederverwendbare
Darstellung und Dialoge liegen unter `src/app/components/schichtplan`.

## Dienstplan-Arbeitsbereich

`DienstplanArbeitsbereich` verbindet den gewählten Filial- und Monatskontext mit Dienstplan-, Mitarbeiter- und
Schichtvorlagen-Store. Im Ansichtsmodus bleibt der Bereich lesend. Im Planungsmodus lädt er zusätzlich die filialbezogenen
Schichtvorlagen und öffnet die Schreibdialoge nur für einen erlaubten Entwurf.

## Monatsdarstellung

`SchichtplanMonat` ordnet die Schichten nach lokalem Kalendertag. Jede Schicht zeigt Mitarbeiter, gespeicherte
Vorlagenbezeichnung, Zeitspanne, Pause und Arbeitszeit. Schreibaktionen werden nur für eine bearbeitbare Entwurfsversion
angeboten.

## Dialoge

`SchichtBearbeitenDialog` ordnet einen aktiven Mitarbeiter und eine aktive Schichtvorlage einem Datum zu. Beginn und Ende werden
aus den lokalen Vorlagenzeiten, der Folgetagsangabe und `Europe/Berlin` berechnet. Die Standardpause wird übernommen und kann für
die konkrete Schicht angepasst werden. Beim Bearbeiten bleibt die gespeicherte Vorlagen-Momentaufnahme erhalten, solange keine
andere Vorlage gewählt wird.

`SchichtvorlageBearbeitenDialog` legt Vorlagen an und bearbeitet Bezeichnung, lokale Zeiten, Folgetagsangabe, Standardpause und
Aktivstatus. Inaktive Vorlagen bleiben in der Verwaltungsseite sichtbar und können erneut aktiviert werden.

## Beteiligte Dateien

- `src/app/components/schichtplan/dienstplan-arbeitsbereich`
- `src/app/components/schichtplan/schichtplan-monat`
- `src/app/components/schichtplan/schicht-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog`
- `src/app/pages/schichtplan`
