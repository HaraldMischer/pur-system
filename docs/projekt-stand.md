<!-- pur-system/docs/projekt-stand.md -->

# Projekt-Stand: Pur-System

Stand: 02.10.2026. Dieses Dokument beschreibt den aktuellen Umsetzungsstand im Code. Das fachliche Zielbild steht separat im
[Projekt-Plan](./projekt-plan.md).

## Projektbasis

- Angular-Projekt `pur-office` wurde angelegt.
- Angular Standalone Components werden verwendet.
- SCSS ist als Styling-Format eingerichtet.
- Vitest ist als Testumgebung eingerichtet.
- Prettier ist als Projekt-Dependency installiert.
- GitHub-Repository `HaraldMischer/pur-system` wurde angelegt.
- Projektvorgaben wurden in `AGENTS.md` dokumentiert.

## App-Shell und Navigation

- Material-Sidenav-Layout ist in der App-Shell eingebaut.
- `app-sidenav` liegt unter `src/app/components/app-shell/app-sidenav`.
- `app-toolbar` liegt unter `src/app/components/app-shell/app-toolbar`.
- Für jede `userRole` ist eine eigene Navigationsstruktur einschließlich der ausdrücklich festgelegten Darstellung `flat` oder
  `nested` zentral konfiguriert. Die Darstellungsart wird nicht automatisch aus den enthaltenen Navigationseinträgen abgeleitet.
  Master, Office und Filiale verwenden aktuell `nested`; Mitarbeiter verwendet `flat`.
- Die Rolle aus dem geladenen Benutzerprofil wählt die Navigationskonfiguration. `erlaubteBereiche` filtert anschließend nur die
  sichtbaren Einträge und verändert die konfigurierte Darstellungsart nicht.
- Flache und verschachtelte Navigationen verwenden getrennte Darstellungskomponenten. Die verschachtelte Component unterstützt
  direkte Links, nicht navigierbare ausklappbare Gruppen, eingerückte Unterpunkte und das automatische Öffnen der Gruppe einer
  aktiven Unterroute. Die Master-Navigation stellt `Systemverwaltung` als solche Gruppe mit den Unterpunkten
  `Datenstruktur anlegen` und `Benutzerverwaltung` dar. Office und Filiale erhalten bei gültigem Datenzugriff die Gruppe
  `Mitarbeiter` mit dem Unterpunkt `Mitarbeiterliste`; Master erhält sie bei optionaler Zuweisung des App-Bereichs.
- Die Toolbar zeigt den Titel der aktiven Route und den Menübutton.
- Die Toolbar bietet einen Dark-/Light-Mode-Umschalter und im Entwicklungsmodus einen Button für die Snapshots der aktiven Stores.
- Die Toolbar zeigt während zentral registrierter Lese- und Schreibvorgänge eine globale unbestimmte Progress-Bar.
- Die Loginseite verwendet eine reduzierte App-Shell ohne Sidebar und Navigationstaste. Die Toolbar zeigt abhängig von der
  Auslieferungsvariante `Pur Master`, `Pur Office`, `Pur Filiale` oder `Pur Mitarbeiter`; die Entwicklungsumgebung verwendet
  `Pur-System`.
- Das Layout reagiert auf kleinere Bildschirmbreiten.
- Die Sidebar enthält den Bereich Systemverwaltung für berechtigte Master-Benutzer.
- Die Sidebar zeigt die zentral in `app.constants.ts` gepflegte Anwendungsversion. Der aktuelle Stand ist `1.0.0`.
- Der `AppKontextStore` hält den seitenübergreifenden Arbeitskontext aus Unternehmer, Firma und Filialumfang. Nach dem Laden der
  Stammdaten wählt er den ersten verfügbaren Unternehmer, dessen erste Firma und bei vorhandenen Filialen `Alle Filialen` aus.
  Ein Wechsel des Unternehmers oder der Firma stellt diesen vollständigen Kontext erneut her.
- Master können Unternehmer und Firma über wiederverwendbare Selektoren in der Sidebar wechseln. Der Filial-Selektor zeigt den
  Kontext `Alle Filialen`, bleibt aber bis zu einem konkreten fachlichen Bedarf deaktiviert.

## Seiten und Routen

- `dashboard-page` wurde unter `src/app/pages/dashboard-page` angelegt.
- `schichtplan-page` wurde unter `src/app/pages/schichtplan-page` angelegt.
- `mitarbeiter-page` ist der Feature-Ordner für die fachliche Mitarbeiterverwaltung. Die bisherige Platzhalterseite wurde
  entfernt.
- Routen für `/dashboard` und `/schichtplan` werden per `loadComponent` geladen.
- `/mitarbeiter` ist ein komponentenloser, nach Bereichsfreigabe geschützter Elternpfad und leitet auf
  `/mitarbeiter/liste` weiter. Die Listenroute ist für aktive Office- und Filialkonten mit vollständigem Datenzugriff sowie für
  aktive Master mit optional zugewiesenem App-Bereich erreichbar. Die Master-Freigabe erweitert nicht die Collection-Rechte.
- `/` leitet auf `/dashboard` weiter.
- Die komponentenlose Route `/systemverwaltung` ist der geschützte Elternpfad für `/systemverwaltung/datenstruktur` und
  `/systemverwaltung/benutzer` und leitet ohne Unterpfad auf die Datenstruktur-Anlage weiter.
- Die `DatenstrukturPage` ist unter ihrer eigenen Unterroute erreichbar. Die `BenutzerPage` bündelt unter der zweiten Unterroute
  weiterhin Benutzeranlage und Benutzerverwaltung.
- Die `DatenmigrationPage` lädt Legacy-Kunden zur Einzelauswahl und bietet für den ausgewählten Kunden die Migration von
  Unternehmer, Firmen, Filialen und Mitarbeitern mit jeweils eigenem Status, Ergebniszahlen und Problemdetails an. Der feste
  Bereichsselektor zeigt die fachliche Reihenfolge; die zugehörige Karte zeigt `Status | Quelle | Migriert` sowie
  `Fehler | Offen | Ziel`. Jeder Folgebereich setzt den erfolgreichen Abschluss seines Vorgängers voraus. Abgeschlossene und
  fehlgeschlagene Migrationen können erneut ausgeführt werden. Eine kundenübergreifende Sammelaktion gibt es nicht.
- Die Route `/verwaltung` enthält die Auswahl zugeordneter Stammdaten und die Bearbeitung bestehender Firmen- und Filialdaten.
  Die beiden Bearbeitungsdialoge vergleichen ihre normalisierten Aktualisierungsdaten per `JSON.stringify()` mit dem
  Ausgangszustand. Ohne fachliche Änderung bleiben Speicherbutton und Firestore-Aktualisierung gesperrt.
- Die geschützte Route `/passwort` ermöglicht angemeldeten Benutzern eine Passwortänderung.

## Firebase-Grundlage

- Firebase und AngularFire sind installiert.
- Firebase-Konfiguration liegt unter `src/environments`.
- Firebase App, Auth, Firestore und Functions werden in `app.config.ts` bereitgestellt.
- Die Cache-Art wird beim App-Start aus der Auslieferungsvariante gewählt. Pur Filiale verwendet
  `persistentLocalCache`; Pur Master, Pur Office, Pur Mitarbeiter und die Entwicklungsumgebung verwenden `memoryLocalCache`.
- Firebase Tokens für Auth sowie lesende, beobachtende und schreibende Firestore-Zugriffe sind vorbereitet.
- Fachliche Ladeprotokolle sind über einen zentralen Schalter ausschließlich für `localhost`, `127.0.0.1` und `::1` freigegeben.
  Dadurch zeigen auch lokal gestartete Produktionsbuilds ihren Datenfluss; auf den veröffentlichten Hosting-Adressen bleiben die
  Protokolle deaktiviert.
- Technische Firebase-Anbindungen liegen unter `src/app/services/firebase`; fachliche Services liegen getrennt unter
  `src/app/services/domain`.
- Der technische `FirestoreDbService` kapselt Collection-, Query- und Dokument-Lesen mit den expliziten Strategien
  `cacheFirst`, `networkOnly`, `networkFirst` und `cacheOnly`, außerdem Dokumentbeobachtung, Anlegen, Merge-Aktualisieren,
  Server-Zeitstempel und den Angular-Injection-Kontext. Ein `networkFirst`-Rückfall auf den Cache erfolgt nur bei technischen
  Serverfehlern; Berechtigungsfehler werden unverändert weitergegeben.
- Firestore-Collection- und Dokumentpfade für Benutzerprofile, Unternehmer, Firmen und Filialen werden zentral in
  `firebase.constants.ts` erzeugt.
- Legacy-Firmen werden ausschließlich aus dem ausgewählten `purCustomer` gelesen. Jede Firma erhält einmalig eine
  Firestore-Auto-ID, die unter `systemMigrationen/{purCustomerId}.firmenIds.{purCompanyId}` gespeichert und bei Wiederholungen
  wiederverwendet wird. Firmenadressen sind sowohl bei Anlage und Bearbeitung als auch bei der Migration optional und dürfen
  unvollständig sein.
- Legacy-Filialen werden aus allen Legacy-Firmen des ausgewählten `purCustomer` gelesen. Jede Filiale erhält einmalig eine
  Firestore-Auto-ID, die unter `systemMigrationen/{purCustomerId}.filialenIds.{purCompanyId}.{purBranchId}` gespeichert und bei
  Wiederholungen wiederverwendet wird. Eingebettete Legacy-IDs und veraltete Felder werden ignoriert; Filial-Untercollections
  bleiben späteren Migrationsschritten vorbehalten. Filialadressen sind bei Anlage, Bearbeitung und Migration optional und
  dürfen unvollständig sein.
- Legacy-Mitarbeiter werden aus allen Filialen des ausgewählten `purCustomer` gelesen und als einzelne Firmenmitarbeiter
  übernommen. Jeder Quellmitarbeiter erhält eine Firestore-Auto-ID, die verschachtelt nach Legacy-Firma, -Filiale und
  -Mitarbeiter unter `systemMigrationen/{purCustomerId}.mitarbeiterIds` gespeichert wird. `filialIds` enthält die zugeordnete
  neue Filial-ID. Gleiche Namen oder Legacy-IDs in unterschiedlichen Filialen bleiben getrennte, nachvollziehbare Mitarbeiter.
  Master können ein Mitarbeiterdokument aus der neuen Firmenstruktur löschen. Zugehörige Ziel-ID-Zuordnungen werden dabei aus
  `systemMigrationen` entfernt, während die Legacy-Quelle unverändert bleibt und bei einer erneuten Migration wieder angelegt
  werden kann. Mitarbeiter mit verknüpftem Benutzerkonto bleiben vor dem Löschen geschützt.
- `BenutzerService`, `UnternehmerService`, `FirmaService` und `FilialeService` verwenden keine direkten AngularFire-Aufrufe mehr,
  sondern greifen über den `FirestoreDbService` zu.
- Der `AppSitzungsInitService` ist der zentrale Einstiegspunkt für den Sitzungsstart. Er startet die Auth- und
  Profilbeobachtung des `BenutzerStore`, stellt die Zustände `idle`, `loading`, `ready` und `error` bereit und bietet bei Fehlern
  eine Wiederholung an. Änderungen an Rolle, Zugriffen oder persönlicher Mitarbeiterzuordnung grenzen einen neuen
  Initialisierungskontext ab; veraltete Ladeergebnisse werden nicht übernommen.
- Der `BenutzerStore` beobachtet ausschließlich Firebase Auth und das eigene Benutzerprofil. Der `AppDatenInitService` bildet
  zentral aus `userRole`, `zugriffe` und der persönlichen Mitarbeiterzuordnung den zwingenden Ladeplan. Er beauftragt den
  rollenunabhängigen `StammdatenStore` sowie den `MitarbeiterStore`; erst nach Abschluss aller Aufträge meldet der
  `AppSitzungsInitService` die Sitzung als `ready`.
- Master laden die vollständige Unternehmenshierarchie, alle Benutzerprofile und die Mitarbeiter aller Firmen. Office lädt die
  zugeordneten Hierarchiedaten und alle Mitarbeiter der zugeordneten Firmen. Filiale lädt ihre eindeutige Hierarchie und nur die
  Mitarbeiter mit ihrer Filial-ID. Mitarbeiter lädt zunächst den zugeordneten Unternehmer und die Firma, danach den eigenen
  aktiven Mitarbeiter über `firmaMitarbeiterId` und anschließend die in dessen `filialIds` referenzierten Filialen. Die
  Mitarbeiter dieser Filialen werden mit einer gemeinsamen `array-contains-any`-Abfrage eindeutig geladen. Fehlende oder
  widersprüchliche Pflichtzuordnungen brechen die Initialisierung ab.
- Das fachliche Ladeprotokoll führt alle zwingenden Daten in einem gemeinsamen Stammdaten-Abschnitt. Unabhängige Aufträge
  bleiben parallel und werden auch im Fehlerfall vollständig abgewartet. Beim Master wird zunächst die vollständige
  Unternehmensstruktur geladen, weil daraus erst die Mitarbeiteraufträge für alle Firmen entstehen. Nach erfolgreichem
  Abschluss gibt der `AppDatenInitService` ausschließlich die Anzahl der Einträge fest als Benutzerprofile, Unternehmer,
  Firmen, Filialen und Mitarbeiter aus. Nicht benötigte Datenarten werden ausgelassen. Mitarbeiterkontexte werden nach
  Unternehmer und Firma sortiert. Die Abschlussmeldung folgt erst nach dem vollständigen Ladeplan. Dateninhalte können im
  Entwicklungsmodus getrennt über den Store-Snapshot-Button der Toolbar ausgegeben werden.
- Verwaltung, Systemverwaltung und Datenzugriffsauswahl verwenden den gemeinsamen Sitzungsbestand. Er wird bei Neuanlagen direkt
  aktualisiert und bei Logout oder Benutzerwechsel zurückgesetzt.
- Der `GlobalBannerService` verwaltet einen zentralen Bannerzustand mit Darstellungsart, Text und Quelle. Die
  `GlobalBanner`-Component ist unterhalb der Toolbar in die App-Shell eingebunden. Ein neuer Banner ersetzt den bisherigen;
  `clearIfSource()` verhindert, dass eine fachliche Quelle den Hinweis einer anderen Quelle entfernt.
- Pur Filiale lädt das Benutzerprofil mit `networkFirst` und Stammdaten mit `cacheFirst`. Alle anderen Varianten verwenden für
  beide Datenarten `networkOnly`; erzwungene Wiederholungen verwenden ebenfalls `networkOnly`. `cacheOnly` ist technisch
  vorhanden, aber keinem fachlichen Ablauf zugewiesen. Ein leerer Collection- oder Query-Cache beziehungsweise ein nicht
  vorhandenes Dokument gilt bei `cacheFirst` als Cache-Miss und löst eine Serveranfrage aus.
- Abmeldung und Benutzerwechsel setzen die sitzungsbezogenen Stores zurück und machen den bisherigen Initialisierungskontext
  ungültig. Bereits laufende Firestore-Anfragen werden nicht technisch abgebrochen; verspätete Ergebnisse eines veralteten
  Store-Kontexts werden nicht übernommen. Der persistente Firestore-Cache von Pur Filiale bleibt gerätebezogen erhalten und
  wird anschließend nur über den Ladeplan des neu bestätigten Profils gelesen.
- Ein aus dem Cache gemeldetes Benutzerprofil startet noch keine Stammdateninitialisierung, solange dessen initialer
  `networkFirst`-Ladevorgang nicht abgeschlossen ist. Dadurch kann ein gecachter Profilstand die Sitzung nicht vorzeitig als
  `ready` freigeben.
- Die Datenmigration besitzt gemeinsame Modelle und zentrale Firestore-Pfade für `purCustomers`,
  `systemMigrationen/{purCustomerId}` und die versionierten Statusdokumente unter `datenbereiche`. Der Datenmigration-Service
  lädt Legacy-Kunden und ihren Status und kann genau einen ausgewählten Kunden zu einem Unternehmer mit Firestore-Auto-ID
  migrieren. Das Hauptdokument speichert die dauerhafte Zuordnung als `unternehmerId`; ein Status-Reset entfernt diese Zuordnung
  nicht. Auch jede Firma, Filiale und jeder Filialmitarbeiter erhält eine dauerhaft unter `firmenIds`, `filialenIds`
  beziehungsweise `mitarbeiterIds` gespeicherte Firestore-Auto-ID. Die gemappten Quelldaten werden bei jedem Lauf unter derselben
  Ziel-ID geschrieben; ausschließlich im Ziel vorhandene Dokumente und nicht gemappte Zusatzfelder bleiben erhalten.
  Validierungs- und technische Fehler werden in den Statusdokumenten nachvollziehbar gespeichert. Der
  Datenmigration-Store hält Auswahl, Quellen- und Zielzahlen, Status sowie Lese- und Schreibzustände und verwirft verspätete
  Ergebnisse einer überholten Kundenauswahl. Neben der Kundenauswahl wählt ein fester Migrationsbereich-Selektor zwischen
  Unternehmern, Firmen, Filialen und Mitarbeitern und zeigt genau die zugehörige Karte. Beim Öffnen eines Bereichs werden
  aktueller Quellen- und Zielbestand aus Firestore gelesen. Nach der
  Migration lädt der Store den Status und den tatsächlichen Zielbestand erneut. `Offen` ergibt sich aus der aktuellen Quelle
  abzüglich der zuletzt erfolgreich migrierten Dokumente; nur im Ziel vorhandene Dokumente bleiben erhalten und werden in `Ziel`
  mitgezählt.
- Aktive Master dürfen die Legacy-Kundendaten lesen sowie Migrationsstatus lesen, anlegen und aktualisieren; andere
  Pur-System-Rollen, Legacy-Konten und nicht angemeldete Zugriffe bleiben ausgeschlossen.
- Offline-Schreibvorgänge, Pending-Sync und Batch-Schreibvorgänge aus der Altanwendung wurden bewusst noch nicht übernommen.
  Die Offline-App-Shell aller vier PWA-Builds bleibt davon getrennt.
- Es gibt keine öffentliche Selbstregistrierung.

## Login und Benutzerberechtigungen

- Die Loginseite verwendet ein Formular mit Anmeldename und Passwort ohne Rollenauswahl. Master-, Office-, Filial- und
  Mitarbeiter-Build ergänzen den eingegebenen Namensbestandteil automatisch um ihr jeweiliges Rollensuffix und für Firebase Auth
  intern um `@pur-system.invalid`. Die allgemeine Entwicklungsumgebung erwartet weiterhin den vollständigen Anmeldenamen.
- Der neue Loginablauf ist technisch umgesetzt und mit den neu angelegten Rollen- und Hostingvarianten erfolgreich geprüft. Die
  bisherigen Testkonten werden bewusst nicht migriert; ein neuer Master und alle weiteren Zugänge werden nach dem neuen Modell
  angelegt.
- Benutzerprofile werden aus `benutzerprofil/{uid}` geladen. Das eigene Profil wird zusätzlich während der gesamten
  Auth-Sitzung in Echtzeit beobachtet. Der Listener wird bei Abmeldung oder Benutzerwechsel entfernt und nach einem Offline-Start
  bei der nächsten Serververbindung aktualisiert. Aktive Master dürfen die ausdrücklich bearbeitbaren Felder vorhandener Profile
  direkt aktualisieren.
- Die Anlage von Auth-Konto und Profil bleibt im Backend umgesetzt. E-Mail-Adresse, Passwort und Firebase-Auth-Status werden durch
  die clientseitige Profilbearbeitung nicht verändert.
- Benutzerprofile unterstützen `userRole` mit `filiale`, `office`, `master` oder `mitarbeiter`. Die vierte Rolle ist damit
  sprachlich vom fachlichen Mitarbeiterdatensatz abgegrenzt.
- Die zentralen Utilities für technische Anmeldedaten normalisieren Leerzeichen als Punkte, erhalten vorhandene Punkte und
  Bindestriche, bilden Anmeldenamen im Format `<normalisierter-name>-<rolle>` und ergänzen die gemeinsame Domain
  `@pur-system.invalid`. Das Profilmodell speichert den `anmeldename`; Benutzeranlage, Anmeldung, Benutzerverwaltung und
  Profilkarte verwenden den neuen Ablauf.
- Allgemeine Bereichsfreigaben richten sich nach `erlaubteBereiche`; Systemverwaltung erfordert zusätzlich `userRole: master`,
  Verwaltung zusätzlich `userRole: office` oder `userRole: master`.
- App-Routen sind mit `authGuard` geschützt.
- Bereichsrouten werden über `bereichGuard` und `data: { bereich: ... }` abgesichert.
- Sidebar-Navigation sowie Start- und Ausweichrouten verwenden dieselbe zentrale Rollen- und Bereichsauswertung. Die vorhandenen
  Routenguards bleiben die verbindliche Zugriffssicherung.
- Der `verwaltungGuard` schließt Filialkonten auch dann von `/verwaltung` aus, wenn deren Profil den Bereichsschlüssel fälschlich
  enthält.
- Firmen-/Filial-Zugriffe werden im Benutzerprofil als verschachtelte Map `Unternehmer-ID -> Firma-ID -> Filial-IDs` abgebildet.
- Firebase-Fehler werden benutzerfreundlich angezeigt.

## Systemverwaltung und Zugangsdaten

- Der Bereich Systemverwaltung ist im Client durch `erlaubteBereiche` und `userRole: master` geschützt.
- Verweigert ein Bereichs- oder Rollenguard eine Route, wird bevorzugt zum erlaubten Dashboard und andernfalls zum ersten für die
  Rolle tatsächlich erreichbaren Bereich umgeleitet. Ist kein Bereich erreichbar, führt die Ausweichnavigation zum Login.
- Geschützte Fachrouten prüfen nacheinander Firebase-Authentifizierung, Sitzungsinitialisierung, Bereichsfreigabe und
  gegebenenfalls die fachliche Rolle. Die Guards verwenden das zentral geladene Benutzerprofil und starten keine eigenen Profil-
  oder Stammdatenabfragen. Während der Initialisierung wartet die Navigation auf deren Abschluss.
- Schlägt ein zwingender Ladevorgang fehl, führt die Navigation innerhalb der App-Shell zur Route `/initialisierungsfehler` und
  erhält die ursprünglich angeforderte URL. Dort kann der Benutzer die Initialisierung wiederholen oder sich abmelden. Nach
  einer erfolgreichen Wiederholung wird die ursprüngliche Route geöffnet; die Fehlerroute selbst setzt nur eine
  Firebase-Anmeldung voraus und erzeugt deshalb keine Initialisierungsschleife.
- Datenstruktur-Anlage und Benutzerverwaltung besitzen getrennte Unterrouten mit eigenen Toolbar-Titeln. Der bisherige gemeinsame
  Seitencontainer wurde entfernt; die `BenutzerPage` enthält Benutzeranlage und Bearbeitung vorhandener Benutzerprofile.
- Das Formular gliedert sich in Zugangsdaten, erlaubte Bereiche und Datenzugriff. Alle Gruppen verwenden `div`-Elemente mit
  sichtbaren Überschriften, ohne `role="group"`, `aria-label` oder `aria-labelledby`, statt `fieldset`/`legend`. Die
  `h2`-Überschriften werden zentral über `pur-form__group-titel` in `forms.scss` gestaltet. Zugangsdaten enthalten Anzeigename,
  Benutzerrolle, den automatisch gebildeten und nicht bearbeitbaren Anmeldenamen sowie das Passwort. Die technische
  Firebase-Adresse wird bei der Anlage nicht angezeigt.
- Der Master vergibt das Anfangspasswort ausschließlich selbst: ein Feld mit Ein-/Ausblendfunktion und dem Label „Passwort min. 8
  Zeichen“. Es gibt weder Passwortbestätigung bei der Anlage noch eine Variante zur erstmaligen Passwortvergabe durch den
  Benutzer.
- Pflichtfelder, ein technisch nutzbarer Anzeigename, Passwortlänge und mindestens ein erlaubter Bereich werden clientseitig
  validiert.
- `zugangsdaten` ist ein lokaler CSS-Container. Das bestehende `pur-form--grid` zeigt zwei Spalten, bei maximal 600 Pixel
  Containerbreite eine Spalte. `pur-form__row` verwendet standardmäßig Flex mit Umbruch; die Bereiche-Checkboxen umbrechen nach
  verfügbarem Platz. Der Aktionsbutton ist rechts ausgerichtet.
- Gültige Formulare mit gültiger Datenzugriffsauswahl können abgesendet werden. Während der Anlage ist das gesamte Reactive Form
  deaktiviert; `inert` sperrt zusätzlich die eigenständig verwaltete Datenzugriffsauswahl und weitere Formularaktionen. Der
  Submit-Handler verhindert weiterhin doppelte Aufrufe. Nach Erfolg werden Formular, Auswahl und der Absendezustand der
  FormGroupDirective zurückgesetzt; leere Pflichtfelder zeigen dadurch keine Fehler. Nach Erfolg oder Fehler wird das Formular
  wieder aktiviert. Erfolgs- und Fehlermeldungen werden beim Start einer neuen Aktion sowie beim Verlassen der Seite
  zurückgesetzt; bei Fehlern bleiben die Eingaben erhalten.
- Die Benutzerauswahl zeigt Anzeigename und Rollenbezeichnung. Im Bearbeitungsdialog bleiben Anmeldename und technische
  Firebase-Adresse einsehbar; die Profilkarte der App-Shell zeigt unter dem Anzeigenamen den Anmeldenamen. Der
  Bearbeitungsdialog vergleicht das normalisierte Profil einschließlich der außerhalb des Reactive Forms verwalteten
  Datenzugriffszuordnungen mit dem Ausgangszustand. Ohne fachliche Änderung bleibt die Speicheraktion deaktiviert und es wird
  keine Firestore-Anfrage ausgelöst.
- Die Rolle `mitarbeiter` kann in der Benutzeranlage mit der Anzeige „Mitarbeiter“ ausgewählt werden. Der Master weist ihre
  `erlaubteBereiche` über dieselben Checkboxen wie bei den bestehenden Rollen zu. Zusätzlich wählt er genau einen Unternehmer,
  eine Firma und einen aktiven, noch nicht verknüpften Firma-Mitarbeiter aus. Eine Filialauswahl wird dabei nicht angezeigt. Das
  Profil erhält genau eine Firma mit leerer Filialliste in `zugriffe` sowie deren `firmaMitarbeiterId`. Beim Rollenwechsel werden
  zuvor ausgewählte fachliche Datenzugriffe und der Firma-Mitarbeiter entfernt; die gewählten Bereiche bleiben erhalten.
- Vorhandene Profile von Mitarbeiterzugängen zeigen ihre Rolle in der Benutzerverwaltung korrekt an. Ihre Bereichsfreigaben können
  durch einen Master bearbeitet werden, ihre bestehende Mitarbeiterzuordnung bleibt unverändert und ihr Aktivstatus kann
  weiterhin geändert werden.

## Mitarbeiterrolle und Mitarbeiter-App

- Die eigenständige vierte Auth-Rolle `mitarbeiter` ist im Benutzerprofil, in der Benutzeranlage, in der Profilbearbeitung, in der
  Callable Function und in den Firestore Rules umgesetzt.
- Ein aktiver Master kann einen Mitarbeiterzugang mit Anfangspasswort anlegen. Die bestehende sichere Kontoanlage aktiviert den
  Auth-Benutzer erst nach erfolgreichem Schreiben des Profils. Die Rolle wurde von `personal` zu `mitarbeiter` geändert und in
  Functions, Rules sowie allen Hosting-Builds deployed.
- Mitarbeiterzugänge erhalten die durch den Master ausgewählten `erlaubteBereiche` sowie genau einen Unternehmer und eine Firma
  mit leerer Filialliste in `zugriffe`. `firmaMitarbeiterId` verweist auf den fachlichen Mitarbeiterdatensatz; dieser speichert
  `benutzerUid` als Gegenreferenz. Beide Referenzen werden durch die Callable Function in einer Firestore-Transaktion gesetzt.
  Der Auth-Benutzer wird erst danach aktiviert. Fehler bereinigen eine möglicherweise angelegte Verknüpfung und das Auth-Konto.
- Anmeldung, Abmeldung und die vorhandene Passwortänderung werden wiederverwendet. Die Vergabe eines neuen vorläufigen Passworts
  durch einen Master ist noch nicht umgesetzt.
- Pur Mitarbeiter ist als installierbare, für Handys optimierte PWA mit eigener App-Shell und der Produktkennung „Pur Mitarbeiter“
  veröffentlicht. Installation und eigenständiger Start wurden auf Desktop und iPhone bestätigt.
- Die Hosting-Variante erzeugt keine zusätzliche Rollenbeschränkung. Navigation und Routenzugriff richten sich nach
  `erlaubteBereiche`; administrative Routen bleiben zusätzlich durch ihre vorhandenen Rollenguards geschützt.
- Der Begriff Mitarbeiter bezeichnet zwei technisch getrennte Konzepte, auch wenn beide dieselbe Person betreffen können: Der
  fachliche Mitarbeiterdatensatz beschreibt die beschäftigte Person mit Stammdaten, Filialzuordnungen und betrieblichem
  Filialzugang. Der persönliche Mitarbeiterzugang ist ein Firebase-Auth-Benutzer mit `userRole: mitarbeiter` für Pur
  Mitarbeiter.
  Er wird bei seiner Anlage eindeutig mit einem vorhandenen fachlichen Mitarbeiterdatensatz verknüpft, ist aber weder dessen
  Voraussetzung noch mit dem betrieblichen Filialzugang gleichzusetzen. Dienstplandaten, persönliche Aktionen und
  Push-Benachrichtigungen werden bei fachlichem Bedarf separat geplant. `erlaubteBereiche` steuert nur verfügbare App-Funktionen.
- Das fachliche Mitarbeiter-Domänenmodell und sein Datenzugriff sind lokal umgesetzt. Mitarbeiter liegen unter
  `unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiter/{mitarbeiterId}`. Der Service lädt, erstellt, aktualisiert und löscht
  Mitarbeiter. Geladene Einträge behalten ihre Unternehmer- und Firmen-ID als fachlichen Kontext.
- Der `MitarbeiterStore` hält mehrere Firmen-, Einzelfilial- und Mehrfilialkontexte gleichzeitig. Jeder Kontext besitzt eigene
  Lade-, Abschluss- und Fehlerzustände; dadurch bleibt auch ein vollständig geladenes leeres Ergebnis eindeutig. Identische
  laufende oder bereits geladene Kontexte werden nicht erneut geladen. Ein zentraler Sitzungsreset verwirft sämtliche
  Mitarbeiterkontexte und schützt vor der Übernahme veralteter Ladeergebnisse.
- Die produktiven Firestore Rules erlauben Office- und Filialkonten die vereinbarten Lese-, Anlage- und Aktualisierungszugriffe
  innerhalb ihres Firmen- beziehungsweise Filialbereichs. Filialkonten dürfen Mitarbeiter ihrer Firma lesen, laden mit ihrer
  Clientabfrage aber direkt nur Mitarbeiter der eigenen Filiale. Master erhalten vollständigen Zugriff auf Mitarbeiter aller
  Firmen; Mitarbeiterzugänge lesen alle Mitarbeiter ihrer zugewiesenen Firma. Diese Datenrechte gelten unabhängig von
  `erlaubteBereiche`. Die Löschmethode ist in Service und Store vorhanden; verknüpfte Mitarbeiter sind durch Rules vor Löschung
  geschützt. Der Aktivstatus fachlicher Mitarbeiter ist ein Soft Delete: Er begrenzt die Lese- und Bearbeitungsrechte nicht,
  und Office sowie Filiale können Mitarbeiter in ihrem erlaubten Bereich deaktivieren und wieder aktivieren. Eine Löschaktion
  in der Oberfläche ist noch nicht angebunden. Der am 28.09.2026 produktiv deployte Rules-Stand enthielt bereits die
  Firmenrechte des Mitarbeiterzugangs. Die danach lokal ergänzten Rechte für direkte Filialdokumente und die vereinfachten
  Mitarbeiterregeln sind getestet, aber noch nicht deployed.
- Die Mitarbeiterliste ist unter `/mitarbeiter/liste` umgesetzt. Sie verwendet Unternehmer und Firma aus dem zentralen
  `AppKontextStore` und besitzt keine eigene, davon unabhängige Auswahl. Ein Firmenwechsel in der Sidebar lädt automatisch den
  passenden Mitarbeiterkontext. Filialkonten bleiben unabhängig vom sichtbaren Arbeitskontext auf die eigene Filiale begrenzt.
  Der Wechsel zwischen Firmen entfernt andere geladene Sitzungskontexte nicht. Mitarbeiter werden als kompakte Cards mit Rolle,
  Aktivstatus und Anzahl der Filialzuordnungen dargestellt; Lade-, Fehler- und Leerzustände bleiben je Kontext unterscheidbar.
- Eine Hinzufügen-Card öffnet den Anlagedialog; die Bearbeitungsaktion einer Mitarbeiter-Card öffnet den getrennten
  Bearbeitungsdialog. Beide Reactive Forms erfassen Vorname, Nachname, optionale Adress- und Kontaktdaten, die betriebliche Rolle
  und mindestens eine verpflichtende Filialzuordnung. Ein Geschlecht wird nicht erfasst oder gespeichert. Der Anzeigename des
  Firestore-Dokuments wird automatisch aus Vor- und Nachname gebildet und bei Namensänderungen aktualisiert. Geburtstag, Telefon
  und Webseite sind derzeit in der Oberfläche ausgeblendet; bereits gespeicherte Werte bleiben beim Bearbeiten erhalten. Der
  Bearbeitungsdialog ergänzt den Aktivstatus und zeigt Unternehmer, Firma sowie Mitarbeiter-ID unveränderlich an. Bereits
  vorhandene, für den Bearbeiter nicht sichtbare Filialzuordnungen erfüllen diese Pflicht weiterhin. Vorname und Nachname,
  E-Mail-Adresse und Mobilnummer sowie Rolle und Filialauswahl werden auf breiten Dialogen jeweils als 50/50-Zeile dargestellt
  und auf kleinen Viewports untereinander angeordnet.
- Vor dem Öffnen und erneut vor dem Speichern wird der aktuelle Verwaltungszugriff auf die Firma geprüft. Während eines
  Schreibvorgangs sind Formular und Aktionen deaktiviert. Anlage und Aktualisierung erscheinen durch die Store-Aktualisierung
  ohne erneutes Laden in der Liste; bei Fehlern bleiben die Eingaben erhalten. Der Mitarbeiter-Bearbeitungsdialog vergleicht den
  aktuellen Formularzustand per `JSON.stringify()` mit seinem Ausgangszustand und verhindert ohne Änderung sowohl die
  Aktivierung des Speicherbuttons als auch den Firestore-Aufruf.
- In den Mitarbeiterdialogen bleibt die Filial-Mehrfachauswahl für Master und Office sichtbar. Bei Filialkonten wird sie
  ausgeblendet, weil deren eigene Filiale bereits eindeutig vorgegeben ist. Bereits vorhandene, für das aktuelle Konto nicht
  zugängliche Filialzuordnungen bleiben beim Speichern unverändert; die lokalen Firestore Rules erzwingen dieselbe Begrenzung.
- Filialprofile müssen bei Anlage und Bearbeitung genau einen Unternehmer, eine Firma und eine Filiale enthalten. Filialkonten
  legen Mitarbeiter nur mit der eigenen Filial-ID an und behalten diese beim Bearbeiten verpflichtend bei.

## Datenstruktur-Löschung

- Ein aktiver Master kann Unternehmer, Firmen und Filialen über Service- und Store-Methoden löschen. Eine sichtbare UI-Aktion ist
  noch nicht angebunden.
- Der Client besitzt kein direktes Firestore-Löschrecht. Die geschützte Callable Function `deleteStruktureintrag` prüft Rolle,
  Dokumentpfad und Referenzen und löscht den vollständigen Strukturzweig anschließend rekursiv.
- Referenzen aus Benutzerprofilen verhindern jede betroffene Löschung. Eine Filiale wird außerdem nicht gelöscht, solange sie in
  `filialIds` eines fachlichen Mitarbeiters verwendet wird.

## Datenstruktur-Anlage

- Die Systemverwaltungsseite enthält einen linearen Angular-Material-Stepper für die hierarchische Anlage von Unternehmer, Firma
  und Filiale.
- Schritt 1 lädt alle Unternehmer aus `unternehmer`, erlaubt die Auswahl eines vorhandenen Eintrags und öffnet für die Neuanlage
  einen Material-Dialog.
- Der Unternehmerdialog erfasst einen Anzeigenamen sowie die eingebettete Person mit Vorname und Nachname. Adresse und
  Kontaktdaten sind optional; vollständig leere Adressen werden nicht gespeichert, teilweise ausgefüllte Adressen nur mit den
  vorhandenen Feldern. Die fortlaufende Unternehmernummer wird aus der vollständig geladenen Store-Liste mit
  `max(nummer) + 1` bestimmt.
- Neue Unternehmer werden durch einen aktiven Master direkt unter `unternehmer/{unternehmerId}` in Firestore gespeichert, in die
  sortierte Store-Liste übernommen und anschließend im Stepper ausgewählt.
- Schritt 2 lädt die Firmen des ausgewählten Unternehmers, erlaubt die Auswahl eines vorhandenen Eintrags und öffnet für die
  Neuanlage einen Material-Dialog.
- Der Firmendialog erfasst getrennt den kurzen `anzeigename` für Auswahlen und den vollständigen `firmenname` sowie die Adresse
  und optionale Kontaktdaten. Die fortlaufende Firmennummer wird innerhalb des Unternehmers aus der vollständig geladenen
  Store-Liste mit `max(nummer) + 1` bestimmt.
- Neue Firmen werden direkt unter `unternehmer/{unternehmerId}/firma/{firmaId}` gespeichert, in die sortierte Firmenliste
  übernommen und anschließend im Stepper ausgewählt. Ein Unternehmerwechsel setzt Firma und Filiale zurück und lädt den passenden
  Firmenbestand.
- Schritt 3 lädt die Filialen der ausgewählten Firma und öffnet für die Neuanlage einen Material-Dialog. Eine Auswahl bereits
  vorhandener Filialen ist in diesem reinen Anlageschritt bewusst nicht vorgesehen.
- Der Filialdialog erfasst getrennt den kurzen `anzeigename` für Auswahlen und den vollständigen `filialname` sowie eine optionale,
  teilweise Adresse und optionale Kontaktdaten. Die fortlaufende Filialnummer wird innerhalb der Firma aus der vollständig
  geladenen Store-Liste mit
  `max(nummer) + 1` bestimmt.
- Neue Filialen werden direkt unter `unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialeId}` gespeichert, in die
  sortierte Filialliste übernommen und in der Hierarchie-Zusammenfassung angezeigt. Ein Unternehmer- oder Firmenwechsel setzt die
  abhängige Filiale zurück und lädt den passenden Filialbestand.
- Pflichtfelder und vollständig geladene Listen steuern die Zurück-/Weiter-Navigation sowie die Freigabe der jeweiligen
  Anlagedialoge.
- Bis 720 Pixel wechselt der Stepper in die vertikale Ausrichtung.
- Unternehmer, Firma und Filiale werden schrittweise direkt gespeichert; ein zusätzlicher abschließender Sammel-Speicherbutton ist
  deshalb nicht erforderlich.
- Der vollständige Anlageablauf wurde vom Benutzer am 22.09.2026 gegen echtes Firestore bestätigt: Unternehmer, Firma und Filiale
  wurden unter dem vorgesehenen verschachtelten Pfad gespeichert, im UI korrekt zusammengefasst und nach einem Anwendungsneustart
  erneut geladen.

## Bestehende Benutzer verwalten

- Unter `systemverwaltung-page/benutzer-page/benutzer-verwaltung` ist die Bearbeitung vorhandener Benutzerprofile umgesetzt.
- Das Benutzer-Select verwendet die UID als Wert und zeigt Anzeigename sowie Rollenbezeichnung. Der Bearbeiten-Button wird erst
  nach einer gültigen Auswahl aktiviert.
- Es werden keine produktiven Mockprofile verwendet. Die für Master zentral geladenen Benutzerprofile werden direkt aus dem
  Sitzungsbestand verwendet; Leer-, Lade- und Fehlerzustände bleiben unterscheidbar.
- `IBenutzerProfilEintrag` bildet ein geladenes Profil mit seiner Dokument-ID als `uid` ab. `IBenutzerProfilAktualisierung`
  begrenzt die vorbereiteten Änderungen auf Anzeigename, Aktivstatus, erlaubte Bereiche und Datenzugriffe; Benutzerrolle,
  E-Mail-Adresse und Passwort sind ausgeschlossen.
- Der Bearbeitungsdialog verwendet die vorhandene Datenzugriffsauswahl mit rollenabhängiger Validierung. Erfolgreiche
  Aktualisierungen setzen `aktualisiertAm` serverseitig und werden ohne erneutes Laden in den Stammdaten- und Verwaltungsbestand
  übernommen.
- In Benutzeranlage und Bearbeitungsdialog werden die optionalen Bereiche gemäß App-Bereich-Matrix rollenabhängig als Checkboxen
  angezeigt. `dashboard` wird für jede Rolle verbindlich ergänzt; `systemverwaltung` wird ausschließlich für Master ergänzt und
  bei allen anderen Rollen entfernt. Die Callable Function ergänzt bei der Anlage nur diese Pflichtbereiche und übernimmt die
  optionalen Bereiche aus der Clientauswahl. Ein gemeinsamer Frontend-Helfer normalisiert die Bereiche beim Laden sowie vor einer
  Profilaktualisierung. Die Firestore Rules leiten aus `erlaubteBereiche` keine Datenrechte oder rollenabhängigen
  Bereichskombinationen ab. Die vorhandenen Rollen-Guards bleiben die funktionale Zugriffssicherung.
- Das eigene Masterprofil kann nicht deaktiviert werden. Die Benutzerrolle ist für sämtliche Profile unveränderlich. Dieser
  Selbstschutz sowie die weiteren unveränderlichen Profilfelder sind zusätzlich durch Firestore Rules abgesichert.
- Änderungen am aktuell angemeldeten Profil werden über den Echtzeit-Listener unmittelbar in den lokalen Benutzer-Store
  übernommen. Bei einer Deaktivierung setzt der `AppSitzungsInitService` die sitzungsbezogenen Stammdaten zurück und der
  `GlobalBannerService` zeigt unter der Toolbar den nicht ausblendbaren Hinweis „Dieses Profil ist inaktiv. Bitte wende dich an
  einen Administrator.“. Ein
  Listenerfehler verändert den zuletzt bestätigten Aktivstatus nicht. Es erfolgt keine automatische Abmeldung; die vorhandenen
  Guards sichern neue fachliche Navigationen weiterhin ab, während die authentifizierte Passwortseite erreichbar bleibt.

## Firmen- und Filialverwaltung

- Unter `/verwaltung` ist eine eigenständige Seite für die Bearbeitung von Firmen- und Filialstammdaten angelegt. Die Route
  erfordert den Bereich `verwaltung` und zusätzlich die Rolle Office oder Master; Filialkonten werden unabhängig vom
  Bereichsschlüssel ausgeschlossen.
- Master wählen Unternehmer, Firma und Filiale über abhängige Material-Selects. Für Office wird der einzige zugeordnete
  Unternehmer automatisch gewählt und nicht als eigene Auswahl angezeigt; anschließend stehen die erlaubten Firmen und Filialen
  zur Auswahl. Ein Unternehmerwechsel setzt Firma und Filiale zurück; ein Firmenwechsel setzt die Filiale zurück.
- Der seitenbezogene `VerwaltungStore` verwaltet die Listen, Auswahlen sowie getrennte Lade-, Leer- und Fehlerzustände und ist an
  die Store-Snapshot-Ausgabe angebunden.
- Office-Konten laden bei der Sitzungsinitialisierung ausschließlich die im Benutzerprofil unter `zugriffe` enthaltenen
  Unternehmer-, Firmen- und Filialdokumente über ihre vollständigen Dokumentpfade. Es werden für Office keine unbeschränkten
  Collection-Abfragen ausgeführt.
- Masterkonten besitzen keine erforderliche Zugriffszuordnung und laden bei der Sitzungsinitialisierung die vollständige
  Hierarchie sowie alle Benutzerprofile.
- Die Auswahl verwendet anschließend den zentralen Sitzungsbestand. Ausgewählte Firmen und Filialen können über getrennte
  Material-Dialoge bearbeitet werden; sie umfassen Anzeigename, Firmen- beziehungsweise Filialname, optionale Adressfelder und
  optionale Kontaktdaten.
- Dokument-ID, Nummer, Aktivstatus und Hierarchiepfad bleiben unverändert. `FirmaService` und `FilialeService` speichern
  ausschließlich die bearbeitbaren Felder und setzen `aktualisiertAm` mit einem Server-Zeitstempel.
- Nach erfolgreichem Speichern werden Verwaltungs- und Stammdatenbestand unmittelbar aktualisiert. Eine weitere Firestore-Abfrage
  ist nicht erforderlich.

## Globaler Aktivitätsindikator

- Der globale `LoadingService` zählt parallele Lese- und Schreibvorgänge getrennt und blendet den Aktivitätsindikator erst nach
  Abschluss des letzten registrierten Vorgangs aus.
- Die App-Toolbar zeigt während aktiver Lese- oder Schreibvorgänge eine schmale unbestimmte Material-Progress-Bar an ihrem unteren
  Rand. Ihre zugängliche Beschriftung unterscheidet Laden, Speichern und gleichzeitig laufende Vorgänge.
- Die aktuellen Firestore-Lesevorgänge für Benutzerprofile, Unternehmer, Firmen und Filialen werden im `FirestoreDbService`
  zentral an die Ladeanzeige angebunden. Damit werden auch die davon abhängigen Datenzugriffslisten und Verwaltungslisten erfasst.
- Das Anlegen und Aktualisieren von Firestore-Dokumenten sowie die Benutzeranlage über die Callable Function werden zentral als
  Schreibvorgänge registriert.
- Seiten zeigen keine zusätzlichen allgemeinen Ladetexte mehr. Fachliche Fehler- und Leerzustände bleiben direkt im jeweiligen
  Seitenbereich sichtbar.

## Netzwerkstatus

- Der `NetzwerkStatusService` berücksichtigt zunächst `navigator.onLine` und prüft zusätzlich die Erreichbarkeit der aktuellen
  Hosting-Seite über einen ungecachten Aufruf von `/health.json`.
- Die Health-Prüfung läuft beim Start, nach den Browser-Ereignissen `online` und `offline` sowie alle 30 Sekunden. Ein Aufruf wird
  nach drei Sekunden abgebrochen und dann als offline gewertet.
- Die Datei `health.json` wird in allen vier Auslieferungsvarianten bereitgestellt und von Firebase Hosting ausdrücklich mit
  `Cache-Control: no-store` ausgeliefert. Der Angular Service Worker nimmt sie nicht in seinen Ressourcen-Cache auf.
- Die Prüfung bestätigt die Erreichbarkeit der Hosting-Seite, nicht die Verfügbarkeit einzelner Firebase-Dienste. Fehler von
  Auth, Firestore, Functions oder Storage werden weiterhin durch den jeweiligen Dienstaufruf behandelt.
- `assertOnline()` bricht verbindungsabhängige Aktionen anhand des zuletzt bestätigten Netzwerkstatus mit einem einheitlichen
  Offline-Fehler ab. Die Toolbar zeigt einen Offline-Status und eine zeitlich begrenzte Wieder-online-Meldung an.

## Datenzugriff-Auswahl mit Firebase

- Die wiederverwendbare Component liegt unter `src/app/components/data-selectors/datenzugriff-selector`; ihre Auswahlmodelle
  liegen in `src/app/commons/models/domain/datenzugriff.ts`.
- Der `AppKontextSelector` liegt unter `src/app/components/data-selectors/app-kontext-selector`, verbindet den globalen
  `AppKontextStore` mit der Sidebar und setzt sich aus internen Unternehmer-, Firmen- und Filial-Selektoren zusammen. Die drei
  Unterkomponenten liegen in eigenen Unterordnern und werden außerhalb des `AppKontextSelector` nicht direkt verwendet. Über
  eine typisierte Konfiguration unterstützt der Wrapper je Selektor die Modi `hidden`, `readonly` und `editable`. Die Sidebar
  ermittelt die Konfiguration zentral aus Benutzerrolle und aktivem `data.bereich` der Route. Für Master sind Unternehmer und
  Firma in allen Fachbereichen veränderbar; die Filiale ist nur im Mitarbeiterbereich sichtbar und veränderbar. Noch offene
  Rollenkonfigurationen verwenden bis zu ihrer Festlegung vollständig verborgene Selektoren.
- Der `MitarbeiterFilter` liegt unter `src/app/components/data-filters/mitarbeiter-filter`. Er zeigt Vor- und Nachname an, gibt
  den ausgewählten vollständigen Mitarbeiter zurück, ist vollständig getestet und noch nicht in eine Fachseite eingebunden.
- Die Systemverwaltungsseite lädt Unternehmer aus `unternehmer`, Firmen aus `firma` und Filialen aus `filiale`. Die produktiven
  Mock-Daten wurden entfernt. `UnternehmerService`, `FirmaService` und `FilialeService` kapseln Laden und Anlegen ihrer
  vollständigen Domäneneinträge. Das gemeinsame Datenzugriff-Auswahlmodell und die Firestore-Dokumente verwenden auf allen Ebenen
  einheitlich `anzeigename`; `DatenzugriffService` bildet alle drei Domäneneinträge auf kompakte Auswahleinträge ab. Fehlende
  Anzeigenamen werden durch die Dokument-ID ersetzt.
- Die Gruppe Datenzugriff verwendet einen `div` mit sichtbarer Überschrift statt eines `fieldset`: In der Browser-Nachstellung
  kollabierte ein darin verschachtelter Größencontainer beim Einblenden von Meldungen. Die Container-Abfrage der
  wiederverwendbaren Component bleibt erhalten; die Korrektur wurde ein- und dreispaltig geprüft.
- Drei Material-Selects bilden Unternehmer -> Firmen -> Filialen ab. Ohne passende übergeordnete Auswahl beziehungsweise
  verfügbare Optionen sind nachgelagerte Selects deaktiviert.
- Die Inputs `unternehmerMehrfach`, `firmenMehrfach` und `filialenMehrfach` sind standardmäßig alle `false`. Die
  Systemverwaltungsseite erzeugt je Rolle eigene Komponenteninstanzen mit festen Modi: Filiale `false`, `false`, `false`; Office
  `false`, `true`, `true`; Master ohne Auswahlkomponente. Rollenwechsel setzt die Zuordnungen zurück, ohne den Auswahlmodus einer
  bestehenden Instanz zu ändern.
- Firmen erhalten nur dann Unternehmergruppen, wenn `unternehmerMehrfach` aktiv ist und mehr als ein Unternehmer ausgewählt wurde.
  Filialen erhalten nur dann Firmengruppen, wenn `firmenMehrfach` aktiv ist und mehr als eine Firma ausgewählt wurde.
- Bei mehreren ausgewählten Einträgen erscheint die Anzahl direkt im jeweiligen Select. Hints und die separate Auswahlstatus-Zeile
  wurden entfernt.
- Interne zusammengesetzte Auswahlschlüssel erhalten die Unternehmer-/Firmenzuordnung auch bei gleichen untergeordneten IDs. Diese
  Schlüssel sind kein gespeichertes Berechtigungsmodell.
- Abgewählte Unternehmer oder Firmen verlieren ihre abhängige Auswahl; andere Auswahlen bleiben bestehen. Die Auswahlmodi werden
  beim Einbinden festgelegt und während der Lebensdauer der Component nicht umgeschaltet; je Ebene gibt es ein Select mit
  gebundenem `multiple`.
- Die Component erhält Daten und Auswahl vom `BenutzerVerwaltungStore` über die Systemverwaltungsseite. Model-Inputs melden
  Auswahlereignisse zurück. Der Store lädt abhängige Listen, speichert sie nach vollständigem Pfad zwischen und bereinigt
  abhängige Auswahlen.
- Listen haben eigene Lade-, Leer- und Fehlerzustände mit Wiederholungsmöglichkeit. Laufende Abfragen werden je Pfad
  zusammengefasst; verspätete Antworten stellen keine abgewählte Auswahl wieder her.
- Der Anlage-Payload wird aus der Store-Auswahl als verschachtelte Zugriffs-Map erzeugt; das bisherige `zugriffe`-FormArray wurde
  entfernt.
- Jeder ausgewählte Unternehmer benötigt mindestens eine Firma, jede ausgewählte Firma mindestens eine Filiale. Laufende Abfragen
  und Ladefehler verhindern die Freigabe der Anlagedaten. Office-/Filialkonten benötigen mindestens eine vollständige Zuordnung.
  Eine komplett leere Auswahl ist bei der Anlage nur für Master erlaubt; Formular und Backend prüfen diese Bedingung.
- Die Datenberechtigungshelfer gewähren aktiven Mastern uneingeschränkten Firmen-/Filial-Lesezugriff; für Office/Filiale prüfen
  sie Unternehmer, Firma und gegebenenfalls Filiale direkt in der verschachtelten Map. Alte Array-Zugriffe werden beim Laden auf
  `{}` normalisiert und gewähren keine Datenrechte. Das aktuelle Masterprofil liegt unter `benutzerprofil/{uid}` und verwendet die
  vereinfachte Zugriffsstruktur.

## Backend und Passwortänderung

- Store und Service übergeben Namensbestandteil, Anzeigename, Rolle, Anfangspasswort, Bereiche und Datenzugriffe an die Callable
  Function `createBenutzer`. Die Function normalisiert den Namensbestandteil erneut und erzeugt daraus Anmeldename und technische
  Firebase-Adresse verbindlich. Eine gültige Benutzeranlage kann direkt über das Formular gestartet werden; während eines
  laufenden Aufrufs werden weitere Aufrufe verhindert.
- Der `BenutzerVerwaltungService` erzeugt und startet die Callable Function innerhalb von `runInInjectionContext`, damit
  AngularFire-Aufrufe korrekt im Angular-Injection-Kontext ausgeführt werden.
- Die Function prüft Anmeldung, aktives Profil und `userRole: master` serverseitig und legt per Admin SDK Auth-Benutzer und
  `benutzerprofil/{uid}` an. Die Sitzung des Masters bleibt erhalten.
- Die Function normalisiert `erlaubteBereiche` unabhängig vom Client: `dashboard` wird immer gespeichert,
  `systemverwaltung` ausschließlich für Master. Bei Änderungen bestehender Profile stellt der Client die Pflichtbereiche
  wieder her; die Rules verwenden `erlaubteBereiche` nicht als Datenberechtigung. Der bisherige produktive Stand wird durch die
  lokalen Änderungen abgelöst.
- Das Backend verlangt für jeden Zugriff eine Unternehmer-ID und prüft vor der Auth-Anlage die Existenz von Unternehmer, Firma und
  Filialen unter ihren vollständigen Pfaden. Fehlende Dokumente, ungültige IDs oder fehlgeschlagene Prüfabfragen brechen die
  Anlage ab. Doppelte Firmenzugriffe werden nur innerhalb desselben Unternehmers zusammengeführt.
- Das Anfangspasswort wird an Firebase Authentication übermittelt und nicht in Firestore gespeichert.
- Auth-Konten werden mit `disabled: true` angelegt. Erst nach bestätigtem Speichern des Profils wird das Konto aktiviert. Ein
  fehlgeschlagener Profil-Schreibvorgang führt nie zur Aktivierung; das deaktivierte Konto wird nach Möglichkeit gelöscht.
- Bei einem Aktivierungsfehler (auch unklarem Timeout-Ergebnis) versucht das Backend unabhängig voneinander Auth-Deaktivierung,
  Profil-Deaktivierung und Auth-Löschung. Das Profil wird nicht gelöscht: Bereits ausgestellte Tokens dürfen nicht auf die
  Legacy-Regel für Konten ohne Profil zurückfallen. Scheitert eine Bereinigung, wird keine erfolgreiche Rückabwicklung behauptet;
  UID und fehlgeschlagener Schritt werden serverseitig protokolliert.
- Manuelle Nachbearbeitung: UID aus dem Fehlerlog prüfen, eventuell vorhandenes Auth-Konto deaktivieren/entfernen und vorhandenes
  Profil auf `aktiv: false` setzen. Das Profil als Sperrdokument erhalten. Wenn mehrere externe Aufrufe scheitern, ist eine
  vollständige automatische Bereinigung nicht garantiert; die Fehlermeldung fordert die Administratorprüfung an.
- Angemeldete Benutzer können ihr Passwort nach erneuter Authentifizierung über die Toolbar und `/passwort` ändern. Auf dieser
  separaten Seite werden neues Passwort und Bestätigung validiert; es gelten mindestens 8 Zeichen.
- Die Functions-Codebase `pur-system` nutzt Node.js 22 und die Region `europe-west1`.

## Rules und Deployment

- Das Firebase-Projekt `pur-system` verwendet getrennte Hosting-Sites für Master, Office, Filiale und Mitarbeiter. Die vier
  Produktionsbuilds sind als installierbare PWAs mit Angular Service Worker konfiguriert.
- Die Firebase-Hosting-Site `pur-master.web.app` wurde am 25.09.2026 angelegt. Hosting-Target, eigener Master-Build, Manifest und
  Deployment-Skript sind eingerichtet; die Site wurde am 26.09.2026 erstmals erfolgreich veröffentlicht.
- Die zusätzliche Firebase-Hosting-Site `pur-mitarbeiter.web.app` wurde am 25.09.2026 für die persönliche Mitarbeiter-PWA
  reserviert und erstmals erfolgreich veröffentlicht. Hosting-Target, eigener Build und Deployment-Skript sind eingerichtet.
- Die Hosting-Targets `master`, `office`, `filiale` und `mitarbeiter` verwenden getrennte Build-Verzeichnisse. Die fünf npm-Befehle
  für einzelne oder gemeinsame Hosting-Deployments verwenden zentral `scripts/deploy-hostings.sh`, bauen vor dem Deployment die
  ausgewählten Varianten und verlangen eine Bestätigung. `npm run deploy:pur-all` veröffentlicht ausschließlich die vier
  Hosting-Ziele; Firestore Rules und Functions bleiben davon unberührt.
- Master, Office, Filiale und Mitarbeiter wurden am 26.09.2026 mit ihren getrennten PWA-Builds erfolgreich auf die jeweils
  zugehörige Firebase-Hosting-Site veröffentlicht.
- Master-, Office-, Filial- und Mitarbeiter-Build verwenden jeweils eine eigene Produktkennung im Web-App-Manifest. Die
  vorhandenen PWA- und Maskable-Icons werden gemeinsam genutzt.
- Die neue Angular-Konfiguration `mitarbeiter` ergänzt die Office-Basiskonfiguration zur Kombination `office,mitarbeiter`. Sie erzeugt
  `dist/pur-mitarbeiter/browser` mit aktiviertem Angular Service Worker, eigenem Produktions-Environment und dem Manifest „Pur
  Mitarbeiter“. `npm run pwa:pur-mitarbeiter` stellt den Build lokal auf Port `8083` bereit.
- Das Hosting-Target `mitarbeiter` ist mit der Firebase-Site `pur-mitarbeiter` verbunden. Der Hosting-Block verwendet
  ausschließlich `dist/pur-mitarbeiter/browser`, eigene PWA-Cache-Header und das SPA-Rewrite. `build:mitarbeiter`,
  `pwa:pur-mitarbeiter` und `deploy:pur-mitarbeiter` sind eingerichtet; das Deploy-Skript nennt Projekt, Zieladresse und Service
  Worker vor der erforderlichen Bestätigung. Lokale Vorschau, Bestätigungsabbruch und echtes Deployment wurden erfolgreich
  geprüft.
- HTML und direkte SPA-Routen werden ohne Browser-Cache ausgeliefert. Manifest und Service-Worker-Steuerdateien bleiben ebenfalls
  kurzfristig aktualisierbar. Gehashte JavaScript- und CSS-Ressourcen erhalten einen langfristigen unveränderlichen Cache. Die
  produktiven Header wurden nach dem Mitarbeiter-Deployment für `/`, `/login`, Manifest, `ngsw.json`, `ngsw-worker.js` und eine
  gehashte Hauptdatei geprüft.
- Eine Übersicht der tatsächlich eingerichteten lokalen und produktiven Varianten steht in den
  [PWA-Konfigurationen](./matrix-pwa-konfigurationen.md). Die vorgesehene Verwendung und das fachliche
  Online-/Offline-Verhalten stehen in der [Cache- und Betriebsartenmatrix](./matrix-cache-strategien.md).
- Bei einer fehlerhaften PWA-Version wird ausschließlich die betroffene Hosting-Site in der Firebase Console auf die letzte
  funktionierende Veröffentlichung zurückgesetzt. Hilft dieses Rollback wegen eines fehlerhaften Service Workers nicht, wird als
  letzte Notfallmaßnahme für die betroffene Site der von Angular erzeugte `safety-worker.js` unter der bisherigen URL
  `ngsw-worker.js` ausgeliefert, bis die betroffenen Installationen den Service Worker deregistriert und ihre Angular-Caches
  entfernt haben. Anschließend werden Start, Updateverhalten und Service-Worker-Status der betroffenen PWA geprüft.

- Functions-Deployment für die rollenabhängige Validierung (Office mindestens eine, Filiale genau eine vollständige Zuordnung)
  wurde vom Benutzer bestätigt. Benutzeranlage, Anmeldung, Bereichsfreigabe, Systemverwaltungssperre, Passwortwechsel und erneute
  Anmeldung wurden anschließend bestätigt. Am 22.09.2026 wurden zusätzlich reale Office- und Filialkonten mit der neuen
  Unternehmer-/Firma-/Filiale-Hierarchie angelegt, ihre gespeicherten Profile geprüft und Anmeldung, erlaubte Bereiche sowie die
  Umleitung von `/systemverwaltung` erfolgreich bestätigt.

- Die vereinfachte Function ohne Zugriffsindex ist deployed (Benutzerbestätigung). Die sichere Kontoaktivierung bleibt erhalten.
- Lokal umgesetzt: Aktive Master lesen alle vorgesehenen Collections und legen fachliche Daten an oder aktualisieren sie. Direkte
  Löschungen neuer Strukturdatensätze sind gesperrt und erfolgen ausschließlich über die geschützte Callable Function.
- Aktive Office-/Filialprofile lesen nur zugeordnete Unternehmer-/Firmendokumente sowie freigegebene Filialen und deren
  Untercollections. Das eigene Profil bleibt auch für inaktive Konten lesbar. Aktive Office-Konten dürfen zugeordnete Firmen- und
  Filialdokumente vollständig aktualisieren, aber weder anlegen noch löschen und keine Filial-Untercollections beschreiben.
  Filialkonten bleiben vorerst rein lesend. Die aktualisierten Rules mit diesen Office-Schreibrechten wurden am 22.09.2026
  erfolgreich in `pur-system` deployed.
- Benutzeranlage speichert ausschließlich die validierte Zugriffs-Map. Die Rules prüfen Unternehmer-ID, Firma-ID und Filial-ID
  direkt in dieser Struktur; ein separater `zugriffsIndex` ist nicht mehr erforderlich.
- Altanwendung nutzt laut Benutzer ausschließlich Konten ohne `benutzerprofil`-Dokument. Diese behalten den bisherigen
  Lese-/Schreibzugriff außerhalb von `benutzerprofil` und `unternehmer`; Emulator-Tests sichern das ab. Fehlgeschlagene
  Kontoanlage darf kein nutzbares Auth-Konto ohne Profil hinterlassen (lokal durch deaktivierte Anlage abgesichert).
- Office-Queries müssen ihren erlaubten Datenraum eingrenzen. Filialkonten besitzen für die Mitarbeiter-Collection ihrer Firma
  Leserechte und laden die fachliche Mitarbeiterliste clientseitig direkt mit einem `array-contains`-Filter auf die eigene
  Filial-ID. Anlage und Bearbeitung bleiben auf Mitarbeiter dieser Filiale begrenzt.
- Neue Rules sind laut Benutzer produktiv; Lesen und Schreiben in der Altanwendung funktionieren weiterhin. Die sichere
  Kontoaktivierung ist ebenfalls deployed und die Formularsperre wurde entfernt. Ein reales Office-Testkonto konnte seine
  zugeordnete Firma und Filiale über die fachliche Verwaltungsoberfläche erfolgreich aktualisieren. Nicht zugeordnete Dokumente,
  Neuanlagen, Löschungen und Schreibzugriffe auf Filial-Untercollections werden durch Emulator-Tests abgelehnt.
- Die Rules für eingeschränkte Profilaktualisierungen und den Selbstschutz des eigenen Masterprofils wurden am 23.09.2026
  erfolgreich deployed. Die Profilbearbeitung und die bestehenden Office-Zugriffe wurden anschließend mit realen Testkonten
  erfolgreich geprüft.
- Die ursprüngliche Rolle `mitarbeiter` und ihre freie Bereichszuweisung sind in Function und Rules deployed. Die neue eindeutige
  Verknüpfung mit einem Firma-Mitarbeiter ist lokal umgesetzt. Die aktualisierten Rules erlauben die Bearbeitung von Anzeigename,
  Aktivstatus und Bereichen eines verknüpften Mitarbeiterprofils, verhindern aber Änderungen an `zugriffe` und
  `firmaMitarbeiterId` und gewähren Lesezugriff auf die zugeordnete Unternehmensstruktur sowie die Mitarbeiter der zugewiesenen
  Firma. Diese Rules-Änderung wurde am 28.09.2026 produktiv deployed und mit einem realen Mitarbeiterkonto geprüft.
- Die danach ergänzte Leseberechtigung des Mitarbeiterzugangs für direkte Filialdokumente seiner Firma ist lokal umgesetzt und
  durch Emulator-Tests abgesichert, aber noch nicht produktiv deployed. Filial-Untercollections und Schreibzugriffe bleiben
  gesperrt.
- Der Git-Push der aktuellen Änderungen ist kein Firebase-Deployment.

## Tests und Build

Am 04.10.2026 für den aktuellen Stand erfolgreich geprüft:

- 634 Frontend-Tests bestehen, einschließlich rollenbezogener flacher und verschachtelter Navigation, Bereichsfreigaben und
  konsistenter
  Guard-Ausweichnavigation, vereinfachter Anmeldung, Benutzeranlage und -darstellung, der Rolle `mitarbeiter`,
  PWA-Updatebehandlung, Netzwerkstatus, Store-Snapshots, Datenstruktur-Anlage, zentraler Stammdateninitialisierung sowie Firmen-,
  Filial- und Benutzerprofil-Bearbeitung, fachlichem Mitarbeiter-Service und -Store, Mitarbeiterlistenroute, Rollenprüfung und
  Mitarbeiter-Cards, Anlage- und Bearbeitungsdialogen, mehreren gleichzeitig gehaltenen Mitarbeiterkontexten,
  benutzerabhängigen Stammdatenladeplänen für alle vier Rollen, Echtzeitbeobachtung des eigenen Profils, zentralem
  Sitzungsstart mit Initialisierungszustand, wartender Navigation, Fehlerseite, Wiederholung und Rücknavigation sowie globalem
  Banner-Service, Inaktivhinweis, sichtbarer Anwendungsversion, allen vier Firestore-Lesestrategien, buildabhängiger Cache-Art,
  erzwungenem Server-Neuladen, Benutzertrennung sowie Unternehmer-, Firmen- und Filialmigration.
- Die rollenbezogene Navigation wurde zusätzlich manuell mit Tastatur, sichtbarem Fokus und zugänglichen Bezeichnungen geprüft.
- Datenstruktur-Anlage und Benutzerverwaltung wurden unter ihren getrennten Systemverwaltungsrouten auf Desktop und einem
  kleinen Viewport erfolgreich manuell geprüft.
- Die Echtzeitbeobachtung des eigenen Profils wurde manuell mit Deaktivierung, Neustart, Wiederverbindung und erneuter Aktivierung
  geprüft. Ein inaktives, weiterhin authentifiziertes Profil wird auf der Loginseite durch den globalen Banner kenntlich gemacht;
  nach erneuter Aktivierung wechselt die Anwendung selbstständig zum Dashboard.
- 70 Functions-Tests einschließlich technischer Anmeldedaten, doppelter Anmeldenamen, rekursiver Strukturlöschung, eindeutiger
  Mitarbeiterverknüpfung, Rückabwicklung, Rollenprüfung, Hierarchievalidierung und sicherer Kontoaktivierung.
- 42 Firestore-Emulator-Tests für die Begrenzung der Rolle `mitarbeiter`, unveränderliche Mitarbeiterzuordnungen, fachliche
  Mitarbeiterzugriffe einschließlich optionaler Master-CRUD-Rechte, eindeutige Filialprofile, direkte Strukturlöschsperren,
  bestehende Rollen, neue Hierarchie, ausdrücklich erlaubte Untercollections, filialgefilterte Mitarbeiterabfragen,
  Office-Aktualisierungen, Profil-Selbstschutz, unveränderliche Profilfelder, Ablehnung nicht aufgeführter Collections sowie die
  Trennung vom Legacy-Zugriff auf `purCustomers` sowie die alleinige Verwaltung der Migrationsstatus durch aktive Master.
- Master-, Office-, Filial- und Mitarbeiter-Produktionsbuild sind als vollständige PWA-Ausgaben konfiguriert. Sie enthalten das
  jeweils passende Manifest, zehn erreichbare App-Icons, lokale Roboto- und Material-Icon-Schriften, `ngsw.json`,
  `ngsw-worker.js` und die Ressourcengruppen `app`, `fonts` und `assets`. Die Builds benötigen in der Codex-Umgebung Zugriff
  außerhalb der Sandbox, weil der native `esbuild`-Prozess innerhalb der eingeschränkten Umgebung mit Exit-Code 134 beendet wird.
  Alle vier Produktionsbuilds sind für den aktuellen Stand erfolgreich. Das initiale Bundle liegt bei rund 1,66 MB und
  überschreitet damit das Warnlimit von 1,60 MB um rund 60 kB; das Fehlerlimit von 1,70 MB wird nicht überschritten.
- Rollenladepläne, Zustandswechsel, Benutzertrennung, Cache-Auswahl und Lesestrategien sind automatisiert geprüft. Die manuelle
  Abnahme mit realen Master-, Office-, Filial- und Mitarbeiterkonten war erfolgreich. Pur Filiale wurde zusätzlich mit
  persistentem Cache, Offline-Neustart, fehlendem Cache, verständlicher Fehleranzeige und erzwungenem Server-Neuladen geprüft.
  Auch der Wechsel zwischen zwei Benutzern übernahm keine Daten des vorherigen Sitzungskontexts. Umsetzungstodo 16 ist damit
  abgeschlossen.
- Die Mitarbeiter-App-Shell wurde lokal nach vollständigem Beenden des Webservers in Desktop- und mobiler Viewport-Größe
  erfolgreich aus dem Service-Worker-Cache neu geladen. Die veröffentlichte Login-Seite wurde ohne Browserfehler geladen. Pur
  Mitarbeiter wurde anschließend erfolgreich auf dem Desktop und auf einem physischen iPhone installiert und jeweils als
  eigenständige App geöffnet.

Der durchgängige Benutzeranlageablauf mit realen Daten wurde am 22.09.2026 für je ein Office- und Filialkonto bestätigt. Die
vollständige Hierarchie wurde gespeichert, beide Konten konnten sich anmelden und nur ihre erlaubten Bereiche verwenden; die
Systemverwaltungsroute blieb durch die Masterprüfung gesperrt. Am 23.09.2026 wurden zusätzlich die erfolgreiche Aktualisierung
einer zugeordneten Firma und Filiale mit einem realen Office-Testkonto sowie die Bearbeitung eines vorhandenen Benutzerprofils mit
einem realen Testkonto bestätigt. Am 25.09.2026 wurde ein realer Mitarbeiterzugang zunächst mit dem zwischenzeitlichen
`userRole: personal`, den Bereichen Dashboard und Schichtplan sowie leerer Zugriffs-Map angelegt. Anmeldung, Bereichsnavigation,
Deaktivierung und der Schutz vor unzulässigen Rollenänderungen wurden laut Benutzer erfolgreich geprüft. Anschließend wurde das
Profil zu `userRole: mitarbeiter` migriert, Functions, Rules und alle Hosting-Varianten wurden neu deployed und die Anmeldung
sowie Bereichsnavigation erneut erfolgreich geprüft.

Ebenfalls am 25.09.2026 wurden ein neuer Master und die weiteren Rollenkonten nach dem neuen Anmeldemodell angelegt.
Benutzeranlage, Anmeldung, Passwortänderung, Rollen- und Bereichsgrenzen sowie die vorgesehenen Office-, Filial- und
Mitarbeiter-Auslieferungsvarianten wurden laut Benutzer erfolgreich geprüft. Die bisherigen Testkonten werden nicht migriert. Die
übrigen Schreibgrenzen sind durch die erfolgreichen Firestore-Emulator-Tests abgesichert.

Am 04.10.2026 wurde eine vollständige Kundenmigration mit realen Legacy-Daten fachlich abgenommen. Unternehmer, Firmen,
Filialen und Mitarbeiter wurden in ihrer Abhängigkeitsreihenfolge migriert, mit den Quelldaten verglichen und erneut ausgeführt.
Die gespeicherten Ziel-ID-Zuordnungen wurden wiederverwendet, ausschließlich im Ziel vorhandene Dokumente blieben erhalten und
alle 15 geprüften Legacy-Mitarbeiter wurden erfolgreich übernommen. Das Umsetzungstodo zur Kundenmigration ist damit
abgeschlossen.

## Rollenpräzisierung: Umsetzung und offene Punkte

- Filialkonten werden genau einer Filiale zugeordnet. Einfachauswahl im UI sowie Seiten- und Backendvalidierung sind umgesetzt;
  mehrere Firmen oder Filialen werden für diese Rolle abgelehnt. Die neue serverseitige Begrenzung wurde laut Benutzer erfolgreich
  deployed.
- Office-Konten bleiben auf ausgewählte Firmen und ausdrücklich zugeordnete Filialen beschränkt; sie erhalten keinen globalen
  Lesezugriff. Eine Firmenfreigabe umfasst weder automatisch alle aktuellen noch zukünftige Filialen.
- Master benötigen keine Datenzuordnung und besitzen die in der Collection-Matrix ausdrücklich aufgeführten Rechte. Nicht
  aufgeführte Collections bleiben gesperrt. Die Datenzuordnung ist im Formular für Master ausgeblendet; das Formular sendet für
  Master eine leere Zugriffs-Map.
- Office-Konten dürfen zugeordnete Firmen- und Filialdokumente aktualisieren, jedoch nicht anlegen oder löschen. Schreibrechte für
  Filial-Untercollections sowie eigene Schreibrechte von Filialkonten werden erst zusammen mit den jeweiligen fachlichen
  Funktionen festgelegt und umgesetzt.

## Nächste sinnvolle Schritte

Die konkrete Arbeitsplanung steht in den [offenen Todos](./todo_next.md). Bereits abgeschlossene Aufgaben sind in den
[erledigten Todos](./todo_done.md) dokumentiert. Bewusst zurückgestellte Aufgaben stehen in den
[späteren Todos](./todo_spaeter.md).
