// pur-system/src/app/services/domain/schichtmodell.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import type { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import type { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import type { IGeoeffneteOeffnungsregel } from '../../commons/models/domain/filialeinstellung';
import type {
  ISchichtmodellAktualisierung,
  ISchichtmodellAnlage,
  ISchichtmodellBestand,
  ISchichtmodellDokument,
  ISchichtmodellEintrag,
  ITagesvorlagenschichtDokument,
  ITagesvorlagenschichtEintrag,
  ITagesvorlagenschichtSchreibdaten,
  TTagesvorlageTyp,
} from '../../commons/models/domain/schichtmodell';
import { assertGueltigeTagesvorlagenschichten } from '../../commons/validators/schichtmodell.validator';
import {
  FirestoreDbService,
  type TFirestoreBatchOperation,
} from '../firebase/firestore-db.service';

type TOeffnungen = Readonly<Record<TTagesvorlageTyp, IGeoeffneteOeffnungsregel>>;

function sortSchichten(a: ITagesvorlagenschichtEintrag, b: ITagesvorlagenschichtEintrag): number {
  return a.vorlage.localeCompare(b.vorlage) || a.reihenfolge - b.reihenfolge;
}

function normalizeSchicht(
  schicht: ITagesvorlagenschichtSchreibdaten,
): ITagesvorlagenschichtSchreibdaten {
  return {
    ...(schicht.id ? { id: schicht.id } : {}),
    vorlage: schicht.vorlage,
    bezeichnung: schicht.bezeichnung.trim(),
    reihenfolge: schicht.reihenfolge,
    ...(schicht.beginn ? { beginn: { ...schicht.beginn } } : {}),
    ...(schicht.ende ? { ende: { ...schicht.ende } } : {}),
    mehrfachbelegungErlaubt: schicht.mehrfachbelegungErlaubt,
    vorbereitungsminuten: schicht.vorbereitungsminuten,
    nachbereitungsminuten: schicht.nachbereitungsminuten,
  };
}

function mapDokument(schicht: ITagesvorlagenschichtSchreibdaten): ITagesvorlagenschichtDokument {
  return {
    vorlage: schicht.vorlage,
    bezeichnung: schicht.bezeichnung,
    reihenfolge: schicht.reihenfolge,
    ...(schicht.beginn ? { beginn: { ...schicht.beginn } } : {}),
    ...(schicht.ende ? { ende: { ...schicht.ende } } : {}),
    mehrfachbelegungErlaubt: schicht.mehrfachbelegungErlaubt,
    vorbereitungsminuten: schicht.vorbereitungsminuten,
    nachbereitungsminuten: schicht.nachbereitungsminuten,
  };
}

@Injectable({ providedIn: 'root' })
export class SchichtmodellService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Schichtmodelle einer Filiale mit ihren beiden Vorlagen.
   */
  async loadSchichtmodelle(
    pfad: IFilialPfad,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
  ): Promise<ISchichtmodellBestand[]> {
    const dokumente = await this.firestoreDbService.loadCollection<ISchichtmodellDokument>(
      FIRESTORE_COLLECTION_PATHS.schichtmodelle(pfad),
      strategie,
    );
    const bestaende = await Promise.all(
      dokumente.map(async (dokument) => {
        const schichtmodell: ISchichtmodellEintrag = {
          ...dokument.daten,
          ...pfad,
          id: dokument.id,
        };
        const schichten =
          await this.firestoreDbService.loadCollection<ITagesvorlagenschichtDokument>(
            FIRESTORE_COLLECTION_PATHS.tagesvorlagenschichten({
              ...pfad,
              schichtmodellId: dokument.id,
            }),
            strategie,
          );
        const tagesvorlagenschichten = schichten
          .map((schicht): ITagesvorlagenschichtEintrag => {
            return {
              ...schicht.daten,
              ...pfad,
              id: schicht.id,
              schichtmodellId: dokument.id,
            };
          })
          .sort(sortSchichten);
        return { schichtmodell, tagesvorlagenschichten };
      }),
    );
    return bestaende.sort((a, b) => {
      return a.schichtmodell.bezeichnung.localeCompare(b.schichtmodell.bezeichnung, 'de');
    });
  }

  /**
   * Legt ein aktives Schichtmodell mit Wochentags- und Sonntagsvorlage an.
   */
  async createSchichtmodell(
    pfad: IFilialPfad,
    anlage: ISchichtmodellAnlage,
    oeffnungen: TOeffnungen,
    benutzerUid: string,
  ): Promise<ISchichtmodellBestand> {
    this.assertModell(anlage, oeffnungen);
    const schichtmodellId = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.schichtmodelle(pfad),
    );
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const schichtmodell: ISchichtmodellEintrag = {
      ...pfad,
      id: schichtmodellId,
      bezeichnung: anlage.bezeichnung.trim(),
      aktiv: true,
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    const tagesvorlagenschichten = anlage.tagesvorlagenschichten.map((schicht) => {
      const normalisiert = normalizeSchicht(schicht);
      const id = this.firestoreDbService.createDocumentId(
        FIRESTORE_COLLECTION_PATHS.tagesvorlagenschichten({ ...pfad, schichtmodellId }),
      );
      return { ...normalisiert, ...pfad, id, schichtmodellId };
    });
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.schichtmodell({
          ...pfad,
          schichtmodellId,
        }),
        daten: {
          bezeichnung: schichtmodell.bezeichnung,
          aktiv: true,
          erstelltAm: zeitstempel,
          erstelltVonUid: benutzerUid,
          aktualisiertAm: zeitstempel,
          aktualisiertVonUid: benutzerUid,
        },
      },
      ...tagesvorlagenschichten.map((schicht) => {
        return {
          documentPath: FIRESTORE_DOCUMENT_PATHS.tagesvorlagenschicht({
            ...pfad,
            schichtmodellId,
            tagesvorlagenschichtId: schicht.id,
          }),
          daten: mapDokument(schicht),
        };
      }),
    ];
    await this.firestoreDbService.updateDocumentsAtomically(operationen);
    return { schichtmodell, tagesvorlagenschichten: tagesvorlagenschichten.sort(sortSchichten) };
  }

  /**
   * Aktualisiert ein Schichtmodell und ersetzt seine Vorlagenschichten atomar.
   */
  async updateSchichtmodell(
    pfad: IFilialPfad,
    bestand: ISchichtmodellBestand,
    aktualisierung: ISchichtmodellAktualisierung,
    oeffnungen: TOeffnungen,
    benutzerUid: string,
  ): Promise<ISchichtmodellBestand> {
    this.assertModell(aktualisierung, oeffnungen);
    const schichtmodellId = bestand.schichtmodell.id;
    const bekannteIds = new Set(bestand.tagesvorlagenschichten.map((schicht) => schicht.id));
    const verwendeteIds = new Set<string>();
    const tagesvorlagenschichten = aktualisierung.tagesvorlagenschichten.map((schicht) => {
      const id =
        schicht.id && bekannteIds.has(schicht.id) && !verwendeteIds.has(schicht.id)
          ? schicht.id
          : this.firestoreDbService.createDocumentId(
              FIRESTORE_COLLECTION_PATHS.tagesvorlagenschichten({
                ...pfad,
                schichtmodellId,
              }),
            );
      verwendeteIds.add(id);
      return { ...normalizeSchicht(schicht), ...pfad, id, schichtmodellId };
    });
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.schichtmodell({
          ...pfad,
          schichtmodellId,
        }),
        daten: {
          bezeichnung: aktualisierung.bezeichnung.trim(),
          aktiv: aktualisierung.aktiv,
          aktualisiertAm: zeitstempel,
          aktualisiertVonUid: benutzerUid,
        },
      },
      ...tagesvorlagenschichten.map((schicht) => {
        return {
          documentPath: FIRESTORE_DOCUMENT_PATHS.tagesvorlagenschicht({
            ...pfad,
            schichtmodellId,
            tagesvorlagenschichtId: schicht.id,
          }),
          daten: mapDokument(schicht),
        };
      }),
      ...bestand.tagesvorlagenschichten
        .filter((schicht) => !verwendeteIds.has(schicht.id))
        .map((schicht) => {
          return {
            documentPath: FIRESTORE_DOCUMENT_PATHS.tagesvorlagenschicht({
              ...pfad,
              schichtmodellId,
              tagesvorlagenschichtId: schicht.id,
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
      tagesvorlagenschichten: tagesvorlagenschichten.sort(sortSchichten),
    };
  }

  /**
   * Deaktiviert ein Schichtmodell, ohne Vorlagen oder historische Pläne zu löschen.
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

  private assertModell(anlage: ISchichtmodellAnlage, oeffnungen: TOeffnungen): void {
    if (!anlage.bezeichnung.trim()) {
      throw new Error('Ein Schichtmodell benötigt eine Bezeichnung.');
    }
    assertGueltigeTagesvorlagenschichten(anlage.tagesvorlagenschichten, oeffnungen);
  }
}
