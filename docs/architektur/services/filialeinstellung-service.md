<!-- pur-system/docs/architektur/services/filialeinstellung-service.md -->

# FilialeinstellungService

Der `FilialeinstellungService` ist der fachliche Firestore-Service für allgemeine Filialeinstellungen, regelmäßige
Wochenöffnungszeiten, Sondertage und datumsbezogene Ausnahmen. Jeder Aufruf erhält einen vollständigen `IFilialPfad`; globale
oder firmenweite Einstellungsabfragen sind nicht vorgesehen.

## Laden und Initialisierung

Der Service lädt die beiden verbindlichen Dokumente `einstellung/allgemein` und `einstellung/oeffnungszeiten` sowie die
Subcollections `sondertag` und `ausnahme`. Fehlen beide Hauptdokumente, liefert er einen noch nicht initialisierten Bestand.
Existiert nur eines der beiden Dokumente, wird der unvollständige Zustand als Fehler behandelt.

Die Initialisierung verlangt Bundesland und vollständige Wochenregeln für alle sieben Tage. Die Oberfläche übergibt zunächst
fest Nordrhein-Westfalen (`DE-NW`) und für alle Wochentage geöffnete Regeln von `06:00` bis `01:00` Uhr am Folgetag. Der
Service legt die dafür geltenden systemdefinierten Feiertage sowie die zentral vorgesehenen festen Sondertage inaktiv an,
sodass zunächst die Wochentagsregel gilt. Ihre geschlossenen Öffnungsregeln benötigen initial keine Zeitfelder; die Oberfläche
verwendet bei fehlenden Zeitwerten `06:00` bis `01:00` Uhr am Folgetag als Formularvorbelegung. Werte werden nicht aus Adresse
oder Postleitzahl abgeleitet. Die anwendungsweit feste technische Zeitzone `Europe/Berlin` wird nicht in den
Filialeinstellungen gespeichert.

## Schreiben

Allgemeine Einstellungen und Wochenregeln werden gemeinsam gespeichert. Ein Bundeslandwechsel gleicht die systemdefinierten
Feiertage atomar ab: gemeinsame Einträge behalten ihre angepasste Öffnungsregel, nicht mehr geltende werden entfernt und neue
inaktiv ergänzt. Benutzerdefinierte Sondertage bleiben erhalten.

Eigene jährliche Sondertage und konkrete Datumsausnahmen werden über getrennte Serviceaktionen angelegt, aktualisiert und
gelöscht. Jährliche Sondertage besitzen Monat und Tag sowie einen Aktivstatus. Datumsausnahmen besitzen ein vollständiges
Datum und keinen Aktivstatus. Das Datum bildet zugleich ihre Firestore-Dokument-ID und bleibt bei der Aktualisierung eines
bestehenden Eintrags unverändert. Systemdefinierte Sondertage behalten Identität, Bezeichnung, Herkunft und Datumsregel;
veränderbar sind nur Aktivstatus und Öffnungsregel. Jeder Schreibvorgang ergänzt die fachlichen Metadaten mit Benutzer-UID und
Serverzeitstempel.

## Validierung

Der Service validiert Bundesland, vollständige Wochenregeln, lokale Zeitwerte, jährlich feste Daten und konkrete
Datumswerte. Eine geöffnete Regel muss verschiedene Beginn- und Endzeiten besitzen; `endetAmFolgetag` muss aus ihrer Reihenfolge
korrekt abgeleitet sein. Eine geschlossene Regel darf entweder keine Zeitwerte oder eine vollständige gültige Zeitfolge
enthalten. Solange die Regel geschlossen ist, werden vorhandene Zeitwerte fachlich nicht berücksichtigt.

Die Firestore Rules prüfen dieselben Dokumentgrenzen unabhängig vom Client. Masterkonten sind rollenbedingt berechtigt. Office-
und Filialkonten benötigen sowohl den konkreten Filialzugriff als auch den App-Bereich `einstellungen`.
