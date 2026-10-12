<!-- pur-system/docs/todo_next.md -->

# Offene Todos

## 20. Dienst- und Schichtplanung

Der Schichtplan wird schrittweise aus filialbezogenen Monatsplänen aufgebaut, die in einer filialübergreifenden Arbeitsansicht
zusammengeführt werden können. Die erste Ausbaustufe konzentriert sich auf eine manuelle Planung mit klarer Entwurfs- und
Veröffentlichungslogik. Automatische Planung, Urlaubsverwaltung, Zeiterfassung, Schichttausch und Benachrichtigungen bleiben
zunächst außerhalb des vereinbarten Umfangs.

### 20.5 Konfliktprüfung und Veröffentlichung umsetzen

#### Ziel

Ein Dienstplan kann erst nach nachvollziehbarer fachlicher Prüfung veröffentlicht werden. Mitarbeiterzugänge erhalten
ausschließlich die für sie freigegebene veröffentlichte Ansicht; berechtigte Master-, Office- und Filialkonten arbeiten mit
Entwürfen und historischen Versionen. Spätere Änderungen folgen dem beschlossenen Ablauf.

#### Betroffene Dateien

Änderungen:

- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.ts
- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.html
- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.scss
- src/app/components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich.spec.ts
- src/app/components/app-shell/app-sidenav/app-sidenav.scss
- src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.ts
- src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.ts
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.html
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.scss
- src/app/components/schichtplan/schichtplan-monat/schichtplan-monat.spec.ts
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.ts
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.html
- src/app/components/schichtplan/schichtvorlage-bearbeiten-dialog/schichtvorlage-bearbeiten-dialog.spec.ts
- src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.ts
- src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.html
- src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.spec.ts
- src/app/components/data-selectors/app-kontext-selector/filiale-selector/filiale-selector.ts
- src/app/components/data-selectors/app-kontext-selector/filiale-selector/filiale-selector.html
- src/app/components/data-selectors/app-kontext-selector/filiale-selector/filiale-selector.spec.ts
- src/app/commons/constants/app-kontext-selector.constants.ts
- src/app/commons/constants/app-kontext-selector.constants.spec.ts
- src/app/stores/app/app-kontext.store.ts
- src/app/stores/app/app-kontext.store.spec.ts
- src/app/services/domain/dienstplan.service.ts
- src/app/services/domain/dienstplan.service.spec.ts
- src/app/stores/domain/dienstplan.store.ts
- src/app/stores/domain/dienstplan.store.spec.ts
- src/app/stores/domain/schichtvorlage.store.ts
- src/app/stores/domain/schichtvorlage.store.spec.ts
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.ts
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.html
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.scss
- src/app/pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page.spec.ts
- src/assets/scss/_main.scss
- src/assets/scss/base/_layout.scss
- src/assets/scss/modules/_dialog.scss
- src/assets/scss/modules/_form.scss
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/matrix-kontextselektor.md
- docs/components/schichtplan.md
- docs/projekt-plan.md
- docs/stores/schichtvorlage-store.md
- docs/projekt-stand.md
- docs/todo_next.md

Neu hinzuzufügen:

- src/app/commons/utils/datum/monat.ts
- src/app/commons/utils/datum/monat.spec.ts
- src/app/components/date-selectors/monat-selector/monat-selector.ts
- src/app/components/date-selectors/monat-selector/monat-selector.html
- src/app/components/date-selectors/monat-selector/monat-selector.scss
- src/app/components/date-selectors/monat-selector/monat-selector.spec.ts
- src/app/components/schichtplan/dienstplan-filialabschnitt/dienstplan-filialabschnitt.ts
- src/app/components/schichtplan/dienstplan-filialabschnitt/dienstplan-filialabschnitt.html
- src/app/components/schichtplan/dienstplan-filialabschnitt/dienstplan-filialabschnitt.scss
- src/app/components/schichtplan/dienstplan-filialabschnitt/dienstplan-filialabschnitt.spec.ts
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.ts
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.html
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.scss
- src/app/components/schichtplan/schichtvorlagen-filialabschnitt/schichtvorlagen-filialabschnitt.spec.ts
- src/assets/scss/modules/_scrollbar.scss

#### Schritt 1: Filialübergreifenden Arbeitskontext umsetzen

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
- [x] Für den gemeinsam ausgewählten Monat die filialbezogenen Dienstpläne aller ausgewählten Filialen über ihre direkten
      Firestore-Pfade laden.
- [x] Für jede ausgewählte Filiale einen eigenen Monatsplanabschnitt rendern und darin den filialbezogenen Lade-, Fehler-, Leer-
      oder Planzustand darstellen.
- [x] Fehlt der Monatsplan einer Filiale, nur in deren Abschnitt einen verständlichen Leerzustand anzeigen und berechtigten
      Benutzern im Bearbeitungsbereich die Aktion `Plan erstellen` anbieten. Die übrigen Filialpläne bleiben davon unberührt.
- [x] Jede Schicht in der gemeinsamen Ansicht eindeutig mit ihrer Filiale kennzeichnen.
- [x] Beim Anlegen einer Schicht die Filiale aus dem jeweiligen Monatsplanabschnitt als Zielfiliale übernehmen und nur deren
      aktive Schichtvorlagen sowie die dort einsetzbaren Mitarbeiter anbieten.
- [x] Gemeinsam dargestellte Filialdienstpläne weiterhin als eigenständige Pläne behandeln und Schichtänderungen
      ausschließlich im jeweiligen Filialdienstplan speichern.
- [x] In jeder Tageskarte eines bearbeitbaren Entwurfs eine Anlageaktion anbieten und das gewählte Datum an den Schichtdialog
      übergeben.
- [x] Unter der gemeinsamen Monatsauswahl eine responsive zweispaltige Arbeitsfläche für Dienstpläne und eine vorbereitete
      Mitarbeiterübersicht bereitstellen; beide Spalten auf breiten Ansichten unabhängig scrollbar halten und auf schmalen
      Ansichten untereinander in einer gemeinsamen Arbeitsfläche scrollen.
- [x] Für jede ausgewählte Filiale einen eigenen Schichtvorlagenabschnitt laden und Vorlagen ausschließlich in ihrem jeweiligen
      Filialkontext anlegen oder bearbeiten; firmenweite Vorlagen und filialübergreifende Kopien ausschließen.

#### Schritt 2: Konflikte berechnen und darstellen

- [ ] In der Mitarbeiterübersicht je Mitarbeiter kompakte Karten mit den insgesamt im ausgewählten Monat vergebenen Stunden und
      weiteren für die Planung relevanten Informationen darstellen.
- [ ] Festlegen, ob nur die Pausendauer geplant wird oder zusätzlich konkrete Pausenbeginn- und Pausenendzeiten im Dienstplan
      gespeichert werden; eine verpflichtende Doppelbesetzung ist dabei nicht zu prüfen.
- [ ] Ungültige Zeitfolgen, Pausen und überlappende Schichten eines Mitarbeiters filialübergreifend erkennen.
- [ ] Für die Veröffentlichung die relevanten Planungsstände aller Filialen des betroffenen Mitarbeiters berücksichtigen, auch
      wenn die sichtbare Filialauswahl zuvor eingeschränkt wurde.
- [ ] Die Veröffentlichung sperren, wenn ein relevanter Filialplan wegen fehlender Leseberechtigung oder eines Ladefehlers nicht
      vollständig in die Konfliktprüfung einbezogen werden kann.
- [ ] Blockierende Konflikte von nicht blockierenden Hinweisen unterscheiden.
- [ ] Konflikte am betroffenen Tag und an der betroffenen Schicht verständlich anzeigen.
- [ ] Veröffentlichung bei blockierenden Konflikten verhindern und zusätzlich im Schreibablauf absichern.
- [ ] Konfliktberechnung mit Schichten über Mitternacht und an Zeitraumgrenzen prüfen.

#### Schritt 3: Veröffentlichung umsetzen

- [ ] Veröffentlichungsaktion nur für berechtigte Rollen und einen konfliktfreien aktuellen Entwurf anbieten.
- [ ] Versionierung für jeden Filialdienstplan getrennt fortführen.
- [ ] Veröffentlichung einschließlich Benutzer, Zeitpunkt und Version ausschließlich für den betreffenden Filialdienstplan
      gemäß Datenkonzept atomar speichern.
- [ ] Bestätigung vor der Veröffentlichung und verständliche Rückmeldung bei Erfolg oder Fehler anzeigen.
- [ ] Zurückziehen oder nachträgliche Änderung ausschließlich nach dem beschlossenen Zustandsablauf erlauben.
- [ ] Gleichzeitige Änderungen zwischen Prüfung und Veröffentlichung zuverlässig erkennen.

#### Schritt 4: Veröffentlichte Mitarbeiteransicht bereitstellen

- [ ] Veröffentlichte Dienstpläne für Mitarbeiter aus allen ausgewählten und fachlich erlaubten Filialen laden und gemeinsam
      darstellen.
- [ ] Aus den Schichten des geöffneten Monats eindeutige Mitarbeiter-IDs ermitteln, vorhandene Store-Einträge wiederverwenden
      und nur fehlende Mitarbeiterdokumente mit `networkOnly` gezielt laden.
- [ ] Entwürfe und interne Notizen für Mitarbeiter vollständig ausblenden und durch Firestore Rules schützen.
- [ ] Zeitraum, Schichten, Pausen und relevante Veröffentlichungsinformationen mobil verständlich darstellen.
- [ ] Verhalten bei noch nicht veröffentlichten, zurückgezogenen oder nachträglich ersetzten Plänen festlegen und anzeigen.

#### Tests und Abschluss

- [x] Store- und Component-Tests für die automatische erste Filialauswahl, Filialmehrfachauswahl, gemeinsames Laden und
      eindeutige Filialkennzeichnung ergänzen.
- [x] Den filialabhängigen Schichtdialog mit Zielfiliale, Vorlagen und Mitarbeiterbegrenzung testen.
- [ ] Unit-Tests für alle blockierenden Konflikte und Hinweise ergänzen.
- [ ] Service- und Store-Tests für Veröffentlichung, konkurrierende Änderung, Zurückziehen und Fehlerfälle ergänzen.
- [ ] Component-Tests für Konfliktanzeige, deaktivierte Veröffentlichung und Bestätigungsablauf ergänzen.
- [ ] Firestore-Emulator-Tests für Entwurfszugriff, Veröffentlichung und Mitarbeiteransicht ergänzen.
- [ ] Den Gesamtprozess mit realen Testkonten für Filiale, Office und Mitarbeiter manuell prüfen.
- [ ] `npm test`, `npm run build:master`, `npm run build:office`, `npm run build:filiale` und `npm run build:mitarbeiter`
      erfolgreich ausführen.

#### Erledigt, wenn

- [x] Benutzer können die Monatspläne mehrerer erlaubter Filialen gemeinsam anzeigen und eindeutig unterscheiden.
- [ ] Blockierende Konflikte verhindern zuverlässig eine Veröffentlichung und werden verständlich angezeigt.
- [ ] Eine unvollständige filialübergreifende Konfliktprüfung verhindert die Veröffentlichung.
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
- [ ] Bedarf für Schichttausch, Freigabewünsche und Mitarbeiterbestätigungen bewerten; Wünsche als getrennte Anträge planen,
      die einen Dienstplan nicht unmittelbar verändern.
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
