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

## Bedeutung der Betriebsarten

- **Online-Fachdaten:** Die Anwendung lädt oder ändert Daten direkt über Firebase. Benutzerprofil, Backend und Firestore Rules
  prüfen die Berechtigung.
- **Dauerhafte Offline-Fachdaten:** Online geladene Fachdaten werden bewusst lokal gespeichert, damit sie bei einem späteren Start
  ohne Verbindung angezeigt werden können.
- **Offline-Änderungen:** Änderungen werden ohne Verbindung erfasst und nach der Wiederherstellung der Verbindung kontrolliert
  übertragen.
- **Offline-App-Shell:** Anwendungscode, Styles, Schriften und Icons können ohne Verbindung starten. Daraus folgt keine
  Verfügbarkeit fachlicher Daten.

## Derzeitige Grundentscheidung

Fachliche Daten werden in Pur Master, Pur Office, Pur Filiale und Pur Mitarbeiter vorerst ausschließlich online verwendet. Eine
dauerhafte Speicherung fachlicher Daten, Offline-Änderungen und eine spätere Synchronisation sind zunächst in keiner
Auslieferungsvariante vorgesehen.

Die Offline-App-Shell aller vier PWAs bleibt davon getrennt: Die Anwendung kann ohne Verbindung starten, für Anmeldung und
fachliche Datenzugriffe wird jedoch eine Internetverbindung benötigt.

Eine spätere Offline-Freigabe wird erst bei einem konkreten fachlichen Bedarf je Datenart, Benutzerrolle, Auslieferungsvariante
und Aktion entschieden. Weitere technische Einzelheiten stehen in den [PWA-Konfigurationen](./pwa-konfigurationen.md); die
zurückgestellte fachliche Entscheidung steht in den [späteren Todos](./todo_spaeter.md).
