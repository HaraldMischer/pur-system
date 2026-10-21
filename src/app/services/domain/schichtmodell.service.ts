// pur-system/src/app/services/domain/schichtmodell.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  IBesondereRasterzeit,
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
import { compareModellschichtenNachBeginn } from '../../commons/utils/dienstplan/modellschicht-sortierung';
import { FirestoreDbService, TFirestoreBatchOperation } from '../firebase/firestore-db.service';

// ===== Top-Level Helper =====================

function sortSchichtmodelle(
  a: ISchichtrastermodellBestand,
  b: ISchichtrastermodellBestand,
): number {
  return a.schichtmodell.bezeichnung.localeCompare(b.schichtmodell.bezeichnung, 'de');
}

function sortModellschichten(a: IModellschichtEintrag, b: IModellschichtEintrag): number {
  return compareModellschichtenNachBeginn(a, b);
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
  const dauerMinuten = calculateSchichtdauerMinuten(
    modellschicht.beginnLokalzeit,
    modellschicht.endeLokalzeit,
  );
  if (dauerMinuten === null || !modellschicht.bezeichnung.trim()) {
    throw new Error('Die Modellschicht enthält keine gültige Bezeichnung oder Zeitfolge.');
  }
  return {
    ...(modellschicht.id ? { id: modellschicht.id } : {}),
    bezeichnung: modellschicht.bezeichnung.trim(),
    beginnLokalzeit: modellschicht.beginnLokalzeit,
    endeLokalzeit: modellschicht.endeLokalzeit,
    endetAmFolgetag: modellschicht.endeLokalzeit < modellschicht.beginnLokalzeit,
    mehrfachbelegungErlaubt: modellschicht.mehrfachbelegungErlaubt,
  };
}

function mapModellschichtDokument(daten: IModellschichtDaten): IModellschichtDokument {
  return {
    bezeichnung: daten.bezeichnung,
    beginnLokalzeit: daten.beginnLokalzeit,
    endeLokalzeit: daten.endeLokalzeit,
    endetAmFolgetag: daten.endetAmFolgetag,
    mehrfachbelegungErlaubt: daten.mehrfachbelegungErlaubt,
  };
}

function calculateSchichtdauerMinuten(beginn: string, ende: string): number | null {
  const beginnMinuten = getLokalzeitMinuten(beginn);
  const endeMinuten = getLokalzeitMinuten(ende);
  if (beginnMinuten === null || endeMinuten === null || beginnMinuten === endeMinuten) return null;
  return endeMinuten + (endeMinuten < beginnMinuten ? 24 * 60 : 0) - beginnMinuten;
}

function getLokalzeitMinuten(lokalzeit: string): number | null {
  const treffer = /^(\d{2}):(\d{2})$/.exec(lokalzeit);
  if (!treffer) return null;
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  return stunden <= 23 && minuten <= 59 ? stunden * 60 + minuten : null;
}

function normalizeBesondereRasterzeiten(
  rasterzeiten: readonly IBesondereRasterzeit[],
  modellschichtIds: ReadonlySet<string>,
): readonly IBesondereRasterzeit[] {
  const schluessel = new Set<string>();
  return rasterzeiten.map((rasterzeit) => {
    const dauerMinuten = calculateSchichtdauerMinuten(
      rasterzeit.beginnLokalzeit,
      rasterzeit.endeLokalzeit,
    );
    const aktuellerSchluessel = JSON.stringify([
      rasterzeit.sondertagId,
      rasterzeit.modellschichtId,
    ]);
    if (
      !rasterzeit.sondertagId ||
      !modellschichtIds.has(rasterzeit.modellschichtId) ||
      dauerMinuten === null ||
      schluessel.has(aktuellerSchluessel)
    ) {
      throw new Error('Die besondere Rasterzeit ist nicht eindeutig oder fachlich ungültig.');
    }
    schluessel.add(aktuellerSchluessel);
    return {
      sondertagId: rasterzeit.sondertagId,
      modellschichtId: rasterzeit.modellschichtId,
      beginnLokalzeit: rasterzeit.beginnLokalzeit,
      endeLokalzeit: rasterzeit.endeLokalzeit,
      endetAmFolgetag: rasterzeit.endeLokalzeit < rasterzeit.beginnLokalzeit,
    };
  });
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
   * @returns Nach Bezeichnung sortierte Schichtmodelle mit chronologisch geordneten Modellschichten.
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
      besondereRasterzeiten: [],
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    const modellschichten = anlage.modellschichten
      .map((modellschicht) => normalizeModellschicht(modellschicht))
      .map((modellschicht) => {
        const id = this.firestoreDbService.createDocumentId(
          FIRESTORE_COLLECTION_PATHS.modellschichten({ ...pfad, schichtmodellId }),
        );
        return {
          ...modellschicht,
          ...pfad,
          id,
          schichtmodellId,
        };
      })
      .sort(compareModellschichtenNachBeginn);
    const besondereRasterzeiten = normalizeBesondereRasterzeiten(
      anlage.besondereRasterzeiten,
      new Set(modellschichten.map((modellschicht) => modellschicht.id)),
    );
    schichtmodell.besondereRasterzeiten = besondereRasterzeiten;
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.schichtmodell({ ...pfad, schichtmodellId }),
        daten: {
          bezeichnung: schichtmodell.bezeichnung,
          aktiv: true,
          planungsart: 'schichtraster',
          besondereRasterzeiten,
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
    const modellschichten = aktualisierung.modellschichten
      .map((modellschicht) => normalizeModellschicht(modellschicht))
      .map((modellschicht) => {
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
      })
      .sort(compareModellschichtenNachBeginn);
    const besondereRasterzeiten = normalizeBesondereRasterzeiten(
      aktualisierung.besondereRasterzeiten.filter((rasterzeit) => {
        return verwendeteIds.has(rasterzeit.modellschichtId);
      }),
      verwendeteIds,
    );
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.schichtmodell({ ...pfad, schichtmodellId }),
        daten: {
          bezeichnung: aktualisierung.bezeichnung.trim(),
          aktiv: aktualisierung.aktiv,
          planungsart: 'schichtraster',
          besondereRasterzeiten,
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
        besondereRasterzeiten,
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
    if (anlage.modellschichten.length === 0) {
      throw new Error('Ein Schichtmodell benötigt mindestens eine Modellschicht.');
    }
  }
}
