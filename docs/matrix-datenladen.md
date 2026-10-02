<!-- pur-system/docs/matrix-datenladen.md -->

# Matrix: Datenladen

Diese Übersicht zeigt die Verantwortlichkeiten, den benutzerabhängigen Ladeumfang und die Zustände des Sitzungsstarts.
Architektur und Datenfluss stehen im [Projektplan](./projekt-plan.md).

## 1. Verantwortungsmatrix

| Baustein                      | Verantwortung                                                               |
| ----------------------------- | --------------------------------------------------------------------------- |
| `BenutzerStore`               | Beobachtet Firebase Auth und das eigene Benutzerprofil in Echtzeit.         |
| `AppSitzungsInitService`      | Koordiniert den Sitzungsstart und stellt den Initialisierungsstatus bereit. |
| `AppDatenInitService`         | Bestimmt anhand von Rolle und Zugriffen den zwingenden Ladeumfang.          |
| Fachliche Stores und Services | Laden, prüfen und halten konkrete Domänendaten.                             |
| Guards und App-Shell          | Steuern Navigation und zeigen Lade- oder Fehlerzustände.                    |
| `FirestoreDbService`          | Führt technische Firestore-Abfragen mit der vorgegebenen Lesestrategie aus. |

### Zusatzbedingungen

- Der `FirestoreDbService` kennt keine Benutzerrollen, fachlichen Berechtigungen oder App-Bereiche.
- Guards und App-Shell führen keine eigenen fachlichen Firestore-Abfragen aus.

## 2. Ladeumfang-Matrix

| Benutzerrolle | Unternehmer | Firmen     | Filialen             | Benutzerprofile | Geladene Mitarbeiter                  |
| ------------- | ----------- | ---------- | -------------------- | --------------- | ------------------------------------- |
| `master`      | alle        | alle       | alle                 | alle            | Mitarbeiter aller Firmen              |
| `office`      | zugeordnet  | zugeordnet | zugeordnet           | –               | Mitarbeiter der zugeordneten Firmen   |
| `filiale`     | genau einer | genau eine | genau eine           | –               | Mitarbeiter der zugeordneten Filiale  |
| `mitarbeiter` | genau einer | genau eine | zugeordnete Filialen | –               | Mitarbeiter der zugeordneten Filialen |

### Zusatzbedingungen

- Bei `filiale` werden nur Mitarbeiter geladen, deren `filialIds` die dem Profil zugeordnete Filial-ID enthalten.
- Bei `mitarbeiter` werden die zugeordneten Filialen aus den `filialIds` des über `firmaMitarbeiterId` verknüpften
  Mitarbeiterdokuments bestimmt.
- Feature-Daten gehören nicht zum zwingenden Ladeumfang und werden erst beim Öffnen des jeweiligen App-Bereichs geladen.

## 3. Fachliche Einordnung

| Daten                          | Einordnung                                                |
| ------------------------------ | --------------------------------------------------------- |
| Benutzerprofile                | Systemweite Stammdaten für den `master`                   |
| Unternehmer, Firmen, Filialen  | Hierarchische Unternehmensstruktur                        |
| Mitarbeiter                    | Firmenbezogene Stammdaten mit möglichen Filialzuordnungen |
| Spätere dauerhafte Filialdaten | Filialbezogene Stammdaten                                 |

### Zusatzbedingungen

- Das eigene Benutzerprofil wird vor der Stammdateninitialisierung beobachtet und gehört nicht zu den Systemstammdaten.
- Mitarbeiter sind Firmenstammdaten, weil sie unter einer Firma gespeichert und mehreren Filialen zugeordnet sein können.
- Konkrete Schichten, Dienstpläne und andere Vorgangsdaten sind Feature-Daten und keine Filialstammdaten.

## 4. Ausführung und Ladeprotokoll

- Beim `master` wird zuerst die vollständige Unternehmensstruktur einschließlich der Benutzerprofile geladen. Erst danach
  ermittelt der `AppDatenInitService` aus den geladenen Firmen die erforderlichen Mitarbeiteraufträge und führt diese parallel
  aus.
- Bei `office` werden zuerst die zugeordneten Strukturdaten und danach die Mitarbeiter der freigegebenen Firmen geladen.
- Bei `filiale` werden zuerst der zugeordnete Unternehmer, die Firma und die Filiale und danach die Mitarbeiter dieser Filiale
  geladen.
- Bei `mitarbeiter` werden zuerst der zugeordnete Unternehmer und die Firma geladen. Anschließend wird der eigene aktive
  Mitarbeiter gezielt über `firmaMitarbeiterId` geladen. Aus dessen `filialIds` werden zuerst die zugeordneten Filialen und
  danach deren Mitarbeiter mit einer gemeinsamen `array-contains-any`-Abfrage eindeutig geladen.
- Innerhalb eines Schritts parallel gestartete Aufträge werden vollständig abgewartet. Ist mindestens ein zwingender Auftrag
  fehlgeschlagen, wird die Initialisierung mit einem Fehler beendet und es wird kein erfolgreiches Ladeergebnis protokolliert.
- Nach erfolgreichem Abschluss protokolliert der `AppDatenInitService` ausschließlich die Anzahl der geladenen Einträge. Die
  Reihenfolge ist unabhängig von der tatsächlichen Abschlussreihenfolge fest: Benutzerprofile, Unternehmer, Firmen, Filialen
  und Mitarbeiter. Nicht benötigte Datenarten werden ausgelassen.
- Mitarbeiterzeilen werden nach Unternehmer und Firma sortiert. Die Abschlussmeldung wird erst nach der vollständigen
  Initialisierung ausgegeben.
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
- Änderungen an Rolle, Zugriffen oder Mitarbeiterzuordnung starten eine neue Initialisierung für den veränderten Kontext.
- Abmeldung und Benutzerwechsel setzen die sitzungsbezogenen Stores zurück und machen den bisherigen Initialisierungskontext
  ungültig. Bereits laufende Firestore-Anfragen werden nicht technisch abgebrochen; verspätete Ergebnisse eines veralteten
  Store-Kontexts werden nicht übernommen.
