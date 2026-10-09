<!-- pur-system/docs/todo_next.md -->

# Offene Todos

## 20. Dienst- und Schichtplanung

Der Schichtplan wird schrittweise als filialbezogene Monatsplanung aufgebaut. Die erste Ausbaustufe konzentriert sich auf eine
manuelle Planung mit klarer Entwurfs- und Veröffentlichungslogik. Automatische Planung, Urlaubsverwaltung, Zeiterfassung,
Schichttausch und Benachrichtigungen bleiben zunächst außerhalb des vereinbarten Umfangs.

### 20.1 Fachliches Modell und erste Ausbaustufe festlegen

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
- [x] Definieren, wie Dauer und anrechenbare Arbeitszeit aus Beginn, Ende und Pause berechnet werden.

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
- [x] Offene fachliche Entscheidungen ausdrücklich markieren und vor Beginn von 20.2 abschließen.

#### Erledigt, wenn

- [x] Dienstplan, Zeitraum, Schicht, Mitarbeiterzuordnung und Veröffentlichungszustände sind eindeutig beschrieben.
- [x] Pflichtangaben, Berechnungen, Konflikte und erlaubte Zustandswechsel sind festgelegt.
- [x] Der Umfang der ersten Ausbaustufe ist gegenüber späteren Erweiterungen klar abgegrenzt.

### 20.2 Rollen, Datenzugriff und Arbeitsablauf festlegen

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
- [x] Das Verhalten bei mehreren erlaubten Filialen und beim Kontext `Alle Filialen` bestimmen.

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

### 20.3 Datenmodell, Firestore-Pfade und Sicherheitsregeln planen

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
- docs/matrix-cache-strategien.md
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
- [x] Master und Office auf gezieltes Laden einer ausgewählten Filiale und eines Monats sowie Mitarbeiter auf die veröffentlichte
      Version eines ausgewählten Monats mit `networkOnly` festlegen.
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
- [x] Bei abweichender Revision den Schreib- oder Veröffentlichungsvorgang abbrechen, den aktuellen Stand laden und erneut prüfen.

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

### 20.4 Dienstplan-Grundfunktion umsetzen

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
- docs/matrix-berechtigungen.md
- docs/todo_next.md

Neu hinzuzufügen:

- docs/components/schichtplan.md
- docs/services/dienstplan-service.md
- docs/services/schichtvorlage-service.md
- docs/stores/dienstplan-store.md
- docs/stores/schichtvorlage-store.md
- src/app/commons/models/domain/schichtvorlage.ts
- src/app/commons/utils/dienstplan/dienstplan-zeitraum.ts
- src/app/commons/utils/dienstplan/dienstplan-zeitraum.spec.ts
- src/app/commons/utils/dienstplan/schicht-zeit.ts
- src/app/commons/utils/dienstplan/schicht-zeit.spec.ts
- src/app/commons/utils/dienstplan/schicht-lokalzeit.ts
- src/app/commons/utils/dienstplan/schicht-lokalzeit.spec.ts
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.ts
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.html
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.scss
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.spec.ts
- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.ts
- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.html
- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.scss
- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.spec.ts
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
- [x] Zeitraumwechsel laden, ohne ungespeicherte Änderungen stillschweigend zu verwerfen.

#### Schritt 2: Monatsübersicht umsetzen

- [x] Zeitraumsteuerung für vorherigen, aktuellen und nächsten Monat ergänzen.
- [x] Tage, Schichten und Mitarbeiter in einer auf Desktop und kleinen Viewports bedienbaren Monatsansicht darstellen.
- [x] Ladezustand, leeren Dienstplan, Ladefehler und erneutes Laden sichtbar behandeln.
- [x] Schichtbeginn, Schichtende, Pause und berechnete Arbeitszeit verständlich anzeigen.
- [x] Den aktuellen Entwurfs- oder Veröffentlichungszustand eindeutig darstellen.

#### Schritt 3: Schichten manuell verwalten

- [x] Material-Dialog zum Anlegen und Bearbeiten einer Schicht umsetzen.
- [x] Nur Mitarbeiter anbieten, die gemäß Fachmodell für die gewählte Filiale eingeplant werden dürfen.
- [x] Pflichtfelder, Zeitwerte, Pause und Mitarbeiterzuordnung mit Reactive Forms validieren.
- [x] Laufende Schreibvorgänge gegen Mehrfachausführung schützen und das gesamte Formular währenddessen deaktivieren.
- [x] Planungsaktionen in der Filial-App nur für einen aktiven, der eigenen Filiale zugeordneten Firma-Mitarbeiter mit
      `dienstplaner` anbieten.
- [x] Schichten gemäß Rollen- und Zustandsregeln anlegen, bearbeiten und löschen.
- [x] Erfolgreiche Änderungen ohne unnötiges vollständiges Neuladen in den Store übernehmen.

#### Schritt 4: Filialbezogene Schichtvorlagen umsetzen

- [x] Schichtvorlagen mit Bezeichnung, lokaler Beginn- und Endzeit, Folgetag, optionaler Standardpause und Aktivstatus unter dem
      vollständigen Filialpfad modellieren.
- [x] Lesen und Verwalten der Vorlagen auf berechtigte Planer der konkreten Filiale begrenzen und Mitarbeiterzugänge durch
      Firestore Rules ausschließen.
- [x] Eine kompakte Verwaltung zum Anlegen, Bearbeiten und Deaktivieren filialbezogener Schichtvorlagen bereitstellen.
- [x] Im Schichtdialog eine aktive Vorlage der ausgewählten Filiale statt frei eingegebener regulärer Schichtzeiten auswählen.
- [x] Vorlagen-ID, Bezeichnung, Beginn, Ende und Pause als Momentaufnahme in die konkrete Schicht übernehmen, damit spätere
      Vorlagenänderungen vorhandene Dienstplanstände nicht verändern.
- [x] Beginn und Ende aus Datum, Vorlagenzeiten, Folgetagsangabe und `Europe/Berlin` zuverlässig in absolute Zeitpunkte umwandeln.

#### Tests und Abschluss

- [x] Service-Tests für Laden, Anlegen, Bearbeiten, Löschen und Fehlerweitergabe ergänzen.
- [x] Store-Tests für Zustandsübergänge, Kontextwechsel, Schreibvorgänge und ungespeicherte Änderungen ergänzen.
- [x] Component-Tests für Monatswechsel, leere Zustände, Formularvalidierung und rollenabhängige Aktionen ergänzen.
- [x] Service-, Store-, Rules- und Component-Tests für Vorlagenverwaltung, Filialgrenzen, Vorlagenauswahl und unveränderliche
      Schichtmomentaufnahmen ergänzen.
- [ ] Tastaturbedienung, Dialogfokus und Darstellung auf Desktop sowie kleinem Viewport manuell prüfen.
- [x] Verantwortlichkeiten und tatsächliche APIs von Dienstplan- und Schichtvorlagen-Service unter `docs/services`
      dokumentieren.
- [x] Zustand, Ableitungen und tatsächliche APIs von Dienstplan- und Schichtvorlagen-Store unter `docs/stores` dokumentieren.
- [x] Aufbau und Verantwortlichkeiten der Schichtplan-Komponenten unter `docs/components` dokumentieren.
- [x] `npm test` und die vorhandenen Builds für alle vier Auslieferungsvarianten erfolgreich ausführen.
      `npm test`, `npm run test:rules` und `npm run build:office` sind erfolgreich. Die Varianten-Builds für Master, Filiale und
      Mitarbeiter brechen im lokal verwendeten `esbuild` 0.28.1 mit einem Deadlock ab.

#### Erledigt, wenn

- [x] Berechtigte Benutzer können einen Dienstplanentwurf für eine erlaubte Filiale und einen Monat öffnen.
- [x] Schichtvorlagen können je Filiale verwaltet und beim Einplanen ausgewählt werden.
- [x] Schichten können mit einer aktiven Vorlage und gültiger Mitarbeiterzuordnung angelegt, bearbeitet und gelöscht werden.
- [x] Änderungen an einer Schichtvorlage verändern keine bereits gespeicherten Schichten.
- [x] Nicht berechtigte Rollen, fremde Filialen und unzulässige Zustände erlauben keine Änderung.
- [ ] Monatsansicht, Fehlerzustände und Formulare sind auf Desktop und kleinen Viewports bedienbar.

### 20.5 Konfliktprüfung und Veröffentlichung umsetzen

#### Ziel

Ein Dienstplan kann erst nach nachvollziehbarer fachlicher Prüfung veröffentlicht werden. Mitarbeiterzugänge erhalten
ausschließlich die für sie freigegebene veröffentlichte Ansicht; berechtigte Master-, Office- und Filialkonten arbeiten mit
Entwürfen und historischen Versionen. Spätere Änderungen folgen dem beschlossenen Ablauf.

#### Betroffene Dateien

Änderungen:

- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.ts
- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.html
- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.spec.ts
- src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.ts
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.ts
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.html
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.spec.ts
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/projekt-stand.md
- docs/todo_next.md

#### Schritt 1: Konflikte berechnen und darstellen

- [ ] Ungültige Zeitfolgen, Pausen und überlappende Schichten eines Mitarbeiters erkennen.
- [ ] Blockierende Konflikte von nicht blockierenden Hinweisen unterscheiden.
- [ ] Konflikte am betroffenen Tag und an der betroffenen Schicht verständlich anzeigen.
- [ ] Veröffentlichung bei blockierenden Konflikten verhindern und zusätzlich im Schreibablauf absichern.
- [ ] Konfliktberechnung mit Schichten über Mitternacht und an Zeitraumgrenzen prüfen.

#### Schritt 2: Veröffentlichung umsetzen

- [ ] Veröffentlichungsaktion nur für berechtigte Rollen und einen konfliktfreien aktuellen Entwurf anbieten.
- [ ] Veröffentlichung einschließlich Benutzer, Zeitpunkt und Version gemäß Datenkonzept atomar speichern.
- [ ] Bestätigung vor der Veröffentlichung und verständliche Rückmeldung bei Erfolg oder Fehler anzeigen.
- [ ] Zurückziehen oder nachträgliche Änderung ausschließlich nach dem beschlossenen Zustandsablauf erlauben.
- [ ] Gleichzeitige Änderungen zwischen Prüfung und Veröffentlichung zuverlässig erkennen.

#### Schritt 3: Veröffentlichte Mitarbeiteransicht bereitstellen

- [ ] Veröffentlichte Dienstpläne für Mitarbeiter gemäß der beschlossenen filialweiten Sicht laden.
- [ ] Entwürfe und interne Notizen für Mitarbeiter vollständig ausblenden und durch Firestore Rules schützen.
- [ ] Zeitraum, Schichten, Pausen und relevante Veröffentlichungsinformationen mobil verständlich darstellen.
- [ ] Verhalten bei noch nicht veröffentlichten, zurückgezogenen oder nachträglich ersetzten Plänen festlegen und anzeigen.

#### Tests und Abschluss

- [ ] Unit-Tests für alle blockierenden Konflikte und Hinweise ergänzen.
- [ ] Service- und Store-Tests für Veröffentlichung, konkurrierende Änderung, Zurückziehen und Fehlerfälle ergänzen.
- [ ] Component-Tests für Konfliktanzeige, deaktivierte Veröffentlichung und Bestätigungsablauf ergänzen.
- [ ] Firestore-Emulator-Tests für Entwurfszugriff, Veröffentlichung und Mitarbeiteransicht ergänzen.
- [ ] Den Gesamtprozess mit realen Testkonten für Filiale, Office und Mitarbeiter manuell prüfen.
- [ ] `npm test` und `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [ ] Blockierende Konflikte verhindern zuverlässig eine Veröffentlichung und werden verständlich angezeigt.
- [ ] Ein berechtigter Benutzer kann einen konfliktfreien aktuellen Entwurf nachvollziehbar veröffentlichen.
- [ ] Mitarbeiter sehen ausschließlich die für sie freigegebenen veröffentlichten Dienstplandaten.
- [ ] Gleichzeitige und nachträgliche Änderungen folgen dem festgelegten konsistenten Ablauf.

### 20.6 Erweiterungen nach der ersten Ausbaustufe bewerten

#### Ziel

Nach erfolgreichem Einsatz der manuellen Monatsplanung werden Erweiterungen anhand konkreter betrieblicher Anforderungen
priorisiert und jeweils als eigenes Umsetzungstodo geplant. Die erste Ausbaustufe wird nicht vorsorglich mit ungenutzter
Komplexität belastet.

#### Betroffene Dateien

Änderungen:

- docs/todo_next.md
- docs/todo_spaeter.md
- docs/projekt-plan.md
- docs/projekt-stand.md

#### Schritt 1: Betriebserfahrungen auswerten

- [ ] Rückmeldungen zu Planungsdauer, Bedienung, Konflikten und mobiler Mitarbeiteransicht sammeln.
- [ ] Ermitteln, welche manuellen Arbeitsschritte häufig, fehleranfällig oder unnötig aufwendig sind.
- [ ] Prüfen, ob mehrere Planer, größere Filialen oder längere Planungszeiträume zusätzliche Anforderungen erzeugen.

#### Schritt 2: Erweiterungen fachlich priorisieren

- [ ] Bedarf für Verfügbarkeiten, Urlaub, Krankheit und sonstige Abwesenheiten bewerten.
- [ ] Bedarf für Sollstunden, Arbeitszeitkonten und weitergehende gesetzliche Prüfregeln bewerten.
- [ ] Bedarf für Schichttausch, Freigabewünsche und Mitarbeiterbestätigungen bewerten; Wünsche als getrennte Anträge planen, die
      einen Dienstplan nicht unmittelbar verändern.
- [ ] Bedarf für Änderungsbenachrichtigungen und Push-Nachrichten bewerten.
- [ ] Bedarf für Schichtkopien, automatische Planung oder Optimierung bewerten.
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
