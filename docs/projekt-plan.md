<!-- pur-system/docs/projekt-plan.md -->

# Projekt-Plan: Pur-System

## Produktidee

Pur-System ist eine Angular-Anwendung zur Darstellung und Bearbeitung von Organisationsdaten sowie zur kontrollierten
Verwaltung von Benutzerzugängen. Es wird als vier getrennte Progressive Web Apps für Master, Office, Filiale und Mitarbeiter
bereitgestellt.

## Zielrichtung

- Fachliche App-Bereiche lesen Daten aus Firestore und schreiben ausschließlich ausdrücklich freigegebene Daten.
- Der Systembereich bündelt administrative Vorgänge des Masters. Sicherheitskritische Auth-Vorgänge laufen über geschützte
  Firebase Cloud Functions.
- Fachliche Bereiche, UI, Zustand und Datenzugriff bleiben klar getrennt.
- Sichtbare Funktionen und verbindliche Datenrechte werden unabhängig voneinander gesteuert.
- Alle vier Auslieferungsvarianten bleiben getrennt installierbar und rollenbezogen konfiguriert.

## Architektur

Firestore ist die fachliche Datenquelle. Direkte Clientzugriffe werden durch Firestore Rules abgesichert. Functions mit Firebase
Admin SDK prüfen ihre Sicherheitsgrenzen selbstständig, weil sie die Rules technisch umgehen. Fachliche Datenformen, Referenzen
und Zustandswechsel werden im TypeScript-Code und dessen Tests validiert.

Die Anwendung folgt diesen Schichten:

- Components und Pages verantworten Darstellung, Interaktion und Benutzerkommunikation.
- Stores halten App-State sowie Lade-, Schreib- und Fehlerzustände.
- Fachliche Services kapseln Domänen-Mapping und fachlich benannte Datenoperationen.
- Technische Core- und Firebase-Services kapseln gemeinsame Infrastruktur und unmittelbare Firebase-Zugriffe.
- Firestore-Pfade werden zentral erzeugt und nicht verteilt in fachlichen Services zusammengesetzt.

Der Sitzungsstart lädt zuerst Authentifizierung und Benutzerprofil und anschließend die für Rolle und Zuordnung benötigten
Stammdaten. Guards steuern die clientseitige Navigation; verbindliche Datenrechte bleiben unabhängig davon Aufgabe der Rules
und geschützten Functions. Bereits vollständig geladene Daten desselben Sitzungs- und Fachkontexts werden nicht unnötig erneut
geladen.

Die verbindlichen Verantwortlichkeiten und Ladeumfänge stehen in der
[Datenladematrix](./matrizen/datenladen.md). Konkrete Components, Stores und Services werden unter
[`docs/architektur`](./architektur) dokumentiert.

## PWA- und Offline-Zielbild

Pur-System wird in vier technischen Varianten ausgeliefert:

- **Pur Master:** zentrale System-, Struktur- und Benutzerverwaltung
- **Pur Office:** Arbeit in freigegebenen Firmen und Filialen
- **Pur Filiale:** Arbeit innerhalb einer eindeutig zugeordneten Filiale
- **Pur Mitarbeiter:** persönliche mobile Anwendung eines verknüpften Mitarbeiters

Jede Variante besitzt eine eigene Produktkennung, Hosting-Konfiguration und installierbare App-Shell. Das Login ergänzt den
eingegebenen Namensbestandteil um das zur Variante gehörende Rollensuffix. Die Auslieferungsvariante gewährt selbst keine
Datenrechte; maßgeblich bleibt das geladene Benutzerprofil.

Der Angular Service Worker stellt Anwendungscode und statische Ressourcen offline bereit. Pur Filiale darf ausdrücklich
freigegebene Lesedaten persistent zwischenspeichern. Lokal gespeicherte Daten sind keine Berechtigungsquelle. Schreibvorgänge
bleiben onlinepflichtig, solange kein konkreter Offline-Ablauf mit Synchronisation und Konfliktbehandlung freigegeben wurde.

Neue Anwendungsversionen werden kontrolliert erkannt und übernommen. Netzwerkstatus und onlinepflichtige Funktionen werden in
der App-Shell verständlich dargestellt.

Builds, Hosting und Service Worker stehen in der [PWA-Konfigurationsmatrix](./matrizen/pwa-konfigurationen.md). Cache-Arten,
Lesestrategien und Betriebsarten stehen in der [Cache- und Betriebsartenmatrix](./matrizen/cache-strategien.md).

## Identität, Rollen und Berechtigungen

Firebase Authentication stellt die Identität über die `uid` fest. Das Profil unter `benutzerprofil/{uid}` bestimmt Rolle,
Aktivstatus, sichtbare App-Bereiche und Datenzugriffe. Der technische Anmeldename bleibt nach der Anlage unveränderlich und
gewährt unabhängig von seinem Rollensuffix keine Berechtigung.

Der sichtbare Anmeldename folgt dem Format `<normalisierter-name>-<rolle>`; Firebase Auth verwendet intern die technische
Adresse `<anmeldename>@pur-system.invalid`. Der Master vergibt ein Anfangspasswort mit mindestens acht Zeichen. Angemeldete
Benutzer können ihr Passwort nach erneuter Authentifizierung ändern; Passwörter werden nicht in Firestore gespeichert.

Eine öffentliche Selbstregistrierung ist nicht vorgesehen. Ein Master legt Benutzer über eine geschützte Callable Function an.
Sie prüft die Berechtigung, erstellt das Auth-Konto zunächst deaktiviert, speichert das validierte Profil und aktiviert das
Konto erst nach erfolgreichem Abschluss. Unvollständige Konten und Verknüpfungen werden kontrolliert bereinigt oder für eine
manuelle Prüfung gesperrt erhalten.

Die vier Auth-Rollen besitzen folgende grundsätzliche Bedeutung:

| Rolle         | Zielkontext                                                         |
| ------------- | ------------------------------------------------------------------- |
| `master`      | systemweite Struktur- und Benutzerverwaltung ohne Zugriffszuordnung |
| `office`      | ausgewählte Firmen und ausdrücklich freigegebene Filialen            |
| `filiale`     | genau ein Unternehmer, eine Firma und eine Filiale                    |
| `mitarbeiter` | genau ein Unternehmer, eine Firma und ein verknüpfter Mitarbeiter     |

`erlaubteBereiche` steuert Navigation und erreichbare App-Funktionen. Datenrechte ergeben sich aus aktivem Profil, Auth-Rolle,
fachlicher Zuordnung, Pfad und CRUD-Aktion. Filialeinstellungen bilden die dokumentierte Ausnahme, bei der Office- und
Filialkonten zusätzlich den Bereich `einstellungen` benötigen.

Die App speichert fachliche Zuordnungen und keine fertigen Firestore-Pfade. Firestore Rules prüfen ausschließlich die in der
Berechtigungsmatrix beschriebenen Sicherheitsgrenzen. Fachliche Felder und Zustandswechsel bleiben im TypeScript-Code, sofern
die Matrix keine sicherheitskritische Ausnahme festlegt. Nicht ausdrücklich erlaubte Zugriffe bleiben gesperrt.

Unternehmer, Firmen, Filialen und Benutzerprofile werden nicht direkt vom Client gelöscht. Geschützte Functions prüfen
Referenzen und Berechtigungen und führen die serverseitigen Lösch- oder Kontovorgänge aus.

Die stabile Rollen-, Identitäts- und Verknüpfungsstruktur steht in den
[Systemgrundlagen](./system-grundlagen.md). Pfade, CRUD-Rechte und Ausnahmen stehen verbindlich in der
[Berechtigungsmatrix](./matrizen/berechtigungen.md).

## Unternehmensstruktur und Arbeitskontext

Die reguläre Unternehmensstruktur ist hierarchisch aufgebaut:

```text
unternehmer/{unternehmerId}
└── firma/{firmaId}
    ├── filiale/{filialId}
    └── mitarbeiter/{mitarbeiterId}
```

Neue und migrierte Strukturdaten werden gleich behandelt. Legacy-Daten und ihre Übergangszuordnungen bleiben vom regulären
Berechtigungsmodell getrennt und begründen keine neuen Rechte.

Der globale Arbeitskontext folgt der Reihenfolge `Unternehmer → Firma → Filiale`. Eine übergeordnete Auswahl begrenzt die
untergeordneten Einträge. Eindeutige Werte werden automatisch ausgewählt; mehrere fachlich erlaubte Filialen können gemeinsam
verwendet werden. Einen künstlichen Eintrag „Alle Filialen“ gibt es nicht.

Der Arbeitskontext bleibt von der hierarchischen Zuweisung von Benutzerrechten getrennt. Ebenso verändern fachliche Filter wie
eine Mitarbeiterauswahl nicht den globalen Kontext. Sichtbarkeit und Bedienbarkeit der Kontextselektoren richten sich nach
Rolle und App-Bereich.

Die verbindlichen Selektormodi stehen in der [Kontextselektor-Matrix](./matrizen/kontextselektor.md). Rollenabhängige
Ladeumfänge und Verantwortlichkeiten stehen in der [Datenladematrix](./matrizen/datenladen.md).

## Fachliche Mitarbeiter und persönliche Zugänge

Ein fachlicher Mitarbeiter gehört genau zu einer Firma und mindestens einer ihrer Filialen. Vorname, Nachname und mindestens
eine betriebliche Rolle sind verpflichtend. Stammdaten, Beschäftigungsstatus, Filialzuordnungen und betriebliche Rollen werden
am Mitarbeiterdatensatz gespeichert. Betriebliche Rollen beschreiben Aufgaben im Betrieb und gewähren keine Auth- oder
Firestore-Rechte.

Master, Office und Filiale verwalten Mitarbeiter ausschließlich im laut Berechtigungsmatrix erlaubten Datenraum. Filialkonten
begrenzen ihre Mitarbeiterabfragen und Änderungen auf die eigene Filiale. Verknüpfte Mitarbeiter dürfen weder gelöscht noch
mit einem anderen Datensatz zusammengeführt werden.

Ein Mitarbeiter kann optional einen persönlichen Firebase-Auth-Zugang erhalten. Benutzerprofil und Mitarbeiterdatensatz werden
serverseitig eindeutig und atomar miteinander verknüpft. Der Zugang bleibt vom betrieblichen Filialkonto getrennt und erhält in
der ersten Ausbaustufe ausschließlich persönliche Leserechte. Seine erlaubten Filialen werden aus dem verknüpften
Mitarbeiterdatensatz abgeleitet.

Ein späterer betrieblicher Mitarbeiter-Login innerhalb der Filial-App erhält ein eigenes Sicherheits- und Sitzungsmodell. Erst
dieser Zustand kann `dienstplaner` als zusätzliche clientseitige Bedienvoraussetzung für Planungsaktionen auswerten; die Rolle
erweitert keine serverseitigen Datenrechte.

Die verbindliche Benutzer-Mitarbeiter-Trennung steht in den [Systemgrundlagen](./system-grundlagen.md). Rollen- und CRUD-Rechte
stehen in der [Berechtigungsmatrix](./matrizen/berechtigungen.md).

## Projektstruktur und Navigation

Direkt routbare Pages, wiederverwendbare Components, App-Shell, Commons, Guards, Services und Stores bleiben entsprechend ihrer
technischen Verantwortung getrennt. Die verbindlichen Ablage- und Benennungsregeln stehen in [`AGENTS.md`](../AGENTS.md).

Die App-Shell stellt Toolbar, Sidebar, Versionsinformation, Netzwerkstatus und globale Hinweise bereit. Navigation und
Ausweichrouten werden zentral aus Rolle und `erlaubteBereiche` gebildet. Nicht navigierbare Gruppen und direkt routbare Pages
bleiben technisch getrennt.

Die langfristigen Hauptbereiche sind:

1. **Dashboard:** rollenabhängiger Einstieg und späterer Überblick
2. **Schichtplan:** veröffentlichte Ansicht, Planung und Schichtmodelle
3. **Mitarbeiter:** Verwaltung fachlicher Mitarbeiter und späterer betrieblicher Mitarbeiter-Login
4. **Einstellungen:** filialbezogene Konfiguration einschließlich Öffnungszeiten
5. **System:** Struktur- und Benutzerverwaltung für Master

Routenguards bilden die verbindliche clientseitige Navigationskontrolle. Firestore Rules und geschützte Functions setzen die
verbindlichen Datenrechte unabhängig von sichtbarer Navigation durch.

## Dienst- und Schichtplanung

Die Dienstplanung ist eine filialbezogene, versionierte Monatsplanung. Berechtigte Planer bearbeiten Entwürfe; veröffentlichte
Stände bleiben als nachvollziehbare Version erhalten. Mitarbeiterzugänge lesen ausschließlich veröffentlichte Pläne ihrer
fachlich zugeordneten Filialen.

Schichtmodelle und Monatsdienstpläne besitzen eine unveränderlich übernommene Planungsart. Die beiden Planungsarten heißen
verbindlich `schichtrastermodell` und `schichttagesmodell`. Schicht-Rastermodell und Schicht-Tagesmodell besitzen getrennte
fachliche Typen, Speicherpfade und Planungslogiken; gemeinsam bleiben nur allgemeine Metadaten und die Auswahl der
Planungsart. Der bisherige Wert `schichtraster` wird kontrolliert zu `schichtrastermodell` migriert. Der nur vorbereitete Wert
`schichtbausteine` entfällt.

Filialeinstellungen bestimmen Standardöffnungszeiten, abweichende Wochentage, geschlossene Tage sowie gesetzliche Feiertage
und jährliche Sondertage. Gesetzliche Feiertage können unabhängig vom tatsächlichen Wochentag die allgemeine Standardöffnung,
dynamisch die wirksame Sonntagsöffnung, eine eigene abweichende Öffnung oder eine Schließung verwenden. Benutzerdefinierte
jährliche Sondertage überschreiben systemdefinierte Sondertage. Für jeden Kalendertag wird die wirksame Öffnungsregel
aufgelöst und bei der Monatsplananlage zusammen mit seinen unabhängigen Kalendereigenschaften als Momentaufnahme gespeichert.

Beim Schicht-Rastermodell bleiben Modellschichten, Reihenfolge und Mehrfachbelegung über alle Kalendertage stabil. Die äußeren
Rastergrenzen werden aus der wirksamen Tagesöffnung einschließlich Vor- und Nachbereitung abgeleitet; innere Übergänge bleiben
Modellbestandteil. Geschlossene oder zeitlich zu kurze Tage können keine ungültigen Schichten erzeugen.

Das Schicht-Tagesmodell enthält eine Wochentagsvorlage für Montag bis Samstag und eine davon unabhängige Sonntagsvorlage.
Anzahl, Identität und Zeiten ihrer Schichten dürfen sich unterscheiden. Beim initialen Erstellen eines Monatsplans erhält jeder
Kalendertag eine eigene Tagesstruktur. Reguläre Tage übernehmen die passende Vorlage. Feiertage mit `Wie Sonntag` übernehmen
die wirksame Sonntagsöffnung und die Sonntagsvorlage, ohne bei der Monatsplananlage erneut konfiguriert zu werden. Nur
abweichend geöffnete Feier- und Sondertage werden vor dem Anlegen des Plans frei konfiguriert. Geschlossene Tage enthalten
keine Tagesschichten.

Beginn und Ende jeder Kernschicht des Schicht-Tagesmodells müssen innerhalb der wirksamen Öffnung liegen. Nur ihre ausdrücklich
konfigurierte Vor- und Nachbereitungszeit darf über die Öffnungsgrenzen hinausreichen. Monatsplan, Kalender-Momentaufnahme und
alle Tagesschichten werden erst nach vollständiger Tageskonfiguration atomar angelegt. Spätere Änderungen am Modell oder an den
Öffnungszeiten verändern bestehende Monatspläne nicht.

Schichten eines Mitarbeiters werden filialübergreifend auf zeitliche Konflikte geprüft. Pausen werden aus den gemeinsamen
Arbeitsblöcken eines Tages berechnet und in der Planungsmomentaufnahme erhalten. Veröffentlichungen, parallele Änderungen und
Belegungsindizes werden so verarbeitet, dass veraltete oder widersprüchliche Schreibzugriffe erkennbar scheitern.

Öffnungszeiten erzeugen keine Mitarbeiterschichten automatisch. Kalendermerkmale bleiben unabhängig von Öffnung und Raster
erhalten, damit spätere Zeiterfassung sowie Nacht-, Sonntags- und Feiertagsauswertungen auf der gespeicherten Momentaufnahme
aufbauen können.

Das vollständige fachliche und architektonische Zielbild steht im
[Fachkonzept Dienst- und Schichtplanung](./fachkonzepte/dienst-und-schichtplanung.md). Gesetzliche und betriebliche
Öffnungsgrenzen stehen in der [Öffnungszeiten-Matrix](./matrizen/oeffnungszeiten.md). Verbindliche Datenrechte stehen in der
[Berechtigungsmatrix](./matrizen/berechtigungen.md).

## Weiterführende Dokumente

- [Globale Projektregeln](./projekt-regeln.md)
- [Aktueller Projektstand](./projekt-stand.md)
- [Offene Todos](./todo_naechste.md)
- [Spätere Todos](./todo_spaeter.md)
- [Erledigte Todos](./todo_erledigt.md)
