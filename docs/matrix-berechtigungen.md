<!-- pur-system/docs/matrix-berechtigungen.md -->

# Matrix: Berechtigungen

Diese Übersicht zeigt die zentralen Datenrechte und App-Bereichsfreigaben. Vollständige fachliche Bedingungen und Sonderfälle
stehen im [Projektplan](./projekt-plan.md). Der aktuelle Implementierungs-, Test- und Deploymentstand steht im
[Projektstand](./projekt-stand.md).

## 1. Collection-Matrix

### Legende

Die Collection-Matrix zeigt, welche Aktionen eine Benutzerrolle grundsätzlich auf einer Firestore-Collection ausführen darf.

| Wert | Bedeutung            |
| ---- | -------------------- |
| `R`  | Dokumente lesen      |
| `C`  | Dokumente anlegen    |
| `U`  | Dokumente bearbeiten |
| `D`  | Dokumente löschen    |
| `–`  | kein Zugriff         |

### Matrix

Die Pfadkürzel bauen aufeinander auf:

- `{firmaPfad}` = `unternehmer/{unternehmerId}/firma/{firmaId}`
- `{filialPfad}` = `{firmaPfad}/filiale/{filialId}`
- `{mitarbeiterPfad}` = `{firmaPfad}/mitarbeiter/{mitarbeiterId}`

| Collection                                                                | `master` | `office` | `filiale` | `mitarbeiter` | Legacy-Konto |
| ------------------------------------------------------------------------- | -------- | -------- | --------- | ------------- | ------------ |
| `benutzerprofil/{uid}`                                                    | R/C/U    | R        | R         | R             | –            |
| `benutzerprofil/{uid}/{subcollection}/{document=**}`                      | R/C/U/D  | –        | –         | –             | –            |
| `unternehmer/{unternehmerId}`                                             | R/C/U/D  | R        | R         | R             | –            |
| `{firmaPfad}`                                                             | R/C/U/D  | R/U      | R         | R             | –            |
| `{mitarbeiterPfad}`                                                       | R/C/U/D  | R/C/U    | R/C/U     | R             | –            |
| `{filialPfad}`                                                            | R/C/U/D  | R/U      | R         | R             | –            |
| `{filialPfad}/dienstplan/{monat}`                                         | R/C/U    | R/C/U    | R/C/U     | R             | –            |
| `{filialPfad}/dienstplan/{monat}/version/{versionId}`                     | R/C/U/D  | R/C/U/D  | R/C/U/D   | R             | –            |
| `{filialPfad}/dienstplan/{monat}/version/{versionId}/schicht/{schichtId}` | R/C/U/D  | R/C/U/D  | R/C/U/D   | R             | –            |
| `purCustomers/{document=**}`                                              | R        | –        | –         | –             | R/C/U/D      |
| `purUser/{document=**}`                                                   | –        | –        | –         | –             | R/C/U/D      |

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
- Die frühere rekursive Filialregel ist entfernt. Filial-Untercollections benötigen konkrete Rules; Dienstplan, Version und
  Schicht sind einzeln geregelt und verwenden gemeinsame Hilfsfunktionen.
- Dienstplandokumente werden nicht gelöscht. Master, Office und Filiale lesen innerhalb ihres erlaubten Filialkontexts alle
  Versionsstände. Neue Versionen werden nur als Entwurf angelegt; nie veröffentlichte Entwürfe und deren Schichten dürfen
  bearbeitet und gelöscht werden. Veröffentlichte Versionen dürfen nur bei einer neuen Veröffentlichung atomar archiviert
  werden; archivierte Versionen sowie veröffentlichte und archivierte Schichten bleiben unveränderlich.
- `mitarbeiter` liest den zugeordneten Unternehmer sowie die direkte Firmenstruktur mit Firma, Filialen und fachlichen
  Mitarbeitern. Von Dienstplänen zugeordneter Filialen liest er nur die aktuelle veröffentlichte Version und deren Schichten;
  andere Filial-Untercollections und alle Schreibzugriffe bleiben gesperrt. Der Client lädt beim Sitzungsstart nur die über den
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
