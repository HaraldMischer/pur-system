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

| Reihenfolge | Legacy-Quelle                                    | Ziel                                          |
| ----------- | ------------------------------------------------ | --------------------------------------------- |
| 1           | `purCustomers/{purCustomerId}`                   | `unternehmer/{unternehmerId}`                 |
| 2           | `purCustomers/{purCustomerId}/company/{purCompanyId}` | `unternehmer/{unternehmerId}/firma/{firmaId}` |
| 3           | `…/company/{firmaId}/branches/{filialId}`        | `…/firma/{firmaId}/filiale/{filialId}`        |
| 4           | `…/branches/{filialId}/employee/{mitarbeiterId}` | `…/firma/{firmaId}/mitarbeiter/{zielId}`      |

### Zusatzbedingungen

- Die Unternehmer-ID wird einmalig zufällig erzeugt und dauerhaft unter
  `systemMigrationen/{purCustomerId}.unternehmerId` dem Legacy-Kunden zugeordnet.
- Firmen-IDs werden einmalig zufällig erzeugt und unter `systemMigrationen/{purCustomerId}.firmenIds.{purCompanyId}` dauerhaft
  der jeweiligen Legacy-Firma zugeordnet.
- Die Vergabe und Zuordnung neuer Filial-IDs wird in deren Umsetzungsschritt festgelegt.
- Untergeordnete Daten werden nur bei vorhandener Zielstruktur migriert.

## 3. Transformation und Konflikte

### Matrix

| Situation                              | Regel                                    |
| -------------------------------------- | ---------------------------------------- |
| Gültiges Quelldokument, Ziel fehlt     | Zieldokument anlegen.                    |
| Ziel entspricht dem Migrationsergebnis | Als bereits migriert behandeln.          |
| Ziel enthält abweichende Daten         | Nicht überschreiben und Konflikt melden. |
| Pflichtdaten fehlen oder sind ungültig | Nicht migrieren und Fehler melden.       |
| Unbekanntes Legacy-Feld                | Nicht ungeprüft übernehmen.              |

### Zusatzbedingungen

- Die konkrete Feldzuordnung wird vor der Umsetzung anhand realer Legacy-Dokumente festgelegt.
- Wiederholte Läufe erzeugen keine zusätzlichen Dokumente.

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

## 5. Mitarbeiter

### Matrix

| Merkmal             | Regel                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| Übernahme           | Jeder Filialmitarbeiter wird zunächst als eigener Firmenmitarbeiter angelegt.  |
| Ziel-ID             | Wird stabil und eindeutig aus Quellfiliale und Legacy-Mitarbeiter-ID gebildet. |
| Filialzuordnung     | `filialIds` enthält zunächst genau die Quellfiliale.                           |
| Dubletten           | Werden nicht automatisch zusammengeführt.                                      |
| Persönlicher Zugang | `benutzerUid` wird nicht gesetzt.                                              |

### Zusatzbedingungen

- Gleiche Namen oder Legacy-IDs in verschiedenen Filialen führen nicht zu einem Überschreiben.
- Potenzielle Dubletten werden nur für die spätere manuelle Prüfung kenntlich gemacht.

## 6. Ausführung und Ergebnis

### Matrix

| Anforderung    | Regel                                                                            |
| -------------- | -------------------------------------------------------------------------------- |
| Berechtigung   | Nur ein aktiver Master darf die Migration ausführen und Ergebnisse lesen.        |
| Legacy-Zugriff | Die Migration benötigt ausschließlich lesenden Zugriff auf `purCustomers`.       |
| Ergebnis       | Anzahl von Quelle, migriert, bereits migriert, Konflikten und Fehlern ausweisen. |
| Wiederholung   | Abgebrochene oder unvollständige Läufe müssen sicher wiederholbar sein.          |

### Zusatzbedingungen

- `purUser` und Firebase Auth bleiben von dieser Ausführung unberührt.
- Die konkrete technische Ausführung und Statusspeicherung werden im Umsetzungstodo festgelegt.

## 7. Manuelle Nacharbeit und Abnahme

### Matrix

| Aufgabe                         | Abnahmekriterium                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Struktur prüfen                 | Unternehmer, Firmen und Filialen liegen vollständig in der neuen Hierarchie.                 |
| Mitarbeiter prüfen              | Jeder Quellmitarbeiter liegt mit seiner Quellfiliale als Firmenmitarbeiter vor.              |
| Dubletten bearbeiten            | Potenzielle Dubletten sind nachvollziehbar und können später manuell zusammengeführt werden. |
| Konflikte und Fehler bearbeiten | Nicht migrierte Dokumente sind mit Quellpfad und Ursache erkennbar.                          |
| Wiederholung prüfen             | Ein erneuter Lauf erzeugt keine zusätzlichen Zieldokumente und überschreibt keine Konflikte. |

### Zusatzbedingungen

- Beim manuellen Zusammenführen werden die benötigten `filialIds` vereinigt.
- Vor dem Löschen eines doppelten Mitarbeiters werden vorhandene Referenzen geprüft.
