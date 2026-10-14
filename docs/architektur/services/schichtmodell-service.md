<!-- pur-system/docs/architektur/services/schichtmodell-service.md -->

# Schichtmodell-Service

Der `SchichtmodellService` verwaltet die Schichtmodelle einer konkreten Filiale. Jedes Modelldokument liegt in der Collection
`schichtmodell` unter dem vollständigen Filialpfad. Seine geordneten Modellschichten liegen in der untergeordneten Collection
`modellschicht`.

## Öffentliche API

- `loadSchichtmodelle()` lädt alle aktiven und inaktiven Modelle der Filiale und anschließend deren Modellschichten. Modelle
  werden nach Bezeichnung, Modellschichten automatisch nach ihrer lokalen Beginnzeit sortiert.
- `createSchichtmodell()` legt ein aktives Modell und mindestens eine Modellschicht in einem atomaren Batch an.
- `updateSchichtmodell()` aktualisiert das Modell, behält vorhandene Modellschicht-IDs bei, ergänzt neue IDs und löscht entfernte
  Modellschichten im selben atomaren Batch.
- `deactivateSchichtmodell()` setzt das Modell auf inaktiv. Das Modell und seine Modellschichten bleiben erhalten.

Bezeichnungen werden vor dem Schreiben normalisiert. Der Service prüft die lokale Zeitfolge, leitet Folgetag sowie
Standardpause nach den verbindlichen Zeitregeln erneut ab und sortiert die Modellschichten chronologisch. Bei gleicher
Beginnzeit dienen Endzeit, Bezeichnung und ID als stabile Sortiermerkmale. Das frühere Feld `reihenfolge` wird nicht mehr
geschrieben und beim nächsten Speichern eines vorhandenen Modells entfernt.

## Beteiligte Dateien

- `src/app/services/domain/schichtmodell.service.ts`
- `src/app/stores/domain/schichtmodell.store.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/constants/firebase.constants.ts`
