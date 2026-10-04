<!-- pur-system/docs/matrix-datenmigration.md -->

# Matrix: Datenmigration

Diese Übersicht beschreibt die fachlichen Regeln für die Übernahme der Legacy-Daten in die neue Firestore-Struktur. Die
technische Umsetzung wird separat in `docs/todo_next.md` geplant.

## 1. Geltungsbereich

### Matrix

| Datenbereich                | Bestandteil | Ziel                                    |
| --------------------------- | ----------- | --------------------------------------- |
| Unternehmer                 | ja          | Neue Unternehmensstruktur               |
| Firmen                      | ja          | Neue Unternehmensstruktur               |
| Filialen                    | ja          | Neue Unternehmensstruktur               |
| Mitarbeiter                 | ja          | Firmenmitarbeiter mit Filialzuordnungen |
| `purUser` und Firebase Auth | nein        | Separate Benutzer- und Auth-Migration   |
| Weitere Fachdaten           | nein        | Spätere Planung bei fachlichem Bedarf   |

### Zusatzbedingungen

- Die Migration verändert oder löscht keine Legacy-Daten.
- Legacy-Passwörter und andere Anmeldedaten werden nicht übernommen.

## 2. Pfade und Reihenfolge

### Matrix

| Reihenfolge | Legacy-Quelle                                           | Ziel                                                          |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| 1           | `purCustomers/{purCustomerId}`                          | `unternehmer/{unternehmerId}`                                 |
| 2           | `…/company/{purCompanyId}`                              | `…/firma/{firmaId}`                                           |
| 3           | `…/company/{purCompanyId}/branches/{purBranchId}`        | `…/firma/{firmaId}/filiale/{filialeId}`                        |
| 4           | `…/branches/{purBranchId}/employee/{purEmployeeId}`       | `…/firma/{firmaId}/mitarbeiter/{mitarbeiterId}`                |

### Zusatzbedingungen

- Der Unternehmer erhält einmalig eine Firestore-Auto-ID. Die Zuordnung wird dauerhaft als `unternehmerId` unter
  `systemMigrationen/{purCustomerId}` gespeichert.
- Jede Firma erhält einmalig eine Firestore-Auto-ID. Die Zuordnungen werden dauerhaft als
  `firmenIds.{purCompanyId}` unter `systemMigrationen/{purCustomerId}` gespeichert.
- Jede Filiale erhält einmalig eine Firestore-Auto-ID. Die Zuordnungen werden dauerhaft als
  `filialenIds.{purCompanyId}.{purBranchId}` unter `systemMigrationen/{purCustomerId}` gespeichert.
- Jeder Filialmitarbeiter erhält einmalig eine Firestore-Auto-ID. Die Zuordnungen werden dauerhaft als
  `mitarbeiterIds.{purCompanyId}.{purBranchId}.{purEmployeeId}` unter `systemMigrationen/{purCustomerId}` gespeichert.
- Ein Reset eines Datenbereichs entfernt die gespeicherten Unternehmer-, Firmen-, Filial- und Mitarbeiter-Zuordnungen nicht.
- Untergeordnete Daten werden nur bei vorhandener Zielstruktur migriert.

## 3. Transformation

### Matrix

| Situation                              | Regel                                                          |
| -------------------------------------- | -------------------------------------------------------------- |
| Gültiges Quelldokument                 | Gemappte Felder unter der gespeicherten Ziel-ID schreiben.      |
| Zieldokument ist bereits vorhanden     | Gemappte Felder aktualisieren.                                  |
| Dokument existiert ausschließlich dort | Unverändert im Ziel erhalten.                                   |
| Pflichtdaten fehlen oder sind ungültig | Nicht migrieren und Fehler melden.                              |
| Unbekanntes Legacy-Feld                | Nicht ungeprüft übernehmen.                                    |

### Zusatzbedingungen

- Die konkrete Feldzuordnung wird vor der Umsetzung anhand realer Legacy-Dokumente festgelegt.
- Wiederholte Läufe verwenden die gespeicherten Ziel-IDs und erzeugen keine zusätzlichen Dokumente.
- Nicht gemappte Zusatzfelder vorhandener Zieldokumente bleiben erhalten.

## 4. Firmen

### Matrix

| Legacy-Feld                    | Zielfeld                         |
| ------------------------------ | -------------------------------- |
| `companyName`                  | `anzeigename`, `firmenname`      |
| `companyNumber`                | `nummer`                         |
| `active`                       | `aktiv`                          |
| `address.street/postcode/city` | optionale, teilweise `adresse`   |
| `email`, `phone.*`             | optionale Felder unter `kontakt` |

### Zusatzbedingungen

- `company_ID` muss, sofern gesetzt, der Legacy-Dokument-ID entsprechen.
- Fehlt eine gültige `companyNumber`, wird die nächste freie Firmennummer des Ziel-Unternehmers vergeben. Bei Wiederholungen
  bleibt eine bereits gespeicherte Zielnummer erhalten.
- `activeDate`, `addressName` und `phone.fax` werden nicht übernommen.
- Eine fehlende oder unvollständige Adresse verhindert weder die reguläre Firmenanlage noch die Migration.

## 5. Filialen

### Matrix

| Legacy-Feld                    | Zielfeld                         |
| ------------------------------ | -------------------------------- |
| `branchName`                   | `anzeigename`                    |
| `addressName`                  | `filialname`                     |
| `branchNumber`                 | `nummer`                         |
| `active`                       | `aktiv`                          |
| `address.street/postcode/city` | optionale, teilweise `adresse`   |
| `email`, `phone.*`             | optionale Felder unter `kontakt` |

### Zusatzbedingungen

- Fehlt eine gültige `branchNumber`, wird die nächste freie Filialnummer der Ziel-Firma vergeben. Bei Wiederholungen bleibt
  eine bereits gespeicherte Zielnummer erhalten.
- Fehlt `branchName`, wird `addressName` auch als `anzeigename` verwendet. Fehlt `addressName`, wird `branchName` auch als
  `filialname` verwendet. Nur wenn beide Namen fehlen, ist die Filiale ungültig.
- Die eingebetteten Felder `branch_ID`, `company_ID` und `customer_ID` werden ignoriert; maßgeblich ist der Legacy-Pfad.
- `activeDate`, `appVersion`, `module` und `phone.fax` werden nicht übernommen.
- Eine fehlende oder unvollständige Adresse verhindert weder die reguläre Filialanlage noch die Migration.
- Filial-Untercollections wie `_syncWatch` und `bookingTemplates` werden in diesem Schritt nicht migriert.

## 6. Mitarbeiter

### Matrix

| Merkmal             | Regel                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| Übernahme           | Jeder Filialmitarbeiter wird zunächst als eigener Firmenmitarbeiter angelegt. |
| Ziel-ID             | Einmalige Firestore-Auto-ID mit dauerhaft gespeicherter Zuordnung.            |
| Filialzuordnung     | `filialIds` enthält zunächst genau die zugeordnete neue Filial-ID.            |
| Dubletten           | Werden nicht automatisch zusammengeführt.                                     |
| Persönlicher Zugang | `benutzerUid` wird nicht gesetzt.                                             |
| Anzeigename         | Wird aus `firstName` und `lastName` gebildet.                                 |
| Rolle `Service`     | Wird als `service` übernommen.                                                 |
| Rollen `Techniker`, `Kassierer`, `Administrator` | Werden als `admin` übernommen.                           |

### Zusatzbedingungen

- Gleiche Namen oder Legacy-IDs in verschiedenen Filialen führen durch die verschachtelte Zuordnung nicht zu einem
  Überschreiben und bleiben für die spätere manuelle Prüfung nachvollziehbar.
- `firstName`, `lastName`, `address`, `email`, `phone`, `birthday`, `role`, `active` und `deleted` werden in die
  vorhandene Personen-, Rollen-, Filial- und Statusstruktur überführt.
- `active` wird als Boolean sowie bei fehlerhaften Legacy-Daten als Array mit genau einem Boolean akzeptiert.
- `gender`, `password`, `authorisation`, `basicWage`, `holidays`, `workHours`, `personNum`, `colorLabel`, `thumb`, `added`,
  `employee_ID` und `phone.fax` werden nicht übernommen.

## 7. Ausführung und Ergebnis

### Matrix

| Anforderung    | Regel                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| Berechtigung   | Nur ein aktiver Master darf die Migration ausführen und Ergebnisse lesen.  |
| Legacy-Zugriff | Die Migration benötigt ausschließlich lesenden Zugriff auf `purCustomers`. |
| Status         | Zustand des letzten Migrationslaufs.                                       |
| Quelle         | Aktuelle Anzahl der Dokumente in der Legacy-Collection.                    |
| Migriert       | Im letzten Lauf erfolgreich verarbeitete Quelldokumente.                   |
| Fehler         | Anzahl der im letzten Lauf erkannten Migrationsprobleme.                    |
| Offen          | Aktuelle Quelle abzüglich der zuletzt erfolgreich migrierten Dokumente.    |
| Ziel           | Aktuelle Gesamtzahl der Dokumente in der Ziel-Collection.                  |
| Wiederholung   | Abgebrochene oder unvollständige Läufe müssen sicher wiederholbar sein.    |

### Zusatzbedingungen

- `purUser` und Firebase Auth bleiben von dieser Ausführung unberührt.
- Quelle und Ziel werden bei Auswahl des Migrationsbereichs direkt aus Firestore gelesen.
- Nach einer Migration werden Status und Zielbestand erneut geladen.
- Der Zielbestand kann höher als die Quelle sein, weil ausschließlich im Ziel vorhandene Dokumente erhalten bleiben.
- Ein Zurücksetzen der Migrationsinformation löscht keine Zieldokumente.

## 8. Manuelle Nacharbeit und Abnahme

### Matrix

| Aufgabe              | Abnahmekriterium                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Struktur prüfen      | Unternehmer, Firmen und Filialen liegen vollständig in der neuen Hierarchie.                 |
| Mitarbeiter prüfen   | Jeder Quellmitarbeiter liegt mit seiner Quellfiliale als Firmenmitarbeiter vor.              |
| Dubletten bearbeiten | Potenzielle Dubletten sind nachvollziehbar und können später manuell zusammengeführt werden. |
| Fehler bearbeiten    | Nicht migrierte Dokumente sind mit Quellpfad und Ursache erkennbar.                          |
| Wiederholung prüfen  | Ein erneuter Lauf aktualisiert dieselben Ziel-IDs und erhält ausschließlich dortige Daten.   |

### Zusatzbedingungen

- Beim manuellen Zusammenführen werden die benötigten `filialIds` vereinigt.
- Vor dem Löschen eines doppelten Mitarbeiters werden vorhandene Referenzen geprüft.
