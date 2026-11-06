<!-- pur-system/docs/architektur/components/einstellungen.md -->

# Einstellungen

Dieses Dokument beschreibt die technische Component- und Seitenstruktur. Fachliche Öffnungs- und Kalenderregeln stehen in der
[Öffnungszeiten-Matrix](../../matrizen/oeffnungszeiten.md) und im
[Fachkonzept Dienst- und Schichtplanung](../../fachkonzepte/dienst-und-schichtplanung.md).

Die komponentenlose Route `/einstellungen` bildet den erweiterbaren Bereich für filialbezogene Einstellungen. Ihr erster
Unterpunkt `/einstellungen/oeffnungszeiten` lädt die direkt routbare `OeffnungszeitenPage`. Der Bereich wird durch
Authentifizierung, Initialisierung und die Freigabe `einstellungen` geschützt.

Die Page bildet jede im App-Kontext ausgewählte Filiale auf eine eigene `OeffnungszeitenFiliale` ab. Jede Instanz verwendet
ihren vollständigen Filialpfad und den dazugehörigen Store-Kontext. Dadurch bleiben Formularzustände, Ladefehler und
Schreibvorgänge mehrerer gleichzeitig ausgewählter Filialen voneinander getrennt.

`OeffnungszeitenFiliale` gliedert die Pflege sichtbar in `Standardöffnungszeit`, `Wochentage`, `Gesetzliche Feiertage` und
`Jährliche Sondertage`. Heiligabend und Silvester werden als jährliche Sondertage geführt. Das
Bundesland wird intern mit Nordrhein-Westfalen (`DE-NW`) vorbelegt; die technische Zeitzone `Europe/Berlin` ist keine
Filialeinstellung. Bei einem noch leeren Filialkontext wird die Standardöffnungszeit mit `06:00` bis `01:00` Uhr am Folgetag
vorbelegt. Alle sieben Wochentage beginnen im Modus `Standard`.

Jeder Wochentag kann über ein Auswahlmenü auf `Standard`, `Abweichend` oder `Geschlossen` gestellt werden. Standardtage zeigen
die aktuell geerbte Zeit ohne eigene bearbeitbare Werte. Beim Wechsel auf `Abweichend` wird die aktuelle Standardzeit als
Ausgangswert übernommen. Abweichende Tage zeigen ihre eigene Zeit mit einer Stiftaktion; der
`AbweichendeOeffnungszeitBearbeitenDialog` bearbeitet Beginn und Ende und übernimmt das Ergebnis in das noch nicht gespeicherte
Hauptformular. Geschlossene Tage besitzen keine wirksame Kundenöffnung. Bei einer Breite des Wochentagsbereichs von höchstens
`500px` werden die angezeigte Öffnungszeit und die optionale Stiftaktion gemeinsam in die nächste Zeile umgebrochen. Eine
geöffnete Regel enthält genau eine Beginn- und Endzeit. Liegt die Endzeit vor der Beginnzeit, wird `endetAmFolgetag` intern
abgeleitet. Das Formular initialisiert den vollständigen Einstellungsbestand; anschließend speichert es Änderungen an
Grundlagen und Wochenregeln atomar. Bei einem noch nicht initialisierten Bestand kann die gültige Vorbelegung unmittelbar
gespeichert werden. Bei einem bestehenden Bestand ist dafür eine fachliche Änderung erforderlich.

Gesetzliche Feiertage zeigen Bezeichnung und berechnetes Datum sowie ein Auswahlmenü mit `Standard`, `Wie Sonntag`,
`Abweichend` und `Geschlossen`. `Standard` verwendet die allgemeine Standardöffnungsregel, `Wie Sonntag` dynamisch die wirksame
Sonntagsöffnung. `Abweichend` und `Geschlossen` werden direkt als bestehender Aktivstatus und bestehende Öffnungsregel
gespeichert. Die Stiftaktion bleibt in jeder Zeile sichtbar, ist aber nur für `Abweichend` aktiv und öffnet den
`AbweichendeOeffnungszeitBearbeitenDialog`. Eine vorhandene abweichende Zeit wird beibehalten; andernfalls dient die wirksame
Wochentagszeit oder bei einem geschlossenen Wochentag die Standardöffnungszeit als Vorbelegung.

Jährliche Sondertage verwenden dieselbe Zeilenstruktur und die Öffnungsarten `Standard`, `Abweichend` und `Geschlossen`. In
Nordrhein-Westfalen werden Heiligabend und Silvester aktiv vom Standardbeginn bis `16:00 Uhr` vorbelegt; bei einem
Standardbeginn ab `16:00 Uhr` beginnen sie geschlossen. Der berechnete Volkstrauertag und Totensonntag werden aktiv mit
`13:00–01:00 Uhr` beziehungsweise `18:00–01:00 Uhr` vorbelegt. Ihr jährlich berechnetes Datum wird in der Liste angezeigt. Der
`SondertagBearbeitenDialog` pflegt bei benutzerdefinierten jährlichen Sondertagen ausschließlich Bezeichnung sowie Monat und
Tag; neue Einträge beginnen im Modus `Standard`. Eine getrennte Stammdatenaktion öffnet den Dialog erneut, während Öffnungsart
und abweichende Zeit direkt in der Liste gepflegt werden. Systemdefinierte jährliche Sondertage besitzen keine
Stammdatenaktion und können nicht gelöscht werden.

Ein nur einmal benötigter Tag wird als benutzerdefinierter jährlicher Sondertag angelegt und nach Anlage der betroffenen
Monatspläne deaktiviert oder gelöscht. Die Tagesmomentaufnahmen bestehender Dienstpläne bleiben davon unberührt.

Die lokalen Zeit- und Datumseingaben verwenden die wiederverwendbaren Components `EingabeZeit` und `EingabeDatum`. Beide
arbeiten als browserunabhängige maskierte Texteingaben. `EingabeDatum` unterstützt jährliche Daten ohne Jahr als `TT.MM.`.
Löschvorgänge werden über den gemeinsamen Bestätigungsdialog abgesichert.

Die Oberfläche stellt die Standardöffnungszeit als responsiv angeordnete Zeitfelder dar. Standardöffnungszeit, abweichende
Wochenregeln und Sondertage müssen jeweils eine gültige positive Zeitspanne besitzen. Der Service wiederholt
diese fachliche Prüfung vor jedem Schreibzugriff. Vor- und Nachbereitungszeiten eines Schichtrasters dürfen außerhalb der
Kundenöffnung liegen.

Die Oberfläche erläutert die Priorität als `benutzerdefinierter jährlicher Sondertag → gesetzlicher Feiertag oder
systemdefinierter Sondertag → Wochentag`. Beim Speichern oder Aktivieren eines jährlich festen Sondertags verhindert die
Verwaltung eine direkte Kollision mit einem anderen aktiven festen Sondertag derselben Herkunft und benennt beide Einträge.
Ein benutzerdefinierter Sondertag darf einen systemdefinierten Tag überschreiben. Öffnungszeiten bleiben Kundenbetriebszeiten;
in einem Schichtraster bestimmen sie zugleich die
automatisch abgeleiteten äußeren Rastergrenzen. Vor- und Nachbereitungsminuten können diese Grenzen ausdrücklich erweitern.
