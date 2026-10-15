<!-- pur-system/docs/architektur/services/filialeinstellung-service.md -->

# FilialeinstellungService

Der `FilialeinstellungService` ist der fachliche Firestore-Service für allgemeine Filialeinstellungen, regelmäßige
Wochenöffnungszeiten, Sondertage und datumsbezogene Ausnahmen. Jeder Aufruf erhält einen vollständigen `IFilialPfad`; globale
oder firmenweite Einstellungsabfragen sind nicht vorgesehen.

## Laden und Initialisierung

Der Service lädt die beiden verbindlichen Dokumente `einstellung/allgemein` und `einstellung/oeffnungszeiten` sowie die
Subcollections `sondertag` und `ausnahme`. Fehlen beide Hauptdokumente, liefert er einen noch nicht initialisierten Bestand.
Existiert nur eines der beiden Dokumente, wird der unvollständige Zustand als Fehler behandelt.

Die Initialisierung verlangt Bundesland, Zeitzone und vollständige Wochenregeln für alle sieben Tage. Sie legt außerdem die für
das Bundesland geltenden systemdefinierten Feiertage sowie die zentral vorgesehenen festen Sondertage an. Werte werden nicht aus
Adresse oder Postleitzahl abgeleitet.

## Schreiben

Allgemeine Einstellungen und Wochenregeln werden gemeinsam gespeichert. Ein Bundeslandwechsel gleicht die systemdefinierten
Feiertage atomar ab: gemeinsame Einträge behalten ihre angepasste Öffnungsregel, nicht mehr geltende werden entfernt und neue
geschlossen ergänzt. Benutzerdefinierte Sondertage bleiben erhalten.

Eigene Sondertage und Datumsausnahmen werden als einzelne Dokumente angelegt, aktualisiert oder gelöscht. Systemdefinierte
Sondertage behalten Identität, Bezeichnung, Herkunft und Datumsregel; veränderbar sind nur Aktivstatus und Öffnungsregel. Jeder
Schreibvorgang ergänzt die fachlichen Metadaten mit Benutzer-UID und Serverzeitstempel.

## Validierung

Der Service validiert Bundesland, Zeitzone, vollständige Wochenregeln, lokale Zeitwerte, jährlich feste Daten und konkrete
Datumswerte. Eine geöffnete Regel muss verschiedene Beginn- und Endzeiten besitzen; `endetAmFolgetag` muss aus ihrer Reihenfolge
korrekt abgeleitet sein. Geschlossene Regeln enthalten keine Zeitwerte.

Die Firestore Rules prüfen dieselben Dokumentgrenzen unabhängig vom Client. Masterkonten sind rollenbedingt berechtigt. Office-
und Filialkonten benötigen sowohl den konkreten Filialzugriff als auch den App-Bereich `einstellungen`.
