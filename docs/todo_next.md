<!-- pur-system/docs/todo_next.md -->

# Offene Todos

## Legende

- `[x]` erledigt
- `[ ]` offen
- `[-]` zurückgestellt

## 20. Filialeinstellungen und Öffnungszeiten verwalten

#### Ziel

Filialbezogene Einstellungen werden unabhängig von einzelnen Fachbereichen als gemeinsame Grundlage je Filiale verwaltet. In der
Hauptnavigation entsteht dafür die ausklappbare Gruppe `Einstellungen`. Ihr erster Unterpunkt `Öffnungszeiten` ist unter
`/einstellungen/oeffnungszeiten` erreichbar; weitere Einstellungsseiten können später als gleichrangige Unterpunkte ergänzt
werden. Die gesamte Gruppe wird über den App-Bereich `einstellungen` freigegeben.

Der erste Ausbau umfasst die Feiertagsauflösung für Nordrhein-Westfalen sowie die Kundenöffnungszeiten. Die
Konfiguration wird unterhalb der jeweiligen Filiale in der Collection `einstellung` gespeichert. Das Dokument `allgemein`
enthält die dafür benötigten Grundlagen. Das Dokument `oeffnungszeiten` enthält die regelmäßigen Wochenregeln.
Wiederkehrende oder berechnete besondere Tage werden mit sichtbarer Bezeichnung in der Subcollection `sondertag` verwaltet.
Konkrete Abweichungen für ein einzelnes Datum liegen in der Subcollection `ausnahme`, damit die Listen nicht im zentralen
Einstellungsdokument wachsen.

Die Öffnungszeiten beschreiben ausschließlich den Kundenbetrieb der Filiale. Sie werden nicht mit den Arbeitszeiten eines
Schichtmodells vermischt und begrenzen Mitarbeiterschichten nicht automatisch. Dadurch bleiben Vor- und Nachbereitung sowie
Arbeiten an geschlossenen Tagen grundsätzlich fachlich abbildbar.

#### Betroffene Dateien

Änderungen:

- functions/src/create-benutzer.ts
- functions/src/create-benutzer.spec.ts
- functions/src/update-benutzer-profil.ts
- functions/src/update-benutzer-profil.spec.ts
- src/app/app.routes.ts
- src/app/app.routes.spec.ts
- src/app/commons/constants/app-kontext-selector.constants.ts
- src/app/commons/constants/app-kontext-selector.constants.spec.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/commons/constants/firebase.constants.spec.ts
- src/app/commons/constants/navigation.constants.ts
- src/app/commons/constants/navigation.constants.spec.ts
- src/app/commons/models/app/app-bereich.ts
- src/app/commons/models/app/firestore-pfad.types.ts
- src/app/commons/utils/benutzer/erlaubte-bereiche.ts
- src/app/commons/utils/benutzer/erlaubte-bereiche.spec.ts
- src/app/components/system/benutzer/benutzer-anlage/benutzer-anlage.ts
- src/app/components/system/benutzer/benutzer-anlage/benutzer-anlage.spec.ts
- src/app/components/system/benutzer/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-bearbeiten-dialog.ts
- src/app/components/system/benutzer/benutzer-verwaltung/benutzer-bearbeiten-dialog/benutzer-bearbeiten-dialog.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/matrizen/berechtigungen.md
- docs/matrizen/kontextselektor.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

Neu hinzuzufügen:

- src/app/commons/models/domain/filialeinstellung.ts
- src/app/commons/utils/filialeinstellung/feiertag.ts
- src/app/commons/utils/filialeinstellung/feiertag.spec.ts
- src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.ts
- src/app/commons/utils/filialeinstellung/oeffnungsregel-aufloesung.spec.ts
- src/app/pages/einstellungen/oeffnungszeiten-page/oeffnungszeiten-page.ts
- src/app/pages/einstellungen/oeffnungszeiten-page/oeffnungszeiten-page.html
- src/app/pages/einstellungen/oeffnungszeiten-page/oeffnungszeiten-page.scss
- src/app/pages/einstellungen/oeffnungszeiten-page/oeffnungszeiten-page.spec.ts
- src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.ts
- src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.html
- src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.scss
- src/app/components/einstellungen/oeffnungszeiten-filiale/oeffnungszeiten-filiale.spec.ts
- src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.ts
- src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.html
- src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.scss
- src/app/components/einstellungen/sondertag-bearbeiten-dialog/sondertag-bearbeiten-dialog.spec.ts
- docs/architektur/components/einstellungen.md
- docs/architektur/services/filialeinstellung-service.md
- docs/architektur/stores/filialeinstellung-store.md
- src/app/services/domain/filialeinstellung.service.ts
- src/app/services/domain/filialeinstellung.service.spec.ts
- src/app/stores/domain/filialeinstellung.store.ts
- src/app/stores/domain/filialeinstellung.store.spec.ts

#### Schritt 1: Firestore-Struktur und Einstellungsmodell festlegen

- [x] Die Collection `filiale/{filialeId}/einstellung` als gemeinsamen Ablageort für filialbezogene Konfiguration einführen.
- [x] Im Dokument `einstellung/allgemein` das Bundesland speichern. Die Oberfläche verwendet zunächst fest
      Nordrhein-Westfalen (`DE-NW`); eine Auswahl ist noch nicht vorgesehen. Die deutschlandweit einheitlich verwendete
      Zeitzone `Europe/Berlin` bleibt eine technische Konstante und wird nicht als Filialeinstellung gespeichert.
- [x] Im Dokument `einstellung/oeffnungszeiten` die festen Einträge `montag`, `dienstag`, `mittwoch`, `donnerstag`, `freitag`,
      `samstag` und `sonntag` als regelmäßige Wochenregeln speichern.
- [x] Jede geöffnete Öffnungsregel mit `beginnLokalzeit`, `endeLokalzeit` und `endetAmFolgetag` als genau einen durchgehenden
      Zeitraum modellieren. Pausen und mehrere Öffnungszeiträume innerhalb eines Tages sind nicht vorgesehen. Geschlossene
      Regeln enthalten ausschließlich `geoeffnet: false`.
- [x] Besondere Tage unter `einstellung/oeffnungszeiten/sondertag/{sondertagId}` speichern. Jeder Eintrag enthält mindestens
      `bezeichnung`, `aktiv`, eine diskriminierte `datumsregel` und eine eigene `oeffnungsregel`.
- [x] Für `datumsregel` mindestens `jaehrlichFestesDatum` mit Monat und Tag sowie `gesetzlicherFeiertag` mit einem zentral
      definierten Feiertagsschlüssel unterstützen. Dadurch lassen sich beispielsweise Heiligabend und Silvester ebenso wie
      Karfreitag oder Ostermontag eindeutig benennen und auflösen.
- [x] Datumsbezogene Abweichungen unter `einstellung/oeffnungszeiten/ausnahme/{YYYY-MM-DD}` speichern. Ein Ausnahmedokument
      enthält Datum, Bezeichnung und eine vollständige Öffnungsregel für genau dieses Datum.

#### Schritt 2: Auflösungsreihenfolge verbindlich definieren

- [x] Einen zentralen Katalog und eine lokal ausführbare Berechnung für bundeslandspezifische feste und bewegliche gesetzliche
      Feiertage bereitstellen. Feiertagsschlüssel, Bezeichnung und Datum dürfen keine unkontrollierte externe
      Laufzeitabhängigkeit haben.
- [x] Die bekannten gesetzlichen Feiertage sowie übliche feste Sondertage bei der Initialisierung einer Filiale als
      erweiterbare Liste anlegen. Benutzer bearbeiten deren Öffnungsregel und Aktivstatus; berechnete Feiertagsdaten werden
      nicht manuell gepflegt. Weitere feste jährliche Sondertage können ergänzt werden.
- [x] Für ein konkretes Datum zuerst eine datumsbezogene Ausnahme, danach einen passenden aktiven Sondertag und zuletzt die
      regelmäßige Wochenregel auswerten: `Ausnahme → Sondertag → Wochentag`.
- [x] Kollisionen mehrerer aktiver Sondertage für dasselbe Datum als Konfigurationsfehler behandeln. Eine Datumsausnahme darf
      eine solche Kollision bewusst überschreiben; ohne Ausnahme wird keine beliebige Reihenfolge verwendet.
- [x] Eine über Mitternacht reichende Öffnungsregel vollständig dem Datum zuordnen, an dem sie beginnt. Die Regel des Folgetags
      greift erst nach dem Ende dieses Zeitraums.
- [x] Bei einem Bundeslandwechsel gemeinsame systemdefinierte Feiertage mit ihrer angepassten Öffnungsregel erhalten, nicht mehr
      landesweit geltende entfernen und neu geltende aktiv sowie geschlossen ergänzen. Benutzerdefinierte Sondertage bleiben
      unverändert.
- [x] Fehlende oder unvollständige Einstellungen nicht stillschweigend als geöffnet interpretieren. Für Laden, Bearbeiten und
      Dienstplananlage einen verständlichen Fehler- beziehungsweise Initialisierungszustand festlegen.
- [x] Öffnungszeiten als Information behandeln. Ob eine konkrete Mitarbeiterschicht außerhalb der Öffnungszeit fachlich
      zulässig ist, wird nicht allein aus der Öffnungsregel abgeleitet.

#### Schritt 3: Service, Store und Sicherheit umsetzen

- [x] Einen `FilialeinstellungService` für das Laden und Speichern der allgemeinen Einstellungen, Wochenregeln, Sondertage und
      datumsbezogenen Ausnahmen einer konkreten Filiale bereitstellen.
- [x] Einen `FilialeinstellungStore` mit getrennten Filialkontexten, Lade- und Schreibzuständen sowie einer öffentlichen
      Auflösung der für ein Datum gültigen Öffnungsregel bereitstellen.
- [x] Schreibvorgänge für die begrenzten Einstellungsdokumente atomar ausführen und Sondertage sowie Ausnahmen als einzelne
      Dokumente unabhängig verwalten.
- [x] Firestore Rules auf berechtigte Rollen und Filialzugriffe, bekannte Dokument-IDs, gültige Feldmengen, Datumsregeltypen,
      lokale Zeitwerte und gültige Ausnahme-IDs im Format `YYYY-MM-DD` begrenzen.
- [x] Bestehende Filialen ohne Einstellungsdokumente kontrolliert initialisieren; Bundesland und Öffnungszeiten dürfen nicht aus
      Postleitzahl oder Ortsname geraten werden.

#### Schritt 4: Einstellungsoberfläche einordnen und umsetzen

- [x] Die komponentenlose Elternroute `/einstellungen` mit dem App-Bereich `einstellungen` und die direkt routbare Page
      `/einstellungen/oeffnungszeiten` anlegen. Die Sidebar zeigt `Einstellungen` als ausklappbare Gruppe und darunter zunächst
      ausschließlich `Öffnungszeiten`.
- [x] Öffnungszeiten je ausgewählter Filiale getrennt laden und bearbeiten; Änderungen einer Filiale dürfen keine andere
      ausgewählte Filiale beeinflussen. Bundesland und Zeitzone werden nicht als Formularfelder dargestellt.
- [x] Alle sieben Wochentage vollständig darstellen. Geschlossene Tage benötigen keine Zeitfelder; geöffnete Tage verlangen
      genau eine gültige Beginn- und Endzeit und können ausdrücklich am Folgetag enden.
- [x] Die Oberfläche in Wochentage, gesetzliche Feiertage und Sondertage gliedern. Heiligabend und Silvester werden als
      Sondertage und nicht als gesetzliche Feiertage dargestellt.
- [x] Eigene Sondertage mit Bezeichnung, Öffnungsstatus und gegebenenfalls abweichenden Zeiten anlegen, bearbeiten und löschen.
      Beim Anlegen wird zwischen einem konkreten Einzeldatum und einer jährlichen Wiederholung nach Monat und Tag gewählt.
- [x] Gesetzliche Feiertage aus dem zentralen Katalog anbieten; ihre Berechnungsregel ist nicht frei editierbar.
- [x] Die wirksame Priorität `Ausnahme → Sondertag → Wochentag` in der Oberfläche verständlich erläutern.

#### Tests und Abschluss

- [x] Modell- und Validierungstests für alle Wochentage, über Mitternacht reichende Zeiten, geschlossene Regeln, beide
      Datumsregeltypen, ungültige Zeiten, Sondertage und Ausnahmen ergänzen.
- [x] Service- und Store-Tests für getrennte Filialkontexte, Initialisierung, Sondertagspflege, Speichern und Löschen von
      Ausnahmen sowie die Datumsauflösung ergänzen.
- [x] Component-Tests für allgemeine Grundlagen, vollständige Wochenöffnung, Sondertage und datumsbezogene Ausnahmen ergänzen.
- [x] Navigation, Route Guard, Benutzeranlage und Profilbearbeitung für den App-Bereich `einstellungen` testen.
- [x] Firestore-Emulator-Tests für erlaubte Filialzugriffe, bekannte Einstellungsdokumente und abgewiesene Fremd- oder
      Fehlschreibzugriffe ergänzen.
- [ ] Manuell unterschiedliche Öffnungszeiten für jeden Wochentag, eine Öffnung bis zum Folgetag, einen festen Sondertag,
      einen berechneten Feiertag und eine überschreibende datumsbezogene Ausnahme prüfen.
- [x] Fachkonzept, Architektur, Projektstand und Datenübergang aktualisieren.
- [x] Firestore Rules und Functions mit dem App-Bereich `einstellungen` produktiv deployen und die Profilbearbeitung mit einem
      realen Masterkonto prüfen.
- [ ] Die geänderten Firestore Rules ohne gespeichertes Feld `zeitzone` produktiv deployen. Vorhandene ältere
      Einstellungsdokumente bleiben lesbar und entfernen das Feld beim nächsten Speichern.
- [ ] `npm test`, `npm run test:rules`, `npm run build:master`, `npm run build:office` und `npm run build:filiale` erfolgreich
      ausführen.

#### Erledigt, wenn

- [ ] Jede Filiale besitzt genau eine verbindliche allgemeine Einstellung mit dem zunächst fest verwendeten Bundesland
      Nordrhein-Westfalen.
- [ ] Jede Filiale besitzt eine Öffnungsregel für jeden Wochentag und eine erweiterbare, bezeichnete Liste besonderer Tage.
- [ ] Feste jährliche Sondertage und zentral berechnete gesetzliche Feiertage können unterschiedliche Öffnungsregeln besitzen.
- [ ] Datumsbezogene Ausnahmen überschreiben Sondertags- und Wochentagsregeln nachvollziehbar.
- [ ] Geschlossene und geöffnete Tage werden vollständig validiert und verständlich bearbeitet.
- [ ] Der berechtigte Benutzer erreicht die Öffnungszeiten über `Einstellungen → Öffnungszeiten`; der App-Bereich
      `einstellungen` schützt die gesamte Gruppe.
- [ ] Öffnungszeiten bleiben von den Arbeitszeiten der Schichtmodelle fachlich und technisch getrennt.
- [ ] Service, Store, UI und Firestore Rules arbeiten ausschließlich im konkreten Filialpfad.
- [ ] Tests, Builds, Dokumentation und der beschlossene Datenübergang sind abgeschlossen.

## 21. Dienst- und Schichtplanung

Der Schichtplan wird schrittweise aus filialbezogenen Monatsplänen aufgebaut, die in einer filialübergreifenden Arbeitsansicht
zusammengeführt werden können. Die erste Ausbaustufe konzentriert sich auf eine manuelle Planung mit klarer Entwurfs- und
Veröffentlichungslogik. Automatische Planung, Urlaubsverwaltung, Zeiterfassung, Schichttausch und Benachrichtigungen bleiben
zunächst außerhalb des vereinbarten Umfangs.

### [x] 21.1 Fachliches Modell und erste Ausbaustufe festlegen

#### Ziel

Vor der technischen Umsetzung werden die Begriffe, Zustände und verbindlichen Regeln einer filialbezogenen Schichtplanung
festgelegt. Die erste Ausbaustufe soll einen überschaubaren, fachlich vollständigen Ablauf von der manuellen Planung bis zur
Veröffentlichung abbilden.

#### Betroffene Dateien

Änderungen:

- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

#### Schritt 1: Planungsgegenstand und Zeitraum festlegen

- [x] `Dienstplan` als Plan einer Filiale für einen eindeutig bestimmten Zeitraum fachlich definieren.
- [x] Festlegen, ob die erste Ausbaustufe ausschließlich vollständige Kalendermonate oder frei wählbare Zeiträume
      unterstützt.
- [x] Zeitzone, Monatsgrenzen und Darstellung von Schichten über Mitternacht verbindlich festlegen.
- [x] Festlegen, ob pro Filiale und Zeitraum genau ein Dienstplan oder mehrere versionierte Pläne existieren dürfen.

#### Schritt 2: Schicht und Mitarbeiterzuordnung definieren

- [x] Pflichtangaben einer Schicht festlegen, mindestens Datum, Beginn, Ende, Pause und zugeordneter Mitarbeiter.
- [x] Entscheiden, ob eine Schicht optional eine Tätigkeit, einen Bereich oder eine kurze interne Notiz enthalten darf.
- [x] Festlegen, ob eine Schicht in der ersten Ausbaustufe genau einem Mitarbeiter oder mehreren Mitarbeitern zugeordnet wird.
- [x] Regeln für Schichten ohne Mitarbeiter sowie für inaktive oder nicht mehr der Filiale zugeordnete Mitarbeiter bestimmen.
- [x] Definieren, dass die Lohnzeit der vollständigen Zeitspanne von Beginn bis Ende entspricht und die bezahlte Pause
      einschließt.

#### Schritt 3: Zustände und fachliche Regeln festlegen

- [x] Mindestens die Zustände `entwurf` und `veroeffentlicht` einschließlich erlaubter Zustandswechsel definieren.
- [x] Festlegen, ob ein veröffentlichter Dienstplan direkt bearbeitet, in den Entwurf zurückgesetzt oder als neue Version
      fortgeführt wird.
- [x] Überlappende Mitarbeiterschichten, ungültige Zeitangaben und unzulässige Pausen als verbindliche Konflikte definieren.
- [x] Entscheiden, welche weiteren Hinweise wie lange Arbeitszeiten oder kurze Ruhezeiten zunächst nur angezeigt werden.
- [x] Festlegen, welche fachlichen Prüfungen das Speichern eines Entwurfs und welche erst die Veröffentlichung verhindern.

#### Tests und Abschluss

- [x] Begriffe, Zustände, Zeitregeln und Abgrenzung der ersten Ausbaustufe in `docs/projekt-plan.md` dokumentieren.
- [x] Die Entscheidungen mit den vorhandenen Filial- und Mitarbeiterdatenmodellen abgleichen.
- [x] Offene fachliche Entscheidungen ausdrücklich markieren und vor Beginn von 21.2 abschließen.

#### Erledigt, wenn

- [x] Dienstplan, Zeitraum, Schicht, Mitarbeiterzuordnung und Veröffentlichungszustände sind eindeutig beschrieben.
- [x] Pflichtangaben, Berechnungen, Konflikte und erlaubte Zustandswechsel sind festgelegt.
- [x] Der Umfang der ersten Ausbaustufe ist gegenüber späteren Erweiterungen klar abgegrenzt.

### [x] 21.2 Rollen, Datenzugriff und Arbeitsablauf festlegen

#### Ziel

Für jede Benutzerrolle wird verbindlich festgelegt, welche Dienstpläne sie in welchem Filialkontext lesen oder verändern darf.
Der Ablauf vom Entwurf bis zur veröffentlichten Ansicht erhält klare Verantwortlichkeiten.

#### Betroffene Dateien

Änderungen:

- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

#### Schritt 1: Rollen und Filialgrenzen festlegen

- [x] Leserechte für `master`, `office`, `filiale` und `mitarbeiter` je Dienstplanzustand festlegen.
- [x] Schreib-, Lösch- und Veröffentlichungsrechte der Rollen getrennt definieren.
- [x] Office-Zugriffe auf ausdrücklich freigegebene Filialen und Filialkonten auf ihre eigene Filiale begrenzen.
- [x] Für Mitarbeiter festlegen, ob sie nur eigene Schichten oder den veröffentlichten Plan ihrer Filialen sehen dürfen.
- [x] Die Rolle `dienstplaner` als zusätzliche Frontend-Bedienberechtigung für aktive Firma-Mitarbeiter der eigenen Filiale
      festlegen, ohne damit Schreibrechte in der Mitarbeiter-App zu gewähren.
- [x] Das Verhalten bei mehreren erlaubten Filialen ohne künstlichen Sammelkontext bestimmen.

#### Schritt 2: Planungsablauf festlegen

- [x] Verantwortliche Rolle für das Erstellen eines Dienstplans und das erstmalige Anlegen von Schichten bestimmen.
- [x] Bearbeitung, Prüfung, Veröffentlichung und gegebenenfalls Zurückziehen als nachvollziehbaren Ablauf definieren.
- [x] Festlegen, ob und wie veröffentlichte Pläne nachträglich geändert werden dürfen.
- [x] Entscheiden, ob Änderungen und Veröffentlichungen mit Benutzer, Zeitpunkt und vorherigem Zustand protokolliert werden.
- [x] Verhalten bei gelöschten, inaktiven oder aus einer Filiale entfernten Mitarbeitern festlegen.

#### Schritt 3: Abgrenzung späterer Funktionen dokumentieren

- [x] Automatische Schichtplanung und Optimierung zunächst ausschließen.
- [x] Urlaubs-, Krankheits- und sonstige Abwesenheitsverwaltung als eigene spätere Fachfunktion behandeln.
- [x] Zeiterfassung, Sollstunden, Lohnabrechnung und gesetzliche Gesamtprüfung zunächst ausschließen.
- [x] Schichttausch, Freigabewünsche und Push-Benachrichtigungen für eine spätere Ausbaustufe vormerken.
- [x] Offline-Schreibvorgänge nur bei konkretem Bedarf über das zurückgestellte Todo 9 planen.

#### Tests und Abschluss

- [x] Eine Rollenmatrix für Lesen, Erstellen, Bearbeiten, Löschen und Veröffentlichen dokumentieren.
- [x] Beispielabläufe für Filiale, Office und Mitarbeiter anhand mindestens eines Dienstplans prüfen.
- [x] Die Rollenentscheidungen mit Navigation, Bereichsfreigaben und vorhandenen Datenzugriffsregeln abgleichen.

#### Erledigt, wenn

- [x] Jede Rolle besitzt eindeutig festgelegte Rechte pro Filialkontext und Dienstplanzustand.
- [x] Der vollständige Arbeitsablauf vom Entwurf bis zur veröffentlichten Ansicht ist beschrieben.
- [x] Spätere Funktionen sind ausdrücklich vom ersten Umsetzungsumfang abgegrenzt.

### [x] 21.3 Datenmodell, Firestore-Pfade und Sicherheitsregeln planen

#### Ziel

Das technische Datenmodell bildet die beschlossenen fachlichen Regeln ohne sprachlich gemischte Firestore-Pfade ab. Datenzugriffe,
gleichzeitige Änderungen und veröffentlichte Stände werden vor der UI-Umsetzung sicher geplant.

#### Betroffene Dateien

Änderungen:

- src/app/commons/models/domain/dienstplan.ts
- src/app/commons/models/domain/schicht.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/commons/constants/app-kontext-selector.constants.ts
- src/app/commons/constants/app-kontext-selector.constants.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/matrizen/cache-strategien.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

#### Schritt 1: Domainmodell und Firestore-Struktur entwerfen

- [x] IDs, Referenzen, Zeitwerte, Zustände und Änderungsmetadaten für Dienstplan und Schicht modellieren.
- [x] Entscheiden, ob Schichten im Dienstplandokument oder in einer Untercollection gespeichert werden.
- [x] Einen ausschließlich deutschen Firestore-Pfad innerhalb der bestehenden Unternehmer-, Firmen- und Filialhierarchie
      festlegen.
- [x] Abfragewege für Filiale, Zeitraum, Mitarbeiter und Veröffentlichungszustand bestimmen.
- [x] Pur Filiale auf die vollständige Startladung aller Mitarbeiter mit der bestehenden Stammdatenstrategie `cacheFirst` sowie
      aller Dienstpläne, Versionen und Schichten der eigenen Filiale ohne Jahresbegrenzung mit `networkFirst` und persistentem
      IndexedDB-Cache festlegen.
- [x] Master und Office auf gezieltes Laden einer ausgewählten Filiale und eines Monats sowie Mitarbeiter auf die
      veröffentlichte Version eines ausgewählten Monats mit `networkOnly` festlegen.
- [x] Benötigte Firestore-Indizes und erwartete Dokumentgrößen prüfen.
- [x] Festhalten, dass die erste Ausbaustufe keine zusätzlichen zusammengesetzten Indizes benötigt und die getrennten Dokumente
      nicht mit der Anzahl der Jahre, Versionen oder Schichten anwachsen.

#### Schritt 2: Konsistenz und gleichzeitige Bearbeitung planen

- [x] Festlegen, welche Änderungen atomar in einer Transaktion oder einem Batch gespeichert werden müssen.
- [x] Eine Strategie für konkurrierende Änderungen an demselben Dienstplan bestimmen.
- [x] Sicherstellen, dass die Veröffentlichung nur für einen vollständig geprüften aktuellen Stand möglich ist.
- [x] Entscheiden, ob veröffentlichte Versionen unveränderlich gespeichert oder über ein Änderungsprotokoll nachvollzogen
      werden.
- [x] Verhalten bei teilweise fehlgeschlagenen Schreibvorgängen festlegen.
- [x] Alle Dienstplanaktionen im Angular-Frontend über den Firestore Client ausführen und Cloud Functions sowie andere
      serverseitige Fachaktionen für diesen Bereich ausschließen.
- [x] Jede Schichtänderung über das gemeinsame Versionsdokument serialisieren und dessen Revision genau um eins erhöhen.
- [x] Bei abweichender Revision den Schreib- oder Veröffentlichungsvorgang abbrechen, den aktuellen Stand laden und erneut
      prüfen.

#### Schritt 3: Firestore Rules planen

- [x] Die rekursive Filialregel so begrenzen, dass sie keine der drei konkreten Dienstplanregeln umgehen kann.
- [x] Gemeinsame Hilfsfunktionen für aktives Profil, Auth-Rolle und vollständigen Filialpfad verwenden.
- [x] Je eine Regel für Dienstplan, Version und Schicht anlegen.
- [x] Planer auf erlaubte Filialen und Entwürfe begrenzen sowie Schema, UID, Zeitstempel, Revision, Zustandswechsel und
      Mitarbeiterreferenz prüfen.
- [x] Mitarbeiterzugänge auf die aktuelle veröffentlichte Version zugeordneter Filialen begrenzen und Schreibzugriffe sperren.
- [x] Dokumentieren, dass Firestore Rules den im Filial-Frontend geführten Mitarbeiter nicht als Auth-Identität erkennen und die
      zusätzliche Prüfung auf `dienstplaner` daher bei einem manipulierten Client umgangen werden kann.
- [x] Dokumentieren, dass zeitliche Konflikte ohne serverseitige Fachlogik nur im Frontend geprüft und nicht vollständig gegen
      einen manipulierten Client abgesichert werden können.

#### Tests und Abschluss

- [x] Modelltests für Zeitberechnung, Zustände und Normalisierung vorbereiten.
- [x] Firestore-Emulator-Testfälle für jede Rolle, fremde Filialen und unerlaubte Zustandswechsel festlegen.
- [x] Das Datenmodell anhand eines Dienstplans mit mehreren Tagen, Mitarbeitern und Schichten probeweise durchspielen.
- [x] Datenmodell, Pfade, Indizes und Sicherheitsentscheidungen in der Projektdokumentation festhalten.

#### Erledigt, wenn

- [x] Domainmodell, Firestore-Pfade, Abfragen und benötigte Indizes sind eindeutig festgelegt.
- [x] Konsistenz- und Konfliktstrategie unterstützen den beschlossenen Veröffentlichungsablauf.
- [x] Rollen- und Filialgrenzen können durch automatisierte Firestore-Emulator-Tests nachgewiesen werden.

### [x] 21.4 Dienstplan-Grundfunktion umsetzen

#### Ziel

Die vorhandene Platzhalterseite wird zu einer bedienbaren filialbezogenen Monatsplanung. Berechtigte Benutzer können einen
Entwurf anlegen, filialbezogene Schichtvorlagen verwalten und Mitarbeiter mithilfe dieser Vorlagen manuell zuordnen.

#### Betroffene Dateien

Änderungen:

- src/app/app.routes.ts
- src/app/app.routes.spec.ts
- src/app/commons/constants/navigation.constants.ts
- src/app/commons/constants/navigation.constants.spec.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/commons/models/app/firestore-lesestrategie.types.ts
- src/app/commons/models/domain/dienstplan.ts
- src/app/commons/models/domain/schicht.ts
- src/app/commons/tokens/firebase.tokens.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- src/app/services/core/app-daten-init.service.ts
- src/app/services/core/app-daten-init.service.spec.ts
- src/app/services/firebase/firestore-db.service.ts
- src/app/services/firebase/firestore-db.service.spec.ts
- src/environments/environment.ts
- src/environments/environment.master-prod.ts
- src/environments/environment.office-prod.ts
- src/environments/environment.filiale-prod.ts
- src/environments/environment.mitarbeiter-prod.ts
- src/environments/environment.spec.ts
- docs/projekt-stand.md
- docs/matrizen/berechtigungen.md
- docs/todo_next.md

Neu hinzuzufügen:

- docs/architektur/components/schichtplan.md
- docs/architektur/services/dienstplan-service.md
- docs/architektur/services/schichtvorlage-service.md
- docs/architektur/stores/dienstplan-store.md
- docs/architektur/stores/schichtvorlage-store.md
- src/app/commons/models/domain/schichtvorlage.ts
- src/app/commons/utils/dienstplan/dienstplan-zeitraum.ts
- src/app/commons/utils/dienstplan/dienstplan-zeitraum.spec.ts
- src/app/commons/utils/dienstplan/schicht-zeit.ts
- src/app/commons/utils/dienstplan/schicht-zeit.spec.ts
- src/app/commons/utils/dienstplan/schicht-lokalzeit.ts
- src/app/commons/utils/dienstplan/schicht-lokalzeit.spec.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.html
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.scss
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.spec.ts
- src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.ts
- src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.html
- src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.scss
- src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.spec.ts
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.ts
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.html
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.scss
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.spec.ts
- src/app/guards/dienstplan-planung.guard.ts
- src/app/guards/dienstplan-planung.guard.spec.ts
- src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.ts
- src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.html
- src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.scss
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.html
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.scss
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.spec.ts
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.ts
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.html
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.scss
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.spec.ts
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/services/domain/schichtvorlage.service.ts
- src/app/services/domain/schichtvorlage.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- src/app/stores/domain/schichtvorlage.store.ts
- src/app/stores/domain/schichtvorlage.store.spec.ts

#### Schritt 1: Dienstpläne laden und Kontext anbinden

- [x] Den Dienstplan-Service für filial- und zeitraumbezogene Lese- und Schreibzugriffe umsetzen.
- [x] Den Dienstplan-Store mit `download`, `isLoaded`, `inProgress`, ausgewähltem Zeitraum und aktuellem Dienstplan aufbauen.
- [x] In Pur Filiale den vollständigen Dienstplanbestand der eigenen Filiale mit `networkFirst` beim Sitzungsstart laden.
- [x] `schichtplan` als komponentenlose Elternroute mit getrennten Pages für Ansicht, Planung und Schichtvorlagen aufbauen.
- [x] Planung und Einstellungen durch einen eigenen Guard zunächst auf aktive Master- und Office-Konten begrenzen.
- [x] Die Seite an den erlaubten Unternehmer-, Firmen- und Filialkontext der Sitzung anbinden.
- [x] Für fehlenden oder uneindeutigen Filialkontext einen verständlichen leeren beziehungsweise gesperrten Zustand anzeigen.

#### Schritt 2: Monatsübersicht umsetzen

- [x] Zeitraumsteuerung für vorherigen, aktuellen und nächsten Monat ergänzen.
- [x] Tage, Schichten und Mitarbeiter in einer auf Desktop und kleinen Viewports bedienbaren Monatsansicht darstellen.
- [x] Ladezustand, leeren Dienstplan, Ladefehler und erneutes Laden sichtbar behandeln.
- [x] Schichtbeginn, Schichtende, Pause und berechnete Lohnzeit verständlich anzeigen.
- [x] Den aktuellen Entwurfs- oder Veröffentlichungszustand eindeutig darstellen.

#### Schritt 3: Schichten manuell verwalten

- [x] Material-Dialog zum Anlegen und Bearbeiten einer Schicht umsetzen.
- [x] In jeder Tageskarte eines bearbeitbaren Entwurfs eine Anlageaktion anbieten und das gewählte Datum an den Schichtdialog
      übergeben.
- [x] Nur Mitarbeiter anbieten, die gemäß Fachmodell für die gewählte Filiale eingeplant werden dürfen.
- [x] Das Schichtformular fachlich vollständig validieren: gültiges Datum im Dienstplanmonat, zulässige Mitarbeiter- und
      Vorlagenzuordnung sowie eine ganzzahlige, nicht negative Pause unterhalb der Schichtdauer; ungültige Zeitpunkte der
      Zeitzonenumrechnung als Formularfehler anzeigen.
- [x] Laufende Schreibvorgänge gegen Mehrfachausführung schützen und das gesamte Formular währenddessen deaktivieren.
- [x] Schichten gemäß Rollen- und Zustandsregeln anlegen, bearbeiten und löschen.
- [x] Erfolgreiche Änderungen ohne unnötiges vollständiges Neuladen in den Store übernehmen.
- [x] `mitarbeiterAnzeigename` aus dem Schichtmodell und den Schreibzugriffen entfernen; ausschließlich `mitarbeiterId` als
      Mitarbeiterzuordnung speichern.
- [x] Für alle Rollen Anzeigename und `farbkennung` über die `mitarbeiterId` aus dem Mitarbeiter-Store auflösen und nur
      fehlende, im geöffneten Dienstplan referenzierte Mitarbeiterdokumente gezielt nachladen.

#### Schritt 4: Filialbezogene Schichtvorlagen umsetzen

- [x] Schichtvorlagen mit Bezeichnung, lokaler Beginn- und Endzeit, automatisch abgeleitetem Folgetag, automatisch berechneter
      Standardpause und Aktivstatus unter dem vollständigen Filialpfad modellieren.
- [x] Lesen und Verwalten der Vorlagen auf berechtigte Planer der konkreten Filiale begrenzen und Mitarbeiterzugänge durch
      Firestore Rules ausschließen.
- [x] Eine kompakte Verwaltung zum Anlegen, Bearbeiten und Deaktivieren filialbezogener Schichtvorlagen bereitstellen.
- [x] Im Schichtdialog eine aktive Vorlage der ausgewählten Filiale statt frei eingegebener regulärer Schichtzeiten auswählen.
- [x] Vorlagen-ID, Bezeichnung, Beginn, Ende und Pause als Momentaufnahme in die konkrete Schicht übernehmen, damit spätere
      Vorlagenänderungen vorhandene Dienstplanstände nicht verändern.
- [x] Beginn und Ende aus Datum, Vorlagenzeiten, automatisch abgeleitetem Folgetag und `Europe/Berlin` zuverlässig in absolute
      Zeitpunkte umwandeln.

#### Tests und Abschluss

- [x] Service-Tests für Laden, Anlegen, Bearbeiten, Löschen und Fehlerweitergabe ergänzen.
- [x] Store-Tests für Zustandsübergänge, Kontextwechsel und Schreibvorgänge ergänzen.
- [x] Component-Tests für Monatswechsel, leere Zustände, Formularvalidierung und rollenabhängige Aktionen ergänzen.
- [x] Service-, Store-, Rules- und Component-Tests für Vorlagenverwaltung, Filialgrenzen, Vorlagenauswahl und unveränderliche
      Schichtmomentaufnahmen ergänzen.
- [x] Service-, Store-, Rules- und Component-Tests für die ID-basierte Mitarbeiterauflösung, gezieltes Nachladen sowie inaktive
      oder nicht mehr der Filiale zugeordnete Mitarbeiter ergänzen.
- [x] Tastaturbedienung, Dialogfokus und Darstellung auf Desktop sowie kleinem Viewport manuell prüfen.
- [x] Verantwortlichkeiten und tatsächliche APIs von Dienstplan- und Schichtvorlagen-Service unter `docs/services`
      dokumentieren.
- [x] Zustand, Ableitungen und tatsächliche APIs von Dienstplan- und Schichtvorlagen-Store unter `docs/stores` dokumentieren.
- [x] Aufbau und Verantwortlichkeiten der Schichtplan-Komponenten unter `docs/components` dokumentieren.
- [x] `npm test` und die vorhandenen Builds für alle vier Auslieferungsvarianten erfolgreich ausführen.
      Beim Abschluss waren `npm test`, `npm run test:rules`, `npm run build:master`, `npm run build:office`,
      `npm run build:filiale` und `npm run build:mitarbeiter` erfolgreich. Der aktuelle lokale Buildstatus ist in
      `docs/projekt-stand.md` dokumentiert.

#### Erledigt, wenn

- [x] Berechtigte Benutzer können einen Dienstplanentwurf für eine erlaubte Filiale und einen Monat öffnen.
- [x] Schichtvorlagen können je Filiale verwaltet und beim Einplanen ausgewählt werden.
- [x] Schichten können mit einer aktiven Vorlage und gültiger Mitarbeiterzuordnung angelegt, bearbeitet und gelöscht werden.
- [x] Änderungen an einer Schichtvorlage verändern keine bereits gespeicherten Schichten.
- [x] Nicht berechtigte Rollen, fremde Filialen und unzulässige Zustände erlauben keine Änderung.
- [x] Monatsansicht, Fehlerzustände und Formulare sind auf Desktop und kleinen Viewports bedienbar.

### [x] 21.5 Filialübergreifenden Arbeitskontext umsetzen

#### Ziel

Mehrere erlaubte Filialdienstpläne können für einen gemeinsam ausgewählten Monat geladen, eindeutig unterschieden und in einer
gemeinsamen Planungsoberfläche bearbeitet werden. Jeder Filialdienstplan bleibt dabei fachlich und technisch eigenständig.

#### Betroffene Dateien

Änderungen:

- src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.ts
- src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.html
- src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.spec.ts
- src/app/components/data-selectors/app-kontext-selector/filiale-selector/filiale-selector.ts
- src/app/components/data-selectors/app-kontext-selector/filiale-selector/filiale-selector.html
- src/app/components/data-selectors/app-kontext-selector/filiale-selector/filiale-selector.spec.ts
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.html
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.scss
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.spec.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.html
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.scss
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.spec.ts
- src/app/commons/constants/app-kontext-selector.constants.ts
- src/app/commons/constants/app-kontext-selector.constants.spec.ts
- src/app/stores/app/app-kontext.store.ts
- src/app/stores/app/app-kontext.store.spec.ts
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.ts
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.html
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.scss
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.spec.ts
- src/assets/scss/_main.scss
- src/assets/scss/base/_layout.scss
- src/assets/scss/modules/_dialog.scss
- src/assets/scss/modules/_form.scss
- docs/architektur/components/schichtplan.md
- docs/projekt-stand.md
- docs/todo_next.md

Neu hinzugefügt:

- src/app/commons/utils/datum/monat.ts
- src/app/commons/utils/datum/monat.spec.ts
- src/app/components/date-selectors/monat-selector/monat-selector.ts
- src/app/components/date-selectors/monat-selector/monat-selector.html
- src/app/components/date-selectors/monat-selector/monat-selector.scss
- src/app/components/date-selectors/monat-selector/monat-selector.spec.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.html
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.spec.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.scss
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.ts
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.html
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.scss
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.spec.ts
- src/assets/scss/modules/_scrollbar.scss

#### Schritt 1: Gemeinsamen Auswahlkontext bereitstellen

- [x] Unternehmer-, Firmen- und Filialselektoren während des Stammdatenladens ausblenden und danach nur bei mehr als einem
      fachlich wählbaren Eintrag unmittelbar darstellen.
- [x] Eindeutige Unternehmer, Firmen und Filialen automatisch auswählen und ihre Selektoren ausblenden.
- [x] Rollenabhängig mögliche Selektoren nach dem Laden bereichsübergreifend sichtbar halten und in Bereichen ohne fachliche
      Bearbeitung deaktivieren.
- [x] Den Filialkontext auf eine Mehrfachauswahl konkreter Filialen umstellen und den künstlichen Eintrag `Alle Filialen`
      entfernen.
- [x] Bei vorhandenen Filialen zunächst die erste Filiale auswählen und anschließend die Auswahl einer oder mehrerer konkreter
      Filialen ermöglichen.
- [x] Eine gemeinsame Monatsauswahl bereitstellen, deren ausgewählter Monat für die Dienstpläne aller ausgewählten Filialen
      gilt.

#### Schritt 2: Filialdienstpläne gemeinsam darstellen

- [x] Für den gemeinsam ausgewählten Monat die filialbezogenen Dienstpläne aller ausgewählten Filialen über ihre direkten
      Firestore-Pfade laden.
- [x] Für jede ausgewählte Filiale einen eigenen Monatsplanabschnitt mit filialbezogenem Lade-, Fehler-, Leer- oder Planzustand
      darstellen.
- [x] Einen fehlenden Monatsplan nur im betroffenen Filialabschnitt anlegen und die übrigen Filialpläne davon unberührt lassen.
- [x] Jede dargestellte Schicht eindeutig mit ihrer Filiale kennzeichnen.
- [x] Gemeinsam dargestellte Filialdienstpläne weiterhin als eigenständige Pläne behandeln und Änderungen ausschließlich im
      jeweiligen Filialdienstplan speichern.
- [x] Die Monatspläne und die vorbereitete Mitarbeiterübersicht responsiv anordnen und mit einer gemeinsamen Scrollbar-Lösung
      versehen.

#### Schritt 3: Filialbezogene Planungsaktionen bereitstellen

- [x] Beim Anlegen einer Schicht die Filiale des jeweiligen Monatsplanabschnitts übernehmen und die Auswahl auf deren Mitarbeiter
      und Schichtvorlagen begrenzen.
- [x] In jeder Tageskarte eines bearbeitbaren Entwurfs eine Anlageaktion anbieten und das gewählte Datum an den Schichtdialog
      übergeben.
- [x] Für jede ausgewählte Filiale einen eigenen Schichtvorlagenabschnitt laden und Vorlagen ausschließlich in ihrem jeweiligen
      Filialkontext verwalten.

#### Tests und Abschluss

- [x] Store- und Component-Tests für automatische erste Filialauswahl, Mehrfachauswahl, gemeinsames Laden und eindeutige
      Filialkennzeichnung ergänzen.
- [x] Den filialabhängigen Schichtdialog mit Zielfiliale, Vorlagen und Mitarbeiterbegrenzung testen.
- [x] Monatsauswahl, Arbeitsfläche, Scrollverhalten und responsive Darstellung auf Desktop und kleinen Viewports prüfen.
- [x] Den tatsächlichen Aufbau der Schichtplan-Komponenten und den Umsetzungsstand dokumentieren.

#### Erledigt, wenn

- [x] Benutzer können die Monatspläne mehrerer erlaubter Filialen gemeinsam anzeigen und eindeutig unterscheiden.
- [x] Filialauswahl, Monatsauswahl und direkte Firestore-Zugriffe arbeiten ohne künstlichen Sammelkontext zusammen.
- [x] Änderungen bleiben auf den jeweils betroffenen Filialdienstplan begrenzt.
- [x] Die gemeinsame Planungsoberfläche ist auf Desktop und kleinen Viewports bedienbar.

### [x] 21.6 Schichtmodelle und rasterbasierte Monatsplanung umsetzen

#### Ziel

Die bisherige Auswahl einzelner filialbezogener Schichtvorlagen wird durch vollständige filialbezogene Schichtmodelle ersetzt.
Ein Schichtmodell enthält eigene, automatisch nach Beginnzeit geordnete Modellschichten. Beim Anlegen eines Monatsdienstplans
wird ein Modell als unveränderliche Momentaufnahme übernommen und bestimmt die Schichtspalten des gesamten Monatsrasters.

Hinweis zum abgeschlossenen Stand: Die Momentaufnahme bleibt am Monatsdienstplan und gilt für alle Versionen. 21.8 ergänzt das
Löschen und erneute Anlegen eines leeren, noch nie veröffentlichten Erstentwurfs. Nach der ersten Veröffentlichung bleibt das
Modell für den Monatsplan unveränderlich.

#### Betroffene Dateien

Änderungen:

- src/app/app.routes.ts
- src/app/app.routes.spec.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/commons/constants/navigation.constants.ts
- src/app/commons/constants/navigation.constants.spec.ts
- src/app/commons/models/domain/dienstplan.ts
- src/app/commons/models/domain/schicht.ts
- src/app/commons/models/domain/schichtvorlage.ts
- src/app/commons/utils/dienstplan/schicht-lokalzeit.ts
- src/app/commons/utils/dienstplan/schicht-lokalzeit.spec.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.html
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.spec.ts
- src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.ts
- src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.html
- src/app/components/schichtplan/schicht-bearbeiten-dialog/schicht-bearbeiten-dialog.spec.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.html
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.scss
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.spec.ts
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.ts
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.html
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.scss
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.spec.ts
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.ts
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.html
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.scss
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.spec.ts
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.ts
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.html
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.scss
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.spec.ts
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/services/domain/schichtvorlage.service.ts
- src/app/services/domain/schichtvorlage.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- src/app/stores/domain/schichtvorlage.store.ts
- src/app/stores/domain/schichtvorlage.store.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/architektur/components/schichtplan.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/architektur/services/dienstplan-service.md
- docs/architektur/services/schichtvorlage-service.md
- docs/architektur/stores/dienstplan-store.md
- docs/architektur/stores/schichtvorlage-store.md
- docs/todo_next.md

Neu hinzuzufügen:

- src/app/commons/models/domain/schichtmodell.ts
- src/app/commons/utils/dienstplan/modellschicht-sortierung.ts
- src/app/commons/utils/dienstplan/modellschicht-sortierung.spec.ts
- src/app/services/domain/schichtmodell.service.ts
- src/app/services/domain/schichtmodell.service.spec.ts
- src/app/stores/domain/schichtmodell.store.ts
- src/app/stores/domain/schichtmodell.store.spec.ts
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.ts
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.html
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.scss
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.spec.ts
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.ts
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.html
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.scss
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.spec.ts
- src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.ts
- src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.html
- src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.scss
- src/app/components/schichtplan/schichtmodelle-filiale/schichtmodelle-filiale.spec.ts
- src/app/pages/schichtplan/schichtmodelle-page/schichtmodelle-page.ts
- src/app/pages/schichtplan/schichtmodelle-page/schichtmodelle-page.html
- src/app/pages/schichtplan/schichtmodelle-page/schichtmodelle-page.scss
- src/app/pages/schichtplan/schichtmodelle-page/schichtmodelle-page.spec.ts
- docs/architektur/services/schichtmodell-service.md
- docs/architektur/stores/schichtmodell-store.md

#### Schritt 1: Datenmodell und Übergang festlegen

- [x] Ein filialbezogenes Schichtmodell mit Bezeichnung, Aktivstatus und geordneten eigenen Modellschichten modellieren.
- [x] Modellschichten mit stabiler ID, Bezeichnung, lokaler Beginn- und Endzeit, abgeleitetem Folgetag, automatisch berechneter
      Standardpause und einer aus der Beginnzeit abgeleiteten Reihenfolge definieren.
- [x] Eine durch Firestore Rules prüfbare Speicherung der Modellschichten und der Dienstplan-Momentaufnahme festlegen, ohne die
      Anzahl der Schichten redundant zu speichern.
- [x] Den Monatsdienstplan um Modell-ID, Modellbezeichnung und vollständige geordnete Modell-Momentaufnahme erweitern.
- [x] Konkrete Schichten über die ID ihrer Modellschicht mit der Momentaufnahme verbinden und die bisherigen Vorlagenfelder aus
      dem neuen Schreibmodell entfernen.
- [x] Vorhandene Schichtvorlagen und bereits angelegte Entwicklungsdienstpläne erfassen und vor der Datenumstellung verbindlich
      entscheiden, ob sie migriert oder kontrolliert entfernt und neu angelegt werden. Die bisherige Schichtvorlagen-Collection
      wurde entfernt; Entwicklungsdienstpläne werden nicht migriert und nach der Umstellung neu angelegt.

#### Schritt 2: Filialbezogene Schichtmodelle verwalten

- [x] Service und Store für das Laden, Anlegen, Bearbeiten und Deaktivieren der Schichtmodelle einer konkreten Filiale umsetzen.
- [x] Eine Modellverwaltung je ausgewählter Filiale bereitstellen und firmenweite oder filialübergreifende Modelle
      ausschließen.
- [x] Im Modelldialog Bezeichnung und eine dynamische geordnete Liste von mindestens einer Modellschicht bearbeiten können.
- [x] Modellschichten hinzufügen und entfernen; ihre Spaltenreihenfolge automatisch nach der lokalen Beginnzeit bestimmen.
- [x] Beginn, Ende, Folgetag, Schichtdauer und Standardpause jeder Modellschicht nach den bestehenden Zeitregeln validieren.
- [x] Neue Modelle aktiv anlegen und verwendete Modelle bei Bedarf deaktivieren, ohne bestehende Monatspläne zu verändern.
- [x] Navigation, Route und Seitentitel von Schichtvorlagen auf Schichtmodelle umstellen.

#### Schritt 3: Monatsdienstplan mit Modell-Momentaufnahme anlegen

- [x] Beim Anlegen eines Monatsdienstplans ausschließlich aktive Schichtmodelle der konkreten Filiale anbieten.
- [x] Die Anlage verhindern, solange kein gültiges Modell gewählt wurde oder der Plan für den Monat bereits existiert.
- [x] Dienstplan, erste Entwurfsversion und vollständige Modell-Momentaufnahme in einem konsistenten Schreibvorgang anlegen.
- [x] Die Modell-Momentaufnahme für alle späteren Versionen dieses Monatsplans unveränderlich beibehalten.
- [x] Änderungen und Deaktivierung des ursprünglichen Modells ohne Auswirkungen auf bestehende Monatspläne halten.
- [x] Lade- und Cache-Strategien um Schichtmodelle und Modell-Momentaufnahmen ergänzen.

#### Schritt 4: Monatsplanung als Schichtraster darstellen

- [x] Für jede Filiale ein Raster mit einer ersten Spalte für die Kalendertage und je einer weiteren Spalte pro Modellschicht
      darstellen.
- [x] Spaltenbezeichnung und Reihenfolge ausschließlich aus der Modell-Momentaufnahme des Monatsplans ableiten.
- [x] In jeder Rasterzelle die einem Kalendertag und einer Modellschicht zugeordneten Mitarbeiterschichten darstellen.
- [x] In einem bearbeitbaren Entwurf pro Rasterzelle eine Anlageaktion anbieten und Datum sowie Modellschicht automatisch an den
      Schichtdialog übergeben.
- [x] Im Schichtdialog nur den Mitarbeiter auswählen beziehungsweise ändern, Datum, Modellschicht und lokale Uhrzeiten
      schreibgeschützt anzeigen sowie die Pause ohne eigenes Dialogfeld aus der Modellschicht übernehmen.
- [x] Mehrere Mitarbeiter in derselben Modellschicht eines Tages weiterhin als getrennte konkrete Schichten unterstützen.
- [x] Das Raster auf kleinen Viewports horizontal bedienbar halten und Datums- sowie Schichtzuordnung eindeutig darstellen.

#### Schritt 5: Bisherige Schichtvorlagenstruktur ablösen

- [x] Schichtvorlagen-Page, -Components, -Dialog, -Service, -Store und zugehörige Domainmodelle nach erfolgreicher Umstellung
      durch ihre Schichtmodell-Entsprechungen ersetzen.
- [x] Nicht mehr benötigte Vorlagenpfade, Konstanten, Rules und Testdaten entfernen, ohne andere Filialdaten zu verändern.
- [x] Gemischte alte und neue Dokumentformate nach Abschluss des Übergangs ausschließen.
- [x] Bestehende Zeitberechnungs-Utilities weiterverwenden und nur schichtvorlagenspezifische Kopplungen auflösen.
- [x] Projektstand sowie Component-, Service- und Store-Dokumentation auf die tatsächlich umgesetzten APIs und Abläufe
      aktualisieren.

#### Tests und Abschluss

- [x] Modelltests für Reihenfolge, Modellschichtzeiten, Folgetag, Standardpause und Momentaufnahme ergänzen.
- [x] Service- und Store-Tests für filialgetrennte Modellbestände, Schreibvorgänge, Kontextwechsel und Fehlerweitergabe
      ergänzen.
- [x] Component-Tests für Modellformular, Modellauswahl, Rasterdarstellung und zellbezogene Schichtanlage ergänzen.
- [x] Firestore-Emulator-Tests für Schichtmodelle, Modell-Momentaufnahmen, Filialgrenzen und unerlaubte Schreibzugriffe
      ergänzen.
- [x] Den beschlossenen Übergang vorhandener Entwicklungsdaten durchführen und das Ergebnis kontrollieren.
- [x] Modellverwaltung, Monatsanlage und Rasterbedienung mit mehreren Modellen und unterschiedlichen Schichtanzahlen manuell
      prüfen.
- [x] `npm test`, `npm run test:rules`, `npm run build:master`, `npm run build:office`, `npm run build:filiale` und
      `npm run build:mitarbeiter` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Jede Filiale kann mehrere voneinander unabhängige Schichtmodelle mit eigenen Modellschichten verwalten.
- [x] Beim Anlegen eines Monatsdienstplans wird genau ein aktives Modell gewählt und unveränderlich übernommen.
- [x] Das Monatsraster bildet seine Spalten aus der Modell-Momentaufnahme und seine Zeilen aus den Kalendertagen.
- [x] Mitarbeiterschichten können über eine eindeutige Rasterzelle angelegt, bearbeitet und gelöscht werden.
- [x] Spätere Modelländerungen verändern keine bestehenden Entwürfe, veröffentlichten oder archivierten Dienstpläne.
- [x] Die bisherige Schichtvorlagenstruktur wird nicht mehr für neue Dienstpläne verwendet.
- [x] Tests, Rules, Builds, Dokumentation und der beschlossene Datenübergang sind abgeschlossen.

### [x] 21.7 Mitarbeiter per Drag-and-drop im Schichtraster einplanen

#### Ziel

Aktive Mitarbeiter aus allen ausgewählten Filialen werden in der Mitarbeiterübersicht ohne Duplikate zusammengeführt, mit ihren
relevanten Monatswerten dargestellt und können direkt in eine zulässige Rasterzelle gezogen werden. Das Ablegen legt die
konkrete Schicht ohne zusätzliche Auswahl von Datum, Modellschicht oder Zeitwerten an. Die bestehende Anlageaktion bleibt als
gleichwertige Tastatur- und Mobilalternative erhalten.

#### Betroffene Dateien

Änderungen:

- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.html
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.scss
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.spec.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.html
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.spec.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.html
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.scss
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.spec.ts
- docs/architektur/components/schichtplan.md
- docs/projekt-stand.md
- docs/todo_next.md

#### Schritt 1: Mitarbeiterübersicht vervollständigen

- [x] Aktive Mitarbeiter aus allen ausgewählten Filialen ohne Duplikate zusammenführen und mit ihrer Farbkennung darstellen.
- [x] Je Mitarbeiter die insgesamt im ausgewählten Monat vergebenen Stunden und weitere für die Planung relevante Informationen
      darstellen.

#### Schritt 2: Drag-and-drop-Planung umsetzen

- [x] Mitarbeiterkarten per Drag-and-drop als kopierbare Planungselemente bereitstellen.
- [x] Rasterzellen als Ablageziele verwenden und beim Ablegen unmittelbar eine Schicht für Mitarbeiter, Datum und Modellschicht
      anlegen.
- [x] Ablageziele auf bearbeitbare Entwürfe und eine gültige Filialzuordnung des Mitarbeiters begrenzen.
- [x] Laufende Schreibvorgänge, erfolgreiche Anlagen und Fehler für die direkte Ablage verständlich behandeln.
- [x] Die bestehende Anlageaktion als gleichwertige Tastatur- und Mobilalternative beibehalten.

#### Tests und Abschluss

- [x] Component-Test für Gruppierung, Aktivstatus, Filialzuordnung und Farbkennung der Mitarbeiter ergänzen.
- [x] Component-Tests für erlaubte Ablagen, unzulässige Ziele, laufende Schreibvorgänge und Fehler ergänzen.
- [x] Drag-and-drop sowie die alternative Anlageaktion auf Desktop und einem kleinen Touch-Viewport manuell prüfen.
- [x] `npm test`, `npm run build:master`, `npm run build:office`, `npm run build:filiale` und
      `npm run build:mitarbeiter` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Aktive Mitarbeiter aus den ausgewählten Filialen und ihre Planungswerte sind eindeutig sichtbar.
- [x] Ein Mitarbeiter kann per Drag-and-drop unmittelbar in einer zulässigen Rasterzelle eingeplant werden.
- [x] Unzulässige Ablagen verändern keine Dienstplandaten und werden verständlich behandelt.
- [x] Die Schichtanlage bleibt ohne Drag-and-drop per Tastatur und auf mobilen Geräten vollständig bedienbar.

### [x] 21.8 Planungsgrundlagen vervollständigen

#### Ziel

Ein leerer, noch nie veröffentlichter Monatsdienstplan kann kontrolliert gelöscht und mit einem anderen aktiven Schichtmodell
neu angelegt werden. Modellschichten begrenzen die Belegung einer Rasterzelle standardmäßig auf einen Mitarbeiter und können
bei fachlichem Bedarf ausdrücklich für Mehrfachbelegungen freigegeben werden.

#### Betroffene Dateien

Änderungen:

- src/app/commons/models/domain/dienstplan.ts
- src/app/commons/models/domain/schichtmodell.ts
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.ts
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.html
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.spec.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.html
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.spec.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.html
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.spec.ts
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.ts
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.html
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.spec.ts
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.html
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.spec.ts
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/services/domain/schichtmodell.service.ts
- src/app/services/domain/schichtmodell.service.spec.ts
- src/app/services/firebase/firestore-db.service.ts
- src/app/services/firebase/firestore-db.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/architektur/components/schichtplan.md
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/architektur/services/dienstplan-service.md
- docs/architektur/stores/dienstplan-store.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

#### Schritt 1: Leeren Erstentwurf löschen und neu anlegen

- [x] Im noch nie veröffentlichten Entwurf die Aktion `Dienstplan löschen` anbieten und vor der Löschung den allgemeinen
      Bestätigungsdialog anzeigen.
- [x] Die Aktion deaktivieren, sobald der aktuelle Entwurf mindestens eine Schicht enthält, und den Grund verständlich anzeigen.
      Nach dem Löschen aller Schichten wird sie wieder verfügbar.
- [x] Dienstplan, Entwurfsversion und Modellschicht-Momentaufnahme gemeinsam löschen und anschließend wieder `Plan erstellen`
      anbieten, damit ein anderes aktives Schichtmodell gewählt werden kann.
- [x] Vor dem Löschen Dienstplandokument und Entwurfsschichten verbindlich vom Server laden. Die erwartete Versionsrevision
      prüfen, damit eine gleichzeitige Schichtanlage die Löschung verhindert.
- [x] Die Aktion dauerhaft ausblenden, sobald `veroeffentlichteVersionId` gesetzt ist. Neue Versionen verwenden immer die
      bestehende Modell-Momentaufnahme des Monatsplans.
- [x] Firestore Rules auf einen berechtigten Entwurf ohne veröffentlichte Version und die gemeinsame Löschung begrenzen. Die
      Leerheitsprüfung der Schicht-Subcollection zusätzlich im Client-Service erzwingen, da Rules keine Collection-Abfrage
      ausführen können.

#### Schritt 2: Mehrfachbelegung je Modellschicht begrenzen

- [x] Jede Modellschicht um die standardmäßig deaktivierte Option `mehrfachbelegungErlaubt` ergänzen und sie in die
      Dienstplan-Momentaufnahme übernehmen.
- [x] Die Checkbox `Mehrfachbelegung` im Kopf der Modellschicht direkt vor der Löschaktion anzeigen.
- [x] Weitere Anlagen und Ablagen in einer belegten Rasterzelle sperren, solange die Modellschicht keine Mehrfachbelegung erlaubt.
- [x] Die Begrenzung vor dem Schreiben servernah im Dienstplan-Service erneut prüfen und parallele Anlagen über die vorhandene
      Versionsrevision absichern.
- [x] Domain-, Dialog-, Raster-, Service- und Firestore-Regeltests ergänzen.

#### Tests und Abschluss

- [x] Service-, Store-, Component- und Firestore-Emulator-Tests für die Löschung des leeren, noch nie veröffentlichten
      Dienstplans und die Sperre bei vorhandenen Schichten ergänzen.
- [x] Prüfen, dass die Löschaktion nach dem Löschen aller Entwurfsschichten wieder verfügbar ist und nach der ersten
      Veröffentlichung dauerhaft ausgeblendet bleibt.
- [x] Dialog-, Raster- und Service-Tests für die standardmäßige Einfachbelegung und die freigegebene Mehrfachbelegung ergänzen.
- [x] Firestore-Emulator-Tests für das neue Modellschichtfeld ausführen und den Office-Build erfolgreich prüfen.

#### Erledigt, wenn

- [x] Ein leerer, noch nie veröffentlichter Dienstplan kann nach Bestätigung gelöscht und mit einem anderen aktiven Modell
      derselben Filiale neu angelegt werden; ein belegter Entwurf verhindert die Löschung.
- [x] Nach dem Löschen aller Entwurfsschichten ist die vollständige Löschung wieder möglich.
- [x] Eine Modellschicht erlaubt standardmäßig nur einen Mitarbeiter je Rasterzelle; eine aktivierte Mehrfachbelegung lässt
      weitere Mitarbeiter in derselben Rasterzelle zu.

### [ ] 21.9 Tagesabhängige Öffnungs- und Schichtzeiten abbilden

#### Ziel

Ein Schichtmodell bildet neben dem regulären Betrieb auch abweichende Schichtzeiten für Sonntage und gesetzliche Feiertage ab.
Für jeden Kalendertag wird nachvollziehbar das zutreffende Schicht-Tagesprofil ermittelt. Die wirksamen Öffnungszeiten stammen
aus den Filialeinstellungen nach Todo 20 und bleiben von den Mitarbeiterschichten getrennt, damit Vor- und Nachbereitungszeiten
außerhalb der Kundenöffnungszeiten weiterhin möglich sind.

Die tagesabhängigen Daten werden beim Anlegen des Monatsdienstplans als unveränderliche Momentaufnahme übernommen. Dadurch
bleiben Entwürfe, veröffentlichte Versionen und historische Ansichten auch dann stabil, wenn das zugrunde liegende
Schichtmodell, Feiertagsregeln oder Filialeinstellungen später geändert werden.

#### Betroffene Dateien

Änderungen:

- src/app/commons/constants/firebase.constants.ts
- src/app/commons/models/domain/dienstplan.ts
- src/app/commons/models/domain/schichtmodell.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.html
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.spec.ts
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.ts
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.html
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.spec.ts
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/services/domain/schichtmodell.service.ts
- src/app/services/domain/schichtmodell.service.spec.ts
- src/app/stores/domain/filialeinstellung.store.ts
- src/app/stores/domain/filialeinstellung.store.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- src/app/stores/domain/schichtmodell.store.ts
- src/app/stores/domain/schichtmodell.store.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/architektur/components/schichtplan.md
- docs/architektur/services/dienstplan-service.md
- docs/architektur/services/schichtmodell-service.md
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

Neu hinzuzufügen:

- src/app/commons/models/domain/tagesprofil.ts

#### Schritt 1: Fachliche Schicht-Tagesarten und Prioritäten festlegen

- [ ] Mindestens die Tagesarten `Standard`, `Sonntag` und `Feiertag` definieren und entscheiden, ob Samstag als eigenes
      Tagesprofil benötigt wird.
- [ ] Festlegen, dass ein gesetzlicher Feiertag gegenüber dem Sonntags- und Standardprofil Vorrang hat. Das Verhalten eines
      Feiertags, der auf einen Sonntag fällt, ausdrücklich dokumentieren.
- [ ] Die nach Todo 20 aufgelösten Ausnahmen und Sondertage einschließlich ihrer Priorität gegenüber der Wochenregel
      übernehmen.
- [ ] Klären, ob alle gesetzlichen Feiertage und sonstigen Sondertage einem gemeinsamen Schicht-Tagesprofil zugeordnet werden
      oder einzelne Sondertage ein eigenes beziehungsweise ausdrücklich zugewiesenes Profil verwenden können müssen.
- [ ] Die nach Todo 20 aufgelösten Öffnungszeiten ausschließlich als Betriebsinformation übernehmen. Schichtzeiten dürfen
      für Vor- und Nachbereitung außerhalb der Öffnungszeiten liegen und werden deshalb nicht automatisch auf diese begrenzt.

#### Schritt 2: Datumsauflösung aus den Filialeinstellungen übernehmen

- [ ] Bundesland und Öffnungsregeln ausschließlich über die nach Todo 20 bereitgestellte Filialeinstellung laden; für technische
      Zeitberechnungen zentral `Europe/Berlin` verwenden.
- [ ] Die dort festgelegte Berechnungsregel für bundeslandspezifische feste und bewegliche Feiertage wiederverwenden und keine
      zweite unabhängige Feiertagsauflösung im Dienstplan einführen.
- [ ] Feiertage immer in der verbindlichen Filial- beziehungsweise Dienstplan-Zeitzone auflösen und Jahres- sowie Monatsgrenzen
      eindeutig behandeln.
- [ ] Den aufgelösten Tagestyp, eine vorhandene Sondertags-ID und deren Bezeichnung in die Monatsplan-Momentaufnahme übernehmen,
      damit spätere Regeländerungen bestehende Dienstpläne nicht verändern.

#### Schritt 3: Schicht-Tagesprofile im Schichtmodell und in der Momentaufnahme abbilden

- [ ] Jedes Schicht-Tagesprofil mit eigenen Modellschichten modellieren. Öffnungsstatus und Öffnungszeiten werden nicht im
      Schichtmodell dupliziert.
- [ ] Entscheiden, ob Modellschichten über Tagesprofile hinweg stabile fachliche Plätze teilen oder je Profil eigenständig sind.
      Die Entscheidung muss unterschiedliche Zeiten, eine unterschiedliche Schichtanzahl und Mehrfachbelegung unterstützen.
- [ ] Die Darstellung variabler Modellschichten im Monatsraster festlegen. Globale Spaltenzeiten dürfen nicht verwendet werden,
      wenn die tatsächlichen Zeiten vom Tagestyp abhängen.
- [ ] Beim Anlegen eines Monatsdienstplans alle benötigten Schicht-Tagesprofile, die Zuordnung der Kalendertage und die jeweils
      aufgelöste Öffnungsregel vollständig als Momentaufnahme speichern.
- [ ] Spätere Änderungen an Öffnungszeiten, Tagesprofilen oder Feiertagsregeln dürfen einen bestehenden Monatsdienstplan nicht
      nachträglich verändern.

#### Schritt 4: Verwaltung und Monatsplanung erweitern

- [ ] Im Schichtmodelldialog das Standard-, Sonntags- und Feiertagsprofil verständlich getrennt bearbeiten können. Nicht
      benötigte optionale Schichtprofile dürfen deaktiviert werden.
- [ ] Die wirksamen Öffnungszeiten aus den Filialeinstellungen neben den Modellschichten anzeigen. Die Bedienung muss deutlich
      machen, dass Öffnungszeiten keine automatische Grenze für Arbeitszeiten sind.
- [ ] Im Monatsraster je Datum den ermittelten Tagestyp, eine vorhandene Sondertags- oder Feiertagsbezeichnung, die
      Öffnungszeiten und ausschließlich die an diesem Tag gültigen Modellschichten darstellen.
- [ ] Anlage, Drag-and-drop, Bearbeitung und spätere Verschiebung einer Schicht auf die für das konkrete Datum gültige
      Modellschicht-Momentaufnahme begrenzen.
- [ ] Geschlossene Tage eindeutig darstellen. Eine Schichtanlage wird dort nur durch das gültige Schicht-Tagesprofil bestimmt
      und nicht allein wegen der geschlossenen Kundenöffnung verhindert.

#### Schritt 5: Services, Stores und Firestore Rules absichern

- [ ] Schichtmodell- und Dienstplan-Service um die neuen Daten ergänzen, die Filialeinstellungen verbindlich laden und alle
      Schicht-Tagesprofile vor dem Schreiben erneut fachlich validieren.
- [ ] Die konkrete Schichtzeit ausschließlich aus Datum und der für diesen Tag gültigen Modellschicht-Momentaufnahme ableiten.
- [ ] Stores so erweitern, dass Tagesprofile, Tageszuordnungen und Feiertagsinformationen ohne erneute Berechnung aus dem
      geladenen Monatsplan bereitgestellt werden.
- [ ] Firestore Rules auf gültige Felder, zulässige Tagesprofile und die zum konkreten Datum gehörende Modellschichtreferenz
      begrenzen. Direkte Client-Schreibzugriffe dürfen Tagestyp oder Momentaufnahme nicht nachträglich verändern.
- [ ] Bestehende Schichtmodelle ohne Schicht-Tagesprofile kontrolliert migrieren oder bis zur erneuten Speicherung als reines
      Standardprofil interpretieren; den gewählten Übergang verbindlich dokumentieren.

#### Tests und Abschluss

- [ ] Unit-Tests für feste und bewegliche Feiertage, unterschiedliche Bundesländer, Jahresgrenzen und einen Feiertag am Sonntag
      ergänzen.
- [ ] Model-, Service- und Store-Tests für Standard-, Sonntags- und Feiertagsprofile sowie unterschiedliche Öffnungs- und
      Schichtzeiten ergänzen.
- [ ] Component-Tests für Profilverwaltung, tagesabhängige Rasterdarstellung und Schichtanlagen bei geöffneter sowie
      geschlossener Kundenöffnung ergänzen.
- [ ] Firestore-Emulator-Tests für Tagesprofil-Momentaufnahmen und datumsgültige Modellschichtreferenzen ergänzen.
- [ ] Manuell einen Monat mit Werktagen, Sonntagen, einem Feiertag am Werktag und einem Feiertag am Sonntag prüfen.
- [ ] Fachkonzept, Architektur, Projektstand und Datenübergang nach der Umsetzungsentscheidung aktualisieren.
- [ ] `npm test`, `npm run test:rules`, `npm run build:master`, `npm run build:office` und `npm run build:filiale` erfolgreich
      ausführen.

#### Erledigt, wenn

- [ ] Jeder Kalendertag eines Monatsplans verwendet nachvollziehbar das fachlich richtige Tagesprofil.
- [ ] Sonntage, gesetzliche Feiertage und sonstige Sondertage können andere Öffnungszeiten und andere Modellschichten als
      Standardtage besitzen.
- [ ] Ein Feiertag am Sonntag verwendet eindeutig die festgelegte Priorität und erzeugt keine widersprüchliche Zuordnung.
- [ ] Öffnungszeiten und Arbeitszeiten bleiben getrennt; zulässige Vor- und Nachbereitungszeiten werden nicht abgeschnitten.
- [ ] Geschlossene Kundenöffnungen und vorhandene Mitarbeiterschichten können unabhängig voneinander abgebildet werden.
- [ ] Bundesland, Feiertagsauflösung und Monatsplan-Momentaufnahme führen auch nach späteren Stammdatenänderungen zu stabilen
      historischen Dienstplänen.
- [ ] UI, Services, Stores und Firestore Rules akzeptieren nur Modellschichten des für das konkrete Datum gültigen Tagesprofils.
- [ ] Tests, Builds, Dokumentation und der beschlossene Datenübergang sind abgeschlossen.

### [ ] 21.10 Konfliktprüfung, Verschieben und Veröffentlichung umsetzen

#### Ziel

Auf Grundlage der Filialeinstellungen und der tagesabhängigen Monatsplan-Momentaufnahme aus Todo 20 und 21.9 werden
filialübergreifende Doppelbelegungen eines Mitarbeiters bereits beim Einplanen zuverlässig verhindert. Ein Dienstplan kann erst
nach nachvollziehbarer fachlicher Prüfung veröffentlicht werden. Mitarbeiterzugänge erhalten ausschließlich die für sie
freigegebene veröffentlichte Ansicht; berechtigte Master-, Office- und Filialkonten arbeiten mit Entwürfen und historischen
Versionen.

#### Betroffene Dateien

Änderungen:

- src/app/commons/constants/firebase.constants.ts
- src/app/commons/models/domain/dienstplan.ts
- src/app/commons/models/domain/schicht.ts
- src/app/commons/models/domain/schichtmodell.ts
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.ts
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.html
- src/app/components/schichtplan/dienstplan-anlegen-dialog/dienstplan-anlegen-dialog.spec.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.ts
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.html
- src/app/components/schichtplan/dienstplan-planungsbereich/dienstplan-planungsbereich.spec.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.ts
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.html
- src/app/components/schichtplan/dienstplan-monatstabelle/dienstplan-monatstabelle.spec.ts
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.ts
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.html
- src/app/components/schichtplan/schichtmodell-bearbeiten-dialog/schichtmodell-bearbeiten-dialog.spec.ts
- src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.ts
- src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.html
- src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.scss
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.html
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.scss
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.spec.ts
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/services/domain/schichtmodell.service.ts
- src/app/services/domain/schichtmodell.service.spec.ts
- src/app/services/firebase/firestore-db.service.ts
- src/app/services/firebase/firestore-db.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/architektur/components/schichtplan.md
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/architektur/services/dienstplan-service.md
- docs/architektur/stores/dienstplan-store.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/todo_next.md

Neu hinzuzufügen:

- src/app/commons/models/domain/mitarbeiterbelegung.ts
- src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.spec.ts
- src/app/stores/domain/mitarbeiterbelegung.store.ts
- src/app/stores/domain/mitarbeiterbelegung.store.spec.ts

#### Schritt 1: Firmenweiten Belegungsindex aufbauen

- [ ] Unterhalb der Firma einen Belegungsindex mit einem Dokument je Mitarbeiter und Kalendertag vorsehen, damit eine
      Konfliktprüfung keine vollständigen Dienstpläne aller berechtigten Filialen laden muss.
- [ ] Jede Belegung mit Filiale, Dienstplan, Version, Schicht, Planungsstatus sowie Beginn und Ende eindeutig auf ihren
      filialbezogenen Dienstplan zurückführen können.
- [ ] Beim Anlegen, Ändern und Löschen einer Schicht die filialbezogene Schicht und alle betroffenen Tagesdokumente des
      Belegungsindex atomar aktualisieren.
- [ ] Bei Schichten über Mitternacht jeden berührten Kalendertag in der Zeitzone des Dienstplans berücksichtigen und veraltete
      Indexeinträge bei Zeitänderungen zuverlässig entfernen.
- [ ] Statuswechsel, Versionswechsel und das Löschen eines Dienstplans so behandeln, dass der Belegungsindex ausschließlich
      relevante Entwürfe und veröffentlichte Planungsstände enthält.
- [ ] Parallele Einplanungen desselben Mitarbeiters durch transaktionales Lesen und Schreiben der betroffenen Tagesdokumente
      verhindern.
- [ ] Firestore Rules so absichern, dass Belegungseinträge nur gemeinsam mit einer berechtigten Dienstplanänderung angelegt,
      geändert oder gelöscht werden können.

#### Schritt 2: Belegungsindex live in die Planung übernehmen

- [ ] Die für den ausgewählten Planungszeitraum und die sichtbaren Mitarbeiter relevanten Belegungstage mit begrenzten
      Firestore-Snapshot-Listenern beobachten, ohne einen unbeschränkten firmenweiten Listener zu öffnen.
- [ ] Initiale und nachfolgende Listener-Stände unmittelbar in einen fachlichen Belegungs-Store übernehmen, damit Änderungen
      einer Filiale in anderen geöffneten Filialplanungen zeitnah sichtbar werden.
- [ ] Listener beim Wechsel von Firma, Filialauswahl, Monat oder relevanter Mitarbeitermenge ersetzen und beim Verlassen der
      Planung vollständig beenden.
- [ ] Lade- und Listener-Fehler im Store abbilden und die Planung sperren, wenn der für eine Aktion erforderliche Belegungsstand
      nicht zuverlässig verfügbar ist.
- [ ] Live-Daten ausschließlich für aktuelle Darstellung und frühzeitige Konflikthinweise verwenden; vor jedem Schreibzugriff
      weiterhin die transaktionale Prüfung der gemeinsamen Tagesdokumente als verbindliche Absicherung ausführen.

#### Schritt 3: Konflikte berechnen und darstellen

- [ ] Ungültige Zeitfolgen, Pausen und überlappende Schichten eines Mitarbeiters filialübergreifend erkennen.
- [ ] Für Anlage, Änderung und Veröffentlichung die relevanten Belegungen aller Filialen des betroffenen Mitarbeiters über den
      firmenweiten Belegungsindex berücksichtigen, auch wenn die sichtbare Filialauswahl zuvor eingeschränkt wurde.
- [ ] Überschneidungen mit einem veröffentlichten Plan und mit einem relevanten Entwurf fachlich eindeutig behandeln; den zu
      ersetzenden veröffentlichten Stand desselben Filialdienstplans nicht fälschlich als Fremdkonflikt werten.
- [ ] Anlage, Änderung und Veröffentlichung sperren, wenn relevante Belegungsdaten wegen fehlender Berechtigung oder eines
      Ladefehlers nicht vollständig in die Konfliktprüfung einbezogen werden können.
- [ ] Blockierende Konflikte von nicht blockierenden Hinweisen unterscheiden.
- [ ] Konflikte an der betroffenen Rasterzelle und Mitarbeiterschicht verständlich anzeigen.
- [ ] Veröffentlichung bei blockierenden Konflikten verhindern und zusätzlich im Schreibablauf absichern.
- [ ] Konfliktberechnung mit Schichten über Mitternacht und an Zeitraumgrenzen prüfen.

#### Schritt 4: Bestehende Schichten verschieben

- [ ] Schichtkarten in einem bearbeitbaren Entwurf als eigene Drag-Quellen kennzeichnen und beim Ablegen in einer anderen
      Rasterzelle Mitarbeiterzuordnung und Schicht-ID beibehalten.
- [ ] Den Zieltag und die Zielmodellschicht ausschließlich aus der Rasterzelle übernehmen und Beginn, Ende, Folgetag sowie
      Standardpause aus der Modellschicht-Momentaufnahme neu ableiten. Eine freie Eingabe dieser Werte bleibt ausgeschlossen.
- [ ] Das Ablegen in der bisherigen Rasterzelle ohne Schreibzugriff beenden und Schichten veröffentlichter oder archivierter
      Versionen nicht als verschiebbar anbieten.
- [ ] Vor dem Verschieben die Zielzelle auf Einfach- oder Mehrfachbelegung sowie den Mitarbeiter auf zeitliche Konflikte prüfen.
      Eine unzulässige Zielzelle darf weder per Drag-and-drop noch über die alternative Aktion übernommen werden.
- [ ] Das Verschieben im Dienstplan-Service als eine Firestore-Transaktion umsetzen, die den aktuellen Versionsstand und die
      Zielbelegung verbindlich liest, die Schicht aktualisiert und die Revision genau einmal erhöht.
- [ ] Die Belegungstage des bisherigen und des neuen Zeitraums innerhalb derselben Transaktion aus dem firmenweiten
      Belegungsindex entfernen beziehungsweise ergänzen. Schichten über Mitternacht müssen alle berührten Tage
      berücksichtigen.
- [ ] Firestore Rules so erweitern, dass Datum, Modellschicht und daraus abgeleitete Zeitwerte nur bei einem vollständigen,
      berechtigten Verschiebevorgang in einem Entwurf geändert werden können.
- [ ] Im Bearbeitungsdialog eine gleichwertige, tastatur- und touchbedienbare Aktion `Schicht verschieben` anbieten, über die
      Zieltag und Zielmodellschicht gewählt werden, ohne reguläre Schichtzeiten frei bearbeiten zu können.
- [ ] Zulässige und unzulässige Ablageziele während des Ziehens verständlich darstellen und Fehler am bisherigen
      Filialdienstplan anzeigen, ohne die bestehende Schicht bei einem fehlgeschlagenen Vorgang zu verändern.

#### Schritt 5: Veröffentlichung umsetzen

- [ ] Veröffentlichungsaktion nur für berechtigte Rollen und einen konfliktfreien aktuellen Entwurf anbieten.
- [ ] Versionierung für jeden Filialdienstplan getrennt fortführen.
- [ ] Veröffentlichung einschließlich Benutzer, Zeitpunkt und Version ausschließlich für den betreffenden Filialdienstplan
      gemäß Datenkonzept atomar speichern.
- [ ] Beim Erzeugen einer neuen Entwurfsversion die Schichten des veröffentlichten Stands kopieren und die bestehende
      Modell-Momentaufnahme des Monatsplans unverändert weiterverwenden.
- [ ] Bestätigung vor der Veröffentlichung und verständliche Rückmeldung bei Erfolg oder Fehler anzeigen.
- [ ] Zurückziehen oder nachträgliche Änderung ausschließlich nach dem beschlossenen Zustandsablauf erlauben.
- [ ] Gleichzeitige Änderungen zwischen Prüfung und Veröffentlichung zuverlässig erkennen.

#### Schritt 6: Veröffentlichte Mitarbeiteransicht bereitstellen

- [ ] Veröffentlichte Dienstpläne für Mitarbeiter aus allen ausgewählten und fachlich erlaubten Filialen laden und gemeinsam
      darstellen.
- [ ] Aus den Schichten des geöffneten Monats eindeutige Mitarbeiter-IDs ermitteln, vorhandene Store-Einträge wiederverwenden
      und nur fehlende Mitarbeiterdokumente mit `networkOnly` gezielt laden.
- [ ] Entwürfe und interne Notizen für Mitarbeiter vollständig ausblenden und durch Firestore Rules schützen.
- [ ] Zeitraum, Schichten, Pausen und relevante Veröffentlichungsinformationen mobil verständlich darstellen.
- [ ] Verhalten bei noch nicht veröffentlichten, zurückgezogenen oder nachträglich ersetzten Plänen festlegen und anzeigen.

#### Tests und Abschluss

- [ ] Das Erzeugen einer neuen Entwurfsversion als Kopie des veröffentlichten Stands mit unveränderter Modell-Momentaufnahme
      testen.
- [ ] Unit-Tests für alle blockierenden Konflikte und Hinweise ergänzen.
- [ ] Service- und Firestore-Emulator-Tests für Anlage, Änderung und Entfernung der täglichen Belegungseinträge
      einschließlich Schichten über Mitternacht ergänzen.
- [ ] Mit konkurrierenden Schreibzugriffen prüfen, dass ein Mitarbeiter nicht gleichzeitig in zwei Filialen eingeplant werden
      kann.
- [ ] Store- und Service-Tests für initiale Live-Daten, nachfolgende Änderungen, Kontextwechsel, Listener-Abmeldung und
      Listener-Fehler ergänzen.
- [ ] Component-, Service- und Firestore-Emulator-Tests für das Verschieben innerhalb eines Tages und auf einen anderen Tag,
      belegte Einfachschichten, erlaubte Mehrfachbelegung, Zeitkonflikte und Schichten über Mitternacht ergänzen.
- [ ] Prüfen, dass ein Verschieben die vorhandene Schicht-ID und Mitarbeiterzuordnung erhält, die Revision genau einmal erhöht
      und bei einem Fehler weder die Schicht noch den Belegungsindex teilweise verändert.
- [ ] Drag-and-drop und die alternative Verschiebeaktion auf Desktop sowie einem kleinen Touch-Viewport manuell prüfen.
- [ ] Service- und Store-Tests für Veröffentlichung, konkurrierende Änderung, Zurückziehen und Fehlerfälle ergänzen.
- [ ] Component-Tests für Konfliktanzeige, deaktivierte Veröffentlichung und Bestätigungsablauf ergänzen.
- [ ] Firestore-Emulator-Tests für Entwurfszugriff, Veröffentlichung und Mitarbeiteransicht ergänzen.
- [ ] Den Gesamtprozess mit realen Testkonten für Filiale, Office und Mitarbeiter manuell prüfen.
- [ ] `npm test`, `npm run test:rules`, `npm run build:master`, `npm run build:office`, `npm run build:filiale` und
      `npm run build:mitarbeiter` erfolgreich ausführen.

#### Erledigt, wenn

- [ ] Nach der ersten Veröffentlichung bleibt die Modell-Momentaufnahme des Monatsplans unveränderlich und wird von allen
      späteren Versionen verwendet.
- [ ] Eine neue Entwurfsversion übernimmt die Schichten des veröffentlichten Stands, ohne das Schichtmodell zu wechseln.
- [ ] Blockierende Konflikte verhindern zuverlässig eine Veröffentlichung und werden verständlich angezeigt.
- [ ] Die filialübergreifende Prüfung benötigt keine vollständig geladenen Monatsdienstpläne aller Filialen.
- [ ] Gleichzeitige Schreibzugriffe können für einen Mitarbeiter keine überlappenden Belegungen in verschiedenen Filialen
      erzeugen.
- [ ] Eine erfolgreich gespeicherte Belegung wird in einer parallel geöffneten berechtigten Filialplanung ohne manuelles
      Neuladen zeitnah sichtbar.
- [ ] Eine bestehende Entwurfsschicht kann per Drag-and-drop oder über die alternative Aktion in eine zulässige Rasterzelle
      verschoben werden; Mitarbeiterzuordnung und Schicht-ID bleiben dabei erhalten.
- [ ] Ein unzulässiges Verschieben verändert weder die bestehende Schicht noch Version oder Belegungsindex.
- [ ] Eine unvollständige filialübergreifende Konfliktprüfung verhindert die Veröffentlichung.
- [ ] Ein berechtigter Benutzer kann einen konfliktfreien aktuellen Entwurf nachvollziehbar veröffentlichen.
- [ ] Mitarbeiter sehen ausschließlich die für sie freigegebenen veröffentlichten Dienstplandaten.
- [ ] Gleichzeitige und nachträgliche Änderungen folgen dem festgelegten konsistenten Ablauf.

### [-] 21.11 Erweiterungen nach der ersten Ausbaustufe bewerten

#### Ziel

Nach erfolgreichem Einsatz der manuellen Monatsplanung werden Erweiterungen anhand konkreter betrieblicher Anforderungen
priorisiert und jeweils als eigenes Umsetzungstodo geplant. Die erste Ausbaustufe wird nicht vorsorglich mit ungenutzter
Komplexität belastet.

#### Betroffene Dateien

Änderungen:

- docs/todo_next.md
- docs/todo_spaeter.md
- docs/fachkonzepte/dienst-und-schichtplanung.md
- docs/projekt-stand.md

#### Schritt 1: Betriebserfahrungen auswerten

- [ ] Rückmeldungen zu Planungsdauer, Bedienung, Konflikten und mobiler Mitarbeiteransicht sammeln.
- [ ] Ermitteln, welche manuellen Arbeitsschritte häufig, fehleranfällig oder unnötig aufwendig sind.
- [ ] Prüfen, ob mehrere Planer, größere Filialen oder längere Planungszeiträume zusätzliche Anforderungen erzeugen.

#### Schritt 2: Erweiterungen fachlich priorisieren

- [ ] Bedarf für Verfügbarkeiten, Urlaub, Krankheit und sonstige Abwesenheiten bewerten.
- [ ] Bedarf für Sollstunden, Arbeitszeitkonten und weitergehende gesetzliche Prüfregeln bewerten.
- [ ] Bedarf für Schichttausch, Freigabewünsche und Mitarbeiterbestätigungen bewerten; Wünsche als getrennte Anträge planen,
      die einen Dienstplan nicht unmittelbar verändern.
- [ ] Bedarf für Änderungsbenachrichtigungen und Push-Nachrichten bewerten.
- [ ] Bedarf für Schichtkopien, automatische Planung oder Optimierung bewerten.
- [ ] Bedarf für Nacht-, Sonntags- und Feiertagszuschläge sowie die Ableitung von Lohnstunden aus der Lohnzeit bewerten.
- [ ] Bedarf für Zeiterfassung, Exporte und Anbindungen an Lohnabrechnung getrennt bewerten.

#### Schritt 3: Abgegrenzte Folgetodos anlegen

- [ ] Nur Erweiterungen mit konkretem fachlichem Nutzen in `docs/todo_next.md` übernehmen.
- [ ] Bewusst zurückgestellte Erweiterungen mit ihrem Entscheidungsstand in `docs/todo_spaeter.md` dokumentieren.
- [ ] Für jede ausgewählte Erweiterung Datenmodell, Rollen, Sicherheit, UI, Tests und Abnahmekriterien separat planen.
- [ ] Offline-Schreibbedarf gegebenenfalls gemeinsam mit Todo 9 konkretisieren.

#### Tests und Abschluss

- [ ] Priorisierung mit den betroffenen betrieblichen Rollen abstimmen.
- [ ] Abhängigkeiten zwischen Erweiterungen und vorhandener Dienstplanarchitektur dokumentieren.
- [ ] Sicherstellen, dass offene Erweiterungswünsche nicht als bereits zugesagte Funktionen dargestellt werden.

#### Erledigt, wenn

- [ ] Betriebserfahrungen der ersten Ausbaustufe sind ausgewertet.
- [ ] Erweiterungen sind nachvollziehbar priorisiert oder bewusst zurückgestellt.
- [ ] Ausgewählte Erweiterungen besitzen eigenständige, prüfbare Umsetzungstodos.
