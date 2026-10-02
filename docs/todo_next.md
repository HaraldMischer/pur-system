<!-- pur-system/docs/todo_next.md -->

# Offene Todos

## 1. Todo: Datenmigration je `purCustomer`

Die Legacy-Daten werden kontrolliert für genau einen ausgewählten `purCustomer` migriert. Es gibt keine Aktion, die alle
`purCustomers` gemeinsam migriert. Für jeden ausgewählten Kunden wird ein eigenes Hauptdokument unter
`systemMigrationen/{purCustomerId}` geführt. Der Status jedes migrierten Datenbereichs liegt separat unter
`systemMigrationen/{purCustomerId}/datenbereiche/{datenbereich_v1}`. Das Hauptdokument ordnet dem Legacy-Kunden dauerhaft die
zufällig erzeugte Ziel-Unternehmer-ID und die Ziel-IDs seiner Firmen zu.

### 1.1 Migrationsgrundlage und Unternehmer

#### Ziel

Ein aktiver Master kann einen einzelnen `purCustomer` auswählen und ihn idempotent zu einem Unternehmer migrieren. Die Seite
zeigt den Status der Unternehmermigration des ausgewählten Kunden und bietet ausschließlich für diesen Kunden eine
Migrationsaktion an.

#### Betroffene Dateien

Änderungen:

- `src/app/app.routes.ts`
- `src/app/app.routes.spec.ts`
- `src/app/commons/constants/firebase.constants.ts`
- `src/app/commons/constants/navigation.constants.ts`
- `src/app/commons/constants/navigation.constants.spec.ts`
- `src/app/commons/models/domain/unternehmer.ts`
- `src/app/components/app-shell/app-sidenav/app-sidenav.spec.ts`
- `src/app/pages/systemverwaltung-page/datenstruktur-page/unternehmer-anlegen-dialog/unternehmer-anlegen-dialog.ts`
- `src/app/pages/systemverwaltung-page/datenstruktur-page/unternehmer-anlegen-dialog/unternehmer-anlegen-dialog.spec.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.html`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.scss`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.spec.ts`
- `src/app/services/firebase/firestore-db.service.ts`
- `src/app/services/firebase/firestore-db.service.spec.ts`
- `firestore.rules`
- `rules-tests/firestore.rules.test.mjs`
- `docs/matrix-datenmigration.md`
- `docs/projekt-stand.md`

Neu hinzuzufügen:

- `src/app/commons/constants/firebase.constants.spec.ts`
- `src/app/commons/mapper/datenmigration/pur-customer-unternehmer.mapper.ts`
- `src/app/commons/mapper/datenmigration/pur-customer-unternehmer.mapper.spec.ts`
- `src/app/commons/models/legacy/pur-customer.ts`
- `src/app/commons/models/domain/datenmigration.ts`
- `src/app/services/domain/datenmigration.service.ts`
- `src/app/services/domain/datenmigration.service.spec.ts`
- `src/app/stores/domain/datenmigration.store.ts`
- `src/app/stores/domain/datenmigration.store.spec.ts`

#### Schritt 1: Statusstruktur und Legacy-Zugriff

- [x] Reale `purCustomer`-Dokumente prüfen und die Feldzuordnung zum Unternehmermodell festlegen.
- [x] Modelle für `purCustomer`, Migrationsstatus, Ergebniszahlen, Konflikte und Fehler anlegen.
- [x] Pfade für `systemMigrationen/{purCustomerId}` und dessen `datenbereiche` zentral bereitstellen.
- [x] Pro `purCustomer` ein Hauptdokument und pro migriertem Datenbereich ein versioniertes Statusdokument vorsehen.
- [x] Statuswerte und Zeitangaben für nicht begonnen, laufend, abgeschlossen, fehlgeschlagen und konfliktbehaftet festlegen.
- [x] Lesenden Zugriff des aktiven Masters auf die benötigten Legacy-Daten und Migrationsstatus sowie den erforderlichen
      Schreibzugriff auf `systemMigrationen` durch Rules-Tests absichern.

#### Schritt 2: Service und Store

- [x] `purCustomers` ausschließlich lesend laden und für die Auswahl aufbereiten.
- [x] Nach der Kundenauswahl alle vorhandenen Statusdokumente dieses Kunden laden.
- [x] Genau den ausgewählten `purCustomer` nach den Regeln der Datenmigrationsmatrix zum Unternehmer migrieren.
- [x] Vorhandene identische Zieldaten als bereits migriert behandeln und abweichende Zieldaten nicht überschreiben.
- [x] Den Status unter `datenbereiche/unternehmer_v1` nachvollziehbar aktualisieren.
- [x] Abgebrochene und fehlgeschlagene Migrationen sicher wiederholbar machen.

#### Schritt 3: Auswahl und Unternehmerkarte

- [x] Auswahl eines einzelnen `purCustomer` auf der Datenmigrationsseite umsetzen.
- [x] Eine Karte „Unternehmer migrieren“ mit Status, Quelle, migriert, bereits migriert, Konflikten und Fehlern anzeigen.
- [x] Die Migrationsaktion nur für den aktuell ausgewählten Kunden anbieten und während der Ausführung deaktivieren.
- [x] Auf der Seite keine Sammelaktion zur Migration aller `purCustomers` anbieten.
- [x] Erfolg, Konflikte und Fehler verständlich anzeigen und den Kartenstatus anschließend aktualisieren.

#### Tests und Abschluss

- [x] Service- und Store-Tests für Laden, Auswahl, Erfolg, Wiederholung, Konflikt und Fehler ergänzen.
- [x] Seitentests für Kundenauswahl, Kartenstatus und deaktivierte Aktionen ergänzen.
- [x] Firestore Rules und Rules-Tests für Legacy-Lesezugriff und Migrationsstatus vervollständigen.
- [x] `docs/projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test` ohne Watch-Modus erfolgreich ausführen.
- [x] `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Ein Master kann genau einen `purCustomer` auswählen und zum Unternehmer migrieren.
- [x] Es gibt keine Aktion zur gemeinsamen Migration aller `purCustomers`.
- [x] Der Unternehmer wird bei einer Wiederholung weder dupliziert noch ungeprüft überschrieben.
- [x] Der Status liegt unter `systemMigrationen/{purCustomerId}/datenbereiche/unternehmer_v1`.
- [x] Konflikte und Fehler sind mit ihrer Ursache nachvollziehbar.
- [x] Tests und Build laufen erfolgreich.

### 1.2 Firmen des ausgewählten Kunden migrieren

#### Ziel

Nach erfolgreicher Unternehmermigration können alle Firmen des ausgewählten `purCustomer` in einem eigenen Migrationsschritt in
die neue Unternehmerstruktur übernommen werden. Der Status gilt nur für die Firmen dieses Kunden.

#### Betroffene Dateien

Änderungen:

- `src/app/commons/constants/firebase.constants.ts`
- `src/app/commons/constants/firebase.constants.spec.ts`
- `src/app/commons/models/domain/datenmigration.ts`
- `src/app/commons/models/domain/firma.ts`
- `src/app/services/domain/firma.service.ts`
- `src/app/services/domain/firma.service.spec.ts`
- `src/app/services/domain/datenmigration.service.ts`
- `src/app/services/domain/datenmigration.service.spec.ts`
- `src/app/stores/domain/datenmigration.store.ts`
- `src/app/stores/domain/datenmigration.store.spec.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.html`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.spec.ts`
- `src/app/pages/systemverwaltung-page/datenstruktur-page/firma-anlegen-dialog/firma-anlegen-dialog.ts`
- `src/app/pages/systemverwaltung-page/datenstruktur-page/firma-anlegen-dialog/firma-anlegen-dialog.spec.ts`
- `src/app/pages/verwaltung-page/firma-bearbeiten-dialog/firma-bearbeiten-dialog.ts`
- `src/app/pages/verwaltung-page/firma-bearbeiten-dialog/firma-bearbeiten-dialog.spec.ts`
- `docs/matrix-datenmigration.md`
- `docs/projekt-stand.md`

Neu hinzuzufügen:

- `src/app/commons/mapper/datenmigration/pur-company-firma.mapper.ts`
- `src/app/commons/mapper/datenmigration/pur-company-firma.mapper.spec.ts`
- `src/app/commons/models/legacy/pur-company.ts`

#### Schritt 1: Firmenmigration

- [x] Reale Legacy-Firmendokumente prüfen und die Feldzuordnung zum Firmenmodell festlegen.
- [x] Firmen ausschließlich aus `purCustomers/{purCustomerId}/company` des ausgewählten Kunden laden.
- [x] Die Firmenmigration erst nach erfolgreicher Unternehmermigration freigeben.
- [x] Fehlende Firmen anlegen, identische Firmen als bereits migriert zählen und abweichende Firmen als Konflikt behandeln.
- [x] Den Status unter `datenbereiche/firmen_v1` mit den Ergebniszahlen dieser Firmenmigration speichern.

#### Schritt 2: Firmenkarte

- [x] Eine Karte „Firmen migrieren“ mit eigenem Status und eigener Migrationsaktion ergänzen.
- [x] Quelle, migriert, bereits migriert, Konflikte und Fehler bezogen auf den ausgewählten Kunden anzeigen.
- [x] Status und Freigabe der Karte nach einer Migration oder einem Kundenwechsel aktualisieren.

#### Tests und Abschluss

- [x] Service-, Store- und Seitentests für Firmenmigration, Abhängigkeit, Wiederholung, Konflikte und Fehler ergänzen.
- [x] `docs/projekt-stand.md` nach der Umsetzung aktualisieren.
- [x] `npm test` ohne Watch-Modus erfolgreich ausführen.
- [x] `npm run build:master` erfolgreich ausführen.

#### Erledigt, wenn

- [x] Nur die Firmen des ausgewählten `purCustomer` werden migriert.
- [x] Die Firmenmigration ist ohne erfolgreich migrierten Unternehmer nicht ausführbar.
- [x] Der Status liegt unter `systemMigrationen/{purCustomerId}/datenbereiche/firmen_v1`.
- [x] Wiederholungen erzeugen keine zusätzlichen Firmen und überschreiben keine Konflikte.
- [x] Tests und Build laufen erfolgreich.

### 1.3 Filialen des ausgewählten Kunden migrieren

#### Ziel

Nach erfolgreicher Firmenmigration können die Filialen aller Firmen des ausgewählten `purCustomer` in die neue Firmenstruktur
übernommen werden. Die gesamte Filialmigration dieses Kunden besitzt einen eigenen Status.

#### Betroffene Dateien

Änderungen:

- `src/app/commons/models/domain/datenmigration.ts`
- `src/app/services/domain/datenmigration.service.ts`
- `src/app/services/domain/datenmigration.service.spec.ts`
- `src/app/stores/domain/datenmigration.store.ts`
- `src/app/stores/domain/datenmigration.store.spec.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.html`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.spec.ts`
- `docs/projekt-stand.md`

#### Schritt 1: Filialmigration

- [ ] Reale Legacy-Filialdokumente prüfen und die Feldzuordnung zum Filialmodell festlegen.
- [ ] Filialen aus den Legacy-Firmen des ausgewählten Kunden laden.
- [ ] Die Filialmigration erst nach erfolgreicher Firmenmigration freigeben.
- [ ] Fehlende Filialen anlegen, identische Filialen als bereits migriert zählen und Abweichungen als Konflikt behandeln.
- [ ] Den Status unter `datenbereiche/filialen_v1` mit den Ergebniszahlen dieser Filialmigration speichern.

#### Schritt 2: Filialkarte

- [ ] Eine Karte „Filialen migrieren“ mit eigenem Status und eigener Migrationsaktion ergänzen.
- [ ] Quelle, migriert, bereits migriert, Konflikte und Fehler bezogen auf den ausgewählten Kunden anzeigen.
- [ ] Status und Freigabe der Karte nach einer Migration oder einem Kundenwechsel aktualisieren.

#### Tests und Abschluss

- [ ] Service-, Store- und Seitentests für Filialmigration, Abhängigkeit, Wiederholung, Konflikte und Fehler ergänzen.
- [ ] `docs/projekt-stand.md` nach der Umsetzung aktualisieren.
- [ ] `npm test` ohne Watch-Modus erfolgreich ausführen.
- [ ] `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [ ] Nur die Filialen des ausgewählten `purCustomer` werden migriert.
- [ ] Die Filialmigration ist ohne erfolgreich migrierte Firmen nicht ausführbar.
- [ ] Der Status liegt unter `systemMigrationen/{purCustomerId}/datenbereiche/filialen_v1`.
- [ ] Wiederholungen erzeugen keine zusätzlichen Filialen und überschreiben keine Konflikte.
- [ ] Tests und Build laufen erfolgreich.

### 1.4 Mitarbeiter des ausgewählten Kunden migrieren

#### Ziel

Nach erfolgreicher Filialmigration können die Mitarbeiter aus allen Filialen des ausgewählten `purCustomer` als
Firmenmitarbeiter übernommen werden. Mitarbeiter werden nicht automatisch zusammengeführt; potenzielle Dubletten bleiben für
die spätere manuelle Bearbeitung erkennbar.

#### Betroffene Dateien

Änderungen:

- `src/app/commons/models/domain/datenmigration.ts`
- `src/app/commons/models/domain/mitarbeiter.ts`
- `src/app/services/domain/datenmigration.service.ts`
- `src/app/services/domain/datenmigration.service.spec.ts`
- `src/app/stores/domain/datenmigration.store.ts`
- `src/app/stores/domain/datenmigration.store.spec.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.html`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.spec.ts`
- `docs/projekt-stand.md`

#### Schritt 1: Mitarbeitermigration

- [ ] Reale Legacy-Mitarbeiterdokumente prüfen und die Feldzuordnung zum Mitarbeitermodell festlegen.
- [ ] Mitarbeiter aus allen Legacy-Filialen des ausgewählten Kunden laden.
- [ ] Die Mitarbeitermigration erst nach erfolgreicher Filialmigration freigeben.
- [ ] Für jeden Filialmitarbeiter eine stabile Ziel-ID aus Quellfiliale und Legacy-Mitarbeiter-ID bilden.
- [ ] Jeden Filialmitarbeiter zunächst als eigenen Firmenmitarbeiter mit genau seiner Quellfiliale in `filialIds` anlegen.
- [ ] Potenzielle Dubletten kenntlich machen, aber nicht automatisch zusammenführen.
- [ ] Identische Zielmitarbeiter als bereits migriert zählen und abweichende Zielmitarbeiter nicht überschreiben.
- [ ] Den Status unter `datenbereiche/mitarbeiter_v1` mit den Ergebniszahlen dieser Mitarbeitermigration speichern.

#### Schritt 2: Mitarbeiterkarte

- [ ] Eine Karte „Mitarbeiter migrieren“ mit eigenem Status und eigener Migrationsaktion ergänzen.
- [ ] Quelle, migriert, bereits migriert, potenzielle Dubletten, Konflikte und Fehler anzeigen.
- [ ] Status und Freigabe der Karte nach einer Migration oder einem Kundenwechsel aktualisieren.

#### Tests und Abschluss

- [ ] Service-, Store- und Seitentests für Mitarbeitermigration, stabile IDs, Filialzuordnung, Wiederholung und Konflikte
      ergänzen.
- [ ] Tests für gleichnamige Mitarbeiter und gleiche Legacy-IDs in unterschiedlichen Filialen ergänzen.
- [ ] `docs/projekt-stand.md` nach der Umsetzung aktualisieren.
- [ ] `npm test` ohne Watch-Modus erfolgreich ausführen.
- [ ] `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [ ] Nur Mitarbeiter aus den Filialen des ausgewählten `purCustomer` werden migriert.
- [ ] Jeder Quellmitarbeiter liegt zunächst als eigener Firmenmitarbeiter mit seiner Quellfiliale vor.
- [ ] Potenzielle Dubletten werden nicht automatisch zusammengeführt und bleiben nachvollziehbar.
- [ ] Der Status liegt unter `systemMigrationen/{purCustomerId}/datenbereiche/mitarbeiter_v1`.
- [ ] Wiederholungen erzeugen keine zusätzlichen Mitarbeiter und überschreiben keine Konflikte.
- [ ] Tests und Build laufen erfolgreich.

### 1.5 Gesamtprüfung einer Kundenmigration

#### Ziel

Für den ausgewählten `purCustomer` sind Status, Abhängigkeiten und Ergebnisse aller vorgesehenen Datenbereiche gemeinsam
prüfbar. Die vollständige Migration kann mit realen Legacy-Daten fachlich abgenommen werden, ohne eine kundenübergreifende
Sammelaktion einzuführen.

#### Betroffene Dateien

Änderungen:

- `src/app/stores/domain/datenmigration.store.ts`
- `src/app/stores/domain/datenmigration.store.spec.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.ts`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.html`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.scss`
- `src/app/pages/systemverwaltung-page/datenmigration-page/datenmigration-page.spec.ts`
- `docs/projekt-stand.md`

#### Schritt 1: Gesamtstatus und Bedienung

- [ ] Die Karten in der fachlich erforderlichen Reihenfolge Unternehmer, Firmen, Filialen und Mitarbeiter anordnen.
- [ ] Abhängige Karten erst freigeben, wenn der vorherige Datenbereich erfolgreich abgeschlossen ist.
- [ ] Den Status aller Datenbereiche beim Wechsel des ausgewählten Kunden vollständig neu laden.
- [ ] Unvollständige und fehlgeschlagene Datenbereiche gezielt wiederholbar machen.
- [ ] Einen vollständig migrierten Kunden eindeutig anzeigen, ohne einen zusätzlichen globalen Status über alle Kunden zu
      bilden.

#### Schritt 2: Reale Abnahme

- [ ] Eine vollständige Kundenmigration mit realen Legacy-Daten kontrolliert durchführen.
- [ ] Unternehmer, Firmen, Filialen und Mitarbeiter mit den jeweiligen Quelldaten vergleichen.
- [ ] Konflikte, Fehler und potenzielle Mitarbeiterdubletten auf Nachvollziehbarkeit prüfen.
- [ ] Einen erneuten Lauf aller Datenbereiche ausführen und auf unveränderte Zielstruktur prüfen.

#### Tests und Abschluss

- [ ] Integrationstests für Reihenfolge, Kundenwechsel, Wiederaufnahme und vollständigen Kundenstatus ergänzen.
- [ ] Responsive Darstellung und Bedienung der Migrationskarten manuell prüfen.
- [ ] `docs/projekt-stand.md` nach der fachlichen Abnahme aktualisieren.
- [ ] Das abgeschlossene Haupttodo unter Erhalt aller Markierungen nach `docs/todo_done.md` verschieben.
- [ ] `npm test` ohne Watch-Modus erfolgreich ausführen.
- [ ] `npm run build` erfolgreich ausführen.

#### Erledigt, wenn

- [ ] Jeder Datenbereich des ausgewählten Kunden besitzt einen eigenen nachvollziehbaren Migrationsstatus.
- [ ] Abhängigkeiten und Wiederholungen funktionieren über alle vier Datenbereiche.
- [ ] Eine reale Kundenmigration wurde vollständig geprüft.
- [ ] Ein erneuter Lauf erzeugt keine zusätzlichen Zieldokumente und überschreibt keine Konflikte.
- [ ] Es existiert keine Aktion zur Migration aller `purCustomers`.
- [ ] Tests und Build laufen erfolgreich.
