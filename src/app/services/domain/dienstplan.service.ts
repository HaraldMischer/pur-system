// pur-system/src/app/services/domain/dienstplan.service.ts

import { Injectable, inject } from '@angular/core';
import { FieldValue } from 'firebase/firestore';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import {
  IDienstplanPfad,
  IDienstplanVersionPfad,
  IFirmaPfad,
  IFilialPfad,
} from '../../commons/models/app/firestore-pfad.types';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import {
  IDienstplanAnlageErgebnis,
  IDienstplanBestand,
  IDienstplanDokument,
  IDienstplanEntwurfAnlageErgebnis,
  IDienstplanEintrag,
  IDienstplanVeroeffentlichungErgebnis,
  IDienstplanVersionDokument,
  IDienstplanVersionEintrag,
} from '../../commons/models/domain/dienstplan';
import { IMitarbeiterDokument } from '../../commons/models/domain/mitarbeiter';
import {
  IMitarbeiterbelegungDokument,
  IMitarbeiterbelegungReferenz,
} from '../../commons/models/domain/mitarbeiterbelegung';
import {
  ISchichtAktualisierung,
  ISchichtAnlage,
  ISchichtDaten,
  ISchichtDokument,
  ISchichtEintrag,
  ISchichtPausenaktualisierung,
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
import { compareModellschichtenNachReihenfolge } from '../../commons/utils/dienstplan/modellschicht-sortierung';
import { calculateSchichtLohnzeitMinuten } from '../../commons/utils/dienstplan/schicht-zeit';
import {
  createMitarbeiterbelegungId,
  createMitarbeiterbelegungReferenz,
  createMitarbeiterbelegungReferenzSchluessel,
  getMitarbeiterbelegungKonflikte,
  getMitarbeiterbelegungPausenzuordnungen,
  getMitarbeiterbelegungTage,
  updateMitarbeiterbelegungDokument,
} from '../../commons/utils/dienstplan/mitarbeiterbelegung';
import {
  FirestoreDbService,
  IFirestoreDokument,
  TFirestoreBatchOperation,
  TFirestoreTransaktionsDokumente,
} from '../firebase/firestore-db.service';
import {
  FilialeinstellungFachfehler,
  FilialeinstellungService,
  IFilialeinstellungBestand,
} from './filialeinstellung.service';

// ===== Top-Level Helper =====================

function assertSchichtrasterPlanungsart(
  planungsart: unknown,
): asserts planungsart is 'schichtraster' {
  if (planungsart !== 'schichtraster') {
    throw new Error('Die Planungsart des Dienstplans wird noch nicht unterstützt.');
  }
}

export function createDienstplanAnlageFehler(ursache: string): DienstplanFachfehler {
  const prefix = 'Der Dienstplan konnte nicht angelegt werden.';
  return new DienstplanFachfehler(ursache.startsWith(prefix) ? ursache : `${prefix} ${ursache}`);
}

function createDienstplanVeroeffentlichungFehler(ursache: string): DienstplanFachfehler {
  const prefix = 'Der Dienstplan konnte nicht veröffentlicht werden.';
  return new DienstplanFachfehler(ursache.startsWith(prefix) ? ursache : `${prefix} ${ursache}`);
}

function createDienstplanEntwurfFehler(ursache: string): DienstplanFachfehler {
  const prefix = 'Die neue Entwurfsversion konnte nicht angelegt werden.';
  return new DienstplanFachfehler(ursache.startsWith(prefix) ? ursache : `${prefix} ${ursache}`);
}

function mergeFirestoreOperationen(
  operationen: readonly TFirestoreBatchOperation[],
): readonly TFirestoreBatchOperation[] {
  const nachPfad = new Map<string, TFirestoreBatchOperation>();
  operationen.forEach((operation) => {
    const vorhanden = nachPfad.get(operation.documentPath);
    if ('delete' in operation) {
      nachPfad.set(operation.documentPath, operation);
      return;
    }
    if (vorhanden && 'delete' in vorhanden) return;
    nachPfad.set(operation.documentPath, {
      documentPath: operation.documentPath,
      daten: {
        ...(vorhanden && !('delete' in vorhanden) ? vorhanden.daten : {}),
        ...operation.daten,
      },
      ...(operation.replaceFields ||
      (vorhanden && !('delete' in vorhanden) && vorhanden.replaceFields)
        ? { replaceFields: true }
        : {}),
    });
  });
  return [...nachPfad.values()];
}

// ===== Konstanten & Typen ===================

export class DienstplanFachfehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DienstplanFachfehler';
  }
}

type TSchichtDatenMitZeitzone = {
  schichtDaten: ISchichtDaten;
  zeitzone: string;
};

type TMitarbeiterbelegungTag = {
  mitarbeiterId: string;
  datum: string;
  documentPath: string;
};

type TMitarbeiterbelegungAenderungen = {
  readonly operationen: readonly TFirestoreBatchOperation[];
  readonly pauseAktualisierungen: readonly ISchichtPausenaktualisierung[];
};

@Injectable({ providedIn: 'root' })
export class DienstplanService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);
  private readonly filialeinstellungService = inject(FilialeinstellungService);

  // ===== Öffentliche Aktionen =================

  /**
   * Beobachtet eine begrenzte Gruppe firmenweiter Mitarbeiterbelegungstage.
   *
   * @param pfad - Vollständiger Firmenpfad des Belegungsindex.
   * @param dokumentIds - Ein bis höchstens 30 deterministische Mitarbeiter-Tages-IDs.
   * @param next - Wird bei jedem vollständigen Listener-Stand aufgerufen.
   * @param error - Wird bei einem Listenerfehler aufgerufen.
   * @returns Funktion zum Beenden des Echtzeit-Listeners.
   */
  observeMitarbeiterbelegungen(
    pfad: IFirmaPfad,
    dokumentIds: readonly string[],
    next: (dokumente: readonly IFirestoreDokument<IMitarbeiterbelegungDokument>[]) => void,
    error: (error: unknown) => void,
  ): () => void {
    return this.firestoreDbService.observeCollectionByDocumentIds<IMitarbeiterbelegungDokument>(
      FIRESTORE_COLLECTION_PATHS.mitarbeiterbelegungen(pfad.unternehmerId, pfad.firmaId),
      dokumentIds,
      next,
      error,
    );
  }

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
   * @returns Die lokal abbildbaren Einträge des neuen Dienstplans und seiner Version.
   */
  async createDienstplan(
    pfad: IFilialPfad,
    monat: string,
    schichtmodell: ISchichtrastermodellBestand,
    benutzerUid: string,
  ): Promise<IDienstplanAnlageErgebnis> {
    validateSchichtmodell(pfad, schichtmodell);
    let filialeinstellungen: IFilialeinstellungBestand | null;
    try {
      filialeinstellungen = await this.filialeinstellungService.loadFilialeinstellung(
        pfad,
        'networkOnly',
      );
    } catch (error: unknown) {
      if (error instanceof FilialeinstellungFachfehler) {
        throw createDienstplanAnlageFehler(error.message);
      }
      throw error;
    }
    if (!filialeinstellungen) {
      throw createDienstplanAnlageFehler(
        'Die Öffnungszeiten der Filiale müssen zuerst initialisiert werden.',
      );
    }
    const dienstplanPfad: IDienstplanPfad = { ...pfad, dienstplanId: monat };
    const versionId = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.dienstplanVersionen(dienstplanPfad),
    );
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    let zeitraum: ReturnType<typeof createDienstplanZeitraum>;
    let kalendertage: ReturnType<typeof createDienstplanKalendertage>;
    try {
      zeitraum = createDienstplanZeitraum(monat);
      kalendertage = createDienstplanKalendertage({
        monat,
        wochenregeln: filialeinstellungen.oeffnungszeiten.wochenregeln,
        sondertage: filialeinstellungen.sondertage,
        ausnahmen: filialeinstellungen.ausnahmen,
        modellschichten: schichtmodell.modellschichten,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw createDienstplanAnlageFehler(error.message);
      }
      throw error;
    }
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
      .sort(compareModellschichtenNachReihenfolge)
      .map((modellschicht) => {
        return mapModellschichtMomentaufnahme(dienstplanPfad, modellschicht.id, modellschicht);
      });
    await this.firestoreDbService.executeDocumentTransaction<IDienstplanDokument, void>(
      FIRESTORE_DOCUMENT_PATHS.dienstplan(dienstplanPfad),
      (vorhandenerDienstplan) => {
        if (vorhandenerDienstplan) {
          throw createDienstplanAnlageFehler(
            'Für diesen Monat ist bereits ein Dienstplan vorhanden. Bitte lade den Monat erneut.',
          );
        }
        return {
          ergebnis: undefined,
          operationen: [
            {
              documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplan(dienstplanPfad),
              daten: {
                ...dienstplanDaten,
                erstelltAm: zeitstempel,
                aktualisiertAm: zeitstempel,
              },
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
                  reihenfolge: modellschicht.reihenfolge,
                  ...(modellschicht.beginn ? { beginn: { ...modellschicht.beginn } } : {}),
                  ...(modellschicht.ende ? { ende: { ...modellschicht.ende } } : {}),
                  mehrfachbelegungErlaubt: modellschicht.mehrfachbelegungErlaubt,
                  vorbereitungsminuten: modellschicht.vorbereitungsminuten ?? 0,
                  nachbereitungsminuten: modellschicht.nachbereitungsminuten ?? 0,
                },
              };
            }),
          ],
        };
      },
    );

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
   * Veröffentlicht einen aktuellen, konfliktfreien Entwurf atomar.
   *
   * @param pfad - Vollständiger Pfad der Entwurfsversion.
   * @param erwarteteRevision - Vom Client zuletzt geladene Revision.
   * @param benutzerUid - UID des veröffentlichenden Benutzers.
   * @returns Aktualisierter Dienstplan sowie veröffentlichte und gegebenenfalls archivierte Version.
   */
  async publishDienstplan(
    pfad: IDienstplanVersionPfad,
    erwarteteRevision: number,
    benutzerUid: string,
  ): Promise<IDienstplanVeroeffentlichungErgebnis> {
    const dienstplanPfad: IDienstplanPfad = pfad;
    const dienstplanPath = FIRESTORE_DOCUMENT_PATHS.dienstplan(dienstplanPfad);
    const entwurfVersionPath = FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad);
    const [dienstplanDokument, entwurfSchichten] = await Promise.all([
      this.firestoreDbService.loadDocument<IDienstplanDokument>(dienstplanPath, 'networkOnly'),
      this.loadSchichten(pfad, 'networkOnly'),
    ]);
    if (!dienstplanDokument || dienstplanDokument.daten.entwurfVersionId !== pfad.versionId) {
      throw createDienstplanVeroeffentlichungFehler(
        'Der aktuelle Entwurf wurde nicht gefunden. Bitte lade ihn erneut.',
      );
    }
    const alteVersionId = dienstplanDokument.daten.veroeffentlichteVersionId;
    const alteVersionPfad = alteVersionId ? { ...dienstplanPfad, versionId: alteVersionId } : null;
    const alteSchichten = alteVersionPfad
      ? await this.loadSchichten(alteVersionPfad, 'networkOnly')
      : [];
    const mitarbeiterIds = [...new Set(entwurfSchichten.map((schicht) => schicht.mitarbeiterId))];
    const mitarbeiterPfade = mitarbeiterIds.map((mitarbeiterId) => {
      return FIRESTORE_DOCUMENT_PATHS.mitarbeiter(pfad.unternehmerId, pfad.firmaId, mitarbeiterId);
    });
    const belegungstage = this.getMitarbeiterbelegungstageFuerSchichten(
      pfad,
      [...entwurfSchichten, ...alteSchichten],
      dienstplanDokument.daten.zeitzone,
    );
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const transaktionsPfade = [
      dienstplanPath,
      entwurfVersionPath,
      ...(alteVersionPfad ? [FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(alteVersionPfad)] : []),
      ...mitarbeiterPfade,
      ...belegungstage.map((tag) => tag.documentPath),
    ];

    return this.firestoreDbService.executeDocumentsTransaction<IDienstplanVeroeffentlichungErgebnis>(
      transaktionsPfade,
      (dokumente) => {
        const aktuellerDienstplan = dokumente.get(dienstplanPath)?.daten as
          IDienstplanDokument | undefined;
        const entwurfVersion = dokumente.get(entwurfVersionPath)?.daten as
          IDienstplanVersionDokument | undefined;
        if (
          !aktuellerDienstplan ||
          aktuellerDienstplan.entwurfVersionId !== pfad.versionId ||
          aktuellerDienstplan.veroeffentlichteVersionId !== alteVersionId ||
          !entwurfVersion ||
          entwurfVersion.status !== 'entwurf' ||
          entwurfVersion.revision !== erwarteteRevision
        ) {
          throw createDienstplanVeroeffentlichungFehler(
            'Der Dienstplan wurde zwischenzeitlich geändert. Bitte lade ihn erneut.',
          );
        }
        mitarbeiterPfade.forEach((mitarbeiterPath) => {
          const mitarbeiter = dokumente.get(mitarbeiterPath)?.daten as
            IMitarbeiterDokument | undefined;
          if (!mitarbeiter?.aktiv || !mitarbeiter.filialIds.includes(pfad.filialeId)) {
            throw createDienstplanVeroeffentlichungFehler(
              'Der Dienstplan enthält einen inaktiven oder dieser Filiale nicht mehr zugeordneten Mitarbeiter.',
            );
          }
        });
        const alteVersionPath = alteVersionPfad
          ? FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(alteVersionPfad)
          : null;
        const alteVersion = alteVersionPath
          ? (dokumente.get(alteVersionPath)?.daten as IDienstplanVersionDokument | undefined)
          : undefined;
        if (alteVersionPfad && (!alteVersion || alteVersion.status !== 'veroeffentlicht')) {
          throw createDienstplanVeroeffentlichungFehler(
            'Der bisher veröffentlichte Stand wurde zwischenzeitlich geändert.',
          );
        }
        const belegungsOperationen = this.createStatuswechselBelegungsoperationen(
          pfad,
          dokumente,
          belegungstage,
          entwurfSchichten,
          alteSchichten,
          aktuellerDienstplan.zeitzone,
          benutzerUid,
          zeitstempel,
          'Der Dienstplan konnte nicht veröffentlicht werden.',
        );
        const dienstplanDaten: IDienstplanDokument = {
          ...aktuellerDienstplan,
          veroeffentlichteVersionId: pfad.versionId,
          aktualisiertVonUid: benutzerUid,
        };
        delete dienstplanDaten.entwurfVersionId;
        const veroeffentlichteVersionDaten: IDienstplanVersionDokument = {
          ...entwurfVersion,
          status: 'veroeffentlicht',
          revision: entwurfVersion.revision + 1,
          aktualisiertVonUid: benutzerUid,
        };
        const archivierteVersionDaten = alteVersion
          ? {
              ...alteVersion,
              status: 'archiviert' as const,
              revision: alteVersion.revision + 1,
              aktualisiertVonUid: benutzerUid,
            }
          : undefined;
        return {
          ergebnis: {
            dienstplan: mapDienstplan(dienstplanPfad, pfad.dienstplanId, dienstplanDaten),
            veroeffentlichteVersion: mapVersion(pfad, pfad.versionId, veroeffentlichteVersionDaten),
            ...(alteVersionPfad && archivierteVersionDaten
              ? {
                  archivierteVersion: mapVersion(
                    alteVersionPfad,
                    alteVersionPfad.versionId,
                    archivierteVersionDaten,
                  ),
                }
              : {}),
          },
          operationen: mergeFirestoreOperationen([
            {
              documentPath: dienstplanPath,
              daten: {
                veroeffentlichteVersionId: pfad.versionId,
                entwurfVersionId: this.firestoreDbService.createDeleteField(),
                aktualisiertAm: zeitstempel,
                aktualisiertVonUid: benutzerUid,
              },
            },
            {
              documentPath: entwurfVersionPath,
              daten: {
                status: 'veroeffentlicht',
                revision: veroeffentlichteVersionDaten.revision,
                veroeffentlichtAm: zeitstempel,
                veroeffentlichtVonUid: benutzerUid,
                aktualisiertAm: zeitstempel,
                aktualisiertVonUid: benutzerUid,
              },
            },
            ...(alteVersionPath && archivierteVersionDaten
              ? [
                  {
                    documentPath: alteVersionPath,
                    daten: {
                      status: 'archiviert',
                      revision: archivierteVersionDaten.revision,
                      archiviertAm: zeitstempel,
                      archiviertVonUid: benutzerUid,
                      aktualisiertAm: zeitstempel,
                      aktualisiertVonUid: benutzerUid,
                    },
                  } satisfies TFirestoreBatchOperation,
                ]
              : []),
            ...belegungsOperationen,
          ]),
        };
      },
    );
  }

  /**
   * Erstellt aus dem veröffentlichten Stand eine neue bearbeitbare Entwurfsversion.
   *
   * @param pfad - Vollständiger Pfad des Monatsplans.
   * @param erwarteteRevision - Vom Client zuletzt geladene Revision der veröffentlichten Version.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @returns Aktualisierter Dienstplan, neue Version und kopierte Schichten.
   */
  async createEntwurfAusVeroeffentlichung(
    pfad: IDienstplanPfad,
    erwarteteRevision: number,
    benutzerUid: string,
  ): Promise<IDienstplanEntwurfAnlageErgebnis> {
    const dienstplanPath = FIRESTORE_DOCUMENT_PATHS.dienstplan(pfad);
    const dienstplanDokument = await this.firestoreDbService.loadDocument<IDienstplanDokument>(
      dienstplanPath,
      'networkOnly',
    );
    const veroeffentlichteVersionId = dienstplanDokument?.daten.veroeffentlichteVersionId;
    if (!dienstplanDokument || !veroeffentlichteVersionId) {
      throw createDienstplanEntwurfFehler('Der veröffentlichte Dienstplan wurde nicht gefunden.');
    }
    if (dienstplanDokument.daten.entwurfVersionId) {
      throw createDienstplanEntwurfFehler(
        'Für diesen Dienstplan ist bereits ein Entwurf vorhanden.',
      );
    }
    const veroeffentlichterPfad = { ...pfad, versionId: veroeffentlichteVersionId };
    const veroeffentlichteSchichten = await this.loadSchichten(
      veroeffentlichterPfad,
      'networkOnly',
    );
    const versionId = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.dienstplanVersionen(pfad),
    );
    const entwurfPfad = { ...pfad, versionId };
    const versionPath = FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(veroeffentlichterPfad);
    const belegungstage = this.getMitarbeiterbelegungstageFuerSchichten(
      entwurfPfad,
      veroeffentlichteSchichten,
      dienstplanDokument.daten.zeitzone,
    );
    const zeitstempel = this.firestoreDbService.createServerTimestamp();

    return this.firestoreDbService.executeDocumentsTransaction<IDienstplanEntwurfAnlageErgebnis>(
      [dienstplanPath, versionPath, ...belegungstage.map((tag) => tag.documentPath)],
      (dokumente) => {
        const aktuellerDienstplan = dokumente.get(dienstplanPath)?.daten as
          IDienstplanDokument | undefined;
        const veroeffentlichteVersion = dokumente.get(versionPath)?.daten as
          IDienstplanVersionDokument | undefined;
        if (
          !aktuellerDienstplan ||
          aktuellerDienstplan.entwurfVersionId ||
          aktuellerDienstplan.veroeffentlichteVersionId !== veroeffentlichteVersionId ||
          !veroeffentlichteVersion ||
          veroeffentlichteVersion.status !== 'veroeffentlicht' ||
          veroeffentlichteVersion.revision !== erwarteteRevision
        ) {
          throw createDienstplanEntwurfFehler(
            'Der Dienstplan wurde zwischenzeitlich geändert. Bitte lade ihn erneut.',
          );
        }
        const versionDaten: IDienstplanVersionDokument = {
          nummer: aktuellerDienstplan.naechsteVersionsnummer,
          revision: 0,
          status: 'entwurf',
          erstelltVonUid: benutzerUid,
          aktualisiertVonUid: benutzerUid,
        };
        const kopierteSchichten = veroeffentlichteSchichten.map((schicht) => {
          const schichtDaten: ISchichtDokument = {
            datum: schicht.datum,
            mitarbeiterId: schicht.mitarbeiterId,
            modellschichtId: schicht.modellschichtId,
            beginn: schicht.beginn,
            ende: schicht.ende,
            pauseMinuten: schicht.pauseMinuten,
            erstelltVonUid: benutzerUid,
            aktualisiertVonUid: benutzerUid,
          };
          return mapSchicht(entwurfPfad, schicht.id, schichtDaten);
        });
        const belegungsOperationen = this.createEntwurfBelegungsoperationen(
          entwurfPfad,
          dokumente,
          belegungstage,
          kopierteSchichten,
          aktuellerDienstplan.zeitzone,
          benutzerUid,
          zeitstempel,
          'Die neue Entwurfsversion konnte nicht angelegt werden.',
        );
        const aktualisierterDienstplan: IDienstplanDokument = {
          ...aktuellerDienstplan,
          entwurfVersionId: versionId,
          naechsteVersionsnummer: aktuellerDienstplan.naechsteVersionsnummer + 1,
          aktualisiertVonUid: benutzerUid,
        };
        return {
          ergebnis: {
            dienstplan: mapDienstplan(pfad, pfad.dienstplanId, aktualisierterDienstplan),
            version: mapVersion(entwurfPfad, versionId, versionDaten),
            schichten: kopierteSchichten,
          },
          operationen: mergeFirestoreOperationen([
            {
              documentPath: dienstplanPath,
              daten: {
                entwurfVersionId: versionId,
                naechsteVersionsnummer: aktualisierterDienstplan.naechsteVersionsnummer,
                aktualisiertAm: zeitstempel,
                aktualisiertVonUid: benutzerUid,
              },
            },
            {
              documentPath: FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(entwurfPfad),
              daten: { ...versionDaten, erstelltAm: zeitstempel, aktualisiertAm: zeitstempel },
            },
            ...kopierteSchichten.map((schicht) => {
              return {
                documentPath: FIRESTORE_DOCUMENT_PATHS.schicht({
                  ...entwurfPfad,
                  schichtId: schicht.id,
                }),
                daten: {
                  datum: schicht.datum,
                  mitarbeiterId: schicht.mitarbeiterId,
                  modellschichtId: schicht.modellschichtId,
                  beginn: schicht.beginn,
                  ende: schicht.ende,
                  pauseMinuten: schicht.pauseMinuten,
                  erstelltAm: zeitstempel,
                  erstelltVonUid: benutzerUid,
                  aktualisiertAm: zeitstempel,
                  aktualisiertVonUid: benutzerUid,
                },
              };
            }),
            ...belegungsOperationen,
          ]),
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
    const { schichtDaten, zeitzone } = await this.createSchichtDaten(pfad, anlage);
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
      zeitzone,
    );
  }

  /**
   * Aktualisiert eine Schicht und erhöht die erwartete Entwurfsrevision atomar.
   *
   * @param pfad - Vollständiger Pfad der Entwurfsversion.
   * @param schicht - Bisheriger Stand der zu aktualisierenden Schicht.
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
    const { schichtDaten, zeitzone } = await this.createSchichtDaten(pfad, aktualisierung);
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
      zeitzone,
      false,
      schicht,
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
    const zeitzone = await this.loadDienstplanZeitzone(pfad);
    const versionPath = FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad);
    const belegungstage = this.getMitarbeiterbelegungstage(pfad, schicht, zeitzone);
    return this.firestoreDbService.executeDocumentsTransaction<ISchichtSchreibergebnis>(
      [versionPath, ...belegungstage.map((eintrag) => eintrag.documentPath)],
      (dokumente) => {
        const version = dokumente.get(versionPath)?.daten as IDienstplanVersionDokument | undefined;
        if (!version) {
          throw new Error('Der Dienstplan wurde zwischenzeitlich geändert. Bitte lade ihn erneut.');
        }
        const versionRevision = getNaechsteRevision(version, erwarteteRevision);
        const referenz = createMitarbeiterbelegungReferenz(
          pfad,
          schicht.id,
          version.status,
          schicht,
        );
        const belegungsaenderungen = this.createMitarbeiterbelegungAenderungen(
          pfad,
          dokumente,
          belegungstage,
          referenz,
          [],
          null,
          benutzerUid,
          zeitstempel,
        );
        return {
          ergebnis: {
            schicht,
            versionRevision,
            pauseAktualisierungen: belegungsaenderungen.pauseAktualisierungen,
          },
          operationen: mergeFirestoreOperationen([
            {
              documentPath: versionPath,
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
            ...belegungsaenderungen.operationen,
          ]),
        };
      },
    );
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
      .sort(compareModellschichtenNachReihenfolge);
  }

  private writeSchicht(
    pfad: IDienstplanVersionPfad,
    erwarteteRevision: number,
    schichtId: string,
    benutzerUid: string,
    daten: Record<string, unknown>,
    schicht: ISchichtEintrag,
    zeitzone: string,
    istAnlage = true,
    vorherigeSchicht?: ISchichtEintrag,
  ): Promise<ISchichtSchreibergebnis> {
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const versionPath = FIRESTORE_DOCUMENT_PATHS.dienstplanVersion(pfad);
    const vorherigeTage = vorherigeSchicht
      ? this.getMitarbeiterbelegungstage(pfad, vorherigeSchicht, zeitzone)
      : [];
    const aktuelleTage = this.getMitarbeiterbelegungstage(pfad, schicht, zeitzone);
    return this.firestoreDbService.executeDocumentsTransaction<ISchichtSchreibergebnis>(
      [
        versionPath,
        ...vorherigeTage.map((eintrag) => eintrag.documentPath),
        ...aktuelleTage.map((eintrag) => eintrag.documentPath),
      ],
      (dokumente) => {
        const version = dokumente.get(versionPath)?.daten as IDienstplanVersionDokument | undefined;
        if (!version) {
          throw new Error('Der Dienstplan wurde zwischenzeitlich geändert. Bitte lade ihn erneut.');
        }
        const versionRevision = getNaechsteRevision(version, erwarteteRevision);
        const vorherigeReferenz = vorherigeSchicht
          ? createMitarbeiterbelegungReferenz(
              pfad,
              vorherigeSchicht.id,
              version.status,
              vorherigeSchicht,
            )
          : null;
        const aktuelleReferenz = createMitarbeiterbelegungReferenz(
          pfad,
          schichtId,
          version.status,
          schicht,
        );
        const belegungsaenderungen = this.createMitarbeiterbelegungAenderungen(
          pfad,
          dokumente,
          vorherigeTage,
          vorherigeReferenz,
          aktuelleTage,
          aktuelleReferenz,
          benutzerUid,
          zeitstempel,
        );
        const aktuellePause = belegungsaenderungen.pauseAktualisierungen.find(
          (aktualisierung) => aktualisierung.schichtId === schichtId,
        )?.pauseMinuten;
        const aktualisierteSchicht = {
          ...schicht,
          ...(aktuellePause === undefined ? {} : { pauseMinuten: aktuellePause }),
        };
        return {
          ergebnis: {
            schicht: aktualisierteSchicht,
            versionRevision,
            pauseAktualisierungen: belegungsaenderungen.pauseAktualisierungen,
          },
          operationen: mergeFirestoreOperationen([
            {
              documentPath: versionPath,
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
            ...belegungsaenderungen.operationen,
          ]),
        };
      },
    );
  }

  private async createSchichtDaten(
    pfad: IDienstplanVersionPfad,
    anlage: ISchichtAnlage,
  ): Promise<TSchichtDatenMitZeitzone> {
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
    return { schichtDaten: { ...anlage, ...zeitdaten }, zeitzone: dienstplan.zeitzone };
  }

  private async loadDienstplanZeitzone(pfad: IDienstplanPfad): Promise<string> {
    const dokument = await this.firestoreDbService.loadDocument<IDienstplanDokument>(
      FIRESTORE_DOCUMENT_PATHS.dienstplan(pfad),
      'networkOnly',
    );
    if (!dokument) {
      throw new Error('Der Dienstplan wurde nicht gefunden.');
    }
    return dokument.daten.zeitzone;
  }

  private getMitarbeiterbelegungstage(
    pfad: IDienstplanVersionPfad,
    schicht: ISchichtDaten,
    zeitzone: string,
  ): readonly TMitarbeiterbelegungTag[] {
    const tage = [...new Set([schicht.datum, ...getMitarbeiterbelegungTage(schicht, zeitzone)])]
      .slice()
      .sort();
    return tage.map((datum) => {
      const mitarbeiterbelegungId = createMitarbeiterbelegungId(schicht.mitarbeiterId, datum);
      return {
        mitarbeiterId: schicht.mitarbeiterId,
        datum,
        documentPath: FIRESTORE_DOCUMENT_PATHS.mitarbeiterbelegung({
          unternehmerId: pfad.unternehmerId,
          firmaId: pfad.firmaId,
          mitarbeiterbelegungId,
        }),
      };
    });
  }

  private getMitarbeiterbelegungstageFuerSchichten(
    pfad: IDienstplanVersionPfad,
    schichten: readonly ISchichtEintrag[],
    zeitzone: string,
  ): readonly TMitarbeiterbelegungTag[] {
    const tage = new Map<string, TMitarbeiterbelegungTag>();
    schichten.forEach((schicht) => {
      this.getMitarbeiterbelegungstage(pfad, schicht, zeitzone).forEach((tag) => {
        tage.set(tag.documentPath, tag);
      });
    });
    return [...tage.values()];
  }

  private createStatuswechselBelegungsoperationen(
    pfad: IDienstplanVersionPfad,
    dokumente: TFirestoreTransaktionsDokumente,
    tage: readonly TMitarbeiterbelegungTag[],
    entwurfSchichten: readonly ISchichtEintrag[],
    alteSchichten: readonly ISchichtEintrag[],
    zeitzone: string,
    benutzerUid: string,
    zeitstempel: FieldValue,
    fehlerPrefix: string,
  ): readonly TFirestoreBatchOperation[] {
    return this.createMehrfachBelegungsoperationen(
      dokumente,
      tage,
      [
        ...alteSchichten.map((schicht) => {
          return {
            schicht,
            entfernen: createMitarbeiterbelegungReferenz(
              { ...pfad, versionId: schicht.versionId },
              schicht.id,
              'veroeffentlicht' as const,
              schicht,
            ),
            hinzufuegen: null,
          };
        }),
        ...entwurfSchichten.map((schicht) => {
          return {
            schicht,
            entfernen: createMitarbeiterbelegungReferenz(
              pfad,
              schicht.id,
              'entwurf' as const,
              schicht,
            ),
            hinzufuegen: createMitarbeiterbelegungReferenz(
              pfad,
              schicht.id,
              'veroeffentlicht' as const,
              schicht,
            ),
          };
        }),
      ],
      zeitzone,
      benutzerUid,
      zeitstempel,
      fehlerPrefix,
    );
  }

  private createEntwurfBelegungsoperationen(
    pfad: IDienstplanVersionPfad,
    dokumente: TFirestoreTransaktionsDokumente,
    tage: readonly TMitarbeiterbelegungTag[],
    schichten: readonly ISchichtEintrag[],
    zeitzone: string,
    benutzerUid: string,
    zeitstempel: FieldValue,
    fehlerPrefix: string,
  ): readonly TFirestoreBatchOperation[] {
    return this.createMehrfachBelegungsoperationen(
      dokumente,
      tage,
      schichten.map((schicht) => {
        return {
          schicht,
          entfernen: null,
          hinzufuegen: createMitarbeiterbelegungReferenz(pfad, schicht.id, 'entwurf', schicht),
        };
      }),
      zeitzone,
      benutzerUid,
      zeitstempel,
      fehlerPrefix,
    );
  }

  private createMehrfachBelegungsoperationen(
    dokumente: TFirestoreTransaktionsDokumente,
    tage: readonly TMitarbeiterbelegungTag[],
    aenderungen: readonly {
      schicht: ISchichtEintrag;
      entfernen: IMitarbeiterbelegungReferenz | null;
      hinzufuegen: IMitarbeiterbelegungReferenz | null;
    }[],
    zeitzone: string,
    benutzerUid: string,
    zeitstempel: FieldValue,
    fehlerPrefix: string,
  ): readonly TFirestoreBatchOperation[] {
    const aktualisierteDokumente: IMitarbeiterbelegungDokument[] = [];
    const operationen = tage.flatMap((tag): TFirestoreBatchOperation[] => {
      const vorhanden = (dokumente.get(tag.documentPath)?.daten ??
        null) as IMitarbeiterbelegungDokument | null;
      let aktualisiert = vorhanden;
      aenderungen.forEach((aenderung) => {
        if (aenderung.schicht.mitarbeiterId !== tag.mitarbeiterId) return;
        const giltAmTag = getMitarbeiterbelegungTage(aenderung.schicht, zeitzone).includes(
          tag.datum,
        );
        if (!giltAmTag && aenderung.schicht.datum !== tag.datum) return;
        aktualisiert = updateMitarbeiterbelegungDokument(
          aktualisiert,
          tag.mitarbeiterId,
          tag.datum,
          aenderung.entfernen,
          aenderung.hinzufuegen,
          benutzerUid,
        );
      });
      if (!aktualisiert) {
        return vorhanden ? [{ documentPath: tag.documentPath, delete: true }] : [];
      }
      aktualisierteDokumente.push(aktualisiert);
      return [
        {
          documentPath: tag.documentPath,
          daten: { ...aktualisiert, aktualisiertAm: zeitstempel },
          replaceFields: true,
        },
      ];
    });
    const nachMitarbeiter = new Map<string, IMitarbeiterbelegungReferenz[]>();
    aktualisierteDokumente.forEach((dokument) => {
      nachMitarbeiter.set(dokument.mitarbeiterId, [
        ...(nachMitarbeiter.get(dokument.mitarbeiterId) ?? []),
        ...dokument.belegungen,
      ]);
    });
    const konflikt = [...nachMitarbeiter.values()]
      .flatMap((belegungen) => getMitarbeiterbelegungKonflikte(belegungen))
      .at(0);
    if (konflikt) {
      throw new DienstplanFachfehler(`${fehlerPrefix} ${konflikt.meldung}`);
    }
    return operationen;
  }

  private createMitarbeiterbelegungAenderungen(
    pfad: IFirmaPfad,
    dokumente: TFirestoreTransaktionsDokumente,
    vorherigeTage: readonly TMitarbeiterbelegungTag[],
    vorherigeReferenz: IMitarbeiterbelegungReferenz | null,
    aktuelleTage: readonly TMitarbeiterbelegungTag[],
    aktuelleReferenz: IMitarbeiterbelegungReferenz | null,
    benutzerUid: string,
    zeitstempel: FieldValue,
  ): TMitarbeiterbelegungAenderungen {
    const tage = new Map<string, TMitarbeiterbelegungTag>();
    [...vorherigeTage, ...aktuelleTage].forEach((tag) => {
      tage.set(tag.documentPath, tag);
    });
    const operationen: TFirestoreBatchOperation[] = [];
    const aktualisierteDokumente: IMitarbeiterbelegungDokument[] = [];
    for (const tag of tage.values()) {
      const vorherigeGilt = vorherigeTage.some((eintrag) => {
        return eintrag.documentPath === tag.documentPath;
      });
      const aktuelleGilt = aktuelleTage.some((eintrag) => {
        return eintrag.documentPath === tag.documentPath;
      });
      const dokument = (dokumente.get(tag.documentPath)?.daten ??
        null) as IMitarbeiterbelegungDokument | null;
      const aktualisiert = updateMitarbeiterbelegungDokument(
        dokument,
        tag.mitarbeiterId,
        tag.datum,
        vorherigeGilt ? vorherigeReferenz : null,
        aktuelleGilt ? aktuelleReferenz : null,
        benutzerUid,
      );
      if (!aktualisiert) {
        if (dokument) {
          operationen.push({ documentPath: tag.documentPath, delete: true });
        }
        continue;
      }
      aktualisierteDokumente.push(aktualisiert);
      operationen.push({
        documentPath: tag.documentPath,
        daten: { ...aktualisiert, aktualisiertAm: zeitstempel },
        replaceFields: true,
      });
    }
    const dokumenteNachMitarbeiter = new Map<string, IMitarbeiterbelegungDokument[]>();
    aktualisierteDokumente.forEach((dokument) => {
      dokumenteNachMitarbeiter.set(dokument.mitarbeiterId, [
        ...(dokumenteNachMitarbeiter.get(dokument.mitarbeiterId) ?? []),
        dokument,
      ]);
    });
    const pauseAktualisierungen = [...dokumenteNachMitarbeiter.values()].flatMap(
      (mitarbeiterDokumente) => {
        return getMitarbeiterbelegungPausenzuordnungen(
          mitarbeiterDokumente.flatMap((dokument) => dokument.belegungen),
        ).map(({ belegung, pauseMinuten }) => {
          return {
            ...pfad,
            filialeId: belegung.filialeId,
            dienstplanId: belegung.dienstplanId,
            versionId: belegung.versionId,
            schichtId: belegung.schichtId,
            pauseMinuten,
          };
        });
      },
    );
    const pauseNachReferenz = new Map(
      pauseAktualisierungen.map((aktualisierung) => {
        return [
          createMitarbeiterbelegungReferenzSchluessel(aktualisierung),
          aktualisierung.pauseMinuten,
        ];
      }),
    );
    const indexOperationen = operationen.map((operation) => {
      if ('delete' in operation || !Array.isArray(operation.daten['belegungen'])) return operation;
      const belegungen = operation.daten['belegungen'] as IMitarbeiterbelegungReferenz[];
      return {
        ...operation,
        daten: {
          ...operation.daten,
          belegungen: belegungen.map((belegung) => {
            const pauseMinuten = pauseNachReferenz.get(
              createMitarbeiterbelegungReferenzSchluessel(belegung),
            );
            return pauseMinuten === undefined ? belegung : { ...belegung, pauseMinuten };
          }),
        },
      };
    });
    const pausenOperationen: TFirestoreBatchOperation[] = pauseAktualisierungen.map(
      (aktualisierung) => {
        return {
          documentPath: FIRESTORE_DOCUMENT_PATHS.schicht(aktualisierung),
          daten: {
            pauseMinuten: aktualisierung.pauseMinuten,
            aktualisiertAm: zeitstempel,
            aktualisiertVonUid: benutzerUid,
          },
        };
      },
    );
    return { operationen: [...indexOperationen, ...pausenOperationen], pauseAktualisierungen };
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
    pauseMinuten: daten.pauseMinuten ?? 0,
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
    reihenfolge: daten.reihenfolge,
    ...(daten.beginn ? { beginn: { ...daten.beginn } } : {}),
    ...(daten.ende ? { ende: { ...daten.ende } } : {}),
    mehrfachbelegungErlaubt: daten.mehrfachbelegungErlaubt,
    vorbereitungsminuten: daten.vorbereitungsminuten ?? 0,
    nachbereitungsminuten: daten.nachbereitungsminuten ?? 0,
  };
}

function validateSchichtmodell(pfad: IFilialPfad, bestand: ISchichtrastermodellBestand): void {
  const schichtmodell = bestand.schichtmodell;
  if (schichtmodell.planungsart !== 'schichtraster') {
    throw createDienstplanAnlageFehler(
      'Die Planungsart des Schichtmodells wird noch nicht unterstützt.',
    );
  }
  const gleicherPfad =
    schichtmodell.unternehmerId === pfad.unternehmerId &&
    schichtmodell.firmaId === pfad.firmaId &&
    schichtmodell.filialeId === pfad.filialeId;
  if (!gleicherPfad) {
    throw createDienstplanAnlageFehler('Das Schichtmodell gehört nicht zu dieser Filiale.');
  }
  if (!schichtmodell.aktiv) {
    throw createDienstplanAnlageFehler('Das gewählte Schichtmodell ist nicht mehr aktiv.');
  }
  if (bestand.modellschichten.length === 0) {
    throw createDienstplanAnlageFehler('Das gewählte Schichtmodell enthält keine Schichten.');
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
