<!-- pur-system/docs/architektur/components/schichtplan.md -->

# Schichtplan-Komponenten

Der routbare Schichtplan-Bereich besteht aus getrennten Pages für Ansicht, Planung und Schichtmodelle. Wiederverwendbare
Darstellung und Dialoge liegen unter `src/app/components/schichtplan`.

## Dienstplan-Arbeitsbereich

`DienstplanArbeitsbereich` verwaltet eine gemeinsame Monatsauswahl und rendert für jede ausgewählte Filiale einen
`DienstplanFiliale`. Ein Monatswechsel gilt dadurch gleichzeitig für alle ausgewählten Filialen.

Die wiederverwendbare Component `MonatSelector` erhält den ausgewählten Monat über `selectedMonat` im Format `YYYY-MM` und
meldet Änderungen über `selectedMonatChange`. Sie bietet ausschließlich die Navigation zum vorherigen und nächsten Monat an.
Der Arbeitsbereich bindet sein Signal über `[(selectedMonat)]`, bleibt Eigentümer des Auswahlzustands und ergänzt bei Bedarf
eigene Aktionen wie den Wechsel zum aktuellen Kalendermonat.

Das Utility `getAktuellerMonat()` ermittelt den aktuellen Monat für die verbindliche Zeitzone `Europe/Berlin`. Auf breiten
Ansichten stellt der Arbeitsbereich die Dienstpläne und die Mitarbeiterübersicht in zwei unabhängig scrollbaren Spalten dar.
Die Mitarbeiterübersicht führt die aktiven Mitarbeiter aller ausgewählten Filialen ohne Duplikate zusammen und zeigt die
optionale `farbkennung`. Ohne gespeicherte Farbkennung verwendet der Farbpunkt die normale Textfarbe mit 38 Prozent Deckkraft.
Für jeden Mitarbeiter summiert die Übersicht außerdem die Lohnzeit einschließlich der vollständig bezahlten Pausen und die
Schichtanzahl des ausgewählten Monats über alle ausgewählten Filialen. Je Filiale zählt der Entwurf als aktiver Planungsstand;
ohne Entwurf wird die veröffentlichte Version verwendet. Ältere Versionen fließen nicht zusätzlich in die Monatswerte ein.
Im Planungsmodus sind die Mitarbeiterkarten mit Angular CDK Drag-and-drop als kopierbare Planungselemente verfügbar. Die Liste
bleibt dabei unverändert; ein Mitarbeiter kann nacheinander in mehrere zulässige Rasterzellen eingeplant werden. Im
Ansichtsmodus sind die Karten nicht ziehbar.
Bei höchstens `900px` Containerbreite werden die Bereiche untereinander angeordnet und innerhalb der gemeinsamen Arbeitsfläche
gescrollt.

Jede `DienstplanFiliale` lädt ihren Monatsplan über den direkten Filialpfad und zeigt ihren eigenen Lade-, Fehler-,
Leer- oder Planzustand. Ein fehlender Plan kann im Planungsmodus ausschließlich in diesem Filialabschnitt angelegt werden. Dazu
lädt der Abschnitt die Schichtmodelle seiner Filiale und bietet nur aktive Modelle mit mindestens einer Modellschicht an. Im
Ansichtsmodus bleiben alle Abschnitte lesend. Beim Öffnen eines Schichtdialogs übernimmt der Abschnitt Datum und Modellschicht
aus der gewählten Rasterzelle und begrenzt die Mitarbeiterwahl auf die aktiven Mitarbeiter der Filiale.

Im leeren, noch nie veröffentlichten Entwurf bietet die Statuszeile des Monatsplans zusätzlich `Schichtmodell wechseln` an.
Sobald der Entwurf mindestens eine Schicht enthält, ist die Aktion mit einem erklärenden Hinweis deaktiviert; nach dem Löschen
aller Schichten wird sie wieder aktiv. Nach der ersten Veröffentlichung wird die Aktion dauerhaft ausgeblendet.

## Monatsdarstellung

`SchichtplanMonat` stellt den Monat als Tabelle dar. Die erste Spalte enthält die Kalendertage; jede weitere Spalte entspricht
einer nach ihrer lokalen Beginnzeit sortierten Modellschicht aus der unveränderlichen Momentaufnahme des Monatsplans. Jede
Rasterzelle enthält alle konkreten Mitarbeiterschichten ihres Tages und ihrer Modellschicht. Mehrere Mitarbeiterschichten sind
nur möglich, wenn die Modellschicht in der Momentaufnahme `mehrfachbelegungErlaubt` enthält.

Jede Schicht löst Anzeigename und optionale `farbkennung` über die gespeicherte `mitarbeiterId` aus dem Mitarbeiter-Store auf
und zeigt Zeitspanne, Pause und Lohnzeit. Für eine nicht mehr auflösbare Mitarbeiter-ID erscheint ein verständlicher
Ersatztext.
Schreibaktionen werden nur für eine bearbeitbare Entwurfsversion angeboten. Dann ist jede Rasterzelle ein Ablageziel und besitzt
zusätzlich eine Anlageaktion als Tastatur- und Mobilalternative. Beide Wege verwenden das bereits festgelegte Datum und die
festgelegte Modellschicht. Eine Ablage ist nur für einen aktiven, der Zielfiliale zugeordneten Mitarbeiter zulässig und wird
während eines Schreibvorgangs gesperrt. Derselbe Mitarbeiter kann nicht erneut in dieselbe Rasterzelle abgelegt werden. Bei
deaktivierter Mehrfachbelegung werden Anlageaktion und Ablageziel nach der ersten Belegung gesperrt.

Nach einer gültigen Ablage legt `DienstplanFiliale` die Schicht unmittelbar mit den Zeitwerten und der Standardpause aus
der Modell-Momentaufnahme an. Vor dem Schreiben werden die aktiven Planungsstände aller bereits im Dienstplan-Store geladenen
Filialkontexte auf zeitliche Überschneidungen geprüft. Diese Prüfung ist eine vorläufige Bedienabsicherung; die vollständige,
filialübergreifend verbindliche Prüfung über einen firmenweiten Belegungsindex folgt in Todo 20.8. Auf kleinen Viewports bleibt
die Tabelle horizontal scrollbar; die Tagesspalte bleibt beim horizontalen Scrollen sichtbar. Das vertikale Scrollen übernimmt
der umgebende Dienstplanbereich, damit keine verschachtelten vertikalen Scrollflächen entstehen. Die Planungsoberfläche ist
vorrangig für Desktop und Tablet vorgesehen; eine eigenständige mobile Dienstplanansicht für Mitarbeiter folgt in einem
späteren Ausbauschritt.

## Dialoge

`DienstplanAnlegenDialog` verlangt ein aktives Schichtmodell der konkreten Filiale. Er wird für die erstmalige Anlage und für
den erlaubten Modellwechsel wiederverwendet. Die Anlage speichert Modell-ID und Modellbezeichnung am Monatsplan und übernimmt
alle geordneten Modellschichten als Momentaufnahme. Plan, erste Entwurfsversion und Momentaufnahme entstehen gemeinsam in einem
atomaren Schreibvorgang. Beim Modellwechsel stehen nur andere aktive, nicht leere Modelle derselben Filiale zur Auswahl.

`SchichtBearbeitenDialog` ordnet der bereits gewählten Rasterzelle einen aktiven Mitarbeiter zu. Datum, Modellschicht, Beginn,
Ende und Standardpause stammen aus der Modell-Momentaufnahme und werden schreibgeschützt angezeigt. Beginn und Ende werden beim
Speichern aus Datum, lokalen Modellschichtzeiten, Folgetagsangabe und Dienstplan-Zeitzone berechnet. Beim Bearbeiten kann nur die
Mitarbeiterzuordnung geändert werden; die Rasterzelle und ihre Zeitwerte bleiben unverändert.

`SchichtmodellBearbeitenDialog` verwaltet die Bezeichnung und den Aktivstatus eines Schichtmodells sowie eine dynamische Liste
seiner Modellschichten. Jede Modellschicht besitzt Bezeichnung, Beginn, Ende, abgeleiteten Folgetag,
schreibgeschützte Dauer, automatisch berechnete Standardpause und die standardmäßig deaktivierte Option `Mehrfachbelegung`.
Mindestens eine Modellschicht bleibt erhalten; weitere können ergänzt und entfernt werden. Die Reihenfolge wird automatisch nach
der lokalen Beginnzeit bestimmt. Neue Modelle sind immer aktiv, vorhandene Modelle können deaktiviert oder erneut aktiviert
werden.

Die routbare `SchichtmodellePage` ersetzt in der Navigation die bisherige Vorlagenverwaltung. Sie rendert pro ausgewählter
Filiale einen `SchichtmodelleFilialabschnitt`, der ausschließlich Modelle dieses Filialpfads lädt und bearbeitet. Die
Monatsanlage, die Rasterdarstellung und das Anlegen einzelner Schichten verwenden ausschließlich die Modell-Momentaufnahme.

## Beteiligte Dateien

- `src/app/commons/utils/datum/monat.ts`
- `src/app/components/date-selectors/monat-selector`
- `src/app/components/schichtplan/dienstplan-arbeitsbereich`
- `src/app/components/schichtplan/dienstplan-filiale`
- `src/app/components/schichtplan/dienstplan-anlegen-dialog`
- `src/app/components/schichtplan/schichtplan-monat`
- `src/app/components/schichtplan/schicht-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtmodell-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtmodelle-filialabschnitt`
- `src/app/pages/schichtplan`
