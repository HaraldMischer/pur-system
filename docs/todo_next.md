<!-- pur-system/docs/todo_next.md -->

# Offene Todos

## Legende

- `[x]` erledigt
- `[ ]` offen
- `[-]` zurückgestellt

## 25. Feiertage, Gedenk- und Trauertage fachlich neu ordnen

### Ziel

Der bisherige lokale Feiertagskatalog wird anhand offizieller Rechtsquellen fachlich neu bewertet. Gesetzlicher Feiertagsstatus,
systemdefinierte besondere Tage, verbindliche Sperr- und Spielverbotszeiten, steuerlich begünstigte Zuschlagszeiträume und
betriebliche Öffnungszeiten werden als unabhängige Auswirkungen eines Kalendertags modelliert. Bewegliche Tage werden
weiterhin ohne externe Laufzeitabhängigkeit lokal und deterministisch berechnet.

Für den Betrieb von Spielhallen in Nordrhein-Westfalen werden die rechtlich relevanten Sperr- und Spielverbotszeiten getrennt
vom bloßen Kalenderdatum betrachtet. Insbesondere Volkstrauertag, Totensonntag, Karfreitag, Allerheiligen und Heiligabend werden
auf ihre Einordnung, Berechnungsregel und zeitliche Vorbelegung geprüft. Bestehende Filialeinstellungen werden kontrolliert
abgeglichen; bereits angelegte Dienstplan-Momentaufnahmen bleiben unverändert.

### Betroffene Dateien

Änderungen:

- src/app/commons/constants/filialeinstellung.constants.ts
- src/app/commons/models/domain/filialeinstellung.ts
- src/app/commons/utils/filialeinstellung/feiertag.ts
- src/app/commons/utils/filialeinstellung/feiertag.spec.ts
- src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.ts
- src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.spec.ts
- src/app/commons/utils/dienstplan/dienstplan-kalendertage.ts
- src/app/commons/utils/dienstplan/dienstplan-kalendertage.spec.ts
- src/app/services/domain/filialeinstellung.service.ts
- src/app/services/domain/filialeinstellung.service.spec.ts
- src/app/stores/domain/filialeinstellung.store.ts
- src/app/stores/domain/filialeinstellung.store.spec.ts
- src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.ts
- src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.html
- src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.spec.ts
- src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.ts
- src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.html
- src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.spec.ts
- docs/architektur/components/einstellungen.md
- docs/architektur/services/filialeinstellung-service.md
- docs/architektur/stores/filialeinstellung-store.md
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/matrizen/oeffnungszeiten.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

### Schritt 1: Tage und Rechtsgrundlagen fachlich einordnen

- [ ] Die Matrix `docs/matrizen/oeffnungszeiten.md` als verbindliche fachliche Pflegequelle verwenden und
      Änderungen mit Rechtsgrundlage, Gültigkeitszeitraum und Prüfstatus dokumentieren.
- [ ] Den vorhandenen Feiertagskatalog für Nordrhein-Westfalen vollständig mit den aktuellen offiziellen Rechtsquellen
      abgleichen und die verwendeten Quellen nachvollziehbar dokumentieren.
- [ ] Gesetzlichen Feiertagsstatus, systemdefinierte besondere Tage, Sperr- und Spielverbotszeiten, Zuschlagszeiträume und
      betriebliche Öffnungszeiten fachlich sowie technisch unabhängig voneinander abbilden.
- [ ] Festlegen, welche Tage für Spielhallen in Nordrhein-Westfalen zusätzlich zu den gesetzlichen Feiertagen relevant sind.
- [ ] Für Volkstrauertag, Totensonntag, Karfreitag, Allerheiligen und Heiligabend die jeweils geltenden Sperr- und
      Spielverbotszeiten, ihren Geltungsbereich und ihre rechtliche Grundlage prüfen.
- [ ] Entscheiden, ob rechtliche Sperrzeiten automatisch aktiviert, nur zeitlich vorbelegt oder ausschließlich als Hinweis
      angeboten werden. Eigene betriebliche Anpassungen und rechtlich zwingende Grenzen müssen erkennbar getrennt bleiben.

### Schritt 2: Lokale Datums- und Regelberechnung erweitern

- [ ] Eine allgemeine systemdefinierte Datumsregel für berechnete Gedenk-, Trauer- und stille Tage modellieren, ohne sie
      fälschlich als gesetzliche Feiertage zu kennzeichnen.
- [ ] Volkstrauertag als zweiten Sonntag vor dem ersten Advent und Totensonntag als letzten Sonntag vor dem ersten Advent lokal
      und deterministisch berechnen.
- [ ] Bestehende Berechnungen für Ostern und davon abhängige Feiertage sowie den Buß- und Bettag auf fachliche Vollständigkeit
      und einheitliche Benennung prüfen.
- [ ] Fachregeln mit stabiler ID, Bundesland, Rechtsgrundlage und geeignetem Gültigkeitszeitraum versionierbar beschreiben, damit
      spätere Rechtsänderungen keine historischen Ergebnisse verfälschen.
- [ ] Externe Kalenderdienste höchstens als Entwicklungs- oder Prüfhilfe verwenden; die produktive Datumsauflösung darf keine
      unkontrollierte externe Laufzeitabhängigkeit erhalten.

### Schritt 3: Bestehende Filialeinstellungen kontrolliert abgleichen

- [ ] Neue systemdefinierte Tage bei bestehenden Filialen ergänzen, ohne benutzerdefinierte Sondertage oder angepasste
      Öffnungsregeln zu überschreiben.
- [ ] Beim Abgleich stabile System-IDs verwenden und vorhandene systemdefinierte Einstellungen erhalten, sofern ihre fachliche
      Regel weiterhin gültig ist.
- [ ] Kollisionen zwischen gesetzlichen Feiertagen, berechneten Gedenk- oder Trauertagen, festen Sondertagen und einmaligen
      Datumsausnahmen weiterhin eindeutig erkennen und nach der bestehenden Priorität auflösen.
- [ ] Sicherstellen, dass die neue Berechnung nur zukünftige Auflösungen und neu angelegte Dienstpläne beeinflusst. Bereits
      gespeicherte Kalendertage und Rasterzeiten bestehender Dienstpläne bleiben als Momentaufnahme unverändert.
- [ ] Einen nachvollziehbaren Datenübergang für bereits initialisierte Filialen festlegen und dokumentieren.

### Schritt 4: Oberfläche verständlich anpassen

- [ ] Eine verständliche Darstellung für Gedenk- und Trauertage beziehungsweise stille Tage festlegen und prüfen, ob dafür ein
      eigener Abschnitt oder eine erkennbare Untergruppe der jährlichen Sondertage sinnvoller ist.
- [ ] Systemdefinierte Bezeichnung, berechnete Datumsregel und rechtliche Herkunft unveränderlich darstellen; nur die fachlich
      zulässigen Einstellungen bearbeitbar machen.
- [ ] Rechtlich vorgegebene Sperrzeit, daraus abgeleitete mögliche Öffnungszeit und eine eigene betriebliche Einstellung
      verständlich unterscheiden.
- [ ] Für deaktivierte Regeln weiterhin deutlich anzeigen, dass die normale Wochentagsregel gilt, der Tag seine kalendarische
      Eigenschaft jedoch behält.
- [ ] Darstellung und Bearbeitung auf Desktop sowie einem kleinen Touch-Viewport prüfen.

### Tests und Abschluss

- [ ] Unit-Tests für Volkstrauertag und Totensonntag über mehrere Jahre und alle möglichen Datumsbereiche ergänzen.
- [ ] Die bestehenden Oster-, Buß- und Bettags- sowie festen Feiertagsberechnungen mit bekannten Referenzdaten und
      Jahresgrenzen absichern.
- [ ] Tests für Kategorien, Aktivstatus, Sperrzeitvorbelegung, Kollisionen und die Priorität
      `Ausnahme → Sondertag → Wochentag` ergänzen.
- [ ] Service- und Store-Tests für die kontrollierte Ergänzung neuer Systemtage bei bestehenden Filialeinstellungen ergänzen.
- [ ] Dienstplantests ergänzen, die den kalendarischen Status, die wirksame Öffnungsregel und die unveränderliche
      Monatsplan-Momentaufnahme prüfen.
- [ ] Die Ergebnisse stichprobenartig für mehrere Kalenderjahre mit den dokumentierten offiziellen Quellen vergleichen.
- [ ] Fachkonzept, Architektur, Projektplan und Projektstand auf die beschlossene Einordnung und Berechnung aktualisieren.
- [ ] `npm test`, die betroffenen Produktionsbuilds und die manuelle Prüfung der Öffnungszeitenverwaltung erfolgreich
      ausführen.

### Erledigt, wenn

- [ ] Die verbindliche Matrix enthält für alle berücksichtigten Tage Datumsregel, Kalendereigenschaften, betriebliche
      Vorbelegung, Sperr- oder Spielverbotszeit, Zuschlagsprofil, Rechtsgrundlage, Gültigkeitszeitraum und Prüfstatus.
- [ ] Gesetzlicher Feiertagsstatus, systemdefinierte besondere Tage, Sperr- und Spielverbotszeiten, Zuschlagszeiträume und
      betriebliche Öffnungszeiten können sich unabhängig voneinander auf denselben Kalendertag auswirken.
- [ ] Volkstrauertag und Totensonntag werden für jedes unterstützte Jahr lokal korrekt berechnet und in den
      Filialeinstellungen verständlich dargestellt.
- [ ] Die für Spielhallen in Nordrhein-Westfalen relevanten Sperr- und Spielverbotszeiten sind nachvollziehbar einer offiziellen
      Rechtsgrundlage und einem Gültigkeitszeitraum zugeordnet.
- [ ] Bestehende Filialeinstellungen werden ohne Verlust eigener Anpassungen um neue Systemtage ergänzt.
- [ ] Bereits angelegte Dienstpläne bleiben durch ihre gespeicherten Momentaufnahmen unverändert.
- [ ] Die produktive Datumsauflösung funktioniert ohne externen Kalenderdienst.
- [ ] Automatisierte Tests, Produktionsbuilds, Dokumentation und manuelle Prüfung sind erfolgreich.

## 26. Frei verteilbare Schichtbausteine pro Tag umsetzen

### Ziel

Neben dem bestehenden festen Schichtraster wird die bereits vorbereitete Planungsart `schichtbausteine` vollständig umgesetzt.
Eine Filiale verwaltet dafür einen Katalog wiederverwendbarer Schichtbausteine. Für jeden Kalendertag eines Monatsplans können
beliebig viele passende Bausteine ausgewählt, angeordnet und als unveränderliche Tagesmomentaufnahme übernommen werden.

Unterschiedliche Tage dürfen dadurch eine unterschiedliche Anzahl, Identität und Reihenfolge von Schichten enthalten. Das
bestehende Schichtraster bleibt unverändert verfügbar. Ein Schichtmodell und der daraus angelegte Monatsplan gehören weiterhin
genau einer Planungsart; ein nachträglicher Wechsel innerhalb desselben Monatsplans ist ausgeschlossen.

### Betroffene Dateien

Änderungen:

- src/app/commons/models/domain/schichtmodell.ts
- src/app/commons/models/domain/dienstplan.ts
- src/app/commons/models/domain/dienstplan-kalendertag.ts
- src/app/commons/models/domain/schicht.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/components/schichtplan/dienstplan-anlegen-dialog/
- src/app/components/schichtplan/dienstplan-planungsbereich/
- src/app/components/schichtplan/dienstplan-monatstabelle/
- src/app/components/schichtplan/schicht-bearbeiten-dialog/
- src/app/components/schichtplan/schichtmodelle-filiale/
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/services/domain/schichtmodell.service.ts
- src/app/services/domain/schichtmodell.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- src/app/stores/domain/schichtmodell.store.ts
- src/app/stores/domain/schichtmodell.store.spec.ts
- firestore.rules
- firestore.rules.spec.ts
- docs/matrizen/berechtigungen.md
- docs/architektur/components/schichtplan.md
- docs/architektur/services/dienstplan-service.md
- docs/architektur/services/schichtmodell-service.md
- docs/architektur/stores/dienstplan-store.md
- docs/architektur/stores/schichtmodell-store.md
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

Neu hinzuzufügen:

- src/app/commons/models/domain/schichtbaustein.ts
- src/app/commons/validators/schichtbaustein.validator.ts
- src/app/commons/validators/schichtbaustein.validator.spec.ts
- src/app/components/schichtplan/schichtbaustein-bearbeiten-dialog/
- src/app/components/schichtplan/schichtbausteine-filiale/

### Schritt 1: Fachliche Arbeitsweise festlegen

- [x] Festlegen, dass ein Schichtmodell genau einer Planungsart angehört und der Monatsdienstplan diese Planungsart beim Anlegen
      unveränderlich übernimmt. Die Auswahl erfolgt vor der Auswahl eines dazu passenden Schichtmodells.
- [ ] Festlegen, ob ein Baustein feste Beginn- und Endzeiten, eine verschiebbare Dauer oder beide Varianten speichern darf.
- [ ] Festlegen, ob derselbe Baustein an einem Kalendertag mehrfach verwendet und nach der Übernahme zeitlich angepasst werden
      darf.
- [ ] Festlegen, ob Bausteine ausschließlich innerhalb der wirksamen Kundenöffnung liegen müssen oder wie beim Schichtraster
      ausdrücklich Vor- und Nachbereitungszeiten außerhalb der Öffnung abbilden dürfen.
- [ ] Festlegen, wie geschlossene Tage, Sondertage und einmalige Datumsausnahmen die verfügbaren Bausteine begrenzen.
- [ ] Festlegen, wie Reihenfolge, zeitliche Überlappungen und mehrere Mitarbeiter auf demselben Tagesbaustein behandelt werden.
- [ ] Entscheiden, ob ein Bausteinkatalog je Filiale genügt oder zusätzlich bezeichnete Bausteinmodelle als auswählbare
      Kataloggruppen benötigt werden.

### Schritt 2: Datenmodell und Momentaufnahme definieren

- [ ] Schichtbausteine mit stabiler ID, Bezeichnung, Aktivstatus, Zeitdefinition und optionaler Mehrfachbelegung modellieren.
- [ ] Die konkrete Verwendung eines Bausteins am Kalendertag mit eigener stabiler Tagesinstanz-ID abbilden, damit Verschieben,
      Belegung und spätere Veröffentlichungen eindeutig auf dieselbe Schichtinstanz verweisen.
- [ ] Alle für die Darstellung und Berechnung erforderlichen Bausteindaten beim Einfügen als Tagesmomentaufnahme speichern.
      Spätere Änderungen am Katalog dürfen vorhandene Monatspläne nicht verändern.
- [ ] Modellreferenz, Planungsart und Tagesinstanzen in Entwurfs-, veröffentlichten und archivierten Versionen eindeutig
      abgrenzen.
- [ ] Festlegen, ob das Entfernen eines bereits belegten Tagesbausteins verhindert oder zusammen mit seinen konkreten Schichten
      nach ausdrücklicher Bestätigung ausgeführt wird.
- [ ] Fachliche Feld-, Zeit- und Zustandsvalidierung ausschließlich im TypeScript-Code und dessen Tests vorsehen.

### Schritt 3: Bausteinkatalog verwalten

- [ ] In der Schichtmodellverwaltung den bisher deaktivierten Einstieg `Schichtbausteine` freischalten.
- [ ] Bausteine filialbezogen anlegen, bearbeiten, deaktivieren und verständlich nach Zeit oder fachlicher Reihenfolge anzeigen.
- [ ] Während eines Schreibvorgangs das vollständige Formular und alle datenverändernden Aktionen deaktivieren.
- [ ] Verwendete Bausteine nicht physisch aus historischen Plänen entfernen; Deaktivierung wirkt nur auf zukünftige Auswahl.
- [ ] Leere, unvollständige oder zeitlich ungültige Bausteine zuverlässig verhindern und verständliche Fehler anzeigen.

### Schritt 4: Tagesplanung mit Bausteinen umsetzen

- [ ] Bei der Dienstplananlage zuerst die Planungsart und danach ausschließlich ein dazu passendes Modell auswählen.
- [ ] Für jeden Kalendertag Bausteine aus dem aktiven Katalog hinzufügen, entfernen und in eine fachlich verständliche
      Reihenfolge bringen können.
- [ ] Eine für Desktop und kleine Touch-Viewports geeignete Darstellung für Tage mit unterschiedlicher Schichtanzahl umsetzen.
- [ ] Mitarbeiter per Drag-and-drop sowie über eine gleichwertige alternative Aktion einem Tagesbaustein zuordnen und zwischen
      zulässigen Bausteinen verschieben können.
- [ ] Nicht verfügbare, geschlossene oder mit einer verbindlichen Zeitgrenze kollidierende Ziele sperren, ohne den bestehenden
      Plan zu verändern.
- [ ] Leere Tage und Tage mit vielen Bausteinen verständlich darstellen, ohne ein künstlich gleichförmiges Raster zu erzeugen.

### Schritt 5: Konflikte, Pausen und Veröffentlichung übernehmen

- [ ] Schichten aus Tagesbausteinen in denselben firmenweiten Belegungsindex wie Rasterplanschichten aufnehmen.
- [ ] Filialübergreifende Überschneidungen, konkurrierende Schreibzugriffe und unvollständige Konfliktprüfungen weiterhin
      zuverlässig blockieren.
- [ ] Arbeitsblöcke und bezahlte Pausen unabhängig von der Planungsart aus den konkreten Schichtzeiten berechnen.
- [ ] Entwurfsversionen, Veröffentlichungen und neue Entwürfe aus einem veröffentlichten Stand für Schichtbausteinpläne
      atomar und historisch stabil umsetzen.
- [ ] Die veröffentlichte Dienstplanansicht so erweitern, dass Raster- und Bausteinpläne ohne Verlust ihrer fachlichen Struktur
      lesbar dargestellt werden.
- [ ] Firestore Rules erst nach Ergänzung der Pfade und CRUD-Rechte in der Berechtigungsmatrix anpassen.

### Tests und Abschluss

- [ ] Modell-, Validator-, Service- und Store-Tests für Katalog, Tagesmomentaufnahme und beide Planungsarten ergänzen.
- [ ] Anlage, Änderung, Deaktivierung und Wiederverwendung von Bausteinen sowie unveränderte historische Pläne testen.
- [ ] Component-Tests für unterschiedliche Tagesanzahlen, leere Tage, Drag-and-drop und die alternative Verschiebeaktion
      ergänzen.
- [ ] Konflikt-, Pausen-, Versions- und Veröffentlichungstests für Raster- und Bausteinpläne gemeinsam ausführen.
- [ ] Firestore-Emulator-Tests für alle laut Berechtigungsmatrix erforderlichen neuen Pfade und CRUD-Aktionen ergänzen.
- [ ] Einen realistischen Monatsplan mit stark unterschiedlichen Wochentagen auf Desktop und kleinem Touch-Viewport prüfen.
- [ ] Fachkonzept, Architektur, Projektplan und Projektstand an die umgesetzte zweite Planungsart anpassen.
- [ ] `npm test`, `npm run test:rules`, die betroffenen Produktionsbuilds und die manuelle Prüfung erfolgreich ausführen.

### Erledigt, wenn

- [ ] Ein Kalendertag kann unabhängig von anderen Tagen beliebig viele vorgefertigte Schichtbausteine verwenden.
- [ ] Tagesinstanzen behalten über Belegung, Verschieben, Versionierung und Veröffentlichung ihre stabile Identität.
- [ ] Bestehende Monatspläne bleiben von späteren Änderungen des Bausteinkatalogs unberührt.
- [ ] Konfliktprüfung, Pausenberechnung und atomare Speicherung funktionieren für beide Planungsarten konsistent.
- [ ] Schichtraster und Schichtbausteine sind in Modellverwaltung und Monatsanlage eindeutig getrennt auswählbar.
- [ ] Automatisierte Tests, Rules-Tests, Produktionsbuilds, Dokumentation und manuelle Prüfung sind erfolgreich.

## 27. Veröffentlichte Dienstplanansicht fachlich fertigstellen

### Ziel

Die bereits vorhandene lesende Dienstplanansicht wird anhand der betrieblichen Rollen und tatsächlichen Nutzung abschließend
bewertet und ausgebaut. Ihre bestehende Grundlage lädt ausschließlich die aktuell veröffentlichte Version eines Monatsplans,
gruppiert Schichten nach Tagen und stellt mehrere ausgewählte Filialen getrennt dar. Entwürfe und archivierte Versionen bleiben
weiterhin ausgeschlossen.

Das Todo klärt insbesondere den erforderlichen Sichtumfang für Master, Office, Filiale und Mitarbeiter, die geeignete
Zeitdarstellung sowie den Aktualisierungs- und Ausgabeumfang. Bereits umgesetztes Verhalten wird nicht erneut entwickelt,
sondern durch konkrete Anforderungen ergänzt.

### Betroffene Dateien

Änderungen:

- src/app/pages/schichtplan/dienstplan-ansicht-page/
- src/app/components/schichtplan/dienstplan-ansichtsbereich/
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- firestore.rules
- firestore.rules.spec.ts
- docs/matrizen/berechtigungen.md
- docs/architektur/components/schichtplan.md
- docs/architektur/services/dienstplan-service.md
- docs/architektur/stores/dienstplan-store.md
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

### Schritt 1: Rollen und sichtbaren Umfang festlegen

- [ ] Festlegen, ob Master, Office und Filiale den vollständigen veröffentlichten Filialplan oder eine gefilterte Ansicht
      erhalten.
- [ ] Festlegen, ob ein Mitarbeiter den gesamten Plan seiner erlaubten Filialen oder ausschließlich seine eigenen Schichten
      sehen darf. Datenschutz, Vertretungsbedarf und betriebliche Transparenz gegeneinander abwägen.
- [ ] Festlegen, ob inaktive oder nicht mehr zugeordnete Mitarbeiter in historischen Plänen weiterhin mit aktuellem Namen oder
      einer gespeicherten Namensmomentaufnahme dargestellt werden.
- [ ] Klären, welche Veröffentlichungsdaten sichtbar sein sollen, beispielsweise Version, Veröffentlichungszeitpunkt und
      veröffentlichender Benutzer.
- [ ] Den endgültigen Sichtumfang vor einer Rules-Änderung in der Berechtigungsmatrix festhalten.

### Schritt 2: Zeitraum und Darstellung festlegen

- [ ] Entscheiden, ob die vorhandene Monatsansicht genügt oder zusätzlich Wochen- und Tagesansichten benötigt werden.
- [ ] Festlegen, ob nach Filiale, Mitarbeiter, Schichtart oder Zeitraum gefiltert werden kann und welche Filter je Rolle
      angeboten werden.
- [ ] Raster- und Schichtbausteinpläne in einer gemeinsamen lesenden Darstellung abbilden, ohne die jeweilige Planungsart zu
      verschleiern.
- [ ] Zeitspanne, Folgetag, bezahlte Pause, Filiale und Mitarbeiter eindeutig und auf kleinen Viewports verständlich anzeigen.
- [ ] Festlegen, wie Urlaub, Krankheit und andere Abwesenheiten nach Umsetzung von Todo 28 in der Ansicht erscheinen.
- [ ] Leere, noch nicht veröffentlichte und später ersetzte Monatsstände weiterhin eindeutig unterscheiden.

### Schritt 3: Aktualisierung und Datenzugriff festlegen

- [ ] Entscheiden, ob die Ansicht nur beim Öffnen beziehungsweise Monatswechsel neu lädt oder eine neue Veröffentlichung
      zeitnah über einen Live-Listener übernimmt.
- [ ] Sicherstellen, dass ausschließlich die über `veroeffentlichteVersionId` referenzierte Version angezeigt wird und niemals
      ein Entwurf als Ersatz erscheint.
- [ ] Bei filialübergreifender Anzeige Lade-, Leer- und Fehlerzustände je Filiale getrennt halten.
- [ ] Nur tatsächlich benötigte Mitarbeiterdaten laden und den beschlossenen Sichtumfang auch im Datenzugriff einhalten.
- [ ] Verhalten bei Netzwerkfehler, fehlender Veröffentlichungsreferenz und während eines Versionswechsels festlegen.

### Schritt 4: Ausgabe und Nutzung klären

- [ ] Entscheiden, ob eine druckoptimierte Ansicht benötigt wird.
- [ ] Entscheiden, ob PDF-, Kalender- oder Tabellenausgabe erforderlich ist; nicht benötigte Exportwege ausdrücklich
      ausschließen.
- [ ] Festlegen, ob Mitarbeiter ihren persönlichen Dienstplan lokal oder im Kalender speichern dürfen und welche Daten dabei
      enthalten sein dürfen.
- [ ] Die Bedienung für Desktop und kleine Touch-Viewports einschließlich langer Monate und mehrerer Filialen prüfen.

### Tests und Abschluss

- [ ] Rollenabhängige Sichtbarkeit, Filialumfang und gegebenenfalls persönliche Filterung automatisiert testen.
- [ ] Tests für veröffentlichte, nicht veröffentlichte, ersetzte und fehlerhaft geladene Monatsstände ergänzen.
- [ ] Raster- und Schichtbausteinpläne sowie später vorhandene Abwesenheiten in der Ansicht testen.
- [ ] Falls ein Live-Listener beschlossen wird, Initialladung, Versionswechsel, Abmeldung und Listenerfehler testen.
- [ ] Firestore-Emulator-Tests an den endgültig beschlossenen Leserechten ausrichten.
- [ ] Die Ansicht mit realen Testkonten für Master, Office, Filiale und Mitarbeiter manuell prüfen.
- [ ] Fachkonzept, Architektur, Projektplan und Projektstand auf das endgültige Verhalten aktualisieren.
- [ ] `npm test`, `npm run test:rules`, die betroffenen Produktionsbuilds und die manuelle Prüfung erfolgreich ausführen.

### Erledigt, wenn

- [ ] Jede Rolle sieht ausschließlich den fachlich und laut Berechtigungsmatrix erlaubten veröffentlichten Dienstplanumfang.
- [ ] Entwürfe und archivierte Versionen gelangen weder über die Oberfläche noch den vorgesehenen Datenzugriff in die Ansicht.
- [ ] Monats-, Wochen- oder Tagesdarstellung sowie Filter und Ausgaben sind ausdrücklich festgelegt und umgesetzt oder bewusst
      ausgeschlossen.
- [ ] Neue Veröffentlichungen erscheinen gemäß dem beschlossenen Aktualisierungsverhalten nachvollziehbar.
- [ ] Raster- und Schichtbausteinpläne werden mobil und auf Desktop verständlich dargestellt.
- [ ] Automatisierte Tests, Rules-Tests, Produktionsbuilds, Dokumentation und manuelle Rollenprüfung sind erfolgreich.

## 28. Stundenzettel und Abwesenheiten planen und umsetzen

### Ziel

Aus dem veröffentlichten Dienstplan wird für jeden Mitarbeiter und Arbeitstag ein nachvollziehbarer Stundenzettel abgeleitet.
Der veröffentlichte Plan bleibt die unveränderte Planungsvorgabe; tatsächliche Arbeitszeiten, tatsächlich genommene Pausen und
spätere Korrekturen werden davon getrennt dokumentiert.

Urlaubs- und Krankheitstage sowie gegebenenfalls weitere Abwesenheiten werden als eigene fachliche Datensätze erfasst. Sie
dürfen einen veröffentlichten Dienstplan nicht stillschweigend verändern. Planung, tatsächlicher Arbeitsnachweis und
Abwesenheitsnachweis bleiben getrennte, aufeinander verweisende Bereiche.

### Betroffene Dateien

Änderungen:

- src/app/commons/constants/firebase.constants.ts
- src/app/commons/models/domain/dienstplan.ts
- src/app/commons/models/domain/schicht.ts
- src/app/app.routes.ts
- src/app/components/app-shell/app-sidenav/
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- firestore.rules
- firestore.rules.spec.ts
- docs/matrizen/berechtigungen.md
- docs/architektur/components/schichtplan.md
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

Neu hinzuzufügen:

- src/app/commons/models/domain/stundenzettel.ts
- src/app/commons/models/domain/abwesenheit.ts
- src/app/commons/validators/stundenzettel.validator.ts
- src/app/commons/validators/stundenzettel.validator.spec.ts
- src/app/commons/validators/abwesenheit.validator.ts
- src/app/commons/validators/abwesenheit.validator.spec.ts
- src/app/services/domain/stundenzettel.service.ts
- src/app/services/domain/stundenzettel.service.spec.ts
- src/app/services/domain/abwesenheit.service.ts
- src/app/services/domain/abwesenheit.service.spec.ts
- src/app/stores/domain/stundenzettel.store.ts
- src/app/stores/domain/stundenzettel.store.spec.ts
- src/app/stores/domain/abwesenheit.store.ts
- src/app/stores/domain/abwesenheit.store.spec.ts
- src/app/pages/stundenzettel/
- src/app/pages/abwesenheiten/
- src/app/components/stundenzettel/
- src/app/components/abwesenheiten/
- docs/architektur/services/stundenzettel-service.md
- docs/architektur/services/abwesenheit-service.md
- docs/architektur/stores/stundenzettel-store.md
- docs/architektur/stores/abwesenheit-store.md

### Schritt 1: Stundenzettel und Planbezug festlegen

- [ ] Festlegen, wann aus einer veröffentlichten Schicht ein Stundenzetteleintrag entsteht: bei Veröffentlichung, am Arbeitstag
      oder beim ersten Öffnen der Zeiterfassung.
- [ ] Festlegen, wie eine nachträglich ersetzte Veröffentlichung mit bereits erzeugten oder bestätigten Stundenzetteln
      umgeht. Bestätigte tatsächliche Daten dürfen nicht unbemerkt überschrieben werden.
- [ ] Entscheiden, ob tatsächlicher Beginn und tatsächliches Ende erfasst oder zunächst aus dem Plan übernommen und nur bei
      Abweichung geändert werden.
- [ ] Festlegen, ob ausschließlich die Pausenbestätigung oder zusätzlich die tatsächlich genommene Pausendauer erfasst wird.
- [ ] Festlegen, ob ein genauer Pausenzeitpunkt benötigt wird. Ohne betrieblichen Bedarf bleibt er ausdrücklich außerhalb des
      Modells.
- [ ] Planwerte, tatsächliche Werte, Abweichungsgrund und Korrekturen nachvollziehbar voneinander trennen.

### Schritt 2: Rollen, Status und Abschluss festlegen

- [ ] Festlegen, ob Mitarbeiter ihre Zeiten selbst erfassen beziehungsweise bestätigen oder ob Filiale, Office oder Master
      dies übernimmt.
- [ ] Status wie `offen`, `bestaetigt`, `korrigiert` und `abgeschlossen` einschließlich erlaubter Übergänge definieren.
- [ ] Festlegen, wer einen bestätigten oder abgeschlossenen Stundenzettel korrigieren darf und wie die vorherigen Werte
      nachvollziehbar bleiben.
- [ ] Festlegen, ob eine zweite Freigabe durch einen Vorgesetzten erforderlich ist.
- [ ] Aufbewahrungsdauer, Monatsabschluss und Verhalten bei noch offenen Einträgen festlegen.

### Schritt 3: Urlaub und Krankheit fachlich modellieren

- [ ] Urlaub, Krankheit und gegebenenfalls weitere Abwesenheitsarten als gemeinsame Abwesenheit mit eindeutigem Typ
      modellieren.
- [ ] Festlegen, ob Abwesenheiten nur ganze Tage oder auch halbe Tage und stundenweise Zeiträume abbilden müssen.
- [ ] Festlegen, wer Urlaub beantragt, genehmigt, ablehnt oder korrigiert und wer Krankheit eintragen beziehungsweise sehen
      darf.
- [ ] Festlegen, ob Krankheit nur als Zeitraum ohne medizinische Details gespeichert wird. Diagnosen und andere nicht benötigte
      Gesundheitsdaten dürfen nicht erfasst werden.
- [ ] Entscheiden, ob und wie Nachweise verwaltet werden. Eine Dokumentablage wird nur bei bestätigtem rechtlichem und
      betrieblichem Bedarf geplant.
- [ ] Überschneidungen, Teilzeiträume, rückwirkende Erfassung sowie Korrektur oder Stornierung einer Abwesenheit definieren.

### Schritt 4: Auswirkungen auf Dienstplan und Ansicht festlegen

- [ ] Festlegen, ob bekannte genehmigte Abwesenheiten bereits beim Einplanen blockieren oder zunächst nur einen verständlichen
      Konflikt anzeigen.
- [ ] Eine nach Veröffentlichung erfasste Abwesenheit sichtbar mit der geplanten Schicht verknüpfen, ohne die veröffentlichte
      Planversion zu verändern.
- [ ] Festlegen, ob für eine ausgefallene Schicht ein Stundenzetteleintrag entfällt, als Abwesenheit geführt oder ausdrücklich
      auf null tatsächliche Arbeitszeit gesetzt wird.
- [ ] Urlaub und Krankheit in der veröffentlichten Ansicht nur im für die jeweilige Rolle erlaubten Umfang darstellen.
- [ ] Filialübergreifende Abwesenheiten eines Mitarbeiters berücksichtigen, ohne vollständige Dienstpläne aller Filialen laden
      zu müssen.

### Schritt 5: Datenmodell, Pfade und Sicherheit umsetzen

- [ ] Stundenzettel und Abwesenheiten mit stabilen Referenzen auf Mitarbeiter, Firma, Filiale, Dienstplandatum, Version und
      gegebenenfalls Schicht modellieren.
- [ ] Entscheiden, ob Stundenzettel filialbezogen oder firmenweit gespeichert werden. Filialübergreifende Arbeitsblöcke und
      eindeutige Monatsabschlüsse müssen dabei ohne doppelte Datensätze möglich bleiben.
- [ ] Pfade und CRUD-Rechte für jede Rolle zuerst in der Berechtigungsmatrix festlegen und anschließend in den Firestore Rules
      umsetzen.
- [ ] Fachliche Felder, Statuswechsel, Zeitfolgen und Referenzen ausschließlich im TypeScript-Code validieren.
- [ ] Gleichzeitige Planänderungen, Zeitkorrekturen und Abwesenheitserfassungen atomar oder mit einem eindeutig erkennbaren
      Konflikt behandeln.
- [ ] Sensible Abwesenheitsdaten auf den fachlich notwendigen Leserkreis begrenzen.

### Schritt 6: Oberfläche und Monatsabschluss umsetzen

- [ ] Stundenzettel aus dem veröffentlichten Plan verständlich vorbelegen und Planwert, Istwert sowie Abweichung getrennt
      anzeigen.
- [ ] Urlaub und Krankheit in einem klar getrennten Erfassungs- und Bearbeitungsablauf verwalten.
- [ ] Fehler, offene Bestätigungen, nachträgliche Planänderungen und Korrekturbedarf sichtbar benennen.
- [ ] Tages- und Monatssummen für geplante Zeit, tatsächliche Arbeitszeit, bezahlte Pause und Abwesenheitszeit fachlich
      eindeutig berechnen.
- [ ] Festlegen, welche Summen für Urlaub und Krankheit benötigt werden und wie Teilzeit oder mehrere Filialen berücksichtigt
      werden.
- [ ] Entscheiden, ob in dieser Ausbaustufe bereits Export oder Lohnabrechnungsanbindung benötigt wird. Nicht umgesetzte
      Ausgaben als eigenes späteres Todo abgrenzen.
- [ ] Erfassung und Prüfung auf Desktop sowie einem kleinen Touch-Viewport ermöglichen.

### Tests und Abschluss

- [ ] Tests für die Ableitung aus einer veröffentlichten Schicht, ersetzte Veröffentlichungen und unveränderte bestätigte
      Istwerte ergänzen.
- [ ] Zeit-, Pausen-, Status-, Korrektur- und Monatsabschlusstests für einzelne sowie mehrere Arbeitsblöcke ergänzen.
- [ ] Urlaub und Krankheit für ganze Tage, Teilzeiträume, Überschneidungen, Rückwirkung und Korrektur testen.
- [ ] Service- und Store-Tests für Schreibkonflikte, Fehlerweitergabe und Erhalt bereits geladener Daten ergänzen.
- [ ] Firestore-Emulator-Tests für alle laut Berechtigungsmatrix erlaubten und verbotenen Zugriffe ergänzen.
- [ ] Rollen- und Datenschutzverhalten mit realen Testkonten für Master, Office, Filiale und Mitarbeiter manuell prüfen.
- [ ] Fachkonzept, Architektur, Projektplan und Projektstand auf das endgültige Verhalten aktualisieren.
- [ ] `npm test`, `npm run test:rules`, die betroffenen Produktionsbuilds und die manuelle Prüfung erfolgreich ausführen.

### Erledigt, wenn

- [ ] Jeder Stundenzettel ist nachvollziehbar aus einem veröffentlichten Plan abgeleitet, ohne dessen Momentaufnahme zu
      verändern.
- [ ] Planzeit, tatsächliche Arbeitszeit, Pausenbestätigung, Abwesenheit und Korrekturen sind fachlich und technisch getrennt.
- [ ] Urlaub und Krankheit können im beschlossenen Umfang erfasst, geprüft und rollenabhängig angezeigt werden.
- [ ] Nachträgliche Veröffentlichungen oder Korrekturen überschreiben keine bereits bestätigten tatsächlichen Daten unbemerkt.
- [ ] Pfade, CRUD-Rechte, Statuswechsel und Datenschutz sind in Matrix, Code, Rules und Tests konsistent umgesetzt.
- [ ] Automatisierte Tests, Rules-Tests, Produktionsbuilds, Dokumentation und manuelle Rollenprüfung sind erfolgreich.
