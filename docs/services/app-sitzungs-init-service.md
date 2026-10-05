<!-- pur-system/docs/services/app-sitzungs-init-service.md -->

# App-Sitzungsinitialisierung

Der `AppSitzungsInitService` koordiniert den Übergang von einer Firebase-Anmeldung zu einer vollständig nutzbaren
Benutzersitzung. Er startet die Authentifizierungsüberwachung, reagiert auf das geladene Benutzerprofil und stößt das
rollen- und zugriffsabhängige Laden der Stammdaten an.

## Ablauf

1. Die App ruft einmalig `init()` auf.
2. Der `BenutzerStore` beobachtet den Firebase-Authentifizierungszustand und lädt das Benutzerprofil.
3. Bei einem aktiven Profil lädt der `AppDatenInitService` die benötigten Stamm- und Mitarbeiterdaten.
4. Nach erfolgreichem Laden initialisiert der Service den `AppKontextStore`.
5. Der Status wechselt auf `ready` und geschützte Routen werden freigegeben.

Ein fehlendes Profil oder ein Ladefehler führt zum Status `error`. Bei einem inaktiven oder nicht angemeldeten Benutzer werden
die sitzungsbezogenen Daten zurückgesetzt.

## Statuswerte

- `idle`: Es besteht keine zu initialisierende Sitzung.
- `loading`: Profil oder Stammdaten werden geladen.
- `ready`: Alle benötigten Daten und der App-Kontext sind initialisiert.
- `error`: Die Initialisierung ist fehlgeschlagen; `error()` enthält die Fehlermeldung.

Der `initialisierungGuard` wartet auf `ready`, leitet Fehler zur Initialisierungsfehler-Seite und inaktive Benutzer zum Login
weiter.

## Wiederholung und Schutzmechanismen

`retry()` lädt ein fehlendes Profil und die Stammdaten erneut direkt aus dem Netzwerk. Ein aus Benutzer-ID, Rolle,
Mitarbeiterzuordnung und Zugriffen erzeugter Kontext verhindert unnötige Mehrfachladungen. Ein Generationszähler sorgt dafür,
dass verspätete Ergebnisse einer bereits zurückgesetzten oder gewechselten Sitzung nicht übernommen werden.

## Beteiligte Dateien

- `src/app/services/core/app-sitzungs-init.service.ts`
- `src/app/services/core/app-daten-init.service.ts`
- `src/app/guards/initialisierung.guard.ts`
- `src/app/stores/app/benutzer.store.ts`
- `src/app/stores/app/app-kontext.store.ts`
