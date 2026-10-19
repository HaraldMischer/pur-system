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
  IFilialeinstellungAusnahmeDokument,
  IFilialeinstellungAusnahmeEintrag,
  IFilialeinstellungOeffnungszeitenDokument,
  IFilialeinstellungSondertagDokument,
  IFilialeinstellungSondertagEintrag,
  IFilialeinstellungSondertagVorlage,
  IJaehrlichFestesDatum,
  TBundeslandCode,
  TOeffnungsregel,
  TWochenoeffnungszeiten,
} from '../../commons/models/domain/filialeinstellung';
import {
  createInitialeSondertage,
  reconcileInitialeSondertage,
} from '../../commons/utils/filialeinstellung/feiertag';
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

function assertDatum(datum: string): void {
  if (!DATUM_PATTERN.test(datum)) {
    throw new FilialeinstellungFachfehler('Das Datum muss dem Format YYYY-MM-DD entsprechen.');
  }
  const [jahr, monat, tag] = datum.split('-').map(Number);
  const pruefdatum = new Date(Date.UTC(jahr, monat - 1, tag));
  if (
    pruefdatum.getUTCFullYear() !== jahr ||
    pruefdatum.getUTCMonth() + 1 !== monat ||
    pruefdatum.getUTCDate() !== tag
  ) {
    throw new FilialeinstellungFachfehler('Das Datum muss ein gültiges Kalenderdatum sein.');
  }
}

// ===== Konstanten & Typen ===================

export interface IFilialeinstellungBestand {
  allgemein: IFilialeinstellungAllgemeinDokument;
  oeffnungszeiten: IFilialeinstellungOeffnungszeitenDokument;
  sondertage: readonly IFilialeinstellungSondertagEintrag[];
  ausnahmen: readonly IFilialeinstellungAusnahmeEintrag[];
}

export interface IFilialeinstellungRohdaten {
  readonly allgemein: IFirestoreDokument<IFilialeinstellungAllgemeinDokument> | null;
  readonly oeffnungszeiten: IFirestoreDokument<IFilialeinstellungOeffnungszeitenDokument> | null;
  readonly sondertage: readonly IFirestoreDokument<IFilialeinstellungSondertagDokument>[];
  readonly ausnahmen: readonly IFirestoreDokument<IFilialeinstellungAusnahmeDokument>[];
}

export interface IFilialeinstellungGrundlagen {
  bundesland: TBundeslandCode;
  wochenregeln: TWochenoeffnungszeiten;
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
  oeffnungsregel: TOeffnungsregel;
}

export interface IFilialeinstellungAusnahmeSchreibdaten {
  datum: string;
  bezeichnung: string;
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
const DATUM_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

@Injectable({ providedIn: 'root' })
export class FilialeinstellungService {
  // ===== Interne Dependency Injection =========

  private readonly firestoreDbService = inject(FirestoreDbService);

  // ===== Öffentliche Aktionen =================

  /**
   * Lädt die unveränderten Einstellungsdaten einer Filiale aus Firestore.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param strategie - Datenquellenstrategie für den Ladevorgang.
   * @returns Gemeinsam aus allen vier Einstellungsbereichen geladene Rohdaten.
   */
  async loadFilialeinstellungRohdaten(
    pfad: IFilialPfad,
    strategie: TFirestoreLesestrategie = environment.firestoreLesestrategien.dienstplaene,
  ): Promise<IFilialeinstellungRohdaten> {
    const [allgemein, oeffnungszeiten, sondertage, ausnahmen] = await Promise.all([
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
      this.firestoreDbService.loadCollection<IFilialeinstellungAusnahmeDokument>(
        FIRESTORE_COLLECTION_PATHS.filialeinstellungAusnahmen(pfad),
        strategie,
      ),
    ]);
    return { allgemein, oeffnungszeiten, sondertage, ausnahmen };
  }

  /**
   * Validiert geladene Firestore-Rohdaten und erzeugt den fachlich verwendbaren Bestand.
   *
   * @param pfad - Vollständiger Filialpfad.
   * @param rohdaten - Unveränderte Daten aus den vier Einstellungsbereichen.
   * @returns Vollständiger Bestand oder `null`, wenn die Filiale noch nicht initialisiert ist.
   * @throws Wenn die geladenen Daten unvollständig oder fachlich ungültig sind.
   */
  validateFilialeinstellungRohdaten(
    pfad: IFilialPfad,
    rohdaten: IFilialeinstellungRohdaten,
  ): IFilialeinstellungBestand | null {
    const { allgemein, oeffnungszeiten, sondertage, ausnahmen } = rohdaten;
    if (!allgemein && !oeffnungszeiten && sondertage.length === 0 && ausnahmen.length === 0) {
      return null;
    }
    if (!allgemein || !oeffnungszeiten) {
      throw new FilialeinstellungFachfehler(
        'Die Filialeinstellungen sind unvollständig und müssen repariert werden.',
      );
    }
    this.assertGrundlagen({
      bundesland: allgemein.daten.bundesland,
      wochenregeln: oeffnungszeiten.daten.wochenregeln,
    });
    return {
      allgemein: mapAllgemeineFilialeinstellung(allgemein.daten),
      oeffnungszeiten: oeffnungszeiten.daten,
      sondertage: sondertage.map((dokument) => {
        return { ...pfad, id: dokument.id, ...dokument.daten };
      }),
      ausnahmen: ausnahmen.map((dokument) => {
        return { ...pfad, id: dokument.id, ...dokument.daten };
      }),
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
      wochenregeln: grundlagen.wochenregeln,
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    const sondertagVorlagen = createInitialeSondertage(grundlagen.bundesland);
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
      ausnahmen: [],
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
    this.assertGrundlagen(grundlagen);
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const sondertagVorlagen = reconcileInitialeSondertage(
      bestand.sondertage,
      grundlagen.bundesland,
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
    benutzerUid: string,
  ): Promise<IFilialeinstellungSondertagEintrag> {
    this.assertSondertagAnlage(anlage);
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
    benutzerUid: string,
  ): Promise<IFilialeinstellungSondertagEintrag> {
    if (sondertag.herkunft !== 'benutzer') {
      throw new FilialeinstellungFachfehler(
        'Systemdefinierte Sondertage besitzen eine eigene Bearbeitungsart.',
      );
    }
    this.assertSondertagAnlage(aktualisierung);
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
   * Aktualisiert Aktivstatus und Öffnungsregel eines systemdefinierten Sondertags.
   */
  async updateSystemSondertag(
    pfad: IFilialPfad,
    sondertag: IFilialeinstellungSondertagEintrag,
    aktualisierung: IFilialeinstellungSystemSondertagAktualisierung,
    benutzerUid: string,
  ): Promise<IFilialeinstellungSondertagEintrag> {
    if (sondertag.herkunft !== 'system') {
      throw new FilialeinstellungFachfehler('Der Sondertag ist nicht systemdefiniert.');
    }
    assertOeffnungsregel(aktualisierung.oeffnungsregel);
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.filialeinstellungSondertag({
        ...pfad,
        sondertagId: sondertag.id,
      }),
      {
        ...aktualisierung,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        aktualisiertVonUid: benutzerUid,
      },
    );
    return { ...sondertag, ...aktualisierung, aktualisiertVonUid: benutzerUid };
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

  /**
   * Legt eine datumsbezogene Ausnahme an.
   */
  async createAusnahme(
    pfad: IFilialPfad,
    anlage: IFilialeinstellungAusnahmeSchreibdaten,
    benutzerUid: string,
  ): Promise<IFilialeinstellungAusnahmeEintrag> {
    this.assertAusnahme(anlage);
    const zeitstempel = this.firestoreDbService.createServerTimestamp();
    const dokument: IFilialeinstellungAusnahmeDokument = {
      ...anlage,
      bezeichnung: anlage.bezeichnung.trim(),
      erstelltVonUid: benutzerUid,
      aktualisiertVonUid: benutzerUid,
    };
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.filialeinstellungAusnahme({ ...pfad, datum: anlage.datum }),
      { ...dokument, erstelltAm: zeitstempel, aktualisiertAm: zeitstempel },
    );
    return { ...pfad, id: anlage.datum, ...dokument };
  }

  /**
   * Aktualisiert eine datumsbezogene Ausnahme; ihr Datum bleibt unverändert.
   */
  async updateAusnahme(
    pfad: IFilialPfad,
    ausnahme: IFilialeinstellungAusnahmeEintrag,
    aktualisierung: IFilialeinstellungAusnahmeSchreibdaten,
    benutzerUid: string,
  ): Promise<IFilialeinstellungAusnahmeEintrag> {
    this.assertAusnahme(aktualisierung);
    if (aktualisierung.datum !== ausnahme.datum || ausnahme.id !== ausnahme.datum) {
      throw new FilialeinstellungFachfehler(
        'Das Datum einer bestehenden Ausnahme kann nicht geändert werden.',
      );
    }
    const daten = { ...aktualisierung, bezeichnung: aktualisierung.bezeichnung.trim() };
    await this.firestoreDbService.updateDocument(
      FIRESTORE_DOCUMENT_PATHS.filialeinstellungAusnahme({ ...pfad, datum: ausnahme.datum }),
      {
        ...daten,
        aktualisiertAm: this.firestoreDbService.createServerTimestamp(),
        aktualisiertVonUid: benutzerUid,
      },
    );
    return { ...ausnahme, ...daten, aktualisiertVonUid: benutzerUid };
  }

  /**
   * Löscht eine datumsbezogene Ausnahme.
   */
  async deleteAusnahme(pfad: IFilialPfad, datum: string): Promise<void> {
    assertDatum(datum);
    await this.firestoreDbService.deleteDocument(
      FIRESTORE_DOCUMENT_PATHS.filialeinstellungAusnahme({ ...pfad, datum }),
    );
  }

  // ===== Interne Helfer =======================

  private assertGrundlagen(grundlagen: IFilialeinstellungGrundlagen): void {
    if (!BUNDESLAENDER.has(grundlagen.bundesland)) {
      throw new FilialeinstellungFachfehler('Das Bundesland der Filiale ist ungültig.');
    }
    if (Object.keys(grundlagen.wochenregeln).length !== WOCHENTAGE.length) {
      throw new FilialeinstellungFachfehler(
        'Die Wochenöffnungszeiten müssen genau sieben Wochentage enthalten.',
      );
    }
    for (const wochentag of WOCHENTAGE) {
      assertOeffnungsregel(grundlagen.wochenregeln[wochentag]);
    }
  }

  private assertSondertagAnlage(
    anlage: IFilialeinstellungSondertagAnlage | IFilialeinstellungSondertagAktualisierung,
  ): void {
    assertBezeichnung(anlage.bezeichnung);
    assertFestesDatum(anlage.datumsregel);
    assertOeffnungsregel(anlage.oeffnungsregel);
  }

  private assertAusnahme(ausnahme: IFilialeinstellungAusnahmeSchreibdaten): void {
    assertDatum(ausnahme.datum);
    assertBezeichnung(ausnahme.bezeichnung);
    assertOeffnungsregel(ausnahme.oeffnungsregel);
  }
}
