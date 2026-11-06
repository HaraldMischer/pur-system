<!-- pur-system/docs/architektur/services/filialeinstellung-service.md -->

# FilialeinstellungService

Die fachlichen Öffnungs- und Kalendergrenzen stehen in der [Öffnungszeiten-Matrix](../../matrizen/oeffnungszeiten.md), die
verbindlichen Pfad- und CRUD-Rechte in der [Berechtigungsmatrix](../../matrizen/berechtigungen.md).

Der `FilialeinstellungService` ist der fachliche Firestore-Service für allgemeine Filialeinstellungen, regelmäßige
Wochenöffnungszeiten und Sondertage. Jeder Aufruf erhält einen vollständigen `IFilialPfad`; globale
oder firmenweite Einstellungsabfragen sind nicht vorgesehen.

## Laden und Initialisierung

Der Service lädt die beiden verbindlichen Dokumente `einstellung/allgemein` und `einstellung/oeffnungszeiten` sowie die
Subcollection `sondertag`. Fehlen beide Hauptdokumente, liefert er einen noch nicht initialisierten Bestand.
Existiert nur eines der beiden Dokumente oder fehlen im Öffnungszeitendokument Standardöffnung oder Wochentagsmodi, wird der
unvollständige Zustand als Fehler behandelt.

Die Initialisierung verlangt Bundesland, eine geöffnete Standardöffnungsregel und vollständige Wochentagsmodi für alle sieben
Tage. Die Oberfläche übergibt zunächst fest Nordrhein-Westfalen (`DE-NW`) und die Standardöffnungszeit `06:00` bis `01:00` Uhr
am Folgetag; alle Wochentage beginnen im Modus `standard`. Gesetzliche Feiertage beginnen grundsätzlich mit `Wie Sonntag`,
Karfreitag geschlossen und Allerheiligen abweichend mit `18:00–01:00 Uhr`. Heiligabend und Silvester beginnen ab dem
Standardbeginn bis `16:00 Uhr`, Volkstrauertag mit `13:00–01:00 Uhr` und Totensonntag mit `18:00–01:00 Uhr`. Werte werden nicht
aus Adresse oder Postleitzahl abgeleitet. Die anwendungsweit feste technische Zeitzone
`Europe/Berlin` wird nicht in den Filialeinstellungen gespeichert.

## Schreiben

Allgemeine Einstellungen, Standardöffnungsregel und Wochentagsmodi werden gemeinsam gespeichert. Ein
Bundeslandwechsel gleicht die systemdefinierten Feiertage atomar ab: gemeinsame Einträge behalten ihre angepasste
Öffnungsregel, nicht mehr geltende werden entfernt und neue mit der bundeslandspezifischen Vorbelegung ergänzt.
Benutzerdefinierte Sondertage bleiben erhalten.

Eigene jährliche Sondertage werden über Serviceaktionen angelegt, aktualisiert und gelöscht. Sie besitzen Monat und Tag sowie
einen Öffnungsmodus. Systemdefinierte Sondertage behalten Identität, Bezeichnung, Herkunft und Datumsregel; veränderbar sind nur
Öffnungsmodus und Öffnungsregel. Der technische Aktivstatus wird einheitlich aus dem Modus abgeleitet: `Standard` ist inaktiv,
alle anderen Modi sind aktiv. Jeder Schreibvorgang ergänzt die fachlichen Metadaten mit Benutzer-UID und Serverzeitstempel.

## Validierung

Der Service validiert Bundesland, Standardöffnungsregel, genau sieben Wochentagsmodi, lokale Zeitwerte, jährlich feste Daten
und systemdefinierte berechnete Datumsregeln. Nur der Modus `abweichend` enthält eine eigene geöffnete Regel. Eine geöffnete
Regel muss verschiedene Beginn- und Endzeiten besitzen; `endetAmFolgetag` muss aus ihrer Reihenfolge korrekt abgeleitet sein.
Standardöffnungsregel sowie jede geöffnete abweichende Wochen- und Sondertagsregel müssen eine positive Zeitspanne
besitzen. Schichtzeiten sowie Vor- und Nachbereitungsminuten sind nicht Teil dieser Prüfung.

Die Firestore Rules prüfen dieselben Dokumentgrenzen unabhängig vom Client. Masterkonten sind rollenbedingt berechtigt. Office-
und Filialkonten benötigen sowohl den konkreten Filialzugriff als auch den App-Bereich `einstellungen`.
