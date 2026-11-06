<!-- pur-system/docs/architektur/services/schichtmodell-service.md -->

# Schichtmodell-Service

Die fachlichen Modell- und Rasterregeln stehen im
[Fachkonzept Dienst- und Schichtplanung](../../fachkonzepte/dienst-und-schichtplanung.md), die verbindlichen Pfad- und
CRUD-Rechte in der [Berechtigungsmatrix](../../matrizen/berechtigungen.md).

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

Jedes Schichtmodell besitzt die verpflichtende `planungsart`. Neue Rastermodelle speichern `schichtrastermodell`, neue
Tagesmodelle `schichttagesmodell`. Historische Rastermodelle mit `schichtraster` werden beim Lesen kontrolliert als
Rastermodelle normalisiert. Andere Werte werden als fachlich ungültiger Datenbestand abgewiesen.

Das Domainmodell bildet die Varianten als diskriminierte Union ab. `ISchichtmodellDokumentBasis` enthält die gemeinsamen
Metadaten. `ISchichtrastermodellDokument` und `ISchichttagesmodellDokument` kennzeichnen die beiden Varianten.
Rastermodellschichten und Tagesvorlagenschichten verwenden getrennte Dokumenttypen und Untercollections.
`TSchichtmodellDokument` fasst ausschließlich diese beiden aktuellen Typen zusammen.

Besondere Rasterzeiten für Sondertage sind nicht Bestandteil des Schichtmodells. Feiertage und jährliche Sondertage wirken
ausschließlich über ihre Öffnungsregel auf die tagesabhängigen Außengrenzen des Rasters.

## Trennung in Schicht-Rastermodell und Schicht-Tagesmodell

Todo 26 trennt den bisherigen `SchichtmodellService` in einen eindeutig benannten `SchichtRastermodellService` und einen neuen
`SchichtTagesmodellService`. Beide verwenden eigene Dokumenttypen, Mapper, Validatoren und Firestore-Pfade.
Rastermodellschichten werden nicht als Basis für Tagesvorlagenschichten wiederverwendet.

Die diskriminierte Union verwendet ausschließlich die Planungsartwerte `schichtrastermodell` und `schichttagesmodell`.
Gemeinsame Interfaces enthalten nur Bezeichnung, Aktivstatus und Auditmetadaten. Der Rasterbestand und der Tagesmodellbestand
besitzen getrennte Eintrags-, Schreib- und Dokumenttypen. Der bisherige Wert `schichtraster` wird kontrolliert migriert; der
vorbereitete Typ `ISchichtbausteinmodellDokument` entfällt.

Der Schicht-Tagesmodell-Service verwaltet genau eine Wochentagsvorlage und eine Sonntagsvorlage je Modell. Ihre
Vorlagenschichten besitzen eigene stabile IDs, konkrete Kernzeiten am Start- oder Folgetag, Reihenfolge, Mehrfachbelegung sowie
Vor- und Nachbereitung. Unterschiedliche Schichtanzahlen, Lücken und Überschneidungen zwischen beiden Vorlagen sind zulässig.
Relative Übergänge und Prozentwerte werden nicht gespeichert.

Der TypeScript-Code validiert jede Kernzeit gegen die für die Vorlage maßgebliche Öffnung. Vor- und
Nachbereitungsminuten erweitern die Kernzeit zur tatsächlichen Arbeitszeit. Nur diese Erweiterung darf vor den Öffnungsbeginn
oder nach das Öffnungsende reichen. Firestore Rules erhalten keine fachliche Feldvalidierung.

Feier- und Sondertage sind nicht Bestandteil des Schicht-Tagesmodells. Ihre konkrete Tagesstruktur entsteht frei innerhalb der
Monatsplananlage. Der Schicht-Tagesmodell-Service stellt dafür weder Sondertagsvorlagen noch einen Schichtbausteinkatalog bereit.

Für die bereits abgeschlossene frühere Umstellung auf die heutige Rasterstruktur war keine Migration oder
Kompatibilitätslogik erforderlich; die damaligen Schichtmodelle wurden gelöscht und neu angelegt. Die mit Todo 26 geplante
Umbenennung zu `schichtrastermodell` benötigt dagegen eine kontrollierte Migration bestehender Modelle und Monatspläne. Die
Firestore Rules prüfen gemäß Berechtigungsmatrix nur aktives Profil, Rolle, Filialpfad und erlaubte CRUD-Aktion. Feldstruktur,
IDs, Reihenfolge und Zeitregeln validiert ausschließlich der TypeScript-Code mit seinen Tests.

## Beteiligte Dateien

- `src/app/services/domain/schichtmodell.service.ts`
- `src/app/services/domain/schicht-rastermodell.service.ts` (geplant)
- `src/app/services/domain/schicht-tagesmodell.service.ts` (geplant)
- `src/app/stores/domain/schichtmodell.store.ts`
- `src/app/stores/domain/schicht-rastermodell.store.ts` (geplant)
- `src/app/stores/domain/schicht-tagesmodell.store.ts` (geplant)
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/models/domain/schicht-rastermodell.ts` (geplant)
- `src/app/commons/models/domain/schicht-tagesmodell.ts` (geplant)
- `src/app/commons/constants/firebase.constants.ts`
