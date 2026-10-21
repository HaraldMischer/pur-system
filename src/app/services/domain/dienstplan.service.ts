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
import { IDienstplanDatumRasterzeiten } from '../../commons/models/domain/dienstplan-kalendertag';
import {
  ISchichtAktualisierung,
  ISchichtAnlage,
  ISchichtDaten,
  ISchichtDokument,
  ISchichtEintrag,
  ISchichtSchreibergebnis,
} from '../../commons/models/domain/schicht';
import {
  IModellschichtMomentaufnahmeDokument,
  IModellschichtMomentaufnahmeEintrag,
  ISchichtrastermodellBestand,
} from '../../commons/models/domain/schichtmodell';
import { createDienstplanZeitraum } from '../../commons/utils/dienstplan/dienstplan-zeitraum';
import {
  createDienstplanKalendertage,
  getDienstplanRasterzeit,
} from '../../commons/utils/dienstplan/dienstplan-kalendertage';
import { createSchichtZeitstempelAusLokalzeiten } from '../../commons/utils/dienstplan/schicht-lokalzeit';
import { compareModellschichtenNachBeginn } from '../../commons/utils/dienstplan/modellschicht-sortierung';
import { calculateSchichtLohnzeitMinuten } from '../../commons/utils/dienstplan/schicht-zeit';
import { FirestoreDbService } from '../firebase/firestore-db.service';
import { FilialeinstellungService } from './filialeinstellung.service';

// ===== Top-Level Helper =====================

function assertSchichtrasterPlanungsart(
  planungsart: unknown,
): asserts planungsart is 'schichtraster' {
  if (planungsart !== 'schichtraster') {
    throw new Error('Die Planungsart des Dienstplans wird noch nicht unterstützt.');
  }
}

@Injectable({ providedIn: 'root' })
export class DienstplanService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);
  private readonly filialeinstellungService = inject(FilialeinstellungService);

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
      return { dienstplaene: [], versionen: [], schichten: [], modellschichten: [] };
    }

    const dienstplan = mapDienstplan(pfad, dokument.id, dokument.daten);
    const versionIds = nurVeroeffentlicht
      ? [dienstplan.veroeffentlichteVersionId]
      : [dienstplan.entwurfVersionId, dienstplan.veroeffentlichteVersionId];
    const [versionenMitSchichten, modellschichten] = await Promise.all([
      Promise.all(
        [...new Set(versionIds.filter((id): id is string => Boolean(id)))].map((versionId) => {
          return this.loadVersionMitSchichten({ ...pfad, versionId }, strategie);
        }),
      ),
      this.loadModellschichten(pfad, strategie),
    ]);
    return {
      dienstplaene: [dienstplan],
      versionen: versionenMitSchichten.flatMap((bestand) => bestand.versionen).sort(sortVersionen),
      schichten: versionenMitSchichten.flatMap((bestand) => bestand.schichten).sort(sortSchichten),
      modellschichten,
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
    const bestaende = await Promise.all(
      dienstplaene.map((dienstplan) => {
        const dienstplanPfad = { ...pfad, dienstplanId: dienstplan.id };
        return Promise.all([
          this.loadAlleVersionenMitSchichten(dienstplanPfad, strategie),
          this.loadModellschichten(dienstplanPfad, strategie),
        ]);
      }),
    );
    const versionenMitSchichten = bestaende.map(([bestand]) => bestand);
    return {
      dienstplaene,
      versionen: versionenMitSchichten.flatMap((bestand) => bestand.versionen).sort(sortVersionen),
      schichten: versionenMitSchichten.flatMap((bestand) => bestand.schichten).sort(sortSchichten),
      modellschichten: bestaende.flatMap(([, modellschichten]) => modellschichten),
    };
  }

  /**
   * Legt einen Monatsplan, seine erste Entwurfsversion und die Modell-Momentaufnahme atomar an.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param monat - Monat im Format `YYYY-MM` und Dokument-ID des Dienstplans.
   * @param schichtmodell - Aktives Schichtmodell derselben Filiale.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @param datumRasterzeiten - Optionale Rasterzeitüberschreibungen einmaliger Datumsausnahmen.
   * @returns Die lokal abbildbaren Einträge des neuen Dienstplans und seiner Version.
   */
  async createDienstplan(
    pfad: IFilialPfad,
    monat: string,
    schichtmodell: ISchichtrastermodellBestand,
    benutzerUid: string,
    datumRasterzeiten: readonly IDienstplanDatumRasterzeiten[] = [],
  ): Promise<IDienstplanAnlageErgebnis> {
    validateSchichtmodell(pfad, schichtmodell);
    const filialeinstellungen = await this.filialeinstellungService.loadFilialeinstellung(
      pfad,
      'networkOnly',
    );
    if (!filialeinstellungen) {
      throw new Error(
        'Der Dienstplan konnte nicht angelegt werden, weil die Filialeinstellungen fehlen.',
      );
    }
    const dienstplanPfad: IDienstplanPfad = { ...pfad, dienstplanId: monat };
    const versionId = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.dienstplanVersionen(dienstplanPfad),
    );
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const zeitraum = createDienstplanZeitraum(monat);
    const kalendertage = createDienstplanKalendertage({
      monat,
      wochenregeln: filialeinstellungen.oeffnungszeiten.wochenregeln,
      sondertage: filialeinstellungen.sondertage,
      ausnahmen: filialeinstellungen.ausnahmen,
      modellschichten: schichtmodell.modellschichten,
      besondereRasterzeiten: schichtmodell.schichtmodell.besondereRasterzeiten,
      datumRasterzeiten,
    });
    const dienstplanDaten: IDienstplanDokument = {
      ...zeitraum,
      kalendertage,
      schichtmodellId: schichtmodell.schichtmodell.id,
      schichtmodellBezeichnung: schichtmodell.schichtmodell.bezeichnung,
      planungsart: schichtmodell.schichtmodell.planungsart,
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
    const modellschichten = schichtmodell.modellschichten
      .slice()
      .sort(compareModellschichtenNachBeginn)
      .map((modellschicht) => {
        return mapModellschichtMomentaufnahme(dienstplanPfad, modellschicht.id, modellschicht);
      });
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
      ...modellschichten.map((modellschicht) => {
        return {
          documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplanModellschicht({
            ...dienstplanPfad,
            modellschichtId: modellschicht.id,
          }),
          daten: {
            bezeichnung: modellschicht.bezeichnung,
            beginnLokalzeit: modellschicht.beginnLokalzeit,
            endeLokalzeit: modellschicht.endeLokalzeit,
            endetAmFolgetag: modellschicht.endetAmFolgetag,
            mehrfachbelegungErlaubt: modellschicht.mehrfachbelegungErlaubt,
          },
        };
      }),
    ]);

    return {
      dienstplan: mapDienstplan(dienstplanPfad, monat, dienstplanDaten),
      version: mapVersion({ ...dienstplanPfad, versionId }, versionId, versionDaten),
      modellschichten,
    };
  }

  /**
   * Löscht einen leeren, noch nie veröffentlichten Dienstplan mit seinem Entwurf und seiner Momentaufnahme.
   *
   * @param pfad - Vollständiger Pfad der Entwurfsversion.
   * @param erwarteteRevision - Vom Client zuletzt geladene Revision.
   */
  async deleteDienstplan(pfad: IDienstplanVersionPfad, erwarteteRevision: number): Promise<void> {
    const dienstplanPfad: IDienstplanPfad = {
      unternehmerId: pfad.unternehmerId,
      firmaId: pfad.firmaId,
      filialeId: pfad.filialeId,
      dienstplanId: pfad.dienstplanId,
    };
    const [dienstplanDokument, schichten, modellschichten] = await Promise.all([
      this.firestoreDbService.loadDocument<IDienstplanDokument>(
        FIRESTORE_DOCUMENT_PATHS.dienstplan(dienstplanPfad),
        'networkOnly',
      ),
      this.loadSchichten(pfad, 'networkOnly'),
      this.loadModellschichten(dienstplanPfad, 'networkOnly'),
    ]);
    if (!dienstplanDokument) {
      throw new Error('Der Dienstplan wurde nicht gefunden.');
    }
    const dienstplan = mapDienstplan(
      dienstplanPfad,
      dienstplanDokument.id,
      dienstplanDokument.daten,
    );
    if (dienstplan.entwurfVersionId !== pfad.versionId || dienstplan.veroeffentlichteVersionId) {
      throw new Error('Ein bereits veröffentlichter Dienstplan kann nicht gelöscht werden.');
    }
    if (schichten.length > 0) {
      throw new Error('Lösche zuerst alle Schichten des Entwurfs.');
    }

    await this.firestoreDbService.executeDocumentTransaction<IDienstplanVersionDokument, void>(
      FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad),
      (version) => {
        if (
          !version ||
          version.daten.status !== 'entwurf' ||
          version.daten.revision !== erwarteteRevision
        ) {
          throw new Error('Der Dienstplan wurde zwischenzeitlich geändert. Bitte lade ihn erneut.');
        }
        return {
          ergebnis: undefined,
          operationen: [
            ...modellschichten.map((modellschicht) => {
              return {
                documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplanModellschicht({
                  ...dienstplanPfad,
                  modellschichtId: modellschicht.id,
                }),
                delete: true as const,
              };
            }),
            {
              documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad),
              delete: true,
            },
            {
              documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplan(dienstplanPfad),
              delete: true,
            },
          ],
        };
      },
    );
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
    const schichtDaten = await this.createSchichtDaten(pfad, anlage);
    calculateSchichtLohnzeitMinuten(schichtDaten);
    await this.assertWeitereBelegungErlaubt(pfad, schichtDaten);
    const schichtId = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.schichten(pfad),
    );
    const schicht: ISchichtEintrag = {
      ...schichtDaten,
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
        ...schichtDaten,
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
    const schichtDaten = await this.createSchichtDaten(pfad, aktualisierung);
    calculateSchichtLohnzeitMinuten(schichtDaten);
    await this.assertWeitereBelegungErlaubt(pfad, schichtDaten, schicht.id);
    const aktualisierteSchicht: ISchichtEintrag = {
      ...schicht,
      ...schichtDaten,
      aktualisiertVonUid: benutzerUid,
    };
    return this.writeSchicht(
      pfad,
      erwarteteRevision,
      schicht.id,
      benutzerUid,
      {
        ...schichtDaten,
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

  private async loadModellschichten(
    pfad: IDienstplanPfad,
    strategie: TFirestoreLesestrategie,
  ): Promise<IModellschichtMomentaufnahmeEintrag[]> {
    const dokumente =
      await this.firestoreDbService.loadCollection<IModellschichtMomentaufnahmeDokument>(
        FIRESTORE_COLLECTION_PATHS.dienstplanModellschichten(pfad),
        strategie,
      );
    return dokumente
      .map((dokument) => {
        return mapModellschichtMomentaufnahme(pfad, dokument.id, dokument.daten);
      })
      .sort(compareModellschichtenNachBeginn);
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

  private async createSchichtDaten(
    pfad: IDienstplanVersionPfad,
    anlage: ISchichtAnlage,
  ): Promise<ISchichtDaten> {
    const dienstplanPfad: IDienstplanPfad = pfad;
    const [dienstplanDokument, modellschichtDokument] = await Promise.all([
      this.firestoreDbService.loadDocument<IDienstplanDokument>(
        FIRESTORE_DOCUMENT_PATHS.dienstplan(dienstplanPfad),
        'networkOnly',
      ),
      this.firestoreDbService.loadDocument<IModellschichtMomentaufnahmeDokument>(
        FIRESTORE_DOCUMENT_PATHS.dienstplanModellschicht({
          ...dienstplanPfad,
          modellschichtId: anlage.modellschichtId,
        }),
        'networkOnly',
      ),
    ]);
    if (!dienstplanDokument || !modellschichtDokument) {
      throw new Error('Der Kalendertag oder die Modellschicht wurde im Monatsplan nicht gefunden.');
    }
    const dienstplan = mapDienstplan(
      dienstplanPfad,
      dienstplanDokument.id,
      dienstplanDokument.daten,
    );
    const kalendertag = dienstplan.kalendertage.find((eintrag) => {
      return eintrag.datum === anlage.datum;
    });
    if (!kalendertag) {
      throw new Error('Der Kalendertag wurde im Monatsplan nicht gefunden.');
    }
    const modellschicht = mapModellschichtMomentaufnahme(
      dienstplanPfad,
      modellschichtDokument.id,
      modellschichtDokument.daten,
    );
    const rasterzeit = getDienstplanRasterzeit(kalendertag, modellschicht.id);
    const zeitdaten = createSchichtZeitstempelAusLokalzeiten(
      anlage.datum,
      rasterzeit,
      dienstplan.zeitzone,
    );
    return { ...anlage, ...zeitdaten };
  }

  /**
   * Verhindert eine weitere Belegung derselben Rasterzelle, wenn die Modellschicht sie nicht erlaubt.
   */
  private async assertWeitereBelegungErlaubt(
    pfad: IDienstplanVersionPfad,
    schicht: ISchichtDaten,
    ausgenommeneSchichtId?: string,
  ): Promise<void> {
    const dienstplanPfad: IDienstplanPfad = pfad;
    const [modellschichtDokument, schichten] = await Promise.all([
      this.firestoreDbService.loadDocument<IModellschichtMomentaufnahmeDokument>(
        FIRESTORE_DOCUMENT_PATHS.dienstplanModellschicht({
          ...dienstplanPfad,
          modellschichtId: schicht.modellschichtId,
        }),
        environment.firestoreLesestrategien.dienstplaene,
      ),
      this.loadSchichten(pfad, environment.firestoreLesestrategien.dienstplaene),
    ]);
    if (!modellschichtDokument) {
      throw new Error('Die Modellschicht wurde im Monatsplan nicht gefunden.');
    }
    if (modellschichtDokument.daten.mehrfachbelegungErlaubt === true) return;
    const istBereitsBelegt = schichten.some((eintrag) => {
      return (
        eintrag.id !== ausgenommeneSchichtId &&
        eintrag.modellschichtId === schicht.modellschichtId &&
        eintrag.datum === schicht.datum
      );
    });
    if (istBereitsBelegt) {
      throw new Error('Diese Schicht ist bereits belegt.');
    }
  }
}

function mapDienstplan(
  pfad: IDienstplanPfad,
  id: string,
  daten: IDienstplanDokument,
): IDienstplanEintrag {
  assertSchichtrasterPlanungsart(daten.planungsart);
  return {
    ...daten,
    ...pfad,
    id,
  };
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
    datum: daten.datum,
    mitarbeiterId: daten.mitarbeiterId,
    modellschichtId: daten.modellschichtId,
    beginn: daten.beginn,
    ende: daten.ende,
    erstelltVonUid: daten.erstelltVonUid,
    aktualisiertVonUid: daten.aktualisiertVonUid,
    ...(daten.erstelltAm ? { erstelltAm: daten.erstelltAm } : {}),
    ...(daten.aktualisiertAm ? { aktualisiertAm: daten.aktualisiertAm } : {}),
  };
}

function mapModellschichtMomentaufnahme(
  pfad: IDienstplanPfad,
  id: string,
  daten: IModellschichtMomentaufnahmeDokument,
): IModellschichtMomentaufnahmeEintrag {
  return {
    ...pfad,
    id,
    bezeichnung: daten.bezeichnung,
    beginnLokalzeit: daten.beginnLokalzeit,
    endeLokalzeit: daten.endeLokalzeit,
    endetAmFolgetag: daten.endetAmFolgetag,
    mehrfachbelegungErlaubt: daten.mehrfachbelegungErlaubt,
  };
}

function validateSchichtmodell(pfad: IFilialPfad, bestand: ISchichtrastermodellBestand): void {
  const schichtmodell = bestand.schichtmodell;
  assertSchichtrasterPlanungsart(schichtmodell.planungsart);
  const gleicherPfad =
    schichtmodell.unternehmerId === pfad.unternehmerId &&
    schichtmodell.firmaId === pfad.firmaId &&
    schichtmodell.filialeId === pfad.filialeId;
  if (!gleicherPfad) {
    throw new Error('Das Schichtmodell gehört nicht zu dieser Filiale.');
  }
  if (!schichtmodell.aktiv) {
    throw new Error('Für einen neuen Dienstplan muss das Schichtmodell aktiv sein.');
  }
  if (bestand.modellschichten.length === 0) {
    throw new Error('Das Schichtmodell enthält keine Schichten.');
  }
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
