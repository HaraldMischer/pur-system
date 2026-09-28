<!-- pur-system/docs/todo_next.md -->

# Offene Todos

## 16. Todo: Benutzerabhängige Firestore-Ladestrategie umsetzen

Die in der [Firestore-Ladestrategie](./firestore-ladestrategie.md) festgelegte Aufgabenteilung wird schrittweise umgesetzt. Der
Sitzungsstart wird aus dem `BenutzerStore` herausgelöst, der Ladeumfang zentral aus Rolle und Zugriffen bestimmt und die
Datenquelle abhängig von der Auslieferungsvariante gewählt.

### 16.1 AppInitialisierungService einführen

#### Ziel

Der `AppInitialisierungService` bildet den einzigen Einstiegspunkt für den Sitzungsstart. Er initialisiert den `BenutzerStore`,
koordiniert das Laden der zwingenden Stammdaten und stellt einen eindeutigen Initialisierungszustand bereit.

#### Betroffene Dateien

Änderungen:

- src/app/app.ts
- src/app/app.spec.ts
- src/app/stores/app/benutzer.store.ts
- src/app/stores/app/benutzer.store.spec.ts

Neu hinzuzufügen:

- src/app/commons/models/app/app-initialisierung.types.ts
- src/app/services/core/app-initialisierung.service.ts
- src/app/services/core/app-initialisierung.service.spec.ts

#### Schritt 1: Öffentlichen Initialisierungszustand anlegen

- [ ] Die Zustände `idle`, `loading`, `ready` und `error` einschließlich eines konkreten Fehlers modellieren.
- [ ] Den Initialisierungszustand ausschließlich über den `AppInitialisierungService` bereitstellen.
- [ ] Eine öffentliche Wiederholungsaktion für eine fehlgeschlagene Initialisierung vorsehen.

#### Schritt 2: Sitzungsstart zentralisieren

- [ ] In `app.ts` einmalig den `AppInitialisierungService` statt direkt den `BenutzerStore` starten.
- [ ] Den `BenutzerStore` durch den Service initialisieren und dessen Authentifizierungs- und Profilzustand beobachten.
- [ ] Das Laden von Stammdaten aus dem `BenutzerStore` entfernen.
- [ ] Ohne angemeldeten Benutzer oder aktives Profil den Zustand und die sitzungsbezogenen Daten zurücksetzen.
- [ ] Ergebnisse eines veralteten Initialisierungsauftrags nach Abmeldung, Benutzer- oder Kontextwechsel verwerfen.

#### Tests und Abschluss

- [ ] Service-Tests für Start, Abmeldung, aktives und inaktives Profil, Fehler und Wiederholung ergänzen.
- [ ] Store-Tests an die Trennung von Profilbeobachtung und Stammdateninitialisierung anpassen.
- [ ] App-Test auf den einmaligen Start über den `AppInitialisierungService` umstellen.

#### Erledigt, wenn

- [ ] Die App besitzt genau einen Einstiegspunkt für den Sitzungsstart.
- [ ] Der `BenutzerStore` beobachtet ausschließlich Authentifizierung und Benutzerprofil.
- [ ] Der Initialisierungszustand ist eindeutig und öffentlich auswertbar.
- [ ] Veraltete Initialisierungsergebnisse können keinen neuen Sitzungskontext überschreiben.

### 16.2 MitarbeiterStore für mehrere Firmenkontexte erweitern

#### Ziel

Der `MitarbeiterStore` kann die beim Sitzungsstart benötigten Mitarbeiter mehrerer Firmen gleichzeitig halten. Seitenbezogene
Lade- und Schreibabläufe für einen ausgewählten Firmenkontext bleiben weiterhin eindeutig möglich.

#### Betroffene Dateien

Änderungen:

- src/app/commons/models/domain/mitarbeiter.ts
- src/app/services/domain/mitarbeiter.service.ts
- src/app/services/domain/mitarbeiter.service.spec.ts
- src/app/stores/domain/mitarbeiter.store.ts
- src/app/stores/domain/mitarbeiter.store.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.spec.ts

#### Schritt 1: Mehrere Mitarbeiterkontexte abbilden

- [ ] Mitarbeiterbestände eindeutig nach Unternehmer, Firma und optionaler Filiale zuordnen.
- [ ] Für jeden Eintrag den zum späteren Lesen und Schreiben erforderlichen Unternehmenskontext erhalten.
- [ ] Einen vollständig geladenen Kontext von einem geladenen, aber leeren Ergebnis unterscheiden.
- [ ] Den gesamten sitzungsbezogenen Mitarbeiterbestand bei Abmeldung oder Benutzerwechsel zurücksetzen.

#### Schritt 2: Laden und bestehende Fachseite anpassen

- [ ] Mehrere Firmenkontexte laden, ohne einen zuvor geladenen Bestand zu überschreiben.
- [ ] Identische laufende oder bereits vollständig geladene Kontexte nicht erneut laden.
- [ ] Veraltete Ladeergebnisse nach einem Kontextwechsel verwerfen.
- [ ] Die Mitarbeiterliste weiterhin auf den für die Seite ausgewählten Firmen- und Filialkontext begrenzen.
- [ ] Bestehende Anlage-, Bearbeitungs- und Löschvorgänge auf einen eindeutigen Firmenkontext beschränken.

#### Tests und Abschluss

- [ ] Store-Tests für mehrere Firmen, Filialfilter, leere Ergebnisse, Fehler und Zurücksetzen ergänzen.
- [ ] Bestehende Tests der Mitarbeiterliste und Schreibvorgänge an das neue Zustandsmodell anpassen.

#### Erledigt, wenn

- [ ] Mitarbeiter mehrerer Firmen können gleichzeitig im Store gehalten werden.
- [ ] Filialkonten sehen im ausgewählten Kontext nur Mitarbeiter mit der eigenen Filial-ID.
- [ ] Schreibvorgänge verwenden weiterhin einen eindeutig geladenen Firmenkontext.
- [ ] Ein Benutzer- oder Kontextwechsel kann keine fremden oder veralteten Mitarbeiterdaten übernehmen.

### 16.3 StammdatenLadeservice und Rollenlogik umsetzen

#### Ziel

Der `StammdatenLadeservice` erzeugt aus dem aktiven Benutzerprofil den vollständigen Ladeplan und beauftragt die fachlichen
Stores mit den für diese Sitzung zwingend benötigten Stammdaten.

#### Betroffene Dateien

Änderungen:

- src/app/stores/app/stammdaten.store.ts
- src/app/stores/app/stammdaten.store.spec.ts
- src/app/stores/domain/mitarbeiter.store.ts
- src/app/stores/domain/mitarbeiter.store.spec.ts
- src/app/services/core/app-initialisierung.service.ts
- src/app/services/core/app-initialisierung.service.spec.ts

Neu hinzuzufügen:

- src/app/services/core/stammdaten-ladeservice.ts
- src/app/services/core/stammdaten-ladeservice.spec.ts

#### Schritt 1: Rollenabhängigen Ladeplan bilden

- [ ] Für `master` alle Unternehmer, Firmen, Filialen, Benutzerprofile und Mitarbeiter aller Firmen einplanen.
- [ ] Für `office` die zugeordneten Unternehmer, Firmen und Filialen sowie die Mitarbeiter der zugeordneten Firmen einplanen.
- [ ] Für `filiale` den zugeordneten Unternehmer, die Firma und die Filiale sowie die Mitarbeiter mit passender `filialIds`
      einplanen.
- [ ] Für `mitarbeiter` den zugeordneten Unternehmer und die Firma sowie alle Mitarbeiter dieser Firma einplanen.
- [ ] Fehlende oder widersprüchliche Pflichtzuordnungen als Initialisierungsfehler behandeln.

#### Schritt 2: Fachliche Ladevorgänge koordinieren

- [ ] Die Rollenlogik aus dem `StammdatenStore` in den `StammdatenLadeservice` verschieben.
- [ ] Hierarchie-, Benutzerprofil- und Mitarbeiterdaten über die zuständigen Stores laden.
- [ ] Abhängige Ladevorgänge in fachlich notwendiger Reihenfolge und unabhängige Ladevorgänge parallel ausführen.
- [ ] Abschluss oder Fehler des gesamten zwingenden Ladeplans an den `AppInitialisierungService` zurückgeben.
- [ ] Bei Änderungen von `userRole` oder `zugriffe` einen neuen Ladeplan für den geänderten Kontext ausführen.

#### Tests und Abschluss

- [ ] Für jede Benutzerrolle den erzeugten Ladeplan und die beauftragten Store-Aufrufe testen.
- [ ] Fehler einzelner zwingender Ladevorgänge und Änderungen des Benutzerkontexts testen.
- [ ] Sicherstellen, dass Feature-Daten nicht beim Sitzungsstart geladen werden.

#### Erledigt, wenn

- [ ] Der benutzerabhängige Ladeumfang wird an genau einer Stelle bestimmt.
- [ ] Alle vier Rollen laden ausschließlich die in der Strategie festgelegten Stammdaten.
- [ ] Der Initialisierungsstatus wird erst nach Abschluss aller zwingenden Ladevorgänge `ready`.
- [ ] Rollen- und Zugriffsänderungen führen zu einem neuen, abgegrenzten Ladeplan.

### 16.4 Guards und Initialisierungsfehlerseite anbinden

#### Ziel

Geschützte Navigation wartet auf die Sitzungsinitialisierung. Ein fehlgeschlagener zwingender Ladevorgang führt auf eine eigene
Fehlerseite, von der aus die Initialisierung wiederholt oder die Firebase-Sitzung beendet werden kann.

#### Betroffene Dateien

Änderungen:

- src/app/app.routes.ts
- src/app/app.routes.spec.ts
- src/app/guards/auth.guard.ts
- src/app/guards/auth.guard.spec.ts
- src/app/guards/bereich.guard.ts
- src/app/guards/bereich.guard.spec.ts
- src/app/guards/guard-navigation.ts
- src/app/guards/guard-navigation.spec.ts

Neu hinzuzufügen:

- src/app/guards/initialisierung.guard.ts
- src/app/guards/initialisierung.guard.spec.ts
- src/app/pages/initialisierungsfehler-page/initialisierungsfehler-page.ts
- src/app/pages/initialisierungsfehler-page/initialisierungsfehler-page.html
- src/app/pages/initialisierungsfehler-page/initialisierungsfehler-page.scss
- src/app/pages/initialisierungsfehler-page/initialisierungsfehler-page.spec.ts

#### Schritt 1: Navigation an den Initialisierungszustand binden

- [ ] Authentifizierung, Profilstatus, Initialisierung, Bereichsfreigabe und Rollenprüfung in eindeutiger Reihenfolge auswerten.
- [ ] Während `loading` auf den Abschluss warten, ohne parallele Profil- oder Stammdatenabfragen aus Guards zu starten.
- [ ] Bei `error` zur Route `/initialisierungsfehler` weiterleiten und die ursprünglich angeforderte URL erhalten.
- [ ] Die Fehlerroute nur durch die Firebase-Anmeldung und nicht durch eine erfolgreiche Initialisierung schützen.

#### Schritt 2: Fehlerseite umsetzen

- [ ] Den konkreten Initialisierungsfehler verständlich innerhalb der App-Shell anzeigen.
- [ ] Eine Wiederholung über den `AppInitialisierungService` anbieten.
- [ ] Nach erfolgreicher Wiederholung die ursprünglich angeforderte Route öffnen.
- [ ] Eine Abmeldung als sicheren Ausweg bereitstellen.

#### Tests und Abschluss

- [ ] Guard-Tests für `idle`, `loading`, `ready`, `error`, Abmeldung und fehlende Berechtigungen ergänzen.
- [ ] Routing- und Seitentests für Wiederholung, Rücknavigation und Abmeldung ergänzen.
- [ ] Prüfen, dass Guards und Fehlerseite keine eigenen fachlichen Firestore-Abfragen ausführen.

#### Erledigt, wenn

- [ ] Geschützte Fachrouten werden erst nach erfolgreicher Initialisierung geöffnet.
- [ ] Initialisierungsfehler erzeugen keine Weiterleitungsschleife.
- [ ] Wiederholung und Abmeldung sind von der Fehlerseite aus möglich.
- [ ] Die ursprünglich angeforderte Route wird nach erfolgreicher Wiederholung geöffnet.

### 16.5 Cache- und Lesestrategien umsetzen

#### Ziel

Die Auslieferungsvariante legt beim App-Start die Firestore-Cache-Art fest. Der `FirestoreDbService` führt Lesevorgänge nach
einer expliziten Datenquellenstrategie aus, ohne Benutzerrollen oder fachliche Berechtigungen zu kennen.

#### Betroffene Dateien

Änderungen:

- src/app/app.config.ts
- src/app/services/firebase/firestore-db.service.ts
- src/app/services/firebase/firestore-db.service.spec.ts
- src/app/services/domain/benutzer.service.ts
- src/app/services/domain/benutzer.service.spec.ts
- src/app/services/domain/unternehmer.service.ts
- src/app/services/domain/firma.service.ts
- src/app/services/domain/filiale.service.ts
- src/app/services/domain/mitarbeiter.service.ts
- src/environments/environment.ts
- src/environments/environment.prod.ts
- src/environments/environment.master-prod.ts
- src/environments/environment.pwa-prod.ts
- src/environments/environment.mitarbeiter-prod.ts

Neu hinzuzufügen:

- src/app/commons/models/app/firestore-lesestrategie.types.ts

#### Schritt 1: Cache-Art je Auslieferungsvariante konfigurieren

- [ ] Die Cache-Art als explizite Environment-Einstellung modellieren.
- [ ] Für Pur Filiale `persistentLocalCache` konfigurieren.
- [ ] Für Pur Master, Pur Office, Pur Mitarbeiter und Entwicklung `memoryLocalCache` konfigurieren.
- [ ] Firestore in `app.config.ts` genau einmal mit der konfigurierten Cache-Art initialisieren.
- [ ] Bei Abmeldung oder Benutzerwechsel verhindern, dass ein nachfolgender Benutzer Daten des vorherigen Sitzungskontexts nutzt.

#### Schritt 2: Datenquellenstrategien technisch bereitstellen

- [ ] `cacheFirst`, `networkOnly`, `networkFirst` und `cacheOnly` typisieren und im `FirestoreDbService` umsetzen.
- [ ] Dokument-, Collection- und Query-Abfragen mit der jeweils angeforderten Strategie ausführen.
- [ ] Bei `networkFirst` nur bei einem technischen Serverfehler auf einen vorhandenen Cache-Wert zurückfallen.
- [ ] Gleichzeitige identische Leseaufträge nur bei gleichem Pfad, gleicher Query und gleicher Strategie zusammenführen.
- [ ] Firestore-Fehler unverändert an den aufrufenden fachlichen Service weitergeben.

#### Schritt 3: Strategien fachlich zuweisen

- [ ] Pur Filiale lädt das Benutzerprofil mit `networkFirst` und Stammdaten mit `cacheFirst`.
- [ ] Erzwungene Neuladevorgänge verwenden `networkOnly`.
- [ ] Die übrigen Auslieferungsvarianten verwenden für Profil und Stammdaten `networkOnly`.
- [ ] `cacheOnly` nur für einen ausdrücklich festgelegten Offline-Ablauf verwenden.
- [ ] Keine Offline-Schreib- oder Synchronisationslogik in diesem Todo einführen.

#### Tests und Abschluss

- [ ] Service-Tests für Treffer und Fehlschlag jeder Lesestrategie ergänzen.
- [ ] Die Auswahl der Cache-Art für alle Environment-Dateien prüfen.
- [ ] Profil- und Stammdatenzugriffe jeder Auslieferungsvariante mit der erwarteten Strategie testen.
- [ ] Benutzertrennung bei Abmeldung und Benutzerwechsel testen.

#### Erledigt, wenn

- [ ] Nur Pur Filiale verwendet einen persistenten lokalen Firestore-Cache.
- [ ] Jede technische Leseoperation verwendet eine explizite und getestete Datenquellenstrategie.
- [ ] Der `FirestoreDbService` enthält keine Rollen- oder Bereichslogik.
- [ ] Cache-Daten eines vorherigen Sitzungskontexts werden nicht durch einen nachfolgenden Benutzer übernommen.

### 16.6 Gesamtablauf prüfen und dokumentieren

#### Ziel

Der vollständige Sitzungsstart funktioniert für alle Benutzerrollen und Auslieferungsvarianten. Dokumentation und Todo-Stand
werden erst nach erfolgreicher technischer und manueller Prüfung auf den tatsächlich erreichten Stand gebracht.

#### Betroffene Dateien

Änderungen:

- docs/firestore-ladestrategie.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/pwa-betriebsarten.md
- docs/todo_next.md
- docs/todo_done.md

#### Schritt 1: Rollen und Zustandsübergänge integriert prüfen

- [ ] Den Sitzungsstart für `master`, `office`, `filiale` und `mitarbeiter` mit gültigen Zuordnungen prüfen.
- [ ] Inaktives und fehlendes Profil, ungültige Zugriffe, Ladefehler, Wiederholung und Abmeldung prüfen.
- [ ] Rollen- und Zugriffsänderungen während einer Sitzung prüfen.
- [ ] Prüfen, dass Feature-Daten weiterhin erst beim Öffnen ihres App-Bereichs geladen werden.

#### Schritt 2: Cache-Verhalten der Builds prüfen

- [ ] Pur Master, Pur Office und Pur Mitarbeiter auf flüchtigen Firestore-Cache prüfen.
- [ ] Pur Filiale auf persistenten Cache, erneuten Start, Cache-Fallback und erzwungenes Neuladen prüfen.
- [ ] Abmeldung und anschließende Anmeldung eines anderen Benutzers auf sichere Datentrennung prüfen.
- [ ] Sicherstellen, dass durch dieses Todo keine Offline-Schreibfunktion freigegeben wurde.

#### Tests und Abschluss

- [ ] `npm test` ohne Watch-Modus erfolgreich ausführen.
- [ ] `npm run build:master`, `npm run build:office`, `npm run build:filiale` und `npm run build:mitarbeiter` erfolgreich
      ausführen.
- [ ] Den vollständigen Ablauf mit den vier vorgesehenen Benutzerrollen manuell prüfen.
- [ ] `projekt-stand.md` auf den tatsächlich umgesetzten Stand aktualisieren.
- [ ] Abweichungen zwischen Umsetzung und `firestore-ladestrategie.md` bereinigen.
- [ ] Das vollständig abgeschlossene Haupttodo unter Erhalt aller Erledigt-Markierungen nach `todo_done.md` verschieben.

#### Erledigt, wenn

- [ ] Der Sitzungsstart ist für alle vier Rollen eindeutig, reproduzierbar und fehlerbehandelt.
- [ ] Rollenabhängiger Ladeumfang und buildabhängige Cache-Art entsprechen der dokumentierten Strategie.
- [ ] Automatisierte Tests, alle vier Produktionsbuilds und die manuelle Prüfung sind erfolgreich.
- [ ] Projektstand und Todo-Dokumentation entsprechen der tatsächlichen Umsetzung.
