<!-- pur-system/docs/architektur/components/einstellungen.md -->

# Einstellungen

Die komponentenlose Route `/einstellungen` bildet den erweiterbaren Bereich für filialbezogene Einstellungen. Ihr erster
Unterpunkt `/einstellungen/oeffnungszeiten` lädt die direkt routbare `OeffnungszeitenPage`. Der Bereich wird durch
Authentifizierung, Initialisierung und die Freigabe `einstellungen` geschützt.

Die Page bildet jede im App-Kontext ausgewählte Filiale auf eine eigene `OeffnungszeitenFiliale` ab. Jede Instanz verwendet
ihren vollständigen Filialpfad und den dazugehörigen Store-Kontext. Dadurch bleiben Formularzustände, Ladefehler und
Schreibvorgänge mehrerer gleichzeitig ausgewählter Filialen voneinander getrennt.

`OeffnungszeitenFiliale` gliedert die Pflege sichtbar in `Schließzeiten`, `Wochentage`, `Gesetzliche Feiertage`, `Jährliche
Sondertage` und `Einmalige Sondertage`. Heiligabend und Silvester werden als jährliche Sondertage geführt. Das Bundesland wird
intern mit Nordrhein-Westfalen (`DE-NW`) vorbelegt; die technische Zeitzone `Europe/Berlin` ist keine Filialeinstellung. Bei
einem noch leeren Filialkontext wird der Schließzeitraum mit `01:00` bis `06:00` Uhr vorbelegt. Der daraus abgeleitete maximale
Öffnungsrahmen `06:00` bis `01:00` Uhr am Folgetag bildet die Vorbelegung aller sieben Wochentage. Eine geöffnete Regel enthält
genau eine Beginn- und Endzeit. Liegt die Endzeit vor der Beginnzeit, wird `endetAmFolgetag` intern abgeleitet.
Geschlossene Regeln dürfen eine vollständige gültige Zeitfolge für eine spätere Wiederaktivierung behalten. Ihre Zeitfelder
bleiben sichtbar, sind aber deaktiviert. Das Formular initialisiert den vollständigen Einstellungsbestand; anschließend
speichert es Änderungen an Grundlagen und Wochenregeln atomar. Bei einem noch nicht initialisierten Bestand kann die gültige
Vorbelegung unmittelbar gespeichert werden. Bei einem bestehenden Bestand ist dafür eine fachliche Änderung erforderlich.

Gesetzliche Feiertage und jährliche Sondertage werden über den `SondertagBearbeitenDialog` gepflegt. Systemdefinierte
gesetzliche Feiertage behalten ihre zentrale Datumsregel; bearbeitbar sind nur Aktivstatus und Öffnungsregel. Gesetzliche
Feiertage sowie Heiligabend und Silvester werden zunächst inaktiv und geschlossen angelegt, damit die Wochentagsregel gilt.
Beginn und Ende ihrer geschlossenen Öffnungsregeln werden bereits bei der Initialisierung aus dem Schließzeitraum abgeleitet
und gespeichert. Eigene Sondertage gelten immer jährlich und werden mit Monat und Tag angelegt. Einmalige Sondertage
werden getrennt über den `DatumsausnahmeBearbeitenDialog` mit einem vollständigen Datum gepflegt und technisch als
Datumsausnahmen gespeichert. Die lokalen Zeit- und Datumseingaben verwenden die wiederverwendbaren Components `EingabeZeit`
und `EingabeDatum`. Beide arbeiten als browserunabhängige maskierte Texteingaben. `EingabeDatum` unterstützt vollständige Daten
als `TT.MM.JJJJ` und jährliche Daten ohne Jahr als `TT.MM.`. Das Datum eines bestehenden einmaligen Sondertags bleibt
unverändert, weil es zugleich die
Firestore-Dokument-ID der Datumsausnahme bildet. Löschvorgänge werden über den gemeinsamen Bestätigungsdialog abgesichert.

Die Oberfläche stellt den Schließzeitraum als zwei bearbeitbare, responsiv angeordnete Zeitfelder dar. Den maximalen
Öffnungsrahmen leitet sie intern für Vorbelegung und Validierung ab; eine zusätzliche Anzeige ist nicht vorgesehen.
Wochenregeln, Sondertage und Datumsausnahmen mit einer Überschneidung werden bereits im Formular als ungültig behandelt. Der
Service wiederholt diese fachliche Prüfung vor jedem Schreibzugriff. Der Schließzeitraum begrenzt nur den Kundenbetrieb;
Vor- und Nachbereitungszeiten eines Schichtrasters dürfen in ihn hineinreichen.

Die Listen zeigen neben dem Aktivstatus auch den Öffnungszustand, beispielsweise `Aktiv · Geschlossen` oder
`Aktiv · Geöffnet 06:00–01:00 Uhr`. Inaktive Sondertage werden als `Inaktiv · Wochentagsregel gilt` ohne Öffnungszustand
dargestellt; ihre Datumsangabe bleibt sichtbar.

Die Oberfläche erläutert die Priorität als `einmaliger Sondertag → Feiertag oder jährlich wiederkehrender Sondertag →
Wochentag`. Intern entspricht dies weiterhin `Ausnahme → Sondertag → Wochentag`. Beim Speichern oder Aktivieren eines
jährlich festen Sondertags verhindert die Verwaltung eine direkte Kollision mit einem anderen aktiven festen Sondertag und
benennt beide Einträge. Öffnungszeiten bleiben Kundenbetriebszeiten; in einem Schichtraster bestimmen sie zugleich die
automatisch abgeleiteten äußeren Rastergrenzen. Vor- und Nachbereitungsminuten können diese Grenzen ausdrücklich erweitern.
