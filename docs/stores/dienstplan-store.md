<!-- pur-system/docs/stores/dienstplan-store.md -->

# Dienstplan-Store

Der `DienstplanStore` hält Dienstpläne, Modell-Momentaufnahmen, Versionen und Schichten getrennt nach vollständigem Filialpfad.
Zusätzlich speichert er den aktuell ausgewählten Filial- und Monatskontext.

## Zustand und Ableitungen

Jeder Filialkontext enthält den geladenen Bestand sowie `download`, `isLoaded`, `vollstaendigGeladen` und eine mögliche
Fehlermeldung. App-weite Schreibvorgänge werden über `inProgress` und `error` abgebildet. Die öffentlichen Ableitungen liefern den
ausgewählten Dienstplan, seine Versionen und deren Schichten.

## Öffentliche API

- `loadDienstplanMonat()` und `loadDienstplanBestand()` laden einen Monat beziehungsweise den vollständigen Filialbestand und
  lassen noch fehlende, durch Schichten referenzierte Mitarbeiter-IDs gezielt mit `networkOnly` nachladen.
- `createDienstplan()` verlangt ein aktives, nicht leeres Schichtmodell derselben Filiale und übernimmt Plan, erste Version und
  Modell-Momentaufnahme aus dem bestätigten Service-Ergebnis in den lokalen Zustand.
- `createSchicht()`, `updateSchicht()` und `deleteSchicht()` übernehmen bestätigte Service-Ergebnisse direkt in den lokalen
  Zustand und erhöhen die lokale Versionsrevision. Eine Schicht wird über ihre `modellschichtId` einer Zelle der geladenen
  Modell-Momentaufnahme zugeordnet.
- `selectDienstplan()` wechselt den aktiven Filial- und Monatskontext.
- `getDienstplanKontext()`, `snapshot()`, `clearError()` und `resetDienstplaene()` stellen Lese- und Sitzungsaktionen bereit.

Parallele Ladeaufträge werden je Kontext zusammengeführt. Bereits im Mitarbeiter-Store vorhandene Einträge werden
wiederverwendet. Ergebnisse einer bereits zurückgesetzten Sitzung werden verworfen. Schreibvorgänge benötigen einen
vollständig geladenen Monat, eine Entwurfsversion und eine Benutzer-UID.

## Beteiligte Dateien

- `src/app/stores/domain/dienstplan.store.ts`
- `src/app/services/domain/dienstplan.service.ts`
- `src/app/commons/models/domain/dienstplan.ts`
- `src/app/commons/models/domain/schicht.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
