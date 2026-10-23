<!-- pur-system/docs/architektur/stores/mitarbeiterbelegung-store.md -->

# Mitarbeiterbelegung-Store

Der `MitarbeiterbelegungStore` hält den live beobachteten firmenweiten Belegungsstand für die aktuelle Monatsplanung. Er ersetzt
nicht die filialbezogenen Dienstpläne und ist keine verbindliche Schreibgrundlage. Vor jedem Schicht-Schreibzugriff prüft der
`DienstplanService` die betroffenen Indexdokumente weiterhin innerhalb der Firestore-Transaktion.

## Beobachteter Umfang

Die Planung übergibt Firma, sichtbare Filialen, ausgewählten Monat und die IDs der sichtbaren aktiven Mitarbeiter. Der Store
bildet daraus ausschließlich konkrete Dokument-IDs. Neben den Kalendertagen des Monats beobachtet er je einen angrenzenden Tag,
damit Schichten mit Vor- oder Nachbereitung beziehungsweise einem Verlauf über Mitternacht an Monatsgrenzen berücksichtigt
werden.

Die Dokument-IDs werden in Gruppen von höchstens 30 IDs aufgeteilt. Jede Gruppe erhält einen eigenen
Firestore-Snapshot-Listener; einen unbeschränkten Listener auf die firmenweite Collection gibt es nicht. Initiale und spätere
Snapshots ersetzen den jeweiligen Gruppenstand unmittelbar und werden gemeinsam als `belegungstage` bereitgestellt.

Aus dem geladenen Stand leitet der Store relevante Entwurfs- und Veröffentlichungsreferenzen, blockierende Zeitkonflikte und
die Schlüssel aller betroffenen Schichten ab. Ein Entwurf ersetzt dabei für die Berechnung den veröffentlichten Stand desselben
Filialdienstplans. Anlage und Bearbeitung prüfen den gewählten Mitarbeiter frühzeitig gegen diesen Live-Stand; die
transaktionale Prüfung des Schreibservices bleibt die verbindliche Absicherung.

## Lebenszyklus und Fehlerzustand

Ändern sich Firma, Filialauswahl, Monat oder sichtbare Mitarbeitermenge, beendet die Planungsseite alle bisherigen Listener und
startet den neuen Kontext. Beim Verlassen der Seite werden die Listener ebenfalls vollständig beendet. Ein Kontext ohne
sichtbare Mitarbeiter gilt ohne Firestore-Abfrage als vollständig geladen.

Erst nach dem ersten Snapshot aller Listener ist `istVerfuegbar` wahr. Während der Initialladung oder nach einem Listenerfehler
bleiben Planerstellung, Schichtaktionen und Mitarbeiter-Drag-and-drop gesperrt. Bereits empfangene gültige Daten bleiben bei
einem Fehler für die Anzeige erhalten, gelten aber nicht mehr als zuverlässig. Die Oberfläche zeigt den Fehler und bietet einen
erneuten Ladeversuch an.

## Beteiligte Dateien

- `src/app/stores/domain/mitarbeiterbelegung.store.ts`
- `src/app/services/domain/dienstplan.service.ts`
- `src/app/services/firebase/firestore-db.service.ts`
- `src/app/commons/models/domain/mitarbeiterbelegung.ts`
- `src/app/commons/utils/dienstplan/mitarbeiterbelegung.ts`
- `src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts`
