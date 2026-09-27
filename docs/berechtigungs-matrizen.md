<!-- pur-system/docs/berechtigungs-matrizen.md -->

# Berechtigungsmatrizen

Dieses Dokument bietet einen schnellen Überblick über die zentralen Berechtigungen der Anwendung. Es wird gemeinsam mit der
Anwendung erweitert, sobald neue Rollen, App-Bereiche, Collections oder fachliche Zugriffsbedingungen hinzukommen.

Die vollständigen fachlichen Bedingungen und Sonderfälle stehen im [Projektplan](./projekt-plan.md). Der aktuelle
Implementierungs-, Test- und Deploymentstand steht im [Projektstand](./projekt-stand.md).

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
| `unternehmer/{unternehmerId}`                                                  | R/C/U/D  | R         | R                        | –             | –            |
| `unternehmer/{unternehmerId}/firma/{firmaId}`                                  | R/C/U/D  | R/U       | R                        | –             | –            |
| `unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}`               | R/C/U/D  | R/U       | R                        | –             | –            |
| `unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}/{document=**}` | R/C/U    | R         | R                        | –             | –            |
| `unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiter/{mitarbeiterId}`      | R/C/U/D  | R/C/U     | R `Firma`, C/U `Filiale` | R `Firma`     | –            |
| `purCustomers/{document=**}`                                                   | –        | –         | –                        | –             | R/C/U/D      |
| `purUser/{document=**}`                                                        | –        | –         | –                        | –             | R/C/U/D      |

### Zusatzbedingungen

- Das eigene Profil bleibt auch inaktiv lesbar; alle weiteren Rechte einer Pur-System-Rolle setzen ein aktives Profil voraus.
- Was nicht in der Collection-Matrix steht, ist nicht erlaubt.
- Die im Benutzerprofil hinterlegten `zugriffe` begrenzen erlaubte Aktionen zusätzlich auf die zugeordneten Unternehmer, Firmen
  und Filialen.
- Benutzerprofile werden nur durch die Cloud Function angelegt.
- Strukturdatensätze werden nur durch die Cloud Function rekursiv gelöscht; vorhandene Referenzen verhindern das Löschen.
- Normale Datenzugriffe erfolgen clientseitig und werden durch Firestore Rules abgesichert. Technisch notwendige serverseitige
  Aktionen prüfen ihre Berechtigungen in der jeweiligen Cloud Function.
- `erlaubteBereiche` beeinflusst keine Datenrechte.
- `office` darf nur Daten innerhalb der zugewiesenen Unternehmer, Firmen und Filialen verwenden.
- `office` verwaltet Mitarbeiter zugewiesener Firmen. `filiale` liest Mitarbeiter der eigenen Firma, lädt über `filialIds`
  gezielt die Mitarbeiter der eigenen Filiale und darf nur diese anlegen oder bearbeiten.
- Mit einem Benutzerkonto verknüpfte Mitarbeiter dürfen nicht gelöscht werden.
- `filiale` ist genau einem Unternehmer, einer Firma und einer Filiale zugeordnet.
- `mitarbeiter` liest fachliche Mitarbeiter der im Profil zugewiesenen Firma.
- `master` verwaltet fachliche Mitarbeiter aller Firmen.
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
