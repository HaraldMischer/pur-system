<!-- pur-system/docs/components/schichtplan.md -->

# Schichtplan-Komponenten

Der routbare Schichtplan-Bereich besteht aus getrennten Pages für Ansicht, Planung und Schichtmodelle. Wiederverwendbare
Darstellung und Dialoge liegen unter `src/app/components/schichtplan`.

## Dienstplan-Arbeitsbereich

`DienstplanArbeitsbereich` verwaltet eine gemeinsame Monatsauswahl und rendert für jede ausgewählte Filiale einen
`DienstplanFilialabschnitt`. Ein Monatswechsel gilt dadurch gleichzeitig für alle ausgewählten Filialen.

Die wiederverwendbare Component `MonatSelector` erhält den ausgewählten Monat über `selectedMonat` im Format `YYYY-MM` und
meldet Änderungen über `selectedMonatChange`. Sie bietet ausschließlich die Navigation zum vorherigen und nächsten Monat an.
Der Arbeitsbereich bindet sein Signal über `[(selectedMonat)]`, bleibt Eigentümer des Auswahlzustands und ergänzt bei Bedarf
eigene Aktionen wie den Wechsel zum aktuellen Kalendermonat.

Das Utility `getAktuellerMonat()` ermittelt den aktuellen Monat für die verbindliche Zeitzone `Europe/Berlin`. Auf breiten
Ansichten stellt der Arbeitsbereich die Dienstpläne und die vorbereitete Mitarbeiterübersicht in zwei unabhängig scrollbaren
Spalten dar. Bei höchstens `900px` Containerbreite werden die Bereiche untereinander angeordnet und innerhalb der gemeinsamen
Arbeitsfläche gescrollt.

Jeder `DienstplanFilialabschnitt` lädt seinen Monatsplan über den direkten Filialpfad und zeigt seinen eigenen Lade-, Fehler-,
Leer- oder Planzustand. Ein fehlender Plan kann im Planungsmodus ausschließlich in diesem Filialabschnitt angelegt werden. Dazu
lädt der Abschnitt die Schichtmodelle seiner Filiale und bietet nur aktive Modelle mit mindestens einer Modellschicht an. Im
Ansichtsmodus bleiben alle Abschnitte lesend. Beim Öffnen eines Schichtdialogs übernimmt der Abschnitt Datum und Modellschicht
aus der gewählten Rasterzelle und begrenzt die Mitarbeiterwahl auf die aktiven Mitarbeiter der Filiale.

## Monatsdarstellung

`SchichtplanMonat` stellt den Monat als Tabelle dar. Die erste Spalte enthält die Kalendertage; jede weitere Spalte entspricht
einer nach `reihenfolge` sortierten Modellschicht aus der unveränderlichen Momentaufnahme des Monatsplans. Jede Rasterzelle
enthält alle konkreten Mitarbeiterschichten ihres Tages und ihrer Modellschicht und kann deshalb auch mehrfach besetzt sein.

Jede Schicht löst Anzeigename und optionale `farbkennung` über die gespeicherte `mitarbeiterId` aus dem Mitarbeiter-Store auf und
zeigt Zeitspanne, Pause und Arbeitszeit. Für eine nicht mehr auflösbare Mitarbeiter-ID erscheint ein verständlicher Ersatztext.
Schreibaktionen werden nur für eine bearbeitbare Entwurfsversion angeboten. Dann besitzt jede Rasterzelle eine Anlageaktion mit
bereits festgelegtem Datum und festgelegter Modellschicht. Auf kleinen Viewports bleibt die Tabelle horizontal scrollbar; die
Tagesspalte bleibt beim horizontalen Scrollen sichtbar.

## Dialoge

`DienstplanAnlegenDialog` verlangt ein aktives Schichtmodell der konkreten Filiale. Die Anlage speichert Modell-ID und
Modellbezeichnung am Monatsplan und übernimmt alle geordneten Modellschichten als unveränderliche Momentaufnahme. Plan, erste
Entwurfsversion und Momentaufnahme entstehen gemeinsam in einem atomaren Schreibvorgang.

`SchichtBearbeitenDialog` ordnet der bereits gewählten Rasterzelle einen aktiven Mitarbeiter zu. Datum, Modellschicht, Beginn,
Ende und Standardpause stammen aus der Modell-Momentaufnahme und werden schreibgeschützt angezeigt. Beginn und Ende werden beim
Speichern aus Datum, lokalen Modellschichtzeiten, Folgetagsangabe und Dienstplan-Zeitzone berechnet. Beim Bearbeiten kann nur die
Mitarbeiterzuordnung geändert werden; die Rasterzelle und ihre Zeitwerte bleiben unverändert.

`SchichtmodellBearbeitenDialog` verwaltet die Bezeichnung und den Aktivstatus eines Schichtmodells sowie eine dynamische,
geordnete Liste seiner Modellschichten. Jede Modellschicht besitzt Bezeichnung, Beginn, Ende, abgeleiteten Folgetag,
schreibgeschützte Dauer und automatisch berechnete Standardpause. Mindestens eine Modellschicht bleibt erhalten; weitere können
ergänzt, entfernt und über Hoch-/Runter-Aktionen umsortiert werden. Neue Modelle sind immer aktiv, vorhandene Modelle können
deaktiviert oder erneut aktiviert werden.

Die routbare `SchichtmodellePage` ersetzt in der Navigation die bisherige Vorlagenverwaltung. Sie rendert pro ausgewählter
Filiale einen `SchichtmodelleFilialabschnitt`, der ausschließlich Modelle dieses Filialpfads lädt und bearbeitet. Die
Monatsanlage, die Rasterdarstellung und das Anlegen einzelner Schichten verwenden ausschließlich die Modell-Momentaufnahme.

## Beteiligte Dateien

- `src/app/commons/utils/datum/monat.ts`
- `src/app/components/date-selectors/monat-selector`
- `src/app/components/schichtplan/dienstplan-arbeitsbereich`
- `src/app/components/schichtplan/dienstplan-filialabschnitt`
- `src/app/components/schichtplan/dienstplan-anlegen-dialog`
- `src/app/components/schichtplan/schichtplan-monat`
- `src/app/components/schichtplan/schicht-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtmodell-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtmodelle-filialabschnitt`
- `src/app/pages/schichtplan`
