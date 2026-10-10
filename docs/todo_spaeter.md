<!-- pur-system/docs/todo_spaeter.md -->

# Spätere Todos

## 9. Todo: Offline-Schreibvorgänge und Synchronisation bei fachlichem Bedarf prüfen

### Ziel

Die geplante Firestore-Ladestrategie erlaubt Pur Filiale einen persistenten Lesecache für ausdrücklich festgelegte Profildaten
und Stammdaten. Daraus folgt keine Freigabe für Offline-Schreibvorgänge oder eine spätere Synchronisation lokaler Änderungen.

Offline-Schreibvorgänge werden erst geplant, wenn eine konkrete Fachfunktion sie benötigt. Die Entscheidung erfolgt dann einzeln
für Datenart, Benutzerrolle, Auslieferungsvariante und Aktion. Dieses Todo bleibt bis zu einem solchen fachlichen Bedarf
zurückgestellt.

### Betroffene Dateien

Änderungen:

- docs/todo_spaeter.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/matrix-cache-strategien.md

### Schritt 1: Grenzen des geplanten Lesecaches festhalten

- [x] Den persistenten Lesecache ausschließlich für die Auslieferungsvariante Pur Filiale vorsehen.
- [x] Benutzerprofil und Stammdaten als zunächst vorgesehene Cache-Daten festlegen.
- [x] Keine Offline-Änderungen und keine spätere Synchronisation fachlicher Änderungen vorsehen.
- [x] Offline-App-Shell, persistenten Lesecache und Offline-Schreibvorgänge als getrennte Fähigkeiten behandeln.

### Schritt 2: Späteren fachlichen Bedarf konkretisieren

- [ ] Die konkrete Fachfunktion und Datenart benennen, für die ein Offline-Schreibvorgang benötigt wird.
- [ ] Betroffene Benutzerrollen und Auslieferungsvarianten festlegen.
- [ ] Lokale Anzeige, lokale Speicherung und Offline-Änderungen weiterhin getrennt entscheiden.
- [ ] Schutzbedarf, Benutzertrennung, veraltete Daten und Verhalten bei entzogenen Berechtigungen bewerten.
- [ ] Für Offline-Änderungen Synchronisation und Konfliktbehandlung fachlich festlegen.

### Schritt 3: Konkrete Umsetzung planen

- [ ] Für den freigegebenen Anwendungsfall ein eigenes Umsetzungstodo mit den tatsächlich betroffenen Dateien anlegen.
- [ ] Nur die ausdrücklich beschlossene Datenart, Rolle, Auslieferungsvariante und Aktion umsetzen.
- [ ] Passende Service-, Store-, Guard-, Rules-, Build- und manuelle Prüfungen für den konkreten Anwendungsfall festlegen.

### Tests und Abschluss

- [x] Die Trennung zwischen persistentem Lesecache und Offline-Schreibvorgängen in der Planung dokumentieren.
- [x] Festhalten, dass dieses Todo keine Offline-Schreibvorgänge freigibt.
- [ ] Bei späterer Aktivierung dieses Todos die konkrete Entscheidung mit Auth, Backend, Firestore Rules und PWA-Konfigurationen
      abgleichen.

### Erledigt, wenn

- [ ] Für einen konkreten fachlichen Anwendungsfall sind die benötigten Offline-Schreibvorgänge eindeutig beschrieben.
- [ ] Datenart, Rollen, Auslieferungsvarianten und erlaubte Aktionen sind festgelegt.
- [ ] Sicherheits-, Synchronisations- und Konfliktregeln sind soweit erforderlich entschieden.
- [ ] Ein abgegrenztes Umsetzungstodo mit prüfbaren Abnahmekriterien ist angelegt.

## 14. Mitarbeiter-Login

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
- src/app/pages/mitarbeiter/mitarbeiter-login-page/mitarbeiter-login-page.ts
- src/app/pages/mitarbeiter/mitarbeiter-login-page/mitarbeiter-login-page.html
- src/app/pages/mitarbeiter/mitarbeiter-login-page/mitarbeiter-login-page.scss
- src/app/pages/mitarbeiter/mitarbeiter-login-page/mitarbeiter-login-page.spec.ts
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
- [ ] Planungsaktionen in der Filial-App nur für einen aktiven, der eigenen Filiale zugeordneten Firma-Mitarbeiter mit
      `dienstplaner` anbieten.
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
- [ ] Ein Filialkonto kann Planungsaktionen nur mit einer gültigen betrieblichen Sitzung eines aktiven, der eigenen Filiale
      zugeordneten Firma-Mitarbeiters mit `dienstplaner` verwenden.
- [ ] Geheimnisse sind weder im Client noch als Klartext oder direkt vergleichbarer Wert in Firestore verfügbar.
- [ ] Fehlversuche, Sperrung, Mitarbeiterwechsel und Sitzungsende funktionieren gemäß dem beschlossenen Sicherheitskonzept.
- [ ] Automatisierte Tests, Produktionsbuild, Sicherheitsprüfung und manuelle Bedienprüfung sind erfolgreich.
