<!-- pur-system/docs/stores/schichtvorlage-store.md -->

# Schichtvorlagen-Store

Der `SchichtvorlageStore` hält die Vorlagen genau einer ausgewählten Filiale. Ein Kontextwechsel verwirft die zuvor geladenen
Vorlagen und verhindert, dass verspätete Lade- oder Schreibergebnisse in den neuen Filialkontext übernommen werden.

## Zustand und Ableitungen

Der Zustand enthält `schichtvorlagen`, die drei ausgewählten Pfad-IDs sowie `download`, `isLoaded`, `inProgress` und `error`.
`activeSchichtvorlagen` liefert ausschließlich aktive Vorlagen für die Auswahl beim Einplanen.

## Öffentliche API

- `loadSchichtvorlagen()` lädt den vollständigen Vorlagenbestand einer Filiale.
- `createSchichtvorlage()`, `updateSchichtvorlage()` und `deactivateSchichtvorlage()` aktualisieren nach bestätigtem Schreiben den
  lokalen Zustand.
- `snapshot()`, `clearError()` und `resetSchichtvorlagen()` unterstützen Diagnose und Sitzungswechsel.

Schreibvorgänge sind nur im vollständig geladenen und weiterhin ausgewählten Filialkontext zulässig und benötigen eine
Benutzer-UID.

## Beteiligte Dateien

- `src/app/stores/domain/schichtvorlage.store.ts`
- `src/app/services/domain/schichtvorlage.service.ts`
- `src/app/commons/models/domain/schichtvorlage.ts`
