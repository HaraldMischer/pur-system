<!-- pur-system/docs/berechtigungs-matrizen.md -->

# Berechtigungsmatrizen

Dieses Dokument bietet einen schnellen Überblick über die zentralen Berechtigungen der Anwendung. Es wird gemeinsam mit der
Anwendung erweitert, sobald neue Rollen, App-Bereiche, Collections oder fachliche Zugriffsbedingungen hinzukommen.

Die vollständigen fachlichen Bedingungen und Sonderfälle stehen im [Projektplan](./projekt-plan.md). Der aktuelle
Implementierungs-, Test- und Deploymentstand steht im [Projektstand](./projekt-stand.md).

## 1. Collection-Matrix

Die Collection-Matrix zeigt, welche Aktionen eine Benutzerrolle grundsätzlich auf einer Firestore-Collection ausführen darf.
Alle Berechtigungen setzen ein aktives Benutzerprofil voraus. Die im Benutzerprofil hinterlegten `zugriffe` begrenzen erlaubte
Aktionen zusätzlich auf die zugeordneten Unternehmer, Firmen und Filialen.

### Legende

| Wert    | Bedeutung                           |
| ------- | ----------------------------------- |
| `R`     | Dokumente lesen                     |
| `C`     | Dokumente anlegen                   |
| `U`     | Dokumente bearbeiten                |
| `D`     | Dokumente löschen                   |
| `eigen` | ausschließlich der eigene Datensatz |
| `–`     | kein Zugriff                        |

| Collection                                                                | `master` | `office`  | `filiale` | `mitarbeiter` |
| ------------------------------------------------------------------------- | -------- | --------- | --------- | ------------- |
| `benutzerprofil/{uid}`                                                    | R/C/U    | R `eigen` | R `eigen` | R `eigen`     |
| `unternehmer/{unternehmerId}`                                             | R/C/U    | R         | R         | –             |
| `unternehmer/{unternehmerId}/firma/{firmaId}`                             | R/C/U    | R/U       | R         | –             |
| `unternehmer/{unternehmerId}/firma/{firmaId}/filiale/{filialId}`          | R/C/U    | R/U       | R         | –             |
| `unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiter/{mitarbeiterId}` | –        | R/C/U     | R/C/U     | R `eigen`     |

### Wichtige Zusatzbedingungen

- Neue Pur-System-Collections erlauben derzeit kein Löschen. Fachliche Datensätze werden stattdessen deaktiviert.
- `office` darf nur Daten innerhalb der zugewiesenen Unternehmer, Firmen und Filialen verwenden.
- `filiale` ist genau einer Firma und einer Filiale zugeordnet. Der Zugriff bleibt auf diesen Datenraum begrenzt.
- `mitarbeiter` darf ausschließlich den über das eigene Profil referenzierten fachlichen Mitarbeiterdatensatz lesen.
- `master` verwaltet Systemstruktur und Benutzerprofile, aber keine fachlichen Mitarbeiterdatensätze.

## 2. App-Bereich-Matrix

Die App-Bereich-Matrix zeigt, welche Benutzerrolle einen App-Bereich grundsätzlich verwenden darf. `true` bedeutet nicht
automatisch, dass jedes Konto dieser Rolle Zugriff besitzt: Das Profil muss aktiv sein und der Bereich muss dem Konto zugewiesen
sein. Die nach der Matrix aufgeführten Pflichtbereiche und Zusatzbedingungen gelten ebenfalls.

| `TUserRole` \ `TAppBereich` | `dashboard` | `schichtplan` | `mitarbeiter` | `verwaltung` | `systemverwaltung` |
| --------------------------- | ----------- | ------------- | ------------- | ------------ | ------------------ |
| `master`                    | true        | true          | false         | true         | true               |
| `office`                    | true        | true          | true          | true         | false              |
| `filiale`                   | true        | true          | true          | false        | false              |
| `mitarbeiter`               | true        | true          | false         | false        | false              |

### Zuweisung und Zusatzbedingungen

- `dashboard` ist für jede Rolle verpflichtend und wird automatisch zugewiesen.
- `systemverwaltung` ist ausschließlich für `master` erlaubt, verpflichtend und wird automatisch zugewiesen.
- `schichtplan`, `mitarbeiter` und `verwaltung` sind bei einem `true` optional zuweisbar.
- `mitarbeiter` erfordert für `office` und `filiale` zusätzlich mindestens einen gültigen Firmen- und Filialzugriff.
- Die Auth-Rolle `mitarbeiter` erhält über den gleichnamigen App-Bereich keinen Zugriff auf die Mitarbeiterverwaltung.
- `verwaltung` ist ausschließlich für `office` und `master` verwendbar.
- Ein `false` darf weder als sichtbarer Navigationspunkt noch über einen direkten Routenaufruf Zugriff gewähren.
