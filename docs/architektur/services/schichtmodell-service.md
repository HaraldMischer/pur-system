<!-- pur-system/docs/architektur/services/schichtmodell-service.md -->

# Schichtmodell-Service

Die fachlichen Modellregeln stehen im
[Fachkonzept Dienst- und Schichtplanung](../../fachkonzepte/dienst-und-schichtplanung.md), die verbindlichen Pfad- und
CRUD-Rechte in der [Berechtigungsmatrix](../../matrizen/berechtigungen.md).

Der `SchichtmodellService` verwaltet die Schichtmodelle einer konkreten Filiale. Die Modelle liegen unter dem vollständigen
Filialpfad in `schichtmodell`; ihre Vorlagenschichten liegen in der Untercollection `tagesvorlagenschicht`. Ein Feld oder ein
Typ für eine zusätzliche Planungsart ist nicht vorgesehen.

## Öffentliche API

- `loadSchichtmodelle()` lädt alle aktiven und inaktiven Modelle der Filiale mit ihren Vorlagenschichten. Modelle werden
  nach Bezeichnung und Vorlagenschichten nach ihrer gespeicherten `reihenfolge` sortiert.
- `createSchichtmodell()` legt ein aktives Modell mit vollständiger Wochentags- und Sonntagsvorlage atomar an.
- `updateSchichtmodell()` aktualisiert Modell und Vorlagen, behält vorhandene Schicht-IDs bei, ergänzt neue IDs und löscht
  entfernte Vorlagenschichten im selben atomaren Batch.
- `deactivateSchichtmodell()` setzt das Modell auf inaktiv. Modell und Vorlagenschichten bleiben erhalten.

## Modell- und Validierungsregeln

Ein Schichtmodell besitzt genau eine Wochentagsvorlage für Montag bis Samstag und eine unabhängige Sonntagsvorlage.
Ihre Vorlagenschichten besitzen stabile IDs, Bezeichnung, Reihenfolge und die Einstellung zur Mehrfachbelegung. Der Beginn der
ersten und das Ende der letzten Schicht werden nicht gespeichert; nur innere Grenzen besitzen konkrete Lokalzeiten am Start-
oder Folgetag.

Vorbereitungsminuten sind ausschließlich an der ersten und Nachbereitungsminuten ausschließlich an der letzten Schicht einer
Vorlage zulässig; bei einer einzelnen Schicht gelten beide Werte. Unterschiedliche Schichtanzahlen, Lücken und
Überschneidungen zwischen den Vorlagen sind zulässig. Relative Übergänge und Prozentwerte werden nicht gespeichert.

Der TypeScript-Code löst die dynamischen Außengrenzen gegen die für die Vorlage maßgebliche Öffnung auf. Jede Kernzeit muss
positiv sein und innerhalb dieser Öffnung liegen. Nur Vor- und Nachbereitungsminuten dürfen die Öffnungsgrenzen erweitern.
Firestore Rules prüfen gemäß Berechtigungsmatrix ausschließlich aktives Profil, Rolle, Filialpfad und erlaubte CRUD-Aktion;
Feldstruktur, IDs, Reihenfolge und Zeitregeln validiert der TypeScript-Code mit seinen Tests.

Feier- und Sondertage sind nicht Bestandteil des Modells. Ihre konkrete Tagesstruktur entsteht bei der Monatsplananlage.
Der Service stellt dafür weder Sondertagsvorlagen noch einen Schichtbausteinkatalog bereit.

## Entfernung des früheren Rastermodells

Das frühere Schicht-Rastermodell wurde ohne Datenmigration entfernt. Die vorhandenen Rastermodelle und Rasterdienstpläne wurden
zuvor kontrolliert aus Firestore gelöscht. Eine Kompatibilitätslogik für alte Rasterwerte und ein dauerhaftes
`planungsart`-Feld bestehen nicht.

## Beteiligte Dateien

- `src/app/services/domain/schichtmodell.service.ts`
- `src/app/stores/domain/schichtmodell.store.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/validators/schichtmodell.validator.ts`
- `src/app/commons/constants/firebase.constants.ts`
