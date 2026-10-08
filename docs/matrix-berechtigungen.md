<!-- pur-system/docs/matrix-berechtigungen.md -->

# Matrix: Berechtigungen

Diese Übersicht zeigt die zentralen Datenrechte und App-Bereichsfreigaben. Vollständige fachliche Bedingungen und Sonderfälle
stehen im [Projektplan](./projekt-plan.md). Der aktuelle Implementierungs-, Test- und Deploymentstand steht im
[Projektstand](./projekt-stand.md).

## 1. Collection-Matrix

### Legende

Die Collection-Matrix zeigt, welche Aktionen eine Benutzerrolle grundsätzlich auf einer Firestore-Collection ausführen darf.

| Wert      | Bedeutung                                    |
| --------- | -------------------------------------------- |
| `R`       | Dokumente lesen                              |
| `C`       | Dokumente anlegen                            |
| `U`       | Dokumente bearbeiten                         |
| `D`       | Dokumente löschen                            |
| `eigen`   | ausschließlich der eigene Datensatz          |
| `Firma`   | ausschließlich innerhalb der eigenen Firma   |
| `Filiale` | ausschließlich innerhalb der eigenen Filiale |
| `–`       | kein Zugriff                                 |

### Matrix

| Collection                                                                     | `master` | `office`  | `filiale`                | `mitarbeiter` | Legacy-Konto |
| ------------------------------------------------------------------------------ | -------- | --------- | ------------------------ | ------------- | ------------ |
| `benutzerprofil/{uid}`                                                         | R/C/U    | R `eigen` | R `eigen`                | R `eigen`     | –            |
| `benutzerprofil/{uid}/{subcollection}/{document=**}`                           | R/C/U/D  | –         | –                        | –             | –            |
| `unternehmer/{unternehmerId}`                                                  | R/C/U/D  | R         | R                        | R             | –            |
| `unternehmer/{unternehmerId}/firma/{firmaId}`                                  | R/C/U/D  | R/U       | R                        | R             | –            |
| `unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}`               | R/C/U/D  | R/U       | R                        | R `Firma`     | –            |
| `unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/{document=**}` | R/C/U    | R         | R                        | –             | –            |
| `unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiter/{mitarbeiterId}`      | R/C/U/D  | R/C/U     | R `Firma`, C/U `Filiale` | R `Firma`     | –            |
| `purCustomers/{document=**}`                                                   | R        | –         | –                        | –             | R/C/U/D      |
| `purUser/{document=**}`                                                        | –        | –         | –                        | –             | R/C/U/D      |

### Zusatzbedingungen

- Das eigene Profil bleibt auch inaktiv lesbar; alle weiteren Rechte einer Pur-System-Rolle setzen ein aktives Profil voraus.
- Was nicht in der Collection-Matrix steht, ist nicht erlaubt.
- Die im Benutzerprofil hinterlegten `zugriffe` begrenzen erlaubte Aktionen zusätzlich auf die rollenspezifisch zugeordneten
  Unternehmer, Firmen und Filialen.
- Benutzerprofile werden nur durch die Cloud Function angelegt.
- Strukturdatensätze werden nur durch die Cloud Function rekursiv gelöscht; vorhandene Referenzen verhindern das Löschen.
- Normale Datenzugriffe erfolgen clientseitig und werden durch Firestore Rules abgesichert. Technisch notwendige serverseitige
  Aktionen prüfen ihre Berechtigungen in der jeweiligen Cloud Function.
- `erlaubteBereiche` beeinflusst keine Datenrechte.
- `office` darf nur Daten innerhalb der zugewiesenen Unternehmer, Firmen und Filialen verwenden.
- `office` verwaltet Mitarbeiter zugewiesener Firmen. `filiale` liest Mitarbeiter der eigenen Firma, lädt über `filialIds`
  gezielt die Mitarbeiter der eigenen Filiale und darf nur diese anlegen oder bearbeiten.
- Der Aktivstatus eines fachlichen Mitarbeiters schränkt diese Lese- und Bearbeitungsrechte nicht ein. `aktiv: false` beschreibt
  einen inaktiven Beschäftigungsstatus; berechtigte Rollen können den Mitarbeiter später wieder aktivieren.
- Die betrieblichen Mitarbeiterrollen `filialkasse`, `servicekraft`, `administrator`, `kassierer`, `techniker` und
  `dienstplaner` werden als Array `rollen` gespeichert. Sie beschreiben Tätigkeiten und gewähren unabhängig von `TUserRole`
  keine eigenen Firestore-Datenrechte. `dienstplaner` steuert ausschließlich im Filial-Frontend, ob ein aktiver
  Firma-Mitarbeiter der eigenen Filiale die dort für das Filialkonto erlaubten Planungsaktionen bedienen darf.
- Nur Master dürfen Dubletten zusammenführen. Dabei wird das nicht mit einem Benutzerkonto verknüpfte Duplikat physisch
  gelöscht; eine eigenständige Löschaktion wird in der Mitarbeiteroberfläche nicht angeboten.
- Mit einem Benutzerkonto verknüpfte Mitarbeiter dürfen weder gelöscht noch zusammengeführt werden.
- `filiale` ist genau einem Unternehmer, einer Firma und einer Filiale zugeordnet.
- `mitarbeiter` liest den zugeordneten Unternehmer sowie die direkte Firmenstruktur mit Firma, Filialen und fachlichen
  Mitarbeitern. Filial-Untercollections und Schreibzugriffe bleiben gesperrt. Der Client lädt beim Sitzungsstart nur die über den
  eigenen Mitarbeiterdatensatz zugeordneten Filialen und deren Mitarbeiter.
- `master` verwaltet fachliche Mitarbeiter aller Firmen.
- `master` liest `purCustomers` und dessen Untercollections ausschließlich für die Datenmigration; Schreibzugriffe bleiben
  gesperrt.
- Legacy-Konten sind authentifizierte Konten ohne `benutzerprofil` und greifen ausschließlich auf `purCustomers` und `purUser`
  einschließlich ihrer Untercollections zu.

## 2. App-Bereich-Matrix

### Legende

Die App-Bereich-Matrix zeigt, welche Benutzerrolle einen App-Bereich grundsätzlich verwenden darf.

| Wert            | Bedeutung                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------- |
| `verpflichtend` | Wird der Rolle bei der Benutzeranlage durch die Cloud Function automatisch zugewiesen.        |
| `optional`      | Wird der Rolle im Client bei der Benutzeranlage und beim Bearbeiten als Checkbox angeboten.   |
| `verboten`      | Darf der Rolle im Client weder bei der Benutzeranlage noch beim Bearbeiten zugewiesen werden. |

### Matrix

| `TUserRole` \ `TAppBereich` | `dashboard`     | `schichtplan` | `mitarbeiter` | `verwaltung` | `systemverwaltung` |
| --------------------------- | --------------- | ------------- | ------------- | ------------ | ------------------ |
| `master`                    | `verpflichtend` | `optional`    | `optional`    | `optional`   | `verpflichtend`    |
| `office`                    | `verpflichtend` | `optional`    | `optional`    | `optional`   | `verboten`         |
| `filiale`                   | `verpflichtend` | `optional`    | `optional`    | `verboten`   | `verboten`         |
| `mitarbeiter`               | `verpflichtend` | `optional`    | `verboten`    | `verboten`   | `verboten`         |

### Zusatzbedingungen

- Die Cloud Function ergänzt `verpflichtend` bei der Benutzeranlage; beim Bearbeiten erhält der Client diese Bereiche.
- `optional` und `verboten` werden durch die rollenabhängigen Checkboxen im Client umgesetzt.
- `erlaubteBereiche` steuert Navigation, Routenzugriff und sichtbare App-Funktionen, aber keine Datenrechte.
- `mitarbeiter` erfordert für `office` und `filiale` zusätzlich mindestens einen gültigen Firmen- und Filialzugriff.
