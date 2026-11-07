<!-- pur-system/docs/architektur/components/schichtplan.md -->

# Schichtplan-Komponenten

Dieses Dokument beschreibt die technische Seiten- und Component-Struktur. Das fachliche Zielbild steht im
[Fachkonzept Dienst- und Schichtplanung](../../fachkonzepte/dienst-und-schichtplanung.md), die verbindlichen Datenrechte in der
[Berechtigungsmatrix](../../matrizen/berechtigungen.md).

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

## Veröffentlichte Dienstplanansicht

Die routbare `DienstplanAnsichtPage` verwendet die Planungsseite und ihre bearbeitbare Rasterdarstellung nicht. Sie verwaltet
eine gemeinsame Monatsauswahl und rendert für jede ausgewählte Filiale einen `DienstplanAnsichtsbereich`. Jeder Bereich lädt
über den direkten Filialpfad mit `networkOnly` ausschließlich die über `veroeffentlichteVersionId` referenzierte Version.
Entwürfe und archivierte Versionen werden weder an die Darstellung übergeben noch als Ausweichstand verwendet.

Der Ansichtsbereich zeigt Zeitraum, Versionsnummer, Veröffentlichungszeitpunkt und die nach Tagen gruppierten Schichten. Jede
Schicht enthält den aktuellen Mitarbeiternamen, die optionale Farbkennung, ihre absolute Zeitspanne und die als
Planungsmomentaufnahme gespeicherte bezahlte Pause. Ein Ende am Folgetag wird ausdrücklich gekennzeichnet. Die Darstellung
verwendet eine umbruchfähige Liste statt des breiten Planungsrasters und bleibt dadurch auf kleinen Viewports verständlich.

Noch nicht veröffentlichte Monatspläne und ein zukünftig zurückgezogener Stand ohne `veroeffentlichteVersionId` erhalten
denselben eindeutigen Leerzustand. Ersetzt eine spätere Veröffentlichung den bisherigen Stand, verweist das Dienstplandokument
auf die neue Version; bei der nächsten Netzwerkladung erscheint nur dieser aktuelle Stand. Lade- und Fehlerzustände bleiben je
Filiale getrennt, sodass ein fehlender oder fehlerhafter Monatsplan die übrigen ausgewählten Filialen nicht verdeckt.

Im leeren, noch nie veröffentlichten Entwurf bietet die Statuszeile des Monatsplans zusätzlich `Dienstplan löschen` an. Sobald
der Entwurf mindestens eine Schicht enthält, ist die Aktion mit einem erklärenden Hinweis deaktiviert; nach dem Löschen aller
Schichten wird sie wieder aktiv. Vor der Löschung fragt der allgemeine `BestaetigungDialog` nach. Dienstplan, Entwurfsversion
und Modell-Momentaufnahme werden gemeinsam gelöscht. Nach der ersten Veröffentlichung wird die Aktion dauerhaft ausgeblendet.

Für einen aktuellen Entwurf bietet die Statuszeile `Veröffentlichen` an. Die Aktion bleibt gesperrt, solange der firmenweite
Belegungsstand unvollständig ist, blockierende Konflikte bestehen oder eine Schicht einen inaktiven beziehungsweise nicht mehr
zugeordneten Mitarbeiter enthält. Vor dem Statuswechsel fragt der allgemeine `BestaetigungDialog` nach. Sind verfügbare
Rasterplätze nicht belegt, nennt der Dialog deren Anzahl und bietet die bewusste Aktion `Trotzdem veröffentlichen` an.
Geschlossene Tage und für einen Tag nicht verfügbare Rasterplätze werden nicht mitgezählt. Erfolg oder Fehler erscheinen im
betroffenen Filialabschnitt. Ohne Entwurf bietet ein veröffentlichter Stand `Neue Entwurfsversion` an. Diese übernimmt die
veröffentlichten Schichten als bearbeitbare Kopien, während der veröffentlichte Stand sichtbar bleibt.

## Monatsdarstellung

Der `DienstplanPlanungsbereich` stellt den gemeinsamen Versionskopf mit den Planaktionen dar und wählt anschließend anhand der
Planungsart genau eine Monatsdarstellung aus. `DienstplanMonatstabelle` ist ausschließlich für das Schicht-Rastermodell
zuständig. Die erste Spalte enthält die Kalendertage; jede weitere Spalte entspricht einer nach ihrer ausdrücklich
gespeicherten `reihenfolge` sortierten Modellschicht aus der unveränderlichen Momentaufnahme des Monatsplans. Jede Rasterzelle
enthält alle konkreten Mitarbeiterschichten ihres Tages und ihrer Modellschicht. Mehrere
Mitarbeiterschichten sind nur möglich, wenn die Modellschicht in der Momentaufnahme `mehrfachbelegungErlaubt` enthält.
Identische Kapazitäten können deshalb entweder als getrennte Modellschichten mit jeweils einer Belegung oder als eine
mehrfach belegbare Modellschicht dargestellt werden. Auch bei einer Mehrfachbelegung bleibt jede Mitarbeiterzuordnung eine
eigene konkrete Schicht.

Jede Schicht löst Anzeigename und optionale `farbkennung` über die gespeicherte `mitarbeiterId` aus dem Mitarbeiter-Store auf
und zeigt Zeitspanne und Lohnzeit. Für eine nicht mehr auflösbare Mitarbeiter-ID erscheint ein verständlicher Ersatztext. Die
chronologisch letzte Schicht eines Arbeitsblocks zeigt zusätzlich dessen bezahlte Gesamtpause. Blockierende Zeitkonflikte
werden an der betroffenen Schichtkarte und Rasterzelle hervorgehoben.

Schreibaktionen werden nur für eine bearbeitbare Entwurfsversion angeboten. Dann ist jede Rasterzelle ein Ablageziel und besitzt
zusätzlich eine Anlageaktion als Tastatur- und Mobilalternative. Beide Wege verwenden das bereits festgelegte Datum und die
festgelegte Modellschicht. Eine Ablage ist nur für einen aktiven, der Zielfiliale zugeordneten Mitarbeiter zulässig und wird
während eines Schreibvorgangs gesperrt. Derselbe Mitarbeiter kann nicht erneut in dieselbe Rasterzelle abgelegt werden. Bei
deaktivierter Mehrfachbelegung werden Anlageaktion und Ablageziel nach der ersten Belegung gesperrt.

Schichtkarten eines bearbeitbaren Entwurfs sind ebenfalls Drag-Quellen. Beim Ablegen in einer anderen Rasterzelle bleiben
Schicht-ID und Mitarbeiterzuordnung erhalten; Datum und Modellschicht stammen aus dem Ziel. Die bisherige Zelle beendet den
Vorgang ohne Schreibzugriff. Belegte Einfachschichten und firmenweite Zeitkonflikte sind keine zulässigen Ziele. Ein
fehlgeschlagener Schreibzugriff zeigt den Fehler im bisherigen Filialabschnitt und verändert die bestehende Schicht nicht.

Die Tabelle zeigt in der Tagesspalte Wochentag, Datum, Öffnungszeiten und vorhandene Kalendermerkmale wie Sonntag, Feiertag
oder Sondertag. Jede verfügbare Rasterzelle zeigt die aus Tagesgrenzen, inneren Modellgrenzen sowie Vor- und
Nachbereitungsminuten abgeleitete Rasterzeit. An geschlossenen Tagen erscheint `Geschlossen`. Fehlt an einem geöffneten Tag für
einen Rasterplatz eine passende Rasterzeit, erscheint `Nicht verfügbar`. In beiden Fällen sind Anlageaktion und Ablageziel
deaktiviert.

Nach einer gültigen Ablage übergibt `DienstplanPlanungsbereich` Datum, Modellschicht-ID und Mitarbeiter-ID. Die für die
Bedienprüfung benötigten Zeitwerte liest der Bereich aus der Tagesmomentaufnahme; der Service leitet die zu speichernden
Zeitstempel unabhängig davon erneut aus derselben Rasterzeit ab. Die Planungsseite beobachtet den für Monat und sichtbare
Mitarbeiter begrenzten firmenweiten Belegungsindex live und verwendet ihn für frühzeitige Konflikthinweise und Eingabesperren.
Während dessen Initialladung oder nach einem Listenerfehler bleiben Planerstellung, Schichtaktionen und
Mitarbeiter-Drag-and-drop gesperrt. Verbindlich ist weiterhin die transaktionale Indexprüfung des Schreibzugriffs. Auf kleinen
Viewports bleibt die Tabelle horizontal scrollbar;
die Tagesspalte bleibt beim horizontalen Scrollen
sichtbar. Das vertikale
Scrollen übernimmt der umgebende Dienstplanbereich, damit keine verschachtelten vertikalen Scrollflächen entstehen. Die
Planungsoberfläche ist vorrangig für Desktop und Tablet vorgesehen. Mitarbeiter verwenden die separate responsive Ansicht der
für sie freigegebenen veröffentlichten Dienstpläne.

## Dialoge

`DienstplanAnlegenDialog` verlangt ein aktives Schichtmodell der konkreten Filiale. Vor der Modellwahl wählt der Planer
verpflichtend `Schicht-Rastermodell` oder `Schicht-Tagesmodell`; das Rastermodell ist vorausgewählt. Die Auswahl filtert die
angebotenen Modelle. Beim Rastermodell übernimmt die Anlage alle geordneten Modellschichten als Momentaufnahme, und die
wirksame Öffnungsregel bestimmt die äußeren Rastergrenzen. Beim Tagesmodell öffnet der Dialog anschließend die freie
Tagesstruktur für abweichend geöffnete Feier- und Sondertage. Plan, erste Entwurfsversion und die zur Planungsart passende
Momentaufnahme entstehen gemeinsam in einem atomaren Schreibvorgang. Soll das Modell eines leeren, noch nie veröffentlichten
Plans geändert werden, wird der Plan gelöscht und anschließend mit dem gewünschten Modell neu angelegt.

`SchichtBearbeitenDialog` ordnet der bereits gewählten Rasterzelle einen aktiven Mitarbeiter zu. Datum, Modellschicht sowie der
für diesen Kalendertag wirksame Beginn und das Ende werden schreibgeschützt angezeigt. Der Dialog übergibt keine freien
Zeitwerte; der Dienstplan-Service berechnet die absoluten Zeitstempel aus der gespeicherten Tagesrasterzeit. Beim Bearbeiten
kann die Mitarbeiterzuordnung geändert werden. Die alternative Aktion `Schicht verschieben` blendet zusätzlich die Auswahl
von Zieltag und Zielmodellschicht ein; auch dabei bleiben die abgeleiteten Zeitwerte schreibgeschützt. Eine belegte
Einfachschicht oder filialübergreifende Überschneidung des ausgewählten Mitarbeiters wird angezeigt und sperrt das Speichern.

`SchichtmodellBearbeitenDialog` verwaltet die Bezeichnung und den Aktivstatus eines Schichtmodells sowie eine dynamische Liste
seiner Modellschichten. Jede Modellschicht besitzt eine Bezeichnung, die standardmäßig deaktivierte Option
`Mehrfachbelegung` und ihre gespeicherte fachliche Reihenfolge. Der Beginn der ersten Modellschicht und das Ende der letzten
werden als tagesabhängig angezeigt und nicht bearbeitet; bei einer einzelnen Modellschicht gilt dies für beide Grenzen. Feste
innere Beginn- und Endzeiten werden ausschließlich als Uhrzeit erfasst; ihre Zuordnung zum Start- oder Folgetag leitet der
Dialog automatisch aus der Standardöffnungszeit der Filiale ab. Berechnete Schichtdauern werden im Modelldialog nicht angezeigt;
ein leerer Platzhalter hält bei mittleren Modellschichten die gemeinsame Spaltenaufteilung ein.

Mindestens eine Modellschicht bleibt erhalten; weitere werden am Ende der fachlichen Reihenfolge ergänzt und können entfernt
werden. Beim erstmaligen Erfassen des Beginns einer neuen Modellschicht wird das Ende der vorherigen Schicht einmalig damit
vorbelegt. Beide Grenzen bleiben danach unabhängig bearbeitbar. Lücken lösen vor dem Speichern einen bestätigbaren Hinweis
aus; Überlappungen mehrerer Rasterplätze sind zulässig. Neue Modelle sind immer aktiv, vorhandene Modelle können deaktiviert
oder erneut aktiviert werden.

An der ersten Modellschicht können Vorbereitungsminuten und an der letzten Modellschicht Nachbereitungsminuten gepflegt werden.
Die wiederverwendbare Component `EingabeMinuten` erfasst dafür ganze Werte von 0 bis 999 mit festem Minutensuffix. Bei einer
einzelnen Modellschicht zeigt der Dialog beide Werte. Besondere Rasterzeiten für Sondertage werden nicht angeboten; deren
wirksame Öffnungsregel bestimmt ausschließlich die tagesabhängigen Außengrenzen.

Die routbare `SchichtmodellePage` ersetzt in der Navigation die bisherige Vorlagenverwaltung. Sie rendert pro ausgewählter
Filiale eine `SchichtmodelleFiliale`, die ausschließlich Modelle dieses Filialpfads lädt und bearbeitet. Die
Monatsanlage, die Rasterdarstellung und das Anlegen einzelner Schichten verwenden ausschließlich die Modell-Momentaufnahme.
Die Modellverwaltung wählt über ein übergeordnetes Auswahlfeld genau eine Modellart aus und zeigt abhängig davon entweder die
Schicht-Rastermodelle oder die Schicht-Tagesmodelle. Der sichtbare Bereich bietet eine Auswahl seiner vorhandenen Modelle, zeigt
genau das ausgewählte Modell und besitzt eine passende Aktion zum Hinzufügen. Initial werden die Schicht-Rastermodelle sowie
innerhalb einer Modellart das erste aktive Modell gewählt; ist keines aktiv, wird das erste vorhandene Modell angezeigt.
Inaktive Modelle bleiben auswählbar und werden als inaktiv gekennzeichnet.

## Oberflächen für das Schicht-Tagesmodell

Die Modellverwaltung bietet Schicht-Rastermodelle und Schicht-Tagesmodelle als getrennte fachliche Varianten an. Beide verwenden
eigene Bearbeitungsdialoge, Stores und Services. Der bisherige Schichtmodelldialog bleibt für das Rastermodell zuständig und
wird fachlich als Schicht-Rastermodelldialog benannt. Die wirkungslose Auswahl `Übergänge: Fest / Relativ` wird daraus entfernt.

Der Schicht-Tagesmodelldialog enthält getrennte Bereiche für eine Wochentagsvorlage von Montag bis Samstag und eine
Sonntagsvorlage. In jedem Bereich können beliebig viele eigene Vorlagenschichten mit Beginn, Ende, Reihenfolge und
Mehrfachbelegung angelegt, entfernt und geordnet werden. Der Beginn der ersten und das Ende der letzten Schicht werden wie im
Rastermodelldialog als nicht bearbeitbarer `Schichtstart` beziehungsweise nicht bearbeitbares `Schichtende` dargestellt. Nur die
inneren Grenzen bleiben editierbar. Nur die erste Schicht zeigt die Vorbereitung und nur die letzte die Nachbereitung; bei einer
einzelnen Schicht sind beide Werte verfügbar. Beim Hinzufügen oder Entfernen einer äußeren Schicht werden die betroffenen
Randminuten auf die neue erste beziehungsweise letzte Schicht übertragen. Beide Vorlagen dürfen eine unterschiedliche Anzahl
und Identität von Schichten besitzen.

Kernzeiten müssen innerhalb der für die Vorlage maßgeblichen Öffnung liegen. Lücken und Überschneidungen bleiben zulässig;
jede Kernschicht benötigt eine positive Dauer. Die Randminuten der ersten und letzten Schicht erweitern die Tagesstruktur zur
tatsächlichen Arbeitszeit. Prozentwerte und automatisch aus der Öffnungsdauer berechnete Übergänge werden im
Schicht-Tagesmodell nicht angeboten.

Der Dienstplan-Anlegen-Dialog führt für Schicht-Tagesmodelle eine vollständige Monatsinitialisierung aus. Nach der Modellwahl
öffnet er für die erkannten abweichend geöffneten Feier- und Sondertage die freie Tagesstruktur. Für jeden dieser Tage werden
vor dem Speichern beliebig viele Tagesschichten konfiguriert. Geschlossene Tage benötigen keine Konfiguration. Erst wenn alle
Tagesstrukturen gültig sind, kann der Plan atomar angelegt werden.

`DienstplanMonatsliste` stellt ausschließlich Schicht-Tagesmodellpläne dar und verwendet keine für den ganzen Monat identischen
Rasterspalten. Jeder Listentag zeigt links Wochentag, Datum, wirksame Öffnung und vorhandene Feiertags- oder
Sondertagsbezeichnungen sowie rechts ausschließlich seine eigenen Tagesschichten. Reguläre Wochentage und Sonntage zeigen die
aus ihren Vorlagen erzeugten Instanzen; Feier- und Sondertage zeigen ihre während der Anlage frei konfigurierten Instanzen.
Danach dienen alle Tagesschichten als Drag-and-drop-Ziele und über dieselbe alternative Aktion zur Mitarbeiterzuordnung.

Die Tagesschichten liegen auf einer gemeinsamen Monatszeitachse von der frühesten Öffnung bis zum spätesten Öffnungsende. Die
Kopfzeile zeigt volle Stunden, positioniert Beginn und Ende einer Tagesschicht aber minutengenau. Bereiche der gemeinsamen Achse
vor oder nach der wirksamen Tagesöffnung erscheinen als `Geschlossen`; offene Lücken zwischen Tagesschichten bleiben frei.
Später beginnende Tagesöffnungen bleiben dadurch gegenüber früher geöffneten Tagen zeitlich vergleichbar. Zeitlich
überschneidende Tagesschichten verwenden getrennte Spuren. Auf kleinen Viewports bleibt die vollständige Zeitachse horizontal
scrollbar; die Tagesangaben bleiben beim Scrollen am linken Rand sichtbar.

Die Planungsoberfläche wählt anhand der diskriminierten Planungsart ausschließlich die passende Darstellung und Aktionen aus.
Rasterzellen referenzieren weiterhin Rastermodellschichten; Tageszellen referenzieren ausschließlich konkrete Tagesschichten.
Die veröffentlichte Ansicht kann beide Varianten gemeinsam lesen, stellt ihre unterschiedlichen Tagesstrukturen aber nicht als
ein gemeinsames Raster dar.

## Beteiligte Dateien

- `src/app/commons/utils/datum/monat.ts`
- `src/app/commons/utils/dienstplan/dienstplan-zeitachse.ts`
- `src/app/components/date-selectors/monat-selector`
- `src/app/components/schichtplan/dienstplan-ansichtsbereich`
- `src/app/components/schichtplan/dienstplan-planungsbereich`
- `src/app/components/schichtplan/dienstplan-anlegen-dialog`
- `src/app/components/schichtplan/dienstplan-monatsliste`
- `src/app/components/schichtplan/dienstplan-monatstabelle`
- `src/app/components/schichtplan/schicht-bearbeiten-dialog`
- `src/app/components/schichtplan/tagesschicht-belegen-dialog`
- `src/app/components/schichtplan/schichtmodell-bearbeiten-dialog`
- `src/app/components/schichtplan/schichtmodelle-filiale`
- `src/app/components/schichtplan/schicht-tagesmodell-bearbeiten-dialog`
- `src/app/components/schichtplan/dienstplan-tagesstruktur-bearbeiten-dialog`
- `src/app/pages/schichtplan/dienstplan-ansicht-page`
- `src/app/pages/schichtplan/dienstplan-planung-page`
