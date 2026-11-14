<!-- pur-system/docs/architektur/components/schichtplan.md -->

# Schichtplan-Komponenten

Dieses Dokument beschreibt die technische Seiten- und Component-Struktur. Das fachliche Zielbild steht im
[Fachkonzept Dienst- und Schichtplanung](../../fachkonzepte/dienst-und-schichtplanung.md), die verbindlichen Datenrechte in der
[Berechtigungsmatrix](../../matrizen/berechtigungen.md).

Der routbare Schichtplan-Bereich besteht aus getrennten Pages für Ansicht, Planung und Schichtmodelle. Wiederverwendbare
Darstellungen und Dialoge liegen unter `src/app/components/schichtplan`. Das Schichtmodell ist das einzige Modell der
Planung; eine Auswahl zwischen Modellarten findet nicht statt.

## Dienstplan-Planungsseite

Die `DienstplanPlanungPage` verwaltet eine gemeinsame Monatsauswahl und rendert für jede ausgewählte Filiale einen
`DienstplanPlanungsbereich`. Ein Monatswechsel gilt gleichzeitig für alle sichtbaren Filialen. Jeder Bereich lädt seinen
Monatsplan über den vollständigen Filialpfad und zeigt einen eigenen Lade-, Fehler-, Leer- oder Planzustand.

Die wiederverwendbare Component `MonatSelector` erhält den ausgewählten Monat im Format `YYYY-MM` und meldet Änderungen über
`selectedMonatChange`. Das Utility `getAktuellerMonat()` ermittelt den aktuellen Monat für `Europe/Berlin`.

Auf breiten Ansichten stehen Dienstpläne und Mitarbeiterübersicht in zwei unabhängig scrollbaren Spalten. Die Übersicht führt
aktive Mitarbeiter aller ausgewählten Filialen ohne Duplikate zusammen und zeigt Farbkennung, Lohnzeit und Schichtanzahl des
aktiven Monatsstands. Die Mitarbeiterkarten sind mit Angular CDK Drag-and-drop als kopierbare Planungselemente verfügbar.
Bei höchstens `900px` Containerbreite werden die Bereiche untereinander angeordnet.

Ein fehlender Monatsplan wird im zugehörigen Filialabschnitt aus einem aktiven Schichtmodell angelegt. Die
Mitarbeiterwahl bleibt auf aktive, der Zielfiliale zugeordnete Mitarbeiter begrenzt. Beim Ablegen prüft der Filialdienstplan
diese Zuordnung erneut und zeigt bei einer Verletzung `Mitarbeiter nicht zugelassen` mit der Nachricht
`Dieser Mitarbeiter ist für diese Filiale nicht zugelassen.`.

## Monatsdarstellung

`DienstplanMonatsliste` stellt den Monatsplan als gemeinsame Zeitachse und tagesabhängige Tagesschichten dar. Jeder Listentag
zeigt Wochentag, Datum, wirksame Öffnung und Feiertags- oder Sondertagsbezeichnungen sowie ausschließlich seine eigenen
Tagesschichten. Reguläre Tage verwenden die aus dem Modell erzeugten Instanzen; abweichend geöffnete Feier- und Sondertage
verwenden ihre bei der Monatsanlage frei konfigurierten Instanzen.

Die Zeitachse reicht ohne Stundenrundung von der exakten frühesten Öffnung bis zum exakten spätesten Öffnungsende. Die
Berechnung verwendet den verbindlichen 15-Minuten-Schritt; die Kopfzeile beschriftet nur die dazwischenliegenden vollen
Stunden. Bereiche vor oder nach der wirksamen Öffnung erscheinen als `Geschlossen`, offene Lücken bleiben frei und zeitlich
überschneidende Tagesschichten verwenden getrennte Spuren. Auf kleinen Viewports bleibt die Zeitachse horizontal scrollbar;
die Tagesangaben bleiben am linken Rand sichtbar.

Position und Breite einer Tagesschichtfläche verwenden deren Kernbeginn und Kernende. Vor- und Nachbereitungsminuten werden als
Zusatztext angezeigt, verändern die Fläche aber nicht. Zugeordnete Mitarbeiterschichten übernehmen stattdessen den tatsächlichen
Beginn einschließlich Vorbereitung und das tatsächliche Ende einschließlich Nachbereitung. Schichtkarte und
Mitarbeiter-Zusammenfassung berechnen daraus die vollständige Lohnzeit.

Jede konkrete Tagesschicht ist bei einem bearbeitbaren Entwurf ein Ablageziel und bietet zusätzlich eine gleichwertige
Anlageaktion für Tastatur und Touch. Mehrere Mitarbeiterschichten sind nur bei aktivierter Mehrfachbelegung zulässig. Derselbe
Mitarbeiter kann nicht zweimal derselben Tagesschicht zugeordnet werden. Schichtkarten können in andere zulässige
Tagesschichten verschoben werden; Schicht-ID und Mitarbeiter bleiben erhalten, Datum und Zeitwerte stammen aus dem Ziel.

Die Planungsseite beobachtet den für Monat und sichtbare Mitarbeiter begrenzten firmenweiten Belegungsindex. Während dessen
Initialladung oder nach einem Listenerfehler bleiben Planerstellung, Schichtaktionen und Drag-and-drop gesperrt. Verbindlich
ist zusätzlich die transaktionale Prüfung beim Schreiben.

## Planaktionen und Dialoge

`DienstplanAnlegenDialog` verlangt ein aktives Schichtmodell der Filiale. Nach der Modellwahl konfiguriert der Planer die
Tagesstruktur für abweichend geöffnete Feier- und Sondertage. Plan, erste Entwurfsversion, Kalender-Momentaufnahme und
Tagesschichten entstehen anschließend atomar. Ein leerer, noch nie veröffentlichter Plan darf gelöscht und aus einem anderen
aktiven Modell neu angelegt werden.

`SchichtBelegenDialog` ordnet einer bereits festgelegten Tagesschicht einen aktiven Mitarbeiter zu. Datum, Bezeichnung und
Zeitspanne bleiben schreibgeschützt. Eine belegte Einfachschicht oder eine filialübergreifende zeitliche Überschneidung sperrt
das Speichern.

`SchichtmodellBearbeitenDialog` enthält getrennte Bereiche für die Wochentagsvorlage und die
Sonntagsvorlage. Beide erlauben beliebig viele Vorlagenschichten mit stabiler ID, Bezeichnung, Reihenfolge,
Mehrfachbelegung und unabhängigen inneren Grenzen. Der Beginn der ersten und das Ende der letzten Schicht werden aus der
jeweiligen Öffnung abgeleitet. Vorlauf und Nachlauf werden im Kopf der Tagesvorlage erfasst, technisch aber weiterhin der
ersten beziehungsweise letzten Schicht zugeordnet. Neue Vorlagenschichten erhalten direkt im editierbaren Bezeichnungsfeld
eine fortlaufende Standardbezeichnung; eine zusätzliche Schichtüberschrift wird nicht dargestellt. Jede Tagesvorlage besitzt
einen gemeinsamen Außenrahmen, in dem ihre Vorlagenschichten als getrennte Listenzeilen erscheinen.

Beim Hinzufügen einer Schicht werden alle inneren Grenzen der betroffenen Vorlage auf dem 15-Minuten-Raster möglichst
gleichmäßig über die vollständige Öffnung neu verteilt. Die Grenzen bleiben anschließend bearbeitbar. Lücken und
Überschneidungen bleiben zulässig; jede Kernschicht benötigt eine positive Dauer innerhalb der maßgeblichen Öffnung. Nur
Randminuten dürfen die Öffnungsgrenzen erweitern.

Die routbare `SchichtmodellePage` rendert pro ausgewählter Filiale eine `SchichtmodelleFiliale`. Der Bereich lädt
ausschließlich Modelle seines Filialpfads und zeigt alle Modelle als umrandete Liste mit direkter Bearbeitungsaktion. Inaktive
Modelle bleiben sichtbar und werden gekennzeichnet.

## Veröffentlichte Dienstplanansicht

Die `DienstplanAnsichtPage` rendert für jede ausgewählte Filiale einen `DienstplanAnsichtsbereich`. Jeder Bereich lädt mit
`networkOnly` ausschließlich die über `veroeffentlichteVersionId` referenzierte Version. Entwürfe und archivierte Versionen
werden weder dargestellt noch als Ausweichstand verwendet.

Die Ansicht gruppiert Schichten nach Tagen und zeigt Mitarbeiternamen, Farbkennung, absolute Zeitspanne und bezahlte Pause.
Ein Ende am Folgetag wird gekennzeichnet. Lade-, Leer- und Fehlerzustände bleiben je Filiale getrennt. Ersetzt eine neue
Veröffentlichung den bisherigen Stand, erscheint nach der nächsten Netzwerkladung nur die neu referenzierte Version.

## Beteiligte Dateien

- `src/app/commons/utils/datum/monat.ts`
- `src/app/commons/utils/dienstplan/dienstplan-zeitachse.ts`
- `src/app/components/date-selectors/monat-selector`
- `src/app/components/schichtplan/dienstplan-ansichtsbereich`
- `src/app/components/schichtplan/dienstplan-planungsbereich`
- `src/app/components/schichtplan/dienstplan-anlegen-dialog`
- `src/app/components/schichtplan/dienstplan-monatsliste`
- `src/app/components/schichtplan/schicht-belegen-dialog`
- `src/app/components/schichtplan/schichtmodelle-filiale`
- `src/app/components/schichtplan/schichtmodell-bearbeiten-dialog`
- `src/app/components/schichtplan/dienstplan-sondertage-dialog`
- `src/app/pages/schichtplan/dienstplan-ansicht-page`
- `src/app/pages/schichtplan/dienstplan-planung-page`
- `src/app/pages/schichtplan/schichtmodelle-page`
