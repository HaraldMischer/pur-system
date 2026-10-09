<!-- pur-system/docs/services/schichtvorlage-service.md -->

# Schichtvorlagen-Service

Der `SchichtvorlageService` verwaltet die vorkonfigurierten Schichtzeiten einer konkreten Filiale. Die Dokumente liegen unter dem
vollständigen Filialpfad in der Collection `schichtvorlage`.

## Öffentliche API

- `loadSchichtvorlagen()` lädt und sortiert alle aktiven und inaktiven Vorlagen der Filiale.
- `createSchichtvorlage()` legt eine aktive Vorlage mit Erstellungs- und Änderungsmetadaten an.
- `updateSchichtvorlage()` speichert die vollständigen bearbeitbaren Vorlagendaten einschließlich Aktivstatus.
- `deactivateSchichtvorlage()` setzt eine nicht mehr verwendete Vorlage auf inaktiv. Vorlagen werden nicht physisch gelöscht.

Bezeichnungen werden vor dem Schreiben getrimmt. Beginn und Ende bleiben lokale Uhrzeiten; die Umrechnung in absolute Zeitpunkte
erfolgt erst beim Anlegen oder Bearbeiten einer konkreten Schicht.

## Beteiligte Dateien

- `src/app/services/domain/schichtvorlage.service.ts`
- `src/app/stores/domain/schichtvorlage.store.ts`
- `src/app/commons/models/domain/schichtvorlage.ts`
- `src/app/commons/constants/firebase.constants.ts`
