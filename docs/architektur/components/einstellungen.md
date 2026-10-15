<!-- pur-system/docs/architektur/components/einstellungen.md -->

# Einstellungen

Die komponentenlose Route `/einstellungen` bildet den erweiterbaren Bereich für filialbezogene Einstellungen. Ihr erster
Unterpunkt `/einstellungen/oeffnungszeiten` lädt die direkt routbare `OeffnungszeitenPage`. Der Bereich wird durch
Authentifizierung, Initialisierung und die Freigabe `einstellungen` geschützt.

Die Page bildet jede im App-Kontext ausgewählte Filiale auf eine eigene `OeffnungszeitenFiliale` ab. Jede Instanz verwendet
ihren vollständigen Filialpfad und den dazugehörigen Store-Kontext. Dadurch bleiben Formularzustände, Ladefehler und
Schreibvorgänge mehrerer gleichzeitig ausgewählter Filialen voneinander getrennt.

`OeffnungszeitenFiliale` bearbeitet Bundesland, Zeitzone und die sieben regulären Wochenregeln. Eine geöffnete Regel enthält
genau eine Beginn- und Endzeit. Liegt die Endzeit vor der Beginnzeit, wird `endetAmFolgetag` abgeleitet und sichtbar erläutert.
Geschlossene Regeln enthalten keine Zeitwerte. Bei einem noch leeren Filialkontext initialisiert das Formular den vollständigen
Einstellungsbestand; anschließend speichert es Änderungen an Grundlagen und Wochenregeln atomar.

Sondertage und Datumsausnahmen werden über eigene Dialog-Components gepflegt. Systemdefinierte gesetzliche Feiertage behalten
ihre zentrale Datumsregel; bearbeitbar sind nur Aktivstatus und Öffnungsregel. Eigene Sondertage verwenden ein jährlich festes
Datum. Datumsausnahmen erhalten ein konkretes Datum und überschreiben die übrigen Regeln. Löschvorgänge werden über den
gemeinsamen Bestätigungsdialog abgesichert.

Die Oberfläche macht die fachliche Priorität `Ausnahme → Sondertag → Wochentag` direkt auf der Page sichtbar. Öffnungszeiten
bleiben dabei Kundenbetriebszeiten und werden nicht als automatische Begrenzung von Mitarbeiterschichten behandelt.
