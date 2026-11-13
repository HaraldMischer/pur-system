<!-- pur-system/docs/projekt-regeln.md -->

# Globale Projektregeln

## Zweck und Verbindlichkeit

Dieses Dokument ist die zentrale Einstiegsstelle für dauerhaft gültige projektweite Design-, Darstellungs- und
Verhaltensregeln. Die Regeln gelten unabhängig von Anwendungskontext, Benutzerrolle oder Fachbereich, sofern ein verlinktes
Detaildokument keine ausdrücklich begründete Sonderregel beschreibt.

- Globale Produktregeln werden hier verbindlich festgelegt.
- Detaildokumente beschreiben technische Umsetzung, fachliche Abläufe und zulässige Abweichungen.
- Neue Oberflächen orientieren sich zuerst an diesem Dokument und anschließend am zuständigen Detaildokument.
- Abweichungen werden vor ihrer Umsetzung dokumentiert und fachlich begründet.
- Bestehende Sonderlösungen begründen keinen neuen allgemeinen Standard.

## Design und Layout

- Wiederkehrende Seitenbereiche verwenden gemeinsame globale Layoutbausteine statt voneinander abweichender lokaler
  Nachbauten.
- Angular Material und das bestehende globale `pur-*`-Stylesystem bilden die gemeinsame UI-Grundlage.
- Globale, wiederverwendbare CSS-Strukturen folgen BEM. Lokale Helferklassen bleiben auf den jeweiligen fachlichen Kontext
  begrenzt.
- Vollständig definierte globale Layout-Modifier dürfen eigenständig mit Elementen anderer Blöcke kombiniert werden, z. B.
  `pur-form__item pur-flex__item--fixed-115`. Die Basisklasse des Layout-Helper-Blocks ist dafür nicht zusätzlich erforderlich.
- Eigene Breiten, Höhen, Abstände und Breakpoints werden grundsätzlich in `px` angegeben. `rem` wird nur verwendet, wenn eine
  Größe ausdrücklich mit der Root-Schriftgröße skalieren soll.
- Zustandsanzeigen dürfen bestehende Seiten-, Listen-, Karten- oder Dialoginhalte nicht unnötig verschieben.

## Listen, Karten und Aktionen

- Zeilenorientierte, nicht tabellarische Sammlungen verwenden den globalen Block `pur-list`. Tabellen bleiben tatsächlich
  tabellarischen Inhalten vorbehalten.
- Eine Karte bildet genau einen fachlich verständlichen Inhalt, Status oder Aktionskontext ab.
- Fortschritt und Fehlermeldungen werden dem kleinsten fachlich verantwortlichen sichtbaren Kontext zugeordnet.
- Laufende Aktionen sperren Mehrfachauslösungen und widersprüchliche Aktionen innerhalb ihres Kontexts.
- Wiederkehrende Einträge oder Karten eines Bereichs verwenden dieselbe Anordnung für Titel, Inhalt, Status und Aktionen.

## Dialoge und Formulare

- Dialoge kapseln einen klar abgegrenzten Erfassungs-, Anzeige- oder Bestätigungsablauf.
- Über `MatDialog` geöffnete Dialoge verwenden die globalen Dialogklassen und die gemeinsamen Bereiche für Titel, Inhalt und
  Aktionen.
- Formulare verwenden Reactive Forms und die globalen `pur-form`-Klassen mit genau einem passenden Layoutmodifier.
- Datenändernde Aktionen sind nur aktiv, wenn die Eingaben fachlich gültig sind und kein Schreibvorgang läuft.
- Während eines Schreibvorgangs wird der gesamte betroffene Erfassungs- und Aktionskontext deaktiviert. Der Submit-Handler
  verhindert zusätzliche Mehrfachaufrufe.
- Ein Dialog wird in der Regel erst nach erfolgreichem Speichern geschlossen.
- Bei einem Speicherfehler bleiben Dialog oder Formular geöffnet, die Eingaben erhalten und eine verständliche Fehlermeldung
  sichtbar.
- Im reinen Anzeigemodus löst die abschließende Aktion keinen unnötigen Speichervorgang aus.

## Laden und Speichern

- Lade- und Schreibvorgänge werden als getrennte Zustände behandelt.
- Ein Ladezustand beschreibt den Datenabruf; `inProgress` kennzeichnet ausschließlich laufende Schreiboperationen.
- Fortschritt wird in dem sichtbaren Kontext angezeigt, der den Vorgang fachlich verantwortet.
- Derselbe Verarbeitungsschritt wird nicht gleichzeitig in mehreren Kontexten als laufend dargestellt.
- Bereits geladene gültige Daten und vorhandene Formulareingaben bleiben bei einem Fehler erhalten.
- Lade-, Schreib- und Fehlerzustände werden nach Abschluss zuverlässig beendet oder für den nächsten Vorgang zurückgesetzt.

## Navigation und Kontextauswahl

- Kontextselektoren bilden die fachliche Hierarchie `Unternehmer → Firma → Filiale` ab.
- Eine übergeordnete Auswahl begrenzt die Einträge der direkt untergeordneten Ebene.
- Ein ungültig gewordener abhängiger Zustand wird kontrolliert zurückgesetzt und in Hierarchiereihenfolge neu geladen.
- Bei genau einem wählbaren Eintrag wird dieser automatisch ausgewählt. Mehrere Einträge werden gemäß der für Rolle und
  Bereich festgelegten Konfiguration auswählbar dargestellt.
- Selektoren zeigen ausschließlich Einträge, für die im jeweiligen Anwendungskontext eine Berechtigung besteht.
- Die verbindlichen rollen- und bereichsabhängigen Modi stehen in `docs/matrizen/kontextselektor.md`.

## Status-, Erfolgs- und Fehlermeldungen

- Services und Stores behandeln technische Fehler und geben sie an den aufrufenden UI-Kontext weiter.
- Components, Pages und Dialoge verantworten die sichtbare Benutzerkommunikation.
- Eine Fehlermeldung nennt zuerst die fehlgeschlagene Aktion und ergänzt eine bekannte fachliche Ursache.
- Technische Details, Stacktraces, interne Methodennamen und nicht aufbereitete Firebase-Fehler werden nicht als
  Benutzermeldung ausgegeben.
- Unbekannte technische Fehler werden vollständig protokolliert, in der Oberfläche aber allgemein und verständlich formuliert.
- Erfolg wird erst gemeldet, wenn der fachliche Vorgang erfolgreich abgeschlossen ist.
- Ein Fehler darf nicht durch eine Erfolgsmeldung, Navigation oder ein vorzeitiges Schließen des verantwortlichen Dialogs
  verdeckt werden.

## Online- und Offline-Verhalten

- Die Oberfläche startet keine onlinepflichtige Aktion, wenn bereits feststeht, dass keine Verbindung besteht.
- Pur Master, Pur Office und Pur Mitarbeiter verwenden keinen fachlichen Offline-Arbeitsmodus.
- Pur Filiale darf ausschließlich die ausdrücklich freigegebenen Offline-Leseabläufe verwenden.
- Schreibvorgänge bleiben onlinepflichtig, solange kein konkreter fachlicher Ablauf mit Synchronisation und Konfliktbehandlung
  dokumentiert und freigegeben wurde.
- Eine UI-Sperre ergänzt die technische Absicherung, ersetzt aber weder Serviceprüfungen noch Firebase Rules.
- Die verbindlichen Betriebsarten stehen in `docs/matrizen/cache-strategien.md`.

## Datenmodell und Benennungen

- Die Unternehmensstruktur folgt der Hierarchie aus Unternehmer, Firma und Filiale.
- Organisationsstruktur, fachliche Mitarbeiter und Benutzerberechtigungen werden getrennt abgebildet.
- Dokument-IDs bestimmen strukturelle Beziehungen; Firebase-UIDs bestimmen Anmeldung und Benutzerverknüpfungen.
- Fachliche Projekt- und Domänenbegriffe werden in UI, Modellen und Firestore-Pfaden auf Deutsch gehalten.
- Technische Begriffe aus Frameworks, Bibliotheken und APIs bleiben in ihrer etablierten Schreibweise.
- Persistierte Feldnamen oder Pfade werden nur im Rahmen einer ausdrücklich geplanten und freigegebenen Datenmigration geändert.
- Die verbindlichen Struktur- und Rollengrundlagen stehen in `docs/system-grundlagen.md`.

## Berechtigungen und Sicherheitsgrenzen

- Die Berechtigungsmatrix ist die verbindliche Quelle für Pfad- und CRUD-Rechte.
- Firestore Rules prüfen nur die unmittelbar erforderliche Sicherheitsgrenze des konkreten Pfads.
- Fachliche Felder, Dokument-IDs, Referenzen, Status- und Zustandswechsel werden im TypeScript-Code und dessen Tests validiert.
- Abweichungen von diesem Grundsatz müssen vor ihrer Umsetzung ausdrücklich in den Zusatzbedingungen der Berechtigungsmatrix
  beschrieben sein.
- Komplexe Rules-Hilfslogik wird nicht verwendet, um ein ungeeignetes Datenmodell oder eine unklare Berechtigungsmatrix
  auszugleichen.
- Die verbindlichen Pfade, CRUD-Rechte und Ausnahmen stehen in `docs/matrizen/berechtigungen.md`.

## Responsives Verhalten und Barrierefreiheit

- Gemeinsame Layouts passen sich an den verfügbaren Platz an, ohne horizontale Mindestbreiten größer als den Viewport zu
  erzwingen.
- Zusammengehörige Bedienelemente oder Werte brechen als fachlich verständliche Einheit um.
- Bedienelemente bleiben bei kleineren Viewports erreichbar und fachlich eindeutig beschriftet.
- Deaktivierte oder gesperrte Aktionen sind nicht nur optisch, sondern auch technisch nicht auslösbar.
- Zustände werden nicht ausschließlich durch Farbe vermittelt; Text, Beschriftung, Symbol oder technischer Status ergänzen die
  Darstellung.
- Safe-Area-Abstände werden nur an den Viewportkanten berücksichtigt, die das betreffende Element tatsächlich berührt.

## Dokumentationspflege

- Dauerhaft gültige projektweite Produkt-, Design- und Verhaltensregeln werden in diesem Dokument ergänzt oder geändert.
- Das fachliche und architektonische Zielbild steht in `docs/projekt-plan.md`; der konsolidierte umgesetzte Stand steht in
  `docs/projekt-stand.md`.
- Systemstruktur, Rollen und technische Grundprinzipien stehen in `docs/system-grundlagen.md`.
- Fachliche Abläufe bleiben unter `docs/fachkonzepte` dokumentiert.
- Technische Detailbeschreibungen bleiben unter `docs/architektur` dokumentiert.
- Verbindliche Entscheidungsübersichten bleiben unter `docs/matrizen` dokumentiert.
- Todo-Dateien beschreiben geplante oder abgeschlossene Umsetzungsschritte, sind aber keine dauerhafte Quelle für globale
  Projektregeln.

### Dokumentationszuständigkeiten

Jede Dokumentgruppe besitzt eine eindeutig begrenzte Aufgabe:

- `AGENTS.md` enthält Arbeits-, Umsetzungs- und Prüfregeln für Agents. Es ersetzt keine fachliche Produktdokumentation.
- `docs/projekt-regeln.md` ist die verbindliche Quelle für dauerhaft gültige projektweite Produkt-, Design- und
  Verhaltensregeln.
- `docs/projekt-plan.md` beschreibt das langfristige fachliche und architektonische Zielbild auf Projektebene.
- `docs/projekt-stand.md` fasst den aktuell umgesetzten, geprüften und veröffentlichten Stand zusammen. Es ist keine Quelle für
  neue fachliche Regeln.
- `docs/system-grundlagen.md` beschreibt die stabile Systemstruktur, Rollen, Identitäten und grundlegenden Datenbeziehungen.
- `docs/fachkonzepte` enthält die vollständigen fachlichen Regeln und Abläufe einer Domäne.
- `docs/architektur` beschreibt die konkrete technische Umsetzung und die Verantwortlichkeiten von Components, Services und
  Stores.
- `docs/matrizen` enthält verbindliche, thematisch begrenzte Entscheidungsübersichten und ausdrücklich dokumentierte Ausnahmen.
- `docs/todo_naechste.md` und `docs/todo_spaeter.md` beschreiben offene Arbeit. `docs/todo_erledigt.md` bewahrt den historischen
  Umsetzungsverlauf.

### Vorrang und Verweise

- Eine thematisch zuständige Detailquelle konkretisiert die übergeordnete Regel, darf ihr aber nicht widersprechen.
- Bei mehreren Beschreibungen gilt für die konkrete Entscheidung die engste zuständige Hauptquelle. Beispielsweise ist die
  Berechtigungsmatrix für Pfad- und CRUD-Rechte verbindlich, das Fachkonzept für fachliche Schichtplanregeln und die
  Architekturdatei für die technische Verantwortung eines Services.
- Projektplan und Projektstand fassen Detailwissen nur so weit zusammen, wie es für Zielbild beziehungsweise aktuellen Stand
  erforderlich ist. Vollständige Details werden verlinkt und nicht parallel gepflegt.
- Verweist eine Übersicht auf eine Hauptquelle, wird eine fachliche Änderung zuerst in der Hauptquelle dokumentiert. Betroffene
  Zusammenfassungen werden anschließend angeglichen.
- Widersprüchliche Aussagen werden vor einer Kürzung fachlich aufgelöst. Veraltete Zwischenstände werden nicht als aktueller
  Stand fortgeführt.
- Historische Aussagen bleiben ausschließlich in eindeutig gekennzeichneten Prüfständen oder im erledigten Todo erhalten.

### Thematische Hauptquellen

- Systemstruktur, Auth-Rollen und Benutzer-Mitarbeiter-Trennung: `docs/system-grundlagen.md`
- Pfad-, Rollen- und CRUD-Rechte einschließlich Ausnahmen: `docs/matrizen/berechtigungen.md`
- Datenladen, Cache, PWA-Betriebsarten und Kontextauswahl: die jeweils benannte Matrix unter `docs/matrizen`
- Öffnungszeiten und kalendarische Grenzen: `docs/matrizen/oeffnungszeiten.md`
- Dienst- und Schichtplanung: `docs/fachkonzepte/dienst-und-schichtplanung.md`
- Konkrete technische Verantwortlichkeiten: die zuständige Datei unter `docs/architektur`
- Aktuelle Umsetzung, Prüfung und Veröffentlichung: `docs/projekt-stand.md`
