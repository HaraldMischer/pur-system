<!-- pur-system/docs/components/schichtplan.md -->

# Schichtplan-Komponenten

Der routbare Schichtplan-Bereich besteht aus getrennten Pages für Ansicht, Planung und Schichtvorlagen. Wiederverwendbare
Darstellung und Dialoge liegen unter `src/app/components/schichtplan`.

## Dienstplan-Arbeitsbereich

`DienstplanArbeitsbereich` verwaltet eine gemeinsame Monatsauswahl und rendert für jede ausgewählte Filiale einen
`DienstplanFilialabschnitt`. Ein Monatswechsel gilt dadurch gleichzeitig für alle ausgewählten Filialen.

Jeder `DienstplanFilialabschnitt` lädt seinen Monatsplan über den direkten Filialpfad und zeigt seinen eigenen Lade-, Fehler-,
Leer- oder Planzustand. Ein fehlender Plan kann im Planungsmodus ausschließlich in diesem Filialabschnitt angelegt werden. Im
Ansichtsmodus bleiben alle Abschnitte lesend. Beim Öffnen eines Schichtdialogs lädt der Abschnitt die Schichtvorlagen seiner
Filiale und begrenzt die Mitarbeiterwahl auf deren aktive Mitarbeiter.

## Monatsdarstellung

`SchichtplanMonat` ordnet die Schichten nach lokalem Kalendertag. Jede Schicht löst Anzeigename und optionale `farbkennung` über
die gespeicherte `mitarbeiterId` aus dem Mitarbeiter-Store auf und zeigt außerdem Vorlagenbezeichnung, Zeitspanne, Pause und
Arbeitszeit. Für eine nicht mehr auflösbare Mitarbeiter-ID erscheint ein verständlicher Ersatztext. Schreibaktionen werden nur
für eine bearbeitbare Entwurfsversion angeboten. Jede Tageskarte besitzt dann eine Anlageaktion, die den Schichtdialog mit dem
Datum dieses Tages öffnet.

## Dialoge

`SchichtBearbeitenDialog` ordnet einen aktiven Mitarbeiter und eine aktive Schichtvorlage einem Datum zu. Beginn und Ende werden
aus den lokalen Vorlagenzeiten, der Folgetagsangabe und `Europe/Berlin` berechnet. Die Standardpause wird übernommen und kann
für die konkrete Schicht angepasst werden. Beim Bearbeiten bleibt die gespeicherte Vorlagen-Momentaufnahme erhalten, solange
keine andere Vorlage gewählt wird.

`SchichtvorlageBearbeitenDialog` legt Vorlagen an und bearbeitet Bezeichnung, lokale Zeiten und Aktivstatus. Neue Vorlagen sind
immer aktiv; die sichtbare Aktiv-Checkbox ist beim Anlegen deaktiviert und wird beim Bearbeiten freigeschaltet. Liegt das Ende
vor dem Beginn, leitet der Dialog den Folgetag automatisch ab; gleiche Uhrzeiten sind ungültig. Nach Änderungen an den
Zeitwerten zeigt er die vollständige Schichtdauer in Stunden an und berechnet die Standardpause daraus mit 0, 30 oder 45 Minuten.
Schichtdauer und Standardpause werden schreibgeschützt angezeigt. Inaktive Vorlagen bleiben in der Verwaltungsseite sichtbar und
können erneut aktiviert werden.

Die `SchichtvorlagenPage` rendert für jede ausgewählte Filiale einen `SchichtvorlagenFilialabschnitt`. Jeder Abschnitt lädt und
verwaltet ausschließlich die Vorlagen seines direkten Filialpfads und übernimmt diesen Pfad beim Öffnen des Dialogs. Mehrere
Vorlagenbestände können dadurch gemeinsam dargestellt werden, bleiben aber fachlich und technisch vollständig filialbezogen.

## Beteiligte Dateien

- `src/app/components/schichtplan/dienstplan-arbeitsbereich`
- `src/app/components/schichtplan/dienstplan-filialabschnitt`
- `src/app/components/schichtplan/schichtplan-monat`
- `src/app/components/schichtplan/schicht-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtvorlagen-filialabschnitt`
- `src/app/pages/schichtplan`
