<!-- pur-system/docs/matrix-cache-strategien.md -->

# Matrix: Cache-Strategien und Betriebsarten

Diese Übersicht trennt die technische Auslieferungsvariante von Benutzerrolle und Datenrechten. Eine Auslieferungsvariante
gewährt keine zusätzlichen Berechtigungen.

## 1. Cache- und Datenquellenmatrix

### Matrix

| Auslieferungsvariante | Cache-Art              | Benutzerprofil | Stammdaten    | Dienstpläne   | Wiederholung  |
| --------------------- | ---------------------- | -------------- | ------------- | ------------- | ------------- |
| Pur Master            | `memoryLocalCache`     | `networkOnly`  | `networkOnly` | `networkOnly` | `networkOnly` |
| Pur Office            | `memoryLocalCache`     | `networkOnly`  | `networkOnly` | `networkOnly` | `networkOnly` |
| Pur Filiale           | `persistentLocalCache` | `networkFirst` | `cacheFirst`  | `networkFirst` | `networkOnly` |
| Pur Mitarbeiter       | `memoryLocalCache`     | `networkOnly`  | `networkOnly` | `networkOnly` | `networkOnly` |
| Entwicklung           | `memoryLocalCache`     | `networkOnly`  | `networkOnly` | `networkOnly` | `networkOnly` |

### Zusatzbedingungen

- Die Cache-Art wird durch die Auslieferungsvariante und nicht durch die Benutzerrolle festgelegt.
- `cacheOnly` wird technisch unterstützt, ist derzeit aber keinem regulären Startablauf zugeordnet.
- Der persistente Cache gewährt keine zusätzlichen Berechtigungen.
- Offline-Schreibvorgänge und eine spätere Synchronisation sind nicht Bestandteil der Ladestrategie.

### Bedeutung der Lesestrategien

| Strategie      | Tatsächliches Verhalten                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `networkOnly`  | Liest ausschließlich vom Server und gibt dessen Ergebnis oder Fehler weiter.                                   |
| `cacheOnly`    | Liest ausschließlich aus dem Firestore-Cache und führt keine Serveranfrage aus.                                |
| `cacheFirst`   | Verwendet einen vorhandenen, nicht leeren Cache-Wert; andernfalls wird vom Server geladen.                      |
| `networkFirst` | Liest zuerst vom Server und fällt nur bei einem technischen Serverfehler auf den Firestore-Cache zurück.        |

Für `cacheFirst` gilt eine leere Collection oder Query beziehungsweise ein nicht vorhandenes Dokument als fehlender Cache-Wert.
In diesem Fall wird auch bei einem zuvor aufgebauten Cache eine Serveranfrage ausgeführt. Berechtigungs- und andere
nichttechnische Serverfehler lösen bei `networkFirst` keinen Cache-Rückfall aus.

## 2. Online- und Offline-Betriebsarten

### Matrix

| Merkmal                      | Pur Master                                | Pur Office                                | Pur Filiale                               | Pur Mitarbeiter                           |
| ---------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| Vorgesehene Verwendung       | Systemverwaltung                          | Büro                                      | Filialrechner                             | Mitarbeiter-Handy                         |
| Installation                 | als PWA vorgesehen                        | als PWA vorgesehen                        | als PWA vorgesehen und geprüft            | als PWA vorgesehen und geprüft            |
| Offline-App-Shell            | ja                                        | ja                                        | ja                                        | ja                                        |
| Fachliche Daten online       | ja, gemäß Benutzerprofil und Datenrechten | ja, gemäß Benutzerprofil und Datenrechten | ja, gemäß Benutzerprofil und Datenrechten | ja, gemäß Benutzerprofil und Datenrechten |
| Dauerhafte Offline-Fachdaten | nein                                      | nein                                      | vollständiger Filial-Lesebestand         | nein                                      |
| Offline-Änderungen           | vorerst nein                              | vorerst nein                              | vorerst nein                              | vorerst nein                              |

### Zusatzbedingungen

Der persistente Firestore-Lesecache ist ausschließlich für Pur Filiale umgesetzt. Er umfasst das bestätigte Benutzerprofil, die
durch den benutzerabhängigen Ladeplan angeforderten Stammdaten sowie nach Umsetzung der Dienstplanung sämtliche Mitarbeiter,
Dienstpläne, Versionen und Schichten der eigenen Filiale ohne zeitliche oder jährliche Begrenzung. Die anderen Varianten
verwenden einen flüchtigen Cache.

Pur Filiale lädt diesen vollständigen Filialbestand bei jedem Programmstart. Stammdaten verwenden weiterhin `cacheFirst`; der
gesamte Dienstplanbestand wird bei einem Online-Start zuerst vom Server gelesen und aktualisiert den IndexedDB-basierten
Firestore-Cache. Bei einem technischen Serverfehler wird auf die lokal vorhandenen Dienstplandaten zurückgefallen. Ein
Offline-Start kann nur den Stand anzeigen, der bei früheren erfolgreichen Ladevorgängen tatsächlich in IndexedDB gespeichert
wurde; der Cache bleibt deshalb eine lokale Kopie und keine verbindliche Datenquelle.

## 3. Bedeutung der Betriebsarten

- **Online-Fachdaten:** Die Anwendung lädt oder ändert Daten direkt über Firebase. Benutzerprofil, Backend und Firestore Rules
  prüfen die Berechtigung.
- **Dauerhafte Offline-Fachdaten:** Online geladene Fachdaten werden bewusst lokal gespeichert, damit sie bei einem späteren
  Start ohne Verbindung angezeigt werden können.
- **Offline-Änderungen:** Änderungen werden ohne Verbindung erfasst und nach der Wiederherstellung der Verbindung kontrolliert
  übertragen.
- **Offline-App-Shell:** Anwendungscode, Styles, Schriften und Icons können ohne Verbindung starten. Daraus folgt keine
  Verfügbarkeit fachlicher Daten.

## 4. Grundentscheidungen

- Pur-Filiale verwendet als einzige Variante einen persistenten Firestore-Lesecache.
- Pur Filiale lädt bei jedem Programmstart den vollständigen lesbaren Datenbestand der eigenen Filiale. Für Dienstpläne gilt
  dabei keine Jahresbegrenzung; Entwürfe, veröffentlichte und archivierte Versionen einschließlich aller Schichten werden
  geladen.
- Die Offline-App-Shell bleibt vom Firestore-Lesecache getrennt.
- Offline-Änderungen und eine spätere Synchronisation sind nicht vorgesehen.
- Benutzerrolle und Zugriffe bestimmen den fachlichen Datenraum unabhängig von der Auslieferungsvariante.
