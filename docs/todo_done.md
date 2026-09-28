<!-- pur-system/docs/todo_done.md -->

# Erledigte Todos

## 1. Done Todo: App-Shell mit Sidebar und Toolbar anlegen

Ziel: Die App erhält eine Angular-Material-App-Shell mit Toolbar und Sidebar. Die Shell wird in `app-sidenav` und `app-toolbar`
unter `src/app/components/app-shell` aufgeteilt. Die Sidebar enthält die Hauptnavigation für Dashboard, Schichtplan und
Mitarbeiter.

Betroffene Dateien:

- src/app/app.ts
- src/app/app.html
- src/app/app.scss
- src/app/app.routes.ts
- src/app/app.spec.ts
- src/app/components/app-shell/app-sidenav/
- src/app/components/app-shell/app-toolbar/
- src/app/pages/dashboard-page/
- src/app/pages/schichtplan-page/
- src/app/pages/mitarbeiter-page/
- docs/projekt-stand.md

Schritte 1: Seiten und Routen

1. [x] `dashboard-page` unter `src/app/pages/dashboard-page` anlegen.
2. [x] `schichtplan-page` unter `src/app/pages/schichtplan-page` anlegen.
3. [x] `mitarbeiter-page` unter `src/app/pages/mitarbeiter-page` anlegen.
4. [x] Routen für `/dashboard`, `/schichtplan` und `/mitarbeiter` per `loadComponent` vorbereiten und `/` auf `/dashboard`
       weiterleiten.
5. [x] Tests für die Platzhalter-Seiten ergänzen.

Schritte 2: App-Shell-Components

1. [x] `app-sidenav` unter `src/app/components/app-shell/app-sidenav` anlegen.
2. [x] `app-toolbar` unter `src/app/components/app-shell/app-toolbar` anlegen.
3. [x] Sidebar-Navigation mit Links für Dashboard, Schichtplan und Mitarbeiter anlegen.
4. [x] Toolbar mit Menübutton und App-Titel anlegen.
5. [x] Tests für Sidebar und Toolbar ergänzen.

Schritte 3: App-Layout

1. [x] `app.ts`, `app.html` und `app.scss` auf ein Material-Sidenav-Layout umbauen.
2. [x] Responsive Verhalten für Desktop und kleinere Bildschirme vorbereiten.
3. [x] App-Test an das neue Layout anpassen.

Schritte 4: Abschluss

1. [x] `projekt-stand.md` nach Umsetzung aktualisieren.
2. [x] `todo_next.md` nach Umsetzung abhaken oder in erledigte Todos verschieben.
3. [x] `npm test` erfolgreich ausführen.
4. [x] `npm run build` erfolgreich ausführen.

Erledigt wenn:

- [x] Die App zeigt eine Material-Toolbar und eine Material-Sidebar.
- [x] Die Sidebar liegt in `app-sidenav`.
- [x] Die Toolbar liegt in `app-toolbar`.
- [x] Die Links Dashboard, Schichtplan und Mitarbeiter sind sichtbar.
- [x] Die Navigation funktioniert über Angular Routes.
- [x] Die echten Seiten liegen unter `src/app/pages`.
- [x] `npm test` läuft erfolgreich.
- [x] `npm run build` läuft erfolgreich.

## 2. Done Todo: Firebase-Grundlage einbinden

Ziel: Firebase und Firestore werden technisch in die Angular-App eingebunden. Login, Benutzerprofil und Berechtigungen werden noch
nicht umgesetzt, sondern erst im nächsten Todo vorbereitet.

Betroffene Dateien:

- package.json
- package-lock.json
- src/app/app.config.ts
- src/environments/environment.ts
- src/environments/environment.prod.ts
- src/environments/firebase-config.ts
- src/app/commons/tokens/firebase.tokens.ts
- src/app/services/firebase/
- docs/projekt-stand.md

Schritte 1: Dependencies und Konfiguration

1. [x] Firebase/AngularFire Dependencies installieren.
2. [x] Firebase-Konfiguration vorbereiten.
3. [x] Environment-Dateien für Firebase anlegen.
4. [x] Firebase-Konfiguration über `environment.firebase` bereitstellen.

Schritte 2: AngularFire Provider

1. [x] Firebase App Provider in `app.config.ts` einbinden.
2. [x] Auth Provider in `app.config.ts` einbinden.
3. [x] Firestore Provider in `app.config.ts` einbinden.
4. [x] Firestore mit lokalem Cache vorbereiten.

Schritte 3: Firebase-Struktur

1. [x] Tokens für Auth und Firestore anlegen.
2. [x] Firebase-nahe Service-Struktur unter `src/app/services/firebase` vorbereiten.
3. [x] Noch keine Login- oder Registrierungslogik umsetzen.

Schritte 4: Abschluss

1. [x] `projekt-stand.md` nach Umsetzung aktualisieren.
2. [x] `npm test` erfolgreich ausführen.
3. [x] `npm run build` erfolgreich ausführen.

Erledigt wenn:

- [x] Firebase und AngularFire sind installiert.
- [x] Firebase-Konfiguration liegt in den Environment-Dateien.
- [x] Firebase, Auth und Firestore werden in `app.config.ts` bereitgestellt.
- [x] Firebase Tokens sind vorbereitet.
- [x] Firebase-Service-Ordner ist vorbereitet.
- [x] Es gibt noch keine Registrierung in dieser App.
- [x] `npm test` läuft erfolgreich.
- [x] `npm run build` läuft erfolgreich.

## 3. Done Todo: Login und Benutzerberechtigungen vorbereiten

Ziel: Bestehende Firebase-Benutzer können sich anmelden. Registrierung erfolgt nicht in dieser App. Nach erfolgreichem Login wird
das vorhandene Benutzerprofil aus `benutzer/{uid}` gelesen. Das Profil enthält eine Benutzerrolle und steuert erlaubte
App-Bereiche sowie erlaubte Firmen-/Filial-Zugriffe. Die Rolle bleibt zusätzlich am Benutzer gespeichert; die Bereichsfreigaben
richten sich derzeit nach `erlaubteBereiche`.

Betroffene Dateien:

- package.json
- package-lock.json
- src/app/app.routes.ts
- src/app/app.ts
- src/app/guards/auth.guard.ts
- src/app/guards/bereich.guard.ts
- src/app/services/firebase/auth.service.ts
- src/app/services/domain/benutzer.service.ts
- src/app/stores/app/benutzer.store.ts
- src/app/commons/models/app/firebase-error.types.ts
- src/app/commons/models/domain/benutzer.ts
- src/app/commons/models/app/app-bereich.ts
- src/app/commons/utils/errors/firebase-error-message.ts
- src/app/pages/auth/login-page/
- docs/projekt-stand.md

Schritte 1: Auth-Service und Benutzer-State

1. [x] Benutzer-Domainmodell für vorhandene Benutzerprofile anlegen.
2. [x] App-Bereich-Typ für erlaubte Bereiche anlegen.
3. [x] Benutzerrollen `filiale`, `office` und `master` im Benutzerprofil abbilden.
4. [x] AuthService für Login, Logout und Auth-State erstellen.
5. [x] BenutzerService für lesenden Zugriff auf `benutzer/{uid}` erstellen.
6. [x] BenutzerStore mit `benutzerProfil`, `inProgress` und `error` anlegen.
7. [x] Benutzerprofil nach Login aus Firestore unter `benutzer/{uid}` lesen.
8. [x] Keine Registrierung und kein Anlegen von Benutzerprofilen in dieser App umsetzen.

Schritte 2: Login und Routing

1. [x] Loginseite mit E-Mail/Passwort-Formular erstellen.
2. [x] Formularvalidierung ergänzen.
3. [x] Loginseite in den Routes eintragen.
4. [x] AuthGuard für geschützte App-Routen anlegen.
5. [x] BereichGuard für `erlaubteBereiche` anlegen.
6. [x] Nach erfolgreichem Login zum Dashboard weiterleiten.
7. [x] Logout-Möglichkeit in der App-Shell vorbereiten.

Schritte 3: Berechtigungen und Datenzugriff

1. [x] Sidebar-Navigation auf `erlaubteBereiche` einschränken.
2. [x] Routen mit Bereich-Daten versehen, z. B. `data: { bereich: 'mitarbeiter' }`.
3. [x] Datenzugriff später über `zugriffe` mit `firmaId` und `filialIds` einschränken.
4. [x] Firestore Rules für serverseitige Absicherung einplanen.

Schritte 4: Fehler, Tests und Abschluss

1. [x] Firebase-Fehler benutzerfreundlich anzeigen.
2. [x] Tests für Service, Store, Guards und Loginformular ergänzen.
3. [x] `projekt-stand.md` nach Umsetzung aktualisieren.
4. [x] `npm test` erfolgreich ausführen.
5. [x] `npm run build` erfolgreich ausführen.

Erledigt wenn:

- [x] Bestehende Benutzer können sich mit E-Mail und Passwort einloggen.
- [x] Die App legt keine Benutzerprofile an.
- [x] Vorhandenes Benutzerprofil wird aus `benutzer/{uid}` gelesen.
- [x] Sidebar und Routen richten sich nach `erlaubteBereiche`.
- [x] Datenzugriff kann über `zugriffe` mit `firmaId` und `filialIds` eingeschränkt werden.
- [x] App-Routen sind für nicht angemeldete Benutzer geschützt.
- [x] Firebase-Fehler werden benutzerfreundlich angezeigt.
- [x] `npm test` läuft erfolgreich.
- [x] `npm run build` läuft erfolgreich.

## 4. Done Todo: Systemverwaltung

> **Status am 23.09.2026:** Die Systemverwaltungsseite enthält die Bereiche Datenstruktur anlegen, Benutzer anlegen und Benutzer
> verwalten. Die Datenstruktur-Anlage, Benutzeranlage und Bearbeitung bestehender Benutzerprofile sind abgeschlossen, deployed und
> mit realen Daten geprüft.

### 4.1 Datenstruktur anlegen

#### Ziel

Ein Master kann die Hierarchie Unternehmer, Firma und Filiale in einem dreistufigen Material-Stepper auswählen beziehungsweise neu
anlegen. Neu angelegte Einträge werden direkt in Firestore gespeichert, in den jeweiligen Store übernommen und für den nächsten
Schritt ausgewählt.

#### Betroffene Dateien

- src/app/commons/models/domain/adresse.ts
- src/app/commons/models/domain/kontakt.ts
- src/app/commons/models/domain/unternehmer.ts
- src/app/commons/models/domain/firma.ts
- src/app/commons/models/domain/filiale.ts
- src/app/services/domain/unternehmer.service.ts
- src/app/services/domain/firma.service.ts
- src/app/services/domain/filiale.service.ts
- src/app/stores/domain/unternehmer.store.ts
- src/app/stores/domain/firma.store.ts
- src/app/stores/domain/filiale.store.ts
- src/app/pages/systemverwaltung-page/datenstruktur-page/
- firestore.rules
- rules-tests/
- docs/projekt-stand.md

#### Schritt 1: Stepper und UI-Grundlage

- [x] Dreistufigen Material-Stepper für Unternehmer, Firma und Filiale anlegen.
- [x] Auswahl, vorbereitete Neuanlage, Navigation und Validierung darstellen.
- [x] Filialanlage und Hierarchie-Zusammenfassung als UI-Dummy darstellen.
- [x] Responsive horizontale und vertikale Ausrichtung umsetzen.
- [x] Manuelle Sichtprüfung des UI-Dummys abschließen.

#### Schritt 2: Unternehmer auswählen und anlegen

- [x] Gemeinsame Modelle `IAdresse` und `IKontakt` anlegen.
- [x] Unternehmermodell mit `anzeigename`, eingebetteter `IPerson` sowie Anlage-, Dokument-, Eintrags- und Ergebnis-Typen anlegen.
- [x] `UnternehmerService` und `UnternehmerStore` für Laden und Anlegen umsetzen.
- [x] Die nächste Unternehmernummer aus der vollständig geladenen Liste mit `max(nummer) + 1` bestimmen.
- [x] Neue Unternehmer unter `unternehmer/{unternehmerId}` mit automatischer Dokument-ID, `aktiv`, `erstelltAm` und
      `aktualisiertAm` speichern.
- [x] Unternehmerdialog mit Anzeigename, Vorname, Nachname, Adresse sowie optionaler E-Mail-Adresse und Telefonnummer umsetzen.
- [x] Pflichtfelder, E-Mail-Adresse und ausschließlich aus Leerzeichen bestehende Eingaben validieren.
- [x] Vorhandene Unternehmer über ein Select auswählen und den Dialog über `Unternehmer anlegen` öffnen.
- [x] Neu angelegte Unternehmer in die Store-Liste übernehmen und automatisch auswählen.
- [x] Schritt 2 erst nach einer gültigen Unternehmerauswahl freigeben.
- [x] Firestore Rules und Rules-Tests für das Schreibrecht aktiver Master erweitern und deployen.

#### Schritt 3: Firma auswählen und anlegen

- [x] Firmenmodell mit getrenntem `anzeigename` und `firmenname` sowie Anlage-, Dokument-, Eintrags- und Ergebnis-Typen festlegen.
- [x] Firmen des ausgewählten Unternehmers laden und sortiert im Store halten.
- [x] Firma-Service und Firma-Store für Laden und Anlegen umsetzen.
- [x] Dialog zum Anlegen einer Firma unter dem ausgewählten Unternehmer erstellen.
- [x] Neue Firma in die Store-Liste übernehmen und automatisch auswählen.
- [x] Filialschritt erst nach einer gültigen Firmenauswahl freigeben.

#### Schritt 4: Filiale anlegen

- [x] Filialmodell mit getrenntem `anzeigename` und `filialname` sowie Anlage-, Dokument-, Eintrags- und Ergebnis-Typen festlegen.
- [x] Filialen der ausgewählten Firma laden und im Store halten.
- [x] Filiale-Service und Filiale-Store für Laden und Anlegen umsetzen.
- [x] Dialog zum Anlegen einer Filiale unter der ausgewählten Firma erstellen.
- [x] Angelegte Filiale in die Store-Liste übernehmen und in der Zusammenfassung anzeigen.
- [x] Vollständige Hierarchie Unternehmer, Firma und Filiale abschließend bestätigen.

#### Tests und Abschluss

- [x] Dialog-, Service-, Store- und Stepper-Tests für die Unternehmer-Anlage ergänzen.
- [x] `npm test`, `npm run test:rules` und `npm run build` für die Unternehmer-Anlage erfolgreich ausführen.
- [x] Unternehmeranlage manuell gegen Firestore prüfen.
- [x] Service-, Store-, Dialog- und Stepper-Tests für die Firmenanlage ergänzen.
- [x] Service-, Store-, Dialog- und Stepper-Tests für die Filialanlage ergänzen.
- [x] Vollständige Datenstruktur-Anlage manuell gegen Firestore prüfen.
- [x] `projekt-stand.md` um den technischen Stand der Filialanlage aktualisieren.
- [x] `npm test`, `npm run test:rules` und `npm run build` für den Gesamtablauf erfolgreich ausführen.

#### Erledigt, wenn

- [x] Der Stepper stellt die drei Hierarchiestufen verständlich und responsiv dar.
- [x] Ein Unternehmer kann ausgewählt oder neu angelegt werden.
- [x] Eine Firma kann für den ausgewählten Unternehmer ausgewählt oder neu angelegt werden.
- [x] Eine Filiale kann technisch für die ausgewählte Firma angelegt werden.
- [x] Die vollständige Hierarchie wird korrekt in Firestore gespeichert, im UI zusammengefasst und nach einem Anwendungsneustart
      erneut geladen.
- [x] Der reale Gesamtablauf sowie Tests, Rules-Tests und Build sind erfolgreich.

### 4.2 Benutzer anlegen

#### Ziel

Ein serverseitig bestätigter Master kann einen Benutzer mit Anzeigename, automatisch gebildetem Anmeldenamen, Rolle,
Anfangspasswort, erlaubten Bereichen und Datenzugriffen anlegen. Die technische Firebase-Adresse wird dabei automatisch erzeugt.
Die Datenzugriffe folgen der Hierarchie `unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}`. Eine Selbstregistrierung
bleibt ausgeschlossen und die Sitzung des Masters bleibt erhalten.

#### Betroffene Dateien

- src/app/commons/models/domain/benutzer.ts
- src/app/commons/models/domain/datenzugriff.ts
- src/app/components/datenzugriff-auswahl/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-anlage/
- src/app/services/domain/benutzer.service.ts
- src/app/stores/app/stammdaten.store.ts
- src/app/services/domain/datenzugriff.service.ts
- src/app/stores/domain/benutzer-verwaltung.store.ts
- functions/src/index.ts
- firestore.rules
- rules-tests/
- docs/projekt-stand.md

#### Schritt 1: Systemverwaltungszugang und Benutzerformular

- [x] Systemverwaltungsroute, Navigation und Client-Guards für berechtigte Master-Benutzer umsetzen.
- [x] Formular mit Zugangsdaten, Bereichs-Checkboxen und Datenzugriff-Auswahl anlegen.
- [x] Anfangspasswort mit mindestens acht Zeichen und Ein-/Ausblendfunktion erfassen, aber nicht in Firestore speichern.
- [x] Formularvalidierung und Schutz vor doppeltem Absenden umsetzen.
- [x] Während der Benutzeranlage das vollständige Formular einschließlich eigenständig verwalteter Unterkomponenten sperren und
      nach Erfolg oder Fehler wieder aktivieren.
- [x] Formular und Absendezustand nach erfolgreicher Anlage zurücksetzen und die Erfolgsmeldung erhalten.
- [x] Passwortänderung unter `/passwort` mit erneuter Authentifizierung und Passwortbestätigung umsetzen.

#### Schritt 2: Rollen und Datenzugriffe

- [x] Wiederverwendbare Material-Selects für Unternehmer, Firmen und Filialen an echte Firebase-Daten anbinden.
- [x] Rollenabhängige Auswahl umsetzen: Filiale genau eine vollständige Zuordnung, Office eine Unternehmerauswahl und mehrere
      Firmen beziehungsweise Filialen, Master ohne Datenzuordnung.
- [x] Abhängige Auswahlen bereinigen und bereits geladene Listen nach vollständigem Pfad zwischenspeichern.
- [x] Lade-, Leer- und Fehlerzustände der Datenlisten getrennt vom Anlagezustand verwalten.
- [x] Im gemeinsamen Auswahlmodell und in den Firestore-Dokumenten durchgehend `anzeigename` verwenden.
- [x] Ausgewählte Zugriffe in Formularvalidierung und Anlage-Payload übernehmen.
- [x] Firmen- und Filialzuordnungen im Backend gegen die Firestore-Hierarchie prüfen.
- [x] Office-Firmenfreigabe festlegen: Firmen und Filialen werden explizit zugeordnet; neue Filialen werden nicht automatisch
      freigegeben.

#### Schritt 3: Konto und Profil sicher anlegen

- [x] Store, Service und Callable Function für die Benutzeranlage umsetzen.
- [x] Anmeldung, aktives Profil und Master-Rolle serverseitig prüfen.
- [x] Auth-Konto und Profil unter `benutzerprofil/{uid}` mit dem Admin SDK sicher anlegen.
- [x] Ohne erfolgreich gespeichertes Profil kein neues Auth-Konto aktivieren und Fehlerfälle kontrolliert bereinigen.
- [x] Vereinfachte Function ohne `zugriffsIndex` deployen; Deployment vom Benutzer bestätigt.
- [x] Vereinfachte Rules ohne `zugriffsIndex` deployen; Deployment vom Benutzer bestätigt.
- [x] Vorhandenes Master-Profil prüfen; eine Datenmigration war nicht erforderlich.

#### Schritt 4: Rechte und realen Gesamtablauf absichern

- [x] Aktive Master für alle benötigten Collections berechtigen.
- [x] Office- und Filialprofile lesend auf zugeordnete Hierarchien samt Untercollections begrenzen.
- [x] Direkten Filial-Lesetest ausführen: eigene Filiale erlaubt, andere Filiale derselben Firma gesperrt.
- [x] Lesen und Schreiben der Altanwendung nach dem Rules-Deployment bestätigen.
- [x] Office-Konten das Aktualisieren zugeordneter Firmen- und Filialdokumente erlauben; Anlegen, Löschen und Schreiben in
      Untercollections weiterhin sperren.
- [x] Filialkonten vorerst ausschließlich lesend auf ihre zugeordnete Hierarchie begrenzen.
- [x] Aktualisierte Firestore Rules mit den Office-Schreibrechten erfolgreich deployen.
- [x] Office-Zugriffe und Unterdokumente mit realen Testkonten prüfen.

#### Tests und Abschluss

- [x] Service-, Store-, Function-, Rules- und Formulartests für die umgesetzte Benutzeranlage ergänzen.
- [x] Fehlerfälle einschließlich fehlgeschlagener Rückabwicklung durch Backend-Tests prüfen und manuelle Nachbearbeitung
      dokumentieren.
- [x] Erfolgreiche Benutzeranlage, Anmeldung, Bereichsfreigabe, Systemverwaltungssperre, Passwortwechsel und erneute Anmeldung vom
      Benutzer bestätigen.
- [x] Den aktuellen Gesamtablauf mit echten Unternehmer-, Firmen- und Filialzuordnungen prüfen.
- [x] Vereinbarte Office- und Filial-Schreibrechte mit Firestore-Emulator-Tests prüfen.
- [x] `projekt-stand.md` nach Abschluss aktualisieren.
- [x] `npm test`, `npm run test:rules` und `npm run build` abschließend erfolgreich ausführen.

#### Erledigt, wenn

- [x] Das Rollenmodell ist vollständig umgesetzt und die vereinbarten Schreibrechte sind abgesichert.
- [x] Der Master kann einen Benutzer mit echten Unternehmer-, Firmen- und Filialzuordnungen anlegen.
- [x] Die Zuordnungen werden vollständig gespeichert und serverseitig geprüft.
- [x] Benutzer können `userRole`, `erlaubteBereiche` und `zugriffe` nicht selbst über den Client verändern.
- [x] Es gibt keine öffentliche Selbstregistrierung.
- [x] Der aktuelle Gesamtablauf ist deployed und mit realen Daten erfolgreich geprüft.

### 4.3 Bestehende Benutzerprofile verwalten

#### Ziel

Ein Master kann vorhandene Profile aus `benutzerprofil` auswählen und deren Anzeigename, Aktivstatus, erlaubte Bereiche und
Datenzugriffe bearbeiten. Die Benutzerrolle, E-Mail-Adresse und der Firebase-Auth-Status werden in dieser ersten Ausbaustufe nicht
verändert.

#### Betroffene Dateien

- src/app/commons/models/domain/benutzer.ts
- src/app/services/domain/benutzer.service.ts
- src/app/stores/app/stammdaten.store.ts
- src/app/stores/domain/benutzer-verwaltung.store.ts
- src/app/pages/systemverwaltung-page/systemverwaltung-page.ts
- src/app/pages/systemverwaltung-page/systemverwaltung-page.html
- src/app/pages/systemverwaltung-page/systemverwaltung-page.spec.ts
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-bearbeiten-dialog/
- firestore.rules
- rules-tests/
- docs/projekt-stand.md

#### Schritt 1: Datenmodell vorbereiten

- [x] `IBenutzerProfilEintrag` für ein Benutzerprofil mit der Dokument-ID als `uid` ergänzen.
- [x] `IBenutzerProfilAktualisierung` für die direkt bearbeitbaren Profilfelder ergänzen.
- [x] Benutzerrolle, E-Mail-Adresse und Passwort bewusst aus dem Aktualisierungsmodell ausschließen.

#### Schritt 2: Benutzerprofile laden und im Store verwalten

- [x] Alle Benutzerprofile für den Master aus `benutzerprofil` laden und die Dokument-ID als `uid` abbilden.
- [x] Benutzer-Verwaltungs-Store um Profilbestand, Auswahl, Ladezustand und Aktualisierungsstatus erweitern.
- [x] Leere Liste, Ladefehler und erfolgreichen Ladezustand unterscheidbar darstellen.

#### Schritt 3: Benutzerprofil auswählen

- [x] Eigenständigen UI-Dummy unter `systemverwaltung-page/benutzer-page/benutzer-verwaltung` anlegen.
- [x] Leeres Benutzer-Select und deaktivierten Button `Benutzer bearbeiten` ohne produktive Mockdaten vorbereiten.
- [x] Benutzer über ein `mat-select` auswählen und die `uid` als Select-Wert verwenden.
- [x] Anzeigename und E-Mail-Adresse als verständliche Bezeichnung im Benutzer-Select anzeigen.
- [x] Den Bearbeiten-Button erst nach einer gültigen Benutzerauswahl aktivieren.
- [x] Das ausgewählte `IBenutzerProfilEintrag` an den Bearbeitungsdialog übergeben.

#### Schritt 4: Benutzerprofil bearbeiten und speichern

- [x] Bearbeitungsdialog für Anzeigename, Aktivstatus, erlaubte Bereiche und Datenzugriffe anlegen; die bestehende Rolle nur
      lesend anzeigen.
- [x] Den Bereich `systemverwaltung` aus der unveränderlichen Rolle ableiten: für Master fest aktiviert, für Office und Filiale
      fest deaktiviert.
- [x] Vorhandene `DatenzugriffAuswahl` wiederverwenden und rollenabhängige Validierung aus der Benutzeranlage übernehmen.
- [x] Firebase-Service um das Aktualisieren von `benutzerprofil/{uid}` erweitern.
- [x] Beim Speichern `aktualisiertAm` mit einem Server-Timestamp setzen.
- [x] Aktualisierten Eintrag ohne erneutes Laden in die Store-Liste übernehmen.
- [x] Erfolgs-, Fehler-, Lade- und Speicherzustand in der Oberfläche anzeigen.

#### Schritt 5: Selbstschutz und spätere Auth-Erweiterung

- [x] Verhindern, dass ein Master sich selbst deaktiviert; Rollenänderungen generell nicht zulassen.
- [x] Firestore Rules beziehungsweise Backend-Schutz für erlaubte Profilaktualisierungen gezielt testen.
- [x] Festlegen, wie angemeldete Benutzer geänderte Bereiche und Zugriffe ohne erneute Anmeldung erhalten: Das aktuell
      bearbeitende Masterprofil wird sofort im lokalen Store aktualisiert; andere bereits angemeldete Konten erhalten UI-Freigaben
      spätestens nach einem Neuladen, während die Rules den neuen Profilstand sofort auswerten.
- [x] E-Mail-Änderungen bleiben einer späteren Cloud Function vorbehalten, die Firebase Auth und Firestore gemeinsam aktualisiert.
- [x] Eine vollständige Kontosperre bleibt einer späteren Cloud Function vorbehalten, die Firebase Auth `disabled` und das
      Profilfeld `aktiv` synchronisiert.

#### Tests und Abschluss

- [x] Service- und Store-Tests für Laden, Aktualisieren und Fehlerfälle ergänzen.
- [x] Dialog- und Seitentests für Auswahl, Validierung, Speichern und Selbstschutz ergänzen.
- [x] Profilbearbeitung mit einem realen Testkonto prüfen.
- [x] `projekt-stand.md` nach Abschluss aktualisieren.
- [x] `npm test`, `npm run test:rules` und `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Ein Master kann ein bestehendes Benutzerprofil über das Select auswählen.
- [x] Anzeigename, Aktivstatus, erlaubte Bereiche und Datenzugriffe können sicher aktualisiert werden; die Benutzerrolle bleibt
      unverändert.
- [x] E-Mail-Adresse, Passwort und Firebase-Auth-Status bleiben in dieser Ausbaustufe unverändert.
- [x] Der Master kann sich nicht selbst deaktivieren; Rollen können nicht über die Profilbearbeitung verändert werden.
- [x] Die aktualisierte Store-Liste und Oberfläche zeigen den gespeicherten Stand ohne erneutes Laden.
- [x] Tests, Rules-Tests, Build und manuelle Prüfung sind erfolgreich.

## 5. Done Todo: Verwaltung

### 5.1 Firmen- und Filialdaten bearbeiten

#### Ziel

Ein Office-Benutzer kann die Stammdaten seiner zugeordneten Firmen und Filialen unter `/verwaltung` auswählen und bearbeiten. Ein
Master kann denselben Bereich verwenden, wenn `verwaltung` in seinen erlaubten Bereichen enthalten ist. Filialkonten erhalten
keinen Zugriff auf diesen Verwaltungsbereich. Bestehende Dokumente werden aktualisiert; Firmen, Filialen und Unterdokumente können
hier weder angelegt noch gelöscht werden.

#### Betroffene Dateien

- src/app/commons/models/app/app-bereich.ts
- src/app/commons/models/domain/firma.ts
- src/app/commons/models/domain/filiale.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/commons/tokens/firebase.tokens.ts
- src/app/components/app-shell/app-sidenav/
- src/app/components/app-shell/app-toolbar/
- src/app/guards/
- src/app/pages/verwaltung-page/
- src/app/services/core/loading.service.ts
- src/app/services/firebase/firestore-db.service.ts
- src/app/services/domain/benutzer.service.ts
- src/app/services/domain/unternehmer.service.ts
- src/app/services/domain/firma.service.ts
- src/app/services/domain/filiale.service.ts
- src/app/stores/domain/firma.store.ts
- src/app/stores/domain/filiale.store.ts
- src/app/stores/app/benutzer.store.ts
- src/app/stores/app/stammdaten.store.ts
- src/app/app.routes.ts
- functions/src/create-benutzer.ts
- firestore.rules
- rules-tests/
- docs/projekt-plan.md
- docs/projekt-stand.md

#### Schritt 1: Verwaltungsbereich und Rollenzugriff anlegen

- [x] `verwaltung` zusätzlich zu `systemverwaltung` als eigenen `TAppBereich` aufnehmen.
- [x] Backend-Validierung der erlaubten Bereiche um `verwaltung` erweitern.
- [x] Eigenständige `verwaltung-page` unter `src/app/pages/verwaltung-page` anlegen.
- [x] Route `/verwaltung` mit `authGuard` und `bereichGuard` anlegen, zusätzlich per Guard auf Office und Master beschränken und
      nicht berechtigte Benutzer zum Dashboard umleiten.
- [x] Navigationslink `Verwaltung` anhand von `erlaubteBereiche` in der Sidebar einblenden.
- [x] Filialkonten auch bei einem fehlerhaft gesetzten Bereichsschlüssel vom Verwaltungsbereich ausschließen.

#### Schritt 2: Zugeordnete Firmen und Filialen laden

- [x] Datenzugriffe aus dem angemeldeten Benutzerprofil als Grundlage für die erlaubten Dokumentpfade verwenden.
- [x] Zugeordnete Unternehmer, Firmen und Filialen gezielt über ihre Dokumentpfade laden; keine unbeschränkten Collection-Abfragen
      für Office verwenden.
- [x] Für Master eine Unternehmerauswahl bereitstellen und für Office den einzigen zugeordneten Unternehmer automatisch auswählen;
      Firmen- und Filialauswahl mit abhängigen Material-Selects aufbauen.
- [x] Auswahl beim Wechsel eines übergeordneten Eintrags konsistent zurücksetzen.
- [x] Lade-, Leer- und Fehlerzustände für die zugeordneten Stammdaten darstellen.

#### Schritt 3: Globalen Ladeindikator vereinheitlichen

- [x] Globalen Lade-Service mit Zähler für parallele Ladevorgänge anlegen.
- [x] Eine unbestimmte Progress-Bar am unteren Rand der App-Toolbar anzeigen.
- [x] Aktuelle Firestore-Lesevorgänge für Benutzerprofil, Unternehmer, Firmen und Filialen zentral registrieren.
- [x] Parallele Schreibvorgänge getrennt zählen und Firestore-Anlagen, Firestore-Aktualisierungen sowie die Benutzeranlage zentral
      registrieren.
- [x] Die zugängliche Beschriftung der Progress-Bar zwischen Laden, Speichern und überlappenden Vorgängen unterscheiden.
- [x] Lokale Ladetexte entfernen; lokale Fehler- und Leerzustände erhalten.
- [x] Service-, Toolbar- und Seitentests für den globalen Ladeindikator ergänzen.

#### Schritt 4: Firestore-Anbindung zentral strukturieren

- [x] Collection- und Dokumentpfade für Benutzerprofile, Unternehmer, Firmen und Filialen zentral definieren.
- [x] Technischen `FirestoreDbService` für Collection-Lesen, Dokument-Lesen, Anlegen, Merge-Aktualisieren und Server-Zeitstempel
      anlegen.
- [x] Angular-Injection-Kontext und globale Ladeanzeige innerhalb der technischen Firestore-Schicht kapseln.
- [x] `BenutzerService`, `UnternehmerService`, `FirmaService` und `FilialeService` auf den `FirestoreDbService` umstellen, ohne
      ihre öffentliche API zu ändern.
- [x] Offline-Strategien, Synchronisationsstatus, Migrationen und Batch-Schreibvorgänge bewusst für eine spätere
      Datenmanagement-Entscheidung ausklammern.
- [x] Tests für technische Firestore-Schicht und fachliche Services anpassen und ergänzen.

#### Schritt 5: Stammdaten für die Sitzung initialisieren

- [x] Nach dem Laden des Benutzerprofils einen app-weiten Stammdatenbestand initialisieren.
- [x] Für Master alle Unternehmer, Firmen, Filialen und Benutzerprofile einmalig laden.
- [x] Für Office- und Filialkonten ausschließlich die im Profil freigegebenen Unternehmer-, Firmen- und Filialdokumente laden.
- [x] Verwaltung, Systemverwaltung und Datenzugriffsauswahl aus dem gemeinsamen Sitzungsbestand versorgen.
- [x] Neu angelegte Unternehmer, Firmen, Filialen und Benutzerprofile ohne erneutes Laden in den Sitzungsbestand übernehmen.
- [x] Identische parallele Firestore-Leseaufträge zusammenfassen und den Sitzungsbestand bei Logout oder Benutzerwechsel
      zurücksetzen.
- [x] Service- und Store-Tests für vollständiges Master-Laden, eingeschränktes Office-Laden, Cache-Aktualisierung und Reset
      ergänzen.

#### Schritt 6: Firmendaten bearbeiten

- [x] Aktualisierungsmodell für bearbeitbare Firmendaten festlegen.
- [x] Bearbeitungsdialog für `anzeigename`, `firmenname`, Adresse und Kontaktdaten anlegen.
- [x] Dokument-ID, `nummer`, `aktiv`, `erstelltAm` und Hierarchiepfad nicht als bearbeitbare Felder anbieten.
- [x] `FirmaService` und `VerwaltungStore` um das Aktualisieren einer ausgewählten Firma erweitern.
- [x] Beim Speichern `aktualisiertAm` mit einem Server-Timestamp setzen.
- [x] Aktualisierte Firma ohne erneutes Laden in Verwaltungs- und Stammdatenbestand übernehmen.

#### Schritt 7: Filialdaten bearbeiten

- [x] Aktualisierungsmodell für bearbeitbare Filialdaten festlegen.
- [x] Bearbeitungsdialog für `anzeigename`, `filialname`, Adresse und Kontaktdaten anlegen.
- [x] Dokument-ID, `nummer`, `aktiv`, `erstelltAm` und Hierarchiepfad nicht als bearbeitbare Felder anbieten.
- [x] `FilialeService` und `VerwaltungStore` um das Aktualisieren einer ausgewählten Filiale erweitern.
- [x] Beim Speichern `aktualisiertAm` mit einem Server-Timestamp setzen.
- [x] Aktualisierte Filiale ohne erneutes Laden in Verwaltungs- und Stammdatenbestand übernehmen.

#### Schritt 8: Schreibrechte real prüfen

- [x] Zugeordnete Firma mit einem realen Office-Testkonto erfolgreich aktualisieren.
- [x] Zugeordnete Filiale mit einem realen Office-Testkonto erfolgreich aktualisieren.
- [x] Aktualisierung einer nicht zugeordneten Firma und Filiale ablehnen.
- [x] Anlegen und Löschen von Firmen und Filialen für Office ablehnen.
- [x] Schreiben in Filial-Untercollections für Office weiterhin ablehnen.
- [x] Schreibzugriffe eines Filialkontos weiterhin ablehnen.
- [x] Entscheiden, ob die aktuell vollständige Dokumentaktualisierung später durch feldgenaue Rules eingeschränkt werden soll.

#### Tests und Abschluss

- [x] Guard-, Routen- und Sidebar-Tests für Office, Master und Filiale ergänzen.
- [x] Service- und Store-Tests für das Laden und Aktualisieren von Firmendaten ergänzen.
- [x] Dialog- und Seitentests für Auswahl, Validierung und Speichern von Firmendaten ergänzen.
- [x] Service-, Store-, Dialog- und Seitentests für die Filialdaten-Aktualisierung ergänzen.
- [x] Firestore-Emulator-Tests für erlaubte und verbotene Aktualisierungen erfolgreich ausführen.
- [x] Den Verwaltungsablauf mit einem realen Office-Testkonto prüfen.
- [x] `projekt-plan.md` und `projekt-stand.md` nach Abschluss aktualisieren.
- [x] `npm test`, `npm run test:rules`, Functions-Tests und `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Office und Master können den Bereich `/verwaltung` nur mit entsprechender Bereichsfreigabe öffnen.
- [x] Filialkonten können den Verwaltungsbereich nicht öffnen.
- [x] Office sieht ausschließlich die im Benutzerprofil zugeordneten Firmen und Filialen.
- [x] Bearbeitbare Firmen- und Filialdaten können gespeichert und ohne erneutes Laden angezeigt werden.
- [x] Office kann keine nicht zugeordneten Dokumente, Untercollections, Neuanlagen oder Löschungen schreiben.
- [x] Tests, Rules-Tests, Builds und reale manuelle Prüfung sind erfolgreich.

## 6. Done Todo: PWA-Grundlage und technischer Offline-Start

> **Historischer Stand:** Dieses Todo dokumentiert die damalige Trennung zwischen Office-Webanwendung und Filial-PWA. Der
> aktuelle Stand umfasst vier getrennte PWA-Varianten für Master, Office, Filiale und Mitarbeiter und ist in den
> [PWA-Konfigurationen](./pwa-konfigurationen.md) beschrieben.

### Ziel

Pur Filiale wird als Progressive Web App installierbar und kann auf unterstützten Desktop- und Mobilgeräten wie eine eigenständige
Anwendung gestartet werden. Die App-Shell und die für den Start erforderlichen statischen Ressourcen stehen nach dem ersten
erfolgreichen Laden auch ohne Netzwerkverbindung zur Verfügung.

Neue Anwendungsversionen werden kontrolliert erkannt und übernommen. Die Oberfläche informiert verständlich über den
Netzwerkzustand, verfügbare Updates und Funktionen, die aktuell eine Verbindung benötigen. Pur Office bleibt davon getrennt als
normale Webanwendung ohne Service Worker nutzbar.

Der Angular Service Worker verwaltet ausschließlich die Anwendungsversion und statische Ressourcen. Fachliche Firestore-Daten
werden durch diesen Schritt weder dauerhaft gespeichert noch für Offline-Schreibvorgänge freigegeben.

### Betroffene Dateien

Änderungen:

- .firebaserc
- package.json
- package-lock.json
- angular.json
- src/index.html
- src/styles.scss
- src/app/app.config.ts
- src/app/app.ts
- src/app/app.html
- src/app/app.spec.ts
- src/app/components/app-shell/app-toolbar/
- src/app/commons/utils/errors/firebase-error-message.ts
- src/app/commons/utils/errors/firebase-error-message.spec.ts
- src/app/services/firebase/auth.service.ts
- src/app/services/firebase/auth.service.spec.ts
- src/app/services/firebase/benutzer-verwaltung.service.ts
- src/app/services/firebase/benutzer-verwaltung.service.spec.ts
- src/app/services/firebase/firestore-db.service.ts
- src/app/services/firebase/firestore-db.service.spec.ts
- src/environments/environment.ts
- src/environments/environment.prod.ts
- firebase.json
- docs/projekt-plan.md
- docs/projekt-stand.md

Neu hinzuzufügen:

- ngsw-config.json
- public/manifest.webmanifest
- public/manifests/pur-filiale/manifest.webmanifest
- public/icons/
- public/fonts/
- docs/pwa-konfigurationen.md
- src/app/services/core/netzwerk-status.service.ts
- src/app/services/core/pwa-update.service.ts
- src/app/services/core/pwa-update.service.spec.ts
- src/environments/environment.pwa-prod.ts

### Schritt 1: PWA-Grundlage einrichten

- [x] Angular Service Worker als Projekt-Dependency ergänzen und ausschließlich für geeignete Produktions-Builds registrieren.
- [x] Service-Worker-Unterstützung in der Angular-Buildkonfiguration aktivieren.
- [x] `ngsw-config.json` für App-Shell, lazy geladene Anwendungsteile und statische Ressourcen anlegen.
- [x] Getrennte Web-App-Manifeste mit den Produktkennungen Pur Office und Pur Filiale sowie Start-URL, Darstellungsmodus,
      Theme-Farben und geeigneten Icons anlegen.
- [x] Manifest, Theme-Farbe und PWA-Metadaten in `index.html` einbinden.
- [x] Installation und normaler Webbetrieb bei fehlender Service-Worker-Unterstützung voneinander unabhängig halten.

### Schritt 2: App-Shell vollständig offline bereitstellen

- [x] Alle zum Start erforderlichen eigenen Ressourcen durch den Service Worker vorhalten.
- [x] Roboto-Schriften und Material Icons nicht mehr zur Laufzeit von Google laden, sondern als lokale statische Ressourcen
      ausliefern.
- [x] Sicherstellen, dass Loginseite, App-Shell und bereits geladene lazy Routen nach einem erfolgreichen Online-Aufruf ohne
      Netzwerk erneut geöffnet werden können.
- [x] Firebase-, Firestore- und Functions-Anfragen nicht als statische Anwendungsressourcen im Angular Service Worker
      zwischenspeichern.
- [x] Einen verständlichen Zustand anzeigen, wenn die App-Shell verfügbar ist, für die angeforderte Funktion aber eine
      Netzwerkverbindung benötigt wird.

### Schritt 3: Netzwerkzustand darstellen

- [x] Zentralen Service für den initialen Netzwerkzustand sowie `online`- und `offline`-Ereignisse anlegen.
- [x] Den Netzwerkzustand in der App-Shell sichtbar und barrierearm darstellen.
- [x] Netzwerkstatus nur als Hinweis verwenden; fehlgeschlagene Serverzugriffe weiterhin anhand ihres tatsächlichen Ergebnisses
      behandeln.
- [x] Aktionen, die zwingend Firebase Auth, Firestore oder Cloud Functions benötigen, offline verständlich sperren oder
      kontrolliert fehlschlagen lassen.
- [x] Rückkehr der Netzwerkverbindung anzeigen, ohne laufende Formulare oder Navigation ungefragt zurückzusetzen.

### Schritt 4: Anwendungsupdates kontrolliert übernehmen

- [x] Verfügbarkeit und Fehlerzustände des Angular Service Workers über `SwUpdate` behandeln.
- [x] Eine vollständig heruntergeladene neue Anwendungsversion in der App-Shell anzeigen.
- [x] Den Benutzer vor dem Wechsel der Anwendungsversion bestätigen lassen und anschließend die Seite vollständig neu laden.
- [x] Keine laufende Bearbeitung durch einen automatischen Reload unterbrechen.
- [x] Kritische Service-Worker-Fehler und nicht wiederherstellbare Versionszustände verständlich behandeln.
- [x] Auf Browsern ohne Service-Worker-Unterstützung keine Update-Aufrufe ausführen und keine Fehler im normalen Webbetrieb
      erzeugen.

### Schritt 5: Hosting und Auslieferung absichern

- [x] Getrennte Firebase-Hosting-Sites konfigurieren: `pur-office.web.app` für den normalen Web-Build und `pur-filiale.web.app`
      für den PWA-Build.
- [x] Getrennte Hosting-Targets und Deployment-Skripte für Office und Filiale einrichten.
- [x] Lokale und produktive Build-, Hosting- und Service-Worker-Varianten in einer PWA-Konfigurationsmatrix dokumentieren.
- [x] Firebase Hosting so konfigurieren, dass `index.html`, `ngsw.json`, Service Worker und gehashte Ressourcen mit passenden
      Cache-Headern ausgeliefert werden.
- [x] Sicherstellen, dass SPA-Rewrites Manifest-, Icon- und Service-Worker-Dateien nicht verdecken.
- [x] PWA ausschließlich über HTTPS beziehungsweise für lokale Tests über `localhost` prüfen.
- [x] Festlegen und dokumentieren, wie eine fehlerhafte Service-Worker-Version bei Bedarf deaktiviert oder ersetzt wird.

### Tests und Abschluss

- [x] Unit-Tests für Netzwerkstatus, Update-Erkennung, Update-Bestätigung und fehlende Service-Worker-Unterstützung ergänzen.
- [x] Getrennte Produktions-Builds erzeugen und prüfen, dass beide ihr jeweiliges Manifest und nur Pur Filiale `ngsw.json` sowie
      den Service Worker ausliefert; Icons und lokale Schriften sind enthalten.
- [x] Installierbarkeit auf mindestens einem unterstützten Desktop-Browser und einem unterstützten Mobilgerät beziehungsweise
      einer realistischen Mobilgeräte-Simulation prüfen.
- [x] App-Shell nach einem ersten Online-Aufruf bei deaktiviertem Netzwerk neu laden und manuell prüfen.
- [x] Update-Ablauf mit zwei aufeinanderfolgenden Produktions-Builds prüfen.
- [x] Normalen Webbetrieb ohne aktive Service-Worker-Unterstützung prüfen.
- [x] `projekt-stand.md` nach Abschluss aktualisieren.
- [x] `npm test` sowie die getrennten Office- und Filial-Produktionsbuilds erfolgreich ausführen.

### Erledigt, wenn

- [x] Pur Filiale kann auf unterstützten Geräten installiert und eigenständig gestartet werden.
- [x] App-Shell und statische Startressourcen funktionieren nach dem ersten erfolgreichen Laden offline.
- [x] Externe Schrift- und Icon-Anfragen verhindern den Offline-Start nicht.
- [x] Netzwerkzustand und verbindungsabhängige Funktionen werden verständlich dargestellt.
- [x] Eine neue vollständig geladene Anwendungsversion kann nach Benutzerbestätigung sicher übernommen werden.
- [x] Browser ohne Service-Worker- oder Installationsunterstützung können Pur Office weiterhin normal verwenden.
- [x] Tests, Produktions-Build und manuelle PWA-Prüfungen sind erfolgreich.

## 7. Done Todo: Mitarbeiterrolle und mobile Mitarbeiter-App

### 7.1 Rolle und App-Abgrenzung festlegen

#### Ziel

Vor der technischen Umsetzung werden die neue Auth-Rolle `mitarbeiter` und ihre Abgrenzung zu Filiale, Office und Master
verbindlich festgelegt. Ein Mitarbeiter kann auf seinem Handy einen optionalen eigenen Mitarbeiterzugang mit Firebase Auth und die
dafür vorgesehene mobile Mitarbeiter-App verwenden.

Ein Mitarbeiterzugang ist nicht mit dem fachlichen Mitarbeiterdatensatz einer Firma gleichzusetzen. Ein Mitarbeiterdatensatz kann
ohne Mitarbeiterzugang bestehen. Mitarbeiterstammdaten, die spätere optionale Verknüpfung beider Datensätze, Filialzuordnungen,
fachliche Mitarbeiterrollen, Dienstpläne, persönliche Fachaktionen und Push-Benachrichtigungen sind nicht Bestandteil dieses
Todos. Sie werden später fachlich geplant und in eigenen Todos umgesetzt.

#### Betroffene Dateien

Änderungen:

- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/pwa-konfigurationen.md

#### Schritt 1: Rolle und Anmeldung festlegen

- [x] Festlegen, dass ein Mitarbeiter optional einen eigenen Mitarbeiterzugang mit Firebase Auth verwenden kann.
- [x] `mitarbeiter` als eigenständige vierte Auth-Rolle neben Filiale, Office und Master festlegen.
- [x] Festlegen, dass Mitarbeiterzugänge ausschließlich durch einen Master angelegt werden.
- [x] Festlegen, dass der Master die `erlaubteBereiche` eines Mitarbeiterzugangs wie bei den bestehenden Rollen zuweist.
- [x] Festlegen, dass Benutzer mit einem Mitarbeiterzugang die bestehenden Abläufe für Anmeldung, Abmeldung und Passwortänderung
      verwenden, der Master Mitarbeiterzugänge deaktiviert und bei einem vergessenen Passwort ein neues vorläufiges Passwort
      vergibt.

#### Schritt 2: Auslieferungsvariante Pur Mitarbeiter und App-Shell festlegen

- [x] `pur-mitarbeiter.web.app` als eigene Auslieferungsvariante für Mitarbeiterzugänge festlegen.
- [x] Die Mitarbeiter-App als installierbare, für Handys optimierte PWA festlegen.
- [x] Eine eigene App-Shell mit dem Titel „Pur Mitarbeiter“ und Navigation anhand der zugewiesenen `erlaubteBereiche` vorsehen.
- [x] Festlegen, dass die Hosting-Variante keine zusätzliche Rollenbeschränkung erzeugt.
- [x] Auch in Pur Mitarbeiter die vorhandenen Auth-, Bereichs- und besonderen Rollenguards verwenden.
- [x] Keine automatische Weiterleitung zwischen den Auslieferungsvarianten verwenden, damit keine Weiterleitungsschleifen
      entstehen.
- [x] Fachliche Mitarbeiterdaten und weitere Funktionen ausdrücklich auf spätere Todos verschieben.

#### Schritt 3: Technische Grenzen dokumentieren

- [x] Festlegen, dass die Auslieferungsvariante nur die App-Oberfläche bestimmt und keine fachlichen Datenrechte gewährt.
- [x] Festlegen, dass `erlaubteBereiche` und die für einzelne administrative Routen erforderlichen Rollen in den Guards geprüft
      werden und Datenzugriffe zusätzlich durch Backend und Firestore Rules abgesichert werden.
- [x] Bis zur späteren Freigabe von Mitarbeiterfunktionen nur Anmeldung, App-Shell und bereits vorhandene, ausdrücklich
      zugewiesene Bereiche bereitstellen.
- [x] Mitarbeiterzugang und fachlichen Mitarbeiterdatensatz als getrennte Konzepte festhalten.
- [x] Die spätere Verknüpfung mit einem Mitarbeiterdatensatz, Filialzuordnung, Dienstplandaten und Push-Benachrichtigungen
      ausdrücklich auf spätere Todos verschieben.

#### Tests und Abschluss

- [x] Rollenentscheidung und App-Abgrenzung im `projekt-plan.md` dokumentieren.
- [x] Prüfen, dass aus Todo 7 keine vorgezogene Entscheidung zu Mitarbeiterdaten, Filialzuordnungen, Dienstplänen oder Push
      hervorgeht.
- [x] Offene fachliche Folgethemen ausdrücklich festhalten und nicht als bereits entschieden darstellen.
- [x] `projekt-stand.md` und `pwa-konfigurationen.md` an den entschiedenen Zielstand anpassen.

#### Erledigt, wenn

- [x] Mitarbeiterrolle, persönlicher Firebase-Auth-Zugang und Abgrenzung zu bestehenden Rollen sind festgelegt.
- [x] Mitarbeiterzugang und fachlicher Mitarbeiterdatensatz sind sprachlich und fachlich voneinander abgegrenzt.
- [x] Zweck, Hosting-Adresse und mobile Ausrichtung der Mitarbeiter-App sind beschrieben.
- [x] Die Grenzen zwischen Auslieferungsvariante und Berechtigungsprüfung sind dokumentiert.
- [x] Spätere fachliche Mitarbeiterfunktionen werden durch Todo 7 nicht vorweggenommen.

### 7.2 Benutzerrolle und persönliche Zugänge umsetzen

#### Ziel

Die Rolle `mitarbeiter` und persönliche Mitarbeiterzugänge werden gemäß den in 7.1 getroffenen Entscheidungen durchgängig in
Benutzerprofil, Benutzerverwaltung, Backend und Sicherheitsregeln umgesetzt. Die Rolle erhält noch keine fachlichen
Mitarbeiterdaten oder Funktionen und keine Rechte von Filiale, Office oder Master.

#### Betroffene Dateien

Änderungen:

- src/app/commons/models/app/app-bereich.ts
- src/app/commons/models/domain/benutzer.ts
- src/app/guards/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-anlage/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/
- src/app/services/domain/benutzer.service.ts
- src/app/services/firebase/auth.service.ts
- src/app/services/firebase/benutzer-verwaltung.service.ts
- src/app/stores/app/benutzer.store.ts
- src/app/stores/domain/benutzer-verwaltung.store.ts
- functions/src/
- firestore.rules
- rules-tests/
- docs/projekt-plan.md
- docs/projekt-stand.md

#### Schritt 1: Rolle und persönlichen Zugang abbilden

- [x] Den zwischenzeitlichen Rollenwert `personal` in Benutzerprofil, Formularen, Validierungen, Backend und Rules wieder durch
      `mitarbeiter` ersetzen.
- [x] Persönliche Mitarbeiterzugänge über den bestehenden kontrollierten Benutzeranlage-Ablauf erstellen.
- [x] Profile von Mitarbeiterzugängen zunächst ohne Verknüpfung zu einem fachlichen Mitarbeiterdatensatz oder einer
      Filialzuordnung speichern.
- [x] Rollenwechsel und Bearbeitung vorhandener Profile ohne unzulässige Restberechtigungen behandeln.
- [x] Vor dem Deployment vorhandene Profile mit `userRole: personal` kontrolliert zu `userRole: mitarbeiter` migrieren.

#### Schritt 2: Kontoabläufe absichern

- [x] Anlage, Aktivierung, Deaktivierung und erforderliche Bereinigung persönlicher Konten serverseitig absichern.
- [x] Erstanmeldung und Passwortänderung für Mitarbeiterzugänge in den bestehenden Auth-Ablauf integrieren.
- [x] Selbstregistrierung und die Verwendung gemeinsamer Filial-Zugangsdaten für Mitarbeiterzugänge ausschließen.

#### Tests und Abschluss

- [x] Unit-Tests für Rolle, Bereichsfreigaben, Kontoabläufe und App-Abgrenzung ergänzen.
- [x] Rules-Tests für noch nicht freigegebene fachliche Zugriffe von Mitarbeiterzugängen und deaktivierte Konten ergänzen.
- [x] Mitarbeiterzugangsanlage, Anmeldung, Deaktivierung und abgelehnte Rollenwechsel nach der Migration mit einem realen
      Testkonto prüfen.
- [x] Bestehende Rollen und Altanwendung durch Regressionstests unverändert absichern.
- [x] `projekt-plan.md` und `projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test`, `npm run test:rules` und `npm run test:functions` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Mitarbeiterzugänge verwenden nach Migration und Deployment die Rolle `mitarbeiter`.
- [x] Benutzer mit einem Mitarbeiterzugang können ausschließlich die in ihrem Profil freigegebenen Bereiche öffnen.
- [x] Profile von Mitarbeiterzugängen enthalten noch keine vorgezogene Verknüpfung zu fachlichen Mitarbeiterdatensätzen.
- [x] Noch nicht freigegebene Fachdaten sowie Office-, Filial- und Masterfunktionen bleiben gesperrt.
- [x] Konto- und Rollenänderungen sind nach dem Deployment serverseitig und durch Rules abgesichert.
- [x] Unit-, Backend- und Rules-Tests sowie reale Auth-Prüfungen sind erfolgreich.

### 7.3 Mitarbeiter-Build und Hosting einrichten

#### Ziel

Pur Mitarbeiter erhält innerhalb des bestehenden Angular-Projekts eine eigene, für Handys optimierte und installierbare
PWA-Auslieferungsvariante. Build, Manifest, Service Worker und Hosting bleiben von Pur Office und Pur Filiale getrennt. Die
bereits reservierte Hosting-Site wird erst veröffentlicht, wenn die Rollen- und Zugriffstrennung aus 7.2 sicher abgeschlossen ist.

#### Betroffene Dateien

Änderungen:

- .firebaserc
- angular.json
- firebase.json
- package.json
- src/app/app.config.ts
- docs/projekt-stand.md
- docs/pwa-konfigurationen.md

Neu hinzuzufügen:

- public/manifests/pur-mitarbeiter/manifest.webmanifest
- src/environments/environment.mitarbeiter-prod.ts

#### Schritt 1: Build und Manifest konfigurieren

- [x] Eigenen Produktionsbuild unter `dist/pur-mitarbeiter/browser` konfigurieren.
- [x] Eigenes Manifest mit der Produktkennung Pur Mitarbeiter und geeigneten App-Icons ausliefern.
- [x] Eigenes Environment für die Auslieferungsvariante „Pur Mitarbeiter“ ergänzen.
- [x] Service Worker für Installation und Offline-App-Shell aktivieren.
- [x] Geeigneten lokalen Vorschau-Port festlegen und dokumentieren.

#### Schritt 2: Hosting und Skripte einrichten

- [x] Firebase-Hosting-Site `pur-mitarbeiter` im Projekt `pur-system` reservieren.
- [x] Hosting-Target `mitarbeiter` mit der reservierten Site verbinden.
- [x] Cache-Header und SPA-Rewrite für den Mitarbeiter-Build konfigurieren.
- [x] Skripte `build:mitarbeiter`, `pwa:pur-mitarbeiter` und `deploy:pur-mitarbeiter` mit eindeutiger Deployment-Bestätigung
      ergänzen.
- [x] Mitarbeiter-Build und bestehende Office-/Filial-Builds technisch getrennt halten.

#### Tests und Abschluss

- [x] Mitarbeiter-Build auf Manifest, Service Worker, Icons und lokale Schriften prüfen.
- [x] Offline-App-Shell lokal in Desktop- und mobiler Viewport-Größe prüfen.
- [x] PWA auf einem unterstützten Desktop- und einem physischen Mobilgerät installieren und eigenständig starten.
- [x] Office-, Filial- und Mitarbeiter-Builds sowie ihre getrennten Hosting-Ziele gemeinsam prüfen.
- [x] Mitarbeiter-Site erst nach Abschluss von 7.2 deployen und anschließend Hosting-Header sowie Updateverhalten prüfen.
- [x] `projekt-stand.md` und `pwa-konfigurationen.md` nach der Umsetzung aktualisieren.
- [x] `npm test` und alle Produktionsbuilds erfolgreich ausführen.

#### Erledigt, wenn

- [x] Pur Mitarbeiter besitzt einen reproduzierbaren eigenen Produktionsbuild.
- [x] Manifest, Service Worker und Ausgabeordner sind von Office und Filiale getrennt.
- [x] Lokale Vorschau und bestätigtes Deployment verwenden ausschließlich den Mitarbeiter-Build.
- [x] Pur Mitarbeiter ist nach sicherem Abschluss von 7.2 unter `pur-mitarbeiter.web.app` installierbar.
- [x] Tests, Builds und manuelle Installationsprüfung sind erfolgreich.

## 8. Done Todo: Vereinfachte Anmeldung mit Anmeldename

### Ziel

Benutzer melden sich mit einem kurzen Anmeldenamen und ihrem Passwort an. Die technische Firebase-E-Mail-Adresse wird intern aus
dem normalisierten Namen, der Benutzerrolle und der gemeinsamen technischen Domain `@pur-system.invalid` gebildet. Beispielsweise
verwendet der sichtbare Anmeldename `harald.mischer-master` intern die Adresse `harald.mischer-master@pur-system.invalid`.

Im Login wird keine Rolle ausgewählt. Der Rollenbestandteil ist ein fester Teil des Anmeldenamens und dient ausschließlich der
eindeutigen technischen Kennung. Maßgeblich für Berechtigungen bleiben die in Firebase gespeicherte Benutzerrolle, der Aktivstatus
und die erlaubten Bereiche. Bestehende Testkonten werden bewusst nicht migriert; ein neuer Master und alle weiteren Zugänge werden
nach dem neuen Modell angelegt.

### Betroffene Dateien

Änderungen:

- src/app/commons/models/domain/benutzer.ts
- src/app/commons/utils/errors/firebase-error-message.ts
- src/app/commons/utils/errors/firebase-error-message.spec.ts
- src/app/components/app-shell/app-sidenav/
- src/app/pages/auth/login-page/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-anlage/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/
- src/app/pages/systemverwaltung-page/systemverwaltung-page.spec.ts
- src/app/services/domain/benutzer.service.ts
- src/app/services/firebase/auth.service.ts
- src/app/services/firebase/auth.service.spec.ts
- src/app/services/firebase/benutzer-verwaltung.service.spec.ts
- src/app/stores/app/benutzer.store.ts
- src/app/stores/app/benutzer.store.spec.ts
- src/app/stores/domain/passwort.store.spec.ts
- src/app/stores/domain/benutzer-verwaltung.store.ts
- src/app/stores/domain/benutzer-verwaltung.store.spec.ts
- functions/src/create-benutzer.ts
- functions/src/create-benutzer.spec.ts
- functions/src/index.ts
- docs/projekt-plan.md
- docs/projekt-stand.md

Neu hinzugefügt:

- src/app/commons/utils/auth/technische-anmeldeadresse.ts
- src/app/commons/utils/auth/technische-anmeldeadresse.spec.ts
- functions/src/technische-anmeldeadresse.ts
- functions/src/technische-anmeldeadresse.spec.ts

### Schritt 1: Anmeldenamen und technische Adresse festlegen

- [x] Einen eigenständigen und unveränderlichen `anmeldename` im Profilmodell festlegen; der davon unabhängige Anzeigename darf
      weiterhin geändert werden.
- [x] Den Anmeldenamen nach dem Format `<normalisierter-name>-<rolle>` bilden, beispielsweise `harald.mischer-master`.
- [x] Den Namen kleinschreiben, Leerzeichen als Punkte normalisieren, vorhandene Punkte und Bindestriche erhalten, andere
      Sonderzeichen entfernen sowie Umlaute und `ß` nach einer eindeutigen Regel umschreiben.
- [x] Für alle Rollen die gemeinsame technische Domain `@pur-system.invalid` verwenden.
- [x] Vollständige Anmeldenamen rollenübergreifend eindeutig halten.
- [x] Sicherstellen, dass der Rollenbestandteil im Anmeldenamen keine Berechtigung gewährt.

### Schritt 2: Benutzeranlage umstellen

- [x] Den Anmeldenamen automatisch und nicht bearbeitbar aus Anzeigename und Benutzerrolle bilden.
- [x] Den vollständigen Anmeldenamen im Anlageformular anzeigen und die technische Firebase-Adresse dort ausblenden.
- [x] Den aus dem Anzeigenamen abgeleiteten Namensbestandteil zusammen mit Anzeigename und Benutzerrolle an die Callable
      Function übergeben, dort erneut normalisieren und Anmeldename sowie technische Adresse verbindlich erzeugen.
- [x] `anmeldename` im Benutzerprofil speichern und `email` ausschließlich als technische Firebase-Auth-Adresse führen.
- [x] Doppelte Anmeldenamen serverseitig ablehnen und verständlich melden.
- [x] Bei der Anlage eines Masterkontos `systemverwaltung` automatisch aktivieren und im Formular gegen Abwahl sperren.

### Schritt 3: Anmeldung und Darstellung umstellen

- [x] Das Loginformular auf Anmeldename und Passwort umstellen und keine Rollenauswahl anzeigen.
- [x] Den eingegebenen vollständigen Anmeldenamen normalisieren und intern `@pur-system.invalid` anhängen.
- [x] Mit der daraus gebildeten technischen Adresse den bestehenden Firebase-Login aufrufen.
- [x] Berechtigungen weiterhin ausschließlich aus dem gespeicherten Benutzerprofil ableiten.
- [x] Bei falschem Anmeldenamen oder Passwort eine gemeinsame neutrale Fehlermeldung anzeigen.
- [x] In Benutzerlisten und Profilkarte den Anmeldenamen statt der technischen Adresse verwenden; die technische Adresse bleibt im
      Bearbeitungsdialog einsehbar.

### Schritt 4: Neue Konten in Betrieb nehmen

- [x] Auf eine Migration der bisherigen Testkonten verzichten.
- [x] Einen neuen Master nach dem neuen Anmeldemodell anlegen und erfolgreich anmelden.
- [x] Alle weiteren Benutzerzugänge nach dem neuen Anmeldemodell neu anlegen.

### Tests und Abschluss

- [x] Unit-Tests für Normalisierung, Rollenbestandteil und technische Adressbildung ergänzen.
- [x] Benutzeranlage, serverseitige Adressbildung und doppelte Anmeldenamen in Frontend und Function testen.
- [x] Anmeldung mit Filial-, Office-, Mitarbeiter- und Master-Anmeldenamen in den vorgesehenen Auslieferungsvarianten manuell
      prüfen.
- [x] Prüfen, dass der Rollenbestandteil des Anmeldenamens keine zusätzlichen Berechtigungen gewährt.
- [x] Anlage, Anmeldung und Passwortänderung mit den neu angelegten Konten prüfen.
- [x] `projekt-plan.md` und `projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test`, `npm run test:functions` und alle Produktionsbuilds erfolgreich ausführen.

### Erledigt, wenn

- [x] Benutzer melden sich mit ihrem vollständigen Anmeldenamen und Passwort statt mit einer sichtbaren E-Mail-Adresse oder einer
      Rollenauswahl an.
- [x] Technische Firebase-Adressen werden nach einer zentral festgelegten und serverseitig geprüften Regel erzeugt.
- [x] Anzeigename und Anmeldename sind getrennt; eine Änderung des Anzeigenamens verändert den Zugang nicht.
- [x] Rollenbestandteil und Auslieferungsvariante verleihen keine Berechtigungen außerhalb des gespeicherten Benutzerprofils.
- [x] Neue Konten werden vollständig nach dem neuen Anmeldemodell angelegt.
- [x] Automatisierte Tests, Produktionsbuilds und reale Anmeldeprüfungen sind erfolgreich.

## 10. Done Todo: Rollenbezogene hierarchische Navigation und Systemverwaltung aufteilen

### 10.1 Rollenbezogene hierarchische App-Shell-Navigation vorbereiten

#### Ziel

Die App-Shell erhält eine zentral konfigurierte, rollenbezogene Navigationsstruktur, die sowohl direkte Links als auch
ausklappbare Gruppen mit Unterpunkten unterstützt. Die sichtbare Navigation ergibt sich aus der `userRole`, den für diese Rolle
grundsätzlich vorgesehenen Navigationseinträgen und den im Benutzerprofil gespeicherten `erlaubteBereiche`. Guards bleiben die
verbindliche Zugriffskontrolle. Eine eigene Component stellt flache Navigationslisten dar, eine zweite Component übernimmt
verschachtelte Navigationen mit ausklappbaren Gruppen.

#### Betroffene Dateien

Änderungen:

- src/app/components/app-shell/app-sidenav/app-sidenav.ts
- src/app/components/app-shell/app-sidenav/app-sidenav.html
- src/app/components/app-shell/app-sidenav/app-sidenav.scss
- src/app/components/app-shell/app-sidenav/app-sidenav.spec.ts
- src/app/guards/guard-navigation.ts
- src/app/guards/guard-navigation.spec.ts

Neu hinzuzufügen:

- src/app/commons/models/app/navigation.ts
- src/app/commons/constants/navigation.constants.ts
- src/app/commons/constants/navigation.constants.spec.ts
- src/app/commons/utils/navigation/rollen-navigation.ts
- src/app/commons/utils/navigation/rollen-navigation.spec.ts
- src/app/components/app-shell/app-sidenav/app-sidenav-flat-navigation/app-sidenav-flat-navigation.ts
- src/app/components/app-shell/app-sidenav/app-sidenav-flat-navigation/app-sidenav-flat-navigation.html
- src/app/components/app-shell/app-sidenav/app-sidenav-flat-navigation/app-sidenav-flat-navigation.scss
- src/app/components/app-shell/app-sidenav/app-sidenav-flat-navigation/app-sidenav-flat-navigation.spec.ts
- src/app/components/app-shell/app-sidenav/app-sidenav-nested-navigation/app-sidenav-nested-navigation.ts
- src/app/components/app-shell/app-sidenav/app-sidenav-nested-navigation/app-sidenav-nested-navigation.html
- src/app/components/app-shell/app-sidenav/app-sidenav-nested-navigation/app-sidenav-nested-navigation.scss
- src/app/components/app-shell/app-sidenav/app-sidenav-nested-navigation/app-sidenav-nested-navigation.spec.ts

#### Schritt 1: Navigationsmodell festlegen

- [x] Ein typsicheres Navigationsmodell für direkte Links und nicht navigierbare Gruppen mit untergeordneten Einträgen anlegen.
- [x] Für jede `userRole` eine eigene Navigationsstruktur und die Darstellung `flat` oder `nested` zentral konfigurieren.
- [x] Gemeinsame Navigationseinträge ohne unnötige Duplizierung wiederverwenden.
- [x] Routen, Labels, Material-Icons und zugehörige `TAppBereich`-Werte ausschließlich in der zentralen Konfiguration pflegen.
- [x] Festlegen, dass die Rolle aus dem geladenen Benutzerprofil maßgeblich bleibt und nicht aus der Auslieferungsvariante
      abgeleitet wird.

#### Schritt 2: Getrennte Darstellungskomponenten umsetzen

- [x] Die bisherige `mat-nav-list` in eine eigenständige Component für flache Navigationen überführen.
- [x] Eine eigenständige Component für verschachtelte Navigationen mit direkten Links und ausklappbaren Gruppen anlegen.
- [x] Beide Components über denselben Input für die bereits rollen- und bereichsbezogen gefilterten Navigationseinträge
      anbinden.
- [x] Beide Components über denselben Output über die Auswahl eines Navigationslinks informieren lassen.
- [x] Gruppen über einen eindeutig beschrifteten Schalter auf- und zuklappbar machen und untergeordnete Routen visuell
      einrücken.
- [x] Gruppen ohne sichtbare Unterpunkte vollständig ausblenden.
- [x] Aktive Unterrouten hervorheben und ihre übergeordnete Gruppe beim direkten Seitenaufruf automatisch öffnen.
- [x] Auf kleinen Bildschirmen die Sidebar erst nach Auswahl eines Links schließen; das Öffnen einer Gruppe schließt sie nicht.

#### Schritt 3: Rollenbezogene Darstellung in der App-Shell auswählen

- [x] In `AppSidenav` anhand der Navigationskonfiguration der aktiven `userRole` zwischen flacher und verschachtelter Component
      wählen.
- [x] Nur Links an die Darstellungskomponente übergeben, die sowohl in der Navigationsstruktur der Rolle als auch in
      `erlaubteBereiche` enthalten sind.
- [x] Benutzerkarte, Produkttitel und das Schließen der Sidebar auf kleinen Bildschirmen weiterhin zentral in `AppSidenav`
      koordinieren.
- [x] Verhindern, dass die beiden Darstellungskomponenten eigene Rollen- oder Berechtigungslogik duplizieren.

#### Schritt 4: Navigation und Ausweichrouten konsistent halten

- [x] Die Ermittlung erreichbarer Start- und Ausweichrouten an dieselbe Rollen- und Bereichslogik anbinden.
- [x] Verhindern, dass ein Navigationseintrag sichtbar wird, dessen Route für die jeweilige Rolle nicht erreichbar ist.
- [x] Die Rollen- und Bereichsprüfung weiterhin durch die vorhandenen Routenguards absichern.

#### Tests und Abschluss

- [x] Die flache Navigation isoliert auf Links, aktiven Zustand und Auswahlereignis testen.
- [x] Die verschachtelte Navigation isoliert auf direkte Links, Gruppen, Unterpunkte und Auswahlereignis testen.
- [x] In `AppSidenav` die Auswahl der richtigen Darstellung für alle vier Rollen sowie erlaubte und nicht erlaubte Bereiche
      testen.
- [x] Auf- und Zuklappen, automatische Öffnung bei aktiver Unterroute, ausgeblendete leere Gruppen und das Verhalten auf kleinen
      Bildschirmen prüfen.
- [x] Guard-Tests für rollenbezogene Start- und Ausweichrouten aktualisieren.
- [x] Navigation mit Tastatur, sichtbarem Fokus und geeigneten zugänglichen Bezeichnungen manuell prüfen.
- [x] `projekt-plan.md` und `projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test` und `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Jede Benutzerrolle verwendet eine eigene zentral definierte Navigationsstruktur.
- [x] Rollen mit flacher Navigation verwenden die dafür vorgesehene Component.
- [x] Rollen mit direkten Links und ausklappbaren Gruppen verwenden die verschachtelte Navigations-Component.
- [x] `AppSidenav` wählt die Darstellung rollenbezogen aus, ohne Rollen- oder Berechtigungslogik in den
      Darstellungskomponenten zu duplizieren.
- [x] Sichtbare Navigation, erlaubte Bereiche und Routenguards führen nicht zu widersprüchlichen Zugriffsergebnissen.
- [x] Automatisierte Tests und die manuelle Bedienprüfung sind erfolgreich.

### 10.2 Systemverwaltung in zwei Unterseiten aufteilen

#### Ziel

Der bisherige lange Bereich `Systemverwaltung` wird in der Sidebar als ausklappbare Gruppe dargestellt. Die Gruppe enthält die
Unterpunkte `Datenstruktur anlegen` und `Benutzerverwaltung`. Die Benutzerverwaltung bündelt weiterhin die Anlage neuer Benutzer
und die Bearbeitung vorhandener Benutzerprofile. Beide Unterseiten verwenden zunächst gemeinsam den bestehenden
Bereichsschlüssel `systemverwaltung` und bleiben ausschließlich für aktive Master erreichbar.

#### Betroffene Dateien

Änderungen:

- src/app/app.routes.ts
- src/app/app.routes.spec.ts
- src/app/components/app-shell/app-sidenav/app-sidenav.spec.ts
- src/app/commons/constants/navigation.constants.spec.ts
- src/app/commons/constants/navigation.constants.ts
- src/app/guards/guard-navigation.ts
- src/app/guards/guard-navigation.spec.ts
- src/app/pages/systemverwaltung-page/datenstruktur-page/datenstruktur-page.ts
- src/app/pages/systemverwaltung-page/datenstruktur-page/datenstruktur-page.spec.ts

Neu hinzuzufügen:

- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-page.ts
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-page.html
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-page.scss
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-page.spec.ts

Zu löschen:

- src/app/pages/systemverwaltung-page/systemverwaltung-page.ts
- src/app/pages/systemverwaltung-page/systemverwaltung-page.html
- src/app/pages/systemverwaltung-page/systemverwaltung-page.scss
- src/app/pages/systemverwaltung-page/systemverwaltung-page.spec.ts

#### Schritt 1: Unterrouten festlegen

- [x] `systemverwaltung` als komponentenlosen Elternpfad mit untergeordneten Routen konfigurieren.
- [x] Die Unterroute `/systemverwaltung/datenstruktur` für die bestehende Datenstruktur-Anlage einrichten.
- [x] Die Unterroute `/systemverwaltung/benutzer` für Benutzeranlage und Benutzerverwaltung einrichten.
- [x] `/systemverwaltung` auf `/systemverwaltung/datenstruktur` weiterleiten, damit bestehende Aufrufe ein eindeutiges Ziel haben.
- [x] Beide Unterrouten mit Bereichs- und Masterprüfung schützen und direkte Aufrufe ohne Berechtigung sicher umleiten.

#### Schritt 2: Seiten fachlich trennen

- [x] Die Datenstruktur-Anlage als eigenständigen Seiteninhalt unter ihrer Unterroute darstellen.
- [x] Eine `BenutzerPage` anlegen, die `Benutzer anlegen` und `Benutzer verwalten` in dieser Reihenfolge bündelt.
- [x] Die nicht mehr benötigte `SystemverwaltungPage` einschließlich Template, Styles und Spec entfernen.
- [x] Seitentitel, Toolbar-Titel und Überschriften an die jeweils geöffnete Unterseite anpassen.
- [x] Die bestehende Formular-, Store- und Service-Logik ohne fachliche Verhaltensänderung weiterverwenden.

#### Schritt 3: Systemverwaltung in die hierarchische Navigation aufnehmen

- [x] `Systemverwaltung` in der Master-Navigation als nicht navigierbare, ausklappbare Gruppe konfigurieren.
- [x] `Datenstruktur anlegen` und `Benutzerverwaltung` als untergeordnete Navigationslinks aufnehmen.
- [x] Die Gruppe bei einer aktiven Systemverwaltungs-Unterroute automatisch geöffnet darstellen.
- [x] Für andere Rollen weder die Gruppe noch ihre Unterpunkte anzeigen.

#### Tests und Abschluss

- [x] Routing-Tests für Weiterleitung, direkte Unterrouten und Master-Schutz ergänzen.
- [x] Component-Tests für die getrennten Seiten und die weiterhin eingebundenen Fachkomponenten ergänzen beziehungsweise
      anpassen.
- [x] Sidebar-Tests für Gruppenschalter, Unterpunkte, aktiven Zustand und rollenabhängige Sichtbarkeit ergänzen.
- [x] Beide Unterseiten auf Desktop und einem kleinen Viewport manuell prüfen.
- [x] `projekt-plan.md` und `projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test` und `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [x] `Systemverwaltung` lässt sich in der Master-Sidebar auf- und zuklappen.
- [x] Datenstruktur-Anlage und Benutzerverwaltung sind über eigene, direkt aufrufbare Unterrouten erreichbar.
- [x] Benutzeranlage und Bearbeitung vorhandener Benutzerprofile bleiben gemeinsam auf der Benutzerverwaltungsseite verfügbar.
- [x] Nicht berechtigte Rollen sehen keine Systemverwaltungsnavigation und können keine der Unterrouten öffnen.
- [x] Automatisierte Tests, Build und manuelle Bedienprüfung sind erfolgreich.

## 11. Pflichtbereiche für Benutzerprofile verbindlich machen

### Ziel

Das Dashboard bleibt für jede Benutzerrolle eine verpflichtende Hauptseite. Die Systemverwaltung gehört ausschließlich zu
Masterprofilen. Beide Pflichtbereiche werden nicht mehr als frei wählbare Checkboxen dargestellt. Frontend, Callable Function und
Firestore Rules setzen dieselbe Regel bei Anlage und Bearbeitung durch.

### Betroffene Dateien

Änderungen:

- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-anlage/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-page.spec.ts
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-verwaltung/benutzer-bearbeiten-dialog/
- src/app/services/domain/benutzer.service.ts
- src/app/services/domain/benutzer.service.spec.ts
- src/app/stores/domain/benutzer-verwaltung.store.ts
- src/app/stores/domain/benutzer-verwaltung.store.spec.ts
- functions/src/create-benutzer.ts
- functions/src/create-benutzer.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/projekt-plan.md
- docs/projekt-stand.md

Neu hinzuzufügen:

- src/app/commons/utils/benutzer/erlaubte-bereiche.ts
- src/app/commons/utils/benutzer/erlaubte-bereiche.spec.ts

### Schritt 1: Pflichtbereiche zentral normalisieren

- [x] Die optional wählbaren Bereiche `schichtplan`, `mitarbeiter` und `verwaltung` zentral festlegen.
- [x] `dashboard` für jede Rolle und `systemverwaltung` ausschließlich für Master ergänzen.
- [x] Manipulierte oder doppelte Pflichtbereichswerte aus Eingaben bereinigen.
- [x] Bereits vorhandene Profile beim Laden auf die Pflichtbereichsregel normalisieren.

### Schritt 2: Anlage und Bearbeitung vereinfachen

- [x] In beiden Formularen ausschließlich die optionalen Bereiche als Checkboxen anzeigen.
- [x] Anlage- und Aktualisierungspayloads vor dem Speichern normalisieren.

### Schritt 3: Backend und Rules absichern

- [x] Die Callable Function die Pflichtbereiche unabhängig vom Client verbindlich setzen lassen.
- [x] Leere Auswahlen optionaler Bereiche bei der Anlage zulassen.
- [x] Profilaktualisierungen ohne Dashboard oder mit einer zur Rolle unpassenden Systemverwaltung in den Firestore Rules ablehnen.

### Tests und Abschluss

- [x] Frontend-Tests für optionale Checkboxen und rollenabhängige Pflichtbereiche erfolgreich ausführen.
- [x] Functions-Tests für serverseitige Normalisierung erfolgreich ausführen.
- [x] Firestore-Emulator-Tests für die Pflichtbereichsregeln erfolgreich ausführen.
- [x] Produktionsbuild erfolgreich ausführen.
- [x] Benutzeranlage und Bearbeitungsdialog manuell prüfen.
- [x] Callable Function und Firestore Rules deployen und mit Testkonten prüfen.

### Erledigt, wenn

- [x] Dashboard ist in jedem neu angelegten oder bearbeiteten Benutzerprofil enthalten.
- [x] Systemverwaltung ist genau bei Masterprofilen enthalten.
- [x] Dashboard und Systemverwaltung werden nicht als Checkboxen angezeigt.
- [x] Nur Schichtplan, Mitarbeiter und Verwaltung bleiben frei wählbar.
- [x] Automatisierte Tests und Build sind erfolgreich.
- [x] Die produktive Firebase-Konfiguration ist deployed und mit realen Profilen geprüft.

## 12. Eigenes Benutzerprofil in Echtzeit überwachen und Inaktivstatus global anzeigen

### Ziel

Das Profil des aktuell angemeldeten Benutzers wird während der gesamten Sitzung in Echtzeit überwacht. Wird es deaktiviert, zeigt
die Anwendung global einen nicht ausblendbaren Hinweis an. Das gilt auch, wenn eine dauerhaft angemeldete Anwendung offline neu
gestartet wird: Sobald wieder eine Internetverbindung besteht, wird der aktuelle Profilstatus vom Server übernommen und der Hinweis
gegebenenfalls angezeigt. Eine persistente lokale Firestore-Datenhaltung ist dafür nicht erforderlich und bleibt einer späteren
PWA-Konzeption vorbehalten.

### Betroffene Dateien

Änderungen:

- src/app/app.ts
- src/app/app.html
- src/app/app.scss
- src/app/app.spec.ts
- src/app/commons/tokens/firebase.tokens.ts
- src/app/services/firebase/firestore-db.service.ts
- src/app/services/firebase/firestore-db.service.spec.ts
- src/app/services/domain/benutzer.service.ts
- src/app/services/domain/benutzer.service.spec.ts
- src/app/stores/app/benutzer.store.ts
- src/app/stores/app/benutzer.store.spec.ts
- docs/projekt-plan.md
- docs/projekt-stand.md

Neu hinzuzufügen:

- src/app/commons/models/app/global-banner.types.ts
- src/app/services/core/global-banner.service.ts
- src/app/services/core/global-banner.service.spec.ts
- src/app/components/app-shell/global-banner/global-banner.ts
- src/app/components/app-shell/global-banner/global-banner.html
- src/app/components/app-shell/global-banner/global-banner.scss
- src/app/components/app-shell/global-banner/global-banner.spec.ts

### Schritt 1: Eigenes Profil in Echtzeit beobachten

- [x] Für das Dokument `benutzerprofil/{uid}` einen Echtzeit-Listener über die technische Firestore-Anbindung bereitstellen.
- [x] Profiländerungen über den fachlichen Benutzerservice an den Benutzer-Store weitergeben.
- [x] Den Listener nach wiederhergestellter Anmeldung und bei einem Benutzerwechsel eindeutig starten.
- [x] Den bisherigen Listener bei Abmeldung, Benutzerwechsel und beim Beenden des zugehörigen Kontexts zuverlässig entfernen.

### Schritt 2: Online-, Offline- und Fehlerverhalten festlegen

- [x] Beim Online-Start den aktuellen Profilstatus vom Server übernehmen.
- [x] Beim Offline-Start die bestehende Anmeldung erhalten und auf die nächste verfügbare Serveraktualisierung warten.
- [x] Nach wiederhergestellter Verbindung einen inzwischen geänderten Aktivstatus übernehmen.
- [x] Listenerfehler kontrolliert behandeln, ohne einen aktiven Benutzer allein aufgrund eines Verbindungsfehlers als inaktiv zu
      markieren.
- [x] Die persistente Firestore-Datenhaltung in dieser Aufgabe ausdrücklich nicht aktivieren.

### Schritt 3: Inaktivstatus global anzeigen

- [x] Einen einfachen globalen Banner-Service für genau einen Hinweis mit Art, Text und Quelle bereitstellen.
- [x] Eine nicht ausblendbare App-Shell-Component für die globale Darstellung unterhalb der Toolbar bereitstellen.
- [x] Unterhalb der Toolbar einen globalen, nicht ausblendbaren Banner für ein inaktives eigenes Profil anzeigen.
- [x] Den Text „Dieses Profil ist inaktiv. Bitte wende dich an einen Administrator.“ verwenden.
- [x] Den Banner ausblenden, sobald kein inaktives angemeldetes Profil mehr vorliegt.
- [x] Festlegen und absichern, welche Navigation für ein inaktives, weiterhin authentifiziertes Profil noch möglich ist,
      insbesondere für Login- und Passwortseite.

### Tests und Abschluss

- [x] Service-Tests für Profilaktualisierung, Listenerfehler und das Beenden des Listeners ergänzen.
- [x] Store-Tests für Anmeldung, Benutzerwechsel, Abmeldung, Deaktivierung und erneute Aktivierung ergänzen.
- [x] Service-, Component- und App-Tests für Zustand, Sichtbarkeit, Inhalt und Ausblendung des globalen Banners ergänzen.
- [x] Den Ablauf bei laufender Anwendung sowie nach einem Online- und Offline-Neustart manuell prüfen.
- [x] `npm test` ohne Watch-Modus erfolgreich ausführen.
- [x] Produktionsbuild erfolgreich ausführen.
- [x] Architektur-, Betriebs- und Umsetzungsstand zur gewählten Lösung aktualisieren.

### Erledigt, wenn

- [x] Eine serverseitige Deaktivierung des eigenen Profils wird bei bestehender Verbindung ohne Neustart sichtbar.
- [x] Nach einem offline gestarteten Anwendungslauf erscheint der Banner bei der nächsten Internetverbindung, wenn das Profil
      inzwischen deaktiviert wurde.
- [x] Abmeldung und Benutzerwechsel hinterlassen keinen Listener des vorherigen Profils.
- [x] Verbindungsfehler führen nicht fälschlich zu einem Inaktivstatus.
- [x] Der globale Banner ist barrierearm, nicht ausblendbar und in allen vereinbarten Anwendungsbereichen sichtbar.
- [x] Automatisierte Tests, Produktionsbuild, manuelle Prüfungen und Dokumentation sind abgeschlossen.

## 13. Mitarbeiterliste mit Anlage und Bearbeitung

#### Ziel

Der Mitarbeiterbereich erhält unter `/mitarbeiter/liste` eine Übersicht der fachlichen Mitarbeiterdatensätze. Eine Card zum
Hinzufügen öffnet den `MitarbeiterAnlegenDialog`; vorhandene Mitarbeiter werden als `MitarbeiterCard` mit kompakten Details und
einer Bearbeitungsaktion dargestellt. Der `MitarbeiterBearbeitenDialog` ermöglicht die Änderung eines vorhandenen Datensatzes.
Eine eigene geroutete Anlage- oder Detailseite ist nicht vorgesehen.

Ein fachlicher Mitarbeiterdatensatz beschreibt eine in einer Firma beziehungsweise Filiale beschäftigte Person. Er bleibt vom
Firebase-Auth-Benutzer mit `userRole: mitarbeiter`, dessen Anmeldung über `auth/login-page` und dem späteren betrieblichen
Mitarbeiter-Login getrennt.

#### Betroffene Dateien

Änderungen:

- src/app/app.routes.ts
- src/app/app.routes.spec.ts
- src/app/commons/constants/firebase.constants.ts
- src/app/commons/constants/navigation.constants.ts
- src/app/commons/constants/navigation.constants.spec.ts
- src/app/commons/models/domain/mitarbeiter.ts
- src/app/commons/utils/navigation/rollen-navigation.ts
- src/app/commons/utils/navigation/rollen-navigation.spec.ts
- src/app/components/app-shell/app-sidenav/app-sidenav.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-page.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-page.html
- src/app/pages/mitarbeiter-page/mitarbeiter-page.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-page.spec.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/projekt-plan.md
- docs/projekt-stand.md

Neu hinzuzufügen:

- src/app/commons/utils/mitarbeiter/mitarbeiter-berechtigung.ts
- src/app/commons/utils/mitarbeiter/mitarbeiter-berechtigung.spec.ts
- src/app/guards/mitarbeiter-verwaltung.guard.ts
- src/app/guards/mitarbeiter-verwaltung.guard.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.html
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.html
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-card/mitarbeiter-card.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.html
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-anlegen-dialog/mitarbeiter-anlegen-dialog.spec.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.ts
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.html
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.scss
- src/app/pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-bearbeiten-dialog/mitarbeiter-bearbeiten-dialog.spec.ts
- src/app/services/domain/mitarbeiter.service.ts
- src/app/services/domain/mitarbeiter.service.spec.ts
- src/app/stores/domain/mitarbeiter.store.ts
- src/app/stores/domain/mitarbeiter.store.spec.ts

#### Schritt 1: Fachlichen Mitarbeiterdatensatz und Berechtigungen festlegen

- [x] Pflichtfelder, optionale Stammdaten und Beschäftigungsdaten vor der technischen Umsetzung verbindlich festlegen.
- [x] Festlegen, ob ein Mitarbeiter auf Firmenebene gespeichert und einer oder mehreren Filialen zugeordnet wird.
- [x] Den Firestore-Pfad und die Form der Filialzuordnungen festlegen, ohne den betrieblichen Login vorwegzunehmen.
- [x] Festlegen, welche Benutzerrollen Mitarbeiter lesen, anlegen und bearbeiten dürfen und auf welche Firmen und Filialen ihre
      Aktionen begrenzt sind.
- [x] `mitarbeiter` in `erlaubteBereiche` ausschließlich als grobe Freigabe des Mitarbeiterbereichs festlegen; die Freigabe darf
      nicht automatisch alle untergeordneten Routen und Aktionen erlauben.
- [x] Eine verbindliche Rollenmatrix für Sichtbarkeit, direkten Routenzugriff sowie Lese- und Schreibaktionen je Unterseite
      festlegen.
- [x] Ausschließen, dass `userRole: mitarbeiter` allein durch den gleichnamigen App-Bereich Verwaltungsrechte für fachliche
      Mitarbeiterdatensätze erhält.
- [x] Fachlichen Mitarbeiterdatensatz, betrieblichen Mitarbeiter-Login und persönlichen Firebase-Auth-Zugang eindeutig
      voneinander abgrenzen.

#### Schritt 2: Domänenmodell und Datenzugriff vorbereiten

- [x] Anwendungs-, Anlage-, Aktualisierungs- und Firestore-Typen in `mitarbeiter.ts` gemäß den beschlossenen Feldern ergänzen.
- [x] Den beschlossenen Mitarbeiterpfad zentral in den Firebase-Konstanten abbilden.
- [x] Einen fachlichen Service mit `loadMitarbeiter`, `createMitarbeiter` und `updateMitarbeiter` ergänzen.
- [x] Einen Domain-Store mit `download`, `isLoaded`, `inProgress`, Fehlerzustand sowie Lade- und Schreibmethoden bereitstellen.
- [x] Firestore Rules für die beschlossene Rollen- und Datenzugriffsbegrenzung ergänzen.

#### Schritt 3: Komponentenlosen Elternpfad und Mitarbeiterliste umsetzen

- [x] Die bisherige `MitarbeiterPage` einschließlich Template, Styles und Spec entfernen und `mitarbeiter-page` nur als
      Feature-Ordner verwenden.
- [x] `mitarbeiter` als komponentenlosen Elternpfad mit den vorhandenen Bereichsprüfungen und einem zusätzlichen fachlichen
      Guard konfigurieren.
- [x] `/mitarbeiter` auf `/mitarbeiter/liste` weiterleiten und die geschützte Child-Route mit dem Titel „Mitarbeiter“
      einrichten.
- [x] `Mitarbeiter` für berechtigte Rollen als nicht navigierbare, ausklappbare Sidebar-Gruppe konfigurieren und
      `Mitarbeiterliste` als ersten untergeordneten Link aufnehmen.
- [x] Die Filialnavigation für die Mitarbeitergruppe ausdrücklich von `flat` auf `nested` umstellen; weitere Rollen nur gemäß
      der beschlossenen Rollenmatrix umstellen.
- [x] Die Bereichsfreigabe am Elternpfad und den fachlichen Mitarbeiterverwaltungs-Guard an der Listenroute durchsetzen.
- [x] Erlaubte Mitarbeiter laden und als `MitarbeiterCard` mit den beschlossenen kompakten Angaben darstellen.
- [x] Leere Listen, laufende Ladevorgänge und Ladefehler verständlich darstellen.

#### Schritt 4: Anlage und Bearbeitung in getrennten Dialogen umsetzen

- [x] Eine Card zum Hinzufügen bereitstellen, die den `MitarbeiterAnlegenDialog` öffnet.
- [x] Anlage- und Bearbeitungsdialog als Reactive Forms mit den in Schritt 1 beschlossenen Feldern und verständlichen
      Validierungsmeldungen umsetzen.
- [x] Den fachlichen Mitarbeiterverwaltungszugriff auch vor dem Öffnen und Ausführen der Schreibaktionen prüfen.
- [x] Firmen- und Filialauswahl ausschließlich aus den fachlich erlaubten Datenzugriffen des angemeldeten Benutzers
      bereitstellen.
- [x] Den Bearbeitungsdialog mit dem vollständigen Mitarbeiterdatensatz initialisieren und unveränderliche Identifikationsdaten
      nicht überschreibbar darstellen.
- [x] Während `inProgress` das gesamte betroffene Formular und alle weiteren datenverändernden Aktionen deaktivieren und
      wiederholte Submit-Aufrufe verhindern.
- [x] Nach erfolgreicher Anlage den Anlagendialog schließen und die neue Card ohne vollständiges Neuladen anzeigen.
- [x] Nach erfolgreicher Bearbeitung den Dialog schließen und die vorhandene Card mit den bestätigten Daten aktualisieren.
- [x] Bei einem Fehler die Eingaben erhalten und eine verständliche Fehlermeldung anzeigen.

#### Tests und Abschluss

- [x] Service- und Store-Tests für Laden, Anlage, Bearbeitung, Zustandsübergänge und relevante Fehlerfälle ergänzen.
- [x] Routing- und Guard-Tests für Weiterleitung sowie erlaubte und abgelehnte direkte Aufrufe ergänzen.
- [x] Navigationstests für die ausklappbare Mitarbeitergruppe, den untergeordneten Listenlink und die rollenabhängige
      Sichtbarkeit ergänzen.
- [x] Component-Tests für Liste, Cards, Dialogöffnung, Validierung, laufenden Submit, Erfolg und Fehler ergänzen.
- [x] Firestore-Emulator-Tests für zulässige Lese- und Schreibzugriffe sowie abgelehnte Rollen- oder Datenzugriffe ergänzen.
- [x] Mitarbeiterliste sowie beide Dialoge auf Desktop und einem kleinen Viewport einschließlich Tastaturbedienung und sichtbarem
      Fokus manuell prüfen.
- [x] `projekt-plan.md` und `projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test` und `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Berechtigte Benutzer sehen unter `/mitarbeiter/liste` ausschließlich Mitarbeiter aus ihrem erlaubten Datenbereich.
- [x] Berechtigte Benutzer können Mitarbeiter über getrennte Dialoge anlegen und bearbeiten.
- [x] Nicht berechtigte Benutzer können die Liste und ihre Schreibaktionen weder über die Navigation noch direkt verwenden.
- [x] Die Mitarbeitergruppe erscheint nur für die gemäß Rollenmatrix berechtigten Rollen und verwendet dort die
      Nested-Navigation.
- [x] Die Bereichsfreigabe `mitarbeiter` allein gewährt keine fachlichen Verwaltungsrechte auf untergeordnete Routen oder
      Aktionen.
- [x] Mitarbeiterdatensatz, persönlicher Firebase-Auth-Zugang und späterer betrieblicher Mitarbeiter-Login bleiben getrennt.
- [x] Lade-, Formular-, Erfolgs- und Fehlerzustände funktionieren nachvollziehbar und barrierearm.
- [x] Automatisierte Tests, Produktionsbuild und manuelle Bedienprüfung sind erfolgreich.

## 15. User-Mitarbeiter mit Firmen-Mitarbeiter verknüpfen

### Ziel

Bei der Anlage eines Firebase-Auth-Benutzers mit `userRole: mitarbeiter` wird ein bereits vorhandener fachlicher Mitarbeiter
eindeutig zugeordnet. Der Master wählt zuerst einen Unternehmer, danach eine Firma und anschließend einen aktiven, noch nicht
verknüpften Mitarbeiter dieser Firma aus.

Unternehmer und Firma werden im Benutzerprofil über genau einen Eintrag in `zugriffe` gespeichert. Die String-ID des fachlichen
Mitarbeiters wird zusätzlich als `firmaMitarbeiterId` gespeichert. Der betriebliche Mitarbeiter-Login aus Todo 14 bleibt von
dieser Verknüpfung getrennt.

#### Betroffene Dateien

Änderungen:

- src/app/commons/models/domain/benutzer.ts
- src/app/commons/models/domain/mitarbeiter.ts
- src/app/components/datenzugriff-auswahl/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-anlage/
- src/app/pages/systemverwaltung-page/benutzer-page/benutzer-page.spec.ts
- src/app/services/domain/benutzer.service.ts
- src/app/services/domain/benutzer.service.spec.ts
- src/app/services/firebase/benutzer-verwaltung.service.ts
- src/app/services/firebase/benutzer-verwaltung.service.spec.ts
- src/app/stores/domain/benutzer-verwaltung.store.ts
- src/app/stores/domain/benutzer-verwaltung.store.spec.ts
- functions/src/create-benutzer.ts
- functions/src/create-benutzer.spec.ts
- functions/src/index.ts
- firestore.rules
- rules-tests/firestore.rules.test.mjs
- docs/berechtigungs-matrizen.md
- docs/projekt-plan.md
- docs/projekt-stand.md

### Schritt 1: Verknüpfungsmodell und Eindeutigkeit festlegen

- [x] Für Benutzer mit `userRole: mitarbeiter` genau einen Unternehmer und genau eine Firma in `zugriffe` zulassen.
- [x] Für diese Rolle eine leere Filialliste innerhalb der ausgewählten Firma zulassen, weil die Filialzuordnungen aus dem
      fachlichen Mitarbeiterdatensatz gelesen werden.
- [x] `firmaMitarbeiterId` als optionale String-ID im Benutzerprofil festlegen und ausschließlich für `userRole: mitarbeiter`
      zulassen.
- [x] Die vollständige Mitarbeiterreferenz aus dem einzigen Unternehmer, der einzigen Firma und `firmaMitarbeiterId` bilden.
- [x] Eine serverseitige Strategie festlegen, die auch bei parallelen Aufrufen genau einen User-Mitarbeiter je Firmen-Mitarbeiter
      sicherstellt.
- [x] Festlegen, wie eine Verknüpfung bei fehlgeschlagener Kontoanlage, Kontodeaktivierung oder einer später notwendigen
      Aufhebung konsistent behandelt wird.

### Schritt 2: Reduzierte Mitarbeiterauswahl bereitstellen

- [x] Mitarbeiter der ausgewählten Firma clientseitig direkt aus Firestore laden.
- [x] Die Auswahl im Client auf aktive und noch nicht verknüpfte Mitarbeiter begrenzen.
- [x] In der Auswahl ausschließlich Mitarbeiter-ID und einen aus den Personendaten gebildeten Anzeigenamen verwenden.
- [x] Unternehmer- und Firmenwechsel in der Benutzeranlage eindeutig behandeln und abhängige Auswahlwerte zurücksetzen.

### Schritt 3: Benutzeranlage und Verknüpfung umsetzen

- [x] Bei `userRole: mitarbeiter` Unternehmer-, Firmen- und Mitarbeiterauswahl als Pflichtfelder in die Benutzeranlage aufnehmen.
- [x] Für andere Benutzerrollen keine `firmaMitarbeiterId` annehmen oder speichern.
- [x] Den Mitarbeiter serverseitig erneut auf Firma, Aktivstatus und noch nicht vorhandene Verknüpfung prüfen.
- [x] `zugriffe` für User-Mitarbeiter als genau eine Firma mit leerer Filialliste normalisieren und `firmaMitarbeiterId` separat im
      Benutzerprofil speichern.
- [x] Auth-Benutzer, Benutzerprofil und Eindeutigkeitsverknüpfung so anlegen, dass bei einem Fehler kein halbfertiger Zugang oder
      eine verwaiste Verknüpfung bestehen bleibt.
- [x] Die bisherigen Anlageabläufe für Master, Office und Filiale unverändert erhalten.

### Tests und Abschluss

- [x] Functions-Tests für fremde Firma, inaktiven Mitarbeiter, doppelte Verknüpfung und parallele Anlage ergänzen.
- [x] Service-Tests für die clientseitige Auswahl aktiver, noch nicht verknüpfter Mitarbeiter ergänzen.
- [x] Frontend-Tests für abhängige Auswahlfelder, Rollenwechsel, Pflichtvalidierung, Ladefehler und erfolgreiche Anlage
      ergänzen.
- [x] Rückabwicklungstests für Fehler nach angelegtem Auth-Benutzer oder während der Verknüpfung ergänzen.
- [x] Benutzeranlage mit allen vier Auth-Rollen auf unverändertes beziehungsweise neues Verhalten prüfen.
- [x] Nach Umsetzung der Mitarbeiteranlage aus Todo 13 einen Test-Firmenmitarbeiter anlegen und dessen Verknüpfung mit einem
      realen Testkonto kontrolliert prüfen, ohne einen produktiven Mitarbeiterzugang unbeabsichtigt zu verändern.
- [x] `berechtigungs-matrizen.md`, `projekt-plan.md` und `projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test` und `npm run build` erfolgreich ausführen.

### Erledigt, wenn

- [x] Ein aktiver Master kann einen User-Mitarbeiter nur mit einem aktiven, noch nicht verknüpften Mitarbeiter der gewählten
      Firma anlegen.
- [x] Das Benutzerprofil enthält genau einen Unternehmer, genau eine Firma, eine leere Filialliste und die zugehörige
      `firmaMitarbeiterId`.
- [x] Die Mitarbeiter-App kann aus dem eigenen Benutzerprofil den vollständigen Pfad des fachlichen Mitarbeiterdatensatzes
      bestimmen.
- [x] Ein Firmen-Mitarbeiter kann auch bei parallelen Anlageversuchen höchstens einem User-Mitarbeiter zugeordnet werden.
- [x] Die Mitarbeiterauswahl zeigt ausschließlich Mitarbeiter-ID und Anzeigenamen.
- [x] Fehler hinterlassen weder einen halbfertigen Auth-Benutzer noch eine verwaiste oder doppelte Verknüpfung.
- [x] Bestehende Benutzerrollen und ihre Anlageabläufe bleiben funktionsfähig.
- [x] Automatisierte Tests, Produktionsbuild und kontrollierte manuelle Prüfung sind erfolgreich.
