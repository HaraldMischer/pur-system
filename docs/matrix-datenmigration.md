<!-- pur-system/docs/matrix-datenmigration.md -->

# Matrix: Datenmigration

Diese Übersicht beschreibt den einmaligen Übergangsprozess zur Übernahme der Legacy-Daten in die neue Firestore-Struktur. Die
hier dokumentierten Zuordnungen und Wiederholungsregeln gehören nicht zum regulären fachlichen Systembetrieb. Der abgeschlossene
Umsetzungsverlauf steht in `docs/todo_done.md`; der aktuelle Stand ist in `docs/projekt-stand.md` zusammengefasst.

## 1. Geltungsbereich

### Matrix

| Datenbereich                | Bestandteil | Ziel                                    |
| --------------------------- | ----------- | --------------------------------------- |
| Unternehmer                 | ja          | Neue Unternehmensstruktur               |
| Firmen                      | ja          | Neue Unternehmensstruktur               |
| Filialen                    | ja          | Neue Unternehmensstruktur               |
| Mitarbeiter                 | ja          | Firmenmitarbeiter mit Filialzuordnungen |
| `purUser` und Firebase Auth | nein        | Keine automatische Benutzermigration    |
| Weitere Fachdaten           | nein        | Spätere Planung bei fachlichem Bedarf   |

### Zusatzbedingungen

- Die Migration verändert oder löscht keine Legacy-Daten.
- Legacy-Passwörter und andere Anmeldedaten werden nicht übernommen.
- Migrierte Unternehmer, Firmen, Filialen und Mitarbeiter sind anschließend reguläre Dokumente der neuen Unternehmensstruktur.
- Vorhandene oder neu angelegte Benutzer können ihnen in der Benutzerverwaltung rollenabhängig zugeordnet werden. Dafür werden
  ausschließlich die neuen Ziel-IDs verwendet.
- `systemMigrationen` und die dort gespeicherten Legacy-Zuordnungen dienen nur der Migration und begründen keine
  Benutzerberechtigungen.

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
- Eine eigenständige Löschaktion wird in der Mitarbeiteroberfläche nicht angeboten. Die technische Löschfunktion wird beim
  Zusammenführen verwendet.
- Beim manuellen Zusammenführen bleibt der Mitarbeiter bestehen, von dessen Card die Aktion geöffnet wurde. Mehrere ausgewählte
  Duplikate werden gemeinsam verarbeitet: Ihre Legacy-IDs werden auf den Zielmitarbeiter umgeleitet und die Duplikate
  anschließend atomar gelöscht.
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
| Dubletten           | Bleiben zunächst getrennt und können durch einen Master zusammengeführt werden. |
| Persönlicher Zugang | `benutzerUid` wird nicht gesetzt.                                             |
| Anzeigename         | Wird aus `firstName` und `lastName` gebildet.                                 |
| Rollen              | Werden als eindeutiges Array unter `rollen` gespeichert.                       |
| `Service`           | Wird als `servicekraft` übernommen.                                            |
| `Servicekraft`      | Wird als `servicekraft` übernommen.                                            |
| `Filialkasse`       | Wird als `filialkasse` übernommen.                                             |
| `Administrator`     | Wird als `administrator` übernommen.                                           |
| `Einstellungen`     | Wird als `administrator` übernommen.                                           |
| `Kassierer`         | Wird als `kassierer` übernommen.                                               |
| `Kassieren`         | Wird als `kassierer` übernommen.                                               |
| `Techniker`         | Wird als `techniker` übernommen.                                               |
| `Gerätetechnik`     | Wird als `techniker` übernommen.                                               |
| `Geraetetechnik`    | Wird als `techniker` übernommen.                                               |

### Zusatzbedingungen

- Gleiche Namen oder Legacy-IDs in verschiedenen Filialen führen durch die verschachtelte Zuordnung nicht zu einem
  Überschreiben und bleiben für die spätere manuelle Prüfung nachvollziehbar.
- Master können solche getrennten Einträge gezielt zusammenführen. Als auswählbare Duplikate werden nur Mitarbeiter derselben
  Firma mit ausreichend ähnlichem normalisiertem Namen angeboten. Beim Zusammenführen bleiben die Stammdaten des
  Zielmitarbeiters maßgeblich. `filialIds` und `rollen` aller ausgewählten Mitarbeiter werden jeweils vereinigt, alle zugehörigen
  Legacy-Zuordnungen werden auf die Ziel-ID umgestellt und die Duplikate werden atomar gelöscht. Mitarbeiter mit verknüpftem
  Benutzerkonto bleiben vor dem Zusammenführen und dem dabei ausgeführten Löschen geschützt.
- `firstName`, `lastName`, `address`, `email`, `phone`, `birthday`, `role`, `active` und `deleted` werden in die vorhandene
  Personen-, Rollen-, Filial- und Statusstruktur überführt. `active` und `deleted` bestimmen gemeinsam den Zielwert `aktiv`;
  ein separates Löschfeld wird nicht gespeichert.
- `active` wird als Boolean sowie bei fehlerhaften Legacy-Daten als Array mit genau einem Boolean akzeptiert.
- `role` und `authorisation` werden gemeinsam ausgewertet. Erkannte Werte werden ohne Duplikate nach `rollen` übernommen.
- `gender`, `password`, `basicWage`, `holidays`, `workHours`, `personNum`, `colorLabel`, `thumb`, `added`, `employee_ID` und
  `phone.fax` werden nicht übernommen.

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

- Beim manuellen Zusammenführen werden die benötigten `filialIds` und `rollen` aller ausgewählten Duplikate vereinigt und alle
  zugehörigen Legacy-IDs auf den Zielmitarbeiter umgeleitet. Die Duplikate werden anschließend atomar physisch gelöscht.
- Wiederholte Mitarbeitermigrationen erhalten die Stammdaten zusammengeführter Zielmitarbeiter.
