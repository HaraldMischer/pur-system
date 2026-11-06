<!-- pur-system/docs/todo_naechste.md -->

# Offene Todos

## Legende

- `[x]` erledigt
- `[ ]` offen
- `[-]` zurückgestellt

## 26. Schicht-Tagesmodell als eigenständige Planungsart umsetzen

### Ziel

Neben dem bestehenden Schicht-Rastermodell wird ein fachlich, typseitig und bei der Speicherung eigenständiges
Schicht-Tagesmodell umgesetzt. Beide Modelle teilen ausschließlich allgemeine Metadaten und die Auswahl einer Planungsart. Das
Schicht-Tagesmodell verwendet weder Rastermodellschichten noch Rasterzeiten und wird nicht als Sonderfall des bestehenden
Schicht-Rastermodells abgebildet.

Die Planungsarten heißen verbindlich `schichtrastermodell` und `schichttagesmodell`. Der bisher gespeicherte Wert
`schichtraster` wird kontrolliert auf `schichtrastermodell` migriert. Der nur vorbereitete Wert `schichtbausteine` wird aus
Modellen, Oberfläche und Dokumentation entfernt.

Ein Schicht-Tagesmodell enthält eine Wochentagsvorlage für Montag bis Samstag und eine davon unabhängige Sonntagsvorlage. Beide
Vorlagen besitzen beliebig viele eigene Schichten mit konkreten Uhrzeiten, Reihenfolge, Mehrfachbelegung sowie Vor- und
Nachbereitung. Anzahl, Identität und Zeiten der Schichten dürfen sich zwischen beiden Vorlagen unterscheiden.

Beim initialen Erstellen eines Monatsdienstplans wird für jeden Kalendertag eine eigene Tagesstruktur erzeugt. Reguläre
Wochentage und Sonntage übernehmen ihre Schichten aus der passenden Vorlage. Gesetzliche Feiertage erhalten die Öffnungsarten
`Standard`, `Wie Sonntag`, `Abweichend` und `Geschlossen`. `Wie Sonntag` übernimmt dynamisch die wirksame Sonntagsöffnung und
die Sonntagsvorlage. Nur abweichend geöffnete Feier- und Sondertage werden vor dem Anlegen des Monatsplans frei konfiguriert.
Erst wenn alle erforderlichen Tagesstrukturen vollständig sind, werden Monatsplan, erste Entwurfsversion und Tagesschichten
atomar angelegt. Danach ordnet der Planer Mitarbeiter den vorbereiteten Tagesschichten zu.

Beginn und Ende jeder Kernschicht müssen innerhalb der wirksamen Öffnung liegen. Ausschließlich die je Schicht konfigurierte
Vor- und Nachbereitungszeit darf die Kernzeit über die Öffnungsgrenzen hinaus erweitern. Geschlossene Tage enthalten keine
Tagesschichten. Die vollständige Tagesstruktur ist eine unveränderliche Monatsmomentaufnahme; ein leerer, noch nie
veröffentlichter Plan kann wie bisher gelöscht und mit einer anderen Struktur neu angelegt werden.

### Betroffene Dateien

Änderungen beziehungsweise kontrollierte Umbenennungen:

- src/app/commons/models/domain/schichtmodell.ts
- src/app/commons/models/domain/dienstplan.ts
- src/app/commons/models/domain/dienstplan-kalendertag.ts
- src/app/commons/models/domain/schicht.ts
- src/app/commons/models/domain/filialeinstellung.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/commons/constants/schichtmodell.constants.ts
- src/app/commons/utils/dienstplan/dienstplan-kalendertage.ts
- src/app/commons/utils/dienstplan/dienstplan-kalendertage.spec.ts
- src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.ts
- src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.spec.ts
- src/app/commons/validators/schichtmodell.validator.ts
- src/app/commons/validators/schichtmodell.validator.spec.ts
- src/app/components/schichtplan/dienstplan-anlegen-dialog/
- src/app/components/schichtplan/dienstplan-planungsbereich/
- src/app/components/schichtplan/dienstplan-monatstabelle/
- src/app/components/schichtplan/schicht-bearbeiten-dialog/
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/
- src/app/components/schichtplan/schichtmodelle-filiale/
- src/app/components/einstellungen/oeffnungszeiten-filiale/
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/services/domain/schichtmodell.service.ts
- src/app/services/domain/schichtmodell.service.spec.ts
- src/app/services/domain/filialeinstellung.service.ts
- src/app/services/domain/filialeinstellung.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- src/app/stores/domain/schichtmodell.store.ts
- src/app/stores/domain/schichtmodell.store.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/matrizen/berechtigungen.md
- docs/matrizen/oeffnungszeiten.md
- docs/architektur/components/schichtplan.md
- docs/architektur/services/dienstplan-service.md
- docs/architektur/services/schichtmodell-service.md
- docs/architektur/stores/dienstplan-store.md
- docs/architektur/stores/schichtmodell-store.md
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_naechste.md

Neu hinzuzufügen:

- src/app/commons/models/domain/schicht-rastermodell.ts
- src/app/commons/models/domain/schicht-tagesmodell.ts
- src/app/commons/utils/dienstplan/dienstplan-tagesschichten.ts
- src/app/commons/utils/dienstplan/dienstplan-tagesschichten.spec.ts
- src/app/commons/validators/schicht-tagesmodell.validator.ts
- src/app/commons/validators/schicht-tagesmodell.validator.spec.ts
- src/app/components/schichtplan/schicht-rastermodell-bearbeiten-dialog/
- src/app/components/schichtplan/schicht-rastermodelle-filiale/
- src/app/components/schichtplan/schicht-tagesmodell-bearbeiten-dialog/
- src/app/components/schichtplan/schicht-tagesmodelle-filiale/
- src/app/components/schichtplan/dienstplan-tagesstruktur-bearbeiten-dialog/
- src/app/components/schichtplan/tagesschicht-belegen-dialog/
- src/app/services/domain/schicht-rastermodell.service.ts
- src/app/services/domain/schicht-rastermodell.service.spec.ts
- src/app/services/domain/schicht-tagesmodell.service.ts
- src/app/services/domain/schicht-tagesmodell.service.spec.ts
- src/app/stores/domain/schicht-rastermodell.store.ts
- src/app/stores/domain/schicht-rastermodell.store.spec.ts
- src/app/stores/domain/schicht-tagesmodell.store.ts
- src/app/stores/domain/schicht-tagesmodell.store.spec.ts

### [ ] Schritt 1: Modellgrenzen und Monatsinitialisierung festlegen

- [x] Schicht-Rastermodell und Schicht-Tagesmodell als zwei eigenständige Planungsarten behandeln.
- [x] Die Planungsartwerte verbindlich als `schichtrastermodell` und `schichttagesmodell` benennen.
- [x] Das bestehende Schicht-Rastermodell in seinem fachlichen Verhalten erhalten und nicht um Tagesvorlagen erweitern.
- [x] Das Schicht-Tagesmodell mit einer Wochentagsvorlage und einer unabhängigen Sonntagsvorlage ausstatten.
- [x] Beginn und Ende aller Vorlagen- und Tagesschichten ausschließlich als konkrete Uhrzeiten am Start- oder Folgetag
      konfigurieren. Prozentuale und relative Übergänge gehören nicht zum Schicht-Tagesmodell.
- [x] Feier- und Sondertage ohne wiederverwendbare Vorlage innerhalb der Monatsplananlage frei konfigurieren.
- [x] Für gesetzliche Feiertage die vier Öffnungsarten `Standard`, `Wie Sonntag`, `Abweichend` und `Geschlossen` festlegen.
      `Wie Sonntag` verweist dynamisch auf die wirksame Sonntagsöffnung und die Sonntagsvorlage; nur `Abweichend` benötigt eine
      freie Tagesstruktur in der Monatsplananlage.
- [x] Alle Tagesstrukturen vor dem atomaren Anlegen des Monatsplans vollständig festlegen. Eine spätere freie Veränderung
      belegter Tagesstrukturen ist nicht vorgesehen.
- [x] Kernzeiten innerhalb der wirksamen Öffnung begrenzen. Nur Vor- und Nachbereitung darf die Öffnungsgrenzen überschreiten.
- [x] Fachliche Lücken und Überschneidungen innerhalb einer geöffneten Tagesstruktur zulassen. Die Kernzeiten bleiben dabei
      vollständig innerhalb der wirksamen Öffnung.

### [ ] Schritt 2: Eigenständige Typen, Pfade und Migration definieren

- [x] `TPlanungsart` auf `'schichtrastermodell' | 'schichttagesmodell'` umstellen und alle Modell-, Dienstplan- und
      Schichttypen als diskriminierte Unions modellieren.
- [x] Gemeinsame Basistypen auf allgemeine Metadaten begrenzen. Rastermodellschichten, Tagesvorlagenschichten und konkrete
      Tagesschichten erhalten voneinander unabhängige Interfaces und Mapper.
- [x] Die bestehende Rasterlogik fachlich eindeutig als Schicht-Rastermodell benennen und ohne Verhaltensänderung in die neue
      Typ- und Namensstruktur des Anwendungscodes überführen.
- [x] Filialbezogene Schicht-Rastermodelle unter `schichtrastermodell/{schichtrastermodellId}` mit eigenen
      `rastermodellschicht`-Dokumenten und Schicht-Tagesmodelle unter `schichttagesmodell/{schichttagesmodellId}` mit eigenen
      `tagesvorlagenschicht`-Dokumenten speichern.
- [x] Für Monatspläne des Schicht-Tagesmodells eine eigene Tagesschicht-Momentaufnahme speichern. Sie verwendet keine
      `modellschichtId` und keine `rasterzeiten` des Schicht-Rastermodells.
- [x] Konkrete Mitarbeiterschichten getrennt auf eine Rastermodellschicht oder eine Tagesschicht verweisen lassen. Gemischte
      oder unvollständige Referenzen werden abgelehnt.
- [x] Das Filialeinstellungsmodell für gesetzliche Feiertage um `Wie Sonntag` erweitern, ohne den Feiertagsstatus oder die
      Regeln benutzerdefinierter jährlicher Sondertage zu verändern.
- [x] Vor einer Rules-Änderung alle neuen Pfade und CRUD-Rechte in der Berechtigungsmatrix ergänzen.
- [ ] Eine kontrollierte Migration für `schichtraster → schichtrastermodell` in bestehenden Schichtmodellen und Monatsplänen
      festlegen. Bereits veröffentlichte historische Pläne müssen unverändert lesbar bleiben.
- [x] Den vorbereiteten Wert `schichtbausteine`, seine leeren Dokumenttypen und die deaktivierten UI-Einstiege kontrolliert
      entfernen. Eine dauerhafte stillschweigende Ersatzannahme ist nicht vorgesehen.

### [ ] Schritt 3: Schicht-Tagesmodelle verwalten

- [x] Schicht-Tagesmodelle in einem eigenen Service und Store laden, anlegen, bearbeiten und deaktivieren.
- [x] In der Modellverwaltung Schicht-Rastermodell und Schicht-Tagesmodell eindeutig getrennt anbieten.
- [x] Im Schicht-Tagesmodell getrennte Bereiche für Wochentags- und Sonntagsvorlage darstellen.
- [x] Je Vorlage beliebig viele Schichten mit stabiler ID, Bezeichnung, Reihenfolge, Kernbeginn, Kernende, Vor- und
      Nachbereitung sowie optionaler Mehrfachbelegung konfigurieren.
- [x] Unterschiedliche Schichtanzahlen, Längen, Lücken und Überschneidungen zwischen Wochentags- und Sonntagsvorlage zulassen.
- [x] Kernzeiten gegen die für die Vorlage maßgebliche Öffnung validieren.
- [ ] Die tatsächliche Arbeitszeit einschließlich Vor- und Nachbereitung im Modelldialog nachvollziehbar anzeigen.
- [x] Die wirkungslose Auswahl `Übergänge: Fest / Relativ` aus dem Schicht-Rastermodelldialog entfernen.
- [x] Während eines Schreibvorgangs das vollständige Formular und alle datenverändernden Aktionen deaktivieren.

### [x] Schritt 4: Vollständige Tagesstrukturen beim Monatsplan anlegen

- [x] Nach der Auswahl eines Schicht-Tagesmodells alle Kalendertage und ihre wirksamen Öffnungsregeln auflösen.
- [x] Für reguläre Wochentage von Montag bis Samstag eigene Tagesschichten aus der Wochentagsvorlage und für reguläre Sonntage
      aus der Sonntagsvorlage erzeugen.
- [x] Gesetzliche Feiertage mit `Standard` anhand der allgemeinen Standardöffnung und mit `Wie Sonntag` anhand der wirksamen
      Sonntagsöffnung auflösen, ohne sie im Sondertagsdialog erneut konfigurieren zu lassen. Für `Standard` bestimmt der
      tatsächliche Wochentag weiterhin die Wochentags- oder Sonntagsvorlage; `Wie Sonntag` verwendet die Sonntagsvorlage.
- [x] Geschlossene Tage ohne Tagesschichten übernehmen.
- [x] Für jeden abweichend geöffneten Feier- oder Sondertag innerhalb der Monatsplananlage eine freie Tagesstruktur erfassen.
      Anzahl, Reihenfolge und Zeiten dürfen sich von allen anderen Tagen unterscheiden.
- [x] Kernzeiten freier Sondertagsschichten auf die wirksame Öffnung begrenzen und nur Vor- und Nachbereitung außerhalb der
      Öffnung zulassen.
- [x] Jede konkrete Tagesschicht mit stabiler Tagesinstanz-ID, Datum, Herkunft, Reihenfolge, Kernzeit, tatsächlicher Arbeitszeit
      und Mehrfachbelegung speichern.
- [x] Monatsplan, erste Entwurfsversion, Kalender-Momentaufnahme, Modellreferenz und alle Tagesschichten atomar schreiben.
- [x] Die Anlage verhindern, solange eine geöffnete Tagesstruktur unvollständig oder fachlich ungültig ist.
- [x] Spätere Änderungen an Öffnungszeiten oder Schicht-Tagesmodell dürfen vorhandene Monatspläne nicht neu berechnen.
- [x] Das Löschen und Neuanlegen eines leeren, noch nie veröffentlichten Monatsplans als einzigen Wechsel der Tagesstruktur
      beibehalten.

### [x] Schritt 5: Planung, Konflikte und Veröffentlichung getrennt anbinden

- [x] Die Monatsdarstellung des Schicht-Tagesmodells ohne globale Rasterspalten umsetzen. Jede Tageszeile stellt ausschließlich
      ihre eigenen Tagesschichten dar.
- [x] Mitarbeiter per Drag-and-drop sowie über eine gleichwertige alternative Aktion einer konkreten Tagesschicht zuordnen und
      zwischen zulässigen Tagesschichten verschieben können.
- [x] Mehrfachbelegung, nicht verfügbare Mitarbeiter und belegte Einfachschichten anhand der konkreten Tagesschicht prüfen.
- [x] Tatsächliche Arbeitszeiten einschließlich Vor- und Nachbereitung in denselben firmenweiten Belegungsindex, dieselbe
      Konfliktprüfung und dieselbe Pausenberechnung wie Rastermodellschichten aufnehmen.
- [x] Entwurf, Veröffentlichung, Archivierung und neuer Entwurf aus einem veröffentlichten Stand müssen Tagesinstanzen und
      Belegungen atomar sowie historisch stabil übernehmen.
- [x] Die veröffentlichte Dienstplanansicht für Schicht-Rastermodell und Schicht-Tagesmodell gemeinsam lesbar halten, ohne ihre
      unterschiedlichen Tagesstrukturen zu vermischen.

### [ ] Tests und Abschluss

- [x] Modell-, Mapper- und Validator-Tests für beide getrennten Planungsarten und ihre diskriminierten Unions ergänzen.
- [ ] Service- und Store-Tests für getrennte Pfade, Anlage, Laden, Bearbeiten, Deaktivieren und Migration ergänzen.
- [x] Tageserzeugung für reguläre Wochentage, Sonntage, Feiertage mit `Standard` oder `Wie Sonntag`, geschlossene Tage sowie
      frei konfigurierte Feier- und Sondertage testen.
- [x] Übernachtöffnungen, Kernzeitgrenzen, Vor- und Nachbereitung, unterschiedliche Schichtanzahlen, Lücken und
      Überschneidungen testen.
- [x] Component-Tests für Modellauswahl, beide Vorlagen, freie Sondertagserfassung und variable Tagesdarstellung ergänzen.
- [x] Konflikt-, Pausen-, Versions- und Veröffentlichungstests für beide Planungsarten ergänzen und mit der vollständigen
      Unit-Test-Suite ausführen.
- [x] Firestore-Emulator-Tests für alle neuen Pfade und CRUD-Aktionen ergänzen. Ihre erneute vollständige Ausführung bleibt Teil
      des Abschlusses.
- [ ] Einen realistischen Monatsplan mit Wochentagen, Sonntagen, Übernachtöffnungen und mehreren Sondertagen auf Desktop und
      kleinem Touch-Viewport prüfen.
- [x] Fachkonzept, Architektur, Projektplan und Projektstand an beide eigenständigen Planungsarten anpassen.
- [ ] `npm test`, `npm run test:rules`, `npm run build:master`, `npm run build:office` und die manuelle Prüfung erfolgreich
      ausführen.

### [ ] Erledigt, wenn

- [x] Schicht-Rastermodell und Schicht-Tagesmodell besitzen getrennte Typen, Pfade, Services, Stores und Oberflächen.
- [x] `TPlanungsart` enthält ausschließlich `schichtrastermodell` und `schichttagesmodell`.
- [ ] Bestehende Rastermodelle und Monatspläne sind kontrolliert von `schichtraster` auf `schichtrastermodell` migriert und
      bleiben fachlich unverändert nutzbar.
- [x] Der vorbereitete Wert `schichtbausteine` und seine deaktivierten Einstiege sind entfernt.
- [x] Jeder geöffnete Monatstag eines Schicht-Tagesmodellplans besitzt eine eigene vollständige und historisch stabile
      Tagesstruktur; geschlossene Tage bleiben ohne Tagesschichten.
- [x] Wochentage und Sonntage können unterschiedliche Schichtanzahlen, Identitäten, Uhrzeiten und Überschneidungen besitzen.
- [x] Feiertage mit `Wie Sonntag` verwenden automatisch Sonntagsöffnung und Sonntagsvorlage; abweichend geöffnete Feier- und
      Sondertage werden vor der Monatsplananlage innerhalb ihrer wirksamen Öffnung frei konfiguriert.
- [x] Kernzeiten bleiben innerhalb der Öffnung; nur Vor- und Nachbereitung darf die Öffnungsgrenzen überschreiten.
- [x] Mitarbeiter können anschließend ohne Änderung der Tagesstruktur auf konkrete Tagesschichten verteilt werden.
- [x] Konfliktprüfung, Pausenberechnung, Versionierung und Veröffentlichung funktionieren für beide Planungsarten konsistent.
- [ ] Automatisierte Tests, Rules-Tests, Produktionsbuilds, Dokumentation und manuelle Prüfung sind erfolgreich.

## 27. Feiertage, Gedenk- und Trauertage fachlich neu ordnen

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
- docs/todo_naechste.md

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
- [x] Rechtlich zwingende Sperr- und Spielverbotszeiten fachlich als verbindliche Grenzen einordnen. Bis zu ihrer getrennten
      technischen Modellierung und Validierung bildet die Einstellungsoberfläche sie nur durch Vorbelegungen ab; diese
      Vorbelegungen ersetzen keine rechtlich verbindliche Grenze.

### Schritt 2: Lokale Datums- und Regelberechnung erweitern

- [x] Eine allgemeine systemdefinierte Datumsregel für berechnete Gedenk-, Trauer- und stille Tage modellieren, ohne sie
      fälschlich als gesetzliche Feiertage zu kennzeichnen.
- [x] Volkstrauertag als zweiten Sonntag vor dem ersten Advent und Totensonntag als letzten Sonntag vor dem ersten Advent lokal
      und deterministisch berechnen.
- [ ] Bestehende Berechnungen für Ostern und davon abhängige Feiertage sowie den Buß- und Bettag auf fachliche Vollständigkeit
      und einheitliche Benennung prüfen.
- [ ] Fachregeln mit stabiler ID, Bundesland, Rechtsgrundlage und geeignetem Gültigkeitszeitraum versionierbar beschreiben, damit
      spätere Rechtsänderungen keine historischen Ergebnisse verfälschen.
- [x] Externe Kalenderdienste höchstens als Entwicklungs- oder Prüfhilfe verwenden; die produktive Datumsauflösung darf keine
      unkontrollierte externe Laufzeitabhängigkeit erhalten.

### Schritt 3: Bestehende Filialeinstellungen kontrolliert abgleichen

- [x] Neue systemdefinierte Tage bei bestehenden Filialen ergänzen, ohne benutzerdefinierte Sondertage oder angepasste
      Öffnungsregeln zu überschreiben.
- [x] Beim Abgleich stabile System-IDs verwenden und vorhandene systemdefinierte Einstellungen erhalten, sofern ihre fachliche
      Regel weiterhin gültig ist.
- [ ] Kollisionen zwischen gesetzlichen Feiertagen, berechneten Gedenk- oder Trauertagen und festen Sondertagen weiterhin
      eindeutig erkennen und nach der bestehenden Herkunftspriorität auflösen.
- [x] Sicherstellen, dass die neue Berechnung nur zukünftige Auflösungen und neu angelegte Dienstpläne beeinflusst. Bereits
      gespeicherte Kalendertage und Rasterzeiten bestehender Dienstpläne bleiben als Momentaufnahme unverändert.
- [x] Einen nachvollziehbaren Datenübergang für bereits initialisierte Filialen festlegen und dokumentieren.

### Schritt 4: Oberfläche verständlich anpassen

- [x] Eine verständliche Darstellung für Gedenk- und Trauertage beziehungsweise stille Tage festlegen und prüfen, ob dafür ein
      eigener Abschnitt oder eine erkennbare Untergruppe der jährlichen Sondertage sinnvoller ist.
- [x] Systemdefinierte Bezeichnung, berechnete Datumsregel und rechtliche Herkunft unveränderlich darstellen; nur die fachlich
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
- [ ] Tests für Kategorien, Aktivstatus, Sperrzeitvorbelegung, Kollisionen und die Priorität `benutzerdefinierter jährlicher
Sondertag → systemdefinierter Sondertag → Wochentag` ergänzen.
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

## 29. Veröffentlichte Dienstplanansicht fachlich fertigstellen

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
- docs/todo_naechste.md

### [ ] Schritt 1: Rollen und sichtbaren Umfang festlegen

- [ ] Festlegen, ob Master, Office und Filiale den vollständigen veröffentlichten Filialplan oder eine gefilterte Ansicht
      erhalten.
- [ ] Festlegen, ob ein Mitarbeiter den gesamten Plan seiner erlaubten Filialen oder ausschließlich seine eigenen Schichten
      sehen darf. Datenschutz, Vertretungsbedarf und betriebliche Transparenz gegeneinander abwägen.
- [ ] Festlegen, ob inaktive oder nicht mehr zugeordnete Mitarbeiter in historischen Plänen weiterhin mit aktuellem Namen oder
      einer gespeicherten Namensmomentaufnahme dargestellt werden.
- [ ] Klären, welche Veröffentlichungsdaten sichtbar sein sollen, beispielsweise Version, Veröffentlichungszeitpunkt und
      veröffentlichender Benutzer.
- [ ] Den endgültigen Sichtumfang vor einer Rules-Änderung in der Berechtigungsmatrix festhalten.

### [ ] Schritt 2: Zeitraum und Darstellung festlegen

- [ ] Entscheiden, ob die vorhandene Monatsansicht genügt oder zusätzlich Wochen- und Tagesansichten benötigt werden.
- [ ] Festlegen, ob nach Filiale, Mitarbeiter, Schichtart oder Zeitraum gefiltert werden kann und welche Filter je Rolle
      angeboten werden.
- [ ] Veröffentlichte Pläne aus Schicht-Rastermodell und Schicht-Tagesmodell in einer gemeinsamen lesenden Ansicht abbilden,
      ohne ihre unterschiedlichen Tagesstrukturen zu vermischen. Die fachliche Kennzeichnung eines Sondertags bleibt
      erkennbar.
- [ ] Zeitspanne, Folgetag, bezahlte Pause, Filiale und Mitarbeiter eindeutig und auf kleinen Viewports verständlich anzeigen.
- [ ] Festlegen, wie Urlaub, Krankheit und andere Abwesenheiten nach Umsetzung von Todo 30 in der Ansicht erscheinen.
- [ ] Leere, noch nicht veröffentlichte und später ersetzte Monatsstände weiterhin eindeutig unterscheiden.

### [ ] Schritt 3: Aktualisierung und Datenzugriff festlegen

- [ ] Entscheiden, ob die Ansicht nur beim Öffnen beziehungsweise Monatswechsel neu lädt oder eine neue Veröffentlichung
      zeitnah über einen Live-Listener übernimmt.
- [ ] Sicherstellen, dass ausschließlich die über `veroeffentlichteVersionId` referenzierte Version angezeigt wird und niemals
      ein Entwurf als Ersatz erscheint.
- [ ] Bei filialübergreifender Anzeige Lade-, Leer- und Fehlerzustände je Filiale getrennt halten.
- [ ] Nur tatsächlich benötigte Mitarbeiterdaten laden und den beschlossenen Sichtumfang auch im Datenzugriff einhalten.
- [ ] Verhalten bei Netzwerkfehler, fehlender Veröffentlichungsreferenz und während eines Versionswechsels festlegen.

### [ ] Schritt 4: Ausgabe und Nutzung klären

- [ ] Entscheiden, ob eine druckoptimierte Ansicht benötigt wird.
- [ ] Entscheiden, ob PDF-, Kalender- oder Tabellenausgabe erforderlich ist; nicht benötigte Exportwege ausdrücklich
      ausschließen.
- [ ] Festlegen, ob Mitarbeiter ihren persönlichen Dienstplan lokal oder im Kalender speichern dürfen und welche Daten dabei
      enthalten sein dürfen.
- [ ] Die Bedienung für Desktop und kleine Touch-Viewports einschließlich langer Monate und mehrerer Filialen prüfen.

### [ ] Tests und Abschluss

- [ ] Rollenabhängige Sichtbarkeit, Filialumfang und gegebenenfalls persönliche Filterung automatisiert testen.
- [ ] Tests für veröffentlichte, nicht veröffentlichte, ersetzte und fehlerhaft geladene Monatsstände ergänzen.
- [ ] Rastermodellschichten, Tagesschichten aus beiden Vorlagen, frei konfigurierte Sondertage sowie später vorhandene
      Abwesenheiten in der Ansicht testen.
- [ ] Falls ein Live-Listener beschlossen wird, Initialladung, Versionswechsel, Abmeldung und Listenerfehler testen.
- [ ] Firestore-Emulator-Tests an den endgültig beschlossenen Leserechten ausrichten.
- [ ] Die Ansicht mit realen Testkonten für Master, Office, Filiale und Mitarbeiter manuell prüfen.
- [ ] Fachkonzept, Architektur, Projektplan und Projektstand auf das endgültige Verhalten aktualisieren.
- [ ] `npm test`, `npm run test:rules`, die betroffenen Produktionsbuilds und die manuelle Prüfung erfolgreich ausführen.

### [ ] Erledigt, wenn

- [ ] Jede Rolle sieht ausschließlich den fachlich und laut Berechtigungsmatrix erlaubten veröffentlichten Dienstplanumfang.
- [ ] Entwürfe und archivierte Versionen gelangen weder über die Oberfläche noch den vorgesehenen Datenzugriff in die Ansicht.
- [ ] Monats-, Wochen- oder Tagesdarstellung sowie Filter und Ausgaben sind ausdrücklich festgelegt und umgesetzt oder bewusst
      ausgeschlossen.
- [ ] Neue Veröffentlichungen erscheinen gemäß dem beschlossenen Aktualisierungsverhalten nachvollziehbar.
- [ ] Schicht-Rastermodellpläne und Schicht-Tagesmodellpläne werden mobil und auf Desktop verständlich dargestellt.
- [ ] Automatisierte Tests, Rules-Tests, Produktionsbuilds, Dokumentation und manuelle Rollenprüfung sind erfolgreich.

## 30. Stundenzettel und Abwesenheiten planen und umsetzen

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
- docs/todo_naechste.md

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

### [ ] Schritt 1: Stundenzettel und Planbezug festlegen

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

### [ ] Schritt 2: Rollen, Status und Abschluss festlegen

- [ ] Festlegen, ob Mitarbeiter ihre Zeiten selbst erfassen beziehungsweise bestätigen oder ob Filiale, Office oder Master
      dies übernimmt.
- [ ] Status wie `offen`, `bestaetigt`, `korrigiert` und `abgeschlossen` einschließlich erlaubter Übergänge definieren.
- [ ] Festlegen, wer einen bestätigten oder abgeschlossenen Stundenzettel korrigieren darf und wie die vorherigen Werte
      nachvollziehbar bleiben.
- [ ] Festlegen, ob eine zweite Freigabe durch einen Vorgesetzten erforderlich ist.
- [ ] Aufbewahrungsdauer, Monatsabschluss und Verhalten bei noch offenen Einträgen festlegen.

### [ ] Schritt 3: Urlaub und Krankheit fachlich modellieren

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

### [ ] Schritt 4: Auswirkungen auf Dienstplan und Ansicht festlegen

- [ ] Festlegen, ob bekannte genehmigte Abwesenheiten bereits beim Einplanen blockieren oder zunächst nur einen verständlichen
      Konflikt anzeigen.
- [ ] Eine nach Veröffentlichung erfasste Abwesenheit sichtbar mit der geplanten Schicht verknüpfen, ohne die veröffentlichte
      Planversion zu verändern.
- [ ] Festlegen, ob für eine ausgefallene Schicht ein Stundenzetteleintrag entfällt, als Abwesenheit geführt oder ausdrücklich
      auf null tatsächliche Arbeitszeit gesetzt wird.
- [ ] Urlaub und Krankheit in der veröffentlichten Ansicht nur im für die jeweilige Rolle erlaubten Umfang darstellen.
- [ ] Filialübergreifende Abwesenheiten eines Mitarbeiters berücksichtigen, ohne vollständige Dienstpläne aller Filialen laden
      zu müssen.

### [ ] Schritt 5: Datenmodell, Pfade und Sicherheit umsetzen

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

### [ ] Schritt 6: Oberfläche und Monatsabschluss umsetzen

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

### [ ] Tests und Abschluss

- [ ] Tests für die Ableitung aus einer veröffentlichten Schicht, ersetzte Veröffentlichungen und unveränderte bestätigte
      Istwerte ergänzen.
- [ ] Zeit-, Pausen-, Status-, Korrektur- und Monatsabschlusstests für einzelne sowie mehrere Arbeitsblöcke ergänzen.
- [ ] Urlaub und Krankheit für ganze Tage, Teilzeiträume, Überschneidungen, Rückwirkung und Korrektur testen.
- [ ] Service- und Store-Tests für Schreibkonflikte, Fehlerweitergabe und Erhalt bereits geladener Daten ergänzen.
- [ ] Firestore-Emulator-Tests für alle laut Berechtigungsmatrix erlaubten und verbotenen Zugriffe ergänzen.
- [ ] Rollen- und Datenschutzverhalten mit realen Testkonten für Master, Office, Filiale und Mitarbeiter manuell prüfen.
- [ ] Fachkonzept, Architektur, Projektplan und Projektstand auf das endgültige Verhalten aktualisieren.
- [ ] `npm test`, `npm run test:rules`, die betroffenen Produktionsbuilds und die manuelle Prüfung erfolgreich ausführen.

### [ ] Erledigt, wenn

- [ ] Jeder Stundenzettel ist nachvollziehbar aus einem veröffentlichten Plan abgeleitet, ohne dessen Momentaufnahme zu
      verändern.
- [ ] Planzeit, tatsächliche Arbeitszeit, Pausenbestätigung, Abwesenheit und Korrekturen sind fachlich und technisch getrennt.
- [ ] Urlaub und Krankheit können im beschlossenen Umfang erfasst, geprüft und rollenabhängig angezeigt werden.
- [ ] Nachträgliche Veröffentlichungen oder Korrekturen überschreiben keine bereits bestätigten tatsächlichen Daten unbemerkt.
- [ ] Pfade, CRUD-Rechte, Statuswechsel und Datenschutz sind in Matrix, Code, Rules und Tests konsistent umgesetzt.
- [ ] Automatisierte Tests, Rules-Tests, Produktionsbuilds, Dokumentation und manuelle Rollenprüfung sind erfolgreich.
