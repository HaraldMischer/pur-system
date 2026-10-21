<!-- pur-system/docs/architektur/components/schichtplan.md -->

# Schichtplan-Komponenten

Der routbare Schichtplan-Bereich besteht aus getrennten Pages für Ansicht, Planung und Schichtmodelle. Wiederverwendbare
Darstellung und Dialoge liegen unter `src/app/components/schichtplan`.

## Dienstplan-Planungsseite

Die routbare `DienstplanPlanungPage` verwaltet eine gemeinsame Monatsauswahl und rendert für jede ausgewählte Filiale einen
`DienstplanPlanungsbereich`. Ein Monatswechsel gilt dadurch gleichzeitig für alle ausgewählten Filialen. Die Planungslogik
liegt direkt in der Page und wird nicht mit der Dienstplanansicht geteilt.

Die wiederverwendbare Component `MonatSelector` erhält den ausgewählten Monat über `selectedMonat` im Format `YYYY-MM` und
meldet Änderungen über `selectedMonatChange`. Sie bietet ausschließlich die Navigation zum vorherigen und nächsten Monat an.
Die Planungsseite bindet ihr Signal über `[(selectedMonat)]`, bleibt Eigentümerin des Auswahlzustands und ergänzt bei Bedarf
eigene Aktionen wie den Wechsel zum aktuellen Kalendermonat.

Das Utility `getAktuellerMonat()` ermittelt den aktuellen Monat für die verbindliche Zeitzone `Europe/Berlin`. Auf breiten
Ansichten stellt die Planungsseite die Dienstpläne und die Mitarbeiterübersicht in zwei unabhängig scrollbaren Spalten dar.
Die Mitarbeiterübersicht führt die aktiven Mitarbeiter aller ausgewählten Filialen ohne Duplikate zusammen und zeigt die
optionale `farbkennung`. Ohne gespeicherte Farbkennung verwendet der Farbpunkt die normale Textfarbe mit 38 Prozent Deckkraft.
Für jeden Mitarbeiter summiert die Übersicht außerdem die Lohnzeit einschließlich der vollständig bezahlten Pausen und die
Schichtanzahl des ausgewählten Monats über alle ausgewählten Filialen. Je Filiale zählt der Entwurf als aktiver Planungsstand;
ohne Entwurf wird die veröffentlichte Version verwendet. Ältere Versionen fließen nicht zusätzlich in die Monatswerte ein.
Die Mitarbeiterkarten sind mit Angular CDK Drag-and-drop als kopierbare Planungselemente verfügbar. Die Liste bleibt dabei
unverändert; ein Mitarbeiter kann nacheinander in mehrere zulässige Rasterzellen eingeplant werden.
Bei höchstens `900px` Containerbreite werden die Bereiche untereinander angeordnet und innerhalb der gemeinsamen Arbeitsfläche
gescrollt.

Jeder `DienstplanPlanungsbereich` lädt seinen Monatsplan über den direkten Filialpfad und zeigt seinen eigenen Lade-, Fehler-,
Leer- oder Planzustand. Ein fehlender Plan kann ausschließlich in diesem Filialabschnitt angelegt werden. Dazu lädt der
Abschnitt die Schichtmodelle seiner Filiale und bietet nur aktive Modelle mit mindestens einer Modellschicht an. Beim Öffnen
eines Schichtdialogs übernimmt der Abschnitt Datum und Modellschicht aus der gewählten Rasterzelle und begrenzt die
Mitarbeiterwahl auf die aktiven Mitarbeiter der Filiale.

Die routbare `DienstplanAnsichtPage` verwendet die Planungsseite und ihre Rasterdarstellung nicht. Sie ist derzeit leer und
bildet die Grundlage für eigenständige Ansichts-Views.

Im leeren, noch nie veröffentlichten Entwurf bietet die Statuszeile des Monatsplans zusätzlich `Dienstplan löschen` an. Sobald
der Entwurf mindestens eine Schicht enthält, ist die Aktion mit einem erklärenden Hinweis deaktiviert; nach dem Löschen aller
Schichten wird sie wieder aktiv. Vor der Löschung fragt der allgemeine `BestaetigungDialog` nach. Dienstplan, Entwurfsversion
und Modell-Momentaufnahme werden gemeinsam gelöscht. Nach der ersten Veröffentlichung wird die Aktion dauerhaft ausgeblendet.

## Monatsdarstellung

`DienstplanMonatstabelle` stellt den Monat als Tabelle dar. Die erste Spalte enthält die Kalendertage; jede weitere Spalte
entspricht einer nach ihrer lokalen Beginnzeit sortierten Modellschicht aus der unveränderlichen Momentaufnahme des
Monatsplans. Jede Rasterzelle enthält alle konkreten Mitarbeiterschichten ihres Tages und ihrer Modellschicht. Mehrere
Mitarbeiterschichten sind nur möglich, wenn die Modellschicht in der Momentaufnahme `mehrfachbelegungErlaubt` enthält.
Identische Kapazitäten können deshalb entweder als getrennte Modellschichten mit jeweils einer Belegung oder als eine
mehrfach belegbare Modellschicht dargestellt werden. Auch bei einer Mehrfachbelegung bleibt jede Mitarbeiterzuordnung eine
eigene konkrete Schicht.

Jede Schicht löst Anzeigename und optionale `farbkennung` über die gespeicherte `mitarbeiterId` aus dem Mitarbeiter-Store auf
und zeigt Zeitspanne und Lohnzeit. Die chronologisch letzte Schicht eines Arbeitsblocks zeigt zusätzlich dessen gespeicherte
bezahlte `pauseMinuten`. Diese Darstellung ist ein Anker für den Gesamtwert und legt nicht fest, während welcher Schicht die
Pause genommen wird. Für eine nicht mehr auflösbare Mitarbeiter-ID erscheint ein verständlicher Ersatztext.
Schreibaktionen werden nur für eine bearbeitbare Entwurfsversion angeboten. Dann ist jede Rasterzelle ein Ablageziel und besitzt
zusätzlich eine Anlageaktion als Tastatur- und Mobilalternative. Beide Wege verwenden das bereits festgelegte Datum und die
festgelegte Modellschicht. Eine Ablage ist nur für einen aktiven, der Zielfiliale zugeordneten Mitarbeiter zulässig und wird
während eines Schreibvorgangs gesperrt. Derselbe Mitarbeiter kann nicht erneut in dieselbe Rasterzelle abgelegt werden. Bei
deaktivierter Mehrfachbelegung werden Anlageaktion und Ablageziel nach der ersten Belegung gesperrt.

Die Tabelle zeigt in der Tagesspalte Wochentag, Datum, Öffnungszeiten und vorhandene Kalendermerkmale wie Sonntag, Feiertag
oder Sondertag. Jede Rasterzelle zeigt die automatisch aus Öffnungsregel sowie Vor- und Nachbereitungsminuten abgeleitete
Rasterzeit. An geschlossenen Tagen werden Anlageaktion und Ablageziel deaktiviert.

Nach einer gültigen Ablage übergibt `DienstplanPlanungsbereich` Datum, Modellschicht-ID und Mitarbeiter-ID. Die für die
Bedienprüfung benötigten Zeitwerte liest der Bereich aus der Tagesmomentaufnahme; der Service leitet die zu speichernden
Zeitstempel unabhängig davon erneut aus derselben Rasterzeit ab. Vor dem Schreiben werden die aktiven Planungsstände aller
bereits im Dienstplan-Store geladenen Filialkontexte auf zeitliche Überschneidungen geprüft. Diese Prüfung ist eine vorläufige
Bedienabsicherung; die vollständige, filialübergreifend verbindliche Prüfung über einen firmenweiten Belegungsindex folgt in
Todo 21.10. Auf kleinen
Viewports bleibt die Tabelle horizontal scrollbar; die Tagesspalte bleibt beim horizontalen Scrollen sichtbar. Das vertikale
Scrollen übernimmt der umgebende Dienstplanbereich, damit keine verschachtelten vertikalen Scrollflächen entstehen. Die
Planungsoberfläche ist vorrangig für Desktop und Tablet vorgesehen; eine eigenständige mobile Dienstplanansicht für Mitarbeiter
folgt in einem späteren Ausbauschritt.

## Dialoge

`DienstplanAnlegenDialog` verlangt ein aktives Schichtmodell der konkreten Filiale. Die Anlage speichert Modell-ID und
Modellbezeichnung am Monatsplan und übernimmt alle geordneten Modellschichten als Momentaufnahme. Plan, erste Entwurfsversion
und Momentaufnahme entstehen gemeinsam in einem atomaren Schreibvorgang. Soll das Modell eines leeren, noch nie
veröffentlichten Plans geändert werden, wird der Plan gelöscht und anschließend mit dem gewünschten Modell neu angelegt.
Vor der Modellwahl zeigt ein verpflichtendes Auswahlfeld die Planungsart. `Schichtraster` ist vorausgewählt und filtert die
angebotenen Modelle; `Schichtbausteine` ist bis zur Umsetzung sichtbar, aber deaktiviert.
Einmalige Sondertage werden nicht zusätzlich im Dialog konfiguriert. Ihre Öffnungsregel bestimmt bei der Dienstplananlage
automatisch die äußeren Rastergrenzen; die inneren Grenzen des gewählten Schichtmodells bleiben unverändert.

`SchichtBearbeitenDialog` ordnet der bereits gewählten Rasterzelle einen aktiven Mitarbeiter zu. Datum, Modellschicht sowie der
für diesen Kalendertag wirksame Beginn und das Ende werden schreibgeschützt angezeigt. Der Dialog übergibt keine freien
Zeitwerte; der Dienstplan-Service berechnet die absoluten Zeitstempel aus der gespeicherten Tagesrasterzeit. Beim Bearbeiten
kann nur die Mitarbeiterzuordnung geändert werden; die Rasterzelle und ihre Zeitwerte bleiben unverändert.

`SchichtmodellBearbeitenDialog` verwaltet die Bezeichnung und den Aktivstatus eines Schichtmodells sowie eine dynamische Liste
seiner Modellschichten. Jede Modellschicht besitzt Bezeichnung, Beginn, Ende, abgeleiteten Folgetag, schreibgeschützte Dauer und
die standardmäßig deaktivierte Option `Mehrfachbelegung`.
Mindestens eine Modellschicht bleibt erhalten; weitere können ergänzt und entfernt werden. Die Reihenfolge wird automatisch nach
der lokalen Beginnzeit bestimmt. Neue Modelle sind immer aktiv, vorhandene Modelle können deaktiviert oder erneut aktiviert
werden.

An der ersten Modellschicht können Vorbereitungsminuten und an der letzten Modellschicht Nachbereitungsminuten gepflegt werden.
Bei einer einzelnen Modellschicht zeigt der Dialog beide Werte. Bei vorhandenen stabilen Modellschicht-IDs zeigt der Dialog
zusätzlich alle aktiven geöffneten Sondertage der Filiale. Für sie lassen sich optional nur die inneren Schichtgrenzen
überschreiben; Öffnungsbeginn und Öffnungsende sowie Vor- und Nachbereitungsminuten bleiben die verbindlichen äußeren Grenzen.
Inaktive oder geschlossene Sondertage werden nicht zur Bearbeitung angeboten, vorhandene Konfigurationen bleiben aber erhalten.

Die routbare `SchichtmodellePage` ersetzt in der Navigation die bisherige Vorlagenverwaltung. Sie rendert pro ausgewählter
Filiale eine `SchichtmodelleFiliale`, die ausschließlich Modelle dieses Filialpfads lädt und bearbeitet. Die
Monatsanlage, die Rasterdarstellung und das Anlegen einzelner Schichten verwenden ausschließlich die Modell-Momentaufnahme.
Die Anlageaktion öffnet zunächst ein Planungsart-Menü. Das Schichtraster führt in den vorhandenen Modelldialog;
`Schichtbausteine` bleibt als angekündigter, deaktivierter Einstieg sichtbar.

## Beteiligte Dateien

- `src/app/commons/utils/datum/monat.ts`
- `src/app/components/date-selectors/monat-selector`
- `src/app/components/schichtplan/dienstplan-planungsbereich`
- `src/app/components/schichtplan/dienstplan-anlegen-dialog`
- `src/app/components/schichtplan/dienstplan-monatstabelle`
- `src/app/components/schichtplan/schicht-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtmodell-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtmodelle-filiale`
- `src/app/pages/schichtplan/dienstplan-ansicht-page`
- `src/app/pages/schichtplan/dienstplan-planung-page`
