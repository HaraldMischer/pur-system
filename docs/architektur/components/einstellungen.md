<!-- pur-system/docs/architektur/components/einstellungen.md -->

# Einstellungen

Die komponentenlose Route `/einstellungen` bildet den erweiterbaren Bereich für filialbezogene Einstellungen. Ihr erster
Unterpunkt `/einstellungen/oeffnungszeiten` lädt die direkt routbare `OeffnungszeitenPage`. Der Bereich wird durch
Authentifizierung, Initialisierung und die Freigabe `einstellungen` geschützt.

Die Page bildet jede im App-Kontext ausgewählte Filiale auf eine eigene `OeffnungszeitenFiliale` ab. Jede Instanz verwendet
ihren vollständigen Filialpfad und den dazugehörigen Store-Kontext. Dadurch bleiben Formularzustände, Ladefehler und
Schreibvorgänge mehrerer gleichzeitig ausgewählter Filialen voneinander getrennt.

`OeffnungszeitenFiliale` gliedert die Pflege in Wochentage, gesetzliche Feiertage und Sondertage. Die Sondertagsliste enthält
Heiligabend und Silvester sowie eigene einmalige und jährlich wiederkehrende Einträge. Das Bundesland wird intern mit
Nordrhein-Westfalen
(`DE-NW`) vorbelegt; die technische Zeitzone `Europe/Berlin` ist keine Filialeinstellung. Eine geöffnete Regel enthält
genau eine Beginn- und Endzeit. Liegt die Endzeit vor der Beginnzeit, wird `endetAmFolgetag` intern abgeleitet. Geschlossene
Regeln enthalten keine Zeitwerte. Bei einem noch leeren Filialkontext initialisiert das Formular den vollständigen
Einstellungsbestand; anschließend speichert es Änderungen an Grundlagen und Wochenregeln atomar.

Gesetzliche Feiertage und Sondertage werden über einen gemeinsamen Sondertag-Dialog gepflegt. Systemdefinierte gesetzliche
Feiertage behalten ihre zentrale Datumsregel; bearbeitbar sind nur Aktivstatus und Öffnungsregel. Beim Anlegen eines eigenen
Sondertags wird gewählt, ob er einmalig an einem konkreten Datum oder jährlich an Monat und Tag wiederkehrt. Die technische
Speicherung bleibt auf wiederkehrende Sondertage und konkrete Datumsausnahmen verteilt. Löschvorgänge werden über den
gemeinsamen Bestätigungsdialog abgesichert.

Die Oberfläche erläutert die Priorität als `einmaliger Sondertag → Feiertag oder jährlich wiederkehrender Sondertag →
Wochentag`. Intern entspricht dies weiterhin `Ausnahme → Sondertag → Wochentag`. Öffnungszeiten
bleiben dabei Kundenbetriebszeiten und werden nicht als automatische Begrenzung von Mitarbeiterschichten behandelt.
