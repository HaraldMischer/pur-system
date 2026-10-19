<!-- pur-system/docs/architektur/stores/filialeinstellung-store.md -->

# FilialeinstellungStore

Der `FilialeinstellungStore` hält Filialeinstellungen getrennt nach vollständigem Filialpfad. Der interne Kontextschlüssel setzt
sich aus Unternehmer-, Firmen- und Filial-ID zusammen. Dadurch können mehrere ausgewählte Filialen gleichzeitig geladen und
bearbeitet werden, ohne Lade-, Fehler- oder Schreibzustände miteinander zu vermischen.

## Kontextzustand

Jeder Filialkontext enthält die unveränderten Firestore-Rohdaten unter `rohdaten`, den fachlich validierten Einstellungsbestand
unter `bestand` sowie `download`, `isLoaded`, `inProgress` und `error`. `error` unterscheidet eine sichtbare Meldung von der
konkreten fachlichen oder technischen Ursache. Gleichzeitige identische Ladeaufträge werden zusammengeführt. Generationen
verhindern, dass verspätete Ergebnisse nach einem Sitzungsreset erneut in den Store geschrieben werden.

Beim Laden schreibt und protokolliert der Store zuerst die empfangenen Rohdaten. Anschließend validiert und überführt der
`FilialeinstellungService` sie in den fachlichen Bestand. Dadurch bleibt erkennbar, ob keine Daten empfangen wurden oder ob
empfangene Daten fachlich ungültig sind. In diesem Fall bleiben die Rohdaten im Store und die Oberfläche zeigt sowohl den
Ladeausgang als auch die konkrete Ursache an.

## Öffentliche Aktionen

Der Store stellt Aktionen für folgende Abläufe bereit:

- vollständigen Filialbestand laden und einen leeren Bestand initialisieren,
- allgemeine Einstellungen und Wochenregeln speichern,
- eigene Sondertage anlegen, bearbeiten und löschen,
- Aktivstatus und Öffnungsregel systemdefinierter Sondertage bearbeiten,
- Datumsausnahmen anlegen, bearbeiten und löschen,
- Fehler eines Filialkontexts zurücksetzen und sitzungsbezogene Bestände vollständig verwerfen.

Während eines Schreibvorgangs ist ausschließlich der betroffene Filialkontext mit `inProgress` gesperrt. Erfolgreiche Ergebnisse
werden sortiert in den lokalen Bestand übernommen; Fehler bleiben im Kontext für die Oberfläche verfügbar.

## Datumsauflösung

`resolveOeffnungsregelFuerDatum` verwendet den geladenen Bestand und die zentrale Auflösungsfunktion. Die Priorität lautet
`Ausnahme → Sondertag → Wochentag`. Mehrere passende aktive Sondertage ohne überschreibende Ausnahme werden nicht willkürlich
sortiert, sondern als Konfigurationsfehler gemeldet. Über Mitternacht reichende Öffnungszeiten bleiben vollständig ihrem
Startdatum zugeordnet.

Der Store registriert eine nicht reaktiv verfolgte Momentaufnahme beim `StoreSnapshotService`, damit Kontexte einschließlich
Rohdaten, validiertem Bestand und Fehlerzustand in der vorhandenen Diagnoseausgabe sichtbar bleiben.
