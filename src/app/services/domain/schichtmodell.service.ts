// pur-system/src/app/services/domain/schichtmodell.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import { MAX_RANDMINUTEN } from '../../commons/constants/schichtmodell.constants';
import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  IModellschichtDaten,
  IModellschichtDokument,
  IModellschichtEintrag,
  IModellschichtSchreibdaten,
  ISchichtrastermodellAktualisierung,
  ISchichtrastermodellAnlage,
  ISchichtrastermodellBestand,
  ISchichtrastermodellDokument,
  ISchichtrastermodellEintrag,
  TSchichtmodellDokument,
} from '../../commons/models/domain/schichtmodell';
import { compareModellschichtenNachReihenfolge } from '../../commons/utils/dienstplan/modellschicht-sortierung';
import { assertGueltigeModellschichten } from '../../commons/validators/schichtmodell.validator';
import { FirestoreDbService, TFirestoreBatchOperation } from '../firebase/firestore-db.service';

// ===== Top-Level Helper =====================

function sortSchichtmodelle(
  a: ISchichtrastermodellBestand,
  b: ISchichtrastermodellBestand,
): number {
  return a.schichtmodell.bezeichnung.localeCompare(b.schichtmodell.bezeichnung, 'de');
}

function sortModellschichten(a: IModellschichtEintrag, b: IModellschichtEintrag): number {
  return compareModellschichtenNachReihenfolge(a, b);
}

function assertSchichtrastermodellDokument(
  dokument: TSchichtmodellDokument,
): asserts dokument is ISchichtrastermodellDokument {
  if (dokument.planungsart !== 'schichtraster') {
    throw new Error('Die Planungsart des Schichtmodells wird noch nicht unterstützt.');
  }
}

function normalizeModellschicht(
  modellschicht: IModellschichtSchreibdaten,
): IModellschichtSchreibdaten {
  if (!modellschicht.bezeichnung.trim()) {
    throw new Error('Die Modellschicht enthält keine gültige Bezeichnung.');
  }
  return {
    ...(modellschicht.id ? { id: modellschicht.id } : {}),
    bezeichnung: modellschicht.bezeichnung.trim(),
    reihenfolge: modellschicht.reihenfolge,
    ...(modellschicht.beginn ? { beginn: { ...modellschicht.beginn } } : {}),
    ...(modellschicht.ende ? { ende: { ...modellschicht.ende } } : {}),
    mehrfachbelegungErlaubt: modellschicht.mehrfachbelegungErlaubt,
    vorbereitungsminuten: normalizeRandminuten(modellschicht.vorbereitungsminuten),
    nachbereitungsminuten: normalizeRandminuten(modellschicht.nachbereitungsminuten),
  };
}

function mapModellschichtDokument(daten: IModellschichtDaten): IModellschichtDokument {
  return {
    bezeichnung: daten.bezeichnung,
    reihenfolge: daten.reihenfolge,
    ...(daten.beginn ? { beginn: { ...daten.beginn } } : {}),
    ...(daten.ende ? { ende: { ...daten.ende } } : {}),
    mehrfachbelegungErlaubt: daten.mehrfachbelegungErlaubt,
    vorbereitungsminuten: daten.vorbereitungsminuten ?? 0,
    nachbereitungsminuten: daten.nachbereitungsminuten ?? 0,
  };
}

function normalizeModellschichten(
  modellschichten: readonly IModellschichtSchreibdaten[],
): IModellschichtSchreibdaten[] {
  return modellschichten
    .map((modellschicht) => normalizeModellschicht(modellschicht))
    .sort(compareModellschichtenNachReihenfolge);
}

function normalizeRandminuten(wert: number | undefined): number {
  const minuten = wert ?? 0;
  if (!Number.isInteger(minuten) || minuten < 0 || minuten > MAX_RANDMINUTEN) {
    throw new Error('Vor- und Nachbereitungsminuten müssen ganze Zahlen von 0 bis 999 sein.');
  }
  return minuten;
}

@Injectable({ providedIn: 'root' })
export class SchichtmodellService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Schichtmodelle einschließlich ihrer Modellschichten für eine Filiale.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Nach Bezeichnung sortierte Schichtmodelle mit fachlich geordneten Modellschichten.
   */
  async loadSchichtmodelle(
    pfad: IFilialPfad,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
  ): Promise<ISchichtrastermodellBestand[]> {
    const dokumente = await this.firestoreDbService.loadCollection<TSchichtmodellDokument>(
      FIRESTORE_COLLECTION_PATHS.schichtmodelle(pfad),
      strategie,
    );
    const bestaende = await Promise.all(
      dokumente.map(async (dokument) => {
        assertSchichtrastermodellDokument(dokument.daten);
        const schichtmodell: ISchichtrastermodellEintrag = {
          ...dokument.daten,
          ...pfad,
          id: dokument.id,
        };
        const modellschichtDokumente =
          await this.firestoreDbService.loadCollection<IModellschichtDokument>(
            FIRESTORE_COLLECTION_PATHS.modellschichten({
              ...pfad,
              schichtmodellId: dokument.id,
            }),
            strategie,
          );
        const modellschichten = modellschichtDokumente
          .map((modellschicht) => {
            return {
              ...pfad,
              id: modellschicht.id,
              schichtmodellId: dokument.id,
              ...mapModellschichtDokument(modellschicht.daten),
            };
          })
          .sort(sortModellschichten);
        return { schichtmodell, modellschichten };
      }),
    );
    return bestaende.sort(sortSchichtmodelle);
  }

  /**
   * Legt ein aktives Schichtmodell mit mindestens einer Modellschicht atomar an.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param anlage - Bezeichnung und fachliche Modellschichten.
   * @param benutzerUid - UID des anlegenden Benutzers.
   * @returns Lokal abbildbarer Bestand des neuen Schichtmodells.
   */
  async createSchichtmodell(
    pfad: IFilialPfad,
    anlage: ISchichtrastermodellAnlage,
    benutzerUid: string,
  ): Promise<ISchichtrastermodellBestand> {
    this.assertSchichtmodell(anlage);
    const schichtmodellId = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.schichtmodelle(pfad),
    );
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const schichtmodell: ISchichtrastermodellEintrag = {
      ...pfad,
      id: schichtmodellId,
      bezeichnung: anlage.bezeichnung.trim(),
      aktiv: true,
      planungsart: 'schichtraster',
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    const modellschichten = normalizeModellschichten(anlage.modellschichten).map(
      (modellschicht) => {
        const id = this.firestoreDbService.createDocumentId(
          FIRESTORE_COLLECTION_PATHS.modellschichten({ ...pfad, schichtmodellId }),
        );
        return {
          ...modellschicht,
          ...pfad,
          id,
          schichtmodellId,
        };
      },
    );
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.schichtmodell({ ...pfad, schichtmodellId }),
        daten: {
          bezeichnung: schichtmodell.bezeichnung,
          aktiv: true,
          planungsart: 'schichtraster',
          erstelltAm: zeitstempel,
          erstelltVonUid: benutzerUid,
          aktualisiertAm: zeitstempel,
          aktualisiertVonUid: benutzerUid,
        },
      },
      ...modellschichten.map((modellschicht) => {
        return {
          documentPath: FIRESTORE_DOCUMENT_PATHS.modellschicht({
            ...pfad,
            schichtmodellId,
            modellschichtId: modellschicht.id,
          }),
          daten: mapModellschichtDokument(modellschicht),
        };
      }),
    ];
    await this.firestoreDbService.updateDocumentsAtomically(operationen);
    return { schichtmodell, modellschichten };
  }

  /**
   * Aktualisiert ein Schichtmodell und ersetzt seine Modellschichten atomar.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param bestand - Bisher vollständig geladener Modellbestand.
   * @param aktualisierung - Vollständige bearbeitbare Modelldaten.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @returns Aktualisierter lokal abbildbarer Modellbestand.
   */
  async updateSchichtmodell(
    pfad: IFilialPfad,
    bestand: ISchichtrastermodellBestand,
    aktualisierung: ISchichtrastermodellAktualisierung,
    benutzerUid: string,
  ): Promise<ISchichtrastermodellBestand> {
    this.assertSchichtmodell(aktualisierung);
    const schichtmodellId = bestand.schichtmodell.id;
    const bekannteIds = new Set(bestand.modellschichten.map((modellschicht) => modellschicht.id));
    const verwendeteIds = new Set<string>();
    const modellschichten = normalizeModellschichten(aktualisierung.modellschichten).map(
      (modellschicht) => {
        const id =
          modellschicht.id &&
          bekannteIds.has(modellschicht.id) &&
          !verwendeteIds.has(modellschicht.id)
            ? modellschicht.id
            : this.firestoreDbService.createDocumentId(
                FIRESTORE_COLLECTION_PATHS.modellschichten({ ...pfad, schichtmodellId }),
              );
        verwendeteIds.add(id);
        return {
          ...modellschicht,
          ...pfad,
          id,
          schichtmodellId,
        };
      },
    );
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.schichtmodell({ ...pfad, schichtmodellId }),
        daten: {
          bezeichnung: aktualisierung.bezeichnung.trim(),
          aktiv: aktualisierung.aktiv,
          planungsart: 'schichtraster',
          aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
          aktualisiertVonUid: benutzerUid,
        },
      },
      ...modellschichten.map((modellschicht) => {
        return {
          documentPath: FIRESTORE_DOCUMENT_PATHS.modellschicht({
            ...pfad,
            schichtmodellId,
            modellschichtId: modellschicht.id,
          }),
          daten: mapModellschichtDokument(modellschicht),
        };
      }),
      ...bestand.modellschichten
        .filter((modellschicht) => !verwendeteIds.has(modellschicht.id))
        .map((modellschicht) => {
          return {
            documentPath: FIRESTORE_DOCUMENT_PATHS.modellschicht({
              ...pfad,
              schichtmodellId,
              modellschichtId: modellschicht.id,
            }),
            delete: true as const,
          };
        }),
    ];
    await this.firestoreDbService.updateDocumentsAtomically(operationen);
    return {
      schichtmodell: {
        ...bestand.schichtmodell,
        bezeichnung: aktualisierung.bezeichnung.trim(),
        aktiv: aktualisierung.aktiv,
        aktualisiertVonUid: benutzerUid,
      },
      modellschichten,
    };
  }

  /**
   * Deaktiviert ein Schichtmodell, ohne es oder seine Modellschichten zu löschen.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param schichtmodellId - Dokument-ID des Schichtmodells.
   * @param benutzerUid - UID des ändernden Benutzers.
   */
  async deactivateSchichtmodell(
    pfad: IFilialPfad,
    schichtmodellId: string,
    benutzerUid: string,
  ): Promise<void> {
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.schichtmodell({ ...pfad, schichtmodellId }),
      {
        aktiv: false,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        aktualisiertVonUid: benutzerUid,
      },
    );
  }

  // ===== Interne Helfer =======================

  private assertSchichtmodell(anlage: ISchichtrastermodellAnlage): void {
    if (!anlage.bezeichnung.trim()) {
      throw new Error('Ein Schichtmodell benötigt eine Bezeichnung.');
    }
    assertGueltigeModellschichten(anlage.modellschichten);
  }
}
