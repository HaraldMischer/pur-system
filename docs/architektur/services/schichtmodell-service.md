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

Bezeichnungen werden vor dem Schreiben normalisiert. Der Service prüft die lokale Zeitfolge, leitet den Folgetag erneut ab und
sortiert die Modellschichten chronologisch. Bei gleicher Beginnzeit dienen Endzeit, Bezeichnung und ID als stabile
Sortiermerkmale. Jede Modellschicht speichert außerdem verbindlich, ob eine Mehrfachbelegung erlaubt ist.

Jedes Schichtmodell besitzt die verpflichtende `planungsart`. Der Service setzt sie bei neuen Modellen automatisch auf
`schichtraster` und akzeptiert beim Laden oder Aktualisieren derzeit ausschließlich diesen Wert. Ein fehlender oder noch nicht
unterstützter Wert wird als fachlich ungültiger Datenbestand abgewiesen. Die spätere Planungsart `schichtbausteine` erhält eine
eigene Modellstruktur und wird erst mit ihrer fachlichen Umsetzung freigegeben.

Das Domainmodell bildet die Varianten als diskriminierte Union ab. `ISchichtmodellDokumentBasis` enthält nur gemeinsame
Metadaten. `ISchichtrastermodellDokument` ergänzt die Rasterzeiten, während `ISchichtbausteinmodellDokument` als eigenständige
Variante vorbereitet ist. `TSchichtmodellDokument` fasst beide Typen zusammen; die aktuelle Service- und UI-API arbeitet
bewusst ausschließlich mit `ISchichtrastermodellBestand`.

Das Modelldokument kann besondere Rasterzeiten enthalten. Jeder Eintrag verbindet genau eine Sondertags-ID mit einer
vorhandenen stabilen Modellschicht-ID und abweichenden Beginn- und Endzeiten. Der Service prüft Zeitfolge, Referenz und
Eindeutigkeit. Beim normalen Bearbeiten und beim Deaktivieren bleiben diese Einträge erhalten; beim Entfernen einer
Modellschicht werden ihre Zeitüberschreibungen mit entfernt. Besondere Rasterzeiten sind auch dann als leere Liste Bestandteil
jedes neu angelegten Schichtmodells, wenn keine Abweichungen konfiguriert sind.

Die in Todo 21.9 noch offene Erweiterung ergänzt die erste Modellschicht um nicht negative Vorbereitungsminuten und die letzte
Modellschicht um nicht negative Nachbereitungsminuten. Der Service muss die Werte normalisieren und sicherstellen, dass sie nur
an den äußeren Rasterplätzen verwendet werden. Besondere Rasterzeiten bleiben für abweichende innere Schichtgrenzen erhalten;
Öffnungsbeginn und Öffnungsende werden nicht als redundante Rasterzeitüberschreibungen im Schichtmodell gespeichert.

## Beteiligte Dateien

- `src/app/services/domain/schichtmodell.service.ts`
- `src/app/stores/domain/schichtmodell.store.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/constants/firebase.constants.ts`
