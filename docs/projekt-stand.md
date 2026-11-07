<!-- pur-system/docs/projekt-stand.md -->

# Projekt-Stand: Pur-System

Stand: 03.11.2026. Dieses Dokument fasst den aktuell umgesetzten, geprüften und veröffentlichten Stand zusammen. Das
langfristige Zielbild steht im [Projektplan](./projekt-plan.md), fachliche und technische Details in den dort verlinkten
Hauptquellen.

## Projektbasis und Auslieferungsvarianten

- Pur-System ist eine Angular-Anwendung mit Standalone Components, Angular Material, SCSS, Vitest und Prettier.
- Die vier Produktionsvarianten Pur Master, Pur Office, Pur Filiale und Pur Mitarbeiter besitzen getrennte Builds,
  Hosting-Ziele, Manifeste, Produktkennungen und Icon-Sätze.
- Alle Varianten sind als installierbare PWAs mit Angular Service Worker konfiguriert. Master, Office, Filiale und Mitarbeiter
  wurden erstmals am 26.09.2026 auf ihre jeweiligen Firebase-Hosting-Sites veröffentlicht.
- Die Anwendungsversion wird zentral gepflegt und in der Sidebar angezeigt. Der dokumentierte Stand ist `1.0.0`.
- Build-, Hosting- und Service-Worker-Konfigurationen stehen in der
  [PWA-Konfigurationsmatrix](./matrizen/pwa-konfigurationen.md).

## App-Shell, Navigation und Arbeitskontext

- Die App-Shell besteht aus Toolbar, Sidebar und einem globalen Bannerbereich. Login und Initialisierungsfehler verwenden
  reduzierte beziehungsweise fachlich begrenzte Varianten.
- Navigationen sind je Auth-Rolle zentral als `flat` oder `nested` konfiguriert. `erlaubteBereiche` filtert die sichtbaren und
  erreichbaren Bereiche, verändert aber keine Datenrechte.
- Die Hauptbereiche Dashboard, Schichtplan, Mitarbeiter, Einstellungen und System sind als direkt routbare Pages oder
  komponentenlose Elternrouten umgesetzt. Der Systembereich bleibt aktiven Mastern vorbehalten.
- Auth-, Bereichs- und Rollenguards steuern die clientseitige Navigation. Firestore Rules und geschützte Functions setzen die
  verbindlichen Datenrechte unabhängig davon durch.
- Der globale Arbeitskontext aus Unternehmer, Firma und konkreten Filialen wird zentral gehalten. Abhängige Auswahlen werden
  zurückgesetzt, eindeutige Werte automatisch übernommen und mehrere erlaubte Filialen als echte Mehrfachauswahl dargestellt.
- Sichtbarkeit und Bedienbarkeit der Kontextselektoren richten sich nach Rolle und App-Bereich. Die verbindliche Konfiguration
  steht in der [Kontextselektor-Matrix](./matrizen/kontextselektor.md).
- Toolbar und App-Shell stellen Theme, Farbschema, Routentitel, globale Hinweise, Netzwerkstatus, Updatehinweise und zentral
  registrierte Aktivität dar.

## Anmeldung, Profile und Berechtigungen

- Firebase Authentication stellt die Identität bereit; das Profil unter `benutzerprofil/{uid}` enthält Rolle, Aktivstatus,
  App-Bereiche und Datenzuordnung.
- Das Login verwendet je Produktionsvariante das passende Rollensuffix. Der technische Anmeldename folgt dem vereinbarten
  Format und wird intern mit `@pur-system.invalid` als Firebase-Adresse verwendet.
- Eine öffentliche Selbstregistrierung gibt es nicht. Ein aktiver Master legt Benutzer über eine geschützte Callable Function
  mit Anfangspasswort an. Auth-Konten werden erst nach erfolgreicher Profilspeicherung aktiviert.
- Benutzerprofile können durch Master bearbeitet, neu zugeordnet und – mit Ausnahme von Masterkonten – über geschützte
  Functions gelöscht werden. Sicherheitskritische Zuordnungen werden nicht über allgemeine Clientupdates verändert.
- Angemeldete Benutzer können ihr Passwort nach erneuter Authentifizierung über die eigenständige Passwortseite ändern.
- Das eigene Profil wird während der Sitzung beobachtet. Deaktivierung setzt fachliche Sitzungsdaten zurück und zeigt einen
  nicht ausblendbaren Hinweis; sie meldet das Konto nicht automatisch ab.
- Die Rollen `master`, `office`, `filiale` und `mitarbeiter` sowie die Benutzer-Mitarbeiter-Verknüpfung sind vollständig im
  Profilmodell, in Functions, Stores, UI und Rules abgebildet.
- Die stabile Struktur steht in den [Systemgrundlagen](./system-grundlagen.md). Verbindliche Pfad- und CRUD-Rechte stehen in der
  [Berechtigungsmatrix](./matrizen/berechtigungen.md).

## Sitzungsinitialisierung, Datenladen und Cache

- `AppSitzungsInitService` koordiniert Authentifizierung, Profilbeobachtung, zwingende Stammdatenladung, Wiederholung und
  Fehlerzustand.
- `AppDatenInitService` bildet aus Rolle, Zugriffszuordnung und persönlicher Mitarbeiterverknüpfung den Ladeplan. Fachliche
  Stores und Services laden und halten die Daten.
- Master lädt die vollständige Unternehmenshierarchie, Profile und Mitarbeiter. Office und Filiale laden nur ihren erlaubten
  Bereich. Mitarbeiter lädt die eigene Firma, den verknüpften Mitarbeiter und die aus dessen `filialIds` abgeleiteten Filialen.
- Abmeldung, Benutzerwechsel und relevante Profiländerungen verwerfen den bisherigen Sitzungskontext. Verspätete Ergebnisse
  werden nicht in einen neuen Kontext übernommen.
- Pur Filiale verwendet persistenten Firestore-Cache, Profilstrategie `networkFirst` und Stammdatenstrategie `cacheFirst`.
  Master, Office, Mitarbeiter und Entwicklungsumgebung arbeiten mit flüchtigem Cache und `networkOnly`.
- Offline-Schreibvorgänge und spätere Synchronisation sind nicht umgesetzt. Verbindliche Strategien und Ladeumfänge stehen in
  der [Cache-Matrix](./matrizen/cache-strategien.md) und [Datenladematrix](./matrizen/datenladen.md).

## Struktur- und Benutzerverwaltung

- Der Systembereich enthält getrennte Pages für Strukturanlage, Strukturverwaltung, Benutzeranlage, Benutzerverwaltung und
  Datenmigration.
- Master können Unternehmer, Firmen und Filialen anlegen sowie Firmen- und Filialstammdaten bearbeiten. Office, Filiale und
  Mitarbeiter lesen diese Stammdaten nur im erlaubten Bereich.
- Die rekursive Löschung eines Strukturzweigs ist über Service, Store und eine geschützte Function umgesetzt. Vorhandene
  Benutzer- oder Mitarbeiterreferenzen verhindern das Löschen. Eine sichtbare Löschaktion ist noch nicht angebunden.
- Benutzeranlage und -bearbeitung validieren Rolle, Bereiche und vollständige Datenzuordnung. Filialkonten bleiben auf genau
  einen Unternehmer, eine Firma und eine Filiale begrenzt; Master benötigen keine Zuordnung.
- Profildaten, Datenzuordnung und Kontolöschung verwenden getrennte Aktionen und Dialoge. Schreibvorgänge sperren den gesamten
  betroffenen Formular- und Aktionskontext.

## Datenmigration

- Die einmalige Migration übernimmt einen ausgewählten Legacy-Kunden in der Reihenfolge Unternehmer, Firmen, Filialen und
  Mitarbeiter.
- Dauerhafte Quell-Ziel-Zuordnungen unter `systemMigrationen` machen die Migration wiederholbar. Bereits vorhandene Ziel-IDs
  werden erneut verwendet; manuell ergänzte Zieldaten bleiben erhalten.
- Mitarbeiter aus mehreren Legacy-Filialen bleiben zunächst getrennt und können anschließend kontrolliert zusammengeführt
  werden. Wiederholungen überschreiben einen manuell zusammengeführten Zielmitarbeiter nicht.
- Validierungs- und technische Fehler, Quellen-, Ziel- und Restzahlen sowie der Bereichsstatus werden nachvollziehbar
  gespeichert und in der Migrationsseite angezeigt.
- Am 04.10.2026 wurde eine vollständige Kundenmigration mit realen Daten einschließlich 15 Legacy-Mitarbeitern erfolgreich
  ausgeführt, verglichen und wiederholt.
- Die vollständigen Transformations- und Wiederholungsregeln stehen in der
  [Datenmigrationsmatrix](./matrizen/datenmigration.md).

## Fachliche Mitarbeiter und persönliche Zugänge

- Mitarbeiter werden firmenbezogen mit Stammdaten, Aktivstatus, mindestens einer betrieblichen Rolle und mindestens einer
  Filialzuordnung verwaltet.
- Master, Office und Filiale besitzen die laut Berechtigungsmatrix erlaubten Lese-, Anlage- und Aktualisierungsrechte.
  Filialkonten begrenzen ihre tatsächliche Abfrage und Bearbeitung auf die eigene Filiale.
- Mitarbeiter können angelegt, bearbeitet, deaktiviert, reaktiviert und durch Master kontrolliert zusammengeführt werden. Eine
  eigenständige Löschaktion wird nicht angeboten.
- Verknüpfte Mitarbeiter sind vor Zusammenführung und Löschung geschützt. `benutzerUid` und `firmaMitarbeiterId` bilden die
  serverseitig atomar gepflegte Gegenreferenz zu einem persönlichen Mitarbeiterzugang.
- Mitarbeiterzugänge erhalten ihre App-Bereiche durch Master und lesen die zugeordnete Firmenstruktur sowie veröffentlichte
  Dienstpläne ihrer fachlichen `filialIds`. Sie besitzen keine fachlichen Mitarbeiter-Schreibrechte.
- Die betriebliche Rolle `dienstplaner` ist im Mitarbeiterdatenmodell und in der Verwaltung enthalten. Der dafür benötigte
  betriebliche Sitzungszustand der Filial-App ist noch nicht umgesetzt; Filialkonten bleiben in der Planungsoberfläche lesend.
- Mitarbeiterlisten, Cards, Anlage-, Bearbeitungs- und Zusammenführungsdialoge sowie filialbezogene Filterung sind umgesetzt.

## Filialeinstellungen und Öffnungszeiten

- Einstellungen werden je Filiale unter `einstellung` gespeichert. Das Dokument `allgemein` enthält das Bundesland; das
  Dokument `oeffnungszeiten` enthält Standardöffnung und Wochentagsmodi.
- Neue Einstellungen verwenden `06:00–01:00 Uhr` als Standardöffnungszeit und setzen alle sieben Wochentage auf `standard`.
  Wochentage können `standard`, `abweichend` oder `geschlossen` sein.
- Eine abweichende Wochenöffnungszeit wird über eine Stiftaktion in einem eigenen Dialog bearbeitet und erst mit dem
  Hauptformular gespeichert. Die Wochentagszeile bricht ihren Öffnungszeitbereich bei höchstens `500px` gemeinsam um.
- Gesetzliche Feiertage, Heiligabend, Silvester, Volkstrauertag, Totensonntag und benutzerdefinierte jährliche Sondertage sind
  modelliert. Volkstrauertag und Totensonntag werden für Nordrhein-Westfalen jährlich relativ zum ersten Advent berechnet und
  mit `13:00–01:00 Uhr` beziehungsweise `18:00–01:00 Uhr` vorbelegt. Feiertagskatalog und Datumsauflösung arbeiten ohne externe
  Laufzeitabhängigkeit.
- Neue NRW-Einstellungen initialisieren gesetzliche Feiertage grundsätzlich mit `Wie Sonntag`, Karfreitag geschlossen und
  Allerheiligen mit `18:00–01:00 Uhr`. Heiligabend und Silvester verwenden den Standardbeginn bis `16:00 Uhr`; vorhandene
  individuelle Einstellungen bleiben beim Abgleich erhalten.
- Die Auflösung verwendet
  `benutzerdefinierter jährlicher Sondertag → systemdefinierter Sondertag → wirksame Wochenöffnung`. Kollisionen derselben
  Herkunft und ungültige Zeitfolgen werden vor dem Speichern beziehungsweise der
  Monatsplananlage fachlich validiert.
- Ein zusätzlicher Schließzeitraum und die Kompatibilitätsbehandlung alter Öffnungszeitendokumente sind vollständig entfernt.
- Service und Store laden, validieren und speichern vollständige Filialbestände. Rohdaten, validierter Bestand sowie Lade-,
  Schreib- und Fehlerzustände bleiben je Filiale getrennt.
- Oberfläche und technische Verantwortlichkeiten stehen in
  [Einstellungen](./architektur/components/einstellungen.md) und den zugehörigen Service- und Store-Dokumenten. Das fachliche
  Zielbild steht in der [Öffnungszeiten-Matrix](./matrizen/oeffnungszeiten.md).

## Dienst- und Schichtplanung

- Die versionierte, filialbezogene Monatsplanung mit Entwurf, Veröffentlichung und Archivierung ist umgesetzt.
- Schicht-Rastermodell und Schicht-Tagesmodell sind als getrennte Planungsarten mit den Werten `schichtrastermodell` und
  `schichttagesmodell` modelliert. Der alte Rasterwert `schichtraster` wird ausschließlich beim Lesen historischer Daten
  normalisiert; `schichtbausteine` ist aus dem Anwendungscode entfernt.
- Beide Planungsarten besitzen getrennte Modell-, Vorlagen- und Momentaufnahmepfade. Der vorhandene Rasterablauf bleibt
  fachlich erhalten; das Tagesmodell besitzt unabhängige Wochentags- und Sonntagsvorlagen.
- In jeder Tagesmodellvorlage werden der Beginn der ersten und das Ende der letzten Schicht aus der wirksamen Tagesöffnung
  abgeleitet. Nur die erste Schicht besitzt Vorbereitungsminuten und nur die letzte Nachbereitungsminuten; beim Hinzufügen oder
  Entfernen einer äußeren Schicht werden diese Randminuten entsprechend übertragen.
- Das Schicht-Tagesmodell erzeugt beim initialen Monatsaufbau eine eigene Schichtstruktur je Kalendertag. Geöffnete Feier- und
  Sondertage werden vor dem atomaren Schreiben frei konfiguriert, geschlossene Tage bleiben ohne Tagesschichten.
- Die vollständige Unit-Test-Suite mit 143 Testdateien und 1.051 Tests sowie `npm run build:master` wurden am 06.11.2026 als
  Zwischenstand erfolgreich ausgeführt. Nach der anschließenden Änderung der Datumsanzeige stehen die erneute gezielte
  Unit-Prüfung sowie Rules-Tests, weitere App-Builds und die vollständige manuelle Prüfung von Todo 26 noch aus.
- Beim Anlegen eines Monatsplans werden Schichtmodell, Planungsart, Kalendertage und wirksame Öffnungen als unveränderliche
  Momentaufnahme gespeichert. Rasterpläne ergänzen tagesabhängige Rasterzeiten; Tagesmodellpläne speichern stattdessen
  konkrete datumsgebundene Tagesschichten.
- Die erste und letzte Rastergrenze folgen der Tagesöffnung einschließlich Vor- und Nachbereitung. Innere Übergänge bleiben
  Modellbestandteil; bestätigte Lücken und Überlappungen sind möglich. Geschlossene oder zu kurze Tage bleiben unbelegbar.
- Mitarbeiter können per Drag-and-drop eingeplant, verschoben und entfernt werden. Mehrfachbelegung, Pausen und
  filialübergreifende Zeitkonflikte werden fachlich geprüft.
- Die Monatsdarstellung des Tagesmodells ordnet konkrete Tagesschichten minutengenau auf einer gemeinsamen Zeitachse an.
  Geschlossene Außenbereiche werden als eigene Karten dargestellt, offene Lücken bleiben frei und zeitliche Überschneidungen
  verwenden getrennte Spuren. Tagesköpfe zeigen gesetzliche Feiertage und aktive Sondertage mit ihrer Bezeichnung.
- Der firmenweite Belegungsindex wird live angezeigt und vor jedem Schreibzugriff innerhalb einer Firestore-Transaktion erneut
  geprüft. Veraltete Revisionen und parallele Konflikte brechen den Vorgang nachvollziehbar ab.
- Ein leerer Erstentwurf kann gelöscht und neu angelegt werden. Veröffentlichungen archivieren einen vorherigen Stand und
  halten Belegungsindex und Versionen konsistent.
- Die veröffentlichte Mitarbeiteransicht ist als lesende Grundlage vorhanden. Ihre abschließende fachliche Ausgestaltung bleibt
  im offenen Todo 29 geplant.
- Filialkonten bleiben bis zur Umsetzung des betrieblichen `dienstplaner`-Sitzungszustands in der Oberfläche rein lesend.
  Mitarbeiterzugänge lesen ausschließlich veröffentlichte Stände ihrer zugeordneten Filialen.
- Das vollständige Zielbild steht im
  [Fachkonzept Dienst- und Schichtplanung](./fachkonzepte/dienst-und-schichtplanung.md). Technische Details stehen in den
  [Schichtplan-Components](./architektur/components/schichtplan.md) sowie den zugehörigen Service- und Store-Dokumenten.

## Netzwerk, Updates und PWA-Betrieb

- Ein zentraler Netzwerkstatus prüft Erreichbarkeit und stellt Offline- sowie Wieder-online-Zustände in der App-Shell dar.
- Onlinepflichtige Aktionen werden vor dem technischen Zugriff verständlich abgewiesen, wenn keine Verbindung besteht.
- Der Angular Service Worker erkennt neue Anwendungsversionen und bietet eine kontrollierte Aktualisierung an.
- HTML und SPA-Routen werden ohne langfristigen Browsercache ausgeliefert; gehashte Ressourcen dürfen dauerhaft gecacht werden.
- Pur Filiale wurde mit persistentem Cache und Offline-Neustart geprüft. Die App-Shell aller vier Varianten ist offlinefähig;
  fachliche Offline-Schreibvorgänge bleiben ausgeschlossen.

## Rules, Functions und Deployment

- Firestore Rules verwenden die Berechtigungsmatrix als verbindliche Quelle. Sie prüfen aktives Profil, Rolle, hierarchischen
  Zugriff, Pfad und CRUD-Recht sowie ausschließlich die ausdrücklich dokumentierten sicherheitskritischen Ausnahmen.
- Benutzerprofile sind clientseitig nur lesbar. Kontoanlage, Profiländerungen, Datenneuzuordnung, Kontolöschung und rekursive
  Strukturlöschung laufen über geschützte Functions.
- Aktive Master besitzen die in der Matrix aufgeführten Rechte. Office und Filiale bleiben auf ihre zugeordneten Datenbereiche
  begrenzt; Mitarbeiterzugänge besitzen ausschließlich die vorgesehenen Leserechte.
- Legacy-Konten ohne Pur-System-Profil behalten ausschließlich den dokumentierten Zugriff auf `purCustomers` und `purUser`.
- Die Rules für Rollen, Zugriffs-Map, Mitarbeiterzugänge, Filialeinstellungen und die aktuelle Unternehmensstruktur sind laut
  Benutzer produktiv veröffentlicht. Die zugehörigen Functions einschließlich sicherer Kontoaktivierung sind deployed.
- Das Hosting der vier PWA-Grundstände ist veröffentlicht. Ein Hosting-Deployment der zuletzt lokal angepassten
  Einstellungsoberfläche wurde für diesen Stand nicht bestätigt.
- Ein Git-Push führt kein Firebase-Deployment aus. Hosting, Rules und Functions werden getrennt und kontrolliert veröffentlicht.

## Bestätigter Prüfstand

Am 03.11.2026 wurden folgende aktuelle Prüfungen vom Benutzer bestätigt:

- `npm run build:office` erfolgreich
- `npm run test:rules` mit 63 von 63 Firestore-Emulator-Tests erfolgreich

Der umfassende, ausdrücklich auf den 23.10.2026 datierte Prüfstand umfasst:

- 1046 von 1046 Frontend-Tests
- 88 Functions-Tests
- 63 Firestore-Emulator-Tests
- erfolgreiche Produktionsbuilds für Master, Office, Filiale und Mitarbeiter
- manuelle Rollen-, Navigations-, Formular-, Cache-, PWA- und reale Kontoprüfungen

Dieser umfassende Prüfstand ist ein datierter Nachweis und keine Behauptung, dass nachfolgende Änderungen erneut mit der
vollständigen Suite geprüft wurden. Aktuelle Einzelprüfungen werden deshalb getrennt darüber dokumentiert.

## Offene Arbeit und Historie

- Konkrete nächste Arbeit steht in den [offenen Todos](./todo_naechste.md).
- Bewusst zurückgestellte Arbeit steht in den [späteren Todos](./todo_spaeter.md).
- Abgeschlossene Umsetzungsschritte und abgelöste Zwischenstände bleiben in den
  [erledigten Todos](./todo_erledigt.md) erhalten.
