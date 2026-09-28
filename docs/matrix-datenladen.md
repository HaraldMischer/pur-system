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

## 3. Initialisierungsstatus-Matrix

| Status    | Bedeutung                                                               |
| --------- | ----------------------------------------------------------------------- |
| `idle`    | Keine aktive Benutzersitzung oder Initialisierung noch nicht gestartet. |
| `loading` | Benutzerprofil oder zwingende Stammdaten werden geladen.                |
| `ready`   | Alle zwingenden Daten wurden erfolgreich geladen.                       |
| `error`   | Ein zwingender Ladevorgang ist fehlgeschlagen.                          |

### Zusatzbedingungen

- Geschützte Navigation wird erst bei `ready` freigegeben; bei `error` werden Wiederholung und Abmeldung angeboten.
- Änderungen an Rolle, Zugriffen oder Mitarbeiterzuordnung erzeugen einen neuen Ladeplan.
- Abmeldung und Benutzerwechsel setzen Sitzungsdaten und laufende Ladeaufträge zurück.
