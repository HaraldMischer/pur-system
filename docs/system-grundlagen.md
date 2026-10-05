<!-- pur-system/docs/system-grundlagen.md -->

# Systemgrundlagen

## Zweck

Pur-System verwaltet Unternehmer, Firmen, Filialen, Mitarbeiter und die dazugehörigen Benutzerzugänge. Bereits vorhandene und
neu angelegte Strukturdaten werden gleich behandelt. Welche Daten ein Benutzer verwenden darf, ergibt sich aus seiner Auth-Rolle
und den im Benutzerprofil gespeicherten Datenzugriffen.

## Unternehmensstruktur

```text
unternehmer/{unternehmerId}
└── firma/{firmaId}
    ├── filiale/{filialId}
    └── mitarbeiter/{mitarbeiterId}
```

- Ein Unternehmer besitzt eine oder mehrere Firmen.
- Eine Firma besitzt Filialen und Mitarbeiter.
- Ein Mitarbeiter gehört zu genau einer Firma.
- `filialIds` ordnet einen Mitarbeiter einer oder mehreren Filialen seiner Firma zu.

## Benutzer und Mitarbeiter

Ein Benutzer ist ein Firebase-Auth-Konto mit einem Profil unter `benutzerprofil/{uid}`. Ein Mitarbeiter ist dagegen ein
fachlicher Datensatz innerhalb einer Firma. Die Auth-Rolle `mitarbeiter` und die betrieblichen Rollen eines Mitarbeiters sind
deshalb voneinander getrennt.

Betriebliche Mitarbeiterrollen werden im Array `rollen` gespeichert. Vorgesehen sind:

- `filialkasse`
- `servicekraft`
- `administrator`
- `kassierer`
- `techniker`

Diese Rollen beschreiben Tätigkeiten im Betrieb und gewähren keine App- oder Firestore-Berechtigungen.

## Benutzerrollen

| Auth-Rolle    | Aufgabe                                      | Datenzuordnung                                              |
| ------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `master`      | Zentrale System- und Benutzerverwaltung      | Keine Zuordnung erforderlich                                |
| `office`      | Verwaltung freigegebener Firmen und Filialen | Ein oder mehrere Unternehmer, Firmen und Filialen           |
| `filiale`     | Arbeit innerhalb einer Filiale               | Genau ein Unternehmer, eine Firma und eine Filiale          |
| `mitarbeiter` | Persönlicher Zugang eines Mitarbeiters       | Genau ein Unternehmer, eine Firma und ein Firmenmitarbeiter |

## Datenzugriffe

Das Benutzerprofil speichert Datenzugriffe als verschachtelte Map:

```ts
zugriffe: {
  "unternehmer-id": {
    "firma-id": ["filiale-id-1", "filiale-id-2"]
  }
}
```

Die Schlüssel entsprechen den Firestore-Dokument-IDs der regulären Unternehmensstruktur.

- Master benötigen keine Einträge in `zugriffe`.
- Office-Konten können mehreren Firmen und Filialen zugeordnet sein.
- Filialkonten besitzen genau einen vollständigen Pfad bis zu ihrer Filiale.
- Mitarbeiterzugänge besitzen genau einen Unternehmer und eine Firma. Ihre Filialen ergeben sich aus `filialIds` des verknüpften
  Mitarbeiterdatensatzes.

## Persönlicher Mitarbeiterzugang

Ein fachlicher Mitarbeiter kann optional mit einem persönlichen Benutzerzugang verbunden werden:

```text
benutzerprofil/{uid}.firmaMitarbeiterId
                    │
                    ▼
unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiter/{mitarbeiterId}.benutzerUid
```

- `firmaMitarbeiterId` verweist vom Benutzerprofil auf den Mitarbeiter.
- `benutzerUid` ist die Gegenreferenz im Mitarbeiterdokument.
- Die Verbindung wird serverseitig und atomar hergestellt.
- Ein Mitarbeiter kann nur mit einem Benutzerzugang verbunden sein.
- Ein Mitarbeiterdatensatz kann auch ohne persönlichen Benutzerzugang bestehen.
- Verknüpfte Mitarbeiter dürfen nicht gelöscht oder mit einem anderen Mitarbeiter zusammengeführt werden.

## Regulärer Ablauf

1. Ein Master legt Unternehmer, Firmen und Filialen an.
2. Berechtigte Benutzer legen Mitarbeiter innerhalb einer Firma an und ordnen ihnen Filialen sowie betriebliche Rollen zu.
3. Ein Master legt Benutzerkonten an.
4. In der Benutzerverwaltung werden die Benutzer abhängig von ihrer Auth-Rolle den erlaubten Datenpfaden zugeordnet.
5. Ein Mitarbeiterzugang wird zusätzlich mit einem fachlichen Firmenmitarbeiter verbunden.
6. Vorhandene Benutzerprofile können später in der Benutzerverwaltung angepasst werden.

## Anmeldung und Datenladen

Firebase Auth stellt die Identität fest. Das Benutzerprofil bestimmt anschließend Auth-Rolle, Aktivstatus, sichtbare
App-Bereiche und Datenzugriffe. Beim Sitzungsstart werden nur die für diese Rolle und Zuordnung erforderlichen Daten geladen.

`erlaubteBereiche` steuert die sichtbaren und erreichbaren App-Funktionen. Die tatsächlichen Datenrechte ergeben sich dagegen aus
Auth-Rolle, `zugriffe`, fachlichem Kontext und den Firestore Rules.

## Sicherheitsgrundsätze

- Es gibt keine öffentliche Selbstregistrierung.
- Benutzerkonten und Benutzerprofile werden nur über die geschützte Benutzeranlage erstellt.
- Ein aktiver Master verwaltet Benutzer und die Unternehmensstruktur.
- Jede Datenaktion wird unabhängig von der sichtbaren Oberfläche durch Firestore Rules geprüft.
- Nicht ausdrücklich erlaubte Zugriffe bleiben gesperrt.
- Auth-Rollen und betriebliche Mitarbeiterrollen bleiben fachlich und technisch getrennt.

## Weiterführende Dokumente

- `docs/projekt-plan.md` beschreibt das fachliche und architektonische Zielbild.
- `docs/projekt-stand.md` beschreibt den aktuellen Umsetzungsstand.
- `docs/matrix-berechtigungen.md` enthält die detaillierten Datenrechte.
- `docs/matrix-datenladen.md` beschreibt das rollenabhängige Laden.
- `docs/matrix-cache-strategien.md` beschreibt Cache- und Netzwerkverhalten.
