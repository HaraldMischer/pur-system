// pur-system/src/app/services/domain/filialeinstellung.service.ts

import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  FIRESTORE_COLLECTION_PATHS,
  FIRESTORE_DOCUMENT_PATHS,
} from '../../commons/constants/firebase.constants';
import { TFirestoreLesestrategie } from '../../commons/models/app/firestore-lesestrategie.types';
import { IFilialPfad } from '../../commons/models/app/firestore-pfad.types';
import {
  IFilialeinstellungAllgemeinDokument,
  IFilialeinstellungOeffnungszeitenDokument,
  IFilialeinstellungSondertagDokument,
  IFilialeinstellungSondertagEintrag,
  IFilialeinstellungSondertagVorlage,
  IGeoeffneteOeffnungsregel,
  IJaehrlichFestesDatum,
  TBundeslandCode,
  TSondertagsmodus,
  TOeffnungsregel,
  TWochenregeln,
  TWochentag,
  TWochentagsregel,
} from '../../commons/models/domain/filialeinstellung';
import {
  createInitialeSondertage,
  reconcileInitialeSondertage,
} from '../../commons/utils/filialeinstellung/feiertag';
import { assertKeineAktiveSondertagDatumskollision } from '../../commons/utils/filialeinstellung/sondertag-kollision';
import { getSondertagsmodus } from '../../commons/utils/filialeinstellung/oeffnungsregel-aufloesung';
import {
  FirestoreDbService,
  IFirestoreDokument,
  TFirestoreBatchOperation,
} from '../firebase/firestore-db.service';

// ===== Top-Level Helper =====================

function mapSondertagDokument(
  sondertag: IFilialeinstellungSondertagVorlage,
): Omit<IFilialeinstellungSondertagDokument, 'erstelltVonUid' | 'aktualisiertVonUid'> {
  return {
    bezeichnung: sondertag.bezeichnung,
    aktiv: sondertag.aktiv,
    ...(sondertag.modus ? { modus: sondertag.modus } : {}),
    herkunft: sondertag.herkunft,
    datumsregel: sondertag.datumsregel,
    oeffnungsregel: sondertag.oeffnungsregel,
  };
}

function mapAllgemeineFilialeinstellung(
  dokument: IFilialeinstellungAllgemeinDokument,
): IFilialeinstellungAllgemeinDokument {
  return {
    bundesland: dokument.bundesland,
    erstelltAm: dokument.erstelltAm,
    erstelltVonUid: dokument.erstelltVonUid,
    aktualisiertAm: dokument.aktualisiertAm,
    aktualisiertVonUid: dokument.aktualisiertVonUid,
  };
}

function assertBezeichnung(bezeichnung: string): void {
  const normalisiert = bezeichnung.trim();
  if (!normalisiert || normalisiert.length > 80) {
    throw new FilialeinstellungFachfehler(
      'Die Bezeichnung muss zwischen 1 und 80 Zeichen lang sein.',
    );
  }
}

function assertFestesDatum(datumsregel: IJaehrlichFestesDatum): void {
  const pruefdatum = new Date(Date.UTC(2024, datumsregel.monat - 1, datumsregel.tag));
  if (
    datumsregel.typ !== 'jaehrlichFestesDatum' ||
    pruefdatum.getUTCMonth() + 1 !== datumsregel.monat ||
    pruefdatum.getUTCDate() !== datumsregel.tag
  ) {
    throw new FilialeinstellungFachfehler('Der Sondertag benötigt ein gültiges jährliches Datum.');
  }
}

function assertOeffnungsregel(oeffnungsregel: TOeffnungsregel | undefined): void {
  if (!oeffnungsregel) throw new FilialeinstellungFachfehler('Die Öffnungsregel fehlt.');
  const { beginnLokalzeit, endeLokalzeit, endetAmFolgetag } = oeffnungsregel;
  if (
    !oeffnungsregel.geoeffnet &&
    beginnLokalzeit === undefined &&
    endeLokalzeit === undefined &&
    endetAmFolgetag === undefined
  ) {
    return;
  }
  if (
    typeof beginnLokalzeit !== 'string' ||
    typeof endeLokalzeit !== 'string' ||
    typeof endetAmFolgetag !== 'boolean' ||
    !LOKALZEIT_PATTERN.test(beginnLokalzeit) ||
    !LOKALZEIT_PATTERN.test(endeLokalzeit) ||
    beginnLokalzeit === endeLokalzeit ||
    endetAmFolgetag !== endeLokalzeit < beginnLokalzeit
  ) {
    throw new FilialeinstellungFachfehler('Die Öffnungsregel enthält keine gültige Zeitfolge.');
  }
}

function assertGeoeffneteOeffnungsregel(
  oeffnungsregel: TOeffnungsregel | undefined,
  bezeichnung: string,
): asserts oeffnungsregel is IGeoeffneteOeffnungsregel {
  assertOeffnungsregel(oeffnungsregel);
  if (!oeffnungsregel?.geoeffnet) {
    throw new FilialeinstellungFachfehler(`${bezeichnung} muss geöffnet sein.`);
  }
}

function assertWochentagsregel(
  wochenregel: TWochentagsregel | undefined,
  wochentag: TWochentag,
): void {
  if (!wochenregel) {
    throw new FilialeinstellungFachfehler(`Die Wochenöffnung für ${wochentag} fehlt.`);
  }
  if (wochenregel.modus === 'standard' || wochenregel.modus === 'geschlossen') {
    if ('oeffnungsregel' in wochenregel) {
      throw new FilialeinstellungFachfehler(
        `Die Wochenöffnung für ${wochentag} darf keine eigene Öffnungsregel enthalten.`,
      );
    }
    return;
  }
  if (wochenregel.modus !== 'abweichend') {
    throw new FilialeinstellungFachfehler(`Der Wochenmodus für ${wochentag} ist ungültig.`);
  }
  assertGeoeffneteOeffnungsregel(wochenregel.oeffnungsregel, `Die Öffnungsregel für ${wochentag}`);
}

function assertSondertagsmodus(
  sondertag: Pick<IFilialeinstellungSondertagVorlage, 'bezeichnung' | 'datumsregel'>,
  modus: TSondertagsmodus,
  oeffnungsregel: TOeffnungsregel,
): void {
  if (modus === 'wieSonntag') {
    if (sondertag.datumsregel.typ !== 'gesetzlicherFeiertag') {
      throw new FilialeinstellungFachfehler(
        `Der Sondertag „${sondertag.bezeichnung}“ kann nicht wie ein Sonntag behandelt werden.`,
      );
    }
    return;
  }
  if (modus === 'abweichend' && !oeffnungsregel.geoeffnet) {
    throw new FilialeinstellungFachfehler(
      `Die abweichende Öffnungsregel für „${sondertag.bezeichnung}“ muss geöffnet sein.`,
    );
  }
  if (modus === 'geschlossen' && oeffnungsregel.geoeffnet) {
    throw new FilialeinstellungFachfehler(
      `Die geschlossene Öffnungsregel für „${sondertag.bezeichnung}“ darf nicht geöffnet sein.`,
    );
  }
}

function assertSondertagDatumsregel(sondertag: IFilialeinstellungSondertagVorlage): void {
  const datumsregel = sondertag.datumsregel;
  if (datumsregel.typ === 'jaehrlichFestesDatum') {
    assertFestesDatum(datumsregel);
    return;
  }
  if (datumsregel.typ === 'gesetzlicherFeiertag') return;
  if (
    sondertag.herkunft !== 'system' ||
    !BERECHNETE_SONDERTAG_SCHLUESSEL.has(datumsregel.sondertagSchluessel)
  ) {
    throw new FilialeinstellungFachfehler(
      `Die berechnete Datumsregel für „${sondertag.bezeichnung}“ ist ungültig.`,
    );
  }
}

// ===== Konstanten & Typen ===================

export interface IFilialeinstellungBestand {
  allgemein: IFilialeinstellungAllgemeinDokument;
  oeffnungszeiten: IFilialeinstellungOeffnungszeitenDokument;
  sondertage: readonly IFilialeinstellungSondertagEintrag[];
}

export interface IFilialeinstellungRohdaten {
  readonly allgemein: IFirestoreDokument<IFilialeinstellungAllgemeinDokument> | null;
  readonly oeffnungszeiten: IFirestoreDokument<IFilialeinstellungOeffnungszeitenDokument> | null;
  readonly sondertage: readonly IFirestoreDokument<IFilialeinstellungSondertagDokument>[];
}

export interface IFilialeinstellungGrundlagen {
  bundesland: TBundeslandCode;
  standardoeffnungsregel: IGeoeffneteOeffnungsregel;
  wochenregeln: TWochenregeln;
}

export interface IFilialeinstellungSondertagAnlage {
  bezeichnung: string;
  aktiv: boolean;
  datumsregel: IJaehrlichFestesDatum;
  oeffnungsregel: TOeffnungsregel;
}

export interface IFilialeinstellungSondertagAktualisierung {
  bezeichnung: string;
  aktiv: boolean;
  datumsregel: IJaehrlichFestesDatum;
  oeffnungsregel: TOeffnungsregel;
}

export interface IFilialeinstellungSystemSondertagAktualisierung {
  aktiv: boolean;
  modus?: TSondertagsmodus;
  oeffnungsregel: TOeffnungsregel;
}

export class FilialeinstellungFachfehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FilialeinstellungFachfehler';
  }
}

const BUNDESLAENDER = new Set<TBundeslandCode>([
  'DE-BB',
  'DE-BE',
  'DE-BW',
  'DE-BY',
  'DE-HB',
  'DE-HE',
  'DE-HH',
  'DE-MV',
  'DE-NI',
  'DE-NW',
  'DE-RP',
  'DE-SH',
  'DE-SL',
  'DE-SN',
  'DE-ST',
  'DE-TH',
]);
const BERECHNETE_SONDERTAG_SCHLUESSEL = new Set(['volkstrauertag', 'totensonntag']);
const WOCHENTAGE = [
  'montag',
  'dienstag',
  'mittwoch',
  'donnerstag',
  'freitag',
  'samstag',
  'sonntag',
] as const;
const LOKALZEIT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable({ providedIn: 'root' })
export class FilialeinstellungService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt und validiert den vollständigen Einstellungsbestand einer Filiale.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Vollständiger Bestand oder `null`, wenn die Filiale noch nicht initialisiert ist.
   */
  async loadFilialeinstellung(
    pfad: IFilialPfad,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
  ): Promise<IFilialeinstellungBestand | null> {
    const rohdaten = await this.loadFilialeinstellungRohdaten(pfad, strategie);
    return this.validateFilialeinstellungRohdaten(pfad, rohdaten);
  }

  /**
   * Lädt die unveränderten Einstellungsdaten einer Filiale aus Firestore.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Gemeinsam aus den Einstellungsbereichen geladene Rohdaten.
   */
  async loadFilialeinstellungRohdaten(
    pfad: IFilialPfad,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
  ): Promise<IFilialeinstellungRohdaten> {
    const [allgemein, oeffnungszeiten, sondertage] = await Promise.all([
      this.firestoreDbService.loadDocument<IFilialeinstellungAllgemeinDokument>(
        FIRESTORE_DOCUMENT_PATHS.filialeinstellung({ ...pfad, einstellungId: 'allgemein' }),
        strategie,
      ),
      this.firestoreDbService.loadDocument<IFilialeinstellungOeffnungszeitenDokument>(
        FIRESTORE_DOCUMENT_PATHS.filialeinstellung({
          ...pfad,
          einstellungId: 'oeffnungszeiten',
        }),
        strategie,
      ),
      this.firestoreDbService.loadCollection<IFilialeinstellungSondertagDokument>(
        FIRESTORE_COLLECTION_PATHS.filialeinstellungSondertage(pfad),
        strategie,
      ),
    ]);
    return { allgemein, oeffnungszeiten, sondertage };
  }

  /**
   * Validiert geladene Firestore-Rohdaten und erzeugt den fachlich verwendbaren Bestand.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param rohdaten - Unveränderte Daten aus den Einstellungsbereichen.
   * @returns Vollständiger Bestand oder `null`, wenn die Filiale noch nicht initialisiert ist.
   * @throws Wenn die geladenen Daten unvollständig oder fachlich ungültig sind.
   */
  validateFilialeinstellungRohdaten(
    pfad: IFilialPfad,
    rohdaten: IFilialeinstellungRohdaten,
  ): IFilialeinstellungBestand | null {
    const { allgemein, oeffnungszeiten, sondertage } = rohdaten;
    if (!allgemein && !oeffnungszeiten && sondertage.length === 0) {
      return null;
    }
    if (!allgemein || !oeffnungszeiten) {
      throw new FilialeinstellungFachfehler(
        'Die Filialeinstellungen sind unvollständig und müssen repariert werden.',
      );
    }
    const sondertagEintraege = sondertage.map((dokument) => {
      return { ...pfad, id: dokument.id, ...dokument.daten };
    });
    this.assertGrundlagen(
      {
        bundesland: allgemein.daten.bundesland,
        standardoeffnungsregel: oeffnungszeiten.daten.standardoeffnungsregel,
        wochenregeln: oeffnungszeiten.daten.wochenregeln,
      },
      sondertagEintraege,
    );
    return {
      allgemein: mapAllgemeineFilialeinstellung(allgemein.daten),
      oeffnungszeiten: oeffnungszeiten.daten,
      sondertage: sondertagEintraege,
    };
  }

  /**
   * Initialisiert die vollständigen Einstellungen einer bisher nicht eingerichteten Filiale atomar.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param grundlagen - Bundesland und vollständige Wochenregeln.
   * @param benutzerUid - UID des initialisierenden Benutzers.
   * @returns Lokal abbildbarer initialer Einstellungsbestand.
   */
  async initializeFilialeinstellung(
    pfad: IFilialPfad,
    grundlagen: IFilialeinstellungGrundlagen,
    benutzerUid: string,
  ): Promise<IFilialeinstellungBestand> {
    this.assertGrundlagen(grundlagen);
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const metadaten = {
      erstelltAm: zeitstempel,
      erstelltVonUid: benutzerUid,
      aktualisiertAm: zeitstempel,
      aktualisiertVonUid: benutzerUid,
    };
    const allgemein: IFilialeinstellungAllgemeinDokument = {
      bundesland: grundlagen.bundesland,
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    const oeffnungszeiten: IFilialeinstellungOeffnungszeitenDokument = {
      standardoeffnungsregel: grundlagen.standardoeffnungsregel,
      wochenregeln: grundlagen.wochenregeln,
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    const sondertagVorlagen = createInitialeSondertage(
      grundlagen.bundesland,
      grundlagen.standardoeffnungsregel,
    );
    const allgemeinPfad = FIRESTORE_DOCUMENT_PATHS.filialeinstellung({
      ...pfad,
      einstellungId: 'allgemein',
    });
    await this.firestoreDbService.executeDocumentTransaction(allgemeinPfad, (dokument) => {
      if (dokument) {
        throw new FilialeinstellungFachfehler(
          'Die Filialeinstellungen wurden bereits initialisiert.',
        );
      }
      return {
        ergebnis: undefined,
        operationen: [
          { documentPath: allgemeinPfad, daten: { ...allgemein, ...metadaten } },
          {
            documentPath: FIRESTORE_DOCUMENT_PATHS.filialeinstellung({
              ...pfad,
              einstellungId: 'oeffnungszeiten',
            }),
            daten: { ...oeffnungszeiten, ...metadaten },
          },
          ...sondertagVorlagen.map((sondertag) => {
            return {
              documentPath: FIRESTORE_DOCUMENT_PATHS.filialeinstellungSondertag({
                ...pfad,
                sondertagId: sondertag.id,
              }),
              daten: { ...mapSondertagDokument(sondertag), ...metadaten },
            };
          }),
        ],
      };
    });
    return {
      allgemein,
      oeffnungszeiten,
      sondertage: sondertagVorlagen.map((sondertag) => {
        return {
          ...pfad,
          ...sondertag,
          erstelltVonUid: benutzerUid,
          aktualisiertVonUid: benutzerUid,
        };
      }),
    };
  }

  /**
   * Speichert allgemeine Einstellungen und Wochenregeln einschließlich des Bundeslandabgleichs atomar.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param bestand - Vollständig geladener bisheriger Bestand.
   * @param grundlagen - Neue allgemeine Einstellungen und Wochenregeln.
   * @param benutzerUid - UID des ändernden Benutzers.
   * @returns Aktualisierter lokal abbildbarer Einstellungsbestand.
   */
  async saveGrundlagen(
    pfad: IFilialPfad,
    bestand: IFilialeinstellungBestand,
    grundlagen: IFilialeinstellungGrundlagen,
    benutzerUid: string,
  ): Promise<IFilialeinstellungBestand> {
    this.assertGrundlagen(grundlagen, bestand.sondertage);
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const sondertagVorlagen = reconcileInitialeSondertage(
      bestand.sondertage,
      grundlagen.bundesland,
      grundlagen.standardoeffnungsregel,
    );
    const bisherigeNachId = new Map(
      bestand.sondertage.map((sondertag) => {
        return [sondertag.id, sondertag] as const;
      }),
    );
    const neueIds = new Set(sondertagVorlagen.map((sondertag) => sondertag.id));
    const operationen: TFirestoreBatchOperation[] = [
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.filialeinstellung({
          ...pfad,
          einstellungId: 'allgemein',
        }),
        daten: {
          bundesland: grundlagen.bundesland,
          zeitzone: this.firestoreDbService.createDeleteField(),
          aktualisiertAm: zeitstempel,
          aktualisiertVonUid: benutzerUid,
        },
      },
      {
        documentPath: FIRESTORE_DOCUMENT_PATHS.filialeinstellung({
          ...pfad,
          einstellungId: 'oeffnungszeiten',
        }),
        daten: {
          standardoeffnungsregel: grundlagen.standardoeffnungsregel,
          wochenregeln: grundlagen.wochenregeln,
          aktualisiertAm: zeitstempel,
          aktualisiertVonUid: benutzerUid,
        },
      },
      ...sondertagVorlagen
        .filter((sondertag) => !bisherigeNachId.has(sondertag.id))
        .map((sondertag) => {
          return {
            documentPath: FIRESTORE_DOCUMENT_PATHS.filialeinstellungSondertag({
              ...pfad,
              sondertagId: sondertag.id,
            }),
            daten: {
              ...mapSondertagDokument(sondertag),
              erstelltAm: zeitstempel,
              erstelltVonUid: benutzerUid,
              aktualisiertAm: zeitstempel,
              aktualisiertVonUid: benutzerUid,
            },
          };
        }),
      ...bestand.sondertage
        .filter((sondertag) => sondertag.herkunft === 'system' && !neueIds.has(sondertag.id))
        .map((sondertag) => {
          return {
            documentPath: FIRESTORE_DOCUMENT_PATHS.filialeinstellungSondertag({
              ...pfad,
              sondertagId: sondertag.id,
            }),
            delete: true as const,
          };
        }),
    ];
    await this.firestoreDbService.updateDocumentsAtomically(operationen);
    return {
      ...bestand,
      allgemein: {
        bundesland: grundlagen.bundesland,
        erstelltAm: bestand.allgemein.erstelltAm,
        erstelltVonUid: bestand.allgemein.erstelltVonUid,
        aktualisiertAm: bestand.allgemein.aktualisiertAm,
        aktualisiertVonUid: benutzerUid,
      },
      oeffnungszeiten: {
        ...bestand.oeffnungszeiten,
        standardoeffnungsregel: grundlagen.standardoeffnungsregel,
        wochenregeln: grundlagen.wochenregeln,
        aktualisiertVonUid: benutzerUid,
      },
      sondertage: sondertagVorlagen.map((sondertag) => {
        const vorhanden = bisherigeNachId.get(sondertag.id);
        return (
          vorhanden ?? {
            ...pfad,
            ...sondertag,
            erstelltVonUid: benutzerUid,
            aktualisiertVonUid: benutzerUid,
          }
        );
      }),
    };
  }

  /**
   * Legt einen benutzerdefinierten festen Sondertag an.
   */
  async createSondertag(
    pfad: IFilialPfad,
    anlage: IFilialeinstellungSondertagAnlage,
    bestehendeSondertage: readonly IFilialeinstellungSondertagEintrag[],
    benutzerUid: string,
  ): Promise<IFilialeinstellungSondertagEintrag> {
    this.assertSondertagAnlage(anlage);
    assertKeineAktiveSondertagDatumskollision(bestehendeSondertage, {
      ...anlage,
      herkunft: 'benutzer',
    });
    const id = this.firestoreDbService.createDocumentId(
      FIRESTORE_COLLECTION_PATHS.filialeinstellungSondertage(pfad),
    );
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const dokument: IFilialeinstellungSondertagDokument = {
      ...anlage,
      bezeichnung: anlage.bezeichnung.trim(),
      herkunft: 'benutzer',
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.filialeinstellungSondertag({ ...pfad, sondertagId: id }),
      { ...dokument, erstelltAm: zeitstempel, aktualisiertAm: zeitstempel },
    );
    return { ...pfad, id, ...dokument };
  }

  /**
   * Aktualisiert einen benutzerdefinierten Sondertag.
   */
  async updateSondertag(
    pfad: IFilialPfad,
    sondertag: IFilialeinstellungSondertagEintrag,
    aktualisierung: IFilialeinstellungSondertagAktualisierung,
    bestehendeSondertage: readonly IFilialeinstellungSondertagEintrag[],
    benutzerUid: string,
  ): Promise<IFilialeinstellungSondertagEintrag> {
    if (sondertag.herkunft !== 'benutzer') {
      throw new FilialeinstellungFachfehler(
        'Systemdefinierte Sondertage besitzen eine eigene Bearbeitungsart.',
      );
    }
    this.assertSondertagAnlage(aktualisierung);
    assertKeineAktiveSondertagDatumskollision(
      bestehendeSondertage,
      { ...aktualisierung, herkunft: 'benutzer' },
      sondertag.id,
    );
    const daten = { ...aktualisierung, bezeichnung: aktualisierung.bezeichnung.trim() };
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.filialeinstellungSondertag({
        ...pfad,
        sondertagId: sondertag.id,
      }),
      {
        ...daten,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        aktualisiertVonUid: benutzerUid,
      },
    );
    return { ...sondertag, ...daten, aktualisiertVonUid: benutzerUid };
  }

  /**
   * Aktualisiert Modus und Öffnungsregel eines systemdefinierten Sondertags.
   */
  async updateSystemSondertag(
    pfad: IFilialPfad,
    sondertag: IFilialeinstellungSondertagEintrag,
    aktualisierung: IFilialeinstellungSystemSondertagAktualisierung,
    bestehendeSondertage: readonly IFilialeinstellungSondertagEintrag[],
    benutzerUid: string,
  ): Promise<IFilialeinstellungSondertagEintrag> {
    if (sondertag.herkunft !== 'system') {
      throw new FilialeinstellungFachfehler('Der Sondertag ist nicht systemdefiniert.');
    }
    const modus = aktualisierung.modus ?? getSondertagsmodus({ ...sondertag, ...aktualisierung });
    assertSondertagsmodus(sondertag, modus, aktualisierung.oeffnungsregel);
    assertOeffnungsregel(aktualisierung.oeffnungsregel);
    if (sondertag.datumsregel.typ === 'jaehrlichFestesDatum') {
      assertKeineAktiveSondertagDatumskollision(
        bestehendeSondertage,
        {
          bezeichnung: sondertag.bezeichnung,
          aktiv: modus !== 'standard',
          herkunft: 'system',
          datumsregel: sondertag.datumsregel,
        },
        sondertag.id,
      );
    }
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.filialeinstellungSondertag({
        ...pfad,
        sondertagId: sondertag.id,
      }),
      {
        ...aktualisierung,
        aktiv: modus !== 'standard',
        modus,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        aktualisiertVonUid: benutzerUid,
      },
    );
    return {
      ...sondertag,
      ...aktualisierung,
      aktiv: modus !== 'standard',
      modus,
      aktualisiertVonUid: benutzerUid,
    };
  }

  /**
   * Löscht einen benutzerdefinierten Sondertag.
   */
  async deleteSondertag(
    pfad: IFilialPfad,
    sondertag: IFilialeinstellungSondertagEintrag,
  ): Promise<void> {
    if (sondertag.herkunft !== 'benutzer') {
      throw new FilialeinstellungFachfehler(
        'Systemdefinierte Sondertage können nicht gelöscht werden.',
      );
    }
    await this.firestoreDbService.deleteDocument(
      FIRESTORE_DOCUMENT_PATHS.filialeinstellungSondertag({
        ...pfad,
        sondertagId: sondertag.id,
      }),
    );
  }

  // ===== Interne Helfer =======================

  private assertGrundlagen(
    grundlagen: IFilialeinstellungGrundlagen,
    sondertage: readonly IFilialeinstellungSondertagEintrag[] = [],
  ): void {
    if (!BUNDESLAENDER.has(grundlagen.bundesland)) {
      throw new FilialeinstellungFachfehler('Das Bundesland der Filiale ist ungültig.');
    }
    assertGeoeffneteOeffnungsregel(grundlagen.standardoeffnungsregel, 'Die Standardöffnungsregel');
    if (Object.keys(grundlagen.wochenregeln).length !== WOCHENTAGE.length) {
      throw new FilialeinstellungFachfehler(
        'Die Wochenöffnungszeiten müssen genau sieben Wochentage enthalten.',
      );
    }
    for (const wochentag of WOCHENTAGE) {
      const wochenregel = grundlagen.wochenregeln[wochentag];
      assertWochentagsregel(wochenregel, wochentag);
      if (wochenregel.modus !== 'abweichend') continue;
    }
    for (const sondertag of sondertage) {
      assertSondertagDatumsregel(sondertag);
      assertOeffnungsregel(sondertag.oeffnungsregel);
      assertSondertagsmodus(sondertag, getSondertagsmodus(sondertag), sondertag.oeffnungsregel);
    }
  }

  private assertSondertagAnlage(
    anlage: IFilialeinstellungSondertagAnlage | IFilialeinstellungSondertagAktualisierung,
  ): void {
    assertBezeichnung(anlage.bezeichnung);
    assertFestesDatum(anlage.datumsregel);
    assertOeffnungsregel(anlage.oeffnungsregel);
  }
}
