<!-- pur-system/docs/firestore-ladestrategie.md -->

# Firestore-Ladestrategie

## Geltungsbereich

Diese Strategie beschreibt das Laden und Beobachten von Firestore-Daten für eine angemeldete Benutzersitzung. Schreibvorgänge
sowie das Anlegen, Aktualisieren und Löschen von Daten sind nicht Bestandteil dieser Strategie.

## Begriffe

- Stammdaten werden beim Sitzungsstart geladen und innerhalb der Sitzung gemeinsam verwendet.
- Feature-Daten werden erst beim Öffnen des jeweiligen App-Bereichs geladen.
- Zwingende Daten müssen erfolgreich geladen sein, bevor die Sitzung als initialisiert gilt.
- Optionale Daten dürfen fehlen, ohne die gesamte Sitzungsinitialisierung abzubrechen.

## 1. BenutzerStore: beobachtet Firebase Auth und Benutzerprofil

1. Der `BenutzerStore` startet die Beobachtung des Firebase-Auth-Zustands einmalig, sobald er durch den
   `AppInitialisierungService` initialisiert wird.
2. Ist kein Firebase-Benutzer angemeldet, werden Profilbeobachtung und Benutzerzustand zurückgesetzt.
3. Ist ein Benutzer angemeldet, wird dessen Profil aus benutzerprofil/{uid} geladen.
4. Das Profil wird anschließend während der gesamten Sitzung in Echtzeit beobachtet.
5. Bei Profiländerungen aktualisiert der Store userRole, aktiv, erlaubteBereiche und zugriffe.
6. Bei Abmeldung oder Benutzerwechsel wird der bisherige Profil-Listener beendet.

## 2. AppInitialisierungService: koordiniert den Sitzungsstart

1. Beim App-Start wird der Service einmalig gestartet.
2. Der Service initialisiert den `BenutzerStore` und beobachtet dessen Authentifizierungs- und Profilzustand.
3. Der öffentliche Initialisierungsstatus verwendet die Zustände `idle`, `loading`, `ready` und `error`.
   - `idle`: Es ist kein Firebase-Benutzer angemeldet oder die Initialisierung wurde noch nicht gestartet.
   - `loading`: Benutzerprofil oder zwingende Stammdaten werden geladen.
   - `ready`: Die Sitzung ist vollständig initialisiert.
   - `error`: Ein zwingender Ladevorgang ist fehlgeschlagen; der konkrete Fehler wird zusätzlich bereitgestellt.
4. Ist kein aktives Benutzerprofil vorhanden, werden keine Stammdaten geladen.
5. Ist ein aktives Benutzerprofil vorhanden, wechselt der Status zu `loading` und der Service übergibt das Profil an den
   `StammdatenLadeservice`.
6. Der Service wartet, bis alle für den Benutzer zwingend benötigten Stammdaten geladen sind.
7. Nach erfolgreichem Laden wechselt der Status zu `ready`.
8. Schlägt ein zwingender Ladevorgang fehl, wechselt der Status zu `error`.
9. Ändern sich `userRole` oder `zugriffe`, wird die Initialisierung mit dem neuen Benutzerprofil erneut durchgeführt.

## 3. StammdatenLadeservice: bestimmt den benutzerabhängigen Ladeumfang

1. Der Service erhält das aktive Benutzerprofil vom `AppInitialisierungService`.
2. Anhand von `userRole` und `zugriffe` bestimmt er, welche Stammdaten geladen werden.
3. Ein `master` lädt alle Unternehmer, Firmen und Filialen, alle Benutzerprofile sowie alle Mitarbeiter
   aller Firmen.
4. Ein `office` lädt die zugeordneten Unternehmer, Firmen und Filialen sowie alle Mitarbeiter der
   zugeordneten Firmen.
5. Eine `filiale` lädt den zugeordneten Unternehmer, die zugeordnete Firma und die zugeordnete Filiale.
   Zusätzlich lädt sie alle Mitarbeiter der Firma, deren `filialIds` die eigene Filial-ID enthält.
6. Ein `mitarbeiter` lädt alle Mitarbeiter der im Benutzerprofil zugeordneten Firma.
7. Der Service beauftragt die zuständigen fachlichen Stores und Services mit dem Laden der jeweiligen Daten.
8. Feature-Daten, die für den Sitzungsstart nicht benötigt werden, werden nicht durch den `StammdatenLadeservice` geladen.
9. Der Service meldet Abschluss oder Fehler an den `AppInitialisierungService` zurück.

## 4. Fachliche Stores und Services: laden und halten konkrete Daten

1. Der `StammdatenLadeservice` ruft die benötigten Lademethoden der fachlichen Stores auf.
2. Der jeweilige Store setzt seinen Ladezustand und übergibt den benötigten Datenkontext an den fachlichen Service.
3. Der fachliche Service lädt die angeforderten Dokumente oder Collections über den `FirestoreDbService`.
4. Geladene Firestore-Dokumente werden im fachlichen Service geprüft, in Domänenmodelle abgebildet und sortiert.
5. Der Store übernimmt die geladenen Daten und markiert den Ladevorgang als abgeschlossen.
6. Bei einem Fehler speichert der Store den Fehlerzustand und kennzeichnet die Daten nicht als vollständig geladen.
7. Bereits vollständig geladene Daten desselben Benutzer- und Fachkontexts werden nicht erneut geladen.
8. Ergebnisse veralteter Ladeaufträge werden nach einem Benutzer- oder Kontextwechsel nicht in den Store übernommen.

## 5. Guards und App-Shell: steuern Navigation und zeigen Fehlerzustände

1. Guards verwenden den Authentifizierungs-, Profil- und Initialisierungszustand der zuständigen Stores und Services.
2. Ohne angemeldeten Firebase-Benutzer leiten geschützte Routen zur Anmeldung weiter.
3. Ein fehlendes oder inaktives Benutzerprofil verhindert den Aufruf geschützter Fachbereiche.
4. Bereichs- und Rollenguards prüfen `erlaubteBereiche` und `userRole` für die angeforderte Route.
5. Solange zwingende Stammdaten geladen werden, wartet die geschützte Navigation auf den Abschluss der Initialisierung.
6. Schlägt die Sitzungsinitialisierung fehl, leitet der Guard auf `/initialisierungsfehler` weiter.
7. Die Fehlerseite liegt innerhalb der App-Shell und ermöglicht eine Wiederholung der Initialisierung oder die Abmeldung.
   Nach einer erfolgreichen Wiederholung wird die ursprünglich angeforderte Route geöffnet.
8. Die Fehlerroute setzt nur eine Firebase-Anmeldung voraus und wird nicht durch den Initialisierungszustand geschützt.
9. Die App-Shell zeigt laufende Ladevorgänge über den globalen Ladeindikator an.
10. Guards und App-Shell führen keine eigenen fachlichen Firestore-Abfragen aus.

## 6. FirestoreDbService: führt technische Firestore-Abfragen aus

1. Der `FirestoreDbService` erhält vollständige Dokument- oder Collection-Pfade von den fachlichen Services.
2. Er führt Dokument-, Collection- und Query-Abfragen über AngularFire aus.
3. Für Echtzeitdaten stellt er eine technische Dokumentbeobachtung mit Rückruffunktionen bereit.
4. Identische gleichzeitig angeforderte Lesevorgänge verwenden denselben laufenden Leseauftrag.
5. Jeder Lesevorgang wird beim globalen `LoadingService` registriert.
6. Der Service gibt Dokument-IDs und unveränderte Firestore-Daten an den aufrufenden fachlichen Service zurück.
7. Firestore-Fehler werden unverändert an die aufrufende Stelle weitergegeben.
8. Der Service kennt weder Benutzerrollen noch fachliche Berechtigungen oder App-Bereiche.

## 7. Cache- und Datenquellenstrategie

Die Art des lokalen Firestore-Caches wird beim App-Start durch die Auslieferungsvariante festgelegt und nicht erst anhand des
geladenen Benutzerprofils ausgewählt.

| Auslieferungsvariante | Cache-Art              |
| --------------------- | ---------------------- |
| Pur Master            | `memoryLocalCache`     |
| Pur Office            | `memoryLocalCache`     |
| Pur Filiale           | `persistentLocalCache` |
| Pur Mitarbeiter       | `memoryLocalCache`     |
| Entwicklung           | `memoryLocalCache`     |

Der `FirestoreDbService` unterstützt folgende Lesestrategien:

| Strategie      | Verhalten                                |
| -------------- | ---------------------------------------- |
| `cacheFirst`   | Zuerst Cache, bei fehlenden Daten Server |
| `networkOnly`  | Ausschließlich Server                    |
| `networkFirst` | Zuerst Server, bei einem Fehler Cache    |
| `cacheOnly`    | Ausschließlich Cache                     |

Für Pur Filiale wird das Benutzerprofil mit `networkFirst` und werden die Stammdaten mit `cacheFirst` geladen. Erzwungene
Neuladevorgänge verwenden `networkOnly`. Die übrigen Auslieferungsvarianten laden ihre Daten mit `networkOnly`. `cacheOnly` wird
nur für ausdrücklich festgelegte Offline-Abläufe verwendet.
