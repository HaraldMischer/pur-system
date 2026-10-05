<!-- pur-system/docs/services/app-daten-init-service.md -->

# App-Dateninitialisierung

Der `AppDatenInitService` lädt abhängig von der Benutzerrolle alle für die Sitzung erforderlichen Stamm- und Mitarbeiterdaten. Er
wird vom `AppSitzungsInitService` aufgerufen und arbeitet mit dem `StammdatenStore`, dem `MitarbeiterStore` sowie dem
`MitarbeiterService` zusammen.

## Rollenabhängige Ladeabläufe

- `master`: Lädt zuerst die gesamte Unternehmer-, Firmen- und Filialstruktur sowie alle Benutzerprofile. Danach werden aus der
  geladenen Struktur alle Firmen ermittelt und deren Mitarbeiter geladen.
- `office`: Prüft die freigegebenen Firmen und Filialen, lädt zuerst deren Strukturdaten und danach die Mitarbeiter der Firmen.
- `filiale`: Prüft die eindeutige Zuordnung, lädt zuerst Unternehmer, Firma und Filiale und danach die Mitarbeiter dieser Filiale.
- `mitarbeiter`: Prüft Firmenzuordnung und Mitarbeiter-ID und lädt zuerst Unternehmer und Firma. Danach wird der eigene aktive
  Mitarbeiter gezielt geladen. Aus dessen `filialIds` werden anschließend die zugeordneten Filialen geladen. Die Mitarbeiter
  dieser Filialen werden mit einer gemeinsamen Abfrage eindeutig geladen.

Ungültige, unvollständige oder nicht zur Rolle passende Profilzuordnungen brechen die Initialisierung mit
`app/invalid-user-profile` ab.

## Ausführung

Die öffentliche Methode verteilt die Initialisierung über die Benutzerrolle auf vier getrennte Abläufe. Jeder Ablauf lädt die
benötigten Daten in einer festen Reihenfolge. Gemeinsame Hilfsmethoden erstellen Mitarbeiteraufträge, warten auf zusammengehörige
Aufträge und protokollieren das Ergebnis.

Ist ein erforderlicher Ladevorgang fehlgeschlagen, wird der Fehler an den `AppSitzungsInitService` weitergegeben. Die verwendete
Firestore-Lesestrategie stammt standardmäßig aus der Umgebung und kann beispielsweise für einen Wiederholungsversuch
überschrieben werden.

## Zurücksetzen und Protokollierung

`reset()` leert die durch den Service verwalteten Stamm- und Mitarbeiterdaten. Nach einem erfolgreichen Ladevorgang protokolliert
der `DebugLogService` die Anzahl der geladenen Benutzerprofile, Unternehmer, Firmen, Filialen und Mitarbeiter.

## Beteiligte Dateien

- `src/app/services/core/app-daten-init.service.ts`
- `src/app/services/core/app-sitzungs-init.service.ts`
- `src/app/stores/app/stammdaten.store.ts`
- `src/app/stores/domain/mitarbeiter.store.ts`
- `src/app/services/domain/mitarbeiter.service.ts`
- `src/app/commons/models/domain/benutzer.ts`
- `src/app/commons/models/app/firestore-lesestrategie.types.ts`
