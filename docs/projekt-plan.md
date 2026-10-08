<!-- pur-system/docs/projekt-plan.md -->

# Projekt-Plan: Pur-System

## Produktidee

Pur-System ist eine Angular-Anwendung zur Darstellung und Bearbeitung von Organisationsdaten sowie zur kontrollierten Verwaltung
von Benutzerzugängen. Es wird in den technischen Auslieferungsvarianten Pur Master, Pur Office, Pur Filiale und Pur Mitarbeiter
bereitgestellt.

## Zielrichtung

- Die fachlichen App-Bereiche lesen Daten aus Firestore und schreiben ausschließlich die jeweils ausdrücklich freigegebenen Daten.
- Die Systemverwaltung bündelt administrative Vorgänge des Masters. Die Verwaltung erlaubt Office und Master das Aktualisieren
  bestehender Firmen- und Filialdaten innerhalb der Firestore Rules. Sicherheitskritische Auth-Vorgänge laufen über ein
  geschütztes Backend.
- Fachliche Bereiche werden klar getrennt.
- UI und Datenzugriff werden über Components, Stores und Services getrennt.
- Das System wird als vier getrennte, installierbare Progressive Web Apps für Master, Office, Filiale und Mitarbeiter
  ausgeliefert.

## Architektur

- Firestore dient für die fachlichen App-Bereiche als Datenquelle für lesende und gezielt freigegebene schreibende Zugriffe.
- Sicherheitskritische administrative Vorgänge an Firebase Auth werden über geschützte Firebase Cloud Functions mit Firebase Admin
  SDK ausgeführt.
- Fachliche Verwaltungsdaten können durch einen aktiven Master direkt aus dem Angular-Client in Firestore geschrieben werden.
  Aktive Office-Konten dürfen ausschließlich ihre zugeordneten Firmen- und Filialdokumente aktualisieren.
- Firestore Rules bleiben bewusst einfach und sichern nur Zugriff und Besitz.
- Fachliche Regeln, Feldvalidierung und UI-Logik werden in der Anwendung umgesetzt.
- Feature-Bereiche werden lazy geladen.
- Persistenter App-State wird zentral und nachvollziehbar gekapselt.

### Architektur-Schichten

- Components enthalten UI und einfache Formular- oder Interaktionslogik.
- Stores halten App-State sowie Lade- und Fehlerzustände. Fachliche Stores beauftragen die für ihre Daten zuständigen Services.
- Fachliche Services kapseln Domänen-Mapping, Sortierung und fachlich benannte Datenoperationen.
- Der `AppSitzungsInitService` koordiniert den Sitzungsstart. Er initialisiert den `BenutzerStore`, wartet auf ein aktives
  Benutzerprofil und stößt anschließend das Laden der zwingend benötigten Stammdaten an.
- Der `AppDatenInitService` bestimmt anhand von `userRole` und `zugriffe`, welche Stammdaten für die aktuelle Sitzung benötigt
  werden. Die konkreten Daten werden weiterhin durch die fachlichen Stores und Services geladen und gehalten.
- Der technische `FirestoreDbService` kapselt direkte AngularFire-Aufrufe, den Angular-Injection-Kontext, die globale
  Registrierung lesender Ladevorgänge, die auswählbare Datenquellenstrategie und Echtzeit-Listener für einzelne Dokumente.
- Firestore-Collection- und Dokumentpfade werden zentral erzeugt und nicht in fachlichen Services zusammengesetzt.
- Der Sitzungsstart folgt dem Datenfluss
  `App -> AppSitzungsInitService -> BenutzerStore -> AppDatenInitService -> fachliche Stores und Services`.
- Fachliche Ladevorgänge folgen dem Datenfluss
  `Component oder AppDatenInitService -> Store -> fachlicher Service -> FirestoreDbService -> Firebase/Firestore`.
- Der app-weite `GlobalBannerService` verwaltet genau einen globalen Hinweis. Die zugehörige App-Shell-Component stellt Art,
  Text und semantische Live-Rolle unterhalb der Toolbar dar. Fachliche Zustände bleiben in ihren Stores und werden in der
  App-Shell auf den Banner-Zustand abgebildet.
- Die beim Sitzungsstart benötigten Unternehmer, Firmen, Filialen, Benutzerprofile und Mitarbeiter richten sich nach der Rolle
  und den Datenzugriffen des angemeldeten Benutzers. Bereits vollständig geladene Daten desselben Benutzer- und Fachkontexts
  werden innerhalb der Sitzung nicht erneut geladen.
- Guards verwenden den Authentifizierungs-, Profil- und Initialisierungszustand. Eine geschützte Route wird erst geöffnet, wenn
  die zwingend benötigten Stammdaten geladen sind. Ein Initialisierungsfehler führt auf eine eigene Fehlerseite mit Wiederholung
  und Abmeldung.
- Die kompakte Verantwortungs- und Rollenübersicht steht in der [Datenladematrix](./matrix-datenladen.md).
  Cache- und Betriebsarten stehen in der [Cache- und Betriebsartenmatrix](./matrix-cache-strategien.md).
- Schreibvorgänge bleiben von der Ladestrategie getrennt. Offline-Schreibvorgänge und eine spätere Synchronisation werden erst
  bei einem konkreten fachlichen Bedarf ausdrücklich geplant.

## PWA- und Offline-Strategie

### Auslieferungsvarianten

- **Pur Master:** Installierbare PWA für die zentrale Systemverwaltung mit eigener Hosting-Adresse `pur-master.web.app`.
- **Pur Office:** Installierbare PWA für Büro und Verwaltung mit eigener Hosting-Adresse `pur-office.web.app`.
- **Pur Filiale:** Installierbare Progressive Web App. Der Angular Service Worker stellt nach dem ersten erfolgreichen Laden die
  App-Shell und die zum Start erforderlichen statischen Ressourcen offline bereit.
- **Pur Mitarbeiter:** Persönliche mobile PWA innerhalb desselben Angular- und Firebase-Projekts. Sie besitzt einen getrennten
  Build, die eigene Hosting-Adresse `pur-mitarbeiter.web.app` und eine App-Shell mit dem Titel „Pur Mitarbeiter“.

Alle vier Auslieferungsvarianten verwenden eine eigene Produktkennung im Web-App-Manifest. Das jeweilige Login ergänzt den
eingegebenen Namensbestandteil automatisch um das Rollensuffix `master`, `office`, `filiale` oder `mitarbeiter`.

In Pur Mitarbeiter richten sich Anmeldung, App-Shell und Navigation nach den im Benutzerprofil zugewiesenen `erlaubteBereiche`.
Welche fachlichen Mitarbeiterdaten und Funktionen später innerhalb dieser Umgebung angeboten werden, wird bei konkretem fachlichem
Bedarf separat geplant. Der Produktname „Pur Mitarbeiter“ bezeichnet dabei nicht den fachlichen Mitarbeiterdatensatz.

Die Mitarbeiter-App erzeugt keine zusätzliche Rollenbeschränkung. Auch dort bestimmen `erlaubteBereiche` die sichtbaren und
erreichbaren Bereiche. Besondere administrative Routen bleiben zusätzlich durch ihre vorhandenen Rollenguards geschützt.

Die konkreten Build-, Hosting- und Service-Worker-Einstellungen stehen in der
[PWA-Konfigurationsmatrix](./matrix-pwa-konfigurationen.md). Die vorgesehene Verwendung und das fachliche
Online-/Offline-Verhalten stehen in der [Cache- und Betriebsartenmatrix](./matrix-cache-strategien.md).

### Updates und Service Worker

Neue Anwendungsversionen werden im Hintergrund erkannt. Die Anwendung informiert den Benutzer über verfügbare Updates und
ermöglicht einen kontrollierten Wechsel auf die neue Version. Der aktuelle Netzwerkzustand und Funktionen, die eine Verbindung
benötigen, werden in der App-Shell verständlich dargestellt.

Der Service Worker ist ausschließlich für die Anwendungsversion und statische Ressourcen zuständig. Er macht geschützte
Firestore-Daten nicht automatisch offline verfügbar.

### Fachliche Online- und Offline-Nutzung

Pur Master, Pur Office, Pur Mitarbeiter und die Entwicklungsumgebung verwenden einen flüchtigen Firestore-Cache. Pur Filiale
verwendet einen persistenten lokalen Firestore-Cache, damit bereits bestätigte Profildaten und Stammdaten auf dem vorgesehenen
Filialgerät erneut gelesen werden können. Die Cache-Art wird beim App-Start durch die Auslieferungsvariante festgelegt und nicht
nachträglich anhand der geladenen Benutzerrolle gewechselt.

Der `FirestoreDbService` unterstützt die Lesestrategien `cacheFirst`, `networkOnly`, `networkFirst` und `cacheOnly`. Pur Filiale
lädt das eigene Benutzerprofil mit `networkFirst` und Stammdaten mit `cacheFirst`; ein ausdrücklich erzwungener Neuladevorgang
verwendet `networkOnly`. Die übrigen Auslieferungsvarianten verwenden `networkOnly`. `cacheOnly` ist technisch vorhanden, aber
derzeit keinem fachlichen Ablauf zugeordnet. Bei `cacheFirst` gilt ein leerer Collection- oder Query-Cache beziehungsweise ein
nicht vorhandenes Dokument als Cache-Miss und führt zu einer Serveranfrage. `networkFirst` fällt ausschließlich bei technischen
Serverfehlern auf den Cache zurück.

Das eigene Dokument `benutzerprofil/{uid}` wird während der Sitzung zusätzlich in Echtzeit beobachtet. Ein inaktives eigenes
Profil wird über den globalen Banner-Service app-weit durch einen nicht ausblendbaren Hinweis angezeigt. Ein Listenerfehler
allein ändert den zuletzt bestätigten Aktivstatus nicht.

Lokal gespeicherte Daten sind keine Berechtigungsquelle und ersetzen keine aktuellen Firestore Rules. Bei Abmeldung oder
Benutzerwechsel muss verhindert werden, dass ein nachfolgender Benutzer Daten aus dem vorherigen Sitzungskontext übernimmt.
Offline-Schreibvorgänge und eine spätere Synchronisation sind nicht Bestandteil dieser Ladestrategie und bleiben zunächst
ausgeschlossen.

## Auth und Berechtigungen

### Identität und Anmeldung

Ein Benutzer ist ein authentifizierter Firebase-Auth-User mit `uid`. Firebase Auth klärt die Identität des angemeldeten Benutzers.

Jeder Benutzer besitzt zusätzlich einen unveränderlichen Anmeldenamen im Format `<normalisierter-name>-<rolle>`, beispielsweise
`harald.mischer-master` oder `harald-mischer-master`. Leerzeichen werden als Punkte normalisiert, vorhandene Punkte und
Bindestriche bleiben erhalten, andere Sonderzeichen werden entfernt und deutsche Umlaute sowie `ß` eindeutig umgeschrieben.
Firebase Auth verwendet intern die daraus gebildete technische Adresse `<anmeldename>@pur-system.invalid`. Der Rollenbestandteil
im Anmeldenamen ist ausschließlich Teil der technischen Kennung und gewährt keine Berechtigungen.

Das Loginformular der vier Produktionsvarianten fragt ausschließlich den Namensbestandteil und das Passwort ab. Die jeweilige
Auslieferungsvariante ergänzt automatisch das passende Rollensuffix und für Firebase Auth intern `@pur-system.invalid`. Die
allgemeine Entwicklungsumgebung erwartet weiterhin den vollständigen Anmeldenamen. Eine Rollenauswahl gibt es im Login nicht;
Rolle, Aktivstatus und Bereichsfreigaben werden erst aus dem über die Firebase-UID geladenen Benutzerprofil abgeleitet.

### Benutzeranlage und technische Kennung

Bei der Benutzeranlage erfasst der Master Anzeigename, Benutzerrolle und Anfangspasswort. Die Anwendung bildet daraus automatisch
den nicht bearbeitbaren Anmeldenamen und zeigt ihn im Formular an. Die technische Firebase-Adresse bleibt bei der Anlage verborgen
und wird auch in der Benutzerbearbeitung nicht angezeigt. Die Anwendung übergibt den aus dem Anzeigenamen abgeleiteten
Namensbestandteil zusammen mit dem Anzeigenamen und der Rolle. Die Callable Function normalisiert diesen Namensbestandteil
erneut und erzeugt Anmeldename und technische Adresse verbindlich. Dadurch bleibt die technische Kennung nach der Anlage
unabhängig von späteren Änderungen des Anzeigenamens.

### Benutzerprofil und Bereichsfreigaben

Die Berechtigungen liegen im Firestore-Dokument:

```text
benutzerprofil/{uid}
```

Das Benutzerprofil enthält mit `userRole` die Rollen `filiale`, `office`, `master` und `mitarbeiter`. Die allgemeinen
Bereichsfreigaben richten sich nach `erlaubteBereiche`. `dashboard` ist für jede Rolle verpflichtend und bildet die dauerhaft
erreichbare Hauptseite für den später rollenabhängig dargestellten Hauptinhalt. `systemverwaltung` ist ausschließlich für die
Rolle `master` verpflichtend und für alle anderen Rollen unzulässig.

Die Anwendung beobachtet das eigene Benutzerprofil während der Sitzung. Bei Abmeldung oder Benutzerwechsel wird der bisherige
Listener beendet. Wird das Profil deaktiviert, werden die sitzungsbezogenen Stammdaten zurückgesetzt und der globale Hinweis
„Dieses Profil ist inaktiv. Bitte wende dich an einen Administrator.“ angezeigt. Eine Deaktivierung meldet den Benutzer nicht
automatisch aus. Die vorhandenen Bereichs- und Rollenguards verhindern neue fachliche Navigationen mit einem inaktiven Profil;
die ausschließlich durch Authentifizierung geschützte Passwortseite bleibt erreichbar.

Ein Mitarbeiter kann für die Mitarbeiter-App optional einen eigenen Mitarbeiterzugang mit Firebase Auth und eigener `uid`
erhalten. Der Zugang wird ausschließlich durch einen Master angelegt; eine Selbstregistrierung ist nicht vorgesehen. Benutzer mit
einem Mitarbeiterzugang verwenden die bestehenden Abläufe für Anmeldung, Abmeldung und Passwortänderung. Der Master kann einen
Mitarbeiterzugang deaktivieren und vergibt bei einem vergessenen Passwort ein neues vorläufiges Passwort.

Der Master weist Mitarbeiterzugängen die benötigten `erlaubteBereiche` bei der Anlage und Bearbeitung des Kontos zu. Die
Auslieferungsvariante erzeugt keine zusätzliche Rollenbeschränkung und gewährt keine fachlichen Datenrechte. Direkte
Datenzugriffe werden durch die Firestore Rules abgesichert.

Der Begriff Mitarbeiter bezeichnet zwei technisch getrennte Konzepte, auch wenn beide dieselbe Person betreffen können. Der
fachliche Mitarbeiterdatensatz beschreibt die in einer Firma beziehungsweise Filiale beschäftigte Person einschließlich
Stammdaten, Filialzuordnungen und betrieblichem Filialzugang. Der persönliche Mitarbeiterzugang ist dagegen ein
Firebase-Auth-Benutzer mit `userRole: mitarbeiter` für die App Pur Mitarbeiter. Ein fachlicher Mitarbeiterdatensatz ist weder von
einem solchen Zugang abhängig noch mit dem betrieblichen Filialzugang gleichzusetzen.

Ein persönlicher Mitarbeiterzugang ist genau einem fachlichen Mitarbeiterdatensatz zugeordnet. Sein Benutzerprofil enthält in
`zugriffe` genau einen Unternehmer und darunter genau eine Firma mit einer leeren Filialliste. Zusätzlich enthält es die für
`userRole: mitarbeiter` verpflichtende String-ID `firmaMitarbeiterId`; für andere Auth-Rollen ist dieses Feld unzulässig. Aus
diesen drei IDs kann die Mitarbeiter-App den vollständigen Firestore-Pfad des fachlichen Mitarbeiterdatensatzes bilden. Die
fachlich erlaubten Filialen werden ausschließlich aus dessen `filialIds` gelesen und nicht im Benutzerprofil dupliziert.

Der fachliche Mitarbeiterdatensatz enthält als Gegenreferenz optional `benutzerUid`. Beide Referenzen werden ausschließlich
serverseitig gemeinsam gesetzt oder entfernt. Die serverseitige Anlage stellt auch bei parallelen Aufrufen sicher, dass ein
fachlicher Mitarbeiter höchstens einem persönlichen Mitarbeiterzugang zugeordnet ist. Schlägt die Kontoanlage fehl, darf keine
Referenz bestehen bleiben. Eine Kontodeaktivierung erhält die Verknüpfung für eine spätere Reaktivierung. Eine Aufhebung
erfolgt als ausdrückliche serverseitige Aktion; erst nach ihrem vollständigen Abschluss ist eine neue Verknüpfung zulässig.
Solange die Verknüpfung besteht, darf die Auth-Rolle des Benutzerprofils nicht geändert werden.

Bei einem verknüpften Mitarbeiterprofil darf ein Master ausschließlich Anzeigename, Aktivstatus und `erlaubteBereiche`
bearbeiten. `zugriffe` und `firmaMitarbeiterId` bleiben unverändert. Die Zuordnung zu einem fachlichen Mitarbeiterdatensatz wird
nicht über die allgemeine Profilbearbeitung, sondern ausschließlich über eine eigene serverseitige Aktion geändert oder
aufgehoben.

Die Firmenzuordnung in `zugriffe` erlaubt einem Mitarbeiterzugang das Lesen des zugeordneten Unternehmers sowie der direkten
Firmenstruktur mit Firma, Filialen und fachlichen Mitarbeiterdatensätzen. Filial-Untercollections und Schreibzugriffe bleiben
gesperrt. Der tatsächliche initiale Ladeumfang ist enger: Der eigene Mitarbeiterdatensatz und dessen `filialIds` bestimmen die
persönlich zugeordneten Filialen. Bei der Sitzungsinitialisierung werden nach dem eigenen Mitarbeiterdatensatz genau diese
Filialstammdaten und mit einer gemeinsamen Abfrage die Mitarbeiter dieser Filialen geladen. Die `filialIds` bilden außerdem die
Grundlage für weitere persönliche Datenrechte, beispielsweise auf Dienstpläne bestimmter Filialen. `erlaubteBereiche` steuert
ausschließlich, welche App-Funktionen geöffnet werden dürfen.

Bei der Anlage und Bearbeitung von Benutzerprofilen zeigt die Oberfläche die gemäß App-Bereich-Matrix optional wählbaren Bereiche
rollenabhängig als Checkboxen. `dashboard` und `systemverwaltung` werden nicht als Checkboxen angeboten. Die Callable Function
ergänzt `dashboard` immer und `systemverwaltung` ausschließlich für Master; die optionalen Bereiche übernimmt sie aus der
Clientauswahl. Bei Profilaktualisierungen normalisiert der fachliche Service die Bereiche entsprechend. Die Firestore Rules
leiten aus `erlaubteBereiche` keine Datenrechte oder rollenabhängigen Bereichskombinationen ab.

### Datenrechte und Firestore Rules

Welche App-Bereiche sichtbar und erreichbar sind, wird über `erlaubteBereiche` festgelegt. Datenrechte ergeben sich unabhängig
davon aus `userRole`, Aktivstatus, `zugriffe` und den fachlichen Bedingungen der Collection-Matrix. Die Zugriffe sind als
verschachtelte Map `Unternehmer-ID -> Firma-ID -> Filial-IDs` gespeichert. Altprofile mit der früheren Array-Struktur bleiben für
Login und Bereichsfreigaben lesbar, gewähren Office- und Filialkonten aber keinen Datenzugriff. Aktive Master bleiben davon
unberührt.

Die App speichert keine direkten Firestore-Pfade als Berechtigung, sondern fachliche Berechtigungen. Daraus werden Navigation,
Route Guards und Firestore-Abfragen abgeleitet.

Die Firestore Rules erlauben aktiven Mastern das Lesen aller Collections samt Untercollections. Fachliche Daten dürfen sie
anlegen und aktualisieren; vorhandene Benutzerprofile dürfen sie nur in den ausdrücklich freigegebenen Feldern aktualisieren.
Benutzerrolle, E-Mail-Adresse und Auth-Daten bleiben dabei unveränderlich. Office und Filiale lesen Geschäftsdaten direkt anhand
der verschachtelten `zugriffe`-Map und weiterhin ihr eigenes Profil. Aktive Office-Konten dürfen ihre zugeordneten Firmen- und
Filialdokumente aktualisieren, aber weder Firmen oder Filialen anlegen oder löschen noch Filial-Untercollections beschreiben.
Filialkonten bleiben außerhalb der Mitarbeiterverwaltung rein lesend. Das eigene Profil bleibt auch bei einem inaktiven Konto
lesbar; alle weiteren Rechte erfordern ein aktives Profil. Ein separater Zugriffsindex wird nicht gespeichert. Bestätigte Altanwendungskonten ohne
`benutzerprofil`-Dokument behalten ihren bisherigen Zugriff ausschließlich auf `purCustomers` und `purUser`. Für Pur-System-Konten
gilt die Collection-Matrix abschließend: Was dort nicht steht, ist nicht erlaubt. Clientseitige Guards ersetzen die Rules nicht.

Unternehmer, Firmen und Filialen werden nicht direkt vom Client gelöscht. Ein aktiver Master verwendet dafür eine geschützte
Callable Function, die vorhandene Benutzer- oder Mitarbeiterreferenzen ablehnt und den gewählten Strukturzweig anschließend
rekursiv löscht. Die Domain-Services und Stores stellen die Löschmethoden bereit; eine UI-Aktion wird separat ergänzt.

Falls eine Fachfunktion später ausdrücklich für den Offline-Betrieb freigegeben wird, dürfen lokal gespeicherte Berechtigungen und
Daten ausschließlich den zuletzt erfolgreich bestätigten Stand abbilden und keine neuen Rechte gewähren. Nach Wiederherstellung
der Verbindung entscheiden weiterhin die aktuellen Firestore Rules über jeden Serverzugriff. Der konkrete Anwendungsfall muss dann
auch zwischenzeitlich entzogene Rechte und deaktivierte Konten behandeln.

### Kontoverwaltung

Eine Selbstregistrierung ist nicht vorgesehen. Benutzerzugänge werden im Zielablauf im Bereich `systemverwaltung` von einem
`master` vorkonfiguriert. Die Angular-App ruft dafür eine geschützte Firebase Cloud Function auf. Die Function prüft die Rolle des
aufrufenden Benutzers serverseitig, legt mit dem Firebase Admin SDK den Auth-Benutzer und anschließend das Dokument
`benutzerprofil/{uid}` an. Der angemeldete `master` bleibt dabei eingeloggt.

Der Master vergibt bei der Anlage ein Anfangspasswort mit mindestens 8 Zeichen. Der Benutzer kann dieses nach der Anmeldung über
`/passwort` freiwillig ändern. Schlägt das Anlegen des Benutzerdokuments fehl, muss der zuvor erzeugte Auth-Benutzer wieder
entfernt werden, damit kein unvollständiger Zugang bestehen bleibt.

Die Benutzeranlage erstellt Auth-Konten zunächst deaktiviert und aktiviert sie erst nach erfolgreicher Profilspeicherung. Bei
unklaren Aktivierungsfehlern bleibt das Profil zur Absicherung vorhandener Tokens erhalten; fehlgeschlagene Bereinigungen werden
für manuelle Administratorprüfung protokolliert.

### Vereinbartes Rollenmodell für Datenzugriffe

Die einmalige Datenmigration ist ein Übergangsprozess und gehört nicht zum regulären fachlichen Systembetrieb. Nach ihrem
Abschluss verwendet die Benutzerverwaltung für ihre Datenzuordnung ausschließlich die regulären Dokumente unter `unternehmer`.
Übernommene Unternehmer, Firmen, Filialen und Mitarbeiter unterscheiden sich dabei nicht von neu angelegten Strukturdaten.
Vorhandene Benutzerprofile können bearbeitet und neue Benutzer direkt mit diesen Dokumenten verknüpft werden; gespeichert werden
ausschließlich die neuen Ziel-IDs. Legacy-IDs und die Zuordnungstabellen unter `systemMigrationen` bleiben auf den einmaligen
Migrationsablauf beschränkt und gewähren keine Benutzerberechtigungen. Legacy-Benutzer und Firebase-Auth-Konten werden nicht
automatisch übernommen.

- **Filiale:** Das Konto repräsentiert genau eine Filiale, in der Daten erzeugt werden. Bei der Anlage ist genau eine vollständige
  Zuordnung aus Unternehmer, Firma und Filiale erforderlich; alle drei Selects verwenden Einfachauswahl. Auch spätere
  Profilaktualisierungen müssen genau eine solche Zuordnung erhalten.
- **Office:** Das Konto erhält Zugriff ausschließlich auf ausgewählte Firmen und deren ausdrücklich freigegebene Filialen. Mehrere
  Firmen und Filialen können zugeordnet werden; auch eine Beschränkung auf einzelne Filialen ist möglich. Office hat keinen
  pauschalen Lesezugriff auf alle Daten. Bestehende zugeordnete Firmen- und Filialdokumente dürfen aktualisiert, aber nicht
  angelegt oder gelöscht werden. Weitere Schreibaktionen, beispielsweise Mitarbeiter anlegen, müssen pro Datenart und Aktion
  innerhalb des freigegebenen Datenbereichs festgelegt werden.
- **Master:** Keine Datenzuordnung erforderlich; aktive Master erhalten die in der Collection-Matrix aufgeführten Rechte auch mit
  `zugriffe: {}`. Nicht aufgeführte Collections bleiben gesperrt. Bestehende Masterprofile mit der früheren leeren Liste bleiben
  ebenfalls funktionsfähig. Datenstruktur- und Benutzerverwaltung bleiben dem Master vorbehalten.
- **Mitarbeiter:** Vierte Auth-Rolle für die mobile Mitarbeiter-App. Ein Mitarbeiter kann optional einen eigenen, durch einen
  Master angelegten Mitarbeiterzugang erhalten. Der Master weist die benötigten `erlaubteBereiche` zu und verknüpft den Zugang
  mit genau einem aktiven Firma-Mitarbeiter. Das Benutzerprofil speichert dessen `firmaMitarbeiterId`; der Mitarbeiterdatensatz
  speichert die Gegenreferenz `benutzerUid`. Ein fachlicher Mitarbeiterdatensatz kann weiterhin ohne Mitarbeiterzugang bestehen.
  Filialzuordnungen, fachliche Mitarbeiterrollen wie Service, Kasse oder Admin, Dienstplandaten, persönliche Aktionen und
  Push-Benachrichtigungen werden bei konkretem fachlichem Bedarf separat geplant.

Eine Firmenfreigabe gewährt nicht automatisch Zugriff auf alle aktuellen oder zukünftigen Filialen. Filialen werden weiterhin
ausdrücklich in der verschachtelten Zugriffs-Map zugeordnet. Weitere Schreibrechte für Filial- und Office-Konten sind separat
festzulegen und durch Rules abzusichern; die Altanwendung darf nicht beeinträchtigt werden.

## Datenzugriff: Unternehmer, Firmen und Filialen

### Datenmodell

Pur Office verwendet für neue Benutzer die fachlich benannte Firebase-Struktur:

```text
unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}
```

Die Altanwendung verwendet weiterhin unverändert `purCustomers/{unternehmerId}/company/{firmaId}/branches/{filialId}` sowie die
zugehörige Collection `purUser`. Beide Legacy-Collections bleiben vom neuen Berechtigungsmodell unberührt. Konten ohne
`benutzerprofil`-Dokument behalten dort den bisherigen Zugriff, erhalten aber keinen Legacy-Zugriff auf die neue
Top-Level-Collection `unternehmer`.

### Auswahlverhalten

Die Systemverwaltungsseite erzeugt für Filiale und Office getrennte Auswahlkomponenten mit festen Mehrfachauswahl-Einstellungen;
bei Master entfällt die Auswahl. Ein Rollenwechsel setzt die bisherige Zuordnung zurück. Die Auswahlkomponente selbst schaltet
ihre Modi nicht dynamisch um.

Die Auswahl erfolgt abhängig voneinander: zuerst Unternehmer, danach dessen Firmen, danach deren Filialen. Das gemeinsame
Auswahlmodell und die Firestore-Dokumente verwenden für alle Ebenen einheitlich `anzeigename`. Die Zuordnung verwendet die
jeweiligen Dokument-IDs.

Die wiederverwendbare Component `datenzugriff-selector` stellt drei Material-Selects bereit. Die Mehrfachauswahl ist je Ebene
konfigurierbar und standardmäßig deaktiviert; damit verwenden alle drei Selects standardmäßig Einfachauswahl. Firmen werden nur
bei aktivierter Unternehmer-Mehrfachauswahl und mehr als einem ausgewählten Unternehmer gruppiert; Filialen entsprechend bei
Firmen-Mehrfachauswahl und mehr als einer ausgewählten Firma. Beim Abwählen eines übergeordneten Eintrags entfällt dessen
abhängige Auswahl.

Der `AppKontextSelector` verbindet den `AppKontextStore` mit den internen Unternehmer-, Firmen- und Filial-Selektoren. Diese
Unterkomponenten liegen gemeinsam unter `components/data-selectors/app-kontext-selector`, erhalten vollständige
Domäneneinträge und geben den ausgewählten Eintrag oder `null` zurück. Der zusammengesetzte `DatenzugriffSelector` bleibt davon
getrennt, weil er eine hierarchische Berechtigungszuordnung mit konfigurierbarer Einfach- und Mehrfachauswahl abbildet. Der unter
`components/data-filters` abgelegte `MitarbeiterFilter` begrenzt bei fachlichem Bedarf eine Page anhand eines ausgewählten
Mitarbeiters und verändert den globalen App-Kontext nicht.

Für den seitenübergreifenden Arbeitskontext hält der `AppKontextStore` den ausgewählten Unternehmer, die ausgewählte Firma und
den Filialkontext. Er leitet seine verfügbaren Einträge aus dem `StammdatenStore` ab und hält selbst keine fachlichen Stammdaten.
Nach der Sitzungsinitialisierung wird der erste verfügbare Unternehmer, dessen erste Firma und bei vorhandenen Filialen der
Kontext `Alle Filialen` gesetzt. Ein Unternehmerwechsel wählt entsprechend wieder dessen erste Firma und alle zugehörigen
Filialen aus.

Die Sidebar ermittelt aus Benutzerrolle und aktivem App-Bereich die zentrale Konfiguration des `AppKontextSelector`. Für Master
sind Unternehmer und Firma in allen Fachbereichen veränderbar. Der Filial-Selektor ist nur im Mitarbeiterbereich sichtbar und
veränderbar. Noch nicht festgelegte Rollen- und Bereichskombinationen verwenden als sicheren Fallback vollständig verborgene
Selektoren. Fachseiten wie die Mitarbeiterliste verwenden den zentralen Arbeitskontext und führen keine davon unabhängige
Unternehmer- oder Firmenauswahl.

### Laden und Validierung

Das Laden der sitzungsbezogenen Stammdaten erfolgt nach der Anmeldung zentral über den `AppSitzungsInitService` und den
`AppDatenInitService`. Der `StammdatenStore` hält die geladene Unternehmensstruktur; der `BenutzerVerwaltungStore` stellt daraus
die abhängigen Auswahllisten zusammen. Die Benutzeranlage muss Unternehmer-, Firmen- und Filialzuordnung serverseitig prüfen.
Bestehende Benutzerprofile müssen bei der Erweiterung des Berechtigungsmodells berücksichtigt werden.

Die Auswahl ist an lesende Firebase-Abfragen und den Anlage-Payload angebunden. Office-/Filialkonten benötigen bei der Anlage
mindestens eine vollständige Datenzuordnung; Master dürfen mit einer leeren Zugriffs-Map angelegt werden. Die Function prüft die
Existenz der vollständigen Unternehmer-/Firmen-/Filialpfade vor der Auth-Anlage. Während der Benutzeranlage ist das vollständige
Formular einschließlich eigenständig verwalteter Unterkomponenten gesperrt; nach Erfolg oder Fehler wird es wieder freigegeben.
Benutzeranlage, Anmeldung, Bereichsfreigabe und Passwortwechsel wurden grundsätzlich bestätigt. Ein reales Office-Testkonto konnte
seine zugeordneten Firmen- und Filialdaten bearbeiten; die vereinbarten Schreibgrenzen sind zusätzlich durch Emulator-Tests
abgesichert.

Datenändernde Submit-Aktionen sind nur bei einem gültigen Formular und außerhalb eines laufenden Schreibvorgangs verfügbar.
Bearbeiten-Dialoge vergleichen den normalisierten, tatsächlich speicherbaren Ausgangszustand und den aktuellen Zustand per
`JSON.stringify()`. Ohne fachliche Änderung bleibt der Submit-Button deaktiviert; der Submit-Handler verhindert einen
Firestore-Schreibzugriff auch bei einem direkten Aufruf. Anlegen-Dialoge verhindern leere oder fachlich unvollständige
Schreibzugriffe über ihre Validierung.

Der genaue Implementierungsstand steht im [Projekt-Stand](./projekt-stand.md), die unmittelbar anstehenden Schritte in den
[offenen Todos](./todo_next.md) und bewusst zurückgestellte Aufgaben in den [späteren Todos](./todo_spaeter.md).

## Fachliche Mitarbeiterverwaltung

Ein fachlicher Mitarbeiter wird als Beschäftigter einer Firma unter folgendem Pfad gespeichert:

```text
unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiter/{mitarbeiterId}
```

Pflichtdaten sind `person.vorname`, `person.nachname` und mindestens eine betriebliche Rolle im Array `rollen`. Vorgesehen sind
`filialkasse`, `servicekraft`, `administrator`, `kassierer` und `techniker`; ein Mitarbeiter kann mehrere dieser Rollen besitzen.
`person.adresse` und `person.kontakt` werden als Objekte geführt; ihre einzelnen Werte sowie `person.geburtstag` sind optional.
`aktiv` kennzeichnet, ob der Mitarbeiter fachlich verwendet werden darf. `erstelltAm` und `aktualisiertAm` werden serverseitig
gepflegt.

`filialIds` enthält mindestens eine eindeutige Filial-ID der übergeordneten Firma, weil jeder Mitarbeiter in mindestens einer
Filiale arbeitet. Filialkonten dürfen die Mitarbeiter ihrer Firma lesen, laden über eine `array-contains`-Abfrage aber direkt nur
Mitarbeiter mit ihrer eigenen Filial-ID. Sie können nur solche Mitarbeiter anlegen und bearbeiten. Bei einer Bearbeitung werden
nur die für das angemeldete Konto erlaubten Filialzuordnungen angeboten; weitere bereits vorhandene Zuordnungen bleiben
unverändert.

`benutzerUid` ist eine optionale, ausschließlich serverseitig gesetzte technische Gegenreferenz zum persönlichen
Firebase-Auth-Zugang. Sie wird weder im Mitarbeiterformular erfasst noch für den betrieblichen Mitarbeiter-Login verwendet. Der
betriebliche Login erhält ein eigenes Sicherheits- und Sitzungsmodell und wird nicht im fachlichen Mitarbeiterdatensatz
vorweggenommen. Die betrieblichen Rollen eines Mitarbeiters sind unabhängig von `TUserRole` und gewähren keine App- oder
Datenberechtigungen.

Für die Mitarbeiterverwaltung gilt folgende Rollenmatrix:

| Auth-Rolle    | Sidebar und `/mitarbeiter/liste`                | Lesen                           | Schreiben                        |
| ------------- | ----------------------------------------------- | ------------------------------- | -------------------------------- |
| `master`      | mit Bereichsfreigabe                            | Mitarbeiter aller Firmen        | anlegen, bearbeiten und zusammenführen                 |
| `office`      | mit Bereichsfreigabe und gültigem Datenzugriff  | Mitarbeiter erlaubter Firmen    | in erlaubten Firmen und Filialen |
| `filiale`     | mit Bereichsfreigabe und gültigem Filialkontext | Mitarbeiter der eigenen Firma   | in der eigenen Filiale           |
| `mitarbeiter` | nein                                            | Mitarbeiter der eigenen Firma   | nein                             |

Mit einem persönlichen Mitarbeiterzugang verknüpfte Datensätze dürfen weder gelöscht noch zusammengeführt werden. `aktiv`
beschreibt den fachlichen Beschäftigungsstatus; berechtigte Rollen können inaktive Mitarbeiter wieder aktivieren. Master führen
Dubletten gezielt zusammen; dabei wird das nicht verknüpfte Duplikat physisch gelöscht. Eine eigenständige Löschaktion wird in
der Mitarbeiteroberfläche nicht angeboten. `erlaubteBereiche` steuert nur Sidebar und Routenzugriff; die Lese- und
Schreibrechte gelten davon unabhängig nach Rolle und `zugriffe`. Der gleichnamige App-Bereich gewährt `userRole: mitarbeiter`
keine Verwaltungsrechte.

Mitarbeiterlisten werden clientseitig direkt aus Firestore geladen. Master und Office laden die erlaubte Firmen-Collection.
Filialkonten besitzen das Leserecht innerhalb ihrer eigenen Firma, begrenzen die Clientabfrage mit ihrer zugewiesenen Filial-ID
aber auf die eigene Filiale. Bei der Benutzeranlage lädt der Client aktive, noch nicht verknüpfte Mitarbeiter der ausgewählten
Firma für die Auswahl. Die Cloud Function `createBenutzer` prüft den konkret gewählten Datensatz erneut und stellt die
Verknüpfung atomar her.

## Projektstruktur

- Echte Seiten liegen unter `src/app/pages`.
- Wiederverwendbare Components liegen unter `src/app/components`.
- App-Shell-Components liegen unter `src/app/components/app-shell`.
- Die Sidebar liegt unter `src/app/components/app-shell/app-sidenav`.
- Die Toolbar liegt unter `src/app/components/app-shell/app-toolbar`.
- Gemeinsame Modelle, Mapper, Konstanten, Utilities und Typen liegen unter `src/app/commons`.
- Guards liegen unter `src/app/guards`.
- Services liegen unter `src/app/services`.
- Allgemeine technische Services liegen unter `src/app/services/core`.
- Firebase-nahe Services liegen unter `src/app/services/firebase`.
- Fachliche Services für konkrete Domänen liegen unter `src/app/services/domain`.
- Stores liegen unter `src/app/stores`.
- App-weite Stores liegen unter `src/app/stores/app`, z. B. `src/app/stores/app/benutzer.store.ts`.
- Fachliche Domain-Stores liegen unter `src/app/stores/domain`.

## Navigation

### App-Shell

Die App verwendet ein Angular-Material-Layout mit Toolbar und Sidebar.

Die App-Shell wird in wiederverwendbare Components unter `src/app/components/app-shell` aufgeteilt:

- `app-sidenav` enthält die Sidebar mit Hauptnavigation.
- `app-toolbar` enthält die obere Toolbar mit App-Aktionen.

Die Sidebar zeigt zusätzlich eine zentral gepflegte Anwendungsversion, damit der eingesetzte Frontend-Stand bei Support und
Fehleranalyse eindeutig erkennbar ist.

Die Toolbar zeigt zentral registrierte Lese- und Schreibvorgänge über eine globale unbestimmte Progress-Bar an. Parallele Vorgänge
werden gezählt, damit die Anzeige erst nach Abschluss der letzten laufenden Operation ausgeblendet wird.

Die Navigation wird für jede `userRole` zentral mit der ausdrücklich festgelegten Darstellungsart `flat` oder `nested`
konfiguriert. Die App leitet die Darstellungsart nicht automatisch aus der Anzahl oder Verschachtelung der Navigationseinträge ab.
Benötigt eine weitere Rolle später ausklappbare Gruppen, wird ihre zentrale Rollenkonfiguration auf `nested` umgestellt. Flache
Navigationen und verschachtelte Navigationen mit nicht navigierbaren, ausklappbaren Gruppen verwenden getrennte
Darstellungskomponenten.

Maßgeblich ist die Rolle aus dem geladenen Benutzerprofil. `erlaubteBereiche` filtert ausschließlich die sichtbaren Einträge und
verändert die für die Rolle konfigurierte Darstellungsart nicht. Dieselbe Rollen- und Bereichsauswertung bestimmt die erreichbaren
Start- und Ausweichrouten. Die vorhandenen Routenguards bleiben unabhängig davon die verbindliche Zugriffskontrolle.

### Navigationsbereiche

Die Sidebar enthält die Hauptnavigation der Anwendung. Aktuell sind fünf Bereiche vorgesehen:

1. **Dashboard (`/dashboard`):** Noch zu bestimmende Daten der einzelnen Filialen.

2. **Schichtplan (`/schichtplan`):** Schichtpläne der Filialen.

3. **Mitarbeiter (`/mitarbeiter`):** Stammdaten der Mitarbeiter. `mitarbeiter-page` bildet einen komponentenlosen Elternbereich
   für die gerouteten Unterseiten. Anlage und Bearbeitung erfolgen in Dialogen innerhalb der Mitarbeiterliste:

   ```text
   src/app/pages/mitarbeiter-page/
   ├── mitarbeiter-liste-page/
   │   ├── mitarbeiter-card/
   │   ├── mitarbeiter-anlegen-dialog/
   │   └── mitarbeiter-bearbeiten-dialog/
   └── mitarbeiter-login-page/
   ```

   `/mitarbeiter` leitet auf `/mitarbeiter/liste` weiter. Die Mitarbeiterliste zeigt eine Card zum Hinzufügen sowie eine
   `MitarbeiterCard` mit kompakten Details und Bearbeitungsaktion je vorhandenem Mitarbeiter. Der Anlegen- und der
   Bearbeiten-Dialog bleiben fachlich getrennt; gemeinsam benötigte Formularbestandteile können bei Bedarf intern
   wiederverwendet werden. Eine eigene geroutete Anlage- oder Detailseite ist nicht vorgesehen.

   Die `mitarbeiter-login-page` ist unter `/mitarbeiter/login` erreichbar und behandelt den betrieblichen Login eines Mitarbeiters
   in der Filiale. Firebase-Auth-Benutzer einschließlich der Rolle `mitarbeiter` verwenden dagegen weiterhin die allgemeine
   `auth/login-page`.

4. **Verwaltung (`/verwaltung`):** Bereich für Office und Master zur Auswahl und Bearbeitung zugeordneter Firmen- und Filialdaten.
   Die Route erfordert zusätzlich die Bereichsfreigabe `verwaltung`; Filialkonten bleiben ausgeschlossen.

5. **Systemverwaltung (`/systemverwaltung`):** Administrativer Bereich für `master`. Er umfasst die hierarchische
   Datenstruktur-Anlage unter `/systemverwaltung/datenstruktur`, die Benutzeranlage unter
   `/systemverwaltung/benutzer/anlegen` und die Bearbeitung vorhandener Benutzerprofile unter
   `/systemverwaltung/benutzer/verwalten`. In der Sidebar ist der Bereich eine ausklappbare Gruppe mit direkten Links auf die
   administrativen Unterseiten. Die Auth-Benutzeranlage erfolgt serverseitig über eine geschützte Firebase Cloud Function mit
   Firebase Admin SDK; fachliche Stammdaten darf der Master direkt in Firestore schreiben. `/systemverwaltung` leitet auf die
   Datenstruktur-Anlage und `/systemverwaltung/benutzer` auf die Verwaltung vorhandener Benutzer weiter.
