<!-- pur-system/docs/stores/schichtmodell-store.md -->

# Schichtmodell-Store

Der `SchichtmodellStore` hält die Modellbestände mehrerer ausgewählter Filialen gleichzeitig in voneinander getrennten
Kontexten. Ein Modellbestand besteht aus dem Schichtmodell und seinen vollständig geladenen, geordneten Modellschichten.

## Zustand

`kontexte` ist über den vollständigen Filialpfad aus Unternehmer-, Firma- und Filial-ID getrennt. Jeder Kontext enthält
`schichtmodelle`, `download`, `isLoaded` und einen eigenen Ladefehler. `inProgress` und `error` beschreiben den aktuell laufenden
Schreibvorgang.

## Öffentliche API

- `loadSchichtmodelle()` lädt den vollständigen Modellbestand einer Filiale und führt parallele Filialkontexte nicht zusammen.
- `getSchichtmodellKontext()` liefert den Zustand einer konkreten Filiale.
- `createSchichtmodell()`, `updateSchichtmodell()` und `deactivateSchichtmodell()` schreiben nur in einem vollständig geladenen
  Filialkontext und aktualisieren diesen nach bestätigtem Schreiben.
- `snapshot()`, `clearError()` und `resetSchichtmodelle()` unterstützen Diagnose und Sitzungswechsel.

Schreibvorgänge benötigen eine Benutzer-UID. Gleichzeitige Schreibvorgänge werden verhindert; Firestore-Fehler werden als
verständliche Meldung im Store bereitgestellt.

## Beteiligte Dateien

- `src/app/stores/domain/schichtmodell.store.ts`
- `src/app/services/domain/schichtmodell.service.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
