<!-- pur-system/docs/architektur/services/dienstplan-service.md -->

# Dienstplan-Service

Die fachlichen Abläufe stehen im
[Fachkonzept Dienst- und Schichtplanung](../../fachkonzepte/dienst-und-schichtplanung.md), die verbindlichen Pfad- und
CRUD-Rechte in der [Berechtigungsmatrix](../../matrizen/berechtigungen.md).

Der `DienstplanService` verwaltet filialbezogene Monatspläne, Versionen, Tagesschichten und konkrete Mitarbeiterschichten.
Das Schichtmodell ist das einzige unterstützte Modell. Monatspläne und Schichten besitzen deshalb kein Feld zur Auswahl
einer Planungsart.

## Laden und Monatsplananlage

`loadDienstplanMonat()` lädt den Monatsplan, seine Tagesschichten, Versionen und Mitarbeiterschichten. Die gespeicherten
Kalendertage und Tagesschichten sind verbindliche Momentaufnahmen; unvollständige Dokumente werden nicht durch neu berechnete
Ersatzwerte ergänzt.

`createDienstplan()` prüft ein aktives, nicht leeres Schichtmodell derselben Filiale. Anschließend löst der Service alle
Kalendertage und wirksamen Öffnungen auf. Reguläre Tage von Montag bis Samstag erhalten Tagesschichten aus der
Wochentagsvorlage, reguläre Sonntage aus der Sonntagsvorlage. Feiertage mit `Wie Sonntag` verwenden ebenfalls die
Sonntagsvorlage. Für abweichend geöffnete Feier- und Sondertage wird die zuvor frei konfigurierte Tagesstruktur übernommen;
geschlossene Tage bleiben ohne Tagesschichten.

Vor dem Schreiben validiert der Service jede Kernzeit gegen die wirksame Öffnung des konkreten Tages. Nur Vor- und
Nachbereitungsminuten dürfen die Öffnungsgrenzen erweitern. Monatsplan, erste Entwurfsversion, Kalender-Momentaufnahme,
Modellreferenz und sämtliche Tagesschichten werden atomar geschrieben. Spätere Änderungen am Modell oder an den
Filialeinstellungen verändern den Monatsplan nicht.

## Versionierung und Veröffentlichung

Jede Dienstplanversion besitzt eine ganzzahlige `revision`. Eine neue Entwurfsversion beginnt mit Revision 0. Jede
Schichtänderung und jeder Statuswechsel erhöht die Revision genau einmal. Schreibtransaktionen prüfen Status und erwartete
Revision erneut, damit parallele oder veraltete Änderungen kontrolliert scheitern.

`publishDienstplan()` veröffentlicht einen vollständig geladenen, konfliktfreien Entwurf. Ein bisher veröffentlichter Stand
wird im selben Schreibvorgang archiviert. `createEntwurfAusVeroeffentlichung()` kopiert die Schichten des veröffentlichten
Stands in eine neue bearbeitbare Entwurfsversion; die Tagesschichten des Monatsplans bleiben unverändert.

Ein Monatsplan darf nur gelöscht werden, wenn er noch nie veröffentlicht wurde und sein Entwurf keine Mitarbeiterschichten
enthält. Monatsplan, Entwurfsversion und Tagesschichten werden gemeinsam entfernt. Nach der ersten Veröffentlichung bleibt der
Monatsplan dauerhaft erhalten.

## Mitarbeiterschichten und Belegungsindex

Jede Mitarbeiterschicht referenziert genau eine konkrete `tagesschichtId`. Beginn und Ende werden aus der historisch stabilen
tatsächlichen Arbeitszeit dieser Tagesschicht übernommen und als absolute Firestore-Zeitstempel gespeichert. Zusätzlich
enthält die Schicht Dienstplandatum und Mitarbeiter-ID. Ein Mitarbeiter muss aktiv und der Zielfiliale zugeordnet sein. Eine
Tagesschicht ohne Mehrfachbelegung darf höchstens einmal besetzt werden.

`createSchicht()`, `updateSchicht()` und `deleteSchicht()` aktualisieren Schicht, Versionsrevision, Pausenwerte und den
firmenweiten Mitarbeiterbelegungsindex in einer Firestore-Transaktion. Beim Verschieben bleiben Schicht-ID und
Mitarbeiterzuordnung erhalten; Zieltag, Tagesschicht und Zeitwerte stammen vollständig aus dem Ziel.

Der Belegungsindex liegt unter
`unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiterbelegung/{mitarbeiterId}__{datum}`. Jede Referenz enthält Mitarbeiter,
Dienstplandatum, Filiale, Dienstplan, Version, Schicht, Versionsstatus, absoluten Beginn und absolutes Ende sowie den
Pausenwert. Schichten über Mitternacht werden unter jedem berührten lokalen Kalendertag indexiert. Ein genau um Mitternacht
liegendes Ende gehört als exklusive Grenze nicht mehr zum Folgetag.

Die Transaktion liest die bisherigen und neuen Belegungstage und prüft zeitliche Überschneidungen filialübergreifend erneut.
Ein Entwurf ersetzt dabei den veröffentlichten Stand desselben Filialdienstplans. Kann der vollständige Belegungsstand nicht
ermittelt werden, bleibt die Schreibaktion gesperrt.

`calculateArbeitsbloecke()` gruppiert die auf einen Mitarbeiter und Dienstplantag begrenzten Schichten. Lücken unter 30 Minuten
verbinden Schichten, ab 30 Minuten beginnt ein neuer Block; Überschneidungen sind ungültig. Die Schichtdauern ergeben je Block
0, 30 oder 45 Minuten bezahlte Pause. Ausschließlich die chronologisch letzte Schicht eines Blocks speichert dessen
`pauseMinuten`; alle übrigen Blockschichten speichern `0`.

## Validierungsgrenze

Firestore Rules sichern gemäß Berechtigungsmatrix ausschließlich aktives Profil, Rolle, Filialpfad und erlaubte CRUD-Aktion.
Feldstruktur, Zielreferenzen, Reihenfolge, Statuswechsel, Revision und Zeitregeln validiert der TypeScript-Code mit seinen
Tests. Unbekannte technische Fehler werden vollständig protokolliert und der Oberfläche als allgemeiner Fehler gemeldet.

## Beteiligte Dateien

- `src/app/services/domain/dienstplan.service.ts`
- `src/app/stores/domain/dienstplan.store.ts`
- `src/app/commons/models/domain/dienstplan.ts`
- `src/app/commons/models/domain/dienstplan-kalendertag.ts`
- `src/app/commons/models/domain/mitarbeiterbelegung.ts`
- `src/app/commons/models/domain/schicht.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/utils/dienstplan/mitarbeiterbelegung.ts`
- `src/app/commons/utils/dienstplan/schicht-zeit.ts`
- `src/app/commons/utils/dienstplan/dienstplan-kalendertage.ts`
- `src/app/commons/utils/dienstplan/dienstplan-tagesschichten.ts`
