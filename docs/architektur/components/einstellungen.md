<!-- pur-system/docs/architektur/components/einstellungen.md -->

# Einstellungen

Die komponentenlose Route `/einstellungen` bildet den erweiterbaren Bereich für filialbezogene Einstellungen. Ihr erster
Unterpunkt `/einstellungen/oeffnungszeiten` lädt die direkt routbare `OeffnungszeitenPage`. Der Bereich wird durch
Authentifizierung, Initialisierung und die Freigabe `einstellungen` geschützt.

Die Page bildet jede im App-Kontext ausgewählte Filiale auf eine eigene `OeffnungszeitenFiliale` ab. Jede Instanz verwendet
ihren vollständigen Filialpfad und den dazugehörigen Store-Kontext. Dadurch bleiben Formularzustände, Ladefehler und
Schreibvorgänge mehrerer gleichzeitig ausgewählter Filialen voneinander getrennt.

`OeffnungszeitenFiliale` gliedert die Pflege sichtbar in `Wochentage`, `Gesetzliche Feiertage`, `Jährliche Sondertage` und
`Einmalige Sondertage`. Heiligabend und Silvester werden als jährliche Sondertage geführt. Das Bundesland wird intern mit
Nordrhein-Westfalen (`DE-NW`) vorbelegt; die technische Zeitzone `Europe/Berlin` ist keine Filialeinstellung. Bei einem noch
leeren Filialkontext sind alle sieben Wochentage als geöffnet von `06:00` bis `01:00` Uhr am Folgetag vorbelegt. Eine geöffnete
Regel enthält genau eine Beginn- und Endzeit. Liegt die Endzeit vor der Beginnzeit, wird `endetAmFolgetag` intern abgeleitet.
Geschlossene Regeln dürfen eine vollständige gültige Zeitfolge für eine spätere Wiederaktivierung behalten. Ihre Zeitfelder
bleiben sichtbar, sind aber deaktiviert. Das Formular initialisiert den vollständigen Einstellungsbestand; anschließend
speichert es Änderungen an Grundlagen und Wochenregeln atomar. Bei einem noch nicht initialisierten Bestand kann die gültige
Vorbelegung unmittelbar gespeichert werden. Bei einem bestehenden Bestand ist dafür eine fachliche Änderung erforderlich.

Gesetzliche Feiertage und jährliche Sondertage werden über den `SondertagBearbeitenDialog` gepflegt. Systemdefinierte
gesetzliche Feiertage behalten ihre zentrale Datumsregel; bearbeitbar sind nur Aktivstatus und Öffnungsregel. Gesetzliche
Feiertage sowie Heiligabend und Silvester werden zunächst inaktiv angelegt, damit die Wochentagsregel gilt. Eigene Sondertage
gelten immer jährlich und werden mit Monat und Tag angelegt. Fehlen bei einem Feiertag oder jährlichen Sondertag gespeicherte
Zeitwerte, belegt der Dialog Beginn und Ende mit `06:00` und `01:00` Uhr am Folgetag vor. Bei inaktiven systemdefinierten Tagen
ist dies zunächst nur eine Formularvorbelegung; gespeichert wird sie erst mit einer fachlichen Änderung. Einmalige Sondertage
werden getrennt über den `DatumsausnahmeBearbeitenDialog` mit einem vollständigen Datum gepflegt und technisch als
Datumsausnahmen gespeichert. Die lokalen Zeit- und Datumseingaben verwenden die wiederverwendbaren Components
`LokalzeitEingabe` und `DatumEingabe`. Beide arbeiten als
browserunabhängige maskierte Texteingaben. `DatumEingabe` unterstützt vollständige Daten als `TT.MM.JJJJ` und jährliche Daten
ohne Jahr als `TT.MM.`. Das Datum eines bestehenden einmaligen Sondertags bleibt unverändert, weil es zugleich die
Firestore-Dokument-ID der Datumsausnahme bildet. Löschvorgänge werden über den gemeinsamen Bestätigungsdialog abgesichert.

Die Listen zeigen neben dem Aktivstatus auch den Öffnungszustand, beispielsweise `Aktiv · Geschlossen` oder
`Aktiv · Geöffnet 06:00–01:00 Uhr`. Inaktive Sondertage werden als `Inaktiv · Wochentagsregel gilt` ohne Öffnungszustand
dargestellt; ihre Datumsangabe bleibt sichtbar.

Die Oberfläche erläutert die Priorität als `einmaliger Sondertag → Feiertag oder jährlich wiederkehrender Sondertag →
Wochentag`. Intern entspricht dies weiterhin `Ausnahme → Sondertag → Wochentag`. Beim Speichern oder Aktivieren eines
jährlich festen Sondertags verhindert die Verwaltung eine direkte Kollision mit einem anderen aktiven festen Sondertag und
benennt beide Einträge. Öffnungszeiten bleiben Kundenbetriebszeiten; in einem Schichtraster bestimmen sie zugleich die
automatisch abgeleiteten äußeren Rastergrenzen. Vor- und Nachbereitungsminuten können diese Grenzen ausdrücklich erweitern.
