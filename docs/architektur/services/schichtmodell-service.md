<!-- pur-system/docs/architektur/services/schichtmodell-service.md -->

# Schichtmodell-Service

Der `SchichtmodellService` verwaltet die Schichtmodelle einer konkreten Filiale. Jedes Modelldokument liegt in der Collection
`schichtmodell` unter dem vollständigen Filialpfad. Seine geordneten Modellschichten liegen in der untergeordneten Collection
`modellschicht`.

## Öffentliche API

- `loadSchichtmodelle()` lädt alle aktiven und inaktiven Modelle der Filiale und anschließend deren Modellschichten. Modelle
  werden nach Bezeichnung und Modellschichten nach ihrer ausdrücklich gespeicherten `reihenfolge` sortiert.
- `createSchichtmodell()` legt ein aktives Modell und mindestens eine Modellschicht in einem atomaren Batch an.
- `updateSchichtmodell()` aktualisiert das Modell, behält vorhandene Modellschicht-IDs bei, ergänzt neue IDs und löscht entfernte
  Modellschichten im selben atomaren Batch.
- `deactivateSchichtmodell()` setzt das Modell auf inaktiv. Das Modell und seine Modellschichten bleiben erhalten.

Bezeichnungen werden vor dem Schreiben normalisiert. Jede Modellschicht speichert eine innerhalb des Modells eindeutige und
lückenlose `reihenfolge`. Die erste Modellschicht enthält keinen festen Beginn, die letzte kein festes Ende; bei einer einzelnen
Modellschicht entfallen beide festen Außengrenzen. Jede vorhandene innere Zeitgrenze speichert ihre lokale Uhrzeit und die
eindeutige Zuordnung zum Start- oder Folgetag. Die erste Modellschicht darf nicht negative Vorbereitungsminuten, die letzte
nicht negative Nachbereitungsminuten enthalten. Jede Modellschicht legt außerdem verbindlich fest, ob eine Mehrfachbelegung
derselben Rasterzelle erlaubt ist.

Der gemeinsame TypeScript-Validator prüft diese Struktur, die Modellschicht-IDs, die Zeitgrenzen und die positiven, bereits
ohne Kalendertag bestimmbaren Dauern. Innere Beginn- und Endgrenzen bleiben unabhängig: Überlappungen zwischen Rasterplätzen
sind erlaubt, Lücken werden als nicht blockierender Hinweis behandelt. Eine zeitliche Sortierung findet nicht statt.

Jedes Schichtmodell besitzt die verpflichtende `planungsart`. Der Service setzt sie bei neuen Modellen automatisch auf
`schichtraster` und akzeptiert beim Laden oder Aktualisieren derzeit ausschließlich diesen Wert. Ein fehlender oder noch nicht
unterstützter Wert wird als fachlich ungültiger Datenbestand abgewiesen. Die spätere Planungsart `schichtbausteine` erhält eine
eigene Modellstruktur und wird erst mit ihrer fachlichen Umsetzung freigegeben.

Das Domainmodell bildet die Varianten als diskriminierte Union ab. `ISchichtmodellDokumentBasis` enthält die gemeinsamen
Metadaten. `ISchichtrastermodellDokument` kennzeichnet die umgesetzte Planungsart, während
`ISchichtbausteinmodellDokument` als eigenständige Variante vorbereitet ist. Die Rasterstruktur liegt nicht im Modelldokument,
sondern in den Dokumenten der Untercollection `modellschicht`. `TSchichtmodellDokument` fasst beide Typen zusammen; die aktuelle
Service- und UI-API arbeitet bewusst ausschließlich mit `ISchichtrastermodellBestand`.

Besondere Rasterzeiten für Sondertage sind nicht Bestandteil des Schichtmodells. Feiertage, jährliche Sondertage und einmalige
Datumsausnahmen wirken ausschließlich über ihre Öffnungsregel auf die tagesabhängigen Außengrenzen des Rasters.

Für die Umstellung ist keine Migration oder Kompatibilitätslogik vorhanden. Die bisherigen Schichtmodelle wurden gelöscht und
die benötigten Modelle werden ausschließlich in der neuen Struktur angelegt. Die Firestore Rules prüfen gemäß
Berechtigungsmatrix nur aktives Profil, Rolle, Filialpfad und erlaubte CRUD-Aktion. Feldstruktur, IDs, Reihenfolge und Zeitregeln
validiert ausschließlich der TypeScript-Code mit seinen Tests.

## Beteiligte Dateien

- `src/app/services/domain/schichtmodell.service.ts`
- `src/app/stores/domain/schichtmodell.store.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/constants/firebase.constants.ts`
