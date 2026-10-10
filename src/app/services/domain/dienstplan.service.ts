// pur-system/src/app/services/domain/dienstplan.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import {
  IDienstplanPfad,
  IDienstplanVersionPfad,
  IFilialPfad,
} from '../../commons/models/app/firestore-pfad.types';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  IDienstplanAnlageErgebnis,
  IDienstplanBestand,
  IDienstplanDokument,
  IDienstplanEintrag,
  IDienstplanVersionDokument,
  IDienstplanVersionEintrag,
} from '../../commons/models/domain/dienstplan';
import {
  ISchichtAktualisierung,
  ISchichtAnlage,
  ISchichtDokument,
  ISchichtEintrag,
  ISchichtSchreibergebnis,
} from '../../commons/models/domain/schicht';
import { createDienstplanZeitraum } from '../../commons/utils/dienstplan/dienstplan-zeitraum';
import { calculateSchichtArbeitszeitMinuten } from '../../commons/utils/dienstplan/schicht-zeit';
import { FirestoreDbService } from '../firebase/firestore-db.service';

@Injectable({ providedIn: 'root' })
export class DienstplanService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt einen Monatsplan mit seinen aktuellen Versionen und Schichten.
   *
   * @param pfad - Vollständiger Pfad des Monatsplans.
   * @param nurVeroeffentlicht - Begrenzt den Bestand auf die veröffentlichte Version.
   * @param strategie - Datenquellenstrategie für alle Lesezugriffe.
   * @returns Monatsbestand oder ein leerer Bestand, wenn der Dienstplan nicht existiert.
   */
  async loadDienstplanMonat(
    pfad: IDienstplanPfad,
    nurVeroeffentlicht: boolean,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
  ): Promise<IDienstplanBestand> {
    const dokument = await this.firestoreDbService.loadDocument<IDienstplanDokument>(
      FIRESTORE_DOCUMENT_PATHS.dienstplan(pfad),
      strategie,
    );
    if (!dokument) {
      return { dienstplaene: [], versionen: [], schichten: [] };
    }

    const dienstplan = mapDienstplan(pfad, dokument.id, dokument.daten);
    const versionIds = nurVeroeffentlicht
      ? [dienstplan.veroeffentlichteVersionId]
      : [dienstplan.entwurfVersionId, dienstplan.veroeffentlichteVersionId];
    const versionenMitSchichten = await Promise.all(
      [...new Set(versionIds.filter((id): id is string => Boolean(id)))].map((versionId) => {
        return this.loadVersionMitSchichten({ ...pfad, versionId }, strategie);
      }),
    );
    return {
      dienstplaene: [dienstplan],
      versionen: versionenMitSchichten.flatMap((bestand) => bestand.versionen).sort(sortVersionen),
      schichten: versionenMitSchichten.flatMap((bestand) => bestand.schichten).sort(sortSchichten),
    };
  }

  /**
   * Lädt alle Dienstpläne, Versionen und Schichten einer Filiale.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param strategie - Datenquellenstrategie für alle Lesezugriffe.
   * @returns Vollständiger filialbezogener Dienstplanbestand.
   */
  async loadDienstplanBestand(
    pfad: IFilialPfad,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
  ): Promise<IDienstplanBestand> {
    const dokumente = await this.firestoreDbService.loadCollection<IDienstplanDokument>(
      FIRESTORE_COLLECTION_PATHS.dienstplaene(pfad),
      strategie,
    );
    const dienstplaene = dokumente
      .map((dokument) => {
        return mapDienstplan({ ...pfad, dienstplanId: dokument.id }, dokument.id, dokument.daten);
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    const versionenMitSchichten = await Promise.all(
      dienstplaene.map((dienstplan) => {
        return this.loadAlleVersionenMitSchichten(
          { ...pfad, dienstplanId: dienstplan.id },
          strategie,
        );
      }),
    );
    return {
      dienstplaene,
      versionen: versionenMitSchichten.flatMap((bestand) => bestand.versionen).sort(sortVersionen),
      schichten: versionenMitSchichten.flatMap((bestand) => bestand.schichten).sort(sortSchichten),
    };
  }

  /**
   * Legt einen Monatsplan und seine erste Entwurfsversion atomar an.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param monat - Monat im Format `YYYY-MM` und Dokument-ID des Dienstplans.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @returns Die lokal abbildbaren Einträge des neuen Dienstplans und seiner Version.
   */
  async createDienstplan(
    pfad: IFilialPfad,
    monat: string,
    benutzerUid: string,
  ): Promise<IDienstplanAnlageErgebnis> {
    const dienstplanPfad: IDienstplanPfad = { ...pfad, dienstplanId: monat };
    const versionId = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.dienstplanVersionen(dienstplanPfad),
    );
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const zeitraum = createDienstplanZeitraum(monat);
    const dienstplanDaten: IDienstplanDokument = {
      ...zeitraum,
      entwurfVersionId: versionId,
      naechsteVersionsnummer: 2,
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    const versionDaten: IDienstplanVersionDokument = {
      nummer: 1,
      revision: 0,
      status: 'entwurf',
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    await this.firestoreDbService.updateDocumentsAtomically([
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplan(dienstplanPfad),
        daten: { ...dienstplanDaten, erstelltAm: zeitstempel, aktualisiertAm: zeitstempel },
      },
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplanVersion({
          ...dienstplanPfad,
          versionId,
        }),
        daten: { ...versionDaten, erstelltAm: zeitstempel, aktualisiertAm: zeitstempel },
      },
    ]);

    return {
      dienstplan: mapDienstplan(dienstplanPfad, monat, dienstplanDaten),
      version: mapVersion({ ...dienstplanPfad, versionId }, versionId, versionDaten),
    };
  }

  /**
   * Legt eine Schicht an und erhöht die erwartete Entwurfsrevision atomar.
   *
   * @param pfad - Vollständiger Pfad der Entwurfsversion.
   * @param erwarteteRevision - Vom Client zuletzt geladene Revision.
   * @param anlage - Fachliche Schichtdaten.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @returns Neue Schicht und bestätigte Versionsrevision.
   */
  async createSchicht(
    pfad: IDienstplanVersionPfad,
    erwarteteRevision: number,
    anlage: ISchichtAnlage,
    benutzerUid: string,
  ): Promise<ISchichtSchreibergebnis> {
    calculateSchichtArbeitszeitMinuten(anlage);
    const schichtId = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.schichten(pfad),
    );
    const schicht: ISchichtEintrag = {
      ...anlage,
      ...pfad,
      id: schichtId,
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    return this.writeSchicht(
      pfad,
      erwarteteRevision,
      schichtId,
      benutzerUid,
      {
        ...anlage,
        erstelltVonUid: benutzerUid,
        aktualisiertVonUid: benutzerUid,
      },
      schicht,
    );
  }

  /**
   * Aktualisiert eine Schicht und erhöht die erwartete Entwurfsrevision atomar.
   *
   * @param pfad - Vollständiger Pfad der Entwurfsversion.
   * @param schichtId - Dokument-ID der Schicht.
   * @param erwarteteRevision - Vom Client zuletzt geladene Revision.
   * @param aktualisierung - Vollständige bearbeitbare Schichtdaten.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @returns Aktualisierte Schicht und bestätigte Versionsrevision.
   */
  async updateSchicht(
    pfad: IDienstplanVersionPfad,
    schicht: ISchichtEintrag,
    erwarteteRevision: number,
    aktualisierung: ISchichtAktualisierung,
    benutzerUid: string,
  ): Promise<ISchichtSchreibergebnis> {
    calculateSchichtArbeitszeitMinuten(aktualisierung);
    const aktualisierteSchicht: ISchichtEintrag = {
      ...schicht,
      ...aktualisierung,
      aktualisiertVonUid: benutzerUid,
    };
    return this.writeSchicht(
      pfad,
      erwarteteRevision,
      schicht.id,
      benutzerUid,
      {
        ...aktualisierung,
        mitarbeiterAnzeigename: this.firestoreDbService.createDeleteField(),
        aktualisiertVonUid: benutzerUid,
      },
      aktualisierteSchicht,
      false,
    );
  }

  /**
   * Löscht eine Schicht und erhöht die erwartete Entwurfsrevision atomar.
   *
   * @param pfad - Vollständiger Pfad der Entwurfsversion.
   * @param schicht - Zu löschender Schichteintrag.
   * @param erwarteteRevision - Vom Client zuletzt geladene Revision.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @returns Gelöschte Schicht und bestätigte Versionsrevision.
   */
  async deleteSchicht(
    pfad: IDienstplanVersionPfad,
    schicht: ISchichtEintrag,
    erwarteteRevision: number,
    benutzerUid: string,
  ): Promise<ISchichtSchreibergebnis> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    return this.firestoreDbService.executeDocumentTransaction<
      IDienstplanVersionDokument,
      ISchichtSchreibergebnis
    >(FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad), (version) => {
      const versionRevision = getNaechsteRevision(version?.daten, erwarteteRevision);
      return {
        ergebnis: { schicht, versionRevision },
        operationen: [
          {
            documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad),
            daten: {
              revision: versionRevision,
              aktualisiertAm: zeitstempel,
              aktualisiertVonUid: benutzerUid,
            },
          },
          {
            documentPath: FIRESTORE_DOCUMENT_PATHS.schicht({ ...pfad, schichtId: schicht.id }),
            delete: true,
          },
        ],
      };
    });
  }

  // ===== Interne Helfer =======================

  private async loadAlleVersionenMitSchichten(
    pfad: IDienstplanPfad,
    strategie: TFirestoreLesestrategie,
  ): Promise<Pick<IDienstplanBestand, 'versionen' | 'schichten'>> {
    const dokumente = await this.firestoreDbService.loadCollection<IDienstplanVersionDokument>(
      FIRESTORE_COLLECTION_PATHS.dienstplanVersionen(pfad),
      strategie,
    );
    const versionen = dokumente.map((dokument) => {
      return mapVersion({ ...pfad, versionId: dokument.id }, dokument.id, dokument.daten);
    });
    const schichten = await Promise.all(
      versionen.map((version) => {
        return this.loadSchichten({ ...pfad, versionId: version.id }, strategie);
      }),
    );
    return { versionen, schichten: schichten.flat().sort(sortSchichten) };
  }

  private async loadVersionMitSchichten(
    pfad: IDienstplanVersionPfad,
    strategie: TFirestoreLesestrategie,
  ): Promise<Pick<IDienstplanBestand, 'versionen' | 'schichten'>> {
    const dokument = await this.firestoreDbService.loadDocument<IDienstplanVersionDokument>(
      FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad),
      strategie,
    );
    if (!dokument) {
      return { versionen: [], schichten: [] };
    }
    const schichten = await this.loadSchichten(pfad, strategie);
    return {
      versionen: [mapVersion(pfad, dokument.id, dokument.daten)],
      schichten,
    };
  }

  private async loadSchichten(
    pfad: IDienstplanVersionPfad,
    strategie: TFirestoreLesestrategie,
  ): Promise<ISchichtEintrag[]> {
    const dokumente = await this.firestoreDbService.loadCollection<ISchichtDokument>(
      FIRESTORE_COLLECTION_PATHS.schichten(pfad),
      strategie,
    );
    return dokumente.map((dokument) => {
      return mapSchicht(pfad, dokument.id, dokument.daten);
    });
  }

  private writeSchicht(
    pfad: IDienstplanVersionPfad,
    erwarteteRevision: number,
    schichtId: string,
    benutzerUid: string,
    daten: Record<string, unknown>,
    schicht: ISchichtEintrag,
    istAnlage = true,
  ): Promise<ISchichtSchreibergebnis> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    return this.firestoreDbService.executeDocumentTransaction<
      IDienstplanVersionDokument,
      ISchichtSchreibergebnis
    >(FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad), (version) => {
      const versionRevision = getNaechsteRevision(version?.daten, erwarteteRevision);
      return {
        ergebnis: { schicht, versionRevision },
        operationen: [
          {
            documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad),
            daten: {
              revision: versionRevision,
              aktualisiertAm: zeitstempel,
              aktualisiertVonUid: benutzerUid,
            },
          },
          {
            documentPath: FIRESTORE_DOCUMENT_PATHS.schicht({ ...pfad, schichtId }),
            daten: {
              ...daten,
              ...(istAnlage ? { erstelltAm: zeitstempel } : {}),
              aktualisiertAm: zeitstempel,
            },
          },
        ],
      };
    });
  }
}

function mapDienstplan(
  pfad: IDienstplanPfad,
  id: string,
  daten: IDienstplanDokument,
): IDienstplanEintrag {
  return { ...daten, ...pfad, id };
}

function mapVersion(
  pfad: IDienstplanVersionPfad,
  id: string,
  daten: IDienstplanVersionDokument,
): IDienstplanVersionEintrag {
  return { ...daten, ...pfad, id };
}

function mapSchicht(
  pfad: IDienstplanVersionPfad,
  id: string,
  daten: ISchichtDokument,
): ISchichtEintrag {
  return {
    ...pfad,
    id,
    mitarbeiterId: daten.mitarbeiterId,
    schichtvorlageId: daten.schichtvorlageId,
    schichtvorlageBezeichnung: daten.schichtvorlageBezeichnung,
    beginn: daten.beginn,
    ende: daten.ende,
    pauseMinuten: daten.pauseMinuten,
    erstelltVonUid: daten.erstelltVonUid,
    aktualisiertVonUid: daten.aktualisiertVonUid,
    ...(daten.erstelltAm ? { erstelltAm: daten.erstelltAm } : {}),
    ...(daten.aktualisiertAm ? { aktualisiertAm: daten.aktualisiertAm } : {}),
  };
}

function getNaechsteRevision(
  version: IDienstplanVersionDokument | undefined,
  erwarteteRevision: number,
): number {
  if (!version || version.status !== 'entwurf' || version.revision !== erwarteteRevision) {
    throw new Error('Der Dienstplan wurde zwischenzeitlich geändert. Bitte lade ihn erneut.');
  }
  return erwarteteRevision + 1;
}

function sortVersionen(
  erste: IDienstplanVersionEintrag,
  zweite: IDienstplanVersionEintrag,
): number {
  return erste.dienstplanId.localeCompare(zweite.dienstplanId) || erste.nummer - zweite.nummer;
}

function sortSchichten(erste: ISchichtEintrag, zweite: ISchichtEintrag): number {
  return erste.beginn.toMillis() - zweite.beginn.toMillis() || erste.id.localeCompare(zweite.id);
}
