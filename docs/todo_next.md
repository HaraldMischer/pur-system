<!-- pur-system/docs/todo_next.md -->

# Offene Todos

## 13. Fachliche Mitarbeiterverwaltung

### 13.1 Mitarbeiterliste mit Anlage und Bearbeitung

#### Ziel

Der Mitarbeiterbereich erhält unter `/mitarbeiter/liste` eine Übersicht der fachlichen Mitarbeiterdatensätze. Eine Card zum
Hinzufügen öffnet den `MitarbeiterAnlegenDialog`; vorhandene Mitarbeiter werden als `MitarbeiterCard` mit kompakten Details und
einer Bearbeitungsaktion dargestellt. Der `MitarbeiterBearbeitenDialog` ermöglicht die Änderung eines vorhandenen Datensatzes.
Eine eigene geroutete Anlage- oder Detailseite ist nicht vorgesehen.

Ein fachlicher Mitarbeiterdatensatz beschreibt eine in einer Firma beziehungsweise Filiale beschäftigte Person. Er bleibt vom
Firebase-Auth-Benutzer mit `userRole: mitarbeiter`, dessen Anmeldung über `auth/login-page` und dem späteren betrieblichen
Mitarbeiter-Login getrennt.

#### Betroffene Dateien

Änderungen:

- src/app/app.routes.ts
- src/app/app.routes.spec.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/commons/constants/navigation.constants.ts
- src/app/commons/constants/navigation.constants.spec.ts
- src/app/commons/models/domain/mitarbeiter.ts
- src/app/commons/utils/navigation/rollen-navigation.ts
- src/app/commons/utils/navigation/rollen-navigation.spec.ts
- src/app/components/app-shell/app-sidenav/app-sidenav.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-page.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-page.html
- src/app/pages/mitarbeiter-page/mitarbeiter-page.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-page.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/projekt-plan.md
- docs/projekt-stand.md

Neu hinzuzufügen:

- src/app/commons/utils/mitarbeiter/mitarbeiter-berechtigung.ts
- src/app/commons/utils/mitarbeiter/mitarbeiter-berechtigung.spec.ts
- src/app/guards/mitarbeiter-verwaltung.guard.ts
- src/app/guards/mitarbeiter-verwaltung.guard.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.html
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.html
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.html
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.html
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.spec.ts
- src/app/services/domain/mitarbeiter.service.ts
- src/app/services/domain/mitarbeiter.service.spec.ts
- src/app/stores/domain/mitarbeiter.store.ts
- src/app/stores/domain/mitarbeiter.store.spec.ts

#### Schritt 1: Fachlichen Mitarbeiterdatensatz und Berechtigungen festlegen

- [x] Pflichtfelder, optionale Stammdaten und Beschäftigungsdaten vor der technischen Umsetzung verbindlich festlegen.
- [x] Festlegen, ob ein Mitarbeiter auf Firmenebene gespeichert und einer oder mehreren Filialen zugeordnet wird.
- [x] Den Firestore-Pfad und die Form der Filialzuordnungen festlegen, ohne den betrieblichen Login vorwegzunehmen.
- [x] Festlegen, welche Benutzerrollen Mitarbeiter lesen, anlegen und bearbeiten dürfen und auf welche Firmen und Filialen ihre
      Aktionen begrenzt sind.
- [x] `mitarbeiter` in `erlaubteBereiche` ausschließlich als grobe Freigabe des Mitarbeiterbereichs festlegen; die Freigabe darf
      nicht automatisch alle untergeordneten Routen und Aktionen erlauben.
- [x] Eine verbindliche Rollenmatrix für Sichtbarkeit, direkten Routenzugriff sowie Lese- und Schreibaktionen je Unterseite
      festlegen.
- [x] Ausschließen, dass `userRole: mitarbeiter` allein durch den gleichnamigen App-Bereich Verwaltungsrechte für fachliche
      Mitarbeiterdatensätze erhält.
- [x] Fachlichen Mitarbeiterdatensatz, betrieblichen Mitarbeiter-Login und persönlichen Firebase-Auth-Zugang eindeutig
      voneinander abgrenzen.

#### Schritt 2: Domänenmodell und Datenzugriff vorbereiten

- [x] Anwendungs-, Anlage-, Aktualisierungs- und Firestore-Typen in `mitarbeiter.ts` gemäß den beschlossenen Feldern ergänzen.
- [x] Den beschlossenen Mitarbeiterpfad zentral in den Firebase-Konstanten abbilden.
- [x] Einen fachlichen Service mit `loadMitarbeiter`, `createMitarbeiter` und `updateMitarbeiter` ergänzen.
- [x] Einen Domain-Store mit `download`, `isLoaded`, `inProgress`, Fehlerzustand sowie Lade- und Schreibmethoden bereitstellen.
- [x] Firestore Rules für die beschlossene Rollen- und Datenzugriffsbegrenzung ergänzen.

#### Schritt 3: Komponentenlosen Elternpfad und Mitarbeiterliste umsetzen

- [x] Die bisherige `MitarbeiterPage` einschließlich Template, Styles und Spec entfernen und `mitarbeiter-page` nur als
      Feature-Ordner verwenden.
- [x] `mitarbeiter` als komponentenlosen Elternpfad mit den vorhandenen Bereichsprüfungen und einem zusätzlichen fachlichen
      Guard konfigurieren.
- [x] `/mitarbeiter` auf `/mitarbeiter/liste` weiterleiten und die geschützte Child-Route mit dem Titel „Mitarbeiter“
      einrichten.
- [x] `Mitarbeiter` für berechtigte Rollen als nicht navigierbare, ausklappbare Sidebar-Gruppe konfigurieren und
      `Mitarbeiterliste` als ersten untergeordneten Link aufnehmen.
- [x] Die Filialnavigation für die Mitarbeitergruppe ausdrücklich von `flat` auf `nested` umstellen; weitere Rollen nur gemäß
      der beschlossenen Rollenmatrix umstellen.
- [x] Die Bereichsfreigabe am Elternpfad und den fachlichen Mitarbeiterverwaltungs-Guard an der Listenroute durchsetzen.
- [x] Erlaubte Mitarbeiter laden und als `MitarbeiterCard` mit den beschlossenen kompakten Angaben darstellen.
- [x] Leere Listen, laufende Ladevorgänge und Ladefehler verständlich darstellen.

#### Schritt 4: Anlage und Bearbeitung in getrennten Dialogen umsetzen

- [x] Eine Card zum Hinzufügen bereitstellen, die den `MitarbeiterAnlegenDialog` öffnet.
- [x] Anlage- und Bearbeitungsdialog als Reactive Forms mit den in Schritt 1 beschlossenen Feldern und verständlichen
      Validierungsmeldungen umsetzen.
- [x] Den fachlichen Mitarbeiterverwaltungszugriff auch vor dem Öffnen und Ausführen der Schreibaktionen prüfen.
- [x] Firmen- und Filialauswahl ausschließlich aus den fachlich erlaubten Datenzugriffen des angemeldeten Benutzers
      bereitstellen.
- [x] Den Bearbeitungsdialog mit dem vollständigen Mitarbeiterdatensatz initialisieren und unveränderliche Identifikationsdaten
      nicht überschreibbar darstellen.
- [x] Während `inProgress` das gesamte betroffene Formular und alle weiteren datenverändernden Aktionen deaktivieren und
      wiederholte Submit-Aufrufe verhindern.
- [x] Nach erfolgreicher Anlage den Anlagendialog schließen und die neue Card ohne vollständiges Neuladen anzeigen.
- [x] Nach erfolgreicher Bearbeitung den Dialog schließen und die vorhandene Card mit den bestätigten Daten aktualisieren.
- [x] Bei einem Fehler die Eingaben erhalten und eine verständliche Fehlermeldung anzeigen.

#### Tests und Abschluss

- [x] Service- und Store-Tests für Laden, Anlage, Bearbeitung, Zustandsübergänge und relevante Fehlerfälle ergänzen.
- [x] Routing- und Guard-Tests für Weiterleitung sowie erlaubte und abgelehnte direkte Aufrufe ergänzen.
- [x] Navigationstests für die ausklappbare Mitarbeitergruppe, den untergeordneten Listenlink und die rollenabhängige
      Sichtbarkeit ergänzen.
- [x] Component-Tests für Liste, Cards, Dialogöffnung, Validierung, laufenden Submit, Erfolg und Fehler ergänzen.
- [x] Firestore-Emulator-Tests für zulässige Lese- und Schreibzugriffe sowie abgelehnte Rollen- oder Datenzugriffe ergänzen.
- [ ] Mitarbeiterliste sowie beide Dialoge auf Desktop und einem kleinen Viewport einschließlich Tastaturbedienung und sichtbarem
      Fokus manuell prüfen.
- [x] `projekt-plan.md` und `projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test` und `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Berechtigte Benutzer sehen unter `/mitarbeiter/liste` ausschließlich Mitarbeiter aus ihrem erlaubten Datenbereich.
- [x] Berechtigte Benutzer können Mitarbeiter über getrennte Dialoge anlegen und bearbeiten.
- [x] Nicht berechtigte Benutzer können die Liste und ihre Schreibaktionen weder über die Navigation noch direkt verwenden.
- [x] Die Mitarbeitergruppe erscheint nur für die gemäß Rollenmatrix berechtigten Rollen und verwendet dort die
      Nested-Navigation.
- [x] Die Bereichsfreigabe `mitarbeiter` allein gewährt keine fachlichen Verwaltungsrechte auf untergeordnete Routen oder
      Aktionen.
- [x] Mitarbeiterdatensatz, persönlicher Firebase-Auth-Zugang und späterer betrieblicher Mitarbeiter-Login bleiben getrennt.
- [ ] Lade-, Formular-, Erfolgs- und Fehlerzustände funktionieren nachvollziehbar und barrierearm.
- [ ] Automatisierte Tests, Produktionsbuild und manuelle Bedienprüfung sind erfolgreich.

### 13.2 Mitarbeiter-Login

#### Ziel

Ein fachlicher Mitarbeiter kann sich während seiner Arbeit in einer Filiale über die `MitarbeiterLoginPage` betrieblich
anmelden. Dieser Mitarbeiter-Login wird einem Mitarbeiterdatensatz und dem aktuellen Filialkontext eindeutig zugeordnet. Er ist
kein Firebase-Auth-Login, erzeugt keinen Benutzer mit `userRole: mitarbeiter` und verwendet nicht die allgemeine
`auth/login-page`.

Vor der technischen Umsetzung werden Zugangsmerkmal, Geheimnisverwaltung, Sitzungsdauer, Sperrverhalten und betriebliche
Berechtigungen verbindlich festgelegt. Unverschlüsselte beziehungsweise direkt vergleichbare Geheimnisse dürfen weder im Client
noch in Firestore gespeichert werden.

#### Betroffene Dateien

Änderungen:

- src/app/app.routes.ts
- src/app/app.routes.spec.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/commons/constants/navigation.constants.ts
- src/app/commons/constants/navigation.constants.spec.ts
- src/app/commons/utils/navigation/rollen-navigation.ts
- src/app/commons/utils/navigation/rollen-navigation.spec.ts
- src/app/components/app-shell/app-sidenav/app-sidenav.spec.ts
- functions/src/index.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/projekt-plan.md
- docs/projekt-stand.md

Neu hinzuzufügen:

- src/app/commons/models/domain/mitarbeiter-login.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-login-page/mitarbeiter-login-page.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-login-page/mitarbeiter-login-page.html
- src/app/pages/mitarbeiter-page/mitarbeiter-login-page/mitarbeiter-login-page.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-login-page/mitarbeiter-login-page.spec.ts
- src/app/services/domain/mitarbeiter-login.service.ts
- src/app/services/domain/mitarbeiter-login.service.spec.ts
- src/app/stores/domain/mitarbeiter-login.store.ts
- src/app/stores/domain/mitarbeiter-login.store.spec.ts
- functions/src/mitarbeiter-login.ts
- functions/src/mitarbeiter-login.spec.ts

#### Schritt 1: Sicherheits- und Sitzungskonzept festlegen

- [ ] Festlegen, welches Merkmal einen Mitarbeiter beim betrieblichen Login identifiziert und welches Geheimnis verwendet wird.
- [ ] Festlegen, wie Geheimnisse ausschließlich serverseitig abgeleitet, gespeichert, geprüft und erneuert werden.
- [ ] Fehlversuche, Wartezeiten, Sperrung und Entsperrung verbindlich festlegen.
- [ ] Beginn, Dauer, Erneuerung und Ende einer betrieblichen Mitarbeitersitzung definieren.
- [ ] Verhalten bei Mitarbeiterwechsel, Filialwechsel, Inaktivstatus und Verbindungsabbruch festlegen.
- [ ] Betriebliche Mitarbeiterrollen und die daraus entstehenden Funktions- und Datenrechte getrennt von `TUserRole` definieren.
- [ ] Verbindlich festlegen, welche Auth-Rollen den Navigationspunkt und die Route `/mitarbeiter/login` sehen und verwenden
      dürfen.
- [ ] Festlegen, welche zusätzlichen Voraussetzungen neben `erlaubteBereiche: ['mitarbeiter']` gelten, insbesondere ein gültiger
      und erlaubter Filialkontext.

#### Schritt 2: Serverseitige Anmeldung und Zugriffsmodell umsetzen

- [ ] Mitarbeiter-Login-Daten getrennt von den allgemeinen Mitarbeiterstammdaten modellieren.
- [ ] Einrichtung, Änderung und Prüfung des betrieblichen Zugangs ausschließlich über geschützte serverseitige Funktionen
      ermöglichen.
- [ ] Geheimnisse vor der Speicherung mit einem geeigneten passwortspezifischen Verfahren ableiten und niemals zurückgeben.
- [ ] Rate-Limits, Fehlversuche und Sperrzustände serverseitig durchsetzen.
- [ ] Firestore Rules so begrenzen, dass der Client weder Geheimnisableitungen lesen noch Login-Zustände manipulieren kann.

#### Schritt 3: Mitarbeiter-Login-Seite und Sitzungszustand umsetzen

- [ ] `/mitarbeiter/login` als geschützte Child-Route des komponentenlosen Mitarbeiterbereichs einrichten.
- [ ] `Mitarbeiter-Login` gemäß der Rollenmatrix als zweiten untergeordneten Link der ausklappbaren Mitarbeitergruppe ergänzen.
- [ ] Neben der Bereichsfreigabe einen eigenen Guard für Auth-Rolle, Filialkontext und weitere beschlossene Voraussetzungen
      einsetzen.
- [ ] Die Anmeldung eindeutig an den aktuell erlaubten Filialkontext binden.
- [ ] Eingabe, laufende Prüfung, ungültige Zugangsdaten, Sperrung und technische Fehler verständlich darstellen.
- [ ] Den betrieblichen Mitarbeiterzustand getrennt vom Firebase-Auth-Benutzerzustand verwalten.
- [ ] Mitarbeiterwechsel und Abmeldung ermöglichen, ohne die zugrunde liegende Firebase-Auth-Sitzung der Filiale zu beenden.

#### Tests und Abschluss

- [ ] Functions-Tests für gültige Anmeldung, falsche Zugangsdaten, Rate-Limit, Sperrung und inaktive Mitarbeiter ergänzen.
- [ ] Store- und Service-Tests für Sitzungsaufbau, Mitarbeiterwechsel, Abmeldung und Fehlerweitergabe ergänzen.
- [ ] Routing- und Component-Tests für Filialkontext, Formularzustände und zugängliche Fehlermeldungen ergänzen.
- [ ] Navigationstests für die rollenabhängige Sichtbarkeit des Login-Unterpunkts und Guard-Tests für direkte Aufrufe
      ergänzen.
- [ ] Firestore-Emulator-Tests für den Schutz der Login-Daten und betrieblicher Sitzungszustände ergänzen.
- [ ] Sicherheitsrelevante Entscheidungen und Betriebsabläufe in der Projektdokumentation festhalten.
- [ ] Mitarbeiter-Login auf dem vorgesehenen Filialgerät mit Tastatur und einem kleinen Viewport manuell prüfen.
- [ ] `npm test` und `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [ ] Ein aktiver Mitarbeiter kann sich im erlaubten Filialkontext betrieblich an- und abmelden.
- [ ] Nur die gemäß Rollenmatrix berechtigten Auth-Rollen sehen und erreichen den Mitarbeiter-Login.
- [ ] Die Bereichsfreigabe `mitarbeiter` allein genügt nicht, um den betrieblichen Mitarbeiter-Login zu öffnen.
- [ ] Der betriebliche Mitarbeiterzustand ist eindeutig vom Firebase-Auth-Benutzerzustand getrennt.
- [ ] Geheimnisse sind weder im Client noch als Klartext oder direkt vergleichbarer Wert in Firestore verfügbar.
- [ ] Fehlversuche, Sperrung, Mitarbeiterwechsel und Sitzungsende funktionieren gemäß dem beschlossenen Sicherheitskonzept.
- [ ] Automatisierte Tests, Produktionsbuild, Sicherheitsprüfung und manuelle Bedienprüfung sind erfolgreich.

---

## 14. User-Mitarbeiter mit Firmen-Mitarbeiter verknüpfen

### Ziel

Bei der Anlage eines Firebase-Auth-Benutzers mit `userRole: mitarbeiter` wird ein bereits vorhandener fachlicher Mitarbeiter
eindeutig zugeordnet. Der Master wählt zuerst einen Unternehmer, danach eine Firma und anschließend einen aktiven, noch nicht
verknüpften Mitarbeiter dieser Firma aus.

Unternehmer und Firma werden im Benutzerprofil über genau einen Eintrag in `zugriffe` gespeichert. Die String-ID des fachlichen
Mitarbeiters wird zusätzlich als `firmaMitarbeiterId` gespeichert. Der betriebliche Mitarbeiter-Login aus Todo 13.2 bleibt von
dieser Verknüpfung getrennt.

#### Betroffene Dateien

Änderungen:

- src/app/commons/models/domain/benutzer.ts
- src/app/commons/models/domain/mitarbeiter.ts
- src/app/components/datenzugriff-auswahl/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-anlage/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-page.spec.ts
- src/app/services/domain/benutzer.service.ts
- src/app/services/domain/benutzer.service.spec.ts
- src/app/services/firebase/benutzer-verwaltung.service.ts
- src/app/services/firebase/benutzer-verwaltung.service.spec.ts
- src/app/stores/domain/benutzer-verwaltung.store.ts
- src/app/stores/domain/benutzer-verwaltung.store.spec.ts
- functions/src/create-benutzer.ts
- functions/src/create-benutzer.spec.ts
- functions/src/index.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/berechtigungs-matrizen.md
- docs/projekt-plan.md
- docs/projekt-stand.md

Neu hinzuzufügen:

- functions/src/load-mitarbeiter-auswahl.ts
- functions/src/load-mitarbeiter-auswahl.spec.ts

### Schritt 1: Verknüpfungsmodell und Eindeutigkeit festlegen

- [x] Für Benutzer mit `userRole: mitarbeiter` genau einen Unternehmer und genau eine Firma in `zugriffe` zulassen.
- [x] Für diese Rolle eine leere Filialliste innerhalb der ausgewählten Firma zulassen, weil die Filialzuordnungen aus dem
      fachlichen Mitarbeiterdatensatz gelesen werden.
- [x] `firmaMitarbeiterId` als optionale String-ID im Benutzerprofil festlegen und ausschließlich für `userRole: mitarbeiter`
      zulassen.
- [x] Die vollständige Mitarbeiterreferenz aus dem einzigen Unternehmer, der einzigen Firma und `firmaMitarbeiterId` bilden.
- [x] Eine serverseitige Strategie festlegen, die auch bei parallelen Aufrufen genau einen User-Mitarbeiter je Firmen-Mitarbeiter
      sicherstellt.
- [x] Festlegen, wie eine Verknüpfung bei fehlgeschlagener Kontoanlage, Kontodeaktivierung oder einer später notwendigen
      Aufhebung konsistent behandelt wird.

### Schritt 2: Reduzierte Mitarbeiterauswahl bereitstellen

- [x] Eine geschützte Callable Function ergänzen, die nur von einem aktiven Master für einen vorhandenen Unternehmer und eine
      vorhandene Firma aufgerufen werden darf.
- [x] Ausschließlich aktive und noch nicht verknüpfte Mitarbeiter der gewählten Firma zurückgeben.
- [x] Der Auswahl nur Mitarbeiter-ID und einen aus den Personendaten gebildeten Anzeigenamen bereitstellen.
- [x] Adresse, Geburtstag, Kontaktdaten, betriebliche Rolle und weitere Mitarbeiterdaten nicht an den Master zurückgeben.
- [x] Unternehmer- und Firmenwechsel in der Benutzeranlage eindeutig behandeln und abhängige Auswahlwerte zurücksetzen.

### Schritt 3: Benutzeranlage und Verknüpfung umsetzen

- [x] Bei `userRole: mitarbeiter` Unternehmer-, Firmen- und Mitarbeiterauswahl als Pflichtfelder in die Benutzeranlage aufnehmen.
- [x] Für andere Benutzerrollen keine `firmaMitarbeiterId` annehmen oder speichern.
- [x] Den Mitarbeiter serverseitig erneut auf Firma, Aktivstatus und noch nicht vorhandene Verknüpfung prüfen.
- [x] `zugriffe` für User-Mitarbeiter als genau eine Firma mit leerer Filialliste normalisieren und `firmaMitarbeiterId` separat im
      Benutzerprofil speichern.
- [x] Auth-Benutzer, Benutzerprofil und Eindeutigkeitsverknüpfung so anlegen, dass bei einem Fehler kein halbfertiger Zugang oder
      eine verwaiste Verknüpfung bestehen bleibt.
- [x] Die bisherigen Anlageabläufe für Master, Office und Filiale unverändert erhalten.

### Tests und Abschluss

- [x] Functions-Tests für gültige Auswahl, fremde Firma, inaktiven Mitarbeiter, doppelte Verknüpfung und parallele Anlage
      ergänzen.
- [x] Die Rückgabe nicht erforderlicher oder vertraulicher Mitarbeiterfelder in den Functions-Tests ausschließen.
- [x] Frontend-Tests für abhängige Auswahlfelder, Rollenwechsel, Pflichtvalidierung, Ladefehler und erfolgreiche Anlage
      ergänzen.
- [x] Rückabwicklungstests für Fehler nach angelegtem Auth-Benutzer oder während der Verknüpfung ergänzen.
- [x] Benutzeranlage mit allen vier Auth-Rollen auf unverändertes beziehungsweise neues Verhalten prüfen.
- [ ] Nach Umsetzung der Mitarbeiteranlage aus Todo 13.1 einen Test-Firmenmitarbeiter anlegen und dessen Verknüpfung mit einem
      realen Testkonto kontrolliert prüfen, ohne einen produktiven Mitarbeiterzugang unbeabsichtigt zu verändern.
- [x] `berechtigungs-matrizen.md`, `projekt-plan.md` und `projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test` und `npm run build` erfolgreich ausführen.

### Erledigt, wenn

- [x] Ein aktiver Master kann einen User-Mitarbeiter nur mit einem aktiven, noch nicht verknüpften Mitarbeiter der gewählten
      Firma anlegen.
- [x] Das Benutzerprofil enthält genau einen Unternehmer, genau eine Firma, eine leere Filialliste und die zugehörige
      `firmaMitarbeiterId`.
- [x] Die Mitarbeiter-App kann aus dem eigenen Benutzerprofil den vollständigen Pfad des fachlichen Mitarbeiterdatensatzes
      bestimmen.
- [x] Ein Firmen-Mitarbeiter kann auch bei parallelen Anlageversuchen höchstens einem User-Mitarbeiter zugeordnet werden.
- [x] Der Master erhält für die Auswahl keine vollständigen oder vertraulichen Mitarbeiterdaten.
- [x] Fehler hinterlassen weder einen halbfertigen Auth-Benutzer noch eine verwaiste oder doppelte Verknüpfung.
- [x] Bestehende Benutzerrollen und ihre Anlageabläufe bleiben funktionsfähig.
- [ ] Automatisierte Tests, Produktionsbuild und kontrollierte manuelle Prüfung sind erfolgreich.
