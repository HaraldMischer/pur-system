<!-- pur-system/docs/pwa-betriebsarten.md -->

# Auslieferungs- und Betriebsartenmatrix

Diese Übersicht trennt die technische Auslieferungsvariante von der Benutzerrolle und den fachlichen Datenrechten. Pur Master,
Pur Office, Pur Filiale und Pur Mitarbeiter sind getrennte Auslieferungsvarianten. Master, Office, Filiale und Mitarbeiter sind
Benutzerrollen.

Die verwendete Auslieferungsvariante gewährt keine zusätzlichen Berechtigungen. Maßgeblich bleiben Benutzerprofil,
`erlaubteBereiche`, Datenzuordnungen, Backend und Firestore Rules. Adressen, Builds, Ports, Hosting und Service-Worker-Ressourcen
stehen ausschließlich in den [PWA-Konfigurationen](./pwa-konfigurationen.md).

## Aktueller Stand

| Merkmal                      | Pur Master                                | Pur Office                                | Pur Filiale                               | Pur Mitarbeiter                           |
| ---------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| Vorgesehene Verwendung       | Systemverwaltung                          | Büro                                      | Filialrechner                             | Mitarbeiter-Handy                         |
| Installation                 | als PWA vorgesehen                        | als PWA vorgesehen                        | als PWA vorgesehen und geprüft            | als PWA vorgesehen und geprüft            |
| Offline-App-Shell            | ja                                        | ja                                        | ja                                        | ja                                        |
| Fachliche Daten online       | ja, gemäß Benutzerprofil und Datenrechten | ja, gemäß Benutzerprofil und Datenrechten | ja, gemäß Benutzerprofil und Datenrechten | ja, gemäß Benutzerprofil und Datenrechten |
| Dauerhafte Offline-Fachdaten | vorerst nein                              | vorerst nein                              | vorerst nein                              | vorerst nein                              |
| Offline-Änderungen           | vorerst nein                              | vorerst nein                              | vorerst nein                              | vorerst nein                              |

Die dauerhafte lokale Firestore-Datenhaltung ist noch nicht umgesetzt. Die geplante Einführung wird im offenen Umsetzungstodo
zur benutzerabhängigen Firestore-Ladestrategie geführt.

## Geplante Lesestrategie

| Merkmal                       | Pur Master        | Pur Office        | Pur Filiale           | Pur Mitarbeiter   |
| ----------------------------- | ----------------- | ----------------- | --------------------- | ----------------- |
| Firestore-Cache               | flüchtig          | flüchtig          | persistent            | flüchtig          |
| Benutzerprofil                | `networkOnly`     | `networkOnly`     | `networkFirst`        | `networkOnly`     |
| Stammdaten                    | `networkOnly`     | `networkOnly`     | `cacheFirst`          | `networkOnly`     |
| Erzwungener Neuladevorgang    | `networkOnly`     | `networkOnly`     | `networkOnly`         | `networkOnly`     |
| Allgemeiner Offline-Lesezugriff | nicht vorgesehen | nicht vorgesehen | ausdrücklich begrenzt | nicht vorgesehen |

Die Auslieferungsvariante legt die Cache-Art beim App-Start fest. Benutzerrolle und `zugriffe` bestimmen weiterhin nur, welche
Daten geladen werden dürfen. Ein persistenter Cache gewährt keine zusätzlichen Berechtigungen und ist keine Alternative zu den
Firestore Rules.

## Bedeutung der Betriebsarten

- **Online-Fachdaten:** Die Anwendung lädt oder ändert Daten direkt über Firebase. Benutzerprofil, Backend und Firestore Rules
  prüfen die Berechtigung.
- **Dauerhafte Offline-Fachdaten:** Online geladene Fachdaten werden bewusst lokal gespeichert, damit sie bei einem späteren Start
  ohne Verbindung angezeigt werden können.
- **Offline-Änderungen:** Änderungen werden ohne Verbindung erfasst und nach der Wiederherstellung der Verbindung kontrolliert
  übertragen.
- **Offline-App-Shell:** Anwendungscode, Styles, Schriften und Icons können ohne Verbindung starten. Daraus folgt keine
  Verfügbarkeit fachlicher Daten.

## Grundentscheidung

Der aktuelle Stand bleibt bis zur Umsetzung vollständig online. Ziel ist ein persistenter Lesecache ausschließlich für Pur
Filiale. Die übrigen Auslieferungsvarianten verwenden weiterhin nur einen flüchtigen Cache und laden fachliche Daten vom Server.

Die Offline-App-Shell aller vier PWAs bleibt davon getrennt. Auch der geplante persistente Lesecache für Pur Filiale umfasst nur
ausdrücklich festgelegte Profildaten und Stammdaten. Offline-Änderungen und eine spätere Synchronisation sind weiterhin nicht
vorgesehen.

Weitere technische Einzelheiten stehen in den [PWA-Konfigurationen](./pwa-konfigurationen.md). Die geplante Datenquellensteuerung
steht in der [Firestore-Ladestrategie](./firestore-ladestrategie.md); Offline-Schreibvorgänge bleiben in den
[späteren Todos](./todo_spaeter.md) zurückgestellt.
