<!-- pur-system/docs/fachkonzepte/dienst-und-schichtplanung.md -->

# Dienst- und Schichtplanung

## Einordnung und Hauptquellen

Dieses Dokument ist die fachliche Hauptquelle für Dienst- und Schichtplanung. Gesetzliche und betriebliche Öffnungsgrenzen
stehen in der [Öffnungszeiten-Matrix](../matrizen/oeffnungszeiten.md), Pfad- und CRUD-Rechte in der
[Berechtigungsmatrix](../matrizen/berechtigungen.md). Der [Projektstand](../projekt-stand.md) fasst ausschließlich zusammen,
welche Teile umgesetzt, geprüft und veröffentlicht sind.

## Allgemeine Beschreibung

Ein Dienstplan gehört genau zu einer Filiale und umfasst in der ersten Ausbaustufe einen vollständigen Kalendermonat. Der
Monatszeitraum beginnt am ersten und endet am letzten Kalendertag und wird mit lokalen Datumswerten sowie der Zeitzone
`Europe/Berlin` beschrieben. Der Kalendermonat im Format `YYYY-MM` dient als fachlich eindeutige Dienstplan-ID innerhalb der
Filiale. Pro Filiale und Kalendermonat existiert genau ein Dienstplan.

Der Dienstplan enthält versionierte Bearbeitungsstände. Jede Version besitzt eine fortlaufende Nummer und genau einen der
technischen Statuswerte `entwurf`, `veroeffentlicht` oder `archiviert`. Pro Dienstplan darf es höchstens eine Entwurfsversion
und eine veröffentlichte Version geben. Planer bearbeiten ausschließlich die Entwurfsversion. Die Mitarbeiter-App zeigt
ausschließlich die veröffentlichte Version. Bei einer erneuten Veröffentlichung wird die bisher veröffentlichte Version
archiviert und der bisherige Entwurf zum neuen veröffentlichten Stand. Veröffentlichte und archivierte Versionen werden nicht
mehr verändert.

Die Dienstpläne und Schichtmodelle liegen unter der betroffenen Filiale. Ein zusätzlicher firmenweiter Belegungsindex führt die
für filialübergreifende Konfliktprüfungen benötigten Zeiträume pro Mitarbeiter und Kalendertag zusammen:

```text
unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/schichtmodell/{schichtmodellId}
  /modellschicht/{modellschichtId}
unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/dienstplan/{monat}
  /modellschicht/{modellschichtId}
  /version/{versionId}
    /schicht/{schichtId}
unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/einstellung/allgemein
unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/einstellung/oeffnungszeiten
  /sondertag/{sondertagId}
unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiterbelegung/{mitarbeiterId}__{datum}
```

Die filialbezogenen Dienstpläne bleiben die fachliche Quelle der einzelnen Schichten. Der Belegungsindex ist eine gemeinsam mit
den Schichten atomar gepflegte Prüfstruktur und ersetzt weder die Dienstplandokumente noch deren getrennte Versionierung.

## Filialeinstellungen und Kalendertage

Die allgemeinen Filialeinstellungen speichern das Bundesland. Die Oberfläche verwendet zunächst fest Nordrhein-Westfalen
(`DE-NW`) und bietet keine Bundeslandauswahl an. Die technische Zeitzone `Europe/Berlin` gilt anwendungsweit und wird nicht als
Filialeinstellung gespeichert. Das Dokument `einstellung/oeffnungszeiten` speichert zusätzlich die Standardöffnungsregel und
die sieben Wochentagsmodi. Die verpflichtende Standardöffnungsregel wird bei der Initialisierung mit `06:00` bis `01:00` Uhr am
Folgetag vorbelegt. Vorbereitungs- und Nachbereitungszeiten von Schichten dürfen außerhalb der Kundenöffnung liegen.

Jeder Wochentag besitzt genau einen Modus: `standard`, `abweichend` oder `geschlossen`. Im Modus `standard` wird seine wirksame
Öffnungsregel bei jeder Auflösung aus der aktuellen Standardöffnungsregel abgeleitet. Im Modus `abweichend` besitzt er eine
eigene geöffnete Regel mit lokaler Beginn- und Endzeit sowie `endetAmFolgetag`. Im Modus `geschlossen` besitzt er keine
wirksame Kundenöffnung. Eine Änderung der Standardöffnungsregel wirkt damit automatisch auf alle vererbenden Wochentage, ohne
abweichende oder geschlossene Tage zu verändern.

Die Standardöffnungsregel und jede abweichende Regel beschreiben jeweils genau einen durchgehenden positiven Zeitraum. Pausen
und mehrere Öffnungszeiträume innerhalb eines Tages sind nicht Teil des Modells. Neue Filialeinstellungen setzen alle sieben
Wochentage auf `standard`. Damit wird beispielsweise die Montagsöffnung weiterhin eindeutig dem Montag zugeordnet, auch wenn
sie ihre konkrete Zeit aus der filialbezogenen Standardöffnung erbt.

Die Oberfläche unterscheidet die Bereiche `Wochentage`, `Gesetzliche Feiertage` und `Jährliche Sondertage`. Heiligabend und
Silvester sind keine gesetzlichen Feiertage und werden daher als jährliche Sondertage geführt. Damit kann die spätere
Dienstplanung gesetzliche Feiertage eindeutig von sonstigen besonderen Tagen unterscheiden.

Wiederkehrende Sondertage besitzen eine sichtbare Bezeichnung, einen Aktivstatus, eine Herkunft, eine eigene Öffnungsregel und
entweder ein jährlich festes Datum oder einen zentral definierten gesetzlichen Feiertagsschlüssel. Systemdefinierte gesetzliche
Feiertage werden aus einem lokalen Katalog bundeslandspezifisch berechnet. Lokal oder kommunal begrenzte Feiertage werden nicht
allein aus dem Bundesland abgeleitet und müssen als eigener fester Sondertag gepflegt werden. In Nordrhein-Westfalen beginnen
gesetzliche Feiertage grundsätzlich im Modus `Wie Sonntag`; Karfreitag beginnt `Geschlossen`, Allerheiligen `Abweichend` mit
`18:00–01:00 Uhr`. Heiligabend und Silvester beginnen `Abweichend` vom Standardbeginn bis `16:00 Uhr`. Liegt der Standardbeginn
bei `16:00 Uhr` oder später, beginnen beide Tage stattdessen `Geschlossen`. In anderen Bundesländern bleiben neu angelegte
Systemtage ohne eigene bundeslandspezifische Vorbelegung im Modus `Standard`.

Gesetzliche Feiertage verwenden in der Oberfläche die Öffnungsarten `Standard`, `Wie Sonntag`, `Abweichend` und
`Geschlossen`. `Standard` wendet unabhängig vom Wochentag die allgemeine Standardöffnungsregel der Filiale an. `Wie Sonntag`
verknüpft den Feiertag dynamisch mit der aktuell wirksamen Sonntagsöffnung der Filiale; die Sonntagszeit wird nicht in den
Feiertag kopiert. `Abweichend` aktiviert eine eigene geöffnete Regel und `Geschlossen` eine geschlossene Regel. Jährliche
Sondertage verwenden weiterhin `Standard`, `Abweichend` und `Geschlossen`. Name und Datum bleiben in jeder Zeile sichtbar.
Beginn und Ende werden nur für eine abweichende Regel in einem eigenen Dialog bearbeitet. Bei benutzerdefinierten jährlichen
Sondertagen werden Bezeichnung und Datum getrennt von der Öffnungsart gepflegt.

Die gewählte Öffnungsart steuert ausschließlich, welche betriebliche Öffnungsregel wirksam wird. Ein gesetzlicher Feiertag
bleibt unabhängig davon kalendarisch ein gesetzlicher Feiertag. Diese Unterscheidung wird bei den tagesabhängigen Rasterzeiten,
den Tagesvorlagen und späteren Zuschlagsbewertungen beibehalten.

Bei einem Bundeslandwechsel bleiben gemeinsame systemdefinierte Feiertage mit ihrer angepassten Öffnungsregel erhalten. Nicht
mehr landesweit geltende Feiertage werden entfernt, neu geltende mit ihrer bundeslandspezifischen Vorbelegung ergänzt.
Benutzerdefinierte Sondertage bleiben unverändert. Schlüssel, Bezeichnung und Datumsberechnung gesetzlicher Feiertage sind
systemdefiniert; Benutzer wählen nur die Öffnungsart und bearbeiten gegebenenfalls die abweichende Öffnungszeit. Bei eigenen
festen Sondertagen sind Bezeichnung, Monat, Tag, Aktivstatus und Öffnungsregel bearbeitbar.

Volkstrauertag und Totensonntag sind für Nordrhein-Westfalen als systemdefinierte, aber nicht gesetzliche Feiertage modelliert.
Ihr Datum wird jährlich relativ zum ersten Advent berechnet. Sie beginnen aktiv mit den abweichenden Öffnungszeiten
`13:00–01:00 Uhr` beziehungsweise `18:00–01:00 Uhr`; Bezeichnung und Datumsregel sind nicht bearbeitbar oder löschbar.

Benutzerdefinierte Sondertage gelten immer jährlich und besitzen Monat und Tag ohne Jahresangabe. Werden sie nicht mehr
benötigt, werden sie deaktiviert oder gelöscht. Ein nur einmal benötigtes Ereignis wird ebenfalls als benutzerdefinierter
jährlicher Sondertag gepflegt und nach Anlage der betroffenen Monatspläne deaktiviert oder gelöscht. Die bereits gespeicherten
Tagesmomentaufnahmen bleiben dabei unverändert. Die wirksame Regel wird in der Reihenfolge `benutzerdefinierter jährlicher
Sondertag → systemdefinierter Sondertag → wirksame Wochenöffnung` aufgelöst. Dadurch darf ein benutzerdefinierter Sondertag
auch auf einen gesetzlichen Feiertag oder einen anderen systemdefinierten Sondertag fallen und dessen Öffnungsregel gezielt
überschreiben. Der gesetzliche Feiertagsstatus bleibt dabei unabhängig von der wirksamen Öffnungsregel erhalten. Die wirksame
Wochenöffnung stammt je nach Modus aus der Standardöffnungsregel, einer abweichenden Wochentagsregel oder einem geschlossenen
Wochentag. Fehlende Wochenregeln werden nicht als geöffnet interpretiert. Eine über Mitternacht reichende Öffnungsregel gehört
vollständig zu ihrem Startdatum, auch wenn der Folgetag ein Feiertag oder Sondertag ist.

Direkte Kollisionen mehrerer jährlich fester aktiver benutzerdefinierter Sondertage am selben Monatstag werden bereits beim
Speichern oder Aktivieren verhindert. Dasselbe gilt innerhalb der systemdefinierten Sondertage. Treffen ein
benutzerdefinierter und ein systemdefinierter Sondertag zusammen, gilt die benutzerdefinierte Regel. Ohne vollständige und
fachlich gültige Filialeinstellungen oder bei einer nicht aufgelösten Kollision darf kein Monatsdienstplan angelegt werden.

Der `FilialeinstellungService` behandelt vollständig fehlende Einstellungsdokumente als noch nicht initialisierten Zustand.
Existiert dagegen nur ein Teil der beiden verbindlichen Hauptdokumente, wird ein Initialisierungsfehler gemeldet. Die erstmalige
Anlage verwendet Nordrhein-Westfalen und verlangt eine Standardöffnungsregel sowie alle sieben Wochentagsmodi ausdrücklich; das
Bundesland wird nicht aus Anschrift oder Postleitzahl abgeleitet. Der `FilialeinstellungStore` hält vollständige Bestände sowie
Lade-, Schreib- und Fehlerzustände für jeden Filialpfad getrennt und stellt die Datumsauflösung bereit.

Allgemeine Einstellungen, Standardöffnungsregel, Wochentagsmodi und der automatische Sondertagsabgleich eines
Bundeslandwechsels werden atomar geschrieben. Neu hinzukommende systemdefinierte Sondertage erhalten dabei ebenfalls die
fachlich festgelegte zeitliche Vorbelegung. Benutzerdefinierte Sondertage bleiben einzeln anleg-, änder- und löschbar.
Fehlen bei einem bestehenden Bestand vordefinierte Systemtage, bleibt die Speicheraktion auch ohne Formularänderung aktiv und
führt den Abgleich ausdrücklich aus.
Systemdefinierte Sondertage können nur in Aktivstatus und Öffnungsregel verändert werden. Die Firestore
Rules gewähren Masterkonten aufgrund ihrer Rolle sowie zugeordneten Office- und
Filialkonten mit dem Bereich `einstellungen` Zugriff. Mitarbeiterkonten und nicht zugeordnete Filialen bleiben ausgeschlossen.
Die Rules prüfen dafür Rolle, aktives Profil, Filialzugriff, Bereich und Collection-Pfad; Dokument-IDs, Feldinhalte,
Datumsregeltypen und lokale Zeitwerte validiert der TypeScript-Code.

## Planungsart Schichtraster

Jede Filiale besitzt eigene vorkonfigurierte Schichtmodelle, damit unterschiedliche Öffnungs- und Betriebszeiten unabhängig
voneinander abgebildet werden können. Ein Schichtmodell enthält eine Bezeichnung, einen Aktivstatus und eine fachlich geordnete
Liste eigener Modellschichten. Jede Modellschicht gehört ausschließlich zu ihrem Modell und wird nicht als
eigenständige, wiederverwendbare Schichtvorlage geführt. Dadurch können beispielsweise die Modelle `Sommer` mit Früh-,
Mittags- und Spätschicht sowie `Winter` mit nur Früh- und Spätschicht vollständig unabhängig voneinander definiert werden.

Diese Planungsart heißt `Schichtraster`. Ein Schichtraster definiert für den gesamten Monatsdienstplan feste Schichtplätze. Jeder
Kalendertag verwendet dieselben Rasterplätze; nur ihre Uhrzeiten und ihre Belegung mit Mitarbeitern können je Tag abweichen.
Die Rasterplätze dürfen sich zeitlich überschneiden oder untereinander identische Beginn- und Endzeiten besitzen. Eine einzelne
konkrete Schicht benötigt dagegen eine positive Dauer, und die konkreten Schichten desselben Mitarbeiters dürfen sich nicht
überschneiden.

Jedes Schichtmodell und jeder daraus angelegte Monatsdienstplan speichern die Planungsart verbindlich. Solange ausschließlich
das Schichtraster umgesetzt ist, setzt die Anwendung den Wert automatisch auf `schichtraster`. Die Einstiege zur Modell- und
Monatsplananlage zeigen das Schichtraster bereits als auswählbare Planungsart und `Schichtbausteine` als noch nicht verfügbare
Variante. Dieser deaktivierte Platzhalter entspricht dem aktuellen technischen Stand. Todo 26 ersetzt die vorbereiteten Werte
durch die verbindlichen Planungsarten `schichtrastermodell` und `schichttagesmodell`. Der Monatsdienstplan übernimmt die
Planungsart als Teil seiner unveränderlichen Modellreferenz. Sobald das Schicht-Tagesmodell umgesetzt ist, wird sein eigener
Einstieg freigeschaltet und anschließend nur ein dazu passendes Modell angeboten.

Die Modellschichten eines Schichtmodells bilden das Schichtraster für alle Kalendertage. Ihre IDs, Bezeichnungen, Reihenfolge
und Mehrfachbelegung ändern sich nicht abhängig von Wochentag, Feiertag oder Sondertag. Ein Modell mit Früh-, Mittel- und
Spätschicht bleibt deshalb an jedem Tag dreispaltig; ein Modell mit Früh- und Spätschicht bleibt durchgehend zweispaltig.
Sonntag und Samstag verwenden dasselbe Schichtraster wie die übrigen Kalendertage.

Die Modellschichten besitzen eine ausdrücklich gespeicherte Reihenfolge. Der Beginn des ersten Rasterplatzes wird nicht als
feste Modellzeit gepflegt, sondern für jeden Kalendertag aus dessen wirksamem Öffnungsbeginn abgeleitet. Entsprechend wird das
Ende des letzten Rasterplatzes aus dem wirksamen Öffnungsende abgeleitet. Bei einem Modell mit nur einem Rasterplatz gelten
beide tagesabhängigen Außengrenzen. Deshalb werden die beiden äußeren Zeitfelder im Modell nicht bearbeitet und für einen
allein vorhandenen Rasterplatz keine feste Schichtdauer angezeigt. Auch für innere Rasterplätze wird im Modelldialog keine
berechnete Schichtdauer dargestellt.

Bei mehreren Rasterplätzen bleiben die inneren Beginn- und Endzeiten unabhängig voneinander bearbeitbar. Sobald der Beginn
einer neu hinzugefügten Modellschicht erstmals eingegeben wird, wird er zunächst als Ende der vorherigen Modellschicht
vorbelegt; anschließend können beide Werte getrennt geändert werden. Für beide inneren Grenzen wird nur die Uhrzeit erfasst.
Ihre Zuordnung zum Start- oder Folgetag ergibt sich automatisch aus der Standardöffnungszeit der Filiale. Dadurch sind lückenlose
Übergaben, bewusste Lücken und auch gleichzeitige Überlappungen von mehr als zwei Rasterplätzen möglich. Eine Lücke
verhindert das Speichern des Modells nicht, wird aber vor dem Speichern als fachlicher Hinweis angezeigt. Jeder für einen
konkreten Kalendertag angebotene Rasterplatz muss weiterhin eine positive Dauer besitzen.

Die erste Modellschicht kann zusätzliche Vorbereitungsminuten und die letzte Modellschicht zusätzliche Nachbereitungsminuten
festlegen. Diese ganzen Minutenwerte von 0 bis 999 erweitern ausschließlich die automatisch angepassten äußeren Grenzen: Der
erste Rasterplatz beginnt entsprechend vor dem Öffnungsbeginn, der letzte endet entsprechend nach dem Öffnungsende. Bei einem
Modell mit nur einem Rasterplatz können beide Werte gelten. Vor- und Nachbereitung werden damit ausdrücklich modelliert und
nicht über von den Öffnungszeiten unabhängige Schichtzeiten abgebildet.

Feiertage und Sondertage wirken ausschließlich über ihre jeweils gültige Öffnungsregel auf die
tagesabhängigen Außengrenzen. Eigene besondere Rasterzeiten für Sondertage werden nicht gepflegt. Lässt sich ein Rasterplatz
an einem Kalendertag nicht vollständig und mit positiver Dauer in die wirksamen Tagesgrenzen einordnen, erhält er an diesem Tag
keine wirksame Rasterzeit und kann nicht belegt werden. Passen an einem Tag keine Rasterplätze, werden dort keine Schichten zur
Anlage angeboten. An einem geschlossenen Tag stehen ebenfalls keine wirksamen Rasterzeiten zur Verfügung.

Wird eine besondere Öffnungsregel später deaktiviert, gilt wieder die nachrangige Öffnungsregel. Bereits angelegte Monatspläne
bleiben aufgrund ihrer Momentaufnahme unverändert. Unabhängig von den wirksamen Rasterzeiten bleiben die Eigenschaften als
Sonntag, gesetzlicher Feiertag oder sonstiger Sondertag in der Monatsplan-Momentaufnahme erkennbar.

Der Monatsdienstplan speichert für jeden seiner höchstens 31 Kalendertage eine vollständig aufgelöste Tagesmomentaufnahme. Sie
enthält Datum, Wochentag, wirksame Öffnungsregel, deren Quelle, vorhandene Quell-IDs und Bezeichnungen sowie die unabhängig
davon ermittelten Kalendereigenschaften. Hinzu kommen die an diesem Tag tatsächlich passenden Rasterplätze mit ihren wirksamen
Beginn- und Endzeiten. Die stabilen Modellschicht-IDs und die Spaltenstruktur des Monatsrasters bleiben dabei erhalten; eine
fehlende Rasterzeit sperrt nur die betreffende Zelle. Die Tagesmomentaufnahme wird bei späteren Änderungen an
Filialeinstellungen, Feiertagsregeln oder Schichtmodellen nicht neu berechnet.

Die Tagesmomentaufnahmen liegen als auf höchstens 31 Einträge begrenzte Liste `kalendertage` direkt im Dokument des
Monatsdienstplans. Sie werden gemeinsam mit dem Dienstplan atomar angelegt und bei jeder Dienstplanladung ohne zusätzliche
Dokumentlesevorgänge vollständig bereitgestellt. Die feste Begrenzung auf einen Kalendermonat verhindert ein unkontrolliertes
Wachstum des Dokuments.

Nacht-, Sonntags- und Feiertagszuschläge werden in der ersten Ausbaustufe weder konfiguriert noch berechnet. Eine spätere
Bewertung leitet sie aus den tatsächlichen Schichtzeiten und den Kalendereigenschaften ab und nicht aus der Herkunft einer
Rasterzeit.

Eine Modellschicht enthält mindestens eine innerhalb ihres Modells eindeutige ID, eine Bezeichnung und eine ausdrücklich
gespeicherte Reihenfolge. Feste innere Beginn- und Endzeiten enthalten zusätzlich die eindeutige Zuordnung zum Start- oder
Folgetag. Bei der ersten Modellschicht wird der Beginn, bei der letzten das Ende nicht redundant gespeichert. Die erste
Modellschicht kann zusätzlich Vorbereitungsminuten, die letzte Nachbereitungsminuten enthalten. Zusätzlich bestimmt
`mehrfachbelegungErlaubt`, ob eine Rasterzelle dieser Modellschicht mit mehreren Mitarbeitern besetzt werden darf. Der
Standardwert ist `false`; ohne aktivierte Mehrfachbelegung ist höchstens eine konkrete Mitarbeiterschicht je Kalendertag und
Modellschicht zulässig. Nicht mehr verwendete Modelle der neuen Struktur werden deaktiviert und nicht physisch gelöscht. Für
die Umstellung werden vorhandene alte Schichtmodelle nicht migriert, sondern gelöscht und vollständig neu angelegt.

Beim Anlegen eines Monatsdienstplans wählt der Planer ein aktives Schichtmodell der konkreten Filiale. Der Monatsdienstplan
speichert die Modell-ID, die Modellbezeichnung und die vollständige fachlich geordnete Liste ihrer Modellschichten als
Momentaufnahme. Noch nicht initialisierte Filialeinstellungen verhindern die Anlage; die Oberfläche weist dann darauf hin, dass
zuerst die Öffnungszeiten der Filiale initialisiert werden müssen. Unvollständige Filialeinstellungen, mehrere am selben Datum
wirksame Kalenderregeln und ein zwischenzeitlich ungültiges Schichtmodell verhindern die Anlage ebenfalls und werden mit ihrer
konkreten Ursache angezeigt. Diese eine Momentaufnahme bestimmt das Schichtraster aller Versionen des Monatsplans. Solange der
Monatsplan
noch nie veröffentlicht wurde und sein aktueller Entwurf keine Schichten enthält, darf der vollständige Dienstplan gelöscht und
anschließend mit einem anderen aktiven Modell neu angelegt werden. Sobald eine Schicht vorhanden ist, ist die Löschung gesperrt;
nach dem Löschen aller Schichten ist sie wieder möglich. Nach der ersten Veröffentlichung bleibt die Momentaufnahme für diesen
Monatsplan dauerhaft unveränderlich. Spätere Änderungen oder die Deaktivierung des ursprünglichen Schichtmodells verändern
bestehende Monatspläne nicht.

Ein Schichtmodell kann mehrere getrennte Modellschichten mit gleichen Zeiten enthalten, wenn eigenständige Arbeitsplätze oder
Aufgaben unterschieden werden sollen. Alternativ kann eine einzelne Modellschicht mit aktivierter Mehrfachbelegung verwendet
werden, wenn mehrere Mitarbeiter dieselbe Schichtart mit identischen Zeiten besetzen. In beiden Varianten erhält jeder
Mitarbeiter eine eigene konkrete Schicht. Die Mehrfachbelegung fasst diese Schichten lediglich in derselben Rasterzelle
zusammen.

## Schicht-Tagesmodell

Als zweite Planungsart wird das `schichttagesmodell` neben dem bestehenden Schicht-Rastermodell umgesetzt. Es ist kein
erweitertes Raster, kein Katalog von Schichtbausteinen und kein Sonderfall der Rastermodellschichten. Beide Modelle besitzen
eigene fachliche Typen, Speicherpfade, Services, Stores und Oberflächen. Gemeinsame Basistypen enthalten ausschließlich
allgemeine Metadaten.

Die Planungsartwerte heißen verbindlich `schichtrastermodell` und `schichttagesmodell`. Der bisher gespeicherte Wert
`schichtraster` wird kontrolliert zu `schichtrastermodell` migriert. Der nur vorbereitete Wert `schichtbausteine` und seine
leeren Dokumenttypen werden entfernt. Historische Rasterpläne bleiben ohne fachliche Änderung lesbar.

Die filialbezogenen Modellpfade werden ebenfalls getrennt. Schicht-Rastermodelle liegen unter
`schichtrastermodell/{schichtrastermodellId}` mit eigenen `rastermodellschicht`-Dokumenten. Schicht-Tagesmodelle liegen unter
`schichttagesmodell/{schichttagesmodellId}` mit eigenen `tagesvorlagenschicht`-Dokumenten. Im Monatsplan werden unveränderliche
Rastermomentaufnahmen unter `rastermodellschicht` und Tagesmomentaufnahmen unter `tagesschicht` gespeichert. Die neuen Pfade
und CRUD-Rechte werden vor der Rules-Umsetzung in der Berechtigungsmatrix festgelegt.

Ein Schicht-Tagesmodell enthält eine Wochentagsvorlage für Montag bis Samstag und eine davon unabhängige Sonntagsvorlage. Jede
Vorlage besitzt eine frei wählbare, fachlich geordnete Anzahl eigener Vorlagenschichten. Wochentags- und Sonntagsvorlage dürfen
sich in Anzahl, Identität, Bezeichnung, Kernzeiten, Lücken, Überschneidungen, Mehrfachbelegung sowie Vor- und Nachbereitung
vollständig unterscheiden.

Eine Vorlagenschicht besitzt eine eigene stabile ID. Die erste Schicht speichert keinen festen Beginn und die letzte kein festes
Ende; diese Außengrenzen werden beim Erzeugen eines Monatsplans aus der wirksamen Öffnung des konkreten Kalendertags abgeleitet.
Nur innere Grenzen besitzen konkrete Lokalzeiten am Start- oder Folgetag. Prozentuale Anteile und relative Übergänge gehören
nicht zum Schicht-Tagesmodell. Die aufgelösten Grenzen bilden die Kernzeit und müssen innerhalb der wirksamen Öffnung liegen.
Nur die erste Schicht einer Vorlage besitzt Vorbereitungsminuten und nur die letzte Nachbereitungsminuten; bei einer einzelnen
Schicht gelten beide Werte. Diese Randminuten erweitern die Kernzeit zur tatsächlichen Arbeitszeit und dürfen als einzige Werte
vor den Öffnungsbeginn beziehungsweise nach das Öffnungsende reichen.

Beim Ergänzen einer Vorlagenschicht halbiert der Modelldialog den verbleibenden Zeitraum von der bisher letzten Beginnzeit bis
zum Schichtende. Die berechnete Grenze wird als Ende der bisherigen und als Beginn der neuen Schicht vorbelegt. Beide Grenzen
bleiben unabhängig bearbeitbar; Lücken und Überlappungen sind weiterhin ausdrücklich zulässig. Die Halbierung berücksichtigt
auch eine über Mitternacht reichende Öffnung.

Beim initialen Erstellen eines Monatsdienstplans wird jeder Kalendertag mit seiner wirksamen Öffnung und seinen unabhängigen
Kalendereigenschaften aufgelöst. Reguläre Wochentage von Montag bis Samstag erhalten eigene Tagesschichten aus der
Wochentagsvorlage; reguläre Sonntage erhalten sie aus der Sonntagsvorlage. Geschlossene Tage enthalten keine Tagesschichten.

Gesetzliche Feiertage mit der Öffnungsart `Standard` verwenden die allgemeine Standardöffnung. Für die Schichtvorlage bleibt
der im konkreten Monatsplan ermittelte Wochentag maßgeblich: Montag bis Samstag verwenden die Wochentagsvorlage, Sonntage die
Sonntagsvorlage. Mit `Wie Sonntag` übernehmen Feiertage ohne zusätzliche Monatskonfiguration sowohl die aktuell wirksame
Sonntagsöffnung als auch die Sonntagsvorlage. Nur geöffnete Feiertage und sonstige Sondertage mit der Öffnungsart `Abweichend`
erhalten innerhalb der Monatsplananlage eine freie Tagesstruktur. Anzahl, Identität, Bezeichnung, Reihenfolge, Länge, Lücken
und Überschneidungen dürfen sich von allen anderen Tagen unterscheiden. Die Kernzeit jeder freien Tagesschicht muss innerhalb
der wirksamen Sondertagsöffnung liegen; nur ihre Vor- und Nachbereitung darf die Öffnungsgrenzen überschreiten. Geschlossene
Tage erhalten keine Tagesschichten.

Der Monatsplan wird erst angelegt, wenn alle geöffneten Tagesstrukturen vollständig und fachlich gültig sind. Monatsplan, erste
Entwurfsversion, Kalender-Momentaufnahme, Modellreferenz und alle Tagesschichten entstehen atomar. Danach ist die vollständige
Tagesstruktur für alle Versionen dieses Monatsplans unveränderlich. Ein leerer, noch nie veröffentlichter Plan darf wie beim
Schicht-Rastermodell gelöscht und mit einer neuen Tagesstruktur erneut angelegt werden.

Jede konkrete Tagesschicht erhält eine eigene stabile Tagesinstanz-ID. Sie speichert Datum, Herkunft, Reihenfolge, Kernzeit,
tatsächliche Arbeitszeit und Mehrfachbelegung. Sie verwendet weder eine Rastermodellschicht-ID noch die Rasterzeiten des
Schicht-Rastermodells. Konkrete Mitarbeiterschichten referenzieren abhängig von ihrer Planungsart eindeutig entweder eine
Rastermodellschicht oder eine Tagesschicht; gemischte und unvollständige Referenzen sind ungültig.

Die Monatsdarstellung eines Schicht-Tagesmodellplans besitzt keine globalen Rasterspalten. Jede Tageszeile zeigt ihre eigenen
Tagesschichten. Nach der initialen Tageskonfiguration werden Mitarbeiter per Drag-and-drop oder über eine gleichwertige
alternative Aktion zugeordnet. Tatsächliche Arbeitszeiten einschließlich Vor- und Nachbereitung fließen für beide
Planungsarten in denselben firmenweiten Belegungsindex, dieselbe Konfliktprüfung und dieselbe Pausenberechnung ein.

## Arbeitszeiten, Pausen und Konflikte

Die Pause ist keine feste Eigenschaft eines Rasterplatzes oder einer einzelnen konkreten Schicht. Für jeden Mitarbeiter
werden alle in den relevanten Planungsständen vorhandenen Schichten desselben Dienstplantags filialübergreifend nach Beginn
geordnet und zu zusammenhängenden Arbeitsblöcken gruppiert. Direkt aufeinanderfolgende Schichten und Unterbrechungen
unter 30 Minuten gehören zum selben Arbeitsblock. Eine Unterbrechung ab 30 Minuten trennt die Arbeitsblöcke. Überschneidende
Schichten desselben Mitarbeiters bleiben unzulässig.

Die Arbeitsdauer eines Blocks ist die Summe der Dauern seiner Schichten; dazwischenliegende Lücken zählen nicht als
Arbeitsdauer. Bis einschließlich 6 Stunden beträgt die bezahlte Pause 0 Minuten, bei mehr als 6 bis einschließlich 9 Stunden
30 Minuten und bei mehr als 9 Stunden 45 Minuten. Die Pause wird als Gesamtwert des Arbeitsblocks abgeleitet. Als technischer
Anker speichert ausschließlich die chronologisch letzte Schicht des Blocks die berechneten `pauseMinuten`; alle vorherigen
Schichten des Blocks speichern `0`. Diese Zuordnung bedeutet nicht, dass die Pause während der letzten Schicht genommen wird.
Änderungen durch Anlage, Löschung oder Verschiebung einer Schicht führen zu einer erneuten Berechnung der betroffenen
Arbeitsblöcke und ihrer gespeicherten Pausenwerte.

Im Monatsplan wird die bezahlte Gesamtpause bei der letzten Schicht des Arbeitsblocks angezeigt. Sie besitzt keine planbare
Beginn- oder Endzeit und reduziert die Lohnzeit nicht. Die veröffentlichte Dienstplanversion hält den berechneten Planungswert
als Momentaufnahme fest. Ob die Pause tatsächlich genommen wurde, wird nicht im Dienstplan vorweggenommen; eine spätere
Zeiterfassung beziehungsweise ein Stundenzettel übernimmt den Minutenwert und dokumentiert die tatsächliche Bestätigung
getrennt.

Im grundlegenden Planungsablauf zieht der Planer einen aktiven Mitarbeiter in eine Rasterzelle aus Modellschicht und Kalendertag
oder verwendet die gleichwertige Anlageaktion als Tastatur- und Mobilalternative. Datum und Modellschicht stehen dadurch bereits
fest; eine freie Auswahl oder Eingabe regulärer Schichtzeiten ist beim Anlegen der konkreten Schicht nicht vorgesehen. Beginn und
Ende werden aus dem gewählten Datum, der stabilen Modellschicht-ID und den für diese Tageszeile gespeicherten Rasterzeiten als
absolute Zeitpunkte gespeichert. Ist die Mehrfachbelegung der Modellschicht deaktiviert und die Rasterzelle bereits besetzt,
sind Anlageaktion und Drag-and-drop gesperrt. Der Schreibservice prüft die Begrenzung zusätzlich vor dem Speichern; die
Versionsrevision verhindert dabei, dass zwei gleichzeitige Anlagen eine Einfachbelegung umgehen.

Eine bereits angelegte Schicht kann in einem bearbeitbaren Entwurf per Drag-and-drop oder über eine gleichwertige Tastatur- und
Touch-Aktion in eine andere Rasterzelle verschoben werden. Mitarbeiterzuordnung und Schicht-ID bleiben erhalten; Zieltag und
Zielmodellschicht sowie die aus den Rasterzeiten der Zielzeile abgeleiteten Zeitwerte werden vollständig aus der Zielzelle
übernommen. Anschließend werden die Arbeitsblöcke und Pausen des Mitarbeiters für den Ausgangs- und Zieltag neu berechnet. Die
bisherige Rasterzelle bewirkt keinen eigenen Schreibzugriff. Belegung und zeitliche Konflikte werden für die Zielzelle nach
denselben Regeln wie bei einer Neuanlage geprüft. Veröffentlichte und archivierte Schichten sind nicht verschiebbar.

Schichtmodelle dürfen durch dieselben berechtigten Planer wie Dienstplanentwürfe verwaltet werden. Aktuell sind das Master- und
berechtigte Office-Konten. Filialkonten verwenden bis zur Umsetzung des betrieblichen `dienstplaner`-Sitzungszustands
ausschließlich die veröffentlichte Ansicht. Mitarbeiterzugänge lesen keine verwaltbaren Schichtmodelle; die für ihre
veröffentlichten Schichten benötigten Angaben stehen über die unveränderliche Schichtmodell-Momentaufnahme des Monatsplans und
die gespeicherten konkreten Schichtzeiten bereit.

## Abfrage- und Cache-Strategie

Jeder einzelne Dienstplanzugriff verwendet weiterhin einen konkreten vollständigen Filialpfad. Eine filialübergreifende Ansicht
lädt die Monatspläne der ausgewählten Filialen über getrennte direkte Zugriffe und führt sie ausschließlich im Frontend
zusammen. Collection-Group-Abfragen über mehrere Filialen oder eine gemeinsame jahresbezogene Dienstplan-Collection sind nicht
vorgesehen. Der Kalendermonat im Format `YYYY-MM` bleibt die Dokument-ID eines Monatsplans; ein einzelner bekannter Monat kann
dadurch ohne Zeitraumsuche direkt adressiert werden.

Für die Konfliktprüfung werden nicht sämtliche Dienstpläne aller möglichen Filialen geladen. Stattdessen beobachtet die
Planung für den ausgewählten Zeitraum und die sichtbaren Mitarbeiter die benötigten Tagesdokumente des firmenweiten
Belegungsindex über begrenzte Firestore-Snapshot-Listener. Änderungen aus einer anderen Filialplanung werden dadurch zeitnah im
Belegungs-Store sichtbar. Listener werden bei Änderungen von Firma, Filialauswahl, Monat oder Mitarbeitermenge ersetzt und beim
Verlassen der Planung beendet. Der Live-Stand dient der Darstellung und frühen Rückmeldung; verbindlich bleibt die erneute
transaktionale Prüfung beim Schreiben.

Pur Filiale lädt bei jedem Programmstart den vollständigen lesbaren Bestand der eigenen Filiale. Dazu werden über die
bestehende Stammdatenstrategie `cacheFirst` alle Firma-Mitarbeiter mit der eigenen Filial-ID und mit `networkFirst` alle
Dokumente der Collection `dienstplan` geladen. Anschließend lädt das Frontend für jeden Dienstplan dessen
Modell-Momentaufnahme, sämtliche Dokumente aus `version` und für jede Version sämtliche Dokumente aus `schicht`. Diese
Synchronisierung umfasst Entwürfe,
veröffentlichte und archivierte Versionen einschließlich ihrer Raster und Schichten und besitzt keine Begrenzung auf ein Jahr
oder einen sonstigen Zeitraum. Erst nach Abschluss der vollständigen Startladung gilt der fachliche Filialbestand als geladen.

Die vollständige Dienstplansynchronisierung verwendet `networkFirst`. Bei einem Online-Start wird der gesamte erlaubte
Dienstplanbestand vom Server gelesen und im persistenten, IndexedDB-basierten Firestore-Cache aktualisiert. Bei einem technischen
Serverfehler wird auf die bereits lokal vorhandenen Dokumente zurückgefallen. Noch nie erfolgreich geladene oder zwischenzeitlich
aus dem Cache entfernte Daten stehen offline nicht zur Verfügung; Firestore bleibt die verbindliche Datenquelle. Schreibvorgänge
werden nicht aus IndexedDB nachsynchronisiert, sondern benötigen weiterhin eine aktive Serververbindung.

Pur Master und Pur Office laden Dienstpläne mit `networkOnly`. Für jede ausgewählte Filiale lesen sie im gewählten
Kalendermonat das bekannte Dienstplandokument und dessen Modell-Momentaufnahme direkt, anschließend die über
`entwurfVersionId` beziehungsweise `veroeffentlichteVersionId` referenzierte Version sowie deren Schichten. Archivierte
Versionen werden nur für eine konkret
geöffnete Filialhistorie nachgeladen. Die Auswahl mehrerer Filialen erzeugt damit mehrere direkte Zugriffe und keine
filialübergreifende Firestore-Abfrage.

Pur Mitarbeiter verwendet ebenfalls `networkOnly`. Für jede fachlich erlaubte Filiale wird nur der Dienstplan des ausgewählten
Monats und dessen Modell-Momentaufnahme direkt geladen. Über `veroeffentlichteVersionId` werden ausschließlich die
veröffentlichte Version und deren Schichten gelesen. Entwürfe und archivierte Versionen werden weder abgefragt noch durch die
Oberfläche angezeigt. Die Firestore Rules gewähren gemäß Matrix Leserechte auf alle Dienstplanpfade der zugeordneten Filiale.
Nach dem Laden werden die eindeutigen Mitarbeiter-IDs der sichtbaren Schichten ermittelt. Bereits
im Mitarbeiter-Store vorhandene Einträge werden wiederverwendet; nur fehlende Mitarbeiterdokumente werden gezielt über ihre
Dokument-ID nachgeladen.

Die Dienstplanübersicht führt die veröffentlichten Monatsstände aller ausgewählten Filialen in einer gemeinsamen, lesenden
Ansicht zusammen. Innerhalb jeder Filiale werden die Schichten nach Kalendertagen gruppiert und mit Zeitspanne, Mitarbeiter,
bezahlter Pause sowie Veröffentlichungsstand angezeigt. Fehlt die veröffentlichte Referenz, gilt der Monat in der
Mitarbeiteransicht als nicht veröffentlicht; ein Entwurf wird nicht ersatzweise angezeigt. Wird eine Veröffentlichung später
ersetzt, erscheint nach der nächsten Netzwerkladung ausschließlich die neu referenzierte Version. Ein eigenständiger
Zurückziehungsablauf ist derzeit nicht vorgesehen; ein zukünftig zurückgezogener Stand ohne Veröffentlichungsreferenz würde
denselben Leerzustand verwenden.

Alle Auslieferungsvarianten lösen Anzeigename und `farbkennung` einer Schicht über deren `mitarbeiterId` aus den aktuellen
Mitarbeiterstammdaten auf. Master, Office und Filiale können dabei regelmäßig bereits geladene Mitarbeiter verwenden. Auch für
inaktive oder inzwischen einer anderen Filiale zugeordnete Mitarbeiter werden nur die im geöffneten Dienstplan tatsächlich
referenzierten Dokumente nachgeladen; ein vollständiges Laden aller ehemaligen Filialmitarbeiter ist nicht vorgesehen. Die
Firestore Rules müssen diese gezielten Lesezugriffe erlauben. Da Firestore keine Leserechte auf einzelne Dokumentfelder
unterstützt, umfasst eine solche Freigabe das vollständige Mitarbeiterdokument und wird vor der Umsetzung nochmals geprüft.

Die Startabfragen von Pur Filiale sind unbeschränkte Collection-Abfragen innerhalb eines bereits bekannten Filialpfads; die
anderen Varianten verwenden überwiegend direkte Dokumentzugriffe. Versionen und Schichten werden im Frontend nach Nummer und
Zeit sortiert. Dafür sind in der ersten Ausbaustufe keine zusätzlichen zusammengesetzten Firestore-Indizes vorgesehen. Die
bestehende Mitarbeiterabfrage mit `array-contains` auf `filialIds` verwendet die vorhandene automatische Feldindizierung.

Dienstplan, Version, Modell-Momentaufnahme und Schicht bleiben getrennte kleine Dokumente. Weder sämtliche Monate noch sämtliche
Schichten werden als wachsende Arrays in einem einzelnen Dokument gespeichert. Die Dokumentgröße wächst deshalb nicht mit der
Anzahl der Jahre, Versionen oder Schichten; lediglich die Anzahl der Dokumente und die Zahl der beim Filialstart ausgeführten
Lesezugriffe nimmt mit der Historie zu. Eine spätere Aufbewahrungs- oder Löschregel wird erst bei einem konkreten betrieblichen
Bedarf geplant.

Eine Version darf an einem Tag beliebig viele Schichten enthalten, soweit die jeweilige Modellschicht eine Mehrfachbelegung
erlaubt oder unterschiedliche Rasterzellen betroffen sind. Jede Schicht gehört in der ersten Ausbaustufe genau einem
aktiven Mitarbeiter, der beim Anlegen oder Bearbeiten der betroffenen Filiale zugeordnet sein muss. Schichten ohne Mitarbeiter
und eine gemeinsame Schicht für mehrere Mitarbeiter sind nicht vorgesehen. Derselbe Mitarbeiter darf auch in verschiedenen
Filialen mehrere nicht überlappende Schichten an einem Tag besitzen. Die Schicht speichert ausschließlich die `mitarbeiterId`
als Mitarbeiterzuordnung. Anzeigename
und `farbkennung` werden in allen Ansichten aus dem aktuellen Mitarbeiterdokument abgeleitet und nicht als Momentaufnahme in der
Schicht dupliziert. Reguläre Mitarbeiterdokumente bleiben deshalb auch bei Deaktivierung oder geänderter Filialzuordnung
dauerhaft erhalten. Ausschließlich Duplikate werden im Rahmen der Migrationsbereinigung zusammengeführt und physisch gelöscht,
bevor sie in Dienstplänen referenziert werden.

Eine Schicht speichert die ID ihrer Modellschicht aus der Schichtmodell-Momentaufnahme ihres Monatsplans. Beginn und Ende
werden aus dem gewählten Datum und den Rasterzeiten der Tagesmomentaufnahme als absolute Zeitpunkte gespeichert. Dadurch können
auch Schichten über Mitternacht eindeutig abgebildet werden. Die bezahlte Pause wird aus dem zusammenhängenden Arbeitsblock des
Mitarbeiters abgeleitet und als `pauseMinuten` ausschließlich auf dessen letzter Schicht festgehalten. Die Lohnzeit einer Schicht
entspricht weiterhin der vollständigen Zeitspanne von Beginn bis Ende und wird nicht redundant gespeichert. Ende vor oder
gleich Beginn ist ungültig; überlappende Schichten desselben Mitarbeiters bilden einen blockierenden Konflikt.

Während einer Pause genügt eine durchgängige Aufsicht durch eine Person. Ist nur ein Mitarbeiter im Dienst, übernimmt der
Techniker während dessen Pause die Aufsicht. Sind zwei Mitarbeiter im Dienst, vertreten sie sich während ihrer Pausen
gegenseitig. Eine verpflichtende Doppelbesetzung besteht nicht und wird deshalb weder als Planungsvoraussetzung noch als
Planungskonflikt berücksichtigt.

Eine Schicht darf nur gespeichert oder geändert werden, wenn ihre Zeitwerte strukturell gültig sind und sie sich nicht mit einer
relevanten Belegung desselben Mitarbeiters überschneidet. Die verbindliche Prüfung liest in derselben Firestore-Transaktion die
betroffenen Tagesdokumente des firmenweiten Belegungsindex und aktualisiert sie gemeinsam mit Schicht und Versionsrevision.
Dadurch konkurrieren parallele Einplanungen desselben Mitarbeiters um dieselben Tagesdokumente und eine inzwischen entstandene
Überschneidung wird vor dem Schreiben erneut erkannt. Schichten über Mitternacht berücksichtigen jeden berührten Kalendertag
in der Zeitzone des Dienstplans.

Die Prüfung umfasst relevante Entwürfe und veröffentlichte Stände aller Filialen des Mitarbeiters, unabhängig von der
sichtbaren Filialauswahl. Kann der dafür erforderliche Belegungsstand wegen fehlender Berechtigung, einer unvollständigen
Initialladung oder eines Listenerfehlers nicht zuverlässig ermittelt werden, bleibt die betreffende Planungsaktion gesperrt.
Die Konfliktprüfung erweitert keine bestehenden Datenrechte. Weitergehende Hinweise zu langen Arbeitszeiten, kurzen Ruhezeiten
oder gesetzlichen Grenzen sind nicht Teil der ersten Ausbaustufe. Automatische Planung, Abwesenheiten, Zeiterfassung,
Schichttausch und Benachrichtigungen werden erst bei konkretem fachlichem Bedarf separat geplant.

## Rollen und Filialgrenzen

Die Navigation und die Route zum Schichtplan erfordern für jede Rolle den App-Bereich `schichtplan`. Diese Bereichsfreigabe
gewährt keine Datenrechte. Die tatsächlichen Rechte ergeben sich unabhängig davon aus aktivem Benutzerprofil, Auth-Rolle und
vollständiger Filialzuordnung.

Die verbindlichen Collection-Rechte und Bedingungen stehen in der
[Berechtigungsmatrix](../matrizen/berechtigungen.md). Kurz zusammengefasst:

- `master` plant in allen Filialen und `office` nur in freigegebenen Filialen. Filialkonten verwenden in der aktuellen
  Oberfläche ausschließlich die veröffentlichte Ansicht.
- Die Firestore Rules gewähren `master`, `office` und `filiale` die in der Matrix aufgeführten Pfad- und CRUD-Rechte. Welche
  Rollen die Planungsoberfläche anbietet und welche Zustände bearbeitet oder gelöscht werden dürfen, prüft der
  TypeScript-Code.
- `mitarbeiter` besitzt in zugeordneten Filialen Leserechte auf alle Dienstplanpfade und keine Schreibrechte. Das Frontend lädt
  und zeigt ausschließlich die aktuelle veröffentlichte Version mit ihren Schichten.

Die spätere Freigabe von Planungsaktionen in der Filial-App ist auf einen aktiven Firma-Mitarbeiter der eigenen Filiale mit der
betrieblichen Rolle `dienstplaner` begrenzt. Dieser Sitzungszustand ist noch nicht umgesetzt; Filialkonten bleiben deshalb in
der aktuellen Oberfläche rein lesend. Die Rolle erweitert nicht die Firestore-Rechte des Mitarbeiterzugangs. Die Firestore
Rules erkennen bei einem Filialkonto ausschließlich die Auth-Rolle `filiale` und den eigenen Filialpfad; sie können den im
Frontend geführten Firma-Mitarbeiter und dessen Rolle nicht vertrauenswürdig prüfen. Die zusätzliche Rollenprüfung wäre
daher bei einem manipulierten Client umgehbar und keine serverseitig abgesicherte Berechtigungsgrenze.

Jeder Zugriff auf einen Dienstplan bezieht sich auf eine konkrete Filiale. Benutzer mit Zugriff auf mehrere Filialen können
mehrere konkrete Filialen gleichzeitig auswählen und deren Monatspläne in einer gemeinsamen Ansicht laden. Jede dargestellte
Schicht bleibt eindeutig ihrer Filiale zugeordnet. Beim Anlegen eines Monatsdienstplans wird zuerst die Zielfiliale bestimmt;
danach stehen nur deren aktive Schichtmodelle zur Auswahl. Beim anschließenden Besetzen einer Rasterzelle stehen nur die in der
betroffenen Filiale einsetzbaren Mitarbeiter zur Auswahl. Speicherung, Versionierung und Veröffentlichung bleiben je
Filialdienstplan getrennt. Ausschließlich der firmenweite Belegungsindex wird als gemeinsame Prüfstruktur in die atomaren
Schicht- und Statusänderungen einbezogen; daraus entsteht keine gemeinsame filialübergreifende Veröffentlichung.

## Planungs- und Veröffentlichungsablauf

Existiert für einen Monat noch kein Dienstplan, wählt ein berechtigter Planer ein aktives Schichtmodell der Filiale und legt den
Dienstplan mit seiner Modell-Momentaufnahme sowie Version 1 im Status `entwurf` an. Die Modellschichten bilden die Spalten des
Monatsrasters; die Kalendertage bilden dessen Zeilen. Solange die Version ein Entwurf ist, dürfen berechtigte Planer die
Rasterzellen per Drag-and-drop oder über die alternative Anlageaktion mit Mitarbeitern besetzen und vorhandene Schichten
bearbeiten oder in eine andere zulässige Rasterzelle verschieben. Wurde der Monatsplan noch nie veröffentlicht und enthält sein
aktueller Entwurf keine Schichten, darf der vollständige Dienstplan nach Bestätigung gelöscht werden. Danach kann er mit einem
anderen aktiven Schichtmodell derselben Filiale neu angelegt werden. Sobald eine Schicht vorhanden ist, ist die Löschaktion
gesperrt. Nach dem Löschen aller Schichten ist sie wieder möglich. Das Löschen einzelner Schichten bleibt erlaubt.

Die Veröffentlichung setzt eine vollständig geprüfte und konfliktfreie Entwurfsversion voraus. Sie setzt deren Status auf
`veroeffentlicht`. Existiert bereits eine veröffentlichte Version, wird diese im selben konsistenten Schreibvorgang auf
`archiviert` gesetzt. Ein Zurückziehen einer veröffentlichten Version ohne unmittelbar veröffentlichte Ersatzversion ist in der
ersten Ausbaustufe nicht vorgesehen.

Eine nachträgliche Änderung beginnt immer mit einer neuen Entwurfsversion. Die Schichten der veröffentlichten Version werden
als bearbeitbare Kopien übernommen; die neue Version verwendet weiterhin die unveränderliche Modell-Momentaufnahme des
Monatsplans.
Das Löschen des Monatsplans ist nach der ersten Veröffentlichung nicht mehr möglich. Der bisher veröffentlichte Stand bleibt für
Mitarbeiter sichtbar, bis der neue Entwurf erfolgreich veröffentlicht wurde. Veröffentlichte und archivierte Versionen bleiben
unveränderliche historische Stände.

Dienstplan, Version und Schicht speichern die UID und den Zeitpunkt ihrer Erstellung und letzten Änderung. Eine Version
speichert zusätzlich UID und Zeitpunkt ihrer Veröffentlichung beziehungsweise Archivierung. Die unveränderlichen archivierten
Versionen bilden in der ersten Ausbaustufe das fachliche Änderungsprotokoll; ein separates Ereignisprotokoll ist nicht
vorgesehen.

Beim Anlegen oder Bearbeiten einer Schicht dürfen nur aktive Mitarbeiter ausgewählt werden, die der konkreten Filiale zugeordnet
sind. Wird ein bereits in einem Entwurf verwendeter Mitarbeiter deaktiviert oder aus der Filiale entfernt, bleibt die Schicht
zur Nachbearbeitung sichtbar, blockiert aber die Veröffentlichung. Veröffentlichte und archivierte Schichten bleiben
unverändert und lösen Anzeigename sowie `farbkennung` weiterhin über die gespeicherte `mitarbeiterId` aus dem dauerhaft
erhaltenen Mitarbeiterdokument auf. Spätere Stammdatenänderungen werden dadurch auch in historischen Dienstplanansichten
sichtbar.

## Vorbereitete Modelltests und Probeablauf

Die Modelltests werden mit den fachlichen Hilfsfunktionen der Grundfunktion umgesetzt. Sie decken folgende Fälle ab:

- Ein Monatsbezeichner im Format `YYYY-MM` wird auf den ersten und letzten Kalendertag normalisiert. Dabei werden Monate mit 28,
  29, 30 und 31 Tagen sowie ungültige Monatsbezeichner geprüft.
- Die Lohnzeit entspricht der vollständigen Zeitspanne von Beginn bis Ende. Die bezahlte Pause eines Arbeitsblocks reduziert
  weder die Lohnzeit einer einzelnen Schicht noch deren Summe. Schichten am selben Tag und über Mitternacht werden geprüft;
  Ende vor oder gleich Beginn ist ungültig.
- Pausentests decken einzelne Schichten, unmittelbar folgende Schichten, Lücken unter 30 Minuten, Lücken ab 30 Minuten, die
  Schwellenwerte von 6 und 9 Stunden sowie filialübergreifende Arbeitsblöcke ab.
- Eine Frühschicht von 08:00 bis 16:30 Uhr bleibt am gewählten Kalendertag. Eine Spätschicht von 16:30 bis 01:00 Uhr endet am
  Folgetag. Änderungen am ursprünglichen Schichtmodell verändern die im Monatsplan gespeicherte
  Schichtmodell-Momentaufnahme nicht.
- Neue Versionen beginnen als `entwurf` mit Revision 0. Zulässig sind nur die Übergänge von `entwurf` zu `veroeffentlicht` und
  bei einer Ersatzveröffentlichung von `veroeffentlicht` zu `archiviert`; historische Stände bleiben unveränderlich.
- Normalisierte Dienstplan-, Versions- und Schichtdaten behalten ihre IDs, Referenzen und Metadaten, speichern aber keine
  berechnete Lohnzeit redundant.

Als Probeablauf dient der Monatsplan `2026-10` einer Filiale mit dem Schichtmodell `Standard`. Das Modell enthält die geordneten
Modellschichten `Frühschicht` von 08:00 bis 16:30 Uhr und `Spätschicht` von 16:30 bis 01:00 Uhr des Folgetags. Beim Anlegen des
Monatsplans wird das Modell vollständig in die Momentaufnahme des Monatsplans übernommen und bildet dessen beide Schichtspalten.
Mitarbeiter A erhält am 5. Oktober eine Frühschicht und am 6. Oktober eine Spätschicht. Mitarbeiter B erhält am 5. Oktober
eine Spätschicht.
Der Plan wird zusammen mit Version 1 als Entwurf mit Revision 0 angelegt. Jede der drei Schichttransaktionen erhöht die Revision
um eins, sodass die geprüfte Version vor der Veröffentlichung Revision 3 besitzt. Die Veröffentlichung erhöht sie auf Revision
4, entfernt den Entwurfsverweis und setzt Version 1 als veröffentlichte Version. Mitarbeiterzugänge lesen danach nur diesen
Stand. Eine spätere Änderung beginnt mit Version 2 als neuem Entwurf, übernimmt die Schichten aus Version 1 und verwendet
weiterhin das unveränderliche Raster des Monatsplans. Bei ihrer Veröffentlichung wird Version 1 im selben atomaren
Schreibvorgang archiviert.

## Frontend-Transaktionen und parallele Bearbeitung

Sämtliche fachlichen Dienstplanaktionen werden durch das Angular-Frontend über den Firestore Client ausgeführt. Für das
Anlegen, Kopieren, Bearbeiten, Verschieben, Löschen, Archivieren und Veröffentlichen von Dienstplandaten werden keine Cloud
Functions oder anderen serverseitigen Fachaktionen eingesetzt. Firestore Rules bleiben die verbindliche serverseitige
Zugriffskontrolle, führen aber selbst keine fachlichen Aktionen aus.

Jede Dienstplanversion besitzt eine ganzzahlige `revision`. Eine neu angelegte Entwurfsversion beginnt mit Revision 0. Jede
spätere Änderung einer Schicht und jeder Statuswechsel der Version erhöht die Revision genau um eins. Anlegen, Bearbeiten,
Verschieben und Löschen einer Schicht erfolgen in einer Firestore-Transaktion, die zuerst das gemeinsame Versionsdokument und
die betroffenen Tagesdokumente des Belegungsindex liest. Beim Verschieben werden die Belegungstage des bisherigen und des neuen
Zeitraums gemeinsam aktualisiert. Die Transaktion schreibt nur, wenn die Version weiterhin den Status `entwurf`, die vom
Frontend erwartete Revision und der Belegungsindex weiterhin einen konfliktfreien Stand besitzen. Zusammen mit der
Schichtänderung aktualisiert sie Belegungsindex, Revision, Änderungszeitpunkt und ändernde Benutzer-UID.

Vor dem Löschen lädt das Frontend das Dienstplandokument und die Schichten des aktuellen Entwurfs verbindlich vom Server. Die
Löschung ist nur zulässig, wenn der Dienstplan keine veröffentlichte Version referenziert und der Entwurf leer ist. Dienstplan,
Entwurfsversion und Modell-Momentaufnahme werden gemeinsam entfernt. Da eine parallele Schichtanlage dasselbe Versionsdokument
mit der erwarteten Revision schreiben muss, kann nur einer der beiden konkurrierenden Vorgänge erfolgreich sein. Nach der
ersten Veröffentlichung verhindert der im TypeScript-Code geprüfte Dienstplanstatus die Löschung.

Da jede Schichtänderung dasselbe Versionsdokument einbezieht, werden auch gleichzeitige Änderungen an unterschiedlichen
Schichten erkannt. Bei einer abweichenden Revision wird die veraltete Änderung nicht gespeichert. Das Frontend lädt den
aktuellen Dienstplan neu und fordert den Benutzer auf, seine Änderung anhand des neuen Stands erneut zu prüfen. Formulare
bleiben während des Schreibvorgangs deaktiviert und verhindern wiederholte Submit-Aufrufe.

Vor einer Veröffentlichung lädt das Frontend alle Schichten des Entwurfs, merkt sich die geladene Revision und führt die
fachliche Konfliktprüfung durch. Die anschließende Veröffentlichungstransaktion prüft erneut Status und Revision. Nur wenn die
Revision seit der Prüfung unverändert ist, werden der Entwurf veröffentlicht und eine gegebenenfalls bisher veröffentlichte
Version im selben atomaren Schreibvorgang archiviert. Bei einer zwischenzeitlichen Änderung wird die Veröffentlichung
abgebrochen; das Frontend lädt den aktuellen Stand und wiederholt die Konfliktprüfung.

Transaktionen und zusammengehörige Batches werden nur als vollständig erfolgreicher Schreibvorgang übernommen. Bei einem Fehler
bleibt der bisherige Firestore-Stand erhalten. Offline-Schreibvorgänge sind weiterhin nicht vorgesehen; Dienstplantransaktionen
benötigen eine aktive Firestore-Verbindung.

Firestore Rules prüfen für normale Clientänderungen ausschließlich aktives Profil, Rolle, Filialzugriff und CRUD-Recht gemäß
Berechtigungsmatrix. Entwurfsstatus, Benutzer-UID, Revision, Referenzen und gemeinsam zu ändernde Belegungsdokumente validiert
der TypeScript-Code innerhalb der Firestore-Transaktion. Ohne vertrauenswürdige serverseitige Fachlogik bleiben diese Prüfungen
bei einem absichtlich manipulierten Client umgehbar.

## Abgrenzung späterer Erweiterungen

Automatische Planung und Optimierung, Urlaubs-, Krankheits- und sonstige Abwesenheitsverwaltung, Sollstunden,
Arbeitszeitkonten, gesetzliche Gesamtprüfungen, Schichttausch, Freigabewünsche, Mitarbeiterbestätigungen,
Push-Benachrichtigungen, Zeiterfassung, Exporte, Lohnabrechnungsanbindungen sowie die Ermittlung von Lohnstunden mit Nacht-,
Sonntags- und Feiertagszuschlägen sind nicht Teil der ersten Ausbaustufe. Die Lohnzeit bildet dafür später den zeitlichen
Ausgangswert.
Offline-Schreibvorgänge werden nur bei einem konkreten fachlichen Bedarf gemeinsam mit dem zurückgestellten Todo 9 geplant.
Ein späterer Änderungs- oder Tauschwunsch eines Mitarbeiters wird als eigener Antrag mit nachvollziehbarem Bearbeitungsstatus
wie `offen`, `angenommen`, `abgelehnt` oder `zurueckgezogen` modelliert. Er verändert keinen Dienstplan unmittelbar; erst ein
berechtigter Planer übernimmt einen angenommenen Wunsch in eine Entwurfsversion und veröffentlicht anschließend den geprüften
neuen Stand.
