<!-- pur-system/docs/matrix-datenladen.md -->

# Matrix: Datenladen

Diese Übersicht zeigt die Verantwortlichkeiten, den benutzerabhängigen Ladeumfang und die Zustände des Sitzungsstarts.
Architektur und Datenfluss stehen im [Projektplan](./projekt-plan.md).

## 1. Verantwortungsmatrix

| Baustein                      | Verantwortung                                                               |
| ----------------------------- | --------------------------------------------------------------------------- |
| `BenutzerStore`               | Beobachtet Firebase Auth und das eigene Benutzerprofil in Echtzeit.         |
| `AppInitialisierungService`   | Koordiniert den Sitzungsstart und stellt den Initialisierungsstatus bereit. |
| `StammdatenLadeservice`       | Bestimmt anhand von Rolle und Zugriffen den zwingenden Ladeumfang.          |
| Fachliche Stores und Services | Laden, prüfen und halten konkrete Domänendaten.                             |
| Guards und App-Shell          | Steuern Navigation und zeigen Lade- oder Fehlerzustände.                    |
| `FirestoreDbService`          | Führt technische Firestore-Abfragen mit der vorgegebenen Lesestrategie aus. |

### Zusatzbedingungen

- Der `FirestoreDbService` kennt keine Benutzerrollen, fachlichen Berechtigungen oder App-Bereiche.
- Guards und App-Shell führen keine eigenen fachlichen Firestore-Abfragen aus.

## 2. Ladeumfang-Matrix

| Rolle         | Unternehmer | Firmen     | Filialen   | Benutzerprofile | Mitarbeiter        |
| ------------- | ----------- | ---------- | ---------- | --------------- | ------------------ |
| `master`      | alle        | alle       | alle       | alle            | alle Firmen        |
| `office`      | zugeordnet  | zugeordnet | zugeordnet | –               | zugeordnete Firmen |
| `filiale`     | genau einer | genau eine | genau eine | –               | eigene Filial-ID   |
| `mitarbeiter` | genau einer | genau eine | –          | –               | zugeordnete Firma  |

### Zusatzbedingungen

- Bei `filiale` werden nur Mitarbeiter geladen, deren `filialIds` die eigene Filial-ID enthält.
- Feature-Daten gehören nicht zum zwingenden Ladeplan und werden erst beim Öffnen des jeweiligen App-Bereichs geladen.

## 3. Fachliche Einordnung

| Daten                          | Einordnung                                                |
| ------------------------------ | --------------------------------------------------------- |
| Benutzerprofile                | Systemweite Stammdaten für den `master`                   |
| Unternehmer, Firmen, Filialen  | Hierarchische Unternehmensstruktur                        |
| Mitarbeiter                    | Firmenbezogene Stammdaten mit möglichen Filialzuordnungen |
| Spätere dauerhafte Filialdaten | Filialbezogene Stammdaten                                 |

### Zusatzbedingungen

- Das eigene Benutzerprofil wird vor dem Stammdaten-Ladeplan beobachtet und gehört nicht zu den Systemstammdaten.
- Mitarbeiter sind Firmenstammdaten, weil sie unter einer Firma gespeichert und mehreren Filialen zugeordnet sein können.
- Konkrete Schichten, Dienstpläne und andere Vorgangsdaten sind Feature-Daten und keine Filialstammdaten.

## 4. Ausführung und Ladeprotokoll

- Beim `master` wird zuerst die vollständige Unternehmensstruktur einschließlich der Benutzerprofile geladen. Erst danach
  ermittelt der `StammdatenLadeservice` aus den geladenen Firmen die erforderlichen Mitarbeiteraufträge und führt diese parallel
  aus.
- Bei `office`, `filiale` und `mitarbeiter` stehen die Mitarbeiteraufträge bereits aus den Profilzugriffen fest. Deshalb werden
  die Unternehmensstruktur und die Mitarbeiter parallel geladen.
- Parallele Aufträge werden vollständig abgewartet. Ist mindestens ein zwingender Auftrag fehlgeschlagen, wird der Ladeplan als
  Fehler beendet und es wird kein erfolgreiches Ladeergebnis protokolliert.
- Nach erfolgreichem Abschluss protokolliert der `StammdatenLadeservice` ausschließlich die Anzahl der geladenen Einträge. Die
  Reihenfolge ist unabhängig von der tatsächlichen Abschlussreihenfolge fest: Benutzerprofile, Unternehmer, Firmen, Filialen
  und Mitarbeiter. Nicht benötigte Datenarten werden ausgelassen.
- Mitarbeiterzeilen werden nach Unternehmer und Firma sortiert. Die Abschlussmeldung wird erst nach dem vollständigen Ladeplan
  ausgegeben.
- Die Dateninhalte werden nicht an die einzelnen Ladezeilen angehängt. Im Entwicklungsmodus können sie bei Bedarf über den
  Store-Snapshot-Button der Toolbar ausgegeben werden.

## 5. Initialisierungsstatus-Matrix

| Status    | Bedeutung                                                               |
| --------- | ----------------------------------------------------------------------- |
| `idle`    | Keine aktive Benutzersitzung oder Initialisierung noch nicht gestartet. |
| `loading` | Benutzerprofil oder zwingende Stammdaten werden geladen.                |
| `ready`   | Alle zwingenden Daten wurden erfolgreich geladen.                       |
| `error`   | Ein zwingender Ladevorgang ist fehlgeschlagen.                          |

### Zusatzbedingungen

- Geschützte Navigation wird erst bei `ready` freigegeben; bei `error` werden Wiederholung und Abmeldung angeboten.
- Änderungen an Rolle, Zugriffen oder Mitarbeiterzuordnung erzeugen einen neuen Ladeplan.
- Abmeldung und Benutzerwechsel setzen die sitzungsbezogenen Stores zurück und machen den bisherigen Initialisierungskontext
  ungültig. Bereits laufende Firestore-Anfragen werden nicht technisch abgebrochen; verspätete Ergebnisse eines veralteten
  Store-Kontexts werden nicht übernommen.
