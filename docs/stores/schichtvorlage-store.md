<!-- pur-system/docs/stores/schichtvorlage-store.md -->

# Schichtvorlagen-Store

Der `SchichtvorlageStore` hält die Vorlagen mehrerer Filialen gleichzeitig in voneinander getrennten Kontexten. Ein weiterer
Ladevorgang verwirft bereits geladene Filialkontexte nicht. Ein Sitzungsreset und filialbezogene Ladegenerationen verhindern,
dass verspätete Lade- oder Schreibergebnisse in einen nicht mehr gültigen Kontext übernommen werden.

## Zustand und Ableitungen

Der Zustand enthält `kontexte` sowie die gemeinsamen Schreibzustände `inProgress` und `error`. Jeder Filialkontext enthält den
vollständigen Filialpfad, `schichtvorlagen`, `download`, `isLoaded` und einen eigenen Ladefehler.

## Öffentliche API

- `loadSchichtvorlagen()` lädt den vollständigen Vorlagenbestand einer Filiale.
- `getSchichtvorlageKontext()` liefert den getrennt gehaltenen Zustand einer konkreten Filiale.
- `createSchichtvorlage()`, `updateSchichtvorlage()` und `deactivateSchichtvorlage()` aktualisieren nach bestätigtem Schreiben
  den betroffenen Filialkontext.
- `snapshot()`, `clearError()` und `resetSchichtvorlagen()` unterstützen Diagnose und Sitzungswechsel.

Schreibvorgänge sind nur in einem vollständig geladenen Filialkontext zulässig und benötigen eine Benutzer-UID.

## Beteiligte Dateien

- `src/app/stores/domain/schichtvorlage.store.ts`
- `src/app/services/domain/schichtvorlage.service.ts`
- `src/app/commons/models/domain/schichtvorlage.ts`
