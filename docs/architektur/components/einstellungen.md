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
Nordrhein-Westfalen (`DE-NW`) vorbelegt; die technische Zeitzone `Europe/Berlin` ist keine Filialeinstellung. Eine geöffnete
Regel enthält genau eine Beginn- und Endzeit. Liegt die Endzeit vor der Beginnzeit, wird `endetAmFolgetag` intern abgeleitet.
Geschlossene Regeln dürfen eine vollständige gültige Zeitfolge für eine spätere Wiederaktivierung behalten. Ihre Zeitfelder
bleiben sichtbar, sind aber deaktiviert. Bei einem noch leeren Filialkontext initialisiert das Formular den vollständigen
Einstellungsbestand; anschließend speichert es Änderungen an Grundlagen und Wochenregeln atomar.

Gesetzliche Feiertage und jährliche Sondertage werden über den `SondertagBearbeitenDialog` gepflegt. Systemdefinierte
gesetzliche Feiertage behalten ihre zentrale Datumsregel; bearbeitbar sind nur Aktivstatus und Öffnungsregel. Eigene
Sondertage gelten immer jährlich und werden mit Monat und Tag angelegt. Einmalige Sondertage werden getrennt über den
`DatumsausnahmeBearbeitenDialog` mit einem vollständigen Datum gepflegt und technisch als Datumsausnahmen gespeichert. Lokale
Zeit- und Datumseingaben verwenden die wiederverwendbaren Components `LokalzeitEingabe` und `DatumEingabe`. Beide arbeiten als
browserunabhängige maskierte Texteingaben. `DatumEingabe` unterstützt vollständige Daten als `TT.MM.JJJJ` und jährliche Daten
ohne Jahr als `TT.MM.`. Das Datum eines bestehenden einmaligen Sondertags bleibt unverändert, weil es zugleich die
Firestore-Dokument-ID der Datumsausnahme bildet. Löschvorgänge werden über den gemeinsamen Bestätigungsdialog abgesichert.

Die Listen zeigen neben dem Aktivstatus auch den Öffnungszustand, beispielsweise `Aktiv · Geschlossen` oder
`Aktiv · Geöffnet 08:00–18:00 Uhr`. Inaktive Sondertage werden als `Inaktiv · Wochentagsregel gilt` ohne Öffnungszustand
dargestellt; ihre Datumsangabe bleibt sichtbar.

Die Oberfläche erläutert die Priorität als `einmaliger Sondertag → Feiertag oder jährlich wiederkehrender Sondertag →
Wochentag`. Intern entspricht dies weiterhin `Ausnahme → Sondertag → Wochentag`. Öffnungszeiten
bleiben dabei Kundenbetriebszeiten und werden nicht als automatische Begrenzung von Mitarbeiterschichten behandelt.
