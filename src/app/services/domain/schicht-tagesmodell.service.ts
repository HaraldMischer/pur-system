// pur-system/src/app/services/domain/schicht-tagesmodell.service.ts

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
  ISchichttagesmodellAktualisierung,
  ISchichttagesmodellAnlage,
  ISchichttagesmodellBestand,
  ISchichttagesmodellDokument,
  ISchichttagesmodellEintrag,
  ITagesvorlagenschichtDokument,
  ITagesvorlagenschichtEintrag,
  ITagesvorlagenschichtSchreibdaten,
  TTagesvorlageTyp,
} from '../../commons/models/domain/schicht-tagesmodell';
import { assertGueltigeTagesvorlagenschichten } from '../../commons/validators/schicht-tagesmodell.validator';
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
    beginn: { ...schicht.beginn },
    ende: { ...schicht.ende },
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
    beginn: { ...schicht.beginn },
    ende: { ...schicht.ende },
    mehrfachbelegungErlaubt: schicht.mehrfachbelegungErlaubt,
    vorbereitungsminuten: schicht.vorbereitungsminuten,
    nachbereitungsminuten: schicht.nachbereitungsminuten,
  };
}

@Injectable({ providedIn: 'root' })
export class SchichtTagesmodellService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt alle Schicht-Tagesmodelle einer Filiale mit ihren beiden Vorlagen.
   */
  async loadSchichtTagesmodelle(
    pfad: IFilialPfad,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
  ): Promise<ISchichttagesmodellBestand[]> {
    const dokumente = await this.firestoreDbService.loadCollection<ISchichttagesmodellDokument>(
      FIRESTORE_COLLECTION_PATHS.schichttagesmodelle(pfad),
      strategie,
    );
    const bestaende = await Promise.all(
      dokumente.map(async (dokument) => {
        if (dokument.daten.planungsart !== 'schichttagesmodell') {
          throw new Error('Das geladene Dokument ist kein Schicht-Tagesmodell.');
        }
        const schichtmodell: ISchichttagesmodellEintrag = {
          ...dokument.daten,
          ...pfad,
          id: dokument.id,
        };
        const schichten =
          await this.firestoreDbService.loadCollection<ITagesvorlagenschichtDokument>(
            FIRESTORE_COLLECTION_PATHS.tagesvorlagenschichten({
              ...pfad,
              schichttagesmodellId: dokument.id,
            }),
            strategie,
          );
        const tagesvorlagenschichten = schichten
          .map((schicht): ITagesvorlagenschichtEintrag => {
            return {
              ...schicht.daten,
              ...pfad,
              id: schicht.id,
              schichttagesmodellId: dokument.id,
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
   * Legt ein aktives Schicht-Tagesmodell mit Wochentags- und Sonntagsvorlage an.
   */
  async createSchichtTagesmodell(
    pfad: IFilialPfad,
    anlage: ISchichttagesmodellAnlage,
    oeffnungen: TOeffnungen,
    benutzerUid: string,
  ): Promise<ISchichttagesmodellBestand> {
    this.assertModell(anlage, oeffnungen);
    const schichttagesmodellId = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.schichttagesmodelle(pfad),
    );
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const schichtmodell: ISchichttagesmodellEintrag = {
      ...pfad,
      id: schichttagesmodellId,
      bezeichnung: anlage.bezeichnung.trim(),
      aktiv: true,
      planungsart: 'schichttagesmodell',
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    const tagesvorlagenschichten = anlage.tagesvorlagenschichten.map((schicht) => {
      const normalisiert = normalizeSchicht(schicht);
      const id = this.firestoreDbService.createDocumentId(
        FIRESTORE_COLLECTION_PATHS.tagesvorlagenschichten({ ...pfad, schichttagesmodellId }),
      );
      return { ...normalisiert, ...pfad, id, schichttagesmodellId };
    });
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.schichttagesmodell({
          ...pfad,
          schichttagesmodellId,
        }),
        daten: {
          bezeichnung: schichtmodell.bezeichnung,
          aktiv: true,
          planungsart: 'schichttagesmodell',
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
            schichttagesmodellId,
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
   * Aktualisiert ein Schicht-Tagesmodell und ersetzt seine Vorlagenschichten atomar.
   */
  async updateSchichtTagesmodell(
    pfad: IFilialPfad,
    bestand: ISchichttagesmodellBestand,
    aktualisierung: ISchichttagesmodellAktualisierung,
    oeffnungen: TOeffnungen,
    benutzerUid: string,
  ): Promise<ISchichttagesmodellBestand> {
    this.assertModell(aktualisierung, oeffnungen);
    const schichttagesmodellId = bestand.schichtmodell.id;
    const bekannteIds = new Set(bestand.tagesvorlagenschichten.map((schicht) => schicht.id));
    const verwendeteIds = new Set<string>();
    const tagesvorlagenschichten = aktualisierung.tagesvorlagenschichten.map((schicht) => {
      const id =
        schicht.id && bekannteIds.has(schicht.id) && !verwendeteIds.has(schicht.id)
          ? schicht.id
          : this.firestoreDbService.createDocumentId(
              FIRESTORE_COLLECTION_PATHS.tagesvorlagenschichten({
                ...pfad,
                schichttagesmodellId,
              }),
            );
      verwendeteIds.add(id);
      return { ...normalizeSchicht(schicht), ...pfad, id, schichttagesmodellId };
    });
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.schichttagesmodell({
          ...pfad,
          schichttagesmodellId,
        }),
        daten: {
          bezeichnung: aktualisierung.bezeichnung.trim(),
          aktiv: aktualisierung.aktiv,
          planungsart: 'schichttagesmodell',
          aktualisiertAm: zeitstempel,
          aktualisiertVonUid: benutzerUid,
        },
      },
      ...tagesvorlagenschichten.map((schicht) => {
        return {
          documentPath: FIRESTORE_DOCUMENT_PATHS.tagesvorlagenschicht({
            ...pfad,
            schichttagesmodellId,
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
              schichttagesmodellId,
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
   * Deaktiviert ein Schicht-Tagesmodell, ohne Vorlagen oder historische Pläne zu löschen.
   */
  async deactivateSchichtTagesmodell(
    pfad: IFilialPfad,
    schichttagesmodellId: string,
    benutzerUid: string,
  ): Promise<void> {
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.schichttagesmodell({ ...pfad, schichttagesmodellId }),
      {
        aktiv: false,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        aktualisiertVonUid: benutzerUid,
      },
    );
  }

  // ===== Interne Helfer =======================

  private assertModell(anlage: ISchichttagesmodellAnlage, oeffnungen: TOeffnungen): void {
    if (!anlage.bezeichnung.trim()) {
      throw new Error('Ein Schicht-Tagesmodell benötigt eine Bezeichnung.');
    }
    assertGueltigeTagesvorlagenschichten(anlage.tagesvorlagenschichten, oeffnungen);
  }
}
