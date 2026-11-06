// pur-system/src/app/commons/models/domain/filialeinstellung.ts

import { Timestamp } from 'firebase/firestore';

// ===== Konstanten & Typen ===================

export type TBundeslandCode =
  | 'DE-BB'
  | 'DE-BE'
  | 'DE-BW'
  | 'DE-BY'
  | 'DE-HB'
  | 'DE-HE'
  | 'DE-HH'
  | 'DE-MV'
  | 'DE-NI'
  | 'DE-NW'
  | 'DE-RP'
  | 'DE-SH'
  | 'DE-SL'
  | 'DE-SN'
  | 'DE-ST'
  | 'DE-TH';

export const STANDARD_BUNDESLAND: TBundeslandCode = 'DE-NW';

export type TWochentag =
  'montag' | 'dienstag' | 'mittwoch' | 'donnerstag' | 'freitag' | 'samstag' | 'sonntag';

export type TGesetzlicherFeiertagSchluessel =
  | 'neujahr'
  | 'heiligeDreiKoenige'
  | 'internationalerFrauentag'
  | 'karfreitag'
  | 'ostersonntag'
  | 'ostermontag'
  | 'tagDerArbeit'
  | 'christiHimmelfahrt'
  | 'pfingstsonntag'
  | 'pfingstmontag'
  | 'fronleichnam'
  | 'augsburgerFriedensfest'
  | 'mariaHimmelfahrt'
  | 'weltkindertag'
  | 'tagDerDeutschenEinheit'
  | 'reformationstag'
  | 'allerheiligen'
  | 'bussUndBettag'
  | 'ersterWeihnachtstag'
  | 'zweiterWeihnachtstag'
  | 'aufstand17Juni2028';

export type TBerechneterSondertagSchluessel = 'volkstrauertag' | 'totensonntag';

// ===== Anwendungs-Typen =====================

export interface IGeschlosseneOeffnungsregel {
  geoeffnet: false;
  beginnLokalzeit?: string;
  endeLokalzeit?: string;
  endetAmFolgetag?: boolean;
}

export interface IGeoeffneteOeffnungsregel {
  geoeffnet: true;
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
}

export type TOeffnungsregel = IGeschlosseneOeffnungsregel | IGeoeffneteOeffnungsregel;

export type TWochentagsmodus = 'standard' | 'abweichend' | 'geschlossen';
export type TSondertagsmodus = TWochentagsmodus | 'wieSonntag';

export interface IStandardWochentagsregel {
  modus: 'standard';
}

export interface IAbweichendeWochentagsregel {
  modus: 'abweichend';
  oeffnungsregel: IGeoeffneteOeffnungsregel;
}

export interface IGeschlosseneWochentagsregel {
  modus: 'geschlossen';
}

export type TWochentagsregel =
  IStandardWochentagsregel | IAbweichendeWochentagsregel | IGeschlosseneWochentagsregel;
export type TWochenregeln = Readonly<Record<TWochentag, TWochentagsregel>>;

export interface IJaehrlichFestesDatum {
  typ: 'jaehrlichFestesDatum';
  monat: number;
  tag: number;
}

export interface IGesetzlicherFeiertag {
  typ: 'gesetzlicherFeiertag';
  feiertagSchluessel: TGesetzlicherFeiertagSchluessel;
}

export interface IBerechneterSondertag {
  typ: 'berechneterSondertag';
  sondertagSchluessel: TBerechneterSondertagSchluessel;
}

export type TDatumsregel = IJaehrlichFestesDatum | IGesetzlicherFeiertag | IBerechneterSondertag;
export type TSondertagHerkunft = 'system' | 'benutzer';

export interface IFilialeinstellungDokumentMetadaten {
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}

export interface IFilialeinstellungSondertagVorlage {
  id: string;
  bezeichnung: string;
  aktiv: boolean;
  modus?: TSondertagsmodus;
  herkunft: TSondertagHerkunft;
  datumsregel: TDatumsregel;
  oeffnungsregel: TOeffnungsregel;
}

export interface IFilialeinstellungSondertagEintrag extends IFilialeinstellungSondertagDokument {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

// ===== Firestore-Dokumente ==================

export interface IFilialeinstellungAllgemeinDokument extends IFilialeinstellungDokumentMetadaten {
  bundesland: TBundeslandCode;
}

export interface IFilialeinstellungOeffnungszeitenDokument extends IFilialeinstellungDokumentMetadaten {
  standardoeffnungsregel: IGeoeffneteOeffnungsregel;
  wochenregeln: TWochenregeln;
}

export interface IFilialeinstellungSondertagDokument extends IFilialeinstellungDokumentMetadaten {
  bezeichnung: string;
  aktiv: boolean;
  modus?: TSondertagsmodus;
  herkunft: TSondertagHerkunft;
  datumsregel: TDatumsregel;
  oeffnungsregel: TOeffnungsregel;
}
