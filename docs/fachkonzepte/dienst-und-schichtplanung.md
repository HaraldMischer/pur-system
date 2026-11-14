<!-- pur-system/docs/fachkonzepte/dienst-und-schichtplanung.md -->

# Dienst- und Schichtplanung

## Einordnung und Hauptquellen

Dieses Dokument ist die fachliche Hauptquelle für Dienst- und Schichtplanung. Gesetzliche und betriebliche Öffnungsgrenzen
stehen in der [Öffnungszeiten-Matrix](../matrizen/oeffnungszeiten.md), Pfad- und CRUD-Rechte in der
[Berechtigungsmatrix](../matrizen/berechtigungen.md). Der [Projektstand](../projekt-stand.md) fasst den aktuellen
Umsetzungs- und Prüfstand zusammen.

## Allgemeine Beschreibung und Datenpfade

Ein Dienstplan gehört genau zu einer Filiale und umfasst einen vollständigen Kalendermonat in der Zeitzone `Europe/Berlin`.
Der Monat im Format `YYYY-MM` ist die eindeutige Dienstplan-ID innerhalb der Filiale. Pro Filiale und Monat existiert genau ein
Dienstplan.

Das Schichtmodell ist das einzige Modell. Eine zusätzliche Planungsart und ein gespeichertes Feld `planungsart`
sind nicht vorgesehen. Modelle und Monatspläne verwenden folgende fachliche Pfade:

```text
unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/schichtmodell/{modellId}
  /tagesvorlagenschicht/{vorlagenschichtId}
unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/dienstplan/{monat}
  /tagesschicht/{tagesschichtId}
  /version/{versionId}
    /schicht/{schichtId}
unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/einstellung/allgemein
unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/einstellung/oeffnungszeiten
  /sondertag/{sondertagId}
unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiterbelegung/{mitarbeiterId}__{datum}
```

Der Dienstplan enthält versionierte Bearbeitungsstände. Jede Version besitzt eine fortlaufende Nummer und genau einen Status
`entwurf`, `veroeffentlicht` oder `archiviert`. Pro Dienstplan gibt es höchstens einen Entwurf und eine veröffentlichte Version.
Planer bearbeiten nur den Entwurf; Mitarbeiter sehen nur die veröffentlichte Version. Bei einer Ersatzveröffentlichung wird
der bisher veröffentlichte Stand archiviert. Veröffentlichte und archivierte Versionen werden nicht verändert.

## Filialeinstellungen und Kalendertage

Die allgemeinen Filialeinstellungen speichern das Bundesland. Die technische Zeitzone gilt anwendungsweit. Das Dokument
`einstellung/oeffnungszeiten` enthält die Standardöffnung und sieben Wochentagsmodi. Jeder Wochentag verwendet `standard`,
`abweichend` oder `geschlossen`. Eine geöffnete Regel beschreibt genau einen positiven Zeitraum und darf über Mitternacht
reichen.

Die Oberfläche unterscheidet `Wochentage`, `Gesetzliche Feiertage` und `Jährliche Sondertage`. Gesetzliche Feiertage verwenden
`Standard`, `Wie Sonntag`, `Abweichend` oder `Geschlossen`. `Wie Sonntag` übernimmt dynamisch die wirksame Sonntagsöffnung.
Jährliche Sondertage verwenden `Standard`, `Abweichend` oder `Geschlossen`.

Die wirksame Regel wird in der Reihenfolge `benutzerdefinierter jährlicher Sondertag → systemdefinierter Sondertag → wirksame
Wochenöffnung` aufgelöst. Kalendermerkmale wie Feiertag oder Sondertag bleiben unabhängig von der Öffnung erhalten. Fehlende
oder widersprüchliche Einstellungen verhindern die Monatsplananlage mit einer verständlichen fachlichen Fehlermeldung.

Beim Anlegen eines Monatsplans werden alle Kalendertage mit wirksamer Öffnung und Kalendermerkmalen als unveränderliche
Momentaufnahme gespeichert. Spätere Änderungen an Filialeinstellungen oder Feiertagsregeln verändern bestehende Pläne nicht.

## Schichtmodell

Jede Filiale besitzt eigene Schichtmodelle. Ein Modell enthält Bezeichnung, Aktivstatus, eine Wochentagsvorlage für
Montag bis Samstag und eine davon unabhängige Sonntagsvorlage. Jede Vorlage enthält fachlich geordnete Vorlagenschichten mit
stabiler ID, Bezeichnung, Reihenfolge und der Einstellung zur Mehrfachbelegung.

Der Beginn der ersten und das Ende der letzten Vorlagenschicht werden nicht fest gespeichert, sondern aus der wirksamen
Tagesöffnung abgeleitet. Nur innere Grenzen besitzen konkrete Lokalzeiten am Start- oder Folgetag. Die erste Schicht darf
Vorbereitungsminuten und die letzte Nachbereitungsminuten enthalten; bei einer einzelnen Schicht gelten beide Werte.

Wochentags- und Sonntagsvorlage dürfen sich in Anzahl, Identität, Grenzen und Überschneidungen unterscheiden. Lücken und
Überschneidungen sind fachlich zulässig. Jede Kernschicht muss eine positive Dauer besitzen und vollständig innerhalb der
maßgeblichen Öffnung liegen. Nur Vor- und Nachbereitung darf die tatsächliche Arbeitszeit über die Öffnungsgrenzen erweitern.

Beim initialen Erstellen eines Monatsplans erhält jeder Kalendertag eine eigene Tagesstruktur. Reguläre Tage übernehmen die
passende Vorlage. Feiertage mit `Wie Sonntag` verwenden die Sonntagsvorlage. Abweichend geöffnete Feier- und Sondertage werden
vor dem Schreiben frei konfiguriert. Geschlossene Tage enthalten keine Tagesschichten.

Jede Tagesschicht speichert eine stabile Tagesinstanz-ID, Datum, Herkunft, Reihenfolge, Kernzeit, tatsächliche Arbeitszeit und
Mehrfachbelegung. Monatsplan, erste Entwurfsversion, Kalender-Momentaufnahme und Tagesschichten werden erst nach vollständiger
Validierung atomar angelegt. Die Tagesstruktur bleibt anschließend für alle Versionen des Monatsplans unverändert.

Die tatsächliche Arbeitszeit beginnt um die Vorbereitungsminuten vor dem Kernbeginn und endet um die Nachbereitungsminuten nach
dem Kernende. Vor- und Nachbereitung sind damit vollständig bezahlte Zeit. Für eine Mitarbeiterschicht gilt entsprechend
`Lohnzeit = Kerndauer + Vorbereitungszeit + Nachbereitungszeit`.

## Planung und konkrete Mitarbeiterschichten

Die Monatsdarstellung verwendet keine monatsweit identischen Schichtspalten. Jede Tageszeile zeigt ausschließlich ihre eigenen
Tagesschichten auf einer gemeinsamen Zeitachse. Geschlossene Außenbereiche werden gekennzeichnet, offene Lücken bleiben frei
und zeitlich überschneidende Tagesschichten verwenden getrennte Spuren.

Position und Breite einer sichtbaren Tagesschichtfläche richten sich ausschließlich nach ihrer Kernzeit. Vor- und
Nachbereitungsminuten erweitern die Fläche nicht, sondern erscheinen als zusätzliche Zeitangabe. Die zugeordnete
Mitarbeiterschicht und ihre Lohnzeit verwenden dagegen die vollständige tatsächliche Arbeitszeit.

Ein Planer ordnet einer konkreten Tagesschicht einen aktiven, der Filiale zugewiesenen Mitarbeiter per Drag-and-drop oder über
eine gleichwertige Aktion zu. Der Dienstplan prüft die Filialzuordnung beim Schreiben erneut. Ist sie nicht vorhanden, lautet
die Meldung `Mitarbeiter nicht zugelassen` und `Dieser Mitarbeiter ist für diese Filiale nicht zugelassen.`.

Eine Mitarbeiterschicht referenziert genau eine `tagesschichtId`. Beginn und Ende werden aus der tatsächlichen Arbeitszeit der
Tagesschicht übernommen und als absolute Zeitpunkte gespeichert. Bei deaktivierter Mehrfachbelegung kann die Tagesschicht nur
einmal besetzt werden. Derselbe Mitarbeiter darf ihr nicht mehrfach zugeordnet werden.

Beim Verschieben bleiben Schicht-ID und Mitarbeiter erhalten; Zieltag, Tagesschicht und Zeitwerte stammen vollständig aus dem
Ziel. Ist eine Schicht bereits im Entwurf vorhanden, deren Mitarbeiter später deaktiviert oder aus der Filiale entfernt wurde,
bleibt sie sichtbar, blockiert aber die Veröffentlichung.

## Konflikte, Pausen und Belegungsindex

Schichten eines Mitarbeiters werden filialübergreifend auf zeitliche Überschneidungen geprüft. Der firmenweite Belegungsindex
liegt unter `mitarbeiterbelegung/{mitarbeiterId}__{datum}` und wird gemeinsam mit Schicht, Pausenwert und Versionsrevision in
einer Firestore-Transaktion aktualisiert. Schichten über Mitternacht werden unter jedem berührten lokalen Kalendertag geführt.

Lücken unter 30 Minuten verbinden Schichten zu einem Arbeitsblock; ab 30 Minuten beginnt ein neuer Block. Überschneidungen sind
ungültig. Die Schichtdauern ergeben je Block 0, 30 oder 45 Minuten bezahlte Pause. Ausschließlich die chronologisch letzte
Schicht des Blocks speichert dessen `pauseMinuten`; alle übrigen speichern `0`. Die Lohnzeit bleibt die vollständige Zeitspanne
von tatsächlichem Beginn bis tatsächlichem Ende einschließlich Vor- und Nachbereitung und wird nicht redundant gespeichert.

Die verbindliche Schreibprüfung liest die betroffenen Indexdokumente innerhalb derselben Transaktion erneut. Eine abweichende
Revision oder inzwischen entstandene Überschneidung bricht den Vorgang kontrolliert ab. Kann der vollständige Belegungsstand
nicht geladen werden, bleiben die betroffenen Planungsaktionen gesperrt.

## Rollen und Filialgrenzen

Navigation und Route erfordern den App-Bereich `schichtplan`; Datenrechte ergeben sich unabhängig davon aus aktivem Profil,
Auth-Rolle und vollständiger Filialzuordnung. Die verbindlichen Rechte stehen in der Berechtigungsmatrix.

- `master` plant in allen Filialen, `office` nur in freigegebenen Filialen.
- Filialkonten verwenden die Oberfläche bis zur Umsetzung des betrieblichen `dienstplaner`-Sitzungszustands rein lesend.
- Mitarbeiter lesen in zugeordneten Filialen ausschließlich die aktuelle veröffentlichte Version und besitzen keine
  Schreibrechte.

Bei mehreren ausgewählten Filialen bleiben Planung, Versionierung und Veröffentlichung je Filialdienstplan getrennt. Die
Mitarbeiterliste führt die zulässigen Mitarbeiter der ausgewählten Filialen ohne Duplikate zusammen. Vor jeder Zuordnung prüft
der jeweilige Filialdienstplan seine eigene Mitarbeiterfreigabe. Nur der Belegungsindex ist eine gemeinsame firmenweite
Prüfstruktur.

## Planungs- und Veröffentlichungsablauf

Existiert kein Monatsplan, wählt ein Planer ein aktives Schichtmodell und vervollständigt erforderliche
Sondertagstrukturen. Danach werden Monatsplan, Version 1 und sämtliche Momentaufnahmen atomar als Entwurf angelegt. Ein noch
nicht veröffentlichter,
leerer Entwurf darf vollständig gelöscht und aus einem anderen aktiven Modell neu angelegt werden.

Die Veröffentlichung verlangt einen vollständig geladenen, konfliktfreien Entwurf. Existiert bereits eine veröffentlichte
Version, wird sie im selben Vorgang archiviert. Änderungen an einem veröffentlichten Plan beginnen mit einem neuen Entwurf,
der die Mitarbeiterschichten kopiert und dieselben unveränderlichen Tagesschichten verwendet. Der bisher veröffentlichte Stand
bleibt sichtbar, bis der neue Entwurf erfolgreich veröffentlicht wurde.

Jede Version besitzt eine ganzzahlige `revision`. Neue Entwürfe beginnen mit 0; jede Schichtänderung und jeder Statuswechsel
erhöht die Revision genau einmal. Transaktionen prüfen Status und erwartete Revision erneut. Offline-Schreibvorgänge sind nicht
vorgesehen.

## Datenbereinigung des früheren Modells

Die frühere Rastermodell-Implementierung wurde ohne Migration entfernt. Vorhandene Rastermodelle und Rasterdienstpläne wurden
kontrolliert aus Firestore gelöscht. Die Löschung war eine separate Datenaktion und nicht Bestandteil der Codebereinigung.

## Tests und Abgrenzung

Tests decken Monatsgrenzen, Tageserzeugung, Feiertage, Übernachtöffnungen, Kernzeitgrenzen, Randminuten, Mehrfachbelegung,
Konflikte, Pausen, Versionierung, Veröffentlichung und parallele Schreibzugriffe ab. Rules-Tests prüfen die Pfad- und
CRUD-Rechte gemäß Berechtigungsmatrix, nicht die fachlichen Felder.

Automatische Planung, Urlaubs-, Krankheits- und sonstige Abwesenheiten, Arbeitszeitkonten, Schichttausch,
Push-Benachrichtigungen, Zeiterfassung, Exporte und Lohnabrechnungsanbindungen sind nicht Teil dieser Ausbaustufe.
