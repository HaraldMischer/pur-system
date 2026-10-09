<!-- pur-system/docs/services/dienstplan-service.md -->

# Dienstplan-Service

Der `DienstplanService` kapselt die Firestore-Zugriffe für filialbezogene Monatspläne, Versionen und Schichten. Jeder öffentliche
Aufruf erhält einen vollständigen Filial- beziehungsweise Dokumentpfad; filialübergreifende Abfragen führt der Service nicht aus.

## Laden

- `loadDienstplanMonat()` lädt einen bekannten Monat sowie dessen aktuelle Entwurfs- und Veröffentlichungsstände. Für die
  Mitarbeiteransicht kann der Aufruf auf die veröffentlichte Version begrenzt werden.
- `loadDienstplanBestand()` lädt für die Filial-App den vollständigen Bestand einer Filiale mit allen Monaten, Versionen und
  Schichten.

Die Lesestrategie wird vom Aufrufer vorgegeben. Geladene Dokumente werden um ihre IDs und vollständigen Pfadinformationen ergänzt
und anschließend fachlich sortiert.

## Schreiben

- `createDienstplan()` legt den Monatsplan und seine erste Entwurfsversion atomar an.
- `createSchicht()`, `updateSchicht()` und `deleteSchicht()` schreiben eine Schicht gemeinsam mit der nächsten Versionsrevision in
  einer Firestore-Transaktion.

Schichten enthalten Mitarbeiter-ID und Mitarbeitername sowie Vorlagen-ID und Vorlagenbezeichnung als Momentaufnahme. Beginn und
Ende sind absolute Firestore-Zeitstempel; die Pause wird in Minuten gespeichert. Vor jedem Schreiben prüft der Service die
anrechenbare Arbeitszeit. Eine abweichende Entwurfsrevision verhindert veraltete Schreibzugriffe.

## Beteiligte Dateien

- `src/app/services/domain/dienstplan.service.ts`
- `src/app/stores/domain/dienstplan.store.ts`
- `src/app/commons/models/domain/dienstplan.ts`
- `src/app/commons/models/domain/schicht.ts`
- `src/app/commons/utils/dienstplan/schicht-zeit.ts`
