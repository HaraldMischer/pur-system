<!-- pur-system/docs/services/schichtmodell-service.md -->

# Schichtmodell-Service

Der `SchichtmodellService` verwaltet die Schichtmodelle einer konkreten Filiale. Jedes Modelldokument liegt in der Collection
`schichtmodell` unter dem vollständigen Filialpfad. Seine geordneten Modellschichten liegen in der untergeordneten Collection
`modellschicht`.

## Öffentliche API

- `loadSchichtmodelle()` lädt alle aktiven und inaktiven Modelle der Filiale und anschließend deren Modellschichten. Modelle
  werden nach Bezeichnung, Modellschichten nach `reihenfolge` sortiert.
- `createSchichtmodell()` legt ein aktives Modell und mindestens eine Modellschicht in einem atomaren Batch an.
- `updateSchichtmodell()` aktualisiert das Modell, behält vorhandene Modellschicht-IDs bei, ergänzt neue IDs und löscht entfernte
  Modellschichten im selben atomaren Batch.
- `deactivateSchichtmodell()` setzt das Modell auf inaktiv. Das Modell und seine Modellschichten bleiben erhalten.

Bezeichnungen werden vor dem Schreiben normalisiert. Die tatsächliche Reihenfolge wird aus der Position der übergebenen Liste
neu gebildet. Der Service prüft die lokale Zeitfolge und leitet Folgetag sowie Standardpause nach den verbindlichen Zeitregeln
erneut ab.

## Beteiligte Dateien

- `src/app/services/domain/schichtmodell.service.ts`
- `src/app/stores/domain/schichtmodell.store.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/constants/firebase.constants.ts`
