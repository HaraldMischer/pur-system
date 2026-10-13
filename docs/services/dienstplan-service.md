<!-- pur-system/docs/services/dienstplan-service.md -->

# Dienstplan-Service

Der `DienstplanService` kapselt die Firestore-Zugriffe für filialbezogene Monatspläne, Modell-Momentaufnahmen, Versionen und
Schichten. Jeder öffentliche Aufruf erhält einen vollständigen Filial- beziehungsweise Dokumentpfad; filialübergreifende
Abfragen führt der Service nicht aus.

## Laden

- `loadDienstplanMonat()` lädt einen bekannten Monat, seine unveränderliche Modell-Momentaufnahme sowie dessen aktuelle
  Entwurfs- und Veröffentlichungsstände. Für die Mitarbeiteransicht kann der Aufruf auf die veröffentlichte Version begrenzt
  werden.
- `loadDienstplanBestand()` lädt für die Filial-App den vollständigen Bestand einer Filiale mit allen Monaten, Versionen und
  Schichten einschließlich ihrer Modell-Momentaufnahmen.

Die Lesestrategie wird vom Aufrufer vorgegeben. Geladene Dokumente werden um ihre IDs und vollständigen Pfadinformationen ergänzt
und anschließend fachlich sortiert.

## Schreiben

- `createDienstplan()` prüft ein aktives, nicht leeres Schichtmodell derselben Filiale und legt den Monatsplan, seine erste
  Entwurfsversion und die vollständige Modell-Momentaufnahme atomar an.
- `createSchicht()`, `updateSchicht()` und `deleteSchicht()` schreiben eine Schicht gemeinsam mit der nächsten Versionsrevision in
  einer Firestore-Transaktion.

Schichten enthalten die Mitarbeiter-ID sowie die ID ihrer Modellschicht aus der Momentaufnahme des Monatsplans. Beginn und Ende
sind absolute Firestore-Zeitstempel; die Standardpause der Modellschicht wird in Minuten gespeichert. Die Anwendung leitet diese
Werte beim Anlegen aus der gewählten Rasterzelle ab. Beim Bearbeiten kann nur die Mitarbeiterzuordnung geändert werden. Die
Firestore Rules prüfen die Modellschichtreferenz und schützen Rasterzelle, Zeitwerte und Pause vor nachträglicher Änderung.
Nicht zum aktuellen Schichtmodell gehörende Felder werden weder geschrieben noch in das Domainmodell übernommen. Vor jedem
Schreiben prüft der Service die anrechenbare Arbeitszeit. Eine abweichende Entwurfsrevision verhindert veraltete Schreibzugriffe.

## Beteiligte Dateien

- `src/app/services/domain/dienstplan.service.ts`
- `src/app/stores/domain/dienstplan.store.ts`
- `src/app/commons/models/domain/dienstplan.ts`
- `src/app/commons/models/domain/schicht.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/utils/dienstplan/schicht-zeit.ts`
