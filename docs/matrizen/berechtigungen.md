<!-- pur-system/docs/matrizen/berechtigungen.md -->

# Matrix: Berechtigungen

Diese Übersicht zeigt die zentralen Datenrechte und App-Bereichsfreigaben. Übergreifende fachliche Bedingungen und Sonderfälle
stehen im [Projektplan](../projekt-plan.md); die Regeln der Dienst- und Schichtplanung beschreibt das zugehörige
[Fachkonzept](../fachkonzepte/dienst-und-schichtplanung.md). Der aktuelle Implementierungs-, Test- und Deploymentstand steht im
[Projektstand](../projekt-stand.md).

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
| `benutzerprofil/{uid}`                                                    | R/C/U/D  | R        | R         | R             | –            |
| `benutzerprofil/{uid}/{subcollection}/{document=**}`                      | R/C/U/D  | –        | –         | –             | –            |
| `unternehmer/{unternehmerId}`                                             | R/C/U/D  | R        | R         | R             | –            |
| `{firmaPfad}`                                                             | R/C/U/D  | R        | R         | R             | –            |
| `{mitarbeiterPfad}`                                                       | R/C/U/D  | R/C/U    | R/C/U     | R             | –            |
| `{filialPfad}`                                                            | R/C/U/D  | R        | R         | R             | –            |
| `{filialPfad}/einstellung/{dokumentId}`                                   | R/C/U    | R/C/U    | R/C/U     | –             | –            |
| `{filialPfad}/einstellung/oeffnungszeiten/sondertag/{sondertagId}`        | R/C/U/D  | R/C/U/D  | R/C/U/D   | –             | –            |
| `{filialPfad}/einstellung/oeffnungszeiten/ausnahme/{datum}`               | R/C/U/D  | R/C/U/D  | R/C/U/D   | –             | –            |
| `{filialPfad}/schichtmodell/{schichtmodellId}`                            | R/C/U    | R/C/U    | R/C/U     | –             | –            |
| `{filialPfad}/schichtmodell/{schichtmodellId}/modellschicht/{id}`         | R/C/U/D  | R/C/U/D  | R/C/U/D   | –             | –            |
| `{filialPfad}/dienstplan/{monat}`                                         | R/C/U/D  | R/C/U/D  | R/C/U/D   | R             | –            |
| `{filialPfad}/dienstplan/{monat}/modellschicht/{modellschichtId}`         | R/C/D    | R/C/D    | R/C/D     | R             | –            |
| `{filialPfad}/dienstplan/{monat}/version/{versionId}`                     | R/C/U/D  | R/C/U/D  | R/C/U/D   | R             | –            |
| `{filialPfad}/dienstplan/{monat}/version/{versionId}/schicht/{schichtId}` | R/C/U/D  | R/C/U/D  | R/C/U/D   | R             | –            |
| `systemMigrationen/{purCustomerId}`                                       | R/C/U    | –        | –         | –             | –            |
| `systemMigrationen/{purCustomerId}/datenbereiche/{datenbereichId}`        | R/C/U    | –        | –         | –             | –            |
| `purCustomers/{document=**}`                                              | R        | –        | –         | –             | R/C/U/D      |
| `purUser/{document=**}`                                                   | –        | –        | –         | –             | R/C/U/D      |

### Zusatzbedingungen

#### Übergreifende Grundregel

Bei jedem Datenzugriff gelten grundsätzlich diese vier Prüfungen:

1. Das Benutzerprofil ist aktiv.
2. Die Benutzerrolle ist für den Datenpfad berechtigt.
3. Der Datenpfad liegt innerhalb der im Benutzerprofil hinterlegten `zugriffe`.
4. Die Collection-Matrix erlaubt der Benutzerrolle die konkrete CRUD-Aktion.

Was nicht in der Collection-Matrix erlaubt ist, bleibt gesperrt.

#### Fachliche Validierung

Die Firestore Rules prüfen keine Feldinhalte, Dokument-IDs, Referenzen oder Statuswechsel. Diese fachlichen Prüfungen übernimmt
der TypeScript-Code.

#### Technische Durchsetzung

- Greift das Frontend direkt auf Firestore zu, erzwingen die Firestore Rules die vier Prüfungen.
- Greift eine Cloud Function auf Firestore zu, werden die Firestore Rules technisch umgangen. Deshalb muss die Cloud Function die
  erforderlichen Berechtigungen selbst prüfen.
- Ausnahmen von den vier Grundprüfungen werden in den folgenden Bereichen ausdrücklich beschrieben.

#### Benutzerprofile und Zugang

- Das eigene Profil bleibt als ausdrückliche Ausnahme auch bei inaktivem Profil lesbar.
- Benutzerprofile werden durch Cloud Functions angelegt, bearbeitet und gelöscht. Clientseitig sind sie nur lesbar.

#### System und Unternehmensstruktur

- `master` ist als ausdrückliche Ausnahme nicht durch `zugriffe` begrenzt.
- Strukturdatensätze werden nur durch die Cloud Function rekursiv gelöscht; vorhandene Referenzen verhindern das Löschen.
- Firmen- und Filialstammdaten dürfen ausschließlich von `master` angelegt oder bearbeitet werden. Für `office`, `filiale` und
  `mitarbeiter` sind diese Dokumente rein lesbar.
- `filiale` ist genau einem Unternehmer, einer Firma und einer Filiale zugeordnet.

#### Mitarbeiter

- `office` und `filiale` besitzen innerhalb zugewiesener Firmen die in der Matrix aufgeführten Rechte. Das Filial-Frontend lädt
  und bearbeitet über `filialIds` ausschließlich Mitarbeiter der eigenen Filiale; Feldinhalte und Filialzuordnungen validiert
  der TypeScript-Code.
- Der Aktivstatus eines fachlichen Mitarbeiters schränkt diese Lese- und Bearbeitungsrechte nicht ein. `aktiv: false` beschreibt
  einen inaktiven Beschäftigungsstatus; berechtigte Rollen können den Mitarbeiter später wieder aktivieren.
- Die betrieblichen Mitarbeiterrollen `filialkasse`, `servicekraft`, `administrator`, `kassierer`, `techniker` und
  `dienstplaner` werden als Array `rollen` gespeichert. Sie beschreiben Tätigkeiten und gewähren unabhängig von `TUserRole`
  keine eigenen Firestore-Datenrechte.
- Nur Master dürfen Dubletten zusammenführen. Dabei wird das nicht mit einem Benutzerkonto verknüpfte Duplikat physisch
  gelöscht; eine eigenständige Löschaktion wird in der Mitarbeiteroberfläche nicht angeboten.
- Mit einem Benutzerkonto verknüpfte Mitarbeiter dürfen weder gelöscht noch zusammengeführt werden.

#### Einstellungen

- `erlaubteBereiche` beeinflusst grundsätzlich keine Datenrechte. Filialeinstellungen bilden eine ausdrückliche Ausnahme:
  Office- und Filialkonten benötigen zusätzlich den Bereich `einstellungen`; Masterkonten bleiben rollenbedingt berechtigt.

#### Schichtplan

- `dienstplaner` steuert ausschließlich im Filial-Frontend, ob ein aktiver Firma-Mitarbeiter der eigenen Filiale die dort für
  das Filialkonto erlaubten Planungsaktionen bedienen darf.
- Die fachliche Steuerung von Entwürfen, Veröffentlichungen, Archivierungen, Revisionen, Referenzen und Löschvorgängen erfolgt
  ausschließlich im TypeScript-Code. Die Rules prüfen dafür keine Felder oder Zustandswechsel.
- `mitarbeiter` liest entsprechend der Matrix alle Dienstplanpfade einer zugeordneten Filiale und erhält keine Schreibrechte.
  Weil Mitarbeiterprofile keine direkten Filialzugriffe enthalten, wird die Filialzuordnung als ausdrückliche Ausnahme über den
  aktiven verknüpften Mitarbeiter und dessen `filialIds` bestimmt. Welche Planstände die Oberfläche lädt und anzeigt, steuert
  das Frontend.
- Schichtmodelle selbst besitzen gemäß Matrix kein Löschrecht. Modellschicht-Momentaufnahmen eines Dienstplans besitzen kein
  Aktualisierungsrecht. Diese Einschränkungen sind Pfad-/CRUD-Rechte und keine fachliche Feldvalidierung.

#### Datenmigration und Legacy-Konten

- `master` liest `purCustomers` und dessen Untercollections ausschließlich für die Datenmigration; Schreibzugriffe bleiben
  gesperrt.
- Legacy-Konten sind als ausdrückliche Ausnahme authentifizierte Konten ohne `benutzerprofil` und greifen ausschließlich auf
  `purCustomers` und `purUser` einschließlich ihrer Untercollections zu.



## 2. App-Bereich-Matrix

### Legende

Die App-Bereich-Matrix zeigt, welche Benutzerrolle einen App-Bereich grundsätzlich verwenden darf.

| Wert            | Bedeutung                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------- |
| `verpflichtend` | Wird der Rolle bei der Benutzeranlage durch die Cloud Function automatisch zugewiesen.        |
| `optional`      | Wird der Rolle im Client bei der Benutzeranlage und beim Bearbeiten als Checkbox angeboten.   |
| `verboten`      | Darf der Rolle im Client weder bei der Benutzeranlage noch beim Bearbeiten zugewiesen werden. |

### Matrix

| `TUserRole` \ `TAppBereich` | `dashboard`     | `schichtplan` | `mitarbeiter` | `einstellungen` | `system`        |
| --------------------------- | --------------- | ------------- | ------------- | --------------- | --------------- |
| `master`                    | `verpflichtend` | `optional`    | `optional`    | `optional`      | `verpflichtend` |
| `office`                    | `verpflichtend` | `optional`    | `optional`    | `optional`      | `verboten`      |
| `filiale`                   | `verpflichtend` | `optional`    | `optional`    | `optional`      | `verboten`      |
| `mitarbeiter`               | `verpflichtend` | `optional`    | `verboten`    | `verboten`      | `verboten`      |

### Zusatzbedingungen

#### Übergreifende Regeln

- Die Cloud Function ergänzt `verpflichtend` bei der Benutzeranlage; beim Bearbeiten erhält der Client diese Bereiche.
- `optional` und `verboten` werden durch die rollenabhängigen Checkboxen im Client umgesetzt.
- `erlaubteBereiche` steuert Navigation, Routenzugriff und sichtbare App-Funktionen.

#### Mitarbeiter

- `mitarbeiter` erfordert für `office` und `filiale` zusätzlich mindestens einen gültigen Firmen- und Filialzugriff.

#### Einstellungen

- Nur bei Filialeinstellungen prüfen die Rules für Office- und Filialkonten zusätzlich den Bereich `einstellungen`; für Master
  genügt die Rolle.
